/**
 * glaciarAccess.js — Gate de ACCESO al módulo "Reporte de Punto Glaciar".
 *
 * PROPÓSITO:
 *   Restringir la VISIBILIDAD y el ACCESO del módulo glaciar a los beta
 *   testers de "La Cordada". NO cierra el código fuente (Chagra sigue siendo
 *   open-source / AGPL-3.0): es un gate de acceso por usuario, no un cierre de
 *   fuente. Mientras el módulo madura, solo los usernames de la whitelist ven
 *   el banner del Home y pueden montar la ruta `#glaciar`. Para el resto de
 *   usuarios el módulo es invisible e inalcanzable.
 *
 * CÓMO AGREGAR (O QUITAR) UN USUARIO DE LA CORDADA:
 *   1. Agregar/eliminar su username de farmOS (exacto) en CORDADA_WHITELIST
 *      abajo. El match es case-insensitive y tolera espacios, así que no hace
 *      falta normalizar a mano.
 *   2. Hacer commit y deploy. No hay otros pasos en el bundle.
 *
 * OFFLINE-FIRST:
 *   La verificación NO requiere red. Usa el username ya guardado en el login
 *   (`getActiveTenantId()` de tenantContext, persistido en localStorage tras el
 *   OAuth). Funciona idéntico online u offline.
 *
 * NOTA DE SEGURIDAD:
 *   La whitelist vive en el bundle (client-side). Cualquier usuario técnico
 *   puede inspeccionarla; esto es DEFENSE-IN-DEPTH de UX, no autorización dura.
 *   El gate real (si algún día el módulo toca backend) debe aplicarse
 *   server-side. Por ahora el módulo glaciar es 100% client-side, así que este
 *   gate es suficiente para "solo La Cordada lo ve".
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module glaciarAccess
 */

import { getActiveTenantId } from '../services/tenantContext.js';

// ─────────────────────────────────────────────────────────────────────────────
// WHITELIST — editar SOLO este Set para dar/quitar acceso al módulo glaciar.
// Son los beta testers de "La Cordada". Los usernames se normalizan
// (trim + lowercase) en el match, así que el formato exacto acá no es crítico.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set de usernames farmOS de los beta testers de "La Cordada" con acceso al
 * módulo "Reporte de Punto Glaciar".
 *
 * Para dar acceso a alguien: añadir su username (lowercase) a este Set.
 * Para revocar: eliminar la línea.
 *
 * @constant {Set<string>}
 */
export const CORDADA_WHITELIST = new Set([
  'alex',    // La Cordada — beta tester glaciar.
  'mario',   // La Cordada — beta tester glaciar.
  'camilo',  // La Cordada — beta tester glaciar.
  'kortux',  // Operador — acceso total (admin/testing); debe ver todo.
]);

// ─────────────────────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Función pura: ¿este username pertenece a La Cordada (tiene acceso al
 * módulo glaciar)?
 *
 * Normaliza el username con trim() + toLowerCase() antes de comparar, para
 * tolerar capitalización accidental o espacios alrededor (farmOS usernames
 * suelen ser lowercase, pero el match es robusto).
 *
 * @param {string|null|undefined} username — username farmOS del usuario.
 * @returns {boolean} true si está en la whitelist; false en todos los demás
 *   casos (null, undefined, vacío, solo espacios, fuera de la whitelist).
 */
export function tieneAccesoGlaciar(username) {
  if (!username || typeof username !== 'string') return false;
  const normalized = username.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return CORDADA_WHITELIST.has(normalized);
}

/**
 * ¿El usuario actualmente logueado tiene acceso al módulo glaciar?
 *
 * Lee el username persistido por `tenantContext` (se setea en el login OAuth).
 * No requiere red — funciona offline con el usuario ya guardado localmente.
 *
 * @returns {boolean}
 */
export function tieneAccesoGlaciarActual() {
  return tieneAccesoGlaciar(getActiveTenantId());
}
