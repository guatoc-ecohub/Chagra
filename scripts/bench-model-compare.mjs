#!/usr/bin/env node
/**
 * bench-model-compare.mjs - bench PARAMETRIZABLE de comparacion de modelos.
 *
 * REINGENIERIA 2026-06-15: fusiona bench-nuevos-vs-baseline.mjs y
 * bench-qwen3-vs-granite.mjs, que eran el MISMO motor (Ollama /api/generate +
 * keyword-matching + ganador por prompt + summary.md) y solo diferian en la
 * lista de modelos y el set de prompts. Ahora ambos son "suites" en
 * data/bench-suites/*.json y este unico script las corre.
 *
 * Mejora vs los originales: usa `scoreKeywordsFlexible` (tildes/lema/sinonimos)
 * del lib compartido en vez del `countKeywords` literal - el literal daba falsos
 * negativos documentados (un modelo decia lo correcto con otras palabras y sacaba
 * 0). Reusa `callOllamaGenerate` + `checkOllamaModels` + `checkMaxwellError` del
 * lib (cero duplicacion) y emite un registro de historial estandarizado v1.
 *
 * Uso:
 *   node scripts/bench-model-compare.mjs --suite qwen3-vs-granite
 *   node scripts/bench-model-compare.mjs --suite nuevos-vs-baseline
 *   node scripts/bench-model-compare.mjs --prompts <file.json> --models a,b,c
 *
 * Env:
 *   BENCH_OUTPUT_DIR   override del dir de salida (default data/bench-runs)
 *   BENCH_SKIP_STALE_GUARD=1  salta la guarda anti-stale
 *   BENCH_NO_HISTORY=1 no escribe el registro de historial estandarizado
 *
 * Output: data/bench-runs/model-compare-<suite>-YYYY-MM-DD.jsonl + summary.md
 *   + bench/history/model-compare__<model>__<ts>.json (estandarizado)
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { scoreKeywordsFlexible } from './lib/bench-scorer.mjs';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';
import {
  callOllamaGenerate,
  checkMaxwellError,
  OLLAMA_TAGS_URL,
} from './lib/bench-ollama.mjs';
import { ensureDir, getBenchOutputDir } from './lib/bench-runner.mjs';
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const SUITES_DIR = join(ROOT_DIR, 'data', 'bench-suites');
const TIMEOUT_MS = 180_000;
const PROMPT_TEMPLATE = (q) =>
  `Eres un asistente agroecologico experto para Colombia. Responde en espanol claro, practico para agricultores.\n\nPregunta: ${q}\n\nResponde de forma completa y practica:`;

/**
 * parseArgs - parsea argv. PURO.
 * @param {string[]} argv
 * @returns {{suite:string|null, promptsFile:string|null, models:string[]|null}}
 */
