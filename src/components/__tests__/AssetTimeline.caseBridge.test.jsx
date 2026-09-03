import React from 'react';
// @ts-nocheck
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Audit 070.6 satélite — bridge severity → case_study en la revisión IA del
// timeline. La inferencia guarda `confidence` = score de salud / 100 (único
// write-path: EvidenceCapture). Confirmar un hallazgo sobre una planta con
// score < 50 dispara el CaseLinkModal con el logId real del log de revisión.

// Estado mutable del store — cada test siembra sus propios logs.
const loadLogsForAssetMock = vi.fn();
const mockState = {
  logsByAsset: { 'asset-1': [] },
  isSyncing: false,
  loadLogsForAsset: loadLogsForAssetMock,
};

vi.mock('../../store/useLogStore', () => ({
  useLogStore: Object.assign(
    (selector) => selector(mockState),
    { getState: () => mockState, setState: vi.fn() },
  ),
}));

vi.mock('../../hooks/usePhotoUrl', () => ({
  usePhotoUrl: () => ({ loading: false, url: null, source: 'none' }),
}));

const savePayloadMock = vi.fn();
vi.mock('../../services/payloadService', () => ({
  savePayload: (...args) => savePayloadMock(...args),
}));

// Sin mock de aiInferenceParser: usamos el parser REAL para que el log
// stub (notas [AI_INFERENCE]) pase por el mismo camino que en producción.

vi.mock('react-virtuoso', () => ({
  Virtuoso: () => null,
  GroupedVirtuoso: ({ groupCounts = [], groupContent, itemContent, data }) => {
    const elements = [];
    let itemIdx = 0;
    groupCounts.forEach((count, groupIdx) => {
      if (groupContent) elements.push(<div key={`g-${groupIdx}`}>{groupContent(groupIdx)}</div>);
      for (let i = 0; i < count; i++) {
        const log = Array.isArray(data) ? data[itemIdx] : undefined;
        elements.push(<div key={`i-${itemIdx}`}>{itemContent ? itemContent(itemIdx, log) : null}</div>);
        itemIdx++;
      }
    });
    return <div>{elements}</div>;
  },
}));

import AssetTimeline from '../AssetTimeline';
import { useCaseStudyStore } from '../../store/useCaseStudyStore';

// Log de inferencia IA que necesita revisión humana. `confidence` viene del
// score de salud foliar / 100 tal como lo escribe EvidenceCapture.
const aiInferenceLog = (confidence) => ({
  id: 'log-ai-1',
  type: 'log--observation',
  timestamp: 1760000000,
  attributes: {
    name: 'Diagnóstico IA: Trozador en plántulas',
    notes: {
      value: [
        '[AI_INFERENCE]',
        'source: vision_model',
        'model_version: qwen3-vl:8b',
        `confidence: ${confidence}`,
        'needs_human_review: true',
        '',
        '--- Findings ---',
        '- Trozador en plántulas',
        '- 30% del follaje afectado',
        '',
        '--- Suggested treatment ---',
        'Bacillus thuringiensis al atardecer',
      ].join('\n'),
      format: 'plain_text',
    },
  },
  relationships: {},
});

const resetCaseStore = () => {
  useCaseStudyStore.setState({ cases: [] });
  if (typeof localStorage !== 'undefined') localStorage.removeItem('chagra:case-study');
};

describe('AssetTimeline — audit 070.6 satélite: bridge revisión IA → case_study', () => {
  beforeEach(() => {
    savePayloadMock.mockReset();
    savePayloadMock.mockResolvedValue({ success: true });
    loadLogsForAssetMock.mockClear();
    mockState.logsByAsset['asset-1'] = [];
    resetCaseStore();
  });

  it('confirmar inferencia con score de salud 30 dispara CaseLinkModal con logId real y severity high', async () => {
    mockState.logsByAsset['asset-1'] = [aiInferenceLog(0.3)];
    render(<AssetTimeline assetId="asset-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    });

    await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));

    // El log de revisión lleva severity high y un id estable (logId real).
    const sent = savePayloadMock.mock.calls[0][1];
    expect(sent.data.attributes.severity).toBe('high');
    expect(sent.data.id).toMatch(/^[0-9a-f-]{8,}$/i);

    // Modal montado con la severidad propagada.
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy());
    expect(screen.getByText(/Severidad alta/i)).toBeTruthy();

    // End-to-end del logId: crear caso desde el modal linkea EL id enviado.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Crear nuevo caso de estudio/i }));
    });
    const cases = useCaseStudyStore.getState().cases;
    expect(cases).toHaveLength(1);
    expect(cases[0].event_log_ids).toContain(sent.data.id);
    expect(cases[0].problem.severity).toBe('high');
  });

  it('confirmar inferencia con score de salud 80 NO dispara el modal (planta sana)', async () => {
    mockState.logsByAsset['asset-1'] = [aiInferenceLog(0.8)];
    render(<AssetTimeline assetId="asset-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
    });

    await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));
    expect(savePayloadMock.mock.calls[0][1].data.attributes.severity).toBe('info');
    // Sin score de problema no hay modal.
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('rechazar la inferencia NO dispara el modal aunque el score sea 30', async () => {
    mockState.logsByAsset['asset-1'] = [aiInferenceLog(0.3)];
    render(<AssetTimeline assetId="asset-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Rechazar/i }));
    });

    await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));
    expect(savePayloadMock.mock.calls[0][1].data.attributes.severity).toBe('info');
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('si savePayload RECHAZA, el modal NO aparece (no existe el log que se vincularía)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      savePayloadMock.mockRejectedValue(new Error('IndexedDB no disponible'));
      mockState.logsByAsset['asset-1'] = [aiInferenceLog(0.3)];
      render(<AssetTimeline assetId="asset-1" />);

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Confirmar/i }));
      });

      await waitFor(() => expect(savePayloadMock).toHaveBeenCalledTimes(1));
      // Dar margen a los microtasks del rechazo antes de asentar la aserción.
      await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(useCaseStudyStore.getState().cases).toHaveLength(0);
    } finally {
      errSpy.mockRestore();
    }
  });
});
