import React from 'react';
import { act, render } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

const buses = [];
let master;

const parametro = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
});

const nodo = () => ({
  connect: vi.fn(function conectar() { return this; }),
  disconnect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
});

class AudioContextMock {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 20;
    this.state = 'running';
    this.destination = nodo();
  }

  createDynamicsCompressor() {
    return { ...nodo(), threshold: parametro(), ratio: parametro() };
  }

  createGain() {
    const gain = parametro();
    const gainNode = { ...nodo(), gain };
    if (!master) master = gainNode;
    else if (gain.setTargetAtTime) buses.push(gainNode);
    return gainNode;
  }

  createBuffer() {
    return { getChannelData: () => new Float32Array(50) };
  }

  createBufferSource() { return { ...nodo(), buffer: null, loop: false }; }

  createBiquadFilter() {
    return { ...nodo(), frequency: parametro(), Q: parametro(), type: '' };
  }

  createOscillator() {
    return { ...nodo(), frequency: parametro(), type: '' };
  }

  resume() { return Promise.resolve(); }
}

async function cargar() {
  vi.resetModules();
  const [{ default: useAudioMundo }, { default: usePrefsStore }] = await Promise.all([
    import('../useAudioMundo.js'),
    import('../../../store/usePrefsStore.js'),
  ]);
  return { useAudioMundo, usePrefsStore };
}

beforeEach(() => {
  buses.length = 0;
  master = null;
  window.AudioContext = /** @type {any} */ (AudioContextMock);
  localStorage.clear();
});

afterEach(() => {
  delete window.AudioContext;
  vi.useRealTimers();
});

describe('useAudioMundo', () => {
  it('cubre pila, preferencia apagada y reduced-motion', async () => {
    vi.useFakeTimers();
    const timer = vi.spyOn(globalThis, 'setTimeout');
    const { useAudioMundo, usePrefsStore } = await cargar();
    // #2400 migra la preferencia valle3d al cargar el store y jsdom notifica
    // localStorage con temporizadores. No son eventos del ambiente sonoro.
    timer.mockClear();
    act(() => usePrefsStore.setState({ sonido: 'on' }));
    function Host({ agua }) {
      useAudioMundo({ mundoId: 'valle', reducedMotion: true });
      return agua ? <Agua /> : null;
    }
    function Agua() {
      useAudioMundo({ mundoId: 'agua', reducedMotion: true });
      return null;
    }

    const vista = render(<Host agua={false} />);
    act(() => window.dispatchEvent(new Event('pointerdown')));
    expect(timer).not.toHaveBeenCalled();
    const capasTrasValle = buses.filter((n) =>
      n.gain.setTargetAtTime.mock.calls.some(([valor]) => valor === 1)).length;

    vista.rerender(<Host agua />);
    const capasTrasAgua = buses.filter((n) =>
      n.gain.setTargetAtTime.mock.calls.some(([valor]) => valor === 1)).length;
    vista.rerender(<Host agua={false} />);
    const capasTrasLiberar = buses.filter((n) =>
      n.gain.setTargetAtTime.mock.calls.some(([valor]) => valor === 1)).length;

    expect([capasTrasValle, capasTrasAgua, capasTrasLiberar]).toEqual([1, 2, 3]);
    act(() => usePrefsStore.setState({ sonido: 'off' }));
    expect(master.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 0, 0.4);
  });
});
