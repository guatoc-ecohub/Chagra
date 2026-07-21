import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

const tts = vi.hoisted(() => ({
  speak: vi.fn(),
  speakKokoro: vi.fn().mockResolvedValue({}),
  stop: vi.fn(),
}));

vi.mock('../../../services/ttsService.js', () => tts);

import { useAcompanante } from '../AcompananteMundo.jsx';

function VitrinaDePrueba() {
  const acompanante = useAcompanante('agua');
  return <button type="button" onClick={acompanante.narrar}>Escuchar</button>;
}

afterEach(() => {
  vi.clearAllMocks();
  tts.speakKokoro.mockResolvedValue({});
});

describe('useAcompanante', () => {
  test('narra las vitrinas con Kokoro antes de usar el respaldo', async () => {
    render(<VitrinaDePrueba />);

    fireEvent.click(screen.getByRole('button', { name: 'Escuchar' }));
    await act(async () => {});

    expect(tts.speakKokoro).toHaveBeenCalledWith(
      expect.any(String),
      { lang: 'es', rate: 0.98 },
    );
    expect(tts.speak).not.toHaveBeenCalled();
  });

  test('usa el respaldo del navegador si Kokoro falla', async () => {
    tts.speakKokoro.mockRejectedValue(new Error('sin audio'));
    render(<VitrinaDePrueba />);

    fireEvent.click(screen.getByRole('button', { name: 'Escuchar' }));
    await act(async () => {});

    expect(tts.speak).toHaveBeenCalledWith(
      expect.any(String),
      { rate: 0.98, pitch: 1 },
    );
  });
});
