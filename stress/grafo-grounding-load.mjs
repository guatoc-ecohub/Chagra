#!/usr/bin/env node
/**
 * stress/grafo-grounding-load.mjs — Frente 2: grafo/grounding bajo volumen.
 *
 * Dos modos, seleccionables con MODE:
 *
 *   - sidecar (default): POST concurrente a {SIDECAR_URL}/resolve-entities —
 *     la ruta REAL de grounding en prod (src/services/sidecarClient.js
 *     #resolveEntities), que internamente resuelve contra Apache AGE
 *     (`chagra_kg`). Mide p95/p99 + cuántas respuestas llegan con
 *     `age_available:false` (degradación del grafo bajo carga) o con
 *     `entities: []` pese a mencionar una especie conocida.
 *
 *   - psql: Cypher CRUDO y concurrente contra `chagra_kg` vía `psql`
 *     (consultas adaptadas de scripts/age-queries-example.sql). Requiere el
 *     binario `psql` en PATH y credenciales Postgres en el entorno (PGHOST/
 *     PGPORT/PGUSER/PGDATABASE/PGPASSWORD o ~/.pgpass) — esto NO existe en
 *     el repo frontend por diseño (el PWA no tiene credenciales de DB), así
 *     que este modo es para correr DESDE el host que sí tiene acceso a
 *     postgres-farm (ver Chagra-strategy/ops/INFRA_FACTS.md). Si `psql` no
 *     está disponible, el script avisa y sale limpio (no revienta).
 *
 * USO:
 *   node stress/grafo-grounding-load.mjs                       # sidecar, defaults
 *   MODE=psql PGHOST=localhost PGDATABASE=chagra_kg node stress/grafo-grounding-load.mjs
 *   DRY_RUN=1 node stress/grafo-grounding-load.mjs              # sin red/DB real
 */
import { performance } from 'node:perf_hooks';
import { execFile, execFileSync } from 'node:child_process';
import { runPool } from './lib/pool.mjs';
import { buildReport, printReport, writeReportJson, normalizeResults } from './lib/report.mjs';
import { getSidecarToken } from './lib/sidecarAuth.mjs';
import { makeMockFetch } from './lib/mockFetch.mjs';

const MODE = process.env.MODE || 'sidecar'; // sidecar | psql
const SIDECAR_URL = (process.env.SIDECAR_URL || 'http://localhost:7880').replace(/\/+$/, '');
const SIDECAR_TOKEN = process.env.SIDECAR_TOKEN || getSidecarToken();
const TOTAL = Number(process.env.TOTAL || 60);
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15_000);
const RAMP_MS = Number(process.env.RAMP_MS || 0);
const DRY_RUN = process.env.DRY_RUN === '1';
const OUT_JSON = process.env.OUT_JSON || '';
const SAVE_OUTCOMES = process.env.SAVE_OUTCOMES === '1';
const AGE_GRAPH = process.env.AGE_GRAPH || 'chagra_kg';

const thresholds = {
  p95Ms: process.env.P95_THRESHOLD_MS ? Number(process.env.P95_THRESHOLD_MS) : undefined,
  p99Ms: process.env.P99_THRESHOLD_MS ? Number(process.env.P99_THRESHOLD_MS) : undefined,
  maxErrorRate: process.env.MAX_ERROR_RATE ? Number(process.env.MAX_ERROR_RATE) : undefined,
  max503Rate: process.env.MAX_503_RATE ? Number(process.env.MAX_503_RATE) : undefined,
};

// Mensajes que mencionan entidades reales del catálogo — ejercitan la ruta
// completa resolveEntities → AGE MATCH sobre Species/Pest/Biopreparado.
const GROUNDING_PROMPTS = [
  'Tengo café Castillo a 1800 msnm, ¿qué le siembro al lado?',
  'El aguacate Hass se me está llenando de trips, ¿qué controlador uso?',
  'Quiero sembrar cacao y plátano juntos, ¿son compatibles?',
  '¿La uchuva y la mora se pueden asociar en el mismo lote?',
  'Tengo yuca con gusano cachón, ¿qué biopreparado sirve?',
  '¿El fique se da en clima frío de páramo?',
  'Necesito controlar la roya del café sin agroquímicos.',
  '¿Qué compañeras tiene el maíz en la milpa tradicional?',
  '¿El cítrico y el aguacate compiten por nutrientes?',
  'Mi cultivo de quinua tiene pulgón, ¿cómo lo trato?',
];

