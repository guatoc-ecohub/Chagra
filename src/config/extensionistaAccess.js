/**
 * extensionistaAccess.js — Gate del ROL "extensionista" (modo supervisor
 * multi-finca). MVP de ADR-048.
 *
 * QUÉ ES UN EXTENSIONISTA
 *   Un usuario que SUPERVISA fincas de OTROS agricultores: el asesor de
 *   extensión rural (EPSEA/SENA), el técnico Agrosavia/IPPTA, el líder de una
 *   asociación campesina que acompaña a sus asociados. Ve un panel con las
 *   fincas que le delegaron, NO opera la suya propia.
 *
 * DIFERENCIA CON ADR-036 (multi-finca de 1 usuario)
 *   - `tenantContext` (ADR-036 MVP) resuelve "quién soy yo" (un agricultor con
 *     una o más fincas PROPIAS) para scopear sus assets en farmOS.
 *   - `extensionistaAccess` (este módulo, ADR-048) resuelve "¿soy un supervisor
 *     que puede VER fincas ajenas?". Es una capa de ROL por encima del tenant.
 *
 * POR QUÉ ES SOLO MVP (lo duro queda como follow-up backend)
 *   La delegación real "el agricultor X autoriza al extensionista Y a ver su
 *   finca" requiere UCAN delegations + el módulo Drupal `farm_did_auth`
 *   (ADR-036 sub-i / sub-iv). HOY no existe ese backend. Por eso este MVP:
 *     (1) detecta el rol con una whitelist client-side (igual patrón que
 *         glaciarAccess.js / La Cordada), y
 *     (2) lee la lista de fincas delegadas de un MOCK/config estático
 *         (src/data/extensionista-fincas.json), NO de una autorización
 *         verificada server-side.
 *   Es DEFENSE-IN-DEPTH de UX + scaffold de producto, NO autorización dura. El
 *   día que ADR-036 active UCAN, `esExtensionista` se sustituye por la
 *   verificación de una capability `supervise` firmada por el dueño de la finca.
 *
 * DOBLE CANDADO
 *   1. Feature flag global `VITE_FEATURE_EXTENSIONISTA` (kill-switch). Con la
 *      flag apagada (default), el modo NO existe para NADIE — ni la ruta, ni el
 *      tile, ni el panel. Permite shippear el código a producción dark hasta
 *      que el backend esté listo.
 *   2. Whitelist de usernames `EXTENSIONISTA_WHITELIST`. Aun con la flag ON,
 *      solo estos usuarios entran al modo supervisor.
 *
 * OFFLINE-FIRST
 *   La verificación NO requiere red. Usa el username del login ya guardado por
 *   tenantContext en localStorage. Funciona idéntico online u offline.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module extensionistaAccess
 */

import { getActiveTenantId } from '../services/tenantContext.js';
import { esOperador } from './glaciarAccess.js';

// ─────────────────────────────────────────────────────────────────────────────
// WHITELIST — editar SOLO este Set para dar/quitar el rol extensionista.
// Son los usuarios con perfil de asesor de extensión / técnico / líder de
// asociación. Los usernames se normalizan (trim + lowercase) en el match, así
// que el formato exacto acá no es crítico.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set de usernames farmOS con ROL extensionista (acceso al panel supervisor).
 *
 * Para dar el rol: añadir su username (lowercase) a este Set.
 * Para revocar: eliminar la línea.
 *
 * @constant {Set<string>}
 */
export const EXTENSIONISTA_WHITELIST = new Set([
  'demo-extensionista', // Placeholder de piloto. Reemplazar por el username
  // farmOS real del asesor/técnico al activar el modo (mismo patrón que
  // CORDADA_WHITELIST en glaciarAccess.js).
]);

const FLAG_KEY = 'VITE_FEATURE_EXTENSIONISTA';

/**
 * Lee el feature flag global del modo extensionista. Acepta los strings
 * 'true' / '1' (case-insensitive, con espacios) como habilitado; cualquier
 * otro valor — incluido undefined o '' — deja el modo APAGADO (default off).
 *
 * Mismo criterio de parseo que `isSidecarEnabled()` en sidecarClient.js para
 * mantener la convención del repo.
 *
 * @returns {boolean}
 */
