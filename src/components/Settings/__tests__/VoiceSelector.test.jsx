/**
 * Tests para VoiceSelector — rediseño de mínima fricción (2026-07-09).
 *
 * Cubre:
 *   - Renderiza una tarjeta grande por voz (KOKORO_VOICES), sin dropdown.
 *   - UN toque en una voz: la reproduce (speakKokoro) Y la persiste de una
 *     (sin botón "Guardar").
 *   - La voz puesta se marca ("Puesta").
 *   - Tocar corta el audio previo (stop) antes de reproducir.
 *   - La velocidad se elige en 3 botones y persiste.
 *
 * 2026-08-25 — reconciliado con la lista curada REAL (KOKORO_VOICES). Estos
 * tests venían del estado de #2240 (2026-07-09), cuando el default era
 * `pm_santa` y se había quitado a `ef_dora` por creer que `ef_`=inglés. El DR
 * de voz (DR-VOZ-TTS-2026-07-10, commit 3d5cc2a72 / #2304) probó que en Kokoro
 * `e[mf]_`=ESPAÑOL y `pm_`=portugués (la voz "robótica" era pm_santa). Se quitó
 * pm_santa y se REINCORPORÓ ef_dora como voz española válida — decisión
 * deliberada, confirmada en ttsService.voice.test.js. Aquí se actualizan los
 * casos que aún asertaban el mundo viejo (pm_santa presente, dora ausente).
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock del ttsService — solo interceptamos speakKokoro/stop; el resto (persist
// en localStorage) usa el módulo real para verificar la persistencia inmediata.
vi.mock('../../../services/ttsService', async () => {
  const actual = await vi.importActual('../../../services/ttsService');
  return {
    ...actual,
    speakKokoro: vi.fn().mockResolvedValue(null),
    stop: vi.fn(),
  };
});

import VoiceSelector from '../VoiceSelector';
import {
  speakKokoro,
  stop as stopTTS,
  KOKORO_VOICES,
  DEFAULT_KOKORO_VOICE,
} from '../../../services/ttsService';

describe('VoiceSelector — rediseño mínima fricción', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(speakKokoro).mockClear();
    vi.mocked(stopTTS).mockClear();
  });

  test('renderiza una tarjeta por voz curada (sin dropdown)', () => {
    render(<VoiceSelector />);
    expect(screen.queryByTestId('voice-dropdown')).not.toBeInTheDocument();
    for (const voice of KOKORO_VOICES) {
      const card = screen.getByTestId(`voice-option-${voice.id}`);
      expect(card).toBeInTheDocument();
      expect(card.textContent).toContain(voice.label);
    }
  });

  test('marca la voz por defecto como "Puesta" al abrir (storage vacío)', () => {
    render(<VoiceSelector />);
    expect(screen.getByTestId(`voice-puesta-${DEFAULT_KOKORO_VOICE}`)).toBeInTheDocument();
  });

  test('respeta la voz preferida persistida', () => {
    // em_alex: voz curada NO-default (el default es em_santa). pm_santa ya no
    // existe en KOKORO_VOICES (era portugués, removido en #2304).
    localStorage.setItem('chagra:tts:voice', 'em_alex');
    render(<VoiceSelector />);
    expect(screen.getByTestId('voice-puesta-em_alex')).toBeInTheDocument();
  });

  test('UN toque reproduce la voz Y la persiste de una (sin Guardar)', async () => {
    render(<VoiceSelector />);
    fireEvent.click(screen.getByTestId('voice-option-em_alex'));

    await waitFor(() => {
      expect(speakKokoro).toHaveBeenCalledTimes(1);
    });
    const [text, opts] = vi.mocked(speakKokoro).mock.calls[0];
    expect(text).toMatch(/soy Chagra/i);
    expect(opts.voice).toBe('em_alex');
    // Persistió inmediatamente, sin botón Guardar.
    expect(localStorage.getItem('chagra:tts:voice')).toBe('em_alex');
  });

  test('tocar corta el audio previo antes de reproducir (evita overlap)', async () => {
    render(<VoiceSelector />);
    // ef_dora: voz española válida reincorporada en #2304 (pm_santa ya no existe).
    fireEvent.click(screen.getByTestId('voice-option-ef_dora'));
    await waitFor(() => {
      expect(stopTTS).toHaveBeenCalled();
      expect(speakKokoro).toHaveBeenCalledTimes(1);
    });
  });

  test('la velocidad se elige en botones y persiste', async () => {
    render(<VoiceSelector />);
    fireEvent.click(screen.getByTestId('voice-speed-fast'));
    await waitFor(() => {
      expect(Number.parseFloat(localStorage.getItem('chagra:tts:rate'))).toBeCloseTo(1.1);
    });
    // Y esa velocidad viaja en el siguiente preview.
    fireEvent.click(screen.getByTestId('voice-option-em_alex'));
    await waitFor(() => expect(speakKokoro).toHaveBeenCalled());
    const [, opts] = /** @type {any} */ (speakKokoro).mock.calls[0];
    expect(opts.rate).toBeCloseTo(1.1);
  });

  test('ofrece a Dora (ef_dora): voz española válida reincorporada en #2304', () => {
    // El "quitar dora" de #2240 (2026-07-09) fue por creer que ef_=inglés. El
    // DR de voz (DR-VOZ-TTS-2026-07-10 / #2304) probó que e[mf]_=español y que
    // la voz robótica real era pm_santa (portugués). ef_dora se reincorporó
    // deliberadamente como voz española válida; el selector debe ofrecerla.
    // (La garantía "dora nunca por fallback ciego del server" la cubre
    // toServableVoice, verificada en ttsService.voice.test.js.)
    render(<VoiceSelector />);
    expect(screen.getByTestId('voice-option-ef_dora')).toBeInTheDocument();
  });
});
