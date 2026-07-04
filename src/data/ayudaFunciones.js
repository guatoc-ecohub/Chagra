/*
 * i18n (ADR-050): ayudaFunciones.js contiene copy user-facing en español
 * Colombia (nombres de función, pasos de uso, "cuándo sirve") pendiente de
 * migrar a src/config/messages.js. Se desactiva la regla a nivel de archivo,
 * mismo criterio que agentCapabilities.js (de donde se DERIVA este manifiesto).
 */
/* eslint-disable chagra-i18n/no-hardcoded-spanish */
/**
 * ayudaFunciones.js — MANIFIESTO DE AYUDA GROUNDED («Chagra enseña a usar Chagra»).
 *
 * FUENTE DE VERDAD para responder «¿cómo uso X?», «¿qué puede hacer Chagra?»,
 * «¿dónde veo los precios?». Si una función NO está aquí, el agente NO la puede
 * afirmar (anti-alucinación: nunca inventa funciones que no existen).
 *
 * NO se re-declaran capacidades: este archivo se DERIVA de la fuente única
 * `agentCapabilities.js` (CAPABILITY_MANIFEST — «la mano de Chagra»). Aquí solo
 * se ENRIQUECE cada capacidad LIVE con lo que necesita una respuesta de ayuda:
 *   - nombre        → label del manifiesto
 *   - que_hace      → desc del manifiesto
 *   - como_se_usa   → pasos concretos (derivados del tipo de acción + overrides)
 *   - cuando_sirve  → cuándo le sirve al campesino (curado, con fallback a desc)
 *   - accion        → cómo se abre: nav (vista), ask (pregunta al agente), photo
 *   - keywords      → sinónimos campesinos para el match de la consulta
 *
 * El deep-link usa el MISMO mecanismo de navegación de la app (`onNavigate(view)`
 * / HASH_VIEW_ROUTES). Para capacidades `nav`, `accion.view` es la vista destino.
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */

import { CAPABILITY_MANIFEST } from '../services/agentCapabilities.js';

/**
 * Sinónimos/keywords campesinos por id de capacidad. Refuerzan el match de la
 * consulta más allá del label. Todo en minúsculas y sin tildes (el matcher
 * normaliza igual). NO inventan capacidades: solo son formas de nombrar las que
 * ya existen en el manifiesto.
 * @type {Record<string, string[]>}
 */
const KEYWORDS_EXTRA = Object.freeze({
  plantas: ['mis plantas', 'mis cultivos', 'mis siembras', 'lo que tengo sembrado', 'inventario', 'activos', 'que tengo en la finca'],
  procesos: ['registrar', 'anotar', 'registro', 'guardar lo que hago', 'apuntar', 'registrar hablando', 'registrar por voz', 'crear registro', 'anotar labor', 'como registro', 'como anoto'],
  observaciones: ['anotar lo que veo', 'observacion', 'apunte', 'nota de campo', 'registrar observacion', 'anotar lo que vi'],
  tareas: ['tareas', 'labores', 'pendientes', 'trabajos', 'que tengo que hacer', 'tareas de hoy', 'agenda'],
  mapa: ['mapa', 'ubicacion', 'donde estan mis cultivos', 'croquis', 'plano de la finca'],
  historial: ['cuaderno', 'cuaderno de campo', 'bitacora', 'historial', 'lo que anote', 'registros pasados', 'lo que hice'],
  biodiversidad: ['biodiversidad', 'la vida de la finca', 'fauna', 'insectos', 'bichos beneficos'],
  ciclo: ['ciclo del cultivo', 'etapas del cultivo', 'desarrollo del cultivo'],
  germinacion: ['germinacion', 'prueba de semilla', 'sirve mi semilla', 'semilla viva', 'probar semilla'],
  suelo: ['suelo', 'tierra', 'mi suelo', 'analisis de suelo', 'prueba de tierra', 'diagnostico de suelo'],
  mercado: ['mercado', 'vender', 'marketplace', 'ofertas', 'publicar cosecha', 'vender la cosecha', 'mercado de la finca'],
  precio: ['precio', 'precios', 'cuanto vale', 'a como esta', 'mercado mayorista', 'valor', 'donde veo los precios'],
  aprender_hub: ['aprender', 'lecciones', 'aprende', 'ensename', 'curso', 'educacion'],
  foto: ['foto', 'camara', 'tomar foto', 'identificar con foto', 'reconocer planta', 'foto de la mata', 'foto de la hoja'],
  voz: ['agregar planta por voz', 'planta por voz', 'dictar planta'],
  siembro: ['que siembro', 'que sembrar', 'sembrar', 'siembra'],
  plaga: ['plaga', 'control de plagas', 'controlar plaga', 'bichos'],
  biopreparado: ['biopreparado', 'caldo', 'purin', 'receta casera'],
  clima: ['clima', 'tiempo', 'lluvia', 'pronostico'],
  calendario: ['calendario', 'cuando sembrar', 'cuando cosechar', 'epoca de siembra'],
  restauracion: ['restaurar', 'sembrar monte', 'nativas', 'reforestar', 'recuperar terreno'],
  silvopastoreo: ['silvopastoreo', 'arboles para ganado', 'forraje'],
  paramo: ['paramo', 'restaurar paramo'],
  incendio: ['riesgo de incendio', 'incendio', 'quema'],
  toxicidad: ['toxica', 'venenosa', 'comestible', 'se puede comer'],
  saberes_tradicionales: ['saberes', 'glosario', 'saberes tradicionales'],
  variedades: ['variedades', 'cultivares', 'que variedad'],
  polinizacion: ['polinizacion', 'poliniza', 'colmenas', 'abejas'],
  fenologia: ['fenologia', 'etapas de la planta', 'bbch'],
  alerta_paramo: ['normativa paramo', 'ley 1930', 'se puede sembrar en el paramo'],
  'alertas-cultivo': ['alertas', 'avisos', 'alertas del cultivo'],
  'vender-mercados': ['vender mejor', 'a donde llevar la cosecha'],
});

