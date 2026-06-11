/**
 * rag-recall.test.js — recall@5 sobre un corpus SINTÉTICO controlado (14 fichas
 * escritas a mano con vocabulario técnico) para probar el GAP léxico campesino.
 *
 * ⚠️ ESTO NO ES EL RECALL DE PRODUCCIÓN. El corpus de abajo es SINTÉTICO y
 * pequeño; sirve solo para un experimento controlado del gap "broca" vs "gusano
 * del café". La medición REAL contra las 492 fichas del catálogo de producción
 * vive en `eval/rag-recall-real-corpus.test.js` (recall@5 real ≈ 35%, BM25-only,
 * porque en prod NO existe `public/rag-embeddings.json`).
 *
 * AUDITORÍA 2026-06-11: este archivo (a) declaraba un "90%" HARDCODEADO que no
 * salía de ninguna medición, y (b) en su rama "híbrida" mockeaba el embedding de
 * la query con un vector CONSTANTE (independiente del texto), así que NO medía
 * recall semántico — solo probaba que el pipeline RRF no crashea. Ambas cosas
 * quedaron corregidas: el 90% se eliminó y la rama híbrida se renombró a lo que
 * realmente es (un smoke test de infraestructura, no un número de recall).
 *
 * AIA-004: la auditoría pide MEDIR, no asumir.
 *
 * Se ejecuta con vitest: `npx vitest run eval/rag-recall.test.js`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import GOLDEN_SET from './rag-golden.json';

const MANIFEST = {
  generated_at: '2026-06-10T00:00:00Z',
  slugs: [
    'coffea_arabica', 'solanum_tuberosum', 'solanum_lycopersicum',
    'zea_mays', 'phaseolus_vulgaris', 'lactuca_sativa', 'allium_cepa',
    'fragaria_ananassa', 'persea_americana', 'manihot_esculenta',
    'rubus_glaucus', 'daucus_carota', 'musa_paradisiaca',
    'solanum_betaceum',
  ],
};

// Fichas sintéticas con vocabulario TÉCNICO (no campesino) para probar
// el gap semántico: "gusano del café" vs "broca (Hypothenemus hampei)"
const CORPUS_DOCS = {
  coffea_arabica: [
    'La broca del café (Hypothenemus hampei) se controla con trampas Brocap y hongos entomopatógenos Beauveria bassiana. El caldo bordelés previene la roya del cafeto (Hemileia vastatrix). El sombrío con leguminosas como Inga edulis regula la temperatura y reduce la incidencia de plagas. Las variedades resistentes Castillo y Cenicafé 1 tienen tolerancia a roya.',
  ],
  solanum_tuberosum: [
    'La gota o tizón tardío (Phytophthora infestans) es la enfermedad principal de la papa. Se controla con fungicidas cúpricos preventivos y drenaje adecuado. El gusano blanco (Premnotrypes vorax) se maneja con control biológico usando Metarhizium anisopliae. La papa se cultiva entre 2500 y 3500 msnm en clima frío de páramo.',
  ],
  zea_mays: [
    'El gusano cogollero (Spodoptera frugiperda) ataca el maíz en etapa vegetativa. Control biológico con Bacillus thuringiensis y liberación de Trichogramma. Fertilización con bocashi al momento de la siembra y urea fraccionada al aporque.',
  ],
  solanum_lycopersicum: [
    'Plagas principales del tomate: áfidos, mosca blanca (Bemisia tabaci) y trips. Control con jabón potásico y trampas cromáticas azules. La antracnosis se previene con caldo bordelés cada 15 días.',
  ],
  allium_cepa: [
    'La cebolla es una planta alelopática que suprime malezas naturalmente mediante compuestos sulfurados. Se asocia bien con zanahoria para control mutuo de plagas. No requiere herbicidas si se maneja con mulch y densidad adecuada.',
  ],
  lactuca_sativa: [
    'Plagas de la lechuga: áfidos, gusanos comedores de hoja y minadores. Control con Bacillus thuringiensis para lepidópteros. El bolting prematuro se evita con temperaturas frescas y riego constante.',
  ],
  fragaria_ananassa: [
    'La fresa es susceptible a botrytis (hongo blanco) y oidio en condiciones de alta humedad. Manejo preventivo con caldo bordelés y ventilación del cultivo. Propagación por estolones en clima frío entre 1800-2800 msnm.',
  ],
  persea_americana: [
    'El aguacate se cosecha cuando alcanza madurez fisiológica: el fruto cede a presión suave y el pedúnculo se torna amarillo. La maduración continúa post-cosecha. Variedades Hass y Lorena son las más cultivadas en Colombia.',
  ],
  phaseolus_vulgaris: [
    'Plagas del fríjol: hormigas cortadoras, gusanos de suelo y áfidos. Control con barreras físicas y aceite de neem. Los nódulos de rhizobium fijan nitrógeno atmosférico, reduciendo la necesidad de fertilización nitrogenada.',
  ],
  manihot_esculenta: [
    'La yuca se siembra en laderas y lomas con preparación mínima del suelo. Es tolerante a sequía y suelos pobres. El principal riesgo es la pudrición radicular por exceso de humedad — requiere buen drenaje.',
  ],
  rubus_glaucus: [
    'La mora de Castilla se seca por déficit hídrico, pudrición radicular o ataque de ácaros. Manejo integrado: riego por goteo, mulch orgánico y monitoreo de ácaros con lupa.',
  ],
  daucus_carota: [
    'La zanahoria se cosecha entre 90 y 120 días después de la siembra, cuando el hombro de la raíz alcanza 2-3 cm de diámetro. Requiere suelo suelto y profundo para evitar bifurcaciones.',
  ],
  musa_paradisiaca: [
    'El plátano se protege del viento con barreras vivas de matarratón o guadua. El vuelco por viento es el principal riesgo en zonas de ladera. También se usan tutores de madera en plantas con racimo pesado.',
  ],
  solanum_betaceum: [
    'El tomate de árbol requiere poda de formación eliminando chupones y ramas bajas. La poda sanitaria remueve ramas secas o enfermas. Se forma en vaso abierto para facilitar la cosecha y ventilación.',
  ],
};

function setupFetchMock({ embedOk = false, mockEmbeddings = false } = {}) {
  const fetchTracker = { embedCalls: 0 };

  // Vectores dummy 768d: cada slug codifica su nombre en las primeras
  // 32 posiciones del vector como un hash simple. El vector de query
  // tambien usa ese hash → la similitud coseno es mas alta para slugs
  // cuyo nombre aparece en la query (simulando lo que haria nomic-embed).
  function slugHash(slug, len) {
    const v = new Array(len).fill(0);
    for (let i = 0; i < slug.length; i++) {
      v[i % len] = (slug.charCodeAt(i) / 255) * 2 - 1;
    }
    // Normalizar a norma ~1 para que coseno sea comparable
    let norm = 0;
    for (let i = 0; i < len; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < len; i++) v[i] /= norm;
    return v;
  }

  const mockVectors = {};
  if (mockEmbeddings) {
    for (const slug of Object.keys(CORPUS_DOCS)) {
      mockVectors[slug] = slugHash(slug, 768);
    }
  }

  globalThis.fetch = vi.fn((url) => {
    const u = String(url);
    if (u.endsWith('/cycle-content/manifest.json')) {
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(MANIFEST),
      });
    }
    if (u.includes('/rag-embeddings.json')) {
      if (!mockEmbeddings) {
        return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
      }
      return Promise.resolve({
        ok: true, status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve(mockVectors),
      });
    }
    const match = u.match(/\/cycle-content\/([^.]+)\.json/);
    if (match) {
      const slug = match[1];
      const texts = CORPUS_DOCS[slug] || [];
      return Promise.resolve({
        ok: texts.length > 0, status: texts.length > 0 ? 200 : 404,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: () => Promise.resolve({
          species_slug: slug,
          valor_pedagogico: texts[0] || '',
          milestones: texts.slice(1).map((t, i) => ({ label: `Etapa ${i}`, description: t })),
          companions: [],
          failure_modes: [],
        }),
      });
    }
    if (u.includes('/api/ollama/api/embeddings')) {
      fetchTracker.embedCalls += 1;
      if (!embedOk) return Promise.reject(new Error('Ollama down'));
      // Leer el body de la request para generar un embedding contextual
      // (simula nomic-embed: el vector de query es cercano a los slugs
      // cuyos nombres o conceptos aparecen en el texto de la query).
      return Promise.resolve({
        ok: true, status: 200,
        json: () => Promise.resolve({ embedding: slugHash('generic_query', 768) }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, headers: { get: () => '' } });
  });

  return fetchTracker;
}

function computeRecallAt5(hits, expectedSlug) {
  const topSlugs = hits.slice(0, 5).map((h) => h.species);
  const found = topSlugs.includes(expectedSlug);
  return { found, topSlugs, expectedSlug };
}

describe('RAG recall@5 — AIA-004 golden set', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_DEFAULT_LOCATION_ID', '');
  });

  afterEach(() => {
    delete globalThis.fetch;
    vi.clearAllMocks();
  });

  it('BM25-only (sin embeddings): recall@5 sobre 20 consultas campesinas', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(
        Object.keys(CORPUS_DOCS).map((id) => ({ id })),
      ),
    }));

    setupFetchMock({ embedOk: false });
    const { retrieve } = await import('../src/services/ragRetriever.js');

    let passed = 0;
    const details = [];

    for (const item of GOLDEN_SET) {
      const hits = await retrieve(item.query, 5);
      const { found, topSlugs } = computeRecallAt5(hits, item.expected);
      if (found) passed += 1;
      details.push({
        id: item.id,
        query: item.query,
        expected: item.expected,
        found,
        topSlugs,
      });
    }

    const recall = passed / GOLDEN_SET.length;
    console.log(`\n[AIA-004] BM25 recall@5: ${passed}/${GOLDEN_SET.length} = ${(recall * 100).toFixed(0)}%\n`);
    for (const d of details) {
      console.log(`  ${d.id} ${d.found ? '✅' : '❌'} "${d.query}" → ${d.topSlugs.slice(0, 3).join(', ') || '(ninguno)'}${d.found ? '' : ` [esperado: ${d.expected}]`}`);
    }

    // BM25-only: esperamos que al menos los matches léxicos funcionen.
    // "gusano del cafe" vs "broca" probablemente falle (gap semántico).
    expect(recall).toBeGreaterThan(0);
    expect(passed).toBeGreaterThanOrEqual(1);
  });

  // SMOKE TEST de INFRAESTRUCTURA — NO es una medición de recall.
  //
  // El embedding de la query se mockea con un vector CONSTANTE
  // (slugHash('generic_query')), idéntico para todas las consultas. Por eso el
  // ranking semántico es el MISMO para cualquier query → NO mide relación
  // semántica real. Solo verifica que el pipeline híbrido (BM25 + coseno + RRF)
  // corre sin crashear y que se consulta el endpoint de embeddings.
  //
  // El recall semántico REAL requiere nomic-embed-text de verdad: hay que correr
  // `node scripts/build-rag-embeddings.mjs` (genera public/rag-embeddings.json,
  // hoy AUSENTE en prod) y medir. Ver la lista de "pruebas duras" en el reporte
  // de auditoría. Mientras tanto, prod corre BM25-only.
  it('SMOKE infra: el pipeline híbrido (BM25+semántico+RRF) corre sin crashear', async () => {
    vi.doMock('../../db/catalogDB', () => ({
      getAllSpecies: vi.fn().mockResolvedValue(
        Object.keys(CORPUS_DOCS).map((id) => ({ id })),
      ),
    }));

    const tracker = setupFetchMock({ embedOk: true, mockEmbeddings: true });
    const { retrieve } = await import('../src/services/ragRetriever.js');

    let hits_total = 0;
    for (const item of GOLDEN_SET) {
      const hits = await retrieve(item.query, 5);
      hits_total += hits.length;
    }

    // Lo único que este test puede afirmar HONESTAMENTE:
    // 1. La pipeline híbrida corre sin crash (BM25 + semántico + RRF).
    // 2. El endpoint de embeddings se consultó por cada query.
    // 3. El resultado es no-vacío.
    // NO afirma ningún recall: el vector de query mock es constante.
    expect(tracker.embedCalls).toBeGreaterThanOrEqual(GOLDEN_SET.length);
    expect(hits_total).toBeGreaterThan(0);

    console.log('\n[infra] híbrido OK (sin crash). NO es recall — query embedding mock es constante.');
    console.log('[infra] recall REAL: ver eval/rag-recall-real-corpus.test.js (35% BM25) y build-rag-embeddings.mjs para el semántico.');
  });
});
