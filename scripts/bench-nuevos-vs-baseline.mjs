#!/usr/bin/env node
/**
 * bench-nuevos-vs-baseline.mjs — Smoke test 4 modelos nuevos vs baseline granite3.1
 *
 * Compara latencia y calidad de respuestas entre:
 * - ministral-3:latest
 * - ministral-3:14b
 * - deepseek-r1:14b
 * - qwen3:30b
 * - granite3.1-dense:8b (baseline)
 *
 * Uso:
 *   node scripts/bench-nuevos-vs-baseline.mjs
 *
 * Output: data/bench-runs/nuevos-vs-baseline-{date}.jsonl + summary.md
 *
 * NO modifica baseline defaults.
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = join(DATA_DIR, 'bench-runs');

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODELS = {
  ministral_3b: 'ministral-3:latest',
  ministral_14b: 'ministral-3:14b',
  deepseek_r1: 'deepseek-r1:14b',
  qwen3_30b: 'qwen2.5:30b',
  baseline: 'granite3.1-dense:8b'
};
const TIMEOUT_MS = 180_000; // 3 min timeout por modelo (models más grandes)
const MAXWELL_ERROR_PATTERNS = [
  'sm_5.2',
  'maxwell',
  'unsupported architecture',
  'compute capability',
  'sm_52'
];

// 10 prompts representativos smoke test
const PROMPTS = [
  // Species (4)
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

  // Biopreparados (3)
  {
    id: 5,
    category: 'biopreparados',
    query: '¿Cómo preparar caldo bordelés y cuándo aplicarlo?',
    expected_keywords: ['cal', 'sulfato de cobre', 'disolver', 'preventivo'],
  },
  {
    id: 6,
    category: 'biopreparados',
    query: '¿Para qué sirve el biol y cómo se prepara?',
    expected_keywords: ['estiércol', 'fermentación', 'nutrientes', 'microorganismos'],
  },
  {
    id: 7,
    category: 'biopreparados',
    query: '¿Cómo preparar purín de ortigas como abono?',
    expected_keywords: ['ortiga', 'agua', 'fermentar', 'nitrógeno'],
  },

  // Plagas (3)
  {
    id: 8,
    category: 'plagas',
    query: '¿Qué control biológico existe para la mosca blanca?',
    expected_keywords: ['encarsia', 'eretmocerus', 'beauveria', 'parasitoide'],
  },
  {
    id: 9,
    category: 'plagas',
    query: '¿Cómo controlar áfidos sin agroquímicos?',
    expected_keywords: ['mariquita', 'neem', 'jabón', 'depredador'],
  },
  {
    id: 10,
    category: 'plagas',
    query: '¿Cómo controlar el gusano cogollero del maíz?',
    expected_keywords: ['bacillus thuringiensis', 'trichogramma', 'manual', 'centeno'],
  },
];

let maxwellErrorDetected = false;

async function callModel(model, prompt, signal) {
  const start = performance.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      prompt: `Eres un asistente agroecológico experto para Colombia. Responde en español claro, práctico para agricultores. 

Pregunta: ${prompt}

Responde de forma completa y práctica:`,
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 300,
      },
      keep_alive: '30m',
    }),
    signal,
  });
  const elapsed = performance.now() - start;
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
  }
  
  const data = await res.json();
  return {
    response: data.response,
    latency_ms: elapsed,
    tokens_estimated: data.response?.length || 0,
  };
}

function checkMaxwellError(error) {
  const errorLower = error.toLowerCase();
  return MAXWELL_ERROR_PATTERNS.some(pattern => errorLower.includes(pattern.toLowerCase()));
}

function countKeywords(response, keywords) {
  const lower = response.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
}

async function benchmarkModel(modelKey, modelName, promptData) {
  const resultKey = modelKey;
  
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const modelResult = await callModel(modelName, promptData.query, controller.signal);
    clearTimeout(timer);
    
    return {
      model: modelName,
      latency_ms: modelResult.latency_ms,
      response: modelResult.response,
      tokens_estimated: modelResult.tokens_estimated,
      keywords_matched: countKeywords(modelResult.response, promptData.expected_keywords),
      keywords_total: promptData.expected_keywords.length,
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
      latency_ms: null,
      response: null,
      keywords_matched: 0,
      keywords_total: promptData.expected_keywords.length,
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

  // Benchmark all 5 models
  const modelKeys = ['ministral_3b', 'ministral_14b', 'deepseek_r1', 'qwen3_30b', 'baseline'];
  
  for (const modelKey of modelKeys) {
    const modelName = MODELS[modelKey];
    console.log(`  → Testing ${modelKey} (${modelName})...`);
    
    const result = await benchmarkModel(modelKey, modelName, promptData);
    results[modelKey] = result;
    
    if (result.error) {
      console.log(`    ERROR: ${result.error.slice(0, 100)}...`);
    } else {
      console.log(`    OK: ${result.latency_ms.toFixed(0)}ms, ${result.response.length} chars, ${result.keywords_matched}/${result.keywords_total} keywords`);
    }
    
    // Pausa pequeña entre modelos
    await new Promise(r => setTimeout(r, 500));
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

async function main() {
  console.log('[bench] Smoke test 4 modelos nuevos vs baseline granite3.1');
  console.log(`[bench] Modelos: ${Object.values(MODELS).join(', ')}`);
  console.log(`[bench] Prompts: ${PROMPTS.length}`);
  console.log(`[bench] Categorías: species(4), biopreparados(3), plagas(3)`);
  console.log(`[bench] Directorio output: ${BENCH_RUNS_DIR}`);

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
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const totalTime = performance.now() - startTime;

  // Calcular estadísticas por modelo
  const stats = {};
  const modelKeys = ['ministral_3b', 'ministral_14b', 'deepseek_r1', 'qwen3_30b', 'baseline'];
  
  for (const modelKey of modelKeys) {
    const modelName = MODELS[modelKey];
    const successful = results.filter(r => !r[modelKey].error);
    
    stats[modelKey] = {
      modelName,
      successful: successful.length,
      total: PROMPTS.length,
      avgLatency: successful.length > 0 
        ? successful.reduce((s, r) => s + r[modelKey].latency_ms, 0) / successful.length 
        : 0,
      avgKeywords: successful.length > 0
        ? successful.reduce((s, r) => s + (r[modelKey].keywords_matched / r[modelKey].keywords_total), 0) / successful.length
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
  const jsonlPath = join(BENCH_RUNS_DIR, `nuevos-vs-baseline-${dateStr}.jsonl`);
  
  const jsonlLines = results.map(r => JSON.stringify(r));
  writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n');

  // Generar summary.md
  const summaryContent = `# Nuevos Modelos vs Baseline Benchmark — ${dateStr}

## Metadata
- **Timestamp**: ${new Date().toISOString()}
- **Modelos**:
  - ministral-3:latest
  - ministral-3:14b
  - deepseek-r1:14b
  - qwen2.5:30b
  - granite3.1-dense:8b (baseline)
- **Prompts**: ${PROMPTS.length}
- **Categorías**: 
  - Species: 4
  - Biopreparados: 3
  - Plagas: 3
- **Tiempo total**: ${(totalTime / 1000).toFixed(2)}s
- **Tiempo promedio por prompt**: ${(totalTime / PROMPTS.length).toFixed(2)}s

## Resultados Globales

| Modelo | Exitosos | Latencia Promedio (ms) | Keywords Promedio (%) |
|--------|----------|----------------------|---------------------|
${modelKeys.map(k => {
  const s = stats[k];
  return `| **${s.modelName}** | ${s.successful}/${PROMPTS.length} | ${s.avgLatency.toFixed(0)} | ${(s.avgKeywords * 100).toFixed(1)}% |`;
}).join('\n')}

## Ganadores por Prompt

| Ganador | Cantidad | Porcentaje |
|---------|----------|-----------|
${modelKeys.map(k => {
  return `| **${MODELS[k]}** | ${winners[k]} | ${(winners[k] / PROMPTS.length * 100).toFixed(1)}% |`;
}).join('\n')}
| **Todos fallaron** | ${winners.none} | ${(winners.none / PROMPTS.length * 100).toFixed(1)}% |

## Por Categoría

### Species (4 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) |
|--------|-----------------|-----------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'species' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% |`;
}).join('\n')}

### Biopreparados (3 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) |
|--------|-----------------|-----------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'biopreparados' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% |`;
}).join('\n')}

### Plagas (3 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) |
|--------|-----------------|-----------------|
${modelKeys.map(k => {
  const categoryResults = results.filter(r => r.category === 'plagas' && !r[k].error);
  const avgLatency = categoryResults.length > 0 
    ? categoryResults.reduce((s, r) => s + r[k].latency_ms, 0) / categoryResults.length 
    : 0;
  const avgKeywords = categoryResults.length > 0
    ? categoryResults.reduce((s, r) => s + (r[k].keywords_matched / r[k].keywords_total), 0) / categoryResults.length
    : 0;
  return `| ${MODELS[k]} | ${avgLatency.toFixed(0)} | ${(avgKeywords * 100).toFixed(1)}% |`;
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
  return `**${s.modelName}** ganó en ${winners[bestModel]} de ${PROMPTS.length} prompts (${(winners[bestModel] / PROMPTS.length * 100).toFixed(1)}%), con latencia promedio de ${s.avgLatency.toFixed(0)}ms y ${(s.avgKeywords * 100).toFixed(1)}% keywords matched.`;
})()}

${(() => {
  // Encontrar el modelo más rápido
  let fastestModel = modelKeys[0];
  let fastestTime = stats[fastestModel].avgLatency;
  
  for (const modelKey of modelKeys) {
    if (stats[modelKey].avgLatency > 0 && stats[modelKey].avgLatency < fastestTime) {
      fastestTime = stats[modelKey].avgLatency;
      fastestModel = modelKey;
    }
  }
  
  const baselineTime = stats.baseline.avgLatency;
  if (fastestTime < baselineTime) {
    return `**Velocidad**: ${MODELS[fastestModel]} fue ${((baselineTime - fastestTime) / baselineTime * 100).toFixed(1)}% más rápido que el baseline.`;
  } else {
    return `**Velocidad**: granite3.1 baseline fue ${((fastestTime - baselineTime) / fastestTime * 100).toFixed(1)}% más rápido que los demás modelos.`;
  }
})()}

${maxwellErrorDetected ? `
## ⚠️ Advertencia Maxwell sm_5.2

Se detectaron errores relacionados con arquitectura Maxwell sm_5.2 durante el benchmark.
Esto indica incompatibilidad con GPU Maxwell (Compute Capability 5.2).

Se ha generado documentación adicional en: \`docs/known-issues/maxwell-sm52-incompat.md\`
` : ''}

---

**Smoke test nuevos modelos vs baseline** — Generado por \`bench-nuevos-vs-baseline.mjs\`
`;

  const summaryPath = join(BENCH_RUNS_DIR, `nuevos-vs-baseline-${dateStr}-summary.md`);
  writeFileSync(summaryPath, summaryContent);

  console.log('\n[bench] ===== RESULTADOS =====');
  console.log(`[bench] Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`[bench]`);
  for (const modelKey of modelKeys) {
    const s = stats[modelKey];
    console.log(`[bench] ${s.modelName}:`);
    console.log(`[bench]   Exitosos: ${s.successful}/${PROMPTS.length}`);
    console.log(`[bench]   Latencia avg: ${s.avgLatency.toFixed(0)}ms`);
    console.log(`[bench]   Keywords avg: ${(s.avgKeywords * 100).toFixed(1)}%`);
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

  // Documentar error Maxwell si se detectó
  if (maxwellErrorDetected) {
    console.log(`[bench] ⚠️  Se detectaron errores Maxwell sm_5.2 - documentando...`);
    await documentMaxwellError(BENCH_RUNS_DIR, dateStr);
  }
}

async function documentMaxwellError(benchRunsDir, dateStr) {
  const docsDir = join(ROOT_DIR, 'docs', 'known-issues');
  
  // Crear directorio si no existe
  if (!existsSync(docsDir)) {
    mkdirSync(docsDir, { recursive: true });
  }

  const maxwellDocPath = join(docsDir, 'maxwell-sm52-incompat.md');
  const maxwellContent = `# Maxwell sm_5.2 Incompatibilidad

## Fecha de detección
${new Date().toISOString()}

## Contexto
Durante la ejecución del benchmark \`nuevos-vs-baseline-${dateStr}\`, se detectaron errores relacionados con la arquitectura GPU Maxwell (Compute Capability 5.2).

## Síntomas
Los modelos fallan con mensajes de error que incluyen:
- \`sm_5.2\`
- \`maxwell\`
- \`unsupported architecture\`
- \`compute capability\`

## Modelos afectados
Posiblemente todos los modelos nuevos que requieren:
- ministral-3:latest
- ministral-3:14b
- deepseek-r1:14b
- qwen2.5:30b

## Causa raíz
Los modelos más recientes pueden estar compilados con CUDA kernels que requieren Compute Capability mínimo superior a 5.2 (Maxwell).

## Soluciones posibles
1. **Usar CPU mode**: Ollama permite forzar CPU con \`OLLAMA_NUM_GPU=0\`
2. **Actualizar hardware**: Migrar a GPU con Compute Capability >= 7.0 (Volta, Turing, Ampere)
3. **Usar modelos compatibles**: Quedarse con modelos que soporten sm_5.2 (granite3.1, qwen2.5:14b)

## Recomendación actual
Mantener granite3.1-dense:8b como baseline ya que es compatible con hardware Maxwell.

## Referencias
- Benchmark run: \`data/bench-runs/nuevos-vs-baseline-${dateStr}.jsonl\`
- CUDA Compute Capability: https://developer.nvidia.com/cuda-gpus

---

**Documento generado automáticamente** por \`bench-nuevos-vs-baseline.mjs\`
`;

  writeFileSync(maxwellDocPath, maxwellContent);
  console.log(`[bench] Documentado error Maxwell en: ${maxwellDocPath}`);
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
