#!/usr/bin/env node
/**
 * bench-embedders.mjs - Bench de embedders sobre pares reales del grafo.
 *
 * Fase 1:
 * - Recupera pares desde AGE: RegionalLabel y nombres_comunes.
 * - Evalua embedders contra un corpus de especies construido desde el grafo.
 * - Reporta recall_at_1, recall_at_5, mrr y un corte de casos confusables.
 *
 * El script no inventa corpus. Si AGE u Ollama no estan disponibles, falla con
 * un mensaje claro y deja el bench listo para correrse cuando la infra exista.
 *
 * Uso:
 *   node scripts/bench-embedders.mjs
 *   node scripts/bench-embedders.mjs --models a,b,c
 *   node scripts/bench-embedders.mjs --graph chagra_kg
 *
 * Salidas:
 *   - data/bench-runs/embedder-bench-YYYY-MM-DD.json
 *   - bench/history/embedder-bench__<model>__<ts>.json
 *   - ops/BENCH-EMBEDDER-2026-07-15.md
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { getDbCmd } from './lib/db-cmd.mjs';
import { getBenchOutputDir, ensureDir } from './lib/bench-runner.mjs';
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_GRAPH = 'chagra_kg';
const DEFAULT_OUTPUT_DIR = getBenchOutputDir(ROOT);
const DEFAULT_REPORT_PATH = join(ROOT, 'ops', 'BENCH-EMBEDDER-2026-07-15.md');
const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';
const OLLAMA_EMBED_URL = 'http://localhost:11434/api/embeddings';
const BASELINE_FALLBACK_MODEL = 'snowflake-arctic-embed2';

export const GRAPH_LABEL_SOURCE = {
  REGIONAL_LABEL: 'RegionalLabel',
  COMMON_NAMES: 'nombres_comunes',
};

export const DEFAULT_MODEL_CANDIDATES = [
  BASELINE_FALLBACK_MODEL,
  'intfloat/multilingual-e5-large',
  'BAAI/bge-m3',
  'jinaai/jina-embeddings-v3',
  'sentence-transformers/paraphrase-multilingual-mpnet-base-v2',
];

export const HARD_CASE_GROUPS = [
  {
    id: 'papa-papaya-papayuela',
    title: 'papa, papaya y papayuela',
    cases: [
      { query: 'papa', expected: 'solanum_tuberosum' },
      { query: 'papa criolla', expected: 'solanum_phureja' },
      { query: 'papaya', expected: 'carica_papaya' },
      { query: 'papayuela', expected: 'vasconcellea_pubescens' },
    ],
  },
  {
    id: 'passiflora-7',
    title: 'siete passiflora',
    cases: [
      { query: 'maracuya', expected: 'passiflora_edulis_flavicarpa' },
      { query: 'gulupa', expected: 'passiflora_edulis_morada' },
      { query: 'granadilla', expected: 'passiflora_ligularis' },
      { query: 'curuba', expected: 'passiflora_tripartita_mollissima' },
      { query: 'badea', expected: 'passiflora_quadrangularis' },
      { query: 'cholupa', expected: 'passiflora_maliformis' },
      { query: 'curuba de castilla', expected: 'passiflora_tripartita_mollissima' },
    ],
  },
  {
    id: 'tomate-tree',
    title: 'solanum betaceum vs lycopersicum',
    cases: [
      { query: 'tomate', expected: 'solanum_lycopersicum' },
      { query: 'tomate de arbol', expected: 'solanum_betaceum' },
      { query: 'tomate de palo', expected: 'solanum_betaceum' },
    ],
  },
  {
    id: 'brassica-oleracea',
    title: 'brassica oleracea',
    cases: [
      { query: 'repollo blanco', expected: 'brassica_oleracea_capitata_alba' },
      { query: 'brocoli', expected: 'brassica_oleracea_italica' },
      { query: 'coliflor', expected: 'brassica_oleracea_botrytis' },
      { query: 'coles de bruselas', expected: 'brassica_oleracea_gemmifera' },
      { query: 'kale rizado', expected: 'brassica_oleracea_acephala_curly' },
    ],
  },
  {
    id: 'arracacha-yuca',
    title: 'arracacha y yuca',
    cases: [
      { query: 'arracacha', expected: 'arracacia_xanthorrhiza' },
      { query: 'yuca', expected: 'manihot_esculenta' },
    ],
  },
];

function stripAgtypeScalar(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw || raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return raw.replace(/^"|"$/g, '');
}

function parseAgtypeMap(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const jsonish = text
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^']*)'/g, (_m, value) => `:${JSON.stringify(value)}`);
    return JSON.parse(jsonish);
  }
}

function gitShortSha() {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout || '').trim() : '';
}

export function parseGraphRows(input) {
  const trimmed = String(input || '').trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    // Sigue con formatos de psql.
  }

  const rows = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || /^(LOAD|SET|\(\d+ rows?\))$/.test(clean)) continue;
    if (clean.startsWith('{')) {
      rows.push(parseAgtypeMap(clean));
      continue;
    }
    const parts = clean.split('\t');
    if (parts.length >= 1) {
      rows.push(parts.length === 1 ? stripAgtypeScalar(parts[0]) : parts.map(stripAgtypeScalar));
    }
  }
  return rows.filter(Boolean);
}

export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean)));
}

function collectStrings(value, out = []) {
  if (value === null || value === undefined) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) collectStrings(v, out);
    return out;
  }
  const text = String(value).trim();
  if (text) out.push(text);
  return out;
}

export function pickFirstString(value, keys = []) {
  if (!value || typeof value !== 'object') return '';
  for (const key of keys) {
    const raw = value[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (Array.isArray(raw)) {
      const first = raw.find((item) => typeof item === 'string' && item.trim());
      if (first) return first.trim();
    }
  }
  return '';
}

export function pickStringList(value, keys = []) {
  if (!value || typeof value !== 'object') return [];
  for (const key of keys) {
    const raw = value[key];
    const list = collectStrings(raw, []);
    if (list.length > 0) return uniqueStrings(list);
  }
  return [];
}

export function buildSpeciesText(speciesProps) {
  const parts = [];
  const name = pickFirstString(speciesProps, ['nombre_comun', 'name_es', 'common_name', 'nombre']);
  const sci = pickFirstString(speciesProps, ['nombre_cientifico', 'scientific_name', 'name_la']);
  const family = pickFirstString(speciesProps, ['familia_botanica', 'family', 'family_name']);
  const category = pickFirstString(speciesProps, ['category', 'categoria']);
  const aliases = pickStringList(speciesProps, [
    'nombres_comunes',
    'nombres_comunes_regionales',
    'nombre_comunes_regionales',
    'regional_labels',
    'alias',
  ]);

  parts.push(...uniqueStrings([speciesProps?.id, speciesProps?.slug, name, sci, family, category]));
  if (aliases.length > 0) parts.push(aliases.join(' | '));
  return uniqueStrings(parts).join(' ');
}

export function buildSpeciesDocs(rows) {
  return rows
    .map((row) => {
      const species = row?.species || row?.row?.species || row?.properties || row || {};
      const speciesId = pickFirstString(species, ['id', 'species_id', 'speciesId', 'slug']);
      const text = buildSpeciesText(species);
      if (!speciesId || !text) return null;
      return {
        id: speciesId,
        text,
        source: species,
      };
    })
    .filter(Boolean)
    .filter((doc, index, list) => list.findIndex((item) => item.id === doc.id) === index);
}

export function buildQueryExamples(rows, sourceName) {
  return rows
    .map((row) => {
      const query = pickFirstString(row, ['query', 'label', 'nombre', 'value', 'text']);
      const species = row?.species || row?.row?.species || row?.properties || {};
      const expected = pickFirstString(row, ['species_id', 'expected', 'expected_species', 'speciesId']);
      const source = pickFirstString(row, ['source']) || sourceName;
      const speciesId = expected || pickFirstString(species, ['id', 'species_id', 'speciesId', 'slug']);
      if (!query || !speciesId) return null;
      return {
        query,
        expected: speciesId,
        source,
        raw: row,
      };
    })
    .filter(Boolean)
    .filter((item, index, list) => {
      const key = `${item.source}::${normalizeText(item.query)}::${item.expected}`;
      return list.findIndex((other) => `${other.source}::${normalizeText(other.query)}::${other.expected}` === key) === index;
    });
}

export function buildHardCases() {
  return HARD_CASE_GROUPS.flatMap((group) =>
    group.cases.map((entry) => ({
      query: entry.query,
      expected: entry.expected,
      source: `hard:${group.id}`,
      groupId: group.id,
      groupTitle: group.title,
    })),
  );
}

export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function topKMatches(queryVec, docs, docVectors, k = 5) {
  const scored = docs.map((doc, index) => ({
    id: doc.id,
    score: cosineSimilarity(queryVec, docVectors[index]),
  }));
  scored.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return scored.slice(0, k);
}

function buildMetricBucket() {
  return {
    total: 0,
    hit1: 0,
    hit5: 0,
    rr: 0,
    latencyTotalMs: 0,
  };
}

function finalizeBucket(bucket) {
  return {
    recall_at_1: bucket.total > 0 ? Number(((bucket.hit1 / bucket.total) * 100).toFixed(1)) : 0,
    recall_at_5: bucket.total > 0 ? Number(((bucket.hit5 / bucket.total) * 100).toFixed(1)) : 0,
    mrr: bucket.total > 0 ? Number((bucket.rr / bucket.total).toFixed(4)) : 0,
    query_embed_avg_ms: bucket.total > 0 ? Number((bucket.latencyTotalMs / bucket.total).toFixed(1)) : 0,
  };
}

function initSourceBuckets() {
  return {
    [GRAPH_LABEL_SOURCE.REGIONAL_LABEL]: buildMetricBucket(),
    [GRAPH_LABEL_SOURCE.COMMON_NAMES]: buildMetricBucket(),
    hard: buildMetricBucket(),
  };
}

export function summarizeRanking(rows, { sourceBuckets = initSourceBuckets() } = {}) {
  const total = buildMetricBucket();
  const hardBuckets = new Map();
  for (const row of rows) {
    const bucketKey = row.source?.startsWith('hard:') ? 'hard' : row.source;
    if (!sourceBuckets[bucketKey]) sourceBuckets[bucketKey] = buildMetricBucket();
    const bucket = sourceBuckets[bucketKey];
    bucket.total += 1;
    total.total += 1;
    if (row.rank === 1) {
      bucket.hit1 += 1;
      total.hit1 += 1;
    }
    if (row.rank > 0 && row.rank <= 5) {
      bucket.hit5 += 1;
      total.hit5 += 1;
    }
    if (row.rank > 0) {
      bucket.rr += 1 / row.rank;
      total.rr += 1 / row.rank;
    }
    bucket.latencyTotalMs += row.latencyMs || 0;
    total.latencyTotalMs += row.latencyMs || 0;
    if (bucketKey === 'hard' && row.groupId) {
      if (!hardBuckets.has(row.groupId)) hardBuckets.set(row.groupId, buildMetricBucket());
      const hard = hardBuckets.get(row.groupId);
      hard.total += 1;
      if (row.rank === 1) hard.hit1 += 1;
      if (row.rank > 0 && row.rank <= 5) hard.hit5 += 1;
      if (row.rank > 0) hard.rr += 1 / row.rank;
      hard.latencyTotalMs += row.latencyMs || 0;
    }
  }
  const bySource = {};
  for (const [key, bucket] of Object.entries(sourceBuckets)) {
    bySource[key] = finalizeBucket(bucket);
  }
  const byHardGroup = {};
  for (const [groupId, bucket] of hardBuckets.entries()) {
    byHardGroup[groupId] = finalizeBucket(bucket);
  }
  return {
    overall: finalizeBucket(total),
    bySource,
    byHardGroup,
  };
}

export function detectProductionEmbedder() {
  const metaPath = join(ROOT, 'public', 'rag-embeddings.json');
  try {
    if (existsSync(metaPath)) {
      const raw = JSON.parse(readFileSync(metaPath, 'utf8'));
      const meta = raw && typeof raw === 'object' ? raw._meta : null;
      const model = pickFirstString(meta || {}, ['model', 'embed_model', 'embedder', 'rag_embed_model']);
      if (model) return { model, source: 'public/rag-embeddings.json._meta' };
    }
  } catch {
    // Fallback below.
  }

  try {
    const buildScript = readFileSync(join(ROOT, 'scripts', 'build-rag-embeddings.mjs'), 'utf8');
    const match = buildScript.match(/RAG_EMBED_MODEL\s*\|\|\s*'([^']+)'/);
    if (match) return { model: match[1], source: 'scripts/build-rag-embeddings.mjs default' };
  } catch {
    // Fallback below.
  }

  return { model: BASELINE_FALLBACK_MODEL, source: 'fallback' };
}

function buildDocMatrix(docs, vectors) {
  return docs.map((doc, index) => ({
    id: doc.id,
    vector: vectors[index],
  }));
}

export async function embedMany(model, texts, embedFn, { concurrency = 4 } = {}) {
  const uniqueTexts = Array.from(new Set(texts));
  const cache = new Map();
  const queue = uniqueTexts.slice();
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const text = queue.shift();
      if (text === undefined) break;
      const result = await embedFn(model, text);
      const vector = Array.isArray(result) ? result : result?.vector;
      cache.set(text, vector);
    }
  });
  await Promise.all(workers);
  return new Map(uniqueTexts.map((text) => [text, cache.get(text)]));
}

export async function evaluateModel({
  model,
  docs,
  queries,
  embedFn,
  concurrency = 4,
}) {
  const docTexts = docs.map((doc) => doc.text);
  const queryTexts = queries.map((query) => query.query);
  const docStart = performance.now();
  const docVectorsByText = await embedMany(model, docTexts, embedFn, { concurrency });
  const docEmbedMs = performance.now() - docStart;
  const queryStart = performance.now();
  const queryVectorsByText = await embedMany(model, queryTexts, embedFn, { concurrency });
  const queryEmbedMs = performance.now() - queryStart;

  const docVectors = buildDocMatrix(
    docs,
    docTexts.map((text) => docVectorsByText.get(text)),
  );

  const rows = [];
  for (const query of queries) {
    const qVec = queryVectorsByText.get(query.query);
    const searchStart = performance.now();
    const ranked = topKMatches(qVec, docs, docVectors.map((entry) => entry.vector), 5);
    const searchMs = performance.now() - searchStart;
    const rank = ranked.findIndex((hit) => hit.id === query.expected) + 1;
    rows.push({
      query: query.query,
      expected: query.expected,
      source: query.source,
      groupId: query.groupId || null,
      groupTitle: query.groupTitle || null,
      rank,
      top5: ranked.map((hit) => hit.id),
      latencyMs: searchMs,
    });
  }

  const summary = summarizeRanking(rows);
  return {
    model,
    docCount: docs.length,
    queryCount: queries.length,
    metrics: {
      ...summary.overall,
      hard_case_recall_at_1: summary.bySource.hard?.recall_at_1 || 0,
      hard_case_recall_at_5: summary.bySource.hard?.recall_at_5 || 0,
      hard_case_mrr: summary.bySource.hard?.mrr || 0,
      doc_embed_avg_ms: docs.length > 0 ? Number((docEmbedMs / docs.length).toFixed(1)) : 0,
      query_embed_avg_ms: queries.length > 0 ? Number((queryEmbedMs / queries.length).toFixed(1)) : 0,
    },
    bySource: summary.bySource,
    byHardGroup: summary.byHardGroup,
    rows,
  };
}

export function buildReportMarkdown({
  graph = DEFAULT_GRAPH,
  productionModel,
  productionSource,
  installedModels = [],
  results = [],
  dataset = { docs: [], queries: [], hardCases: [] },
  graphCounts = {},
  generatedAt = new Date().toISOString(),
}) {
  const lines = [];
  const baseline = results.find((result) => result.model === productionModel) || results[0] || null;
  const deltaOf = (value, base) => {
    if (!Number.isFinite(value) || !Number.isFinite(base)) return 'n/a';
    const delta = Number((value - base).toFixed(1));
    return `${delta >= 0 ? '+' : ''}${delta}`;
  };
  lines.push('# Bench de embedders');
  lines.push('');
  lines.push(`- Graph: ${graph}`);
  lines.push(`- Generated at: ${generatedAt}`);
  lines.push(`- Baseline production embedder: ${productionModel} (${productionSource})`);
  lines.push(`- Installed models: ${installedModels.length ? installedModels.join(', ') : 'none'}`);
  lines.push('');
  lines.push('## Dataset');
  lines.push('');
  lines.push(`- Species docs: ${dataset.docs.length}`);
  lines.push(`- Queries RegionalLabel: ${graphCounts[GRAPH_LABEL_SOURCE.REGIONAL_LABEL] || 0}`);
  lines.push(`- Queries nombres_comunes: ${graphCounts[GRAPH_LABEL_SOURCE.COMMON_NAMES] || 0}`);
  lines.push(`- Hard cases: ${dataset.hardCases.length}`);
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push(`- Baseline row: ${baseline ? baseline.model : 'n/a'}`);
  lines.push('');
  lines.push('| Model | recall@1 | delta | recall@5 | delta | MRR | delta | hard@1 | hard@5 | hard MRR | doc embed ms | query embed ms |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const result of results) {
    const m = result.metrics;
    const base = baseline?.metrics || {};
    lines.push(
      `| ${result.model} | ${m.recall_at_1}% | ${deltaOf(m.recall_at_1, base.recall_at_1)} | ${m.recall_at_5}% | ${deltaOf(m.recall_at_5, base.recall_at_5)} | ${m.mrr} | ${deltaOf(m.mrr, base.mrr)} | ${m.hard_case_recall_at_1}% | ${m.hard_case_recall_at_5}% | ${m.hard_case_mrr} | ${m.doc_embed_avg_ms} | ${m.query_embed_avg_ms} |`,
    );
  }
  lines.push('');
  lines.push('## Confusables');
  lines.push('');
  for (const group of HARD_CASE_GROUPS) {
    lines.push(`### ${group.title}`);
    lines.push('');
    lines.push('| Query | Expected |');
    lines.push('|---|---|');
    for (const item of group.cases) {
      lines.push(`| ${item.query} | ${item.expected} |`);
    }
    lines.push('');
  }
  lines.push('## Notes');
  lines.push('');
  lines.push('- The benchmark is read only.');
  lines.push('- If phase 2 does not fit, phase 1 is still valid and actionable.');
  lines.push('- No em dash is used in user facing text.');
  lines.push('');
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = {
    graph: DEFAULT_GRAPH,
    models: null,
    outputDir: DEFAULT_OUTPUT_DIR,
    reportPath: DEFAULT_REPORT_PATH,
    noHistory: false,
    concurrency: 4,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--graph') out.graph = argv[++i] || DEFAULT_GRAPH;
    else if (arg === '--models') out.models = (argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--output-dir') out.outputDir = argv[++i] || DEFAULT_OUTPUT_DIR;
    else if (arg === '--report-path') out.reportPath = argv[++i] || DEFAULT_REPORT_PATH;
    else if (arg === '--no-history') out.noHistory = true;
    else if (arg === '--concurrency') out.concurrency = Math.max(1, Number(argv[++i] || 4) || 4);
    else if (arg === '--help' || arg === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`Usage: node scripts/bench-embedders.mjs [options]

Options:
  --graph <name>         AGE graph name, default chagra_kg
  --models <a,b,c>       Comma separated model list
  --output-dir <path>    Output dir for the JSON artifact
  --report-path <path>   Markdown report path
  --concurrency <n>      Parallel embed calls per model
  --no-history           Do not write bench/history entry
`);
}

function resolvePsqlCommand(env = process.env) {
  if (env.CHAGRA_AGE_PSQL_COMMAND) {
    return { file: env.CHAGRA_AGE_PSQL_COMMAND, args: [], shell: true };
  }
  if (env.CHAGRA_KG_PSQL_CMD) {
    return { file: env.CHAGRA_KG_PSQL_CMD, args: [], shell: true };
  }
  try {
    const cmd = getDbCmd(env);
    return { file: cmd.file, args: cmd.args, shell: false };
  } catch {
    // Fallback to direct psql if the container env is not present.
  }
  const host = env.CHAGRA_KG_HOST || env.PGHOST || '127.0.0.1';
  const port = env.CHAGRA_KG_PORT || env.PGPORT || '5432';
  const user = env.CHAGRA_KG_USER || env.PGUSER || 'farmos';
  const db = env.CHAGRA_KG_DB || env.PGDATABASE || 'chagra_kg';
  const password = env.CHAGRA_KG_PASSWORD || env.PGPASSWORD || '';
  return {
    file: 'psql',
    args: ['-h', host, '-p', String(port), '-U', user, '-d', db],
    shell: false,
    env: { ...env, PGPASSWORD: password },
  };
}

function runPsql(sql, env = process.env) {
  const cmd = resolvePsqlCommand(env);
  const r = spawnSync(cmd.file, [...(cmd.args || []), '-At', '-F', '\t', '-c', sql], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    shell: Boolean(cmd.shell),
    env: cmd.env || env,
  });
  if (r.status !== 0) {
    const err = String(r.stderr || r.error || '').trim();
    throw new Error(err || `psql failed with code ${r.status}`);
  }
  return String(r.stdout || '');
}

function graphLiteral(graph) {
  return String(graph).replace(/'/g, "''");
}

function fetchSpeciesRows(graph, env) {
  const sql = `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT row
FROM cypher('${graphLiteral(graph)}', $$
  MATCH (s:Species)
  RETURN properties(s) AS row
  ORDER BY coalesce(s.id, s.slug, '')
$$) AS (row agtype);
`.trim();
  return parseGraphRows(runPsql(sql, env));
}

function fetchRegionalLabelRows(graph, env) {
  const sql = `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT row
FROM cypher('${graphLiteral(graph)}', $$
  MATCH (s:Species)--(r:RegionalLabel)
  WITH s, r, coalesce(r.nombre_comun, r.nombre, r.label, r.text, r.value, r.id) AS query
  WHERE query IS NOT NULL AND trim(query) <> ''
  RETURN {
    species_id: s.id,
    query: query,
    source: 'RegionalLabel'
  } AS row
  ORDER BY s.id, query
$$) AS (row agtype);
`.trim();
  return parseGraphRows(runPsql(sql, env));
}

function fetchCommonNameRows(graph, env) {
  const sql = `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT row
FROM cypher('${graphLiteral(graph)}', $$
  MATCH (s:Species)
  WITH s,
       CASE
         WHEN s.nombres_comunes IS NOT NULL THEN s.nombres_comunes
         WHEN s.nombre_comunes_regionales IS NOT NULL THEN s.nombre_comunes_regionales
         ELSE []
       END AS names
  UNWIND names AS common_name
  WITH s, common_name
  WHERE common_name IS NOT NULL AND trim(common_name) <> ''
  RETURN {
    species_id: s.id,
    query: common_name,
    source: 'nombres_comunes'
  } AS row
  ORDER BY s.id, common_name
$$) AS (row agtype);
`.trim();
  return parseGraphRows(runPsql(sql, env));
}

async function listInstalledModels() {
  const res = await fetch(OLLAMA_TAGS_URL);
  if (!res.ok) throw new Error(`Ollama tags HTTP ${res.status}`);
  const data = await res.json();
  return new Set((data.models || []).map((m) => m.name).filter(Boolean));
}

async function embedText(model, text) {
  const start = performance.now();
  const res = await fetch(OLLAMA_EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text, keep_alive: '0s' }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Ollama ${res.status}: ${body || res.statusText}`);
  }
  const data = await res.json();
  const embedding = data.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Embedding vacio');
  }
  return { vector: embedding, latencyMs: performance.now() - start };
}

async function embedManyWithTimings(model, texts, concurrency = 4) {
  const uniqueTexts = Array.from(new Set(texts));
  const vectors = new Map();
  const timings = [];
  const queue = uniqueTexts.slice();
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (queue.length > 0) {
      const text = queue.shift();
      if (text === undefined) break;
      const result = await embedText(model, text);
      vectors.set(text, result.vector);
      timings.push(result.latencyMs);
    }
  });
  await Promise.all(workers);
  return {
    vectors,
    avgMs: timings.length > 0 ? Number((timings.reduce((sum, value) => sum + value, 0) / timings.length).toFixed(1)) : 0,
    count: timings.length,
  };
}

export async function main(argv = process.argv.slice(2), { env = process.env } = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }

  const production = detectProductionEmbedder();
  const candidateModels = args.models && args.models.length > 0 ? args.models : DEFAULT_MODEL_CANDIDATES;
  const installed = await listInstalledModels();
  const models = candidateModels.filter((model) => installed.has(model));
  const skippedModels = candidateModels.filter((model) => !installed.has(model));

  if (models.length === 0) {
    throw new Error('No hay modelos de embedder instalados en Ollama para correr el bench.');
  }

  const speciesRows = fetchSpeciesRows(args.graph, env);
  const regionalRows = fetchRegionalLabelRows(args.graph, env);
  const commonRows = fetchCommonNameRows(args.graph, env);

  const docs = buildSpeciesDocs(speciesRows);
  const regionalQueries = buildQueryExamples(regionalRows, GRAPH_LABEL_SOURCE.REGIONAL_LABEL);
  const commonQueries = buildQueryExamples(commonRows, GRAPH_LABEL_SOURCE.COMMON_NAMES);
  const hardCases = buildHardCases().filter((item) => docs.some((doc) => doc.id === item.expected));

  const queryCounts = {
    [GRAPH_LABEL_SOURCE.REGIONAL_LABEL]: regionalQueries.length,
    [GRAPH_LABEL_SOURCE.COMMON_NAMES]: commonQueries.length,
  };
  const dataset = {
    docs,
    queries: [...regionalQueries, ...commonQueries],
    hardCases,
  };

  if (docs.length === 0) {
    throw new Error('No se pudieron construir docs de especie desde AGE.');
  }
  if (dataset.queries.length === 0) {
    throw new Error('No se pudieron construir queries reales desde AGE.');
  }

  console.log('[embedder-bench] graph:', args.graph);
  console.log('[embedder-bench] docs:', docs.length);
  console.log('[embedder-bench] queries:', dataset.queries.length, 'hard:', hardCases.length);
  console.log('[embedder-bench] production embedder:', production.model, `(${production.source})`);
  console.log('[embedder-bench] installed models:', models.join(', ') || '(none)');
  if (skippedModels.length > 0) {
    console.log('[embedder-bench] skipped models:', skippedModels.join(', '));
  }

  const results = [];
  for (const model of models) {
    console.log(`[embedder-bench] running ${model}`);
    const docEmbedding = await embedManyWithTimings(model, docs.map((doc) => doc.text), args.concurrency);
    const docEmbedAvgMs = docEmbedding.avgMs;
    const docVectors = docs.map((doc) => ({
      id: doc.id,
      vector: docEmbedding.vectors.get(doc.text),
    }));
    const docVectorArray = docVectors.map((doc) => doc.vector);

    const queryEmbedding = await embedManyWithTimings(model, dataset.queries.map((query) => query.query), args.concurrency);
    const queryEmbedAvgMs = queryEmbedding.avgMs;
    const allQueryVectors = new Map(dataset.queries.map((query) => [query.query, queryEmbedding.vectors.get(query.query)]));

    const scoredRows = [];
    for (const query of dataset.queries) {
      const qVec = allQueryVectors.get(query.query);
      const start = performance.now();
      const ranked = topKMatches(qVec, docs, docVectorArray, 5);
      const latencyMs = Number((performance.now() - start).toFixed(2));
      const rank = ranked.findIndex((hit) => hit.id === query.expected) + 1;
      scoredRows.push({
        query: query.query,
        expected: query.expected,
        source: query.source,
        groupId: query.groupId || null,
        rank,
        top5: ranked.map((hit) => hit.id),
        latencyMs,
      });
    }

    const summary = summarizeRanking(scoredRows);
    const metrics = {
      ...summary.overall,
      hard_case_recall_at_1: summary.bySource.hard?.recall_at_1 || 0,
      hard_case_recall_at_5: summary.bySource.hard?.recall_at_5 || 0,
      hard_case_mrr: summary.bySource.hard?.mrr || 0,
      doc_embed_avg_ms: docEmbedAvgMs,
      query_embed_avg_ms: queryEmbedAvgMs,
    };

    results.push({
      model,
      metrics,
      bySource: summary.bySource,
      byHardGroup: summary.byHardGroup,
      scoredRows,
      docCount: docs.length,
      queryCount: dataset.queries.length,
      hardCount: hardCases.length,
    });
  }

  const output = {
    bench: 'embedder-bench',
    graph: args.graph,
    production_embedder: production,
    installed_models: models,
    skipped_models: skippedModels,
    dataset: {
      docs: docs.length,
      queries: dataset.queries.length,
      regional_label_queries: queryCounts[GRAPH_LABEL_SOURCE.REGIONAL_LABEL],
      nombres_comunes_queries: queryCounts[GRAPH_LABEL_SOURCE.COMMON_NAMES],
      hard_cases: hardCases.length,
    },
    results,
    generated_at: new Date().toISOString(),
  };

  ensureDir(args.outputDir);
  const dateStr = new Date().toISOString().slice(0, 10);
  const outputPath = join(args.outputDir, `embedder-bench-${dateStr}.json`);
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  const report = buildReportMarkdown({
    graph: args.graph,
    productionModel: production.model,
    productionSource: production.source,
    installedModels: models,
    results,
    dataset,
    graphCounts: queryCounts,
    generatedAt: output.generated_at,
  });
  ensureDir(dirname(args.reportPath));
  writeFileSync(args.reportPath, `${report}\n`, 'utf8');

  if (!args.noHistory) {
    for (const result of results) {
      const passCount = result.scoredRows.filter((row) => row.rank > 0 && row.rank <= 5).length;
      writeHistoryRecord(buildHistoryRecord({
        bench: 'embedder-bench',
        model: result.model,
        config: args.graph,
        commit: gitShortSha(),
        metrics: result.metrics,
        passCount,
        failCount: result.queryCount - passCount,
        notes: `graph=${args.graph} docs=${result.docCount} queries=${result.queryCount}`,
      }));
    }
  }

  console.log('[embedder-bench] wrote:', outputPath);
  console.log('[embedder-bench] report:', args.reportPath);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then((code) => {
    process.exitCode = code;
  }).catch((err) => {
    console.error('[embedder-bench] FATAL:', err.message);
    process.exitCode = 1;
  });
}
