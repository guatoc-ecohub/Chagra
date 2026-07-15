/**
 * bench/lib/history.mjs - esquema FIJO + lectura/escritura/tendencia del historial
 * de corridas de benchmark de Chagra.
 *
 * POR QUE EXISTE (reingenieria 2026-06-15): cada bench escribia su `summary.json`
 * con un shape distinto (`ah_real_pct`, `accuracy`, `hallucination_rate`,
 * `normalized_score`...). No habia forma de responder "este bench mejoro o
 * empeoro respecto a la ultima corrida?" sin abrir N archivos y parsear a mano.
 *
 * Este modulo define UN solo esquema de registro de corrida (schema v1) que
 * TODO bench puede emitir via `buildHistoryRecord()` + `writeHistoryRecord()`.
 * El indice (`bench/run.mjs --history`) lee `bench/history/*.json` y calcula
 * tendencia por bench y por modelo con `computeTrend()`.
 *
 * Vision (memoria project-test-bench-automejorable): historial visible +
 * tendencia (mejora/empeora) + los fallos se vuelven casos. Este modulo es la
 * capa de PERSISTENCIA estandarizada de esa vision.
 *
 * Modulo PURO en su logica de calculo (mean/trend/compare) -> testeable sin red
 * ni FS. Las funciones con efectos (write/read dir) estan claramente separadas.
 *
 * @module bench/lib/history
 */
