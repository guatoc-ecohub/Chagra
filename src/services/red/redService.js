/**
 * red/redService.js — ORQUESTACIÓN de la red humana. Es la única capa con I/O:
 * ata la persistencia (db/redTransactions) con la lógica pura (redReputation,
 * redMatchmaking, redSharing) y REUSA lo que el mercado ya tiene (construir el
 * contacto directo) y la identidad pseudonimizada del operador (Ley 1581).
 *
 * Pipeline "mercado → grafo + reputación":
 *   1. Un negocio del mercado se cierra → se registra un TRATO (hecho).
 *   2. Grafo social y reputación se DERIVAN de los tratos compartibles.
 *   3. "Pregúntele al vecino" rutea una duda al par competente y cercano.
 *
 * El contacto con el par NO expone su teléfono a menos que el par lo haya hecho
 * público (opt-in, mismo canal directo del mercado). Sin ese consentimiento, el
 * ruteo entrega solo la intención + el mensaje sugerido, nunca un número.
 *
 * @module services/red/redService
 */

import { redTransactions } from '../../db/redTransactions.js';
import { construirContacto } from '../marketplaceService.js';
import { computeOperatorHash, getCurrentOperatorHash } from '../operatorIdentityService.js';
import { ENTREGA, CONFIRMADO_POR } from './types.js';
import { withDefaultShareLevel } from './redSharing.js';
import { computeAllReputaciones, buildSocialGraph } from './redReputation.js';
import { routeQuestion } from './redMatchmaking.js';

/**
 * Construye un TRATO a partir de una oferta del mercado + el desenlace. PURO:
 * no persiste ni genera id (eso lo hace la capa de store). Garantiza el
 * invariante "privado por default" vía withDefaultShareLevel.
 *
 * @param {Object} params
 * @param {Object} [params.oferta] - registro de marketplace_ofertas.
 * @param {string} params.productorHash - id pseudonimizado del vendedor.
 * @param {string|null} [params.compradorHash]
 * @param {string} [params.entrega] - ENTREGA.* (default PENDIENTE).
 * @param {number|null} [params.calidad] - 1..5 (default null).
 * @param {string} [params.confirmadoPor] - CONFIRMADO_POR.* (default PRODUCTOR).
 * @param {number} [params.shareLevel] - nivel opt-in (default PRIVADO).
 * @param {string|null} [params.cultivoId]
 * @returns {import('./types.js').RedTransaction}
 */
export function buildTrato({
  oferta = {},
  productorHash,
  compradorHash = null,
  entrega = ENTREGA.PENDIENTE,
  calidad = null,
  confirmadoPor = CONFIRMADO_POR.PRODUCTOR,
  shareLevel,
  cultivoId = null,
}) {
  const cal = Number(calidad);
  return withDefaultShareLevel({
    ofertaId: oferta?.id ?? null,
    productorHash: productorHash || '',
    compradorHash: compradorHash || null,
    producto: oferta?.producto ?? '',
    cultivoId: cultivoId ?? oferta?.cultivoId ?? null,
    categoria: oferta?.categoria ?? '',
    vereda: oferta?.vereda ?? '',
    municipio: oferta?.municipio ?? '',
    cantidad: Number(oferta?.cantidad) || 0,
    unidad: oferta?.unidad ?? '',
    entrega,
    calidad: Number.isFinite(cal) && cal >= 1 && cal <= 5 ? cal : null,
    confirmadoPor,
    shareLevel,
  });
}

/**
 * Resuelve un hash de productor: si viene `productorHash` lo usa; si viene
 * `productorId` crudo, lo pseudonimiza con operatorIdentityService.
 * @param {{productorHash?:string, productorId?:string}} input
 * @returns {Promise<string>}
 */
async function resolveProductorHash(input) {
  if (input?.productorHash) return input.productorHash;
  if (input?.productorId) return computeOperatorHash(input.productorId);
  const current = getCurrentOperatorHash();
  if (current) return current;
  throw new Error('trato sin identidad de productor');
}

/**
 * Registra un TRATO: resuelve la identidad, lo construye y lo persiste.
 * @param {Object} input - ver buildTrato + { productorId? }.
 * @returns {Promise<import('./types.js').RedTransaction>}
 */
export async function registrarTrato(input) {
  const productorHash = await resolveProductorHash(input);
  const trato = buildTrato({ ...input, productorHash });
  return redTransactions.save(trato);
}

/**
 * Carga todas las reputaciones derivadas (productor×producto) desde los tratos.
 * @param {Object} [opts] - { now, halfLifeDias, minLevel }
 * @returns {Promise<Array<import('./types.js').Reputacion>>}
 */
export async function cargarReputaciones(opts = {}) {
  const tratos = await redTransactions.getAll();
  return computeAllReputaciones(tratos, opts);
}

/**
 * Carga el grafo social derivado desde los tratos compartibles.
 * @param {Object} [opts] - { minLevel }
 * @returns {Promise<import('./types.js').SocialGraph>}
 */
export async function cargarGrafoSocial(opts = {}) {
  const tratos = await redTransactions.getAll();
  return buildSocialGraph(tratos, opts);
}

/**
 * "Pregúntele al vecino": rutea una duda al par competente y cercano. Excluye
 * al propio operador (no se sugiere a uno mismo). El caller decide qué hacer con
 * la decisión (mostrar el mensaje sugerido, abrir canal si hay consentimiento).
 *
 * @param {Object} problema - { producto, vereda, municipio, sintoma, agentConfident }
 * @param {Object} [opts] - { now, halfLifeDias, minLevel, allowNuevo }
 * @returns {Promise<ReturnType<typeof routeQuestion>>}
 */
export async function preguntarAlVecino(problema, opts = {}) {
  const reputaciones = await cargarReputaciones(opts);
  const excludeHash = getCurrentOperatorHash() || '';
  return routeQuestion(
    { ...problema, excludeHash },
    { reputaciones, allowNuevo: Boolean(opts.allowNuevo) },
  );
}

/**
 * Abre el canal directo con un vecino REUSANDO el contacto del mercado. Solo
 * funciona si el par expuso un teléfono público (opt-in). Sin ese dato devuelve
 * null: la red no filtra números sin consentimiento.
 *
 * @param {{contactoTel?:string, producto?:string}} contactoPublico
 * @param {{mensaje?:string}} [opts]
 * @returns {{href:string, tel:string}|null}
 */
export function abrirCanal(contactoPublico, opts = {}) {
  if (!contactoPublico?.contactoTel) return null;
  const base = construirContacto(contactoPublico);
  if (!base) return null;
  if (opts.mensaje) {
    const tel = base.href.split('?')[0].replace('https://wa.me/', '');
    return { href: `https://wa.me/${tel}?text=${encodeURIComponent(opts.mensaje)}`, tel: base.tel };
  }
  return base;
}
