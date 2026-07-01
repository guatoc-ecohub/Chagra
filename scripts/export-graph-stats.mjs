#!/usr/bin/env node
/**
 * scripts/export-graph-stats.mjs
 * ================================================================
 * DOCUMENTA (y ejecuta) cómo se regenera `src/data/graph-stats-snapshot.json`
 * a partir del grafo de conocimiento Apache AGE `chagra_kg` VIVO.
 *
 * Este script SOLO corre donde hay acceso a `postgres-farm` (host `alpha` —
 * ver Chagra-strategy/ops/INFRA_FACTS.md §2). El build de Chagra (Vite,
 * CI, deploy) NUNCA lo ejecuta: `scripts/gen-chagra-stats.mjs` (el que sí
 * corre en cada build) solo LEE el snapshot que este script produce, nunca
 * la base de datos directamente. Correr este script es un paso manual /
 * periódico aparte, igual que `scripts/snapshot-grafo-crecimiento.mjs` (su
 * primo — ese alimenta el timeline HYTA, este alimenta chagra-stats.json).
 *
 * Qué mide (definiciones — anti-invento, ver auditoría 2026-06-28 en
 * Chagra-strategy/audit/2026-06-28-triple-auditoria-mano-3ejes.md)
 * ------------------------------------------------------------------
 *   - nodos / aristas       : conteo total de vértices y relaciones.
 *   - especies              : nodos :Species (corpus FULL del grafo — más
 *                             grande que catalogo.especies porque incluye
 *                             contenido chagra-pro no shipeado en el
 *                             subset OSS público).
 *   - aristas_por_tipo      : conteo de relaciones agrupado por `type(r)`.
 *   - controls              : aristas (:Biopreparado)-[:CONTROLS]->(:Pest).
 *                             `con_doi` = cuántas traen `doi` no vacío
 *                             (el "moat" de anti-alucinación verificado).
 *   - mip_plagas            : nodos :Pest. `con_mip` = cuántos traen A LA
 *                             VEZ `umbral_accion` Y `control_biologico`
 *                             pobladas (MIP completo — umbral económico +
 *                             control biológico, no solo nombre de plaga).
 *
 * Acceso a AGE — sin credenciales hardcodeadas (repo público, SOP §2)
 * ---------------------------------------------------------------------
 * Mismo patrón que scripts/audit-milpa-citations.mjs /
 * scripts/validate-graph-parity.mjs: por defecto
 * `sudo podman exec -i postgres-farm psql -U farmos -d chagra_kg`;
 * override total con `CHAGRA_AGE_PSQL_COMMAND` (por si se corre desde un
 * host con `psql` directo en PATH, p.ej. `psql -h 127.0.0.1 -U farmos -d
 * chagra_kg`, con `PGPASSWORD` puesto por el caller — nunca en código).
 *
 * IMPORTANTE — nombres de propiedad asumidos, verificar antes de confiar
 * ------------------------------------------------------------------------
 * Este repo (público) no tiene el loader que escribió `umbral_accion` /
 * `control_biologico` en los nodos :Pest (ese batch de enriquecimiento
 * vive en Chagra-strategy / se corrió directo contra `chagra_kg`). Si al
 * correr este script en vivo el conteo de `mip_plagas.con_mip` sale en 0
 * cuando se esperaba ~163, verificar el nombre real de las propiedades con:
 *   MATCH (p:Pest) RETURN keys(p) LIMIT 5
 * y ajustar MIP_PROPS abajo.
 *
 * Modos de ejecución (mismo patrón que audit-milpa-citations.mjs)
 * -------------------------------------------------------------------
 *   1. LIVE (default): consulta chagra_kg vía psql y --write actualiza
 *      src/data/graph-stats-snapshot.json.
 *   2. OFFLINE (--from-dump FILE): parsea un dump JSON
 *      `{ nodeCount, edgeCount, speciesCount, edgesByType: [[tipo,n],...],
 *         controlsRows: [{doi, verificadoOpenalex}], pestRows: [{umbralAccion,
 *         controlBiologico}] }`. Es el modo que usan los tests (no toca DB).
 *
 * Uso
 * ---
 *   node scripts/export-graph-stats.mjs --print-sql        # solo el SQL, no ejecuta
 *   node scripts/export-graph-stats.mjs --dry-run           # ejecuta, imprime, no escribe
 *   node scripts/export-graph-stats.mjs --write              # ejecuta y escribe el snapshot
 *   node scripts/export-graph-stats.mjs --write --date 2026-07-05
 *   CHAGRA_AGE_PSQL_COMMAND="psql -h 127.0.0.1 -U farmos -d chagra_kg" \
 *     node scripts/export-graph-stats.mjs --write
 * ================================================================
 */

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DEFAULT_GRAPH = 'chagra_kg';
export const SNAPSHOT_PATH = join(ROOT, 'src/data/graph-stats-snapshot.json');

