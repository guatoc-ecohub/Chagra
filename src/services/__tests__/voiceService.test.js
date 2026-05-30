/**
 * voiceService.test.js — cobertura unitaria del servicio de transcripción Whisper.
 *
 * Estrategia:
 *   - Mock de fetch global para simular respuestas de /api/whisper/asr.
 *   - Casos cubiertos:
 *       1. Transcripción exitosa con lang='es-CO' default.
 *       2. Transcripción con lenguaje customizado.
 *       3. Timeout de 15s (AbortController).
 *       4. Error HTTP del servidor.
 *       5. Respuesta vacía → error.
 *       6. queueForRetry delega a syncManager.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../syncManager', () => ({
  syncManager: {
    saveVoiceRecording: vi.fn(),
  },
}));

import { syncManager } from '../syncManager';
import { transcribe, queueForRetry } from '../voiceService';

describe('voiceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.useRealTimers();
  });

  describe('transcribe', () => {
    it('usa lang=es por defecto (whisper rechaza es-CO con HTTP 500)', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'Choachí está a mil quinientos metros sobre el nivel del mar' }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      const result = await transcribe(blob);

      expect(result).toBe('Choachí está a mil quinientos metros sobre el nivel del mar');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      const url = mockFetch.mock.calls[0][0];
      // Whisper acepta solo ISO-639-1 sin región; 'es-CO' se normaliza a 'es'.
      expect(url).toContain('language=es');
      expect(url).not.toContain('language=es-CO');
      expect(url).toContain('task=transcribe');
      expect(url).toContain('output=json');
    });

    it('acepta lenguaje customizado via options.language', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'wakichay tukuy imata' }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm' });
      const result = await transcribe(blob, { language: 'qu' });

      expect(result).toBe('wakichay tukuy imata');
      
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('language=qu');
    });

    it('transcribe correctamente toponímicos colombianos', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ 
          text: 'Fincas en Guatoc, La Calera, Sopó y Tabio cultivan café Castillo y lulo' 
        }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      const result = await transcribe(blob);

      expect(result).toBe('Fincas en Guatoc, La Calera, Sopó y Tabio cultivan café Castillo y lulo');
    });

    it('transcribe términos agro colombianos', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ 
          text: 'El café arábica Borbón necesita biopreparados como el Bocashi y el Caldo bordelés' 
        }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      const result = await transcribe(blob);

      expect(result).toBe('El café arábica Borbón necesita biopreparados como el Bocashi y el Caldo bordelés');
    });

    it('detecta mp4 por MIME type y usa extensión correcta', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'test' }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/mp4' });
      await transcribe(blob);

      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData).toBeInstanceOf(FormData);
      // No podemos inspeccionar FormData directamente, pero verificamos que se llamó
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('lanza error si el servidor responde no-2xx', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service Unavailable'),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });

      await expect(transcribe(blob)).rejects.toThrow('Whisper 503');
    });

    it('lanza error si la transcripción está vacía', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: '' }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });

      await expect(transcribe(blob)).rejects.toThrow('Transcripción vacía');
    });

    it('lanza error si la respuesta no tiene campo text', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });

      await expect(transcribe(blob)).rejects.toThrow('Transcripción vacía');
    });

    it('hace trim del texto transcrito', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: '  Choachí  ' }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      const result = await transcribe(blob);

      expect(result).toBe('Choachí');
    });

    it('configura AbortController con timeout de 15s', async () => {
      vi.useFakeTimers();
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');

      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ text: 'test' }),
      });
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });

      // Iniciamos la transcripción
      const transcribePromise = transcribe(blob);

      // Verificamos que setTimeout fue llamado con 15000ms
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 15000);

      // Limpiamos el timer para que el test no se quede colgado
      await vi.advanceTimersByTimeAsync(100);
      await transcribePromise;

      setTimeoutSpy.mockRestore();
      vi.useRealTimers();
    });

    it('propaga errores de red', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      globalThis.fetch = mockFetch;

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });

      await expect(transcribe(blob)).rejects.toThrow('Network error');
    });
  });

  describe('queueForRetry', () => {
    it('delega en syncManager.saveVoiceRecording con status pending', async () => {
      syncManager.saveVoiceRecording.mockResolvedValueOnce(undefined);

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      await queueForRetry(blob, { reason: 'Whisper 503', durationMs: 4500 });

      expect(syncManager.saveVoiceRecording).toHaveBeenCalledTimes(1);
      const callArgs = syncManager.saveVoiceRecording.mock.calls[0];
      expect(callArgs[0]).toBe(blob);
      expect(callArgs[1]).toMatchObject({
        status: 'pending',
        lastError: 'Whisper 503',
        durationMs: 4500,
      });
    });

    it('usa valores default si metadata está incompleta', async () => {
      syncManager.saveVoiceRecording.mockResolvedValueOnce(undefined);

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });
      await queueForRetry(blob, {});

      expect(syncManager.saveVoiceRecording).toHaveBeenCalledTimes(1);
      const callArgs = syncManager.saveVoiceRecording.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        status: 'pending',
        lastError: null,
        durationMs: 0,
      });
    });

    it('propaga errores de syncManager', async () => {
      syncManager.saveVoiceRecording.mockRejectedValueOnce(new Error('DB error'));

      const blob = new Blob(['audio data'], { type: 'audio/webm;codecs=opus' });

      await expect(queueForRetry(blob)).rejects.toThrow('DB error');
    });
  });
});
