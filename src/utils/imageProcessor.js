/**
 * imageProcessor.js — Optimización de imágenes en el cliente (Fase 20.2).
 *
 * Usa Canvas para redimensionar manteniendo aspect ratio y exporta como
 * WebP con calidad 0.8. Sin dependencias externas.
 */

/**
 * Redimensiona y comprime una imagen capturada.
 * @param {File|Blob} file — archivo de imagen original (ej. desde <input type="file">)
 * @param {number} maxWidth — ancho máximo en px (default 1280)
 * @param {number} quality — calidad WebP 0-1 (default 0.8)
 * @returns {Promise<Blob>} — blob optimizado (image/webp)
 */
export const optimizeImage = (file, maxWidth = 1280, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // Escalar manteniendo aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas.toBlob retornó null.'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error cargando imagen para optimización.'));
    };

    img.src = url;
  });
};

/**
 * Genera un thumbnail para preview rápido.
 * @param {Blob} blob — blob de imagen
 * @returns {Promise<string>} — data URL para <img src>
 */
export const blobToDataUrl = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};
