/**
 * demoProfile.js — SWITCH DE DEMO POR PERFIL (solo OPERADOR).
 *
 * PROPÓSITO:
 *   Permitir que el OPERADOR (admin/demo/debug) SIMULE cómo ve la app cada
 *   perfil de usuario (campesino · urbano-terraza · ganadero · restaurador ·
 *   guía de glaciar · socio · técnico), SIN cambiar su perfil real ni
 *   re-loguearse. Sirve para demos a instituciones ("así ve un campesino del
 *   Cauca su home") y para debug ("¿por qué este urbano no ve la tarjeta de
 *   Cerdos?").
 *
 *   Cuando el demo está activo, el HOME (DashboardLive) y los CHIPS del agente
 *   (AgentScreen) se RE-DERIVAN como si el usuario fuera el perfil simulado —
 *   reutilizando exactamente los selectores puros ya testeados
 *   (homeModuleSelector / profileChipSelector). No duplicamos lógica de
 *   gating: solo le entregamos a esos selectores un PERFIL SINTÉTICO del rol
 *   elegido y apagamos el bypass de operador (esOperador=false), porque el
 *   punto es ver la vista ESTRECHA de la persona, no la vista total.
 *
 * GATE DURO DE SEGURIDAD:
 *   TODA lectura/escritura del override pasa por `esOperadorActual()`. Para un
 *   usuario real (no operador) el módulo es un NO-OP total: `getDemoOverride()`
 *   devuelve `null` aunque sessionStorage tuviera un valor sembrado a mano, y
 *   `setDemoRole`/`clearDemo` no escriben nada. Así el switch es INVISIBLE e
 *   inalcanzable para usuarios reales y NUNCA puede estrecharles la app.
 *
 * PERSISTENCIA:
 *   `sessionStorage` (no localStorage): el modo demo es efímero — se limpia al
 *   cerrar la pestaña, para que una demo no "se quede pegada" en la sesión real
 *   del operador al día siguiente. Si no hay `sessionStorage` (SSR/test sin
 *   DOM) el módulo degrada a no-op sin lanzar.
 *
 * NO TOCA EL PERFIL REAL:
 *   El override vive en su propia clave; jamás escribe `chagra:profile:v1`. Al
 *   salir del demo, el home/chips vuelven a derivarse del perfil real del
 *   operador (que con el bypass de operador = ve todo).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module demoProfile
 */

import { esOperadorActual } from '../config/glaciarAccess.js';
import { PROFILE_ROLES } from './profileChipSelector.js';

/**
 * Clave de sessionStorage donde vive el rol simulado del demo. Efímera a
 * propósito (ver doc del módulo). El sufijo `:v1` sigue la convención del repo.
 * @constant {string}
 */
export const DEMO_OVERRIDE_KEY = 'chagra:demo-profile:v1';

/**
 * Evento same-tab que se emite al activar/cambiar/salir del demo, para que los
 * componentes ya montados (banner, home, chips) re-deriven en caliente sin
 * recargar. Patrón idéntico a `chagra:module-visibility-changed`.
 * @constant {string}
 */
export const DEMO_CHANGED_EVENT = 'chagra:demo-profile-changed';

/**
 * Roles que el operador puede SIMULAR. Incluye un pseudo-rol `urbano` (que NO
 * es un PROFILE_ROLE de producto: el urbano deriva a `campesino` pero con el
 * OVERRIDE urbano del homeModuleSelector que oculta Cerdos/Insumos/Zonas). Lo
 * exponemos como opción de demo PORQUE es justamente la vista más estrecha y
 * la más pedida en demos ("muéstrame cómo lo ve alguien con materas en el
 * balcón"). El resto son PROFILE_ROLES reales.
 *
 * El ORDEN aquí es el orden en que se pintan los botones del selector.
 *
 * @type {ReadonlyArray<{ id: string, label: string, emoji: string, descripcion: string }>}
 */
