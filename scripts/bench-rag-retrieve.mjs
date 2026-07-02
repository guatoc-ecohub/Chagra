#!/usr/bin/env node
/**
 * bench-rag-retrieve.mjs - benchmark de recall y latencia del retrieve RAG.
 *
 * Corre dos pasadas sobre el mismo golden set:
 *   1. BM25 only, con /rag-embeddings.json deshabilitado.
 *   2. Hybrid, con /rag-embeddings.json y embeddings de query activos.
 *
 * El benchmark usa el corpus real en public/cycle-content/ y el gold set
 * eval/rag-golden.json. La comparacion de recall no se hardcodea: se calcula
 * en cada corrida a partir de los resultados del retriever.
 *
 * Uso:
 *   node scripts/bench-rag-retrieve.mjs
 *   OLLAMA_URL=http://localhost:11434 node scripts/bench-rag-retrieve.mjs
 *
 * Opcional:
 *   --history   escribe un record JSONL estandarizado en data/bench-runs/
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
const GOLDEN_PATH = join(ROOT_DIR, 'eval', 'rag-golden.json');
const OUTPUT_DIR = join(ROOT_DIR, 'data', 'bench-runs');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
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

function rankMetrics(rows) {
  if (rows.length === 0) {
    return { recall1: 0, recall3: 0, recall5: 0, mrr: 0 };
  }
  let hit1 = 0;
  let hit3 = 0;
  let hit5 = 0;
  let rr = 0;
  for (const row of rows) {
    const rank = row.rank;
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

async function runMode(mode, { includeEmbeddings }) {
  globalThis.fetch = makeBenchFetch({ includeEmbeddings });
  const moduleUrl = new URL(`../src/services/ragRetriever.js?bench=${mode}`, import.meta.url);
  const { retrieve, getCorpusStats } = await import(moduleUrl.href);

  const firstT0 = performance.now();
  const firstHits = await retrieve(GOLDEN_SET[0].query, 5, 'bench');
  const coldMs = performance.now() - firstT0;
  const stats = await getCorpusStats();

  let passed = 0;
  const latencies = [];
  const details = [];

  for (const item of GOLDEN_SET) {
    const t0 = performance.now();
    const hits = await retrieve(item.query, 5, 'bench');
    latencies.push(performance.now() - t0);

    const topSlugs = hits.map((h) => h.species).filter(Boolean);
    const rank = topSlugs.findIndex((slug) => matchesSpecies(slug, item.expected));
    const found = rank >= 0;
    if (found) passed += 1;
    details.push({
      id: item.id,
      expected: item.expected,
      found,
      rank: found ? rank + 1 : null,
      topSlugs: topSlugs.slice(0, 5),
    });
  }

  const metrics = rankMetrics(details);
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = latencies.reduce((sum, n) => sum + n, 0) / Math.max(latencies.length, 1);

  return {
    mode,
    includeEmbeddings,
    coldMs,
    stats,
    firstHitCount: firstHits.length,
    metrics,
    passed,
    total: GOLDEN_SET.length,
    latency: {
      avgMs: avg,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      minMs: sorted[0] || 0,
      maxMs: sorted[sorted.length - 1] || 0,
    },
    details,
  };
}

function printMode(result) {
  const label = result.mode === 'bm25' ? 'BM25-only' : 'Hybrid';
  console.log(`\n[bench] ${label}`);
  console.log(`[bench]   cold load: ${result.coldMs.toFixed(1)} ms`);
  console.log(`[bench]   corpus: ${result.stats.totalDocs} docs, ${result.stats.uniqueTerms} terms, avgDocLen=${result.stats.avgDocLen}`);
  console.log(`[bench]   recall@1: ${(result.metrics.recall1 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@3: ${(result.metrics.recall3 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@5: ${(result.metrics.recall5 * 100).toFixed(1)}%`);
  console.log(`[bench]   MRR: ${result.metrics.mrr.toFixed(4)}`);
  console.log(`[bench]   latency avg=${result.latency.avgMs.toFixed(1)} ms p50=${result.latency.p50Ms.toFixed(1)} ms p95=${result.latency.p95Ms.toFixed(1)} ms`);
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

  const deltaRecall = (hybrid.metrics.recall5 - bm25.metrics.recall5) * 100;
  console.log('\n[bench] resumen');
  console.log(`[bench]   recall@1 bm25  : ${(bm25.metrics.recall1 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@1 hybrid: ${(hybrid.metrics.recall1 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@3 bm25  : ${(bm25.metrics.recall3 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@3 hybrid: ${(hybrid.metrics.recall3 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@5 bm25  : ${(bm25.metrics.recall5 * 100).toFixed(1)}%`);
  console.log(`[bench]   recall@5 hybrid: ${(hybrid.metrics.recall5 * 100).toFixed(1)}%`);
  console.log(`[bench]   MRR bm25      : ${bm25.metrics.mrr.toFixed(4)}`);
  console.log(`[bench]   MRR hybrid    : ${hybrid.metrics.mrr.toFixed(4)}`);
  console.log(`[bench]   delta          : ${deltaRecall >= 0 ? '+' : ''}${deltaRecall.toFixed(1)} pp`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const output = {
    bench: 'rag-retrieve',
    date: new Date().toISOString(),
    ollama_url: OLLAMA_URL,
    corpus: {
      root: CORPUS_ROOT,
      manifest: MANIFEST_PATH,
      embeddings: EMBEDDINGS_PATH,
      gold: GOLDEN_PATH,
    },
    modes: {
      bm25,
      hybrid,
    },
    delta: {
      recall_pp: Number(deltaRecall.toFixed(1)),
      recall_relative: bm25.metrics.recall5 > 0 ? Number(((hybrid.metrics.recall5 - bm25.metrics.recall5) / bm25.metrics.recall5).toFixed(4)) : null,
    },
  };
  const outputPath = join(OUTPUT_DIR, `rag-retrieve-${new Date().toISOString().slice(0, 10)}.json`);
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
        model: 'bm25-vs-hybrid',
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
