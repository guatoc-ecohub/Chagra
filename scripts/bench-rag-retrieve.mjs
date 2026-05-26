#!/usr/bin/env node
/**
 * bench-rag-retrieve.mjs — benchmark de latencia del retrieve BM25.
 *
 * Mide el costo de `retrieve(query, topK)` sobre el corpus real (491+ species
 * en public/cycle-content/). Útil para verificar el efecto del fix de
 * pre-tokenize (2026-05-20): antes scoreBM25 re-tokenizaba cada doc por
 * query (500ms-2s blocking), ahora usa termCounts pre-computados (~ms).
 *
 * Uso:
 *   node scripts/bench-rag-retrieve.mjs
 *
 * No usa Vitest. Stubea `fetch` con `fs.readFile` para servir el corpus
 * desde public/cycle-content/, simulando el flujo de carga del PWA.
 *
 * Output: timings cold load + N queries warm + percentiles.
 */
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_ROOT = join(__dirname, '..', 'public', 'cycle-content');

// El repo usa imports estilo Vite sin extensión `.js` (ej.
// `from '../config/taxonomy'`). Node nativo exige extensión, así que
// registramos un loader local con un customization hook.
//
// Implementado como script separado porque `register()` debe correr antes
// del import. Ver scripts/bench-rag-retrieve.loader.mjs para el hook.

// Stub global.fetch para que ragRetriever.js pueda cargar desde el FS.
globalThis.fetch = async (url) => {
  const u = String(url);
  // Ruta relativa /cycle-content/foo.json → file en disco.
  const m = u.match(/\/cycle-content\/(.+)$/);
  if (!m) {
    return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
  }
  const file = join(CORPUS_ROOT, m[1]);
  try {
    const buf = await readFile(file, 'utf-8');
    const data = JSON.parse(buf);
    return {
      ok: true,
      status: 200,
      headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
      json: async () => data,
    };
  } catch (_) {
    return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
  }
};

const QUERIES = [
  'fresa cuidados clima frío',
  'café arábica sombra parcial roya',
  'lechuga bolting hortaliza',
  'maíz siembra suelo asociación frijol',
  'aguacate poda fertilización clima cálido',
  'banano sigatoka manejo sombra',
  'plátano hartón cosecha tiempo',
  'tomate plagas mosca blanca control biológico',
  'arroz drenaje suelo manejo agua',
  'yuca propagación esquejes suelos arcillosos',
];

// Queries adicionales para benchmark qwen3 vs granite (20 prompts representativos)
const COMPARATIVE_QUERIES = [
  // Species (8)
  'fresa cuidados clima frío',
  'café arábica sombra parcial roya',
  'lechuga bolting hortaliza',
  'maíz siembra suelo asociación frijol',
  'aguacate poda fertilización clima cálido',
  'banano sigatoka manejo sombra',
  'plátano hartón cosecha tiempo',
  'tomate plagas mosca blanca control biológico',

  // Biopreparados (6)
  'caldo bordelés preparación aplicación',
  'biol fertilizante líquido preparación',
  'purín de ortigas uso abono',
  'extracto de ajo insecticida',
  'jabón potásico áfidos preparación',
  'trapiche compost lombriz preparación',

  // Plagas (6)
  'mosca blanca control biológico',
  'áfidoss control sin agroquímicos',
  'roya café manejo orgánico',
  'sigatoka negra banano tratamiento',
  'gusano cogollero maíz control',
  'pulgón del tomate identificación manejo',
];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  // Import dinámico para que el stub de fetch ya esté en su lugar.
  const { retrieve, getCorpusStats } = await import('../src/services/ragRetriever.js');

  // Cold load: la primera query carga manifest + 491 fetches + tokenize.
  console.log('[bench] Cold load: cargando corpus completo + primera query…');
  const coldStart = performance.now();
  const firstHits = await retrieve(QUERIES[0], 5, 'bench');
  const coldMs = performance.now() - coldStart;
  const stats = await getCorpusStats();
  console.log(`[bench] Cold load: ${coldMs.toFixed(1)} ms`);
  console.log(`[bench] Corpus: ${stats.totalDocs} docs, ${stats.uniqueTerms} terms únicos, avgDocLen=${stats.avgDocLen}`);
  console.log(`[bench] Primera query devolvió ${firstHits.length} hits (top score=${firstHits[0]?.score?.toFixed(3) ?? 'n/a'})`);
  console.log('');

  // Warm: cada query a corpus ya cacheado. Esto es lo que mide el hot path.
  const ITERATIONS = 3;
  const timings = [];
  console.log(`[bench] Warm: ${QUERIES.length} queries × ${ITERATIONS} iteraciones…`);
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const q of QUERIES) {
      const t0 = performance.now();
      await retrieve(q, 5, 'bench');
      const t1 = performance.now();
      timings.push(t1 - t0);
    }
  }
  timings.sort((a, b) => a - b);
  const total = timings.reduce((s, t) => s + t, 0);
  console.log(`[bench] Warm: n=${timings.length}`);
  console.log(`[bench]   min   = ${timings[0].toFixed(2)} ms`);
  console.log(`[bench]   p50   = ${percentile(timings, 50).toFixed(2)} ms`);
  console.log(`[bench]   p95   = ${percentile(timings, 95).toFixed(2)} ms`);
  console.log(`[bench]   max   = ${timings[timings.length - 1].toFixed(2)} ms`);
  console.log(`[bench]   avg   = ${(total / timings.length).toFixed(2)} ms`);

  // Estimación de memoria extra del pre-tokenize:
  // Heurística — cada token es un string ~8B (small string), termCounts Map
  // ~32B por entrada. avgDocLen tokens × totalDocs.
  const tokensTotal = stats.totalDocs * stats.avgDocLen;
  const memEstKB = (tokensTotal * 16 + stats.totalDocs * 64) / 1024;
  console.log(`[bench]   memoria extra estimada del pre-tokenize: ~${(memEstKB / 1024).toFixed(2)} MB`);
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
