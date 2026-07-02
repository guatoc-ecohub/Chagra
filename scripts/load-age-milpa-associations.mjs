#!/usr/bin/env node
/**
 * scripts/load-age-milpa-associations.mjs
 *
 * Loader offline-first para aristas de asociacion de milpa.
 *
 * Lee DRs markdown con tablas de aristas desde un directorio externo
 * (por ejemplo, Chagra-strategy/deepresearch/DR-FANOUT/milpa-*.md), extrae
 * relaciones de tipo COMPATIBLE_WITH / ASOCIA_CON con cita real, y genera un
 * SQL idempotente para AGE.
 *
 * Este script no toca la base de datos. Su salida es:
 *   1. un archivo .sql con MATCH + MERGE + SET para las relaciones;
 *   2. un reporte JSON/texto con cobertura de citacion antes/despues
 *      cuando se pasa un baseline del auditor.
 */

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  findMarkdownTables,
  isColombiaScopedText,
  sanitizeRelType,
  slugifyId,
  normalizeConfianza,
} from './load-age-graph-gaps.mjs';
import { emitRelUpsert, wrapCypher } from './catalog-to-age.mjs';

const _here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_GRAPH = 'chagra_kg';
const DEFAULT_LIMIT = 500;
const ASSOCIATION_TYPES = new Set(['COMPATIBLE_WITH', 'ASOCIA_CON']);
function normalizeHeaderCell(cell) {
  return String(cell || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/_/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ORIGEN_ALIASES = new Set(['origen id', 'origen', 'nodoa', 'nodo a']);
const TIPO_ALIASES = new Set(['tipo', 'relacion', 'tipo relacion']);
const DESTINO_ALIASES = new Set(['destino id', 'destino', 'nodob', 'nodo b']);
const FUENTE_ALIASES = new Set(['fuente', 'source']);
const DOI_ALIASES = new Set(['doi']);
const OPENALEX_ALIASES = new Set(['openalex', 'verificado openalex', 'verificado openalex id', 'openalex_id']);
const CONFIANZA_ALIASES = new Set(['confianza']);

export function classifyMilpaHeader(headerCells) {
  const normalized = headerCells.map(normalizeHeaderCell);
  const origenIdx = normalized.findIndex((c) => ORIGEN_ALIASES.has(c));
  const tipoIdx = normalized.findIndex((c) => TIPO_ALIASES.has(c));
  const destinoIdx = normalized.findIndex((c) => DESTINO_ALIASES.has(c));
  if (origenIdx === -1 || tipoIdx === -1 || destinoIdx === -1) return null;
  const fuenteIdx = normalized.findIndex((c) => FUENTE_ALIASES.has(c));
  const doiIdx = normalized.findIndex((c) => DOI_ALIASES.has(c));
  const openalexIdx = normalized.findIndex((c) => OPENALEX_ALIASES.has(c));
  const confianzaIdx = normalized.findIndex((c) => CONFIANZA_ALIASES.has(c));
  return { origenIdx, tipoIdx, destinoIdx, fuenteIdx, doiIdx, openalexIdx, confianzaIdx };
}

function splitCitationCell(value) {
  const text = String(value || '').trim();
  if (!text) {
    return { fuente: null, doi: null, verificadoOpenalex: null };
  }
  const doiMatch = text.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  const openalexHit = /openalex/i.test(text) || /oa:\s*true/i.test(text);
  return {
    fuente: text,
    doi: doiMatch ? doiMatch[0] : null,
    verificadoOpenalex: openalexHit ? true : null,
  };
}

function extractDoiValue(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  const match = text.match(/10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+/);
  return match ? match[0] : text;
}

export function extractMilpaRawEdgesFromText(text) {
  const tables = findMarkdownTables(text);
  const rawEdges = [];
  let edgeTablesFound = 0;
  let malformedRowCount = 0;

  for (const table of tables) {
    const cols = classifyMilpaHeader(table.headerCells);
    if (!cols) continue;
    edgeTablesFound++;
    for (const row of table.rows) {
      const origen = row[cols.origenIdx];
      const tipo = row[cols.tipoIdx];
      const destino = row[cols.destinoIdx];
      if (!origen || !tipo || !destino) {
        malformedRowCount++;
        continue;
      }
      const fuente = cols.fuenteIdx >= 0 ? row[cols.fuenteIdx] : '';
      const doi = cols.doiIdx >= 0 ? row[cols.doiIdx] : '';
      const openalex = cols.openalexIdx >= 0 ? row[cols.openalexIdx] : '';
      const confianza = cols.confianzaIdx >= 0 ? row[cols.confianzaIdx] : '';
      rawEdges.push({
        origen: origen.trim(),
        tipo: tipo.trim(),
        destino: destino.trim(),
        fuente: String(fuente || '').trim(),
        doi: String(doi || '').trim(),
        openalex: String(openalex || '').trim(),
        confianza: String(confianza || '').trim(),
        tableStartLine: table.startLine,
      });
    }
  }

  return { tablesFound: tables.length, edgeTablesFound, rawEdges, malformedRowCount };
}

export function curateMilpaEdges(rawEdges, { drScoped, drId }) {
  const accepted = [];
  const rejected = [];
  const seen = new Set();

  for (const raw of rawEdges) {
    if (!drScoped) {
      rejected.push({ ...raw, reason: 'dr_no_co_scoped' });
      continue;
    }

    const tipo = sanitizeRelType(raw.tipo);
    if (!tipo || !ASSOCIATION_TYPES.has(tipo)) {
      rejected.push({ ...raw, reason: 'relacion_no_milpa' });
      continue;
    }

    const origen = slugifyId(raw.origen);
    const destino = slugifyId(raw.destino);
    if (!origen || !destino) {
      rejected.push({ ...raw, reason: 'nodo_vacio' });
      continue;
    }

    const fuenteCitation = splitCitationCell(raw.fuente);
    const fuente = fuenteCitation.fuente || null;
    const doi = raw.doi ? extractDoiValue(raw.doi) : fuenteCitation.doi;
    const verificadoOpenalex = raw.openalex ? true : fuenteCitation.verificadoOpenalex;
    if (!fuente && !doi && !verificadoOpenalex) {
      rejected.push({ ...raw, reason: 'sin_fuente' });
      continue;
    }

    const key = `${origen}|${tipo}|${destino}|${fuente || ''}|${doi || ''}|${verificadoOpenalex ? '1' : ''}`;
    if (seen.has(key)) {
      rejected.push({ ...raw, reason: 'duplicado' });
      continue;
    }
    seen.add(key);

    accepted.push({
      origen,
      tipo,
      destino,
      fuente,
      doi,
      verificado_openalex: Boolean(verificadoOpenalex),
      confianza: normalizeConfianza(raw.confianza),
      confianzaRaw: raw.confianza,
      drId,
    });
  }

  const byReason = {};
  for (const r of rejected) byReason[r.reason] = (byReason[r.reason] || 0) + 1;

  return { accepted, rejected, byReason, rejectedByReason: byReason };
}

export function drIdFromPath(filePath) {
  return basename(filePath).replace(/\.md$/i, '');
}

export function processDrFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const drId = drIdFromPath(filePath);
  const drScoped = isColombiaScopedText(text);
  const { tablesFound, edgeTablesFound, rawEdges, malformedRowCount } = extractMilpaRawEdgesFromText(text);
  const { accepted, rejected, byReason } = curateMilpaEdges(rawEdges, { drScoped, drId });

  const relationTypeCounts = {};
  for (const e of accepted) relationTypeCounts[e.tipo] = (relationTypeCounts[e.tipo] || 0) + 1;

  return {
    drId,
    filePath,
    drScoped,
    tablesFound,
    edgeTablesFound,
    rawEdgeCount: rawEdges.length,
    malformedRowCount,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    rejectedByReason: byReason,
    relationTypeCounts,
    accepted,
    rejected,
  };
}

export function buildCypherStatements(acceptedEdges, { graph = DEFAULT_GRAPH, dateStr } = {}) {
  const today = dateStr || new Date().toISOString().slice(0, 10);
  const statements = [];
  const seen = new Set();
  const associationNodeIds = new Set();

  for (const edge of acceptedEdges) {
    for (const id of [edge.origen, edge.destino]) {
      associationNodeIds.add(id);
      if (seen.has(id)) continue;
      seen.add(id);
    }

    statements.push(wrapCypher(graph, emitRelUpsert(
      { label: 'Species', id: edge.origen },
      edge.tipo,
      { label: 'Species', id: edge.destino },
      {
        fuente: edge.fuente,
        doi: edge.doi,
        verificado_openalex: edge.verificado_openalex,
        confianza: edge.confianza,
        dr: `deepresearch:${edge.drId}`,
        added_at: today,
      },
    )));
  }

  return {
    statements,
    nodeCount: associationNodeIds.size,
    relCount: acceptedEdges.length,
  };
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 10;
}

export function buildCoverageReport(perDrResults, { graph = DEFAULT_GRAPH, baseline = null } = {}) {
  const allAccepted = perDrResults.flatMap((r) => r.accepted);
  const relationTypeCounts = {};
  const citationKinds = { fuente: 0, doi: 0, openalex: 0, agrosavia: 0 };

  for (const edge of allAccepted) {
    relationTypeCounts[edge.tipo] = (relationTypeCounts[edge.tipo] || 0) + 1;
    if (edge.fuente) citationKinds.fuente++;
    if (edge.doi) citationKinds.doi++;
    if (edge.verificado_openalex) citationKinds.openalex++;
    if (/agrosavia/i.test(edge.fuente || '') || /agrosavia/i.test(edge.doi || '')) citationKinds.agrosavia++;
  }

  const total = allAccepted.length;
  const withSource = allAccepted.filter((edge) => edge.fuente || edge.doi || edge.verificado_openalex).length;
  const withoutSource = total - withSource;

  const baselinePct = baseline && Number.isFinite(baseline.pctWithSource) ? baseline.pctWithSource : null;
  const beforeWithSource = baseline && Number.isFinite(baseline.withSource) ? baseline.withSource : null;
  const beforeTotal = baseline && Number.isFinite(baseline.totalAssociationEdges) ? baseline.totalAssociationEdges : null;
  const afterPct = beforeWithSource !== null && beforeTotal !== null
    ? percent(beforeWithSource + withSource, beforeTotal + total)
    : null;

  return {
    graph,
    generatedAt: new Date().toISOString(),
    drCount: perDrResults.length,
    totals: {
      accepted: total,
      withSource,
      withoutSource,
      relationTypeCounts,
      citationKinds,
    },
    before: baselinePct !== null ? {
      totalAssociationEdges: baseline.totalAssociationEdges,
      withSource: baseline.withSource,
      withoutSource: baseline.withoutSource,
      pctWithSource: baselinePct,
    } : null,
    after: afterPct !== null ? {
      totalAssociationEdges: beforeTotal + total,
      withSource: beforeWithSource + withSource,
      withoutSource: (baseline.withoutSource || 0) + withoutSource,
      pctWithSource: afterPct,
    } : null,
    perDr: perDrResults.map((r) => ({
      drId: r.drId,
      drScoped: r.drScoped,
      tablesFound: r.tablesFound,
      edgeTablesFound: r.edgeTablesFound,
      rawEdgeCount: r.rawEdgeCount,
      malformedRowCount: r.malformedRowCount,
      acceptedCount: r.acceptedCount,
      rejectedCount: r.rejectedCount,
      rejectedByReason: r.rejectedByReason,
      relationTypeCounts: r.relationTypeCounts,
    })),
  };
}

export function formatReportText(report) {
  const lines = [];
  lines.push(`[milpa-load] graph=${report.graph}`);
  lines.push(`[milpa-load] drs=${report.drCount}`);
  if (report.before && report.after) {
    lines.push(`[milpa-load] before=${report.before.pctWithSource}% (${report.before.withSource}/${report.before.totalAssociationEdges})`);
    lines.push(`[milpa-load] after=${report.after.pctWithSource}% (${report.after.withSource}/${report.after.totalAssociationEdges})`);
  }
  lines.push(`[milpa-load] accepted=${report.totals.accepted}`);
  lines.push(`[milpa-load] with_source=${report.totals.withSource}`);
  lines.push(`[milpa-load] without_source=${report.totals.withoutSource}`);
  lines.push('[milpa-load] citation_kinds:');
  for (const [kind, count] of Object.entries(report.totals.citationKinds)) {
    lines.push(`  - ${kind}: ${count}`);
  }
  lines.push('[milpa-load] relation_types:');
  for (const [tipo, count] of Object.entries(report.totals.relationTypeCounts)) {
    lines.push(`  - ${tipo}: ${count}`);
  }
  lines.push('[milpa-load] per_dr:');
  for (const dr of report.perDr) {
    lines.push(`  - ${dr.drId}: accepted=${dr.acceptedCount} rejected=${dr.rejectedCount} scoped=${dr.drScoped ? 'yes' : 'no'}`);
  }
  return lines.join('\n');
}

export function parseArgs(argv) {
  const opts = {
    drDir: process.env.CHAGRA_AGE_MILPA_DR_DIR || '',
    globs: [],
    files: [],
    outCypher: process.env.CHAGRA_AGE_MILPA_OUT_CYPHER || '',
    outReport: process.env.CHAGRA_AGE_MILPA_OUT_REPORT || '',
    baselineJson: process.env.CHAGRA_AGE_MILPA_BASELINE_JSON || '',
    graph: DEFAULT_GRAPH,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dr-dir') opts.drDir = argv[++i];
    else if (a === '--glob') opts.globs.push(argv[++i]);
    else if (a === '--file') opts.files.push(argv[++i]);
    else if (a === '--out-cypher') opts.outCypher = argv[++i];
    else if (a === '--out-report') opts.outReport = argv[++i];
    else if (a === '--baseline-json') opts.baselineJson = argv[++i];
    else if (a === '--graph') opts.graph = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }

  return opts;
}

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

export function resolveFileList(opts) {
  const resolved = new Set();
  if (opts.globs.length) {
    const entries = readdirSync(opts.drDir);
    const regexes = opts.globs.map(globToRegExp);
    for (const entry of entries) {
      if (regexes.some((re) => re.test(entry))) {
        resolved.add(resolve(opts.drDir, entry));
      }
    }
  }
  for (const f of opts.files) {
    resolved.add(resolve(opts.drDir, f));
  }
  return [...resolved].sort();
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log([
      'Usage: node scripts/load-age-milpa-associations.mjs --dr-dir DIR [--glob PATTERN]... [--file NAME]... [--baseline-json FILE] [--out-cypher FILE] [--out-report FILE] [--graph chagra_kg] [--json]',
      '',
      'Parses markdown DR tables, keeps only milpa associations with real citations,',
      'and writes an AGE upsert SQL plus a coverage report.',
    ].join('\n'));
    return 0;
  }

  if (!opts.drDir) {
    console.error('ERROR: missing --dr-dir or CHAGRA_AGE_MILPA_DR_DIR.');
    return 2;
  }
  if (!opts.globs.length && !opts.files.length) {
    console.error('ERROR: pass at least one --glob or --file.');
    return 2;
  }

  const files = resolveFileList(opts);
  if (!files.length) {
    console.error(`ERROR: no files matched under ${opts.drDir}`);
    return 2;
  }

  const baseline = opts.baselineJson
    ? JSON.parse(readFileSync(resolve(opts.baselineJson), 'utf8'))
    : null;

  const perDrResults = files.map((filePath) => processDrFile(filePath));
  const allAccepted = perDrResults.flatMap((r) => r.accepted);
  const { statements } = buildCypherStatements(allAccepted, { graph: opts.graph });
  const report = buildCoverageReport(perDrResults, { graph: opts.graph, baseline });
  report.cypherStatements = statements.length;

  const outCypher = opts.outCypher || join(_here, '..', '.local', 'age-milpa-associations', 'milpa-associations.cypher.sql');
  const outReport = opts.outReport || join(_here, '..', '.local', 'age-milpa-associations', 'milpa-associations.report.json');
  mkdirSync(dirname(outCypher), { recursive: true });
  mkdirSync(dirname(outReport), { recursive: true });

  const cypherHeader = [
    '-- Generated by scripts/load-age-milpa-associations.mjs, dry-run only.',
    `-- Graph: ${opts.graph}`,
    `-- DRs: ${perDrResults.map((r) => r.drId).join(', ')}`,
    baseline && report.before && report.after
      ? `-- Citation coverage before: ${report.before.pctWithSource}%, after: ${report.after.pctWithSource}%`
      : '-- Citation coverage before/after unavailable without --baseline-json.',
    '',
    "LOAD 'age';",
    'SET search_path = ag_catalog, "$user", public;',
    '',
  ].join('\n');

  writeFileSync(outCypher, `${cypherHeader}${statements.join('\n\n')}\n`, 'utf8');
  writeFileSync(outReport, JSON.stringify(report, null, 2), 'utf8');

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReportText(report));
  }
  console.log(`[milpa-load] cypher=${outCypher}`);
  console.log(`[milpa-load] report=${outReport}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