import {
  writeFileSync,
  readFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Directorio canonico del historial estandarizado. */
export const HISTORY_DIR = join(__dirname, '..', 'history');

/** Version del esquema. Subir si se cambia la forma de los campos. */
export const HISTORY_SCHEMA_VERSION = 1;

/**
 * Metricas con su DIRECCION buena. La direccion define que es "mejora":
 *   - 'up'   -> mas alto es mejor (pass_pct, accuracy, verified_rate...).
 *   - 'down' -> mas bajo es mejor (ah_pct alucinacion, latency...).
 *
 * `computeTrend()` usa este mapa para decir si un delta mejora o empeora. Las
 * metricas no listadas se reportan como delta crudo sin veredicto.
 */
export const METRIC_DIRECTION = {
  // mas alto = mejor
  pass_pct: 'up',
  accuracy: 'up',
  parse_rate: 'up',
  name_accuracy: 'up',
  sci_accuracy: 'up',
  verified_rate: 'up',
  validation_rate: 'up',
  keywords_pct: 'up',
  recall_at_1: 'up',
  recall_at_5: 'up',
  mrr: 'up',
  hard_case_recall_at_1: 'up',
  hard_case_recall_at_5: 'up',
  hard_case_mrr: 'up',
  graph_consistency_pct: 'up',
  grounded_pct: 'up',
  subspecies_ok_pct: 'up',
  score_global: 'up',
  factualidad: 'up',
  promedio: 'up',
  normalized_score: 'up',
  lift_pp: 'up',
  // mas bajo = mejor
  ah_pct: 'down',
  hallucination_rate: 'down',
  hallucinations: 'down',
  subspecies_disconnections: 'down',
  rejection_rate: 'down',
  latency_p50_ms: 'down',
  latency_p95_ms: 'down',
  latency_avg_ms: 'down',
  doc_embed_avg_ms: 'down',
  query_embed_avg_ms: 'down',
  cold_load_ms: 'down',
};

/**
 * buildHistoryRecord - construye un registro de corrida con el esquema FIJO v1.
 *
 * Todos los campos de identidad son obligatorios; `metrics` es un mapa
 * plano `{ <nombre>: <numero> }`. Cualquier bench que quiera aparecer en la
 * tendencia DEBE pasar por aca.
 *
 * @param {object} p
 * @param {string} p.bench         id del bench (debe existir en index.json).
 * @param {string} [p.date]        fecha ISO-8601; default: ahora.
 * @param {string|null} [p.model]  modelo evaluado (o null si N/A).
 * @param {Object<string,number>} p.metrics  metricas planas numericas.
 * @param {number|null} [p.passCount]  # de casos PASS (si aplica).
 * @param {number|null} [p.failCount]  # de casos FAIL (si aplica).
 * @param {string} [p.config]       etiqueta de config (PROD, A, C, smoke...).
 * @param {string} [p.commit]       sha corto del checkout que produjo la corrida.
 * @param {string} [p.notes]        nota libre (sin info sensible).
 * @param {boolean} [p.seed]        true si es un registro de ejemplo/semilla.
 * @returns {object} registro v1.
 */
export function buildHistoryRecord({
  bench,
  date = new Date().toISOString(),
  model = null,
  metrics = {},
  passCount = null,
  failCount = null,
  config = 'default',
  commit = '',
  notes = '',
  seed = false,
}) {
  if (!bench || typeof bench !== 'string') {
    throw new Error('buildHistoryRecord: "bench" es obligatorio (string).');
  }
  const cleanMetrics = {};
  for (const [k, v] of Object.entries(metrics || {})) {
    if (Number.isFinite(v)) cleanMetrics[k] = Number(v);
  }
  const pass = Number.isFinite(passCount) ? passCount : null;
  const fail = Number.isFinite(failCount) ? failCount : null;
  let passPct = cleanMetrics.pass_pct ?? null;
  if (passPct == null && pass != null && fail != null && pass + fail > 0) {
    passPct = Number(((pass / (pass + fail)) * 100).toFixed(1));
  }
  return {
    schema: HISTORY_SCHEMA_VERSION,
    bench,
    date,
    model,
    config,
    commit,
    metrics: cleanMetrics,
    passCount: pass,
    failCount: fail,
    passPct,
    notes,
    seed: Boolean(seed),
  };
}

/**
 * recordFilename - nombre de archivo determinIstico y ordenable de un registro.
 * Formato: `<bench>__<modelo|nomodel>__<fecha-segura>.json`.
 *
 * @param {object} record
 * @returns {string}
 */
export function recordFilename(record) {
  const safeDate = String(record.date).replace(/[:.]/g, '-');
  const model = (record.model || 'nomodel').replace(/[^a-zA-Z0-9._-]/g, '-');
  const bench = String(record.bench).replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${bench}__${model}__${safeDate}.json`;
}

/**
 * writeHistoryRecord - persiste un registro v1 en HISTORY_DIR (con efectos).
 *
 * @param {object} record  salida de buildHistoryRecord.
 * @param {string} [dir]   override del directorio (tests).
 * @returns {string} path escrito.
 */
export function writeHistoryRecord(record, dir = HISTORY_DIR) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = join(dir, recordFilename(record));
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`, 'utf-8');
  return path;
}

/**
 * readHistory - lee TODOS los registros v1 de un directorio. Ignora archivos
 * que no parseen o que no tengan `bench`+`date` (robusto ante basura).
 *
 * @param {string} [dir]
 * @returns {object[]} registros, ordenados por fecha ascendente.
 */
export function readHistory(dir = HISTORY_DIR) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.json')) continue;
    try {
      const rec = JSON.parse(readFileSync(join(dir, f), 'utf-8'));
      if (rec && typeof rec.bench === 'string' && rec.date) out.push(rec);
    } catch {
      // archivo corrupto: lo saltamos sin romper la lectura del resto.
    }
  }
  out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return out;
}

/**
 * groupByBenchModel - agrupa registros por clave `bench::model` con sus
 * corridas ordenadas por fecha. Base para la tendencia.
 *
 * @param {object[]} records
 * @returns {Map<string, object[]>}
 */
