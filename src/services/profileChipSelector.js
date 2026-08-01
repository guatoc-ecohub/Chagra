/**
 * profileChipSelector.js — Selección ADAPTATIVA de chips de modo POR PERFIL.
 *
 * Problema que resuelve: `ChipsToolbar` mostraba SIEMPRE los 10 chips de modo
 * a todo el mundo (toda la `CHIP_DEFS`). Un guía de glaciar no necesita el chip
 * de biopreparados; un campesino con gallinas no necesita el chip de páramo. La
 * "caja de herramientas" debe desplegar lo MÁS APROPIADO para cada persona.
 *
 * Este módulo es PURO (sin red, sin React, sin localStorage): mapea un perfil
 * de usuario + sus módulos visibles + su rol → la lista ORDENADA de intents de
 * chip a mostrar. Toda la lógica vive aquí para testearla en aislamiento (TDD),
 * igual que `chipIntentRouter.planForcedIntent`.
 *
 * REGLA INVIOLABLE — no inventar chips. Solo seleccionamos y ordenamos los
 * intents que YA existen en `CHIP_DEFS` (agentCapabilities.js, fuente única).
 * No hay chip "gallinas" ni "cerdos" en el manifiesto: el ángulo animal del
 * perfil se mapea al chip REAL que cubre ganado/forraje → `silvopastoreo`.
 *
 * COORDINACIÓN: otro stream toca la legibilidad/estilo (CSS) de los chips. Este
 * módulo NO renderiza ni estiliza nada — solo decide CUÁLES y EN QUÉ ORDEN. El
 * componente sigue pintando con su CSS actual; solo recibe una lista filtrada.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module profileChipSelector
 */

import { CHIP_DEFS, CHIP_INTENTS } from './agentCapabilities.js';

/**
 * Roles de producto reconocidos. Derivados del perfil del usuario (la pregunta
 * `rol` del onboarding, o inferidos de `vocacion`/`objetivo`/whitelists). NO son
 * roles de seguridad — son perfiles de USO que deciden qué herramientas mostrar.
 *
 * @enum {string}
 */
export const PROFILE_ROLES = Object.freeze({
  campesino: 'campesino', // Productor agrícola (vive del campo / cultivo urbano).
  restaurador: 'restaurador', // Restaurador ecológico / institucional (nativas, páramo).
  guia_glaciar: 'guia_glaciar', // Guía de alta montaña / glaciar ("La Cordada").
  ganadero: 'ganadero', // Productor pecuario / silvopastoril (animales primero).
  socio: 'socio', // Socio / aliado / observador general.
  tecnico: 'tecnico', // Técnico/a o agrónomo/a (set amplio).
});

/**
 * Chips de cultivo (núcleo campesino). Orden = relevancia para producir comida.
 * @type {readonly string[]}
 */
const CULTIVO_CHIPS = Object.freeze([
  CHIP_INTENTS.siembro,
  CHIP_INTENTS.calendario,
  CHIP_INTENTS.plaga,
  CHIP_INTENTS.biopreparado,
  CHIP_INTENTS.clima,
]);

/** Chips de consulta general. */
const GENERAL_CHIPS = Object.freeze([
  CHIP_INTENTS.precio,
]);

/** Chips de restauración ecológica. @type {readonly string[]} */
const RESTAURACION_CHIPS = Object.freeze([
  CHIP_INTENTS.restauracion,
  CHIP_INTENTS.paramo,
  CHIP_INTENTS.silvopastoreo,
]);

/**
 * Conjunto base por rol. Cada lista está EN ORDEN de prioridad (los más
 * relevantes primero, que es como los lee el campesino de izquierda a derecha).
 * Las listas pueden solaparse: el dedupe final preserva el primer orden visto.
 *
 * @type {Record<string, readonly string[]>}
 */
