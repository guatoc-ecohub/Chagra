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
 * generador como juez.
 *
 * JUEZ ANTHROPIC (R5, 2026-06-01): NINGÚN juez LLM *local* es confiable en la
 * Maxwell M6000 (sm_52):
 *   - `qwen2.5:14b`      → devuelve respuesta VACÍA (no juzga nada).
 *   - `llama3.1:8b`      → devuelve respuesta VACÍA.
 *   - `mistral-nemo:12b` → aprueba TODO (rubber-stamp; además crash cgo).
 * Por eso el juez confiable por defecto pasa a ser **Claude Sonnet** vía la API de
 * Anthropic (`claude-sonnet-5`: modelo de juez estable y más capaz). El proveedor
 * se elige con la env `JUDGE_PROVIDER` (anthropic|ollama|deterministic). Si NO
 * hay API key disponible, se degrada de forma graceful al scorer DETERMINÍSTICO
 * (substring de must_include + ausencia de red_flags) — nunca crashea.
 *
 * LECTURA SEGURA DE LA KEY (R5): la API key se lee SOLO en runtime, primero de
 * `process.env.ANTHROPIC_API_KEY` y, si no está, del archivo gitignored
 * `~/.config/chagra-anthropic-judge-key` (chmod 600). JAMÁS se imprime, loguea ni
 * se incluye en commits / tests / fixtures. Los tests mockean la llamada HTTP y
 * NO necesitan key real para pasar.
 *
 * Módulo PURO y sin efectos secundarios (no auto-ejecuta nada) → importable por
 * el bench y por el test unitario.
 *
 * @module bench-scorer
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Modelo Anthropic de juez (estable y más capaz). Se usa cuando
 * `JUDGE_PROVIDER=anthropic` (default si hay API key disponible).
 */
export const RECOMMENDED_ANTHROPIC_JUDGE_MODEL = 'claude-sonnet-5';

/**
 * Juez recomendado por defecto: Claude Sonnet vía API de Anthropic. Los jueces
 * LOCALES están ROTOS en Maxwell (qwen2.5:14b y llama3.1:8b devuelven vacío;
 * mistral-nemo:12b aprueba todo = rubber-stamp). Cuando no hay API key, el
 * pipeline degrada al scorer determinístico (ver `selectJudgeProvider`).
 *
 * NOTA: este es un *modelo de Anthropic*, no de ollama. Los benches que corren
 * con `JUDGE_PROVIDER=ollama` deben usar `RECOMMENDED_OLLAMA_JUDGE_MODEL`.
 */
export const RECOMMENDED_JUDGE_MODEL = RECOMMENDED_ANTHROPIC_JUDGE_MODEL;

/**
 * Juez LOCAL (ollama) — DESCARTADO como default en Maxwell sm_52: qwen2.5:14b y
 * llama3.1:8b devuelven respuesta vacía, mistral-nemo:12b aprueba todo. Se
 * conserva el identificador solo para quien fuerce `JUDGE_PROVIDER=ollama` en
 * una GPU compatible (Ampere+); en Maxwell NO produce veredictos creíbles.
 */
export const RECOMMENDED_OLLAMA_JUDGE_MODEL = 'qwen2.5:14b';

