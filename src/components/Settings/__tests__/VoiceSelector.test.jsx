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
    localStorage.setItem('chagra:tts:voice', 'pm_santa');
    render(<VoiceSelector />);
    expect(screen.getByTestId('voice-puesta-pm_santa')).toBeInTheDocument();
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
    fireEvent.click(screen.getByTestId('voice-option-pm_santa'));
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

  test('ya no ofrece a Dora (ef_dora): el operador la quitó', () => {
    render(<VoiceSelector />);
    expect(screen.queryByTestId('voice-option-ef_dora')).not.toBeInTheDocument();
  });
});