const ROLE_BASE_CHIPS = Object.freeze({
  [PROFILE_ROLES.campesino]: Object.freeze([
    ...CULTIVO_CHIPS,
    ...GENERAL_CHIPS,
  ]),
  [PROFILE_ROLES.restaurador]: Object.freeze([
    ...RESTAURACION_CHIPS,
    CHIP_INTENTS.siembro,
    CHIP_INTENTS.clima,
    ...GENERAL_CHIPS,
  ]),
  [PROFILE_ROLES.guia_glaciar]: Object.freeze([
    // Un guía de glaciar trabaja el clima de alta montaña y la restauración de
    // páramo; NO necesita biopreparados ni calendario de siembra. (El módulo
    // "Reporte de Punto Glaciar" es un tile del Home con su propio gate, NO un
    // chip — no existe chip 'glaciar' en el manifiesto, así que no lo inventamos.)
    CHIP_INTENTS.clima,
    ...GENERAL_CHIPS,
    CHIP_INTENTS.paramo,
    CHIP_INTENTS.restauracion,
  ]),
  [PROFILE_ROLES.ganadero]: Object.freeze([
    CHIP_INTENTS.silvopastoreo,
    CHIP_INTENTS.clima,
    ...GENERAL_CHIPS,
    CHIP_INTENTS.plaga,
    CHIP_INTENTS.siembro,
  ]),
  // Socio / observador: vista general corta (lo más usado), sin saturar.
  [PROFILE_ROLES.socio]: Object.freeze([
    CHIP_INTENTS.siembro,
    CHIP_INTENTS.clima,
    ...GENERAL_CHIPS,
    CHIP_INTENTS.plaga,
  ]),
  // Técnico/agrónomo: set amplio (sabe usar todo); orden = cultivo luego ecológico.
  [PROFILE_ROLES.tecnico]: Object.freeze([
    ...CULTIVO_CHIPS,
    ...GENERAL_CHIPS,
    ...RESTAURACION_CHIPS,
  ]),
});

/** Set de intents válidos del manifiesto (para validar/filtrar). */
const VALID_INTENTS = new Set(CHIP_DEFS.map((d) => d.intent));

/** Set de intents que son stubs (sin backend): se despriorizan, no se ocultan. */
const STUB_INTENTS = new Set(
  CHIP_DEFS.filter((d) => d.kind === 'stub').map((d) => d.intent),
);

/**
 * Catálogo COMPLETO de chips VIVOS (todos los `CHIP_DEFS` con `kind !== 'stub'`),
 * en el orden del manifiesto. Es lo que ve el OPERADOR (bypass del gating por
 * perfil): la caja de herramientas entera, sin estrechar. Los stubs quedan
 * fuera, igual que para cualquier otro perfil.
 * @type {readonly string[]}
 */
const ALL_LIVE_CHIP_INTENTS = Object.freeze(
  CHIP_DEFS.filter((d) => d.kind !== 'stub').map((d) => d.intent),
);

/**
 * Normaliza un string a minúsculas sin tildes ni espacios sobrantes. Tolerante
 * a `null`/no-string (devuelve '').
 * @param {unknown} v
 * @returns {string}
 */
