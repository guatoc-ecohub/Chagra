/**
 * fotoOfflineService.js — Pipeline de fotos offline-first para modo campo.
 *
 * Flujo: captura → comprime (WebP, <200KB) → guarda en IndexedDB → sync al reconectar.
 *
 * Offline-first: las fotos se guardan localmente aunque no haya red.
 * Al reconectar, el syncManager las sube en orden FIFO con reintentos.
 */
import { crearULID } from '../utils/id.js';

/** @type {IDBDatabase|null} */
let db = null;
const DB_NAME = 'ChagraFotosOffline';
const STORE = 'fotos_pendientes';

// ── DB ─────────────────────────────────────────────────────────────

function openDB() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const database = /** @type {IDBOpenDBRequest} */ (e.target).result;
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onerror = () => reject(req.error);
  });
}

// ── Guardar foto para sync diferido ──────────────────────────────────

/**
 * @typedef {Object} FotoPendiente
 * @property {string} id
 * @property {Blob} blob
 * @property {string} mime
 * @property {string|null} assetId
 * @property {string|null} logId
 * @property {string} ts
 * @property {boolean} sincronizada
 */

/**
 * Guarda un blob de foto en IndexedDB para sincronización diferida.
 * @param {{ blob: Blob, assetId?: string, logId?: string }} opts
 * @returns {Promise<string>} ID de la foto pendiente
 */
export async function guardarFotoPendiente({ blob, assetId = null, logId = null }) {
  const database = await openDB();
  const id = crearULID();
  /** @type {FotoPendiente} */
  const entrada = {
    id,
    blob,
    mime: blob.type || 'image/jpeg',
    assetId,
    logId,
    ts: new Date().toISOString(),
    sincronizada: false,
  };
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(entrada);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Cuenta cuántas fotos están pendientes de sincronizar.
 * @returns {Promise<number>}
 */
export async function contarFotosPendientes() {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.filter((f) => !f.sincronizada).length);
      req.onerror = () => resolve(0);
    });
  } catch { return 0; }
}

/**
 * Obtiene las fotos pendientes de sincronizar (máximo 5 por lote).
 * @returns {Promise<FotoPendiente[]>}
 */
export async function obtenerFotosPendientes() {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result.filter((f) => !f.sincronizada).slice(0, 5));
      req.onerror = () => resolve([]);
    });
  } catch { return []; }
}

/**
 * Marca una foto como sincronizada (ya se subió al backend).
 * @param {string} id
 */
export async function marcarFotoSincronizada(id) {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => {
        if (req.result) {
          req.result.sincronizada = true;
          tx.objectStore(STORE).put(req.result);
        }
      };
      tx.oncomplete = () => resolve();
    });
  } catch { /* noop */ }
}

/**
 * Intenta comprimir un blob de imagen a WebP con calidad 0.6.
 * Si el navegador no soporta WebP, devuelve el blob original.
 * @param {Blob} blob
 * @returns {Promise<Blob>}
 */
export async function comprimirFoto(blob) {
  try {
    // Crear un canvas para re-comprimir
    const img = new Image();
    const url = URL.createObjectURL(blob);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    URL.revokeObjectURL(url);

    const canvas = document.createElement('canvas');
    const MAX_W = 1200;
    const scale = Math.min(1, MAX_W / img.width);
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Intentar WebP, fallback a JPEG
    const mime = 'image/webp';
    return new Promise((resolve) => {
      canvas.toBlob((compressed) => {
        resolve(compressed || blob);
      }, mime, 0.6);
    });
  } catch {
    return blob;
  }
}
