/*
 * EL PERFIL DE LA FINCA — la fuente ÚNICA de verdad de "cómo es SU finca".
 *
 * EL PROBLEMA QUE RESUELVE (spec valle dinámico, paso 1): el onboarding
 * (OnboardingCondensado, paso 2) SÍ captura la ubicación real — GPS →
 * municipio DANE → altitud → piso térmico → vereda — y la guarda en el perfil
 * (`chagra:profile:*`, userProfileService). Pero media app leía la finca de
 * VARIABLES DE BUILD (`VITE_FARM_LAT`, `VITE_FARM_ALTITUD_MSNM`,
 * `VITE_FARM_MUNICIPIO`, `VITE_FARM_THERMAL_ZONES`): dos verdades distintas
 * sobre la MISMA finca. En prod sin esas envs quedaba `null` y el consejo
 * salía "altitud no especificada" aunque el usuario acabara de ubicarse.
 *
 * LA REGLA: el sistema lee la ubicación del PERFIL; `VITE_FARM_*` queda solo
 * como VALOR POR DEFECTO DE DEMO (la finca de muestra del guión). Nunca al
 * revés.
 *
 * Este módulo es PURO y sin React (lo consumen servicios, componentes y el
 * store `usePerfilFincaStore`): lee el perfil de localStorage vía
 * userProfileService y lo normaliza a una forma TIPADA y estable.
 *
 * FORMA DEL PERFIL (contrato del spec):
 *   ubicacion     { lat, lon, altitudMsnm, municipio, departamento, vereda, fuente }
 *   pisoTermico   'calido'|'templado'|'frio'|'paramo'|null
 *   escala        'balcon'|'invernadero'|'finca'   ← decide el tamaño del mundo
 *   invernadero   null | { tipo, tamano }
 *   cultiva       string[]   (ids/nombres de lo que siembra)
 *   animales      string[]
 *   agua          'quebrada'|'tanque'|'lluvia'|'acueducto'|null
 *   mundosActivos string[]   (mundos AGREGADOS a mano desde la vitrina)
 *   declarado     { ... }    ¿el usuario RESPONDIÓ esa pregunta?
 *
 * `declarado` es la red de seguridad del valle: un dato que FALTA nunca resta
 * (el valle se ve como hoy); solo una respuesta EXPLÍCITA cambia el mundo.
 */
import { FARM_CONFIG } from '../config/defaults';
import { getProfile } from './userProfileService';

/** Escalas válidas del mundo. `finca` es el default seguro (valle completo). */
export const ESCALAS_FINCA = Object.freeze(['balcon', 'invernadero', 'finca']);

/** Pisos térmicos IDEAM/IGAC (mismos ids de src/data/piso-termico.json). */
export const PISOS_TERMICOS_IDS = Object.freeze(['calido', 'templado', 'frio', 'paramo']);

/** De dónde toma el agua la finca (paso 3 del spec la pregunta explícita). */
export const FUENTES_AGUA = Object.freeze(['quebrada', 'tanque', 'lluvia', 'acueducto']);

/**
 * Tipos de invernadero. Reusa el catálogo YA existente del perfil
 * (`INVERNADERO_FORMAS` de userProfileService, que la escena F2 ya dibuja):
 * cuadrado · tunel · casa_sombra · malla_sombra · umbraculo · otro.
 * NO se inventa un catálogo paralelo.
 */
export const TIPOS_INVERNADERO = Object.freeze([
  'cuadrado',
  'tunel',
  'casa_sombra',
  'malla_sombra',
  'umbraculo',
  'otro',
]);

/**
 * @typedef {Object} UbicacionFinca
 * @property {number|null} lat
 * @property {number|null} lon
 * @property {number|null} altitudMsnm
 * @property {string|null} municipio
 * @property {string|null} departamento
 * @property {string|null} vereda
 * @property {'perfil'|'demo'} fuente  'perfil' = la ubicó el usuario; 'demo' = default de build
 */

