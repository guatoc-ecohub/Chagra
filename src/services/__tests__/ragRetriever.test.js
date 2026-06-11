/**
 * ragRetriever.test.js — cobertura del corpus RAG extendido (audit
 * deep finding #9, 2026-05-18).
 *
 * Verifica que `retrieve()` recupera passages estructurados nuevos:
 *   - `feeding_plan_markdown` (### Plan de alimentación)
 *   - `companions_markdown` (### Especies asociadas favorables)
 *   - `antagonists_markdown` (### Antagonistas)
 *
 * Estrategia:
 *   - Mock de fetch para servir un manifest.json mínimo + cycle-content
 *     docs sintéticos (sin tocar disco). Los docs incluyen los tres
 *     campos markdown nuevos para confirmar que flattenDoc los expone
 *     como passages indexables por BM25.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const MANIFEST = {
  generated_at: '2026-05-18T00:00:00Z',
  slugs: ['fragaria_test', 'coffea_test', 'lechuga_test'],
};

const FRAGARIA_DOC = {
  species_slug: 'fragaria_test',
  scientific_name: 'Fragaria × ananassa Test',
  common_names: ['fresa test'],
  family: 'Rosaceae',
  category: 'frutales_perennes',
  valor_pedagogico:
    'La fresa es una rosácea perenne con propagación por estolones. Requiere mulch para proteger el fruto del contacto con el suelo. Cultivada en clima frío entre 1800 y 2800 msnm en Cundinamarca y Boyacá.',
  feeding_plan_markdown:
    '### Plan de alimentación\n\nFuente: Agrosavia Manual de biopreparados 2015.\n\n- D+0: Aplicar bocashi al hoyo de trasplante · bocashi · 200 g — establece microbiota inicial.\n- D+15: Drench con humus líquido · humus_liquido · 250 ml — mitiga estrés post-trasplante.',
};

const COFFEA_DOC = {
  species_slug: 'coffea_test',
  scientific_name: 'Coffea arabica Test',
  common_names: ['café test'],
  family: 'Rubiaceae',
  category: 'medicinales_alelopaticas',
  valor_pedagogico:
    'El café arábica es el cultivo emblemático colombiano. Requiere sombra parcial y altitud entre 1200 y 2000 msnm. Variedades Caturra, Castillo y Cenicafé 1 son resistentes a roya.',
  companions_markdown:
    '### Especies asociadas favorables\n\nEstas especies favorecen el cultivo cuando se siembran cerca:\n- alnus_acuminata — Aliso andino (Alnus acuminata)\n- erythrina_edulis — Chachafruto (Erythrina edulis)',
  antagonists_markdown:
    '### Antagonistas (no asociar)\n\nEvite sembrar estas especies cerca:\n- foeniculum_vulgare — Hinojo (Foeniculum vulgare)',
};

const LECHUGA_DOC = {
  species_slug: 'lechuga_test',
  scientific_name: 'Lactuca sativa Test',
  common_names: ['lechuga test'],
  family: 'Asteraceae',
  category: 'hortalizas_hoja',
  valor_pedagogico:
    'La lechuga es una hortaliza de hoja de ciclo corto 60-75 días en clima frío. Requiere suelos sueltos ricos en materia orgánica. Hierve en el calor lo cual induce bolting prematuro.',
};

function setupFetchMock() {
  globalThis.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.endsWith('/cycle-content/manifest.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(MANIFEST),
      });
    }
    const match = u.match(/\/cycle-content\/([^.]+)\.json/);
    if (match) {
      const slug = match[1];
      const map = {
        fragaria_test: FRAGARIA_DOC,
        coffea_test: COFFEA_DOC,
        lechuga_test: LECHUGA_DOC,
      };
      const doc = map[slug];
      if (!doc) {
        return Promise.resolve({ ok: false, status: 404, headers: { get: () => 'text/html' } });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(doc),
      });
    }
    return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
  });
}

describe('ragRetriever — corpus extendido v2', () => {
  beforeEach(() => {
    vi.resetModules();
    setupFetchMock();
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('retrieve("plan alimentación fresa") devuelve passage con "### Plan de alimentación"', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('plan alimentación fresa bocashi humus', 5);
    expect(hits.length).toBeGreaterThan(0);
    const planHit = hits.find(
      (h) => h.species === 'fragaria_test' && h.text.includes('### Plan de alimentación'),
    );
    expect(planHit).toBeDefined();
    expect(planHit.text).toContain('bocashi');
    expect(planHit.key).toContain('feeding_plan_markdown');
  });

  it('retrieve("companions café arabica") devuelve passage con "### Especies asociadas favorables"', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('asociadas favorables café alnus erythrina', 5);
    expect(hits.length).toBeGreaterThan(0);
    const companionsHit = hits.find(
      (h) => h.species === 'coffea_test' && h.text.includes('### Especies asociadas favorables'),
    );
    expect(companionsHit).toBeDefined();
    expect(companionsHit.text).toContain('alnus_acuminata');
    expect(companionsHit.key).toContain('companions_markdown');
  });

  it('retrieve para antagonistas café devuelve passage con "### Antagonistas"', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('antagonistas café hinojo foeniculum no asociar', 5);
    const antagonistsHit = hits.find(
      (h) => h.species === 'coffea_test' && h.text.includes('### Antagonistas'),
    );
    expect(antagonistsHit).toBeDefined();
    expect(antagonistsHit.text).toContain('foeniculum_vulgare');
    expect(antagonistsHit.key).toContain('antagonists_markdown');
  });

  it('docs sin secciones extendidas no rompen el retrieve', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('lechuga hortaliza bolting clima frío', 5);
    expect(hits.length).toBeGreaterThan(0);
    const lechugaHit = hits.find((h) => h.species === 'lechuga_test');
    expect(lechugaHit).toBeDefined();
    // Lechuga no tiene feeding_plan_markdown/companions/antagonists.
    const lechugaPassages = hits.filter((h) => h.species === 'lechuga_test');
    lechugaPassages.forEach((p) => {
      expect(p.key).not.toContain('feeding_plan_markdown');
      expect(p.key).not.toContain('companions_markdown');
      expect(p.key).not.toContain('antagonists_markdown');
    });
  });
});

/**
 * Cobertura del fix de pre-tokenize (perf BM25, 2026-05-20).
 *
 * El refactor mueve `tokenize(doc.text)` desde scoreBM25 (hot path, una vez
 * por query × por doc) a loadCorpus (cold path, una vez por boot). Estos
 * tests verifican:
 *   - retrieve sigue devolviendo docs con shape público esperado.
 *   - score > 0 cuando hay match.
 *   - El shape devuelto NO incluye las estructuras internas de scoring
 *     (`tokenized`, `termCounts`, `docLen`) — solo species/text/key/score.
 *   - retrieve es determinístico (mismo input → mismo output).
 */
