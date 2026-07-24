/**
 * @vitest-environment jsdom
 */
/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { retrieveCorpus, isCorpusRetrievalEnabled } from '../corpusRetriever';

describe('corpusRetriever', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    vi.stubEnv('VITE_SIDECAR_URL', '/api/mcp/agro');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'test-token');
    vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', '');
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('isCorpusRetrievalEnabled', () => {
    it('OFF por defecto', () => {
      expect(isCorpusRetrievalEnabled()).toBe(false);
    });
    it('reconoce true/1/on', () => {
      for (const v of ['true', '1', 'on', 'TRUE']) {
        vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', v);
        expect(isCorpusRetrievalEnabled()).toBe(true);
      }
    });
  });

  describe('retrieveCorpus', () => {
    it('devuelve [] cuando el flag está OFF (sin fetch)', async () => {
      global.fetch = vi.fn();
      const r = await retrieveCorpus('cafe abono');
      expect(r).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('devuelve [] con query vacía', async () => {
      vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', 'true');
      global.fetch = vi.fn();
      expect(await retrieveCorpus('   ')).toEqual([]);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('mapea results del corpus a pasajes {key,text,score,title}', async () => {
      vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', 'true');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          degraded: false,
          counts: { vector: 8, graph: 8 },
          results: [
            { chunk_key: 'species:coffea_arabica:ficha', content: 'El café necesita sombra.', title: 'Café', similarity: 0.82, source_type: 'species_ficha' },
            { chunk_key: 'dr:abono-organico', content: 'El compost mejora el suelo.', title: 'Abono', similarity: 0.71, source_type: 'dr-fanout' },
          ],
        }),
      });
      const r = await retrieveCorpus('cafe abono', 2);
      expect(r).toHaveLength(2);
      expect(r[0]).toMatchObject({ key: 'corpus:species:coffea_arabica:ficha', text: 'El café necesita sombra.', score: 0.82, title: 'Café' });
      const [url, opts] = vi.mocked(global.fetch).mock.calls[0];
      expect(url).toBe('/api/mcp/agro/hybrid-retrieve');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token');
      expect(JSON.parse(opts.body)).toMatchObject({ query: 'cafe abono', top_k: 2 });
    });

    it('devuelve [] si degraded=true', async () => {
      vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', 'true');
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ degraded: true, results: [] }) });
      expect(await retrieveCorpus('x')).toEqual([]);
    });

    it('fail-soft: [] si fetch rechaza', async () => {
      vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', 'true');
      global.fetch = vi.fn().mockRejectedValue(new Error('network'));
      await expect(retrieveCorpus('x')).resolves.toEqual([]);
    });

    it('filtra results sin content', async () => {
      vi.stubEnv('VITE_USE_CORPUS_RETRIEVAL', 'true');
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ degraded: false, results: [{ chunk_key: 'a', content: '' }, { chunk_key: 'b', content: 'ok', similarity: 0.5 }] }),
      });
      const r = await retrieveCorpus('x');
      expect(r).toHaveLength(1);
      expect(r[0].key).toBe('corpus:b');
    });
  });
});
