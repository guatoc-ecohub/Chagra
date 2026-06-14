/**
 * glaciarReportes.js — CRUD offline-first de reportes de puntos glaciares.
 *
 * Store: glaciar_reportes (ChagraDB v22)
 * Schema del registro:
 *   {
 *     id,            // string único generado en cliente
 *     createdAt,     // epoch ms
 *     fechaISO,      // ISO string (auto, hora local del reporte)
 *     guia,          // nombre del guía (string)
 *     // Ubicación (GPS offline)
 *     lat, lng, altitud, precision,   // números | null
 *     // Diagnóstico
 *     tipoSuperficie,   // key de TIPOS_SUPERFICIE
 *     dureza,           // 1..5
 *     tempSuperficie,   // °C | null
 *     peligros,         // string[] keys de PELIGROS
 *     // Condiciones
 *     tempAmbiente,     // °C | null
 *     nubosidad, viento, visibilidad,  // keys | null
 *     notas,            // texto libre
 *     // Foto (dataURL para sobrevivir recargas offline — NO blob URL)
 *     fotoDataUrl,      // string | null
 *     // Estado de seguridad derivado (cache de evaluarSeguridadGlaciar)
 *     estado,           // 'estable'|'precaucion'|'peligro'
 *     estadoRazones,    // string[]
 *   }
 *
 * Offline-first: todo se persiste local, sobrevive recargas, no requiere red.
 *
 * @module db/glaciarReportes
 */

import { openDB, STORES } from './dbCore';

/** Genera un id único en cliente (timestamp + random, ordenable por tiempo). */
export function nuevoReporteId() {
  return `glaciar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const glaciarReportes = {
  /**
   * Guarda (o reemplaza) un reporte. Si no trae `id`/`createdAt`, los genera.
   * @param {object} reporte
   * @returns {Promise<object>} el reporte persistido (con id/createdAt).
   */
  async save(reporte) {
    const db = await openDB();
    const now = Date.now();
    const record = {
      ...reporte,
      id: reporte.id || nuevoReporteId(),
      createdAt: reporte.createdAt || now,
      fechaISO: reporte.fechaISO || new Date(now).toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_REPORTES, 'readwrite');
      tx.objectStore(STORES.GLACIAR_REPORTES).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  /**
   * Devuelve todos los reportes ordenados del más reciente al más antiguo.
   * @returns {Promise<object[]>}
   */
  async getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_REPORTES, 'readonly');
      const req = tx.objectStore(STORES.GLACIAR_REPORTES).getAll();
      req.onsuccess = () => {
        const results = req.result || [];
        results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Obtiene un reporte por id. Null si no existe.
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_REPORTES, 'readonly');
      const req = tx.objectStore(STORES.GLACIAR_REPORTES).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Elimina un reporte por id.
   * @param {string} id
   * @returns {Promise<void>}
   */
  async remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_REPORTES, 'readwrite');
      tx.objectStore(STORES.GLACIAR_REPORTES).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /**
   * Cuenta los reportes guardados.
   * @returns {Promise<number>}
   */
  async count() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_REPORTES, 'readonly');
      const req = tx.objectStore(STORES.GLACIAR_REPORTES).count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  },
};
