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
 * que daba falsos 0/10. Con `--judge` añade un LLM-judge (mistral-nemo:12b vía
 * ollama) que evalúa si la respuesta cumple el criterio SUSTANTIVO; degrada a
 * keyword-flexible si el judge no está / falla.
 *
 * Uso:
 *   node scripts/bench-agente-completo.mjs
 *   node scripts/bench-agente-completo.mjs --judge        # + LLM-judge semántico
 *   JUDGE_MODEL=granite3.1-dense:8b node scripts/... --judge
 */
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { scoreKeywordsFlexible, scoreWithJudge } from './lib/bench-scorer.mjs';
import { applyOutputGuards } from '../src/services/outputGuards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = join(DATA_DIR, 'bench-runs');

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const OLLAMA_URL = 'http://localhost:11434/api/chat';
const OLLAMA_GEN_URL = process.env.OLLAMA_GEN_URL || 'http://localhost:11434/api/generate';
const TIMEOUT_MS = 180_000; // 3 min timeout por modelo

// R3 — evaluador semántico. `--judge` activa el LLM-judge (mistral-nemo:12b por
// defecto: índice de benchmarks lo marca como judge 100% NUEVO). Sin la flag, el
// scoring es keyword-FLEXIBLE (sinónimos/lemas) en vez del match literal previo.
const USE_JUDGE = process.argv.includes('--judge');
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'mistral-nemo:12b';
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
    return {
      response: data.message?.content || '',
      latency_ms: performance.now() - start,
      tokens_estimated: data.message?.content?.length || 0,
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
 * Caller real del LLM-judge contra ollama (mistral-nemo:12b). Devuelve el texto
 * crudo del modelo; `scoreWithJudge` lo parsea y degrada a keyword-flexible si
 * falla. NO se llama si --judge está apagado.
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

    // R3 — evaluación semántica opcional (--judge): el LLM-judge dictamina si la
    // respuesta cumple el criterio SUSTANTIVO (no literal). Degrada a keyword-
    // flexible si el judge no está / falla. Sin la flag, no se llama (CERO GPU
    // extra).
    let judge = null;
    if (USE_JUDGE) {
      judge = await scoreWithJudge(
        {
          query: promptData.query,
          response: ollamaResult.response,
          expectedKeywords: promptData.expected_keywords,
        },
        { ollamaCall: judgeOllamaCall },
      );
    }

    return {
      model: modelName,
      latency_resolve_ms: entitiesResult.latency_ms,
      latency_inference_ms: ollamaResult.latency_ms,
      latency_validate_ms: validationResult.latency_ms,
      latency_total_ms: entitiesResult.latency_ms + ollamaResult.latency_ms + validationResult.latency_ms,
      response: ollamaResult.response,
      tokens_estimated: ollamaResult.tokens_estimated,
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

// ─────────────────────────────────────────────────────────────────────────────
// MODO POOL EXTERNO (--prompts): corre un pool CPX-* (must_include / red_flags +
// criterio semántico) contra UN modelo (default granite3.1-dense:8b), replicando
// el pipeline REAL de la PWA: resolve-entities → granite → applyOutputGuards →
// post-validate → scoring. --guards default ON. --judge usa el LLM-judge
// semántico (mistral-nemo:12b) como criterio de PASS sustantivo, NO literal.
// ─────────────────────────────────────────────────────────────────────────────

function parsePoolArgs(argv) {
  const args = { prompts: null, sample: null, seed: null, model: 'granite3.1-dense:8b', guards: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prompts') args.prompts = argv[++i];
    else if (a === '--sample') args.sample = parseInt(argv[++i], 10);
    else if (a === '--seed') args.seed = parseInt(argv[++i], 10);
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--guards') args.guards = true;
    else if (a === '--no-guards') args.guards = false;
  }
  return args;
}

/** Altitudes regionales conocidas para prompts sin cifra explícita (msnm). */
const REGION_ALTITUDE_FALLBACK = {
  'CPX-003': 2400, // Boyacá silvopastoril frío-templado
  'CPX-006': 2150, // Villa de Leyva, altiplano cundiboyacense
  'CPX-007': 150, // Montes de María, Caribe seco/cálido
  'CPX-008': 1500, // Líbano Tolima, zona cafetera
  'CPX-009': 50, // Chocó, tierra caliente Pacífico
  'CPX-010': 450, // Villavicencio, llano / tierra caliente
};
const DEFAULT_ANDEAN_ALTITUDE = 2200;

/** Extrae la altitud (msnm) del texto del prompt; fallback regional/andino. */
function extractFincaAltitud(promptText, promptId) {
  const t = String(promptText || '');
  const m =
    t.match(/(\d[\d.]*)\s*(?:metros|msnm)/i) ||
    t.match(/(?:a|como a)\s+(\d[\d.]*)\b/i) ||
    t.match(/(\d\.\d{3})\b/);
  if (m) {
    const n = Number(m[1].replace(/\./g, ''));
    if (Number.isFinite(n) && n >= 0 && n <= 6000) return n;
  }
  if (REGION_ALTITUDE_FALLBACK[promptId] != null) return REGION_ALTITUDE_FALLBACK[promptId];
  return DEFAULT_ANDEAN_ALTITUDE;
}

function _poolNorm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * Score LITERAL must_include / red_flags (la métrica vieja, 1/10). Se conserva
 * SOLO como señal secundaria de la tabla comparativa. El PASS oficial cuando
 * --judge está activo lo dicta el juez semántico (scorePoolSemantic).
 */
function scorePoolLiteral(text, prompt) {
  const n = _poolNorm(text);
  const must = Array.isArray(prompt.must_include) ? prompt.must_include : [];
  const flags = Array.isArray(prompt.red_flags) ? prompt.red_flags : [];
  const mustHit = must.filter((m) => n.includes(_poolNorm(m)));
  const mustMiss = must.filter((m) => !n.includes(_poolNorm(m)));
  const flagHit = flags.filter((f) => n.includes(_poolNorm(f)));
  return {
    pass: mustMiss.length === 0 && flagHit.length === 0,
    must_total: must.length,
    must_hit: mustHit.length,
    must_missing: mustMiss,
    red_flags_fired: flagHit,
  };
}

/**
 * Score SEMÁNTICO (R3): el juez mistral-nemo:12b decide si la respuesta cumple
 * el criterio SUSTANTIVO del prompt (pass_fail del fixture), evaluando el fondo,
 * no la literalidad. Se le pasan must_include como guía y red_flags como vetos.
 * Degrada a keyword-flexible si el juez no está / falla.
 */
function buildPoolJudgePrompt(prompt, text) {
  const must = (prompt.must_include || []).join('; ');
  const flags = (prompt.red_flags || []).join('; ');
  const criterio = prompt.pass_fail || '';
  return [
    'Eres un evaluador experto en agroecología colombiana. Decide si la RESPUESTA',
    'cumple SUSTANTIVAMENTE el criterio. Importa el FONDO (conceptos correctos),',
    'NO la literalidad: cuenta como acierto si dice lo mismo con sinónimos o lemas.',
    '',
    `PREGUNTA: ${prompt.prompt || prompt.query}`,
    '',
    `CRITERIO DE APROBACIÓN: ${criterio}`,
    '',
    `CONCEPTOS QUE DEBE CUBRIR (guía de fondo, no literal): ${must}`,
    '',
    `BANDERAS ROJAS — si la respuesta INCURRE en alguna de estas, NO cumple: ${flags}`,
    '',
    `RESPUESTA DEL MODELO: ${text}`,
    '',
    'Devuelve SOLO un JSON en una línea: {"cumple": true|false, "score": 0.0-1.0}',
    'donde "cumple"=true sólo si cubre el fondo Y no incurre en ninguna bandera roja.',
  ].join('\n');
}

function parsePoolVerdict(raw) {
  if (typeof raw !== 'string') return null;
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
      /* fall through */
    }
  }
  const up = raw.toUpperCase();
  if (/NO[_\s]?CUMPLE/.test(up)) return { cumple: false, score: 0 };
  if (/CUMPLE/.test(up)) return { cumple: true, score: 1 };
  return null;
}