export const DEMO_ROLES = Object.freeze([
  {
    id: PROFILE_ROLES.campesino,
    label: 'Campesino',
    emoji: '🌽',
    descripcion: 'Productor agrícola — núcleo de cultivo, sin seguimiento pecuario.',
  },
  {
    id: 'urbano',
    label: 'Urbano (terraza)',
    emoji: '🪴',
    descripcion: 'Cultivo en balcón/terraza — vista mínima, SIN Cerdos ni Zonas.',
  },
  {
    id: PROFILE_ROLES.ganadero,
    label: 'Ganadero',
    emoji: '🐖',
    descripcion: 'Pecuario/silvopastoril — incluye seguimiento de Cerdos.',
  },
  {
    id: PROFILE_ROLES.restaurador,
    label: 'Restaurador',
    emoji: '🌳',
    descripcion: 'Restauración ecológica — biodiversidad, reforestación y páramo.',
  },
  {
    id: PROFILE_ROLES.guia_glaciar,
    label: 'Guía de glaciar',
    emoji: '🏔️',
    descripcion: 'Alta montaña — clima de páramo y restauración (La Cordada).',
  },
  {
    id: PROFILE_ROLES.socio,
    label: 'Socio / aliado',
    emoji: '🤝',
    descripcion: 'Observador general — vista corta de lectura.',
  },
  {
    id: PROFILE_ROLES.tecnico,
    label: 'Técnico / agrónomo',
    emoji: '🧪',
    descripcion: 'Set amplio — lo ve todo (sabe usar el catálogo completo).',
  },
]);

/** Set de ids de rol válidos para validar el override leído. */
const VALID_DEMO_ROLE_IDS = new Set(DEMO_ROLES.map((r) => r.id));

/**
 * Perfiles SINTÉTICOS por rol de demo. Cada uno es el `chagra:profile` mínimo
 * que, al pasarlo a `selectHomeModules`/`selectChipDefs`, hace que `deriveRole`
 * resuelva EXACTAMENTE el rol que queremos simular y dispara los extras
 * correctos (animales → silvopastoreo/cerdos, objetivo → biodiversidad…).
 *
 * REGLA: estos perfiles NO se guardan nunca como perfil real; solo se le pasan
 * a los selectores puros en caliente. Por eso no incluyen datos personales
 * (nombre, ubicación): solo lo que el gating necesita.
 *
 * @type {Record<string, Object>}
 */
const DEMO_SYNTHETIC_PROFILES = Object.freeze({
  [PROFILE_ROLES.campesino]: { rol: PROFILE_ROLES.campesino, vocacion: 'campesino' },
  // Urbano: NO es un rol; es vocacion 'urbano' + finca_tipo balcon, que dispara
  // el OVERRIDE urbano del homeModuleSelector (vista mínima, sin Cerdos/Zonas).
  urbano: { vocacion: 'urbano', finca_tipo: 'balcon' },
  // Ganadero: rol explícito + animales con cerdos → silvopastoreo + Cerdos.
  [PROFILE_ROLES.ganadero]: {
    rol: PROFILE_ROLES.ganadero,
    vocacion: 'campesino',
    animales: ['cerdos', 'gallinas'],
  },
  // Restaurador: rol explícito + objetivo biodiversidad → módulo biodiversidad
  // + tarjetas reforestación/páramo.
  [PROFILE_ROLES.restaurador]: {
    rol: PROFILE_ROLES.restaurador,
    objetivo: ['biodiversidad'],
  },
  [PROFILE_ROLES.guia_glaciar]: { rol: PROFILE_ROLES.guia_glaciar },
  [PROFILE_ROLES.socio]: { rol: PROFILE_ROLES.socio },
  [PROFILE_ROLES.tecnico]: { rol: PROFILE_ROLES.tecnico, vocacion: 'tecnico' },
});

/**
 * ¿Hay `sessionStorage` disponible? (tests/SSR sin DOM → no).
 * @returns {boolean}
 */
function hasSessionStorage() {
  try {
    return typeof window !== 'undefined' && !!window.sessionStorage;
  } catch (_) {
    return false;
  }
}

/**
 * Lee el rol de demo RAW de sessionStorage (SIN gate de operador ni validación).
 * Uso interno. Devuelve null si no hay, no es válido, o no hay storage.
 * @returns {string|null}
 */
function readRawDemoRole() {
  if (!hasSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(DEMO_OVERRIDE_KEY);
    if (!raw) return null;
    return VALID_DEMO_ROLE_IDS.has(raw) ? raw : null;
  } catch (_) {
    return null;
  }
}

/**
 * Emite el evento same-tab de cambio de demo (best-effort, no lanza).
 * @param {string|null} role — rol activo tras el cambio (o null si salió).
 */
function emitDemoChanged(role) {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(DEMO_CHANGED_EVENT, { detail: { role } }));
    }
  } catch (_) {
    /* noop — entornos sin CustomEvent */
  }
}

