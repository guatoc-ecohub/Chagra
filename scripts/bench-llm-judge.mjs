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
 *   node scripts/bench-llm-judge.mjs --from data/bench-runs/results.json
 *
 * Output: data/bench-judge-scores/{YYYY-MM-DD}.jsonl + summary.md
 *
 * Smoke con 10 prompts vs granite/llama/gemma.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = join(DATA_DIR, 'bench-runs');
const OUTPUT_DIR = join(DATA_DIR, 'bench-judge-scores');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const JUDGE_MODEL = process.env.JUDGE_MODEL || 'gemma3:4b';
const TIMEOUT_MS = 60_000;

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

function loadBenchData(fromPath) {
  if (fromPath && existsSync(fromPath)) {
    const raw = readFileSync(fromPath, 'utf-8');
    return JSON.parse(raw);
  }

  // Buscar archivos en data/bench-runs/
  if (existsSync(BENCH_RUNS_DIR)) {
    const files = readdirSync(BENCH_RUNS_DIR).filter((f) => f.endsWith('.json'));
    if (files.length > 0) {
      const latest = files.sort().reverse()[0];
      const raw = readFileSync(join(BENCH_RUNS_DIR, latest), 'utf-8');
      return JSON.parse(raw);
    }
  }

  // Si no hay datos, usar mock
  console.log('[judge] No se encontraron datos de bench, usando mock data (smoke test)');
  return MOCK_BENCH_DATA;
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

  const fromPath = process.argv.find((arg) => arg.startsWith('--from'))?.split('=')[1] || null;
  const benchData = loadBenchData(fromPath);

  console.log(`[judge] Datos cargados: ${benchData.results.length} items`);
  console.log(`[judge] Timestamp bench: ${benchData.timestamp}`);
  console.log(`[judge] Modelo evaluado: ${benchData.model || 'N/A'}`);

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

main().catch((err) => {
  console.error('[judge] FATAL:', err);
  process.exit(1);
});
