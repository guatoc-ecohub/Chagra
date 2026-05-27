/**
 * llmTelemetryService.js — Telemetría privacy-safe de calls LLM (v13 2026-05-17).
 *
 * Alimenta el Eco-Oracle Dashboard (ADR-023) sección LLM + GPU. Espejo del
 * patrón `voiceTelemetryService.js` para coherencia operativa.
 *
 * Privacy (ADR-030 Regla 9 extendida a LLM):
 * - NUNCA persiste prompt ni respuesta del modelo (solo longitudes/conteos).
 * - NO operator_id, NO coords, NO transcripciones.
 * - Aggregates solo: modelo, latencias, tokens, processor (gpu/cpu), error_kind.
 *
 * Schema del evento:
 *   {
 *     id: 'lm_<ts36><rand36>',
 *     model: 'gemma3:4b',
 *     endpoint: '/api/ollama/api/chat',
 *     flujo: 'chat' | 'extract' | 'vision' | 'summarize' | 'recommend' | 'help' | 'other',
 *     status: 'success' | 'error' | 'abort',
 *     total_ms: 5432,             // wall-clock cliente
 *     load_ms: 3020,              // ollama: load_duration / 1e6 (null si no aplica)
 *     prompt_eval_count: 12,      // tokens prompt
 *     eval_count: 89,             // tokens generación
 *     eval_rate: 118.18,          // tokens/s calculado (eval_count / eval_ms*1000)
 *     processor: 'gpu' | 'cpu' | 'unknown',
 *     error_kind: null | 'timeout' | 'http_4xx' | 'http_5xx' | 'abort' | 'network' | 'parse',
 *     rag_passages_used: 3,       // # passages prepended by RAG (0 = no context).
 *                                 // Audit 2026-05-18 #4: tracking hit-rate del
 *                                 // RAG en `analyzeFoliage` y futuros consumers.
 *                                 // null cuando el call no consultó RAG.
 *     confidence: 0.92,           // V-12 2026-05-27: confianza self-reported por
 *                                 // el modelo de visión (campo `confidence` del
 *                                 // JSON parseado en `recognizeSpecies`). Solo
 *                                 // emitido por callers vision; resto omite.
 *                                 // Rango esperado 0-1, sin coerción.
 *     grounded_status: 'verified' // V-12 2026-05-27: resultado de validar contra
 *                                 // catálogo Chagra vía `validate_visual_match`
 *                                 // (sidecar agro-mcp). Valores:
 *                                 //   'verified' → match estricto catálogo
 *                                 //   'rejected' → modelo alucinó (not_in_catalog)
 *                                 //   null       → sidecar offline / disabled
 *                                 //                / call no usó grounding
 *     created_at: ISO,
 *     synced: false,
 *   }
 *
 * Backend: IndexedDB store `llm_telemetry` (dbCore v13).
 */

import { openDB, STORES } from '../db/dbCore.js';

const RETAIN_MAX = 1000; // cap defensivo — al sobrepasar se purga el oldest

const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `lm_${timestamp}${random}`;
};

const isEnabled = () => {
  try {
    return localStorage.getItem('chagra:llm-telemetry-enabled') !== 'false';
  } catch (_) {
    return true;
  }
};

/**
 * Registra un evento LLM. Llamado por ollamaStream/openaiStream al cerrar.
 * No-op si la telemetría está deshabilitada por el usuario.
 */
export const recordLLMEvent = async (event) => {
  if (!isEnabled()) return null;
  if (!event || typeof event !== 'object') return null;

  const record = {
    id: generateId(),
    model: event.model || 'unknown',
    endpoint: event.endpoint || 'unknown',
    flujo: event.flujo || 'other',
    status: event.status || 'success',
    total_ms: typeof event.total_ms === 'number' ? event.total_ms : null,
    load_ms: typeof event.load_ms === 'number' ? event.load_ms : null,
    prompt_eval_count: typeof event.prompt_eval_count === 'number' ? event.prompt_eval_count : null,
    eval_count: typeof event.eval_count === 'number' ? event.eval_count : null,
    eval_rate: typeof event.eval_rate === 'number' ? event.eval_rate : null,
    processor: event.processor || 'unknown',
    error_kind: event.error_kind || null,
    // Audit 2026-05-18 #4: # passages que el RAG inyectó al prompt.
    // 0 = consultó RAG pero no encontró matches. null = call no usó RAG.
    rag_passages_used: typeof event.rag_passages_used === 'number' ? event.rag_passages_used : null,
    created_at: new Date().toISOString(),
    synced: false,
  };

  // V-12 2026-05-27: campos opcionales del flujo visión. Omitir del payload
  // cuando el caller no los provee (backward-compat strict — eventos no-vision
  // como chat/extract no deben acarrear keys nulas innecesarias).
  if (typeof event.confidence === 'number') {
    record.confidence = event.confidence;
  }
  if (event.grounded_status !== undefined) {
    // Acepta string ('verified'|'rejected'|otros) o null explícito (sidecar off).
    // Solo omitimos si el caller no pasó la key.
    record.grounded_status = event.grounded_status;
  }

  try {
    const db = await openDB();
    const tx = db.transaction(STORES.LLM_TELEMETRY, 'readwrite');
    tx.objectStore(STORES.LLM_TELEMETRY).add(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return record;
  } catch (_err) {
    // Telemetría NUNCA debe romper la UX. Falla silente.
    return null;
  }
};

/**
 * Devuelve los eventos LLM más recientes, orden descendente por created_at.
 */
export const getLLMEvents = async (limit = 200) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.LLM_TELEMETRY, 'readonly');
    const store = tx.objectStore(STORES.LLM_TELEMETRY);
    const index = store.index('created_at');
    const events = [];
    return new Promise((resolve, reject) => {
      const req = index.openCursor(null, 'prev');
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && events.length < limit) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return [];
  }
};

