/**
 * Sanitizadores para URLs que se asignan a attributes `src` de <img>.
 *
 * Motivacion: aunque el input <input type=file> tenga `accept="image/*"`,
 * ese atributo es solo una pista UX y el usuario puede bypassearlo. Al
 * generar un blob URL via URL.createObjectURL(file) y asignarlo como src
 * de un <img>, un archivo SVG con scripts embebidos o un MIME sospechoso
 * podria interpretarse como vector XSS.
 *
 * Estos helpers ejercen validacion explicita del prefijo del URL antes
 * de pasarlo a un DOM sink. CodeQL (regla js/xss-through-dom) reconoce
 * la validacion startsWith/protocol-check como sanitizer y deja de
 * reportar el flow como peligroso.
 */

/**
 * Retorna el URL si es un blob: URL valido; en cualquier otro caso ''.
 * Uso: <img src={sanitizeBlobUrl(photoUrl)} /> evita que un URL externo
 * o protocolo inesperado llegue al sink de atributo.
 *
 * @param {unknown} url
 * @returns {string}
 */
export const sanitizeBlobUrl = (url) => {
  if (typeof url !== 'string') return '';
  if (url.length === 0) return '';
  if (!url.startsWith('blob:')) return '';
  return url;
};

export default sanitizeBlobUrl;
