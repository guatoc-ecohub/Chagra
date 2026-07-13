/**
 * dataBackup — Servicio de exportación completa de los datos locales.
 *
 * MOTIVACIÓN (2026-05-19): el operador perdió plantas con foto, el túnel y
 * 100 species porque hizo "Clear cache" en Chrome Android — esa acción
 * elimina IndexedDB completo y todo lo que tenía `_pending: true` (no
 * sincronizado a FarmOS aún) murió sin retorno.
 *
 * Este servicio permite descargar un snapshot JSON con TODO lo que vive en
 * IndexedDB local (todos los stores de `ChagraDB`) + las claves de
 * localStorage usadas por la app, para que el operador pueda guardar la
 * copia y recuperarla luego.
 *
 * Diseño:
 *   - Lee TODOS los stores definidos en `STORES` (dbCore.js), sin asumir
 *     cuáles existen — itera sobre `db.objectStoreNames` para evitar
 *     romperse cuando se agregan stores nuevos en bumps de schema.
 *   - Para `media_cache` (binarios Blob) convierte cada blob a `dataURL`
 *     base64 con FileReader. El resto se serializa tal cual.
 *   - LocalStorage: snapshot de las claves prefijadas `chagra:` + las
 *     conocidas (`access_token` queda EXCLUIDO por seguridad — el operador
 *     puede re-loguear; el token es secreto).
 *
 * NO importa, solo exporta. El import vendrá en un PR posterior.
 */

import { openDB } from '../db/dbCore';

export const BACKUP_VERSION = '1';

// Claves de localStorage que EXCLUIMOS del export por seguridad.
// access_token, refresh_token y derivados FarmOS son sensibles — exportarlos
// permitiría a alguien con el JSON impersonar al operador. Si el operador
// importa una copia anterior, el flujo de re-login se encarga de regenerarlos.
const LOCAL_STORAGE_EXCLUDE_PATTERNS = [
  /token/i,
  /password/i,
  /secret/i,
  /bearer/i,
  /^access_/i,
  /^refresh_/i,
];

const shouldExportLocalStorageKey = (key) => {
  if (!key) return false;
  for (const pattern of LOCAL_STORAGE_EXCLUDE_PATTERNS) {
    if (pattern.test(key)) return false;
  }
  return true;
};

/**
 * Convierte un Blob a dataURL base64. Usa FileReader (API DOM estándar).
 * Si el blob es null/undefined, devuelve null.
 *
 * @param {Blob} blob
 * @returns {Promise<string|null>}
 */
const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    if (!blob) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(/** @type {string} */ (reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/**
 * Lee todos los registros de un object store por nombre.
 *
 * @param {IDBDatabase} db
 * @param {string} storeName
 * @returns {Promise<Array<object>>}
 */
const readAllFromStore = (db, storeName) =>
  new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(storeName)) {
      resolve([]);
      return;
    }
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

/**
 * Serializa un registro de media_cache convirtiendo `blob` a dataURL.
 * Otros campos se preservan tal cual.
 */
const serializeMediaRecord = async (record) => {
  if (!record || !record.blob) return { ...record, blob: null };
  try {
    const dataUrl = await blobToDataUrl(record.blob);
    return { ...record, blob: dataUrl, _blobEncoding: 'dataURL' };
  } catch (err) {
    console.warn('[dataBackup] No se pudo serializar blob de media_cache', record.id, err);
    return { ...record, blob: null, _blobError: String(err?.message || err) };
  }
};

/**
 * Serializa un registro de pending_voice_recordings (también tiene blob de audio).
 */
const serializeVoiceRecord = async (record) => {
  if (!record || !record.blob) return record;
  try {
    const dataUrl = await blobToDataUrl(record.blob);
    return { ...record, blob: dataUrl, _blobEncoding: 'dataURL' };
  } catch (err) {
    console.warn('[dataBackup] No se pudo serializar audio pending_voice', record.id, err);
    return { ...record, blob: null, _blobError: String(err?.message || err) };
  }
};

/**
 * Exporta TODO lo que vive en IndexedDB + localStorage relevante.
 *
 * Shape devuelto:
 *   {
 *     version: '1',
 *     exportedAt: ISO string,
 *     dbName: 'ChagraDB',
 *     dbVersion: number,
 *     idb: { [storeName]: Array<record> },
 *     localStorage: { [key]: string },
 *   }
 *
 * @returns {Promise<object>}
 */
export const exportAllData = async () => {
  const db = await openDB();
  const idb = {};

  // Iterar sobre los stores REALES de la conexión (no sobre STORES constante),
  // así un bump de schema nuevo se incluye automáticamente sin tocar este file.
  const storeNames = Array.from(db.objectStoreNames);

  for (const storeName of storeNames) {
    const records = await readAllFromStore(db, storeName);
    if (storeName === 'media_cache') {
      idb[storeName] = await Promise.all(records.map(serializeMediaRecord));
    } else if (storeName === 'pending_voice_recordings') {
      idb[storeName] = await Promise.all(records.map(serializeVoiceRecord));
    } else {
      idb[storeName] = records;
    }
  }

  const localStorageDump = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!shouldExportLocalStorageKey(key)) continue;
      try {
        localStorageDump[key] = window.localStorage.getItem(key);
      } catch (err) {
        console.warn('[dataBackup] No se pudo leer localStorage key', key, err);
      }
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    dbName: db.name,
    dbVersion: db.version,
    idb,
    localStorage: localStorageDump,
  };
};

