#!/usr/bin/env node
/**
 * bench-agente-completo.mjs — Benchmark LARGO del agente Chagra completo.
 *
 * Mide el pipeline completo: resolve-entities → enriched system prompt →
 * Ollama inference → post-validate hallucination check.
 *
 * 50 prompts mix: species(20) + biopreparados(12) + plagas(10) + normativa(4) + agroforestería(4)
 * 7 modelos: gemma3:4b, granite3.1-dense:8b, ministral-3:latest, aya:8b, mistral-nemo:12b, ministral-3:14b, qwen3:30b
 *
 * Output: data/bench-runs/agente-completo-YYYY-MM-DD.jsonl + summary.md
 * Luego invoca bench-llm-judge.mjs para evaluar calidad.
 *
 * Scoring (R3, re-bench post-guards 2026-05-31): keyword-FLEXIBLE por defecto
 * (sinónimos/lemas, ver scripts/lib/bench-scorer.mjs) — antes era match literal
 * que daba falsos 0/10. Con `--judge` añade un LLM-judge vía ollama que evalúa si
 * la respuesta cumple el criterio SUSTANTIVO; degrada a keyword-flexible si el
 * judge no está / falla.
 *
 * JUEZ INDEPENDIENTE (R4, 2026-05-31): el juez NO debe ser el generador
 * (granite3.1-dense:8b) — eso es auto-evaluación y sesga el score. El default
 * pasa a qwen2.5:14b (familia distinta, estable en Maxwell sm_52). mistral-nemo
 * queda DESCARTADO por crash en Maxwell. `assertIndependentJudge` aborta si el
 * juez coincide con el generador a evaluar.
 *
 * Uso:
 *   node scripts/bench-agente-completo.mjs
 *   node scripts/bench-agente-completo.mjs --judge                 # + LLM-judge (qwen2.5:14b)
 *   node scripts/bench-agente-completo.mjs --judge qwen2.5:14b     # juez explícito
 *   JUDGE_MODEL=qwen2.5:14b node scripts/... --judge               # equivalente por env
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync, spawnSync } from 'node:child_process';
import {
  scoreKeywordsFlexible,
  scoreWithJudge,
  assertIndependentJudge,
  RECOMMENDED_OLLAMA_JUDGE_MODEL,
} from './lib/bench-scorer.mjs';
import { assertCheckoutCurrent } from './lib/bench-checkout-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
// BENCH_OUTPUT_DIR permite PERSISTIR los resultados FUERA del worktree efímero
// (p. ej. al repo principal), para que sobrevivan al cleanup del worktree.
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(DATA_DIR, 'bench-runs');

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_GEN_URL = process.env.OLLAMA_GEN_URL || 'http://localhost:11434/api/generate';
const OLLAMA_LIST_URL = 'http://localhost:11434/api/tags';
const TIMEOUT_MS = 180_000; // 3 min timeout por modelo

// R4 — juez INDEPENDIENTE (COBERTURA de keywords, no anti-alucinación). `--judge
// [modelo]` activa el LLM-judge LOCAL contra ollama. OJO: los jueces locales
// están rotos en Maxwell (devuelven vacío / rubber-stamp); el juez confiable es
// Claude Haiku, cableado en los benches de anti-alucinación
// (bench-complejos-juez-independiente / bench-capabilities-A-vs-C) vía
// selectJudgeProvider. Aquí el default sigue siendo el modelo local solo para
// quien lo fuerce en GPU compatible. Precedencia del modelo:
//   1) argumento posicional tras --judge   (--judge qwen2.5:14b)
//   2) env JUDGE_MODEL
//   3) RECOMMENDED_OLLAMA_JUDGE_MODEL (qwen2.5:14b)
// Sin la flag, el scoring es keyword-FLEXIBLE (sinónimos/lemas).
const USE_JUDGE = process.argv.includes('--judge');
function parseJudgeArg() {
  const i = process.argv.indexOf('--judge');
  if (i >= 0) {
    const next = process.argv[i + 1];
    if (next && !next.startsWith('--')) return next;
  }
  return null;
}
const JUDGE_MODEL = parseJudgeArg() || process.env.JUDGE_MODEL || RECOMMENDED_OLLAMA_JUDGE_MODEL;
const JUDGE_TIMEOUT_MS = 60_000;

const MODELS = {
  gemma3_4b: 'gemma3:4b',
  granite3_1_8b: 'granite3.1-dense:8b',
  ministral_3b: 'ministral-3:latest',
  aya_8b: 'aya:8b',
  mistral_nemo_12b: 'mistral-nemo:12b',
  ministral_14b: 'ministral-3:14b',
  qwen3_30b: 'qwen3:30b',
};

const MAXWELL_ERROR_PATTERNS = [
  'sm_5.2',
  'maxwell',
  'unsupported architecture',
  'compute capability',
  'sm_52'
];

// 50 prompts representativos del dominio agroecológico colombiano
const PROMPTS = [
  // Species (20)
  {
    id: 1,
    category: 'species',
    query: '¿Qué cuidados requiere la fresa en clima frío?',
    expected_keywords: ['drenaje', 'riego', 'heladas', 'poda'],
  },
  {
    id: 2,
    category: 'species',
    query: '¿Cómo se maneja la roya del café de forma orgánica?',
    expected_keywords: ['variedades resistentes', 'poda', 'sombra', 'caldo bordelés'],
  },
  {
    id: 3,
    category: 'species',
    query: '¿Por qué la lechuga hace bolting y cómo evitarlo?',
    expected_keywords: ['calor', 'floración', 'temperatura', 'sombra'],
  },
  {
    id: 4,
    category: 'species',
    query: '¿Qué plantas companion ayudan al maíz y por qué?',
    expected_keywords: ['frijol', 'calabaza', 'nitrógeno', 'sombra'],
  },
  {
    id: 5,
    category: 'species',
    query: '¿Qué distancia de siembra necesita el tomate?',
    expected_keywords: ['50-80cm', 'entre plantas', 'aireación', 'sol'],
  },
  {
    id: 6,
    category: 'species',
    query: '¿Cómo preparar el suelo para sembrar zanahoria?',
    expected_keywords: ['suelo suelto', 'sin piedras', 'arena', 'profundo'],
  },
  {
    id: 7,
    category: 'species',
    query: '¿Qué pH del suelo prefiere la papa?',
    expected_keywords: ['5.0-6.0', 'ácido', 'cal', 'agricultura'],
  },
  {
    id: 8,
    category: 'species',
    query: '¿Cuándo sembrar arveja en clima frío?',
    expected_keywords: ['inicio lluvias', 'marzo-abril', 'agosto-septiembre', 'heladas'],
  },
  {
    id: 9,
    category: 'species',
    query: '¿Qué plagas afectan el cultivo de cebolla?',
    expected_keywords: ['trips', 'mosca', 'hongos', 'fungicida'],
  },
  {
    id: 10,
    category: 'species',
    query: '¿Cómo asociar cilantro con otras hortalizas?',
    expected_keywords: ['repelente', 'ahuyenta', 'compañero', 'insectos'],
  },
  {
    id: 11,
    category: 'species',
    query: '¿Qué tipo de riego necesita la hierbabuena?',
    expected_keywords: ['frecuente', 'humedad', 'sombra', 'drenaje'],
  },
  {
    id: 12,
    category: 'species',
    query: '¿Cómo propagar las plantas de fresa?',
    expected_keywords: ['estolones', 'hijuelos', 'separar', 'raíz'],
  },
  {
    id: 13,
    category: 'species',
    query: '¿Qué nutrientes necesita el cultivo de remolacha?',
    expected_keywords: ['potasio', 'fósforo', 'materia orgánica', 'compost'],
  },
  {
    id: 14,
    category: 'species',
    query: '¿Cómo controlar la marchitez en el tomate?',
    expected_keywords: ['hongos', 'fungicida', 'rotación', 'resistentes'],
  },
  {
    id: 15,
    category: 'species',
    query: '¿Qué variedades de lechuga son más resistentes al calor?',
    expected_keywords: ['romana', 'butterhead', 'corta', 'crisp'],
  },
  {
    id: 16,
    category: 'species',
    query: '¿Cómo hacer almácigo para pimentón?',
    expected_keywords: ['semillero', 'sustrato', 'transplante', '4-6 semanas'],
  },
  {
    id: 17,
    category: 'species',
    query: '¿Qué profundidad necesita la raíz de la zanahoria?',
    expected_keywords: ['30cm', 'suelo profundo', 'suelto', 'sin obstáculos'],
  },
  {
    id: 18,
    category: 'species',
    query: '¿Cómo podar las plantas de tomate?',
    expected_keywords: ['hijuelos', 'axilas', 'tutor', 'ventilación'],
  },
  {
    id: 19,
    category: 'species',
    query: '¿Qué pH del suelo prefiere el ajo?',
    expected_keywords: ['6.0-7.0', 'neutro', 'ligeramente ácido', 'caliza'],
  },
  {
    id: 20,
    category: 'species',
    query: '¿Cómo asociar frijol con maíz?',
    expected_keywords: ['milpa', 'tres hermanas', 'nitrógeno', 'tutor'],
  },

  // Biopreparados (12)
  {
    id: 21,
    category: 'biopreparados',
    query: '¿Cómo preparar caldo bordelés y cuándo aplicarlo?',
    expected_keywords: ['cal', 'sulfato de cobre', 'disolver', 'preventivo'],
  },
  {
    id: 22,
    category: 'biopreparados',
    query: '¿Para qué sirve el biol y cómo se prepara?',
    expected_keywords: ['estiércol', 'fermentación', 'nutrientes', 'microorganismos'],
  },
  {
    id: 23,
    category: 'biopreparados',
    query: '¿Cómo preparar purín de ortigas como abono?',
    expected_keywords: ['ortiga', 'agua', 'fermentar', 'nitrógeno'],
  },
  {
    id: 24,
    category: 'biopreparados',
    query: '¿Cómo hacer extracto de neem para plagas?',
    expected_keywords: ['semillas', 'aceite', 'agua', 'jabón'],
  },
  {
    id: 25,
    category: 'biopreparados',
    query: '¿Qué es el compost y cómo se hace?',
    expected_keywords: ['materia orgánica', 'descomposición', 'humus', 'aireación'],
  },
  {
    id: 26,
    category: 'biopreparados',
    query: '¿Cómo preparar té de compost?',
    expected_keywords: ['compost', 'agua', 'oxígeno', 'bomba'],
  },
  {
    id: 27,
    category: 'biopreparados',
    query: '¿Para qué sirve el bokashi?',
    expected_keywords: ['fermentación', 'microorganismos', 'abono', 'rápido'],
  },
  {
    id: 28,
    category: 'biopreparados',
    query: '¿Cómo preparar el sulfocálcico?',
    expected_keywords: ['azufre', 'cal', 'agua', 'acaricida'],
  },
  {
    id: 29,
    category: 'biopreparados',
    query: '¿Qué es el vermicompost y cómo se produce?',
    expected_keywords: ['lombriz', 'roja', 'californiana', 'estiércol'],
  },
  {
    id: 30,
    category: 'biopreparados',
    query: '¿Cómo hacer jabón potásico insecticida?',
    expected_keywords: ['aceite', 'potasa', 'agua', 'emulsionar'],
  },
  {
    id: 31,
    category: 'biopreparados',
    query: '¿Cómo preparar macerado de ajo para repelente?',
    expected_keywords: ['ajo', 'alcohol', 'agua', 'macerar'],
  },
  {
    id: 32,
    category: 'biopreparados',
    query: '¿Qué es la leche en polvo como fungicida?',
    expected_keywords: ['lactosa', 'oidio', 'preventivo', 'hojas'],
  },

  // Plagas (10)
  {
    id: 33,
    category: 'plagas',
    query: '¿Qué control biológico existe para la mosca blanca?',
    expected_keywords: ['encarsia', 'eretmocerus', 'beauveria', 'parasitoide'],
  },
  {
    id: 34,
    category: 'plagas',
    query: '¿Cómo controlar áfidos sin agroquímicos?',
    expected_keywords: ['mariquita', 'neem', 'jabón', 'depredador'],
  },
  {
    id: 35,
    category: 'plagas',
    query: '¿Cómo controlar el gusano cogollero del maíz?',
    expected_keywords: ['bacillus thuringiensis', 'trichogramma', 'manual', 'centeno'],
  },
  {
    id: 36,
    category: 'plagas',
    query: '¿Qué insectos depredadores controlan pulgones?',
    expected_keywords: ['mariquita', 'crisopa', 'syrphid', 'larvas'],
  },
  {
    id: 37,
    category: 'plagas',
    query: '¿Cómo manejar el trips en cebolla?',
    expected_keywords: ['azul', 'trampas', 'sticky', 'cultivo trampa'],
  },
  {
    id: 38,
    category: 'plagas',
    query: '¿Qué hongos entomopatógenos controlan plagas?',
    expected_keywords: ['beauveria', 'metarhizium', 'isaria', 'infección'],
  },
  {
    id: 39,
    category: 'plagas',
    query: '¿Cómo controlar la mosca de la fruta?',
    expected_keywords: ['trampas', 'atrayente', 'cebado', 'destruir'],
  },
  {
    id: 40,
    category: 'plagas',
    query: '¿Qué avispas parasitoides controlan plagas?',
    expected_keywords: ['trichogramma', 'apanteles', 'encarsia', 'huevo'],
  },
  {
    id: 41,
    category: 'plagas',
    query: '¿Cómo detectar temprano la roya del café?',
    expected_keywords: ['hojas', 'polvo naranja', 'reversa', 'lupa'],
  },
  {
    id: 42,
    category: 'plagas',
    query: '¿Qué plantas trampa atraen plagas?',
    expected_keywords: ['tagetes', 'caléndula', 'centeno', 'atraer'],
  },

  // Normativa (4)
  {
    id: 43,
    category: 'normativa',
    query: '¿Qué agroquímicos están restringidos por el ICA?',
    expected_keywords: ['paraquat', 'organoclorados', 'mercurio', 'restricción'],
  },
  {
    id: 44,
    category: 'normativa',
    query: '¿Cómo consultar el registro ICA de un producto?',
    expected_keywords: ['consulta', 'ICA', 'registro', 'número'],
  },
  {
    id: 45,
    category: 'normativa',
    query: '¿Qué requisitos exige el ICA para biopreparados?',
    expected_keywords: ['registro', 'etiquetado', 'inocuidad', 'efficacia'],
  },
  {
    id: 46,
    category: 'normativa',
    query: '¿Dónde reportar plagas cuarentenarias en Colombia?',
    expected_keywords: ['ICA', 'linea', 'correo', 'autoridad'],
  },

  // Agroforestería (4)
  {
    id: 47,
    category: 'agroforesteria',
    query: '¿Qué árboles son buenos para sistemas agroforestales?',
    expected_keywords: ['leguminosas', 'fijadores', 'sombra', 'leña'],
  },
  {
    id: 48,
    category: 'agroforesteria',
    query: '¿Cómo diseñar un sistema silvopastoril?',
    expected_keywords: ['árboles', 'ganado', 'pasto', 'sombra'],
  },
  {
    id: 49,
    category: 'agroforesteria',
    query: '¿Qué beneficios tiene el café bajo sombra?',
    expected_keywords: ['biodiversidad', 'suelo', 'fertilidad', 'microclima'],
  },
  {
    id: 50,
    category: 'agroforesteria',
    query: '¿Cómo asociar árboles frutales con cultivos anuales?',
    expected_keywords: ['estratos', 'sombra', 'radiación', 'competencia'],
  },
];

let maxwellErrorDetected = false;

function getSidecarToken() {
  // Try token file first
  const tokenPath = `${process.env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, 'utf-8').trim();
  }
  // Fallback to env var
  return process.env.SIDECAR_TOKEN || '';
}

async function resolveEntities(userMessage) {
  const start = performance.now();
  const token = getSidecarToken();
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;

  try {
    const res = await fetch(`${SIDECAR_URL}/resolve-entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      console.log(`    [resolve-entities] HTTP ${res.status}`);
      return { entities: [], latency_ms: performance.now() - start };
    }
    
    const data = await res.json();
    return {
      entities: data.entities || [],
      latency_ms: performance.now() - start,
    };
  } catch (err) {
    console.log(`    [resolve-entities] Error: ${err.message.slice(0, 50)}...`);
    return { entities: [], latency_ms: performance.now() - start };
  }
}

function buildEnrichedSystemPrompt(entities) {
  const basePrompt = `Eres un asistente agroecológico experto para Colombia. Responde en español claro, práctico para agricultores.

Si mentions entidades (especies, plagas, biopreparados), usa los nombres canónicos del catálogo Chagra para evitar alucinaciones.`;

  if (!entities || entities.length === 0) {
    return basePrompt;
  }

  const entityContext = entities.map(e => {
    if (e.kind === 'species') {
      return `- ${e.mentioned} = especie: ${e.nombre_cientifico} (${e.nombre_comun})`;
    } else if (e.kind === 'pest') {
      return `- ${e.mentioned} = plaga: ${e.nombre_cientifico || e.nombre_comun}`;
    } else if (e.kind === 'biopreparado') {
      return `- ${e.mentioned} = biopreparado: ${e.nombre_comun}`;
    }
    return null;
  }).filter(Boolean).join('\n');

  return `${basePrompt}

ENTIDADES DEL CATÁLOGO (usa estos nombres canónicos):
${entityContext}`;
}

async function callOllama(model, systemPrompt, userPrompt, signal) {
  const start = performance.now();
  
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: {
          temperature: 0.7,
          num_predict: 512,
        },
        keep_alive: '30m',
      }),
      signal,
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
    }
    
    const data = await res.json();
    const totalLatencyMs = performance.now() - start;
    const promptEvalCount = data.prompt_eval_count || 0;
    const evalCount = data.eval_count || 0;
    const evalDuration = data.eval_duration || 0;
    const loadDuration = data.load_duration || 0;
    const promptEvalDuration = data.prompt_eval_duration || 0;
    const tokensPerSec = evalDuration > 0
      ? Math.round((evalCount / evalDuration) * 1e9)
      : 0;
    return {
      response: data.message?.content || '',
      latency_ms: totalLatencyMs,
      tokens_estimated: data.message?.content?.length || 0,
      load_duration: loadDuration,
      prompt_eval_count: promptEvalCount,
      prompt_eval_duration: promptEvalDuration,
      eval_count: evalCount,
      eval_duration: evalDuration,
      tokens_per_sec: tokensPerSec,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Timeout');
    }
    throw err;
  }
}

async function postValidate(userMessage, modelResponse) {
  const start = performance.now();
  const token = getSidecarToken();
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;

  try {
    const res = await fetch(`${SIDECAR_URL}/post-validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_message: userMessage,
        response: modelResponse,
      }),
      signal: AbortSignal.timeout(10000),
    });
    
    if (!res.ok) {
      console.log(`    [post-validate] HTTP ${res.status}`);
      return {
        hallucinated: [],
        validated: [],
        age_available: false,
        detected_count: 0,
        latency_ms: performance.now() - start,
      };
    }
    
    const data = await res.json();
    return {
      hallucinated: data.hallucinated || [],
      validated: data.validated || [],
      age_available: Boolean(data.age_available),
      detected_count: data.detected_count || 0,
      latency_ms: performance.now() - start,
    };
  } catch (err) {
    console.log(`    [post-validate] Error: ${err.message.slice(0, 50)}...`);
    return {
      hallucinated: [],
      validated: [],
      age_available: false,
      detected_count: 0,
      latency_ms: performance.now() - start,
    };
  }
}

function checkMaxwellError(error) {
  const errorLower = error.toLowerCase();
  return MAXWELL_ERROR_PATTERNS.some(pattern => errorLower.includes(pattern.toLowerCase()));
}

// R3 — scoring keyword-FLEXIBLE (sinónimos/lemas) en vez del match literal que
// daba falsos 0/10 cuando el modelo decía lo correcto con otras palabras.
function countKeywords(response, keywords) {
  return scoreKeywordsFlexible(response, keywords).matched;
}

/**
 * Caller real del LLM-judge INDEPENDIENTE contra ollama (JUDGE_MODEL, default
 * qwen2.5:14b). Devuelve el texto crudo del modelo; `scoreWithJudge` lo parsea y
 * degrada a keyword-flexible si falla. NO se llama si --judge está apagado.
 */
