/**
 * stress/lib/report.mjs — reporte consola + JSON opcional, común a los 5
 * scripts de stress. Contrato de entrada: el array que devuelve
 * `runPool()` (ver stress/lib/pool.mjs), donde cada worker resuelve a un
 * objeto `{ latencyMs, status, ok, errorKind, meta? }`:
 *   - latencyMs: number  — tiempo de la llamada, medido SIEMPRE (incluso en
 *     error), para que timeouts/rechazos entren en los percentiles.
 *   - status: number|string — código HTTP (200, 503…) o etiqueta lógica
 *     ('timeout', 'network_error', 'exception').
 *   - ok: boolean — éxito lógico (2xx + payload esperado).
 *   - errorKind: string|null — motivo corto cuando ok=false.
 *
 * @module stress/lib/report
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { summarize, histogram, fmtMs, fmtPct } from './stats.mjs';

/**
 * normalizeResults — convierte la salida cruda de runPool() en una lista
 * plana de "outcomes" `{latencyMs, status, ok, errorKind}`. Si el worker en
 * sí reventó (throw no capturado dentro del worker), se sintetiza un
 * outcome 'exception' con la latencia medida por el pool.
 * @param {Array} poolResults
 * @returns {Array<{latencyMs:number, status:string|number, ok:boolean, errorKind:string|null}>}
 */
export function normalizeResults(poolResults) {
  return poolResults.map((r) => {
    if (r.ok && r.value && typeof r.value === 'object') {
      return {
        latencyMs: Number.isFinite(r.value.latencyMs) ? r.value.latencyMs : r.finishedAt - r.startedAt,
        status: r.value.status ?? (r.value.ok ? 200 : 'unknown'),
        ok: Boolean(r.value.ok),
        errorKind: r.value.errorKind ?? null,
      };
    }
    return {
      latencyMs: r.finishedAt - r.startedAt,
      status: 'exception',
      ok: false,
      errorKind: r.error ? String(r.error.message || r.error).slice(0, 120) : 'unknown_exception',
    };
  });
}

/**
 * buildReport — arma el objeto de reporte (resumen + histogramas +
 * pass/fail contra thresholds opcionales).
 * @param {object} p
 * @param {string} p.title
 * @param {number} p.durationMs — wall-clock total de la corrida.
 * @param {Array} p.outcomes — normalizeResults(...) output.
 * @param {object} [p.thresholds] — { p95Ms, p99Ms, maxErrorRate, max503Rate }
 * @returns {object}
 */
export function buildReport({ title, durationMs, outcomes, thresholds = {} }) {
  const latencies = outcomes.map((o) => o.latencyMs);
  const stats = summarize(latencies);
  const statusHist = histogram(outcomes.map((o) => o.status));
  const errorHist = histogram(outcomes.filter((o) => !o.ok).map((o) => o.errorKind || 'unknown'));
  const total = outcomes.length;
  const okCount = outcomes.filter((o) => o.ok).length;
  const count503 = outcomes.filter((o) => String(o.status) === '503').length;
  const errorRate = total > 0 ? (total - okCount) / total : 0;
  const rate503 = total > 0 ? count503 / total : 0;
  const throughputRps = durationMs > 0 ? (total / durationMs) * 1000 : 0;

  const checks = [];
  if (Number.isFinite(thresholds.p95Ms)) {
    checks.push({ name: `p95 <= ${thresholds.p95Ms}ms`, pass: stats.p95 != null && stats.p95 <= thresholds.p95Ms, actual: stats.p95 });
  }
  if (Number.isFinite(thresholds.p99Ms)) {
    checks.push({ name: `p99 <= ${thresholds.p99Ms}ms`, pass: stats.p99 != null && stats.p99 <= thresholds.p99Ms, actual: stats.p99 });
  }
  if (Number.isFinite(thresholds.maxErrorRate)) {
    checks.push({ name: `error rate <= ${fmtPct(thresholds.maxErrorRate)}`, pass: errorRate <= thresholds.maxErrorRate, actual: errorRate });
  }
  if (Number.isFinite(thresholds.max503Rate)) {
    checks.push({ name: `503 rate <= ${fmtPct(thresholds.max503Rate)}`, pass: rate503 <= thresholds.max503Rate, actual: rate503 });
  }

  return {
    title,
    generatedAt: new Date().toISOString(),
    durationMs,
    total,
    okCount,
    errorRate,
    count503,
    rate503,
    throughputRps,
    latencyStats: stats,
    statusHistogram: statusHist,
    errorHistogram: errorHist,
    thresholds,
    checks,
    allChecksPassed: checks.every((c) => c.pass),
  };
}

/** printReport — imprime el reporte en consola en formato tabla legible. */
export function printReport(report) {
  const line = '─'.repeat(70);
  console.log(`\n${line}`);
  console.log(`  ${report.title}`);
  console.log(line);
  console.log(`  Corrida:        ${report.generatedAt}`);
  console.log(`  Duración total: ${(report.durationMs / 1000).toFixed(1)}s`);
  console.log(`  Requests:       ${report.total} (ok=${report.okCount}, error=${report.total - report.okCount})`);
  console.log(`  Throughput:     ${report.throughputRps.toFixed(2)} req/s`);
  console.log(`  Tasa de error:  ${fmtPct(report.errorRate)}`);
  console.log(`  Tasa HTTP 503:  ${fmtPct(report.rate503)} (${report.count503} de ${report.total})`);
  console.log(`\n  Latencia:`);
  console.log(`    min=${fmtMs(report.latencyStats.min)}  mean=${fmtMs(report.latencyStats.mean)}  max=${fmtMs(report.latencyStats.max)}`);
  console.log(`    p50=${fmtMs(report.latencyStats.p50)}  p90=${fmtMs(report.latencyStats.p90)}  p95=${fmtMs(report.latencyStats.p95)}  p99=${fmtMs(report.latencyStats.p99)}`);
  console.log(`\n  Status HTTP / lógico:`);
  for (const [status, count] of Object.entries(report.statusHistogram).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${status}: ${count}`);
  }
  if (Object.keys(report.errorHistogram).length > 0) {
    console.log(`\n  Errores (por tipo):`);
    for (const [kind, count] of Object.entries(report.errorHistogram).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${kind}: ${count}`);
    }
  }
  if (report.checks.length > 0) {
    console.log(`\n  Umbrales:`);
    for (const c of report.checks) {
      const mark = c.pass ? 'OK  ' : 'FAIL';
      const actual = typeof c.actual === 'number' && c.actual < 1 && c.name.includes('rate') ? fmtPct(c.actual) : fmtMs(c.actual);
      console.log(`    [${mark}] ${c.name} (medido: ${actual})`);
    }
  }
  console.log(line);
}

/**
 * writeReportJson — persiste el reporte (+ outcomes crudos opcionalmente) a
 * disco. Por defecto en stress/results/<slug>-<timestamp>.json (ignorado
 * por git, ver .gitignore).
 */
export function writeReportJson(report, { outPath, outcomes } = {}) {
  const path = outPath || defaultOutPath(report.title);
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const payload = outcomes ? { ...report, outcomes } : report;
  writeFileSync(path, JSON.stringify(payload, null, 2));
  return path;
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacriticos (tildes) tras NFD
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function defaultOutPath(title) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return new URL(`../results/${slugify(title)}-${ts}.json`, import.meta.url).pathname;
}
