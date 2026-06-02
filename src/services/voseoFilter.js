/**
 * voseoFilter.js — Filtro post-process determinístico anti-voseo argentino.
 *
 * DR-LANG-1 (2026-05-28). Aplica un sweep estructural sobre la salida del
 * LLM antes de exponerla al usuario, sustituyendo los nueve marcadores
 * morfológicos del voseo rioplatense por su equivalente en tú/usted
 * colombiano según el modo de formalidad activo.
 *
 * Garantías:
 *   - O(n) sobre el largo del texto.
 *   - No modifica bloques de código (``` ... ``` ni `inline`).
 *   - No modifica strings JSON con escape.
 *   - Preserva capitalización inicial del match.
 *   - Atilda imperativos enclíticos faltos de tilde (fijate → fíjate).
 *   - Marcadores ambiguos en colombiano (acá, allá, dale) solo se
 *     reemplazan si la misma oración contiene un marcador "fuerte" de
 *     voseo argentino (vos, tenés, querés, etc.).
 *
 * Diseño completo en `Chagra-strategy/deepresearch/DR-LANG-1`.
 *
 * @module voseoFilter
 */

/**
 * @typedef {Object} VoseoFilterOptions
 * @property {'tu' | 'usted'} [formality='usted']
 *   Modo de formalidad del reemplazo. Default `usted` (target campesino
 *   colombiano por defecto del piloto Free).
 * @property {(markerId: string, original: string, replacement: string) => void} [onMatch]
 *   Callback opcional invocado por cada marcador reemplazado. Para
 *   telemetría.
 * @property {boolean} [telemetry=false]
 *   Si true, incrementa un counter local en `localStorage` bajo la clave
 *   `chagra:voseo_filter_triggers`. No-op si localStorage no disponible.
 * @property {boolean} [includeChilean=false]
 *   Activa el subset de voseo chileno (`tenís`, `querís`, etc.). Default
 *   off — el voseo chileno tiene morfología distinta y el target v1.1 es
 *   solo argentino + centroamericano (que comparten morfología).
 * @property {boolean} [preserveIsolatedAca=true]
 *   Si true (default), `acá` / `allá` / `dale` se preservan cuando
 *   aparecen aislados en una oración sin otro marcador voseo. Esto evita
 *   sobre-corregir el habla rural colombiana del piedemonte y Nariño,
 *   donde `acá` es usual sin connotación rioplatense.
 */

/**
 * @typedef {Object} ReplaceRule
 * @property {string} id
 * @property {RegExp} pattern
 * @property {string} tu       Reemplazo en tú colombiano.
 * @property {string} usted    Reemplazo en usted colombiano.
 * @property {boolean} [preserveCaps]
 * @property {boolean} [requiresContext] Si true, solo aplica si la oración
 *   contiene otro marcador "fuerte" de voseo argentino.
 */

/**
 * Boundary Unicode-aware. JS `\b` no funciona con caracteres acentuados
 * (á, é, í, ó, ú) porque los considera "non-word", lo que rompe
 * `\bmirá\b` cuando la palabra termina en vocal acentuada. Solución:
 * lookbehind/lookahead negativos sobre el set de letras+dígitos Unicode.
 *
 * Helper que arma el regex con boundary correcto para cualquier patrón.
 *
 * @param {string} core — patrón interno (sin boundaries).
 * @returns {RegExp}
 */
