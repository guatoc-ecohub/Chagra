#!/usr/bin/env node
// run-bench-prompts.mjs
// ---------------------
// Corre los 20 prompts benchmark de
// Chagra-strategy/benchmarks/prompts-grafos-2026-05-20.md contra el endpoint
// chat agroecológico actual (BM25 + ollama gemma3:4b) y emite JSON con
// latency + respuesta para review manual + scoring vs ground truth.
//
// Uso:
//   node scripts/run-bench-prompts.mjs           # corre los 20, output JSON
//   node scripts/run-bench-prompts.mjs --quick   # solo los 6 multi-hop simples
//
// Pre-requisitos:
//   - ollama corriendo en localhost:11434 con gemma3:4b cargado (warm)
//   - este script lee los prompts del archivo benchmark — no se hardcodean
//
// Output: /tmp/bench-prompts-YYYY-MM-DD-HHMMSS.json
//
// Para correr el bench con un sistema alternativo (Apache AGE futuro):
//   cambiar OLLAMA_URL + SYSTEM_PROMPT, mantener el resto.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PROMPTS_FILE = '/home/kortux/Workspace/Chagra-strategy/benchmarks/prompts-grafos-2026-05-20.md';
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'gemma3:4b';
const TIMEOUT_MS = 60_000;
const QUICK_MODE = process.argv.includes('--quick');

// System prompt mínimo para el bench — emula el chat agroecológico básico.
// NO incluye RAG (el bench prueba la baseline del LLM solo sobre el corpus
// inyectado en el prompt manualmente). Esto da floor: si el LLM no responde
// bien con contexto generoso, no va a responder bien con RAG escaso.
const SYSTEM_PROMPT = `Eres un asistente agroecológico para chagras colombianas. Tu conocimiento incluye 488 species curadas con fichas referenciadas a Agrosavia, Humboldt, UNAL, Bernal 2015, Pérez-Arbeláez 1947.

Reglas:
- Responde basado únicamente en información agroecológica verificable.
- Si no tienes información específica sobre una especie, dilo explícitamente — NO inventes nombres, propiedades ni biopreparados.
- Cuando recomiendes compañeros simbióticos, biopreparados o incompatibilidades, basate en literatura agroecológica colombiana documentada.
- Respuestas concisas: 2-4 oraciones máximo.
- Usa nombres científicos correctos. Para Annona muricata es "guanábana", NO "higuera jabón".`;

function extractPromptsFromMarkdown(content) {
  // Los prompts están en tablas markdown bajo "### Cat. X — ..." sections.
  // Cada fila tiene formato:
  //   | N | "Query..." | Capacidad evaluada | Cómo verificar |
  // Capturamos el N y la query (segunda columna).
  const lines = content.split('\n');
  const prompts = [];
  let currentCategory = null;

  for (const line of lines) {
    // Detectar categoría
    const catMatch = line.match(/^##\s+Categor[ií]a\s+(\d+)\s+[—-]\s+(.+?)$/);
    if (catMatch) {
      currentCategory = { num: parseInt(catMatch[1]), name: catMatch[2].trim() };
      continue;
    }
    // Detectar fila de tabla con prompt: | N | "..." | ... | ... |
    const rowMatch = line.match(/^\|\s*(\d+)\s*\|\s*"(.+?)"\s*\|\s*(.+?)\s*\|/);
    if (rowMatch) {
      prompts.push({
        id: parseInt(rowMatch[1]),
        category: currentCategory ? currentCategory.num : null,
        category_name: currentCategory ? currentCategory.name : null,
        query: rowMatch[2],
        capability: rowMatch[3].trim(),
      });
    }
  }

  return prompts;
}

async function callOllama(query, signal) {
  const start = performance.now();
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      system: SYSTEM_PROMPT,
      prompt: query,
      stream: false,
      options: {
        temperature: 0.3,
        num_predict: 300,
      },
      keep_alive: '30m',
    }),
    signal,
  });
  const elapsed = performance.now() - start;
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, latency_ms: elapsed };
  }
  const data = await res.json();
  return {
    response: data.response,
    latency_ms: elapsed,
    eval_count: data.eval_count,
    eval_duration_ms: data.eval_duration ? data.eval_duration / 1e6 : null,
    prompt_eval_count: data.prompt_eval_count,
  };
}

async function main() {
  console.log(`[bench] Reading prompts from ${PROMPTS_FILE}`);
  const content = readFileSync(PROMPTS_FILE, 'utf8');
  const prompts = extractPromptsFromMarkdown(content);

  let selected = prompts;
  if (QUICK_MODE) {
    selected = prompts.filter((p) => p.category === 2);
    console.log(`[bench] --quick mode: ${selected.length} prompts (Categoría 2 multi-hop simple)`);
  } else {
    console.log(`[bench] Full mode: ${selected.length} prompts`);
  }

  if (selected.length === 0) {
    console.error('[bench] ERROR: 0 prompts extraídos. Verificá formato markdown del archivo benchmark.');
    process.exit(1);
  }

  const results = [];
  for (const p of selected) {
    console.log(`[bench] Running prompt #${p.id} (cat ${p.category}): ${p.query.slice(0, 70)}...`);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const result = await callOllama(p.query, controller.signal);
      results.push({ ...p, ...result });
      console.log(`  → ${result.latency_ms.toFixed(0)}ms · ${(result.response || '').slice(0, 80).replace(/\n/g, ' ')}...`);
    } catch (err) {
      console.error(`  → ERROR: ${err.message}`);
      results.push({ ...p, error: err.message });
    } finally {
      clearTimeout(timer);
    }
    // Pausa corta para no saturar ollama
    await new Promise((r) => setTimeout(r, 500));
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = `/tmp/bench-prompts-${stamp}.json`;
  const summary = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    total: results.length,
    successful: results.filter((r) => !r.error).length,
    failed: results.filter((r) => r.error).length,
    avg_latency_ms: results
      .filter((r) => !r.error)
      .reduce((sum, r) => sum + r.latency_ms, 0) / results.filter((r) => !r.error).length,
    by_category: {},
  };
  for (const cat of [1, 2, 3, 4, 5, 6]) {
    const catResults = results.filter((r) => r.category === cat && !r.error);
    if (catResults.length > 0) {
      summary.by_category[`cat${cat}`] = {
        count: catResults.length,
        avg_latency_ms:
          catResults.reduce((sum, r) => sum + r.latency_ms, 0) / catResults.length,
      };
    }
  }

  writeFileSync(outFile, JSON.stringify({ summary, results }, null, 2));
  console.log(`\n[bench] Done. Results: ${outFile}`);
  console.log(`[bench] Summary:`);
  console.log(`  Total: ${summary.total}`);
  console.log(`  Successful: ${summary.successful}`);
  console.log(`  Failed: ${summary.failed}`);
  console.log(`  Avg latency: ${summary.avg_latency_ms?.toFixed(0)}ms`);
  console.log(`  Por categoría:`);
  for (const [k, v] of Object.entries(summary.by_category)) {
    console.log(`    ${k}: ${v.count} prompts · ${v.avg_latency_ms.toFixed(0)}ms avg`);
  }
  console.log(`\n[bench] Próximo paso: revisar respuestas en ${outFile} y scoring manual vs ground truth.`);
}

main().catch((err) => {
  console.error('[bench] FATAL:', err);
  process.exit(1);
});
