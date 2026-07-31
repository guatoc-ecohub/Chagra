/**
 * ucanService.js — Delegación de capabilities (UCAN mínimo) sobre did:key.
 *
 * PROPÓSITO (Fase 2, ADR-036 sub-iv, DISENO-FEDERACION-USUARIOS.md §5.2/§6.6):
 *   El dueño (issuer, Responsable del Tratamiento) firma una capability que
 *   autoriza a un `did` destino (sub-usuario propio o asesor externo) a
 *   ejecutar una acción (`can`) sobre un recurso (`with`), con TTL y
 *   `restrict` opcional (redact_pii / own_only / no_delete). El enforcement
 *   DURO vive server-side en `farm_did_auth` (§5.3 del diseño) — este módulo
 *   es la primitiva cripto: emitir, verificar, y traducir claims → permisos
 *   del catálogo Chagra (§2 del diseño).
 *
 * DECISIÓN DE IMPLEMENTACIÓN — UCAN "mínimo" casero, NO `@ucans/core`:
 *   No se usa la librería `@ucans/core` (que sí menciona el diseño) para
 *   mantener cero dependencias nuevas en la capa cripto (misma decisión que
 *   `didKeyService.js`). El token resultante es JWT-like: tres segmentos
 *   base64url separados por '.', firmados con Ed25519 vía `didKeyService`:
 *
 *     base64url(header) '.' base64url(payload) '.' base64url(signature)
 *
 *   No es un JWT ni un UCAN-spec-compliant token (no trae `prf` real de
 *   cadena de delegación multi-salto, ni el encoding DAG-CBOR/IPLD del
 *   spec UCAN 1.0). Es un formato PROPIO inspirado en UCAN para esta fase.
 *   Migrar al spec completo (con `@ucans/core` o similar) es un cambio
 *   contenido a este archivo si se necesita interoperar con otros
 *   verificadores UCAN externos — el contrato público no tiene por qué
 *   cambiar (`issueCapability` / `verifyCapability` / `ucanToPermisos`).
 *
 * ATENUACIÓN (regla dura, NO se implementa aquí la cadena `prf` completa):
 *   Un cap NUNCA puede escalar: quien re-delega solo puede otorgar un
 *   subconjunto de lo que él mismo recibió. Esta pieza (Fase 2 mínima) NO
 *   implementa re-delegación multi-salto (`prf` queda vacío) — cada cap se
 *   verifica de forma independiente contra la firma directa del `iss`. La
 *   atenuación real en esta fase se logra en dos capas YA existentes:
 *     1. `ROLE_CEILING` (roleCatalog.js, pieza A) — el rol del issuer limita
 *        qué `can` puede legítimamente emitir (chequeo de negocio, no cripto).
 *     2. `restrict` en el payload — un cap con `own_only`/`no_delete` no
 *        puede ser reinterpretado sin esas restricciones aguas abajo.
 *   Delegación cross-finca multi-salto con `prf` real queda para Fase 3
 *   (§8 del diseño) — se deja documentado, no un placeholder que finja
 *   soportarlo.
 *
 * REVOCACIÓN: esta pieza NO consulta `cap_revoked` (eso vive en
 *   `farm_did_auth` server-side, §5.3). `verifyCapability` solo valida
 *   firma + estructura + expiración — es la primitiva cripto, no la
 *   decisión final de autorización.
 *
 * Español colombiano (usted). NUNCA voseo argentino.
 *
 * @module ucanService
 */

import { sign, verify } from './didKeyService.js';

const UCAN_ALG = 'EdDSA'; // nombre de algoritmo estándar para Ed25519 en tokens JWT-like.
const UCAN_TYP = 'CHAGRA-UCAN-v0'; // NO es UCAN 1.0 spec-compliant — ver nota de módulo arriba.

/**
 * Mapa `can` (verbo estilo UCAN, con '/') → permiso atómico Chagra (con ':').
 * Fuente de verdad de nombres: DISENO-FEDERACION-USUARIOS.md §2.2 / §6.9.
 * Mantener en sync con `roleCatalog.PERMISOS` (pieza A) cuando esa pieza
 * se integre — por ahora esta tabla es autocontenida para no crear una
 * dependencia dura entre piezas E/F y A/B en esta fase de despacho paralelo.
 */
const CAN_TO_PERMISO = Object.freeze({
  'asset/read': 'asset:read',
  'asset/create': 'asset:create',
  'asset/update': 'asset:update', // se resuelve a :own o :any según restrict.own_only
  'asset/delete': 'asset:delete', // se resuelve a :own o :any según restrict.own_only
  'log/create': 'log:create',
  'log/read': 'log:read',
  'log/update': 'log:update',
  'log/delete': 'log:delete',
  'user/manage': 'user:manage',
  'license/manage': 'license:manage',
  'finca/settings': 'finca:settings',
  'ucan/delegate': 'ucan:delegate',
});

function textEncode(str) {
  return new TextEncoder().encode(str);
}

