/**
 * Tests para VoiceSelector — task #124 (2026-05-24).
 *
 * Cubre:
 *   - Renderiza dropdown con las voces curadas (KOKORO_VOICES)
 *   - "Probar" dispara speakKokoro con la voz seleccionada
 *   - "Guardar" persiste voice + rate en localStorage
 *   - Cambiar dropdown actualiza el state local (no persiste hasta Save)
 *   - Cada fila de "comparar voces" tiene su propio botón preview
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock del ttsService — solo necesitamos verificar que speakKokoro se llame
// con los args esperados; el detalle interno (fetch, audio) lo cubren los
// tests del service.
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

describe('VoiceSelector — task #124', () => {
  beforeEach(() => {
    localStorage.clear();
    speakKokoro.mockClear();
    stopTTS.mockClear();
  });

  test('renderiza dropdown con todas las voces curadas', () => {
    render(<VoiceSelector />);
    const dropdown = screen.getByTestId('voice-dropdown');
    expect(dropdown).toBeInTheDocument();
    // El select debe tener una option por voz.
    const options = dropdown.querySelectorAll('option');
    expect(options.length).toBe(KOKORO_VOICES.length);
    for (const voice of KOKORO_VOICES) {
      expect(dropdown.textContent).toContain(voice.label);
    }
  });

  test('selección inicial es la voz preferida del storage (o default)', () => {
    localStorage.setItem('chagra:tts:voice', 'ef_aoede');
    render(<VoiceSelector />);
    const dropdown = screen.getByTestId('voice-dropdown');
    expect(dropdown.value).toBe('ef_aoede');
  });

  test('selección inicial cae a default si storage vacío', () => {
    render(<VoiceSelector />);
    const dropdown = screen.getByTestId('voice-dropdown');
    expect(dropdown.value).toBe(DEFAULT_KOKORO_VOICE);
  });

  test('click "Probar esta voz" llama speakKokoro con la voz seleccionada', async () => {
    render(<VoiceSelector />);
    const dropdown = screen.getByTestId('voice-dropdown');
    fireEvent.change(dropdown, { target: { value: 'ef_kore' } });
    const previewBtn = screen.getByTestId('voice-preview-button');
    fireEvent.click(previewBtn);
    await waitFor(() => {
      expect(speakKokoro).toHaveBeenCalledTimes(1);
    });
    const [text, opts] = speakKokoro.mock.calls[0];
    expect(text).toMatch(/asistente Chagra/i);
    expect(opts).toMatchObject({ voice: 'ef_kore' });
  });

  test('click "Guardar" persiste voice + rate en localStorage', async () => {
    render(<VoiceSelector />);
    const dropdown = screen.getByTestId('voice-dropdown');
    fireEvent.change(dropdown, { target: { value: 'em_alex' } });
    const slider = screen.getByTestId('voice-rate-slider');
    fireEvent.change(slider, { target: { value: '1.05' } });
    const saveBtn = screen.getByTestId('voice-save-button');
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(localStorage.getItem('chagra:tts:voice')).toBe('em_alex');
    });
    expect(Number.parseFloat(localStorage.getItem('chagra:tts:rate'))).toBeCloseTo(1.05);
    // Flash de "Guardado" debe aparecer.
    expect(saveBtn).toHaveTextContent(/Guardado/i);
  });

  test('cada fila de "comparar voces" tiene su propio botón preview', async () => {
    render(<VoiceSelector />);
    for (const voice of KOKORO_VOICES) {
      const row = screen.getByTestId(`voice-row-${voice.id}`);
      expect(row).toBeInTheDocument();
      expect(row.textContent).toContain(voice.label);
    }
    // Click en una fila específica dispara preview de esa voz.
    const aoedeRow = screen.getByTestId('voice-row-ef_aoede');
    fireEvent.click(aoedeRow);
    await waitFor(() => {
      expect(speakKokoro).toHaveBeenCalledTimes(1);
    });
    const [, opts] = speakKokoro.mock.calls[0];
    expect(opts.voice).toBe('ef_aoede');
  });

  test('cambiar dropdown NO persiste hasta apretar Guardar (state local)', () => {
    render(<VoiceSelector />);
    const dropdown = screen.getByTestId('voice-dropdown');
    fireEvent.change(dropdown, { target: { value: 'ef_kore' } });
    // No tocamos Guardar — localStorage debe seguir sin la nueva voz.
    expect(localStorage.getItem('chagra:tts:voice')).toBeNull();
  });

  test('preview corta cualquier audio previo antes de reproducir (evita overlap)', async () => {
    render(<VoiceSelector />);
    const previewBtn = screen.getByTestId('voice-preview-button');
    fireEvent.click(previewBtn);
    await waitFor(() => {
      expect(stopTTS).toHaveBeenCalled();
      expect(speakKokoro).toHaveBeenCalledTimes(1);
    });
  });
});