/** El generador del bench cuyo uso como juez = auto-evaluación (prohibido). */
export const GENERATOR_MODEL = 'granite3.3:8b';

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
        `Use un juez de otra familia (recomendado: ${RECOMMENDED_JUDGE_MODEL}).`,
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
    'adas', 'idas', 'ados', 'idos', 'ada', 'ido',
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
export async function scoreWithJudge(item, { ollamaCall } = /** @type {any} */ ({})) {
  const kwFlex = scoreKeywordsFlexible(item.response, item.expectedKeywords);
  const kwScore = kwFlex.total > 0 ? kwFlex.matched / kwFlex.total : 0;
  const fallback = { cumple: kwScore >= 0.5, score: kwScore, source: /** @type {'keywords'|'judge'} */ ('keywords') };

  if (typeof ollamaCall !== 'function') return fallback;

  try {
    const prompt = buildJudgePrompt(item);
    const raw = await ollamaCall(prompt);
    const verdict = parseJudgeVerdict(raw);
    if (!verdict) return fallback;
    return { cumple: verdict.cumple, score: verdict.score, source: /** @type {'keywords'|'judge'} */ ('judge') };
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
export async function scoreAntiHalluc(item, { ollamaCall } = /** @type {any} */ ({})) {
  const unjudged = {
    pass: null,
    mustCovered: null,
    mustTotal: Array.isArray(item.mustInclude) ? item.mustInclude.length : null,
    redFlagsHit: null,
    source: /** @type {'judge'|'unjudged'} */ ('unjudged'),
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
    return { ...verdict, source: /** @type {'judge'|'unjudged'} */ ('judge') };
  } catch (_) {
    return unjudged;
  }
}

// ── R5: juez Claude Sonnet (Anthropic API) + fallback determinístico ──────────

/**
 * Ruta del archivo gitignored con la API key del juez Anthropic. chmod 600. El
 * archivo lo crea el operador; NUNCA lo escribe este módulo ni se commitea.
 */
export const ANTHROPIC_JUDGE_KEY_PATH = join(homedir(), '.config', 'chagra-anthropic-judge-key');

/**
 * readAnthropicKey — lee la API key SOLO en runtime. Orden: (1) env
 * `ANTHROPIC_API_KEY`, (2) archivo gitignored `~/.config/chagra-anthropic-judge-key`.
 * Devuelve el string de la key o `null` si no hay ninguna. JAMÁS loguea/imprime
 * la key. No lanza si el archivo no existe ni si no se puede leer.
 *
 * @param {{ env?: Record<string,string|undefined>, keyPath?: string }} [opts]
 *   `env` y `keyPath` se inyectan en tests para no tocar el entorno/disco real.
 * @returns {string|null}
 */
export function readAnthropicKey({ env = process.env, keyPath = ANTHROPIC_JUDGE_KEY_PATH } = {}) {
  const fromEnv = (env && env.ANTHROPIC_API_KEY ? String(env.ANTHROPIC_API_KEY) : '').trim();
  if (fromEnv) return fromEnv;
  try {
    if (keyPath && existsSync(keyPath)) {
      const fromFile = readFileSync(keyPath, 'utf-8').trim();
      if (fromFile) return fromFile;
    }
  } catch (_) {
    /* archivo ilegible → tratamos como ausencia de key (degrada graceful) */
  }
  return null;
}

/**
 * extractAnthropicText — saca el texto de la respuesta de la API de Messages de
 * Anthropic: `{ content: [{ type:'text', text:'...' }, ...] }`. Devuelve string
 * (posiblemente vacío). Tolerante a formas inesperadas.
 *
 * @param {any} data
 * @returns {string}
 */
export function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) return '';
  return data.content
    .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text)
    .join('')
    .trim();
}

/**
 * makeAnthropicJudgeCall — fabrica un caller de juez `(prompt) => Promise<string>`
 * que llama a la API de Anthropic (Messages) con un modelo Sonnet estable y
 * devuelve el TEXTO del veredicto, con el MISMO contrato que el `ollamaCall`
 * inyectable. Así enchufa directo en `scoreAntiHalluc` / `scoreWithJudge` sin
 * cambiarlos.
 *
 * La llamada `fetch` se inyecta (`fetchImpl`) para testear sin red ni key real.
 * Si la llamada falla / responde no-ok, lanza → `scoreAntiHalluc` cuenta el item
 * como `unjudged` (no inventa un veredicto). La key NUNCA se loguea.
 *
 * @param {{
 *   apiKey: string,
 *   model?: string,
 *   fetchImpl?: typeof fetch,
 *   timeoutMs?: number,
 *   maxTokens?: number,
 *   apiUrl?: string,
 *   anthropicVersion?: string,
 * }} opts
 * @returns {(prompt:string)=>Promise<string>}
 */
export function makeAnthropicJudgeCall({
  apiKey,
  model = RECOMMENDED_ANTHROPIC_JUDGE_MODEL,
  fetchImpl,
  timeoutMs = 60_000,
  maxTokens = 256,
  apiUrl = 'https://api.anthropic.com/v1/messages',
  anthropicVersion = '2023-06-01',
} = /** @type {any} */ ({})) {
  if (!apiKey || typeof apiKey !== 'string') {
    throw new Error('makeAnthropicJudgeCall: falta apiKey (no se loguea su valor).');
  }
  const doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (typeof doFetch !== 'function') {
    throw new Error('makeAnthropicJudgeCall: no hay implementación de fetch disponible.');
  }
  return async function anthropicJudgeCall(prompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await doFetch(apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': anthropicVersion,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          // temperatura 0 → veredicto determinista (igual que el juez local).
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // No incluimos cuerpo (podría reflejar la key en algún proxy) — solo status.
        throw new Error(`anthropic judge HTTP ${res.status}`);
      }
      const data = await res.json();
      return extractAnthropicText(data);
    } finally {
      clearTimeout(timer);
    }
  };
}

