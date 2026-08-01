import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

const tts = vi.hoisted(() => ({
  speak: vi.fn(),
  speakKokoro: vi.fn().mockResolvedValue({}),
  stop: vi.fn(),
}));

vi.mock('../../services/ttsService.js', () => tts);

import EntradaValle3D from '../EntradaValle3D.jsx';

afterEach(() => {
  vi.clearAllMocks();
  tts.speakKokoro.mockResolvedValue({});
});

describe('EntradaValle3D', () => {
  test('narra el saludo de Angelita con Kokoro', async () => {
    const { container } = render(<EntradaValle3D onBack={() => {}} />);

    fireEvent.pointerDown(container.querySelector('.valle-root'));
    await act(async () => {});

    expect(tts.speakKokoro).toHaveBeenCalledWith(
      expect.stringMatching(/Bienvenido/i),
      { lang: 'es', rate: 0.98 },
    );
    expect(tts.speak).not.toHaveBeenCalled();
  });

  test('usa la voz del navegador si Kokoro no logra hablar', async () => {
    tts.speakKokoro.mockResolvedValue(null);
    const { container } = render(<EntradaValle3D onBack={() => {}} />);

    fireEvent.pointerDown(container.querySelector('.valle-root'));
    await act(async () => {});

    expect(tts.speak).toHaveBeenCalledWith(
      expect.stringMatching(/Bienvenido/i),
      { rate: 0.98, pitch: 1 },
    );
  });
});