describe('ragRetriever — pre-tokenize perf fix', () => {
  beforeEach(() => {
    vi.resetModules();
    setupFetchMock();
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('retrieve("fresa") devuelve docs con score>0 y shape público {species, text, key, score}', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('fresa rosácea perenne estolones', 5, 'voice');
    expect(hits.length).toBeGreaterThan(0);
    hits.forEach((h) => {
      expect(h.score).toBeGreaterThan(0);
      expect(typeof h.species).toBe('string');
      expect(typeof h.text).toBe('string');
      expect(typeof h.key).toBe('string');
      // El refactor cambió `{...doc, score}` por proyección explícita.
      // No deben filtrarse estructuras internas de scoring.
      expect(h).not.toHaveProperty('tokenized');
      expect(h).not.toHaveProperty('termCounts');
      expect(h).not.toHaveProperty('docLen');
    });
  });

  it('retrieve es determinístico — dos llamadas con el mismo query devuelven mismos hits y mismo orden', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const q = 'café arábica sombra parcial altitud roya';
    const a = await retrieve(q, 5);
    const b = await retrieve(q, 5);
    expect(a.length).toBe(b.length);
    a.forEach((hit, i) => {
      expect(b[i].species).toBe(hit.species);
      expect(b[i].key).toBe(hit.key);
      expect(b[i].score).toBe(hit.score);
    });
  });

  it('retrieve respeta topK y ordena por score descendente', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const hits = await retrieve('fresa café lechuga clima frío hortaliza', 3);
    expect(hits.length).toBeLessThanOrEqual(3);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it('retrieve con query vacío o solo stopwords devuelve []', async () => {
    const { retrieve } = await import('../ragRetriever.js');
    const empty = await retrieve('', 5);
    expect(empty).toEqual([]);
    // tokens <=2 chars son filtrados por tokenize.
    const tiny = await retrieve('a b c', 5);
    expect(tiny).toEqual([]);
  });

  it('getCorpusStats refleja avgDocLen pre-computado', async () => {
    const { retrieve, getCorpusStats } = await import('../ragRetriever.js');
    // Forzar carga de corpus.
    await retrieve('fresa', 1);
    const stats = await getCorpusStats();
    expect(stats.totalDocs).toBeGreaterThan(0);
    expect(stats.uniqueTerms).toBeGreaterThan(0);
    expect(stats.avgDocLen).toBeGreaterThan(0);
  });
});

/**
 * Cobertura del HOTFIX prod-down 2026-06-02: loadCorpus paralelo-acotado.
 *
 * El bug: loadCorpus hacía `for (const slug) { await fetch }` SERIAL sobre los
 * ~491 slugs del manifest → la PRIMERA query de cada sesión (incluido un
 * saludo) colgaba ~3min porque cada fetch esperaba al anterior. El chat nunca
 * respondía en prod.
 *
 * El fix dispara los fetches en lotes con concurrencia acotada
 * (CORPUS_FETCH_CONCURRENCY = 12). Estos tests verifican empíricamente:
 *   - loadCorpus COMPLETA (no cuelga) con un corpus grande (>concurrency).
 *   - El fetch NO es estrictamente secuencial — hay >1 request en vuelo a la vez.
 *   - El nivel de concurrencia NO excede el límite (no abre 491 sockets juntos).
 *   - prewarmCorpus() deja el corpus listo (cacheado) para que retrieve sea
 *     instantáneo después, y nunca lanza aunque la carga falle.
 */
describe('ragRetriever — loadCorpus paralelo-acotado (hotfix prod-down 2026-06-02)', () => {
  const CONCURRENCY_LIMIT = 12;

  // Manifest grande para ejercitar varios lotes (3 lotes de 12 + resto).
  function makeBigManifest(n) {
    return { generated_at: '2026-06-02T00:00:00Z', slugs: Array.from({ length: n }, (_, i) => `sp_${i}`) };
  }

  // Mock de fetch con timing controlado: cada fetch de doc se resuelve tras un
  // tick, permitiendo que múltiples queden en vuelo simultáneamente. Trackea el
  // pico de concurrencia para asertar paralelismo acotado.
  function setupConcurrencyFetchMock(manifest) {
    const tracker = { inFlight: 0, peak: 0, docFetches: 0 };
    globalThis.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.endsWith('/cycle-content/manifest.json')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
          json: () => Promise.resolve(manifest),
        });
      }
      const match = u.match(/\/cycle-content\/(sp_\d+)\.json/);
      if (match) {
        tracker.docFetches += 1;
        tracker.inFlight += 1;
        tracker.peak = Math.max(tracker.peak, tracker.inFlight);
        const slug = match[1];
        const doc = {
          species_slug: slug,
          valor_pedagogico: `Documento sintético ${slug} para verificar carga paralela del corpus con suficiente texto indexable por BM25 en el retriever.`,
        };
        // Resolver en un macrotask para que varios fetches coexistan en vuelo.
        return new Promise((resolve) => {
          setTimeout(() => {
            tracker.inFlight -= 1;
            resolve({
              ok: true,
              status: 200,
              headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
              json: () => Promise.resolve(doc),
            });
          }, 5);
        });
      }
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
    });
    return tracker;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('loadCorpus completa con corpus grande y NO es estrictamente secuencial (peak concurrency > 1)', async () => {
    const N = 40; // > CONCURRENCY_LIMIT → varios lotes
    const tracker = setupConcurrencyFetchMock(makeBigManifest(N));
    const { retrieve, getCorpusStats } = await import('../ragRetriever.js');

    // Fuerza la carga del corpus completo. Si fuera serial-bloqueante, esto
    // tomaría N×delay; con batches corre en ceil(N/12) barreras.
    await retrieve('documento sintético corpus indexable', 5);

    const stats = await getCorpusStats();
    expect(stats.totalDocs).toBe(N); // los N docs se cargaron (corpus completo)
    expect(tracker.docFetches).toBe(N); // un fetch por slug, sin duplicar
    // La prueba central del fix: hubo MÁS DE UN fetch en vuelo a la vez.
    // En el código serial viejo, peak sería exactamente 1.
    expect(tracker.peak).toBeGreaterThan(1);
  });

  it('respeta el límite de concurrencia — peak nunca excede CORPUS_FETCH_CONCURRENCY', async () => {
    const N = 50;
    const tracker = setupConcurrencyFetchMock(makeBigManifest(N));
    const { retrieve } = await import('../ragRetriever.js');
    await retrieve('documento sintético corpus indexable', 5);
    // Con batches de 12, jamás debe haber 13+ requests simultáneos. Esto evita
    // abrir 491 sockets juntos contra el server / saturar la red móvil rural.
    expect(tracker.peak).toBeLessThanOrEqual(CONCURRENCY_LIMIT);
    // Y debe haber alcanzado el techo (o casi), confirmando que SÍ paraleliza
    // hasta el límite y no se queda en concurrencia 1-2.
    expect(tracker.peak).toBeGreaterThanOrEqual(2);
  });

  it('prewarmCorpus() deja el corpus cacheado y no relanza fetches en el primer retrieve', async () => {
    const N = 20;
    const tracker = setupConcurrencyFetchMock(makeBigManifest(N));
    const { prewarmCorpus, retrieve } = await import('../ragRetriever.js');

    await prewarmCorpus();
    const fetchesAfterPrewarm = tracker.docFetches;
    expect(fetchesAfterPrewarm).toBe(N); // pre-warm cargó todo

    // Tras el pre-warm, retrieve usa corpusCache: NO debe disparar más fetches
    // de docs (el corpus ya está caliente). Esto es lo que en prod elimina el
    // cuelgue de la primera query.
    const hits = await retrieve('documento sintético corpus indexable', 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(tracker.docFetches).toBe(fetchesAfterPrewarm); // sin fetches nuevos
  });

  it('prewarmCorpus() nunca lanza aunque el manifest/fetch falle', async () => {
    globalThis.fetch = vi.fn(() => Promise.reject(new Error('red caída')));
    const { prewarmCorpus } = await import('../ragRetriever.js');
    // No debe rechazar: el pre-warm es fire-and-forget y degrada en silencio.
    await expect(prewarmCorpus()).resolves.toBeUndefined();
  });
});

