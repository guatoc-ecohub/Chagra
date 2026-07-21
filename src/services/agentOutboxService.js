/**
 * agentOutboxService.js — Outbox DURABLE de consultas multimodales al agente.
 *
 * Disparada desde el compositor del dashboard (AgentHero). Cuando el usuario
 * escribe / graba / fotografía / adjunta y toca "enviar", el item se PERSISTE
 * en IndexedDB (store `agent_outbox`) con status='queued' ANTES de navegar al
 * AgentScreen. Esto garantiza el contrato de integridad:
 *
 *   - Si el usuario da "atrás" o CIERRA la app a mitad de camino → al volver,
 *     el item sigue ahí con su estado y NO se pierde.
 *   - El AgentScreen procesa cada item EXACTAMENTE una vez. El claim atómico
 *     (`claimNext`) transiciona queued→processing dentro de UNA transacción
 *     readwrite de IndexedDB, así dos montajes/pestañas no pueden procesar el
 *     mismo item dos veces (anti-duplicado).
 *
 * Patrón: réplica de `visionQueueService.js` (enqueue / getAll / flush) pero
 * orientada a "una consulta del usuario en vuelo" en lugar de "diagnóstico de
 * foto diferido". Reutiliza la infra `dbCore` (openDB / STORES). Blobs grandes
 * (audio/foto/adjunto) → IndexedDB, NUNCA localStorage.
 *
 * Schema del registro `agent_outbox`:
 * {
 *   id: number,                  // autoIncrement (IndexedDB)
 *   kind: 'text'|'voice'|'photo'|'attachment',
 *   text: string,                // texto escrito (o '' si modalidad pura)
 *   blob: Blob|null,             // audio / foto / archivo (NO se pierde)
 *   mime: string|null,           // tipo MIME del blob
 *   fileName: string|null,       // nombre original del adjunto (si aplica)
 *   meta: object,                // passthrough libre (route hint, source, …)
 *   status: 'queued'|'processing'|'answered'|'error',
 *   createdAt: number,           // Unix ms — orden FIFO de procesamiento
 *   claimedAt: number|null,      // cuándo se reclamó (queued→processing)
 *   answeredAt: number|null,     // cuándo se completó (→answered)
 *   error: string|null,          // mensaje cuando status='error'
 * }
 *
 * Reglas operativas (tolerante a fallos, offline-first):
 * - enqueue SOLO persiste; NUNCA llama al LLM / whisper / visión.
 * - claimNext es el único punto de transición queued→processing y es atómico.
 * - markAnswered / markError cierran el ciclo de vida del item.
 * - Falla de persistencia en lectura → [] / null (no throw). En escritura de
 *   enqueue SÍ se propaga el error: perder el enqueue es perder el dato del
 *   usuario, y el caller debe poder reaccionar (no navegar en silencio).
 */

import { openDB, STORES } from '../db/dbCore';

const VALID_KINDS = ['text', 'voice', 'photo', 'attachment'];

/** Ejecuta una IDBRequest como Promise. */
function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Espera a que una transacción complete (durabilidad confirmada). */
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('tx abortada'));
  });
}

/**
 * Persiste una consulta del usuario en la outbox. NO llama a ningún backend —
 * solo deja el item durable en IndexedDB para que el AgentScreen lo procese.
 *
 * @param {Object} args
 * @param {'text'|'voice'|'photo'|'attachment'} args.kind
 * @param {string} [args.text]       - texto escrito por el usuario
 * @param {Blob}   [args.blob]       - audio / foto / archivo adjunto
 * @param {string} [args.mime]       - MIME del blob (default blob.type)
 * @param {string} [args.fileName]   - nombre original del adjunto
 * @param {Object} [args.meta]       - metadata passthrough
 * @returns {Promise<number>} id del registro encolado
 */
