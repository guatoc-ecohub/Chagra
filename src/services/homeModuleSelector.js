/**
 * homeModuleSelector.js — Selección ADAPTATIVA de los MÓDULOS del HOME POR
 * PERFIL. Gemelo de `profileChipSelector` pero para el dashboard (no para los
 * chips del agente).
 *
 * Problema que resuelve: el Home (`DashboardLive`) mostraba SIEMPRE todos los
 * módulos + las 4 tarjetas de seguimiento (Reforestación · Silvopastoreo ·
 * Páramo · Cerdos) a todo el mundo. Principio del producto: "el usuario solo
 * ve lo que necesita" — un usuario urbano de balcón NUNCA debe ver la tarjeta
 * de Cerdos ni la de silvopastoreo; un guía de glaciar no necesita el
 * inventario de insumos. El perfil del onboarding (`rol`/`vocacion`/
 * `finca_tipo`/`animales`/`objetivo`) debe fijar QUÉ se ve por DEFECTO.
 *
 * Este módulo es PURO (sin red, sin React, sin localStorage): mapea un perfil
 * de usuario → la lista de módulos del home + las tarjetas de seguimiento que
 * le corresponden. Toda la lógica vive aquí para testearla en aislamiento
 * (TDD), igual que `profileChipSelector.selectChipIntents`.
 *
 * REUSO: la derivación de ROL vive en `profileChipSelector.deriveRole` (fuente
 * única — no se duplica). Este módulo la importa y mapea cada rol a su set de
 * módulos. El gating de seguridad del módulo glaciar (whitelist La Cordada)
 * NO vive aquí: el tile glaciar tiene su propio gate (`glaciarAccess`).
 *
 * RESPETO A #1560/#7003: este módulo SOLO calcula el DEFAULT por perfil. Si el
 * usuario guardó una preferencia manual de visibilidad en `ProfileScreen`, esa
 * preferencia GANA — el call-site (DashboardLive) decide cuál usar. Aquí no se
 * lee ni se escribe ninguna preferencia.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module homeModuleSelector
 */

import { deriveRole, profileTieneAnimales, PROFILE_ROLES } from './profileChipSelector.js';

/**
 * IDs de los módulos del Home (deben coincidir con `HOME_MODULES` de
 * userProfileService + `SECTION_COMPONENTS` de DashboardLive). Fuente de
 * verdad de los ids: userProfileService.HOME_MODULES — aquí solo los nombramos
 * para los sets por rol. Si se agrega un módulo nuevo allá, agregarlo al set
 * del rol que lo necesite aquí (default fail-open en el call-site lo cubre
 * mientras tanto).
 *
 * @enum {string}
 */
export const HOME_MODULE_IDS = Object.freeze({
  hoyfinca: 'hoyfinca',
  clima: 'clima',
  analisis: 'analisis',
  asociaciones: 'asociaciones',
  plantas: 'plantas',
  zonas: 'zonas',
  insumos: 'insumos',
  bitacora: 'bitacora',
  hoy: 'hoy',
  plagas: 'plagas',
  biodiversidad: 'biodiversidad',
  informes: 'informes',
});

/**
 * Lista completa de ids de módulos del home (el set "todo visible"). Es la
 * base del rol técnico (que lo ve todo) y el fallback.
 * @type {readonly string[]}
 */
export const ALL_HOME_MODULES = Object.freeze(Object.values(HOME_MODULE_IDS));

/**
 * Keys de las 4 tarjetas de SEGUIMIENTO de procesos de finca. Deben coincidir
 * con las `key` de `config/seguimientoProcesos.js` (reforestacion ·
 * silvopastoreo · paramo · cerdos). Las nombramos aquí para no acoplar este
 * módulo puro al import del catálogo de seguimiento (que arrastra estilos).
 *
 * @enum {string}
 */
export const SEGUIMIENTO_KEYS = Object.freeze({
  reforestacion: 'reforestacion',
  silvopastoreo: 'silvopastoreo',
  paramo: 'paramo',
  cerdos: 'cerdos',
});

/**
 * Set MÍNIMO para el usuario urbano (balcón/terraza/patio). Es un OVERRIDE
 * DURO: aunque `deriveRole` devuelva otra cosa, si el perfil es urbano gana
 * este set. NUNCA incluye cerdos/silvopastoreo/reforestación/páramo/zonas/
 * insumos — el urbano cultiva en materas, no maneja ganado ni parcelas.
 * @type {readonly string[]}
 */
const URBANO_MODULES = Object.freeze([
  HOME_MODULE_IDS.plantas,
  HOME_MODULE_IDS.asociaciones,
  HOME_MODULE_IDS.plagas,
  HOME_MODULE_IDS.bitacora,
  HOME_MODULE_IDS.clima,
  HOME_MODULE_IDS.hoyfinca,
]);