export function parseArgs(argv) {
  const out = { suite: null, promptsFile: null, models: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--suite') out.suite = argv[++i];
    else if (a === '--prompts') out.promptsFile = argv[++i];
    else if (a === '--models') out.models = argv[++i].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

/**
 * loadSuite - resuelve la suite a { id, models, prompts }. PURO (lee FS).
 * @param {{suite:string|null, promptsFile:string|null, models:string[]|null}} args
 * @returns {{id:string, models:string[], prompts:object[], defaultModel:string}}
 */
export function loadSuite(args, { suitesDir = SUITES_DIR } = {}) {
  let suiteData;
  let id;
  if (args.suite) {
    const p = join(suitesDir, `${args.suite}.json`);
    if (!existsSync(p)) throw new Error(`suite no encontrada: ${p}`);
    suiteData = JSON.parse(readFileSync(p, 'utf-8'));
    id = suiteData.id || args.suite;
  } else if (args.promptsFile) {
    suiteData = JSON.parse(readFileSync(args.promptsFile, 'utf-8'));
    id = suiteData.id || basename(args.promptsFile, '.json');
  } else {
    throw new Error('falta --suite <nombre> o --prompts <file>');
  }
  const prompts = Array.isArray(suiteData) ? suiteData : suiteData.prompts || [];
  const models = args.models || suiteData.models || [];
  if (models.length === 0) throw new Error('la suite no define modelos y no se paso --models');
  if (prompts.length === 0) throw new Error('la suite no tiene prompts');
  return { id, models, prompts, defaultModel: suiteData.defaultModel || models[0] };
}

/**
 * scorePrompt - corre UN prompt contra TODOS los modelos. Inyectable (callImpl)
 * para test sin GPU.
 *
 * @param {object} prompt  { id, category, query, expected_keywords }
 * @param {string[]} models
 * @param {object} [opts]
 * @param {(model:string,prompt:string)=>Promise<object>} [opts.callImpl]
 * @returns {Promise<object>} fila de resultado por prompt.
 */
export async function scorePrompt(prompt, models, { callImpl } = {}) {
  const call =
    callImpl ||
    (async (model, p) => {
      // callOllamaGenerate del lib devuelve un STRING (data.response). Aca
      // medimos la latencia nosotros y normalizamos a { response, latency_ms }.
      const start = performance.now();
      const text = await callOllamaGenerate({
        model,
        prompt: PROMPT_TEMPLATE(p),
        timeoutMs: TIMEOUT_MS,
        options: { temperature: 0.7, num_predict: 300 },
      });
      return { response: text, latency_ms: performance.now() - start };
    });

  const row = {
    prompt_id: prompt.id,
    category: prompt.category,
    query: prompt.query,
    expected_keywords: prompt.expected_keywords,
    timestamp: new Date().toISOString(),
    results: {},
  };
  for (const model of models) {
    try {
      const out = await call(model, prompt.query);
      const score = scoreKeywordsFlexible(out.response || '', prompt.expected_keywords || []);
      row.results[model] = {
        model,
        latency_ms: out.latency_ms ?? null,
        response: out.response ?? null,
        keywords_matched: score.matched,
        keywords_total: score.total,
        error: null,
      };
    } catch (err) {
      row.results[model] = {
        model,
        latency_ms: null,
        response: null,
        keywords_matched: 0,
        keywords_total: (prompt.expected_keywords || []).length,
        error: String(err.message || err),
        maxwell: checkMaxwellError(String(err.message || err)),
      };
    }
  }
  row.winner = selectWinner(row.results, models);
  return row;
}

/**
 * selectWinner - modelo con mejor ratio de keywords (con desempate por latencia).
 * PURO.
 * @param {Object<string,object>} results
 * @param {string[]} models
 * @returns {{model:string|null, reason:string}}
 */
export function selectWinner(results, models) {
  let best = null;
  let bestRatio = -1;
  let bestLat = Infinity;
  for (const m of models) {
    const r = results[m];
    if (!r || r.error) continue;
    const ratio = r.keywords_total > 0 ? r.keywords_matched / r.keywords_total : 0;
    const lat = Number.isFinite(r.latency_ms) ? r.latency_ms : Infinity;
    if (ratio > bestRatio || (ratio === bestRatio && lat < bestLat)) {
      best = m;
      bestRatio = ratio;
      bestLat = lat;
    }
  }
  if (best == null) return { model: null, reason: 'todos los modelos fallaron' };
  return { model: best, reason: `mejor keyword ratio (${(bestRatio * 100).toFixed(0)}%)` };
}

/**
 * aggregateByModel - estadisticas globales por modelo. PURO.
 * @param {object[]} rows
 * @param {string[]} models
 * @returns {Object<string,{ok:number,total:number,avgLatencyMs:number,keywordsPct:number,wins:number}>}
 */
export function aggregateByModel(rows, models) {
  const out = {};
  for (const m of models) {
    const cells = rows.map((r) => r.results[m]).filter(Boolean);
    const ok = cells.filter((c) => !c.error);
    const avgLat = ok.length
      ? ok.reduce((s, c) => s + (c.latency_ms || 0), 0) / ok.length
      : 0;
    const kwPct = ok.length
      ? (ok.reduce((s, c) => s + (c.keywords_total ? c.keywords_matched / c.keywords_total : 0), 0) / ok.length) * 100
      : 0;
    const wins = rows.filter((r) => r.winner?.model === m).length;
    out[m] = {
      ok: ok.length,
      total: cells.length,
      avgLatencyMs: Number(avgLat.toFixed(0)),
      keywordsPct: Number(kwPct.toFixed(1)),
      wins,
    };
  }
  return out;
}

/**
 * buildSummaryMarkdown - summary.md legible. PURO.
 */
export function buildSummaryMarkdown({ suiteId, models, rows, stats, totalMs, dateStr }) {
  const lines = [];
  lines.push(`# Model Compare - ${suiteId} - ${dateStr}`);
  lines.push('');
  lines.push('## Metadata');
  lines.push(`- Suite: ${suiteId}`);
  lines.push(`- Modelos: ${models.join(', ')}`);
  lines.push(`- Prompts: ${rows.length}`);
  lines.push(`- Tiempo total: ${(totalMs / 1000).toFixed(2)}s`);
  lines.push('- Scoring: keyword-matching flexible (tildes/lema/sinonimos)');
  lines.push('');
  lines.push('## Resultados globales');
  lines.push('');
  lines.push('| Modelo | Exitosos | Latencia avg (ms) | Keywords (%) | Wins |');
  lines.push('|---|---|---|---|---|');
  for (const m of models) {
    const s = stats[m];
    lines.push(`| ${m} | ${s.ok}/${s.total} | ${s.avgLatencyMs} | ${s.keywordsPct}% | ${s.wins} |`);
  }
  lines.push('');
  lines.push('## Por categoria');
  lines.push('');
  const cats = [...new Set(rows.map((r) => r.category))];
  for (const cat of cats) {
    const catRows = rows.filter((r) => r.category === cat);
    lines.push(`### ${cat} (${catRows.length})`);
    lines.push('| Modelo | Latencia avg (ms) | Keywords (%) |');
    lines.push('|---|---|---|');
    const catStats = aggregateByModel(catRows, models);
    for (const m of models) {
      lines.push(`| ${m} | ${catStats[m].avgLatencyMs} | ${catStats[m].keywordsPct}% |`);
    }
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('_Generado por `bench-model-compare.mjs` (reingenieria 2026-06-15)._');
  lines.push('');
  return lines.join('\n');
}

/**
 * warnMissingModels - avisa (sin abortar) si algun modelo no esta en Ollama.
 * A diferencia de checkOllamaModels del lib, NO llama process.exit.
 * @param {string[]} models
 */
async function warnMissingModels(models, tagsUrl = OLLAMA_TAGS_URL) {
  try {
    const res = await fetch(tagsUrl, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const installed = new Set((data.models || []).map((m) => m.name));
    const missing = models.filter((m) => !installed.has(m));
    if (missing.length) console.warn(`[bench] modelos ausentes en Ollama: ${missing.join(', ')}`);
  } catch {
    console.warn('[bench] no pude verificar modelos en Ollama (sigo igual).');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { id, models, prompts, defaultModel } = loadSuite(args);

  // Guarda anti-stale (best-effort; salta con BENCH_SKIP_STALE_GUARD=1).
  try {
    assertCheckoutCurrent({
      cwd: ROOT_DIR,
      autoPull: process.env.BENCH_AUTO_PULL === '1',
      skip: process.env.BENCH_SKIP_STALE_GUARD === '1',
    });
  } catch (err) {
    console.error(String(err.message || err));
    process.exit(1);
  }

  // Verifica que los modelos existan en Ollama (best-effort, sin abortar).
  await warnMissingModels(models);

  const outputDir = getBenchOutputDir(ROOT_DIR);
  ensureDir(outputDir);

  console.log(`[bench] model-compare suite=${id} modelos=${models.join(',')} prompts=${prompts.length}`);
  const t0 = performance.now();
  const rows = [];
  for (let i = 0; i < prompts.length; i++) {
    console.log(`[bench] ${i + 1}/${prompts.length} [${prompts[i].category}] ${String(prompts[i].query).slice(0, 50)}...`);
    rows.push(await scorePrompt(prompts[i], models));
    if (i < prompts.length - 1) await new Promise((r) => setTimeout(r, 1500));
  }
  const totalMs = performance.now() - t0;

  const stats = aggregateByModel(rows, models);
  const dateStr = new Date().toISOString().split('T')[0];
  const base = `model-compare-${id}-${dateStr}`;
  const jsonlPath = join(outputDir, `${base}.jsonl`);
  const summaryPath = join(outputDir, `${base}-summary.md`);
  writeFileSync(jsonlPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  writeFileSync(summaryPath, buildSummaryMarkdown({ suiteId: id, models, rows, stats, totalMs, dateStr }));

  // Registro de historial estandarizado: uno por modelo (para tendencia por modelo).
  if (process.env.BENCH_NO_HISTORY !== '1') {
    let commit = '';
    try {
      commit = execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
    } catch { /* sin git */ }
    for (const m of models) {
      const s = stats[m];
      writeHistoryRecord(
        buildHistoryRecord({
          bench: 'model-compare',
          model: m,
          config: id,
          commit,
          metrics: { keywords_pct: s.keywordsPct, latency_avg_ms: s.avgLatencyMs },
        }),
      );
    }
  }

  console.log('\n[bench] ===== RESULTADOS =====');
  for (const m of models) {
    const s = stats[m];
    console.log(`[bench] ${m}: ${s.ok}/${s.total} ok, ${s.avgLatencyMs}ms avg, ${s.keywordsPct}% keywords, ${s.wins} wins`);
  }
  console.log(`[bench] baseline=${defaultModel}`);
  console.log(`[bench] JSONL: ${jsonlPath}`);
  console.log(`[bench] Summary: ${summaryPath}`);
}

const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
  } catch {
    return false;
  }
})();
if (isMain) {
  main().catch((err) => {
    console.error('[bench] FATAL:', err);
    process.exit(1);
  });
}

export { PROMPT_TEMPLATE };
