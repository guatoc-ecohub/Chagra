/**
 * mediaCache.js — CRUD para binarios de evidencia fotográfica (Fase 20.2).
 *
 * Store: media_cache (ChagraDB v5)
 * Schema: { id (auto), logId, blob, mimeType, createdAt }
 */

import { openDB, STORES } from './dbCore';

export const mediaCache = {
  /**
   * Guarda un blob de imagen asociado a un logId y opcionalmente a un assetId.
   * @param {string} logId
   * @param {Blob} blob
   * @param {object} options — { mimeType, assetId, ai_diagnosis }
   * @returns {Promise<number>} — id autoincrement generado
   */
  async save(logId, blob, options = {}) {
    const { mimeType = 'image/webp', assetId = null, ai_diagnosis = null } = typeof options === 'string' ? { mimeType: options } : options;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
      const request = tx.objectStore(STORES.MEDIA_CACHE).add({
        logId,
        assetId,
        blob,
        mimeType,
        ai_diagnosis,
        createdAt: Date.now(),
      });
      request.onsuccess = () => resolve(request.result);
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('assetId');
      const request = index.getAll(IDBKeyRange.only(assetId));
      request.onsuccess = () => {
        const sorted = (request.result || []).sort((a, b) => b.createdAt - a.createdAt);
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
      const index = tx.objectStore(STORES.MEDIA_CACHE).index('logId');
      const request = index.getAll(IDBKeyRange.only(logId));
      request.onsuccess = () => resolve(request.result || []);
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
