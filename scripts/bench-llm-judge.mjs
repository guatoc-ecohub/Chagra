#!/usr/bin/env node
/**
 * bench-llm-judge.mjs — Smoke test LLM-judge + ranking.
 *
 * Lee outputs de bench (data/bench-runs/ si existe, sino crea data mock),
 * aplica judge prompt sobre {pregunta, respuestaModelo, ground_truth} y
 * genera scores 0-100 sobre:
 * - factualidad (¿es correcta la información?)
 * - claridad colombiana (¿es claro para agricultores colombianos?)
 * - anti-alucinación (¿inventa datos o reconoce no saber?)
 * - completitud (¿responde la pregunta completa?)
 *
 * Uso:
 *   node scripts/bench-llm-judge.mjs                  # smoke con datos mock
 *   node scripts/bench-llm-judge.mjs --from data/bench-runs/results.jsonl
 *   node scripts/bench-llm-judge.mjs --from=data/bench-runs/results.jsonl
 *
 * Output: data/bench-judge-scores/{YYYY-MM-DD}.jsonl + summary.md
 *
 * FIX 2026-06-03 (pipeline-rework): el judge corría sobre MOCK aunque el bench
 * le pasara el JSONL real, por TRES fallas que este módulo arregla:
 *   1. `--from <path>` (separado por espacio, como lo invoca bench-agente-completo)
 *      no se parseaba — solo `--from=path`. Ahora parseFromArg cubre ambos.
 *   2. auto-discovery solo globeaba `.json`; el bench escribe `.jsonl`. Ahora
 *      loadBenchData reconoce ambos y prioriza el más reciente.
 *   3. el JSONL real es per-model anidado (sin ground_truth ni model_response
 *      plano). normalizeBenchData lo transforma a items evaluables tomando la
 *      respuesta del modelo objetivo inferido desde el JSONL o pasado por
 *      `--target`, y derivando un ground_truth de los expected_keywords cuando
 *      no hay uno explícito.
 *   + Si `--from` apunta a un archivo inexistente, se LANZA (no mock silencioso).
 *
 * Smoke con 10 prompts contra el target resuelto desde el JSONL.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  readAnthropicKey,
  makeAnthropicJudgeCall,
  RECOMMENDED_ANTHROPIC_JUDGE_MODEL,
} from './lib/bench-scorer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(DATA_DIR, 'bench-runs');
const OUTPUT_DIR = process.env.BENCH_JUDGE_OUTPUT_DIR || join(DATA_DIR, 'bench-judge-scores');

const TIMEOUT_MS = 60_000;
const JUDGE_PROVIDER = (process.env.JUDGE_PROVIDER || 'anthropic').trim().toLowerCase();
const ANTHROPIC_JUDGE_MODEL = RECOMMENDED_ANTHROPIC_JUDGE_MODEL;

// Mapas entre nombre de modelo y clave per-model del JSONL.
const MODEL_NAME_BY_KEY = {
  'gemma3:4b': 'gemma3_4b',
  'granite3.3:8b': 'granite3_3_8b',
  'granite3.1-dense:8b': 'granite3_1_8b',
  'ministral-3:latest': 'ministral_3b',
  'aya:8b': 'aya_8b',
  'mistral-nemo:12b': 'mistral_nemo_12b',
  'ministral-3:14b': 'ministral_14b',
  'qwen3:30b': 'qwen3_30b',
};

const MODEL_KEY_BY_NAME = Object.fromEntries(
  Object.entries(MODEL_NAME_BY_KEY).map(([name, key]) => [key, name]),
);

// Prompts mock para el smoke test si no hay datos reales
const MOCK_BENCH_DATA = {
  timestamp: new Date().toISOString(),
  model: 'smoke-test',
  results: [
    {
      id: 1,
      category: 1,
      category_name: 'Recuperación básica',
      query: '¿Qué cuidados requiere la fresa en clima frío?',
      ground_truth: 'La fresa requiere suelo bien drenado, riego por goteo, protección contra heladas, y podas regulares de hojas secas.',
      model_response: 'La fresa necesita suelo con buen drenaje, riego constante pero sin encharcar, y protección con cobertores durante heladas.',
    },
    {
      id: 2,
      category: 1,
      category_name: 'Recuperación básica',
      query: '¿Cómo se maneja la roya del café?',
      ground_truth: 'La roya se controla con variedades resistentes, podas de renovación, manejo de sombra, y fungicidas orgánicos como caldo bordelés.',
      model_response: 'La roya del café se previene usando variedades resistentes como Colombia o Cenicafé 1, podas de renovación y aplicaciones de caldo bordelés.',
    },
    {
      id: 3,
      category: 2,
      category_name: 'Multi-hop simple',
      query: '¿Qué compañeros ayudan al maíz y por qué?',
      ground_truth: 'El maíz se beneficia de frijol (fija nitrógeno en sus raíces) y calabaza (sombra el suelo reduciendo malezas).',
      model_response: 'El maíz se asocia con frijol que trepa por el tallo y fija nitrógeno, y calabaza que cubre el suelo manteniendo humedad.',
    },
    {
      id: 4,
      category: 2,
      category_name: 'Multi-hop simple',
      query: '¿Qué evitar sembrar cerca de tomate?',
      ground_truth: 'Evitar papa (comparten plagas como tizón tardío), maíz (compiten por nutrientes) y otros solanáceas.',
      model_response: 'El tomate no debe sembrarse cerca de papa porque comparten plagas como el tizón tardío, ni de maíz por competencia.',
    },
    {
      id: 5,
      category: 3,
      category_name: 'Control biológico',
      query: '¿Qué insecto controla la mosca blanca?',
      ground_truth: 'Encarsia formosa y Eretmocerus eremicus son avispas parasitoides que controlan mosca blanca.',
      model_response: 'La mosca blanca se controla biológicamente con Encarsia formosa, una avispa que parasita las ninfas.',
    },
    {
      id: 6,
      category: 3,
      category_name: 'Control biológico',
      query: '¿Cómo controlar áfidos sin agroquímicos?',
      ground_truth: 'Con mariquitas (depredadoras), aceite de neem, extracto de ajo, y manteniendo plantas refugio.',
      model_response: 'Los áfidos se controlan con mariquitas que se los comen, o aplicando aceite de neem o jabón potásico.',
    },
    {
      id: 7,
      category: 4,
      category_name: 'Biopreparados',
      query: '¿Cómo preparar caldo bordelés?',
      ground_truth: 'Mezclar 1 kg de cal viva + 1 kg de sulfato de cobre en 10 litros de agua. Aplicar previo disuelto.',
      model_response: 'El caldo bordelés se prepara disolviendo 1 kg de sulfato de cobre y 1 kg de cal en 10 litros de agua, separando cada ingrediente.',
    },
    {
      id: 8,
      category: 4,
      category_name: 'Biopreparados',
      query: '¿Para qué sirve el biol?',
      ground_truth: 'Fertilizante líquido rico en nutrientes y microorganismos beneficiosos, obtenido de fermentar estiércol.',
      model_response: 'El biol es un biofertilizante que resulta de fermentar estiércol en agua, rico en nutrientes y microorganismos.',
    },
    {
      id: 9,
      category: 5,
      category_name: 'Suelo y clima',
      query: '¿pH ideal del suelo para papa?',
      ground_truth: 'pH 5.0-6.0. Suelos ácidos favorecen escabies y sarna común.',
      model_response: 'La papa prefiere suelos ligeramente ácidos, con pH entre 5.0 y 6.0.',
    },
    {
      id: 10,
      category: 5,
      category_name: 'Suelo y clima',
      query: '¿Temperatura óptima para lechuga?',
      ground_truth: '15-20°C. Sobre 25°C provoca bolting (floración prematura) y hojas amargas.',
      model_response: 'La lechuga crece mejor con temperaturas de 15-20°C; el calor provoca que florezca antes de tiempo y amargue.',
    },
  ],
};

// Judge prompt para evaluar respuestas
const JUDGE_PROMPT = `Eres un juez experto evaluando respuestas de un asistente agroecológico para Colombia.

Tu tarea: calificar una respuesta del modelo en 4 dimensiones, cada una de 0-100:

1. FACTUALIDAD (0-100)
   - 100: Información completamente correcta y verificable
   - 70: Mayormente correcta con pequeños detalles imprecisos
   - 40: Mezcla de información correcta e incorrecta
   - 0: Información falsa o peligrosa

2. CLARIDAD COLOMBIANA (0-100)
   - 100: Lenguaje claro para agricultores, usa términos locales apropiados
   - 70: Claro pero ocasionalmente técnico o formal
   - 40: Confuso, usa jerga innecesaria
   - 0: Incomprensible o inadecuado para el contexto

3. ANTI-ALUCINACIÓN (0-100)
   - 100: No inventa datos, reconoce limitaciones cuando aplica
   - 70: Minor speculation pero claramente marcada como tal
   - 40: Inventa algunos datos como si fueran ciertos
   - 0: Alucina gravemente (inventa especies, biopreparados, etc.)

4. COMPLETITUD (0-100)
   - 100: Responde completamente todos los aspectos de la pregunta
   - 70: Responde la mayoría pero omite detalles relevantes
   - 40: Responde parcialmente o evita el tema
   - 0: No responde la pregunta

IMPORTANTE: Tu respuesta debe ser ÚNICAMENTE un JSON con esta estructura exacta:
{
  "factualidad": <número 0-100>,
  "claridad_colombiana": <número 0-100>,
  "anti_alucinacion": <número 0-100>,
  "completitud": <número 0-100>,
  "promedio": <número 0-100>,
  "justificacion_breve": "<1-2 oraciones explicando el score>"
}

Sin texto adicional, solo el JSON.`;

/**
 * parseFromArg — extrae el path de `--from`. Acepta DOS formas:
 *   - `--from <path>` (separado por espacio) → la forma que usa el bench.
 *   - `--from=<path>` (con igual).
 * Devuelve null si no hay `--from` o si lo que sigue es otro flag.
 *
 * @param {string[]} argv  típicamente process.argv.
 * @returns {string|null}
 */