async function scorePoolSemantic(prompt, text) {
  // Fallback keyword-flexible (sinónimos/lemas) usando must_include como conceptos.
  const kwFlex = scoreKeywordsFlexible(text, prompt.must_include || []);
  const kwScore = kwFlex.total > 0 ? kwFlex.matched / kwFlex.total : 0;
  // Veto literal de red_flags incluso en el fallback (un red_flag literal = FAIL).
  const lit = scorePoolLiteral(text, prompt);
  const fallback = {
    cumple: kwScore >= 0.5 && lit.red_flags_fired.length === 0,
    score: kwScore,
    source: 'keywords',
  };
  if (!USE_JUDGE) return fallback;
  try {
    const raw = await judgeOllamaCall(buildPoolJudgePrompt(prompt, text));
    const verdict = parsePoolVerdict(raw);
    if (!verdict) return fallback;
    return { cumple: verdict.cumple, score: verdict.score, source: 'judge' };
  } catch (_) {
    return fallback;
  }
}

async function runExternalPool(args) {
  const poolRaw = JSON.parse(readFileSync(args.prompts, 'utf-8'));
  let pool = Array.isArray(poolRaw) ? poolRaw : poolRaw.prompts || [];
  const fixtureId = poolRaw.fixture_id || 'external-pool';

  if (args.sample && args.sample < pool.length) {
    const seed = Number.isFinite(args.seed) ? args.seed : 1;
    let s = seed >>> 0 || 1;
    const rng = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const idx = pool.map((_, i) => i).sort(() => rng() - 0.5).slice(0, args.sample);
    pool = idx.sort((a, b) => a - b).map((i) => pool[i]);
  }

  console.log('[bench] === MODO POOL EXTERNO ===');
  console.log(`[bench] Pool: ${args.prompts} (${fixtureId}) — ${pool.length} prompts`);
  console.log(`[bench] Modelo: ${args.model}`);
  console.log(`[bench] Guards (applyOutputGuards): ${args.guards ? 'ON' : 'OFF'}`);
  console.log(`[bench] Scoring PASS: ${USE_JUDGE ? `SEMÁNTICO (judge ${JUDGE_MODEL})` : 'keyword-flexible'} + veto red_flags`);
  console.log(`[bench] Sidecar: ${SIDECAR_URL} | Ollama: ${OLLAMA_URL}`);

  if (!existsSync(BENCH_RUNS_DIR)) mkdirSync(BENCH_RUNS_DIR, { recursive: true });

  const rows = [];
  const startTime = performance.now();

  for (let i = 0; i < pool.length; i++) {
    const p = pool[i];
    const id = p.id || `P-${i + 1}`;
    const query = p.prompt || p.query;
    const fincaAltitud = extractFincaAltitud(query, id);
    console.log(`\n[bench] ${i + 1}/${pool.length} ${id} (alt=${fincaAltitud}m): ${query.slice(0, 60)}...`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let row = { id, region: p.region || null, query, finca_altitud: fincaAltitud };

    try {
      const er = await resolveEntities(query);
      const entities = er.entities;
      const systemPrompt = buildEnrichedSystemPrompt(entities);
      const oll = await callOllama(args.model, systemPrompt, query, controller.signal);
      const rawText = oll.response;

      let guardedText = rawText;
      let guardRes = { modified: false, reasons: [] };
      if (args.guards) {
        guardRes = applyOutputGuards(rawText, { resolvedEntities: entities, fincaAltitud });
        guardedText = guardRes.text;
      }

      const pv = await postValidate(query, guardedText);

      // Score LITERAL (señal vieja, tabla) + SEMÁNTICO (PASS oficial).
      const litRaw = scorePoolLiteral(rawText, p);
      const litGuarded = scorePoolLiteral(guardedText, p);
      const semRaw = await scorePoolSemantic(p, rawText);
      const semGuarded = await scorePoolSemantic(p, guardedText);

      clearTimeout(timer);

      row = {
        ...row,
        entities_grounded: entities.length,
        entities: entities.map((e) => ({
          mentioned: e.mentioned,
          kind: e.kind,
          nombre_cientifico: e.nombre_cientifico,
          es_invasora: e.es_invasora,
          altitud_min: e.altitud_min,
          altitud_max: e.altitud_max,
        })),
        latency_inference_ms: oll.latency_ms,
        response_raw: rawText,
        response_guarded: guardedText,
        guards_modified: guardRes.modified,
        guards_reasons: guardRes.reasons,
        post_validate: {
          validated: pv.validated,
          hallucinated: pv.hallucinated,
          detected_count: pv.detected_count,
          age_available: pv.age_available,
        },
        score_literal_raw: litRaw,
        score_literal_guarded: litGuarded,
        score_semantic_raw: semRaw,
        score_semantic_guarded: semGuarded,
        pass_raw: semRaw.cumple,
        pass_guarded: semGuarded.cumple,
        pass_literal_raw: litRaw.pass,
        pass_literal_guarded: litGuarded.pass,
        error: null,
      };
      console.log(
        `    SEM raw:${semRaw.cumple ? 'PASS' : 'FAIL'} → guarded:${semGuarded.cumple ? 'PASS' : 'FAIL'} (${semGuarded.source}) ` +
          `| LIT must ${litGuarded.must_hit}/${litGuarded.must_total} flags ${litGuarded.red_flags_fired.length} ` +
          `| guards:${guardRes.modified ? guardRes.reasons.join(';') : 'none'} | ${oll.latency_ms.toFixed(0)}ms`,
      );
    } catch (err) {
      clearTimeout(timer);
      const msg = err.message || String(err);
      if (checkMaxwellError(msg)) maxwellErrorDetected = true;
      row = { ...row, error: msg, pass_raw: false, pass_guarded: false };
      console.log(`    ERROR: ${msg.slice(0, 80)}`);
    }

    rows.push(row);

    // Vigilancia térmica GPU Maxwell: pausa si > 88°C.
    try {
      const tempOut = execSync(
        'nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null || PATH=$PATH:/run/current-system/sw/bin nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null',
        { encoding: 'utf-8', shell: '/bin/bash' },
      ).trim();
      const temp = parseInt(tempOut, 10);
      if (Number.isFinite(temp)) {
        console.log(`    [gpu] ${temp}°C`);
        if (temp > 88) {
          console.log(`    [gpu] ⚠️  ${temp}°C > 88 — pausando 60s para enfriar`);
          await new Promise((r) => setTimeout(r, 60000));
        }
      }
    } catch (_) {
      /* nvidia-smi no disponible: continuar */
    }

    if (i < pool.length - 1) await new Promise((r) => setTimeout(r, 2000));
  }

  const totalMin = (performance.now() - startTime) / 1000 / 60;
  const passRaw = rows.filter((r) => r.pass_raw).length;
  const passGuarded = rows.filter((r) => r.pass_guarded).length;
  const passLiteralRaw = rows.filter((r) => r.pass_literal_raw).length;
  const passLiteralGuarded = rows.filter((r) => r.pass_literal_guarded).length;

  const dateStr = new Date().toISOString().split('T')[0];
  const outPath = join(BENCH_RUNS_DIR, `external-pool-${fixtureId}-semantic-${dateStr}.json`);
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fixture_id: fixtureId,
        model: args.model,
        guards: args.guards,
        judge: USE_JUDGE ? JUDGE_MODEL : null,
        generated_at: new Date().toISOString(),
        pass_semantic_raw: passRaw,
        pass_semantic_guarded: passGuarded,
        pass_literal_raw: passLiteralRaw,
        pass_literal_guarded: passLiteralGuarded,
        total: rows.length,
        rows,
      },
      null,
      2,
    ),
  );

  console.log('\n[bench] ===== RESULTADO POOL EXTERNO =====');
  console.log(`[bench] Modelo: ${args.model} | Guards: ${args.guards ? 'ON' : 'OFF'} | ${totalMin.toFixed(1)}min`);
  console.log(`[bench] SEMÁNTICO sin guards: ${passRaw}/${rows.length}  | con guards: ${passGuarded}/${rows.length}`);
  console.log(`[bench] LITERAL   sin guards: ${passLiteralRaw}/${rows.length}  | con guards: ${passLiteralGuarded}/${rows.length}`);
  console.log('[bench] Tabla:');
  for (const r of rows) {
    if (r.error) {
      console.log(`[bench]   ${r.id}: ERROR ${r.error.slice(0, 40)}`);
      continue;
    }
    const delta = r.pass_raw === r.pass_guarded ? '=' : r.pass_guarded ? '↑' : '↓';
    console.log(
      `[bench]   ${r.id}: SEM raw ${r.pass_raw ? 'PASS' : 'FAIL'} → guarded ${r.pass_guarded ? 'PASS' : 'FAIL'} ${delta} ` +
        `| LIT miss:[${r.score_literal_guarded.must_missing.join(', ')}] flags:[${r.score_literal_guarded.red_flags_fired.join(', ')}] ` +
        `| guards:${r.guards_modified ? r.guards_reasons.join(';') : 'none'}`,
    );
  }
  console.log(`\n[bench] Raw output: ${outPath}`);
  if (maxwellErrorDetected) console.log('[bench] ⚠️  Maxwell sm_5.2 error detectado durante el run.');
  return outPath;
}