/**
 * «Cuándo le sirve» curado por id (opcional). Si no hay, se cae a `que_hace`.
 * @type {Record<string, string>}
 */
const CUANDO_SIRVE = Object.freeze({
  plantas: 'Cuando quieres ver, editar o revisar lo que tienes sembrado en la finca.',
  procesos: 'Cuando hiciste o viste algo (siembra, cosecha, insumo, mantenimiento, observación o plaga) y quieres guardarlo hablando.',
  observaciones: 'Cuando notas algo en el campo y quieres dejarlo anotado.',
  tareas: 'Cuando quieres ver, crear o marcar como hechos los trabajos de la finca.',
  mapa: 'Cuando quieres ubicar en un plano tus cultivos, tareas y hallazgos.',
  historial: 'Cuando quieres consultar lo que ya registraste o realizaste.',
  suelo: 'Cuando quieres diagnosticar tu tierra con pruebas caseras honestas.',
  germinacion: 'Cuando dudas si tu semilla está viva antes de sembrarla.',
  mercado: 'Cuando quieres publicar lo que vendes o ver ofertas de fincas vecinas.',
  precio: 'Cuando quieres una referencia de precio mayorista del día.',
  foto: 'Cuando no sabes qué planta es o si tiene plaga o enfermedad.',
  siembro: 'Cuando quieres saber qué sembrar según tu clima y tu altura.',
  plaga: 'Cuando tienes una plaga y quieres controlarla sin veneno.',
  clima: 'Cuando quieres el clima de tu zona esta semana.',
  calendario: 'Cuando quieres saber en qué mes sembrar o cosechar.',
});

/**
 * Overrides de pasos concretos por id (opcional). Si no hay, se usan los pasos
 * genéricos derivados del tipo de acción.
 * @type {Record<string, string[]>}
 */
const PASOS_OVERRIDE = Object.freeze({
  procesos: [
    'Toca el botón Ⓐ (la mano de Chagra) y elige «Registrar hablando».',
    'Cuéntale qué hiciste o viste; Chagra clasifica (siembra, cosecha, insumo, mantenimiento, observación o plaga) y lo guarda.',
  ],
  foto: [
    'Toca el botón de cámara 📷 en el chat.',
    'Tómale la foto a la mata: Chagra te dice qué es y si tiene plaga o enfermedad.',
  ],
  germinacion: [
    'Abre «¿Sirve mi semilla?» desde la mano de Chagra (botón Ⓐ) o con el botón de abajo.',
    'Sigue la prueba casera de germinación para saber si la semilla está viva.',
  ],
  suelo: [
    'Abre «Mi suelo» desde la mano de Chagra (botón Ⓐ) o con el botón de abajo.',
    'Haz las pruebas caseras que te indica para diagnosticar tu tierra.',
  ],
});

/**
 * Palabras vacías (stopwords) que NO deben derivarse como keyword de una función
 * (evita que «con» de «Aprender con el agente» matchee cualquier consulta).
 * @type {Set<string>}
 */