export function parseFromArg(argv = process.argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) return next;
      return null;
    }
    if (a.startsWith('--from=')) {
      const v = a.slice('--from='.length);
      return v.length > 0 ? v : null;
    }
  }
  return null;
}

/**
 * parseTargetArg — extrae el target explícito para el JSONL.
 * Acepta `--target <modelo>` y `--target=<modelo>`.
 *
 * @param {string[]} argv
 * @returns {string|null}
 */
export function parseTargetArg(argv = process.argv) {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) return next;
      return null;
    }
    if (a.startsWith('--target=')) {
      const v = a.slice('--target='.length);
      return v.length > 0 ? v : null;
    }
  }
  return null;
}

/**
 * derivedGroundTruth — cuando el bench NO trae un ground_truth explícito (el
 * caso de bench-agente-completo, que solo tiene expected_keywords), arma una
 * referencia legible para el juez a partir de los conceptos esperados. No es una
 * verdad canónica perfecta, pero ancla al juez en los conceptos correctos en vez
 * de dejarlo sin referencia.
 *
 * @param {string[]} keywords
 * @returns {string}
 */
function derivedGroundTruth(keywords) {
  const kw = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
  if (kw.length === 0) return '';
  return `Una respuesta correcta debe cubrir, por fondo: ${kw.join(', ')}.`;
}

