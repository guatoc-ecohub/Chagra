/**
 * imageProcessor.ts — Optimización de imágenes en el cliente (Fase 20.2).
 *
 * Usa Canvas para redimensionar manteniendo aspect ratio y exporta como
 * WebP con calidad 0.8. Sin dependencias externas.
 */

/**
 * Redimensiona y comprime una imagen capturada.
 */
export const optimizeImage = (
  file: File | Blob,
  maxWidth = 1280,
  quality = 0.8
): Promise<Blob> => {
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
      if (!ctx) {
        reject(new Error('No se pudo obtener contexto 2D del canvas.'));
        return;
      }
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
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};