// ── Modo sidecar (HTTP, /resolve-entities) ──────────────────────────────
async function callResolveEntities(prompt, { fetchImpl }) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (SIDECAR_TOKEN) headers['X-Chagra-Token'] = SIDECAR_TOKEN;
    const res = await fetchImpl(`${SIDECAR_URL}/resolve-entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: prompt }),
      signal: controller.signal,
    });
    const latencyMs = performance.now() - start;
    if (!res.ok) return { latencyMs, status: res.status, ok: false, errorKind: `http_${res.status}` };
    const data = await res.json();
    const entities = Array.isArray(data.entities) ? data.entities : [];
    return {
      latencyMs,
      status: res.status,
      ok: true,
      errorKind: null,
      meta: { entitiesCount: entities.length, ageAvailable: data.age_available !== false },
    };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const kind = err?.name === 'AbortError' ? 'timeout' : 'network_error';
    return { latencyMs, status: kind, ok: false, errorKind: `${kind}: ${String(err?.message || err).slice(0, 80)}` };
  } finally {
    clearTimeout(timer);
  }
}

// ── Modo psql (Cypher crudo contra AGE) ─────────────────────────────────
// Adaptadas de scripts/age-queries-example.sql (Q1/Q2 simplificadas) —
// single-hop y multi-hop, representativas de lo que dispara resolveEntities
// puertas adentro.
const CYPHER_QUERIES = [
  {
    name: 'single-hop-piso-termico',
    body: `MATCH (sp:Species)-[:GROWS_IN]->(:PisoTermico {id: 'templado'})
      RETURN sp.id AS species_id
      LIMIT 50`,
    columns: '(species_id agtype)',
  },
  {
    name: 'multi-hop-compatibles',
    body: `MATCH (a:Species)-[:COMPATIBLE_WITH]->(b:Species)
      WHERE a.id < b.id
      RETURN a.id AS a, b.id AS b
      LIMIT 100`,
    columns: '(a agtype, b agtype)',
  },
  {
    name: 'pest-controllers',
    body: `MATCH (bp:Biopreparado)-[:CONTROLS]->(p:Pest)
      RETURN bp.id AS biopreparado, p.id AS plaga
      LIMIT 50`,
    columns: '(biopreparado agtype, plaga agtype)',
  },
];

function psqlArgs() {
  const args = [];
  if (process.env.PGHOST) args.push('-h', process.env.PGHOST);
  if (process.env.PGPORT) args.push('-p', process.env.PGPORT);
  if (process.env.PGUSER) args.push('-U', process.env.PGUSER);
  args.push('-d', process.env.PGDATABASE || AGE_GRAPH);
  args.push('-v', 'ON_ERROR_STOP=1', '-X', '-q');
  return args;
}

function checkPsqlAvailable() {
  try {
    execFileSync('psql', ['--version'], { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function runPsqlCypher(query, { timeoutMs }) {
  return new Promise((resolve) => {
    const start = performance.now();
    const sql = [
      `LOAD 'age';`,
      `SET search_path = ag_catalog, "$user", public;`,
      `SELECT * FROM cypher('${AGE_GRAPH}', $$ ${query.body} $$) AS ${query.columns};`,
    ].join(' ');
    const child = execFile(
      'psql',
      [...psqlArgs(), '-c', sql],
      { timeout: timeoutMs, killSignal: 'SIGKILL' },
      (error, _stdout, stderr) => {
        const latencyMs = performance.now() - start;
        if (!error) {
          resolve({ latencyMs, status: 'ok', ok: true, errorKind: null });
          return;
        }
        const kind = error.killed ? 'timeout' : 'psql_error';
        resolve({
          latencyMs,
          status: kind,
          ok: false,
          errorKind: `${kind}: ${String(stderr || error.message).split('\n')[0].slice(0, 100)}`,
        });
      },
    );
    // Referencia child para evitar warning de var no usada — no requiere acción extra.
    void child;
  });
}

async function main() {
  console.log(`[stress] grafo-grounding-load MODE=${MODE} total=${TOTAL} concurrency=${CONCURRENCY} dryRun=${DRY_RUN}`);

  if (MODE === 'psql' && !DRY_RUN) {
    if (!checkPsqlAvailable()) {
      console.error(
        '[stress] psql no está disponible en PATH. Este modo debe correrse desde el host con acceso a ' +
          'postgres-farm (ver Chagra-strategy/ops/INFRA_FACTS.md). Usa MODE=sidecar para probar el grounding ' +
          'vía HTTP, o DRY_RUN=1 para validar solo la sintaxis del script.',
      );
      process.exitCode = 3;
      return;
    }
  }

  const fetchImpl = DRY_RUN ? makeMockFetch() : fetch;
  if (DRY_RUN) console.log('[stress] DRY_RUN=1 — usando backend simulado (sidecar) o psql simulado, sin tocar AGE real.');

  const t0 = performance.now();
  let metas = [];
  let poolResults;

  if (MODE === 'psql') {
    poolResults = await runPool({
      total: TOTAL,
      concurrency: CONCURRENCY,
      rampUpMs: RAMP_MS,
      worker: async (i) => {
        const query = CYPHER_QUERIES[i % CYPHER_QUERIES.length];
        if (DRY_RUN) {
          // Reusa el mock HTTP como generador de latencia/errores sintéticos
          // sin invocar psql de verdad.
          const start = performance.now();
          const r = await fetchImpl(`http://mock/psql/${query.name}`, { signal: AbortSignal.timeout(TIMEOUT_MS) }).catch((err) => ({
            ok: false,
            status: err?.name === 'AbortError' ? 'timeout' : 'network_error',
            json: async () => ({}),
          }));
          const latencyMs = performance.now() - start;
          return { latencyMs, status: r.status ?? (r.ok ? 'ok' : 'error'), ok: Boolean(r.ok), errorKind: r.ok ? null : 'dry_run_simulated' };
        }
        return runPsqlCypher(query, { timeoutMs: TIMEOUT_MS });
      },
      onProgress: (done, total) => process.stdout.write(`\r[stress] psql cypher: ${done}/${total}`),
    });
  } else {
    poolResults = await runPool({
      total: TOTAL,
      concurrency: CONCURRENCY,
      rampUpMs: RAMP_MS,
      worker: (i) => callResolveEntities(GROUNDING_PROMPTS[i % GROUNDING_PROMPTS.length], { fetchImpl }),
      onProgress: (done, total) => process.stdout.write(`\r[stress] resolve-entities: ${done}/${total}`),
    });
    metas = poolResults.map((r) => (r.ok ? r.value?.meta : null)).filter(Boolean);
  }
  process.stdout.write('\n');

  const durationMs = performance.now() - t0;
  const outcomes = normalizeResults(poolResults);
  const report = buildReport({
    title: `Grafo/grounding — ${MODE === 'psql' ? 'Cypher directo (psql)' : 'sidecar /resolve-entities'}`,
    durationMs,
    outcomes,
    thresholds,
  });
  printReport(report);

  if (metas.length > 0) {
    const ageDown = metas.filter((m) => m.ageAvailable === false).length;
    const zeroEntities = metas.filter((m) => m.entitiesCount === 0).length;
    console.log(`\n  Señal AGE (solo modo sidecar):`);
    console.log(`    age_available=false: ${ageDown}/${metas.length} respuestas exitosas`);
    console.log(`    entities=[] pese a mención de especie/plaga conocida: ${zeroEntities}/${metas.length}`);
    if (ageDown > 0) {
      console.log('    -> el grafo AGE se está degradando bajo esta carga; bajar CONCURRENCY o revisar postgres-farm.');
    }
  }

  if (OUT_JSON || SAVE_OUTCOMES) {
    const path = writeReportJson(report, { outPath: OUT_JSON || undefined, outcomes: SAVE_OUTCOMES ? outcomes : undefined });
    console.log(`  reporte guardado en: ${path}`);
  }

  if (report.checks.length > 0 && !report.allChecksPassed) process.exitCode = 1;
}

main().catch((err) => {
  console.error('[stress] error fatal:', err);
  process.exitCode = 1;
});
