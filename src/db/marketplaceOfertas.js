/**
 * marketplaceOfertas.js — CRUD offline-first de ofertas del marketplace
 * agroecológico (circuitos cortos / mercados campesinos).
 *
 * Store: marketplace_ofertas (ChagraDB v26). Una oferta = un producto que un
 * productor publica para vender directo a fincas/compradores vecinos. Todo se
 * persiste LOCAL y sobrevive recargas sin red (mismo patrón que
 * glaciarReportes). NO hay backend nuevo ni transacción dentro de la app: el
 * contacto con el vendedor es directo (WhatsApp / teléfono).
 *
 * Schema del registro:
 *   {
 *     id,           // string único generado en cliente
 *     createdAt,    // epoch ms (ordena el timeline)
 *     producto,     // nombre del producto (texto libre)
 *     categoria,    // id de CATEGORIAS (marketplaceSeed)
 *     cantidad,     // número (> 0)
 *     unidad,       // string de UNIDADES (kg, arroba, bulto…)
 *     precio,       // número COP que pone el PRODUCTOR (no es ref. mayorista) | null
 *     moneda,       // 'COP'
 *     finca,        // nombre de la finca (texto) | ''
 *     vereda,       // vereda (texto) | ''
 *     municipio,    // municipio/departamento (texto) | ''
 *     contactoTel,  // teléfono para WhatsApp/llamada (solo dígitos) | ''
 *     nota,         // descripción libre | ''
 *     fotoDataUrl,  // dataURL de la foto (sobrevive recargas offline) | null
 *     demo,         // true si es oferta de ejemplo (seed) — nunca para publicadas
 *   }
 *
 * @module db/marketplaceOfertas
 */

import { openDB, STORES } from './dbCore';

/** Genera un id único en cliente (timestamp + random, ordenable por tiempo). */
export function nuevaOfertaId() {
  return `oferta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const marketplaceOfertas = {
  /**
   * Guarda (o reemplaza) una oferta. Si no trae `id`/`createdAt`, los genera.
   * @param {object} oferta
   * @returns {Promise<object>} la oferta persistida (con id/createdAt).
   */
  async save(oferta) {
    const db = await openDB();
    const now = Date.now();
    const record = {
      moneda: 'COP',
      ...oferta,
      id: oferta.id || nuevaOfertaId(),
      createdAt: oferta.createdAt || now,
      // las ofertas publicadas por el usuario NUNCA son demo, pase lo que pase.
      demo: false,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MARKETPLACE_OFERTAS, 'readwrite');
      tx.objectStore(STORES.MARKETPLACE_OFERTAS).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  /**
   * Devuelve todas las ofertas publicadas, del más reciente al más antiguo.
   * NO incluye las ofertas de ejemplo (esas viven en data/marketplaceSeed).
   * @returns {Promise<object[]>}
   */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MARKETPLACE_OFERTAS, 'readonly');
      const req = tx.objectStore(STORES.MARKETPLACE_OFERTAS).getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtiene una oferta por id. Null si no existe.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MARKETPLACE_OFERTAS, 'readonly');
      const req = tx.objectStore(STORES.MARKETPLACE_OFERTAS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Elimina una oferta por id (el productor retira su publicación).
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MARKETPLACE_OFERTAS, 'readwrite');
      tx.objectStore(STORES.MARKETPLACE_OFERTAS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Cuenta las ofertas publicadas (sin contar los ejemplos seed).
   * @returns {Promise<number>}
   */
  async count() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.MARKETPLACE_OFERTAS, 'readonly');
      const req = tx.objectStore(STORES.MARKETPLACE_OFERTAS).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  },
};
