/**
 * bench-scorer.mjs — evaluador de respuestas del bench del agente Chagra.
 *
 * R3 (re-bench post-guards 2026-05-31): el scoring de `bench-agente-completo`
 * era match LITERAL de cadenas (`response.includes(keyword)`). granite3.1 decía
 * lo correcto con OTRAS palabras (sinónimos / lemas) y sacaba 0/10 — un falso
 * negativo que engañaba el ranking. Este módulo provee:
 *
 *   1) scoreKeywordsFlexible — match insensible a tildes/case + lema (stem
 *      ligero del español) + sinónimos del dominio agroecológico colombiano.
 *      Reemplaza al `countKeywords` literal sin cambiar el contrato (devuelve
 *      conteo + total + qué keywords casaron).
 *
 *   2) LLM-judge opcional (flag --judge del bench): buildJudgePrompt +
 *      parseJudgeVerdict + scoreWithJudge. El caller de ollama se INYECTA, así
 *      el judge es testeable sin GPU y degrada a keyword-flexible si el modelo
 *      no está / falla / responde ilegible. Modelo recomendado: mistral-nemo:12b
 *      (índice de benchmarks: judge 100% NUEVO).
 *
 * Módulo PURO y sin efectos secundarios (no auto-ejecuta nada) → importable por
 * el bench y por el test unitario.
 *
 * @module bench-scorer
 */

// ── normalización ───────────────────────────────────────────────────────────