const wb = (core) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${core})(?![\\p{L}\\p{N}])`, 'giu');

/** @type {ReplaceRule[]} */
const VOSEO_RULES = [
  // 1. Pronombre sujeto
  { id: 'vos', pattern: wb('vos'), tu: 'tú', usted: 'usted', preserveCaps: true },
  { id: 'sos', pattern: wb('sos'), tu: 'eres', usted: 'es', preserveCaps: true },

  // 2-5. Verbos en presente, segunda persona singular voseo (agudos)
  { id: 'tenes', pattern: wb('tenés'), tu: 'tienes', usted: 'tiene', preserveCaps: true },
  { id: 'queres', pattern: wb('querés'), tu: 'quieres', usted: 'quiere', preserveCaps: true },
  { id: 'podes', pattern: wb('podés'), tu: 'puedes', usted: 'puede', preserveCaps: true },
  { id: 'decis', pattern: wb('decís'), tu: 'dices', usted: 'dice', preserveCaps: true },
  { id: 'sabes_voseo', pattern: wb('sabés'), tu: 'sabes', usted: 'sabe', preserveCaps: true },
  { id: 'vives_voseo', pattern: wb('vivís'), tu: 'vives', usted: 'vive', preserveCaps: true },
  { id: 'venis', pattern: wb('venís'), tu: 'vienes', usted: 'viene', preserveCaps: true },
  { id: 'salis', pattern: wb('salís'), tu: 'sales', usted: 'sale', preserveCaps: true },
  { id: 'decides_voseo', pattern: wb('decidís'), tu: 'decides', usted: 'decide', preserveCaps: true },
  { id: 'hablas_voseo', pattern: wb('hablás'), tu: 'hablas', usted: 'habla', preserveCaps: true },
  { id: 'dejas_voseo', pattern: wb('dejás'), tu: 'dejas', usted: 'deja', preserveCaps: true },
  { id: 'pasas_voseo', pattern: wb('pasás'), tu: 'pasas', usted: 'pasa', preserveCaps: true },
  { id: 'trabajas_voseo', pattern: wb('trabajás'), tu: 'trabajas', usted: 'trabaja', preserveCaps: true },
  { id: 'siembras_voseo', pattern: wb('sembrás'), tu: 'siembras', usted: 'siembra', preserveCaps: true },
  { id: 'riegas_voseo', pattern: wb('regás'), tu: 'riegas', usted: 'riega', preserveCaps: true },
  { id: 'cosechas_voseo', pattern: wb('cosechás'), tu: 'cosechas', usted: 'cosecha', preserveCaps: true },
  { id: 'pones_voseo', pattern: wb('ponés'), tu: 'pones', usted: 'pone', preserveCaps: true },

  // 6. Imperativos planos voseo (agudos con tilde final)
  { id: 'mira_voseo', pattern: wb('mirá'), tu: 'mira', usted: 'mire', preserveCaps: true },
  { id: 'anda_voseo', pattern: wb('andá'), tu: 've', usted: 'vaya', preserveCaps: true },
  { id: 'veni_voseo', pattern: wb('vení'), tu: 'ven', usted: 'venga', preserveCaps: true },
  { id: 'elegi_voseo', pattern: wb('elegí'), tu: 'elige', usted: 'elija', preserveCaps: true },
  { id: 'fijate_voseo', pattern: wb('fij[áa]te'), tu: 'fíjate', usted: 'fíjese', preserveCaps: true },
  { id: 'pone_voseo', pattern: wb('poné'), tu: 'pon', usted: 'ponga', preserveCaps: true },
  { id: 'sembra_voseo', pattern: wb('sembrá'), tu: 'siembra', usted: 'siembre', preserveCaps: true },
  { id: 'rega_voseo', pattern: wb('regá'), tu: 'riega', usted: 'riegue', preserveCaps: true },
  { id: 'cosecha_voseo', pattern: wb('cosechá'), tu: 'cosecha', usted: 'coseche', preserveCaps: true },
  { id: 'tene_voseo', pattern: wb('tené'), tu: 'ten', usted: 'tenga', preserveCaps: true },
  { id: 'deci_voseo', pattern: wb('decí'), tu: 'di', usted: 'diga', preserveCaps: true },
  { id: 'deja_voseo', pattern: wb('dejá'), tu: 'deja', usted: 'deje', preserveCaps: true },
  { id: 'hace_voseo', pattern: wb('hacé'), tu: 'haz', usted: 'haga', preserveCaps: true },

  // 7. `dale` coloquial (con guarda de contexto — en Bogotá / Medellín se
  //    usa sin connotación voseo; solo reemplazamos si hay otro marcador
  //    fuerte en la misma oración).
  { id: 'dale', pattern: wb('dale'), tu: 'listo', usted: 'listo', preserveCaps: true, requiresContext: true },

  // 8. Adverbios de lugar (con guarda de contexto — `acá`/`allá` son
  //    usuales en español andino sureño sin connotación rioplatense).
  { id: 'aca', pattern: wb('acá'), tu: 'aquí', usted: 'aquí', preserveCaps: true, requiresContext: true },
  { id: 'alla_voseo', pattern: wb('allá'), tu: 'allí', usted: 'allí', preserveCaps: true, requiresContext: true },

  // 9. Imperativos enclíticos voseo (mirate, acordate, quedate, etc.)
  //    Atildación automática: aceptamos forma sin tilde (mirate) y la
  //    devolvemos correcta en tú colombiano (mírate).
  { id: 'mirate', pattern: wb('mir[áa]te'), tu: 'mírate', usted: 'mírese', preserveCaps: true },
  { id: 'acordate', pattern: wb('acord[áa]te'), tu: 'acuérdate', usted: 'acuérdese', preserveCaps: true },
  { id: 'quedate', pattern: wb('qued[áa]te'), tu: 'quédate', usted: 'quédese', preserveCaps: true },
  { id: 'cuidate', pattern: wb('cuid[áa]te'), tu: 'cuídate', usted: 'cuídese', preserveCaps: true },
  { id: 'animate', pattern: wb('anim[áa]te'), tu: 'anímate', usted: 'anímese', preserveCaps: true },
  { id: 'pegate', pattern: wb('peg[áa]te'), tu: 'pégate', usted: 'péguese', preserveCaps: true },
  { id: 'sentate', pattern: wb('sent[áa]te'), tu: 'siéntate', usted: 'siéntese', preserveCaps: true },
  { id: 'ponete', pattern: wb('pon[ée]te'), tu: 'ponte', usted: 'póngase', preserveCaps: true },
];

/** @type {ReplaceRule[]} */
const CHILEAN_RULES = [
  // Activadas solo con options.includeChilean = true. El voseo chileno
  // se diferencia del argentino por las terminaciones verbales agudas
  // en -ís en lugar de -és (tenís vs tenés, querís vs querés).
  { id: 'tenis_cl', pattern: wb('tenís'), tu: 'tienes', usted: 'tiene', preserveCaps: true },
  { id: 'queris_cl', pattern: wb('querís'), tu: 'quieres', usted: 'quiere', preserveCaps: true },
  { id: 'podis_cl', pattern: wb('podís'), tu: 'puedes', usted: 'puede', preserveCaps: true },
  { id: 'eris_cl', pattern: wb('erís'), tu: 'eres', usted: 'es', preserveCaps: true },
];

const CODE_FENCE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`[^`\n]+`/g;
// String JSON entre comillas con escape. Evita filtrar el campo "name"
// de un payload tool-call que el modelo puede haber serializado.
const JSON_STRING_RE = /"(?:[^"\\]|\\.)*"/g;