/**
 * Umbral por defecto de COBERTURA de must_include para el scorer determinístico.
 * Una respuesta PASA si cubre ≥ esta fracción de los must_include (no todos) y
 * NO dispara red_flags. Configurable por env `BENCH_MUST_THRESHOLD`.
 *
 * Por qué 0.6 y no 1.0: el fixture endurecido (TEST_PROMPTS_HARDENED_2026-06-22)
 * pone binomios científicos EXACTOS en must_include ("Ullucus tuberosus",
 * "Phytophthora infestans"). Ningún modelo 8b los reproduce textual, así que el
 * criterio todo-o-nada literal daba PASS=0 / FAIL=todos para CUALQUIER modelo:
 * cero señal discriminativa. 0.6 exige cubrir la mayoría del fondo (p. ej. usar
 * "tizón tardío" cuenta aunque omita el latín) sin perdonar omitir todo.
 */
export const DEFAULT_MUST_THRESHOLD = 0.6;

/**
 * resolveMustThreshold — resuelve el umbral de cobertura desde un valor explícito
 * o de la env `BENCH_MUST_THRESHOLD`, con `DEFAULT_MUST_THRESHOLD` de respaldo.
 * Clampa a [0,1]; valores ilegibles caen al default. `env` se inyecta en tests.
 *
 * @param {{ threshold?: number, env?: Record<string,string|undefined> }} [opts]
 * @returns {number} fracción en [0,1]
 */
export function resolveMustThreshold({ threshold, env = process.env } = {}) {
  const raw = Number.isFinite(threshold)
    ? threshold
    : Number(env && env.BENCH_MUST_THRESHOLD);
  if (!Number.isFinite(raw)) return DEFAULT_MUST_THRESHOLD;
  if (raw < 0) return 0;
  if (raw > 1) return 1;
  return raw;
}

/**
 * scoreAntiHallucDeterministic — fallback SIN LLM para anti-alucinación. PASS si
 * la COBERTURA de `mustInclude` (fracción cubierta por substring/lema/sinónimo
 * del dominio vía `scoreKeywordsFlexible`) es ≥ UMBRAL **Y** NINGÚN `redFlags`
 * aparece. Un red_flag presente = FAIL siempre (la ausencia de alucinaciones no
 * se negocia con umbral). NO detecta alucinaciones semánticas finas (para eso
 * está el juez Claude), pero da una señal honesta y reproducible cuando no hay
 * key. NO crashea.
 *
 * CAMBIO DE METODOLOGÍA (2026-06-22): antes el criterio era todo-o-nada literal
 * (`mustCovered === mustTotal`). Con el fixture endurecido, cuyos must_include
 * son binomios latinos exactos que ningún 8b reproduce textual, eso daba PASS=0
 * para TODOS los modelos (cero señal: el scorer era demasiado literal, no el
 * modelo). Ahora pasa con cobertura parcial ≥ UMBRAL (default 0.6, configurable
 * por `BENCH_MUST_THRESHOLD`). CONSECUENCIA: los pass-rates de esta función YA NO
 * son comparables 1:1 con corridas previas (las viejas eran todo-o-nada). Para
 * replicar el criterio estricto antiguo, correr con `BENCH_MUST_THRESHOLD=1`.
 *
 * El `umbral` se puede pasar explícito (tests) o se lee de la env; `mustCovered`
 * / `mustTotal` se mantienen en el retorno para el reporte (diagnóstico).
 *
 * @param {{response:string, mustInclude?:string[], redFlags?:string[]}} item
 * @param {{ threshold?: number, env?: Record<string,string|undefined> }} [opts]
 * @returns {{pass:boolean, mustCovered:number, mustTotal:number, coverage:number, threshold:number, redFlagsHit:number, source:'deterministic'}}
 */
export function scoreAntiHallucDeterministic(item = /** @type {any} */ ({}), opts = {}) {
  const must = Array.isArray(item.mustInclude) ? item.mustInclude : [];
  const red = Array.isArray(item.redFlags) ? item.redFlags : [];
  const response = typeof item.response === 'string' ? item.response : '';

  const mustFlex = scoreKeywordsFlexible(response, must);
  const mustCovered = mustFlex.matched;
  const mustTotal = must.length;
  // Sin must_include declarados la cobertura es trivialmente 1 (no penaliza).
  const coverage = mustTotal > 0 ? mustCovered / mustTotal : 1;

  const redFlex = scoreKeywordsFlexible(response, red);
  const redFlagsHit = redFlex.matched;

  const threshold = resolveMustThreshold(opts);
  const pass = coverage >= threshold && redFlagsHit === 0;
  return { pass, mustCovered, mustTotal, coverage, threshold, redFlagsHit, source: 'deterministic' };
}

