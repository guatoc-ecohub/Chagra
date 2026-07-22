#!/usr/bin/env node
/**
 * bench-retriever-real.mjs — mide el RETRIEVER COMPLETO de producción
 * (`retrieve()` de `src/services/ragRetriever.js`: BM25 + sinónimos +
 * semántico + fusión normalizada + `collapseVarieties()`) con cada uno de
 * los 4 embedders candidatos, sobre el mismo golden set que usa
 * `scripts/bench-embedders.mjs`.
 *
 * POR QUÉ EXISTE: `bench-embedders.mjs` compara embedders DESNUDOS (coseno
 * puro sobre el corpus, sin BM25 ni fusión ni colapso de variedades).
 * Producción nunca sirve ese ranking crudo — sirve la salida de
 * `retrieve()`. Este script cierra ese hueco: la pregunta que decide si
 * vale la pena cambiar de embedder es "¿cambia el recall del SISTEMA
 * completo?", no "¿cambia el recall del embedder aislado?".
 *
 * CÓMO IMPORTA EL RETRIEVER REAL (sin reescribir su lógica):
 * `ragRetriever.js` está escrito para navegador (`import.meta.env`,
 * `fetchWithAuthRetry`, `catalogDB` con SQLite-WASM + IndexedDB). Se importa
 * TAL CUAL vía Node module hooks (`node:module` `register()`,
 * `bench-retriever-real.loader.mjs`) que:
 *   - stubean `authService.js` / `tenantContext.js` (no participan de
 *     retrieve(), pero revientan al evaluarse fuera de un browser),
 *   - stubean `catalogDB.js` para que el tier-gate confíe en TODOS los
 *     slugs del manifest (ver comentario largo en el loader: el stub
 *     equivalente de `bench-rag-retrieve.loader.mjs`, catálogo=[], degrada
 *     HOY a un subconjunto de solo 44/501 especies por el mismo drift de
 *     catálogo base→variedad que rompe 15 items del golden — usar ESE
 *     stub aquí habría contaminado la comparación de embedders con una
 *     merma de corpus que no tiene nada que ver con el embedder),
 *   - interceptan `fetch()` para servir el corpus real desde
 *     `public/cycle-content/` en disco y reenviar el POST de embeddings al
 *     Ollama real (`nativeFetch`), reescribiendo `model` al candidato bajo
 *     prueba — así `embedQuery()` (que hardcodea `snowflake-arctic-embed2`
 *     en el archivo real) se prueba con los 4 modelos SIN tocar
 *     `ragRetriever.js`.
 *
 * Mismo mecanismo, ya probado en prod desde 2026-07-02
 * (`scripts/bench-rag-retrieve.mjs`, ver `bench/history/rag-retrieve__*`).
 *
 * GPU: Ollama en alpha es loopback-only y admite UNA medición a la vez.
 * Correr SIEMPRE bajo gpu-lock, y SIEMPRE con OLLAMA_URL apuntando a
 * 127.0.0.1 en la propia alpha (no hay ruta de red hacia afuera):
 *
 *   ssh alpha
 *   cd <checkout de esta rama>
 *   gpu-lock retriever-real -- \
 *     env OLLAMA_URL=http://127.0.0.1:11434 node scripts/bench-retriever-real.mjs
 *
 * think:false — no aplica: este bench solo llama a POST /api/embeddings
 * (Ollama), que no tiene parámetro de razonamiento. No hay llamadas a
 * modelos de generación/chat en este script.
 *
 * Flags:
 *   --models=m1,m2       override de la lista de embedders (default: los 4).
 *   --limit=N             solo los primeros N items evaluables del golden
 *                          (smoke test rápido, sin gastar la corrida completa).
 *   --skip-corpus-embed    no regenerar embeddings de corpus si ya existe
 *                          cache en data/bench-runs/retriever-real/ (default:
 *                          SÍ reusa cache si el manifest no cambió; con este
 *                          flag además tolera cache de otra corrida y NO
 *                          valida stamp — usar solo para iterar el arnés).
 *   --history              además de la tabla, escribe un registro por
 *                          modelo en bench/history/ (esquema estándar).
 *
 * Salida:
 *   - Tabla comparativa en stdout.
 *   - data/bench-runs/retriever-real-<fecha>.json (detalle completo, gitignored).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { register } from 'node:module';
import { execSync } from 'node:child_process';
import { extractPassageText } from './build-rag-embeddings.mjs';
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const CORPUS_ROOT = join(PUBLIC_DIR, 'cycle-content');
const MANIFEST_PATH = join(CORPUS_ROOT, 'manifest.json');
const GOLDEN_PATH = join(ROOT_DIR, 'eval', 'rag-golden.json');
const OUTPUT_DIR = join(ROOT_DIR, 'data', 'bench-runs');
const CORPUS_EMBED_CACHE_DIR = join(OUTPUT_DIR, 'retriever-real');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const TOP_K = Number(process.env.RAG_TOPK || 5);

const ALL_MODELS = [
  ['nomic-embed-text', 'nomic-embed-text (PROD hoy)'],
  ['bge-m3', 'bge-m3'],
  ['snowflake-arctic-embed2', 'snowflake-arctic-embed2 (embedQuery() hardcoded)'],
  ['granite-embedding:278m', 'granite-embedding:278m'],
];

// MISMA lista que scripts/bench-embedders.mjs y scripts/bench-reranker.mjs:
// queries cross-species sin slug de especie en el corpus (conceptos, no
// especies). Se excluyen del cálculo — igual que ambos benches previos.
const NON_SLUG_EXPECTED = new Set([
  'biopreparado', 'associacion', 'mito_lunar', 'suelo_acido',
  'agua_calidad', 'erosion',
]);

const nativeFetch = globalThis.fetch?.bind(globalThis);
register(new URL('./bench-retriever-real.loader.mjs', import.meta.url).href);

function parseArgs(argv) {
  const out = { models: null, limit: null, skipCorpusEmbed: false, history: false };
  for (const arg of argv) {
    if (arg.startsWith('--models=')) out.models = arg.slice('--models='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--limit=')) out.limit = Number(arg.slice('--limit='.length));
    else if (arg === '--skip-corpus-embed') out.skipCorpusEmbed = true;
    else if (arg === '--history') out.history = true;
  }
  return out;
}

function slugifyModel(model) {
  return model.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function loadJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * Genera (o reusa) los embeddings de corpus PARA UN MODELO, uno por slug del
 * manifest, con el MISMO extractor de texto (`extractPassageText`) que usa
 * `build-rag-embeddings.mjs` para construir el asset real de prod — así el
 * texto embebido es idéntico al que produce el pipeline de build, solo
 * cambia el modelo bajo prueba.
 *
 * Cachea en disco (data/bench-runs/retriever-real/, gitignored) para no
 * re-embeber 501 fichas cada vez que se itera el arnés — clave por modelo +
 * cantidad de slugs del manifest (invalidación barata pero suficiente: si el
 * corpus cambia de tamaño, se regenera).
 *
 * @param {string} model
 * @param {{skipCorpusEmbed:boolean}} opts
 * @returns {Promise<{embeddings:Record<string, number[]>, errors:number, dim:number}>}
 */