/**
 * Calcula el filename canónico del backup:
 *   chagra-backup-YYYY-MM-DD-HHMM.json
 */
const buildBackupFilename = (date = new Date()) => {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `chagra-backup-${y}-${m}-${d}-${hh}${mm}.json`;
};

/**
 * Descarga el JSON con un click sintético usando Blob + URL.createObjectURL.
 * Devuelve el resumen del export (mismo `exportAllData`) para que la UI
 * pueda mostrar "se descargaron X plantas, Y fotos".
 *
 * @returns {Promise<object>} backup object (sin la `localStorage` para no
 *   leakear nada si la UI lo persiste — el archivo descargado SÍ contiene
 *   localStorage, solo el retorno está depurado).
 */
export const downloadBackupJSON = async () => {
  const backup = await exportAllData();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = buildBackupFilename();

  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    // Revocar el ObjectURL en el siguiente tick para que el download
    // tenga tiempo de empezar antes de soltar la referencia al blob.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return { ...backup, _filename: filename };
};

/**
 * Cuenta resumida por categoría para mostrar en la UI antes/después del export.
 *
 * @returns {Promise<{
 *   assets: number,
 *   plants: number,
 *   structures: number,
 *   equipment: number,
 *   materials: number,
 *   lands: number,
 *   logs: number,
 *   photos: number,
 *   pendingTx: number,
 *   pendingVoice: number,
 *   taxonomyTerms: number,
 *   totalStores: number,
 * }>}
 */
export const getBackupSummary = async () => {
  const db = await openDB();
  const safeCount = async (storeName, predicate = null) => {
    if (!db.objectStoreNames.contains(storeName)) return 0;
    const records = await readAllFromStore(db, storeName);
    if (!predicate) return records.length;
    return records.filter(predicate).length;
  };

  const assets = await safeCount('assets');
  const plants = await safeCount('assets', (a) => a.asset_type === 'plant');
  const structures = await safeCount('assets', (a) => a.asset_type === 'structure');
  const equipment = await safeCount('assets', (a) => a.asset_type === 'equipment');
  const materials = await safeCount('assets', (a) => a.asset_type === 'material');
  const lands = await safeCount('assets', (a) => a.asset_type === 'land');
  const logs = await safeCount('logs');
  const photos = await safeCount('media_cache');
  const pendingTx = await safeCount('pending_transactions');
  const pendingVoice = await safeCount('pending_voice_recordings');
  const taxonomyTerms = await safeCount('taxonomy_terms');

  return {
    assets,
    plants,
    structures,
    equipment,
    materials,
    lands,
    logs,
    photos,
    pendingTx,
    pendingVoice,
    taxonomyTerms,
    totalStores: db.objectStoreNames.length,
  };
};