/**
 * @typedef {Object} PerfilFinca
 * @property {UbicacionFinca} ubicacion
 * @property {'calido'|'templado'|'frio'|'paramo'|null} pisoTermico
 * @property {'balcon'|'invernadero'|'finca'} escala
 * @property {{ tipo: string|null, tamano: string|null }|null} invernadero
 * @property {string[]} cultiva
 * @property {string[]} animales
 * @property {'quebrada'|'tanque'|'lluvia'|'acueducto'|null} agua
 * @property {string[]} mundosActivos
 * @property {{ ubicacion: boolean, escala: boolean, invernadero: boolean,
 *              cultiva: boolean, animales: boolean, agua: boolean }} declarado
 */

/** Ubicación neutra: nada declarado. */
const UBICACION_VACIA = Object.freeze({
  lat: null,
  lon: null,
  altitudMsnm: null,
  municipio: null,
  departamento: null,
  vereda: null,
  fuente: 'demo',
});

/**
 * EL PERFIL DE DEMO: la finca de muestra. No declara NADA, así que el valle se
 * siembra COMPLETO — es la referencia de compatibilidad del paso 2 del spec
 * (`construirLugaresValle(PERFIL_FINCA_DEMO)` = los lugares de siempre).
 */
export const PERFIL_FINCA_DEMO = Object.freeze({
  ubicacion: UBICACION_VACIA,
  pisoTermico: null,
  escala: 'finca',
  invernadero: null,
  cultiva: Object.freeze([]),
  animales: Object.freeze([]),
  agua: null,
  mundosActivos: Object.freeze([]),
  declarado: Object.freeze({
    ubicacion: false,
    escala: false,
    invernadero: false,
    cultiva: false,
    animales: false,
    agua: false,
  }),
});

const num = (v) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
};

const texto = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);

const listaTexto = (v) => {
  if (Array.isArray(v)) return v.map(texto).filter(Boolean);
  const t = texto(v);
  if (!t) return [];
  // El onboarding guarda `cultivos_actuales` como texto libre ("café, mora").
  return t.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
};

/**
 * Piso térmico a partir de la altitud (tabla IDEAM/IGAC). Se usa solo cuando
 * el perfil trae altitud pero no alcanzó a guardar el slug.
 * @param {number|null} msnm
 * @returns {'calido'|'templado'|'frio'|'paramo'|null}
 */
export function pisoTermicoDeAltitud(msnm) {
  const m = num(msnm);
  if (m == null) return null;
  if (m < 1000) return 'calido';
  if (m < 2000) return 'templado';
  if (m <= 3000) return 'frio';
  return 'paramo';
}

/**
 * ESCALA del mundo desde el perfil plano.
 *
 * Cascada: `escala` explícita (paso 3 del spec) → `finca_tipo` del onboarding
 * actual (balcón/terraza/invernadero/rural) → vocación urbana → 'finca'.
 * El default SIEMPRE es 'finca' (el valle completo): un dato que falta nunca
 * encoge el mundo.
 *
 * @param {Object} p perfil plano (`chagra:profile`)
 * @returns {{ escala: 'balcon'|'invernadero'|'finca', declarado: boolean }}
 */
export function derivarEscala(p = {}) {
  if (ESCALAS_FINCA.includes(p.escala)) return { escala: p.escala, declarado: true };
  if (p.finca_tipo === 'invernadero') return { escala: 'invernadero', declarado: true };
  if (p.finca_tipo === 'balcon' || p.finca_tipo === 'terraza') {
    return { escala: 'balcon', declarado: true };
  }
  if (p.finca_tipo === 'rural') return { escala: 'finca', declarado: true };
  if (p.vocacion === 'urbano') return { escala: 'balcon', declarado: true };
  return { escala: 'finca', declarado: false };
}

