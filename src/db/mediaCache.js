/**
 * mediaCache.js — CRUD para binarios de evidencia fotográfica (Fase 20.2).
 *
 * Store: media_cache (ChagraDB v11)
 * Schema: { id (auto), logId, blob, mimeType, createdAt, lastAccessedAt, pinned }
 * v11: Agrega LRU eviction policy para prevenirllenado de disco del browser.
 */

import { openDB, STORES } from './dbCore';

const DEFAULT_MAX_MB = parseInt(import.meta.env.VITE_MEDIA_CACHE_MAX_MB || '500', 10);
const EVICT_BATCH_SIZE = 50;

export const mediaCache = {
  /**
   * Guarda un blob de imagen asociado a un logId y opcionalmente a un assetId.
   * @param {string} logId
   * @param {Blob} blob
   * @param {object} options — { mimeType, assetId, ai_diagnosis }
   * @returns {Promise<number>} — id autoincrement generado
   */
  async save(logId, blob, options = {}) {
    const { mimeType = 'image/webp', assetId = null, ai_diagnosis = null, pinned = false } = typeof options === 'string' ? { mimeType: options } : options;
    const db = await openDB();
    const now = Date.now();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const request = tx.objectStore(STORES.MEDIA_CACHE).add({
        logId,
        assetId,
        blob,
        mimeType,
        ai_diagnosis,
        pinned,
        createdAt: now,
        lastAccessedAt: now,
      });
      request.onsuccess = async (e) => {
        const id = e.target.result;
        await evictOldestIfNeeded();
        resolve(id);
      };
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
 * LRU eviction: elimina los blobs más viejos si el cache excede el threshold.
 * NO elimina blobs con pinned: true.
 * @param {number} maxMB — threshold en MB (default 500MB desde VITE_MEDIA_CACHE_MAX_MB)
 * @param {number} batchSize — cuántos borrar por ejecución (default 50)
 */
async function evictOldestIfNeeded(maxMB = DEFAULT_MAX_MB, batchSize = EVICT_BATCH_SIZE) {
  const maxBytes = maxMB * 1024 * 1024;

  try {
    const estimate = await navigator.storage.estimate();
    const currentUsage = estimate.usage || 0;

    if (currentUsage <= maxBytes) {
      return 0;
    }

    const db = await openDB();
    let evicted = 0;

    const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
    const store = tx.objectStore(STORES.MEDIA_CACHE);
    const index = store.index('lastAccessedAt');
    const cursorReq = index.openCursor();

    const toDelete = [];

    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && evicted < batchSize) {
        const record = cursor.value;
        if (!record.pinned) {
          toDelete.push(record.id);
          cursor.delete();
          evicted++;
        }
        cursor.continue();
      }
    };

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        if (evicted > 0) {
          console.info(`[MediaCache] LRU evicted ${evicted} blobs (threshold: ${maxMB}MB)`);
        }
        resolve(evicted);
      };
    });
  } catch (err) {
    console.warn('[MediaCache] LRU eviction failed:', err.message);
    return 0;
  }
}
