/**
 * conoceVisto.js — la huella persistente del recorrido "Conoce Chagra".
 *
 * Módulo mínimo SIN React ni CSS: lo comparten el tour (chunk lazy) y el
 * invite de primera vez (bundle principal) sin que el invite arrastre las
 * escenas completas al bundle inicial.
 *
 * Valores de la huella:
 *   - 'abierto' — abrió el recorrido (aunque no lo terminara).
 *   - 'omitido' — descartó la invitación ("Ahora no").
 *   - '1'       — lo terminó o lo saltó desde adentro.
 * Cualquier valor silencia la auto-oferta para siempre; el tour sigue
 * disponible opt-in desde el Manual, el Perfil y el deep-link #conoce.
 */

export const CONOCE_VISTO_KEY = 'chagra:conoce-visto';

/** @param {string} [valor] */
export function marcarConoceVisto(valor = '1') {
  try { window.localStorage.setItem(CONOCE_VISTO_KEY, valor); } catch (_) { /* noop */ }
}

/** @returns {boolean} true si ya vio, abrió u omitió el recorrido. */
export function conoceYaVisto() {
  try { return Boolean(window.localStorage.getItem(CONOCE_VISTO_KEY)); } catch (_) { return false; }
}