/**
 * Marcadores considerados "fuertes" para la guarda de contexto. Si una
 * oración contiene cualquiera de estos, los marcadores ambiguos (acá,
 * allá, dale) sí se reemplazan en esa oración.
 */
const STRONG_VOSEO_IDS = new Set([
  'vos', 'sos', 'tenes', 'queres', 'podes', 'decis', 'sabes_voseo',
  'vives_voseo', 'venis', 'salis', 'decides_voseo', 'hablas_voseo',
  'dejas_voseo', 'pasas_voseo', 'trabajas_voseo', 'siembras_voseo',
  'riegas_voseo', 'cosechas_voseo', 'pones_voseo',
  'mira_voseo', 'anda_voseo', 'veni_voseo', 'elegi_voseo', 'fijate_voseo',
  'pone_voseo', 'sembra_voseo', 'rega_voseo', 'cosecha_voseo',
  'tene_voseo', 'deci_voseo', 'deja_voseo', 'hace_voseo',
  'mirate', 'acordate', 'quedate', 'cuidate', 'animate', 'pegate',
  'sentate', 'ponete',
  // Chileno también cuenta como contexto fuerte cuando esté activado.
  'tenis_cl', 'queris_cl', 'podis_cl', 'eris_cl',
]);

const TELEMETRY_STORAGE_KEY = 'chagra:voseo_filter_triggers';

/**
 * Incrementa contador local de gatillos del filtro. No-op si localStorage
 * no disponible (SSR, jsdom estricto, modo privado).
 *
 * @param {string} markerId
 */