async function ensureCorpusEmbeddings(model, opts) {
  mkdirSync(CORPUS_EMBED_CACHE_DIR, { recursive: true });
  const manifest = loadJson(MANIFEST_PATH);
  const slugs = manifest.slugs || [];
  const cachePath = join(CORPUS_EMBED_CACHE_DIR, `corpus-embeddings.${slugifyModel(model)}.json`);
  const metaPath = join(CORPUS_EMBED_CACHE_DIR, `corpus-embeddings.${slugifyModel(model)}.meta.json`);

  if (existsSync(cachePath) && existsSync(metaPath)) {
    const meta = loadJson(metaPath);
    if (opts.skipCorpusEmbed || meta.manifestSlugCount === slugs.length) {
      console.log(`  [corpus-embed] cache HIT para ${model} (${meta.validSlugs} vectores, ${meta.errors} errores) — ${cachePath}`);
      return { embeddings: loadJson(cachePath), errors: meta.errors, dim: meta.dim };
    }
  }

  console.log(`  [corpus-embed] generando embeddings de corpus para ${model} (${slugs.length} slugs)...`);
  const embeddings = {};
  let errors = 0;
  let dim = 0;
  const BATCH = 10;
  for (let i = 0; i < slugs.length; i += BATCH) {
    const batch = slugs.slice(i, i + BATCH);
    await Promise.all(batch.map(async (slug) => {
      const docPath = join(CORPUS_ROOT, `${slug}.json`);
      if (!existsSync(docPath)) return;
      const doc = loadJson(docPath);
      const text = extractPassageText(doc);
      if (!text) return;
      try {
        const res = await nativeFetch(`${OLLAMA_URL}/api/embeddings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
        });
        if (!res.ok) { errors++; return; }
        const data = await res.json();
        if (!Array.isArray(data.embedding) || data.embedding.length === 0) { errors++; return; }
        embeddings[slug] = data.embedding;
        if (!dim) dim = data.embedding.length;
      } catch (_err) {
        errors++;
      }
    }));
    if ((i + BATCH) % 100 < BATCH) {
      process.stderr.write(`    [${Math.min(i + BATCH, slugs.length)}/${slugs.length}] (${errors} errores hasta ahora)\n`);
    }
  }

  writeFileSync(cachePath, JSON.stringify(embeddings));
  writeFileSync(metaPath, JSON.stringify({
    model,
    manifestSlugCount: slugs.length,
    validSlugs: Object.keys(embeddings).length,
    errors,
    dim,
    generatedAt: new Date().toISOString(),
  }, null, 2));
  console.log(`  [corpus-embed] listo: ${Object.keys(embeddings).length} vectores de ${dim}d, ${errors} errores — cache en ${cachePath}`);
  return { embeddings, errors, dim };
}

/**
 * fetch() de reemplazo para el proceso: sirve corpus/manifest desde disco y
 * reenvía el POST de embeddings de query al Ollama real, REESCRIBIENDO
 * `model` al candidato bajo prueba (embedQuery() en ragRetriever.js hardcodea
 * `snowflake-arctic-embed2`; así lo probamos con los 4 sin tocar el archivo).
 */
function makeBenchFetch({ model, embeddingsJson }) {
  const manifest = loadJson(MANIFEST_PATH);
  return async (url, options = {}) => {
    const u = String(url);

    if (u.endsWith('/cycle-content/manifest.json')) {
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => manifest,
      };
    }

    const match = u.match(/\/cycle-content\/([^/]+)\.json$/);
    if (match) {
      const file = join(CORPUS_ROOT, `${match[1]}.json`);
      if (!existsSync(file)) {
        return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => loadJson(file),
      };
    }

    if (u.endsWith('/rag-embeddings.json')) {
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => embeddingsJson,
      };
    }

    if (u.includes('/api/ollama/api/embeddings')) {
      if (!nativeFetch) {
        return { ok: false, status: 503, headers: { get: () => '' }, json: async () => ({}) };
      }
      let body = options.body;
      try {
        const parsed = JSON.parse(body);
        parsed.model = model; // override: probar embedQuery() con el candidato
        body = JSON.stringify(parsed);
      } catch (_err) {
        // body no parseable: reenviar tal cual (no debería pasar en este flujo)
      }
      return nativeFetch(`${OLLAMA_URL}/api/embeddings`, { ...options, body });
    }

    return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
  };
}

/**
 * ¿El slug top-N corresponde a la especie esperada? Igual que
 * bench-rag-retrieve.mjs: exacto, o prefijo `expected_` (defensivo — en la
 * práctica collapseVarieties() ya deja `species` en 2 partes, así que el
 * match exacto cubre casi todo; el prefijo es red de seguridad).
 */
function matchesSpecies(topSlug, expectedSpecies) {
  return topSlug === expectedSpecies || String(topSlug).startsWith(`${expectedSpecies}_`);
}

/**
 * rankMetrics — recall@1/3/5 + MRR usando un sentinel `null` (no `-1`) para
 * "no encontrado", así el bug de #2684 (`indexOf` -1 colando como hit válido
 * por `-1 <= 2`) es estructuralmente imposible aquí: `null >= 1` y
 * `null <= 3` son `false`, no `true`. Mismo patrón que
 * `scripts/bench-rag-retrieve.mjs`.
 */
function rankMetrics(rows) {
  const n = rows.length;
  if (n === 0) return { 'recall@1': 0, 'recall@3': 0, 'recall@5': 0, MRR: 0 };
  let hit1 = 0, hit3 = 0, hit5 = 0, rr = 0;
  for (const { rank } of rows) {
    if (rank === 1) hit1++;
    if (rank !== null && rank <= 3) hit3++;
    if (rank !== null && rank <= 5) hit5++;
    if (rank !== null) rr += 1 / rank;
  }
  return {
    'recall@1': Number((hit1 / n * 100).toFixed(1)),
    'recall@3': Number((hit3 / n * 100).toFixed(1)),
    'recall@5': Number((hit5 / n * 100).toFixed(1)),
    MRR: Number((rr / n).toFixed(4)),
  };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

async function runEmbedderBench(model, goldItems, missingSlugIds, opts) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`Modelo: ${model}`);

  const { embeddings, errors: corpusErrors, dim } = await ensureCorpusEmbeddings(model, opts);
  globalThis.fetch = makeBenchFetch({ model, embeddingsJson: embeddings });

  // Cache-busting del import: cada modelo necesita una instancia FRESCA del
  // módulo (corpusCache/embeddingsCache viven en variables de módulo).
  const moduleUrl = new URL(`../src/services/ragRetriever.js?bench=${slugifyModel(model)}`, import.meta.url);
  const { retrieve, getCorpusStats } = await import(moduleUrl.href);

  const stats = await getCorpusStats();
  console.log(`  corpus: ${stats.totalDocs} passages, ${stats.uniqueTerms} términos, avgDocLen=${stats.avgDocLen}`);
  console.log(`  embeddings de corpus: ${Object.keys(embeddings).length} vectores de ${dim}d (${corpusErrors} errores al embeber)`);

  const items = opts.limit ? goldItems.slice(0, opts.limit) : goldItems;
  const rows = [];
  const latencies = [];
  let rescuedFromCollapse = 0;

  for (const item of items) {
    const t0 = performance.now();
    const hits = await retrieve(item.query, TOP_K, 'bench');
    latencies.push(performance.now() - t0);

    const topSlugs = hits.map((h) => h.species).filter(Boolean);
    const idx = topSlugs.findIndex((slug) => matchesSpecies(slug, item.expected));
    const rank = idx >= 0 ? idx + 1 : null;
    rows.push({ id: item.id, expected: item.expected, rank, topSlugs: topSlugs.slice(0, TOP_K) });
    if (rank !== null && missingSlugIds.has(item.id)) rescuedFromCollapse++;
  }

  const metrics = rankMetrics(rows);
  const sorted = [...latencies].sort((a, b) => a - b);
  const latAvg = latencies.reduce((s, v) => s + v, 0) / Math.max(latencies.length, 1);

  console.log(`  recall@1=${metrics['recall@1']}%  recall@3=${metrics['recall@3']}%  recall@5=${metrics['recall@5']}%  MRR=${metrics.MRR}`);
  console.log(`  latencia query (retrieve completo): avg=${latAvg.toFixed(0)}ms p50=${percentile(sorted, 50).toFixed(0)}ms p95=${percentile(sorted, 95).toFixed(0)}ms`);
  console.log(`  de los ${missingSlugIds.size} golden items con slug-base ausente del corpus crudo, ${rescuedFromCollapse} SÍ resuelven vía collapseVarieties() en el retriever completo`);

  return {
    model,
    corpusStats: stats,
    corpusEmbed: { errors: corpusErrors, dim, validVectors: Object.keys(embeddings).length },
    evaluable: items.length,
    metrics,
    rescuedFromCollapse,
    latency: {
      avgMs: Number(latAvg.toFixed(1)),
      p50Ms: Number(percentile(sorted, 50).toFixed(1)),
      p95Ms: Number(percentile(sorted, 95).toFixed(1)),
    },
    rows,
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!existsSync(CORPUS_ROOT)) {
    console.log(`[bench] SKIP: no existe corpus en ${CORPUS_ROOT}`);
    return;
  }

  console.log('=== bench-retriever-real.mjs — retriever COMPLETO (BM25+semántico+fusión+collapseVarieties) por embedder ===');
  console.log(`Ollama: ${OLLAMA_URL}`);
  console.log(`topK: ${TOP_K}`);

  const golden = loadJson(GOLDEN_PATH);
  const goldItems = golden.filter((g) => !NON_SLUG_EXPECTED.has(g.expected));
  const skipped = golden.filter((g) => NON_SLUG_EXPECTED.has(g.expected));
  console.log(`Golden set: ${golden.length} total, ${goldItems.length} evaluables, ${skipped.length} skipped (cross-species): ${skipped.map((g) => g.id).join(', ')}`);

  // Igual criterio que bench-embedders.mjs: expected ausente como slug propio
  // del corpus CRUDO (manifest). NO se excluyen del cálculo (n sigue siendo
  // goldItems.length, igual que el bench corregido) — se reportan aparte
  // cuántos de ellos el RETRIEVER COMPLETO logra resolver via
  // collapseVarieties(), que es precisamente la pregunta que este bench
  // añade sobre bench-embedders.mjs.
  const manifest = loadJson(MANIFEST_PATH);
  const corpusSlugs = new Set(manifest.slugs || []);
  const missingItems = goldItems.filter((g) => !corpusSlugs.has(g.expected));
  const missingSlugIds = new Set(missingItems.map((g) => g.id));
  console.log(`De esos ${goldItems.length}, ${missingItems.length} tienen expected-slug que ya NO existe como ficha propia en el corpus (movido a variedad): ${missingItems.map((g) => g.id).join(', ')}`);

  const modelsToRun = opts.models
    ? ALL_MODELS.filter(([id]) => opts.models.includes(id))
    : ALL_MODELS;

  const results = [];
  for (const [modelId] of modelsToRun) {
    const r = await runEmbedderBench(modelId, goldItems, missingSlugIds, opts);
    results.push(r);
  }

  console.log(`\n${'═'.repeat(100)}`);
  console.log(`RESUMEN — retriever completo, n_evaluable=${opts.limit || goldItems.length}, ${missingItems.length} con slug-base ausente del corpus`);
  console.log('─'.repeat(100));
  console.log(
    'Modelo'.padEnd(34) +
    'R@1%'.padStart(7) + 'R@3%'.padStart(7) + 'R@5%'.padStart(7) + 'MRR'.padStart(8) +
    'lat-avg'.padStart(10) + 'lat-p95'.padStart(10) + 'rescatados'.padStart(12),
  );
  console.log('─'.repeat(100));
  for (const r of results) {
    console.log(
      r.model.padEnd(34) +
      `${r.metrics['recall@1']}%`.padStart(7) +
      `${r.metrics['recall@3']}%`.padStart(7) +
      `${r.metrics['recall@5']}%`.padStart(7) +
      `${r.metrics.MRR}`.padStart(8) +
      `${r.latency.avgMs}ms`.padStart(10) +
      `${r.latency.p95Ms}ms`.padStart(10) +
      `${r.rescuedFromCollapse}/${missingItems.length}`.padStart(12),
    );
  }
  console.log('─'.repeat(100));

  const prodDefault = results.find((r) => r.model === 'snowflake-arctic-embed2');
  const candidate = results.find((r) => r.model === 'granite-embedding:278m');
  if (prodDefault && candidate) {
    const d1 = candidate.metrics['recall@1'] - prodDefault.metrics['recall@1'];
    const dMrr = candidate.metrics.MRR - prodDefault.metrics.MRR;
    const dLat = candidate.latency.avgMs - prodDefault.latency.avgMs;
    console.log(`\nRECOMENDACIÓN: snowflake-arctic-embed2 -> granite-embedding:278m: recall@1 ${d1 >= 0 ? '+' : ''}${d1.toFixed(1)}pp, MRR ${dMrr >= 0 ? '+' : ''}${dMrr.toFixed(4)}, latencia ${dLat >= 0 ? '+' : ''}${dLat.toFixed(0)}ms/query.`);
  }
  console.log('═'.repeat(100));

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let commit = '';
  try {
    commit = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch { /* no-op */ }

  const output = {
    bench: 'retriever-real',
    date: new Date().toISOString(),
    commit,
    ollama_url: OLLAMA_URL,
    topK: TOP_K,
    golden_total: golden.length,
    golden_evaluable: goldItems.length,
    golden_skipped_cross_species: skipped.map((g) => g.id),
    golden_missing_base_slug: missingItems.map((g) => g.id),
    results,
  };
  const outputPath = join(OUTPUT_DIR, `retriever-real-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nResultados guardados en: ${outputPath}`);

  if (opts.history) {
    for (const r of results) {
      const historyPath = writeHistoryRecord(
        buildHistoryRecord({
          bench: 'retriever-real',
          model: r.model,
          config: 'recall',
          commit,
          metrics: {
            recall1: r.metrics['recall@1'],
            recall3: r.metrics['recall@3'],
            recall5: r.metrics['recall@5'],
            mrr: r.metrics.MRR,
            latency_avg_ms: r.latency.avgMs,
            latency_p95_ms: r.latency.p95Ms,
          },
        }),
      );
      console.log(`[bench] historial estandarizado escrito: ${historyPath}`);
    }
  }
}

main().catch((err) => {
  console.error('[bench-retriever-real] FATAL:', err);
  process.exit(1);
});
