import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Test del kill-switch REVERSIBLE de la capa semántica (VITE_RAG_SEMANTIC) y
// de la mitigación OOM (keep_alive:'0s') del embed en vivo. Confirma que:
//   1. La semántica está ACTIVA por defecto (default de prod, flag ausente).
//   2. Un valor de apagado explícito la desactiva → BM25-only (sin embed vivo).
//   3. El embed de la query lleva keep_alive:'0s' (anti-OOM por co-residencia).

const MANIFEST = {
  generated_at: '2026-07-06T00:00:00Z',
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

// Captura los cuerpos de request enviados a /api/ollama/api/embeddings para
// poder aseverar el keep_alive del embed en vivo.
function setupFetchMock(embedBodies) {
  const fn = vi.fn((url, opts) => {
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
      const doc = DOCS[match[1]];
      if (!doc) return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(doc),
      });
    }
    if (u.endsWith('/rag-embeddings.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(EMBEDDINGS),
      });
    }
    if (u.includes('/api/ollama/api/embeddings')) {
      try {
        embedBodies.push(JSON.parse(opts?.body ?? '{}'));
      } catch {
        embedBodies.push({ __unparseable: opts?.body });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ embedding: [1, 0, 0] }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
  });
  // El mock no calza con la firma completa de `fetch` (Response); cast a través
  // de unknown — irreducible para un stub de test, no toca runtime.
  return /** @type {typeof globalThis.fetch} */ (/** @type {unknown} */ (fn));
}

describe('ragRetriever - kill-switch semántico + mitigación OOM', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(Object.keys(DOCS).map((id) => ({ id }))),
    }));
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('la semántica está ACTIVA por defecto (flag ausente = ON en prod)', async () => {
    const { isSemanticEnabled } = await import('../ragRetriever.js');
    expect(isSemanticEnabled()).toBe(true);
  });

  it('por defecto embebe la query en vivo y el semántico manda el ranking', async () => {
    const embedBodies = [];
    globalThis.fetch = setupFetchMock(embedBodies);
    const { retrieve } = await import('../ragRetriever.js');

    const hits = await retrieve('gusano del cafe', 1, 'bench');

    // El doc semántico gana (embedding alineado a la query), no el lexical.
    expect(hits).toHaveLength(1);
    expect(hits[0].species).toBe('coffea_semantic');
    // Confirma que SÍ hubo embed en vivo (semántica activa).
    expect(embedBodies.length).toBeGreaterThan(0);
  });

  it('el embed en vivo lleva keep_alive:"0s" (mitigación OOM anti co-residencia)', async () => {
    const embedBodies = [];
    globalThis.fetch = setupFetchMock(embedBodies);
    const { retrieve } = await import('../ragRetriever.js');

    await retrieve('gusano del cafe', 1, 'bench');

    expect(embedBodies.length).toBeGreaterThan(0);
    for (const body of embedBodies) {
      expect(body.keep_alive).toBe('0s');
      expect(body.model).toBe('snowflake-arctic-embed2');
    }
  });

  it('VITE_RAG_SEMANTIC=false REVIERTE a BM25-only (sin embed en vivo)', async () => {
    vi.stubEnv('VITE_RAG_SEMANTIC', 'false');
    const embedBodies = [];
    globalThis.fetch = setupFetchMock(embedBodies);
    const { retrieve, isSemanticEnabled } = await import('../ragRetriever.js');

    expect(isSemanticEnabled()).toBe(false);
    const hits = await retrieve('gusano del cafe', 1, 'bench');

    // BM25-only: gana el doc lexical (frecuencia de términos), no el semántico.
    expect(hits).toHaveLength(1);
    expect(hits[0].species).toBe('coffea_lexical');
    // Kill-switch: NO se embebió la query en vivo → cero llamadas a Ollama.
    expect(embedBodies).toHaveLength(0);
  });

  it.each(['0', 'off', 'no', 'FALSE'])(
    'trata "%s" como apagado explícito',
    async (val) => {
      vi.stubEnv('VITE_RAG_SEMANTIC', val);
      const { isSemanticEnabled } = await import('../ragRetriever.js');
      expect(isSemanticEnabled()).toBe(false);
    },
  );

  it.each(['true', '1', 'on', '', 'cualquier-cosa'])(
    'trata "%s" como ACTIVADO (default seguro)',
    async (val) => {
      vi.stubEnv('VITE_RAG_SEMANTIC', val);
      const { isSemanticEnabled } = await import('../ragRetriever.js');
      expect(isSemanticEnabled()).toBe(true);
    },
  );
});