function norm(v) {
  if (typeof v !== 'string') return '';
  return v
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * ¿El perfil declara que tiene animales? Mira el array multi `animales` (nuevo
 * en el onboarding) y, como respaldo, palabras pecuarias en texto libre.
 * @param {Object} profile
 * @returns {boolean}
 */
export function profileTieneAnimales(profile) {
  if (!profile || typeof profile !== 'object') return false;
  const arr = profile.animales;
  if (Array.isArray(arr) && arr.some((a) => a && a !== 'ninguno')) return true;
  // Respaldo: el usuario escribió animales en algún campo de texto libre.
  const libre = norm(profile.cultivos_actuales) + ' ' + norm(profile.cultivos_interes);
  return /\b(gallina|gallinas|cerdo|cerdos|marrano|vaca|vacas|ganado|oveja|cabra|pollo|aves)\b/.test(
    libre,
  );
}

/**
 * Deriva el ROL de producto a partir del perfil. Prioridad:
 *   1. `rol` explícito del onboarding (si es un rol conocido).
 *   2. Whitelist de guía de glaciar (username de "La Cordada"), si se pasa.
 *   3. Heurística por `vocacion` + `objetivo` + animales.
 *
 * SIEMPRE devuelve un rol válido (default: campesino) — nunca null, para que el
 * selector tenga algo con qué trabajar.
 *
 * @param {Object} profile — perfil del usuario (chagra:profile).
 * @param {Object} [opts]
 * @param {boolean} [opts.esGuiaGlaciar=false] - el username está en la whitelist
 *   de "La Cordada" (lo resuelve el call-site con glaciarAccess, fuera de aquí
 *   para mantener este módulo puro/offline).
 * @returns {string} uno de PROFILE_ROLES.
 */
export function deriveRole(profile, opts = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};

  // 1. Rol explícito declarado en el onboarding.
  const rolExplicito = norm(p.rol);
  if (rolExplicito && Object.values(PROFILE_ROLES).includes(/** @type {'campesino'|'tecnico'|'ganadero'|'restaurador'|'guia_glaciar'|'socio'} */ (rolExplicito))) {
    return rolExplicito;
  }

  // 2. Guía de glaciar por whitelist (lo decide el call-site).
  if (opts.esGuiaGlaciar) return PROFILE_ROLES.guia_glaciar;

  // 3. Heurística por vocación + objetivos.
  const vocacion = norm(p.vocacion);
  const objetivos = Array.isArray(p.objetivo) ? p.objetivo.map(norm) : [];
  const quiereBiodiversidad = objetivos.includes('biodiversidad');

  // Restaurador: objetivo de biodiversidad sin vocación productiva clara, o
  // vocación técnica enfocada a ecosistemas.
  if (quiereBiodiversidad && (vocacion === '' || vocacion === 'curioso')) {
    return PROFILE_ROLES.restaurador;
  }

  // Ganadero: tiene animales y NO es principalmente cultivo urbano.
  if (profileTieneAnimales(p) && vocacion !== 'urbano') {
    return PROFILE_ROLES.ganadero;
  }

  if (vocacion === 'tecnico') return PROFILE_ROLES.tecnico;
  if (vocacion === 'campesino' || vocacion === 'urbano') return PROFILE_ROLES.campesino;

  // Default seguro.
  return PROFILE_ROLES.campesino;
}

/**
 * Núcleo PURO de selección: dado un rol + flags del perfil, devuelve la lista
 * ORDENADA de intents de chip. No lee perfil ni red — recibe todo explícito.
 *
 * Reglas:
 *   - Arranca del set base del rol.
 *   - Si el perfil tiene animales, asegura `silvopastoreo` (el chip real de
 *     ganado/forraje) aunque el rol base no lo trajera.
 *   - Si el objetivo incluye restauración/biodiversidad, suma los chips de
 *     restauración al final (sin desordenar el núcleo del rol).
 *   - Filtra a intents válidos del manifiesto.
 *   - Mueve los stubs al final: hoy solo `deep` cae en ese grupo.
 *   - Dedupe preservando el primer orden visto.
 *
 * @param {Object} args
 * @param {string} args.role — rol de PROFILE_ROLES.
 * @param {boolean} [args.tieneAnimales=false]
 * @param {boolean} [args.quiereRestauracion=false]
 * @returns {string[]} intents ordenados (subconjunto de CHIP_INTENTS).
 */
export function selectChipIntentsForRole(opts = /** @type {any} */ ({})) {
  const {
    role,
    tieneAnimales = false,
    quiereRestauracion = false,
  } = opts;
  const base = ROLE_BASE_CHIPS[role] || ROLE_BASE_CHIPS[PROFILE_ROLES.campesino];
  const ordered = [...base];

  if (tieneAnimales && !ordered.includes(CHIP_INTENTS.silvopastoreo)) {
    ordered.push(CHIP_INTENTS.silvopastoreo);
  }
  if (quiereRestauracion) {
    for (const intent of RESTAURACION_CHIPS) {
      if (!ordered.includes(intent)) ordered.push(intent);
    }
  }

  // Filtrar a intents reales + dedupe preservando orden.
  const seen = new Set();
  const live = [];
  const stubs = [];
  for (const intent of ordered) {
    if (!VALID_INTENTS.has(intent) || seen.has(intent)) continue;
    seen.add(intent);
    if (STUB_INTENTS.has(intent)) stubs.push(intent);
    else live.push(intent);
  }
  // Stubs al final: hoy ningún rol base los incluye, pero si en el futuro un
  // rol los agrega, quedan después de las herramientas vivas.
  return [...live, ...stubs];
}

