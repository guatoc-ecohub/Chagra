/**
 * demoProfile.js — SWITCH DE DEMO POR PERFIL (solo OPERADOR).
 *
 * Permite al operador simular diferentes perfiles de usuario sin cambiar su
 * perfil real. Persiste en localStorage con clave `chagra:profile:v1` y emite
 * evento `chagra:profile:demo-switched` para que los componentes reaccionen.
 *
 * @module demoProfile
 */

const DEMO_PROFILE_KEY = 'chagra:profile:v1';
const DEMO_SWITCH_KEY = 'chagra:demo:switch-active';
const DEMO_SWITCHED_EVENT = 'chagra:profile:demo-switched';

export const DEMO_PROFILES = Object.freeze([
  {
    id: 'campesino',
    label: 'Campesino',
    emoji: '🌽',
    profile: {
      rol: 'campesino',
      vocacion: 'campesino',
      animales: ['gallinas'],
      cultivos_actuales: 'cafe, mora',
      finca_tipo: 'rural',
    },
  },
  {
    id: 'urbano',
    label: 'Urbano (terraza)',
    emoji: '🪴',
    profile: {
      rol: 'campesino',
      vocacion: 'urbano',
      finca_tipo: 'balcon',
      cultivos_actuales: 'tomate, albahaca',
      animales: ['ninguno'],
    },
  },
  {
    id: 'restaurador',
    label: 'Restaurador',
    emoji: '🌳',
    profile: {
      rol: 'restaurador',
      vocacion: 'curioso',
      objetivo: ['biodiversidad'],
      restauracion_objetivo: ['bosque', 'paramo'],
    },
  },
  {
    id: 'ganadero_cerdos',
    label: 'Ganadero',
    emoji: '🐖',
    profile: {
      rol: 'ganadero',
      vocacion: 'campesino',
      animales: ['cerdos', 'ganado'],
      finca_tipo: 'rural',
    },
  },
  {
    id: 'guia_glaciar',
    label: 'Guia de glaciar',
    emoji: '🏔️',
    profile: {
      vocacion: 'campesino',
    },
  },
  {
    id: 'tecnico',
    label: 'Tecnico / agronomo',
    emoji: '🧪',
    profile: {
      rol: 'tecnico',
      vocacion: 'tecnico',
    },
  },
]);

const PROFILE_IDS = new Set(DEMO_PROFILES.map((p) => p.id));

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch (_) {
    return false;
  }
}

/**
 * Retorna el objeto de perfil para un id de demo.
 * @param {string} id
 * @returns {Object|undefined}
 */
export function getDemoProfile(id) {
  const entry = DEMO_PROFILES.find((p) => p.id === id);
  return entry ? { ...entry.profile } : undefined;
}

/**
 * Aplica un perfil demo: guarda en localStorage y emite evento.
 * @param {string} id
 * @returns {boolean}
 */
export function applyDemoProfile(id) {
  if (!PROFILE_IDS.has(id)) return false;
  if (!hasLocalStorage()) return false;
  const profile = getDemoProfile(id);
  if (!profile) return false;
  try {
    window.localStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(profile));
    window.localStorage.setItem(DEMO_SWITCH_KEY, '1');
    window.dispatchEvent(new CustomEvent(DEMO_SWITCHED_EVENT, { detail: { id, profile } }));
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Sale del modo demo: limpia localStorage y emite evento.
 */
export function clearDemoProfile() {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(DEMO_PROFILE_KEY);
    window.localStorage.removeItem(DEMO_SWITCH_KEY);
  } catch (_) {
    /* noop */
  }
  try {
    window.dispatchEvent(new CustomEvent(DEMO_SWITCHED_EVENT, { detail: null }));
  } catch (_) {
    /* noop */
  }
}

/**
 * Indica si hay un perfil demo activo.
 * @returns {boolean}
 */
export function isDemoActive() {
  if (!hasLocalStorage()) return false;
  try {
    return window.localStorage.getItem(DEMO_PROFILE_KEY) !== null;
  } catch (_) {
    return false;
  }
}