export function groupByBenchModel(records) {
  const map = new Map();
  for (const r of records) {
    const key = `${r.bench}::${r.model || 'nomodel'}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }
  return map;
}

/**
 * directionVerdict - dado el nombre de metrica y el delta (current - previous),
 * dice si el cambio MEJORA, EMPEORA o es NEUTRO segun METRIC_DIRECTION.
 *
 * @param {string} metric
 * @param {number} delta
 * @param {number} [epsilon=0.05]  banda muerta para considerar "neutro".
 * @returns {'mejora'|'empeora'|'neutro'|'sin-direccion'}
 */
export function directionVerdict(metric, delta, epsilon = 0.05) {
  if (!Number.isFinite(delta) || Math.abs(delta) <= epsilon) return 'neutro';
  const dir = METRIC_DIRECTION[metric];
  if (!dir) return 'sin-direccion';
  if (dir === 'up') return delta > 0 ? 'mejora' : 'empeora';
  return delta < 0 ? 'mejora' : 'empeora';
}

/**
 * computeTrend - calcula la tendencia de UNA serie de corridas (mismo bench +
 * modelo) para cada metrica presente en la corrida mas reciente.
 *
 * Compara la ultima corrida con la PENULTIMA (delta puntual) y reporta tambien
 * el primer->ultimo (delta total) para contexto. Logica PURA.
 *
 * @param {object[]} runs  corridas de la MISMA clave bench::model, ordenadas.
 * @returns {{n:number, latest:object|null, previous:object|null, metrics:object}}
 */
export function computeTrend(runs) {
  const sorted = [...(runs || [])].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const n = sorted.length;
  if (n === 0) return { n: 0, latest: null, previous: null, metrics: {} };
  const latest = sorted[n - 1];
  const previous = n >= 2 ? sorted[n - 2] : null;
  const first = sorted[0];
  const metrics = {};
  for (const [metric, current] of Object.entries(latest.metrics || {})) {
    const prevVal = previous?.metrics?.[metric];
    const firstVal = first?.metrics?.[metric];
    const delta =
      Number.isFinite(prevVal) && Number.isFinite(current)
        ? Number((current - prevVal).toFixed(2))
        : null;
    const totalDelta =
      Number.isFinite(firstVal) && Number.isFinite(current) && n >= 2
        ? Number((current - firstVal).toFixed(2))
        : null;
    metrics[metric] = {
      current,
      previous: Number.isFinite(prevVal) ? prevVal : null,
      delta,
      totalDelta,
      verdict: delta == null ? 'sin-dato' : directionVerdict(metric, delta),
    };
  }
  return { n, latest, previous, metrics };
}

/**
 * trendArrow - flecha visual para un veredicto de tendencia (solo caracteres
 * latinos ASCII, sin emojis - restriccion del repo).
 *
 * @param {string} verdict
 * @returns {string}
 */
export function trendArrow(verdict) {
  switch (verdict) {
    case 'mejora':
      return '(+) mejora';
    case 'empeora':
      return '(-) empeora';
    case 'neutro':
      return '(=) estable';
    case 'sin-direccion':
      return '(?) delta';
    default:
      return '-';
  }
}

/**
 * summarizeAllTrends - resumen de tendencia para TODAS las claves bench::model
 * presentes en el historial. Lo consume `run.mjs --history`.
 *
 * @param {object[]} records
 * @returns {Array<{bench:string, model:string, n:number, trend:object}>}
 */
export function summarizeAllTrends(records) {
  const grouped = groupByBenchModel(records);
  const out = [];
  for (const [key, runs] of grouped.entries()) {
    const [bench, model] = key.split('::');
    out.push({ bench, model, n: runs.length, trend: computeTrend(runs) });
  }
  out.sort(
    (a, b) => a.bench.localeCompare(b.bench) || a.model.localeCompare(b.model),
  );
  return out;
}

/**
 * latestRunFor - ultima corrida registrada para un bench (cualquier modelo).
 * Usado por el indice para la columna "ultima corrida".
 *
 * @param {object[]} records
 * @param {string} benchId
 * @returns {object|null}
 */
export function latestRunFor(records, benchId) {
  const forBench = records.filter((r) => r.bench === benchId);
  if (forBench.length === 0) return null;
  forBench.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return forBench[0];
}
