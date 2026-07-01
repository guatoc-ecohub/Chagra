/**
 * fincaScope — Capa de ABSTRACCIÓN de scope por finca (ADR-036 MF-1, #378).
 *
 * ════════════════════════════════════════════════════════════════════════════
 * QUÉ ES Y POR QUÉ EXISTE
 * ════════════════════════════════════════════════════════════════════════════
 * Hoy la PWA modela UNA sola finca: los stores IDB (assetCache, logCache, …) no
 * separan los datos por finca. ADR-036 (multi-finca / federación de células)
 * quiere que un mismo usuario —o un extensionista— gestione VARIAS fincas sin
 * mezclar sus datos. MF-1 es la FUNDACIÓN de almacenamiento de ese camino: una
 * sola puerta para "scopear" lecturas/escrituras por `finca_id`, DETRÁS DE UN
 * FEATURE FLAG (`VITE_MULTI_FINCA`).
 *
 * REGLA DE ORO — NO ROMPER PERSISTENCIA (riesgo de data-loss):
 *   - El flag arranca en OFF. Con OFF, esta capa es un NO-OP total: el scope
 *     resuelto es `null` (sentinela single-finca), `scopeMatches()` deja pasar
 *     TODO y `stampScope()` devuelve el registro tal cual. El camino de datos
 *     single-finca actual queda EXACTAMENTE igual: mismos stores, mismas keys,
 *     CERO migración. Ningún registro existente se toca, se mueve ni se oculta.
 *   - Con ON, el scoping es ADITIVO: se estampa un campo `_finca_id` en los
 *     registros NUEVOS. Los registros legacy (sin `_finca_id`) SIEMPRE quedan
 *     visibles para la finca activa — nunca se esconden ni se borran. Mismo
 *     criterio conservador que el `_tenant_id` de assetCache/logCache.
 *
 * RELACIÓN CON LOS MÓDULOS VECINOS (NO los reemplaza):
 *   - `fincaActiveStore` (zustand) ya resuelve qué finca slug está "activa" en
 *     la UI (banner GPS, endpoint farmOS). `fincaScope` lo USA como fuente del
 *     id de finca activo cuando el flag está ON, pero añade la SEMÁNTICA de
 *     storage (estampar/filtrar) que el store no tiene.
 *   - `tenantContext` resuelve "quién soy yo" (username farmOS) y ya scopea los
 *     stores vía `_tenant_id`. Ese eje (usuario) es ORTOGONAL al eje finca.
 *     fincaScope añade el segundo eje (finca) sin tocar el primero. Con el flag
 *     OFF ambos siguen comportándose como hoy.
 *   - `extensionistaAccess` (ADR-048) decide si un usuario PUEDE ver fincas
 *     ajenas; fincaScope decide CÓMO se separan los datos de cada finca.
 *
 * LO QUE MF-1 NO HACE (follow-ups, ver plan en el PR):
 *   - NO crea did:key / BIP-39 (MF-2 #379) — el id de finca es el slug actual.
 *   - NO migra a OPFS + Automerge/SQLite-WASM DB-per-finca (MF-3 #380). Ese es
 *     el refactor de write-path riesgoso; aquí solo se deja la abstracción.
 *   - NO toca el schema de `dbCore.js` (sin bump de versión IDB). El campo
 *     `_finca_id` es un atributo aditivo del documento, no requiere índice para
 *     funcionar (igual que `_tenant_id`).
 *   - NO añade migrator v1→v2 (MF-4 #381) ni backup B2 (MF-5 #382).
 *
 * El flag se parsea con el MISMO criterio que `isSidecarEnabled()` y
 * `featureExtensionistaActivo()` para mantener la convención del repo.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module fincaScope
 */

import useFincaActiveStore from './fincaActiveStore.js';

/**
 * Nombre del campo aditivo que estampa el scope de finca en los documentos.
 * Prefijo `_` (convención de campos internos de Chagra, como `_tenant_id` y
 * `_pending`): no choca con atributos JSON:API de farmOS.
 *
 * @constant {string}
 */
export const FINCA_SCOPE_FIELD = '_finca_id';

const FLAG_KEY = 'VITE_MULTI_FINCA';

/**
 * Lee el feature flag global de multi-finca. Acepta los strings 'true' / '1'
 * (case-insensitive, con espacios) como habilitado; cualquier otro valor
 * —incluido undefined o ''— deja el modo APAGADO (default OFF).
 *
 * KILL-SWITCH: con la flag apagada, toda esta capa es un no-op (single-finca).
 *
 * @returns {boolean}
 */