function normalizeTargetToken(target) {
  return typeof target === 'string' ? target.trim() : '';
}

function isPerModelEntry(value) {
  return Boolean(
    value && typeof value === 'object' && (
      typeof value.response === 'string' ||
      typeof value.error === 'string' ||
      typeof value.model === 'string'
    ),
  );
}

function pickModelKey(item, target) {
  const normalized = normalizeTargetToken(target);
  if (!normalized) return null;
  const asKey = MODEL_NAME_BY_KEY[normalized] || normalized;
  if (item[asKey] && typeof item[asKey] === 'object') return asKey;
  for (const [k, v] of Object.entries(item)) {
    if (v && typeof v === 'object' && v.model === normalized) return k;
  }
  return null;
}

function inferTargetModelKey(lines) {
  const counts = new Map();
  for (const item of Array.isArray(lines) ? lines : []) {
    if (!item || typeof item !== 'object') continue;
    for (const [key, value] of Object.entries(item)) {
      if (!isPerModelEntry(value)) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  if (counts.size === 0) return null;
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  const tied = ranked.filter(([, count]) => count === top[1]);
  if (tied.length !== 1) return null;
  return top[0];
}

function resolveTargetDescriptor(lines, { targetModel } = {}) {
  const explicit = normalizeTargetToken(targetModel);
  if (explicit) {
    const keyFromExplicit = MODEL_NAME_BY_KEY[explicit] || explicit;
    const nameFromExplicit = MODEL_KEY_BY_NAME[keyFromExplicit] || explicit;
    return { targetKey: keyFromExplicit, targetName: nameFromExplicit, explicit: true };
  }

  const inferredKey = inferTargetModelKey(lines);
  if (!inferredKey) return { targetKey: null, targetName: null, explicit: false };
  return {
    targetKey: inferredKey,
    targetName: MODEL_KEY_BY_NAME[inferredKey] || inferredKey,
    explicit: false,
  };
}

/**
 * normalizeBenchData — transforma las líneas del JSONL del bench a un payload
 * `{ timestamp, model, results: [...] }` con items PLANOS evaluables por el juez
 * ({ id, query, ground_truth, model_response, ... }).
 *
 * Maneja tres formas de entrada por item:
 *   (a) per-model anidado (bench-agente-completo): toma `item[modelKey].response`
 *       del modelo objetivo; deriva ground_truth de expected_keywords.
 *   (b) ya-plano formato judge (model_response o response + ground_truth): pasa.
 *   (c) modelo objetivo con error → se OMITE (no se evalúa una no-respuesta).
 *
 * @param {Array<Record<string,any>>} lines
 * @param {{ targetModel?: string, targetName?: string }} [opts]
 * @returns {{ timestamp:string, model:string, results:Array, skipped:number, skippedSeeded:number }}
 */
export function normalizeBenchData(lines, { targetModel = null, targetName = null } = {}) {
  const arr = Array.isArray(lines) ? lines : [];
  const results = [];
  let skipped = 0;
  let skippedSeeded = 0;

  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      skipped++;
      continue;
    }

    if (item.seed === true || item.seeded === true) {
      skipped++;
      skippedSeeded++;
      continue;
    }

    // (b) ya está en formato judge plano.
    const flatResponse = item.model_response ?? item.response;
    const resolvedTargetKey = targetModel ? pickModelKey(item, targetModel) : null;
    const isFlat = typeof flatResponse === 'string' && !resolvedTargetKey;
    if (isFlat) {
      results.push({
        id: item.id ?? item.prompt_id ?? results.length + 1,
        category: item.category,
        query: item.query,
        ground_truth: item.ground_truth ?? derivedGroundTruth(item.expected_keywords),
        model_response: flatResponse,
        expected_keywords: item.expected_keywords ?? [],
        sidecar_halluc_count: item.sidecar_halluc_count ?? item.halluc_count ?? null,
      });
      continue;
    }

    // (a) per-model anidado.
    const key = resolvedTargetKey;
    if (!key) {
      skipped++;
      continue;
    }
    const m = item[key];
    if (m.error || typeof m.response !== 'string' || m.response.length === 0) {
      skipped++;
      continue;
    }
    results.push({
      id: item.prompt_id ?? item.id ?? results.length + 1,
      category: item.category,
      query: item.query,
      ground_truth: item.ground_truth ?? derivedGroundTruth(item.expected_keywords),
      model_response: m.response,
      expected_keywords: item.expected_keywords ?? [],
      sidecar_halluc_count: m.halluc_count ?? null,
    });
  }

  return {
    timestamp: new Date().toISOString(),
    model: targetName || targetModel || 'mixed',
    results,
    skipped,
    skippedSeeded,
  };
}

