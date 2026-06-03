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
 *      respuesta del modelo objetivo (TARGET_MODEL, default granite) y derivando
 *      un ground_truth de los expected_keywords cuando no hay uno explícito.
 *   + Si `--from` apunta a un archivo inexistente, se LANZA (no mock silencioso).
 *
 * Smoke con 10 prompts vs granite/llama/gemma.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(DATA_DIR, 'bench-runs');
const OUTPUT_DIR = process.env.BENCH_JUDGE_OUTPUT_DIR || join(DATA_DIR, 'bench-judge-scores');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gemma3:4b';
const TIMEOUT_MS = 60_000;

// Modelo cuyo turno se evalúa cuando el JSONL es per-model (bench-agente-completo).
// Default granite3.1-dense:8b = el chat de PROD (llmRouter chat_complex).
const TARGET_MODEL = process.env.TARGET_MODEL || 'granite3.1-dense:8b';

// Mapa modelKey (clave del objeto per-model en el JSONL) → nombre ollama, para
// poder seleccionar por nombre real del modelo cuando TARGET_MODEL es un nombre.
const MODEL_KEY_BY_NAME = {
  'gemma3:4b': 'gemma3_4b',
  'granite3.1-dense:8b': 'granite3_1_8b',
  'ministral-3:latest': 'ministral_3b',
  'aya:8b': 'aya_8b',
  'mistral-nemo:12b': 'mistral_nemo_12b',
  'ministral-3:14b': 'ministral_14b',
  'qwen3:30b': 'qwen3_30b',
};

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

/**
 * pickModelKey — elige la clave per-model del objeto del JSONL para el modelo
 * objetivo. Acepta un nombre ollama (granite3.1-dense:8b) o ya una clave
 * (granite3_1_8b). Devuelve la clave si está presente en el item, o null.
 *
 * @param {Record<string, any>} item
 * @param {string} target
 * @returns {string|null}
 */
function pickModelKey(item, target) {
  const asKey = MODEL_KEY_BY_NAME[target] || target;
  if (item[asKey] && typeof item[asKey] === 'object') return asKey;
  // fallback: buscar cualquier sub-objeto cuyo .model coincida con el nombre.
  for (const [k, v] of Object.entries(item)) {
    if (v && typeof v === 'object' && v.model === target) return k;
  }
  return null;
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
 * @param {{ targetModel?: string }} [opts]
 * @returns {{ timestamp:string, model:string, results:Array, skipped:number }}
 */
export function normalizeBenchData(lines, { targetModel = TARGET_MODEL } = {}) {
  const arr = Array.isArray(lines) ? lines : [];
  const results = [];
  let skipped = 0;

  for (const item of arr) {
    if (!item || typeof item !== 'object') {
      skipped++;
      continue;
    }

    // (b) ya está en formato judge plano.
    const flatResponse = item.model_response ?? item.response;
    const isFlat = typeof flatResponse === 'string' && !pickModelKey(item, targetModel);
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
    const key = pickModelKey(item, targetModel);
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
    model: targetModel,
    results,
    skipped,
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
 * @returns {{ timestamp:string, model:string, results:Array, usedMock:boolean, skipped?:number, source?:string }}
 */
export function loadBenchData(fromPath) {
  if (fromPath) {
    if (!existsSync(fromPath)) {
      throw new Error(
        `[judge] --from apunta a un archivo inexistente: ${fromPath}. ` +
          `NO se cae a mock para no enmascarar un path roto.`,
      );
    }
    return { ...parseBenchFile(fromPath), usedMock: false, source: fromPath };
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
      return { ...parseBenchFile(latest), usedMock: false, source: latest };
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
 * @returns {{ timestamp:string, model:string, results:Array, skipped:number }}
 */
function parseBenchFile(path) {
  const raw = readFileSync(path, 'utf-8');
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { timestamp: new Date().toISOString(), model: TARGET_MODEL, results: [], skipped: 0 };

  // JSONL: varias líneas, cada una un objeto. Detecta por ≥2 líneas JSON o
  // por extensión .jsonl.
  const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
  const looksJsonl = path.endsWith('.jsonl') || lines.length > 1;

  if (looksJsonl) {
    const parsed = lines.map((l) => JSON.parse(l));
    // Si ya viene en formato judge `{ results: [...] }` por línea, aplanar.
    if (parsed.length === 1 && Array.isArray(parsed[0].results)) {
      return normalizeBenchData(parsed[0].results);
    }
    return normalizeBenchData(parsed);
  }

  // JSON: un objeto. Puede ser `{ results: [...] }` (judge) o un único item.
  const obj = JSON.parse(trimmed);
  if (Array.isArray(obj.results)) {
    const norm = normalizeBenchData(obj.results);
    return { ...norm, timestamp: obj.timestamp ?? norm.timestamp, model: obj.model ?? norm.model };
  }
  return normalizeBenchData([obj]);
}

async function callJudge(prompt, signal) {
  const start = performance.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      system: JUDGE_PROMPT,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.1, // Baja temperatura para consistencia
        num_predict: 200,
      },
      keep_alive: '30m',
    }),
    signal,
  });
  const elapsed = performance.now() - start;
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const data = await res.json();
  return {
    raw_response: data.response,
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

async function evaluateItem(item, index, total) {
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await callJudge(prompt, controller.signal);
    const scores = parseJudgeResponse(result.raw_response);

    // Calcular promedio si no está presente
    if (!scores.promedio) {
      scores.promedio = calculateAvg(scores);
    }

    clearTimeout(timer);
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
    clearTimeout(timer);
    console.error(`  → ERROR: ${err.message}`);
    return { error: err.message, item_id: item.id };
  }
}

async function main() {
  console.log('[judge] LLM-Judge smoke test v2');
  console.log(`[judge] Modelo juez: ${JUDGE_MODEL}`);
  console.log(`[judge] Directorio output: ${OUTPUT_DIR}`);

  const fromPath = parseFromArg(process.argv);
  const benchData = loadBenchData(fromPath);

  console.log(`[judge] Fuente: ${benchData.source || 'N/A'}${benchData.usedMock ? ' (MOCK — smoke test)' : ' (datos REALES)'}`);
  if (typeof benchData.skipped === 'number' && benchData.skipped > 0) {
    console.log(`[judge] Items omitidos (modelo objetivo con error/sin respuesta): ${benchData.skipped}`);
  }
  console.log(`[judge] Datos cargados: ${benchData.results.length} items`);
  console.log(`[judge] Timestamp bench: ${benchData.timestamp}`);
  console.log(`[judge] Modelo evaluado: ${benchData.model || 'N/A'}`);

  if (benchData.results.length === 0) {
    throw new Error('[judge] 0 items evaluables tras normalizar. Revisá el JSONL de origen / TARGET_MODEL.');
  }

  const results = [];
  const startTime = performance.now();

  for (let i = 0; i < benchData.results.length; i++) {
    const evaluation = await evaluateItem(benchData.results[i], i, benchData.results.length);
    results.push(evaluation);

    // Pequeña pausa entre items
    if (i < benchData.results.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  const totalTime = performance.now() - startTime;
  const successful = results.filter((r) => !r.error);
  const failed = results.filter((r) => r.error);

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
- **Juez**: ${JUDGE_MODEL}
- **Modelo evaluado**: ${benchData.model || 'smoke-test'}
- **Items evaluados**: ${results.length}
- **Exitosos**: ${successful.length}
- **Fallidos**: ${failed.length}
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
