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
 *      no está / falla / responde ilegible.
 *
 *   3) Anti-alucinación (R4): buildAntiHallucPrompt + parseAHVerdict +
 *      scoreAntiHalluc, que evalúan contra `must_include` (debe estar) y
 *      `red_flags` (NO debe estar) — la métrica AH que importa al dominio. Útil
 *      para los prompts complejos rotativos (must_include / red_flags / binomial).
 *
 * INDEPENDENCIA DEL JUEZ (R4, 2026-05-31): el juez NO puede ser el modelo que
 * generó la respuesta — eso es auto-evaluación y sesga el score (un modelo se
 * perdona sus propias alucinaciones). El default histórico apuntaba al generador
 * (granite3.1-dense:8b) / a mistral-nemo:12b (que CRASHEA en Maxwell sm_52 con
 * 'signal during cgo'). `assertIndependentJudge` rechaza explícitamente usar el
 * generador como juez. Juez independiente recomendado en Maxwell sin API
 * Anthropic disponible: `qwen2.5:14b` (corre estable en sm_52, familia distinta
 * a granite). Ideal cuando hay ANTHROPIC_API_KEY: un Haiku cloud, vía el pipeline
 * Python `tools/llm-judge/` (Chagra-strategy) — NO hay key en este entorno.
 *
 * Módulo PURO y sin efectos secundarios (no auto-ejecuta nada) → importable por
 * el bench y por el test unitario.
 *
 * @module bench-scorer
 */

/**
 * Juez independiente recomendado para correr en Maxwell (sm_52) sin acceso a la
 * API Anthropic. Familia distinta al generador (granite) → no es auto-eval.
 * mistral-nemo:12b queda DESCARTADO como default por crash en Maxwell.
 */
export const RECOMMENDED_JUDGE_MODEL = 'qwen2.5:14b';

/** El generador del bench cuyo uso como juez = auto-evaluación (prohibido). */
export const GENERATOR_MODEL = 'granite3.1-dense:8b';

/**
 * assertIndependentJudge — lanza si el modelo juez es el mismo que generó la
 * respuesta (auto-evaluación). Verify-before-claim: el score solo es creíble si
 * el juez es independiente del generador.
 *
 * @param {string} judgeModel  modelo que evalúa.
 * @param {string} generatorModel  modelo que generó la respuesta evaluada.
 * @throws {Error} si juez === generador.
 */
export function assertIndependentJudge(judgeModel, generatorModel) {
  const j = (judgeModel || '').trim().toLowerCase();
  const g = (generatorModel || '').trim().toLowerCase();
  if (j && g && j === g) {
    throw new Error(
      `Juez NO independiente: '${judgeModel}' es el generador → auto-evaluación. ` +
        `Usá un juez de otra familia (recomendado: ${RECOMMENDED_JUDGE_MODEL}).`,
    );
  }
}

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
 * el bench pase el suyo real (juez independiente) y el test pase un fake.
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

// ── R4: juez anti-alucinación (must_include / red_flags / binomial) ───────────

/**
 * buildAntiHallucPrompt — prompt para el juez ANTI-ALUCINACIÓN. A diferencia del
 * judge de cobertura (scoreWithJudge), aquí el eje es la métrica que importa al
 * dominio: que estén presentes los hechos que DEBEN estar (`mustInclude`) y que
 * NO aparezca ninguna de las alucinaciones / errores prohibidos (`redFlags`,
 * p. ej. binomio equivocado, agroquímico inventado con dosis, especie confundida).
 *
 * El veredicto es PASS solo si: todos los must_include cubiertos (por fondo, no
 * literal) Y cero red_flags presentes. El juez devuelve además el detalle para
 * diagnóstico.
 *
 * @param {{query:string, response:string, mustInclude?:string[], redFlags?:string[], shouldInclude?:string[]}} args
 * @returns {string}
 */
