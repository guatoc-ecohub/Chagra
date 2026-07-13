/**
 * agentRequestQueue.js — Cola durable de requests al agente + telemetría rica (v20 2026-06-13).
 *
 * Garantiza que ninguna pregunta se pierda y captura metadata completa para
 * debuggear inteligencia + velocidad de Chagra. Patrón: réplica de
 * visionQueueService.js con IndexedDB + worker serializado + sender inyectado.
 *
 * Schema del registro `agent_requests`:
 * {
 *   id: number,                    // autoIncrement (IndexedDB)
 *   ts_submit: number,             // Unix ms — timestamp de enqueue
 *   prompt: string,                // prompt original (completo, no truncado)
 *   route: string,                 // ruta NLU (ej: 'chat', 'foliage', 'species')
 *   model: string,                 // modelo usado (ej: 'llama3:70b', 'gpt-4o')
 *   grounding: {                   // metadata de grounding (sidecar MCP)
 *     entities: Array,             // entidades extraídas (species, plagas, etc.)
 *     tools: Array,                // tools MCP invocados
 *     rag_chunks: number,          // # chunks RAG inyectados
 *     nlu_route: string,           // ruta NLU detectada
 *     grounded_status: string,    // 'verified' | 'partial' | 'none'
 *   },
 *   latency: {                     // métricas de latencia (ms)
 *     t_first_token_ms: number,    // tiempo al primer token
 *     t_total_ms: number,          // tiempo total de respuesta
 *     queue_wait_ms: number,       // tiempo esperando en cola
 *   },
 *   response: string|null,         // respuesta del modelo (null si pendiente/failed)
 *   tokens_in: number,             // tokens del prompt
 *   tokens_out: number,            // tokens de la respuesta
 *   retries: number,               // # reintentos realizados
 *   status: 'queued'|'sending'|'done'|'failed'|'offline',
 *   ts_done: number|null,          // Unix ms — timestamp de completion
 *   error: string|null,            // mensaje de error (si failed)
 * }
 *
 * Reglas operativas:
 * - enqueueRequest solo persiste con status='queued', NUNCA lanza (try/catch)
 * - drainPending({sender}) procesa items 'queued' uno a uno (SERIALIZADO)
 * - Marca 'sending' antes de delegar al sender inyectado
 * - Reintento con backoff exponencial ante error/timeout
 * - 'failed' solo tras MAX_RETRIES reintentos
 * - Mantiene 'queued' (no procesa) si navigator.onLine === false
 * - Marca 'done' con respuesta+latencias al éxito
 * - sender inyectado → testeable sin red
 */

import { openDB, STORES } from '../db/dbCore.js';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000; // 1s base, 2s, 4s, 8s...

/** Ejecuta una IDBRequest como Promise. */
function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Encola un request al agente. NO invoca al modelo — solo persiste con
 * status='queued'. Sobrevive recargas de página y cierres de app.
 *
 * @param {Object} args
 * @param {string} args.prompt - prompt del usuario (obligatorio)
 * @param {string} [args.route] - ruta NLU (opcional, default 'unknown')
 * @param {string} [args.model] - modelo a usar (opcional, default 'default')
 * @returns {Promise<number>} id del registro encolado (o null si falla persistencia)
 */
export async function enqueueRequest({ prompt, route = 'unknown', model = 'default' } = /** @type {any} */ ({})) {
  try {
    if (!prompt || typeof prompt !== 'string') {
      console.warn('[agentRequestQueue] enqueueRequest requiere prompt válido');
      return null;
    }

    const db = await openDB();
    const record = {
      ts_submit: Date.now(),
      prompt,
      route,
      model,
      grounding: {
        entities: [],
        tools: [],
        rag_chunks: 0,
        nlu_route: route,
        grounded_status: 'none',
      },
      latency: {
        t_first_token_ms: null,
        t_total_ms: null,
        queue_wait_ms: null,
      },
      response: null,
      tokens_in: null,
      tokens_out: null,
      retries: 0,
      status: 'queued',
      ts_done: null,
      error: null,
    };
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    const id = await reqAsPromise(store.add(record));
    console.debug(`[agentRequestQueue] encolado request #${id} (route: ${route})`);
    return id;
  } catch (err) {
    console.error('[agentRequestQueue] enqueueRequest falló:', err);
    return null; // NUNCA lanza — tolerante a fallos
  }
}

