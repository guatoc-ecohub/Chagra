/**
 * AgentHero.composer.test.jsx — el compositor multimodal REAL del home.
 *
 * Verifica que el AgentHero ya NO es un teaser falso, sino un compositor que:
 *   1. Tiene un <textarea> real (Enter envía, Shift+Enter no).
 *   2. Al enviar texto → persiste en la outbox (store.send) ANTES de navegar.
 *   3. El micrófono graba y, al detener, envía un item de voz con el blob.
 *   4. La cámara/foto procesa la imagen y la deja en staging para enviar.
 *   5. Cada envío navega a 'agente' (onNavigate) — pero SOLO tras persistir.
 *   6. Si la persistencia falla, NO navega (cero pérdida de datos).
 *
 * Mockea: useAgentOutboxStore.send, useVoiceRecorder, photoService, agentSounds.
 * NO toca IndexedDB real — el contrato de durabilidad se prueba en
 * agentOutboxService.test.js. Aquí probamos el cableado del compositor.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── Mock del store outbox (send durable) ─────────────────────────────────────
const sendMock = vi.fn(async () => 1);
vi.mock('../../../store/useAgentOutboxStore', () => ({
  default: (selector) => selector({ send: sendMock, items: [], inFlight: [], refresh: vi.fn() }),
}));

// ── Mock del recorder de voz ────────────────────────────────────────────────
const recorderState = {
  isRecording: false,
  audioLevel: 0.5,
  durationMs: 0,
  start: vi.fn(() => { recorderState.isRecording = true; }),
  stop: vi.fn(async () => ({ blob: new Blob(['audio'], { type: 'audio/webm' }), durationMs: 3000, mimeType: 'audio/webm' })),
  reset: vi.fn(),
  error: null,
};
vi.mock('../../../hooks/useVoiceRecorder', () => ({
  default: () => recorderState,
}));

// ── Mock de photoService (compresión) ───────────────────────────────────────
vi.mock('../../../services/photoService', () => ({
  captureAndCompress: vi.fn(async () => ({
    blob: new Blob(['jpeg'], { type: 'image/jpeg' }),
    mime: 'image/jpeg',
    width: 800,
    height: 600,
  })),
}));

// ── Mock de sonidos (no-op) ─────────────────────────────────────────────────
vi.mock('../../../services/agentSoundService', () => ({
  agentSounds: { start: vi.fn(), listen: vi.fn(), chime: vi.fn(), cancel: vi.fn() },
}));

// ── Mock del avatar (evita cargar el wrapper pesado) ────────────────────────
vi.mock('../../ChagraAgentAvatar', () => ({
  default: ({ state }) => <div data-testid="avatar" data-state={state} />,
}));

import AgentHero from '../AgentHero';

beforeEach(() => {
  sendMock.mockClear();
  recorderState.isRecording = false;
  recorderState.start.mockClear();
  recorderState.stop.mockClear();
  recorderState.reset.mockClear();
  // Sin reduced-motion → la navegación usa setTimeout(280). Forzamos
  // reduced-motion=true en los tests de envío para navegar sincrónicamente.
  window.matchMedia = vi.fn().mockImplementation((q) => ({
    matches: q.includes('reduce'),
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.URL.createObjectURL = vi.fn(() => 'blob:preview');
  window.URL.revokeObjectURL = vi.fn();
});

describe('AgentHero — compositor real (no teaser)', () => {
  test('renderiza un <textarea> real, no un div falso', () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    expect(ta.tagName).toBe('TEXTAREA');
  });

  test('escribir + Enter → persiste texto en la outbox y navega a agente', async () => {
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: '¿qué siembro?' } });
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'text', text: '¿qué siembro?' }),
      );
    });
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('agente'));
  });

  test('Shift+Enter NO envía (nueva línea)', () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: 'línea uno' } });
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: true });
    expect(sendMock).not.toHaveBeenCalled();
  });

  test('botón enviar deshabilitado sin texto ni adjunto', () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    expect(screen.getByLabelText('Enviar al agente')).toBeDisabled();
  });

  test('chip de sugerencia envía su prompt como texto', async () => {
    render(<AgentHero onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByText('Plagas'));
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'text', text: expect.stringMatching(/plagas/i) }),
      );
    });
  });

  test('micrófono: grabar y detener envía item de voz con el blob', async () => {
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const micBtn = screen.getByLabelText('Grabar audio');
    fireEvent.click(micBtn);
    expect(recorderState.start).toHaveBeenCalled();

    // Re-render en estado grabando.
    recorderState.isRecording = true;
    render(<AgentHero onNavigate={onNavigate} />);
    const stopBtn = screen.getAllByLabelText('Detener y enviar audio')[0];
    await act(async () => {
      fireEvent.click(stopBtn);
    });
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'voice', blob: expect.any(Blob) }),
      );
    });
  });

  test('foto: seleccionar imagen la deja lista y al enviar va como item photo', async () => {
    const onNavigate = vi.fn();
    const { container } = render(<AgentHero onNavigate={onNavigate} />);
    const file = new File(['img'], 'planta.jpg', { type: 'image/jpeg' });
    const cameraInput = container.querySelector('input[capture]');
    await act(async () => {
      fireEvent.change(cameraInput, { target: { files: [file] } });
    });
    // Aparece el preview de "foto lista".
    await screen.findByText('Foto lista para enviar');
    // Enviar (ya habilitado por el adjunto).
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enviar al agente'));
    });
    await waitFor(() => {
      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'photo', blob: expect.any(Blob), mime: 'image/jpeg' }),
      );
    });
  });

  test('cero pérdida: si send() falla, NO navega y conserva el texto', async () => {
    sendMock.mockRejectedValueOnce(new Error('idb caída'));
    const onNavigate = vi.fn();
    render(<AgentHero onNavigate={onNavigate} />);
    const ta = screen.getByLabelText('Escribe tu pregunta al agente');
    fireEvent.change(ta, { target: { value: 'no me pierdas' } });
    await act(async () => {
      fireEvent.click(screen.getByLabelText('Enviar al agente'));
    });
    await waitFor(() => expect(sendMock).toHaveBeenCalled());
    expect(onNavigate).not.toHaveBeenCalled();
    // El texto sigue en el compositor (no se borró).
    expect(ta.value).toBe('no me pierdas');
  });
});

describe('AgentHero — voseo (español colombiano)', () => {
  test('los textos visibles usan tú/usted, sin voseo argentino', () => {
    const { container } = render(<AgentHero onNavigate={vi.fn()} />);
    const text = container.textContent || '';
    // Marcadores de voseo prohibidos.
    expect(text).not.toMatch(/\bescribí\b/);
    expect(text).not.toMatch(/\btocá\b/);
    expect(text).not.toMatch(/\benviá\b/);
    expect(text).not.toMatch(/\bpreguntá\b/);
    expect(text).not.toMatch(/\bmostrá\b/);
    expect(text).not.toMatch(/\bcontá\b/);
    expect(text).not.toMatch(/\btenés\b/);
    expect(text).not.toMatch(/\bquerés\b/);
  });
});