async function judgeOllamaCall(prompt) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), JUDGE_TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_GEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 120 },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`judge HTTP ${res.status}`);
    const data = await res.json();
    return data.response || '';
  } finally {
    clearTimeout(timer);
  }
}

async function benchmarkModel(modelKey, modelName, promptData) {
  console.log(`  → Testing ${modelKey} (${modelName})...`);
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    // Step 1: Resolve entities
    const entitiesResult = await resolveEntities(promptData.query);
    
    // Step 2: Build enriched system prompt
    const systemPrompt = buildEnrichedSystemPrompt(entitiesResult.entities);
    
    // Step 3: Call Ollama
    const ollamaResult = await callOllama(modelName, systemPrompt, promptData.query, controller.signal);
    
    // Step 4: Post-validate
    const validationResult = await postValidate(promptData.query, ollamaResult.response);

    clearTimeout(timer);

    // R4 — evaluación semántica opcional (--judge) con juez INDEPENDIENTE: el
    // LLM-judge dictamina si la respuesta cumple el criterio SUSTANTIVO (no
    // literal). assertIndependentJudge aborta si el juez es el propio modelo
    // generador (auto-eval). Degrada a keyword-flexible si el judge no está /
    // falla. Sin la flag, no se llama (CERO GPU extra).
    let judge = null;
    if (USE_JUDGE) {
      assertIndependentJudge(JUDGE_MODEL, modelName);
      judge = await scoreWithJudge(
        {
          query: promptData.query,
          response: ollamaResult.response,
          expectedKeywords: promptData.expected_keywords,
        },
        { ollamaCall: judgeOllamaCall },
      );
    }

    const resources = sampleResources();
    return {
      model: modelName,
      latency_resolve_ms: entitiesResult.latency_ms,
      latency_inference_ms: ollamaResult.latency_ms,
      latency_validate_ms: validationResult.latency_ms,
      latency_total_ms: entitiesResult.latency_ms + ollamaResult.latency_ms + validationResult.latency_ms,
      response: ollamaResult.response,
      tokens_estimated: ollamaResult.tokens_estimated,
      load_duration_ns: ollamaResult.load_duration,
      prompt_eval_count: ollamaResult.prompt_eval_count,
      prompt_eval_duration_ns: ollamaResult.prompt_eval_duration,
      eval_count: ollamaResult.eval_count,
      eval_duration_ns: ollamaResult.eval_duration,
      tokens_per_sec: ollamaResult.tokens_per_sec,
      vram_peak_mib: resources.vram_peak_mib,
      ram_peak_mb: resources.ram_peak_mb,
      swap_peak_mb: resources.swap_peak_mb,
      keywords_matched: countKeywords(ollamaResult.response, promptData.expected_keywords),
      keywords_total: promptData.expected_keywords.length,
      judge_cumple: judge ? judge.cumple : null,
      judge_score: judge ? judge.score : null,
      judge_source: judge ? judge.source : null,
      entities_grounded: entitiesResult.entities.length,
      halluc_count: validationResult.detected_count,
      hallucinated: validationResult.hallucinated,
      validated: validationResult.validated,
      age_available: validationResult.age_available,
      error: null,
    };
  } catch (err) {
    const errorMessage = err.message || String(err);
    
    // Check for Maxwell sm_5.2 error
    if (checkMaxwellError(errorMessage)) {
      maxwellErrorDetected = true;
    }
    
    return {
      model: modelName,
      error: errorMessage,
      latency_resolve_ms: null,
      latency_inference_ms: null,
      latency_validate_ms: null,
      latency_total_ms: null,
      response: null,
      load_duration_ns: null,
      prompt_eval_count: null,
      prompt_eval_duration_ns: null,
      eval_count: null,
      eval_duration_ns: null,
      tokens_per_sec: null,
      vram_peak_mib: 'N/A',
      ram_peak_mb: 'N/A',
      swap_peak_mb: 'N/A',
      keywords_matched: 0,
      keywords_total: promptData.expected_keywords.length,
      entities_grounded: 0,
      halluc_count: 0,
      hallucinated: [],
      validated: [],
      age_available: false,
    };
  }
}