/**
 * De dónde toma el agua. Hoy se DERIVA de la pregunta `riego` que ya existe,
 * y solo en los dos casos inequívocos (secano = lluvia · acequia = quebrada).
 * Manguera/goteo no dicen de dónde SALE el agua → queda null hasta que el
 * paso 3 del spec agregue la pregunta explícita (`agua`).
 *
 * @param {Object} p perfil plano
 * @returns {{ agua: string|null, declarado: boolean }}
 */
export function derivarAgua(p = {}) {
  if (FUENTES_AGUA.includes(p.agua)) return { agua: p.agua, declarado: true };
  if (p.riego === 'lluvia') return { agua: 'lluvia', declarado: true };
  if (p.riego === 'acequia') return { agua: 'quebrada', declarado: true };
  return { agua: null, declarado: false };
}

/**
 * Normaliza CUALQUIER entrada (perfil plano del onboarding, perfil ya tipado,
 * null) a un `PerfilFinca` completo y seguro. Nunca lanza: si no entiende algo,
 * cae al valor del perfil de demo (que no resta nada).
 *
 * @param {Object|null} perfil
 * @returns {PerfilFinca}
 */
export function normalizarPerfilFinca(perfil) {
  if (!perfil || typeof perfil !== 'object') return { ...PERFIL_FINCA_DEMO };
  // ¿Ya viene tipado (tiene `declarado`)? Entonces solo se sanea.
  const yaTipado = perfil.declarado && typeof perfil.declarado === 'object';
  const base = yaTipado ? perfil : derivarPerfilFinca(perfil);
  return {
    ...PERFIL_FINCA_DEMO,
    ...base,
    ubicacion: { ...UBICACION_VACIA, ...(base.ubicacion || {}) },
    escala: ESCALAS_FINCA.includes(base.escala) ? base.escala : 'finca',
    pisoTermico: PISOS_TERMICOS_IDS.includes(base.pisoTermico) ? base.pisoTermico : null,
    cultiva: Array.isArray(base.cultiva) ? base.cultiva : [],
    animales: Array.isArray(base.animales) ? base.animales : [],
    mundosActivos: Array.isArray(base.mundosActivos) ? base.mundosActivos : [],
    declarado: { ...PERFIL_FINCA_DEMO.declarado, ...(base.declarado || {}) },
  };
}

/**
 * EL DERIVADOR: perfil plano del onboarding → `PerfilFinca` tipado.
 *
 * Migración suave garantizada: un perfil viejo (o vacío) devuelve el perfil de
 * demo — nada declarado, valle completo, cero regresiones.
 *
 * @param {Object} [profile] perfil plano; si se omite, se lee de localStorage
 * @returns {PerfilFinca}
 */
