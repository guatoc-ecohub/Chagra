/**
 * Tests para las preferencias persistidas de voz Kokoro (task #124).
 *
 * Cubre:
 *   - getPreferredVoice fallback + override
 *   - setPreferredVoice valida contra KOKORO_VOICES
 *   - getPreferredRate clamp + fallback
 *   - setPreferredRate clamp
 *   - speakKokoro respeta preferido cuando no se pasa voice explícito
 *   - speakKokoro respeta override explícito por sobre preferido
 *   - speakKokoro lleva el rate preferido cuando no se pasa explícito (a
 *     través del options.voice resolution; verificamos el body POSTed)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  getPreferredVoice,
  setPreferredVoice,
  getPreferredRate,
  setPreferredRate,
  speakKokoro,
  DEFAULT_KOKORO_VOICE,
  DEFAULT_KOKORO_RATE,
  KOKORO_RATE_MIN,
  KOKORO_RATE_MAX,
  KOKORO_VOICES,
} from '../ttsService.js';

// Mock Audio (jsdom no implementa play() de forma usable).
class MockAudio {
  constructor() {
    this.paused = true;
    this.onended = null;
  }
  play() {
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.paused = true;
  }
}

describe('ttsService — preferencias de voz Kokoro (task #124)', () => {
  let fetchMock;
  let originalAudio;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['fake-audio'], { type: 'audio/opus' }),
    });
    globalThis.fetch = fetchMock;
    originalAudio = globalThis.Audio;
    globalThis.Audio = /** @type {any} */ (MockAudio);
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:fake-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.Audio = originalAudio;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  describe('getPreferredVoice', () => {
    it('devuelve el default (em_santa) si localStorage está vacío', () => {
      expect(getPreferredVoice()).toBe(DEFAULT_KOKORO_VOICE);
      expect(getPreferredVoice()).toBe('em_santa');
    });

    it('devuelve la voz persistida si está en KOKORO_VOICES', () => {
      localStorage.setItem('chagra:tts:voice', 'em_alex');
      expect(getPreferredVoice()).toBe('em_alex');
    });

    it('devuelve default si el valor persistido NO está en KOKORO_VOICES (defensa contra corrupción)', () => {
      localStorage.setItem('chagra:tts:voice', 'ef_unknown_alien_voice');
      expect(getPreferredVoice()).toBe(DEFAULT_KOKORO_VOICE);
    });

    it('todas las voces de KOKORO_VOICES son selectables (sanity check)', () => {
      for (const voice of KOKORO_VOICES) {
        localStorage.setItem('chagra:tts:voice', voice.id);
        expect(getPreferredVoice()).toBe(voice.id);
      }
    });
  });

  describe('setPreferredVoice', () => {
    it('persiste voces válidas y devuelve true', () => {
      expect(setPreferredVoice('em_alex')).toBe(true);
      expect(localStorage.getItem('chagra:tts:voice')).toBe('em_alex');
    });

    it('rechaza voces no listadas y devuelve false', () => {
      expect(setPreferredVoice('ef_basura')).toBe(false);
      expect(localStorage.getItem('chagra:tts:voice')).toBeNull();
    });

    it('rechaza pm_santa: era portuguesa, se quitó del catálogo', () => {
      expect(setPreferredVoice('pm_santa')).toBe(false);
      expect(localStorage.getItem('chagra:tts:voice')).toBeNull();
    });

    it('idempotencia: setear dos veces la misma voz funciona', () => {
      setPreferredVoice('em_alex');
      setPreferredVoice('em_alex');
      expect(getPreferredVoice()).toBe('em_alex');
    });
  });

  describe('getPreferredRate / setPreferredRate', () => {
    it('getPreferredRate devuelve default si localStorage vacío', () => {
      expect(getPreferredRate()).toBe(DEFAULT_KOKORO_RATE);
    });

    it('persiste rate válido', () => {
      setPreferredRate(1.0);
      expect(getPreferredRate()).toBeCloseTo(1.0);
    });

    it('rate fuera del rango se clamp al mín/máx', () => {
      setPreferredRate(5.0);
      expect(getPreferredRate()).toBeCloseTo(KOKORO_RATE_MAX);
      setPreferredRate(0.1);
      expect(getPreferredRate()).toBeCloseTo(KOKORO_RATE_MIN);
    });

    it('rate no-finito se rechaza', () => {
      expect(setPreferredRate(NaN)).toBe(false);
      expect(setPreferredRate(Infinity)).toBe(false);
    });

    it('valor corrupto en storage cae a default', () => {
      localStorage.setItem('chagra:tts:rate', 'not-a-number');
      expect(getPreferredRate()).toBe(DEFAULT_KOKORO_RATE);
    });
  });

  describe('speakKokoro respeta preferencia persistida', () => {
    it('sin voice explícito usa getPreferredVoice (default em_santa cuando vacío)', async () => {
      await speakKokoro('Hola mundo');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.voice).toBe('em_santa');
    });

    it('sin voice explícito usa la voz preferida persistida', async () => {
      setPreferredVoice('ef_dora');
      await speakKokoro('Hola mundo');
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.voice).toBe('ef_dora');
    });

    it('voice explícito en options gana sobre la voz preferida (backwards compat)', async () => {
      setPreferredVoice('em_alex');
      await speakKokoro('Hola mundo', { voice: 'em_alex' });
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.voice).toBe('em_alex');
    });

    it('voice explícito gana aunque sea distinto del default (no se "promueve" preferencia)', async () => {
      setPreferredVoice('em_alex');
      await speakKokoro('Hola', { voice: 'ef_dora' });
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.voice).toBe('ef_dora');
    });

    it('ef_dora es voz española válida y servible: viaja al servidor tal cual', async () => {
      // FIX 2026-07-10: en Kokoro el primer prefijo es el IDIOMA, no el "género inglés".
      // e[mf]_ = ESPAÑOL, por lo que ef_dora (e = español, f = femenino) ES una voz
      // válida en español. Fue removida el 2026-07-09 por confusión con "English",
      // pero se reincorporó el 2026-07-10 tras descubrir que en Kokoro:
      //   - pm_ = Portugués
      //   - if_ = Italiano
      //   - e[mf]_ = ESPAÑOL
      // Ref: ops/DR-VOZ-TTS-2026-07-10.md, commit 3d5cc2a72 (#2304)
      setPreferredVoice('ef_dora');
      await speakKokoro('Hola', { voice: 'ef_dora' });
      const [, init] = fetchMock.mock.calls[0];
      const body = JSON.parse(init.body);
      expect(body.voice).toBe('ef_dora'); // dora viaja al servidor sin coerción
    });

    it('coerciona voces inglesas inexistentes (ef_aoede/ef_kore) a santa (DEFAULT_KOKORO_VOICE)', async () => {
      // Las voces ef_aoede y ef_kore no están en KOKORO_VOICES, por lo que se
      // coaccionan a la voz por defecto (em_santa) mediante toServableVoice().
      await speakKokoro('Hola', { voice: 'ef_aoede' });
      await speakKokoro('Hola', { voice: 'ef_kore' });
      for (const call of fetchMock.mock.calls) {
        const body = JSON.parse(call[1].body);
        expect(body.voice).toBe(DEFAULT_KOKORO_VOICE); // em_santa
      }
    });
  });
});