async function main() {
  const poolArgs = parsePoolArgs(process.argv.slice(2));
  if (poolArgs.prompts) {
    return runExternalPool(poolArgs);
  }
  console.log('[bench] Agente Chagra completo — Benchmark LARGO');
  console.log(`[bench] Modelos: ${Object.values(MODELS).join(', ')}`);
  console.log(`[bench] Prompts: ${PROMPTS.length}`);
  console.log(`[bench] Categorías: species(20), biopreparados(12), plagas(10), normativa(4), agroforestería(4)`);
  console.log(`[bench] Directorio output: ${BENCH_RUNS_DIR}`);
  console.log(`[bench] Sidecar URL: ${SIDECAR_URL}`);
  console.log(`[bench] Ollama URL: ${OLLAMA_URL}`);

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

| Modelo | Exitosos | Latencia Total (ms) | Resolve | Inference | Validate | Keywords (%) | Entities | Halluc |
|--------|----------|---------------------|---------|-----------|----------|-------------|----------|--------|
${modelKeys.map(k => {
  const s = stats[k];
  return `| **${s.modelName}** | ${s.successful}/${PROMPTS.length} | ${s.avgLatencyTotal.toFixed(0)} | ${s.avgLatencyResolve.toFixed(0)} | ${s.avgLatencyInference.toFixed(0)} | ${s.avgLatencyValidate.toFixed(0)} | ${(s.avgKeywords * 100).toFixed(1)}% | ${s.avgEntities.toFixed(1)} | ${s.avgHalluc.toFixed(1)} |`;
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

${maxwellErrorDetected ? `
## ⚠️ Advertencia Maxwell sm_5.2

Se detectaron errores relacionados con arquitectura Maxwell sm_5.2 durante el benchmark.
Esto indica incompatibilidad con GPU Maxwell (Compute Capability 5.2).
` : ''}

## Siguiente Paso

Para evaluar la calidad de las respuestas con LLM-judge:

\`\`\`bash
node scripts/bench-llm-judge.mjs --from ${jsonlPath}
\`\`\`

---

**Benchmark LARGO agente completo** — Generado por \`bench-agente-completo.mjs\`
`;

  const summaryPath = join(BENCH_RUNS_DIR, `agente-completo-${dateStr}-summary.md`);
  writeFileSync(summaryPath, summaryContent);

  console.log('\n[bench] ===== RESULTADOS =====');
  console.log(`[bench] Tiempo total: ${(totalTime / 1000 / 60).toFixed(2)}min`);
  console.log(`[bench]`);
  for (const modelKey of modelKeys) {
    const s = stats[modelKey];
    console.log(`[bench] ${s.modelName}:`);
    console.log(`[bench]   Exitosos: ${s.successful}/${PROMPTS.length}`);
    console.log(`[bench]   Latencia avg: ${s.avgLatencyTotal.toFixed(0)}ms (R:${s.avgLatencyResolve.toFixed(0)} I:${s.avgLatencyInference.toFixed(0)} V:${s.avgLatencyValidate.toFixed(0)})`);
    console.log(`[bench]   Keywords avg: ${(s.avgKeywords * 100).toFixed(1)}%`);
    console.log(`[bench]   Entities avg: ${s.avgEntities.toFixed(1)}`);
    console.log(`[bench]   Hallucinations avg: ${s.avgHalluc.toFixed(1)}`);
    console.log(`[bench]`);
  }
  console.log(`[bench] Ganadores:`);
  for (const modelKey of modelKeys) {
    console.log(`[bench]   ${MODELS[modelKey]}: ${winners[modelKey]} (${(winners[modelKey] / PROMPTS.length * 100).toFixed(1)}%)`);
  }
  console.log(`[bench]   Todos fallaron: ${winners.none} (${(winners.none / PROMPTS.length * 100).toFixed(1)}%)`);
  console.log(`[bench]`);
  console.log(`[bench] Output:`);
  console.log(`[bench]   JSONL: ${jsonlPath}`);
  console.log(`[bench]   Summary: ${summaryPath}`);
  
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
