/**
 * photoService — captura + compresión + persistencia de fotos para evidencia
 * de inventario / catálogo.
 *
 * Diseñado para iPhone (incluido HEIC nativo) y Android. Convierte cualquier
 * input de cámara o galería a JPEG ≤500 KB redimensionado a 1600px en el
 * lado mayor (suficiente para inspección + thumbnail), preservando la fecha
 * EXIF cuando es posible.
 *
 * Persistencia: usa `media_cache` store de IndexedDB (schema v7) — NO necesita
 * migration. Cada foto queda atada opcionalmente a `assetId` o `logId`.
 *
 * Render 2-tier en componentes:
 *   const url = await getPhotoUrl({ assetId, speciesSlug });
 *   // Resuelve: user override (media_cache) > catálogo default
 *   //   (/catalog-photos/<slug>.jpg) > placeholder
 *
 * NO sobre-ingeniería:
 *   - Sin upload a CDN — todo IndexedDB local; FarmOS sync futuro
 *   - Sin EXIF GPS strip por ahora — preservamos por trazabilidad agroecológica
 *   - Sin reconocimiento AI — el usuario elige especie manualmente
 */

import { openDB, STORES } from '../db/dbCore';

const MAX_DIMENSION = 1600;       // px en el lado mayor
const TARGET_QUALITY = 0.82;      // JPEG quality
const MAX_BYTES = 500 * 1024;     // 500 KB target después de compress
const PLACEHOLDER_URL = '/placeholder-species.jpg';
const CATALOG_PHOTOS_BASE = '/catalog-photos';

/**
 * Captura desde input file (cámara o galería). Convierte HEIC→JPEG via canvas,
 * redimensiona, comprime, y retorna un Blob JPEG.
 *
 * @param {File} file — input file (de <input type="file" capture="environment">)
 * @returns {Promise<{blob: Blob, width: number, height: number, originalSize: number, compressedSize: number, mime: string}>}
 */
export async function captureAndCompress(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error(`Archivo no es imagen: ${file?.type}`);
  }
  const originalSize = file.size;

  // Carga la imagen via createImageBitmap (browser maneja HEIC automáticamente
  // si el sistema soporta — iOS Safari sí, Android no para HEIC).
  // Fallback a HTMLImageElement si createImageBitmap falla.
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = await loadViaImg(file);
  }

  // Calcula resize manteniendo aspect ratio
  const { naturalWidth, naturalHeight } = getDims(bitmap);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const targetW = Math.round(naturalWidth * scale);
  const targetH = Math.round(naturalHeight * scale);

  // Render a canvas + export como JPEG
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);

  // Iterative compress: arranca en 0.82, baja si pasa de 500 KB
  let quality = TARGET_QUALITY;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  while (blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  // Cleanup bitmap (libera GPU memory en navegadores que lo soportan)
  if (typeof bitmap.close === 'function') bitmap.close();

  return {
    blob,
    width: targetW,
    height: targetH,
    originalSize,
    compressedSize: blob.size,
    mime: 'image/jpeg',
    quality,
  };
}

/**
 * Persiste una foto en IndexedDB media_cache atada a un asset y/o log.
 *
 * @param {Object} args
 * @param {Blob}   args.blob
 * @param {string} [args.assetId] — id del asset al que pertenece
 * @param {string} [args.logId]   — id del log entry (e.g. inventory_event)
 * @param {string} [args.speciesSlug] — slug del catálogo (para 2-tier resolution)
 * @param {Object} [args.meta]    — metadata extra (capturedAt, gps, notes)
 * @returns {Promise<number>} id de la foto persistida
 */