/**
 * loadBenchData — carga datos de bench y los normaliza a `{ results, ... }`.
 *
 * Orden de resolución:
 *   1. `fromPath` explícito. Si NO existe → LANZA (NO mock silencioso: el bug
 *      original enmascaraba un path roto evaluando mock).
 *   2. Si no hay fromPath, auto-discovery en data/bench-runs/ del más reciente
 *      `.jsonl`/`.json` (por mtime). El bench escribe `.jsonl`.
 *   3. Si no hay nada → mock (solo el smoke test sin args).
 *
 * Soporta JSONL (varias líneas) y JSON (un objeto `{ results: [...] }`).
 * Marca `usedMock` para que el caller pueda distinguir.
 *
 * @param {string|null} fromPath
 * @param {{ targetModel?: string }} [opts]
 * @returns {{ timestamp:string, model:string, results:Array, usedMock:boolean, skipped?:number, source?:string }}
 */
export function loadBenchData(fromPath, { targetModel } = {}) {
  if (fromPath) {
    if (!existsSync(fromPath)) {
      throw new Error(
        `[judge] --from apunta a un archivo inexistente: ${fromPath}. ` +
          `NO se cae a mock para no enmascarar un path roto.`,
      );
    }
    return { ...parseBenchFile(fromPath, { targetModel }), usedMock: false, source: fromPath };
  }

  // Auto-discovery: el más reciente .jsonl o .json en bench-runs/.
  if (existsSync(BENCH_RUNS_DIR)) {
    const candidates = readdirSync(BENCH_RUNS_DIR)
      .filter((f) => f.endsWith('.jsonl') || f.endsWith('.json'))
      .map((f) => {
        const full = join(BENCH_RUNS_DIR, f);
        let mtime = 0;
        try {
          mtime = statSync(full).mtimeMs;
        } catch {
          /* ignore */
        }
        return { full, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    if (candidates.length > 0) {
      const latest = candidates[0].full;
      return { ...parseBenchFile(latest, { targetModel }), usedMock: false, source: latest };
    }
  }

  console.log('[judge] No se encontraron datos de bench, usando mock data (smoke test)');
  return { ...MOCK_BENCH_DATA, usedMock: true, source: 'mock' };
}

/**
 * parseBenchFile — lee un archivo de bench (.jsonl o .json), detecta el formato
 * y devuelve `{ timestamp, model, results, skipped }` normalizado.
 *
 * @param {string} path
 * @param {{ targetModel?: string }} [opts]
 * @returns {{ timestamp:string, model:string, results:Array, skipped:number }}
 */
function parseBenchFile(path, { targetModel } = {}) {
  const raw = readFileSync(path, 'utf-8');
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      model: targetModel || 'mixed',
      results: [],
      skipped: 0,
      skippedSeeded: 0,
    };
  }

  // JSONL: varias líneas, cada una un objeto. Detecta por ≥2 líneas JSON o
  // por extensión .jsonl.
  const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
  const looksJsonl = path.endsWith('.jsonl') || lines.length > 1;

  if (looksJsonl) {
    const parsed = lines.map((l) => JSON.parse(l));
    // Si ya viene en formato judge `{ results: [...] }` por línea, aplanar.
    if (parsed.length === 1 && Array.isArray(parsed[0].results)) {
      return normalizeBenchData(parsed[0].results, { targetModel });
    }
    const resolved = resolveTargetDescriptor(parsed, { targetModel });
    if (resolved.targetKey === null && parsed.some((item) => Object.values(item || {}).some(isPerModelEntry))) {
      throw new Error(
        '[judge] No se pudo inferir el modelo objetivo desde el JSONL. ' +
          'Use --target <modelo> o TARGET_MODEL para seleccionar una sola tanda.',
      );
    }
    return normalizeBenchData(parsed, {
      targetModel: resolved.targetKey,
      targetName: resolved.targetName,
    });
  }

  // JSON: un objeto. Puede ser `{ results: [...] }` (judge) o un único item.
  const obj = JSON.parse(trimmed);
  if (Array.isArray(obj.results)) {
    const norm = normalizeBenchData(obj.results, { targetModel });
    return { ...norm, timestamp: obj.timestamp ?? norm.timestamp, model: obj.model ?? norm.model };
  }
  return normalizeBenchData([obj], { targetModel });
}

export function resolveJudgeCall({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const provider = normalizeTargetToken(env?.JUDGE_PROVIDER || JUDGE_PROVIDER || 'anthropic').toLowerCase();
  if (provider !== 'anthropic') {
    throw new Error(
      `[judge] bench-llm-judge requiere JUDGE_PROVIDER=anthropic, no '${provider || '(vacío)'}'.`,
    );
  }

  const apiKey = readAnthropicKey({ env });
  if (!apiKey) {
    throw new Error(
      '[judge] No se pudo leer la key de Anthropic desde ANTHROPIC_API_KEY ni desde ~/.config/chagra-anthropic-judge-key.',
    );
  }

  return {
    provider: 'anthropic',
    model: ANTHROPIC_JUDGE_MODEL,
    judgeCall: makeAnthropicJudgeCall({
      apiKey,
      model: ANTHROPIC_JUDGE_MODEL,
      fetchImpl,
      timeoutMs: TIMEOUT_MS,
      maxTokens: 256,
    }),
  };
}

async function callJudge(prompt, judgeCall) {
  const start = performance.now();
  const raw_response = await judgeCall(prompt);
  const elapsed = performance.now() - start;
  return {
    raw_response,
    latency_ms: elapsed,
  };
}

function parseJudgeResponse(raw) {
  // Intentar extraer JSON de la respuesta
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No se encontró JSON en la respuesta del juez');
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`JSON inválido: ${err.message}`);
  }
}