async function benchmarkPrompt(promptData, index, total) {
  console.log(`[bench] Prompt ${index + 1}/${total} [${promptData.category}]: ${promptData.query.slice(0, 50)}...`);
  
  const results = {
    prompt_id: promptData.id,
    category: promptData.category,
    query: promptData.query,
    expected_keywords: promptData.expected_keywords,
    timestamp: new Date().toISOString(),
  };

  // Benchmark all 7 models
  const modelKeys = ['gemma3_4b', 'granite3_1_8b', 'ministral_3b', 'aya_8b', 'mistral_nemo_12b', 'ministral_14b', 'qwen3_30b'];
  
  for (const modelKey of modelKeys) {
    const modelName = MODELS[modelKey];
    const result = await benchmarkModel(modelKey, modelName, promptData);
    results[modelKey] = result;
    
    if (result.error) {
      console.log(`    ERROR: ${result.error.slice(0, 80)}...`);
    } else {
      console.log(`    OK: ${result.latency_total_ms.toFixed(0)}ms total, ${result.keywords_matched}/${result.keywords_total} keywords, ${result.entities_grounded} entities, ${result.halluc_count} halluc`);
    }
    
    // Pausa pequeña entre modelos
    await new Promise(r => setTimeout(r, 1000));
  }

  // Determinar ganador (solo entre modelos que completaron exitosamente)
  const successfulModels = modelKeys.filter(k => !results[k].error);
  
  if (successfulModels.length > 0) {
    // Encontrar el modelo con mejor score de keywords
    let bestModel = successfulModels[0];
    let bestScore = results[bestModel].keywords_matched / results[bestModel].keywords_total;
    
    for (const modelKey of successfulModels) {
      const score = results[modelKey].keywords_matched / results[modelKey].keywords_total;
      if (score > bestScore) {
        bestScore = score;
        bestModel = modelKey;
      }
    }
    
    results.winner = bestModel;
    results.reason = `${bestModel} matched ${results[bestModel].keywords_matched}/${results[bestModel].keywords_total} keywords`;
  } else {
    results.winner = 'none';
    results.reason = 'Todos fallaron';
  }

  return results;
}

