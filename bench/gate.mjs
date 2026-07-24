#!/usr/bin/env node
/**
 * bench/gate.mjs - el GATE del bench-gate CI (BENCH_GATE_PIPELINE.md §2/§6).
 *
 * Compara dos registros de historial v1 (baseline vs current, mismo bench) y
 * emite un veredicto GREEN / YELLOW / RED segun los umbrales del spec (§2 [3]):
 *   - accuracy      cae  > 5pp  -> RED   (> 2pp -> YELLOW)
 *   - hallucination sube > 3pp  -> RED   (> 1pp -> YELLOW)
 *   - parse_rate    cae  > 2pp  -> RED   (> 1pp -> YELLOW)
 *   - latency       sube > 25%  -> RED   (> 10% -> YELLOW)
 * GREEN = sin regresion (o mejora). YELLOW = regresion menor (polish antes de
 * merge). RED = regresion critica (revert / no mergear).
 *
 * POR QUE history v1 y no el summary.md: los summary.md label-row que parseaba
 * `scripts/bench-summary-diff.mjs` ya NO los emite ningun bench (verificado
 * 2026-07-18: 0 archivos con ese formato). La ruta VIVA es el registro
 * estandarizado v1 (`bench/lib/history.mjs`) que emiten model-compare,
 * agro-rotatorio, rag-retrieve, borde-alucinacion, etc. Este gate reusa
 * METRIC_DIRECTION de ese modulo (fuente unica de "mas alto/bajo mejor").
 *
 * REGLA DURA DEL PLAN: el gate debe correr sobre el bench de PRODUCTO (config
 * con tools/RAG/sidecar), NUNCA el modelo crudo. Este script solo compara los
 * registros que recibe; la eleccion del bench correcto vive en el workflow. Si
 * un registro trae config cruda conocida (A / crudo / raw), se anota advertencia.
 *
 * Uso:
 *   node bench/gate.mjs --current <run.json> --baseline <base.json>
 *   node bench/gate.mjs --bench <id> [--baseline-dir bench/baseline] [--history-dir bench/history]
 *   Flags: --strict (YELLOW tambien bloquea) · --json · --md-out <path>
 *
 * Salida: tabla markdown + "GATE: GREEN|YELLOW|RED". Exit: 0 GREEN · 0 YELLOW
 *         (1 si --strict) · 2 RED · 3 error de uso/datos.
 *
 * @module bench/gate
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { METRIC_DIRECTION } from './lib/history.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Reglas del gate por FAMILIA de metrica. `red`/`yellow`: pp para
 * accuracy/hallucination/parse, porcentaje relativo para latency. Fuente unica
 * de tuning del gate.
 */
export const GATE_RULES = {
  accuracy: { unit: 'pp', red: 5, yellow: 2 },
  hallucination: { unit: 'pp', red: 3, yellow: 1 },
  parse: { unit: 'pp', red: 2, yellow: 1 },
  latency: { unit: 'pct', red: 25, yellow: 10 },
};

/** Configs conocidas como "modelo crudo" (NO valen para decidir prod). */
const RAW_CONFIGS = new Set(['A', 'crudo', 'raw', 'base', 'screening']);

const ACCURACY_METRICS = new Set([
  'accuracy', 'pass_pct', 'name_accuracy', 'sci_accuracy', 'verified_rate',
  'validation_rate', 'keywords_pct', 'graph_consistency_pct', 'grounded_pct',
  'subspecies_ok_pct', 'score_global', 'factualidad', 'promedio',
  'normalized_score', 'lift_pp',
]);
// SOLO tasas/porcentajes (0-100). Los CONTEOS crudos (hallucinations,
// subspecies_disconnections) NO van aca: aplicarles un umbral en pp es un bug
// -- un conteo 256->468 es +82% relativo, no "+212pp". Caen a 'other' (info):
// se reportan pero NO votan, para que un gate que BLOQUEA merges no de
// falsos-RED por la varianza natural de un conteo. El gate vota sobre las TASAS
// (ah_pct / hallucination_rate / rejection_rate), que es lo que el spec define.
const HALLUC_METRICS = new Set([
  'ah_pct', 'hallucination_rate', 'rejection_rate',
]);

/**
 * classifyMetric - mapea un nombre de metrica v1 a su familia de gate.
 * @param {string} name
 * @returns {'accuracy'|'hallucination'|'parse'|'latency'|'other'}
 */
