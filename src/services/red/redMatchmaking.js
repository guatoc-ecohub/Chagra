/**
 * red/redMatchmaking.js — "Pregúntele al vecino" + ruteo de dudas. Lógica PURA
 * (cero red, cero I/O).
 *
 * Dado un problema (cultivo × vereda × síntoma), encuentra al PAR competente y
 * CERCANO — uno que ya DEMOSTRÓ éxito con ese cultivo en tratos del mercado — y
 * decide si conviene enrutarle la duda. El asistente enruta al par cuando no
 * sabe o cuando la duda es local-específica (donde el saber del vecino de la
 * misma vereda vale más que una respuesta genérica).
 *
 * La competencia NO se declara: sale de la reputación GANADA (redReputation).
 * Un vecino "competente" es el que entregó ese cultivo con buena fiabilidad, no
 * el que dice saber.
 *
 * @module services/red/redMatchmaking
 */

import { NIVEL_REPUTACION } from './types.js';
import { normalizeTerm } from './redReputation.js';

/** Etiqueta humana de cada tier de cercanía (usted, español de Colombia). */
export const PROXIMIDAD_LABEL = Object.freeze({
  3: 'de su misma vereda',
  2: 'de su municipio',
  1: 'de la región',
});

/** Niveles de reputación que cuentan como "competente" (demostró algo). */
const NIVELES_COMPETENTES = new Set([NIVEL_REPUTACION.VERDE, NIVEL_REPUTACION.AMBAR]);

/**
 * Tier de cercanía entre el que pregunta y un par. 3 misma vereda · 2 mismo
 * municipio · 1 más lejos. Comparación tolerante (sin tildes/mayúsculas).
 *
 * @param {{vereda?:string, municipio?:string}} query
 * @param {{vereda?:string, municipio?:string}} peer
 * @returns {1|2|3}
 */
export function proximidadTier(query, peer) {
  const qv = normalizeTerm(query?.vereda);
  const pv = normalizeTerm(peer?.vereda);
  if (qv && pv && qv === pv) return 3;
  const qm = normalizeTerm(query?.municipio);
  const pm = normalizeTerm(peer?.municipio);
  if (qm && pm && qm === pm) return 2;
  return 1;
}

/**
 * Encuentra pares competentes y cercanos para un cultivo. Ordena por cercanía y
 * luego por score de reputación (y recencia como desempate). Función pura.
 *
 * @param {Object} problema
 * @param {string} problema.producto — cultivo en cuestión.
 * @param {string} [problema.vereda]
 * @param {string} [problema.municipio]
 * @param {string} [problema.excludeHash] — no sugerirse a uno mismo.
 * @param {Object} contexto
 * @param {Array<import('./types.js').Reputacion>} contexto.reputaciones
 * @param {boolean} [contexto.allowNuevo=false] — incluir productores sin historial.
 * @returns {Array<import('./types.js').PeerMatch>}
 */
export function findCompetentPeers(problema, contexto) {
  const { producto, vereda = '', municipio = '', excludeHash = '' } = problema || {};
  const reputaciones = Array.isArray(contexto?.reputaciones) ? contexto.reputaciones : [];
  const allowNuevo = Boolean(contexto?.allowNuevo);
  const productoNorm = normalizeTerm(producto);
  if (!productoNorm) return [];

  const matches = [];
  for (const rep of reputaciones) {
    if (!rep || typeof rep !== 'object') continue;
    if (rep.productoNorm !== productoNorm) continue;
    if (excludeHash && rep.productorHash === excludeHash) continue;
    const competente = NIVELES_COMPETENTES.has(rep.nivel)
      || (allowNuevo && rep.nivel === NIVEL_REPUTACION.NUEVO);
    if (!competente) continue;

    const proximidad = proximidadTier({ vereda, municipio }, rep);
    matches.push({
      productorHash: rep.productorHash,
      producto: rep.producto,
      nivel: rep.nivel,
      score: rep.score,
      proximidad,
      proximidadLabel: PROXIMIDAD_LABEL[proximidad],
      vereda: rep.vereda,
      municipio: rep.municipio,
      nTransacciones: rep.nTransacciones,
      reciente: rep.reciente,
    });
  }

  matches.sort(
    (a, b) => b.proximidad - a.proximidad || b.score - a.score || b.reciente - a.reciente,
  );
  return matches;
}