/**
 * Preflight: verifica que TODOS los modelos de BENCH_MODELS existen en Ollama
 * antes de gastar tiempo en inferencias. Si falta alguno, lista los comandos
 * `ollama pull` necesarios y sale con código ≠ 0.
 * También chequea que Ollama responda (el daemon está vivo).
 */
async function checkOllamaModels() {
  const modelNames = Object.values(MODELS);
  console.log('[preflight] Verificando modelos en Ollama...');

  let ollamaUp = false;
  try {
    const res = await fetch(OLLAMA_LIST_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    ollamaUp = true;

    const installed = new Set((data.models || []).map(m => m.name));
    const missing = modelNames.filter(m => !installed.has(m));

    if (missing.length === 0) {
      console.log(`[preflight] Los ${modelNames.length} modelos están presentes.`);
      return;
    }

    console.error(`[preflight] FALTAN ${missing.length} modelo(s) — abortando.`);
    for (const m of missing) {
      console.error(`  - ${m}`);
    }
    console.error('');
    console.error('Comandos para instalar los faltantes:');
    for (const m of missing) {
      console.error(`  ollama pull ${m}`);
    }
    process.exit(1);
  } catch (err) {
    if (!ollamaUp) {
      console.error('[preflight] No se pudo conectar con Ollama en', OLLAMA_LIST_URL);
      console.error('[preflight] Asegúrate de que el daemon esté corriendo: ollama serve');
      process.exit(1);
    }
    console.error('[preflight] Error inesperado al listar modelos:', err.message);
    process.exit(1);
  }
}

/**
 * Muestrea VRAM, RAM y swap de forma segura sin requerir privilegios.
 * En GPU Maxwell usa `nvidia-smi --query --format=csv` si está disponible;
 * si no, reporta 'N/A'. RAM y swap se leen de /proc/meminfo.
 * @returns {object} { vram_peak_mib, ram_peak_mb, swap_peak_mb }
 */
function sampleResources() {
  const result = { vram_peak_mib: 'N/A', ram_peak_mb: 'N/A', swap_peak_mb: 'N/A' };
  try {
    const meminfo = readFileSync('/proc/meminfo', 'utf-8');
    const totalMatch = meminfo.match(/MemTotal:\s+(\d+)/);
    const availMatch = meminfo.match(/MemAvailable:\s+(\d+)/);
    const swapTotalMatch = meminfo.match(/SwapTotal:\s+(\d+)/);
    const swapFreeMatch = meminfo.match(/SwapFree:\s+(\d+)/);
    if (totalMatch && availMatch) {
      const usedKb = parseInt(totalMatch[1], 10) - parseInt(availMatch[1], 10);
      result.ram_peak_mb = Math.round(usedKb / 1024);
    }
    if (swapTotalMatch && swapFreeMatch) {
      const usedSwapKb = parseInt(swapTotalMatch[1], 10) - parseInt(swapFreeMatch[1], 10);
      result.swap_peak_mb = Math.round(usedSwapKb / 1024);
    }
  } catch (_) { /* best-effort */ }

  try {
    const smi = spawnSync('nvidia-smi', [
      '--query-gpu=memory.used',
      '--format=csv,noheader,nounits',
    ], { timeout: 5000, encoding: 'utf-8' });
    if (smi.status === 0 && smi.stdout) {
      const val = parseInt(smi.stdout.trim(), 10);
      if (!isNaN(val)) result.vram_peak_mib = val;
    }
  } catch (_) { /* best-effort */ }

  return result;
}

async function main() {
  // Guarda ANTI-STALE: aborta si el checkout está atrás de origin/main, para que
  // el bench nunca mida código viejo (pasó 3 veces y contaminó el AH%).
  assertCheckoutCurrent({
    cwd: ROOT_DIR,
    autoPull: process.env.BENCH_AUTO_PULL === '1',
    skip: process.env.BENCH_SKIP_STALE_GUARD === '1',
  });

  // Preflight: todos los modelos existen antes de empezar.
  await checkOllamaModels();

  console.log('');
  console.log('================================================================================');
  console.log('  BENCHMARK COMPLETO DEL AGENTE CHAGRA');
  console.log('================================================================================');
  console.log('');
  console.log('  ¿Qué mide?');
  console.log('  El pipeline completo: resolve-entities → enriched prompt → LLM → post-validate.');
  console.log('  Evalúa cada modelo en 50 consultas reales de agricultores colombianos,');
  console.log('  midiendo qué tan bien usa el grounding del catálogo Chagra sin alucinar.');
  console.log('');
  console.log(`  Modelos evaluados (${Object.keys(MODELS).length}):`);
  for (const [k, v] of Object.entries(MODELS)) {
    console.log(`    • ${v}`);
  }
  console.log('');
  console.log('  ¿Por qué estos modelos?');
  console.log('  Van desde 3B hasta 30B parámetros, cubriendo perfiles:');
  console.log('    • 3B-4B:     Ejecución local en laptop/edge (gemma3:4b, ministral-3:latest)');
  console.log('    • 8B:        Balance calidad/recursos (granite3.1-dense:8b, aya:8b)');
  console.log('    • 12B-14B:   Rendimiento medio-alto (mistral-nemo:12b, ministral-3:14b)');
  console.log('    • 30B:       Máxima calidad (qwen3:30b, require GPU dedicada)');
  console.log('');
  console.log(`  Categorías de consulta (${PROMPTS.length} totales):`);
  console.log('    • species (20)       — Siembra, cuidados, riego, suelo, cosecha, almacenamiento');
  console.log('    • biopreparados (12) — Recetas orgánicas, fermentos, caldos, purines');
  console.log('    • plagas (10)        — Identificación, control, prevención');
  console.log('    • normativa (4)      — Legislación, registro ICA, etiquetado');
  console.log('    • agroforestería (4) — Sistemas silvopastoriles, gremios, barreras');
  console.log('');
  console.log('  Métricas clave:');
  console.log('    • Latencia total:     Tiempo real que espera el usuario (resolve + inferencia + validación)');
  console.log('    • Tokens/s:           Velocidad de generación del LLM');
  console.log('    • Keywords matched:   % de términos esperados que aparecen en la respuesta');
  console.log('    • Entities grounded:  Cuántas entidades del catálogo usa correctamente');
  console.log('    • Hallucinations:     Afirmaciones sin respaldo en el grounding');
  console.log('    • VRAM / RAM:         Consumo de memoria (clave para decidir hardware)');
  console.log('    • Prompt eval:        Tiempo de procesar la consulta (primera latencia)');
  console.log('    • Eval count:         Cantidad de tokens generados');
  console.log('    • Load duration:      Tiempo de carga del modelo en GPU');
  console.log('');
  console.log(`  Output: ${BENCH_RUNS_DIR}`);
  console.log(`  Sidecar: ${SIDECAR_URL}`);
  console.log(`  Ollama:  ${OLLAMA_URL}`);
  console.log('');

  // Crear directorio output
  if (!existsSync(BENCH_RUNS_DIR)) {
    mkdirSync(BENCH_RUNS_DIR, { recursive: true });
  }

  const results = [];
  const startTime = performance.now();

  for (let i = 0; i < PROMPTS.length; i++) {
    const result = await benchmarkPrompt(PROMPTS[i], i, PROMPTS.length);
    results.push(result);
    
    // Pausa entre prompts
    if (i < PROMPTS.length - 1) {
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  const totalTime = performance.now() - startTime;

  // Calcular estadísticas por modelo
  const stats = {};
  const modelKeys = ['gemma3_4b', 'granite3_1_8b', 'ministral_3b', 'aya_8b', 'mistral_nemo_12b', 'ministral_14b', 'qwen3_30b'];
  
  for (const modelKey of modelKeys) {
    const modelName = MODELS[modelKey];
    const successful = results.filter(r => !r[modelKey].error);
    
    const loadDurations = successful.map(r => r[modelKey].load_duration_ns).filter(Boolean);
    const promptEvalCounts = successful.map(r => r[modelKey].prompt_eval_count).filter(Boolean);
    const promptEvalDurations = successful.map(r => r[modelKey].prompt_eval_duration_ns).filter(Boolean);
    const evalCounts = successful.map(r => r[modelKey].eval_count).filter(Boolean);
    const evalDurations = successful.map(r => r[modelKey].eval_duration_ns).filter(Boolean);
    const tokensPerSec = successful.map(r => r[modelKey].tokens_per_sec).filter(v => v !== null && v !== 0);

    const vramValues = successful.map(r => r[modelKey].vram_peak_mib).filter(v => v !== 'N/A' && v !== null);
    const ramValues = successful.map(r => r[modelKey].ram_peak_mb).filter(v => v !== 'N/A' && v !== null);

    stats[modelKey] = {
      modelName,
      successful: successful.length,
      total: PROMPTS.length,
      avgLatencyTotal: successful.length > 0 
        ? successful.reduce((s, r) => s + r[modelKey].latency_total_ms, 0) / successful.length 
        : 0,
      avgLatencyResolve: successful.length > 0
        ? successful.reduce((s, r) => s + r[modelKey].latency_resolve_ms, 0) / successful.length
        : 0,
      avgLatencyInference: successful.length > 0
        ? successful.reduce((s, r) => s + r[modelKey].latency_inference_ms, 0) / successful.length
        : 0,
      avgLatencyValidate: successful.length > 0
        ? successful.reduce((s, r) => s + r[modelKey].latency_validate_ms, 0) / successful.length
        : 0,
      avgKeywords: successful.length > 0
        ? successful.reduce((s, r) => s + (r[modelKey].keywords_matched / r[modelKey].keywords_total), 0) / successful.length
        : 0,
      avgEntities: successful.length > 0
        ? successful.reduce((s, r) => s + r[modelKey].entities_grounded, 0) / successful.length
        : 0,
      avgHalluc: successful.length > 0
        ? successful.reduce((s, r) => s + r[modelKey].halluc_count, 0) / successful.length
        : 0,
      avgLoadDurationMs: loadDurations.length > 0
        ? Math.round(loadDurations.reduce((s, v) => s + v, 0) / loadDurations.length / 1e6)
        : null,
      avgPromptEvalCount: promptEvalCounts.length > 0
        ? Math.round(promptEvalCounts.reduce((s, v) => s + v, 0) / promptEvalCounts.length)
        : null,
      avgPromptEvalDurationMs: promptEvalDurations.length > 0
        ? Math.round(promptEvalDurations.reduce((s, v) => s + v, 0) / promptEvalDurations.length / 1e6)
        : null,
      avgEvalCount: evalCounts.length > 0
        ? Math.round(evalCounts.reduce((s, v) => s + v, 0) / evalCounts.length)
        : null,
      avgEvalDurationMs: evalDurations.length > 0
        ? Math.round(evalDurations.reduce((s, v) => s + v, 0) / evalDurations.length / 1e6)
        : null,
      avgTokensPerSec: tokensPerSec.length > 0
        ? Math.round(tokensPerSec.reduce((s, v) => s + v, 0) / tokensPerSec.length)
        : null,
      avgVram: vramValues.length > 0
        ? Math.round(vramValues.reduce((s, v) => s + v, 0) / vramValues.length)
        : 'N/A',
      avgRam: ramValues.length > 0
        ? Math.round(ramValues.reduce((s, v) => s + v, 0) / ramValues.length)
        : 'N/A',
    };
  }

  const winners = {};
  for (const modelKey of modelKeys) {
    winners[modelKey] = results.filter(r => r.winner === modelKey).length;
  }
  winners.none = results.filter(r => r.winner === 'none').length;

  // Guardar JSONL
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonlPath = join(BENCH_RUNS_DIR, `agente-completo-${dateStr}.jsonl`);
  
  const jsonlLines = results.map(r => JSON.stringify(r));
  writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n');

  // Generar summary.md
  const summaryContent = `# Agente Chagra Completo — Benchmark LARGO — ${dateStr}

## Metadata
- **Timestamp**: ${new Date().toISOString()}
- **Modelos**: ${Object.values(MODELS).join(', ')}
- **Prompts**: ${PROMPTS.length}
- **Categorías**: 
  - Species: 20
  - Biopreparados: 12
  - Plagas: 10
  - Normativa: 4
  - Agroforestería: 4
- **Pipeline completo**: resolve-entities → enriched prompt → Ollama → post-validate
- **Tiempo total**: ${(totalTime / 1000 / 60).toFixed(2)}min
- **Tiempo promedio por prompt**: ${(totalTime / PROMPTS.length / 1000).toFixed(2)}s
- **Sidecar URL**: ${SIDECAR_URL}
- **Ollama URL**: ${OLLAMA_URL}

## Resultados Globales

| Modelo | Exitosos | Latencia Total (ms) | Tokens/s | Prompt Eval | Eval Count | VRAM (MiB) | RAM (MB) | Keywords (%) | Entities | Halluc |
|--------|----------|---------------------|----------|-------------|------------|------------|----------|-------------|----------|--------|
${modelKeys.map(k => {
  const s = stats[k];
  const tokensPerSec = s.avgTokensPerSec !== null ? s.avgTokensPerSec : 'N/A';
  const promptEval = s.avgPromptEvalDurationMs !== null ? `${s.avgPromptEvalDurationMs}ms` : 'N/A';
  const evalCount = s.avgEvalCount !== null ? s.avgEvalCount : 'N/A';
  const vram = s.avgVram !== undefined ? s.avgVram : 'N/A';
  const ram = s.avgRam !== undefined ? s.avgRam : 'N/A';
  return `| **${s.modelName}** | ${s.successful}/${PROMPTS.length} | ${s.avgLatencyTotal.toFixed(0)} | ${tokensPerSec} | ${promptEval} | ${evalCount} | ${vram} | ${ram} | ${(s.avgKeywords * 100).toFixed(1)}% | ${s.avgEntities.toFixed(1)} | ${s.avgHalluc.toFixed(1)} |`;
}).join('\n')}

## Ganadores por Prompt

| Ganador | Cantidad | Porcentaje |
|---------|----------|-----------|
${modelKeys.map(k => {
  return `| **${MODELS[k]}** | ${winners[k]} | ${(winners[k] / PROMPTS.length * 100).toFixed(1)}% |`;
}).join('\n')}
| **Todos fallaron** | ${winners.none} | ${(winners.none / PROMPTS.length * 100).toFixed(1)}% |

## Por Categoría

### Species (20 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) | Avg Entities |
|--------|-----------------|-----------------|--------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'species' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_total_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  const avgEntities = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + r[k].entities_grounded, 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% | ${avgEntities.toFixed(1)} |`;
}).join('\n')}

### Biopreparados (12 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) | Avg Entities |
|--------|-----------------|-----------------|--------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'biopreparados' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_total_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  const avgEntities = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + r[k].entities_grounded, 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% | ${avgEntities.toFixed(1)} |`;
}).join('\n')}

### Plagas (10 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) | Avg Entities |
|--------|-----------------|-----------------|--------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'plagas' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_total_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  const avgEntities = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + r[k].entities_grounded, 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% | ${avgEntities.toFixed(1)} |`;
}).join('\n')}

