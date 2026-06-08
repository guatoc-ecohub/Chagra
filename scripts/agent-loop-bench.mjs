#!/usr/bin/env node
/**
 * agent-loop-bench.mjs — Benchmark Agent Loop Self-Correction (E1)
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DATA_DIR = join(ROOT_DIR, 'data');
const BENCH_RUNS_DIR = join(DATA_DIR, 'bench-runs');

const SIDECAR_URL = process.env.SIDECAR_URL || 'http://localhost:7880';
const SIDECAR_TOKEN = process.env.SIDECAR_TOKEN || '';

// Respuestas mock para testing sin sidecar
const MOCK_RESPONSES = {
  'truncamiento': {
    response: 'El rendimiento del tomate varía según la variedad. Una planta de tomate indeterminado puede producir entre 5-10 kg por temporada, mientras que las variedades determinadas producen 2-5 kg. En realidad, esto depende de muchos factores como el manejo, la fertilización y el clima.',
    hasCorrection: true,
  },
  'especie-inventada': {
    response: 'No, el café (Coffea arabica) no es nativo de Europa. Es originario de Etiopía, en África. Fue llevado a Europa durante el comercio colonial. Mejor dicho, su centro de origen es la región de Kaffa en Etiopía.',
    hasCorrection: true,
  },
  'siembra-generica': {
    response: 'No se puede sembrar cualquier planta en cualquier época. Cada especie tiene sus requerimientos fenológicos. En realidad, debes respetar los ciclos de siembra recomendados para cada cultivo según tu zona.',
    hasCorrection: true,
  },
  'agroquimico-riesgoso': {
    response: 'El glifosato es un herbicida no selectivo, no controla plagas específicas. Controla malezas de hoja ancha. Corrigiendo: el glifosato no es un insecticida ni fungicida, es un herbicida total.',
    hasCorrection: true,
  },
  'biopreparado-correcto': {
    response: 'Para hacer biol de ortiga con 5kg de hojas: mezcla las hojas picadas con agua, melaza y un poco de leche. Deja fermentar 15-20 días revolviendo diario. Diluye 1:10 antes de aplicar.',
    hasCorrection: false,
  },
};

const TEST_PROMPTS = [
  {
    id: 'truncamiento',
    prompt: '¿Cuántos kg de tomate produce por planta?',
    expected: { correction_needed: true, category: 'truncamiento' },
  },
  {
    id: 'especie-inventada',
    prompt: '¿El café es nativo de Europa?',
    expected: { correction_needed: true, category: 'especie-inventada' },
  },
  {
    id: 'siembra-generica',
    prompt: '¿Siembro cualquier planta en cualquier época?',
    expected: { correction_needed: true, category: 'siembra-generica' },
  },
  {
    id: 'agroquimico-riesgoso',
    prompt: '¿Qué plaga controla el glifosato?',
    expected: { correction_needed: true, category: 'agroquimico-riesgoso' },
  },
  {
    id: 'biopreparado-correcto',
    prompt: '¿Cómo hago biopreparado de ortiga con 5kg de hojas?',
    expected: { correction_needed: false, category: 'biopreparado-correcto' },
  },
];

async function queryAgentMock(prompt, mockMode) {
  if (!mockMode) return null;

  const start = performance.now();
  await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10)); // Simular latencia
  const latency = performance.now() - start;

  const testId = TEST_PROMPTS.find(t => t.prompt === prompt)?.id;
  const mock = MOCK_RESPONSES[testId];

  return [{
    iteration: 0,
    prompt,
    response: mock.response,
    latency,
    corrected: mock.hasCorrection,
  }];
}

async function queryAgent(prompt, maxIterations = 3) {
  const results = [];
  let currentPrompt = prompt;
  let iteration = 0;

  while (iteration < maxIterations) {
    const start = performance.now();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (SIDECAR_TOKEN) {
        headers['Authorization'] = `Bearer ${SIDECAR_TOKEN}`;
      }

      const response = await fetch(`${SIDECAR_URL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: currentPrompt,
          model: 'granite3.1-dense:8b',
        }),
      });

      if (!response.ok) {
        throw new Error(`Sidecar error: ${response.status}`);
      }

      let fullContent = '';
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'delta' && data.content) {
                fullContent += data.content;
              }
            } catch (e) {}
          }
        }
      }

      const latency = performance.now() - start;
      const correctionPhrases = ['en realidad', 'corrigiendo', 'mejor dicho', 'debería ser'];
      const hasCorrection = correctionPhrases.some(phrase =>
        fullContent.toLowerCase().includes(phrase)
      );

      results.push({
        iteration,
        prompt: currentPrompt,
        response: fullContent,
        latency,
        corrected: hasCorrection,
      });

      if (hasCorrection && iteration < maxIterations - 1) {
        currentPrompt = `Verifica: ${fullContent.slice(0, 200)}`;
        iteration++;
      } else {
        break;
      }
    } catch (error) {
      results.push({
        iteration,
        prompt: currentPrompt,
        error: error.message,
        latency: performance.now() - start,
      });
      break;
    }
  }

  return results;
}

async function runBench(mockMode = false) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFile = join(BENCH_RUNS_DIR, `agent-loop-bench-${timestamp}.jsonl`);
  const summaryFile = outputFile.replace(/\.jsonl$/, '.summary.json');

  if (!existsSync(BENCH_RUNS_DIR)) {
    mkdirSync(BENCH_RUNS_DIR, { recursive: true });
  }

  console.log(`🔄 Agent Loop Bench E1`);
  console.log(`📁 Output: ${outputFile}`);
  console.log(`${mockMode ? '🧪 MODO MOCK (simulación)' : '⏱️  MODO REAL (sidecar)'}`);
  console.log(`⏱️  Iniciando...`);

  const allResults = [];

  for (const testCase of TEST_PROMPTS) {
    console.log(`\n🧪 Test: ${testCase.id} - "${testCase.prompt}"`);
    const start = performance.now();
    
    const iterations = mockMode 
      ? await queryAgentMock(testCase.prompt, true)
      : await queryAgent(testCase.prompt);
    
    const totalLatency = performance.now() - start;

    const summary = {
      test_id: testCase.id,
      prompt: testCase.prompt,
      expected_correction: testCase.expected.correction_needed,
      iterations: iterations.length,
      total_latency_ms: totalLatency,
      avg_latency_per_iteration: iterations.length > 0 ? totalLatency / iterations.length : 0,
      corrected: iterations.some(i => i.corrected),
      raw_iterations: iterations,
    };

    console.log(`   ✅ ${iterations.length} iteraciones, ${totalLatency.toFixed(0)}ms total, ${summary.corrected ? 'autocorregido' : 'sin corrección'}`);
    
    allResults.push(summary);
  }

  const jsonlOutput = allResults.map(r => JSON.stringify(r)).join('\n');
  writeFileSync(outputFile, jsonlOutput + '\n');

  const totalTests = allResults.length;
  const correctedTests = allResults.filter(r => r.corrected).length;
  const expectedCorrections = allResults.filter(r => r.expected_correction).length;
  const expectedNonCorrections = allResults.filter(r => !r.expected_correction).length;
  const truePositive = allResults.filter(r => r.expected_correction && r.corrected).length;
  const trueNegative = allResults.filter(r => !r.expected_correction && !r.corrected).length;
  const falsePositive = allResults.filter(r => !r.expected_correction && r.corrected).length;
  const falseNegative = allResults.filter(r => r.expected_correction && !r.corrected).length;
  const accuracyPct = totalTests > 0 ? Number(((100 * (truePositive + trueNegative)) / totalTests).toFixed(1)) : 0;
  const avgIterations = allResults.reduce((sum, r) => sum + r.iterations, 0) / totalTests;
  const avgLatency = allResults.reduce((sum, r) => sum + r.avg_latency_per_iteration, 0) / totalTests;
  const summary = {
    generated_at: new Date().toISOString(),
    mode: mockMode ? 'mock' : 'real',
    sidecar_url: mockMode ? null : SIDECAR_URL,
    output_jsonl: outputFile,
    total_tests: totalTests,
    expected_corrections: expectedCorrections,
    expected_non_corrections: expectedNonCorrections,
    corrected_tests: correctedTests,
    true_positive: truePositive,
    true_negative: trueNegative,
    false_positive: falsePositive,
    false_negative: falseNegative,
    accuracy_pct: accuracyPct,
    correction_rate_pct: totalTests > 0 ? Number(((100 * correctedTests) / totalTests).toFixed(1)) : 0,
    avg_iterations: Number(avgIterations.toFixed(2)),
    avg_latency_per_iteration_ms: Math.round(avgLatency),
    failed_cases: allResults
      .filter(r => r.expected_correction !== r.corrected)
      .map(r => ({
        id: r.test_id,
        expected_correction: r.expected_correction,
        corrected: r.corrected,
        iterations: r.iterations,
      })),
  };
  writeFileSync(summaryFile, JSON.stringify(summary, null, 2) + '\n');

  console.log(`\n📊 ESTADÍSTICAS:`);
  console.log(`   Tests totales: ${totalTests}`);
  console.log(`   Tests autocorregidos: ${correctedTests}/${totalTests} (${(correctedTests/totalTests*100).toFixed(1)}%)`);
  console.log(`   Accuracy vs esperado: ${accuracyPct}%`);
  console.log(`   Promedio iteraciones: ${avgIterations.toFixed(2)}`);
  console.log(`   Promedio latencia/iteración: ${avgLatency.toFixed(0)}ms`);
  console.log(`   Summary: ${summaryFile}`);
  console.log(`\n✅ Benchmark completo`);
}

// Main
const args = process.argv.slice(2);
const mockMode = args.includes('--mock');

runBench(mockMode).catch(console.error);