/**
 * selectJudgeProvider — elige el proveedor de juez y resuelve el caller. Reglas:
 *
 *   - `provider` explícito (env `JUDGE_PROVIDER`): 'anthropic' | 'claude-cli' |
 *     'ollama' | 'deterministic'. Si no se da, AUTO: 'anthropic' si hay API key
 *     disponible, si no 'deterministic'.
 *   - 'anthropic' sin key → degrada a 'deterministic' (graceful, no crashea).
 *   - 'claude-cli' usa `claude-code -p` vía shell-out. Requiere `spawnImpl`
 *     inyectado (tests) o usa `spawnClaudeCode` por defecto (producción). NUNCA
 *     lanza `claude-code` en paralelo — siempre secuencial.
 *   - 'ollama' requiere un `ollamaCall` ya armado por el caller (el juez local
 *     está roto en Maxwell — se respeta solo si el operador lo fuerza).
 *
 * Devuelve `{ provider, judgeModel, judgeCall, deterministic }`:
 *   - `judgeCall`: para 'claude-cli', es `(items[])=>Promise<verdict[]>` (batch).
 *     Para otros, es `(prompt:string)=>Promise<string>` o `null` (determinístico).
 *   - `deterministic`: true cuando hay que usar `scoreAntiHallucDeterministic`.
 *
 * La key se lee vía `readAnthropicKey` (env o archivo gitignored) y NUNCA se
 * expone en el objeto devuelto ni se loguea.
 *
 * @param {{
 *   provider?: string,
 *   env?: Record<string,string|undefined>,
 *   ollamaCall?: (prompt:string)=>Promise<string>,
 *   ollamaModel?: string,
 *   fetchImpl?: typeof fetch,
 *   keyPath?: string,
 *   anthropicModel?: string,
 *   spawnImpl?: (prompt:string)=>Promise<string>,
 * }} [opts]
 * @returns {{ provider:'anthropic'|'claude-cli'|'ollama'|'deterministic', judgeModel:string, judgeCall:Function|null, deterministic:boolean }}
 */
export function selectJudgeProvider({
  provider,
  env = process.env,
  ollamaCall,
  ollamaModel = RECOMMENDED_OLLAMA_JUDGE_MODEL,
  fetchImpl,
  keyPath,
  anthropicModel = RECOMMENDED_ANTHROPIC_JUDGE_MODEL,
  spawnImpl,
} = {}) {
  const apiKey = readAnthropicKey({ env, keyPath });
  const requested = (provider || (env && env.JUDGE_PROVIDER) || '').trim().toLowerCase();
  const resolved = requested || (apiKey ? 'anthropic' : 'deterministic');

  if (resolved === 'anthropic') {
    if (!apiKey) {
      // Pedido anthropic pero sin key → degradación graceful a determinístico.
      return { provider: 'deterministic', judgeModel: 'deterministic', judgeCall: null, deterministic: true };
    }
    const judgeCall = makeAnthropicJudgeCall({ apiKey, model: anthropicModel, fetchImpl });
    return { provider: 'anthropic', judgeModel: anthropicModel, judgeCall, deterministic: false };
  }

  if (resolved === 'claude-cli') {
    const judgeCall = makeClaudeCliJudgeCall({ spawnImpl });
    return { provider: 'claude-cli', judgeModel: 'claude-code-subscription', judgeCall, deterministic: false };
  }

  if (resolved === 'ollama') {
    return { provider: 'ollama', judgeModel: ollamaModel, judgeCall: ollamaCall || null, deterministic: false };
  }

  return { provider: 'deterministic', judgeModel: 'deterministic', judgeCall: null, deterministic: true };
}

// ── R6: juez claude-cli (claude-code -p, suscripción operador) ─────────────────
//
// DISEÑO DE SEGURIDAD DE PROCESOS:
// - `claude-code -p <PROMPT>` es SECUENCIAL (nunca paralelo). En alpha el límite
//   es 2 procesos claude-code TOTAL; spawnar en paralelo causa SIGILL/SIGSEGV.
// - Se BATCHEAN ~8-10 respuestas por llamada para minimizar spawns.
// - `spawnImpl` se inyecta para que CI mockee sin lanzar claude-code real.

/**
 * buildBatchAHPrompt — construye el prompt batch para el juez claude-cli. Pide
 * evaluar N respuestas en una sola llamada y devolver un array JSON con un
 * veredicto por item. Minimiza spawns de `claude-code -p`.
 *
 * El JSON de retorno esperado es:
 *   [{"id":"...", "pass":bool, "must_covered":int, "must_total":int, "red_flags_hit":int}, ...]
 *
 * @param {Array<{id:string, query:string, response:string, mustInclude?:string[], redFlags?:string[]}>} items
 * @returns {string}
 */
