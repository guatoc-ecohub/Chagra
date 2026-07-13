/**
 * fincaSceneProfileSelector.js — selecciona la VARIANTE de ESCENA isométrica
 * "Finca Viva" del HOME según el PERFIL del usuario. Gemelo puro de
 * `homeModuleSelector` / `profileChipSelector`, pero para el BACKDROP de la
 * escena del home (no para los módulos ni los chips).
 *
 * Problema que resuelve: el home dibujaba SIEMPRE la misma escena rural (campo
 * con sol y colinas) a todo el mundo. Un usuario de balcón no tiene colinas ni
 * lotes; un invernadero es un techo translúcido con hileras; un guía de glaciar
 * vive en páramo (frailejones, no maíz); un restaurador ve bosque/ribera, no
 * cultivo. La escena del home debe REFLEJAR el espacio real de la persona
 * (mockup F2 "Finca Viva Evolutiva" — balcón / invernadero / finca diversa /
 * restauración / páramo), conmutada por perfil, no por un chip manual.
 *
 * Este módulo es PURO: sin React, sin red, sin localStorage, sin DOM. Mapea un
 * perfil de usuario → `{ kind, escala, animales, cerdos, tinte }`. Toda la
 * lógica vive aquí para testearla en aislamiento (TDD), igual que
 * `homeModuleSelector.selectHomeModules`. El componente `FincaWorldScene`
 * recibe esta variante como prop y dibuja el backdrop correspondiente; la vida
 * de la escena (nivel Gliessman, criaturas, estado vacío) sigue derivándose de
 * datos reales aparte — este selector solo decide QUÉ TIPO de escena pintar.
 *
 * REUSO (no se duplica nada): la derivación de ROL vive en
 * `profileChipSelector.deriveRole` (fuente única); `esPerfilUrbano`,
 * `profileTieneAnimales` y `profileTieneCerdos` viven en `homeModuleSelector` /
 * `profileChipSelector` (fuentes únicas). Aquí solo se importan y se mapean. El
 * cálculo de nivel Gliessman NO vive aquí (es de fincaGameService).
 *
 * REGLA — coherencia con el override urbano del home: si `esPerfilUrbano` es
 * verdadero (vocacion 'urbano' O finca_tipo ∈ {balcon, terraza}), la variante
 * es 'balcon' como OVERRIDE DURO, igual que `homeModuleSelector` fuerza el set
 * urbano. Nunca un urbano ve animales/cerdos en su escena.
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 *
 * @module fincaSceneProfileSelector
 */

import { deriveRole, profileTieneAnimales, PROFILE_ROLES } from './profileChipSelector.js';
import { esPerfilUrbano, profileTieneCerdos } from './homeModuleSelector.js';
import { clasificarPisoTermico } from './pisoTermicoClassifier.js';
import { getInvernaderoEstructura, getComposicionFinca } from './userProfileService.js';

/**
 * Tipos de escena (BACKDROP) que el componente `FincaWorldScene` sabe pintar.
 * Cada uno tiene su layout base distinto (ver el componente). NO se inventan
 * tipos fuera de este enum.
 *
 * @enum {string}
 */
export const SCENE_KINDS = Object.freeze({
  balcon: 'balcon', // Cultivo urbano en materas: deck de madera, baranda, ciudad de fondo.
  invernadero: 'invernadero', // Techo translúcido + camas/hileras en hilera + riego.
  finca: 'finca', // Finca rural diversa: colinas, árboles, lotes, animales (DEFAULT rural).
  restauracion: 'restauracion', // Bosque/ribera/páramo en restauración (hitos establecimiento→cierre).
  paramo: 'paramo', // Alta montaña: frailejones, sin lotes de cultivo (guía de glaciar).
});

/**
 * Escalas de la escena (cuánto "espacio" se dibuja). Mapea el tamaño declarado
 * del espacio del usuario a un descriptor que el componente usa para densidad
 * (cuántas materas / cuántos lotes / qué tan grande la isla).
 *
 * @enum {string}
 */
export const SCENE_ESCALAS = Object.freeze({
  micro: 'micro', // Pocas materas / muy pequeño.
  pequena: 'pequena', // Balcón completo / < 1 ha.
  media: 'media', // Terraza-patio grande / 1–5 ha.
  grande: 'grande', // 5–20 ha.
  extensa: 'extensa', // > 20 ha.
});

/**
 * Tintes climáticos de la escena (matiz de cielo/luz por piso térmico). El
 * componente los usa para teñir cielo y vegetación (cálido soleado → páramo
 * brumoso). Coinciden con los ids de piso de `pisoTermicoClassifier`.
 *
 * @enum {string}
 */