export function derivarPerfilFinca(profile) {
  const p = profile && typeof profile === 'object' ? profile : {};

  const lat = num(p.ubicacion_lat);
  const lon = num(p.ubicacion_lng);
  const altitud = num(p.finca_altitud);
  const municipio = texto(p.municipio) || null;
  const hayUbicacion = lat != null || lon != null || altitud != null || municipio != null;

  /* El PISO TÉRMICO solo sale del perfil REAL del usuario (slug guardado o su
     altitud). Jamás del env de demo: la finca de muestra no puede recortarle
     el valle a nadie. */
  const pisoDeclarado = PISOS_TERMICOS_IDS.includes(p.piso_termico) ? p.piso_termico : null;
  const pisoTermico = pisoDeclarado || (hayUbicacion ? pisoTermicoDeAltitud(altitud) : null);

  const { escala, declarado: escalaDeclarada } = derivarEscala(p);
  const { agua, declarado: aguaDeclarada } = derivarAgua(p);

  const tieneInvernadero = p.invernadero_tiene === 'si' || p.finca_tipo === 'invernadero';
  const invernaderoDeclarado = p.invernadero_tiene === 'si' || p.invernadero_tiene === 'no'
    || p.finca_tipo === 'invernadero';
  const invernadero = tieneInvernadero
    ? {
      tipo: TIPOS_INVERNADERO.includes(p.invernadero_forma) ? p.invernadero_forma : null,
      tamano: texto(p.invernadero_tamano),
    }
    : null;

  const animales = listaTexto(p.animales).filter((a) => a !== 'ninguno');
  const animalesDeclarados = Array.isArray(p.animales) && p.animales.length > 0;
  const cultiva = listaTexto(p.cultivos_actuales);

  return {
    ubicacion: {
      lat,
      lon,
      altitudMsnm: altitud,
      municipio,
      departamento: texto(p.departamento),
      vereda: texto(p.vereda),
      fuente: hayUbicacion ? 'perfil' : 'demo',
    },
    pisoTermico,
    escala,
    invernadero,
    cultiva,
    animales,
    agua,
    mundosActivos: Array.isArray(p.mundos_activos) ? p.mundos_activos.filter(Boolean) : [],
    declarado: {
      ubicacion: hayUbicacion,
      escala: escalaDeclarada,
      invernadero: invernaderoDeclarado,
      cultiva: cultiva.length > 0,
      animales: animalesDeclarados,
      agua: aguaDeclarada,
    },
  };
}

/**
 * El perfil de la finca AHORA (lee localStorage). Sin React: sirve en
 * servicios, builders de prompt y tests.
 * @returns {PerfilFinca}
 */
export function getPerfilFinca() {
  try {
    return derivarPerfilFinca(getProfile());
  } catch (_) {
    return { ...PERFIL_FINCA_DEMO };
  }
}

/**
 * CONTEXTO GEOAGRONÓMICO de la finca para quien antes leía `VITE_FARM_*`
 * (builders de IA externa, gremios, alertas, plagas).
 *
 * Cascada honesta: lo que el usuario ubicó en el onboarding → el default de
 * demo del build (`FARM_CONFIG`) → null. Así el consejo sale con la altitud y
 * el municipio VERDADEROS, y la demo del guión sigue funcionando igual.
 *
 * @param {Object} [profile] perfil plano; si se omite, se lee de localStorage
 * @returns {{ lat: number|null, lon: number|null, altitudMsnm: number|null,
 *             municipio: string|null, thermalZones: string[],
 *             fuente: 'perfil'|'demo' }}
 */
export function getContextoGeoFinca(profile) {
  const perfil = profile !== undefined
    ? derivarPerfilFinca(profile)
    : getPerfilFinca();
  const u = perfil.ubicacion;
  const zonasEnv = Array.isArray(FARM_CONFIG.THERMAL_ZONES) ? FARM_CONFIG.THERMAL_ZONES : [];
  return {
    lat: u.lat ?? (typeof FARM_CONFIG.LATITUDE === 'number' ? FARM_CONFIG.LATITUDE : null),
    lon: u.lon ?? (typeof FARM_CONFIG.LONGITUDE === 'number' ? FARM_CONFIG.LONGITUDE : null),
    altitudMsnm: u.altitudMsnm ?? FARM_CONFIG.ALTITUD_MSNM ?? null,
    municipio: u.municipio ?? FARM_CONFIG.MUNICIPIO ?? null,
    thermalZones: perfil.pisoTermico ? [perfil.pisoTermico] : zonasEnv,
    fuente: u.fuente,
  };
}

/**
 * El contexto geoagronómico en las claves que hablan los builders de IA
 * externa (`altitudMsnm` · `municipio` · `thermalZones`). Azúcar sobre
 * `getContextoGeoFinca()` para que los componentes lo esparzan de una:
 * `context={{ speciesName, ...getContextoGeoParaIA() }}`.
 */
export function getContextoGeoParaIA() {
  const { altitudMsnm, municipio, thermalZones } = getContextoGeoFinca();
  return { altitudMsnm, municipio, thermalZones };
}