### Normativa (4 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) | Avg Entities |
|--------|-----------------|-----------------|--------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'normativa' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_total_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  const avgEntities = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + r[k].entities_grounded, 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% | ${avgEntities.toFixed(1)} |`;
}).join('\n')}

### Agroforestería (4 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) | Avg Entities |
|--------|-----------------|-----------------|--------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'agroforesteria' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_total_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  const avgEntities = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + r[k].entities_grounded, 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% | ${avgEntities.toFixed(1)} |`;
}).join('\n')}

## Conclusión

${(() => {
  // Encontrar el modelo con más victorias
  let bestModel = modelKeys[0];
  let bestWins = winners[bestModel];
  
  for (const modelKey of modelKeys) {
    if (winners[modelKey] > bestWins) {
      bestWins = winners[modelKey];
      bestModel = modelKey;
    }
  }
  
  const s = stats[bestModel];
  return `**${s.modelName}** ganó en ${winners[bestModel]} de ${PROMPTS.length} prompts (${(winners[bestModel] / PROMPTS.length * 100).toFixed(1)}%), con latencia total promedio de ${s.avgLatencyTotal.toFixed(0)}ms, ${(s.avgKeywords * 100).toFixed(1)}% keywords matched, ${s.avgEntities.toFixed(1)} entities grounded y ${s.avgHalluc.toFixed(1)} alucinaciones promedio.`;
})()}