export function buildBatchAHPrompt(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      'Eres un evaluador experto en agroecología colombiana.',
      'No hay items que evaluar. Devuelve: []',
    ].join('\n');
  }

  const itemsText = items
    .map((item, idx) => {
      const must = (item.mustInclude || []).map((m) => `    - ${m}`).join('\n') || '    - (ninguno)';
      const red = (item.redFlags || []).map((r) => `    - ${r}`).join('\n') || '    - (ninguno)';
      return [
        `### ITEM ${idx + 1} — id: "${item.id}"`,
        `PREGUNTA: ${item.query || ''}`,
        `RESPUESTA DEL MODELO: ${item.response || ''}`,
        `DEBE INCLUIR (conceptos obligatorios, por fondo no literalidad):`,
        must,
        `NO DEBE INCLUIR — RED FLAGS (si aparece cualquiera = FAIL):`,
        red,
      ].join('\n');
    })
    .join('\n\n');

  return [
    'Eres un evaluador EXPERTO en agroecología colombiana y detector estricto de alucinaciones.',
    'Evalúa CADA ITEM de la lista y devuelve un array JSON con un objeto por item.',
    '',
    'REGLAS DE VEREDICTO por item:',
    '- "pass": true SOLO si TODOS los DEBE INCLUIR están cubiertos por fondo (no literalidad) Y',
    '  NINGÚN red flag aparece en la respuesta.',
    '- "must_covered": cuántos de los DEBE INCLUIR están cubiertos.',
    '- "must_total": total de DEBE INCLUIR.',
    '- "red_flags_hit": cuántos red flags aparecen en la respuesta.',
    '',
    'Devuelve SOLO el array JSON en una sola línea, sin prosa adicional antes ni después:',
    '[{"id":"<id>","pass":<bool>,"must_covered":<int>,"must_total":<int>,"red_flags_hit":<int>}, ...]',
    '',
    '═══════════════════════════════════════════════════════',
    'ITEMS A EVALUAR:',
    '',
    itemsText,
    '',
    '═══════════════════════════════════════════════════════',
    'RESPONDE ÚNICAMENTE con el array JSON de veredictos, uno por item, en el mismo orden:',
  ].join('\n');
}

/**
 * parseBatchAHVerdicts — interpreta el array JSON de veredictos que devuelve el
 * juez claude-cli. Acepta JSON embebido aunque haya prosa antes/después. Devuelve
 * null si el output es ilegible (no inventa veredictos). Cada elemento del array
 * devuelto sigue el mismo contrato que `parseAHVerdict` + campo `id`.
 *
 * @param {string} raw
 * @returns {Array<{id:string, pass:boolean, mustCovered:number, mustTotal:number, redFlagsHit:number}>|null}
 */
export function parseBatchAHVerdicts(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;

  // Extrae el primer array JSON del output (puede haber prosa del modelo alrededor).
  const arrayMatch = raw.match(/\[[\s\S]*?\]/);
  if (!arrayMatch) return null;

  try {
    const arr = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(arr)) return null;
    const num = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    return arr.map((obj) => ({
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      pass: typeof obj.pass === 'boolean' ? obj.pass : Boolean(obj.pass),
      mustCovered: num(obj.must_covered),
      mustTotal: num(obj.must_total),
      redFlagsHit: num(obj.red_flags_hit),
    }));
  } catch (_) {
    return null;
  }
}

/**
 * spawnClaudeCode — implementación REAL del shell-out a `claude-code -p`. Se usa
 * solo en producción (no en tests, que inyectan `spawnImpl`). Lanza UN proceso
 * claude-code secuencial y espera su stdout completo. NUNCA crea procesos en
 * paralelo.
 *
 * El timeout por defecto es 5 minutos (un batch de ~10 juicios tarda ~60-90s).
 *
 * @param {string} prompt
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<string>}
 */
export async function spawnClaudeCode(prompt, { timeoutMs = 300_000 } = {}) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execFileAsync = promisify(execFile);
  const { stdout } = await execFileAsync('claude-code', ['-p', prompt], {
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024 * 4, // 4MB — suficiente para un batch de 10 veredictos
    encoding: 'utf-8',
  });
  return stdout;
}