export function featureExtensionistaActivo() {
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
 * Función pura: ¿este username tiene el rol extensionista?
 *
 * Doble candado:
 *   - si el feature flag global está apagado → false para todos (kill-switch);
 *   - si está encendido → true solo si el username está en la whitelist.
 *
 * Normaliza con trim() + toLowerCase() antes de comparar (tolerante a
 * capitalización accidental o espacios alrededor).
 *
 * BYPASS DEL OPERADOR (visión total):
 *   El operador del producto (admin/demo/debug) ve SIEMPRE TODO, igual que con
 *   el módulo glaciar (ver `tieneAccesoGlaciar`). Sin este bypass, el operador
 *   y los perfiles de demostración (p. ej. el panel ministerial) aterrizaban en
 *   `#extensionista` y veían una pantalla "Vista no disponible" — un dead-end
 *   inaceptable en un demo. Con `esOperador()` (override local o
 *   VITE_OPERATOR_USERNAME) el operador entra al panel sin importar la flag ni
 *   la whitelist. NO leakea identidad (override booleano en localStorage).
 *
 * @param {string|null|undefined} username — username farmOS del usuario.
 * @returns {boolean} true si tiene el rol (o es operador); false en los demás
 *   casos (flag off, null, undefined, vacío, solo espacios, fuera de whitelist).
 */
export function esExtensionista(username) {
  // El operador (visión total) ve el panel extensionista aunque la flag esté
  // apagada o no esté en la whitelist — mismo criterio que glaciarAccess.
  if (esOperador(username)) return true;
  return esExtensionistaReal(username);
}

/**
 * ¿El usuario actualmente logueado tiene el rol extensionista?
 *
 * Lee el username persistido por `tenantContext` (se setea en el login OAuth).
 * No requiere red — funciona offline con el usuario ya guardado localmente.
 *
 * @returns {boolean}
 */
export function esExtensionistaActual() {
  return esExtensionista(getActiveTenantId());
}

/**
 * ¿Este username tiene el rol extensionista REAL (flag + whitelist), SIN el
 * bypass del operador?
 *
 * POR QUÉ EXISTE (hotfix P0 2026-07-04, escena del home vacía en PROD):
 *   `esExtensionista()` incluye el bypass del operador (visión total) para que
 *   el operador pueda ENTRAR al panel #extensionista sin flag ni whitelist.
 *   Pero DashboardLive usaba ESA misma función para decidir la PORTADA del
 *   home F2: con `VITE_OPERATOR_USERNAME` baked en el build de prod (secret),
 *   el operador quedaba "extensionista" y su home reemplazaba la escena de SU
 *   finca por la RED institucional (vacía para él) → área de escena en blanco
 *   (solo el degradado) en TODOS los temas. En dev no se reproducía porque
 *   dev-deploy.yml NO define VITE_OPERATOR_USERNAME.
 *
 *   El bypass es para ACCEDER al panel (ruta #extensionista, App.jsx), no para
 *   cambiarle la identidad de la portada: el operador tiene finca propia y su
 *   home debe mostrar SU escena. La portada institucional es solo para el rol
 *   REAL (featureExtensionistaActivo() + whitelist).
 *
 * @param {string|null|undefined} username — username farmOS del usuario.
 * @returns {boolean} true SOLO si la flag global está encendida Y el username
 *   está en la whitelist. El operador NO pasa por aquí (sin bypass).
 */
export function esExtensionistaReal(username) {
  if (!featureExtensionistaActivo()) return false;
  if (!username || typeof username !== 'string') return false;
  const normalized = username.trim().toLowerCase();
  if (normalized.length === 0) return false;
  return EXTENSIONISTA_WHITELIST.has(normalized);
}

/**
 * ¿El usuario actualmente logueado es extensionista REAL (sin bypass de
 * operador)? Decide la PORTADA del home F2 (red institucional vs escena de
 * finca propia). Offline-first, igual que `esExtensionistaActual`.
 *
 * @returns {boolean}
 */
export function esExtensionistaRealActual() {
  return esExtensionistaReal(getActiveTenantId());
}
