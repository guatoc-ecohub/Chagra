#!/usr/bin/env node
/**
 * bench-embedders.mjs — Bench de embedders para el RAG de Chagra.
 *
 * Compara nomic-embed-text (PROD baseline), bge-m3, snowflake-arctic-embed2
 * y granite-embedding:278m en términos de recall@1/@3/@5, MRR y latencia
 * sobre el corpus real de cycle-content/ y el golden set eval/rag-golden.json.
 *
 * STANDALONE: se conecta directo a ollama (POST http://localhost:11434/api/embeddings)
 * sin depender de ragRetriever.js ni import.meta.env.
 *
 * Cómo armar el gold:
 *   - Se usa eval/rag-golden.json (50 pares query→slug-esperado).
 *   - Las queries con expected="biopreparado", "associacion", "mito_lunar",
 *     "suelo_acido", "agua_calidad", "erosion" no tienen slug en el corpus
 *     (son conceptos cross-species) → se marcan skip_no_slug y se excluyen
 *     del cálculo; se reporta cuántas se saltaron.
 *   - Para el resto, el gold es: chunk con slug == expected debe aparecer
 *     en top-K de cosine similarity.
 *
 * Uso:
 *   node scripts/bench-embedders.mjs
 *   OLLAMA_URL=http://localhost:11434 node scripts/bench-embedders.mjs
 *
 * Salida:
 *   - Tabla en stdout
 *   - data/bench-runs/embedders-2026-06-23.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const CORPUS_DIR = resolve(ROOT, 'public', 'cycle-content');
const MANIFEST_PATH = resolve(CORPUS_DIR, 'manifest.json');
const GOLDEN_PATH = resolve(ROOT, 'eval', 'rag-golden.json');
const OUTPUT_PATH = resolve(ROOT, 'data', 'bench-runs', 'embedders-2026-06-23.json');

// Todos los modelos a comparar: [id, nombre display]
const MODELS = [
  ['nomic-embed-text', 'nomic-embed-text (PROD baseline)'],
  ['bge-m3', 'bge-m3 (multilingüe)'],
  ['snowflake-arctic-embed2', 'snowflake-arctic-embed2 (multilingüe)'],
  ['granite-embedding:278m', 'granite-embedding:278m (IBM multilingüe)'],
];

// Slugs con expected no mapeables al corpus (conceptos cross-species)
const NON_SLUG_EXPECTED = new Set([
  'biopreparado', 'associacion', 'mito_lunar', 'suelo_acido',
  'agua_calidad', 'erosion',
]);

// ---------- helpers ----------

function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function embed(model, text) {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`ollama ${res.status}: ${msg}`);
  }
  const data = await res.json();
  if (!Array.isArray(data.embedding) || data.embedding.length === 0) {
    throw new Error('Embedding vacío');
  }
  return data.embedding;
}

function extractText(doc) {
  const parts = [];
  if (doc.valor_pedagogico) parts.push(doc.valor_pedagogico);
  if (Array.isArray(doc.milestones)) {
    doc.milestones.forEach(m => {
      if (m.label) parts.push(m.label);
      if (m.description) parts.push(m.description);
    });
  }
  if (Array.isArray(doc.companions)) {
    const names = doc.companions.map(c => c.especie || c.nombre || '').filter(Boolean);
    if (names.length) parts.push(names.join(', '));
  }
  if (Array.isArray(doc.failure_modes)) {
    doc.failure_modes.forEach(f => {
      if (f.mode) parts.push(f.mode);
      if (f.solucion) parts.push(f.solucion);
    });
  }
  if (doc.leccion_agroecologica) parts.push(doc.leccion_agroecologica);
  return parts.join(' ').trim();
}

function rankMetrics(rankings, goldenItems) {
  let r1 = 0, r3 = 0, r5 = 0, rr = 0;
  const n = goldenItems.length;
  for (const { expectedSlug, ranked } of rankings) {
    const pos = ranked.indexOf(expectedSlug); // 0-based, -1 si no aparece
    if (pos === 0) r1++;
    // BUG FIX (encontrado armando el bench de reranker en feat/rag-reranker):
    // sin el `pos >= 0 &&`, un expectedSlug que NO existe en el corpus
    // (indexOf devuelve -1) contaba como HIT automático de recall@3/@5
    // porque -1 <= 2 y -1 <= 4 son ambos true en JS. Afectaba a 15/44 items
    // evaluables del golden (slugs base como solanum_tuberosum/lactuca_sativa
    // que el catálogo ya solo tiene como variedades, ej.
    // solanum_tuberosum_pastusa_suprema) e inflaba recall@3 70.5%→36.4% real
    // y recall@5 75%→40.9% real. recall@1 y MRR no estaban afectados (ya
    // tenían el guard correcto).
    if (pos >= 0 && pos <= 2) r3++;
    if (pos >= 0 && pos <= 4) r5++;
    if (pos >= 0) rr += 1 / (pos + 1);
  }
  return {
    'recall@1': Number((r1 / n * 100).toFixed(1)),
    'recall@3': Number((r3 / n * 100).toFixed(1)),
    'recall@5': Number((r5 / n * 100).toFixed(1)),
    'MRR': Number((rr / n).toFixed(4)),
  };
}

// ---------- main ----------

async function main() {
  console.log('=== bench-embedders.mjs — RAG embedder comparison ===\n');
  console.log(`Ollama URL: ${OLLAMA_URL}`);

  // 1. Cargar corpus
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const allSlugs = manifest.slugs || [];

  // Subconjunto representativo: usamos TODOS los slugs con texto (≤492)
  // El corpus es chico (~492 docs) así que lo embebemos completo.
  const corpus = [];
  console.log(`\nCargando corpus desde ${CORPUS_DIR}...`);
  for (const slug of allSlugs) {
    const docPath = resolve(CORPUS_DIR, `${slug}.json`);
    if (!existsSync(docPath)) continue;
    const doc = JSON.parse(readFileSync(docPath, 'utf8'));
    const text = extractText(doc);
    if (text) corpus.push({ slug, text });
  }
  console.log(`Corpus cargado: ${corpus.length} docs con texto\n`);

  // 2. Cargar golden set
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
  const goldItems = golden.filter(g => !NON_SLUG_EXPECTED.has(g.expected));
  const skipped = golden.filter(g => NON_SLUG_EXPECTED.has(g.expected));
  console.log(`Golden set: ${golden.length} total, ${goldItems.length} evaluables, ${skipped.length} skipped (cross-species)`);
  console.log(`Skipped IDs: ${skipped.map(g => g.id).join(', ')}`);
  // Verificar que todos los esperados existen en corpus
  const corpusSlugs = new Set(corpus.map(c => c.slug));
  const missing = goldItems.filter(g => !corpusSlugs.has(g.expected));
  if (missing.length) {
    console.warn(`\nWARN: ${missing.length} gold items cuyo expected-slug NO existe en corpus:`);
    missing.forEach(g => console.warn(`  ${g.id}: expected="${g.expected}" query="${g.query}"`));
    console.warn('Estos se incluyen en la evaluación pero nunca pueden ser top-1 → penaliza a todos los modelos por igual.\n');
  }
  console.log('');

  const results = [];

  for (const [modelId, modelName] of MODELS) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Modelo: ${modelName}`);

    // --- Embeber corpus ---
    console.log(`  Embediendo ${corpus.length} chunks del corpus...`);
    const corpusVecs = [];
    const latencies = [];
    let errorCount = 0;

    for (let i = 0; i < corpus.length; i++) {
      const t0 = performance.now();
      try {
        const vec = await embed(modelId, corpus[i].text);
        corpusVecs.push(vec);
        latencies.push(performance.now() - t0);
      } catch (err) {
        console.error(`    ERROR slug=${corpus[i].slug}: ${err.message}`);
        corpusVecs.push(null);
        errorCount++;
        latencies.push(performance.now() - t0);
      }
      if ((i + 1) % 50 === 0) {
        process.stderr.write(`  [${i + 1}/${corpus.length}]\n`);
      }
    }

    const latSorted = [...latencies].sort((a, b) => a - b);
    const latAvg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
    const latP50 = latSorted[Math.floor(latSorted.length * 0.5)];
    const latP95 = latSorted[Math.floor(latSorted.length * 0.95)];
    console.log(`  Corpus embebido (${errorCount} errores). Latencia: avg=${latAvg.toFixed(0)}ms p50=${latP50.toFixed(0)}ms p95=${latP95.toFixed(0)}ms`);

    // --- Embeber queries y rankear ---
    console.log(`  Evaluando ${goldItems.length} queries del gold set...`);
    const rankings = [];
    const queryLatencies = [];

    for (const goldItem of goldItems) {
      const t0 = performance.now();
      let queryVec;
      try {
        queryVec = await embed(modelId, goldItem.query);
      } catch (err) {
        console.error(`    ERROR query ${goldItem.id}: ${err.message}`);
        rankings.push({ expectedSlug: goldItem.expected, ranked: [] });
        queryLatencies.push(performance.now() - t0);
        continue;
      }
      queryLatencies.push(performance.now() - t0);

      // Calcular cosine similarity vs todos los chunks del corpus
      const sims = corpus.map((c, idx) => ({
        slug: c.slug,
        sim: corpusVecs[idx] ? cosineSim(queryVec, corpusVecs[idx]) : -1,
      }));
      sims.sort((a, b) => b.sim - a.sim);
      rankings.push({
        expectedSlug: goldItem.expected,
        ranked: sims.map(s => s.slug),
        topSim: sims[0]?.sim,
      });
    }

    const metrics = rankMetrics(rankings, goldItems);
    const queryLatAvg = queryLatencies.reduce((s, v) => s + v, 0) / queryLatencies.length;

    console.log(`  recall@1=${metrics['recall@1']}%  recall@3=${metrics['recall@3']}%  recall@5=${metrics['recall@5']}%  MRR=${metrics['MRR']}`);
    console.log(`  Latencia query: avg=${queryLatAvg.toFixed(0)}ms`);

    results.push({
      model: modelId,
      name: modelName,
      corpus_size: corpus.length,
      corpus_errors: errorCount,
      gold_evaluable: goldItems.length,
      gold_skipped: skipped.length,
      metrics,
      latency: {
        corpus_avg_ms: Number(latAvg.toFixed(1)),
        corpus_p50_ms: Number(latP50.toFixed(1)),
        corpus_p95_ms: Number(latP95.toFixed(1)),
        query_avg_ms: Number(queryLatAvg.toFixed(1)),
      },
    });
  }

  // --- Tabla resumen ---
  console.log(`\n${'═'.repeat(90)}`);
  console.log('RESUMEN — Embedders RAG Chagra (corpus español agroecológico, n_gold=' + goldItems.length + ')');
  console.log('─'.repeat(90));
  console.log(
    'Modelo'.padEnd(36) +
    'R@1%'.padStart(7) + 'R@3%'.padStart(7) + 'R@5%'.padStart(7) + 'MRR'.padStart(8) +
    'lat-corpus-avg'.padStart(16) + 'lat-q-avg'.padStart(11)
  );
  console.log('─'.repeat(90));
  const baseline = results[0];
  for (const r of results) {
    const isBaseline = r.model === 'nomic-embed-text';
    const delta1 = isBaseline ? '' : ` (${r.metrics['recall@1'] >= baseline.metrics['recall@1'] ? '+' : ''}${(r.metrics['recall@1'] - baseline.metrics['recall@1']).toFixed(1)})`;
    console.log(
      r.model.padEnd(36) +
      `${r.metrics['recall@1']}%${delta1}`.padStart(7 + delta1.length) +
      `${r.metrics['recall@3']}%`.padStart(7) +
      `${r.metrics['recall@5']}%`.padStart(7) +
      `${r.metrics['MRR']}`.padStart(8) +
      `${r.latency.corpus_avg_ms}ms`.padStart(16) +
      `${r.latency.query_avg_ms}ms`.padStart(11)
    );
  }
  console.log('─'.repeat(90));

  // Determinar ganador
  const winner = results.reduce((best, r) => r.metrics['MRR'] > best.metrics['MRR'] ? r : best, results[0]);
  const mrrDelta = (winner.metrics['MRR'] - baseline.metrics['MRR']).toFixed(4);
  const r1Delta = (winner.metrics['recall@1'] - baseline.metrics['recall@1']).toFixed(1);
  console.log(`\nGANADOR: ${winner.name}`);
  if (winner.model === 'nomic-embed-text') {
    console.log('nomic-embed-text sigue siendo el mejor → mantener en PROD.');
  } else {
    console.log(`Delta vs nomic (PROD): recall@1 ${r1Delta >= 0 ? '+' : ''}${r1Delta}pp, MRR ${mrrDelta >= 0 ? '+' : ''}${mrrDelta}`);
    console.log(`Para cambiar a PROD: editar src/services/ragRetriever.js:442`);
    console.log(`  body: JSON.stringify({ model: 'nomic-embed-text', ... })`);
    console.log(`  → body: JSON.stringify({ model: '${winner.model}', ... })`);
    console.log(`  Luego re-indexar: RAG_EMBED_MODEL=${winner.model} node scripts/build-rag-embeddings.mjs`);
    console.log(`  Nota: la dimensión del vector puede cambiar → verificar que ragRetriever no asuma dim=768.`);
  }
  console.log('═'.repeat(90));

  // Guardar JSON
  const output = {
    bench: 'embedders',
    date: '2026-06-23',
    ollama_url: OLLAMA_URL,
    corpus_source: 'public/cycle-content/ (build-rag-embeddings.mjs extractPassageText)',
    gold_source: 'eval/rag-golden.json',
    gold_method: 'keyword/especie mapping manual: query→slug esperado por plaga/cultivo/técnica. ' +
      'Queries cross-species (biopreparado, associacion, mito_lunar, suelo_acido, agua_calidad, erosion) excluidas del cálculo.',
    gold_total: golden.length,
    gold_evaluable: goldItems.length,
    gold_skipped: skipped.length,
    gold_skipped_ids: skipped.map(g => g.id),
    winner: winner.model,
    winner_vs_baseline_recall1_delta: Number(r1Delta),
    winner_vs_baseline_mrr_delta: Number(mrrDelta),
    models: results,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  console.log(`\nResultados guardados en: ${OUTPUT_PATH}`);
}

main().catch(err => {
  console.error('[bench-embedders] FATAL:', err);
  process.exit(1);
});
