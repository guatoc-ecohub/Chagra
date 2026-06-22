/**
 * mediaCache.js — CRUD para binarios de evidencia fotográfica (Fase 20.2).
 *
 * Store: media_cache (ChagraDB v11)
 * Schema: { id (auto), logId, blob, mimeType, createdAt, lastAccessedAt, pinned }
 * v11: Agrega LRU eviction policy para prevenirllenado de disco del browser.
 */

import { openDB, STORES } from './dbCore';

const MAX_MEDIA_ENTRIES = 300;
const MAX_MEDIA_MB = parseInt(import.meta.env.VITE_MEDIA_CACHE_MAX_MB || '150', 10);
const EVICT_DOWN_TO = 250;

export const mediaCache = {
  /**
   * Guarda un blob de imagen asociado a un logId y opcionalmente a un assetId.
   * Hace LRU eviction ANTES de insertar si el cache supera el limite.
   * @param {string} logId
   * @param {Blob} blob
   * @param {object} options — { mimeType, assetId, ai_diagnosis }
   * @returns {Promise<number>} — id autoincrement generado
   */
  async save(logId, blob, options = {}) {
    const { mimeType = 'image/webp', assetId = null, ai_diagnosis = null, pinned = false } = typeof options === 'string' ? { mimeType: options } : options;
    const db = await openDB();
    const now = Date.now();

    // LRU eviction antes de agregar — libera espacio para el nuevo registro
    await evictOldestIfNeeded();

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
 * LRU eviction por conteo de entradas en media_cache.
 * Cuando el numero de registros supera MAX_MEDIA_ENTRIES, elimina los
 * blobs menos-recientemente-accedidos (lastAccessedAt ascendente) hasta
 * llegar a EVICT_DOWN_TO. NO elimina registros con pinned: true.
 *
 * @param {number} maxEntries — tope de entradas antes de evictar
 * @param {number} maxMB — tope opcional de MB (no implementado; reservado)
 * @returns {Promise<number>} — cantidad de entradas eliminadas
 */
async function evictOldestIfNeeded(maxEntries = MAX_MEDIA_ENTRIES, _maxMB = MAX_MEDIA_MB) {
  const db = await openDB();

  try {
    // Fase 1: contar registros en media_cache
    const countTx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
    const countStore = countTx.objectStore(STORES.MEDIA_CACHE);
    const count = await new Promise((resolve, reject) => {
      const req = countStore.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (count <= maxEntries) {
      return 0;
    }

    // Fase 2: evictar los mas viejos (por lastAccessedAt) hasta EVICT_DOWN_TO
    const target = Math.max(EVICT_DOWN_TO, Math.floor(maxEntries * 0.8));
    const toEvict = count - target;
    let evicted = 0;

    const writeTx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
    const writeStore = writeTx.objectStore(STORES.MEDIA_CACHE);
    const index = writeStore.index('lastAccessedAt');

    return new Promise((resolve, reject) => {
      const cursorReq = index.openCursor();
      let deleted = 0;
      cursorReq.onsuccess = (event) => {
        const cursor = event.target.result;
        if (!cursor || deleted >= toEvict) return;
        if (!cursor.value.pinned) {
          cursor.delete();
          deleted++;
          evicted++;
        }
        cursor.continue();
      };
      writeTx.oncomplete = () => {
        if (evicted > 0) {
          console.info(`[MediaCache] LRU evicted ${evicted} entries (${count} → ${count - evicted})`);
        }
        resolve(evicted);
      };
      writeTx.onerror = () => reject(writeTx.error);
    });
  } catch (err) {
    console.warn('[MediaCache] LRU eviction failed:', err.message);
    return 0;
  }
}
