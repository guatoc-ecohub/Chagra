#!/usr/bin/env node
/**
 * bench-rag-retrieve.mjs - benchmark de latencia del retrieve BM25 (cold + warm).
 *
 * Mide el costo de `retrieve(query, topK)` sobre el corpus real (491+ species
 * en public/cycle-content/). Verifica el efecto del fix de pre-tokenize
 * (2026-05-20): antes scoreBM25 re-tokenizaba cada doc por query (500ms-2s
 * blocking), ahora usa termCounts pre-computados (~ms).
 *
 * REINGENIERIA 2026-06-15: antes eran 3 archivos (este + .loader.mjs +
 * .register.mjs) para una sola invocacion rara
 * (`node --import ./scripts/bench-rag-retrieve.register.mjs scripts/bench-rag-retrieve.mjs`).
 * Ahora el loader hook (que agrega `.js` a los imports estilo Vite de src/) se
 * registra AQUI via `register()` con un modulo data: URL, asi corre con una sola
 * invocacion simple:
 *
 *   node scripts/bench-rag-retrieve.mjs
 *
 * Opcional: emite un registro de historial estandarizado v1 con --history.
 *
 * NOTA (2026-06-15): el loader resuelve imports estilo Vite (.js implicito +
 * JSON sin atributo). La ejecucion completa contra el ragRetriever.js actual
 * ademas necesita el layer `import.meta.env` de Vite (varios config/*.js lo
 * usan) - gap PRE-EXISTENTE en main, NO introducido por esta consolidacion.
 * La fusion 3->1 archivos es valida igual; correr bajo Node puro requiere ese
 * shim de entorno (pendiente, ver INDEX/README).
 *
 * No usa Vitest. Stubea `fetch` con `fs.readFile` para servir el corpus desde
 * public/cycle-content/, simulando el flujo de carga del PWA.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { execSync } from 'node:child_process';
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const CORPUS_ROOT = join(ROOT_DIR, 'public', 'cycle-content');

// El codigo de src/ usa imports estilo Vite sin extension `.js` (ej.
// `from '../config/taxonomy'`). Node nativo exige extension. Registramos un
// resolve-hook que prueba extensiones cuando el specifier falla. Se define como
// modulo data: URL para que pueda registrarse ANTES del import dinamico de
// ragRetriever.js, sin necesitar un archivo separado (antes: bench-rag-retrieve.loader.mjs).
const LOADER_SOURCE = `
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const EXT_CANDIDATES = ['.js', '.mjs', '.jsx', '.ts', '.tsx'];
async function fileExists(url) {
  try { const s = await stat(fileURLToPath(url)); return s.isFile(); } catch { return false; }
}
export async function resolve(specifier, context, nextResolve) {
  // Imports JSON estilo Vite (sin 'with { type: json }'): inyectamos el atributo.
  if (specifier.endsWith('.json')) {
    context = { ...context, importAttributes: { ...(context.importAttributes || {}), type: 'json' } };
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) throw err;
    const base = context.parentURL ?? import.meta.url;
    for (const ext of EXT_CANDIDATES) {
      const candidate = new URL(specifier + ext, base);
      if (await fileExists(candidate)) return nextResolve(specifier + ext, context);
    }
    throw err;
  }
}
export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    context = { ...context, importAttributes: { ...(context.importAttributes || {}), type: 'json' }, format: 'json' };
  }
  return nextLoad(url, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(LOADER_SOURCE)}`);

// Stub global.fetch para que ragRetriever.js pueda cargar desde el FS.
globalThis.fetch = async (url) => {
  const u = String(url);
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
  } catch {
    return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
  }
};

const QUERIES = [
  'fresa cuidados clima frio',
  'cafe arabica sombra parcial roya',
  'lechuga bolting hortaliza',
  'maiz siembra suelo asociacion frijol',
  'aguacate poda fertilizacion clima calido',
  'banano sigatoka manejo sombra',
  'platano harton cosecha tiempo',
  'tomate plagas mosca blanca control biologico',
  'arroz drenaje suelo manejo agua',
  'yuca propagacion esquejes suelos arcillosos',
];

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function main() {
  const emitHistory = process.argv.includes('--history');
  if (!existsSync(CORPUS_ROOT)) {
    console.log(`[bench] SKIP: no existe corpus en ${CORPUS_ROOT}`);
    return;
  }

  let retrieve;
  let getCorpusStats;
  try {
    // Import dinamico para que el stub de fetch ya este en su lugar.
    ({ retrieve, getCorpusStats } = await import('../src/services/ragRetriever.js'));
  } catch (err) {
    console.log(`[bench] SKIP: no se pudo importar ragRetriever.js (${String(err.message).slice(0, 120)})`);
    return;
  }

  console.log('[bench] Cold load: cargando corpus completo + primera query...');
  const coldStart = performance.now();
  const firstHits = await retrieve(QUERIES[0], 5, 'bench');
  const coldMs = performance.now() - coldStart;
  const stats = await getCorpusStats();
  console.log(`[bench] Cold load: ${coldMs.toFixed(1)} ms`);
  console.log(`[bench] Corpus: ${stats.totalDocs} docs, ${stats.uniqueTerms} terms unicos, avgDocLen=${stats.avgDocLen}`);
  console.log(`[bench] Primera query devolvio ${firstHits.length} hits (top score=${firstHits[0]?.score?.toFixed(3) ?? 'n/a'})`);
  console.log('');

  const ITERATIONS = 3;
  const timings = [];
  console.log(`[bench] Warm: ${QUERIES.length} queries x ${ITERATIONS} iteraciones...`);
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const q of QUERIES) {
      const t0 = performance.now();
      await retrieve(q, 5, 'bench');
      timings.push(performance.now() - t0);
    }
  }
  timings.sort((a, b) => a - b);
  const total = timings.reduce((s, t) => s + t, 0);
  const p50 = percentile(timings, 50);
  const p95 = percentile(timings, 95);
  const avg = total / timings.length;
  console.log(`[bench] Warm: n=${timings.length}`);
  console.log(`[bench]   min   = ${timings[0].toFixed(2)} ms`);
  console.log(`[bench]   p50   = ${p50.toFixed(2)} ms`);
  console.log(`[bench]   p95   = ${p95.toFixed(2)} ms`);
  console.log(`[bench]   max   = ${timings[timings.length - 1].toFixed(2)} ms`);
  console.log(`[bench]   avg   = ${avg.toFixed(2)} ms`);

  const tokensTotal = stats.totalDocs * stats.avgDocLen;
  const memEstKB = (tokensTotal * 16 + stats.totalDocs * 64) / 1024;
  console.log(`[bench]   memoria extra estimada del pre-tokenize: ~${(memEstKB / 1024).toFixed(2)} MB`);

  if (emitHistory) {
    let commit = '';
    try {
      commit = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
    } catch { /* sin git */ }
    const path = writeHistoryRecord(
      buildHistoryRecord({
        bench: 'rag-retrieve',
        model: null,
        config: 'bm25',
        commit,
        metrics: {
          cold_load_ms: Number(coldMs.toFixed(1)),
          latency_p50_ms: Number(p50.toFixed(2)),
          latency_p95_ms: Number(p95.toFixed(2)),
          latency_avg_ms: Number(avg.toFixed(2)),
        },
      }),
    );
    console.log(`[bench] historial estandarizado escrito: ${path}`);
  }
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