export function classifyMetric(name) {
  const n = String(name).toLowerCase();
  if (n === 'parse_rate') return 'parse';
  if (ACCURACY_METRICS.has(n)) return 'accuracy';
  if (HALLUC_METRICS.has(n)) return 'hallucination';
  if (n.startsWith('latency_') || n.endsWith('_ms') || n === 'cold_load_ms') return 'latency';
  return 'other';
}

/**
 * regressionAmount - cuanto EMPEORO una metrica (baseline -> current), en la
 * unidad de la familia. Positivo = empeoro; <=0 = mejoro/igual. La direccion
 * (mas alto/bajo mejor) sale de METRIC_DIRECTION (o inferida por familia).
 *
 * @param {string} name
 * @param {number} baseline
 * @param {number} current
 * @param {'pp'|'pct'} unit
 * @returns {number}
 */
export function regressionAmount(name, baseline, current, unit) {
  const dir = METRIC_DIRECTION[name] || (classifyMetric(name) === 'latency' ? 'down' : 'up');
  const worse = dir === 'up' ? baseline - current : current - baseline;
  if (unit === 'pct') {
    if (baseline === 0) return worse > 0 ? Infinity : 0;
    return (worse / Math.abs(baseline)) * 100;
  }
  return worse;
}

/**
 * metricVerdict - severidad de UNA metrica comparando baseline vs current.
 * @returns {{name, family, baseline, current, delta, regression, unit, severity}}
 */
export function metricVerdict(name, baseline, current, rules = GATE_RULES) {
  const family = classifyMetric(name);
  const delta = Number((current - baseline).toFixed(3));
  if (family === 'other') {
    return { name, family, baseline, current, delta, regression: null, unit: null, severity: 'info' };
  }
  const rule = rules[family];
  const regression = Number(regressionAmount(name, baseline, current, rule.unit).toFixed(3));
  let severity = 'green';
  if (regression > rule.red) severity = 'red';
  else if (regression > rule.yellow) severity = 'yellow';
  return { name, family, baseline, current, delta, regression, unit: rule.unit, severity };
}

const SEVERITY_RANK = { green: 0, info: 0, yellow: 1, red: 2 };

/**
 * diffRecords - compara dos registros v1 y produce el veredicto global. Solo
 * las metricas presentes en AMBOS votan; las solo-en-uno van a `unmatched`.
 *
 * @param {object} baseline
 * @param {object} current
 * @param {object} [rules=GATE_RULES]
 * @returns {{verdict, metrics, blockers, warnings, unmatched, notes}}
 */
export function diffRecords(baseline, current, rules = GATE_RULES) {
  if (!baseline?.metrics || !current?.metrics) {
    throw new Error('diffRecords: ambos registros necesitan `metrics`.');
  }
  const notes = [];
  if (baseline.bench && current.bench && baseline.bench !== current.bench) {
    notes.push(`ADVERTENCIA: bench distinto (baseline=${baseline.bench} vs current=${current.bench}).`);
  }
  if (RAW_CONFIGS.has(String(current.config)) || RAW_CONFIGS.has(String(baseline.config))) {
    notes.push(`ADVERTENCIA: config cruda (${baseline.config}/${current.config}) - el gate exige bench de PRODUCTO (tools/RAG), no crudo.`);
  }

  const bm = baseline.metrics;
  const cm = current.metrics;
  const metrics = [];
  const unmatched = [];
  for (const name of Object.keys(cm)) {
    if (!Number.isFinite(cm[name])) continue;
    if (!Number.isFinite(bm[name])) { unmatched.push({ name, current: cm[name], where: 'solo-current' }); continue; }
    metrics.push(metricVerdict(name, bm[name], cm[name], rules));
  }
  for (const name of Object.keys(bm)) {
    if (Number.isFinite(bm[name]) && !Number.isFinite(cm[name])) {
      unmatched.push({ name, baseline: bm[name], where: 'solo-baseline' });
    }
  }

  const worst = metrics.reduce((acc, m) => Math.max(acc, SEVERITY_RANK[m.severity] ?? 0), 0);
  const verdict = worst >= 2 ? 'RED' : worst >= 1 ? 'YELLOW' : 'GREEN';
  return {
    verdict,
    metrics,
    blockers: metrics.filter((m) => m.severity === 'red'),
    warnings: metrics.filter((m) => m.severity === 'yellow'),
    unmatched,
    notes,
  };
}

/**
 * renderMarkdown - tabla comentable en el PR. ASCII only (sin emojis, restriccion
 * del repo).
 * @param {object} diff  salida de diffRecords.
 * @param {object} [meta]
 * @returns {string}
 */