const STOPWORDS = new Set([
  'con', 'del', 'los', 'las', 'una', 'uno', 'para', 'que', 'por', 'mis', 'tus',
  'sus', 'esta', 'este', 'mata', 'agente', 'finca', 'como', 'ver',
]);

/**
 * Normaliza texto para el match: minúsculas + sin tildes.
 * @param {string} text
 * @returns {string}
 */
export function normalizeAyuda(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/**
 * Deriva la acción de apertura (deep-link) desde el `heroRoute` del manifiesto.
 * @param {object} cap - entrada del CAPABILITY_MANIFEST.
 * @returns {{ tipo: 'nav'|'ask'|'photo'|'chip', view?: string, prompt?: string, intent?: string }}
 */
function deriveAccion(cap) {
  const hr = cap.heroRoute || {};
  if (hr.kind === 'nav' && hr.view) return { tipo: 'nav', view: hr.view };
  if (hr.kind === 'photo') return { tipo: 'photo' };
  if (hr.kind === 'ask' && hr.prompt) {
    return { tipo: 'ask', prompt: hr.prompt, ...(cap.intent ? { intent: cap.intent } : {}) };
  }
  // Sin heroRoute utilizable pero con chip → la abre el chip del ChipsToolbar.
  if (cap.intent) return { tipo: 'chip', intent: cap.intent };
  // Fallback honesto: sin ruta de apertura conocida → se describe, sin botón.
  return { tipo: 'chip', intent: cap.id };
}

/**
 * Pasos genéricos según el tipo de acción. Grounded: describen la navegación
 * REAL de la app (mano de Chagra / chips / cámara).
 * @param {string} nombre
 * @param {{tipo:string, prompt?:string}} accion
 * @returns {string[]}
 */
function pasosGenericos(nombre, accion) {
  switch (accion.tipo) {
    case 'nav':
      return [
        `Toca el botón Ⓐ (la mano de Chagra) y elige «${nombre}».`,
        `O usa el botón «Abrir ${nombre}» aquí abajo.`,
      ];
    case 'photo':
      return [
        'Toca el botón de cámara 📷 en el chat.',
        'Tómale la foto a tu planta para que Chagra la analice.',
      ];
    case 'ask':
      return [
        `Toca el chip «${nombre}» arriba del chat y escribe tu caso.`,
        accion.prompt ? `También puedes preguntarme directo, por ejemplo: «${accion.prompt}».` : 'También puedes preguntarme directo por el chat.',
      ];
    case 'chip':
    default:
      return [
        `Toca el chip «${nombre}» en la barra de herramientas del chat.`,
        'Escribe tu consulta y Chagra te responde con datos del catálogo.',
      ];
  }
}

/**
 * @typedef {Object} AyudaFuncion
 * @property {string} id
 * @property {string} nombre
 * @property {string} que_hace
 * @property {string} cuando_sirve
 * @property {string[]} como_se_usa
 * @property {{tipo:string, view?:string, prompt?:string, intent?:string}} accion
 * @property {string[]} keywords
 * @property {string} grupo
 */

/**
 * AYUDA_FUNCIONES — el manifiesto de ayuda, derivado de CAPABILITY_MANIFEST.
 * Solo capacidades `status:'live'` (las que el campesino puede usar de verdad).
 * Cada entrada es la forma canónica que consume el agente y la tarjeta de ayuda.
 *
 * @type {ReadonlyArray<AyudaFuncion>}
 */
export const AYUDA_FUNCIONES = Object.freeze(
  CAPABILITY_MANIFEST.filter((cap) => cap.status === 'live').map((cap) => {
    const nombre = cap.label;
    const accion = deriveAccion(cap);
    const keywords = Array.from(
      new Set([
        // Tokens del nombre: solo palabras "de contenido" (≥4 chars, no stopword)
        // para no derivar ruido como "con"/"del".
        ...normalizeAyuda(nombre)
          .split(/\s+/)
          .filter((w) => w.length >= 4 && !STOPWORDS.has(w)),
        ...(cap.group ? [normalizeAyuda(cap.group)] : []),
        ...(KEYWORDS_EXTRA[cap.id] || []).map(normalizeAyuda),
      ]),
    );
    return Object.freeze({
      id: cap.id,
      nombre,
      que_hace: cap.desc || '',
      cuando_sirve: CUANDO_SIRVE[cap.id] || cap.desc || '',
      como_se_usa: PASOS_OVERRIDE[cap.id] || pasosGenericos(nombre, accion),
      accion,
      keywords,
      grupo: cap.group || 'otras',
    });
  }),
);

/** Índice por id para acceso O(1). @type {Record<string, AyudaFuncion>} */
const BY_ID = Object.freeze(
  AYUDA_FUNCIONES.reduce((acc, f) => {
    acc[f.id] = f;
    return acc;
  }, /** @type {Record<string, any>} */ ({})),
);

/**
 * ¿`needle` aparece como palabra completa en `haystack`? Evita que un token
 * corto sea tragado por una consulta larga.
 * @param {string} haystack
 * @param {string} needle
 * @returns {boolean}
 */
function containsWord(haystack, needle) {
  if (!needle) return false;
  const tokens = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  return tokens.includes(needle);
}

/**
 * Puntúa qué tan bien una función matchea la consulta. MAYOR = mejor (0 = sin
 * match). Determinístico, sin fabricación.
 *   100 = nombre o id exacto
 *    70 = una keyword multi-palabra aparece como frase en la consulta
 *    40 = una keyword de una palabra aparece como palabra en la consulta
 *    20 = solapamiento de tokens del nombre con la consulta
 * @param {AyudaFuncion} f
 * @param {string} normQuery
 * @returns {number}
 */
function scoreFuncion(f, normQuery) {
  if (!normQuery) return 0;
  const normNombre = normalizeAyuda(f.nombre);
  if (normNombre === normQuery || f.id === normQuery) return 100;

  let best = 0;
  for (const kw of f.keywords) {
    if (!kw) continue;
    if (kw.includes(' ')) {
      // keyword multi-palabra → match por frase (substring).
      if (normQuery.includes(kw)) best = Math.max(best, 70);
    } else if (kw.length >= 4 && !STOPWORDS.has(kw)) {
      // keyword de una palabra: solo tokens de contenido (≥4, no stopword) para
      // no matchear ruido. Palabra completa o substring largo.
      if (containsWord(normQuery, kw) || normQuery.includes(kw)) best = Math.max(best, 40);
    }
  }
  // Solapamiento de tokens del nombre.
  const nombreTokens = normNombre.split(/\s+/).filter((w) => w.length >= 4);
  for (const t of nombreTokens) {
    if (containsWord(normQuery, t)) best = Math.max(best, 20);
  }
  return best;
}

/**
 * matchAyudaFuncion — resuelve una consulta de ayuda contra el manifiesto.
 *
 * Diseño HONESTO (anti-alucinación): si NINGUNA función matchea, devuelve
 * `found:false` con sugerencias reales del manifiesto — NUNCA inventa una
 * función. La respuesta del agente debe reflejar ese `found:false` sin fabricar.
 *
 * @param {string} consulta - texto libre del usuario.
 * @param {object} [opts]
 * @param {number} [opts.limit=4] - máximo de alternativas a devolver.
 * @returns {{ found: true, funcion: AyudaFuncion, alternativas: AyudaFuncion[] }
 *   | { found: false, sugerencias: AyudaFuncion[] }}
 */
export function matchAyudaFuncion(consulta, opts = {}) {
  const limit = Number.isInteger(opts.limit) && opts.limit > 0 ? opts.limit : 4;
  const normQuery = normalizeAyuda(consulta);

  const ranked = AYUDA_FUNCIONES
    .map((f) => ({ f, score: scoreFuncion(f, normQuery) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.f.nombre.length - b.f.nombre.length);

  if (ranked.length === 0) {
    // Sin match: sugerencias reales (las funciones más comunes), NO inventadas.
    const sugeridas = ['plantas', 'procesos', 'tareas', 'siembro', 'plaga', 'clima']
      .map((id) => BY_ID[id])
      .filter(Boolean);
    return { found: false, sugerencias: sugeridas };
  }

  return {
    found: true,
    funcion: ranked[0].f,
    alternativas: ranked.slice(1, limit).map((x) => x.f),
  };
}

/**
 * listAyudaFunciones — todas las funciones LIVE, agrupadas por área. Para
 * responder «¿qué puede hacer Chagra?».
 * @returns {{ total: number, grupos: Record<string, AyudaFuncion[]> }}
 */
export function listAyudaFunciones() {
  const grupos = /** @type {Record<string, any[]>} */ ({});
  for (const f of AYUDA_FUNCIONES) {
    (grupos[f.grupo] = grupos[f.grupo] || []).push(f);
  }
  return { total: AYUDA_FUNCIONES.length, grupos };
}

/**
 * getAyudaFuncion — acceso directo por id (o null si no existe).
 * @param {string} id
 * @returns {AyudaFuncion|null}
 */
export function getAyudaFuncion(id) {
  return BY_ID[id] || null;
}