export async function enqueue(opts = /** @type {any} */ ({})) {
  const { kind, text = '', blob = null, mime = null, fileName = null, meta = {} } = opts;
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`[agentOutbox] kind inválido: ${kind} (debe ser ${VALID_KINDS.join(' | ')})`);
  }
  const hasText = typeof text === 'string' && text.trim().length > 0;
  const hasBlob = blob && typeof blob === 'object';
  if (!hasText && !hasBlob) {
    throw new Error('[agentOutbox] enqueue requiere texto o blob (no se persiste un item vacío)');
  }

  const db = await openDB();
  const record = {
    kind,
    text: typeof text === 'string' ? text : '',
    blob: hasBlob ? blob : null,
    mime: mime || (hasBlob ? blob.type || null : null),
    fileName: fileName || null,
    meta: meta || {},
    status: 'queued',
    createdAt: typeof meta?.createdAt === 'number' ? meta.createdAt : Date.now(),
    claimedAt: null,
    answeredAt: null,
    error: null,
  };
  const tx = db.transaction(STORES.AGENT_OUTBOX, 'readwrite');
  const store = tx.objectStore(STORES.AGENT_OUTBOX);
  const id = await reqAsPromise(store.add(record));
  // Esperar oncomplete: confirma que el write llegó a disco ANTES de que el
  // caller navegue. Si la app se cierra entre el add y el complete, el item
  // simplemente no existe (no hay estado a medias visible al usuario).
  await txDone(tx);
  return id;
}

/**
 * Lee todos los items de la outbox (cualquier status), ordenados FIFO.
 * Tolerante a fallos: [] si la lectura falla.
 * @returns {Promise<Array>}
 */
export async function getAll() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readonly');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    const all = await reqAsPromise(store.getAll());
    const list = Array.isArray(all) ? all : [];
    return list.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } catch (e) {
    console.debug('[agentOutbox] getAll error:', e);
    return [];
  }
}

/**
 * Items que aún esperan ser procesados (queued). FIFO.
 * @returns {Promise<Array>}
 */
export async function getQueued() {
  const all = await getAll();
  return all.filter((i) => i.status === 'queued');
}

/**
 * Items todavía en vuelo (queued o processing). Útil para que el AgentScreen
 * sepa qué burbujas "ya enviadas" debe rehidratar al montar.
 * @returns {Promise<Array>}
 */
export async function getInFlight() {
  const all = await getAll();
  return all.filter((i) => i.status === 'queued' || i.status === 'processing');
}

/**
 * Reclama atómicamente el SIGUIENTE item procesable (queued, FIFO) y lo
 * transiciona a 'processing'. Toda la operación —leer candidatos, elegir el
 * más antiguo, escribir el nuevo status— ocurre dentro de UNA sola transacción
 * readwrite de IndexedDB. IndexedDB serializa las transacciones readwrite sobre
 * el mismo store, así que dos montajes concurrentes NO pueden reclamar el mismo
 * item: el segundo verá el status ya en 'processing' y saltará al siguiente
 * queued (o a null). Esta es la garantía anti-duplicado.
 *
 * @returns {Promise<Object|null>} el item reclamado (ya con status='processing')
 *   o null si no hay nada queued.
 */
export async function claimNext() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    const all = await reqAsPromise(store.getAll());
    const list = Array.isArray(all) ? all : [];
    const queued = list
      .filter((i) => i.status === 'queued')
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    if (queued.length === 0) {
      // Cerrar la tx limpiamente (no escribimos nada).
      return null;
    }
    const claimed = { ...queued[0], status: 'processing', claimedAt: Date.now() };
    await reqAsPromise(store.put(claimed));
    await txDone(tx);
    return claimed;
  } catch (e) {
    console.debug('[agentOutbox] claimNext error:', e);
    return null;
  }
}

/** Lee un item por id (o null). */
export async function getById(id) {
  if (id == null) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readonly');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    const rec = await reqAsPromise(store.get(id));
    return rec || null;
  } catch (e) {
    console.debug('[agentOutbox] getById error:', e);
    return null;
  }
}