/**
 * Borra todos los eventos LLM (action de usuario en pantalla Telemetría).
 */
export const clearLLMTelemetry = async () => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.LLM_TELEMETRY, 'readwrite');
    tx.objectStore(STORES.LLM_TELEMETRY).clear();
    await new Promise((resolve) => { tx.oncomplete = resolve; });
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Mantiene el store por debajo de RETAIN_MAX (LRU por created_at). Idempotente
 * y barato — corre opcionalmente al cerrar cada evento. Falla silente.
 */
export const pruneLLMTelemetry = async () => {
  try {
    const db = await openDB();
    const countTx = db.transaction(STORES.LLM_TELEMETRY, 'readonly');
    const count = await new Promise((resolve, reject) => {
      const req = countTx.objectStore(STORES.LLM_TELEMETRY).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (count <= RETAIN_MAX) return 0;

    const excess = count - RETAIN_MAX;
    const delTx = db.transaction(STORES.LLM_TELEMETRY, 'readwrite');
    const index = delTx.objectStore(STORES.LLM_TELEMETRY).index('created_at');
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
 * Calcula agregaciones por modelo + flujo para el dashboard.
 *
 * @param {Array} events - eventos del store (precargados con getLLMEvents)
 * @returns {{ totals, byModel, byFlujo }}
 */
export const aggregateLLMMetrics = (events) => {
  const list = Array.isArray(events) ? events : [];

  const success = list.filter((e) => e.status === 'success');
  const failed = list.filter((e) => e.status === 'error');
  const aborted = list.filter((e) => e.status === 'abort');

  const totals = {
    total: list.length,
    success: success.length,
    error: failed.length,
    abort: aborted.length,
    successRate: list.length ? (success.length / list.length) : 0,
    gpuCalls: list.filter((e) => e.processor === 'gpu').length,
    cpuCalls: list.filter((e) => e.processor === 'cpu').length,
    avgTotalMs: avg(list.map((e) => e.total_ms).filter(isNum)),
    p95TotalMs: p95(list.map((e) => e.total_ms).filter(isNum)),
    avgEvalRate: avg(list.map((e) => e.eval_rate).filter(isNum)),
  };

  const byModel = groupReduce(list, (e) => e.model || 'unknown', (group) => ({
    count: group.length,
    success: group.filter((e) => e.status === 'success').length,
    errorRate: group.length ? group.filter((e) => e.status === 'error').length / group.length : 0,
    avgTotalMs: avg(group.map((e) => e.total_ms).filter(isNum)),
    p95TotalMs: p95(group.map((e) => e.total_ms).filter(isNum)),
    avgEvalRate: avg(group.map((e) => e.eval_rate).filter(isNum)),
    avgEvalCount: avg(group.map((e) => e.eval_count).filter(isNum)),
    gpuShare: group.length ? group.filter((e) => e.processor === 'gpu').length / group.length : 0,
  }));

  const byFlujo = groupReduce(list, (e) => e.flujo || 'other', (group) => ({
    count: group.length,
    avgTotalMs: avg(group.map((e) => e.total_ms).filter(isNum)),
    errorRate: group.length ? group.filter((e) => e.status === 'error').length / group.length : 0,
  }));

  return { totals, byModel, byFlujo };
};

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
const p95 = (arr) => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.95);
  return Math.round(sorted[Math.min(idx, sorted.length - 1)]);
};
const groupReduce = (arr, keyFn, reduceFn) => {
  const groups = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  const out = {};
  for (const [key, group] of Object.entries(groups)) {
    out[key] = reduceFn(group);
  }
  return out;
};

/**
 * Exporta los eventos a CSV o JSON para auditoría (no incluye prompts/respuestas).
 */
export const exportLLMTelemetry = async (format = 'json') => {
  const events = await getLLMEvents(RETAIN_MAX);
  if (format === 'csv') {
    const headers = ['id', 'created_at', 'model', 'endpoint', 'flujo', 'status',
                     'processor', 'total_ms', 'load_ms', 'eval_count',
                     'prompt_eval_count', 'eval_rate', 'error_kind',
                     'rag_passages_used', 'confidence', 'grounded_status'];
    const rows = events.map((e) => headers.map((h) => e[h] ?? '').join(','));
    return [headers.join(','), ...rows].join('\n');
  }
  return JSON.stringify(events, null, 2);
};

/**
 * Toggle telemetría LLM (persistente en localStorage para coherencia con voice).
 */
export const setLLMTelemetryEnabled = (enabled) => {
  try {
    localStorage.setItem('chagra:llm-telemetry-enabled', enabled ? 'true' : 'false');
  } catch (_) { /* noop */ }
};

export const isLLMTelemetryEnabled = isEnabled;