function bytesToBase64url(bytes) {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function jsonToBase64url(obj) {
  return bytesToBase64url(textEncode(JSON.stringify(obj)));
}

function base64urlToJson(b64url) {
  const bytes = base64urlToBytes(b64url);
  return JSON.parse(new TextDecoder().decode(bytes));
}

/**
 * Emite una capability firmada por el issuer, delegándola al `audienceDid`.
 *
 * @param {object} opts
 * @param {Uint8Array} opts.issuerSecret — secretKey del issuer (didKeyService).
 * @param {string} opts.issuerDid — did:key del issuer (debe corresponder a issuerSecret).
 * @param {string} opts.audienceDid — did:key del destinatario (sub-usuario o asesor).
 * @param {string} opts.can — verbo de capability, ej. "log/create" (ver CAN_TO_PERMISO).
 * @param {string} opts.with — recurso, ej. "chagra://finca/guatoc/logs".
 * @param {{redact_pii?: boolean, own_only?: boolean, no_delete?: boolean, types?: string[]}} [opts.restrict]
 * @param {number} opts.ttlSeconds — vigencia en segundos desde ahora.
 * @returns {Promise<string>} token "header.payload.sig" (base64url por segmento).
 */
export async function issueCapability({
  issuerSecret,
  issuerDid,
  audienceDid,
  can,
  with: withResource,
  restrict = {},
  ttlSeconds,
}) {
  if (!issuerSecret || !issuerDid) {
    throw new Error('ucanService.issueCapability: issuerSecret + issuerDid son requeridos');
  }
  if (!audienceDid || !audienceDid.startsWith('did:key:')) {
    throw new Error('ucanService.issueCapability: audienceDid debe ser un did:key válido');
  }
  if (!can || !withResource) {
    throw new Error('ucanService.issueCapability: can + with son requeridos');
  }
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('ucanService.issueCapability: ttlSeconds debe ser un número positivo');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  const header = { alg: UCAN_ALG, typ: UCAN_TYP };
  const payload = {
    iss: issuerDid,
    aud: audienceDid,
    att: [{ with: withResource, can, restrict }],
    exp: nowSeconds + Math.floor(ttlSeconds),
    nbf: nowSeconds,
    nnc: bytesToBase64url(crypto.getRandomValues(new Uint8Array(16))),
    prf: [], // sin cadena de delegación multi-salto en esta fase — ver nota de módulo.
  };

  const headerB64 = jsonToBase64url(header);
  const payloadB64 = jsonToBase64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  const sig = await sign(issuerSecret, textEncode(signingInput));
  const sigB64 = bytesToBase64url(sig);

  return `${signingInput}.${sigB64}`;
}

/**
 * Verifica un token emitido por `issueCapability`: estructura, firma Ed25519
 * (contra el `iss` embebido en el payload) y expiración (`exp`/`nbf`).
 * NO consulta la lista de revocación server-side (ver nota de módulo).
 *
 * @param {string} token
 * @returns {Promise<object>} claims (el payload) si es válido.
 * @throws {Error} si la firma es inválida, el token está mal formado, o expiró.
 */
export async function verifyCapability(token) {
  if (typeof token !== 'string' || token.split('.').length !== 3) {
    throw new Error('ucanService.verifyCapability: token mal formado (se esperan 3 segmentos)');
  }
  const [headerB64, payloadB64, sigB64] = token.split('.');

  let header;
  let payload;
  try {
    header = base64urlToJson(headerB64);
    payload = base64urlToJson(payloadB64);
  } catch {
    throw new Error('ucanService.verifyCapability: header/payload no son JSON base64url válido');
  }

  if (header?.alg !== UCAN_ALG) {
    throw new Error(`ucanService.verifyCapability: alg inesperado "${header?.alg}"`);
  }
  if (!payload?.iss || !payload?.aud || !Array.isArray(payload?.att)) {
    throw new Error('ucanService.verifyCapability: payload incompleto (faltan iss/aud/att)');
  }

  const sig = base64urlToBytes(sigB64);
  const signingInput = textEncode(`${headerB64}.${payloadB64}`);
  const validSig = await verify(payload.iss, signingInput, sig);
  if (!validSig) {
    throw new Error('ucanService.verifyCapability: firma inválida');
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && nowSeconds >= payload.exp) {
    throw new Error('ucanService.verifyCapability: capability expirada (exp)');
  }
  if (typeof payload.nbf === 'number' && nowSeconds < payload.nbf) {
    throw new Error('ucanService.verifyCapability: capability aún no vigente (nbf)');
  }

  return payload;
}

/**
 * Traduce los claims de una capability verificada al Set de permisos
 * atómicos Chagra (§2.2 del diseño) que ese `aud` tiene habilitados.
 * Aplica `restrict.own_only` (colapsa ':any' a ':own') y `restrict.no_delete`
 * (elimina cualquier permiso 'delete') sobre cada atenuación (`att`).
 *
 * @param {object} claims — payload retornado por `verifyCapability`.
 * @returns {Set<string>}
 */
export function ucanToPermisos(claims) {
  const permisos = new Set();
  if (!claims || !Array.isArray(claims.att)) return permisos;

  for (const attenuation of claims.att) {
    const permisoBase = CAN_TO_PERMISO[attenuation?.can];
    if (!permisoBase) continue; // can desconocido: se ignora, no se otorga nada.

    const restrict = attenuation.restrict || {};
    const escopables = permisoBase === 'asset:update' || permisoBase === 'asset:delete'
      || permisoBase === 'log:update' || permisoBase === 'log:delete'
      || permisoBase === 'log:read';

    if (restrict.no_delete && permisoBase.endsWith(':delete')) {
      continue; // no_delete bloquea el permiso de borrado por completo (caso niña).
    }

    if (escopables) {
      const scope = restrict.own_only ? 'own' : 'any';
      permisos.add(`${permisoBase}:${scope}`);
    } else {
      permisos.add(permisoBase);
    }
  }

  return permisos;
}
