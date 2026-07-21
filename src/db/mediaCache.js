/**
 * mediaCache.js — CRUD para binarios de evidencia fotográfica (Fase 20.2).
 *
 * Store: media_cache (ChagraDB v11)
 * Schema: { id (auto), logId, blob, sizeBytes, mimeType, createdAt, lastAccessedAt, pinned }
 * v11: Agrega LRU eviction policy para prevenir llenado de disco del browser.
 */

import { openDB, STORES } from './dbCore';

const DEFAULT_MAX_MEDIA_ENTRIES = 300;
const DEFAULT_MAX_MEDIA_MB = 150;

function parsePositiveInt(raw, fallback) {
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getMediaCacheLimits() {
  /** @type {Record<string, any>} */
  const env = import.meta.env ?? {};
  const maxEntries = parsePositiveInt(env.VITE_MEDIA_CACHE_MAX_ENTRIES, DEFAULT_MAX_MEDIA_ENTRIES);
  const maxBytes = parsePositiveInt(
    env.VITE_MEDIA_CACHE_MAX_BYTES,
    parsePositiveInt(env.VITE_MEDIA_CACHE_MAX_MB, DEFAULT_MAX_MEDIA_MB) * 1024 * 1024
  );

  return { maxEntries, maxBytes };
}

function getRecordSizeBytes(record) {
  const size = record?.sizeBytes ?? record?.blob?.size ?? 0;
  const parsed = Number(size);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export const mediaCache = {
  /**
   * Guarda un blob de imagen asociado a un logId y opcionalmente a un assetId.
   * Hace LRU eviction ANTES de insertar si el cache supera el limite por
   * entradas o bytes.
   * @param {string} logId
   * @param {Blob} blob
   * @param {object} options — { mimeType, assetId, ai_diagnosis }
   * @returns {Promise<number>} — id autoincrement generado
   */
  async save(logId, blob, options = {}) {
    const { mimeType = 'image/webp', assetId = null, ai_diagnosis = null, pinned = false } = typeof options === 'string' ? { mimeType: options } : options;
    const db = await openDB();
    const now = Date.now();
    const sizeBytes = getRecordSizeBytes({ blob });

    // LRU eviction antes de agregar libera espacio para el nuevo registro.
    await evictOldestIfNeeded(/** @type {any} */ ({ incomingEntries: 1, incomingBytes: sizeBytes }));

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const request = tx.objectStore(STORES.MEDIA_CACHE).add({
        logId,
        assetId,
        blob,
        sizeBytes,
        mimeType,
        ai_diagnosis,
        pinned,
        createdAt: now,
        lastAccessedAt: now,
      });
      request.onsuccess = (e) => resolve(e.target.result);
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Actualiza el diagnóstico IA de un registro existente.
   */
  async updateDiagnosis(id, diagnosis) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.ai_diagnosis = diagnosis;
          store.put(record);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Obtiene medias asociadas a un assetId para evolución histórica.
   */
  async getByAssetId(assetId) {
    const db = await openDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('assetId');
      const request = index.getAll(IDBKeyRange.only(assetId));
      request.onsuccess = () => {
        const results = request.result || [];
        for (const record of results) {
          if (record.lastAccessedAt !== now) {
            record.lastAccessedAt = now;
            tx.objectStore(STORES.MEDIA_CACHE).put(record);
          }
        }
        const sorted = results.sort((a, b) => b.createdAt - a.createdAt);
        resolve(sorted);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Obtiene todas las imágenes asociadas a un logId.
   */
  async getByLogId(logId) {
    const db = await openDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('logId');
      const request = index.getAll(IDBKeyRange.only(logId));
      request.onsuccess = () => {
        const results = request.result || [];
        const store = tx.objectStore(STORES.MEDIA_CACHE);
        for (const record of results) {
          if (record.lastAccessedAt !== now) {
            record.lastAccessedAt = now;
            store.put(record);
          }
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Cuenta las imágenes asociadas a un logId.
   */
  async countByLogId(logId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('logId');
      const request = index.count(IDBKeyRange.only(logId));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  /**
   * Elimina una imagen por su id autoincrement.
   */
  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      tx.objectStore(STORES.MEDIA_CACHE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Elimina todas las imágenes de un logId (post-sync cleanup).
   */
  async removeByLogId(logId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const index = store.index('logId');
      const cursorReq = index.openCursor(IDBKeyRange.only(logId));
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Auto-purge: elimina medias de logs sincronizados con más de 7 días.
   */
  async purgeStale(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    const db = await openDB();
    const cutoff = Date.now() - maxAgeMs;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const index = store.index('createdAt');
      const range = IDBKeyRange.upperBound(cutoff);
      const cursorReq = index.openCursor(range);
      let purged = 0;
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          purged++;
          cursor.continue();
        }
      };
      tx.oncomplete = () => {
        if (purged > 0) console.info(`[MediaCache] Purgados ${purged} binarios > 7 días.`);
        resolve(purged);
      };
      tx.onerror = () => reject(tx.error);
    });
  },
};

/**
 * LRU eviction por conteo de entradas y bytes totales en media_cache.
 * Cuando alguno de los limites se supera, elimina los blobs menos
 * recientemente-accedidos (lastAccessedAt ascendente) hasta volver a estar
 * dentro del presupuesto. NO elimina registros con pinned: true.
 *
 * @param {object} options
 * @param {number} options.maxEntries - tope de entradas antes de evictar
 * @param {number} options.maxBytes - tope de bytes antes de evictar
 * @param {number} options.incomingEntries - entradas que se van a sumar
 * @param {number} options.incomingBytes - bytes que se van a sumar
 * @returns {Promise<number>} - cantidad de entradas eliminadas
 */
async function evictOldestIfNeeded(options = /** @type {any} */ ({})) {
  try {
    const db = await openDB();
    const { maxEntries, maxBytes } = getMediaCacheLimits();
    const incomingEntries = options.incomingEntries ?? 0;
    const incomingBytes = options.incomingBytes ?? 0;
    const targetEntries = Math.max(0, maxEntries - incomingEntries);
    const targetBytes = Math.max(0, maxBytes - incomingBytes);

    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const store = tx.objectStore(STORES.MEDIA_CACHE);
      const index = store.index('lastAccessedAt');
      const orderedRecords = [];
      let count = 0;
      let totalBytes = 0;

      const cursorReq = index.openCursor();
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const record = cursor.value || {};
          const sizeBytes = getRecordSizeBytes(record);
          orderedRecords.push({
            id: record.id,
            pinned: Boolean(record.pinned),
            sizeBytes,
          });
          count += 1;
          totalBytes += sizeBytes;
          cursor.continue();
          return;
        }

        const needsEntriesEviction = count > targetEntries;
        const needsBytesEviction = totalBytes > targetBytes;

        if (!needsEntriesEviction && !needsBytesEviction) {
          resolve(0);
          return;
        }

        let remainingCount = count;
        let remainingBytes = totalBytes;
        let evicted = 0;

        for (const record of orderedRecords) {
          const entriesOk = remainingCount <= targetEntries;
          const bytesOk = remainingBytes <= targetBytes;
          if (entriesOk && bytesOk) {
            break;
          }

          if (record.pinned) {
            continue;
          }

          store.delete(record.id);
          remainingCount -= 1;
          remainingBytes -= record.sizeBytes;
          evicted += 1;
        }

        tx.oncomplete = () => {
          if (evicted > 0) {
            console.info(
              `[MediaCache] LRU evicted ${evicted} entries (${count} -> ${count - evicted}, ${totalBytes} -> ${remainingBytes} bytes)`
            );
          }
          resolve(evicted);
        };
      };

      cursorReq.onerror = () => reject(cursorReq.error);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('media_cache eviction aborted'));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[MediaCache] LRU eviction failed:', message);
    return 0;
  }
}