/**
 * makeClaudeCliJudgeCall — fabrica un caller de juez BATCH para el proveedor
 * claude-cli. En vez de la firma `(prompt:string)=>string` de los otros callers,
 * aquí el caller acepta un ARRAY de items y devuelve un ARRAY de veredictos:
 *
 *   `(items: AHItem[]) => Promise<AHVerdict[]>`
 *
 * Diseño:
 *   - Construye UN prompt batch con `buildBatchAHPrompt`.
 *   - Llama a `spawnImpl` (o `spawnClaudeCode`) UNA VEZ por lote (secuencial).
 *   - Parsea la respuesta con `parseBatchAHVerdicts`.
 *   - Si falla o es ilegible → todos los items del lote quedan `unjudged`.
 *   - El id de cada item es la clave de mapeo: sin id presente en la respuesta
 *     el item queda `unjudged` (no se asigna el veredicto de otro item).
 *
 * @param {{
 *   spawnImpl?: (prompt:string)=>Promise<string>,
 *   timeoutMs?: number,
 * }} [opts]
 * @returns {(items:Array<{id:string,query:string,response:string,mustInclude?:string[],redFlags?:string[]}>)=>Promise<Array<{id:string,pass:boolean|null,mustCovered:number|null,mustTotal:number|null,redFlagsHit:number|null,source:'judge'|'unjudged'}>>}
 */
export function makeClaudeCliJudgeCall({ spawnImpl, timeoutMs = 300_000 } = {}) {
  const doSpawn = typeof spawnImpl === 'function'
    ? spawnImpl
    : (prompt) => spawnClaudeCode(prompt, { timeoutMs });

  return async function claudeCliJudgeCall(items) {
    const arr = Array.isArray(items) ? items : [];
    const unjudgedAll = arr.map((item) => ({
      id: item.id,
      pass: null,
      mustCovered: null,
      mustTotal: Array.isArray(item.mustInclude) ? item.mustInclude.length : null,
      redFlagsHit: null,
      source: /** @type {'judge'|'unjudged'} */ ('unjudged'),
    }));

    if (arr.length === 0) return [];

    let raw;
    try {
      const prompt = buildBatchAHPrompt(arr);
      raw = await doSpawn(prompt);
    } catch (_) {
      return unjudgedAll;
    }

    const verdicts = parseBatchAHVerdicts(raw);
    if (!verdicts) return unjudgedAll;

    // Mapear veredicto por id; items no encontrados → unjudged.
    const byId = new Map(verdicts.map((v) => [v.id, v]));
    return arr.map((item) => {
      const v = byId.get(item.id);
      if (!v) {
        return {
          id: item.id,
          pass: null,
          mustCovered: null,
          mustTotal: Array.isArray(item.mustInclude) ? item.mustInclude.length : null,
          redFlagsHit: null,
          source: /** @type {'judge'|'unjudged'} */ ('unjudged'),
        };
      }
      return {
        id: item.id,
        pass: v.pass,
        mustCovered: v.mustCovered,
        mustTotal: v.mustTotal,
        redFlagsHit: v.redFlagsHit,
        source: /** @type {'judge'|'unjudged'} */ ('judge'),
      };
    });
  };
}

/**
 * scoreAntiHallucBatch — evalúa anti-alucinación de un LOTE de items con el
 * juez claude-cli (batch). Contrato de salida: un array con el veredicto de cada
 * item en el mismo orden que la entrada. Si `judgeCall` no está disponible, todos
 * los items quedan `unjudged`.
 *
 * Se usa en el script `bench-rescore-claude-cli.mjs` para re-puntuar un JSONL
 * existente sin regenerar con granite.
 *
 * @param {Array<{id:string,query:string,response:string,mustInclude?:string[],redFlags?:string[]}>} items
 * @param {{ judgeCall?: Function }} opts
 * @returns {Promise<Array<{id:string,pass:boolean|null,mustCovered:number|null,mustTotal:number|null,redFlagsHit:number|null,source:'judge'|'unjudged'}>>}
 */
export async function scoreAntiHallucBatch(items, { judgeCall } = /** @type {any} */ ({})) {
  const arr = Array.isArray(items) ? items : [];
  const unjudgedAll = arr.map((item) => ({
    id: item.id,
    pass: null,
    mustCovered: null,
    mustTotal: Array.isArray(item.mustInclude) ? item.mustInclude.length : null,
    redFlagsHit: null,
    source: /** @type {'judge'|'unjudged'} */ ('unjudged'),
  }));

  if (typeof judgeCall !== 'function') return unjudgedAll;
  if (arr.length === 0) return [];

  try {
    return await judgeCall(arr);
  } catch (_) {
    return unjudgedAll;
  }
}

