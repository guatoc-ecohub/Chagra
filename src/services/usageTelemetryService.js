/**
 * usageTelemetryService.js — Envoltorios delgados de telemetría ANÓNIMA de USO.
 *
 * Cada función es un one-liner sobre `recordPilotEvent` para que los call sites
 * (juegos, navegación, features) queden consistentes y sin lógica repetida.
 *
 * Privacy (innegociable):
 * - 100% ANÓNIMO. NUNCA se envía user_id, nombre, email, GPS, finca_id, ni
 *   texto de prompt/respuesta. `recordAgentQueryCategory` recibe solo la
 *   CATEGORÍA/ruta NLU del intent — JAMÁS el texto que escribió la persona.
 * - `recordPilotEvent` ya sanitiza la metadata (descarta llaves PII).
 * - Todas las funciones son no-throw: cualquier error se traga y se devuelve
 *   null. La telemetría nunca debe romper la UX.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */

import { recordPilotEvent } from './pilotTelemetryService.js';

/** ¿`v` es un string no vacío (tras trim)? */
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Filtra `extra` a solo valores numéricos/string/booleanos (defensa extra; el
 * sanitizador de recordPilotEvent también limpia). Devuelve {} si no es objeto.
 */
const safeExtra = (extra) => {
  if (!extra || typeof extra !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(extra)) {
    if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
      out[k] = v;
    }
  }
  return out;
};

/**
 * Registra el INICIO de un juego.
 * @param {string} gameId — id corto del juego (ej. 'milpa', 'doom_finca').
 * @returns {Promise<object|null>|null}
 */
export function recordGameStart(gameId) {
  try {
    if (!isNonEmptyString(gameId)) return null;
    return recordPilotEvent({ event_type: 'game_start', metadata: { game_id: String(gameId) } });
  } catch (_) {
    return null;
  }
}

/**
 * Registra que se COMPLETÓ (se ganó) un juego.
 * @param {string} gameId — id corto del juego.
 * @param {object} [extra] - metadata numérica/categórica opcional (sin PII).
 * @returns {Promise<object|null>|null}
 */
export function recordGameComplete(gameId, extra = {}) {
  try {
    if (!isNonEmptyString(gameId)) return null;
    return recordPilotEvent({
      event_type: 'game_complete',
      metadata: { game_id: String(gameId), ...safeExtra(extra) },
    });
  } catch (_) {
    return null;
  }
}

/**
 * Registra que se VIO una pantalla/módulo (para agregación de pantallas).
 * @param {string} screen — id de la vista (ej. 'activos', 'agente').
 * @returns {Promise<object|null>|null}
 */
export function recordScreenView(screen) {
  try {
    if (!isNonEmptyString(screen)) return null;
    return recordPilotEvent({ event_type: 'screen_view', metadata: { screen: String(screen) } });
  } catch (_) {
    return null;
  }
}

/**
 * Registra el USO de una función concreta del producto.
 * @param {string} feature — id corto de la función (ej. 'foto_diagnostico').
 * @param {object} [extra] - metadata numérica/categórica opcional (sin PII).
 * @returns {Promise<object|null>|null}
 */
export function recordFeatureUse(feature, extra = {}) {
  try {
    if (!isNonEmptyString(feature)) return null;
    return recordPilotEvent({
      event_type: 'feature_use',
      metadata: { feature: String(feature), ...safeExtra(extra) },
    });
  } catch (_) {
    return null;
  }
}

/**
 * Registra la CATEGORÍA (ruta/intent NLU) de una consulta al agente.
 *
 * IMPORTANTE (privacy): `category` es una etiqueta de RUTA/INTENT del NLU
 * (ej. 'controladores_plagas', 'fenologia'), NUNCA el texto del prompt del
 * usuario. No registrar aquí nada que la persona haya escrito.
 *
 * @param {string} category — etiqueta de ruta/intent NLU.
 * @returns {Promise<object|null>|null}
 */
export function recordAgentQueryCategory(category) {
  try {
    if (!isNonEmptyString(category)) return null;
    return recordPilotEvent({ event_type: 'agent_query', metadata: { category: String(category) } });
  } catch (_) {
    return null;
  }
}
