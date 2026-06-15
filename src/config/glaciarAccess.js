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
  // NOTA: el operador NO se hardcodea aquí (anti-leak, repo público). Ve el tile
  // glaciar vía `tieneAccesoGlaciar` (que incluye a esOperador). Ver abajo.
]);

// ─────────────────────────────────────────────────────────────────────────────
// WHITELIST DE OPERADOR — separada de la Cordada A PROPÓSITO.
//
// PROBLEMA QUE RESUELVE (regresión 2026-06-15): meter al operador en
// CORDADA_WHITELIST le da acceso al tile glaciar (correcto), pero como efecto
// colateral `deriveRole` lo clasifica como `guia_glaciar` y `homeModuleSelector`
// le entrega el set ESTRECHO de guía (clima/páramo/reforestación) — lo contrario
// de "acceso total". Pertenecer a la Cordada NO debe estrechar el home.
//
// Por eso el operador tiene su PROPIA whitelist: estar acá NO deriva un rol de
// producto; es un BYPASS del gating del home/chips para que el operador
// (admin/demo/debug) vea SIEMPRE TODO. El operador ve el tile glaciar vía
// `tieneAccesoGlaciar` (que incluye a esOperador), SIN hardcodear su username
// (anti-leak: repo público, ver tests/unit/boundaryAudit.test.js).
//
// NO reutilizar CORDADA_WHITELIST para esto: son dos conceptos distintos
// (acceso a un módulo beta vs. visión total del operador).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set de usernames farmOS del/los OPERADOR(es) del producto (admin/testing).
 * Estar acá da VISIÓN TOTAL del home (todos los módulos + las 4 tarjetas de
 * seguimiento + el catálogo completo de chips vivos), saltándose el gating por
 * perfil.
 *
 * Para dar visión total a alguien: añadir su username (lowercase) a este Set.
 *
 * @constant {Set<string>}
 */
// ANTI-LEAK (repo PÚBLICO): el/los username(s) del operador se INYECTAN en build
// vía la env `VITE_OPERATOR_USERNAME` (uno o varios separados por coma) y NUNCA se
// hardcodean aquí. El deploy la setea desde el secret OPERATOR_USERNAME. En dev sin
// la env, el Set queda vacío → esOperador=false (fallback seguro). Ver
// tests/unit/boundaryAudit.test.js (Task 40).
function operadorUsernames() {
  return String(import.meta.env?.VITE_OPERATOR_USERNAME ?? '')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter((u) => u.length > 0);
}

/**
 * Set de usernames del operador, leído de la env en CALL-TIME (testeable con
 * vi.stubEnv). NUNCA hardcodea el username (anti-leak, repo público).
 * @returns {Set<string>}
 */
export function getOperadorWhitelist() {
  return new Set(operadorUsernames());
}

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
  // El operador (visión total) también ve el tile glaciar, aunque ya NO esté
  // hardcodeado en CORDADA_WHITELIST (anti-leak).
  return CORDADA_WHITELIST.has(normalized) || esOperador(normalized);
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

/**
 * Función pura: ¿este username es OPERADOR del producto (visión total)?
 *
 * Normaliza igual que `tieneAccesoGlaciar` (trim + toLowerCase) para que el
 * match sea robusto ante capitalización/espacios. Es independiente de la
 * Cordada: un guía de glaciar REAL (alex/mario/camilo) NO es operador.
 *
 * @param {string|null|undefined} username — username farmOS del usuario.
 * @returns {boolean} true solo si está en OPERADOR_WHITELIST.
 */
export function esOperador(username) {
  if (!username || typeof username !== 'string') return false;
  const normalized = username.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return operadorUsernames().includes(normalized);
}

/**
 * ¿El usuario actualmente logueado es OPERADOR (visión total)?
 *
 * Companion offline de `tieneAccesoGlaciarActual`: lee el mismo username
 * persistido por `tenantContext`. No requiere red.
 *
 * @returns {boolean}
 */
export function esOperadorActual() {
  return esOperador(getActiveTenantId());
}