/** Patch interno de un item por id, preservando lo no especificado. */
async function patchItem(id, patch) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    const rec = await reqAsPromise(store.get(id));
    if (!rec) {
      return null;
    }
    const next = { ...rec, ...patch };
    await reqAsPromise(store.put(next));
    await txDone(tx);
    return next;
  } catch (e) {
    console.debug('[agentOutbox] patchItem error:', e);
    return null;
  }
}

/**
 * Marca un item como respondido (ciclo de vida cerrado). El item se conserva
 * con status='answered' para que el AgentScreen pueda mostrar el badge correcto
 * si el usuario vuelve, y NO se re-procese (claimNext solo toma 'queued').
 */
export async function markAnswered(id, { answeredText = null } = {}) {
  return patchItem(id, {
    status: 'answered',
    answeredAt: Date.now(),
    error: null,
    ...(answeredText != null ? { answeredText } : {}),
  });
}

/**
 * Marca un item como fallido. Lo dejamos como 'error' (NO 'queued') para no
 * caer en un reintento infinito automático; el AgentScreen ofrece "Reintentar"
 * explícito, que llama `requeue(id)`.
 */
export async function markError(id, message) {
  return patchItem(id, {
    status: 'error',
    error: message || 'fallo desconocido',
  });
}

/**
 * Devuelve un item 'processing' o 'error' a 'queued' para reintento explícito
 * del usuario. Idempotente sobre items ya 'queued'.
 */
export async function requeue(id) {
  const rec = await getById(id);
  if (!rec) return null;
  if (rec.status === 'answered') return rec; // no re-encolar lo ya respondido
  return patchItem(id, { status: 'queued', claimedAt: null, error: null });
}

/**
 * Re-encola cualquier item que haya quedado atascado en 'processing' (la app se
 * cerró DURANTE el procesamiento, antes de markAnswered/markError). Se llama al
 * montar el AgentScreen para recuperar trabajo huérfano sin perderlo. Devuelve
 * cuántos items se recuperaron.
 *
 * Esto es lo que cierra el caso "cerré la app mientras pensaba": el item nunca
 * se pierde — vuelve a 'queued' y se vuelve a procesar (exactly-once efectivo:
 * el LLM no había confirmado respuesta, así que reintentar es correcto).
 */
export async function recoverStaleProcessing() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    const all = await reqAsPromise(store.getAll());
    const list = Array.isArray(all) ? all : [];
    const stale = list.filter((i) => i.status === 'processing');
    for (const item of stale) {
      await reqAsPromise(store.put({ ...item, status: 'queued', claimedAt: null }));
    }
    await txDone(tx);
    return stale.length;
  } catch (e) {
    console.debug('[agentOutbox] recoverStaleProcessing error:', e);
    return 0;
  }
}

/** Borra un item por id. Tolerante a fallos. */
export async function remove(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    await reqAsPromise(store.delete(id));
    await txDone(tx);
    return true;
  } catch (e) {
    console.debug('[agentOutbox] remove error:', e);
    return false;
  }
}

/**
 * Limpia items ya respondidos más viejos que `maxAgeMs` (default 24h) para que
 * la outbox no crezca sin límite. Conserva queued/processing/error siempre.
 */
export async function pruneAnswered(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const all = await getAll();
    const cutoff = Date.now() - maxAgeMs;
    const stale = all.filter(
      (i) => i.status === 'answered' && (i.answeredAt || i.createdAt || 0) < cutoff,
    );
    for (const item of stale) {
      await remove(item.id);
    }
    return stale.length;
  } catch (e) {
    console.debug('[agentOutbox] pruneAnswered error:', e);
    return 0;
  }
}

/** Vacía la outbox completa (tests / "borrar conversación"). */
export async function clearOutbox() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.AGENT_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORES.AGENT_OUTBOX);
    await reqAsPromise(store.clear());
    await txDone(tx);
  } catch (e) {
    console.debug('[agentOutbox] clearOutbox error:', e);
  }
}
