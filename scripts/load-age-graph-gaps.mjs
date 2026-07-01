#!/usr/bin/env node
/**
 * scripts/load-age-graph-gaps.mjs
 *
 * Generalización del patrón de `scripts/load-age-etno-folk-fitopatologia.mjs`
 * (PR #1907) para ingerir DRs "de huecos" y "de aristas por especie" al grafo
 * AGE `chagra_kg`. A diferencia de ese loader (que ejecuta SQL curado a mano),
 * este script PARSEA directamente las tablas markdown de aristas que traen
 * los DR (`| origen_id | TIPO | destino_id | fuente | confianza |` y variantes
 * como `NodoA | Relación | NodoB | Fuente | Confianza`), las cura con reglas
 * anti-alucinación, y genera el Cypher MERGE correspondiente.
 *
 * ESTADO: BUILD + DRY-RUN. Este script NUNCA se conecta a postgres/AGE ni
 * ejecuta nada contra el grafo de producción. Su única salida es:
 *   1. un archivo .sql con statements `SELECT * FROM cypher(...)` (MERGE,
 *      no destructivo, idempotente — mismo patrón que catalog-to-age.mjs);
 *   2. un reporte (JSON + texto) de cuántos nodos/aristas se generarían, por
 *      DR y por tipo de relación, y cuántas filas se descartaron y por qué.
 * La aplicación real contra `postgres-farm`/`chagra_kg` es una decisión
 * posterior (fuera de este script), después de revisión humana del Cypher
 * generado — igual que el resto del pipeline de ingesta AGE de este repo.
 *
 * Anti-alucinación / curación CO-strict:
 *   - Se descartan aristas sin `fuente` citada (columna vacía).
 *   - Se descartan aristas cuyo DR de origen no está explícitamente
 *     circunscrito a Colombia/Andes (heurística sobre título+intro del DR:
 *     "colombia", "andin", "andes", "páramo"). Todas las DRs objetivo de este
 *     pipeline ya cumplen esto por diseño (nombre de archivo lo declara),
 *     pero el chequeo es defensivo por si el script se apunta a otras DRs.
 *   - Se descartan filas malformadas (columnas requeridas vacías o fila
 *     truncada por corrupción de generación) y duplicados exactos dentro
 *     del mismo DR.
 *
 * Fuente de las DRs: viven FUERA de este repo (Chagra-strategy, privado).
 * Este script NO conoce ninguna ruta privada por defecto — se pasan por
 * `--dr-dir` / env `CHAGRA_AGE_GAPS_DR_DIR`, igual que `CHAGRA_AGE_ETNO_SQL`
 * en el loader hermano.
 *
 * Nodo genérico: las entidades de estas DRs (especies, plagas, polinizadores,
 * conceptos abstractos como "fuego" o "riesgo_incendio", prácticas de manejo)
 * son demasiado heterogéneas para inferir su label canónico (Species/Pest/...)
 * sin consultar el grafo vivo — y esta etapa es offline por diseño. Por eso
 * se etiquetan bajo un label nuevo y genérico `GraphGapNode` (mismo espíritu
 * que `FolkSymptom` en el PR #1907: un label explícito para conceptos que
 * todavía no calzan en la ontología establecida). LIMITACIÓN CONOCIDA: si un
 * id ya existe como nodo canónico (p.ej. una Species ya catalogada), esto
 * crea un nodo `GraphGapNode` paralelo con el mismo `id` en vez de fusionarse
 * con el nodo existente — a resolver en una pasada de reconciliación con
 * lectura contra el grafo vivo, antes de cualquier aplicación real.
 *
 * Uso:
 *   node scripts/load-age-graph-gaps.mjs \
 *     --dr-dir /ruta/privada/deepresearch/DR-FANOUT \
 *     --glob 'aristas-grafo-*.md' \
 *     --file porcicultura-y-avicultura-....md \
 *     --file micorrizas-y-salud-de-suelo-....md \
 *     --file recuperacion-de-suelos-....md \
 *     --file captacion-de-agua-....md \
 *     --out-cypher /ruta/privada/ops/age-graph-gaps/gaps.cypher.sql \
 *     --out-report /ruta/privada/ops/age-graph-gaps/gaps.report.json
 *
 * Si no se pasan `--out-cypher`/`--out-report` (ni sus env vars), se escribe
 * bajo `.local/age-graph-gaps/` (gitignored vía `*.local`) para que nunca
 * quede contenido derivado de DRs privadas trackeado en este repo público.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { emitNode, emitRel, wrapCypher } from './catalog-to-age.mjs';

const _here = dirname(fileURLToPath(import.meta.url));

export const NODE_LABEL = 'GraphGapNode';

// Snapshot de tipos de arista ya establecidos en chagra_kg — fuente:
// Chagra-strategy/ops/INFRA_FACTS.md (auditoría en vivo 2026-06-14) +
// FOLK_NAME_OF (introducido en PR #1907). Solo enriquece el reporte
// (marca si un TIPO es "conocido" o "nuevo" para el grafo); no gatea la
// curación — un tipo nuevo no es motivo de descarte.
export const KNOWN_RELATION_TYPES = new Set([
  'REFERENCED_BY', 'HAS_ROLE', 'GROWS_IN', 'CONTROLS', 'HAS_FAMILY',
  'COMPATIBLE_WITH', 'HAS_HABIT', 'USED_AS_BIOPREPARADO', 'IS_VARIETY_OF',
  'REFERS_TO_SPECIES', 'USED_IN_REGION', 'TARGETS_PEST', 'ANTAGONIST_OF',
  'HAS_ORIGIN', 'RESISTANT_TO', 'AFFECTS', 'DISAMBIGUATES', 'SUSCEPTIBLE_TO',
  'SYNONYM_OF', 'FOLK_NAME_OF',
]);

const CO_SCOPE_RE = /colombia|andin|\bandes\b|p[aá]ramo/i;

// =============================================================================
// Detección genérica de tablas markdown
// =============================================================================

// Placeholder para proteger pipes escapados (`\|`, sintaxis GFM válida dentro
// de una celda — observado en al menos un DR real: "texto \| más texto") del
// split por `|`. Sin esto, una celda con un pipe escapado corta la fila en el
// lugar equivocado y desplaza fuente/confianza de las columnas siguientes.
const ESCAPED_PIPE_PLACEHOLDER = '\u0001';

/** Divide una línea `| a | b | c |` en celdas trimmeadas, respetando `\|` escapado. */
export function splitTableRow(line) {
  let s = line.trim().replace(/\\\|/g, ESCAPED_PIPE_PLACEHOLDER);
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim().split(ESCAPED_PIPE_PLACEHOLDER).join('|'));
}