${(() => {
  // Encontrar el modelo más rápido
  let fastestModel = modelKeys[0];
  let fastestTime = stats[fastestModel].avgLatencyTotal;
  
  for (const modelKey of modelKeys) {
    if (stats[modelKey].avgLatencyTotal > 0 && stats[modelKey].avgLatencyTotal < fastestTime) {
      fastestTime = stats[modelKey].avgLatencyTotal;
      fastestModel = modelKey;
    }
  }
  
  if (fastestTime > 0) {
    return `**Velocidad**: ${MODELS[fastestModel]} fue el más rápido con ${fastestTime.toFixed(0)}ms promedio.`;
  }
  return `**Velocidad**: Todos los modelos fallaron.`;
})()}

${(() => {
  // Detectar OOM / swap spill: si un modelo tuvo éxito pero swap > 0, señal de spill
  const swapWarnings = [];
  const oomErrors = [];
  for (const modelKey of modelKeys) {
    for (const r of results) {
      const m = r[modelKey];
      if (m.error) {
        const e = (m.error || '').toLowerCase();
        if (e.includes('oom') || e.includes('out of memory') || e.includes('cuda error')) {
          oomErrors.push({ model: m.model, error: m.error });
        }
        continue;
      }
      if (m.swap_peak_mb !== 'N/A' && m.swap_peak_mb > 500) {
        swapWarnings.push({ model: m.model, swapMb: m.swap_peak_mb });
      }
    }
  }
  const dedupedSwap = [...new Map(swapWarnings.map(s => [s.model, s])).values()];
  const dedupedOom = [...new Map(oomErrors.map(s => [s.model, s])).values()];
  let output = '';

  if (maxwellErrorDetected) {
    output += `
## ⚠️ Advertencia Maxwell sm_5.2

Se detectaron errores relacionados con arquitectura Maxwell sm_5.2 durante el benchmark.
Esto indica incompatibilidad con GPU Maxwell (Compute Capability 5.2).
`;
  }

  if (dedupedOom.length > 0) {
    output += `
## 🔴 OOM / CUDA Error detectados

Los siguientes modelos fallaron por falta de memoria:
`;
    for (const o of dedupedOom) {
      output += `- **${o.model}**: ${o.error}\n`;
    }
    output += '\n';
  }

  if (dedupedSwap.length > 0) {
    output += `
## ⚠️ Spill a swap detectado

Los siguientes modelos usaron >500MB de swap, indicando presión de memoria:
`;
    for (const s of dedupedSwap) {
      output += `- **${s.model}**: ${s.swapMb} MB swap\n`;
    }
    output += '\n';
  }

  return output;
})()}

