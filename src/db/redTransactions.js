/**
 * redTransactions.js — CRUD offline-first de los TRATOS de la red humana
 * (campesino ↔ campesino). Store: red_transactions (ChagraDB v27).
 *
 * Un TRATO es el HECHO verificable de un negocio cerrado del mercado (¿quién
 * entregó qué, en qué vereda, con qué fiabilidad y calidad?). Es la fuente de
 * verdad append-only de la red: el grafo social y la reputación se DERIVAN de
 * aquí (services/red/redReputation.js) y son cache reconstruible (ADR-019).
 *
 * Todo se persiste LOCAL y sobrevive recargas sin red (mismo patrón que
 * marketplaceOfertas / glaciarReportes). El dato crudo NO sale del dispositivo:
 * la compartición a la red es opt-in por `shareLevel` (services/red/redSharing).
 *
 * @module db/redTransactions
 */

import { openDB, STORES } from './dbCore';

/** Genera un id único en cliente (timestamp + random, ordenable por tiempo). */
export function nuevoTratoId() {
  return `trato-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const redTransactions = {
  /**
   * Guarda (o reemplaza) un trato. Si no trae `id`/`createdAt`, los genera.
   * @param {object} trato
   * @returns {Promise<object>} el trato persistido (con id/createdAt).
   */
  async save(trato) {
    const db = await openDB();
    const now = Date.now();
    const record = {
      ...trato,
      id: trato.id || nuevoTratoId(),
      createdAt: trato.createdAt || now,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RED_TRANSACTIONS, 'readwrite');
      tx.objectStore(STORES.RED_TRANSACTIONS).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  /**
   * Devuelve todos los tratos, del más reciente al más antiguo.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RED_TRANSACTIONS, 'readonly');
      const req = tx.objectStore(STORES.RED_TRANSACTIONS).getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtiene un trato por id. Null si no existe.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RED_TRANSACTIONS, 'readonly');
      const req = tx.objectStore(STORES.RED_TRANSACTIONS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Tratos de un productor (por su hash pseudonimizado). Usa el índice
   * `productorHash`; degrada a filtrar getAll si el índice no existe (tests).
   * @param {string} productorHash
   * @returns {Promise<object[]>}
   */
  async byProductor(productorHash) {
    if (!productorHash) return [];
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RED_TRANSACTIONS, 'readonly');
      const objStore = tx.objectStore(STORES.RED_TRANSACTIONS);
      let req;
      try {
        req = objStore.index('productorHash').getAll(productorHash);
      } catch (_e) {
        req = objStore.getAll();
      }
      req.onsuccess = () => {
        const rows = req.result || [];
        resolve(rows.filter((r) => r.productorHash === productorHash));
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Elimina un trato por id (corrección / retracción del registro).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RED_TRANSACTIONS, 'readwrite');
      tx.objectStore(STORES.RED_TRANSACTIONS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Cuenta los tratos registrados.
   * @returns {Promise<number>}
   */
  async count() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RED_TRANSACTIONS, 'readonly');
      const req = tx.objectStore(STORES.RED_TRANSACTIONS).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  },
};
