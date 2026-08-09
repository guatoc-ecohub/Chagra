/**
 * tierService.js — Resolución de tier free|pro por allowlist de usernames + cupo de sub-usuarios.
 *
 * PROPÓSITO:
 *   Defense-in-depth cliente-side. El gating DURO es server-side (el sidecar
 *   degrada a free si el header falta o no coincide con la lógica del backend).
 *   Esta allowlist controla qué usuarios ven features Pro en la UI (chip
 *   🔬 Deep Research) y cuál header `x-chagra-tier` se envía al sidecar.
 *
 *   Extendido para gestionar el cupo de sub-usuarios por tier de licencia
 *   (free1/familiar4/cuadrilla12/cooperativa50) según DISENO-FEDERACION-USUARIOS.md.
 *
 * CÓMO AGREGAR UN USUARIO PRO:
 *   1. Agregar su username farmOS (exacto, lowercase) a PRO_USERNAMES abajo.
 *   2. Hacer commit y deploy. No hay otros pasos en el bundle.
 *
 * NOTA DE SEGURIDAD:
 *   La allowlist vive en el bundle (client-side). Cualquier usuario técnico
 *   puede inspeccionarla. El sidecar aplica su propia validación server-side;
 *   este tier solo afecta la UX (qué chips se muestran, qué header se envía).
 *   NO confiar en este tier para decisiones de autorización en el backend.
 *
 *   El cupo de sub-usuarios es defense-in-depth. La enforcement DURO es
 *   server-side vía farm_did_auth (módulo Drupal).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CUENTA ANA PENDIENTE (UNGRD Pasto/Galeras)
 *   Reemplazar el string ANA_USERNAME_PENDIENTE con su username real de farmOS
 *   cuando el operador lo provea. Ver constante ANA_USERNAME_PENDIENTE abajo.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module tierService
 */

import { getActiveTenantId } from './tenantContext.js';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS — utilizados para cupo de sub-usuarios (DISENO-FEDERACION-USUARIOS.md §3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {'dueno'|'esposa'|'trabajador'|'nina'|'asesor'} RoleId
 * Roles de seguridad de Chagra (NO roles de producto como campesino/ganadero).
 */

/**
 * @typedef {'free'|'familiar'|'cuadrilla'|'cooperativa'} TierId
 * Tiers de licencia con cupo de sub-usuarios.
 */

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO DE TIERS — cupo de sub-usuarios y roles permitidos por tier.
// Fuente de verdad: DISENO-FEDERACION-USUARIOS.md §3, tabla de la sección 7.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Catálogo de tiers de licencia de Chagra.
 * maxSubUsers: cuenta al dueño incluido. 'asesor' NO cuenta contra el cupo.
 * roles: roles de seguridad permitidos para este tier.
 * canDelegate: si permite delegación cross-finca (asesores externos).
 *
 * @constant {Object.<TierId, {maxSubUsers: number, roles: RoleId[], canDelegate: boolean}>}
 */
export const TIERS = Object.freeze({
  free:       { maxSubUsers: 1,  roles: ['dueno'],                                      canDelegate: false },
  familiar:   { maxSubUsers: 4,  roles: ['dueno','esposa','trabajador','nina'],         canDelegate: false },
  cuadrilla:  { maxSubUsers: 12, roles: ['dueno','esposa','trabajador','nina'],         canDelegate: true  },
  cooperativa:{ maxSubUsers: 50, roles: ['dueno','esposa','trabajador','nina','asesor'],canDelegate: true  },
});

// ─────────────────────────────────────────────────────────────────────────────
// ALLOWLIST — editar SOLO este Set para activar/desactivar Pro a un usuario.
// Los usernames están en minúsculas; resolveTier hace toLowerCase() para match.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Placeholder para la cuenta de Ana (UNGRD Pasto/Galeras).
 * El operador debe reemplazar este string con el username real de farmOS de Ana.
 * Una vez reemplazado, agregar el username a PRO_USERNAMES y hacer commit.
 *
 * ACCIÓN REQUERIDA: reemplazar 'ANA_USERNAME_PENDIENTE' con el username real.
 *
 * @constant {string}
 */
export const ANA_USERNAME_PENDIENTE = 'ANA_USERNAME_PENDIENTE';

/**
 * Set de usernames farmOS con acceso Pro.
 *
 * Para agregar un usuario Pro: añadir su username (lowercase) a este Set.
 * Para revocar: eliminar la línea.
 *
 * @constant {Set<string>}
 */
export const PRO_USERNAMES = new Set([
  'admin',               // Operador principal (Miguel / Guatoc)
  'ana maria',           // Ana María (UNGRD Pasto/Galeras) — Pro piloto 2026-06-02.
                         // Match es case-insensitive (resolveTier lowercasea). Si su
                         // login exacto en farmOS difiere (ej. 'ana.maria'), ajustar aquí.
]);

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resuelve el tier de un usuario por su username farmOS.
 *
 * Matching case-insensitive: farmOS usernames son lowercase por convención,
 * pero el match es robusto ante capitalización accidental.
 *
 * @param {string|null|undefined} username — username farmOS del usuario.
 * @returns {'free'|'pro'} — 'pro' si está en la allowlist, 'free' en todos
 *   los demás casos (null, undefined, vacío, fuera de allowlist).
 */
export function resolveTier(username) {
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return 'free';
  }
  return PRO_USERNAMES.has(username.toLowerCase()) ? 'pro' : 'free';
}

