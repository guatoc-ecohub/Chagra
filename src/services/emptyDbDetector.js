/**
 * emptyDbDetector — detector de "vaciado" de IndexedDB.
 *
 * MOTIVACIÓN (2026-05-19): el operador hizo "Clear cache" en Chrome Android
 * y eso eliminó todo IDB sin advertencia ni retorno. La detección reactiva
 * compara dos señales: una "huella" persistente que dice "este dispositivo
 * tenía datos antes" (vive en localStorage, que sobrevive al clear cache
 * de IDB) y el conteo actual de IDB. Si la huella dice que había datos pero
 * IDB está vacío, mostramos un banner rojo prominente.
 *
 * Caveats conocidos:
 *   - "Clear browsing data" en Android borra TANTO localStorage como IDB.
 *     En ese caso no podemos detectar el vaciado porque también perdimos
 *     la huella. El detector cubre el caso "Clear cache" (más común y
 *     accidental) que NO toca localStorage.
 *   - Si el operador instaló la PWA y reinstaló el navegador, también
 *     perdemos la huella. Ese caso no se cubre.
 *
 * API:
 *   - markHadData(assetCount?) — llamar tras addAsset / sync exitoso para
 *     marcar "este dispositivo tuvo datos".
 *   - isCurrentlyEmpty() — cuenta IDB (assets + logs + media_cache) y devuelve
 *     true si todo está en cero.
 *   - shouldWarnDataLoss() — combina ambos: returns
 *     { shouldWarn, lastKnownCount, currentCount, lastMarkedAt }.
 *   - clearHadDataFlag() — limpia el flag (útil después de import).
 */

import { openDB } from '../db/dbCore';

export const HAD_DATA_KEY = 'chagra:had-data-once';
export const LAST_COUNT_KEY = 'chagra:last-asset-count';
export const LAST_MARKED_AT_KEY = 'chagra:last-marked-at';

/**
 * Setea los flags de "este dispositivo tuvo datos". Idempotente.
 *
 * @param {number} [assetCount] - conteo actual de assets, opcional. Si se
 *   pasa, se guarda como `last-asset-count` para mostrar al usuario "antes
 *   tenías N plantas". Si no, se queda con el valor previo (o '0').
 */
export const markHadData = (assetCount = null) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(HAD_DATA_KEY, '1');
    if (assetCount !== null && Number.isFinite(assetCount)) {
      window.localStorage.setItem(LAST_COUNT_KEY, String(assetCount));
    }
    window.localStorage.setItem(LAST_MARKED_AT_KEY, new Date().toISOString());
  } catch (err) {
    console.warn('[emptyDbDetector] No se pudo marcar had-data flag:', err);
  }
};

/**
 * Limpia el flag had-data. Usar después de un import exitoso o reset
 * explícito del operador (para que el banner no siga apareciendo).
 */
export const clearHadDataFlag = () => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(HAD_DATA_KEY);
    window.localStorage.removeItem(LAST_COUNT_KEY);
    window.localStorage.removeItem(LAST_MARKED_AT_KEY);
  } catch (err) {
    console.warn('[emptyDbDetector] No se pudo limpiar had-data flag:', err);
  }
};

/**
 * Cuenta total de registros en los stores "de datos del operador":
 * assets, logs, media_cache. Si la suma es 0, IDB está efectivamente vacío
 * desde la perspectiva del operador (los stores de telemetría / sync_meta
 * no cuentan porque pueden estar vacíos en un dispositivo nuevo legítimo).
 *
 * @returns {Promise<boolean>}
 */
export const isCurrentlyEmpty = async () => {
  try {
    const db = await openDB();
    const dataStores = ['assets', 'logs', 'media_cache'];
    let total = 0;
    for (const storeName of dataStores) {
      if (!db.objectStoreNames.contains(storeName)) continue;
      const count = await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => reject(req.error);
      });
      total += count;
      if (total > 0) return false; // early exit, no hace falta seguir contando
    }
    return total === 0;
  } catch (err) {
    console.warn('[emptyDbDetector] Error chequeando IDB vacío:', err);
    // En duda, NO alertar (evitar false positives que rompan la UI).
    return false;
  }
};

/**
 * Devuelve si conviene mostrar el banner de "se borró tu data".
 *
 * @returns {Promise<{
 *   shouldWarn: boolean,
 *   lastKnownCount: number,
 *   lastMarkedAt: string|null,
 * }>}
 */
export const shouldWarnDataLoss = async () => {
  const hadDataFlag =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(HAD_DATA_KEY) === '1'
      : false;
  const lastKnownCount = (() => {
    if (typeof window === 'undefined' || !window.localStorage) return 0;
    const raw = window.localStorage.getItem(LAST_COUNT_KEY);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : 0;
  })();
  const lastMarkedAt =
    typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(LAST_MARKED_AT_KEY)
      : null;

  if (!hadDataFlag) {
    return { shouldWarn: false, lastKnownCount, lastMarkedAt };
  }

  const empty = await isCurrentlyEmpty();
  return {
    shouldWarn: empty,
    lastKnownCount,
    lastMarkedAt,
  };
};
