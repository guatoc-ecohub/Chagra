#!/usr/bin/env node
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHistoryRecord, writeHistoryRecord } from '../bench/lib/history.mjs';
import {
  aggregateScores,
  auditGraphParity,
  buildQuestions,
  collectCatalogRelations,
  KEY_RELATIONS,
  loadCatalog,
  parseAgeRows,
  scoreResponse,
  selectCatalogPath,
  selectImportantSpecies,
  rotateSpeciesBySeed,
  slugText,
} from './lib/bench-agro-rotatorio.mjs';
import {
  DEFAULT_SIDECAR_URL,
  buildEnrichedSystemPrompt,
  generateChat,
  getSidecarToken,
  resolveEntities,
} from './lib/bench-sidecar.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(__dirname, '..');
const MODEL = process.env.AGRO_ROTATORIO_MODEL || 'granite3.3:8b';
const SEED_DATE = process.env.SEED || new Date().toISOString().slice(0, 10);
const QUESTION_COUNT = Number.parseInt(process.env.AGRO_ROTATORIO_QUESTIONS || '50', 10);
const QUESTION_TIMEOUT_MS = Number.parseInt(process.env.AGRO_ROTATORIO_TIMEOUT_MS || '45000', 10);
const SIDECAR_URL = process.env.SIDECAR_URL || DEFAULT_SIDECAR_URL;

function getCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: ROOT_DIR }).toString().trim();
  } catch {
    return '';
  }
}

function buildAgeQuery() {
  const relList = KEY_RELATIONS.map((r) => `'${r}'`).join(', ');
  return [
    'LOAD \'age\';',
    'SET search_path = ag_catalog, "$user", public;',
    `SELECT * FROM cypher('chagra_kg', $$`,
    '  MATCH (s:Species)-[r]->(t)',
    `  WHERE type(r) IN [${relList}]`,
    '  RETURN s.id, type(r), t.id',
    '$$) AS (species_id agtype, rel_type agtype, target_id agtype);',
  ].join('\n');
}

function runPsqlQuery(sql) {
  if (process.env.CHAGRA_KG_PSQL_CMD) {
    return execSync(process.env.CHAGRA_KG_PSQL_CMD, {
      input: sql,
      encoding: 'utf-8',
      timeout: 30_000,
      shell: '/bin/bash',
    });
  }

  const env = {
    ...process.env,
    PGHOST: process.env.CHAGRA_KG_HOST || process.env.PGHOST || '127.0.0.1',
    PGPORT: process.env.CHAGRA_KG_PORT || process.env.PGPORT || '5432',
    PGUSER: process.env.CHAGRA_KG_USER || process.env.PGUSER || 'farmos',
    PGDATABASE: process.env.CHAGRA_KG_DB || process.env.PGDATABASE || 'chagra_kg',
    PGPASSWORD: process.env.CHAGRA_KG_PASSWORD || process.env.PGPASSWORD || '',
  };
  return execFileSync('psql', ['-X', '-q', '-A', '-t', '-F', '\t'], {
    input: sql,
    encoding: 'utf-8',
    timeout: 30_000,
    env,
  });
}

function loadGraphRelations(catalog) {
  try {
    const stdout = runPsqlQuery(buildAgeQuery());
    const relations = parseAgeRows(stdout);
    if (relations.size > 0) {
      return { source: 'apache-age', relations, warning: null };
    }
    return {
      source: 'catalog-fallback',
      relations: collectCatalogRelations(catalog.species),
      warning: 'AGE no devolvio relaciones clave; se uso fallback del catalogo.',
    };
  } catch (err) {
    return {
      source: 'catalog-fallback',
      relations: collectCatalogRelations(catalog.species),
      warning: `AGE no disponible (${String(err.message).slice(0, 140)}); se uso fallback del catalogo.`,
    };
  }
}

function buildKnownEntities(catalog, relations) {
  const out = new Set();
  for (const sp of catalog.species) {
    out.add(sp.id);
    out.add(slugText(sp.nombre_comun || ''));
    out.add(slugText(sp.nombre_cientifico || ''));
  }
  for (const bp of catalog.biopreparados) {
    out.add(bp.id);
    out.add(slugText(bp.nombre || bp.nombre_comun || ''));
  }
  for (const rels of relations.values()) {
    for (const rel of KEY_RELATIONS) {
      for (const target of rels[rel] || []) out.add(target);
    }
  }
  return out;
}

function groundingPrompt(question) {
  const g = question.grounding;
  return [
    'Eres el agente agroecologico de Chagra para Colombia.',
    'Responde solo con entidades presentes en el grounding. Si falta informacion, dilo.',
    `Especie: ${g.species_id} (${g.species_name})`,
    `Nombre cientifico: ${g.scientific_name || 'sin dato'}`,
    `Plagas o problemas registrados: ${g.targets.pests.concat(g.targets.susceptible).join(', ') || 'sin dato'}`,
    `Biopreparados registrados: ${g.targets.biopreparados.join(', ') || 'sin dato'}`,
  ].join('\n');
}

async function callSidecarAgent(question, token) {
  const entities = await resolveEntities(question.prompt, { sidecarUrl: SIDECAR_URL, token, timeoutMs: 5_000 });
  if (!entities.entities?.length) {
    return { ok: false, unauthorized: !token, response: '', latency_ms: 0 };
  }
  const generated = await generateChat({
    model: MODEL,
    systemPrompt: buildEnrichedSystemPrompt(entities.entities),
    userPrompt: question.prompt,
    temperature: 0.1,
    seed: 42,
    maxTokens: 180,
    timeoutMs: QUESTION_TIMEOUT_MS,
  });
  return { ok: true, unauthorized: false, ...generated };
}