function calculateAvg(scores) {
  const values = [scores.factualidad, scores.claridad_colombiana, scores.anti_alucinacion, scores.completitud];
  return values.reduce((a, b) => a + b, 0) / values.length;
}

async function evaluateItem(item, index, total, judgeCall) {
  const { query, ground_truth, model_response } = item;
  if (!model_response && !item.response) {
    return { error: 'No hay respuesta del modelo para evaluar' };
  }

  const response = model_response || item.response;
  const prompt = `PREGUNTA: "${query}"

VERDAD BASE (ground truth): "${ground_truth}"

RESPUESTA DEL MODELO: "${response}"

Evalúa esta respuesta en las 4 dimensiones.`;

  console.log(`[judge] Evaluando item ${index + 1}/${total}...`);
  try {
    const result = await callJudge(prompt, judgeCall);
    const scores = parseJudgeResponse(result.raw_response);
    const requiredFields = ['factualidad', 'claridad_colombiana', 'anti_alucinacion', 'completitud'];
    for (const field of requiredFields) {
      const value = Number(scores[field]);
      if (!Number.isFinite(value)) {
        throw new Error(`Veredicto incompleto del juez: falta ${field}`);
      }
      scores[field] = value;
    }

    // Calcular promedio si no está presente
    if (!scores.promedio) {
      scores.promedio = calculateAvg(scores);
    } else {
      scores.promedio = Number(scores.promedio);
    }

    return {
      item_id: item.id,
      scores: {
        factualidad: scores.factualidad,
        claridad_colombiana: scores.claridad_colombiana,
        anti_alucinacion: scores.anti_alucinacion,
        completitud: scores.completitud,
        promedio: scores.promedio,
      },
      justificacion: scores.justificacion_breve || '',
      judge_latency_ms: result.latency_ms,
    };
  } catch (err) {
    console.error(`  → ERROR: ${err.message}`);
    return { error: err.message, item_id: item.id };
  }
}

