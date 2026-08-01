/**
 * profilePresets.js — Selector de PERFIL in-app (tarea #33).
 *
 * QUÉ RESUELVE (operador, demo en vivo 2026-06-19): "nunca he visto cómo
 * switchear a los perfiles corporativos". No existía un control para cambiar el
 * perfil/rol activo desde la app: el `rol` solo se fijaba en el onboarding y
 * luego quedaba inmutable durante la sesión. Para una demo (y para usuarios que
 * cambian de actividad) hace falta un switch rápido que cambie QUÉ se muestra:
 * los chips del agente, los módulos del home y las asociaciones por rol.
 *
 * CÓMO FUNCIONA (sin inventar features falsas)
 *   Cada preset es una etiqueta de demo (campesino, cafetero, cacaotero,
 *   corporativo) mapeada a un `rol` REAL que ya existe en el producto:
 *     - los `rol` `cafetero` / `cacaotero` YA existen en los datos de
 *       asociaciones (src/data/asociaciones-arquetipos.json), así que cambiar a
 *       ellos filtra el módulo Asociaciones a los arquetipos SAF-café / SAF-cacao
 *       reales — comportamiento existente, no fabricado.
 *     - `corporativo` mapea al rol de producto `tecnico` (PROFILE_ROLES.tecnico:
 *       agrónomo/asesor, set amplio de herramientas) — el rol existente más
 *       cercano a una vista institucional/empresa. NO crea un set de capacidades
 *       inventado: reutiliza el set amplio que ya define profileChipSelector.
 *
 * El switch escribe el `rol` (y un `perfil_demo` para recordar la etiqueta
 * elegida) en el perfil persistido (userProfileService) y emite
 * `chagra:profile-changed` para que el home re-derive su gating en vivo.
 *
 * NO es un rol de seguridad: igual que el resto del perfil, es 100% client-side
 * y solo afina la EXPERIENCIA (qué se muestra primero). La autorización real
 * vive en farmOS (tokens OAuth).
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 *
 * @module profilePresets
 */

import { PROFILE_ROLES } from './profileChipSelector.js';
import { saveProfile, getProfile } from './userProfileService.js';
import { setOperatorOverride } from '../config/glaciarAccess.js';
import { seedProfileData } from './demoPersonaSeeds.js';

/** Evento same-tab que emite el switch al cambiar de perfil. */
export const PROFILE_CHANGED_EVENT = 'chagra:profile-changed';

/**
 * Presets de perfil disponibles en el switch in-app.
 *
 * Campos:
 *   - id:    clave estable que se guarda en el perfil (`perfil_demo`).
 *   - label: texto corto para el botón (móvil-first, una línea).
 *   - emoji: ícono de reconocimiento rápido.
 *   - desc:  qué cambia al elegirlo (copy honesto, sin prometer features falsas).
 *   - rol:   `rol` REAL de PROFILE_ROLES (o un rol de datos existente como
 *            cafetero/cacaotero) que el preset activa.
 *
 * @type {ReadonlyArray<{id:string,label:string,emoji:string,desc:string,rol:string}>}
 */
export const PROFILE_PRESETS = Object.freeze([
  Object.freeze({
    id: 'campesino',
    label: 'Campesino/a',
    emoji: '🌱',
    desc: 'Cultivo de comida: siembra, calendario, plagas y biopreparados.',
    rol: PROFILE_ROLES.campesino,
  }),
  Object.freeze({
    id: 'cafetero',
    label: 'Cafetero/a',
    emoji: '☕',
    desc: 'Café con sombra: asociaciones y SAF de café.',
    rol: 'cafetero',
  }),
  Object.freeze({
    id: 'cacaotero',
    label: 'Cacaotero/a',
    emoji: '🍫',
    desc: 'Cacao bajo dosel: asociaciones y SAF de cacao.',
    rol: 'cacaotero',
  }),
  Object.freeze({
    id: 'corporativo',
    label: 'Corporativo / Empresa',
    emoji: '🏢',
    desc: 'Vista amplia de asesor: todas las herramientas a la mano.',
    // Rol de producto existente más cercano a una vista institucional: el
    // técnico/agrónomo trae el set amplio (cultivo + restauración). No se
    // inventa un set nuevo.
    rol: PROFILE_ROLES.tecnico,
  }),
]);

/**
 * Devuelve el preset por su id (o null si no existe).
 * @param {string} id
 * @returns {object|null}
 */
export function getPresetById(id) {
  if (!id || typeof id !== 'string') return null;
  return PROFILE_PRESETS.find((p) => p.id === id) || null;
}

/**
 * Resuelve el id del preset ACTIVO a partir del perfil guardado.
 *
 * Prioridad:
 *   1. `perfil_demo` explícito (lo escribió este mismo switch).
 *   2. inferir por `rol` (si el rol coincide con el de algún preset).
 *   3. fallback 'campesino' (el más general).
 *
 * @param {object} [profile] - perfil; si se omite, se lee de localStorage.
 * @returns {string} id de preset (siempre uno válido).
 */
export function getActivePresetId(profile) {
  const p = profile && typeof profile === 'object' ? profile : getProfile();
  if (p?.perfil_demo && getPresetById(p.perfil_demo)) return p.perfil_demo;
  if (p?.rol) {
    const byRol = PROFILE_PRESETS.find((preset) => preset.rol === p.rol);
    if (byRol) return byRol.id;
  }
  return 'campesino';
}

/**
 * Aplica un preset: persiste `rol` + `perfil_demo` en el perfil y emite el
 * evento `chagra:profile-changed` para que el home (y quien escuche) re-derive
 * su gating en vivo. NO toca el resto del perfil (finca, altitud, etc.).
 *
 * CHANGE LOG (demo-personas 2026-06-20):
 * - Desactiva "Visión total" automáticamente al elegir un perfil demo para que
 *   las diferencias entre perfiles sean visibles (la visión total enmascara los
 *   filtros por rol).
 * - Carga datos semilla específicos del perfil (cultivos, animales, fincas) en
 *   IndexedDB para que cada persona tenga su propia finca demo rica y coherente.
 *
 * @param {string} presetId — id de PROFILE_PRESETS.
 * @returns {Promise<object|null>} perfil resultante, o null si el id es inválido.
 */
export async function applyProfilePreset(presetId) {
  const preset = getPresetById(presetId);
  if (!preset) return null;

  // Desactivar "Visión total" para que las diferencias de perfil sean visibles
  // (la visión total enmascara los filtros por rol mostrando todo siempre).
  setOperatorOverride(false);

  const profile = saveProfile({ rol: preset.rol, perfil_demo: preset.id });

  // Cargar datos semilla específicos del perfil (async, non-blocking)
  try {
    await seedProfileData(presetId);
  } catch (error) {
    console.warn('[profilePresets] Error seeding profile data:', error);
    // No fallamos el switch si el seed falla - el perfil sigue cambiado
  }

  try {
    window.dispatchEvent(
      new CustomEvent(PROFILE_CHANGED_EVENT, {
        detail: { presetId: preset.id, rol: preset.rol },
      })
    );
  } catch (_) {
    /* SSR/tests sin window: el perfil ya quedó persistido. */
  }
  return profile;
}