## Gates vs configuración de producción

No se encontró \`config/setup-llm-prod.json\` — no se puede comparar contra gates automáticos.
**Ningún modelo se selecciona automáticamente para producción: se requiere revisión humana obligatoria.**

## Siguiente Paso

Para evaluar la calidad de las respuestas con LLM-judge:

\`\`\`bash
node scripts/bench-llm-judge.mjs --from ${jsonlPath}
\`\`\`

---

**Benchmark LARGO agente completo** — Generado por \`bench-agente-completo.mjs\`
⚠️ Ningún modelo en este reporte ha sido seleccionado automáticamente para producción.
La revisión humana es obligatoria antes de promover un modelo.
`;

  const summaryPath = join(BENCH_RUNS_DIR, `agente-completo-${dateStr}-summary.md`);
  writeFileSync(summaryPath, summaryContent);

  console.log('');
  console.log('================================================================================');
  console.log('  RESULTADOS');
  console.log('================================================================================');
  console.log('');
  console.log(`  Tiempo total del benchmark: ${(totalTime / 1000 / 60).toFixed(2)} minutos`);
  console.log(`  Promedio por consulta:      ${(totalTime / PROMPTS.length / 1000).toFixed(2)} segundos`);
  console.log('');
  for (const modelKey of modelKeys) {
    const s = stats[modelKey];
    const okRate = s.successful > 0 ? ((s.successful / PROMPTS.length) * 100).toFixed(0) : '0';
    const tokensPerSec = s.avgTokensPerSec !== null ? `${s.avgTokensPerSec} tok/s` : 'N/A';
    const vram = s.avgVram !== 'N/A' ? `${s.avgVram} MiB` : 'N/A';
    const ram = s.avgRam !== 'N/A' ? `${s.avgRam} MB` : 'N/A';
    const promptEval = s.avgPromptEvalDurationMs !== null ? `${(s.avgPromptEvalDurationMs / 1000).toFixed(1)}s` : 'N/A';
    const evalCount = s.avgEvalCount !== null ? `${s.avgEvalCount}` : 'N/A';

    console.log(`  ── ${s.modelName} ──`);
    console.log(`  Consultas exitosas: ${s.successful}/${PROMPTS.length} (${okRate}%) — modelos caídos = 0 significa ejecutable`);
    console.log(`  Velocidad:         ${s.avgLatencyTotal.toFixed(0)}ms por consulta (resolver ${s.avgLatencyResolve.toFixed(0)}ms, inferir ${s.avgLatencyInference.toFixed(0)}ms, validar ${s.avgLatencyValidate.toFixed(0)}ms)`);
    console.log(`  Tokens:            ${tokensPerSec}, ${evalCount} tokens generados, evalúo del prompt ${promptEval}`);
    console.log(`  Precisión:         ${(s.avgKeywords * 100).toFixed(1)}% keywords acertados, ${s.avgEntities.toFixed(1)} entidades del catálogo usadas`);
    console.log(`  Alucinaciones:     ${s.avgHalluc.toFixed(1)} por respuesta`);
    console.log(`  Recursos:          VRAM ${vram}, RAM ${ram}`);
    console.log('');
  }
  console.log('  ── Ranking por victorias ──');
  const sortedModels = [...modelKeys].sort((a, b) => (winners[a] || 0) - (winners[b] || 0)).reverse();
  for (let rank = 0; rank < sortedModels.length; rank++) {
    const mk = sortedModels[rank];
    const pct = ((winners[mk] / PROMPTS.length) * 100).toFixed(1);
    console.log(`  #${rank + 1}  ${MODELS[mk]}  —  ${winners[mk]} victorias (${pct}%)`);
  }
  if (winners.none > 0) {
    console.log(`  —   Todos fallaron: ${winners.none} consultas`);
  }
  console.log('');
  console.log('  Archivos generados:');
  console.log(`    Datos:    ${jsonlPath}`);
  console.log(`    Reporte:  ${summaryPath}`);
  console.log('');
  
  console.log(`\n[bench] Invocando LLM-judge para evaluar calidad...`);
  try {
    console.log(`[bench] node scripts/bench-llm-judge.mjs --from ${jsonlPath}`);
    execSync(`node scripts/bench-llm-judge.mjs --from ${jsonlPath}`, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    console.log(`[bench] LLM-judge completado exitosamente.`);
  } catch (err) {
    console.log(`[bench] ⚠️  LLM-judge falló o no está disponible: ${err.message}`);
  }
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