export const SCENE_TINTES = Object.freeze({
  calido: 'calido',
  templado: 'templado',
  frio: 'frio',
  paramo: 'paramo',
});

/** Normaliza a minúsculas sin tildes/espacios. Tolerante a no-string. */
function norm(v) {
  if (typeof v !== 'string') return '';
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Mapa de `espacio_urbano` (enum del onboarding) → escala de la escena urbana.
 * @type {Record<string, string>}
 */
const ESPACIO_URBANO_ESCALA = Object.freeze({
  materas: SCENE_ESCALAS.micro,
  balcon_lleno: SCENE_ESCALAS.pequena,
  terraza_grande: SCENE_ESCALAS.media,
});

/**
 * Mapa de `finca_hectareas` (enum del onboarding) → escala de la escena rural.
 * @type {Record<string, string>}
 */
const HECTAREAS_ESCALA = Object.freeze({
  menos_1: SCENE_ESCALAS.pequena,
  '1_5': SCENE_ESCALAS.media,
  '5_20': SCENE_ESCALAS.grande,
  mas_20: SCENE_ESCALAS.extensa,
});

/**
 * Deriva la ESCALA de la escena a partir del perfil. Para urbano usa
 * `espacio_urbano`; para rural/invernadero usa `finca_hectareas`. Default
 * seguro: media (ni micro ni extensa) cuando no hay dato.
 *
 * @param {Object} p — perfil normalizado.
 * @param {boolean} urbano — si la variante es urbana (balcón).
 * @returns {string} uno de SCENE_ESCALAS.
 */
function deriveEscala(p, urbano) {
  if (urbano) {
    return ESPACIO_URBANO_ESCALA[norm(p.espacio_urbano)] || SCENE_ESCALAS.pequena;
  }
  return HECTAREAS_ESCALA[norm(p.finca_hectareas)] || SCENE_ESCALAS.media;
}

/**
 * Deriva el TINTE climático de la escena. Prioriza el `piso_termico` ya
 * guardado en el perfil; si no, lo clasifica desde `finca_altitud` (msnm).
 * Default seguro: templado (el piso andino más común del producto). Para la
 * variante páramo el tinte es siempre 'paramo' (lo decide el caller).
 *
 * @param {Object} p — perfil normalizado.
 * @returns {string} uno de SCENE_TINTES.
 */
function deriveTinte(p) {
  const pisoDeclarado = norm(p.piso_termico);
  if (pisoDeclarado && Object.values(SCENE_TINTES).includes(/** @type {'frio'|'paramo'|'calido'|'templado'} */ (pisoDeclarado))) {
    return pisoDeclarado;
  }
  const altitud = Number(p.finca_altitud);
  if (Number.isFinite(altitud) && altitud >= 0) {
    const piso = clasificarPisoTermico(altitud);
    if (piso && Object.values(SCENE_TINTES).includes(piso.id)) return piso.id;
  }
  return SCENE_TINTES.templado;
}

/**
 * ¿El perfil declara intención de restaurar? Mira `restauracion_objetivo`
 * (array multi del onboarding, solo presente en perfiles ecológicos) y, como
 * respaldo, el objetivo 'biodiversidad'.
 *
 * @param {Object} p — perfil normalizado.
 * @returns {boolean}
 */
function quiereRestaurar(p) {
  const restaura = Array.isArray(p.restauracion_objetivo)
    ? p.restauracion_objetivo.map(norm).filter(Boolean)
    : [];
  if (restaura.length > 0) return true;
  const objetivos = Array.isArray(p.objetivo) ? p.objetivo.map(norm) : [];
  return objetivos.includes('biodiversidad');
}

/**
 * Deriva la ESTRUCTURA de la finca (#34, fase 1) que la escena F2 dibuja: la
 * forma/tamaño del invernadero y las ZONAS (huerta/frutales/aromáticas/animales)
 * del esqueleto declarado en el onboarding. Reusa los getters tipados de
 * `userProfileService` (fuente única + migración suave: perfil viejo → defaults
 * sanos). Pasa el perfil EXPLÍCITO para no tocar localStorage (este módulo es
 * puro). Estos campos solo enriquecen la variante; NO cambian el `kind`.
 *
 * @param {Object} p — perfil del usuario.
 * @returns {{ invernaderoForma: string|null, invernaderoTamano: string|null, zonas: string[] }}
 */
function deriveEstructura(p) {
  const inv = getInvernaderoEstructura(p);
  return {
    invernaderoForma: inv.forma,
    invernaderoTamano: inv.tamano,
    zonas: getComposicionFinca(p),
  };
}

/**
 * API de alto nivel: del PERFIL completo → la VARIANTE de escena del home.
 *
 * Reglas (alineadas con el override urbano de `homeModuleSelector` y con
 * `deriveRole`):
 *   1. URBANO (vocacion 'urbano' O finca_tipo ∈ {balcon, terraza}): OVERRIDE
 *      DURO → kind 'balcon'. Gana sobre cualquier rol. Sin animales/cerdos.
 *   2. INVERNADERO (finca_tipo === 'invernadero'): kind 'invernadero'.
 *   3. RESTAURADOR (rol restaurador con intención de restaurar): kind
 *      'restauracion'.
 *   4. GUÍA DE GLACIAR (rol guia_glaciar): kind 'paramo'.
 *   5. RURAL productivo (campesino/ganadero/tecnico/socio en finca rural):
 *      kind 'finca' (DEFAULT). `animales`/`cerdos` desde el perfil.
 *
 * SIEMPRE devuelve una variante válida (default seguro: finca rural a escala
 * media, tinte templado, sin animales) aunque el perfil venga vacío o null —
 * nunca null, para que el componente tenga algo que pintar.
 *
 * ESTRUCTURA (#34, fase 1): además del backdrop, la variante trae el ESQUELETO
 * declarado en el onboarding para que la escena F2 dibuje la nave del
 * invernadero (`invernaderoForma`/`invernaderoTamano`) y siembre las ZONAS
 * (`zonas`: huerta/frutales/aromáticas/animales). Migración suave: un perfil
 * viejo sin estos campos trae `forma:null`, `tamano:null`, `zonas:[]` y la
 * escena no rompe. Estos campos NO alteran el `kind` (solo lo enriquecen).
 *
 * @param {Object} profile — perfil del usuario (chagra:profile).
 * @param {Object} [opts]
 * @param {boolean} [opts.esGuiaGlaciar=false] - username en whitelist Cordada
 *   (lo resuelve el call-site con glaciarAccess, fuera de este módulo puro).
 * @returns {{ kind: string, escala: string, animales: boolean, cerdos: boolean,
 *   tinte: string, invernaderoForma: string|null, invernaderoTamano: string|null,
 *   zonas: string[] }}
 */
export function selectSceneVariant(profile, opts = {}) {
  const p = profile && typeof profile === 'object' ? profile : {};
  const tinte = deriveTinte(p);
  const estructura = deriveEstructura(p);

  // 1. OVERRIDE DURO urbano → balcón. Sin animales/cerdos (un balcón no los
  // tiene). Gana sobre cualquier rol derivado, igual que homeModuleSelector.
  if (esPerfilUrbano(p)) {
    return {
      kind: SCENE_KINDS.balcon,
      escala: deriveEscala(p, true),
      animales: false,
      cerdos: false,
      tinte,
      ...estructura,
    };
  }

  // 2. Invernadero (tipo de finca explícito): hileras bajo techo translúcido.
  if (norm(p.finca_tipo) === 'invernadero') {
    return {
      kind: SCENE_KINDS.invernadero,
      escala: deriveEscala(p, false),
      animales: false,
      cerdos: false,
      tinte,
      ...estructura,
    };
  }

  // Rol de producto (reusa deriveRole — fuente única de la derivación de rol).
  const role = deriveRole(p, opts);

  // 3. Restaurador con intención de restaurar → escena de restauración.
  if (role === PROFILE_ROLES.restaurador && quiereRestaurar(p)) {
    return {
      kind: SCENE_KINDS.restauracion,
      escala: deriveEscala(p, false),
      animales: false,
      cerdos: false,
      tinte,
      ...estructura,
    };
  }

  // 4. Guía de glaciar → páramo (alta montaña). Tinte forzado a páramo: aunque
  // el perfil no traiga altitud, un guía de glaciar trabaja sobre los 3000 m.
  if (role === PROFILE_ROLES.guia_glaciar) {
    return {
      kind: SCENE_KINDS.paramo,
      escala: deriveEscala(p, false),
      animales: false,
      cerdos: false,
      tinte: SCENE_TINTES.paramo,
      ...estructura,
    };
  }

  // 5. DEFAULT — finca rural diversa (campesino/ganadero/tecnico/socio). Los
  // animales y cerdos vienen del perfil (gallinas/ganado → animales; cerdos →
  // cerdos), igual que el gating de seguimiento del home.
  return {
    kind: SCENE_KINDS.finca,
    escala: deriveEscala(p, false),
    animales: profileTieneAnimales(p),
    cerdos: profileTieneCerdos(p),
    tinte,
    ...estructura,
  };
}