export function buildAntiHallucPrompt({
  query,
  response,
  mustInclude = [],
  redFlags = [],
  shouldInclude = [],
}) {
  const must = (mustInclude || []).map((m) => `- ${m}`).join('\n') || '- (ninguno)';
  const red = (redFlags || []).map((r) => `- ${r}`).join('\n') || '- (ninguno)';
  const should = (shouldInclude || []).map((s) => `- ${s}`).join('\n') || '- (ninguno)';
  return [
    'Eres un evaluador EXPERTO en agroecología colombiana y un detector estricto',
    'de alucinaciones. Evalúa la RESPUESTA contra dos listas. Importa el FONDO',
    '(conceptos correctos), NO la literalidad: un concepto cuenta como presente si',
    'la respuesta lo dice con sinónimos o lemas distintos.',
    '',
    `PREGUNTA: ${query}`,
    '',
    'DEBE INCLUIR (hechos que tienen que estar presentes, por fondo):',
    must,
    '',
    'NO DEBE INCLUIR — RED FLAGS (alucinaciones/errores prohibidos; si aparece',
    'CUALQUIERA, es FAIL): especie/binomio equivocado, agroquímico de marca con',
    'dosis inventada, confundir una planta con otra, recomendar algo fuera de su',
    'clima/altitud, validar una premisa falsa del usuario:',
    red,
    '',
    'DESEABLE (suma pero no obliga):',
    should,
    '',
    'Reglas de veredicto:',
    '- "pass": true SOLO si TODOS los DEBE INCLUIR están cubiertos por fondo Y',
    '  NINGÚN red flag aparece.',
    '- Si falta un DEBE INCLUIR, o si aparece un red flag, "pass": false.',
    '',
    'Devuelve SOLO un JSON en una línea con esta forma exacta:',
    '{"pass": true|false, "must_covered": <int>, "must_total": <int>, "red_flags_hit": <int>}',
    'Si no puedes producir JSON, escribe VEREDICTO: PASS o VEREDICTO: FAIL.',
  ].join('\n');
}

/**
 * parseAHVerdict — interpreta la salida del juez anti-alucinación. Acepta JSON
 * {"pass":bool, "must_covered":int, "must_total":int, "red_flags_hit":int} o
 * texto "VEREDICTO: PASS|FAIL". Devuelve null si es ilegible (el caller hace
 * fallback). NO inventa veredictos.
 *
 * @param {string} raw
 * @returns {{pass:boolean, mustCovered:number, mustTotal:number, redFlagsHit:number}|null}
 */
export function parseAHVerdict(raw) {
  if (typeof raw !== 'string' || raw.length === 0) return null;

  const jsonMatch = raw.match(/\{[^{}]*"pass"[^{}]*\}/i);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (typeof obj.pass === 'boolean') {
        const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
        return {
          pass: obj.pass,
          mustCovered: num(obj.must_covered),
          mustTotal: num(obj.must_total),
          redFlagsHit: num(obj.red_flags_hit),
        };
      }
    } catch (_) {
      /* sigue a texto plano */
    }
  }

  const up = raw.toUpperCase();
  if (/VEREDICTO\s*:?\s*FAIL/.test(up)) {
    return { pass: false, mustCovered: null, mustTotal: null, redFlagsHit: null };
  }
  if (/VEREDICTO\s*:?\s*PASS/.test(up)) {
    return { pass: true, mustCovered: null, mustTotal: null, redFlagsHit: null };
  }
  return null;
}

/**
 * scoreAntiHalluc — evalúa anti-alucinación con el LLM-judge independiente. NO
 * tiene fallback de keyword porque el eje es la AUSENCIA de red_flags (un
 * keyword-match no detecta una alucinación). Si el juez no responde / falla,
 * devuelve `source:'unjudged'` para que el caller lo cuente aparte (no como PASS
 * ni como FAIL silencioso).
 *
 * El caller de ollama se inyecta (`opts.ollamaCall`); el test pasa un fake.
 *
 * @param {{query:string, response:string, mustInclude?:string[], redFlags?:string[], shouldInclude?:string[]}} item
 * @param {{ ollamaCall: (prompt:string)=>Promise<string> }} opts
 * @returns {Promise<{pass:boolean|null, mustCovered:number|null, mustTotal:number|null, redFlagsHit:number|null, source:'judge'|'unjudged'}>}
 */
export async function scoreAntiHalluc(item, { ollamaCall } = {}) {
  const unjudged = {
    pass: null,
    mustCovered: null,
    mustTotal: Array.isArray(item.mustInclude) ? item.mustInclude.length : null,
    redFlagsHit: null,
    source: 'unjudged',
  };
  if (typeof ollamaCall !== 'function') return unjudged;
  if (typeof item.response !== 'string' || item.response.trim().length === 0) {
    return unjudged;
  }
  try {
    const prompt = buildAntiHallucPrompt(item);
    const raw = await ollamaCall(prompt);
    const verdict = parseAHVerdict(raw);
    if (!verdict) return unjudged;
    return { ...verdict, source: 'judge' };
  } catch (_) {
    return unjudged;
  }
}
