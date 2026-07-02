/**
 * tierService.js — Resolución de tier free|pro por allowlist de usernames.
 *
 * PROPÓSITO:
 *   Defense-in-depth cliente-side. El gating DURO es server-side (el sidecar
 *   degrada a free si el header falta o no coincide con la lógica del backend).
 *   Esta allowlist controla qué usuarios ven features Pro en la UI (chip
 *   🔬 Deep Research) y cuál header `x-chagra-tier` se envía al sidecar.
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
