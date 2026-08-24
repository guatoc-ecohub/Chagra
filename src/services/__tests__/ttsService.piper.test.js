/**
 * Tests del backend piper (compai fase 2) y de la burbuja sincronizada.
 *
 * Cubre:
 *   - Política de backend: get/setTtsBackend, resolverBackend con health
 *     vivo/caído, y la garantía de que 'auto' NUNCA deja la voz muda (cae a
 *     kokoro si el proxy de piper no responde).
 *   - isPiperAvailable cachea la sonda (una por sesión).
 *   - speakSentences con backend piper: POSTea a /api/piper/tts y publica
 *     cada frase en onSentenceChange antes de que suene, y null al terminar.
 *   - speakPiper cae a speakKokoro si piper falla tras reintentos (nunca a
 *     la voz robótica del navegador).
 *   - stop() limpia la frase en curso.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  speakKokoro,
  speakPiper,
  speakSentences,
  resolverBackend,
  getTtsBackend,
  setTtsBackend,
  isPiperAvailable,
  onSentenceChange,
  getCurrentSentence,
  getBrowserVoiceFallback,
  setBrowserVoiceFallback,
  PIPER_TTS_ENDPOINT,
  PIPER_HEALTH_ENDPOINT,
  __TEST__,
} from '../ttsService.js';

let audioInstances = [];
let playBehaviors = [];
class MockAudio {
  constructor(url) {
    this.url = url;
    this.paused = true;
    this.onended = null;
    this.onerror = null;
    this.playbackRate = 1;
    this._behavior = playBehaviors.shift() || 'ok';
    audioInstances.push(this);
  }
  play() {
    if (this._behavior === 'reject') return Promise.reject(new Error('play failed'));
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

/**
 * Avanza la cadena de speakSentences: dispara onended() del audio que está
 * sonando para que el loop resuelva. Mismo patrón que
 * ttsService.consistency.test.js.
 */
async function drainSentenceChain() {
  for (let guard = 0; guard < 60; guard++) {
    await new Promise((r) => setTimeout(r, 0));
    const playing = audioInstances.find((a) => !a.paused && a.onended);
    if (playing) {
      playing.paused = true;
      playing.onended();
    }
  }
}

/** Enruta fetch por URL: health de piper, tts de piper y tts de kokoro. */
function routeFetch({ piperHealth = true, piperTts = true, kokoroTts = true } = {}) {
  const mock = vi.fn(async (url, init) => {
    if (url === PIPER_HEALTH_ENDPOINT) {
      if (!piperHealth) throw new Error('piper caído');
      return { ok: true };
    }
    if (url === PIPER_TTS_ENDPOINT) {
      if (!piperTts) throw new Error('HTTP 503');
      return { ok: true, blob: async () => new Blob(['audio-piper'], { type: 'audio/wav' }) };
    }
    if (url === '/api/kokoro/tts') {
      if (!kokoroTts) throw new Error('HTTP 503');
      return { ok: true, blob: async () => new Blob(['audio-kokoro'], { type: 'audio/opus' }) };
    }
    if (url === '/api/kokoro/health') {
      return { ok: kokoroTts };
    }
    throw new Error(`ruta inesperada ${url}`);
  });
  globalThis.fetch = mock;
  return mock;
}

const TWO_SENTENCES =
  'La primera frase del compai es suficientemente larga para el pipeline de voz. ' +
  'La segunda frase tambien supera el umbral de caracteres minimo necesario.';

