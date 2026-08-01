/**
 * aiService.visionCache.test.js — integración liviana V-11 (#231).
 *
 * Verifica el wiring del cache de visión por hash sobre `analyzeFoliage` y
 * `recognizeSpecies`: la 2da llamada con la MISMA imagen (mismos bytes) debe
 * servirse del cache SIN re-invocar `streamOllama` (el modelo). Resultados
 * null (error del modelo) NO se cachean → la siguiente llamada sí reintenta.
 *
 * Patrón de mocks copiado de aiService.grounded.test.js: se mockea
 * `ollamaStream` y `ragRetriever` para no pegar a Ollama ni al corpus.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../ollamaStream', () => ({
  streamOllama: vi.fn(),
}));
vi.mock('../ragRetriever', () => ({
  retrieve: vi.fn().mockResolvedValue([]),
}));
// sidecar deshabilitado: recognizeSpecies (base) no lo toca, pero importarlo
// limpio evita side-effects.
vi.mock('../sidecarClient.js', () => ({
  isSidecarEnabled: vi.fn(() => false),
  callTool: vi.fn(),
  judgeVision: vi.fn(),
  planNlu: vi.fn(),
}));

import { analyzeFoliage, recognizeSpecies } from '../aiService.js';
import { clearCache } from '../visionCacheService.js';
import * as ollamaStream from '../ollamaStream.js';

describe('aiService — cache de visión por hash (V-11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCache();
  });

  describe('analyzeFoliage', () => {
    it('la 2da llamada con la misma imagen NO re-invoca el modelo (cache hit)', async () => {
      vi.mocked(ollamaStream.streamOllama).mockResolvedValue(
        JSON.stringify({ score: 80, issues: ['mancha'], treatment: 'caldo bordelés' }),
      );
      const blob = new Blob(['bytes-de-la-foto'], { type: 'image/jpeg' });

      const first = await analyzeFoliage(blob);
      expect(first).toBeTruthy();
      expect(first.score).toBe(80);
      expect(ollamaStream.streamOllama).toHaveBeenCalledTimes(1);

      // 2da llamada, MISMOS bytes → cache hit, sin nuevo fetch al modelo.
      const second = await analyzeFoliage(new Blob(['bytes-de-la-foto'], { type: 'image/jpeg' }));
      expect(ollamaStream.streamOllama).toHaveBeenCalledTimes(1);
      expect(second.score).toBe(80);
      expect(second._cached).toBe(true);
    });

    it('imagen distinta SÍ re-invoca el modelo (cache miss)', async () => {
      vi.mocked(ollamaStream.streamOllama).mockResolvedValue(
        JSON.stringify({ score: 70, issues: [], treatment: '' }),
      );
      await analyzeFoliage(new Blob(['foto-1'], { type: 'image/jpeg' }));
      await analyzeFoliage(new Blob(['foto-2-distinta'], { type: 'image/jpeg' }));
      expect(ollamaStream.streamOllama).toHaveBeenCalledTimes(2);
    });

    it('NO cachea null: si el modelo falla, la siguiente llamada reintenta', async () => {
      // Primer intento: respuesta no parseable → analyzeFoliage devuelve null.
      vi.mocked(ollamaStream.streamOllama).mockResolvedValueOnce('no-es-json-valido <<<');
      const blob = new Blob(['foto-error'], { type: 'image/jpeg' });
      const first = await analyzeFoliage(blob);
      expect(first).toBeNull();

      // Segundo intento mismos bytes: como null NO se cacheó, debe re-invocar.
      vi.mocked(ollamaStream.streamOllama).mockResolvedValueOnce(
        JSON.stringify({ score: 90, issues: [], treatment: 'ok' }),
      );
      const second = await analyzeFoliage(new Blob(['foto-error'], { type: 'image/jpeg' }));
      expect(ollamaStream.streamOllama).toHaveBeenCalledTimes(2);
      expect(second.score).toBe(90);
    });

    it('el resultado cacheado preserva el shape (sin _cached en la 1ra llamada)', async () => {
      vi.mocked(ollamaStream.streamOllama).mockResolvedValue(
        JSON.stringify({ score: 60, issues: ['x'], treatment: 'y' }),
      );
      const first = await analyzeFoliage(new Blob(['z'], { type: 'image/jpeg' }));
      expect(first._cached).toBeUndefined();
    });
  });

  describe('recognizeSpecies', () => {
    it('la 2da llamada con la misma imagen NO re-invoca el modelo (cache hit)', async () => {
      vi.mocked(ollamaStream.streamOllama).mockResolvedValue(
        JSON.stringify({
          common_name_es: 'café',
          scientific_name: 'Coffea arabica',
          confidence: 0.9,
          alternatives: [],
        }),
      );
      const blob = new Blob(['foto-cafe'], { type: 'image/jpeg' });

      const first = await recognizeSpecies(blob);
      expect(first).toBeTruthy();
      expect(first.scientific_name).toBe('Coffea arabica');
      const callsAfterFirst = vi.mocked(ollamaStream.streamOllama).mock.calls.length;
      expect(callsAfterFirst).toBeGreaterThanOrEqual(1);

      const second = await recognizeSpecies(new Blob(['foto-cafe'], { type: 'image/jpeg' }));
      // Sin nuevas llamadas al modelo.
      expect(ollamaStream.streamOllama).toHaveBeenCalledTimes(callsAfterFirst);
      expect(second.scientific_name).toBe('Coffea arabica');
      expect(second._cached).toBe(true);
    });

    it('NO cachea null cuando todos los fallbacks fallan', async () => {
      // Los 3 modelos devuelven basura no parseable → recognizeSpecies = null.
      vi.mocked(ollamaStream.streamOllama).mockResolvedValue('basura <<<');
      const blob = new Blob(['foto-mala'], { type: 'image/jpeg' });
      const first = await recognizeSpecies(blob);
      expect(first).toBeNull();
      const callsAfterFirst = vi.mocked(ollamaStream.streamOllama).mock.calls.length;

      // Segundo intento: null no se cacheó → re-invoca.
      vi.mocked(ollamaStream.streamOllama).mockResolvedValue(
        JSON.stringify({ common_name_es: 'mora', scientific_name: 'Rubus glaucus', confidence: 0.8, alternatives: [] }),
      );
      const second = await recognizeSpecies(new Blob(['foto-mala'], { type: 'image/jpeg' }));
      expect(vi.mocked(ollamaStream.streamOllama).mock.calls.length).toBeGreaterThan(callsAfterFirst);
      expect(second.scientific_name).toBe('Rubus glaucus');
    });
  });
});