/**
 * Lee todos los requests encolados (cualquier status). Tolerante a fallos:
 * devuelve [] si la lectura falla.
 * @returns {Promise<Array>}
 */
export async function listRequests() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readonly');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    const all = await reqAsPromise(store.getAll());
    return Array.isArray(all) ? all : [];
  } catch (e) {
    console.debug('[agentRequestQueue] listRequests error:', e);
    return [];
  }
}

/**
 * Lee un request por id. Devuelve null si no existe o falla la lectura.
 * @param {number} id
 * @returns {Promise<Object|null>}
 */
export async function getRequest(id) {
  try {
    if (id == null) return null;
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readonly');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    const result = await reqAsPromise(store.get(id));
    return result || null;
  } catch (e) {
    console.debug('[agentRequestQueue] getRequest error:', e);
    return null;
  }
}

/**
 * Marca un request como 'offline' (cuando se detecta pérdida de conexión).
 * @param {number} id
 * @returns {Promise<boolean>}
 */
export async function markRequestOffline(id) {
  try {
    const item = await getRequest(id);
    if (!item || item.status !== 'queued') return false;

    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    item.status = 'offline';
    await reqAsPromise(store.put(item));
    return true;
  } catch (e) {
    console.debug('[agentRequestQueue] markRequestOffline error:', e);
    return false;
  }
}

/**
 * Marca todos los 'offline' como 'queued' (al volver la conexión).
 * @returns {Promise<number>} cuántos items fueron reactivados
 */
export async function resumePending() {
  try {
    const all = await listRequests();
    const offline = all.filter((i) => i.status === 'offline');
    if (offline.length === 0) return 0;

    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    
    for (const item of offline) {
      item.status = 'queued';
      await reqAsPromise(store.put(item));
    }
    console.debug(`[agentRequestQueue] resumePending: ${offline.length} reactivados`);
    return offline.length;
  } catch (e) {
    console.debug('[agentRequestQueue] resumePending error:', e);
    return 0;
  }
}

/**
 * Persiste el estado actualizado de un request en IndexedDB.
 * @param {Object} item
 * @returns {Promise<void>}
 */
async function persistItem(item) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    await reqAsPromise(store.put(item));
  } catch (e) {
    console.debug('[agentRequestQueue] persistItem error:', e);
  }
}

/**
 * Vuelca la telemetría de un resultado del LLM en un item y lo marca 'done'.
 * Helper PURO sobre el item (no toca IDB) — reutilizado por processRequest y
 * por finalizeRequest (camino VIVO del AgentScreen, que ya corrió el LLM y solo
 * necesita persistir el resultado, sin re-invocar un sender).
 *
 * @param {Object} item - registro del store (mutado in-place)
 * @param {Object} result - { response, latency:{t_first_token_ms}, grounding, tokens_in, tokens_out }
 * @param {number} [attempt=0] - cuántos reintentos hubo (se guarda en retries)
 * @returns {Object} el item mutado
 */
function applyResultToItem(item, result, attempt = 0) {
  item.status = 'done';
  item.ts_done = Date.now();
  if (item.latency.t_total_ms == null) {
    item.latency.t_total_ms = item.ts_submit ? item.ts_done - item.ts_submit : null;
  }
  if (result?.latency?.t_first_token_ms != null) {
    item.latency.t_first_token_ms = result.latency.t_first_token_ms;
  }
  if (result?.grounding) {
    item.grounding = { ...item.grounding, ...result.grounding };
  }
  item.response = result?.response || null;
  if (result?.tokens_in != null) item.tokens_in = result.tokens_in;
  if (result?.tokens_out != null) item.tokens_out = result.tokens_out;
  item.retries = attempt;
  item.error = null;
  return item;
}

/**
 * Marca un request 'done' con la telemetría de un LLM YA ejecutado (camino VIVO
 * del AgentScreen). El pipeline React corre el stream/TTS/grounding rico; al
 * terminar solo necesita CERRAR el registro durable — NO re-llamar al modelo.
 * Por eso `finalizeRequest` NO recibe un sender ni reintenta: persiste el
 * resultado y listo. Tolerante a fallos (no lanza).
 *
 * @param {Object} args
 * @param {number} args.id - id del request encolado por enqueueRequest
 * @param {Object} args.result - telemetría del turno (response, latency, grounding, tokens)
 * @returns {Promise<Object|null>} item actualizado o null si falla/no existe
 */
