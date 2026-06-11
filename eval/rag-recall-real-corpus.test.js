/**
 * rag-recall-real-corpus.test.js — recall@5 REAL contra el catálogo de PRODUCCIÓN.
 *
 * POR QUÉ EXISTE (auditoría de benches 2026-06-11): el test hermano
 * `rag-recall.test.js` mide recall sobre un corpus SINTÉTICO de 14 fichas
 * escritas a mano y, en su rama "híbrida", MOCKEA los embeddings con un vector
 * de query CONSTANTE (independiente del texto) → no medía recall semántico real,
 * y encima imprimía un "90%" HARDCODEADO que no salía de ninguna medición.
 *
 * Este test corre el MISMO `retrieve()` que usa la PWA, pero contra las 492
 * fichas REALES de `public/cycle-content/*.json` (servidas vía un mock de fetch
 * que devuelve el contenido de disco). Es el camino que el campesino ejercita de
 * verdad: BM25 léxico + expansión de sinónimos campesinos, SIN embeddings —
 * porque en prod NO existe `public/rag-embeddings.json` (semántico dormido).
 *
 * HONESTIDAD:
 *  - Corpus = REAL (492 fichas), declarado como tal. No sintético.
 *  - El catálogo real usa slugs a nivel VARIEDAD (solanum_tuberosum_sabanera,
 *    lactuca_sativa_capitata, daucus_carota_subsp_sativus...). El golden set usa
 *    slugs a nivel ESPECIE. Por eso el acierto se mide por PREFIJO de especie:
 *    cuenta si el top-5 trae CUALQUIER variedad de la especie esperada.
 *  - El número que imprime es MEDIDO en esta corrida, no hardcodeado.
 *  - El umbral de regresión se fija por debajo del valor medido empíricamente
 *    (no es una cifra bonita inventada). Si el recall real baja, el test falla.
 *
 * Se ejecuta con vitest: `npx vitest run eval/rag-recall-real-corpus.test.js`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import GOLDEN_SET from './rag-golden.json';

// En jsdom `import.meta.url` es un http:// URL, así que resolvemos contra el
// cwd de vitest (raíz del repo). `globalThis.process` evita el no-undef de
// eslint (config browser) sin perder acceso al runtime de node.
const REPO_ROOT = globalThis.process.cwd();
const CORPUS_DIR = join(REPO_ROOT, 'public', 'cycle-content');
const MANIFEST_PATH = join(CORPUS_DIR, 'manifest.json');

/**
 * Umbral de regresión: recall@5 medido empíricamente sobre las 492 fichas
 * reales (BM25 + sinónimos campesinos, sin embeddings). Se fija un punto por
 * DEBAJO del valor observado para que el test sea un guardarraíl honesto: si el
 * recall real cae por debajo de este piso, es una regresión y falla. NO es una
 * cifra optimista — el valor medido se imprime en cada corrida para auditarlo.
 */
const REAL_RECALL_FLOOR = 0.3;

// Carga perezosa del corpus real a memoria (una sola vez por archivo).
function loadRealCorpus() {
  if (!existsSync(MANIFEST_PATH)) {
    throw new Error(`No existe el manifest real: ${MANIFEST_PATH}`);
  }
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));
  const slugs = Array.isArray(manifest.slugs) ? manifest.slugs : [];
  const bySlug = new Map();
  for (const slug of slugs) {
    const file = `${CORPUS_DIR}/${slug}.json`;
    if (existsSync(file)) {
      bySlug.set(slug, readFileSync(file, 'utf-8'));
    }
  }
  return { slugs, bySlug };
}

/**
 * Mock de fetch que SIRVE LAS FICHAS REALES desde disco. Replica los
 * content-type y status que ve la PWA. /rag-embeddings.json → 404 (como en
 * prod: no existe) → fuerza el camino BM25-only real. El endpoint de embeddings
 * de ollama se rechaza (offline) — la PWA cae a BM25, su comportamiento real.
 */
function setupRealFetchMock(corpus) {
  const jsonHeaders = { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') };
  const notFound = () => Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });

  globalThis.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.endsWith('/cycle-content/manifest.json')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: jsonHeaders,
        json: () => Promise.resolve({ slugs: corpus.slugs }),
      });
    }
    if (u.includes('/rag-embeddings.json')) {
      // Realidad de prod: el asset de embeddings NO existe → semántico apagado.
      return notFound();
    }
    if (u.includes('/api/ollama/api/embeddings')) {
      // Offline-first: si ollama no responde, la PWA usa BM25 solo.
      return Promise.reject(new Error('ollama offline (test BM25-only real)'));
    }
    const match = u.match(/\/cycle-content\/([^/]+)\.json/);
    if (match) {
      const slug = match[1];
      const raw = corpus.bySlug.get(slug);
      if (!raw) return notFound();
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: jsonHeaders,
        json: () => Promise.resolve(JSON.parse(raw)),
      });
    }
    return notFound();
  });
}