/**
 * API de alto nivel: del PERFIL completo → lista ORDENADA de intents de chip.
 *
 * Combina `deriveRole` + `selectChipIntentsForRole` y respeta los módulos
 * visibles del Home (#7003): si el usuario ocultó el módulo de biodiversidad,
 * no forzamos los chips de restauración por objetivo (respeta su elección de
 * simplificar la app). El núcleo del rol SIEMPRE se respeta.
 *
 * @param {Object} profile — perfil (chagra:profile).
 * @param {Object} [opts]
 * @param {boolean} [opts.esOperador=false] - el usuario es OPERADOR (admin/demo/
 *   debug). BYPASS del gating por perfil: devuelve el catálogo COMPLETO de chips
 *   vivos. Tiene PRECEDENCIA sobre el rol y sobre #7003.
 * @param {boolean} [opts.esGuiaGlaciar=false] - username en whitelist Cordada.
 * @param {Object} [opts.moduleVisibility] - { moduleId: boolean } de #7003.
 * @returns {string[]} intents de chip ordenados para este usuario.
 */
export function selectChipIntents(profile, opts = {}) {
  // BYPASS OPERADOR (primer check): la caja de herramientas completa, sin
  // estrechar por rol/visibilidad. Solo se omiten los stubs (hoy solo deep),
  // igual que para todos. Va antes de deriveRole para que la whitelist Cordada
  // del operador no recorte el set por el rol guia_glaciar.
  if (opts.esOperador) return [...ALL_LIVE_CHIP_INTENTS];

  const p = profile && typeof profile === 'object' ? profile : {};
  const role = deriveRole(p, opts);

  const tieneAnimales = profileTieneAnimales(p);

  const objetivos = Array.isArray(p.objetivo) ? p.objetivo.map(norm) : [];
  const objetivoRestaura = objetivos.includes('biodiversidad');
  // Respeta #7003: si ocultó el módulo de biodiversidad, no inflamos los chips
  // de restauración por objetivo. El núcleo del rol (ej. restaurador) igual los
  // trae — esto solo afecta el "extra" disparado por objetivo.
  const vis = opts.moduleVisibility;
  const biodivVisible = !vis || vis.biodiversidad !== false;
  const quiereRestauracion = objetivoRestaura && biodivVisible;

  return selectChipIntentsForRole({ role, tieneAnimales, quiereRestauracion });
}

/**
 * Conveniencia para el componente: del perfil → las `CHIP_DEFS` (objetos
 * completos con emoji/label/placeholder) YA ORDENADAS y filtradas por perfil.
 * El componente solo las pinta con su CSS actual — no decide nada.
 *
 * Fallback robusto: si por cualquier razón la selección queda vacía (perfil
 * raro), devuelve TODAS las defs vivas para no dejar la barra sin herramientas.
 *
 * @param {Object} profile
 * @param {Object} [opts] - igual que selectChipIntents.
 * @returns {Array} subconjunto ordenado de CHIP_DEFS.
 */
export function selectChipDefs(profile, opts = {}) {
  const intents = selectChipIntents(profile, opts);
  const byIntent = new Map(CHIP_DEFS.map((d) => [d.intent, d]));
  const defs = intents.map((i) => byIntent.get(i)).filter(Boolean);
  if (defs.length > 0) return defs;
  // Fallback: nunca dejar la barra vacía.
  return CHIP_DEFS.filter((d) => d.kind !== 'stub');
}
