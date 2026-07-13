/**
 * red/redSharing.js — COMPUERTA anti-extractiva de la red. Lógica PURA (cero
 * red, cero I/O) que decide qué sale del dispositivo y en qué forma.
 *
 * Es la barrera que hace honesto el "local-first / anti-extractivo": el dato
 * crudo nace PRIVADO (nivel 1) y nada entra al grafo social ni al matchmaking a
 * menos que el productor lo suba, explícito, a PARES (nivel 2) o CANONIZADO
 * (nivel 3). Un trato privado JAMÁS cruza esta compuerta.
 *
 * Además, aun cuando un trato es compartible, `redactForPeers` recorta lo que
 * los pares NO necesitan (identidad del comprador, referencias internas): a la
 * red solo cruza lo mínimo para la reputación y el matchmaking.
 *
 * @module services/red/redSharing
 */

import { SHARE_LEVEL } from './types.js';

/**
 * Normaliza un nivel de compartición a 1..3. Cualquier valor inválido o
 * ausente cae al más SEGURO (PRIVADO): el default nunca comparte de más.
 *
 * @param {*} value
 * @returns {number} 1 | 2 | 3
 */
export function normalizeShareLevel(value) {
  const n = Number(value);
  if (n === SHARE_LEVEL.PARES || n === SHARE_LEVEL.CANONIZADO) return n;
  return SHARE_LEVEL.PRIVADO;
}

/**
 * Estampa el nivel por default (PRIVADO) si el trato no trae uno válido. No
 * muta: devuelve una copia. Úselo al construir un trato para garantizar el
 * invariante "privado por default".
 *
 * @template {{shareLevel?: *}} T
 * @param {T} trato
 * @returns {T & {shareLevel:number}}
 */
export function withDefaultShareLevel(trato) {
  const t = trato && typeof trato === 'object' ? trato : /** @type {any} */ ({});
  return { ...t, shareLevel: normalizeShareLevel(t.shareLevel) };
}

/**
 * ¿Este trato puede cruzar la compuerta hacia la red? Por default exige nivel
 * PARES (2) o superior. Total y defensiva: cualquier input basura → false.
 *
 * @param {*} trato
 * @param {{ minLevel?: number }} [opts]
 * @returns {boolean}
 */
export function isShareable(trato, { minLevel = SHARE_LEVEL.PARES } = {}) {
  if (!trato || typeof trato !== 'object') return false;
  return normalizeShareLevel(trato.shareLevel) >= minLevel;
}

/**
 * Filtra una lista de tratos dejando solo los compartibles (nivel ≥ minLevel).
 * Es el ÚNICO punto por el que los servicios de grafo/reputación deben leer los
 * tratos: nunca operan sobre la lista cruda.
 *
 * @param {Array<*>} tratos
 * @param {{ minLevel?: number }} [opts]
 * @returns {Array<Object>}
 */
export function filterShareable(tratos, opts = {}) {
  const lista = Array.isArray(tratos) ? tratos : [];
  return lista.filter((t) => isShareable(t, opts));
}

/**
 * Proyección SEGURA de un trato para exponerlo a los pares. Deja solo lo que la
 * reputación y el matchmaking necesitan; recorta la identidad del comprador,
 * las referencias internas (ofertaId) y cualquier texto libre. Devuelve null si
 * el trato no es compartible (defensa en profundidad: aunque el llamador se
 * equivoque, un privado no se proyecta).
 *
 * @param {*} trato
 * @param {{ minLevel?: number }} [opts]
 * @returns {Object|null}
 */
export function redactForPeers(trato, opts = {}) {
  if (!isShareable(trato, opts)) return null;
  return {
    productorHash: trato.productorHash,
    producto: trato.producto,
    cultivoId: trato.cultivoId ?? null,
    categoria: trato.categoria ?? '',
    vereda: trato.vereda ?? '',
    municipio: trato.municipio ?? '',
    cantidad: trato.cantidad ?? null,
    unidad: trato.unidad ?? '',
    entrega: trato.entrega,
    calidad: trato.calidad ?? null,
    confirmadoPor: trato.confirmadoPor,
    shareLevel: normalizeShareLevel(trato.shareLevel),
    createdAt: trato.createdAt,
  };
}
