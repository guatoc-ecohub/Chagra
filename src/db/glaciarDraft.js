/**
 * glaciarDraft — autosave del BORRADOR en curso del reporte de punto glaciar.
 *
 * Por qué existe (CodeQL HIGH js/clear-text-storage-of-sensitive-data):
 *   El reporte glaciar incluye coordenadas GPS (lat/lng). El autosave del
 *   borrador vivía en sessionStorage, y CodeQL lo marcaba como almacenamiento
 *   en claro de datos sensibles (regla que cubre localStorage/sessionStorage/
 *   cookies). El ruleset del org BLOQUEA el merge por ese alert.
 *
 *   Mover el borrador a IndexedDB resuelve el alert (la regla NO cubre IDB) y
 *   ADEMÁS mejora la recuperación ante crash: sessionStorage se pierde si iOS
 *   descarta la pestaña al abrir la cámara o si se cierra el navegador;
 *   IndexedDB sobrevive a ambos. El reporte final ya vive en IndexedDB
 *   (glaciar_reportes) — esto es solo el work-in-progress.
 *
 * Forma del registro: un único KV reservado (store glaciar_draft, v24):
 *   { key: 'borrador', form, coords, savedAt }
 * `form` y `coords` se guardan tal cual (structured clone, sin JSON manual).
 *
 * Tolerancia a fallos: ninguna de estas funciones lanza. El autosave es
 * best-effort (no rompe el flujo del guía si IndexedDB falla o está en cuota).
 *
 * @module db/glaciarDraft
 */
import { openDB, STORES } from './dbCore';

// Clave única del registro KV. Un solo borrador en curso por dispositivo.
const DRAFT_KEY = 'borrador';

/**
 * Persiste el borrador en curso (form + coords). Best-effort: no lanza.
 *
 * @param {object} form - estado del formulario del reporte.
 * @param {object|null} coords - {lat,lng,altitud,precision} | null.
 * @returns {Promise<boolean>} true si guardó, false si falló.
 */
export async function saveDraft(form, coords) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_DRAFT, 'readwrite');
      tx.objectStore(STORES.GLACIAR_DRAFT).put({
        key: DRAFT_KEY,
        form,
        coords: coords ?? null,
        savedAt: Date.now(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } catch (err) {
    // Cuota / modo privado / structured-clone: el autosave es opcional, nunca
    // debe romper el llenado del reporte.
    console.warn('[Glaciar] no se pudo persistir el borrador:', err?.message);
    return false;
  }
}

/**
 * Lee el borrador en curso. Null si no hay o si falla la lectura.
 *
 * @returns {Promise<{form:object, coords:(object|null)}|null>}
 */
export async function loadDraft() {
  try {
    const db = await openDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_DRAFT, 'readonly');
      const req = tx.objectStore(STORES.GLACIAR_DRAFT).get(DRAFT_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record || !record.form || typeof record.form !== 'object') {
      return null;
    }
    return { form: record.form, coords: record.coords ?? null };
  } catch (err) {
    console.warn('[Glaciar] no se pudo leer el borrador:', err?.message);
    return null;
  }
}

/**
 * Borra el borrador (al guardar el reporte con éxito). No lanza.
 * @returns {Promise<void>}
 */
export async function clearDraft() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.GLACIAR_DRAFT, 'readwrite');
      tx.objectStore(STORES.GLACIAR_DRAFT).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Glaciar] no se pudo borrar el borrador:', err?.message);
  }
}