/**
 * Núcleo del campesino productor. Orden = relevancia para producir comida.
 * Los demás roles productivos parten de este núcleo.
 * @type {readonly string[]}
 */
const CAMPESINO_MODULES = Object.freeze([
  HOME_MODULE_IDS.hoyfinca,
  HOME_MODULE_IDS.clima,
  HOME_MODULE_IDS.asociaciones,
  HOME_MODULE_IDS.plantas,
  HOME_MODULE_IDS.plagas,
  HOME_MODULE_IDS.bitacora,
  HOME_MODULE_IDS.insumos,
  HOME_MODULE_IDS.zonas,
  HOME_MODULE_IDS.informes,
  HOME_MODULE_IDS.analisis,
]);

/**
 * Núcleo-core campesino (subconjunto sin insumos/zonas/informes/analisis),
 * base para el restaurador, al que le sumamos biodiversidad.
 * @type {readonly string[]}
 */
const CAMPESINO_CORE = Object.freeze([
  HOME_MODULE_IDS.hoyfinca,
  HOME_MODULE_IDS.clima,
  HOME_MODULE_IDS.plantas,
  HOME_MODULE_IDS.asociaciones,
  HOME_MODULE_IDS.plagas,
  HOME_MODULE_IDS.bitacora,
]);

/**
 * Conjunto de módulos visibles por ROL (sin contar el override urbano ni los
 * extras por animales/objetivo, que se aplican en `selectHomeModules`).
 * @type {Record<string, readonly string[]>}
 */
const ROLE_MODULES = Object.freeze({
  [PROFILE_ROLES.campesino]: CAMPESINO_MODULES,
  // Ganadero = campesino + (silvopastoreo/cerdos van por SEGUIMIENTO, no módulo).
  [PROFILE_ROLES.ganadero]: CAMPESINO_MODULES,
  // Restaurador = campesino-core + biodiversidad.
  [PROFILE_ROLES.restaurador]: Object.freeze([
    ...CAMPESINO_CORE,
    HOME_MODULE_IDS.biodiversidad,
  ]),
  // Guía de glaciar: alta montaña — clima, el día y la biodiversidad de páramo.
  // (El tile "Reporte de Punto Glaciar" tiene su propio gate en glaciarAccess.)
  [PROFILE_ROLES.guia_glaciar]: Object.freeze([
    HOME_MODULE_IDS.clima,
    HOME_MODULE_IDS.hoyfinca,
    HOME_MODULE_IDS.biodiversidad,
  ]),
  // Socio / aliado / observador: vista corta de lectura.
  [PROFILE_ROLES.socio]: Object.freeze([
    HOME_MODULE_IDS.hoyfinca,
    HOME_MODULE_IDS.plantas,
    HOME_MODULE_IDS.clima,
    HOME_MODULE_IDS.informes,
  ]),
  // Técnico/agrónomo: lo ve TODO (sabe usar el set completo).
  [PROFILE_ROLES.tecnico]: ALL_HOME_MODULES,
});

/**
 * Tarjetas de seguimiento por ROL (sin contar el filtro de animales del
 * ganadero, que se aplica en `selectHomeModules`).
 * @type {Record<string, readonly string[]>}
 */
const ROLE_SEGUIMIENTO = Object.freeze({
  [PROFILE_ROLES.campesino]: Object.freeze([]),
  // Ganadero: silvopastoreo SIEMPRE; cerdos SOLO si el perfil tiene cerdos
  // (se resuelve en selectHomeModules). Aquí dejamos silvopastoreo de base.
  [PROFILE_ROLES.ganadero]: Object.freeze([SEGUIMIENTO_KEYS.silvopastoreo]),
  [PROFILE_ROLES.restaurador]: Object.freeze([
    SEGUIMIENTO_KEYS.reforestacion,
    SEGUIMIENTO_KEYS.paramo,
  ]),
  [PROFILE_ROLES.guia_glaciar]: Object.freeze([
    SEGUIMIENTO_KEYS.paramo,
    SEGUIMIENTO_KEYS.reforestacion,
  ]),
  [PROFILE_ROLES.socio]: Object.freeze([]),
  // Técnico: ve las 4 tarjetas (acompaña cualquier proceso).
  [PROFILE_ROLES.tecnico]: Object.freeze([
    SEGUIMIENTO_KEYS.reforestacion,
    SEGUIMIENTO_KEYS.silvopastoreo,
    SEGUIMIENTO_KEYS.paramo,
    SEGUIMIENTO_KEYS.cerdos,
  ]),
});

