/**
 * CicloObservacion — cablea el track de observaciones (antes "oscuro").
 *
 * Contrato cubierto: anotar una observación de TEXTO en un ciclo llama a
 * observationService.registerObservation con el processId y el texto, y limpia
 * el campo. (La voz reusa el mismo pipeline; cubierta por su propio servicio.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { registerObservation, registerVoiceObservation, transcribe } = vi.hoisted(() => ({
  registerObservation: vi.fn(),
  registerVoiceObservation: vi.fn(),
  transcribe: vi.fn(),
}));

vi.mock('../../hooks/useVoiceRecorder', () => ({
  default: () => ({ durationMs: 0, start: vi.fn(), stop: vi.fn(), reset: vi.fn(), error: null }),
}));
vi.mock('../../services/voiceService', () => ({ transcribe }));
vi.mock('../../services/observationService', () => ({ registerObservation }));
vi.mock('../../services/voiceObservationService', () => ({ registerVoiceObservation }));

import CicloObservacion from '../CicloObservacion';

beforeEach(() => {
  registerObservation.mockReset().mockResolvedValue({ ok: true });
  registerVoiceObservation.mockReset().mockResolvedValue({ ok: true });
});
afterEach(() => cleanup());

describe('CicloObservacion — anotar observación en un ciclo', () => {
  it('guarda una nota de texto vía observationService.registerObservation', async () => {
    const onSaved = vi.fn();
    render(<CicloObservacion processId="p1" onSaved={onSaved} processHint={undefined} currentStage="" />);

    fireEvent.change(screen.getByLabelText('Observación de campo'), {
      target: { value: 'aparecieron pulgones en las hojas' },
    });
    fireEvent.click(screen.getByText('Guardar nota'));

    await waitFor(() => expect(registerObservation).toHaveBeenCalledTimes(1));
    const arg = registerObservation.mock.calls[0][0];
    expect(arg.processId).toBe('p1');
    expect(arg.text).toMatch(/pulgones/);
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it('no guarda con el campo vacío', () => {
    render(<CicloObservacion processId="p1" onSaved={() => {}} processHint={undefined} currentStage="" />);
    expect(/** @type {HTMLButtonElement} */ (screen.getByText('Guardar nota')).disabled).toBe(true);
  });
});
