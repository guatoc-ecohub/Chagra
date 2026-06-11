/**
 * bench-stats.mjs — agregación de VARIANZA para benches no-deterministas.
 *
 * POR QUÉ (auditoría 2026-06-11): granite3.1-dense:8b NO es determinista ni con
 * seed fijo, y el juez es todo-o-nada (PASS solo si TODOS los must_include y CERO
 * red_flags). Resultado: `bench-borde-alucinacion` rebotaba 33%/25% entre
 * corridas de la MISMA config. Reportar UNA cifra es auto-engaño. Este módulo
 * corre el bench N veces y reporta media ± desviación estándar + rango + IC95,
 * para que el número que se comunica refleje la incertidumbre real.
 *
 * Módulo PURO (sin efectos secundarios) → importable por el bench y por el test.
 *
 * @module bench-stats
 */

/** Media aritmética. Devuelve 0 para arreglo vacío. */
export function mean(values) {
  const arr = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/**
 * Desviación estándar MUESTRAL (denominador n-1, Bessel). Devuelve 0 si hay
 * menos de 2 muestras (no se puede estimar dispersión con una sola corrida).
 */
export function stddev(values) {
  const arr = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * summarizeReps — resume las métricas de N repeticiones de un bench
 * no-determinista. `values` son las cifras por corrida (p. ej. AH% de cada rep).
 *
 * Devuelve { n, mean, stddev, min, max, ci95Margin, ci95Lo, ci95Hi }. El IC95
 * usa la aproximación normal (1.96·σ/√n) — honesta para N≥~5; para N chico es
 * orientativa (se reporta igual con su N visible). Todos redondeados a 1 decimal
 * salvo n.
 *
 * @param {number[]} values
 * @returns {{n:number, mean:number, stddev:number, min:number, max:number, ci95Margin:number, ci95Lo:number, ci95Hi:number}}
 */
export function summarizeReps(values) {
  const arr = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  const n = arr.length;
  const r1 = (x) => Number(x.toFixed(1));
  if (n === 0) {
    return { n: 0, mean: 0, stddev: 0, min: 0, max: 0, ci95Margin: 0, ci95Lo: 0, ci95Hi: 0 };
  }
  const m = mean(arr);
  const sd = stddev(arr);
  const ci95Margin = n >= 2 ? 1.96 * (sd / Math.sqrt(n)) : 0;
  return {
    n,
    mean: r1(m),
    stddev: r1(sd),
    min: r1(Math.min(...arr)),
    max: r1(Math.max(...arr)),
    ci95Margin: r1(ci95Margin),
    ci95Lo: r1(Math.max(0, m - ci95Margin)),
    ci95Hi: r1(m + ci95Margin),
  };
}

/**
 * formatRepSummary — texto humano honesto de una corrida multi-rep. Si n<2,
 * avisa explícitamente que NO hay varianza medible (una sola corrida no es
 * evidencia de estabilidad).
 *
 * @param {string} label  p. ej. "AH%"
 * @param {ReturnType<typeof summarizeReps>} s
 * @returns {string}
 */
export function formatRepSummary(label, s) {
  if (!s || s.n === 0) return `${label}: sin datos (0 reps)`;
  if (s.n < 2) {
    return `${label}: ${s.mean} (n=1 — UNA sola corrida, varianza NO medible; granite no es determinista)`;
  }
  return (
    `${label}: ${s.mean} ± ${s.stddev} (n=${s.n}, rango ${s.min}–${s.max}, ` +
    `IC95 ${s.ci95Lo}–${s.ci95Hi})`
  );
}