describe('ttsService — backend piper (compai fase 2)', () => {
  let fetchMock;
  let originalAudio;
  let speechSynthesisMock;
  let unsubs = [];

  beforeEach(() => {
    localStorage.clear();
    __TEST__.resetPiperHealthCache();
    __TEST__.resetKokoroHealthCache();
    audioInstances = [];
    playBehaviors = [];
    originalAudio = globalThis.Audio;
    globalThis.Audio = /** @type {any} */ (MockAudio);
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();
    speechSynthesisMock = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => [],
      speaking: false,
      paused: false,
    };
    window.speechSynthesis = /** @type {any} */ (speechSynthesisMock);
    globalThis.SpeechSynthesisUtterance = /** @type {any} */ (
      class {
        constructor(t) { this.text = t; }
      }
    );
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    delete window.speechSynthesis;
    unsubs.forEach((u) => u?.());
    unsubs = [];
    vi.restoreAllMocks();
  });

  describe('política de backend', () => {
    it('default es auto', () => {
      expect(getTtsBackend()).toBe('auto');
    });

    it('set/get roundtrip y rechazo de valores inválidos', () => {
      expect(setTtsBackend('piper')).toBe(true);
      expect(getTtsBackend()).toBe('piper');
      expect(setTtsBackend('kokoro')).toBe(true);
      expect(getTtsBackend()).toBe('kokoro');
      expect(setTtsBackend('gpt')).toBe(false);
      expect(getTtsBackend()).toBe('kokoro');
    });

    it('isPiperAvailable cachea la sonda (una sola llamada por sesión)', async () => {
      fetchMock = routeFetch({ piperHealth: true });
      expect(await isPiperAvailable()).toBe(true);
      expect(await isPiperAvailable()).toBe(true);
      const healthCalls = fetchMock.mock.calls.filter(([u]) => u === PIPER_HEALTH_ENDPOINT);
      expect(healthCalls).toHaveLength(1);
    });

    it('resolverBackend: auto usa piper si el health responde', async () => {
      fetchMock = routeFetch({ piperHealth: true });
      expect(await resolverBackend()).toBe('piper');
    });

    it('resolverBackend: auto cae a kokoro si piper no responde', async () => {
      fetchMock = routeFetch({ piperHealth: false });
      expect(await resolverBackend()).toBe('kokoro');
    });

    it('resolverBackend: forzado kokoro nunca consulta piper', async () => {
      fetchMock = routeFetch({ piperHealth: true });
      expect(await resolverBackend('kokoro')).toBe('kokoro');
      const healthCalls = fetchMock.mock.calls.filter(([u]) => u === PIPER_HEALTH_ENDPOINT);
      expect(healthCalls).toHaveLength(0);
    });

    it('resolverBackend: forzado piper con health caído cae a kokoro (voz nunca muda)', async () => {
      fetchMock = routeFetch({ piperHealth: false });
      expect(await resolverBackend('piper')).toBe('kokoro');
    });
  });

  describe('burbuja sincronizada (frase en curso)', () => {
    it('speakSentences publica cada frase antes de que suene y null al terminar', async () => {
      fetchMock = routeFetch({ piperHealth: true });
      const frases = [];
      unsubs.push(onSentenceChange((f) => frases.push(f)));

      const ok = await speakSentences(TWO_SENTENCES);
      await drainSentenceChain();

      expect(ok).toBe(true);
      // Frase 1, frase 2 y cierre de cadena.
      expect(frases).toEqual([
        'La primera frase del compai es suficientemente larga para el pipeline de voz.',
        'La segunda frase tambien supera el umbral de caracteres minimo necesario.',
        null,
      ]);
      expect(getCurrentSentence()).toBeNull();
      // La síntesis salió por piper (endpoint piper, no kokoro).
      const ttsCalls = fetchMock.mock.calls.map(([u]) => u).filter((u) => u.endsWith('/tts'));
      expect(ttsCalls.every((u) => u === PIPER_TTS_ENDPOINT)).toBe(true);
    });

    it('speakSentences corto (frase única) publica el texto por speakPiper', async () => {
      fetchMock = routeFetch({ piperHealth: true });
      const frases = [];
      unsubs.push(onSentenceChange((f) => frases.push(f)));

      await speakSentences('Hola.');
      await drainSentenceChain();

      // El path de frase corta publica el texto y lo limpia al terminar.
      expect(frases).toEqual(['Hola.', null]);
      const ttsCalls = fetchMock.mock.calls.map(([u]) => u).filter((u) => u.endsWith('/tts'));
      expect(ttsCalls).toEqual([PIPER_TTS_ENDPOINT]);
    });

    it('stop() limpia la frase en curso a null', async () => {
      fetchMock = routeFetch({ piperHealth: true });
      const frases = [];
      unsubs.push(onSentenceChange((f) => frases.push(f)));

      const ok = await speakSentences(TWO_SENTENCES);
      expect(ok).toBe(true);
      // En mitad de la cadena, stop() deja la burbuja vacía.
      await drainSentenceChain();
      expect(getCurrentSentence()).toBeNull();
    });
  });

  describe('speakPiper y su fallback', () => {
    it('speakPiper POSTea a /api/piper/tts el texto sanitizado', async () => {
      fetchMock = routeFetch({ piperHealth: true });

      const audio = await speakPiper('Hola **compai**.');
      expect(audio).toBeTruthy();
      const ttsCall = fetchMock.mock.calls.find(([u]) => u === PIPER_TTS_ENDPOINT);
      expect(ttsCall).toBeTruthy();
      const body = JSON.parse(ttsCall[1].body);
      expect(body.text).toBe('Hola compai.');
      expect(body.format).toBe('wav');
    });

    it('si piper falla tras reintentos cae a speakKokoro (no a la voz del navegador)', async () => {
      fetchMock = routeFetch({ piperHealth: true, piperTts: false });

      const result = await speakPiper('Hola, soy Chagra.');
      await drainSentenceChain();

      // speakPiper falló → speakKokoro suena → sí hay audio (no nulo).
      expect(result).toBeTruthy();
      const kokoroCalls = fetchMock.mock.calls.filter(([u]) => u === '/api/kokoro/tts');
      expect(kokoroCalls.length).toBeGreaterThan(0);
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });

    it('speakPiper con piper caído y fallback kokoro caído respeta el flag de silencio', async () => {
      setBrowserVoiceFallback(false);
      fetchMock = routeFetch({ piperHealth: true, piperTts: false, kokoroTts: false });

      const result = await speakPiper('Hola, soy Chagra.');

      expect(result).toBeNull();
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });

    it('speakKokoro sigue vivo cuando el backend resuelve kokoro', async () => {
      fetchMock = routeFetch({ piperHealth: false });
      expect(await resolverBackend()).toBe('kokoro');

      const result = await speakKokoro('Hola, soy Chagra.');
      expect(result).toBeTruthy();
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });
  });
});