/**
 * Acierto a nivel ESPECIE: el catálogo real usa slugs de variedad, el golden
 * usa slugs de especie. Cuenta si el slug del top-5 ES la especie esperada o
 * una de sus variedades (prefijo `especie_`).
 */
function matchesSpecies(topSlug, expectedSpecies) {
  return topSlug === expectedSpecies || String(topSlug).startsWith(`${expectedSpecies}_`);
}

describe('RAG recall@5 — catálogo REAL (492 fichas, BM25 + sinónimos, prod path)', () => {
  let corpus;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_DEFAULT_LOCATION_ID', '');
    corpus = loadRealCorpus();
    // Tier-gate: getAllSpecies devuelve TODOS los slugs reales → sin filtrado
    // (en prod OSS filtraría, pero acá medimos el grounding completo del corpus).
    vi.doMock('../src/db/catalogDB.js', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(corpus.slugs.map((id) => ({ id }))),
    }));
    setupRealFetchMock(corpus);
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('carga las 492 fichas reales del manifest', () => {
    expect(corpus.slugs.length).toBeGreaterThanOrEqual(490);
    expect(corpus.bySlug.size).toBe(corpus.slugs.length);
  });

  it('mide recall@5 REAL sobre el golden set (match a nivel especie)', async () => {
    const { retrieve } = await import('../src/services/ragRetriever.js');

    let passed = 0;
    let unattributed = 0; // passages del top-5 sin slug de especie (flattenDoc)
    let topSlots = 0;
    const details = [];
    const absent = [];

    for (const item of GOLDEN_SET) {
      // ¿La especie esperada existe en el catálogo real (alguna variedad)?
      const speciesExists = corpus.slugs.some((s) => matchesSpecies(s, item.expected));
      const hits = await retrieve(item.query, 5);
      const topSlugs = hits.slice(0, 5).map((h) => h.species);
      topSlots += topSlugs.length;
      unattributed += topSlugs.filter((s) => !s).length;
      const found = topSlugs.some((s) => matchesSpecies(s, item.expected));
      if (found) passed += 1;
      if (!speciesExists) absent.push(item.expected);
      details.push({ id: item.id, query: item.query, expected: item.expected, found, speciesExists, topSlugs });
    }

    const recall = passed / GOLDEN_SET.length;
    console.log(`\n[AUDIT real-corpus] recall@5 BM25 REAL: ${passed}/${GOLDEN_SET.length} = ${(recall * 100).toFixed(0)}% (medido, no hardcodeado)`);
    for (const d of details) {
      const tag = d.found ? 'OK ' : (d.speciesExists ? 'MISS' : 'N/A ');
      console.log(`  ${d.id} ${tag} "${d.query}" -> ${d.topSlugs.slice(0, 3).join(', ') || '(ninguno)'}${d.found ? '' : ` [esperado: ${d.expected}${d.speciesExists ? '' : ' — AUSENTE del catálogo real'}]`}`);
    }
    if (absent.length > 0) {
      console.log(`\n  NOTA honesta: ${absent.length}/${GOLDEN_SET.length} especies del golden NO están en el catálogo real (slugs de variedad): ${[...new Set(absent)].join(', ')}`);
    }
    // Diagnóstico de atribución: flattenDoc() en prod solo setea species_slug en
    // el nivel raíz de la ficha; los passages de campos ANIDADOS quedan sin
    // especie, así que un buen match en contenido anidado NO se atribuye a su
    // cultivo. Esto deprime el recall a-nivel-especie. Hallazgo de PROD (no se
    // toca acá), reportado para la auditoría agroecológica.
    const pctUnattributed = topSlots > 0 ? (100 * unattributed) / topSlots : 0;
    console.log(`\n  Diagnóstico atribución: ${unattributed}/${topSlots} slots del top-5 SIN especie (${pctUnattributed.toFixed(0)}%) — passages anidados que flattenDoc no atribuye.`);

    // Guardarraíl de regresión: el recall REAL no debe caer por debajo del piso
    // medido. Si baja, es una regresión del retriever o del corpus.
    expect(recall).toBeGreaterThanOrEqual(REAL_RECALL_FLOOR);
  });
});