/**
 * Resuelve el tier del usuario actualmente logueado, leyendo el tenantId
 * persistido por `tenantContext` (se setea en login).
 *
 * @returns {'free'|'pro'}
 */
export function getCurrentTier() {
  const username = getActiveTenantId();
  return resolveTier(username);
}

/**
 * Construye los headers HTTP para llamadas al sidecar, inyectando
 * `x-chagra-tier` con el tier del usuario activo y `X-Chagra-Token`
 * si se pasa un token no vacío.
 *
 * Uso típico en sidecarClient y deepResearchClient:
 *   const headers = buildSidecarHeaders(getToken());
 *
 * @param {string} [token] - VITE_CHAGRA_MCP_TOKEN (puede ser vacío si no está configurado).
 * @returns {Object.<string, string>} headers listos para inyectar en fetch.
 */
export function buildSidecarHeaders(token) {
  const tier = getCurrentTier();
  const headers = {
    'Content-Type': 'application/json',
    'x-chagra-tier': tier,
  };
  if (token && typeof token === 'string' && token.length > 0) {
    headers['X-Chagra-Token'] = token;
  }
  return headers;
}

// ─────────────────────────────────────────────────────────────────────────────
// API PÚBLICA — cupo de sub-usuarios por tier (DISENO-FEDERACION-USUARIOS.md §3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si se puede agregar un sub-usuario al roster según el cupo del tier.
 *
 * Cuenta únicamente usuarios con status 'active'. 'asesor' NO cuenta contra
 * el cupo (es delegación externa, no un seat de licencia).
 *
 * @param {Object} roster - El roster de la finca (FincaRoster).
 * @param {string} roster.tier - El tier de licencia (TierId).
 * @param {Array<Object>} roster.usuarios - Array de sub-usuarios (SubUser[]).
 * @returns {boolean} true si hay cupo disponible, false si se alcanzó el límite.
 */
export function canAddSubUser(roster) {
  if (!roster || !roster.tier || !Array.isArray(roster.usuarios)) {
    return false;
  }

  const tierConfig = TIERS[roster.tier];
  if (!tierConfig) {
    return false;
  }

  const activeUsers = roster.usuarios.filter(u => u.status === 'active' && u.rol !== 'asesor');
  return activeUsers.length < tierConfig.maxSubUsers;
}

/**
 * Verifica si un rol de seguridad está permitido en un tier específico.
 *
 * @param {TierId} tier - El tier de licencia.
 * @param {RoleId} roleId - El rol de seguridad a verificar.
 * @returns {boolean} true si el rol está permitido en el tier, false en caso contrario.
 */
export function tierAllowsRole(tier, roleId) {
  const tierConfig = TIERS[tier];
  if (!tierConfig || !Array.isArray(tierConfig.roles)) {
    return false;
  }
  return tierConfig.roles.includes(roleId);
}

/**
 * Verifica si un tier permite delegación cross-finca (asesores externos).
 *
 * @param {TierId} tier - El tier de licencia.
 * @returns {boolean} true si el tier permite delegación, false en caso contrario.
 */
export function tierAllowsDelegation(tier) {
  const tierConfig = TIERS[tier];
  return tierConfig ? tierConfig.canDelegate : false;
}