export function renderMarkdown(diff, meta = {}) {
  const tag = { GREEN: '[GREEN]', YELLOW: '[YELLOW]', RED: '[RED]' }[diff.verdict];
  const lines = [`## Bench Gate: ${tag}`];
  if (meta.bench) lines.push(`Bench: \`${meta.bench}\`${meta.model ? ` - modelo \`${meta.model}\`` : ''}`);
  if (meta.baselineCommit || meta.currentCommit) {
    lines.push(`Baseline \`${meta.baselineCommit || '?'}\` -> Current \`${meta.currentCommit || '?'}\``);
  }
  lines.push('', '| Metrica | Familia | Baseline | Current | Delta | Estado |', '|---|---|--:|--:|--:|---|');
  const rank = (m) => (m.severity === 'red' ? 0 : m.severity === 'yellow' ? 1 : m.severity === 'info' ? 3 : 2);
  for (const m of [...diff.metrics].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))) {
    const sd = m.delta > 0 ? `+${m.delta}` : `${m.delta}`;
    const st = { red: 'RED', yellow: 'YELLOW', green: 'ok', info: 'info' }[m.severity];
    lines.push(`| ${m.name} | ${m.family} | ${m.baseline} | ${m.current} | ${sd} | ${st} |`);
  }
  if (diff.blockers.length) {
    lines.push('', '**Bloqueadores (RED):**');
    for (const b of diff.blockers) {
      const u = b.unit === 'pct' ? '%' : 'pp';
      lines.push(`- \`${b.name}\` empeoro ${b.regression}${u} (umbral RED ${GATE_RULES[b.family].red}${u}).`);
    }
  }
  if (diff.unmatched.length) {
    lines.push('', `_Metricas sin par: ${diff.unmatched.map((u) => u.name).join(', ')}._`);
  }
  for (const n of diff.notes) lines.push(`\n> ${n}`);
  return lines.join('\n');
}

// --------------------------------------------------------------------------
// CLI
// --------------------------------------------------------------------------

function parseArgs(argv) {
  const a = { strict: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--strict') a.strict = true;
    else if (k === '--json') a.json = true;
    else if (k === '--current') a.current = argv[++i];
    else if (k === '--baseline') a.baseline = argv[++i];
    else if (k === '--bench') a.bench = argv[++i];
    else if (k === '--baseline-dir') a.baselineDir = argv[++i];
    else if (k === '--history-dir') a.historyDir = argv[++i];
    else if (k === '--md-out') a.mdOut = argv[++i];
  }
  return a;
}

/** latestInDir - registro mas reciente para un bench dentro de un directorio. */
export function latestInDir(dir, bench) {
  if (!existsSync(dir)) return null;
  const recs = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const r = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      if (r?.bench === bench && r.date) recs.push(r);
    } catch { /* saltar basura */ }
  }
  recs.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return recs[0] || null;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  let baseline;
  let current;
  if (a.current && a.baseline) {
    current = JSON.parse(readFileSync(a.current, 'utf-8'));
    baseline = JSON.parse(readFileSync(a.baseline, 'utf-8'));
  } else if (a.bench) {
    const baseDir = a.baselineDir || join(__dirname, 'baseline');
    const histDir = a.historyDir || join(__dirname, 'history');
    baseline = latestInDir(baseDir, a.bench);
    current = latestInDir(histDir, a.bench);
    if (!baseline) { console.error(`No hay baseline para "${a.bench}" en ${baseDir}`); process.exit(3); }
    if (!current) { console.error(`No hay corrida current para "${a.bench}" en ${histDir}`); process.exit(3); }
  } else {
    console.error('Uso: --current <f> --baseline <f>  |  --bench <id> [--baseline-dir d] [--history-dir d]');
    process.exit(3);
  }

  const diff = diffRecords(baseline, current);
  const meta = {
    bench: current.bench || baseline.bench,
    model: current.model,
    baselineCommit: baseline.commit,
    currentCommit: current.commit,
  };
  const md = renderMarkdown(diff, meta);
  if (a.mdOut) writeFileSync(a.mdOut, `${md}\n`, 'utf-8');
  if (a.json) {
    console.log(JSON.stringify({ verdict: diff.verdict, blockers: diff.blockers, warnings: diff.warnings, notes: diff.notes }, null, 2));
  } else {
    console.log(md);
    console.log(`\nGATE: ${diff.verdict}`);
  }
  if (diff.verdict === 'RED') process.exit(2);
  if (diff.verdict === 'YELLOW' && a.strict) process.exit(1);
  process.exit(0);
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) main();
