/**
 * glaciarReportes.js — CRUD offline-first de reportes de puntos glaciares.
 *
 * Store: glaciar_reportes (ChagraDB v23) — el reporte representa el FRENTE/BORDE
 * del hielo (el punto que retrocede). Repetir el mismo `puntoId` en el tiempo
 * = serie temporal del retroceso.
 *
 * Schema del registro (v2 "escala creíble"):
 *   {
 *     id,            // string único generado en cliente
 *     puntoId,       // string ESTABLE del punto (repetible en el tiempo) | null
 *     createdAt,     // epoch ms
 *     fechaISO,      // ISO string (auto, hora local del reporte)
 *     horaLocal,     // número 0–23.999 (hora local; afecta puentes de nieve)
 *     guia,          // nombre del guía (string)
 *     montana,       // key de MONTANAS | null
 *     montanaLibre,  // texto si montana === 'otra'
 *     pisoGlaciar,   // boolean — false => modo observación (borde)
 *     // Ubicación (GPS offline) + trazabilidad climática
 *     lat, lng, altitud, precision,   // números | null
 *     distanciaBordeHieloM,           // número | null (desde hito fijo)
 *     azimutBrujula,                  // grados 0–359 (dirección del disparo)
 *     referenciaEncuadre,             // texto (repeat photography)
 *     // Diagnóstico — perfil por CAPAS + lectura puntual rápida
 *     capas,            // [{ profundidad, tipoSuperficie, dureza }] (la [0] = superficie)
 *     tipoSuperficie,   // lectura puntual: key de TIPOS_SUPERFICIE
 *     dureza,           // lectura puntual: código F..H2 (escala mano→piolet)
 *     tempSuperficie,   // °C | null
 *     peligros,         // string[] keys de PELIGROS
 *     rutaBajoSeracs,   // boolean (séracs sobre la ruta)
 *     penitentesDensos, // boolean
 *     pendientePronunciada, // boolean
 *     nieveReciente24h, // boolean
 *     // Condiciones
 *     tempAmbiente,     // °C | null
 *     cielo, viento, visibilidad,  // keys | null
 *     notas,            // texto libre
 *     // Foto (dataURL para sobrevivir recargas offline — NO blob URL)
 *     fotoDataUrl,      // string | null
 *     // Estado de seguridad derivado (cache de evaluarSeguridadGlaciar)
 *     estado,           // 'estable'|'precaucion'|'peligro'|'observacion'
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
   * Devuelve todos los reportes de un mismo punto fijo (puntoId), del más
   * reciente al más antiguo. Es la serie temporal del retroceso de ese punto.
   * @param {string} puntoId
   * @returns {Promise<object[]>}
   */
  async getByPunto(puntoId) {
    if (!puntoId) return [];
    const all = await this.getAll();
    return all.filter((r) => r.puntoId === puntoId);
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