/** true si todas las celdas son separadores markdown (`:--`, `---`, `--:`). */
export function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.trim()));
}

/**
 * Encuentra todas las tablas markdown bien-formadas (header + fila separadora
 * + 0..n filas de cuerpo) en un texto. Ignora bloques `| ... |` que no traen
 * la fila separadora inmediatamente después (p.ej. una tabla degenerada por
 * un glitch de generación, sin filas de cuerpo reales).
 */
export function findMarkdownTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|')) {
      const headerCells = splitTableRow(line);
      const sepLine = lines[i + 1];
      if (sepLine && sepLine.trim().startsWith('|') && isSeparatorRow(splitTableRow(sepLine))) {
        const rows = [];
        let j = i + 2;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const cells = splitTableRow(lines[j]);
          if (!isSeparatorRow(cells)) rows.push(cells);
          j++;
        }
        tables.push({ headerCells, rows, startLine: i + 1 });
        i = j;
        continue;
      }
    }
    i++;
  }
  return tables;
}

// =============================================================================
// Clasificación de encabezados "tabla de aristas" (con alias)
// =============================================================================

function normalizeHeaderCell(cell) {
  return String(cell || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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
const FUENTE_ALIASES = new Set(['fuente']);
const CONFIANZA_ALIASES = new Set(['confianza']);

/**
 * Clasifica un header de tabla como "tabla de aristas" si trae, a la vez,
 * una columna origen-like, una tipo-like y una destino-like (en cualquier
 * orden/posición). Requerir las tres a la vez es lo que descarta falsos
 * positivos como una tabla de índice de fuentes `Origen_ID | TIPO | Fuente |
 * Confianza` (sin destino) que aparece en al menos un DR real.
 *
 * @returns {{origenIdx:number,tipoIdx:number,destinoIdx:number,fuenteIdx:number,confianzaIdx:number}|null}
 */
export function classifyEdgeHeader(headerCells) {
  const normalized = headerCells.map(normalizeHeaderCell);
  const origenIdx = normalized.findIndex((c) => ORIGEN_ALIASES.has(c));
  const tipoIdx = normalized.findIndex((c) => TIPO_ALIASES.has(c));
  const destinoIdx = normalized.findIndex((c) => DESTINO_ALIASES.has(c));
  if (origenIdx === -1 || tipoIdx === -1 || destinoIdx === -1) return null;
  const fuenteIdx = normalized.findIndex((c) => FUENTE_ALIASES.has(c));
  const confianzaIdx = normalized.findIndex((c) => CONFIANZA_ALIASES.has(c));
  return { origenIdx, tipoIdx, destinoIdx, fuenteIdx, confianzaIdx };
}

// =============================================================================
// Extracción de aristas crudas
// =============================================================================

/**
 * Recorre todas las tablas del texto, clasifica cuáles son tablas de
 * aristas, y extrae las filas como cuádruplos crudos (sin curar todavía).
 */
export function extractRawEdgesFromText(text) {
  const tables = findMarkdownTables(text);
  const rawEdges = [];
  let edgeTablesFound = 0;
  let malformedRowCount = 0;
  for (const table of tables) {
    const cols = classifyEdgeHeader(table.headerCells);
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
      const fuente = cols.fuenteIdx >= 0 ? (row[cols.fuenteIdx] || '') : '';
      const confianza = cols.confianzaIdx >= 0 ? (row[cols.confianzaIdx] || '') : '';
      rawEdges.push({
        origen: origen.trim(),
        tipo: tipo.trim(),
        destino: destino.trim(),
        fuente: fuente.trim(),
        confianza: confianza.trim(),
        tableStartLine: table.startLine,
      });
    }
  }
  return { tablesFound: tables.length, edgeTablesFound, rawEdges, malformedRowCount };
}

// =============================================================================
// Normalización + curación (anti-alucinación, CO-strict)
// =============================================================================

export function slugifyId(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function sanitizeRelType(tipo) {
  let s = String(tipo || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) return null;
  if (/^[0-9]/.test(s)) s = `REL_${s}`;
  return s;
}

const CONFIANZA_MAP = { alta: 'alta', media: 'media', baja: 'baja' };
export function normalizeConfianza(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (CONFIANZA_MAP[s]) return CONFIANZA_MAP[s];
  return s ? 'sin_normalizar' : 'sin_dato';
}

/** Heurística de scoping CO/Andes sobre el título + intro del DR (primeros ~4000 chars). */
export function isColombiaScopedText(text) {
  return CO_SCOPE_RE.test(text.slice(0, 4000));
}

/**
 * Cura una lista de aristas crudas de un mismo DR. Reglas de descarte:
 *   - dr_no_co_scoped: el DR no declara scope Colombia/Andes.
 *   - tipo_invalido: TIPO vacío tras sanitizar.
 *   - nodo_vacio: origen/destino vacío tras slugify.
 *   - sin_fuente: columna fuente vacía (anti-alucinación — no hay cita).
 *   - duplicado: mismo (origen,tipo,destino) ya visto en este DR.
 */
export function curateRawEdges(rawEdges, { drScoped, drId }) {
  const accepted = [];
  const rejected = [];
  const seen = new Set();
  for (const raw of rawEdges) {
    if (!drScoped) { rejected.push({ ...raw, reason: 'dr_no_co_scoped' }); continue; }
    const tipo = sanitizeRelType(raw.tipo);
    if (!tipo) { rejected.push({ ...raw, reason: 'tipo_invalido' }); continue; }
    const origen = slugifyId(raw.origen);
    const destino = slugifyId(raw.destino);
    if (!origen || !destino) { rejected.push({ ...raw, reason: 'nodo_vacio' }); continue; }
    if (!raw.fuente) { rejected.push({ ...raw, reason: 'sin_fuente' }); continue; }
    const key = `${origen}|${tipo}|${destino}`;
    if (seen.has(key)) { rejected.push({ ...raw, reason: 'duplicado' }); continue; }
    seen.add(key);
    accepted.push({
      origen,
      tipo,
      destino,
      fuente: raw.fuente,
      confianza: normalizeConfianza(raw.confianza),
      confianzaRaw: raw.confianza,
      drId,
      isKnownRelationType: KNOWN_RELATION_TYPES.has(tipo),
    });
  }
  const byReason = {};
  for (const r of rejected) byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  return { accepted, rejected, byReason };
}

// =============================================================================
// Generación de Cypher (reutiliza primitivas de catalog-to-age.mjs)
// =============================================================================

/**
 * Construye los statements SQL `SELECT * FROM cypher(...)` para un batch de
 * aristas ya curadas. Dedupea el MERGE de nodo por id (el mismo id puede
 * aparecer en decenas de aristas dentro y entre DRs) para no inflar el
 * archivo de salida con el mismo MERGE repetido.
 */
export function buildCypherStatements(acceptedEdges, { graph = 'chagra_kg', dateStr } = {}) {
  const statements = [];
  const emittedNodes = new Set();
  const today = dateStr || new Date().toISOString().slice(0, 10);
  for (const e of acceptedEdges) {
    const drRef = `DR-FANOUT:${e.drId}`;
    for (const nodeId of [e.origen, e.destino]) {
      if (emittedNodes.has(nodeId)) continue;
      emittedNodes.add(nodeId);
      statements.push(wrapCypher(graph, emitNode(NODE_LABEL, {
        id: nodeId,
        source: drRef,
        added_at: today,
      })));
    }
    statements.push(wrapCypher(graph, emitRel(
      { label: NODE_LABEL, id: e.origen },
      e.tipo,
      { label: NODE_LABEL, id: e.destino },
      {
        source: e.fuente,
        confidence: e.confianza,
        dr: drRef,
        added_at: today,
      },
    )));
  }
  return { statements, nodeCount: emittedNodes.size };
}

// =============================================================================
// Procesamiento por DR + reporte agregado
// =============================================================================

export function drIdFromPath(filePath) {
  return basename(filePath).replace(/\.md$/i, '');
}

export function processDrFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const drId = drIdFromPath(filePath);
  const drScoped = isColombiaScopedText(text);
  const { tablesFound, edgeTablesFound, rawEdges, malformedRowCount } = extractRawEdgesFromText(text);
  const { accepted, rejected, byReason } = curateRawEdges(rawEdges, { drScoped, drId });
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

export function buildDryRunReport(perDrResults, { graph = 'chagra_kg' } = {}) {
  const allAccepted = perDrResults.flatMap((r) => r.accepted);
  const relationTypeCounts = {};
  for (const e of allAccepted) relationTypeCounts[e.tipo] = (relationTypeCounts[e.tipo] || 0) + 1;
  const rejectedByReason = {};
  for (const r of perDrResults) {
    for (const [reason, count] of Object.entries(r.rejectedByReason)) {
      rejectedByReason[reason] = (rejectedByReason[reason] || 0) + count;
    }
  }
  const newRelationTypes = [...new Set(allAccepted.map((e) => e.tipo))]
    .filter((t) => !KNOWN_RELATION_TYPES.has(t)).sort();
  const nodeIds = new Set();
  for (const e of allAccepted) { nodeIds.add(e.origen); nodeIds.add(e.destino); }

  return {
    graph,
    generatedAt: new Date().toISOString(),
    drCount: perDrResults.length,
    totals: {
      tablesFound: perDrResults.reduce((n, r) => n + r.tablesFound, 0),
      edgeTablesFound: perDrResults.reduce((n, r) => n + r.edgeTablesFound, 0),
      rawEdges: perDrResults.reduce((n, r) => n + r.rawEdgeCount, 0),
      malformedRows: perDrResults.reduce((n, r) => n + r.malformedRowCount, 0),
      accepted: allAccepted.length,
      rejected: perDrResults.reduce((n, r) => n + r.rejectedCount, 0),
      newNodeIds: nodeIds.size,
    },
    relationTypeCounts,
    newRelationTypes,
    rejectedByReason,
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
  lines.push(`[age-graph-gaps] modo=DRY-RUN (no se tocó ${report.graph})`);
  lines.push(`[age-graph-gaps] DRs procesadas: ${report.drCount}`);
  lines.push(`[age-graph-gaps] tablas detectadas: ${report.totals.tablesFound} (de aristas: ${report.totals.edgeTablesFound})`);
  lines.push(`[age-graph-gaps] aristas crudas: ${report.totals.rawEdges} | filas malformadas: ${report.totals.malformedRows}`);
  lines.push(`[age-graph-gaps] aristas aceptadas: ${report.totals.accepted} | descartadas: ${report.totals.rejected}`);
  lines.push(`[age-graph-gaps] nodos nuevos (ids únicos): ${report.totals.newNodeIds}`);
  lines.push('[age-graph-gaps] descartes por motivo:');
  for (const [reason, count] of Object.entries(report.rejectedByReason).sort((a, b) => b[1] - a[1])) {
    lines.push(`  - ${reason}: ${count}`);
  }
  lines.push('[age-graph-gaps] aristas aceptadas por tipo de relación:');
  for (const [tipo, count] of Object.entries(report.relationTypeCounts).sort((a, b) => b[1] - a[1])) {
    const known = KNOWN_RELATION_TYPES.has(tipo) ? '' : ' (NUEVO)';
    lines.push(`  - ${tipo}: ${count}${known}`);
  }
  lines.push('[age-graph-gaps] por DR:');
  for (const dr of report.perDr) {
    lines.push(`  - ${dr.drId}: aceptadas=${dr.acceptedCount} descartadas=${dr.rejectedCount} tablas_aristas=${dr.edgeTablesFound}/${dr.tablesFound} scoped_co=${dr.drScoped ? 'si' : 'no'}`);
  }
  return lines.join('\n');
}

// =============================================================================
// CLI
// =============================================================================

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

export function parseArgs(argv) {
  const opts = {
    drDir: process.env.CHAGRA_AGE_GAPS_DR_DIR || '',
    globs: [],
    files: [],
    outCypher: process.env.CHAGRA_AGE_GAPS_OUT_CYPHER || '',
    outReport: process.env.CHAGRA_AGE_GAPS_OUT_REPORT || '',
    graph: 'chagra_kg',
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
    else if (a === '--graph') opts.graph = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

/** Resuelve la lista final de archivos (unión de --glob y --file, deduplicada). */
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
      'Usage: node scripts/load-age-graph-gaps.mjs --dr-dir DIR [--glob PATTERN]... [--file NAME]... [--out-cypher FILE] [--out-report FILE] [--graph chagra_kg] [--json]',
      '',
      'BUILD + DRY-RUN: nunca se conecta a AGE/postgres. Genera Cypher + reporte a archivo.',
    ].join('\n'));
    return 0;
  }
  if (!opts.drDir) {
    console.error('ERROR: falta --dr-dir (o env CHAGRA_AGE_GAPS_DR_DIR). Las DRs viven fuera de este repo.');
    return 2;
  }
  if (!opts.globs.length && !opts.files.length) {
    console.error('ERROR: pasa al menos un --glob o --file para seleccionar qué DRs procesar.');
    return 2;
  }

  const files = resolveFileList(opts);
  if (!files.length) {
    console.error(`ERROR: no se encontró ningún archivo con los --glob/--file dados bajo ${opts.drDir}`);
    return 2;
  }

  const perDrResults = files.map((f) => processDrFile(f));
  const allAccepted = perDrResults.flatMap((r) => r.accepted);
  const { statements, nodeCount } = buildCypherStatements(allAccepted, { graph: opts.graph });
  const report = buildDryRunReport(perDrResults, { graph: opts.graph });
  report.totals.cypherStatements = statements.length;
  report.totals.cypherNodeMerges = nodeCount;

  const outCypher = opts.outCypher || join(_here, '..', '.local', 'age-graph-gaps', 'gaps.cypher.sql');
  const outReport = opts.outReport || join(_here, '..', '.local', 'age-graph-gaps', 'gaps.report.json');
  mkdirSync(dirname(outCypher), { recursive: true });
  mkdirSync(dirname(outReport), { recursive: true });

  const cypherHeader = [
    '-- Generado por scripts/load-age-graph-gaps.mjs — DRY-RUN, NO aplicado.',
    `-- Grafo destino: ${opts.graph}`,
    `-- DRs fuente: ${perDrResults.map((r) => r.drId).join(', ')}`,
    `-- Statements: ${statements.length} (MERGE-only, idempotente, no destructivo)`,
    '-- Revisión humana requerida antes de ejecutar contra postgres-farm.',
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
  console.log(`[age-graph-gaps] Cypher escrito en ${outCypher}`);
  console.log(`[age-graph-gaps] Reporte escrito en ${outReport}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
