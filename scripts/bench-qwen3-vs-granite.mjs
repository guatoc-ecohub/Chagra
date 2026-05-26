#!/usr/bin/env node
/**
 * bench-qwen3-vs-granite.mjs — Smoke test comparativo qwen3:14b vs granite3.1-dense:8b
 *
 * Compara latencia y calidad de respuestas entre dos modelos LLM sobre
 * prompts representativos de species, biopreparados y plagas.
 *
 * Uso:
 *   node scripts/bench-qwen3-vs-granite.mjs
 *
 * Output: data/bench-runs/qwen3-vs-granite-{date}.jsonl + summary.md
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
  qwen3: 'qwen2.5:14b',
  granite: 'granite3.1-dense:8b'
};
const TIMEOUT_MS = 120_000; // 2 min timeout por modelo

// 20 prompts representativos (mix species/biopreparados/plagas)
const PROMPTS = [
  // Species (8)
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
    query: '¿Qué poda y fertilización necesita el aguacate en clima cálido?',
    expected_keywords: ['poda de formación', 'zinc', 'boro', 'raíz'],
  },
  {
    id: 6,
    category: 'species',
    query: '¿Cómo manejar la sigatoka en banano?',
    expected_keywords: ['sombra', 'drenaje', 'variedades resistentes', 'des hoje'],
  },
  {
    id: 7,
    category: 'species',
    query: '¿Cuándo cosechar el plátano hartón?',
    expected_keywords: ['calibre', 'dedos', 'madurez', 'color'],
  },
  {
    id: 8,
    category: 'species',
    query: '¿Qué control biológico funciona contra la mosca blanca en tomate?',
    expected_keywords: ['encarsia', 'eretmocerus', 'avispa', 'parasitoide'],
  },

  // Biopreparados (6)
  {
    id: 9,
    category: 'biopreparados',
    query: '¿Cómo preparar caldo bordelés y cuándo aplicarlo?',
    expected_keywords: ['cal', 'sulfato de cobre', 'disolver', 'preventivo'],
  },
  {
    id: 10,
    category: 'biopreparados',
    query: '¿Para qué sirve el biol y cómo se prepara?',
    expected_keywords: ['estiércol', 'fermentación', 'nutrientes', 'microorganismos'],
  },
  {
    id: 11,
    category: 'biopreparados',
    query: '¿Cómo preparar purín de ortigas como abono?',
    expected_keywords: ['ortiga', 'agua', 'fermentar', 'nitrógeno'],
  },
  {
    id: 12,
    category: 'biopreparados',
    query: '¿Cómo hacer extracto de ajo para insecticida?',
    expected_keywords: ['ajo', 'agua', 'jabón', 'pulverizar'],
  },
  {
    id: 13,
    category: 'biopreparados',
    query: '¿Cómo preparar jabón potásico contra áfidos?',
    expected_keywords: ['jabón', 'alcohol', 'agua', 'directo'],
  },
  {
    id: 14,
    category: 'biopreparados',
    query: '¿Cómo preparar un trapiche de compost con lombrices?',
    expected_keywords: ['lombriz roja', 'deshielo', 'humus', 'material orgánico'],
  },

  // Plagas (6)
  {
    id: 15,
    category: 'plagas',
    query: '¿Qué control biológico existe para la mosca blanca?',
    expected_keywords: ['encarsia', 'eretmocerus', 'beauveria', 'parsitoide'],
  },
  {
    id: 16,
    category: 'plagas',
    query: '¿Cómo controlar áfidos sin agroquímicos?',
    expected_keywords: ['mariquita', 'neem', 'jabón', 'depredador'],
  },
  {
    id: 17,
    category: 'plagas',
    query: '¿Cómo manejar la roya del café orgánicamente?',
    expected_keywords: ['resistentes', 'poda', 'sombra', 'fungicida orgánico'],
  },
  {
    id: 18,
    category: 'plagas',
    query: '¿Qué tratamiento hay para la sigatoka negra del banano?',
    expected_keywords: ['des hoje', 'drenaje', 'variedades resistentes', 'fungicida'],
  },
  {
    id: 19,
    category: 'plagas',
    query: '¿Cómo controlar el gusano cogollero del maíz?',
    expected_keywords: ['bacillus thuringiensis', 'trichogramma', 'manual', 'centeno'],
  },
  {
    id: 20,
    category: 'plagas',
    query: '¿Cómo identificar y manejar el pulgón del tomate?',
    expected_keywords: ['colonias', 'moscas', 'transmisión', 'aceite'],
  },
];

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
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  
  const data = await res.json();
  return {
    response: data.response,
    latency_ms: elapsed,
    tokens_estimated: data.response?.length || 0,
  };
}

function countKeywords(response, keywords) {
  const lower = response.toLowerCase();
  return keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
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

  // Benchmark qwen3:14b
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const qwenStart = performance.now();
    const qwenResult = await callModel(MODELS.qwen3, promptData.query, controller.signal);
    clearTimeout(timer);
    
    results.qwen3 = {
      model: MODELS.qwen3,
      latency_ms: qwenResult.latency_ms,
      response: qwenResult.response,
      tokens_estimated: qwenResult.tokens_estimated,
      keywords_matched: countKeywords(qwenResult.response, promptData.expected_keywords),
      keywords_total: promptData.expected_keywords.length,
      error: null,
    };
    
    console.log(`  → qwen3:14b: ${qwenResult.latency_ms.toFixed(0)}ms, ${qwenResult.response.length} chars, ${results.qwen3.keywords_matched}/${promptData.expected_keywords.length} keywords`);
  } catch (err) {
    results.qwen3 = {
      model: MODELS.qwen3,
      error: err.message,
      latency_ms: null,
      response: null,
      keywords_matched: 0,
      keywords_total: promptData.expected_keywords.length,
    };
    console.log(`  → qwen3:14b: ERROR - ${err.message}`);
  }

  // Pausa pequeña entre modelos
  await new Promise(r => setTimeout(r, 1000));

  // Benchmark granite3.1-dense:8b
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    const graniteStart = performance.now();
    const graniteResult = await callModel(MODELS.granite, promptData.query, controller.signal);
    clearTimeout(timer);
    
    results.granite = {
      model: MODELS.granite,
      latency_ms: graniteResult.latency_ms,
      response: graniteResult.response,
      tokens_estimated: graniteResult.tokens_estimated,
      keywords_matched: countKeywords(graniteResult.response, promptData.expected_keywords),
      keywords_total: promptData.expected_keywords.length,
      error: null,
    };
    
    console.log(`  → granite:8b: ${graniteResult.latency_ms.toFixed(0)}ms, ${graniteResult.response.length} chars, ${results.granite.keywords_matched}/${promptData.expected_keywords.length} keywords`);
  } catch (err) {
    results.granite = {
      model: MODELS.granite,
      error: err.message,
      latency_ms: null,
      response: null,
      keywords_matched: 0,
      keywords_total: promptData.expected_keywords.length,
    };
    console.log(`  → granite:8b: ERROR - ${err.message}`);
  }

  // Determinar ganador
  if (!results.qwen3.error && !results.granite.error) {
    const qwenScore = results.qwen3.keywords_matched / results.qwen3.keywords_total;
    const graniteScore = results.granite.keywords_matched / results.granite.keywords_total;
    
    if (qwenScore > graniteScore) {
      results.winner = 'qwen3';
      results.reason = `qwen3 matched ${results.qwen3.keywords_matched}/${results.qwen3.keywords_total} vs granite ${results.granite.keywords_matched}/${results.granite.keywords_total}`;
    } else if (graniteScore > qwenScore) {
      results.winner = 'granite';
      results.reason = `granite matched ${results.granite.keywords_matched}/${results.granite.keywords_total} vs qwen3 ${results.qwen3.keywords_matched}/${results.qwen3.keywords_total}`;
    } else {
      results.winner = 'tie';
      results.reason = `Ambos matched ${results.qwen3.keywords_matched}/${results.qwen3.keywords_total}`;
    }
  } else if (!results.qwen3.error) {
    results.winner = 'qwen3';
    results.reason = 'granite falló';
  } else if (!results.granite.error) {
    results.winner = 'granite';
    results.reason = 'qwen3 falló';
  } else {
    results.winner = 'none';
    results.reason = 'Ambos fallaron';
  }

  return results;
}

async function main() {
  console.log('[bench] Smoke test qwen3:14b vs granite3.1-dense:8b');
  console.log(`[bench] Prompts: ${PROMPTS.length}`);
  console.log(`[bench] Categorías: species(8), biopreparados(6), plagas(6)`);
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

  // Calcular estadísticas
  const qwen3Successful = results.filter(r => !r.qwen3.error);
  const graniteSuccessful = results.filter(r => !r.granite.error);
  
  const qwen3AvgLatency = qwen3Successful.length > 0 
    ? qwen3Successful.reduce((s, r) => s + r.qwen3.latency_ms, 0) / qwen3Successful.length 
    : 0;
    
  const graniteAvgLatency = graniteSuccessful.length > 0 
    ? graniteSuccessful.reduce((s, r) => s + r.granite.latency_ms, 0) / graniteSuccessful.length 
    : 0;

  const qwen3AvgKeywords = qwen3Successful.length > 0
    ? qwen3Successful.reduce((s, r) => s + (r.qwen3.keywords_matched / r.qwen3.keywords_total), 0) / qwen3Successful.length
    : 0;

  const graniteAvgKeywords = graniteSuccessful.length > 0
    ? graniteSuccessful.reduce((s, r) => s + (r.granite.keywords_matched / r.granite.keywords_total), 0) / graniteSuccessful.length
    : 0;

  const winners = {
    qwen3: results.filter(r => r.winner === 'qwen3').length,
    granite: results.filter(r => r.winner === 'granite').length,
    tie: results.filter(r => r.winner === 'tie').length,
    none: results.filter(r => r.winner === 'none').length,
  };

  // Guardar JSONL
  const dateStr = new Date().toISOString().split('T')[0];
  const jsonlPath = join(BENCH_RUNS_DIR, `qwen3-vs-granite-${dateStr}.jsonl`);
  
  const jsonlLines = results.map(r => JSON.stringify(r));
  writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n');

  // Generar summary.md
  const summaryContent = `# Qwen3 vs Granite Benchmark — ${dateStr}

## Metadata
- **Timestamp**: ${new Date().toISOString()}
- **Modelos**: qwen2.5:14b vs granite3.1-dense:8b
- **Prompts**: ${PROMPTS.length}
- **Categorías**: 
  - Species: 8
  - Biopreparados: 6
  - Plagas: 6
- **Tiempo total**: ${(totalTime / 1000).toFixed(2)}s
- **Tiempo promedio por prompt**: ${(totalTime / PROMPTS.length).toFixed(2)}s

## Resultados Globales

| Modelo | Exitosos | Latencia Promedio (ms) | Keywords Promedio (%) |
|--------|----------|----------------------|---------------------|
| **qwen3:14b** | ${qwen3Successful.length}/${PROMPTS.length} | ${qwen3AvgLatency.toFixed(0)} | ${(qwen3AvgKeywords * 100).toFixed(1)}% |
| **granite:8b** | ${graniteSuccessful.length}/${PROMPTS.length} | ${graniteAvgLatency.toFixed(0)} | ${(graniteAvgKeywords * 100).toFixed(1)}% |

## Ganadores por Prompt

| Ganador | Cantidad | Porcentaje |
|---------|----------|-----------|
| **qwen3:14b** | ${winners.qwen3} | ${(winners.qwen3 / PROMPTS.length * 100).toFixed(1)}% |
| **granite:8b** | ${winners.granite} | ${(winners.granite / PROMPTS.length * 100).toFixed(1)}% |
| **Empate** | ${winners.tie} | ${(winners.tie / PROMPTS.length * 100).toFixed(1)}% |
| **Ambos fallaron** | ${winners.none} | ${(winners.none / PROMPTS.length * 100).toFixed(1)}% |

## Por Categoría

### Species (8 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) |
|--------|-----------------|-----------------|
| qwen3:14b | ${(results.filter(r => r.category === 'species' && !r.qwen3.error).reduce((s, r) => s + r.qwen3.latency_ms, 0) / results.filter(r => r.category === 'species' && !r.qwen3.error).length || 0).toFixed(0)} | ${(results.filter(r => r.category === 'species' && !r.qwen3.error).reduce((s, r) => s + (r.qwen3.keywords_matched / r.qwen3.keywords_total), 0) / results.filter(r => r.category === 'species' && !r.qwen3.error).length * 100 || 0).toFixed(1)}% |
| granite:8b | ${(results.filter(r => r.category === 'species' && !r.granite.error).reduce((s, r) => s + r.granite.latency_ms, 0) / results.filter(r => r.category === 'species' && !r.granite.error).length || 0).toFixed(0)} | ${(results.filter(r => r.category === 'species' && !r.granite.error).reduce((s, r) => s + (r.granite.keywords_matched / r.granite.keywords_total), 0) / results.filter(r => r.category === 'species' && !r.granite.error).length * 100 || 0).toFixed(1)}% |

### Biopreparados (6 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) |
|--------|-----------------|-----------------|
| qwen3:14b | ${(results.filter(r => r.category === 'biopreparados' && !r.qwen3.error).reduce((s, r) => s + r.qwen3.latency_ms, 0) / results.filter(r => r.category === 'biopreparados' && !r.qwen3.error).length || 0).toFixed(0)} | ${(results.filter(r => r.category === 'biopreparados' && !r.qwen3.error).reduce((s, r) => s + (r.qwen3.keywords_matched / r.qwen3.keywords_total), 0) / results.filter(r => r.category === 'biopreparados' && !r.qwen3.error).length * 100 || 0).toFixed(1)}% |
| granite:8b | ${(results.filter(r => r.category === 'biopreparados' && !r.granite.error).reduce((s, r) => s + r.granite.latency_ms, 0) / results.filter(r => r.category === 'biopreparados' && !r.granite.error).length || 0).toFixed(0)} | ${(results.filter(r => r.category === 'biopreparados' && !r.granite.error).reduce((s, r) => s + (r.granite.keywords_matched / r.granite.keywords_total), 0) / results.filter(r => r.category === 'biopreparados' && !r.granite.error).length * 100 || 0).toFixed(1)}% |

### Plagas (6 prompts)
| Modelo | Avg Latency (ms) | Avg Keywords (%) |
|--------|-----------------|-----------------|
| qwen3:14b | ${(results.filter(r => r.category === 'plagas' && !r.qwen3.error).reduce((s, r) => s + r.qwen3.latency_ms, 0) / results.filter(r => r.category === 'plagas' && !r.qwen3.error).length || 0).toFixed(0)} | ${(results.filter(r => r.category === 'plagas' && !r.qwen3.error).reduce((s, r) => s + (r.qwen3.keywords_matched / r.qwen3.keywords_total), 0) / results.filter(r => r.category === 'plagas' && !r.qwen3.error).length * 100 || 0).toFixed(1)}% |
| granite:8b | ${(results.filter(r => r.category === 'plagas' && !r.granite.error).reduce((s, r) => s + r.granite.latency_ms, 0) / results.filter(r => r.category === 'plagas' && !r.granite.error).length || 0).toFixed(0)} | ${(results.filter(r => r.category === 'plagas' && !r.granite.error).reduce((s, r) => s + (r.granite.keywords_matched / r.granite.keywords_total), 0) / results.filter(r => r.category === 'plagas' && !r.granite.error).length * 100 || 0).toFixed(1)}% |

## Conclusión

${winners.qwen3 > winners.granite 
  ? `**qwen3:14b** ganó en ${winners.qwen3} de ${PROMPTS.length} prompts (${(winners.qwen3 / PROMPTS.length * 100).toFixed(1)}%), con latencia promedio de ${qwen3AvgLatency.toFixed(0)}ms y ${(qwen3AvgKeywords * 100).toFixed(1)}% keywords matched.`
  : winners.granite > winners.qwen3
  ? `**granite:8b** ganó en ${winners.granite} de ${PROMPTS.length} prompts (${(winners.granite / PROMPTS.length * 100).toFixed(1)}%), con latencia promedio de ${graniteAvgLatency.toFixed(0)}ms y ${(graniteAvgKeywords * 100).toFixed(1)}% keywords matched.`
  : 'Resultado prácticamente empatado entre ambos modelos.'}

${qwen3AvgLatency < graniteAvgLatency 
  ? `**Velocidad**: qwen3:14b fue ${((graniteAvgLatency - qwen3AvgLatency) / graniteAvgLatency * 100).toFixed(1)}% más rápido.`
  : `**Velocidad**: granite:8b fue ${((qwen3AvgLatency - graniteAvgLatency) / qwen3AvgLatency * 100).toFixed(1)}% más rápido.`}

---

**Smoke test qwen3 vs granite** — Generado por \`bench-qwen3-vs-granite.mjs\`
`;

  const summaryPath = join(BENCH_RUNS_DIR, `qwen3-vs-granite-${dateStr}-summary.md`);
  writeFileSync(summaryPath, summaryContent);

  console.log('\n[bench] ===== RESULTADOS =====');
  console.log(`[bench] Tiempo total: ${(totalTime / 1000).toFixed(2)}s`);
  console.log(`[bench]`);
  console.log(`[bench] qwen3:14b:`);
  console.log(`[bench]   Exitosos: ${qwen3Successful.length}/${PROMPTS.length}`);
  console.log(`[bench]   Latencia avg: ${qwen3AvgLatency.toFixed(0)}ms`);
  console.log(`[bench]   Keywords avg: ${(qwen3AvgKeywords * 100).toFixed(1)}%`);
  console.log(`[bench]`);
  console.log(`[bench] granite:8b:`);
  console.log(`[bench]   Exitosos: ${graniteSuccessful.length}/${PROMPTS.length}`);
  console.log(`[bench]   Latencia avg: ${graniteAvgLatency.toFixed(0)}ms`);
  console.log(`[bench]   Keywords avg: ${(graniteAvgKeywords * 100).toFixed(1)}%`);
  console.log(`[bench]`);
  console.log(`[bench] Ganadores:`);
  console.log(`[bench]   qwen3:14b: ${winners.qwen3} (${(winners.qwen3 / PROMPTS.length * 100).toFixed(1)}%)`);
  console.log(`[bench]   granite:8b: ${winners.granite} (${(winners.granite / PROMPTS.length * 100).toFixed(1)}%)`);
  console.log(`[bench]   Empates: ${winners.tie} (${(winners.tie / PROMPTS.length * 100).toFixed(1)}%)`);
  console.log(`[bench]`);
  console.log(`[bench] Output:`);
  console.log(`[bench]   JSONL: ${jsonlPath}`);
  console.log(`[bench]   Summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
