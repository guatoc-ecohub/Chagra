/**
 * Duración visible de un aviso, calculada según el tiempo de lectura.
 * @param {string|null|undefined} mensaje
 * @returns {number} milisegundos
 */
const AVISO_VISIBLE_MIN_MS = 7000;
const AVISO_VISIBLE_MAX_MS = 16000;

export function duracionAviso(mensaje) {
  const n = String(mensaje || '').length;
  if (!n) return AVISO_VISIBLE_MIN_MS;
  return Math.min(
    AVISO_VISIBLE_MAX_MS,
    Math.max(AVISO_VISIBLE_MIN_MS, Math.round(n * 16 + n * 70 + 1200)),
  );
}

export default duracionAviso;
