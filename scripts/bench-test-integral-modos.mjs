#!/usr/bin/env node
/**
 * bench-test-integral-modos.mjs - Auditoria integral de los 3 modos del agente.
 *
 * Corre el mismo set de consultas representativas contra el pipeline real de
 * prompts de Chagra:
 *   - buildBasePrompt(...)
 *   - buildResponseModeBlock(...)
 *   - buildModoExpertoBlock + buildSourceFooter cuando hay grounding
 *
 * La verificacion principal es determinista. Si se habilita un juez LLM por
 * entorno, se usa solo como complemento y nunca como unica fuente de veredicto.
 *
 * Output:
 *   data/bench-runs/test-integral-modos-<timestamp>/summary.md
 *   data/bench-runs/test-integral-modos-<timestamp>/results.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { buildBasePrompt, buildResponseModeBlock } from '../src/services/agentPromptBase.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const DEFAULT_OUTPUT_DIR = process.env.BENCH_OUTPUT_DIR || join(ROOT_DIR, 'data', 'bench-runs');
const DEFAULT_LIMIT = 12;
const DEFAULT_JUDGE_MODEL = process.env.BENCH_JUDGE_MODEL || process.env.JUDGE_MODEL || '';
const OLLAMA_URL = process.env.BENCH_JUDGE_URL || 'http://localhost:11434/api/generate';

const MODE_ORDER = ['campesino', 'experto', 'maestro'];

const MODE_CONFIG = {
  campesino: {
    level: 'simple',
    label: 'Campesino',
    blockMarker: '=== MODO CAMPESINO (registro oral campesino colombiano) ===',
    endMarker: '=== FIN MODO CAMPESINO ===',
  },
  experto: {
    level: 'detallado',
    label: 'Experto',
    blockMarker: '=== MODO EXPERTO ===',
    endMarker: '=== FIN ===',
  },
  maestro: {
    level: 'maestro',
    label: 'Maestro',
    blockMarker: '=== MODO MAESTRO (registro profesor/mentor) ===',
    endMarker: '=== FIN MODO MAESTRO ===',
  },
};

const QUERY_SUITE = [
  {
    id: 'q01',
    category: 'manejo',
    query: '¿Qué cuidados requiere la fresa en clima frío?',
    plantContext: 'fresa x1',
    toolEvidence: [{ tool: 'get_species' }, { tool: 'get_clima_ideam' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'fresa', nombre_cientifico: 'Fragaria x ananassa' }],
    hasCorpus: true,
  },
  {
    id: 'q02',
    category: 'plaga',
    query: '¿Cómo controlo la broca del café sin químicos fuertes?',
    plantContext: 'café x3',
    toolEvidence: [{ tool: 'get_pest_controllers' }, { tool: 'get_biopreparados' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'café', nombre_cientifico: 'Coffea arabica' }],
    hasCorpus: true,
  },
  {
    id: 'q03',
    category: 'atributo',
    query: '¿A qué altitud crece mejor el aguacate Hass?',
    plantContext: 'aguacate Hass x2',
    toolEvidence: [{ tool: 'get_species' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'aguacate Hass', nombre_cientifico: 'Persea americana var. Hass' }],
    hasCorpus: true,
  },
  {
    id: 'q04',
    category: 'relacion',
    query: '¿Qué compañeros ayudan al maíz y por qué?',
    plantContext: 'maíz x1',
    toolEvidence: [{ tool: 'get_companions' }, { tool: 'get_multihop_companions' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'maíz', nombre_cientifico: 'Zea mays' }],
    hasCorpus: true,
  },
  {
    id: 'q05',
    category: 'enum',
    query: '¿Cuántas variedades de café hay en el catálogo?',
    plantContext: 'café x4',
    toolEvidence: [{ tool: 'validate_taxonomy' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'café', nombre_cientifico: 'Coffea arabica' }],
    hasCorpus: false,
    isEnum: true,
  },
  {
    id: 'q06',
    category: 'manejo',
    query: '¿Cómo preparo el caldo bordelés y cuándo lo aplico?',
    plantContext: 'tomate x8',
    toolEvidence: [{ tool: 'get_biopreparados' }, { tool: 'get_normativa_ica' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'tomate', nombre_cientifico: 'Solanum lycopersicum' }],
    hasCorpus: true,
  },
  {
    id: 'q07',
    category: 'diagnostico',
    query: 'Mi tomate tiene gota, ¿qué manejo recomiendas?',
    plantContext: 'tomate x12',
    toolEvidence: [{ tool: 'get_pest_controllers' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'tomate', nombre_cientifico: 'Solanum lycopersicum' }],
    hasCorpus: true,
  },
  {
    id: 'q08',
    category: 'precio',
    query: '¿Cómo reviso el precio del frijol sin inventar datos?',
    plantContext: 'frijol x5',
    toolEvidence: [{ tool: 'get_precio_sipsa' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'frijol', nombre_cientifico: 'Phaseolus vulgaris' }],
    hasCorpus: false,
  },
  {
    id: 'q09',
    category: 'regional',
    query: 'En Boyacá me dijeron que la mata está brava, ¿qué significa?',
    plantContext: 'papa x6',
    toolEvidence: [],
    resolvedEntities: [],
    hasCorpus: false,
  },
  {
    id: 'q10',
    category: 'atributo',
    query: '¿Qué temperatura le sirve al tomate de árbol?',
    plantContext: 'tomate de árbol x2',
    toolEvidence: [{ tool: 'get_species' }, { tool: 'get_clima_ideam' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'tomate de árbol', nombre_cientifico: 'Solanum betaceum' }],
    hasCorpus: true,
  },
  {
    id: 'q11',
    category: 'manejo',
    query: '¿Qué hago para mejorar el drenaje de la papa?',
    plantContext: 'papa x9',
    toolEvidence: [{ tool: 'get_species' }, { tool: 'get_clima_ideam' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'papa', nombre_cientifico: 'Solanum tuberosum' }],
    hasCorpus: true,
  },
  {
    id: 'q12',
    category: 'descripcion',
    query: 'Explícame la marchitez bacteriana sin rodeos.',
    plantContext: 'tomate x3',
    toolEvidence: [{ tool: 'get_pest_controllers' }, { tool: 'get_normativa_ica' }],
    resolvedEntities: [{ kind: 'species', nombre_comun: 'tomate', nombre_cientifico: 'Solanum lycopersicum' }],
    hasCorpus: true,
  },
];

function stripAccents(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseArgs(argv = process.argv) {
  const out = {
    outputDir: DEFAULT_OUTPUT_DIR,
    limit: DEFAULT_LIMIT,
    writeOutput: true,
    judgeModel: DEFAULT_JUDGE_MODEL,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-write') {
      out.writeOutput = false;
      continue;
    }
    if (arg === '--limit') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out.limit = Number(next);
        i += 1;
      }
      continue;
    }
    if (arg.startsWith('--limit=')) {
      out.limit = Number(arg.slice('--limit='.length));
      continue;
    }
    if (arg === '--output-dir') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out.outputDir = next;
        i += 1;
      }
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      out.outputDir = arg.slice('--output-dir='.length);
      continue;
    }
    if (arg === '--judge') {
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out.judgeModel = next;
        i += 1;
      } else {
        out.judgeModel = DEFAULT_JUDGE_MODEL || 'auto';
      }
    }
  }

  if (!Number.isFinite(out.limit) || out.limit <= 0) {
    out.limit = DEFAULT_LIMIT;
  }

  return out;
}

function loadQuerySuite(limit = DEFAULT_LIMIT) {
  return QUERY_SUITE.slice(0, Math.min(limit, QUERY_SUITE.length));
}

function buildPromptForMode(queryFixture, mode) {
  const modeConfig = MODE_CONFIG[mode];
  if (!modeConfig) {
    throw new Error(`Modo desconocido: ${mode}`);
  }
  const hasGrounding = Boolean(
    queryFixture.hasCorpus ||
      (queryFixture.toolEvidence && queryFixture.toolEvidence.length > 0) ||
      (queryFixture.resolvedEntities && queryFixture.resolvedEntities.length > 0),
  );
  const expectedResponseModeBlock = buildResponseModeBlock(modeConfig.level, hasGrounding);

  const prompt = buildBasePrompt({
    plantContext: queryFixture.plantContext,
    query: queryFixture.query,
    contextMemory: queryFixture.contextMemory || '',
    isEnum: Boolean(queryFixture.isEnum),
    nivelRespuestas: modeConfig.level,
    toolEvidence: queryFixture.toolEvidence || null,
    resolvedEntities: queryFixture.resolvedEntities || null,
    hasCorpus: Boolean(queryFixture.hasCorpus),
  });

  if (expectedResponseModeBlock && !prompt.includes(expectedResponseModeBlock)) {
    throw new Error(`El prompt ensamblado no contiene el bloque esperado para ${mode}`);
  }

  return prompt;
}

function extractModeBlock(prompt, mode) {
  const modeConfig = MODE_CONFIG[mode];
  if (!modeConfig) return '';

  const start = prompt.indexOf(modeConfig.blockMarker);
  if (start < 0) return '';
  const end = prompt.indexOf(modeConfig.endMarker, start + modeConfig.blockMarker.length);
  if (end < 0) return prompt.slice(start).trim();
  return prompt.slice(start, end + modeConfig.endMarker.length).trim();
}

function extractFooter(prompt) {
  const match = prompt.match(/\n\n---\n\nFuentes:\s*([^\n]+)\./);
  return match ? match[1].trim() : '';
}

function countScientificBinomials(text) {
  const matches = String(text || '').match(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [a-záéíóúñ]{3,}\b/g);
  return matches ? matches.length : 0;
}

function hasAll(text, phrases) {
  const normalized = stripAccents(text).toLowerCase();
  return phrases.every((phrase) => normalized.includes(stripAccents(phrase).toLowerCase()));
}

function evaluateCampesino(prompt, block) {
  const markers = [
    'usa tu/usted colombiano',
    'frases cortas y directas',
    'nombres comunes',
    'se respetuoso y cercano',
    'solo un cambio de registro',
  ];
  const markerHits = markers.filter((marker) => hasAll(block, [marker])).length;
  const noMandatoryBinomials = hasAll(block, ['no uses binomios cientificos']);
  const shortEnough = block.length <= 1200;

  return {
    markerHits,
    binomials: noMandatoryBinomials ? 0 : 1,
    noMandatoryBinomials,
    shortEnough,
    score: Math.max(0, Math.min(100, markerHits * 20 + (shortEnough ? 20 : 0) + (noMandatoryBinomials ? 20 : 0))),
    leakExpert: /contrato tecnico|contrato cita/i.test(prompt),
    leakMaestro: /resume la decision principal|checklist breve|errores comunes/i.test(prompt),
  };
}

function evaluateExperto(prompt, block, footer, grounded) {
  const groundedMarkers = [
    'contrato cita',
    'cientifico exacto',
    'dosis con unidad',
    'mecanismo de accion',
    'piso termico',
  ];
  const technicalMarkers = [
    'contrato tecnico',
    'profundiza en por que',
    'si no hay datos del catalogo',
    'honesto cuando no la haya',
  ];
  const expected = grounded ? groundedMarkers : technicalMarkers;
  const hits = expected.filter((marker) => hasAll(prompt, [marker]) || hasAll(block, [marker]) || hasAll(footer, [marker])).length;
  const footerSources = footer ? footer.split(' + ').filter(Boolean).length : 0;

  return {
    groundedHits: grounded ? hits : 0,
    technicalHits: grounded ? 0 : hits,
    footerSources,
    hasFooter: Boolean(footer),
    score: Math.max(0, Math.min(100, hits * 20 + (grounded ? (footerSources > 0 ? 20 : 0) : 0) + (grounded ? (footer ? 20 : 0) : 0))),
    leakCampesino: /usa tu\/usted colombiano|frases cortas y directas|nombres comunes/i.test(prompt),
    leakMaestro: /resume la decision principal|checklist breve|errores comunes/i.test(prompt),
  };
}

function evaluateMaestro(prompt, block) {
  const markers = [
    'resume la decision principal',
    'checklist breve',
    'errores comunes',
    'usa ejemplos del cultivo del usuario',
    'ensenar no es adornar',
  ];
  const markerHits = markers.filter((marker) => hasAll(block, [marker])).length;

  return {
    markerHits,
    score: Math.max(0, Math.min(100, markerHits * 20)),
    leakCampesino: /usa tu\/usted colombiano|frases cortas y directas|nombres comunes/i.test(prompt),
    leakExpert: /contrato tecnico|contrato cita/i.test(prompt),
  };
}

async function maybeRunOptionalJudge({ mode, prompt, block, footer, grounded }) {
  const model = DEFAULT_JUDGE_MODEL;
  if (!model || model === 'auto') return null;

  const judgePrompt = [
    `Evalua si este bloque de modo corresponde al modo ${mode}.`,
    grounded ? 'La consulta tiene grounding.' : 'La consulta no tiene grounding.',
    'Devuelve JSON con score 0-100, consistencia 0-100 y una justificacion breve.',
    '',
    `CONSULTA: ${prompt.slice(0, 240).replace(/\s+/g, ' ').trim()}`,
    '',
    `BLOQUE: ${block}`,
    footer ? `FONDO FUENTES: ${footer}` : '',
  ].join('\n');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: judgePrompt,
        stream: false,
        options: { temperature: 0, num_predict: 120 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const raw = String(data.response || '');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function evaluateQueryForMode(queryFixture, mode) {
  const prompt = buildPromptForMode(queryFixture, mode);
  const block = extractModeBlock(prompt, mode);
  const footer = extractFooter(prompt);
  const grounded = Boolean(queryFixture.hasCorpus || (queryFixture.toolEvidence && queryFixture.toolEvidence.length > 0) || (queryFixture.resolvedEntities && queryFixture.resolvedEntities.length > 0));

  const start = performance.now();
  const deterministic =
    mode === 'campesino'
      ? evaluateCampesino(prompt, block)
      : mode === 'experto'
        ? evaluateExperto(prompt, block, footer, grounded)
        : evaluateMaestro(prompt, block);
  const judge = await maybeRunOptionalJudge({ mode, prompt, block, footer, grounded });
  const elapsedMs = Math.round(performance.now() - start);

  return {
    id: queryFixture.id,
    category: queryFixture.category,
    query: queryFixture.query,
    mode,
    grounded,
    promptChars: prompt.length,
    blockChars: block.length,
    footer,
    deterministic,
    judge,
    elapsedMs,
  };
}

function summarizeModeRows(mode, rows) {
  const total = rows.length;
  const avg = (selector) => {
    if (total === 0) return 0;
    return rows.reduce((sum, row) => sum + selector(row), 0) / total;
  };
  const groundedRows = rows.filter((row) => row.grounded);
  const groundedTotal = groundedRows.length;
  const nonGroundedRows = rows.filter((row) => !row.grounded);
  const nonGroundedTotal = nonGroundedRows.length;

  if (mode === 'campesino') {
    const ownCoverage = rows.filter((row) => row.deterministic.markerHits >= 3 && row.deterministic.binomials === 0 && row.deterministic.shortEnough).length;
    const leakRate = rows.filter((row) => row.deterministic.leakExpert || row.deterministic.leakMaestro).length;
    return {
      mode,
      label: MODE_CONFIG[mode].label,
      total,
      groundedTotal,
      nonGroundedTotal,
      ownCoverageRate: total ? (ownCoverage / total) * 100 : 0,
      leakRate: total ? (leakRate / total) * 100 : 0,
      avgBlockChars: avg((row) => row.blockChars),
      avgScore: avg((row) => row.deterministic.score),
      pass: total > 0 && ownCoverage === total && leakRate === 0,
    };
  }

  if (mode === 'experto') {
    const groundedHits = groundedRows.filter((row) => row.deterministic.groundedHits >= 4 && row.deterministic.hasFooter).length;
    const ungroundedHits = nonGroundedRows.filter((row) => row.deterministic.technicalHits >= 3 && !row.deterministic.hasFooter).length;
    const leakRate = rows.filter((row) => row.deterministic.leakCampesino || row.deterministic.leakMaestro).length;
    const avgSources = groundedTotal > 0
      ? groundedRows.reduce((sum, row) => sum + row.deterministic.footerSources, 0) / groundedTotal
      : 0;
    return {
      mode,
      label: MODE_CONFIG[mode].label,
      total,
      groundedTotal,
      nonGroundedTotal,
      groundedCoverageRate: groundedTotal ? (groundedHits / groundedTotal) * 100 : 0,
      technicalCoverageRate: nonGroundedTotal ? (ungroundedHits / nonGroundedTotal) * 100 : 0,
      leakRate: total ? (leakRate / total) * 100 : 0,
      avgBlockChars: avg((row) => row.blockChars),
      avgScore: avg((row) => row.deterministic.score),
      avgSources,
      pass: groundedTotal > 0 && groundedHits === groundedTotal && ungroundedHits === nonGroundedTotal && leakRate === 0,
    };
  }

  const ownCoverage = rows.filter((row) => row.deterministic.markerHits >= 4).length;
  const leakRate = rows.filter((row) => row.deterministic.leakCampesino || row.deterministic.leakExpert).length;
  return {
    mode,
    label: MODE_CONFIG[mode].label,
    total,
    groundedTotal,
    nonGroundedTotal,
    ownCoverageRate: total ? (ownCoverage / total) * 100 : 0,
    leakRate: total ? (leakRate / total) * 100 : 0,
    avgBlockChars: avg((row) => row.blockChars),
    avgScore: avg((row) => row.deterministic.score),
    pass: total > 0 && ownCoverage === total && leakRate === 0,
  };
}

function buildVerdict(summaryByMode) {
  const camp = summaryByMode.campesino;
  const exp = summaryByMode.experto;
  const mas = summaryByMode.maestro;
  const passed = Boolean(camp?.pass && exp?.pass && mas?.pass);
  const reasons = [];

  if (!camp?.pass) reasons.push('Campesino no cumple cobertura o fuga de otros modos.');
  if (!exp?.pass) reasons.push('Experto no cumple contrato grounded, contrato técnico o pie de fuente.');
  if (!mas?.pass) reasons.push('Maestro no muestra andamiaje pedagogico consistente.');

  return {
    passed,
    label: passed ? 'DIFERENCIACION_OK' : 'DIFERENCIACION_FALLA',
    reasons,
  };
}

function formatPct(value) {
  return `${value.toFixed(1)}%`;
}

function renderSummaryMarkdown({ rowsByMode, summaryByMode, verdict, startedAt, totalMs }) {
  const lines = [];
  lines.push('# Test integral de modos');
  lines.push('');
  lines.push(`Fecha: ${startedAt}`);
  lines.push(`Duracion total: ${Math.round(totalMs)} ms`);
  lines.push(`Veredicto: ${verdict.label}`);
  if (verdict.reasons.length > 0) {
    lines.push('');
    lines.push('Razones:');
    for (const reason of verdict.reasons) {
      lines.push(`- ${reason}`);
    }
  }
  lines.push('');
  lines.push('| Modo | Consultas | Cobertura propia | Fugas | Promedio de bloques | Promedio score | Estado |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const mode of MODE_ORDER) {
    const summary = summaryByMode[mode];
    const groundedText = mode === 'experto'
      ? `${formatPct(summary.groundedCoverageRate)} grounded, ${formatPct(summary.technicalCoverageRate)} tecnico`
      : formatPct(summary.ownCoverageRate);
    lines.push(
      `| ${summary.label} | ${summary.total} | ${groundedText} | ${formatPct(summary.leakRate)} | ${Math.round(summary.avgBlockChars)} | ${summary.avgScore.toFixed(1)} | ${summary.pass ? 'OK' : 'FALLA'} |`,
    );
  }
  lines.push('');
  lines.push('## Detalle');
  lines.push('');
  for (const mode of MODE_ORDER) {
    const summary = summaryByMode[mode];
    lines.push(`### ${summary.label}`);
    lines.push('');
    lines.push(`- Cobertura propia: ${mode === 'experto' ? `${formatPct(summary.groundedCoverageRate)} grounded / ${formatPct(summary.technicalCoverageRate)} tecnico` : formatPct(summary.ownCoverageRate)}`);
    lines.push(`- Fugas de otros modos: ${formatPct(summary.leakRate)}`);
    lines.push(`- Promedio de caracteres del bloque: ${Math.round(summary.avgBlockChars)}`);
    lines.push(`- Promedio deterministico: ${summary.avgScore.toFixed(1)}`);
    if (mode === 'experto') {
      lines.push(`- Promedio de fuentes reales en grounding: ${summary.avgSources.toFixed(1)}`);
    }
    lines.push('');
    lines.push('| Query | Grounding | Bloque chars | Score | Nota |');
    lines.push('| --- | ---: | ---: | ---: | --- |');
    for (const row of rowsByMode[mode]) {
      const note = mode === 'experto'
        ? `${row.deterministic.hasFooter ? 'footer' : 'sin footer'}`
        : mode === 'campesino'
          ? `${row.deterministic.markerHits} marcadores`
          : `${row.deterministic.markerHits} marcadores`;
      lines.push(
        `| ${row.id}: ${row.query} | ${row.grounded ? 'si' : 'no'} | ${row.blockChars} | ${row.deterministic.score.toFixed(1)} | ${note} |`,
      );
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function runBench({
  queries = loadQuerySuite(DEFAULT_LIMIT),
  outputDir = DEFAULT_OUTPUT_DIR,
  writeOutput = true,
} = {}) {
  const startedAt = new Date().toISOString();
  const start = performance.now();
  const rowsByMode = {
    campesino: [],
    experto: [],
    maestro: [],
  };

  for (const queryFixture of queries) {
    for (const mode of MODE_ORDER) {
      // El mismo set de consultas se evalua en los 3 modos.
      // La diferencia debe salir del bloque de modo y del footer experto.
      // No mutamos el fixture para mantener comparacion limpia.
      rowsByMode[mode].push(await evaluateQueryForMode(queryFixture, mode));
    }
  }

  const summaryByMode = Object.fromEntries(
    MODE_ORDER.map((mode) => [mode, summarizeModeRows(mode, rowsByMode[mode])]),
  );
  const verdict = buildVerdict(summaryByMode);
  const totalMs = performance.now() - start;
  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    totalMs: Math.round(totalMs),
    verdict,
    summaryByMode,
    rowsByMode,
  };
  const summaryMarkdown = renderSummaryMarkdown({ rowsByMode, summaryByMode, verdict, startedAt, totalMs });

  let runDir = null;
  let summaryPath = null;
  let resultsPath = null;
  if (writeOutput) {
    runDir = join(outputDir, `test-integral-modos-${startedAt.replace(/[:.]/g, '-')}`);
    mkdirSync(runDir, { recursive: true });
    summaryPath = join(runDir, 'summary.md');
    resultsPath = join(runDir, 'results.json');
    writeFileSync(summaryPath, summaryMarkdown);
    writeFileSync(resultsPath, `${JSON.stringify(summary, null, 2)}\n`);
  }

  return {
    ...summary,
    summaryMarkdown,
    runDir,
    summaryPath,
    resultsPath,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const queries = loadQuerySuite(args.limit);
  const report = await runBench({
    queries,
    outputDir: args.outputDir,
    writeOutput: args.writeOutput,
  });

  process.stdout.write(`${report.summaryMarkdown}\n`);
  if (!report.verdict.passed) {
    process.exitCode = 2;
  }
}

const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  await main();
}

export {
  MODE_ORDER,
  MODE_CONFIG,
  QUERY_SUITE,
  parseArgs,
  loadQuerySuite,
  buildPromptForMode,
  extractModeBlock,
  extractFooter,
  countScientificBinomials,
  evaluateCampesino,
  evaluateExperto,
  evaluateMaestro,
  evaluateQueryForMode,
  summarizeModeRows,
  buildVerdict,
  renderSummaryMarkdown,
  runBench,
  main,
};