/** Set de ids de módulos válidos (para filtrar/dedupe). */
const VALID_MODULES = new Set(ALL_HOME_MODULES);
/** Set de keys de seguimiento válidas (para filtrar/dedupe). */
const VALID_SEGUIMIENTO = new Set(Object.values(SEGUIMIENTO_KEYS));

/**
 * Normaliza un string a minúsculas sin tildes ni espacios sobrantes. Tolerante
 * a `null`/no-string (devuelve ''). Igual criterio que profileChipSelector.
 * @param {unknown} v
 * @returns {string}
 */
function norm(v) {
  if (typeof v !== 'string') return '';
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * ¿El perfil es URBANO? El override urbano se dispara por DOS señales (el
 * brief): `vocacion === 'urbano'` O `finca_tipo ∈ {balcon, terraza}`.
 * @param {Object} profile
 * @returns {boolean}
 */
export function esPerfilUrbano(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};
  if (norm(p.vocacion) === 'urbano') return true;
  const fincaTipo = norm(p.finca_tipo);
  return fincaTipo === 'balcon' || fincaTipo === 'terraza';
}

/**
 * ¿El perfil declara tener CERDOS específicamente? El array multi `animales`
 * del onboarding. Solo los cerdos activan la tarjeta de seguimiento de cerdos
 * (gallinas/ganado → silvopastoreo, NO cerdos).
 * @param {Object} profile
 * @returns {boolean}
 */
export function profileTieneCerdos(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const arr = p.animales;
  if (Array.isArray(arr) && arr.map(norm).includes('cerdos')) return true;
  // Respaldo: el usuario escribió cerdos/marranos en texto libre.
  const libre = norm(p.cultivos_actuales) + ' ' + norm(p.cultivos_interes);
  return /\b(cerdo|cerdos|marrano|marranos|porcino|porcinos|porcicultura)\b/.test(libre);
}

/**
 * Filtra + dedupe preservando el primer orden visto, contra un set de válidos.
 * @param {Iterable<string>} ids
 * @param {Set<string>} valid
 * @returns {string[]}
 */