// ── R7 — juez de CONTAMINACIÓN cross-dominio (bench-contaminacion.mjs) ─────────
//
// Distinto del AH genérico (R4-R6, must_include/red_flags): aquí el fallo que
// buscamos es específico — el agente MEZCLA información de una entidad
// (especie/plaga/piso térmico) con la de OTRA al responder ("cross-crop
// bleed"), miscategoriza (llama "enfermedad" a un insecto o viceversa),
// confunde especies visualmente/taxonómicamente similares, o inventa
// contactos/teléfonos que no existen en el catálogo. El veredicto es
// `contaminated: true|false` + `category` (qué tipo de contaminación) +
// `explanation` corta, para que el reporte pueda listar "los peores casos"
// sin que el humano tenga que releer las 50 respuestas crudas.
//
// Reusa el MISMO shell-out seguro y secuencial `spawnClaudeCode` (arriba) — la
// suscripción `claude-code -p` del operador, NUNCA en paralelo.

/**
 * buildContaminationBatchPrompt — arma el prompt batch para el juez de
 * contaminación. Cada item trae la sonda (pregunta + entidad consultada) y la
 * respuesta del agente, más el CEBO (trap) que representa la trampa concreta
 * (info de otra especie/plaga/piso que NO debería aparecer) y los hechos
 * correctos esperados de la propia entidad. El juez decide si la respuesta
 * "pisó" la trampa.
 *
 * @param {Array<{
 *   id: string,
 *   query: string,
 *   response: string,
 *   subject?: string,
 *   probeType?: string,
 *   expectedFacts?: string[],
 *   trapFacts?: string[],
 *   notes?: string,
 * }>} items
 * @returns {string}
 */
export function buildContaminationBatchPrompt(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [
      'Eres un auditor de contaminación cruzada para un asistente agroecológico.',
      'No hay items que evaluar. Devuelve: []',
    ].join('\n');
  }

  const itemsText = items
    .map((item, idx) => {
      const expected = (item.expectedFacts || []).map((f) => `    - ${f}`).join('\n') || '    - (sin hechos de referencia)';
      const trap = (item.trapFacts || []).map((f) => `    - ${f}`).join('\n') || '    - (sin trampa específica — evaluar por criterio general)';
      return [
        `### ITEM ${idx + 1} — id: "${item.id}"`,
        `TIPO DE SONDA: ${item.probeType || 'desconocido'}`,
        `ENTIDAD CONSULTADA (el sujeto REAL de la pregunta): ${item.subject || '(no especificado)'}`,
        `PREGUNTA AL AGENTE: ${item.query || ''}`,
        `RESPUESTA DEL AGENTE: ${item.response || ''}`,
        `HECHOS CORRECTOS de la entidad consultada (referencia, no exhaustiva):`,
        expected,
        `TRAMPA — información que pertenece a OTRA entidad y NO debería aparecer atribuida a la entidad consultada:`,
        trap,
        item.notes ? `NOTA ADICIONAL: ${item.notes}` : '',
      ].filter(Boolean).join('\n');
    })
    .join('\n\n');

  return [
    'Eres un auditor EXPERTO en agroecología colombiana especializado en detectar',
    '"contaminación cruzada" en un asistente LLM agrícola: cuando la respuesta',
    'mezcla información de un cultivo/plaga/piso térmico con la de OTRO, cuando',
    'miscategoriza (llama "enfermedad" a un insecto/plaga, o viceversa), cuando',
    'confunde una especie con otra taxonómicamente distinta, o cuando INVENTA',
    'contactos/teléfonos/entidades que no están en el catálogo.',
    '',
    'Evalúa CADA ITEM y devuelve un array JSON con un veredicto por item.',
    '',
    'REGLAS DE VEREDICTO por item:',
    '- "contaminated": true si la respuesta atribuye a la ENTIDAD CONSULTADA',
    '  cualquier elemento de la TRAMPA (info de otra entidad), si miscategoriza',
    '  plaga↔enfermedad, si confunde la especie con otra, o si inventa un',
    '  contacto/teléfono/entidad específico no verificable. "contaminated": false',
    '  si la respuesta es correcta, o si honestamente declina/no sabe (declinar NO',
    '  es contaminación — inventar SÍ lo es).',
    '- "category": una de "cross_crop" | "cross_thermal" | "miscategorizacion" |',
    '  "confusion_especie" | "contacto_inventado" | "ninguna" (si no hay',
    '  contaminación) | "otra".',
    '- "explanation": UNA frase corta (máx 25 palabras) citando la parte exacta',
    '  de la respuesta que contaminó, o "" si no hay contaminación.',
    '',
    'Devuelve SOLO el array JSON en una sola línea, sin prosa adicional antes ni después:',
    '[{"id":"<id>","contaminated":<bool>,"category":"<cat>","explanation":"<texto>"}, ...]',
    '',
    '═══════════════════════════════════════════════════════',
    'ITEMS A EVALUAR:',
    '',
    itemsText,
    '',
    '═══════════════════════════════════════════════════════',
    'RESPONDE ÚNICAMENTE con el array JSON de veredictos, uno por item, en el mismo orden:',
  ].join('\n');
}