export function isMultiFincaEnabled() {
  try {
    const raw = import.meta.env?.[FLAG_KEY];
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1';
    }
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Resuelve el id de la finca activa.
 *
 *   - Flag OFF  → `null` (sentinela single-finca: NO hay scope, todo es global).
 *   - Flag ON   → el slug de la finca activa de `fincaActiveStore`, o `null` si
 *                 por alguna razón no hay finca resuelta (degradación segura:
 *                 sin scope ⇒ se ve todo, nunca se esconden datos).
 *
 * Acepta un resolver inyectado para tests (función pura sin zustand):
 *   getActiveFincaScope(() => 'mi-finca')
 *
 * @param {() => (string|null|undefined)} [resolveActiveSlug] - override opcional
 *   del resolutor del slug activo (default: lee de fincaActiveStore).
 * @returns {string|null} id de finca activo, o `null` si single-finca / sin scope.
 */
export function getActiveFincaScope(resolveActiveSlug) {
  if (!isMultiFincaEnabled()) return null;
  let slug = null;
  try {
    if (typeof resolveActiveSlug === 'function') {
      slug = resolveActiveSlug();
    } else {
      slug = useFincaActiveStore.getState().activeFincaSlug;
    }
  } catch (_) {
    slug = null;
  }
  if (typeof slug !== 'string') return null;
  const normalized = slug.trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * ¿El scope de finca está ACTIVO de verdad? (flag ON **y** hay finca resuelta).
 *
 * Cuando es false, todas las operaciones de scope se comportan como single-finca
 * (no filtran, no estampan). Útil para que los callers decidan rápido si vale la
 * pena pasar por la capa.
 *
 * @param {() => (string|null|undefined)} [resolveActiveSlug]
 * @returns {boolean}
 */
export function isFincaScopeActive(resolveActiveSlug) {
  return getActiveFincaScope(resolveActiveSlug) !== null;
}

/**
 * Estampa el scope de finca en un documento de forma ADITIVA e idempotente.
 *
 * Contrato (NO data-loss):
 *   - Si el scope NO está activo (flag OFF o sin finca) → devuelve el MISMO
 *     objeto sin tocarlo. Cero cambios, cero copia. Comportamiento single-finca.
 *   - Si el documento YA trae `_finca_id` → se PRESERVA (el caller sabe a qué
 *     finca pertenece: rehidratación desde server, device compartido, etc.).
 *   - Si el scope está activo y el documento no trae `_finca_id` → se devuelve
 *     una COPIA superficial con `_finca_id` = finca activa. Nunca muta el
 *     original (evita efectos colaterales sobre objetos compartidos).
 *
 * @template T
 * @param {T} record — documento a estampar (asset, log, evento, …).
 * @param {() => (string|null|undefined)} [resolveActiveSlug]
 * @returns {T} el mismo objeto (no-op) o una copia con `_finca_id`.
 */
export function stampScope(record, resolveActiveSlug) {
  const fincaId = getActiveFincaScope(resolveActiveSlug);
  if (fincaId === null) return record; // single-finca: no-op total.
  if (!record || typeof record !== 'object') return record;
  // Idempotente: respeta un _finca_id ya presente (no lo pisa).
  if (record[FINCA_SCOPE_FIELD]) return record;
  return { ...record, [FINCA_SCOPE_FIELD]: fincaId };
}

/**
 * ¿Este documento es VISIBLE para la finca activa?
 *
 * Criterio (conservador, NO esconde datos):
 *   - Scope inactivo (flag OFF / sin finca) → SIEMPRE true (todo visible).
 *   - Documento legacy sin `_finca_id` → SIEMPRE true. Pre-multifinca: se
 *     considera heredado y pertenece a la finca que lo hidrate primero. NUNCA
 *     se esconde un dato del operador single-finca histórico.
 *   - Documento con `_finca_id` → visible solo si coincide con la finca activa.
 *
 * @param {object} record
 * @param {() => (string|null|undefined)} [resolveActiveSlug]
 * @returns {boolean}
 */
export function scopeMatches(record, resolveActiveSlug) {
  const fincaId = getActiveFincaScope(resolveActiveSlug);
  if (fincaId === null) return true; // single-finca: todo visible.
  if (!record || typeof record !== 'object') return true;
  const recordFinca = record[FINCA_SCOPE_FIELD];
  if (!recordFinca) return true; // legacy: visible para la finca activa.
  return recordFinca === fincaId;
}

/**
 * Filtra una lista de documentos dejando solo los visibles para la finca activa.
 *
 * Atajo sobre `scopeMatches`. Con el scope inactivo devuelve la MISMA lista de
 * entrada por referencia (cero copia, cero recorrido) → no-op single-finca.
 *
 * @template T
 * @param {T[]} records
 * @param {() => (string|null|undefined)} [resolveActiveSlug]
 * @returns {T[]}
 */
export function filterByActiveFinca(records, resolveActiveSlug) {
  const fincaId = getActiveFincaScope(resolveActiveSlug);
  if (fincaId === null) return records; // single-finca: lista intacta.
  if (!Array.isArray(records)) return records;
  return records.filter((r) => scopeMatches(r, () => fincaId));
}