describe('ragRetriever — tier-gate del catalogo (SEC-002 / UXC-004)', () => {
  const MANIFEST_GATED = {
    generated_at: '2026-06-10T00:00:00Z',
    slugs: ['fragaria_test', 'coffea_test', 'lechuga_test', 'pro_only_1', 'pro_only_2'],
  };

  const OSS_SPECIES = [
    { id: 'fragaria_test', nombre_comun: 'Fresa' },
    { id: 'coffea_test', nombre_comun: 'Café' },
    { id: 'lechuga_test', nombre_comun: 'Lechuga' },
    // pro_only_1 y pro_only_2 NO estan en el catalogo OSS
  ];

  function setupGatedFetchMock() {
    const tracker = { docFetches: new Set() };
    globalThis.fetch = vi.fn((url) => {
      const u = String(url);
      if (u.endsWith('/cycle-content/manifest.json')) {
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
          json: () => Promise.resolve(MANIFEST_GATED),
        });
      }
      const match = u.match(/\/cycle-content\/([^.]+)\.json/);
      if (match) {
        tracker.docFetches.add(match[1]);
        return Promise.resolve({
          ok: true, status: 200,
          headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
          json: () => Promise.resolve({
            species_slug: match[1],
            valor_pedagogico: `Ficha pedagógica de ${match[1]} con suficiente texto para indexar y recuperar por BM25 en el corpus del retriever.`,
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
    });
    return tracker;
  }

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('SEC-002 — slugs fuera del catalogo OSS NO se fetchean ni entran al corpus', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(OSS_SPECIES),
    }));

    const tracker = setupGatedFetchMock();
    const { retrieve } = await import('../ragRetriever.js');

    await retrieve('ficha pedagógica', 5);

    // Solo los 3 slugs del catalogo se fetchearon
    expect(tracker.docFetches.has('fragaria_test')).toBe(true);
    expect(tracker.docFetches.has('coffea_test')).toBe(true);
    expect(tracker.docFetches.has('lechuga_test')).toBe(true);
    expect(tracker.docFetches.has('pro_only_1')).toBe(false);
    expect(tracker.docFetches.has('pro_only_2')).toBe(false);
    expect(tracker.docFetches.size).toBe(3);
  });

  it('SEC-002 — corpusStats refleja solo los docs dentro del catalogo', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(OSS_SPECIES),
    }));

    setupGatedFetchMock();
    const { retrieve, getCorpusStats } = await import('../ragRetriever.js');

    await retrieve('ficha pedagógica', 5);

    const stats = await getCorpusStats();
    // 3 en catalogo, 2 fuera → total debe ser 3
    expect(stats.totalDocs).toBe(3);
  });

  it('SEC-002 — si el catalogo falla, carga todos los slugs (degradacion segura)', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockRejectedValue(new Error('SQLite no disponible')),
    }));

    const tracker = setupGatedFetchMock();
    const { retrieve, getCorpusStats } = await import('../ragRetriever.js');

    await retrieve('ficha pedagógica', 5);

    const stats = await getCorpusStats();
    // Degradacion: sin catalogo, carga los 5 slugs completos
    expect(stats.totalDocs).toBe(5);
    expect(tracker.docFetches.size).toBe(5);
  });

  it('SEC-002 — catalogo vacio (sin especies) carga todos los slugs', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue([]),
    }));

    const tracker = setupGatedFetchMock();
    const { retrieve } = await import('../ragRetriever.js');

    await retrieve('ficha pedagógica', 5);

    expect(tracker.docFetches.size).toBe(5);
  });

  it('SEC-002 — retrieve solo devuelve docs dentro del tier', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(OSS_SPECIES),
    }));

    setupGatedFetchMock();
    const { retrieve } = await import('../ragRetriever.js');

    const hits = await retrieve('ficha pedagógica', 10);
    // Todos los hits deben ser de especies en el catalogo
    const catalogSlugs = new Set(OSS_SPECIES.map((s) => s.id));
    for (const hit of hits) {
      expect(catalogSlugs.has(hit.species)).toBe(true);
    }
  });
});