function dedupeValid(ids, valid) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (!valid.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * API de alto nivel: del PERFIL completo → módulos del home + tarjetas de
 * seguimiento que le corresponden a este usuario POR DEFECTO.
 *
 * Reglas (el brief, ancladas a ADR-017/ADR-011/ADR-034):
 *   - URBANO (vocacion 'urbano' O finca_tipo balcon/terraza): OVERRIDE DURO →
 *     SOLO {plantas, plagas, bitacora, clima, hoyfinca}. NUNCA cerdos/
 *     silvopastoreo/reforestacion/paramo/zonas/insumos. Gana aunque el rol
 *     derivado diga otra cosa.
 *   - CAMPESINO: núcleo de cultivo, sin seguimiento por defecto (salvo que
 *     animales/objetivo lo activen).
 *   - GANADERO (tiene animales): campesino + seguimiento silvopastoreo;
 *     + cerdos SOLO si `animales` incluye 'cerdos'.
 *   - RESTAURADOR: campesino-core + biodiversidad + seguimiento
 *     {reforestacion, paramo}.
 *   - GUÍA GLACIAR: {clima, hoyfinca, biodiversidad} + seguimiento
 *     {paramo, reforestacion}. (El tile glaciar tiene su propio gate.)
 *   - SOCIO: set corto {hoyfinca, plantas, clima, informes}. TÉCNICO: todo.
 *
 * Además, transversal a los roles productivos no-urbanos:
 *   - Si el perfil tiene animales (cualquier rol no urbano), asegura la
 *     tarjeta de silvopastoreo (el ángulo pecuario), y cerdos si hay cerdos.
 *   - Si el objetivo incluye biodiversidad/restauración, asegura el módulo de
 *     biodiversidad + las tarjetas de reforestación/páramo.
 *
 * @param {Object} profile — perfil del usuario (chagra:profile:v1).
 * @param {Object} [opts]
 * @param {boolean} [opts.esOperador=false] - el usuario es OPERADOR (admin/demo/
 *   debug, whitelist en glaciarAccess). BYPASS del gating: ve TODO. Tiene
 *   PRECEDENCIA sobre el override urbano y sobre los mapas por rol.
 * @param {boolean} [opts.esGuiaGlaciar=false] - username en whitelist Cordada
 *   (lo resuelve el call-site con glaciarAccess, fuera de este módulo puro).
 * @returns {{ visibles: string[], seguimiento: string[] }} ids de módulos del
 *   home visibles + keys de tarjetas de seguimiento, ambos filtrados y sin
 *   duplicados.
 */
export function selectHomeModules(profile, opts = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};

  // ── BYPASS OPERADOR (PRIMER check, gana sobre TODO) ──────────────────────
  // El operador (admin/demo/debug) ve SIEMPRE el home completo: todos los
  // módulos + las 4 tarjetas de seguimiento (incluida Cerdos). Va ANTES del
  // override urbano y de los mapas por rol, porque su criterio de éxito es
  // "ver todo para demos y debug", no una vista por perfil. (Que el operador
  // esté en la Cordada — para ver el tile glaciar — NO debe estrecharle el
  // home: ese era el bug que esto corrige.)
  if (opts.esOperador) {
    return {
      visibles: dedupeValid(ALL_HOME_MODULES, VALID_MODULES),
      seguimiento: dedupeValid(Object.values(SEGUIMIENTO_KEYS), VALID_SEGUIMIENTO),
    };
  }

  // ── OVERRIDE DURO: urbano ───────────────────────────────────────────────
  // Gana sobre cualquier rol derivado. Set mínimo, SIN seguimiento (un balcón
  // no maneja cerdos/silvopastoreo/reforestación/páramo).
  if (esPerfilUrbano(p)) {
    return {
      visibles: dedupeValid(URBANO_MODULES, VALID_MODULES),
      seguimiento: [],
    };
  }

  // ── Rol de producto (reusa deriveRole de profileChipSelector) ────────────
  const role = deriveRole(p, opts);

  const baseModules = ROLE_MODULES[role] || ROLE_MODULES[PROFILE_ROLES.campesino];
  const baseSeguimiento = ROLE_SEGUIMIENTO[role] || ROLE_SEGUIMIENTO[PROFILE_ROLES.campesino];

  const modules = [...baseModules];
  const seguimiento = [...baseSeguimiento];

  const tieneAnimales = profileTieneAnimales(p);
  const tieneCerdos = profileTieneCerdos(p);

  const objetivos = Array.isArray(p.objetivo) ? p.objetivo.map(norm) : [];
  const restauraObjetivo = Array.isArray(p.restauracion_objetivo)
    ? p.restauracion_objetivo.map(norm)
    : [];
  const quiereRestauracion =
    objetivos.includes('biodiversidad') || restauraObjetivo.length > 0;

  // Animales (no urbano): asegurar silvopastoreo; cerdos solo si hay cerdos.
  if (tieneAnimales && !seguimiento.includes(SEGUIMIENTO_KEYS.silvopastoreo)) {
    seguimiento.push(SEGUIMIENTO_KEYS.silvopastoreo);
  }
  if (tieneCerdos && !seguimiento.includes(SEGUIMIENTO_KEYS.cerdos)) {
    seguimiento.push(SEGUIMIENTO_KEYS.cerdos);
  }

  // Objetivo de restauración/biodiversidad: módulo biodiversidad + tarjetas.
  if (quiereRestauracion) {
    if (!modules.includes(HOME_MODULE_IDS.biodiversidad)) {
      modules.push(HOME_MODULE_IDS.biodiversidad);
    }
    for (const k of [SEGUIMIENTO_KEYS.reforestacion, SEGUIMIENTO_KEYS.paramo]) {
      if (!seguimiento.includes(k)) seguimiento.push(k);
    }
  }

  return {
    visibles: dedupeValid(modules, VALID_MODULES),
    seguimiento: dedupeValid(seguimiento, VALID_SEGUIMIENTO),
  };
}

/**
 * Conveniencia para el call-site (DashboardLive): del perfil → un mapa
 * `{ moduleId: boolean }` listo para usar como `moduleVisibility` por DEFECTO,
 * con la MISMA forma que devuelve `userProfileService.getModuleVisibility()`.
 * Cada id de `ALL_HOME_MODULES` queda en true/false según el perfil.
 *
 * @param {Object} profile
 * @param {Object} [opts] - igual que selectHomeModules (esGuiaGlaciar).
 * @returns {Record<string, boolean>}
 */
export function selectHomeModuleVisibilityMap(profile, opts = {}) {
  const { visibles } = selectHomeModules(profile, opts);
  const visibleSet = new Set(visibles);
  /** @type {Record<string,boolean>} */
  const map = {};
  for (const id of ALL_HOME_MODULES) {
    map[id] = visibleSet.has(id);
  }
  return map;
}

/**
 * Conveniencia para el gating de las tarjetas de seguimiento: ¿esta key de
 * seguimiento debe mostrarse para este perfil? Lo usa DashboardLive para
 * filtrar las 4 tarjetas (urbano NO renderiza Cerdos).
 *
 * @param {string} key — key de seguimiento (reforestacion/silvopastoreo/…).
 * @param {Object} profile
 * @param {Object} [opts]
 * @returns {boolean}
 */
export function isSeguimientoVisible(key, profile, opts = {}) {
  const { seguimiento } = selectHomeModules(profile, opts);
  return seguimiento.includes(key);
}