/**
 * Construye el mensaje pre-llenado para enviarle al vecino. Español de Colombia
 * en usted, cálido y directo, SIN revelar la identidad del par a quien
 * pregunta y sin datos sensibles. Best-effort con el síntoma si viene.
 *
 * @param {{producto:string, vereda?:string, sintoma?:string}} params
 * @returns {string}
 */
export function buildMensajeVecino({ producto, vereda = '', sintoma = '' } = {}) {
  const cultivo = String(producto || 'este cultivo').trim();
  const lugar = String(vereda || '').trim();
  const problema = String(sintoma || '').trim();

  const donde = lugar ? ` por la vereda ${lugar}` : '';
  const conProblema = problema
    ? ` y se nos presentó ${problema}`
    : '';
  return (
    `Buenas. Le escribo desde la red de Chagra. Estamos con ${cultivo}${donde}${conProblema}. `
    + `Vi que usted tiene experiencia con ${cultivo}. ¿Le puedo preguntar cómo lo ha manejado?`
  );
}

/**
 * Decide si enrutar una duda a un vecino y a cuál. Regla del DR: el asistente
 * enruta cuando NO sabe (agentConfident=false) o cuando la duda es
 * LOCAL-ESPECÍFICA (hay un vecino fuerte de la misma vereda, cuyo saber de
 * terreno vale más que una respuesta genérica) aunque el agente crea saber.
 *
 * Devuelve una decisión honesta y explicable: si no hay vecino competente,
 * `shouldRoute=false` y `peer=null` (no inventa un contacto).
 *
 * @param {Object} problema
 * @param {string} problema.producto
 * @param {string} [problema.vereda]
 * @param {string} [problema.municipio]
 * @param {string} [problema.sintoma]
 * @param {boolean} [problema.agentConfident=true] — ¿el agente cree tener respuesta?
 * @param {string} [problema.excludeHash]
 * @param {Object} contexto — { reputaciones, allowNuevo }
 * @returns {{ shouldRoute:boolean, peer:(import('./types.js').PeerMatch|null),
 *   motivo:string, mensajeSugerido:(string|null),
 *   candidatos:Array<import('./types.js').PeerMatch> }}
 */
export function routeQuestion(problema, contexto) {
  const {
    producto,
    vereda = '',
    municipio = '',
    sintoma = '',
    agentConfident = true,
    excludeHash = '',
  } = problema || {};

  const candidatos = findCompetentPeers(
    { producto, vereda, municipio, excludeHash },
    contexto,
  );

  if (candidatos.length === 0) {
    return {
      shouldRoute: false,
      peer: null,
      motivo: 'sin_vecino_competente',
      mensajeSugerido: null,
      candidatos,
    };
  }

  const top = candidatos[0];
  const vecinoLocalFuerte =
    top.proximidad === 3 && top.nivel === NIVEL_REPUTACION.VERDE;

  // Enruta si el agente no sabe, o si hay un saber local fuerte que aportar.
  const shouldRoute = !agentConfident || vecinoLocalFuerte;
  if (!shouldRoute) {
    return {
      shouldRoute: false,
      peer: null,
      motivo: 'agente_responde',
      mensajeSugerido: null,
      candidatos,
    };
  }

  const motivo = !agentConfident ? 'agente_no_sabe' : 'saber_local';
  return {
    shouldRoute: true,
    peer: top,
    motivo,
    mensajeSugerido: buildMensajeVecino({ producto, vereda, sintoma }),
    candidatos,
  };
}