/**
 * Rol de demo ACTIVO, con GATE DURO de operador.
 *
 * Devuelve el rol simulado SOLO si (a) el usuario logueado es OPERADOR y (b)
 * hay un rol válido sembrado en sessionStorage. Para CUALQUIER otro caso
 * (usuario real, sin override, override corrupto, sin storage) devuelve null.
 *
 * Este es el único punto que el resto de la app debe consultar para saber "si
 * el demo está activo y como qué perfil". La invisibilidad para usuarios reales
 * se garantiza AQUÍ: aunque alguien siembre `chagra:demo-profile:v1` a mano en
 * un navegador no-operador, esta función igual devuelve null.
 *
 * @returns {string|null} id de rol de DEMO_ROLES, o null.
 */
export function getDemoOverride() {
  if (!esOperadorActual()) return null;
  return readRawDemoRole();
}

/**
 * ¿El modo demo está activo (operador simulando un perfil)? Azúcar booleana
 * sobre `getDemoOverride`. También gated.
 * @returns {boolean}
 */
export function isDemoActive() {
  return getDemoOverride() != null;
}

/**
 * Activa (o cambia) el rol simulado del demo. GATED: si el usuario NO es
 * operador, es un NO-OP (no escribe nada, devuelve false) — un usuario real
 * jamás puede activarse el modo demo.
 *
 * @param {string} role — id de rol de DEMO_ROLES.
 * @returns {boolean} true si quedó activado; false si se ignoró (no operador /
 *   rol inválido / sin storage).
 */
export function setDemoRole(role) {
  if (!esOperadorActual()) return false;
  if (!VALID_DEMO_ROLE_IDS.has(role)) return false;
  if (!hasSessionStorage()) return false;
  try {
    window.sessionStorage.setItem(DEMO_OVERRIDE_KEY, role);
    emitDemoChanged(role);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Sale del modo demo (borra el override). GATED por consistencia, aunque
 * borrar de más no haría daño: si no es operador, igual limpiamos cualquier
 * residuo y emitimos el evento, pero solo si hay storage.
 *
 * @returns {void}
 */
export function clearDemo() {
  if (!hasSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(DEMO_OVERRIDE_KEY);
  } catch (_) {
    /* noop */
  }
  emitDemoChanged(null);
}

/**
 * Metadatos (label/emoji/descripcion) del rol de demo activo, para el banner.
 * @returns {{ id: string, label: string, emoji: string, descripcion: string }|null}
 */
export function getActiveDemoRoleMeta() {
  const role = getDemoOverride();
  if (!role) return null;
  return DEMO_ROLES.find((r) => r.id === role) || null;
}

/**
 * Núcleo de integración con los selectores. Dado el perfil REAL y las `opts`
 * que el call-site iba a pasar a `selectHomeModules`/`selectChipDefs`, devuelve
 * el PERFIL y las OPTS EFECTIVOS a usar:
 *
 *   - Demo INACTIVO (o no operador): devuelve el perfil y opts tal cual (con el
 *     `esOperador` que el call-site ya calculó). Comportamiento idéntico al
 *     actual — cero impacto.
 *   - Demo ACTIVO (operador simulando rol X): devuelve el PERFIL SINTÉTICO del
 *     rol X y fuerza `esOperador:false` (queremos la vista ESTRECHA de la
 *     persona, no el bypass) y `esGuiaGlaciar` = (X === guia_glaciar) para que
 *     el tile/whitelist de glaciar se simule coherente. Conserva el resto de
 *     opts (p. ej. `moduleVisibility`) que el call-site haya pasado.
 *
 * Así los call-sites NO necesitan saber nada del demo: envuelven su par
 * (profile, opts) con esta función y siguen llamando a los mismos selectores.
 *
 * @param {Object} realProfile — perfil real del usuario (getProfile()).
 * @param {Object} [opts] — opts que el call-site pasaría al selector.
 * @returns {{ profile: Object, opts: Object }} par efectivo a pasar al selector.
 */
export function applyDemoToSelector(realProfile, opts = {}) {
  const role = getDemoOverride();
  if (!role) {
    // Sin demo: passthrough exacto (no alteramos nada).
    return { profile: realProfile, opts };
  }
  const syntheticProfile = DEMO_SYNTHETIC_PROFILES[role] || DEMO_SYNTHETIC_PROFILES[PROFILE_ROLES.campesino];
  return {
    profile: syntheticProfile,
    opts: {
      ...opts,
      // Vista de la PERSONA, no del operador: apagamos el bypass total.
      esOperador: false,
      // Coherencia del gate glaciar al simular al guía.
      esGuiaGlaciar: role === PROFILE_ROLES.guia_glaciar,
    },
  };
}
