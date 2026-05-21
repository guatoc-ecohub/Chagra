/**
 * tenantContext — Identidad del "tenant" activo en la sesión PWA.
 *
 * Esto es el camino MVP del ADR-036 multi-finca: la versión completa propone
 * `did:key` Ed25519 + UCAN delegations + DB-per-finca en OPFS, pero para
 * habilitar HOY entregar la PWA a 3-5 usuarios reales compartiendo un único
 * backend farmOS sin que vean assets ajenos, alcanza con scoping cliente-side
 * derivado del username del login OAuth2.
 *
 * Diferencias con módulos vecinos:
 *  - `operatorIdentityService` calcula `operator_id_hash` (HMAC-SHA256) para
 *    pseudonimización Ley 1581 — opaco, no útil como filtro de servidor.
 *  - `fincaActiveStore` resuelve la finca ACTIVA dentro del catálogo público
 *    `fincas-publicas.json` (un usuario puede tener acceso a varias fincas);
 *    no resuelve "quién soy yo" de cara al backend.
 *
 * `tenantContext` provee el `tenantId` plaintext (username farmOS), que es
 * lo que farmOS JSON:API entiende como `filter[uid.name]` / `filter[owner.id]`.
 *
 * TODO(multifinca-backend): cuando ADR-036 Fase 1 active did:key + UCAN,
 * sustituir `tenantId = username` por `tenantId = did:key:zABC...` y delegar
 * a `farm_did_auth` (módulo Drupal a desarrollar) la verificación server-side.
 * Hasta entonces, este scoping es DEFENSE-IN-DEPTH cliente-side: defensa real
 * server-side requiere que farmOS aplique el `filter[uid.name]` y, idealmente,
 * que el token OAuth2 ya esté ligado a un user que solo ve sus propios assets.
 */

const TENANT_ID_KEY = 'chagra:active_tenant_id';

/**
 * Setea el tenantId activo. Llamar tras login exitoso con el username farmOS.
 * Si cambia respecto al anterior, dispara evento `tenantChanged` para que
 * stores invaliden cachés (ver useAssetStore.invalidateForTenantChange).
 *
 * @param {string} tenantId — username plaintext del operador (ej. 'alice', 'bob')
 */
export function setActiveTenantId(tenantId) {
  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    throw new Error('tenantId must be non-empty string');
  }
  const normalized = tenantId.trim();
  const previous = getActiveTenantId();
  try {
    localStorage.setItem(TENANT_ID_KEY, normalized);
  } catch (err) {
    console.warn('[tenantContext] localStorage write failed:', err);
  }
  if (previous && previous !== normalized && typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tenantChanged', { detail: { previous, current: normalized } })
    );
  }
  return normalized;
}

/**
 * @returns {string|null} tenantId activo o null si no hay login en este device.
 */
export function getActiveTenantId() {
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch (err) {
    console.warn('[tenantContext] localStorage read failed:', err);
    return null;
  }
}

/**
 * Limpia el tenantId activo. Llamar en logout.
 */
export function clearActiveTenantId() {
  try {
    localStorage.removeItem(TENANT_ID_KEY);
  } catch (err) {
    console.warn('[tenantContext] localStorage remove failed:', err);
  }
}

/**
 * @returns {boolean} true si hay un tenant activo (proxy de "estamos logueados
 * con un usuario identificado").
 */
export function hasActiveTenant() {
  return !!getActiveTenantId();
}

/**
 * Para tests.
 */
export function _resetForTests() {
  try {
    localStorage.removeItem(TENANT_ID_KEY);
  } catch (_) { /* no-op en entornos sin localStorage */ }
}