export async function finalizeRequest({ id, result } = /** @type {any} */ ({})) {
  try {
    const item = await getRequest(id);
    if (!item) return null;
    if (item.latency.queue_wait_ms == null && item.ts_submit) {
      item.latency.queue_wait_ms = Date.now() - item.ts_submit;
    }
    applyResultToItem(item, result, item.retries || 0);
    await persistItem(item);
    return item;
  } catch (e) {
    console.debug('[agentRequestQueue] finalizeRequest error:', e);
    return null;
  }
}

/**
 * Marca un request 'failed' (camino VIVO, tras agotar el manejo de error del
 * pipeline). Conserva el prompt intacto. Tolerante a fallos (no lanza).
 *
 * @param {Object} args
 * @param {number} args.id
 * @param {string|Error} [args.error]
 * @returns {Promise<Object|null>}
 */
export async function failRequest({ id, error } = /** @type {any} */ ({})) {
  try {
    const item = await getRequest(id);
    if (!item) return null;
    item.status = 'failed';
    item.ts_done = Date.now();
    item.error = error ? (/** @type {Error} */ (error).message || String(error)) : 'fallo en el pipeline';
    await persistItem(item);
    return item;
  } catch (e) {
    console.debug('[agentRequestQueue] failRequest error:', e);
    return null;
  }
}

/**
 * Worker SERIALIZADO que procesa la cola uno a uno. Toma el siguiente 'queued',
 * marca 'sending', delega al sender inyectado, reintenta con backoff exponencial,
 * marca 'done'/'failed'. NO procesa si offline.
 *
 * @param {Object} options
 * @param {Function} options.sender - función async(req) que procesa el request
 * @param {Object} options.req - request a procesar (prompt, route, model, etc.)
 * @param {number} options.id - id del request en IndexedDB
 * @returns {Promise<Object>} item actualizado con status 'done' o 'failed'
 */
export async function processRequest({ sender, req, id }) {
  if (!sender || typeof sender !== 'function') {
    throw new Error('[agentRequestQueue] processRequest requiere sender function');
  }

  const item = await getRequest(id);
  if (!item) {
    throw new Error(`[agentRequestQueue] request #${id} no encontrado`);
  }
  if (item.status !== 'queued') {
    throw new Error(`[agentRequestQueue] request #${id} no está queued (status: ${item.status})`);
  }

  // Calcular tiempo de espera en cola
  const queueWaitMs = Date.now() - item.ts_submit;

  // Marcar 'sending'
  item.status = 'sending';
  item.latency.queue_wait_ms = queueWaitMs;
  await persistItem(item);

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const tStart = Date.now();

      const result = await sender(req);
      
      const tDone = Date.now();
      const tTotalMs = tDone - tStart;

      // Marcar 'done' con metadata completa. Fijamos t_total_ms desde tStart
      // (el helper solo lo calcularía si fuera null); el resto lo vuelca
      // applyResultToItem (compartido con finalizeRequest, sin duplicar).
      item.latency.t_total_ms = tTotalMs;
      applyResultToItem(item, result, attempt);

      await persistItem(item);
      console.debug(`[agentRequestQueue] request #${id} completado (${tTotalMs}ms, ${attempt} retries)`);
      return item;
    } catch (err) {
      lastError = err;
      console.debug(`[agentRequestQueue] request #${id} fallo intento ${attempt}/${MAX_RETRIES}:`, err?.message);
      
      if (attempt < MAX_RETRIES) {
        // Backoff exponencial
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  // Agotados reintentos → marcar 'failed'
  item.status = 'failed';
  item.error = lastError?.message || String(lastError);
  item.retries = MAX_RETRIES;
  await persistItem(item);
  console.debug(`[agentRequestQueue] request #${id} falló tras ${MAX_RETRIES} reintentos`);
  return item;
}

/**
 * Drena la cola pendiente: procesa items 'queued' uno a uno (SERIALIZADO).
 * NO procesa si navigator.onLine === false. Reintenta fallos individuales sin
 * abortar el resto.
 *
 * @param {{ sender?: Function }} [options] - options.sender: función async(req) que procesa cada request
 * @returns {Promise<{processed: number, failed: number, skipped: number}>}
 */
export async function drainPending({ sender } = {}) {
  if (!sender || typeof sender !== 'function') {
    console.warn('[agentRequestQueue] drainPending requiere sender function');
    return { processed: 0, failed: 0, skipped: 0 };
  }

  // Si estamos offline, no procesar nada
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[agentRequestQueue] offline - no se procesa la cola');
    // Marcar todos los 'queued' como 'offline'
    const all = await listRequests();
    const queued = all.filter((i) => i.status === 'queued');
    for (const item of queued) {
      await markRequestOffline(item.id);
    }
    return { processed: 0, failed: 0, skipped: queued.length };
  }

  const all = await listRequests();
  const queued = all
    .filter((i) => i.status === 'queued')
    .sort((a, b) => (a.ts_submit || 0) - (b.ts_submit || 0)); // FIFO por ts_submit

  if (queued.length === 0) {
    return { processed: 0, failed: 0, skipped: 0 };
  }

  let processed = 0;
  let failed = 0;
  
  // Procesar uno a uno (SERIALIZADO)
  for (const item of queued) {
    try {
      const req = {
        prompt: item.prompt,
        route: item.route,
        model: item.model,
      };
      const result = await processRequest({ sender, req, id: item.id });
      if (result.status === 'done') {
        processed++;
      } else {
        failed++;
      }
    } catch (err) {
      console.debug('[agentRequestQueue] error procesando item:', item.id, err);
      failed++;
    }
  }

  console.debug(`[agentRequestQueue] drainPending: ${processed} OK, ${failed} failed`);
  return { processed, failed, skipped: 0 };
}

