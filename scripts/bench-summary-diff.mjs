#!/usr/bin/env node
/**
 * bench-summary-diff.mjs — BENCH-1 gate GREEN/YELLOW/RED.
 *
 * Compara dos summary.md de bench runs (baseline vs post-cambio) y devuelve
 * un veredicto numérico + exit code para usar en CI gate:
 *   - exit 0 GREEN  — accuracy preservada + latencia ≥10% mejor o igual
 *   - exit 1 YELLOW — accuracy preservada, latencia neutra/marginal
 *   - exit 2 RED    — regresión accuracy (>5pp) o hallucination (>3pp) o
 *                     latencia >10% peor sin contraparte
 *
 * Parsea tablas markdown con cabecera estándar `| Métrica | A | B | Δ |`
 * o `| Métrica | <baseline> | <new> | Δ |`. Si no encuentra metricas
 * conocidas, sale con exit 3 NO-DATA.
 *
 * Métricas que reconoce (case-insensitive, busca substring):
 *   - parse rate / parse_rate
 *   - accuracy / verified rate / common name accuracy / sci name accuracy
 *   - hallucination / halluc / rejection rate
 *   - latency p50 / latency p95 / p50_ms / p95_ms
 *
 * Usage:
 *   node scripts/bench-summary-diff.mjs <baseline.md> <new.md>
 *
 * Ejemplos:
 *   node scripts/bench-summary-diff.mjs \
 *     data/bench-runs/vision-pipeline-2026-05-27T07-20-58/summary.md \
 *     data/bench-runs/vision-pipeline-2026-05-28T03-00-00/summary.md
 *
 * Refs: BENCH_GATE_PIPELINE.md.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.error("Usage: node bench-summary-diff.mjs <baseline.md> <new.md>");
  process.exit(3);
}
const [BASELINE_PATH, NEW_PATH] = args;

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const readMd = (p) => {
  if (!fs.existsSync(p)) {
    console.error(`${RED}FATAL${RESET} no existe ${p}`);
    process.exit(3);
  }
  return fs.readFileSync(p, "utf8");
};

const ACCURACY_KEYWORDS = ["parse rate", "accuracy", "verified rate", "common name", "sci name"];
const HALLUC_KEYWORDS = ["hallucination", "halluc", "rejection rate"];
const LATENCY_KEYWORDS = ["latency p50", "latency p95", "p50_ms", "p95_ms", "p50", "p95"];

const parsePct = (s) => {
  const m = String(s).match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? parseFloat(m[1]) : null;
};

const parseMs = (s) => {
  const m = String(s).match(/(-?\d+(?:\.\d+)?)\s*ms/i);
  return m ? parseFloat(m[1]) : null;
};

const parseNum = (s) => {
  const cleaned = String(s).replace(/[^\d.\-]/g, "");
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : null;
};

const extractMetricsFromMd = (md) => {
  const lines = md.split("\n");
  const metrics = { accuracy: {}, halluc: {}, latency: {} };
  for (const line of lines) {
    if (!line.includes("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length < 2) continue;
    const label = cells[0].toLowerCase();
    if (label.startsWith("---") || label.startsWith("métrica") || label.startsWith("metric")) continue;

    // Toma los primeros 2 valores numéricos como [variant_a, variant_b] o [baseline, current]
    const numericValues = cells.slice(1).map((c) => {
      if (c.includes("%")) return parsePct(c);
      if (/\bms\b/i.test(c)) return parseMs(c);
      return parseNum(c);
    });

    const isAcc = ACCURACY_KEYWORDS.some((k) => label.includes(k));
    const isHalluc = HALLUC_KEYWORDS.some((k) => label.includes(k));
    const isLatency = LATENCY_KEYWORDS.some((k) => label.includes(k));

    if (isAcc && numericValues[0] !== null) metrics.accuracy[label] = numericValues;
    if (isHalluc && numericValues[0] !== null) metrics.halluc[label] = numericValues;
    if (isLatency && numericValues[0] !== null) metrics.latency[label] = numericValues;
  }
  return metrics;
};

const baseline = readMd(BASELINE_PATH);
const current = readMd(NEW_PATH);

const baselineMetrics = extractMetricsFromMd(baseline);
const currentMetrics = extractMetricsFromMd(current);

const hasMetrics = (m) =>
  Object.keys(m.accuracy).length > 0 ||
  Object.keys(m.halluc).length > 0 ||
  Object.keys(m.latency).length > 0;

if (!hasMetrics(baselineMetrics) || !hasMetrics(currentMetrics)) {
  console.error(`${RED}NO-DATA${RESET}: no encontré métricas conocidas en uno de los archivos.`);
  console.error(`Baseline metrics keys: ${Object.keys(baselineMetrics).flatMap((k) => Object.keys(baselineMetrics[k])).join(", ") || "(vacío)"}`);
  console.error(`Current  metrics keys: ${Object.keys(currentMetrics).flatMap((k) => Object.keys(currentMetrics[k])).join(", ") || "(vacío)"}`);
  process.exit(3);
}

const findings = [];
let regressionAccuracy = 0;
let regressionHalluc = 0;
let latencyDelta = []; // negative deltas = better

// Compare accuracy: baseline first numeric vs current first numeric.
// Si el bench fue A/B (con 2 valores) tomamos la columna "B" (variant control).
for (const [label, baseVals] of Object.entries(baselineMetrics.accuracy)) {
  const curVals = currentMetrics.accuracy[label];
  if (!curVals) continue;
  const baseVal = baseVals[baseVals.length - 1] ?? baseVals[0];
  const curVal = curVals[curVals.length - 1] ?? curVals[0];
  const delta = curVal - baseVal;
  findings.push({ kind: "accuracy", label, baseVal, curVal, delta });
  if (delta < -5) regressionAccuracy = Math.min(regressionAccuracy, delta);
}

for (const [label, baseVals] of Object.entries(baselineMetrics.halluc)) {
  const curVals = currentMetrics.halluc[label];
  if (!curVals) continue;
  const baseVal = baseVals[baseVals.length - 1] ?? baseVals[0];
  const curVal = curVals[curVals.length - 1] ?? curVals[0];
  const delta = curVal - baseVal;
  findings.push({ kind: "halluc", label, baseVal, curVal, delta });
  if (delta > 3) regressionHalluc = Math.max(regressionHalluc, delta);
}

for (const [label, baseVals] of Object.entries(baselineMetrics.latency)) {
  const curVals = currentMetrics.latency[label];
  if (!curVals) continue;
  const baseVal = baseVals[baseVals.length - 1] ?? baseVals[0];
  const curVal = curVals[curVals.length - 1] ?? curVals[0];
  if (baseVal === 0) continue;
  const pctDelta = ((curVal - baseVal) / baseVal) * 100;
  findings.push({ kind: "latency", label, baseVal, curVal, delta: pctDelta });
  latencyDelta.push(pctDelta);
}

// Decisión:
const avgLatencyDelta = latencyDelta.length
  ? latencyDelta.reduce((a, b) => a + b, 0) / latencyDelta.length
  : 0;

let verdict;
let exitCode;
if (regressionAccuracy < -5 || regressionHalluc > 3) {
  verdict = "RED";
  exitCode = 2;
} else if (avgLatencyDelta > 10 && Math.abs(regressionAccuracy) < 5 && regressionHalluc <= 3) {
  // Latencia empeoró sin gain accuracy → YELLOW
  verdict = "YELLOW";
  exitCode = 1;
} else if (avgLatencyDelta <= -10 || (Math.abs(avgLatencyDelta) < 5 && Math.abs(regressionAccuracy) < 2)) {
  verdict = "GREEN";
  exitCode = 0;
} else {
  verdict = "YELLOW";
  exitCode = 1;
}

const banner = verdict === "GREEN" ? `${GREEN}` : verdict === "YELLOW" ? `${YELLOW}` : `${RED}`;
console.log(`${banner}╔════════════════════════════════════════╗${RESET}`);
console.log(`${banner}║   BENCH GATE: ${verdict.padEnd(7)}                   ║${RESET}`);
console.log(`${banner}╚════════════════════════════════════════╝${RESET}`);
console.log();
console.log(`${DIM}Baseline:${RESET} ${BASELINE_PATH}`);
console.log(`${DIM}Current: ${RESET} ${NEW_PATH}`);
console.log();
console.log("Métrica                                  Baseline    Current     Δ");
console.log("─────────────────────────────────────────────────────────────────────────");

for (const f of findings) {
  const baseStr = f.kind === "latency" ? `${f.baseVal.toFixed(0)}ms` : `${f.baseVal.toFixed(1)}%`;
  const curStr = f.kind === "latency" ? `${f.curVal.toFixed(0)}ms` : `${f.curVal.toFixed(1)}%`;
  const deltaStr = f.kind === "latency"
    ? `${f.delta > 0 ? "+" : ""}${f.delta.toFixed(1)}%`
    : `${f.delta > 0 ? "+" : ""}${f.delta.toFixed(1)}pp`;
  const color = f.kind === "accuracy"
    ? (f.delta < -5 ? RED : f.delta > 2 ? GREEN : "")
    : f.kind === "halluc"
      ? (f.delta > 3 ? RED : f.delta < -2 ? GREEN : "")
      : f.delta < -10 ? GREEN : f.delta > 10 ? RED : "";
  console.log(`${f.label.padEnd(40)} ${baseStr.padStart(10)}  ${curStr.padStart(10)}  ${color}${deltaStr.padStart(8)}${RESET}`);
}

console.log();
console.log(`${DIM}Avg latency delta: ${avgLatencyDelta.toFixed(1)}%${RESET}`);
console.log(`${DIM}Worst accuracy regression: ${regressionAccuracy.toFixed(1)}pp${RESET}`);
console.log(`${DIM}Worst halluc regression: +${regressionHalluc.toFixed(1)}pp${RESET}`);

process.exit(exitCode);
