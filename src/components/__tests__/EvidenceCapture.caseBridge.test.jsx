import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Audit 070.6 satélite — bridge severity → case_study en el diagnóstico IA
// de EvidenceCapture. Score de salud < 50 → tras guardar el log--observation
// de la inferencia se ofrece el CaseLinkModal (mismo shape que
// ObservationScreen). El logId del bridge es el id pre-asignado del log de
// LA INFERENCIA, no el logId padre de la tarea que se evidencia.

const analyzeFoliageMock = vi.fn();
vi.mock('../../services/aiService', () => ({
  analyzeFoliage: (...args) => analyzeFoliageMock(...args),
}));

const savePayloadMock = vi.fn();
vi.mock('../../services/payloadService', () => ({
  savePayload: (...args) => savePayloadMock(...args),
}));

vi.mock('../../services/visionQueueService', () => ({
  enqueuePhoto: vi.fn(),
}));

vi.mock('../../utils/imageProcessor', () => ({
  optimizeImage: async (blob) => blob,
  blobToDataUrl: async () => 'data:image/webp;base64,ZmFrZQ==',
}));

vi.mock('../../utils/imageCompress', () => ({
  compressImage: async () => ({ ok: true, blob: new Blob(['foto'], { type: 'image/jpeg' }) }),
  IMAGE_TOO_LARGE_MESSAGE: 'La foto excede el tamaño máximo.',
}));

vi.mock('../../db/mediaCache', () => ({
  mediaCache: {
    getByLogId: async () => [],
    getByAssetId: async () => [],
    save: async () => 'media-test-1',
    remove: async () => {},
  },
}));

vi.mock('../../hooks/useGeolocation', () => ({
  useGeolocation: () => ({ position: null, request: vi.fn() }),
}));

vi.mock('../common/AIStreamPanel', () => ({
  default: () => <div data-testid="ai-stream-stub" />,
}));

import EvidenceCapture from '../EvidenceCapture';
import { useCaseStudyStore } from '../../store/useCaseStudyStore';

const resetCaseStore = () => {
  useCaseStudyStore.setState({ cases: [] });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('chagra:case-study');
};

const capturePhoto = async (container) => {
  const input = container.querySelector('input[type="file"]');
  const file = new File(['foto-fake'], 'foto.jpg', { type: 'image/jpeg' });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

describe('EvidenceCapture — audit 070.6 satélite: bridge diagnóstico IA → case_study', () => {
  beforeEach(() => {
    analyzeFoliageMock.mockReset();
    savePayloadMock.mockReset();
    savePayloadMock.mockResolvedValue({ success: true, data: { id: 'server-id' } });
    resetCaseStore();
  });

  it('score 30 dispara CaseLinkModal tras el save, con logId real del log de inferencia', async () => {
    analyzeFoliageMock.mockResolvedValue({
      score: 30,
      issues: ['Trozador en plántulas'],
      treatment_suggestion: 'Bacillus thuringiensis al atardecer',
    });

    const { container } = render(
      <EvidenceCapture logId="task-padre-1" assetId="plant-9" speciesSlug="fragaria_ananassa" onCountChange={vi.fn()} onDiagnosis={vi.fn()} />
    );
    await capturePhoto(container);

    await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));

    // El log de inferencia lleva id pre-asignado (logId real del bridge).
    const sent = savePayloadMock.mock.calls[0][1];
    expect(sent.data.id).toMatch(/^[0-9a-f-]{8,}$/i);
    expect(sent.data.id).not.toBe('task-padre-1');

    // Modal montado con severidad alta.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText(/Severidad alta/i)).toBeTruthy();

    // End-to-end: crear caso linkea el id del log de inferencia (no el padre).
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Crear nuevo caso de estudio/i }));
    });
    const cases = useCaseStudyStore.getState().cases;
    expect(cases).toHaveLength(1);
    expect(cases[0].event_log_ids).toContain(sent.data.id);
    expect(cases[0].event_log_ids).not.toContain('task-padre-1');
    expect(cases[0].problem.severity).toBe('high');
    expect(cases[0].subject.species_ids).toEqual(['fragaria_ananassa']);
  });

  it('score 80 NO dispara el modal (planta sana)', async () => {
    analyzeFoliageMock.mockResolvedValue({
      score: 80,
      issues: ['Follaje sano'],
      treatment_suggestion: 'Sin acción requerida',
    });

    const { container } = render(
      <EvidenceCapture logId="task-padre-2" assetId="plant-9" speciesSlug="fragaria_ananassa" onCountChange={vi.fn()} onDiagnosis={vi.fn()} />
    );
    await capturePhoto(container);

    await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('si savePayload RECHAZA, el modal NO aparece (no existe el log que se vincularía)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      analyzeFoliageMock.mockResolvedValue({
        score: 30,
        issues: ['Trozador en plántulas'],
        treatment_suggestion: 'Bacillus thuringiensis',
      });
      savePayloadMock.mockRejectedValue(new Error('falla de red + IDB'));

      const { container } = render(
        <EvidenceCapture logId="task-padre-3" assetId="plant-9" speciesSlug="fragaria_ananassa" onCountChange={vi.fn()} onDiagnosis={vi.fn()} />
      );
      await capturePhoto(container);

      await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(useCaseStudyStore.getState().cases).toHaveLength(0);
    } finally {
      errSpy.mockRestore();
    }
  });
});
