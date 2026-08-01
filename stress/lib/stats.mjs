/**
 * stress/lib/stats.mjs — percentiles y resumen de latencias para los scripts
 * de stress. Sin dependencias externas (no hay libs de estadística en
 * package.json y no vale la pena sumar una para percentiles).
 *
 * @module stress/lib/stats
 */

/**
 * percentile — percentil `p` (0-100) sobre un array YA ordenado ascendente.
 * Usa "nearest-rank" (simple, determinista, suficiente para reportar
 * p50/p95/p99 de un bench — no necesitamos interpolación lineal exacta).
 * @param {number[]} sortedAsc
 * @param {number} p
 * @returns {number|null}
 */
export function percentile(sortedAsc, p) {
  if (!sortedAsc.length) return null;
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1));
  return sortedAsc[idx];
}

/**
 * summarize — resumen count/min/max/mean/p50/p90/p95/p99 de un array de
 * latencias en ms. Filtra NaN/undefined (tareas que no llegaron a medir
 * latencia, p.ej. porque el fetch rechazó antes de iniciar el timer).
 * @param {number[]} latenciesMs
 * @returns {{count:number, min:number|null, max:number|null, mean:number|null, p50:number|null, p90:number|null, p95:number|null, p99:number|null}}
 */
export function summarize(latenciesMs) {
  const arr = latenciesMs.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
  if (arr.length === 0) {
    return { count: 0, min: null, max: null, mean: null, p50: null, p90: null, p95: null, p99: null };
  }
  const sum = arr.reduce((a, b) => a + b, 0);
  return {
    count: arr.length,
    min: arr[0],
    max: arr[arr.length - 1],
    mean: sum / arr.length,
    p50: percentile(arr, 50),
    p90: percentile(arr, 90),
    p95: percentile(arr, 95),
    p99: percentile(arr, 99),
  };
}

/**
 * histogram — cuenta ocurrencias por valor (status HTTP, tipo de error, etc.)
 * @param {Array<string|number>} values
 * @returns {Record<string, number>}
 */
export function histogram(values) {
  const h = {};
  for (const v of values) {
    const key = String(v);
    h[key] = (h[key] || 0) + 1;
  }
  return h;
}

/** fmtMs — formatea ms con 0 decimales, 'n/a' si null/undefined. */
export function fmtMs(n) {
  return n == null || !Number.isFinite(n) ? 'n/a' : `${n.toFixed(0)}ms`;
}

/** fmtPct — formatea fracción [0,1] como porcentaje con 1 decimal. */
export function fmtPct(fraction) {
  return `${(fraction * 100).toFixed(1)}%`;
}
