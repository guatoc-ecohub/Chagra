import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MANIFEST = {
  generated_at: '2026-07-02T00:00:00Z',
  slugs: ['coffea_lexical', 'coffea_semantic', 'coffea_noise'],
};

const DOCS = {
  coffea_lexical: {
    species_slug: 'coffea_lexical',
    valor_pedagogico: 'plaga plaga larva oruga cafe cafe cafe broca broca broca',
  },
  coffea_semantic: {
    species_slug: 'coffea_semantic',
    valor_pedagogico: 'cafe manejo sombra roya hipotetico',
  },
  coffea_noise: {
    species_slug: 'coffea_noise',
    valor_pedagogico: 'suelo lluvia drenaje materia organica',
  },
};

const EMBEDDINGS = {
  coffea_lexical: [0, 1, 0],
  coffea_semantic: [1, 0, 0],
  coffea_noise: [0, 0, 1],
};

/** @returns {typeof globalThis.fetch} */
function setupFetchMock({ includeEmbeddings }) {
  // eslint-disable-next-line no-extra-parens -- cast JSDoc: el mock cubre solo el subset de Response usado
  return /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (vi.fn((url) => {
    const u = String(url);
    if (u.endsWith('/cycle-content/manifest.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(MANIFEST),
      });
    }
    const match = u.match(/\/cycle-content\/([^/]+)\.json$/);
    if (match) {
      const slug = match[1];
      const doc = DOCS[slug];
      if (!doc) {
        return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(doc),
      });
    }
    if (u.endsWith('/rag-embeddings.json')) {
      if (!includeEmbeddings) {
        return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(EMBEDDINGS),
      });
    }
    if (u.includes('/api/ollama/api/embeddings')) {
      if (!includeEmbeddings) {
        return Promise.reject(new Error('query embeddings disabled'));
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embedding: [1, 0, 0] }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
  })));
}

describe('ragRetriever - hybrid fusion', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(Object.keys(DOCS).map((id) => ({ id }))),
    }));
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('sube el ranking del doc semantico cuando embeddings y query embedding estan disponibles', async () => {
    globalThis.fetch = setupFetchMock({ includeEmbeddings: true });
    const { retrieve } = await import('../ragRetriever.js');

    const hits = await retrieve('gusano del cafe', 1, 'bench');

    expect(hits).toHaveLength(1);
    expect(hits[0].species).toBe('coffea_semantic');
    expect(hits[0].score).toBeGreaterThan(0);
  });

  it('degrada a BM25-only cuando no hay rag-embeddings', async () => {
    globalThis.fetch = setupFetchMock({ includeEmbeddings: false });
    const { retrieve } = await import('../ragRetriever.js');

    const hits = await retrieve('gusano del cafe', 1, 'bench');

    expect(hits).toHaveLength(1);
    expect(hits[0].species).toBe('coffea_lexical');
    expect(hits[0].score).toBeGreaterThan(0);
  });
});
