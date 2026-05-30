import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests de agentSoundService (Web Audio API).
 *
 * El servicio cachea un AudioContext en una variable de módulo (`let audioCtx`),
 * así que cada test usa vi.resetModules() + import dinámico para arrancar con
 * estado de módulo fresco. window.AudioContext se stubea con un constructor
 * falso que registra los osciladores/ganancias creados para poder asercionar
 * que se disparó sonido sin reproducir audio real.
 *
 * No se asercionan nombres internos de modelos ni nada sensible: solo la
 * mecánica de habilitar/silenciar y la emisión de tonos.
 */

let createdOscillators;
let createdContexts;

function makeAudioParam() {
  return {
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
  };
}

function makeAudioContextMock(state = 'running') {
  return function AudioContextMock() {
    const ctx = {
      state,
      currentTime: 0,
      destination: { _isDestination: true },
      resume: vi.fn(() => Promise.resolve()),
      createOscillator: vi.fn(() => {
        const osc = {
          type: 'sine',
          frequency: makeAudioParam(),
          connect: vi.fn(() => osc._gainTarget), // chainable: devuelve el gain
          start: vi.fn(),
          stop: vi.fn(),
          _gainTarget: null,
        };
        createdOscillators.push(osc);
        return osc;
      }),
      createGain: vi.fn(() => {
        const gain = { gain: makeAudioParam(), connect: vi.fn(() => ctx.destination) };
        // el último oscilador creado encadena a este gain
        const lastOsc = createdOscillators[createdOscillators.length - 1];
        if (lastOsc) lastOsc._gainTarget = gain;
        return gain;
      }),
    };
    createdContexts.push(ctx);
    return ctx;
  };
}

async function loadService() {
  vi.resetModules();
  return import('../agentSoundService.js');
}

beforeEach(() => {
  localStorage.clear();
  createdOscillators = [];
  createdContexts = [];
  vi.unstubAllGlobals();
});

describe('flag de sonido (localStorage)', () => {
  it('por defecto el sonido está habilitado', async () => {
    const { isSoundEnabled } = await loadService();
    expect(isSoundEnabled()).toBe(true);
  });

  it('setSoundEnabled(false) lo silencia y persiste', async () => {
    const { setSoundEnabled, isSoundEnabled } = await loadService();
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    expect(localStorage.getItem('chagra:agent:sound')).toBe('0');
  });

  it('setSoundEnabled(true) lo reactiva', async () => {
    const { setSoundEnabled, isSoundEnabled } = await loadService();
    setSoundEnabled(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });
});

describe('agentSounds — emisión de tonos', () => {
  it('chime() crea osciladores cuando hay AudioContext y el sonido está activo', async () => {
    vi.stubGlobal('AudioContext', makeAudioContextMock('running'));
    const { agentSounds } = await loadService();
    agentSounds.chime();
    expect(createdOscillators.length).toBeGreaterThanOrEqual(1);
    const osc = createdOscillators[0];
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
    expect(osc.connect).toHaveBeenCalled();
  });

  it('cada helper (listen/start/error/cancel) dispara al menos un tono', async () => {
    vi.stubGlobal('AudioContext', makeAudioContextMock('running'));
    const { agentSounds } = await loadService();
    for (const name of ['listen', 'start', 'error', 'cancel']) {
      createdOscillators = [];
      agentSounds[name]();
      expect(createdOscillators.length, `helper ${name}`).toBeGreaterThanOrEqual(1);
    }
  });

  it('reanuda el contexto si está suspendido', async () => {
    vi.stubGlobal('AudioContext', makeAudioContextMock('suspended'));
    const { agentSounds } = await loadService();
    agentSounds.listen();
    expect(createdContexts[0].resume).toHaveBeenCalled();
  });

  it('NO crea osciladores si el sonido está silenciado', async () => {
    vi.stubGlobal('AudioContext', makeAudioContextMock('running'));
    const { agentSounds, setSoundEnabled } = await loadService();
    setSoundEnabled(false);
    agentSounds.error();
    expect(createdOscillators).toHaveLength(0);
  });

  it('degrada silencioso (no lanza) si no hay AudioContext en el entorno', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', undefined);
    const { agentSounds } = await loadService();
    expect(() => agentSounds.start()).not.toThrow();
    expect(createdOscillators).toHaveLength(0);
  });

  it('usa webkitAudioContext como fallback', async () => {
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', makeAudioContextMock('running'));
    const { agentSounds } = await loadService();
    agentSounds.listen();
    expect(createdOscillators.length).toBeGreaterThanOrEqual(1);
  });
});
