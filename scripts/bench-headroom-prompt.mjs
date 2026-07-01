#!/usr/bin/env node
/**
 * bench-headroom-prompt.mjs — bench local para decidir si vale la pena meter
 * una capa externa de compresión tipo Headroom en el agente Chagra.
 *
 * Este bench NO depende de red ni de modelos. Compara:
 *   1) baseline naive: concatenar todo el contexto sin presupuesto;
 *   2) assembler actual: `assembleSystemContent()` con degradación explícita.
 *
 * Lo que queremos responder es simple:
 *   - ¿el sistema actual ya preserva grounding/guardas dentro del presupuesto?
 *   - ¿cuánto contexto sacrifica antes de llegar al límite?
 *   - ¿queda todavía un hueco material que justifique una compresión extra?
 *
 * Output:
 *   data/bench-runs/headroom-prompt-<ts>/{raw.json, summary.md}
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import {
  assembleSystemContent,
  estimateTokens,
  PROMPT_TOKEN_BUDGET,
  SYSTEM_PROMPT_TOKEN_BUDGET,
  TOP_N_EDGES,
  TOP_N_RAG,
} from '../src/services/promptAssembler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const BENCH_RUNS_DIR = process.env.BENCH_OUTPUT_DIR || join(ROOT_DIR, 'data', 'bench-runs');
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const PROFILE = (process.argv.find((a) => a.startsWith('--profile=')) || '--profile=fit').slice('--profile='.length);
const OUT_DIR = join(BENCH_RUNS_DIR, `headroom-prompt-${PROFILE}-${RUN_ID}`);
mkdirSync(OUT_DIR, { recursive: true });

const repeat = (label, count) => Array.from({ length: count }, (_, i) => `${label} ${i + 1}`).join(' ');
const marker = (name, body) => `[[${name}]] ${body}`;

const PROFILE_SPECS = {
  fit: {
    base: 72,
    clima: 50,
    finca: 50,
    asociacion: 42,
    memoria: 52,
    corpus: 70,
    corpusShort: 34,
    frostHeat: 30,
    viabilidad: 24,
    seguridad: 24,
    evidence: 28,
    resolvedEntities: 26,
    curatedFacts: 26,
    relacional: 28,
    queryAnalysis: 24,
    suggested: 20,
    priceDecline: 20,
    fermento: 22,
    biopreparado: 24,
  },
  stress: {
    base: 180,
    clima: 170,
    finca: 170,
    asociacion: 150,
    memoria: 180,
    corpus: 240,
    corpusShort: 110,
    frostHeat: 120,
    viabilidad: 90,
    seguridad: 110,
    evidence: 120,
    resolvedEntities: 110,
    curatedFacts: 110,
    relacional: 140,
    queryAnalysis: 120,
    suggested: 80,
    priceDecline: 80,
    fermento: 90,
    biopreparado: 100,
  },
};

function makeSyntheticPrompt(profile) {
  const s = PROFILE_SPECS[profile] || PROFILE_SPECS.fit;
  const base = marker(
    'BASE',
    repeat(
      'Instrucción base del agente con guardas y estilo de respuesta.',
      s.base,
    ),
  );
  const climate = marker('CLIMA', repeat('Contexto ambiental sacrificable con ENSO y lluvia.', s.clima));
  const finca = marker('FINCA', repeat('Marco de finca sacrificable con altitud, suelo y manejo.', s.finca));
  const asociacion = marker('ASOCIACION', repeat('Asociaciones y policultivo sacrificable.', s.asociacion));
  const memoria = marker('MEMORIA', repeat('Memoria episódica de la finca sacrificable.', s.memoria));
  const corpus = {
    variants: [
      marker('CORPUS_FULL', repeat('Pasaje RAG completo con variantes y chunks largos.', s.corpus)),
      marker('CORPUS_MED', repeat('Pasaje RAG medio.', s.corpusShort)),
      '',
    ],
  };
  const frostHeat = marker('FROST', repeat('Riesgo térmico sacrificable.', s.frostHeat));
  const viabilidad = marker('VIABILIDAD', repeat('Guarda de viabilidad protegida.', s.viabilidad));
  const seguridad = marker('SEGURIDAD', repeat('Guarda de seguridad protegida.', s.seguridad));
  const evidence = marker('EVIDENCE', repeat('Evidencia autoritativa protegida.', s.evidence));
  const resolvedEntities = marker('RESOLVED', repeat('Entidades canónicas protegidas.', s.resolvedEntities));
  const curatedFacts = marker('CURATED', repeat('Hechos curados AGE protegidos.', s.curatedFacts));
  const relacional = marker('REL', repeat('Cadena relacional GraphRAG protegida.', s.relacional));
  const queryAnalysis = marker('QUERY', repeat('Análisis de query protegido.', s.queryAnalysis));
  const suggested = marker('SUGGESTED', repeat('Guarda de caso B protegida.', s.suggested));
  const priceDecline = marker('PRICE', repeat('Guarda de precio sin dato protegida.', s.priceDecline));
  const fermento = marker('FERMENTO', repeat('Guarda fermento máxima prioridad.', s.fermento));
  const biopreparado = marker('BIOPREP', repeat('Grounding biopreparado máxima prioridad.', s.biopreparado));

  return {
    base,
    clima: { variants: [climate, ''] },
    finca: { variants: [finca, ''] },
    asociacion: { variants: [asociacion, ''] },
    memoria: { variants: [memoria, ''] },
    corpus,
    frostHeat: { variants: [frostHeat, ''] },
    viabilidad,
    seguridad,
    evidence,
    resolvedEntities,
    curatedFacts,
    relacional,
    queryAnalysis,
    suggested,
    priceDecline,
    fermento,
    biopreparado,
  };
}

function naiveConcat(blocks) {
  return [
    blocks.base,
    blocks.clima?.variants?.[0] || '',
    blocks.finca?.variants?.[0] || '',
    blocks.asociacion?.variants?.[0] || '',
    blocks.memoria?.variants?.[0] || '',
    blocks.corpus?.variants?.[0] || '',
    blocks.frostHeat?.variants?.[0] || '',
    blocks.viabilidad,
    blocks.seguridad,
    blocks.evidence,
    blocks.resolvedEntities,
    blocks.curatedFacts,
    blocks.relacional,
    blocks.queryAnalysis,
    blocks.suggested,
    blocks.priceDecline,
    blocks.fermento,
    blocks.biopreparado,
  ]
    .filter(Boolean)
    .join('\n\n');
}

function summarize(assembled, blocks) {
  const content = assembled.content;
  const naive = naiveConcat(blocks);
  const naiveTokens = estimateTokens(naive);
  const assembledTokens = assembled.totalTokens;
  const savedTokens = Math.max(0, naiveTokens - assembledTokens);
  const savingsPct = naiveTokens > 0 ? ((savedTokens / naiveTokens) * 100).toFixed(1) : '0.0';

  const markers = ['BASE', 'VIABILIDAD', 'SEGURIDAD', 'EVIDENCE', 'RESOLVED', 'CURATED', 'REL', 'QUERY', 'SUGGESTED', 'PRICE', 'FERMENTO', 'BIOPREP'];
  const preserved = Object.fromEntries(markers.map((m) => [m, content.includes(`[[${m}]]`)]));

  return {
    budgets: {
      system_prompt_token_budget: SYSTEM_PROMPT_TOKEN_BUDGET,
      prompt_token_budget: PROMPT_TOKEN_BUDGET,
      top_n_rag: TOP_N_RAG,
      top_n_edges: TOP_N_EDGES,
    },
    naive: {
      tokens: naiveTokens,
      chars: naive.length,
    },
    assembled: {
      tokens: assembledTokens,
      chars: content.length,
      overBudget: assembled.overBudget,
      preserved,
      degraded: assembled.breakdown.filter((b) => b.degraded).map((b) => b.name),
    },
    delta: {
      saved_tokens: savedTokens,
      savings_pct: savingsPct,
    },
    breakdown: assembled.breakdown,
  };
}

const t0 = performance.now();
const blocks = makeSyntheticPrompt(PROFILE);
const assembled = assembleSystemContent(blocks);
const buildMs = Math.round(performance.now() - t0);
const report = summarize(assembled, blocks);

const raw = {
  run_id: RUN_ID,
  profile: PROFILE,
  build_ms: buildMs,
  report,
  assembled_content: assembled.content,
};

writeFileSync(join(OUT_DIR, 'raw.json'), JSON.stringify(raw, null, 2));
writeFileSync(
  join(OUT_DIR, 'summary.md'),
  [
    `# Bench Headroom Prompt — ${RUN_ID}`,
    '',
    `- profile: ${PROFILE}`,
    `- build_ms: ${buildMs}`,
    `- system_budget_tokens: ${SYSTEM_PROMPT_TOKEN_BUDGET}`,
    `- prompt_budget_tokens: ${PROMPT_TOKEN_BUDGET}`,
    `- naive_tokens: ${report.naive.tokens}`,
    `- assembled_tokens: ${report.assembled.tokens}`,
    `- saved_tokens: ${report.delta.saved_tokens}`,
    `- savings_pct: ${report.delta.savings_pct}%`,
    `- degraded_blocks: ${report.assembled.degraded.join(', ') || 'none'}`,
    `- over_budget: ${report.assembled.overBudget ? 'yes' : 'no'}`,
    '',
    '## Preservación de bloques protegidos',
    '',
    '| bloque | preservado |',
    '|---|---|',
    ...Object.entries(report.assembled.preserved).map(([k, v]) => `| ${k} | ${v ? 'yes' : 'no'} |`),
    '',
    '## Breakdown',
    '',
    '| bloque | tokens | degradado |',
    '|---|---:|---|',
    ...report.breakdown.map((b) => `| ${b.name} | ${b.tokens} | ${b.degraded ? 'yes' : 'no'} |`),
  ].join('\n'),
);

console.log(`[bench-headroom-prompt] Run ${RUN_ID} → ${OUT_DIR}`);
console.log(`[bench-headroom-prompt] profile=${PROFILE}`);
console.log(`[bench-headroom-prompt] build_ms=${buildMs}`);
console.log(`[bench-headroom-prompt] naive_tokens=${report.naive.tokens} assembled_tokens=${report.assembled.tokens} saved=${report.delta.saved_tokens} (${report.delta.savings_pct}%)`);
console.log(`[bench-headroom-prompt] degraded=${report.assembled.degraded.join(', ') || 'none'}`);
console.log(`[bench-headroom-prompt] protected_preserved=${Object.entries(report.assembled.preserved).every(([, v]) => v) ? 'yes' : 'no'}`);
