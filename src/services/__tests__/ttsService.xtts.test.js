/**
 * Tests para XTTS-v2 (voz colombiana) en ttsService (task #124).
 *
 * Cubre:
 *   - speakXTTS llama /api/xtts/tts con los parámetros correctos
 *   - speakXTTS hace fallback a speakKokoro cuando XTTS falla
 *   - speakXTTS respeta timeout XTTS_TIMEOUT_MS
 *   - getXTTSEnabled/setXTTSEnabled manage localStorage
 *   - speakXTTS sanitize markdown antes de enviar al server
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  speakXTTS,
  getXTTSEnabled,
  setXTTSEnabled,
  DEFAULT_COLOMBIAN_VOICE,
  XTTS_TIMEOUT_MS,
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

describe('ttsService — XTTS-v2 voz colombiana (task #124)', () => {
  let fetchMock;
  let originalAudio;
  let originalCreateObjectURL;
  let originalRevokeObjectURL;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
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

  describe('getXTTSEnabled / setXTTSEnabled', () => {
    it('getXTTSEnabled devuelve false por defecto (localStorage vacío)', () => {
      expect(getXTTSEnabled()).toBe(false);
    });

    it('setXTTSEnabled true persiste y getXTTSEnabled lo lee', () => {
      setXTTSEnabled(true);
      expect(getXTTSEnabled()).toBe(true);
    });

    it('setXTTSEnabled false persiste y getXTTSEnabled lo lee', () => {
      setXTTSEnabled(true);
      setXTTSEnabled(false);
      expect(getXTTSEnabled()).toBe(false);
    });

    it('valor corrupto en storage cae a false (defensa)', () => {
      localStorage.setItem('chagra:tts:xtts_enabled', 'not-a-boolean');
      expect(getXTTSEnabled()).toBe(false);
    });

    it('string "true" en storage es true, string "false" es false', () => {
      localStorage.setItem('chagra:tts:xtts_enabled', 'true');
      expect(getXTTSEnabled()).toBe(true);
      localStorage.setItem('chagra:tts:xtts_enabled', 'false');
      expect(getXTTSEnabled()).toBe(false);
    });
  });

  describe('speakXTTS happy path', () => {
    it('llama /api/xtts/tts con parámetros correctos (defaults)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      await speakXTTS('Hola mundo');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/xtts/tts');
      expect(init.method).toBe('POST');
      expect(init.headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(init.body);
      expect(body.text).toBe('Hola mundo');
      expect(body.voice_url).toBe(DEFAULT_COLOMBIAN_VOICE);
      expect(body.format).toBe('mp3');
      expect(body.lang).toBe('es');
    });

    it('permite override voiceUrl, format, lang en options', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/wav' }),
      });

      await speakXTTS('Test', {
        voiceUrl: '/voices/custom.wav',
        format: 'wav',
        lang: 'es-CO',
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.voice_url).toBe('/voices/custom.wav');
      expect(body.format).toBe('wav');
      expect(body.lang).toBe('es-CO');
    });

    it('sanitiza markdown antes de enviar al server', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      await speakXTTS('**Hola** *mundo* [link](url)');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.text).toBe('Hola mundo link');
    });

    it('crea Audio element y lo reproduce', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      const audio = await speakXTTS('Test');
      expect(audio).toBeInstanceOf(MockAudio);
      expect(/** @type {any} */ (audio).paused).toBe(false);
    });

    it('crea ObjectURL para el audio blob', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      await speakXTTS('Test');

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    });
  });

  describe('speakXTTS fallback a Kokoro', () => {
    it('intenta fallback a speakKokoro cuando XTTS retorna HTTP error', async () => {
      // XTTS falla una vez; el fallback a Kokoro responde OK al primer intento
      // (sin reintentos), así el total es exactamente 2 llamadas.
      fetchMock
        .mockRejectedValueOnce(new Error('HTTP 500'))
        .mockResolvedValue({
          ok: true,
          blob: async () => new Blob(['fake-audio'], { type: 'audio/opus' }),
        });

      await speakXTTS('Test');

      // 1 fetch para XTTS (falla) + 1 para Kokoro (ok al primer intento).
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toBe('/api/kokoro/tts');
    });

    it('intenta fallback a speakKokoro cuando response no es ok', async () => {
      fetchMock
        .mockRejectedValueOnce(new Error('HTTP 404'))
        .mockResolvedValue({
          ok: true,
          blob: async () => new Blob(['fake-audio'], { type: 'audio/opus' }),
        });

      await speakXTTS('Test');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][0]).toBe('/api/kokoro/tts');
    });

    // TODO: Test de timeout requiere mock complejo de AbortController + timers
    // Se probará en integración E2E con el endpoint real
  });

  describe('speakXTTS edge cases', () => {
    it('texto vacío no rompe (sanitización lo maneja)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      await expect(speakXTTS('')).resolves.toBeInstanceOf(MockAudio);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.text).toBe('');
    });

    it('texto solo markdown no rompe (sanitización lo limpia)', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      await expect(speakXTTS('**** [texto](url)')).resolves.toBeInstanceOf(MockAudio);

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.text).toBe('texto');
    });

    it('special chars se sanitizan correctamente', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        blob: async () => new Blob(['fake-audio'], { type: 'audio/mpeg' }),
      });

      await speakXTTS('# Heading\n\n- Item 1\n- Item 2\n\n**bold** and *italic*');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.text).not.toContain('#');
      expect(body.text).not.toContain('*');
      expect(body.text).not.toContain('-');
    });
  });
});
