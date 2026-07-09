/**
 * Tests de CONSISTENCIA DE VOZ (2026-07-09).
 *
 * Bug reportado por el operador: "a veces habla una voz y luego otra". Causa:
 * cuando kokoro fallaba/timeouteaba, el TTS saltaba a window.speechSynthesis
 * (voz robótica del navegador) — a media sesión e incluso a media respuesta
 * (fallback por-frase en speakSentences). Resultado: la voz cambiaba de golpe.
 *
 * Fix: preferir kokoro SIEMPRE. Ante un fallo, reintentar con backoff; si aun
 * así falla, guardar SILENCIO consistente en vez de cambiar a la voz robótica.
 * El respaldo del navegador queda detrás de un flag OFF por defecto
 * (getBrowserVoiceFallback), que el operador puede reactivar a propósito.
 *
 * Estos tests verifican que, con el flag por defecto (OFF):
 *   - speakKokoro fallando NO llama a window.speechSynthesis.speak.
 *   - speakSentences fallando (synth o playback) NO llama a speechSynthesis.
 *   - reintenta antes de rendirse (recupera un blip transitorio).
 * Y que, con el flag ON, sí cae al navegador (comportamiento explícito).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  speakKokoro,
  speakSentences,
  getBrowserVoiceFallback,
  setBrowserVoiceFallback,
  KOKORO_MAX_RETRIES,
} from '../ttsService.js';

// MockAudio con cola de comportamientos de play() ('ok' | 'reject').
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
 * Avanza la "cadena" de speakSentences: dispara onended() de cada audio que
 * está sonando para que su playSentenceBlob resuelva y el loop avance. Mismo
 * patrón que ttsService.speakingState.test.js.
 */
async function drainSentenceChain() {
  for (let guard = 0; guard < 40; guard++) {
    await new Promise((r) => setTimeout(r, 0));
    const playing = audioInstances.find((a) => !a.paused && a.onended);
    if (playing) {
      playing.paused = true;
      playing.onended();
    }
  }
}

const TWO_SENTENCES =
  'La primera frase del agente es suficientemente larga para el pipeline de voz. ' +
  'La segunda frase tambien supera el umbral de caracteres minimo necesario.';

describe('ttsService — consistencia de voz (no saltar a la voz robótica)', () => {
  let fetchMock;
  let speechSynthesisMock;
  let originalAudio;

  beforeEach(() => {
    localStorage.clear();
    audioInstances = [];
    playBehaviors = [];
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    originalAudio = globalThis.Audio;
    // Mocks de globals de jsdom → casts a any (irreducibles: no implementamos
    // las interfaces completas HTMLAudioElement/SpeechSynthesis).
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
    // SpeechSynthesisUtterance debe existir para que speak() no reviente si
    // (indebidamente) se invocara.
    globalThis.SpeechSynthesisUtterance = /** @type {any} */ (
      class {
        constructor(t) { this.text = t; }
      }
    );
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    delete window.speechSynthesis;
    vi.restoreAllMocks();
  });

  describe('flag getBrowserVoiceFallback', () => {
    it('por defecto es false (una sola voz natural)', () => {
      expect(getBrowserVoiceFallback()).toBe(false);
    });

    it('set/get roundtrip', () => {
      expect(setBrowserVoiceFallback(true)).toBe(true);
      expect(getBrowserVoiceFallback()).toBe(true);
      setBrowserVoiceFallback(false);
      expect(getBrowserVoiceFallback()).toBe(false);
    });
  });

  describe('speakKokoro cuando kokoro falla', () => {
    it('NO salta a speechSynthesis por defecto (silencio consistente)', async () => {
      fetchMock.mockRejectedValue(new Error('kokoro caído'));

      const result = await speakKokoro('Hola, soy Chagra.');

      expect(result).toBeNull();
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });

    it('reintenta antes de rendirse (KOKORO_MAX_RETRIES + 1 intentos)', async () => {
      fetchMock.mockRejectedValue(new Error('503'));

      await speakKokoro('Texto de prueba.');

      // 1 intento inicial + KOKORO_MAX_RETRIES reintentos.
      expect(fetchMock).toHaveBeenCalledTimes(KOKORO_MAX_RETRIES + 1);
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });

    it('un blip transitorio se recupera sin cambiar de voz', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('blip 503'))
        .mockResolvedValue({
          ok: true,
          blob: async () => new Blob(['audio'], { type: 'audio/opus' }),
        });

      const audio = await speakKokoro('Recupera el blip.');

      expect(audio).toBeInstanceOf(MockAudio);
      expect(fetchMock).toHaveBeenCalledTimes(2); // falla 1, éxito al 2do
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });

    it('CON el flag ON sí cae al navegador (comportamiento explícito)', async () => {
      setBrowserVoiceFallback(true);
      fetchMock.mockRejectedValue(new Error('kokoro caído'));

      await speakKokoro('Hola con respaldo.');

      expect(speechSynthesisMock.speak).toHaveBeenCalledTimes(1);
    });
  });

  describe('speakSentences cuando kokoro falla', () => {
    it('NO salta a speechSynthesis si TODAS las frases fallan la síntesis', async () => {
      fetchMock.mockRejectedValue(new Error('kokoro caído'));

      const ok = await speakSentences(TWO_SENTENCES);

      expect(ok).toBe(false);
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });

    it('NO salta a speechSynthesis si una frase FALLA EL PLAYBACK a media respuesta', async () => {
      // Síntesis siempre OK; el playback de la 2da frase falla.
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['audio'], { type: 'audio/opus' }),
      });
      // 1ra frase suena, 2da rechaza play() → antes caía a speak() robótico.
      playBehaviors = ['ok', 'reject', 'ok', 'ok'];

      const promise = speakSentences(TWO_SENTENCES);
      await drainSentenceChain();
      const ok = await promise;

      expect(ok).toBe(true); // la primera frase sí sonó (kokoro)
      expect(speechSynthesisMock.speak).not.toHaveBeenCalled();
    });
  });
});