async function callOllamaFallback(question) {
  const generated = await generateChat({
    model: MODEL,
    systemPrompt: groundingPrompt(question),
    userPrompt: question.prompt,
    temperature: 0.1,
    seed: 42,
    maxTokens: 180,
    timeoutMs: QUESTION_TIMEOUT_MS,
  });
  return { ok: true, unauthorized: true, ...generated };
}

function ollamaAvailable() {
  const r = spawnSync('bash', ['-lc', 'curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null'], {
    stdio: 'ignore',
  });
  return r.status === 0;
}

async function main() {
  const catalog = loadCatalog(ROOT_DIR, selectCatalogPath(ROOT_DIR));
  const graph = loadGraphRelations(catalog);
  const graphAudit = auditGraphParity(catalog.species, graph.relations);
  const important = selectImportantSpecies(catalog.species, 100);
  const rotated = rotateSpeciesBySeed(important, SEED_DATE, QUESTION_COUNT);
  const questions = buildQuestions(rotated, graph.relations, QUESTION_COUNT);
  const knownEntities = buildKnownEntities(catalog, graph.relations);
  const canGenerate = ollamaAvailable();
  const sidecarToken = getSidecarToken();
  const useSidecar = Boolean(sidecarToken);
  const results = [];

  console.log(`[agro-rotatorio] seed=${SEED_DATE} catalog=${catalog.rel} species=${catalog.species.length}`);
  console.log(`[agro-rotatorio] graph_source=${graph.source}`);
  if (graph.warning) console.log(`[agro-rotatorio] aviso=${graph.warning}`);
  console.log(`[agro-rotatorio] grupos=${graphAudit.groups.length} desconexiones=${graphAudit.disconnections.length}`);
  console.log(`[agro-rotatorio] preguntas=${questions.length} model=${canGenerate ? MODEL : 'sin-ollama'} sidecar=${useSidecar ? 'token' : 'sin-token'}`);

  for (const [idx, question] of questions.entries()) {
    let generated = { ok: false, unauthorized: false, response: '', latency_ms: 0 };
    if (canGenerate) {
      try {
        generated = useSidecar
          ? await callSidecarAgent(question, sidecarToken)
          : { ok: false, unauthorized: true, response: '', latency_ms: 0 };
        if (!generated.ok) generated = await callOllamaFallback(question);
      } catch (err) {
        console.log(`[agro-rotatorio] fallback ${question.id}: ${String(err.message).slice(0, 90)}`);
        try {
          generated = await callOllamaFallback(question);
        } catch (fallbackErr) {
          console.log(`[agro-rotatorio] sin respuesta ${question.id}: ${String(fallbackErr.message).slice(0, 90)}`);
        }
      }
    }
    const score = scoreResponse({ response: generated.response, question, knownEntities });
    results.push({
      id: question.id,
      prompt: question.prompt,
      species_id: question.species_id,
      response: generated.response,
      source: generated.unauthorized ? 'ollama-grounded-fallback' : (generated.ok ? 'sidecar-agent' : 'no-generation'),
      latency_ms: Number((generated.latency_ms || 0).toFixed(1)),
      score,
    });
    if ((idx + 1) % 10 === 0 || idx + 1 === questions.length) {
      console.log(`[agro-rotatorio] progreso=${idx + 1}/${questions.length}`);
    }
  }

  const metrics = aggregateScores(results, graphAudit);
  const failCount = graphAudit.disconnections.length + metrics.hallucinations;
  const passCount = Math.max(0, questions.length - results.filter((r) => !r.score.grounded || r.score.hallucinated.length > 0).length);
  const notes = [
    `seed=${SEED_DATE}`,
    `graph_source=${graph.source}`,
    graph.source !== 'apache-age'
      ? 'Para fidelidad total use sidecar con token y AGE disponible via CHAGRA_KG_* o CHAGRA_KG_PSQL_CMD.'
      : 'AGE consultado directamente.',
  ].join(' | ');

  const record = buildHistoryRecord({
    bench: 'agro-rotatorio',
    model: canGenerate ? MODEL : null,
    config: 'daily-rotating',
    commit: getCommit(),
    metrics,
    passCount,
    failCount,
    notes,
  });
  const historyPath = writeHistoryRecord(record);

  console.log('[agro-rotatorio] metricas=' + JSON.stringify(metrics));
  if (graphAudit.disconnections.length > 0) {
    console.log('[agro-rotatorio] primeras desconexiones:');
    for (const d of graphAudit.disconnections.slice(0, 10)) {
      console.log(`  - ${d.species_id} falta ${d.relation}:${d.target} presente_en=${d.present_in.join(',')}`);
    }
  }
  const hallucinatedRows = results.filter((r) => r.score.hallucinated.length > 0);
  if (hallucinatedRows.length > 0) {
    console.log('[agro-rotatorio] primeras alucinaciones:');
    for (const r of hallucinatedRows.slice(0, 10)) {
      console.log(`  - ${r.id}: ${r.score.hallucinated.join(', ')}`);
    }
  }
  console.log(`[agro-rotatorio] historial=${historyPath}`);
}

main().catch((err) => {
  console.error('[agro-rotatorio] FATAL:', err);
  process.exit(1);
});
