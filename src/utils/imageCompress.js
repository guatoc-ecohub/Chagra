// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * imageCompress.js — compresión cliente-lado de imágenes antes de mandarlas
 * al sidecar / agente de visión.
 *
 * Política (operador 2026-05-27):
 *   - Lado mayor máx 1600 px (aspect ratio preservado).
 *   - Output JPEG quality 0.85.
 *   - Si el blob resultante sigue > 2 MB, bajamos quality a 0.7 y
 *     reintentamos UNA vez.
 *   - Si sigue > 2 MB, la función devuelve `{ ok: false, reason: 'too_large', ... }`
 *     y el caller muestra toast "La foto es muy grande, intentá una más liviana"
 *     SIN subir nada.
 *
 * Esta es la primera capa de defensa contra payloads gigantes hacia el
 * sidecar agro-mcp (que arranca con `bodyLimit` chico). Es complementaria a
 * `photoService.captureAndCompress` que apunta a 500 KB para persistencia
 * local — aquí apuntamos a un techo distinto (2 MB) porque el sidecar es
 * quien define el límite de red.
 *
 * Diseño puro: NO toca IndexedDB, NO toca red, NO toca catálogo. Recibe un
 * Blob (o File) y devuelve un Blob comprimido. El caller decide qué hacer.
 */

const DEFAULT_MAX_DIMENSION = 1600;
const DEFAULT_QUALITY_PRIMARY = 0.85;
const DEFAULT_QUALITY_FALLBACK = 0.7;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_MIME = 'image/jpeg';

/**
 * Comprime un blob de imagen siguiendo la política descrita arriba.
 *
 * @param {Blob|File} blob — imagen original (cámara, galería, o blob ya
 *   procesado por otro path).
 * @param {Object}    [opts]
 * @param {number}    [opts.maxDimension=1600]    - lado mayor en px
 * @param {number}    [opts.quality=0.85]         - JPEG quality 1er intento
 * @param {number}    [opts.qualityFallback=0.7]  - JPEG quality 2do intento
 * @param {number}    [opts.maxBytes=2097152]     - techo de bytes para subir
 * @param {string}    [opts.mime='image/jpeg']    - MIME de salida
 *
 * @returns {Promise<
 *   | { ok: true,  blob: Blob, width: number, height: number, quality: number, size: number, originalSize: number }
 *   | { ok: false, reason: 'too_large' | 'decode_failed' | 'canvas_failed', size?: number, originalSize?: number }
 * >}
 */
export async function compressImage(blob, opts = {}) {
  const maxDimension = opts.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const qualityPrimary = opts.quality ?? DEFAULT_QUALITY_PRIMARY;
  const qualityFallback = opts.qualityFallback ?? DEFAULT_QUALITY_FALLBACK;
  const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
  const mime = opts.mime ?? DEFAULT_MIME;

  if (!blob) {
    return { ok: false, reason: 'decode_failed' };
  }
  const originalSize = typeof blob.size === 'number' ? blob.size : 0;

  // 1) decode → bitmap
  let bitmap;
  try {
    bitmap = await decodeToBitmap(blob);
  } catch {
    return { ok: false, reason: 'decode_failed', originalSize };
  }

  const naturalW = bitmap.naturalWidth || bitmap.width || 0;
  const naturalH = bitmap.naturalHeight || bitmap.height || 0;
  if (!naturalW || !naturalH) {
    closeBitmap(bitmap);
    return { ok: false, reason: 'decode_failed', originalSize };
  }

  // 2) calcular target dims manteniendo aspect ratio
  const longest = Math.max(naturalW, naturalH);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const targetW = Math.max(1, Math.round(naturalW * scale));
  const targetH = Math.max(1, Math.round(naturalH * scale));

  // 3) render a canvas
  let canvas;
  try {
    canvas = renderToCanvas(bitmap, targetW, targetH);
  } catch {
    closeBitmap(bitmap);
    return { ok: false, reason: 'canvas_failed', originalSize };
  } finally {
    closeBitmap(bitmap);
  }

  // 4) primer intento — quality primaria
  let compressed;
  try {
    compressed = await canvasToBlob(canvas, mime, qualityPrimary);
  } catch {
    return { ok: false, reason: 'canvas_failed', originalSize };
  }

  if (compressed.size <= maxBytes) {
    return {
      ok: true,
      blob: compressed,
      width: targetW,
      height: targetH,
      quality: qualityPrimary,
      size: compressed.size,
      originalSize,
    };
  }

  // 5) fallback — quality secundaria, UN reintento
  let fallback;
  try {
    fallback = await canvasToBlob(canvas, mime, qualityFallback);
  } catch {
    return { ok: false, reason: 'canvas_failed', originalSize };
  }

  if (fallback.size <= maxBytes) {
    return {
      ok: true,
      blob: fallback,
      width: targetW,
      height: targetH,
      quality: qualityFallback,
      size: fallback.size,
      originalSize,
    };
  }

  // 6) ni con quality 0.7 entra — el caller debe avisar al usuario.
  return {
    ok: false,
    reason: 'too_large',
    size: fallback.size,
    originalSize,
  };
}

/** Mensaje canónico para mostrar al usuario cuando compressImage rechaza. */
export const IMAGE_TOO_LARGE_MESSAGE =
  'La foto es muy grande, intenta una más liviana';

// ────────────────────────────────────────────────────────────
// Helpers internos
// ────────────────────────────────────────────────────────────

async function decodeToBitmap(blob) {
  // Preferimos createImageBitmap (rápido + soporta HEIC en iOS Safari).
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob);
    } catch {
      // cae al fallback HTMLImageElement
    }
  }
  return await decodeViaImg(blob);
}

function decodeViaImg(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('img decode failed'));
    };
    img.src = url;
  });
}

function renderToCanvas(bitmap, w, h) {
  const canvas =
    typeof OffscreenCanvas === 'function'
      ? new OffscreenCanvas(w, h)
      : (() => {
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          return c;
        })();
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

function canvasToBlob(canvas, mime, quality) {
  // OffscreenCanvas: convertToBlob({ type, quality })
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: mime, quality });
  }
  // HTMLCanvasElement: toBlob(cb, type, quality)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
      mime,
      quality,
    );
  });
}

function closeBitmap(bitmap) {
  if (bitmap && typeof bitmap.close === 'function') {
    try {
      bitmap.close();
    } catch {
      /* noop */
    }
  }
}

// Export interno para tests (defaults verificables sin importar el módulo
// entero).
export const __test = {
  DEFAULT_MAX_DIMENSION,
  DEFAULT_QUALITY_PRIMARY,
  DEFAULT_QUALITY_FALLBACK,
  DEFAULT_MAX_BYTES,
  DEFAULT_MIME,
};