function bumpTelemetryCounter(markerId) {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    /** @type {Record<string, number>} */
    let counters;
    try {
      counters = raw ? JSON.parse(raw) : {};
      if (!counters || typeof counters !== 'object') counters = {};
    } catch (_) {
      counters = {};
    }
    counters[markerId] = (counters[markerId] || 0) + 1;
    counters.__total = (counters.__total || 0) + 1;
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(counters));
  } catch (_) {
    // localStorage puede tirar QuotaExceededError en navegadores en
    // modo privado o con storage lleno. Silencioso por diseño: la
    // telemetría es best-effort, nunca bloquea el filtro.
  }
}

/**
 * Lee los contadores de telemetría persistidos. Útil para debugging
 * desde consola o exportes de diagnóstico.
 *
 * @returns {Record<string, number>}
 */
export function getVoseoTelemetry() {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch (_) {
    return {};
  }
}

/**
 * Resetea los contadores de telemetría. Útil para tests y para purgar
 * antes de un bench manual.
 */
export function resetVoseoTelemetry() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(TELEMETRY_STORAGE_KEY);
  } catch (_) {
    // ignore
  }
}

/**
 * Replica la capitalización inicial del match en el reemplazo si la
 * regla lo pide y el primer carácter del match es mayúscula.
 */