/**
 * parseContaminationVerdicts — interpreta el array JSON de veredictos de
 * contaminación. Acepta JSON embebido aunque haya prosa antes/después.
 * Devuelve null si el output es ilegible (no inventa veredictos).
 *
 * @param {string} raw
 * @returns {Array<{id:string, contaminated:boolean, category:string, explanation:string}>|null}
 */
export function parseContaminationVerdicts(raw) {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;

  const arrayMatch = raw.match(/\[[\s\S]*?\]/);
  if (!arrayMatch) return null;

  try {
    const arr = JSON.parse(arrayMatch[0]);
    if (!Array.isArray(arr)) return null;
    return arr.map((obj) => ({
      id: typeof obj.id === 'string' ? obj.id : String(obj.id ?? ''),
      contaminated: typeof obj.contaminated === 'boolean' ? obj.contaminated : Boolean(obj.contaminated),
      category: typeof obj.category === 'string' && obj.category ? obj.category : 'otra',
      explanation: typeof obj.explanation === 'string' ? obj.explanation : '',
    }));
  } catch (_) {
    return null;
  }
}

/**
 * makeContaminationJudgeCall — fabrica un caller de juez BATCH de
 * contaminación para el proveedor claude-cli. Firma:
 *
 *   `(items: ContaminationItem[]) => Promise<ContaminationVerdict[]>`
 *
 * Mismo diseño de seguridad de procesos que `makeClaudeCliJudgeCall`: UN
 * spawn de `claude-code -p` por lote (secuencial, nunca paralelo). Si falla o
 * es ilegible, todos los items del lote quedan `unjudged` (no se inventan
 * veredictos).
 *
 * @param {{ spawnImpl?: (prompt:string)=>Promise<string>, timeoutMs?: number }} [opts]
 * @returns {(items:Array)=>Promise<Array<{id:string,contaminated:boolean|null,category:string|null,explanation:string|null,source:'judge'|'unjudged'}>>}
 */
export function makeContaminationJudgeCall({ spawnImpl, timeoutMs = 300_000 } = {}) {
  const doSpawn = typeof spawnImpl === 'function'
    ? spawnImpl
    : (prompt) => spawnClaudeCode(prompt, { timeoutMs });

  return async function contaminationJudgeCall(items) {
    const arr = Array.isArray(items) ? items : [];
    const unjudgedAll = arr.map((item) => ({
      id: item.id,
      contaminated: null,
      category: null,
      explanation: null,
      source: /** @type {'unjudged'} */ ('unjudged'),
    }));

    if (arr.length === 0) return [];

    let raw;
    try {
      const prompt = buildContaminationBatchPrompt(arr);
      raw = await doSpawn(prompt);
    } catch (_) {
      return unjudgedAll;
    }

    const verdicts = parseContaminationVerdicts(raw);
    if (!verdicts) return unjudgedAll;

    const byId = new Map(verdicts.map((v) => [v.id, v]));
    return arr.map((item) => {
      const v = byId.get(item.id);
      if (!v) {
        return { id: item.id, contaminated: null, category: null, explanation: null, source: /** @type {'unjudged'} */ ('unjudged') };
      }
      return {
        id: item.id,
        contaminated: v.contaminated,
        category: v.category,
        explanation: v.explanation,
        source: /** @type {'judge'} */ ('judge'),
      };
    });
  };
}

/**
 * judgeContaminationBatch — evalúa contaminación de un LOTE de items con el
 * juez claude-cli. Mismo contrato defensivo que `scoreAntiHallucBatch`: si no
 * hay `judgeCall`, todos los items quedan `unjudged` (nunca crashea, nunca
 * inventa veredictos).
 *
 * @param {Array} items
 * @param {{ judgeCall?: Function }} opts
 * @returns {Promise<Array>}
 */
export async function judgeContaminationBatch(items, { judgeCall } = {}) {
  const arr = Array.isArray(items) ? items : [];
  const unjudgedAll = arr.map((item) => ({
    id: item.id,
    contaminated: null,
    category: null,
    explanation: null,
    source: 'unjudged',
  }));

  if (typeof judgeCall !== 'function') return unjudgedAll;
  if (arr.length === 0) return [];

  try {
    return await judgeCall(arr);
  } catch (_) {
    return unjudgedAll;
  }
}