// Propiedades asumidas de :Pest para MIP completo — ver nota arriba.
export const MIP_PROPS = { umbral: 'umbral_accion', control: 'control_biologico' };

// =============================================================================
// SQL builders (puros — no tocan la DB)
// =============================================================================

const PREAMBLE = "LOAD 'age';\nSET search_path = ag_catalog, \"$user\", public;\n";

/** SQL para un conteo simple `MATCH ... RETURN count(*)`. */
export function buildCountSql(matchReturn, graph = DEFAULT_GRAPH) {
  return `${PREAMBLE}SELECT count::text FROM cypher('${graph}', $$ ${matchReturn} $$) AS (count agtype);\n`;
}

export function buildNodeCountSql(graph = DEFAULT_GRAPH) {
  return buildCountSql('MATCH (n) RETURN count(n)', graph);
}
export function buildEdgeCountSql(graph = DEFAULT_GRAPH) {
  return buildCountSql('MATCH ()-[r]->() RETURN count(r)', graph);
}
export function buildSpeciesCountSql(graph = DEFAULT_GRAPH) {
  return buildCountSql('MATCH (s:Species) RETURN count(s)', graph);
}

/**
 * Aristas agrupadas por tipo. Usa agregación implícita de openCypher
 * (`RETURN type(r), count(*)`), soportada por AGE. Si la versión instalada
 * no la soporta, ver bench-grafo-cobertura.mjs para el patrón alternativo
 * (enumerar tipos conocidos con MATCH ()-[r:TIPO]->() RETURN count(r) uno
 * por uno) y adaptar acá.
 */
export function buildEdgesByTypeSql(graph = DEFAULT_GRAPH) {
  return `${PREAMBLE}SELECT tipo::text, n::text FROM cypher('${graph}', $$
  MATCH ()-[r]->()
  RETURN type(r) AS tipo, count(*) AS n
$$) AS (tipo agtype, n agtype)
ORDER BY tipo;\n`;
}

/** Filas de aristas CONTROLS con sus propiedades de citación. */
export function buildControlsRowsSql(graph = DEFAULT_GRAPH) {
  return `${PREAMBLE}SELECT doi::text, verificado::text FROM cypher('${graph}', $$
  MATCH (:Biopreparado)-[r:CONTROLS]->(:Pest)
  RETURN r.doi AS doi, r.verificado_openalex AS verificado
$$) AS (doi agtype, verificado agtype);\n`;
}

/** Filas de nodos Pest con las propiedades MIP (ver MIP_PROPS). */
export function buildPestRowsSql(graph = DEFAULT_GRAPH) {
  return `${PREAMBLE}SELECT umbral::text, control::text FROM cypher('${graph}', $$
  MATCH (p:Pest)
  RETURN p.${MIP_PROPS.umbral} AS umbral, p.${MIP_PROPS.control} AS control
$$) AS (umbral agtype, control agtype);\n`;
}

// =============================================================================
// Parsing (puro)
// =============================================================================

function stripAgtype(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw.replace(/^"|"$/g, '');
}

function truthyText(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'false' && s !== 'null' && s !== '0' && s !== 'no';
}

/** Parsea salida `psql -At -F '\t'` de una sola columna a un entero. */
export function parseSingleCount(stdout) {
  const line = String(stdout || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(LOAD|SET|\(\d+ rows?\))$/.test(l))
    .pop();
  if (line === undefined) {
    throw new Error(`parseSingleCount: sin resultado numérico. Salida cruda:\n${stdout}`);
  }
  const n = Number(stripAgtype(line));
  if (!Number.isFinite(n)) {
    throw new Error(`parseSingleCount: valor no numérico (${line}). Salida cruda:\n${stdout}`);
  }
  return n;
}

