#!/usr/bin/env node
/**
 * bench-rag-retrieve.mjs - benchmark de recall y latencia del retrieve RAG.
 *
 * Corre hasta TRES pasadas sobre el mismo golden set:
 *   1. BM25 only, con /rag-embeddings.json deshabilitado.
 *   2. Hybrid, con /rag-embeddings.json y embeddings de query activos.
 *   3. Hybrid + cross-encoder rerank (opcional): tras el retrieve híbrido toma
 *      los top-N (POOL_K) candidatos, los manda al reranker cross-encoder
 *      (bge-reranker-v2-m3 servido por TEI), reordena por el score del
 *      cross-encoder y evalúa recall@k sobre el mismo golden set.
 *
 * El benchmark usa el corpus real en public/cycle-content/ y el gold set
 * eval/rag-golden.json. La comparacion de recall no se hardcodea: se calcula
 * en cada corrida a partir de los resultados del retriever.
 *
 * La 3ra pasada (rerank) es un cross-encoder REAL (query×passage puntuados
 * conjuntamente), NO el LLM-as-judge de bench-reranker.mjs. Se activa solo si
 * el endpoint TEI (RERANK_URL/health) responde 200; si no, se salta con aviso
 * (CI sin TEI queda verde). Ver ops/DR-RAG-RERANKER-2026-07-10.md.
 *
 * Uso:
 *   node scripts/bench-rag-retrieve.mjs
 *   OLLAMA_URL=http://localhost:11434 node scripts/bench-rag-retrieve.mjs
 *   RERANK_URL=http://localhost:7997 node scripts/bench-rag-retrieve.mjs   # activa rerank
 *   GOLDEN_SET=eval/rag-golden-ampliado.json node scripts/bench-rag-retrieve.mjs  # otro golden set
 *
 * Env:
 *   OLLAMA_URL   default http://localhost:11434 — embedder de query (nomic-embed-text).
 *   GOLDEN_SET   default eval/rag-golden.json — golden set a evaluar (ruta rel. al
 *                repo o absoluta). Cada entrada solo requiere {id, query, expected}.
 *   RERANK_URL   default http://localhost:7997  — TEI con bge-reranker-v2-m3 (/rerank).
 *   RAG_POOL_K   default 20 — tamaño del pool que ve el reranker antes del slice(topK).
 *
 * Opcional:
 *   --history       escribe un record JSONL estandarizado en data/bench-runs/
 *   --no-rerank     fuerza a saltar la pasada de rerank aunque TEI responda
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { register } from 'node:module';
import { execSync } from 'node:child_process';
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const PUBLIC_DIR = join(ROOT_DIR, 'public');
const CORPUS_ROOT = join(PUBLIC_DIR, 'cycle-content');
const MANIFEST_PATH = join(CORPUS_ROOT, 'manifest.json');
const EMBEDDINGS_PATH = join(PUBLIC_DIR, 'rag-embeddings.json');
// Golden set: por defecto eval/rag-golden.json (50 queries). Se puede apuntar a
// otro set (p.ej. eval/rag-golden-ampliado.json) con GOLDEN_SET=<ruta>. Solo se
// exige que cada entrada tenga {id, query, expected}; campos extra se ignoran.
const GOLDEN_PATH = process.env.GOLDEN_SET
  ? (process.env.GOLDEN_SET.startsWith('/')
      ? process.env.GOLDEN_SET
      : join(ROOT_DIR, process.env.GOLDEN_SET))
  : join(ROOT_DIR, 'eval', 'rag-golden.json');
const OUTPUT_DIR = join(ROOT_DIR, 'data', 'bench-runs');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
// Endpoint TEI del cross-encoder. El reranker se sirve FUERA de ollama (ollama
// no expone /api/rerank) — ver el DR. Se llama con el fetch NATIVO (capturado
// antes del monkeypatch de makeBenchFetch), porque el fetch del bench solo
// enruta corpus/embeddings/ollama.
const RERANK_URL = process.env.RERANK_URL || 'http://localhost:7997';
// Pool que ve el reranker: se recupera híbrido topK=POOL_K (colapsado por
// especie) y el cross-encoder reordena ese pool antes del slice(TOP_K) final.
const POOL_K = Number.parseInt(process.env.RAG_POOL_K || '20', 10);
const TOP_K = 5;
const nativeFetch = globalThis.fetch?.bind(globalThis);
register(new URL('./bench-rag-retrieve.loader.mjs', import.meta.url).href);

const GOLDEN_SET = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));

function loadJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function matchesSpecies(topSlug, expectedSpecies) {
  return topSlug === expectedSpecies || String(topSlug).startsWith(`${expectedSpecies}_`);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

// rankMetrics — recall@1/@3/@5 + MRR sobre un arreglo de filas {rank}.
// `rankField` permite calcular las mismas métricas sobre un rank alternativo
// (p.ej. el orden híbrido DENTRO del pool, para aislar el aporte del rerank).
function rankMetrics(rows, rankField = 'rank') {
  if (rows.length === 0) {
    return { recall1: 0, recall3: 0, recall5: 0, mrr: 0 };
  }
  let hit1 = 0;
  let hit3 = 0;
  let hit5 = 0;
  let rr = 0;
  for (const row of rows) {
    const rank = row[rankField];
    if (rank === 1) hit1 += 1;
    if (rank >= 1 && rank <= 3) hit3 += 1;
    if (rank >= 1 && rank <= 5) hit5 += 1;
    if (rank >= 1) rr += 1 / rank;
  }
  const n = rows.length;
  return {
    recall1: hit1 / n,
    recall3: hit3 / n,
    recall5: hit5 / n,
    mrr: rr / n,
  };
}

function makeBenchFetch({ includeEmbeddings }) {
  const manifest = loadJson(MANIFEST_PATH);
  const embeddings = includeEmbeddings ? loadJson(EMBEDDINGS_PATH) : null;
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
      if (!embeddings) {
        return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : '') },
        json: async () => embeddings,
      };
    }

    if (u.includes('/api/ollama/api/embeddings')) {
      if (!includeEmbeddings) {
        return Promise.reject(new Error('query embeddings disabled for BM25-only run'));
      }
      if (!nativeFetch) {
        return { ok: false, status: 503, headers: { get: () => '' }, json: async () => ({}) };
      }
      const target = `${OLLAMA_URL}/api/embeddings`;
      return nativeFetch(target, options);
    }

    return { ok: false, status: 404, headers: { get: () => '' }, json: async () => ({}) };
  };
}

// ── Cross-encoder rerank vía TEI ──────────────────────────────────────────
//
// TEI /rerank: body { query, texts:[...], raw_scores, truncate } → responde
// [{ index, score }, ...] ordenado desc. Se mapea index→score alineado al
// arreglo `texts`. Devuelve null ante cualquier fallo (fail-open: el caller
// conserva el orden híbrido) — mismo contrato de degradación que la capa
// semántica en ragRetriever.js.
async function rerankScores(query, texts) {
  if (!nativeFetch || texts.length === 0) return null;
  try {
    const res = await nativeFetch(`${RERANK_URL}/rerank`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, texts, raw_scores: false, truncate: true }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const scores = new Array(texts.length).fill(Number.NEGATIVE_INFINITY);
    for (const item of data) {
      if (item && typeof item.index === 'number' && typeof item.score === 'number') {
        scores[item.index] = item.score;
      }
    }
    return scores;
  } catch {
    return null;
  }
}

// Reordena `hits` (pool híbrido) por score del cross-encoder. Devuelve el pool
// reordenado, o null si el reranker no respondió (fail-open).
async function rerankHits(query, hits) {
  const texts = hits.map((h) => (typeof h.text === 'string' ? h.text : ''));
  const scores = await rerankScores(query, texts);
  if (!scores) return null;
  return hits
    .map((h, i) => ({ ...h, rerankScore: scores[i] }))
    .sort((a, b) => b.rerankScore - a.rerankScore);
}

async function teiReady() {
  if (!nativeFetch) return false;
  try {
    const res = await nativeFetch(`${RERANK_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

async function runMode(mode, { includeEmbeddings, rerank = false }) {
  globalThis.fetch = makeBenchFetch({ includeEmbeddings });
  const moduleUrl = new URL(`../src/services/ragRetriever.js?bench=${mode}`, import.meta.url);
  const { retrieve, getCorpusStats } = await import(moduleUrl.href);

  const firstT0 = performance.now();
  const firstHits = await retrieve(GOLDEN_SET[0].query, TOP_K, 'bench');
  const coldMs = performance.now() - firstT0;
  const stats = await getCorpusStats();

  // En rerank pedimos un pool ancho (POOL_K) para que el cross-encoder tenga
  // material que reordenar; sin rerank, el retrieve normal (TOP_K).
  const retrieveK = rerank ? POOL_K : TOP_K;

  let passed = 0;
  const latencies = [];
  const rerankLatencies = [];
  let rerankFallbacks = 0;
  let coveragePool = 0; // ¿el esperado está en el pool ancho? (techo del rerank)
  const details = [];

  for (const item of GOLDEN_SET) {
    const t0 = performance.now();
    let hits = await retrieve(item.query, retrieveK, 'bench');

    // rank del esperado en el orden HÍBRIDO dentro del pool (aísla el rerank).
    const poolSlugs = hits.map((h) => h.species).filter(Boolean);
    const poolRankIdx = poolSlugs.slice(0, TOP_K).findIndex((slug) => matchesSpecies(slug, item.expected));
    const inPool = poolSlugs.findIndex((slug) => matchesSpecies(slug, item.expected)) >= 0;
    if (inPool) coveragePool += 1;

    let rerankMs = 0;
    if (rerank && hits.length > 0) {
      const rr0 = performance.now();
      const reordered = await rerankHits(item.query, hits);
      rerankMs = performance.now() - rr0;
      if (reordered) {
        hits = reordered;
      } else {
        rerankFallbacks += 1;
      }
    }
    hits = hits.slice(0, TOP_K);
    latencies.push(performance.now() - t0);
    if (rerank) rerankLatencies.push(rerankMs);

    const topSlugs = hits.map((h) => h.species).filter(Boolean);
    const rank = topSlugs.findIndex((slug) => matchesSpecies(slug, item.expected));
    const found = rank >= 0;
    if (found) passed += 1;
    details.push({
      id: item.id,
      expected: item.expected,
      found,
      rank: found ? rank + 1 : null,
      poolRank: poolRankIdx >= 0 ? poolRankIdx + 1 : null,
      inPool,
      topSlugs: topSlugs.slice(0, TOP_K),
    });
  }

  const metrics = rankMetrics(details);
  // Métrica de aislamiento: mismas queries, MISMO pool, orden híbrido (sin
  // rerank). El delta metrics−poolMetrics es el aporte NETO del cross-encoder
  // sobre un conjunto de candidatos idéntico.
  const poolMetrics = rerank ? rankMetrics(details, 'poolRank') : null;
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = latencies.reduce((sum, n) => sum + n, 0) / Math.max(latencies.length, 1);
  const rrSorted = [...rerankLatencies].sort((a, b) => a - b);
  const rrAvg = rerankLatencies.reduce((sum, n) => sum + n, 0) / Math.max(rerankLatencies.length, 1);

  return {
    mode,
    includeEmbeddings,
    rerank,
    poolK: rerank ? POOL_K : TOP_K,
    coldMs,
    stats,
    firstHitCount: firstHits.length,
    metrics,
    poolMetrics,
    coveragePool: rerank ? coveragePool / GOLDEN_SET.length : null,
    rerankFallbacks: rerank ? rerankFallbacks : null,
    passed,
    total: GOLDEN_SET.length,
    latency: {
      avgMs: avg,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      minMs: sorted[0] || 0,
      maxMs: sorted[sorted.length - 1] || 0,
    },
    rerankLatency: rerank
      ? {
          avgMs: rrAvg,
          p50Ms: percentile(rrSorted, 50),
          p95Ms: percentile(rrSorted, 95),
        }
      : null,
    details,
  };
}

function label(mode) {
  if (mode === 'bm25') return 'BM25-only';
  if (mode === 'hybrid') return 'Hybrid (nomic)';
  if (mode === 'hybrid+rerank') return 'Hybrid + rerank (bge-v2-m3)';
  return mode;
}

function printMode(result) {
  console.log(`\n[bench] ${label(result.mode)}`);
  console.log(`[bench]   cold load: ${result.coldMs.toFixed(1)} ms`);
  console.log(`[bench]   corpus: ${result.stats.totalDocs} docs, ${result.stats.uniqueTerms} terms, avgDocLen=${result.stats.avgDocLen}`);
  console.log(`[bench]   recall@1: ${(result.metrics.recall1 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@3: ${(result.metrics.recall3 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@5: ${(result.metrics.recall5 * 100).toFixed(1)}%`);
  console.log(`[bench]   MRR: ${result.metrics.mrr.toFixed(4)}`);
  if (result.rerank) {
    console.log(`[bench]   pool: top-${result.poolK} (cobertura del esperado en el pool: ${(result.coveragePool * 100).toFixed(1)}% — techo del rerank)`);
    if (result.poolMetrics) {
      console.log(`[bench]   (aislado, mismo pool sin rerank) recall@1: ${(result.poolMetrics.recall1 * 100).toFixed(1)}%  recall@5: ${(result.poolMetrics.recall5 * 100).toFixed(1)}%  MRR: ${result.poolMetrics.mrr.toFixed(4)}`);
    }
    console.log(`[bench]   rerank fail-open (fallback a híbrido): ${result.rerankFallbacks}/${result.total}`);
    console.log(`[bench]   rerank latency avg=${result.rerankLatency.avgMs.toFixed(1)} ms p50=${result.rerankLatency.p50Ms.toFixed(1)} ms p95=${result.rerankLatency.p95Ms.toFixed(1)} ms`);
  }
  console.log(`[bench]   latency avg=${result.latency.avgMs.toFixed(1)} ms p50=${result.latency.p50Ms.toFixed(1)} ms p95=${result.latency.p95Ms.toFixed(1)} ms`);
}

function pp(x) {
  return (x * 100).toFixed(1);
}

async function main() {
  if (!existsSync(CORPUS_ROOT)) {
    console.log(`[bench] SKIP: no existe corpus en ${CORPUS_ROOT}`);
    return;
  }

  const bm25 = await runMode('bm25', { includeEmbeddings: false });
  printMode(bm25);

  const hybrid = await runMode('hybrid', { includeEmbeddings: true });
  printMode(hybrid);

  // 3ra pasada opcional: solo si TEI responde y no se pasó --no-rerank.
  const wantRerank = !process.argv.includes('--no-rerank');
  const rerankUp = wantRerank ? await teiReady() : false;
  let rerankRes = null;
  if (wantRerank && !rerankUp) {
    console.log(`\n[bench] rerank OMITIDO: TEI no responde en ${RERANK_URL}/health (levante el container o exporte RERANK_URL). CI sigue verde.`);
  } else if (rerankUp) {
    rerankRes = await runMode('hybrid+rerank', { includeEmbeddings: true, rerank: true });
    printMode(rerankRes);
  }

  const deltaRecall = (hybrid.metrics.recall5 - bm25.metrics.recall5) * 100;
  console.log('\n[bench] resumen');
  console.log(`[bench]   ${'modo'.padEnd(28)} ${'R@1'.padStart(7)} ${'R@3'.padStart(7)} ${'R@5'.padStart(7)} ${'MRR'.padStart(8)}`);
  const rows = [bm25, hybrid, ...(rerankRes ? [rerankRes] : [])];
  for (const r of rows) {
    console.log(`[bench]   ${label(r.mode).padEnd(28)} ${(`${pp(r.metrics.recall1)}%`).padStart(7)} ${(`${pp(r.metrics.recall3)}%`).padStart(7)} ${(`${pp(r.metrics.recall5)}%`).padStart(7)} ${r.metrics.mrr.toFixed(4).padStart(8)}`);
  }
  console.log(`[bench]   delta bm25→hybrid (recall@5): ${deltaRecall >= 0 ? '+' : ''}${deltaRecall.toFixed(1)} pp`);
  if (rerankRes) {
    const dR1 = (rerankRes.metrics.recall1 - hybrid.metrics.recall1) * 100;
    const dR5 = (rerankRes.metrics.recall5 - hybrid.metrics.recall5) * 100;
    const dMrr = rerankRes.metrics.mrr - hybrid.metrics.mrr;
    console.log(`[bench]   delta hybrid→hybrid+rerank: recall@1 ${dR1 >= 0 ? '+' : ''}${dR1.toFixed(1)} pp | recall@5 ${dR5 >= 0 ? '+' : ''}${dR5.toFixed(1)} pp | MRR ${dMrr >= 0 ? '+' : ''}${dMrr.toFixed(4)}`);
    // Gate del DR §3.4: recall@1 ≥ +8pp Y MRR ≥ +0.05 para encender el flag.
    const gatePass = dR1 >= 8 && dMrr >= 0.05;
    console.log(`[bench]   gate DR §3.4 (recall@1 ≥ +8pp Y MRR ≥ +0.05): ${gatePass ? 'PASA' : 'NO PASA'}`);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    bench: 'rag-retrieve',
    date: new Date().toISOString(),
    ollama_url: OLLAMA_URL,
    rerank_url: rerankRes ? RERANK_URL : null,
    pool_k: POOL_K,
    corpus: {
      root: CORPUS_ROOT,
      manifest: MANIFEST_PATH,
      embeddings: EMBEDDINGS_PATH,
      gold: GOLDEN_PATH,
    },
    modes: {
      bm25,
      hybrid,
      ...(rerankRes ? { 'hybrid+rerank': rerankRes } : {}),
    },
    delta: {
      recall_pp: Number(deltaRecall.toFixed(1)),
      recall_relative: bm25.metrics.recall5 > 0 ? Number(((hybrid.metrics.recall5 - bm25.metrics.recall5) / bm25.metrics.recall5).toFixed(4)) : null,
      ...(rerankRes
        ? {
            rerank_recall1_pp: Number(((rerankRes.metrics.recall1 - hybrid.metrics.recall1) * 100).toFixed(1)),
            rerank_recall5_pp: Number(((rerankRes.metrics.recall5 - hybrid.metrics.recall5) * 100).toFixed(1)),
            rerank_mrr: Number((rerankRes.metrics.mrr - hybrid.metrics.mrr).toFixed(4)),
          }
        : {}),
    },
  };
  const goldTag = GOLDEN_PATH.replace(/\\/g, '/').split('/').pop().replace(/\.json$/, '');
  const goldSuffix = goldTag === 'rag-golden' ? '' : `-${goldTag}`;
  const outputPath = join(OUTPUT_DIR, `rag-retrieve-${new Date().toISOString().slice(0, 10)}${goldSuffix}.json`);
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`[bench] resultados guardados en ${outputPath}`);

  if (process.argv.includes('--history')) {
    let commit = '';
    try {
      commit = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
    } catch {
      commit = '';
    }
    const historyPath = writeHistoryRecord(
      buildHistoryRecord({
        bench: 'rag-retrieve',
        model: rerankRes ? 'bm25-vs-hybrid-vs-rerank' : 'bm25-vs-hybrid',
        config: 'recall',
        commit,
        metrics: {
          recall1_bm25: Number((bm25.metrics.recall1 * 100).toFixed(1)),
          recall1_hybrid: Number((hybrid.metrics.recall1 * 100).toFixed(1)),
          recall3_bm25: Number((bm25.metrics.recall3 * 100).toFixed(1)),
          recall3_hybrid: Number((hybrid.metrics.recall3 * 100).toFixed(1)),
          recall5_bm25: Number((bm25.metrics.recall5 * 100).toFixed(1)),
          recall5_hybrid: Number((hybrid.metrics.recall5 * 100).toFixed(1)),
          mrr_bm25: Number(bm25.metrics.mrr.toFixed(4)),
          mrr_hybrid: Number(hybrid.metrics.mrr.toFixed(4)),
          recall_delta_pp: Number(deltaRecall.toFixed(1)),
          ...(rerankRes
            ? {
                recall1_rerank: Number((rerankRes.metrics.recall1 * 100).toFixed(1)),
                recall5_rerank: Number((rerankRes.metrics.recall5 * 100).toFixed(1)),
                mrr_rerank: Number(rerankRes.metrics.mrr.toFixed(4)),
                lift_pp: Number(((rerankRes.metrics.recall1 - hybrid.metrics.recall1) * 100).toFixed(1)),
              }
            : {}),
        },
      }),
    );
    console.log(`[bench] historial estandarizado escrito: ${historyPath}`);
  }
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