function applyReplacement(match, replacement, preserveCaps) {
  if (!preserveCaps || !match || match.length === 0) return replacement;
  const first = match.charAt(0);
  // Mayúscula real (no dígito, no símbolo).
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Particiona el texto en regiones "free" (filtrables) y "protected"
 * (intactas: code fences, inline code, strings JSON con escape). Las
 * regiones protegidas se preservan tal cual.
 *
 * Pasada secuencial: primero detecta code fences (greedy ```...```),
 * luego inline code SOLO en posiciones libres, luego strings JSON SOLO
 * en posiciones libres. Esto evita que el regex de inline code consuma
 * backticks que pertenecen a un fence ya detectado o que cruce un fence
 * y se quede con un opening backtick que correspondía al siguiente
 * inline code legítimo.
 *
 * @param {string} text
 * @returns {Array<{ kind: 'free' | 'protected', content: string }>}
 */
function partitionProtected(text) {
  /** @type {Array<[number, number]>} */
  const ranges = [];

  // 1) Code fences ```...``` (greedy multiline, sin solapamiento).
  CODE_FENCE_RE.lastIndex = 0;
  let m;
  while ((m = CODE_FENCE_RE.exec(text)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
    if (m[0].length === 0) CODE_FENCE_RE.lastIndex += 1;
  }

  // 2) Inline code `...` y strings JSON solo en las regiones libres
  //    (fuera de los fences ya capturados). Computamos los segmentos
  //    libres y aplicamos los regex DENTRO de cada segmento — esto
  //    evita que un inline code "spurious" cruce las fronteras de un
  //    fence y consuma backticks de un inline code legítimo posterior.
  const fenceRanges = ranges.slice().sort((a, b) => a[0] - b[0]);
  const freeSegments = [];
  let fenceCursor = 0;
  for (const [s, e] of fenceRanges) {
    if (s > fenceCursor) freeSegments.push([fenceCursor, s]);
    fenceCursor = e;
  }
  if (fenceCursor < text.length) freeSegments.push([fenceCursor, text.length]);

  for (const [s, e] of freeSegments) {
    const seg = text.slice(s, e);
    INLINE_CODE_RE.lastIndex = 0;
    while ((m = INLINE_CODE_RE.exec(seg)) !== null) {
      ranges.push([s + m.index, s + m.index + m[0].length]);
      if (m[0].length === 0) INLINE_CODE_RE.lastIndex += 1;
    }
    JSON_STRING_RE.lastIndex = 0;
    while ((m = JSON_STRING_RE.exec(seg)) !== null) {
      ranges.push([s + m.index, s + m.index + m[0].length]);
      if (m[0].length === 0) JSON_STRING_RE.lastIndex += 1;
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  /** @type {Array<[number, number]>} */
  const merged = [];
  for (const [s, e] of ranges) {
    if (merged.length > 0 && s <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    } else {
      merged.push([s, e]);
    }
  }
  /** @type {Array<{ kind: 'free' | 'protected', content: string }>} */
  const out = [];
  let cursor = 0;
  for (const [s, e] of merged) {
    if (s > cursor) out.push({ kind: 'free', content: text.slice(cursor, s) });
    out.push({ kind: 'protected', content: text.slice(s, e) });
    cursor = e;
  }
  if (cursor < text.length) out.push({ kind: 'free', content: text.slice(cursor) });
  return out;
}

/**
 * Detecta si una oración contiene al menos un marcador "fuerte" voseo.
 * Habilita el reemplazo de marcadores de contexto débil (acá, dale).
 *
 * @param {string} sentence
 * @param {ReplaceRule[]} rules — set actual de reglas (incluye chileno si está on).
 * @returns {boolean}
 */
function sentenceHasStrongVoseo(sentence, rules) {
  for (const rule of rules) {
    if (!STRONG_VOSEO_IDS.has(rule.id)) continue;
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(sentence)) return true;
  }
  return false;
}

/**
 * Léxico EXCLUSIVAMENTE rioplatense: no existe en el español colombiano de
 * ninguna región. ESTO es lo que delata "argentino" — NO la conjugación voseo,
 * que es legítima y auténtica en Antioquia/Eje/Valle/Cauca/Nariño. Por eso se
 * reemplaza SIEMPRE, incluso en regiones voseantes donde el voseo se preserva.
 * @type {ReplaceRule[]}
 */
const ARGENTINE_LEXICON = [
  { id: 'lex_che', pattern: wb('che'), tu: 'oiga', usted: 'oiga', preserveCaps: true },
  { id: 'lex_boludo', pattern: wb('bolud[oa]'), tu: '', usted: '', preserveCaps: false },
  { id: 'lex_pelotudo', pattern: wb('pelotud[oa]'), tu: '', usted: '', preserveCaps: false },
  { id: 'lex_pibe', pattern: wb('pib[ea]'), tu: 'muchacho', usted: 'muchacho', preserveCaps: true },
  { id: 'lex_laburo', pattern: wb('laburo'), tu: 'trabajo', usted: 'trabajo', preserveCaps: true },
  { id: 'lex_laburar', pattern: wb('labur[aá]r'), tu: 'trabajar', usted: 'trabajar', preserveCaps: true },
  { id: 'lex_quilombo', pattern: wb('quilombo'), tu: 'desorden', usted: 'desorden', preserveCaps: true },
  { id: 'lex_chabon', pattern: wb('chab[oó]n'), tu: 'tipo', usted: 'tipo', preserveCaps: true },
];

/**
 * Regiones lingüísticas de Colombia (claves de regionalisms-co.json) cuyo
 * registro AUTÉNTICO es el voseo. Aplanarlo a tú/usted les borra el acento
 * propio → anti-misión. En estas regiones se PRESERVA la morfología voseo y
 * solo se limpia el léxico rioplatense.
 */
const VOSEO_REGIONS = new Set(['paisa', 'pacifico', 'pastuso']);
/** Regiones tuteantes (Caribe). */
const TU_REGIONS = new Set(['caribe']);
/** Regiones ustedeantes (resto andino + llano + amazonía). */
const USTED_REGIONS = new Set(['cundiboyacense', 'santandereano', 'opita', 'llanero', 'amazonica']);

/**
 * Resuelve la política de dialecto desde la región lingüística del usuario.
 * Sin región (o desconocida) → comportamiento histórico (aplanar a la
 * `fallbackFormality`, default usted). Es la clave de la retro-compatibilidad.
 *
 * @param {string|undefined|null} region  clave de región (paisa/caribe/…)
 * @param {'tu'|'usted'} fallbackFormality
 * @returns {{ preserveVoseo: boolean, formality: 'tu'|'usted' }}
 */
function resolveDialectPolicy(region, fallbackFormality) {
  if (region && VOSEO_REGIONS.has(region)) return { preserveVoseo: true, formality: fallbackFormality };
  if (region && TU_REGIONS.has(region)) return { preserveVoseo: false, formality: 'tu' };
  if (region && USTED_REGIONS.has(region)) return { preserveVoseo: false, formality: 'usted' };
  return { preserveVoseo: false, formality: fallbackFormality };
}

/**
 * Filtro principal. Aplica el sweep determinístico sobre el texto y
 * devuelve la versión normalizada al español colombiano (tú o usted
 * según `options.formality`).
 *
 * Idempotente: filterVoseo(filterVoseo(t)) === filterVoseo(t).
 *
 * @param {string} text
 * @param {VoseoFilterOptions} [options]
 * @returns {string}
 */
export function filterVoseo(text, options = {}) {
  if (typeof text !== 'string' || text.length === 0) return text;

  const {
    formality = 'usted',
    onMatch,
    telemetry = false,
    includeChilean = false,
    preserveIsolatedAca = true,
    region = null,
  } = options;

  // Región-aware (fix paisa 2026-06-02): en zonas voseantes (paisa/pacífico/
  // pastuso) el voseo es el registro AUTÉNTICO → se preserva la morfología y
  // solo se limpia el léxico rioplatense. En Caribe → tú; resto → usted.
  const policy = resolveDialectPolicy(region, formality);
  const voseoRules = includeChilean ? [...VOSEO_RULES, ...CHILEAN_RULES] : VOSEO_RULES;
  // El léxico argentino se limpia SIEMPRE; las reglas de morfología voseo solo
  // si la región NO es voseante.
  const rules = policy.preserveVoseo ? ARGENTINE_LEXICON : [...ARGENTINE_LEXICON, ...voseoRules];

  const partitions = partitionProtected(text);

  const processed = partitions.map((part) => {
    if (part.kind === 'protected') return part.content;

    // Dividimos por oración para evaluar la guarda de contexto. Mantenemos
    // el separador para que la unión preserve el texto original.
    const sentences = splitIntoSentencesWithSep(part.content);

    return sentences
      .map(({ sentence, sep }) => {
        const strongPresent = sentenceHasStrongVoseo(sentence, rules);
        let out = sentence;
        for (const rule of rules) {
          if (rule.requiresContext && preserveIsolatedAca && !strongPresent) {
            continue;
          }
          rule.pattern.lastIndex = 0;
          out = out.replace(rule.pattern, (match) => {
            const target = policy.formality === 'usted' ? rule.usted : rule.tu;
            const finalText = applyReplacement(match, target, rule.preserveCaps ?? false);
            if (onMatch) {
              try { onMatch(rule.id, match, finalText); } catch (_) { /* swallow */ }
            }
            if (telemetry) bumpTelemetryCounter(rule.id);
            return finalText;
          });
        }
        return out + sep;
      })
      .join('');
  });

  return processed.join('');
}

/**
 * Divide un texto en oraciones preservando el separador. Heurística
 * simple: split por boundary `[.!?…]+` seguido de whitespace.
 *
 * No es un parser perfecto (no maneja "Sr. González" o "etc." de forma
 * óptima), pero para respuestas del LLM en español funciona suficiente.
 *
 * @param {string} text
 * @returns {Array<{ sentence: string, sep: string }>}
 */
function splitIntoSentencesWithSep(text) {
  /** @type {Array<{ sentence: string, sep: string }>} */
  const out = [];
  const re = /([.!?…]+)(\s+|$)/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const endOfSentence = m.index + m[1].length;
    const sentence = text.slice(lastIndex, endOfSentence);
    const sep = m[2];
    out.push({ sentence, sep });
    lastIndex = re.lastIndex;
    if (re.lastIndex === m.index) re.lastIndex += 1; // safety vs zero-length match
  }
  if (lastIndex < text.length) {
    out.push({ sentence: text.slice(lastIndex), sep: '' });
  }
  if (out.length === 0) {
    // Texto sin boundary — toda la entrada es una sola oración.
    out.push({ sentence: text, sep: '' });
  }
  return out;
}

/**
 * Conveniencia para tests y diagnóstico: lista de ids de marcadores
 * cubiertos por el filtro v1.1.0 (sin chileno).
 *
 * @returns {string[]}
 */
export function listVoseoMarkerIds() {
  return VOSEO_RULES.map((r) => r.id);
}