/** Parsea filas tab-separated de N columnas (ignora ruido psql). */
export function parseRows(stdout, nCols) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(LOAD|SET|\(\d+ rows?\))$/.test(l))
    .map((l) => l.split('\t').map(stripAgtype))
    .filter((parts) => parts.length === nCols);
}

// =============================================================================
// Agregación (pura) — misma lógica sea el dato LIVE u OFFLINE (--from-dump)
// =============================================================================

/** @param {Array<[string,string]>} rows filas [tipo, n] ya parseadas */
export function computeEdgesByType(rows) {
  const out = {};
  for (const [tipo, n] of rows) {
    if (!tipo) continue;
    out[tipo] = Number(n) || 0;
  }
  return out;
}

/** @param {Array<{doi:*, verificadoOpenalex:*}>} rows */
export function computeControlsStats(rows) {
  const total = rows.length;
  const conDoi = rows.filter((r) => truthyText(r.doi)).length;
  return { con_doi: conDoi, total };
}

/** @param {Array<{umbralAccion:*, controlBiologico:*}>} rows */
export function computeMipStats(rows) {
  const total = rows.length;
  const conMip = rows.filter((r) => truthyText(r.umbralAccion) && truthyText(r.controlBiologico)).length;
  return { con_mip: conMip, total };
}

/**
 * Ensambla el snapshot final combinando lo recién medido con lo que ya
 * había en el snapshot anterior (preserva `cobertura_por_vertical.asociaciones`
 * y demás notas que este script no recalcula — ver scripts/audit-milpa-citations.mjs
 * para ese número en particular).
 *
 * @param {object} prev - snapshot anterior parseado (src/data/graph-stats-snapshot.json)
 * @param {object} live - { nodos, aristas, especies, aristasPorTipo, controls, mip }
 * @param {string} date - 'YYYY-MM-DD'
 */
export function mergeGraphSnapshot(prev, live, date) {
  const next = JSON.parse(JSON.stringify(prev));
  next.especies = live.especies;
  next.nodos = live.nodos;
  next.aristas = live.aristas;
  next.aristas_por_tipo = live.aristasPorTipo;
  next.controls = live.controls;
  next.mip_plagas = live.mip;

  const pctControl = live.controls.total ? Math.round((live.controls.con_doi / live.controls.total) * 1000) / 10 : 0;
  const pctMip = live.mip.total ? Math.round((live.mip.con_mip / live.mip.total) * 1000) / 10 : 0;
  next.cobertura_por_vertical = {
    ...(prev.cobertura_por_vertical || {}),
    control_biologico: {
      ...(prev.cobertura_por_vertical?.control_biologico || {}),
      pct: pctControl,
      numerador: live.controls.con_doi,
      denominador: live.controls.total,
    },
    mip: {
      ...(prev.cobertura_por_vertical?.mip || {}),
      pct: pctMip,
      numerador: live.mip.con_mip,
      denominador: live.mip.total,
    },
  };

  next._meta = {
    ...prev._meta,
    fecha_snapshot: date,
    aristas_por_tipo_fecha: date,
    aristas_por_tipo_nota: `Desglose recalculado en la misma pasada que \`aristas\` (${date}) por scripts/export-graph-stats.mjs — sin desfase.`,
  };
  return next;
}

// =============================================================================
// Conexión a AGE (misma convención que audit-milpa-citations.mjs)
// =============================================================================

export function buildPsqlInvocation(env = process.env) {
  const override = env.CHAGRA_AGE_PSQL_COMMAND;
  if (override) return { kind: 'shell', command: override };
  return {
    kind: 'podman',
    file: 'sudo',
    args: ['podman', 'exec', '-i', 'postgres-farm', 'psql', '-U', 'farmos', '-d', 'chagra_kg', '-At', '-F', '\t'],
  };
}

export function runPsql(sql, env = process.env) {
  const inv = buildPsqlInvocation(env);
  if (inv.kind === 'shell') {
    return spawnSync(inv.command, { input: sql, encoding: 'utf8', shell: true, env });
  }
  return spawnSync(inv.file, inv.args, { input: sql, encoding: 'utf8', env });
}

