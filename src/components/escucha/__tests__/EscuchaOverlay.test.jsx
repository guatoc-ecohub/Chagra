/**
 * Tests del widget "Chagra está escuchando":
 *  - abre por el trigger desacoplado (activarEscucha — tap hoy, wake-word mañana)
 *  - camino (a): comando de navegación → chagraNavigate a la vista
 *  - camino (b): pregunta → agente con autoSend + fromVoice (→ Kokoro)
 *  - degradación: Whisper caído → audio a la cola + salida por teclado
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import EscuchaOverlay from '../EscuchaOverlay.jsx';
import EscuchaFab from '../EscuchaFab.jsx';
import { activarEscucha } from '../../../services/escuchaService.js';

const startMock = vi.fn(async () => {});
const stopMock = vi.fn(async () => ({
  blob: new Blob([new Uint8Array(4096)], { type: 'audio/webm' }),
  durationMs: 2100,
  mimeType: 'audio/webm',
}));
const resetMock = vi.fn();

vi.mock('../../../hooks/useVoiceRecorder', () => ({
  default: () => ({
    isRecording: true,
    audioLevel: 0.3,
    amplitudeHistory: [0.1, 0.4, 0.2],
    durationMs: 1200,
    error: null,
    start: startMock,
    stop: stopMock,
    reset: resetMock,
    hardLimitMs: 30000,
  }),
}));

vi.mock('../../../services/voiceService', () => ({
  transcribe: vi.fn(),
  queueForRetry: vi.fn(async () => {}),
}));

import { transcribe, queueForRetry } from '../../../services/voiceService';

// vi.mocked: acceso tipado a los mocks (el gate tsc:check exige tipos limpios
// en archivos nuevos — sin esto, mockResolvedValueOnce no existe en el tipo).
const transcribeMock = vi.mocked(transcribe);

const abrirWidget = async (fuente = 'tap') => {
  await act(async () => { activarEscucha({ fuente }); });
  await screen.findByTestId('escucha-overlay');
};

describe('EscuchaOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cerrado no renderiza nada', () => {
    render(<EscuchaOverlay />);
    expect(screen.queryByTestId('escucha-overlay')).toBeNull();
  });

  it('activarEscucha() abre el widget escuchando (trigger desacoplado)', async () => {
    render(<EscuchaOverlay />);
    await abrirWidget();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('escucha-overlay').dataset.fase).toBe('oyendo');
    expect(screen.getByTestId('escucha-estado').textContent).toMatch(/escuchando/i);
    expect(screen.getByTestId('escucha-listo')).toBeTruthy();
    expect(screen.getByTestId('escucha-cancelar')).toBeTruthy();
  });

  it('fuente wakeword cambia el encabezado (mismo widget, otro trigger)', async () => {
    render(<EscuchaOverlay />);
    await abrirWidget('wakeword');
    expect(screen.getByText(/hola Chagra/i)).toBeTruthy();
  });

  it('camino (a): "lléveme al mercado" → navega a mercado', async () => {
    transcribeMock.mockResolvedValueOnce('Lléveme al mercado');
    const navSpy = vi.fn();
    window.addEventListener('chagraNavigate', navSpy);

    render(<EscuchaOverlay />);
    await abrirWidget();
    fireEvent.click(screen.getByTestId('escucha-listo'));

    // Primero muestra el rumbo (para que el campesino LEA a dónde va)…
    await screen.findByTestId('escucha-rumbo');
    expect(screen.getByTestId('escucha-rumbo').textContent).toMatch(/Mercado/);

    // …y tras la pausa dispara la navegación real.
    await waitFor(() => {
      expect(navSpy).toHaveBeenCalled();
    }, { timeout: 3000 });
    expect(navSpy.mock.calls[0][0].detail.view).toBe('mercado');
    window.removeEventListener('chagraNavigate', navSpy);
  });

  it('camino (b): pregunta → agente con autoSend + fromVoice', async () => {
    transcribeMock.mockResolvedValueOnce('¿Cuánta agua necesita el café?');
    const navSpy = vi.fn();
    window.addEventListener('chagraNavigate', navSpy);

    render(<EscuchaOverlay />);
    await abrirWidget();
    fireEvent.click(screen.getByTestId('escucha-listo'));

    await waitFor(() => expect(navSpy).toHaveBeenCalled());
    const { view, initialData } = navSpy.mock.calls[0][0].detail;
    expect(view).toBe('agente');
    expect(initialData).toMatchObject({
      prefilledPrompt: '¿Cuánta agua necesita el café?',
      autoSend: true,
      fromVoice: true,
    });
    // El widget se cierra: el agente toma el relevo (y habla por Kokoro).
    await waitFor(() => expect(screen.queryByTestId('escucha-overlay')).toBeNull());
    window.removeEventListener('chagraNavigate', navSpy);
  });

  it('cancelar cierra sin navegar', async () => {
    const navSpy = vi.fn();
    window.addEventListener('chagraNavigate', navSpy);

    render(<EscuchaOverlay />);
    await abrirWidget();
    fireEvent.click(screen.getByTestId('escucha-cancelar'));

    await waitFor(() => expect(screen.queryByTestId('escucha-overlay')).toBeNull());
    expect(navSpy).not.toHaveBeenCalled();
    expect(transcribeMock).not.toHaveBeenCalled();
    window.removeEventListener('chagraNavigate', navSpy);
  });

  it('Whisper caído → guarda el audio para reintento y ofrece teclado', async () => {
    transcribeMock.mockRejectedValueOnce(new Error('Whisper 503'));

    render(<EscuchaOverlay />);
    await abrirWidget();
    fireEvent.click(screen.getByTestId('escucha-listo'));

    await waitFor(() => {
      expect(screen.getByTestId('escucha-overlay').dataset.fase).toBe('error');
    });
    expect(queueForRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('escucha-reintentar')).toBeTruthy();
    expect(screen.getByTestId('escucha-escribir')).toBeTruthy();
  });
});

describe('EscuchaFab', () => {
  it('el tap del FAB dispara el mismo trigger que usará el wake-word', async () => {
    render(
      <>
        <EscuchaFab />
        <EscuchaOverlay />
      </>,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('escucha-fab'));
    });
    await screen.findByTestId('escucha-overlay');
    expect(screen.getByTestId('escucha-overlay').dataset.fase).toBe('oyendo');
  });
});
