/**
 * visionQueueService.js — Cola offline de fotos de visión (V-07 #228).
 *
 * Cuando el operario captura una foto para diagnóstico foliar o ID de especie
 * SIN conexión (navigator.onLine === false), la foto se encola en IndexedDB
 * (store dedicado `vision_queue`) en vez de perderse. Al volver la conexión,
 * `flushVisionQueue()` corre el diagnóstico de cada item encolado y deja el
 * resultado disponible en el propio registro (status: 'done', result: {...}).
 *
 * Patrón: réplica de `feedbackService.js` (queueFeedbackOffline /
 * flushFeedbackQueue / getQueuedFeedback) pero con IndexedDB en vez de
 * localStorage — los blobs de imagen son grandes y no caben en localStorage.
 * Reutiliza la infra `dbCore` (openDB / STORES) ya usada por photoService.
 *
 * Schema del registro `vision_queue`:
 * {
 *   id: number,            // autoIncrement (IndexedDB)
 *   imageBlob: Blob,       // la captura JPEG comprimida (NO se pierde)
 *   kind: 'foliage'|'species',
 *   meta: object,          // { speciesSlug?, assetId?, ... } passthrough a las opts del modelo
 *   createdAt: number,     // Unix ms — orden FIFO de procesamiento
 *   status: 'pending'|'done'|'error',
 *   result: object|null,   // resultado del modelo cuando status='done'
 *   error: string|null,    // mensaje cuando status='error'
 *   processedAt: number|null,
 * }
 *
 * Reglas operativas (tolerante a fallos como feedbackService):
 * - Offline-first: enqueuePhoto solo persiste, NUNCA llama al modelo.
 * - flushVisionQueue procesa solo items 'pending' o 'error' (reintenta fallos).
 * - Un item que falla queda con status='error' conservando el blob → se
 *   reintenta en el próximo flush. Un fallo no aborta el procesamiento del resto.
 * - Falla de persistencia → console.debug, no throw (excepto validación de input).
 */

import { openDB, STORES } from '../db/dbCore';
import { analyzeFoliage, recognizeSpeciesGrounded } from './aiService';

const VALID_KINDS = ['foliage', 'species'];

/** Ejecuta una IDBRequest como Promise. */
function reqAsPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Encola una foto para diagnóstico diferido. NO llama al modelo — solo persiste
 * el blob + metadata en IndexedDB. El flush posterior (al volver la conexión)
 * corre la inferencia.
 *
 * @param {Object} args
 * @param {Blob}   args.imageBlob - captura JPEG/WebP comprimida (obligatorio)
 * @param {'foliage'|'species'} args.kind - tipo de análisis a correr al volver online
 * @param {Object} [args.meta] - metadata passthrough a las opts del modelo
 *                               (speciesSlug, assetId, createdAt opcional…)
 * @returns {Promise<number>} id del registro encolado
 */
export async function enqueuePhoto(opts = /** @type {any} */ ({})) {
  const { imageBlob, kind, meta = {} } = opts;
  if (!imageBlob || typeof imageBlob !== 'object') {
    throw new Error('[visionQueue] enqueuePhoto requiere imageBlob');
  }
  if (!VALID_KINDS.includes(kind)) {
    throw new Error(`[visionQueue] kind inválido: ${kind} (debe ser 'foliage' | 'species')`);
  }
  const db = await openDB();
  const record = {
    imageBlob,
    kind,
    meta: meta || {},
    // createdAt explícito en meta permite tests deterministas del orden FIFO.
    createdAt: typeof meta?.createdAt === 'number' ? meta.createdAt : Date.now(),
    status: 'pending',
    result: null,
    error: null,
    processedAt: null,
  };
  const tx = db.transaction(STORES.VISION_QUEUE, 'readwrite');
  const store = tx.objectStore(STORES.VISION_QUEUE);
  return reqAsPromise(store.add(record));
}

/**
 * Lee todos los items encolados (cualquier status). Tolerante a fallos:
 * devuelve [] si la lectura falla.
 * @returns {Promise<Array>}
 */
export async function getQueuedPhotos() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.VISION_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.VISION_QUEUE);
    const all = await reqAsPromise(store.getAll());
    return Array.isArray(all) ? all : [];
  } catch (e) {
    console.debug('[visionQueue] getQueuedPhotos error:', e);
    return [];
  }
}

/** Vacía la cola completa (uso interno + tests). */
export async function clearVisionQueue() {
  try {
    const items = await getQueuedPhotos();
    if (items.length === 0) return;
    const db = await openDB();
    const tx = db.transaction(STORES.VISION_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.VISION_QUEUE);
    await Promise.all(items.map((i) => reqAsPromise(store.delete(i.id))));
  } catch (e) {
    console.debug('[visionQueue] clearVisionQueue error:', e);
  }
}

/** Corre la inferencia de visión correspondiente al kind del item. */
async function runInference(item) {
  const opts = { ...(item.meta || {}) };
  if (item.kind === 'species') {
    return recognizeSpeciesGrounded(item.imageBlob, opts);
  }
  // default: foliage
  return analyzeFoliage(item.imageBlob, opts);
}

/** Persiste el resultado/estado actualizado de un item en IndexedDB. */
async function persistItem(item) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES.VISION_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.VISION_QUEUE);
    await reqAsPromise(store.put(item));
  } catch (e) {
    console.debug('[visionQueue] persistItem error:', e);
  }
}

/**
 * Procesa la cola: corre el diagnóstico de cada item 'pending'/'error' en orden
 * FIFO (createdAt) y guarda el resultado. Conserva en cola (status='error') lo
 * que falle, para reintentar en el próximo flush. Un fallo individual no aborta
 * el resto.
 *
 * @returns {Promise<number>} cuántos items se procesaron con éxito (status='done')
 */
export async function flushVisionQueue() {
  const all = await getQueuedPhotos();
  const pending = all
    .filter((i) => i.status === 'pending' || i.status === 'error')
    .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  if (pending.length === 0) return 0;

  let processed = 0;
  for (const item of pending) {
    try {
      const result = await runInference(item);
      if (result == null) {
        // El modelo no devolvió nada parseable — tratar como fallo recuperable.
        item.status = 'error';
        item.error = 'modelo no devolvió resultado parseable';
        item.processedAt = Date.now();
        await persistItem(item);
        continue;
      }
      item.status = 'done';
      item.result = result;
      item.error = null;
      item.processedAt = Date.now();
      await persistItem(item);
      processed++;
    } catch (err) {
      item.status = 'error';
      item.error = err?.message || String(err);
      item.processedAt = Date.now();
      await persistItem(item);
      console.debug('[visionQueue] item falló, sigue en cola:', item.id, item.error);
    }
  }
  return processed;
}