/**
 * Vacía la cola completa (uso interno + tests). ¡Cuidado! Esto borra todo.
 * @returns {Promise<void>}
 */
export async function clearAgentRequests() {
  try {
    const items = await listRequests();
    if (items.length === 0) return;
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_REQUESTS, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_REQUESTS);
    await Promise.all(items.map((i) => reqAsPromise(store.delete(i.id))));
  } catch (e) {
    console.debug('[agentRequestQueue] clearAgentRequests error:', e);
  }
}

/**
 * Calcula agregados para el dashboard de debug.
 * @param {Array} requests - requests del store (precargados con listRequests)
 * @returns {{ totals, byModel, byRoute, avgLatency, successRate }}
 */
export function aggregateRequestMetrics(requests) {
  const list = Array.isArray(requests) ? requests : [];

  const done = list.filter((r) => r.status === 'done');
  const failed = list.filter((r) => r.status === 'failed');
  const queued = list.filter((r) => r.status === 'queued');
  const sending = list.filter((r) => r.status === 'sending');

  const totals = {
    total: list.length,
    done: done.length,
    failed: failed.length,
    queued: queued.length,
    sending: sending.length,
    successRate: done.length + failed.length ? done.length / (done.length + failed.length) : 0,
  };

  const byModel = groupReduce(list, (r) => r.model || 'default', (group) => ({
    count: group.length,
    done: group.filter((r) => r.status === 'done').length,
    failed: group.filter((r) => r.status === 'failed').length,
    avgLatencyMs: avg(group.map((r) => r.latency?.t_total_ms).filter(isNum)),
  }));

  const byRoute = groupReduce(list, (r) => r.route || 'unknown', (group) => ({
    count: group.length,
    done: group.filter((r) => r.status === 'done').length,
    avgLatencyMs: avg(group.map((r) => r.latency?.t_total_ms).filter(isNum)),
  }));

  const avgLatency = {
    avgTotalMs: avg(done.map((r) => r.latency?.t_total_ms).filter(isNum)),
    avgFirstTokenMs: avg(done.map((r) => r.latency?.t_first_token_ms).filter(isNum)),
    avgQueueWaitMs: avg(done.map((r) => r.latency?.queue_wait_ms).filter(isNum)),
  };

  return { totals, byModel, byRoute, avgLatency, successRate: totals.successRate };
}

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);
const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
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
