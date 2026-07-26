/**
 * redService.js — cliente PWA de la RED de trueque campesino↔campesino (Chagra #7, Fase 1).
 *
 * Andamiaje del servicio cliente (SIN pantallas todavía): envuelve los 4 endpoints
 * del sidecar de la RED (Fase 0, ADR-051) para que las pantallas de Fase 1 los
 * consuman sin repetir plumbing. Reusa `postJson` de sidecarClient (mismo auth,
 * tier header, timeout y degrade-to-null → offline-friendly).
 *
 * Contrato (ADR-051): el trueque es GRATIS y de vecindario; la geo es DIFUSA
 * (centroide de vereda, NUNCA GPS de la finca); las necesidades predichas se
 * etiquetan como sugerencia; la reputación se registra pero (MVP) no modera.
 *
 * Todas las funciones degradan a `null` si el sidecar no responde (offline/timeout)
 * — la UI debe tratar `null` como "sin red por ahora", nunca como error duro.
 * Español colombiano (tú/usted).
 */
import { postJson, TOOL_TIMEOUT_MS } from './sidecarClient.js';

/**
 * @typedef {Object} ZonaDifusa
 * @property {number} lat  latitud del centroide de la vereda (NO de la finca)
 * @property {number} lng  longitud del centroide
 * @property {string} [vereda] nombre legible de la vereda
 */

/**
 * Publica un excedente disponible para trueque. Idealmente derivado de una cosecha
 * real (`fromHarvestId`) para no fabricar oferta.
 * @param {{fincaId:string, speciesId:string, zona:ZonaDifusa, cantidad?:number,
 *   unidad?:string, vigencia?:string, fromHarvestId?:string}} o
 * @returns {Promise<{persisted:boolean, log_id?:string}|null>}
 */
export async function publicarOferta(o) {
  if (!o?.fincaId || !o?.speciesId || !o?.zona) return null;
  return postJson('/red-oferta', {
    finca_id: o.fincaId,
    species_id: o.speciesId,
    zona: o.zona,
    cantidad: o.cantidad,
    unidad: o.unidad,
    vigencia: o.vigencia,
    from_harvest_id: o.fromHarvestId,
  }, TOOL_TIMEOUT_MS);
}

/**
 * Publica una necesidad de la finca. `predicted:true` la marca como sugerencia
 * anticipada (fenología) — la UI debe mostrarla claramente como propuesta, no como hecho.
 * @param {{fincaId:string, speciesId:string, zona:ZonaDifusa, cantidad?:number,
 *   predicted?:boolean}} n
 * @returns {Promise<{persisted:boolean, log_id?:string}|null>}
 */
export async function publicarNecesidad(n) {
  if (!n?.fincaId || !n?.speciesId || !n?.zona) return null;
  return postJson('/red-necesidad', {
    finca_id: n.fincaId,
    species_id: n.speciesId,
    zona: n.zona,
    cantidad: n.cantidad,
    predicted: n.predicted === true,
  }, TOOL_TIMEOUT_MS);
}

/**
 * Registra un trueque. El estado inicial es "acordado"; un cambio posterior
 * ("cumplido"/"incumplido") se registra con OTRA llamada pasando `rootId` del
 * trueque original (el backend NO muta — ADR-019). La reputación se deriva de esto.
 * @param {{fincaA:string, fincaB:string, speciesA:string, speciesB:string,
 *   estado?:'acordado'|'cumplido'|'incumplido', rootId?:string}} t
 * @returns {Promise<{persisted:boolean, log_id?:string}|null>}
 */
export async function registrarTrueque(t) {
  if (!t?.fincaA || !t?.fincaB || !t?.speciesA || !t?.speciesB) return null;
  return postJson('/red-trueque', {
    finca_a: t.fincaA,
    finca_b: t.fincaB,
    species_a: t.speciesA,
    species_b: t.speciesB,
    estado: t.estado || 'acordado',
    root_id: t.rootId,
  }, TOOL_TIMEOUT_MS);
}

/**
 * Busca matches de trueque del vecindario para una finca. Devuelve los vecinos
 * ordenados por VALOR del match (bidireccional + reputación − distancia), no por
 * cercanía sola. `radioKm` acota el vecindario (default backend 5km).
 * @param {{fincaId:string, radioKm?:number}} q
 * @returns {Promise<{finca_id:string, radio_km:number, mi_reputacion:object,
 *   total:number, matches:Array<{finca_id:string, zona?:string, distancia_km:number,
 *   bidireccional:boolean, ofrece_lo_que_necesito:string[],
 *   necesita_lo_que_ofrezco:string[], reputacion:object, score:number}>}|null>}
 */
export async function buscarMatches(q) {
  if (!q?.fincaId) return null;
  return postJson('/red-match', {
    finca_id: q.fincaId,
    radio_km: q.radioKm,
  }, TOOL_TIMEOUT_MS);
}