/** Corre todas las queries LIVE contra chagra_kg y devuelve el objeto `live`. */
export function fetchLive(graph = DEFAULT_GRAPH, env = process.env) {
  const run = (sql) => {
    const r = runPsql(sql, env);
    if (r.error) throw new Error(`psql error: ${r.error.message}`);
    if (r.status !== 0) throw new Error(`psql exit ${r.status}: ${String(r.stderr || '').trim()}`);
    return r.stdout;
  };

  const nodos = parseSingleCount(run(buildNodeCountSql(graph)));
  const aristas = parseSingleCount(run(buildEdgeCountSql(graph)));
  const especies = parseSingleCount(run(buildSpeciesCountSql(graph)));
  const aristasPorTipo = computeEdgesByType(parseRows(run(buildEdgesByTypeSql(graph)), 2));

  const controlsRows = parseRows(run(buildControlsRowsSql(graph)), 2).map(([doi, verificadoOpenalex]) => ({
    doi,
    verificadoOpenalex,
  }));
  const controls = computeControlsStats(controlsRows);

  const pestRows = parseRows(run(buildPestRowsSql(graph)), 2).map(([umbralAccion, controlBiologico]) => ({
    umbralAccion,
    controlBiologico,
  }));
  const mip = computeMipStats(pestRows);

  return { nodos, aristas, especies, aristasPorTipo, controls, mip };
}

// =============================================================================
// CLI
// =============================================================================

export function resolveDate(argv = process.argv.slice(2), env = process.env) {
  const i = argv.indexOf('--date');
  if (i >= 0 && argv[i + 1]) return argv[i + 1];
  if (env.SNAPSHOT_DATE) return env.SNAPSHOT_DATE;
  return new Date().toISOString().slice(0, 10);
}

function loadFromDump(path) {
  const dump = JSON.parse(readFileSync(resolve(path), 'utf-8'));
  return {
    nodos: dump.nodeCount,
    aristas: dump.edgeCount,
    especies: dump.speciesCount,
    aristasPorTipo: computeEdgesByType(dump.edgesByType || []),
    controls: computeControlsStats(dump.controlsRows || []),
    mip: computeMipStats(dump.pestRows || []),
  };
}

export function main(argv = process.argv.slice(2), env = process.env) {
  const printSql = argv.includes('--print-sql');
  const write = argv.includes('--write');
  const dryRun = argv.includes('--dry-run') || (!write && !printSql);
  const fromDumpIdx = argv.indexOf('--from-dump');
  const fromDump = fromDumpIdx >= 0 ? argv[fromDumpIdx + 1] : null;
  const graphIdx = argv.indexOf('--graph');
  const graph = graphIdx >= 0 ? argv[graphIdx + 1] : DEFAULT_GRAPH;

  if (printSql) {
    console.log(
      [
        buildNodeCountSql(graph),
        buildEdgeCountSql(graph),
        buildSpeciesCountSql(graph),
        buildEdgesByTypeSql(graph),
        buildControlsRowsSql(graph),
        buildPestRowsSql(graph),
      ].join('\n---\n'),
    );
    return 0;
  }

  const date = resolveDate(argv, env);
  const live = fromDump ? loadFromDump(fromDump) : fetchLive(graph, env);

  console.error(`[export-graph-stats] nodos=${live.nodos} aristas=${live.aristas} especies=${live.especies}`);
  console.error(`[export-graph-stats] CONTROLS con_doi=${live.controls.con_doi}/${live.controls.total}`);
  console.error(`[export-graph-stats] MIP con_mip=${live.mip.con_mip}/${live.mip.total}`);

  if (dryRun && !write) {
    console.error('[export-graph-stats] --dry-run: no se escribe nada.');
    console.log(JSON.stringify(live, null, 2));
    return 0;
  }

  const prev = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf-8'));
  const next = mergeGraphSnapshot(prev, live, date);
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(next, null, 2) + '\n');
  console.error(`[export-graph-stats] escrito ${SNAPSHOT_PATH}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error('[export-graph-stats] failed:', err?.message || err);
    process.exitCode = 1;
  }
}
