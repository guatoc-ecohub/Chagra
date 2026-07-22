#!/usr/bin/env node
/**
 * bench-reranker.mjs — Mide cuánto sube recall@1 al agregar un reranker
 * LLM-as-judge sobre el retriever del RAG de Chagra.
 *
 * Contexto (ver docs/RAG.md, sección "Reranker LLM-as-judge", para el detalle
 * completo — acá el resumen):
 *   - La motivación original citaba recall@3≈70% para el mejor embedder
 *     contra recall@1≈32% — un hueco que parecía puro problema de orden.
 *     Armando este bench se encontró un bug real en `rankMetrics()` de
 *     `scripts/bench-embedders.mjs` (contaba como "hit" de recall@3/@5
 *     cualquier golden item cuyo slug esperado NI SIQUIERA existe en el
 *     corpus) — con el bug arreglado, el recall@3 real es ~36-39% según el
 *     embedder, no ~70%. El hueco entre recall@1 y el techo real
 *     (`coverage@K` acá abajo) sigue existiendo, pero es más chico de lo que
 *     motivó esta tarea.
 *   - Ollama 0.24 no tiene `/api/rerank` (404 verificado) ni `bge-reranker`
 *     en su registro (404 en dos variantes) → el reranker es LLM-as-judge
 *     con un modelo chico (scripts/lib/reranker.mjs), NO un cross-encoder
 *     dedicado.
 *   - La M6000 (12 GiB) ya tiene el agente `gemma4:e2b` (~8.1 GB) residente
 *     en producción. Este script, por default, CARGA el agente antes de
 *     medir (--warm-agent, default true) porque esa es la condición real:
 *     un reranker que solo cabe con la GPU vacía no sirve.
 *
 * STANDALONE: se conecta directo a Ollama (POST /api/chat, /api/embeddings,
 * GET /api/ps), sin depender de ragRetriever.js ni de import.meta.env — se
 * ejecuta con `node`, no con Vite (mismo patrón que bench-embedders.mjs).
 *
 * OBLIGATORIO correr bajo `gpu-lock` (ver Chagra-strategy/ops/bin/gpu-lock):
 * la GPU de alpha admite UNA medición a la vez.
 *
 * Uso:
 *   node scripts/bench-reranker.mjs [opciones]
 *
 * Opciones (todas opcionales, con default razonable):
 *   --embedder=granite-embedding:278m   embedder para construir el top-K
 *   --k=10                              tamaño del top-K que ve el reranker
 *   --models=qwen2.5:3b,gemma2:2b,llama3.2:3b   candidatos a comparar
 *   --mode=listwise                     modo usado en la comparación principal
 *   --mode-compare-model=qwen2.5:3b     modelo para el sub-experimento
 *                                       pointwise-vs-listwise (vacío = se salta)
 *   --mode-compare-limit=15             cuántas queries usa ese sub-experimento
 *   --agent-model=gemma4:e2b            modelo "agente" a mantener cargado
 *   --warm-agent=true|false             default true
 *   --limit=<n>                         limitar cuántas queries del golden
 *                                       se evalúan (smoke test rápido)
 *   --out=<path>                        default data/bench-runs/reranker-<fecha>.json
 *
 * Ejemplo real (correr en alpha, bajo gpu-lock):
 *   gpu-lock bench-reranker -- node scripts/bench-reranker.mjs \
 *     --models=qwen2.5:3b,gemma2:2b,llama3.2:3b --k=10
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  rerank,
  getLoadedModels,
  warmModel,
  unloadModel,
} from './lib/reranker.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ---------- args ----------

function parseArgs(argv) {
  const out = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (arg.startsWith('--')) out[arg.slice(2)] = 'true';
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBEDDER = args.embedder || 'granite-embedding:278m';
const K = parseInt(args.k || '10', 10);
const MODELS = (args.models || 'qwen2.5:3b,gemma2:2b,llama3.2:3b').split(',').map(s => s.trim()).filter(Boolean);
const MODE = args.mode || 'listwise';
const MODE_COMPARE_MODEL = args['mode-compare-model'] !== undefined ? args['mode-compare-model'] : 'qwen2.5:3b';
const MODE_COMPARE_LIMIT = parseInt(args['mode-compare-limit'] || '15', 10);
const AGENT_MODEL = args['agent-model'] || 'gemma4:e2b';
const WARM_AGENT = (args['warm-agent'] ?? 'true') !== 'false';
const LIMIT = args.limit ? parseInt(args.limit, 10) : undefined;
const DATE_TAG = new Date().toISOString().slice(0, 10);
const OUT_PATH = args.out ? resolve(ROOT, args.out) : resolve(ROOT, 'data', 'bench-runs', `reranker-${DATE_TAG}.json`);

const CORPUS_DIR = resolve(ROOT, 'public', 'cycle-content');
const MANIFEST_PATH = resolve(CORPUS_DIR, 'manifest.json');
const GOLDEN_PATH = resolve(ROOT, 'eval', 'rag-golden.json');

// Mismo set de queries cross-species sin slug en el corpus que excluye
// bench-embedders.mjs — se mantiene idéntico para que los números sean
// comparables entre los dos benches.
const NON_SLUG_EXPECTED = new Set([
  'biopreparado', 'associacion', 'mito_lunar', 'suelo_acido',
  'agua_calidad', 'erosion',
]);

// ---------- helpers compartidos con bench-embedders.mjs (duplicados a
// propósito: este script debe poder correr solo, sin tocar el otro bench) ----------

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// IMPORTANTE — por qué NO se trunca acá: granite-embedding:278m es BERT
// (bert.context_length=512 tokens, verificado vía `ollama show`) y ~329/501
// docs del corpus lo superan → Ollama devuelve 500 "the input length exceeds
// the context length" para esos. Una primera versión de este script
// reintentaba truncando el texto hasta que entrara — PARECÍA una mejora
// (menos errores) pero rompía la comparabilidad con bench-embedders.mjs: al
// forzar embeddings truncados (y por tanto peores/menos representativos)
// para esos 329 docs, algunos terminaban compitiendo — y ganando — el
// top-1 que le correspondía al doc correcto, y el recall@1 medido caía de
// 31.8% (el número de referencia de esta tarea, reproducido abajo) a 18.2%.
// bench-embedders.mjs (fuente de la metodología que esta tarea pide
// reusar) simplemente EXCLUYE del ranking los docs que no entran (quedan en
// sim=-1, nunca ganan un top-K) — replicamos exactamente ese
// comportamiento para que el baseline "sin rerank" de este script sea
// comparable al de bench-embedders.mjs. Cobertura perdida real de
// granite-embedding:278m por este límite: documentada abajo en el output
// (`corpus_embed_errors`), no escondida.
async function embed(model, text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`ollama ${res.status}: ${msg}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('Embedding vacío');
  }
  return data.embedding;
}

function extractText(doc) {
  const parts = [];
  if (doc.valor_pedagogico) parts.push(doc.valor_pedagogico);
  if (Array.isArray(doc.milestones)) {
    doc.milestones.forEach(m => {
      if (m.label) parts.push(m.label);
      if (m.description) parts.push(m.description);
    });
  }
  if (Array.isArray(doc.companions)) {
    const names = doc.companions.map(c => c.especie || c.nombre || '').filter(Boolean);
    if (names.length) parts.push(names.join(', '));
  }
  if (Array.isArray(doc.failure_modes)) {
    doc.failure_modes.forEach(f => {
      if (f.mode) parts.push(f.mode);
      if (f.solucion) parts.push(f.solucion);
    });
  }
  if (doc.leccion_agroecologica) parts.push(doc.leccion_agroecologica);
  return parts.join(' ').trim();
}

function pct(n, total) {
  return Number((n / total * 100).toFixed(1));
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

// ---------- main ----------

async function main() {
  console.log('=== bench-reranker.mjs — LLM-as-judge reranker sobre el RAG de Chagra ===\n');
  console.log(`Ollama URL: ${OLLAMA_URL}`);
  console.log(`Embedder (retriever top-K): ${EMBEDDER}`);
  console.log(`K (top-K que ve el reranker): ${K}`);
  console.log(`Modelos candidatos a reranker: ${MODELS.join(', ')}`);
  console.log(`Modo principal: ${MODE}`);
  console.log(`Agente a mantener cargado: ${WARM_AGENT ? AGENT_MODEL : '(ninguno — GPU vacía, NO representa producción)'}\n`);

  if (!existsSync(GOLDEN_PATH)) throw new Error(`No existe golden set: ${GOLDEN_PATH}`);
  if (!existsSync(MANIFEST_PATH)) throw new Error(`No existe manifest de corpus: ${MANIFEST_PATH}`);

  // --- -1. Arranque limpio: descargar CUALQUIER cosa que haya quedado
  //     residente de una corrida anterior (propia o de otro proceso). Sin
  //     esto, un modelo huérfano de un run previo compite por VRAM con el
  //     agente de ESTE run y ensucia la medición de "¿convive?" — ya pasó
  //     en desarrollo de este mismo script. ---
  if (WARM_AGENT) {
    const before = await getLoadedModels(OLLAMA_URL).catch(() => []);
    for (const m of before) {
      if (!m.name.startsWith(AGENT_MODEL.split(':')[0])) await unloadModel(OLLAMA_URL, m.name);
    }
    if (before.length) console.log(`Arranque limpio: descargados ${before.map(m => m.name).join(', ')} (residuo de corridas previas)\n`);
  }

  // --- 0. Warm-up del agente: escenario real de producción ---
  const residency = { before: [], after_agent: [], after_all: [] };
  if (WARM_AGENT) {
    console.log(`Cargando agente ${AGENT_MODEL} (keep_alive largo, simula producción)...`);
    residency.before = await getLoadedModels(OLLAMA_URL).catch(() => []);
    const t0 = performance.now();
    await warmModel(OLLAMA_URL, AGENT_MODEL, { keepAlive: '30m' });
    console.log(`  Agente cargado en ${(performance.now() - t0).toFixed(0)}ms`);
    residency.after_agent = await getLoadedModels(OLLAMA_URL).catch(() => []);
    console.log(`  /api/ps: ${residency.after_agent.map(m => `${m.name}(${(m.size_vram / 1e9).toFixed(2)}GB)`).join(', ') || '(vacío)'}\n`);
  }

  // --- 1. Cargar corpus ---
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const allSlugs = manifest.slugs || [];
  const corpus = [];
  for (const slug of allSlugs) {
    const docPath = resolve(CORPUS_DIR, `${slug}.json`);
    if (!existsSync(docPath)) continue;
    const doc = JSON.parse(readFileSync(docPath, 'utf8'));
    const text = extractText(doc);
    if (text) corpus.push({ slug, text });
  }
  console.log(`Corpus cargado: ${corpus.length} docs con texto`);

  // --- 2. Cargar golden set ---
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
  let goldItems = golden.filter(g => !NON_SLUG_EXPECTED.has(g.expected));
  const skipped = golden.filter(g => NON_SLUG_EXPECTED.has(g.expected));
  if (LIMIT) goldItems = goldItems.slice(0, LIMIT);
  console.log(`Golden set: ${golden.length} total, ${goldItems.length} evaluables (${skipped.length} cross-species excluidas)\n`);

  // --- 3. Embeber corpus con el embedder elegido ---
  console.log(`Embediendo ${corpus.length} chunks del corpus con ${EMBEDDER}...`);
  const corpusVecs = [];
  let embedErrors = 0;
  for (let i = 0; i < corpus.length; i++) {
    try {
      corpusVecs.push(await embed(EMBEDDER, corpus[i].text));
    } catch (err) {
      console.error(`  ERROR embediendo slug=${corpus[i].slug}: ${err.message}`);
      corpusVecs.push(null);
      embedErrors++;
    }
    if ((i + 1) % 100 === 0) process.stderr.write(`  [${i + 1}/${corpus.length}]\n`);
  }
  console.log(`Corpus embebido (${embedErrors} errores — típicamente docs que exceden el contexto de ${EMBEDDER}; se excluyen del ranking, igual que en bench-embedders.mjs).\n`);

  if (WARM_AGENT) {
    residency.after_embedder = await getLoadedModels(OLLAMA_URL).catch(() => []);
    console.log(`/api/ps tras embeber (¿coexiste el embedder con el agente?): ${residency.after_embedder.map(m => `${m.name}(${(m.size_vram / 1e9).toFixed(2)}GB)`).join(', ') || '(vacío)'}\n`);
  }

  // --- 4. Para cada query: embeber, rankear TODO el corpus (baseline "sin
  //     rerank", misma metodología que bench-embedders.mjs) y quedarse con
  //     el top-K como candidatos para el reranker. ---
  console.log(`Calculando ranking base (sin rerank) + candidatos top-${K} para ${goldItems.length} queries...`);
  const perQuery = [];
  for (const g of goldItems) {
    let queryVec;
    try {
      queryVec = await embed(EMBEDDER, g.query);
    } catch (err) {
      console.error(`  ERROR embediendo query ${g.id}: ${err.message}`);
      perQuery.push({ item: g, rankedFull: [], topK: [] });
      continue;
    }
    const sims = corpus
      .map((c, idx) => ({ slug: c.slug, text: c.text, sim: corpusVecs[idx] ? cosineSim(queryVec, corpusVecs[idx]) : -1 }))
      .sort((a, b) => b.sim - a.sim);
    perQuery.push({
      item: g,
      rankedFull: sims.map(s => s.slug),
      topK: sims.slice(0, K).map(s => ({ slug: s.slug, text: s.text, sim: s.sim })),
    });
  }

  // Baseline: recall@1/@3/@5 igual que bench-embedders.mjs, más "coverage@K"
  // (¿el esperado está dentro del top-K que ve el reranker? — es el techo
  // que el reranker puede alcanzar, no puede inventar cobertura que el
  // retriever no trajo).
  const n = goldItems.length;
  let r1 = 0, r3 = 0, r5 = 0, coverageK = 0;
  for (const { item, rankedFull } of perQuery) {
    const pos = rankedFull.indexOf(item.expected);
    if (pos === 0) r1++;
    if (pos >= 0 && pos <= 2) r3++;
    if (pos >= 0 && pos <= 4) r5++;
    if (pos >= 0 && pos < K) coverageK++;
  }
  const baseline = {
    embedder: EMBEDDER,
    n,
    'recall@1': pct(r1, n),
    'recall@3': pct(r3, n),
    'recall@5': pct(r5, n),
    [`coverage@${K}`]: pct(coverageK, n),
  };
  console.log(`\nBASELINE sin rerank (${EMBEDDER}): recall@1=${baseline['recall@1']}%  recall@3=${baseline['recall@3']}%  recall@5=${baseline['recall@5']}%  coverage@${K}=${baseline[`coverage@${K}`]}%\n`);

  // --- 5. Sub-experimento opcional: pointwise vs listwise, mismo modelo,
  //     subset chico (barato) — decide qué modo usar en la comparación
  //     principal de modelos. ---
  let modeComparison = null;
  if (MODE_COMPARE_MODEL) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`Sub-experimento: pointwise vs listwise con ${MODE_COMPARE_MODEL} (primeras ${MODE_COMPARE_LIMIT} queries)`);
    const subset = perQuery.slice(0, MODE_COMPARE_LIMIT).filter(pq => pq.topK.length > 0);
    const results = {};
    for (const mode of ['pointwise', 'listwise']) {
      let hits = 0;
      const latencies = [];
      let parseFailures = 0;
      for (const pq of subset) {
        try {
          const r = await rerank(mode, OLLAMA_URL, MODE_COMPARE_MODEL, pq.item.query, pq.topK);
          latencies.push(mode === 'pointwise' ? r.latencyMsTotal : r.latencyMs);
          parseFailures += (r.parseFailures ?? (r.parseFailure ? 1 : 0));
          if (r.ranked[0] === pq.item.expected) hits++;
        } catch (err) {
          console.error(`    ERROR ${mode} ${pq.item.id}: ${err.message}`);
        }
      }
      results[mode] = {
        'recall@1_subset': pct(hits, subset.length),
        latency_avg_ms: Number(avg(latencies).toFixed(0)),
        latency_p50_ms: Number(percentile(latencies, 0.5).toFixed(0)),
        parse_failures: parseFailures,
        calls_per_query: mode === 'pointwise' ? K : 1,
      };
      console.log(`  ${mode.padEnd(10)} recall@1=${results[mode]['recall@1_subset']}%  lat_avg=${results[mode].latency_avg_ms}ms  parse_fail=${parseFailures}`);
    }
    const winner = results.listwise.latency_avg_ms <= results.pointwise.latency_avg_ms * 0.5
      || results.listwise['recall@1_subset'] >= results.pointwise['recall@1_subset']
      ? 'listwise' : 'pointwise';
    console.log(`  → modo elegido para la comparación principal: ${winner} (recall similar o mejor, y ${MODELS.length > 0 ? 'menos llamados = menos latencia acumulada' : ''})`);
    modeComparison = { model: MODE_COMPARE_MODEL, subset_size: subset.length, results, chosen_mode: winner };
    console.log(`${'─'.repeat(60)}\n`);
    if (WARM_AGENT) await unloadModel(OLLAMA_URL, MODE_COMPARE_MODEL); // reset a estado 2-way (agente+embedder) antes del loop principal
  }

  const effectiveMode = MODE_COMPARE_MODEL && !args.mode ? modeComparison.chosen_mode : MODE;
  console.log(`Modo usado en la comparación principal de modelos: ${effectiveMode}\n`);

  // --- 6. Comparación principal: cada modelo candidato reordena el top-K
  //     de CADA query evaluable, con el agente (y el embedder) cargados. ---
  const modelResults = [];
  for (const model of MODELS) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`Reranker: ${model}`);
    let residencyDuring = null;
    try {
      if (WARM_AGENT) {
        // Descargar los OTROS candidatos antes de medir este: cada fila de
        // la tabla debe reflejar "agente + ESTE reranker" (2-way), no
        // "agente + todos los candidatos probados hasta ahora" acumulados.
        for (const other of MODELS) {
          if (other !== model) await unloadModel(OLLAMA_URL, other);
        }
        // Forzar carga del reranker ANTES de medir, para que la latencia
        // reportada sea la de inferencia, no la de carga en frío del modelo.
        await warmModel(OLLAMA_URL, model, { keepAlive: '10m' });
        residencyDuring = await getLoadedModels(OLLAMA_URL).catch(() => []);
        const fitsWithAgent = WARM_AGENT
          ? residencyDuring.some(m => m.name.startsWith(AGENT_MODEL.split(':')[0]))
          : null;
        console.log(`  /api/ps: ${residencyDuring.map(m => `${m.name}(${(m.size_vram / 1e9).toFixed(2)}GB)`).join(', ')}`);
        console.log(`  ¿Coexiste con el agente (${AGENT_MODEL})?: ${fitsWithAgent === null ? 'n/a' : (fitsWithAgent ? 'SÍ' : 'NO — el agente fue desalojado')}`);
      }

      let hits1 = 0, hits3 = 0;
      const latencies = [];
      let parseFailures = 0;
      let errors = 0;
      for (const pq of perQuery) {
        if (!pq.topK.length) continue;
        try {
          const r = await rerank(effectiveMode, OLLAMA_URL, model, pq.item.query, pq.topK);
          latencies.push(effectiveMode === 'pointwise' ? r.latencyMsTotal : r.latencyMs);
          parseFailures += (r.parseFailures ?? (r.parseFailure ? 1 : 0));
          if (r.ranked[0] === pq.item.expected) hits1++;
          if (r.ranked.slice(0, 3).includes(pq.item.expected)) hits3++;
        } catch (err) {
          errors++;
          console.error(`    ERROR ${pq.item.id}: ${err.message}`);
        }
      }

      const evaluated = perQuery.filter(pq => pq.topK.length).length;
      const recall1 = pct(hits1, n);
      const recall3 = pct(hits3, n);
      modelResults.push({
        model,
        mode: effectiveMode,
        evaluated,
        errors,
        parse_failures: parseFailures,
        'recall@1': recall1,
        'recall@3': recall3,
        'recall@1_delta_vs_baseline': Number((recall1 - baseline['recall@1']).toFixed(1)),
        latency: {
          avg_ms: Number(avg(latencies).toFixed(0)),
          p50_ms: Number(percentile(latencies, 0.5).toFixed(0)),
          p95_ms: Number(percentile(latencies, 0.95).toFixed(0)),
        },
        residency: residencyDuring,
        fits_with_agent: WARM_AGENT ? residencyDuring?.some(m => m.name.startsWith(AGENT_MODEL.split(':')[0])) : null,
      });
      console.log(`  recall@1=${recall1}% (baseline ${baseline['recall@1']}%, delta ${(recall1 - baseline['recall@1']).toFixed(1)}pp)  recall@3=${recall3}%  lat_avg=${avg(latencies).toFixed(0)}ms  parse_fail=${parseFailures}  errors=${errors}`);
    } catch (err) {
      console.error(`  FALLO TOTAL con ${model}: ${err.message}`);
      modelResults.push({ model, mode: effectiveMode, fatal_error: err.message });
    }
  }
  console.log(`${'─'.repeat(60)}\n`);

  // --- 7. Tabla resumen ---
  console.log(`${'═'.repeat(96)}`);
  console.log(`RESUMEN — reranker LLM-as-judge sobre ${EMBEDDER} (top-${K}, n=${n})`);
  console.log('─'.repeat(96));
  console.log(
    'Modelo'.padEnd(20) +
    'R@1 sin'.padStart(10) + 'R@1 con'.padStart(10) + 'delta'.padStart(8) +
    'lat avg'.padStart(10) + 'lat p95'.padStart(10) + 'convive c/ agente'.padStart(20)
  );
  console.log('─'.repeat(96));
  for (const r of modelResults) {
    if (r.fatal_error) {
      console.log(`${r.model.padEnd(20)} FALLÓ: ${r.fatal_error}`);
      continue;
    }
    console.log(
      r.model.padEnd(20) +
      `${baseline['recall@1']}%`.padStart(10) +
      `${r['recall@1']}%`.padStart(10) +
      `${r['recall@1_delta_vs_baseline'] >= 0 ? '+' : ''}${r['recall@1_delta_vs_baseline']}`.padStart(8) +
      `${r.latency.avg_ms}ms`.padStart(10) +
      `${r.latency.p95_ms}ms`.padStart(10) +
      `${r.fits_with_agent === null ? 'n/a' : (r.fits_with_agent ? 'sí' : 'NO')}`.padStart(20)
    );
  }
  console.log('─'.repeat(96));
  console.log('═'.repeat(96));

  // --- 8. Guardar JSON ---
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  const output = {
    bench: 'reranker',
    date: new Date().toISOString(),
    ollama_url: OLLAMA_URL,
    embedder: EMBEDDER,
    k: K,
    agent_model: WARM_AGENT ? AGENT_MODEL : null,
    warm_agent: WARM_AGENT,
    gold_total: golden.length,
    gold_evaluable: n,
    gold_skipped: skipped.length,
    corpus_embed_errors: embedErrors,
    baseline,
    mode_comparison: modeComparison,
    effective_mode: effectiveMode,
    models: modelResults,
    residency_snapshots: residency,
  };
  writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nResultados guardados en: ${OUT_PATH}`);
}

main().catch(err => {
  console.error('[bench-reranker] FATAL:', err);
  process.exit(1);
});