export async function savePhoto({ blob, assetId, logId, speciesSlug, meta = {} }) {
  const db = await openDB();
  const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
  const store = tx.objectStore(STORES.MEDIA_CACHE);
  const record = {
    blob,
    mime: blob.type,
    size: blob.size,
    assetId: assetId || null,
    logId: logId || null,
    speciesSlug: speciesSlug || null,
    createdAt: new Date().toISOString(),
    capturedAt: meta.capturedAt || new Date().toISOString(),
    gps: meta.gps || null,
    notes: meta.notes || null,
    isUserOverride: true,  // distingue de catalog defaults
  };
  return new Promise((resolve, reject) => {
    const req = store.add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Resuelve la URL de la mejor foto disponible para una especie/asset.
 * Orden de preferencia:
 *   1. User override en media_cache (assetId match → más reciente)
 *   2. User override por speciesSlug (si no hay assetId)
 *   3. Catalog default photo (/catalog-photos/<slug>.jpg)
 *   4. Placeholder genérico
 *
 * Retorna ObjectURL (cuando es Blob) o ruta estática. El caller debe
 * llamar URL.revokeObjectURL() cuando ya no necesita el ObjectURL para
 * evitar memory leaks.
 *
 * @param {Object} args
 * @param {string} [args.assetId]
 * @param {string} [args.speciesSlug]
 * @returns {Promise<{url: string, source: 'user'|'catalog'|'placeholder', revoke?: () => void}>}
 */
export async function getPhotoUrl({ assetId, speciesSlug } = {}) {
  // 1) buscar user override por assetId
  if (assetId) {
    const userPhoto = await findLatestUserPhoto({ assetId });
    if (userPhoto) {
      const url = URL.createObjectURL(userPhoto.blob);
      return { url, source: 'user', revoke: () => URL.revokeObjectURL(url) };
    }
  }

  // 2) buscar user override por species (cualquier asset de esta especie)
  if (speciesSlug) {
    const userPhoto = await findLatestUserPhoto({ speciesSlug });
    if (userPhoto) {
      const url = URL.createObjectURL(userPhoto.blob);
      return { url, source: 'user', revoke: () => URL.revokeObjectURL(url) };
    }
  }

  // 3) catalog default
  if (speciesSlug) {
    const catalogUrl = `${CATALOG_PHOTOS_BASE}/${speciesSlug}.jpg`;
    const exists = await checkUrlExists(catalogUrl);
    if (exists) {
      return { url: catalogUrl, source: 'catalog' };
    }
  }

  // 4) placeholder
  return { url: PLACEHOLDER_URL, source: 'placeholder' };
}

/**
 * Lista todas las fotos del usuario para una especie (todas las instalaciones
 * o cultivos del usuario en su finca).
 */
export async function listUserPhotosBySpecies(speciesSlug) {
  if (!speciesSlug) return [];
  const db = await openDB();
  const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
  const store = tx.objectStore(STORES.MEDIA_CACHE);
  return new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(all.filter((p) => p.speciesSlug === speciesSlug));
    };
    req.onerror = () => resolve([]);
  });
}

/** Borra una foto por id. */
export async function deletePhoto(photoId) {
  const db = await openDB();
  const tx = db.transaction(STORES.MEDIA_CACHE, 'readwrite');
  const store = tx.objectStore(STORES.MEDIA_CACHE);
  return new Promise((resolve, reject) => {
    const req = store.delete(photoId);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ────────────────────────────────────────────────────────────
// Helpers internos
// ────────────────────────────────────────────────────────────

function getDims(bitmap) {
  // ImageBitmap usa width/height; HTMLImageElement usa naturalWidth/Height
  return {
    naturalWidth: bitmap.naturalWidth || bitmap.width,
    naturalHeight: bitmap.naturalHeight || bitmap.height,
  };
}

function loadViaImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo cargar imagen: ${e}`));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob fallido'))),
      type,
      quality
    );
  });
}

async function findLatestUserPhoto({ assetId, speciesSlug }) {
  const db = await openDB();
  const tx = db.transaction(STORES.MEDIA_CACHE, 'readonly');
  const store = tx.objectStore(STORES.MEDIA_CACHE);
  return new Promise((resolve) => {
    const matches = [];
    const req = store.openCursor(null, 'prev'); // recorre por orden inverso
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor) {
        matches.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        resolve(matches[0] || null);
        return;
      }
      const v = cursor.value;
      if (
        (assetId && v.assetId === assetId) ||
        (speciesSlug && v.speciesSlug === speciesSlug)
      ) {
        matches.push(v);
      }
      cursor.continue();
    };
    req.onerror = () => resolve(null);
  });
}

async function checkUrlExists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok;
  } catch {
    return false;
  }
}

// Export en lote para conveniencia de tests
export const __test = {
  MAX_DIMENSION,
  TARGET_QUALITY,
  MAX_BYTES,
  CATALOG_PHOTOS_BASE,
  PLACEHOLDER_URL,
};
