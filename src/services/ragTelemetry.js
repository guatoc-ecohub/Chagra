/**
 * ragTelemetry.js — Telemetría RAG-by-surface (L1.10, 2026-05-19).
 *
 * Captura, por cada llamada a `ragRetriever.retrieve`, qué superficie
 * (pantalla / servicio) pidió el RAG, qué query disparó la búsqueda, el
 * score top-1 obtenido, la latencia y el conteo de resultados. La meta
 * principal es alimentar el análisis post-demo institucional 2026-05-19: qué
 * pantallas usan RAG y con qué calidad (hit-rate, latencia móvil, queries
 * que devuelven score=0).
 *
 * Privacy / volumen:
 * - El `query` se persiste truncado a 60 chars (alfanuméricos + acentos).
 *   No se hace hash porque el corpus de cycle-content es público y las
 *   queries del usuario no portan PII para este uso. Truncar evita
 *   acumular texto libre y mantiene el store compacto.
 * - El store IDB `rag_telemetry` (dbCore v14) tiene cap RETAIN_MAX para
 *   no inflar storage en móviles rurales.
 *
 * Sampling:
 * - `VITE_RAG_TELEMETRY_RATE` (0..1) controla qué fracción de eventos se
 *   persiste. Default 1.0 (100%) para demo institucional; en prod se baja a 0.1.
 * - Decisión por evento via `Math.random()` — sin sticky-session: simple
 *   y suficiente para esta señal.
 *
 * Schema del evento:
 *   {
 *     id: 'rg_<ts36><rand36>',
 *     surface: 'agente' | 'foliage' | 'voice' | 'species' | 'unknown' | ...,
 *     query: string (≤ 60 chars),
 *     query_length: int,        // longitud original (pre-trunco)
 *     top_score: number | null, // score BM25 del top-1; null si no hubo hits
 *     result_count: int,        // # passages devueltos
 *     latency_ms: int,
 *     has_results: 0 | 1,       // index-friendly (IDB no indexa booleans bien)
 *     error_kind: null | 'fetch' | 'parse' | 'unknown',
 *     created_at: ISO string,
 *   }
 *
 * Backend: IndexedDB store `rag_telemetry` (dbCore v14).
 */

import { openDB, STORES } from '../db/dbCore.js';

const RETAIN_MAX = 1000; // cap defensivo — al sobrepasar se purga el oldest
const QUERY_MAX_CHARS = 60;

const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `rg_${timestamp}${random}`;
};

/**
 * Lee el rate de sampling desde Vite env. Default 1.0.
 * Inválido (NaN, fuera de [0,1]) → 1.0 (degrade hacia "captura todo" para
 * no perder señal por mala config).
 */
export const getTelemetryRate = () => {
  try {
    const raw = import.meta.env?.VITE_RAG_TELEMETRY_RATE;
    if (raw == null || raw === '') return 1.0;
    const n = Number(raw);
    if (!Number.isFinite(n)) return 1.0;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  } catch (_) {
    return 1.0;
  }
};

/**
 * Toggle global por usuario (alineado con voice/llm telemetry).
 * Default: habilitado.
 */
const isEnabled = () => {
  try {
    return localStorage.getItem('chagra:rag-telemetry-enabled') !== 'false';
  } catch (_) {
    return true;
  }
};

const truncateQuery = (q) => {
  if (typeof q !== 'string') return '';
  if (q.length <= QUERY_MAX_CHARS) return q;
  return q.slice(0, QUERY_MAX_CHARS);
};

const shouldSample = (rate) => {
  if (rate >= 1) return true;
  if (rate <= 0) return false;
  return Math.random() < rate;
};

/**
 * Persiste un evento RAG. Falla silente (telemetría nunca rompe la UX).
 *
 * @param {Object} ev
 * @param {string} ev.surface  - pantalla/servicio que pidió RAG (default 'unknown').
 * @param {string} ev.query    - query enviada al BM25.
 * @param {number|null} ev.topScore - score del top-1 (null si 0 resultados).
 * @param {number} ev.latencyMs - wall-clock cliente.
 * @param {number} ev.resultCount - # passages devueltos.
 * @param {string|null} [ev.error] - 'fetch' | 'parse' | 'unknown' | null.
 * @returns {Promise<Object|null>} record persistido o null si descartado.
 */
export const recordRagEvent = async (opts = /** @type {any} */ ({})) => {
  const {
    surface = 'unknown',
    query = '',
    topScore = null,
    latencyMs = 0,
    resultCount = 0,
    error = null,
  } = opts;
  if (!isEnabled()) return null;
  if (!shouldSample(getTelemetryRate())) return null;

  const queryStr = typeof query === 'string' ? query : String(query ?? '');
  const record = {
    id: generateId(),
    surface: typeof surface === 'string' && surface ? surface : 'unknown',
    query: truncateQuery(queryStr),
    query_length: queryStr.length,
    top_score: typeof topScore === 'number' && Number.isFinite(topScore) ? topScore : null,
    result_count: typeof resultCount === 'number' && resultCount >= 0 ? Math.floor(resultCount) : 0,
    latency_ms: typeof latencyMs === 'number' && latencyMs >= 0 ? Math.round(latencyMs) : 0,
    has_results: resultCount > 0 ? 1 : 0,
    error_kind: error || null,
    created_at: new Date().toISOString(),
  };

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.RAG_TELEMETRY, 'readwrite');
    tx.objectStore(STORES.RAG_TELEMETRY).add(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return record;
  } catch (_err) {
    return null;
  }
};

