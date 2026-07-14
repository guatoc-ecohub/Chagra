/**
 * T42 — Backoff exponencial con jitter para reintentos de sync.
 *
 * Usado por syncManager para espaciar reintentos sin saturar el servidor.
 * Fórmula: min(base * 2^intento + random(0, base), max).
 *
 * El SyncIndicator muestra "Reintentando en Xs..." mientras espera.
 */
const BASE_MS = 1000;
const MAX_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Calcula el delay para el siguiente reintento.
 * @param {number} intento — 0-indexed (primer reintento = 0)
 * @returns {number} milisegundos
 */
export function backoff(intento) {
  const base = Math.min(BASE_MS * Math.pow(2, intento), MAX_MS);
  const jitter = Math.random() * BASE_MS;
  return Math.round(base + jitter);
}

/**
 * Duerme por `backoff(intento)` ms.
 * @param {number} intento
 * @returns {Promise<void>}
 */
export function dormirBackoff(intento) {
  return new Promise(resolve => setTimeout(resolve, backoff(intento)));
}

/**
 * Reintenta una función asíncrona con backoff exponencial.
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ maxIntentos?: number, onReintento?: (intento: number, delay: number) => void }} opts
 * @returns {Promise<T>}
 */
export async function reintentarConBackoff(fn, { maxIntentos = 5, onReintento } = {}) {
  for (let i = 0; i <= maxIntentos; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxIntentos) throw err;
      const delay = backoff(i);
      if (onReintento) onReintento(i + 1, delay);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('maxIntentos exceeded');
}
