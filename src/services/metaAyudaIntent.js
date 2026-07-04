/**
 * metaAyudaIntent.js — Detector de intención META/how-to («¿cómo uso Chagra?»).
 *
 * Distingue una pregunta SOBRE Chagra (cómo se usa una función, qué puede hacer
 * la app, dónde se ve algo) de una pregunta AGRONÓMICA (cómo se siembra, cómo se
 * controla una plaga). Las primeras se ruteo a la ayuda groundeada
 * (matchAyudaFuncion) en vez de a un tool de especie.
 *
 * Racional (fix de bug conocido): preguntas meta/generales misruteaban a
 * get_species → el catálogo devolvía found:false → deflección inútil «el catálogo
 * no tiene esa especie». Este detector las intercepta ANTES del NLU/tool.
 *
 * Diseño de PRECISIÓN ALTA: se prefiere NO disparar (dejar el flujo agronómico
 * normal) antes que robar una consulta agronómica. Por eso:
 *   - Verbos INEQUÍVOCOS de operar la app (registro/anoto/agrego/abro/accedo…)
 *     disparan solos.
 *   - Verbos AMBIGUOS (uso/veo/funciona) disparan SOLO junto a una referencia a
 *     la app (chagra/la app/el agente/menú/pantalla…).
 *   - Verbos agronómicos (siembro/cosecho/controlo/preparo) NUNCA disparan.
 *
 * Puro y sin red — testeable en aislamiento.
 *
 * IMPORTANTE — español colombiano (tú/usted), NUNCA voseo argentino.
 */

/**
 * Normaliza: minúsculas + sin tildes (ñ→n). Igual que el matcher de ayuda.
 * @param {string} text
 * @returns {string}
 */
function norm(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

// Referencias a la app/el agente (NO al cultivo). "chagra" cuenta como nombre de
// la app; en la práctica "¿cómo funciona chagra?" es meta y "¿cómo va mi chagra?"
// no trae verbo-app, así que no dispara igual.
const RE_APP_REF = /\b(chagra|la app|esta app|la aplicacion|esta aplicacion|el agente|el asistente|la herramienta|esta herramienta|el sistema|el aplicativo|el menu|un menu|el boton|la pantalla|la seccion|una seccion|la opcion|la mano de chagra|aqui en la app|en la app|de la app)\b/;

// Pregunta por CAPACIDADES de la app → responder con el catálogo de funciones.
const RE_CAPABILITIES = [
  /\bque (puede|puedes|podes|sabe|sabes) hacer\b/,
  /\bque (funciones|herramientas|capacidades|cosas)\b.*\b(tiene|tienes|hay|ofrece|maneja|puede|hace)\b/,
  /\bque (funciones|herramientas|capacidades)\b/,
  /\bque puedo hacer (con|en|aqui)\b/,
  /\ben que me (ayuda|ayudas|puede ayudar|puedes ayudar)\b/,
  /\bque mas (puedes|podes|sabes) hacer\b/,
  /\bque haces\b/,
  /\bpara que (sirve|me sirve|es|sirves)\b/, // se exige RE_APP_REF aparte
];

// Verbos INEQUÍVOCOS de operar la app (registrar/navegar). Disparan solos.
const RE_APP_VERB_STRONG = /\bcomo (registro|registrar|anoto|anotar|apunto|apuntar|agrego|agregar|anado|anadir|guardo|guardar|creo|crear|ingreso|ingresar|abro|abrir|accedo|acceder|activo|activar|entro a|entrar a|llego a|llegar a|navego a)\b/;

// Verbos AMBIGUOS: disparan SOLO con referencia a la app.
const RE_APP_VERB_WEAK = /\bcomo (uso|usar|utilizo|utilizar|funciona|manejo esto|manejo la app|veo|ver|consulto|consultar|encuentro|encontrar|reviso|revisar)\b/;

// Preguntas de UBICACIÓN dentro de la app (navegación). Excluyen compra/consecución.
const RE_WHERE = /\b(donde (veo|encuentro|esta|estan|queda|miro|consulto|configuro|activo|reviso|puedo ver)|en que (parte|seccion|pantalla|menu)|como llego a)\b/;
// Frases de ubicación que NO son de la app (comercio/agronomía) — bloquean RE_WHERE.
const RE_WHERE_BLOCK = /\bdonde (consigo|compro|vendo|siembro|planto|cultivo|encuentro semilla|venden)\b/;

// Frases sueltas de "no sé usar esto / ayúdame con la app".
const RE_HELP_APP = /\b(no se como (usar|manejar|funciona)|como se (usa|maneja) (esto|la app|chagra)|ayuda con la app|como manejo la app|como funciona esto)\b/;

/**
 * Detecta si el texto es una pregunta META (sobre cómo usar Chagra) y de qué
 * clase. Devuelve `{ isMeta:false }` cuando NO lo es (deja el flujo agronómico).
 *
 * @param {string} text - texto crudo del usuario.
 * @returns {{ isMeta: boolean, kind?: 'capabilities'|'howto', consulta?: string }}
 */
export function detectMetaAyudaIntent(text) {
  if (!text || typeof text !== 'string') return { isMeta: false };
  const n = norm(text);
  if (!n) return { isMeta: false };
  const hasAppRef = RE_APP_REF.test(n);

  // 1) Pregunta por capacidades → catálogo de funciones.
  const isCapabilityQ = RE_CAPABILITIES.slice(0, 7).some((re) => re.test(n));
  const isParaQueSirveApp = RE_CAPABILITIES[7].test(n) && hasAppRef;
  if (isCapabilityQ || isParaQueSirveApp) {
    return { isMeta: true, kind: 'capabilities', consulta: text.trim() };
  }

  // 2) Cómo operar la app (verbo fuerte, o débil + referencia a la app).
  if (RE_APP_VERB_STRONG.test(n)) {
    return { isMeta: true, kind: 'howto', consulta: text.trim() };
  }
  if (RE_APP_VERB_WEAK.test(n) && hasAppRef) {
    return { isMeta: true, kind: 'howto', consulta: text.trim() };
  }

  // 3) Dónde está algo dentro de la app (navegación), sin frases de comercio.
  if (RE_WHERE.test(n) && !RE_WHERE_BLOCK.test(n)) {
    return { isMeta: true, kind: 'howto', consulta: text.trim() };
  }

  // 4) "No sé usar esto / ayuda con la app".
  if (RE_HELP_APP.test(n)) {
    return { isMeta: true, kind: hasAppRef || /esto|la app|chagra/.test(n) ? 'howto' : 'howto', consulta: text.trim() };
  }

  return { isMeta: false };
}

export default { detectMetaAyudaIntent };