/**
 * Lee eventos RAG, ordenados descendente por created_at.
 *
 * @param {Object} [opts]
 * @param {number} [opts.limit=200] - máximo a devolver.
 * @param {string} [opts.since]     - ISO string; solo eventos created_at >= since.
 * @returns {Promise<Array>}
 */
export const getRagEvents = async ({ limit = 200, since = null } = {}) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.RAG_TELEMETRY, 'readonly');
    const store = tx.objectStore(STORES.RAG_TELEMETRY);
    const index = store.index('created_at');
    const out = [];
    return new Promise((resolve, reject) => {
      const req = index.openCursor(null, 'prev');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && out.length < limit) {
          const ev = cursor.value;
          if (!since || ev.created_at >= since) {
            out.push(ev);
          }
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return [];
  }
};

const P95_RATIO = 0.95;
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const p95 = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * P95_RATIO);
  return sorted[Math.min(idx, sorted.length - 1)];
};

/**
 * Agrega métricas RAG (avg latency, top surfaces, queries con score=0).
 *
 * @param {Object} [opts]
 * @param {string} [opts.since] - ISO string; solo eventos >= since.
 * @param {Array}  [opts.events] - precargados (opcional, evita re-leer IDB).
 * @returns {Promise<{
 *   total: number,
 *   bySurface: Record<string, {count, avgLatencyMs, p95LatencyMs, hitRate, avgTopScore, zeroScoreQueries}>,
 *   overall: {avgLatencyMs, p95LatencyMs, hitRate, errorRate},
 *   zeroScoreQueries: Array<{surface, query, created_at}>,
 *   since: string|null,
 * }>}
 */
export const getRagMetrics = async ({ since = null, events = null } = {}) => {
  const list = Array.isArray(events) ? events : await getRagEvents({ limit: RETAIN_MAX, since });

  const totals = {
    total: list.length,
    overall: {
      avgLatencyMs: Math.round(avg(list.map((e) => e.latency_ms).filter(isNum))),
      p95LatencyMs: Math.round(p95(list.map((e) => e.latency_ms).filter(isNum))),
      hitRate: list.length ? list.filter((e) => e.has_results === 1).length / list.length : 0,
      errorRate: list.length ? list.filter((e) => e.error_kind).length / list.length : 0,
    },
    bySurface: {},
    zeroScoreQueries: [],
    since,
  };

  // Group by surface
  const groups = {};
  for (const ev of list) {
    const key = ev.surface || 'unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  for (const [surface, evs] of Object.entries(groups)) {
    const latencies = evs.map((e) => e.latency_ms).filter(isNum);
    const topScores = evs.map((e) => e.top_score).filter(isNum);
    const hits = evs.filter((e) => e.has_results === 1);
    const zeros = evs.filter((e) => e.has_results === 0 && !e.error_kind);
    totals.bySurface[surface] = {
      count: evs.length,
      avgLatencyMs: Math.round(avg(latencies)),
      p95LatencyMs: Math.round(p95(latencies)),
      hitRate: evs.length ? hits.length / evs.length : 0,
      avgTopScore: topScores.length ? +(avg(topScores)).toFixed(3) : 0,
      zeroScoreQueries: zeros.length,
    };
  }

  // Lista corta de queries con score=0 (útil para mejorar el corpus)
  totals.zeroScoreQueries = list
    .filter((e) => e.has_results === 0 && !e.error_kind)
    .slice(0, 50)
    .map((e) => ({ surface: e.surface, query: e.query, created_at: e.created_at }));

  return totals;
};

/**
 * Mantiene el store por debajo de RETAIN_MAX (LRU por created_at). Idempotente
 * y barato. Falla silente.
 */
export const pruneRagTelemetry = async () => {
  try {
    const db = await openDB();
    const countTx = db.transaction(STORES.RAG_TELEMETRY, 'readonly');
    const count = await new Promise((resolve, reject) => {
      const req = countTx.objectStore(STORES.RAG_TELEMETRY).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count <= RETAIN_MAX) return 0;

    const excess = count - RETAIN_MAX;
    const delTx = db.transaction(STORES.RAG_TELEMETRY, 'readwrite');
    const index = delTx.objectStore(STORES.RAG_TELEMETRY).index('created_at');
    let removed = 0;
    return new Promise((resolve, reject) => {
      const req = index.openCursor(null, 'next');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && removed < excess) {
          cursor.delete();
          removed += 1;
          cursor.continue();
        } else {
          resolve(removed);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return 0;
  }
};

/**
 * Borra todos los eventos (action de usuario en pantalla Telemetría).
 */
export const clearRagTelemetry = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.RAG_TELEMETRY, 'readwrite');
    tx.objectStore(STORES.RAG_TELEMETRY).clear();
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    return true;
  } catch (_) {
    return false;
  }
};

export const setRagTelemetryEnabled = (enabled) => {
  try {
    localStorage.setItem('chagra:rag-telemetry-enabled', enabled ? 'true' : 'false');
  } catch (_) { /* noop */ }
};

export const isRagTelemetryEnabled = isEnabled;