async function main() {
  console.log('[judge] LLM-Judge smoke test v2');
  console.log(`[judge] Proveedor juez: ${JUDGE_PROVIDER}`);
  console.log(`[judge] Modelo juez: ${ANTHROPIC_JUDGE_MODEL}`);
  console.log(`[judge] Directorio output: ${OUTPUT_DIR}`);

  const fromPath = parseFromArg(process.argv);
  const targetModel = parseTargetArg(process.argv) || process.env.TARGET_MODEL || null;
  const { judgeCall } = resolveJudgeCall();
  const benchData = loadBenchData(fromPath, { targetModel });

  console.log(`[judge] Fuente: ${benchData.source || 'N/A'}${benchData.usedMock ? ' (MOCK — smoke test)' : ' (datos REALES)'}`);
  if (typeof benchData.skipped === 'number' && benchData.skipped > 0) {
    const skippedSeeded = typeof benchData.skippedSeeded === 'number' ? benchData.skippedSeeded : 0;
    const skippedFailure = Math.max(0, benchData.skipped - skippedSeeded);
    console.log(`[judge] Items omitidos por error/sin respuesta: ${skippedFailure}`);
  }
  if (typeof benchData.skippedSeeded === 'number' && benchData.skippedSeeded > 0) {
    console.log(`[judge] Items omitidos (seed:true, no-medición): ${benchData.skippedSeeded}`);
  }
  console.log(`[judge] Datos cargados: ${benchData.results.length} items`);
  console.log(`[judge] Timestamp bench: ${benchData.timestamp}`);
  console.log(`[judge] Modelo evaluado: ${benchData.model || 'N/A'}`);

  if (benchData.results.length === 0) {
    throw new Error('[judge] 0 items evaluables tras normalizar. Revise el JSONL de origen y el target.');
  }

  const results = [];
  const startTime = performance.now();

  for (let i = 0; i < benchData.results.length; i++) {
    const evaluation = await evaluateItem(benchData.results[i], i, benchData.results.length, judgeCall);
    results.push(evaluation);

    // Pequeña pausa entre items
    if (i < benchData.results.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const totalTime = performance.now() - startTime;
  const successful = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);

  if (successful.length === 0) {
    const reasons = failed.slice(0, 3).map((r) => `#${r.item_id}: ${r.error}`).join('; ') || 'sin detalle';
    throw new Error(`[judge] No se pudo juzgar ningún item. ${reasons}`);
  }

  // Calcular agregados
  const avgScores = {
    factualidad: 0,
    claridad_colombiana: 0,
    anti_alucinacion: 0,
    completitud: 0,
    promedio: 0,
  };

  if (successful.length > 0) {
    for (const dimension of Object.keys(avgScores)) {
      avgScores[dimension] = successful.reduce((sum, r) => sum + (r.scores?.[dimension] || 0), 0) / successful.length;
    }
  }

  // Crear directorio output si no existe
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Guardar JSONL
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonlPath = join(OUTPUT_DIR, `${dateStr}.jsonl`);

  const jsonlLines = results.map((r) => JSON.stringify(r));
  writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n');

  // Generar summary.md
  const summaryContent = `# LLM-Judge Summary — ${dateStr}

## Metadata
- **Timestamp**: ${new Date().toISOString()}
- **Juez**: ${ANTHROPIC_JUDGE_MODEL} (${JUDGE_PROVIDER})
- **Modelo evaluado**: ${benchData.model || 'smoke-test'}
- **Items evaluados**: ${results.length}
- **Exitosos**: ${successful.length}
- **Fallidos**: ${failed.length}
- **Omitidos**: ${typeof benchData.skipped === 'number' ? benchData.skipped : 0}
- **Omitidos seed:true**: ${typeof benchData.skippedSeeded === 'number' ? benchData.skippedSeeded : 0}
- **Tiempo total**: ${(totalTime / 1000).toFixed(2)}s
- **Tiempo promedio por item**: ${(totalTime / results.length).toFixed(2)}ms

## Scores Promedio

| Dimensión | Score (0-100) |
|-----------|---------------|
| **Factualidad** | ${avgScores.factualidad.toFixed(1)} |
| **Claridad Colombiana** | ${avgScores.claridad_colombiana.toFixed(1)} |
| **Anti-Alucinación** | ${avgScores.anti_alucinacion.toFixed(1)} |
| **Completitud** | ${avgScores.completitud.toFixed(1)} |
| **PROMEDIO GLOBAL** | **${avgScores.promedio.toFixed(1)}** |

## Items con Errores

${failed.length === 0 ? 'No hubo errores.' : failed.map((f) => `- Item #${f.item_id}: ${f.error}`).join('\n')}

## Detalles por Item

| ID | Factualidad | Claridad | Anti-Halluc | Completitud | Promedio | Justificación |
|----|-------------|----------|-------------|-------------|----------|---------------|
${successful.map((s) => {
  const scores = s.scores;
  return `| ${s.item_id} | ${scores.factualidad.toFixed(0)} | ${scores.claridad_colombiana.toFixed(0)} | ${scores.anti_alucinacion.toFixed(0)} | ${scores.completitud.toFixed(0)} | ${scores.promedio.toFixed(0)} | ${s.justificacion?.slice(0, 50) || 'N/A'}... |`;
}).join('\n')}

---
**Smoke test v2** — Generado por \`bench-llm-judge.mjs\`
`;

  const summaryPath = join(OUTPUT_DIR, `${dateStr}-summary.md`);
  writeFileSync(summaryPath, summaryContent);

  console.log('\n[judge] ===== RESULTADOS =====');
  console.log(`[judge] Items evaluados: ${results.length}`);
  console.log(`[judge] Exitosos: ${successful.length}`);
  console.log(`[judge] Fallidos: ${failed.length}`);
  console.log(`[judge] Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`[judge]`);
  console.log(`[judge] Scores promedio:`);
  console.log(`[judge]   Factualidad: ${avgScores.factualidad.toFixed(1)}`);
  console.log(`[judge]   Claridad colombiana: ${avgScores.claridad_colombiana.toFixed(1)}`);
  console.log(`[judge]   Anti-alucinación: ${avgScores.anti_alucinacion.toFixed(1)}`);
  console.log(`[judge]   Completitud: ${avgScores.completitud.toFixed(1)}`);
  console.log(`[judge]   PROMEDIO GLOBAL: ${avgScores.promedio.toFixed(1)}`);
  console.log(`[judge]`);
  console.log(`[judge] Output:`);
  console.log(`[judge]   JSONL: ${jsonlPath}`);
  console.log(`[judge]   Summary: ${summaryPath}`);
}

// Solo auto-ejecuta cuando se invoca directamente (no al importar en tests).
const INVOKED_DIRECTLY = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (INVOKED_DIRECTLY) {
  main().catch((err) => {
    console.error('[judge] FATAL:', err);
    process.exit(1);
  });
}

export { main };