/** minúsculas + sin diacríticos + colapsa espacios. */
function norm(s) {
  return (s || '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s/-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Stem ligero del español: recorta sufijos flexivos/derivativos comunes para
 * que "podas/podar/podado/podada" → "pod", "variedades" → "variedad" ~ "varied",
 * "resistentes" → "resistent". No es Snowball completo; basta para el bench.
 */
function stem(word) {
  let w = word;
  if (w.length <= 4) return w;
  const suffixes = [
    'amientos', 'imientos', 'amiento', 'imiento',
    'aciones', 'iciones', 'acion', 'icion', 'cion', 'sion',
    'antes', 'entes', 'ante', 'ente',
    'ables', 'ibles', 'able', 'ible',
    'adas', 'idas', 'ados', 'idos', 'ada', 'ido', 'ada', 'ido',
    'ando', 'iendo', 'ar', 'er', 'ir',
    'mente',
    'es', 'as', 'os', 'a', 'o', 's',
  ];
  for (const suf of suffixes) {
    if (w.length - suf.length >= 3 && w.endsWith(suf)) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

/** stem de cada token de una frase. */
function stemPhrase(phrase) {
  return norm(phrase).split(' ').filter(Boolean).map(stem);
}

// ── sinónimos del dominio ───────────────────────────────────────────────────

/**
 * Sinónimos / equivalencias del dominio agroecológico colombiano. Cada keyword
 * canónica lista frases que cuentan como acierto aunque el modelo no use la
 * palabra exacta. Se comparan ya normalizadas (sin tildes). Lista acotada y
 * conservadora — solo equivalencias inequívocas vistas en el bench.
 */
const DOMAIN_SYNONYMS = {
  heladas: ['helada', 'frio intenso', 'frio extremo', 'bajas temperaturas', 'temperaturas bajas', 'escarcha', 'congelamiento'],
  riego: ['regar', 'irrigacion', 'humedad constante', 'agua constante', 'goteo'],
  drenaje: ['drenar', 'bien drenado', 'suelo drenado', 'sin encharcar', 'sin encharcamiento', 'buen drenaje'],
  poda: ['podar', 'podas', 'despunte', 'deshoje', 'corte de hojas'],
  sombra: ['sombrio', 'semisombra', 'media sombra', 'sombreado'],
  nitrogeno: ['fijar nitrogeno', 'fijacion de nitrogeno', 'abono nitrogenado', 'leguminosas', 'fijadores de nitrogeno', 'fijador de nitrogeno'],
  'caldo bordeles': ['caldo bordeles', 'cal y sulfato de cobre', 'sulfato de cobre con cal'],
  'sulfato de cobre': ['sulfato cuprico', 'cobre'],
  fungicida: ['fungico', 'antifungico', 'control de hongos'],
  compost: ['compostaje', 'abono organico', 'materia organica descompuesta'],
  'materia organica': ['abono organico', 'humus', 'composta', 'compost'],
  'control biologico': ['enemigos naturales', 'depredadores naturales', 'parasitoides', 'controlador biologico'],
  aireacion: ['ventilacion', 'circulacion de aire', 'buena aireacion'],
  invernadero: ['cubierta', 'tunel', 'macrotunel', 'casa malla'],
};

// ── R3.1: keyword-flexible ──────────────────────────────────────────────────

/**
 * ¿La keyword `kw` aparece en `respNorm` por (a) substring literal, (b) lema, o
 * (c) sinónimo del dominio? `respStems` es el set de stems del texto.
 */
function keywordHits(kw, respNorm, respStems) {
  const kwNorm = norm(kw);
  if (!kwNorm) return false;

  // (a) literal (insensible a tildes/case).
  if (respNorm.includes(kwNorm)) return true;

  // (c) sinónimos del dominio (antes que el lema: más específico).
  const syns = DOMAIN_SYNONYMS[kwNorm];
  if (syns) {
    for (const s of syns) {
      if (respNorm.includes(norm(s))) return true;
    }
  }

  // (b) lema: TODOS los tokens stemmed de la keyword presentes como stems del
  // texto. Para keyword de una palabra equivale a "stem en el texto".
  const kwStems = stemPhrase(kwNorm);
  if (kwStems.length > 0 && kwStems.every((st) => respStems.has(st))) return true;

  return false;
}

/**
 * scoreKeywordsFlexible — reemplazo flexible de `countKeywords`. Cuenta cuántas
 * de `expectedKeywords` están cubiertas por la respuesta vía literal / lema /
 * sinónimo del dominio.
 *
 * @param {string} response
 * @param {string[]} expectedKeywords
 * @returns {{ matched:number, total:number, matchedKeywords:string[] }}
 */
export function scoreKeywordsFlexible(response, expectedKeywords) {
  const kws = Array.isArray(expectedKeywords) ? expectedKeywords : [];
  if (typeof response !== 'string' || response.length === 0 || kws.length === 0) {
    return { matched: 0, total: kws.length, matchedKeywords: [] };
  }
  const respNorm = norm(response);
  const respStems = new Set(respNorm.split(' ').filter(Boolean).map(stem));
  const matchedKeywords = [];
  for (const kw of kws) {
    if (keywordHits(kw, respNorm, respStems)) matchedKeywords.push(kw);
  }
  return { matched: matchedKeywords.length, total: kws.length, matchedKeywords };
}

// ── R3.2: LLM-judge ─────────────────────────────────────────────────────────

/**
 * buildJudgePrompt — arma el prompt del juez (mistral-nemo:12b). Le pide evaluar
 * si la respuesta cumple el criterio SUSTANTIVO de la pregunta (no si repite las
 * palabras exactas), apoyándose en los keywords esperados como guía de fondo, y
 * devolver un veredicto parseable.
 *
 * @param {{query:string, response:string, expectedKeywords:string[]}} args
 * @returns {string}
 */
export function buildJudgePrompt({ query, response, expectedKeywords = [] }) {
  const guia = (expectedKeywords || []).join(', ');
  return [
    'Eres un evaluador experto en agroecología colombiana. Evalúa si la RESPUESTA',
    'responde de forma sustantivamente CORRECTA a la PREGUNTA. Importa el FONDO',
    '(los conceptos correctos), NO que use las palabras exactas: cuenta como',
    'acierto si dice lo mismo con sinónimos o lemas distintos.',
    '',
    `PREGUNTA: ${query}`,
    '',
    `CONCEPTOS esperados (guía de fondo, no exige literalidad): ${guia}`,
    '',
    `RESPUESTA DEL MODELO: ${response}`,
    '',
    'Devuelve SOLO un JSON en una línea con esta forma:',
    '{"cumple": true|false, "score": 0.0-1.0}',
    'donde "cumple" indica si la respuesta es sustantivamente correcta y "score"',
    'la cobertura de los conceptos de fondo. Si no puedes, escribe VEREDICTO: CUMPLE',
    'o VEREDICTO: NO_CUMPLE.',
  ].join('\n');
}

/**
 * parseJudgeVerdict — interpreta la salida del juez. Acepta JSON
 * {"cumple":bool,"score":num} o texto "VEREDICTO: CUMPLE|NO_CUMPLE". Devuelve
 * null si es ilegible (el caller hace fallback). NO inventa veredictos.
 *
 * @param {string} raw
 * @returns {{cumple:boolean, score:number}|null}
 */
export function parseJudgeVerdict(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  // 1) JSON embebido.
  const jsonMatch = raw.match(/\{[^{}]*"cumple"[^{}]*\}/i);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (typeof obj.cumple === 'boolean') {
        let score = Number(obj.score);
        if (!Number.isFinite(score) || score < 0 || score > 1) score = obj.cumple ? 1 : 0;
        return { cumple: obj.cumple, score };
      }
    } catch (_) {
      /* sigue a texto plano */
    }
  }

  // 2) Texto plano "VEREDICTO: CUMPLE / NO_CUMPLE".
  const up = raw.toUpperCase();
  if (/VEREDICTO\s*:?\s*NO[_\s]?CUMPLE/.test(up)) return { cumple: false, score: 0 };
  if (/VEREDICTO\s*:?\s*CUMPLE/.test(up)) return { cumple: true, score: 1 };

  return null;
}

/**
 * scoreWithJudge — evalúa una respuesta con el LLM-judge, con fallback a
 * keyword-flexible. El caller de ollama se inyecta (`opts.ollamaCall`) para que
 * el bench pase el suyo real (mistral-nemo:12b) y el test pase un fake.
 *
 * @param {{query:string, response:string, expectedKeywords:string[]}} item
 * @param {{ ollamaCall: (prompt:string)=>Promise<string> }} opts
 * @returns {Promise<{cumple:boolean, score:number, source:'judge'|'keywords'}>}
 */
export async function scoreWithJudge(item, { ollamaCall } = {}) {
  const kwFlex = scoreKeywordsFlexible(item.response, item.expectedKeywords);
  const kwScore = kwFlex.total > 0 ? kwFlex.matched / kwFlex.total : 0;
  const fallback = { cumple: kwScore >= 0.5, score: kwScore, source: 'keywords' };

  if (typeof ollamaCall !== 'function') return fallback;

  try {
    const prompt = buildJudgePrompt(item);
    const raw = await ollamaCall(prompt);
    const verdict = parseJudgeVerdict(raw);
    if (!verdict) return fallback;
    return { cumple: verdict.cumple, score: verdict.score, source: 'judge' };
  } catch (_) {
    return fallback;
  }
}
