#!/usr/bin/env node
/**
 * scripts/audit-milpa-citations.mjs
 *
 * AUDITOR de citación para las aristas de asociación/companion planting
 * ("milpa") del grafo `chagra_kg` (Apache AGE, postgres-farm).
 *
 * Contexto (curación del grafo, 2026-06-30): la relación milpa/asociaciones
 * es la PEOR citada del grafo — ~19% con fuente/DOI, contra ~55% del control
 * biológico. Este script NO corrige nada ni inventa fuentes: solo LISTA qué
 * aristas de asociación carecen de fuente/DOI para alimentar una investigación
 * (DR) posterior que sí busque las citas reales.
 *
 * Qué cuenta como "arista de asociación"
 * ---------------------------------------
 * Los dos tipos de relación companion/asociación presentes en el grafo (ver
 * scripts/catalog-to-age.mjs y scripts/export-graph-to-catalog.mjs):
 *   - (:Species)-[:COMPATIBLE_WITH]->(:Species)  — companions[] del catálogo.
 *   - (:Species)-[:ASOCIA_CON]->(:Species)       — asociaciones curadas
 *                                                   directamente en el grafo.
 * NO incluye ANTAGONIST_OF (es una relación de conflicto, no de asociación
 * positiva) ni ninguna otra relación (CONTROLS, TARGETS_PEST, etc.).
 *
 * Qué cuenta como "con fuente"
 * -----------------------------
 * Se considera citada una arista si trae, como propiedad, alguno de estos
 * campos con valor no vacío/no falso: `fuente`, `doi`, `verificado_openalex`.
 * Estos son los campos que el operador identificó en el grafo vivo; el script
 * NO inventa ni normaliza fuentes, solo verifica presencia.
 *
 * Priorización
 * ------------
 * La lista de aristas sin fuente se ordena por prioridad de cultivo insignia:
 *   1. milpa clásica  — maíz (zea_mays), frijol (phaseolus_vulgaris),
 *                        calabaza (cucurbita_*)
 *   2. café           — coffea_arabica
 *   3. hortalizas     — category hortalizas_fruto_flor / hortalizas_hoja
 *   4. otros
 * Se toma la prioridad más alta entre origen y destino de cada arista.
 *
 * Modos de ejecución
 * -------------------
 *   1. LIVE (default): consulta `chagra_kg` vía psql. Por defecto usa
 *      `sudo podman exec -i postgres-farm psql -U farmos -d chagra_kg`;
 *      si `CHAGRA_AGE_PSQL_COMMAND` está definido en el entorno, lo usa tal
 *      cual (mismo patrón que scripts/validate-graph-parity.mjs y
 *      scripts/load-age-etno-folk-fitopatologia.mjs). Sin credenciales
 *      hardcodeadas — todo entra por process.env.
 *   2. OFFLINE (--from-dump FILE): NO toca la DB. Parsea un dump JSON
 *      `{nodes, edges}` (mismo shape que scripts/check-age-integrity.mjs) o
 *      un catálogo `{species: [...]}` (companions[] se leen como aristas
 *      COMPATIBLE_WITH, sin fuente por diseño — el catálogo no tiene campo
 *      de cita por arista). Este es el modo seguro para CI.
 *
 * Uso
 * ---
 *   node scripts/audit-milpa-citations.mjs                     # live, texto
 *   node scripts/audit-milpa-citations.mjs --json               # live, JSON
 *   node scripts/audit-milpa-citations.mjs --print-sql           # solo el SQL
 *   node scripts/audit-milpa-citations.mjs --from-dump dump.json # offline
 *   CHAGRA_AGE_PSQL_COMMAND="psql -h 127.0.0.1 -U farmos -d chagra_kg" \
 *     node scripts/audit-milpa-citations.mjs
 *
 * NO modifica catálogo ni manifest — es de solo lectura/reporte.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// =============================================================================
// Constantes de dominio
// =============================================================================

export const ASSOCIATION_RELATIONS = ['COMPATIBLE_WITH', 'ASOCIA_CON'];

const MILPA_CLASICA_ID_RE = /^(zea_mays|phaseolus_vulgaris|cucurbita_)/;
const CAFE_ID_RE = /^coffea_/;
const HORTALIZA_CATEGORIAS = new Set(['hortalizas_fruto_flor', 'hortalizas_hoja']);

const DEFAULT_GRAPH = 'chagra_kg';
const DEFAULT_LIMIT = 200;

// =============================================================================
// SQL builder (puro — no toca la DB)
// =============================================================================

/**
 * Arma el SQL (LOAD + SET + SELECT ... FROM cypher(...)) que trae las
 * aristas de asociación con sus propiedades de citación + nombre/categoria
 * de los nodos origen/destino (para priorizar sin depender del catálogo
 * local, que puede ser un subconjunto del grafo vivo).
 *
 * @param {string} [graph='chagra_kg']
 * @returns {string}
 */
export function buildMilpaAuditSql(graph = DEFAULT_GRAPH) {
  const graphLiteral = String(graph).replace(/'/g, "''");
  const branches = ASSOCIATION_RELATIONS.map((rel) => `
  MATCH (a:Species)-[r:${rel}]->(b:Species)
  RETURN a.id AS origen, a.nombre_comun AS origen_nombre, a.categoria AS origen_categoria,
         b.id AS destino, b.nombre_comun AS destino_nombre, b.categoria AS destino_categoria,
         '${rel}' AS relacion,
         r.fuente AS fuente, r.doi AS doi, r.verificado_openalex AS verificado_openalex`).join('\n  UNION\n');

  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT origen::text, origen_nombre::text, origen_categoria::text,
       destino::text, destino_nombre::text, destino_categoria::text,
       relacion::text, fuente::text, doi::text, verificado_openalex::text
FROM cypher('${graphLiteral}', $$${branches}
  ORDER BY relacion, origen, destino
$$) AS (origen agtype, origen_nombre agtype, origen_categoria agtype,
        destino agtype, destino_nombre agtype, destino_categoria agtype,
        relacion agtype, fuente agtype, doi agtype, verificado_openalex agtype);
`.trim();
}

// =============================================================================
// Parsing de salida psql (puro)
// =============================================================================

function stripAgtype(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'null') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return raw.replace(/^"|"$/g, '');
}

/**
 * Parsea la salida de `psql -At -F '\t'` para el SQL de buildMilpaAuditSql.
 * Ignora líneas de ruido (LOAD/SET/"(N rows)") y filas incompletas.
 *
 * @param {string} stdout
 * @returns {Array<object>} filas normalizadas (mismo shape que extractAssociationEdges)
 */
export function parseAuditRows(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(LOAD|SET|\(\d+ rows?\))$/.test(line))
    .map((line) => {
      const parts = line.split('\t');
      return {
        origen: stripAgtype(parts[0]),
        origenNombre: stripAgtype(parts[1]),
        origenCategoria: stripAgtype(parts[2]),
        destino: stripAgtype(parts[3]),
        destinoNombre: stripAgtype(parts[4]),
        destinoCategoria: stripAgtype(parts[5]),
        relacion: stripAgtype(parts[6]),
        fuente: stripAgtype(parts[7]),
        doi: stripAgtype(parts[8]),
        verificadoOpenalex: stripAgtype(parts[9]),
      };
    })
    .filter((row) => row.origen && row.destino && row.relacion);
}

// =============================================================================
// Modo offline: dump {nodes, edges} o catálogo {species} (puro)
// =============================================================================

function catalogToAssociationEdges(catalog) {
  const speciesById = new Map((catalog.species || []).map((sp) => [sp.id, sp]));
  const rows = [];
  for (const sp of catalog.species || []) {
    for (const compId of sp.companions || []) {
      const dest = speciesById.get(compId);
      rows.push({
        origen: sp.id,
        origenNombre: sp.nombre_comun || null,
        origenCategoria: sp.category || null,
        destino: compId,
        destinoNombre: dest?.nombre_comun || null,
        destinoCategoria: dest?.category || null,
        relacion: 'COMPATIBLE_WITH',
        // El catálogo no tiene campo de cita por arista — por diseño, null.
        fuente: null,
        doi: null,
        verificadoOpenalex: null,
      });
    }
  }
  return rows;
}

function dumpToAssociationEdges(dump) {
  const nodesById = new Map((dump.nodes || []).map((n) => [n.id, n]));
  const rows = [];
  for (const edge of dump.edges || []) {
    if (!ASSOCIATION_RELATIONS.includes(edge.label)) continue;
    const a = nodesById.get(edge.source);
    const b = nodesById.get(edge.target);
    const props = edge.properties || {};
    rows.push({
      origen: edge.source,
      origenNombre: a?.properties?.nombre_comun ?? null,
      origenCategoria: a?.properties?.categoria ?? null,
      destino: edge.target,
      destinoNombre: b?.properties?.nombre_comun ?? null,
      destinoCategoria: b?.properties?.categoria ?? null,
      relacion: edge.label,
      fuente: props.fuente ?? null,
      doi: props.doi ?? null,
      verificadoOpenalex: props.verificado_openalex ?? null,
    });
  }
  return rows;
}

/**
 * Extrae aristas de asociación normalizadas desde un dump `{nodes, edges}`
 * o un catálogo `{species}`. Modo offline — no toca la DB.
 *
 * @param {object} data
 * @param {{catalogMode?: boolean}} [opts] - fuerza el modo; si se omite,
 *   se auto-detecta por presencia de `data.species` (mismo patrón que
 *   scripts/check-age-integrity.mjs).
 * @returns {Array<object>}
 */
export function extractAssociationEdges(data, opts = {}) {
  const catalogMode = opts.catalogMode ?? !!data.species;
  return catalogMode ? catalogToAssociationEdges(data) : dumpToAssociationEdges(data);
}

// =============================================================================
// Clasificación: ¿tiene fuente? ¿qué prioridad de cultivo insignia?
// =============================================================================

function truthyText(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== 'false' && s !== 'null' && s !== '0' && s !== 'no';
}

/**
 * @param {{fuente?:*, doi?:*, verificadoOpenalex?:*}} row
 * @returns {boolean}
 */
export function hasSource(row) {
  return truthyText(row.fuente) || truthyText(row.doi) || truthyText(row.verificadoOpenalex);
}

function tierOfSide(id, categoria) {
  if (id && MILPA_CLASICA_ID_RE.test(id)) return { tier: 1, label: 'milpa_clasica' };
  if (id && CAFE_ID_RE.test(id)) return { tier: 2, label: 'cafe' };
  if (categoria && HORTALIZA_CATEGORIAS.has(categoria)) return { tier: 3, label: 'hortalizas' };
  return null;
}

/**
 * Clasifica una arista por prioridad de cultivo insignia (la más alta entre
 * origen y destino). tier 1 = más prioritario, tier 4 = "otros".
 *
 * @param {object} row
 * @returns {{tier:number, label:string}}
 */
export function classifyInsignia(row) {
  const a = tierOfSide(row.origen, row.origenCategoria);
  const b = tierOfSide(row.destino, row.destinoCategoria);
  const best = [a, b].filter(Boolean).sort((x, y) => x.tier - y.tier)[0];
  return best || { tier: 4, label: 'otros' };
}

// =============================================================================
// Reporte agregado (puro)
// =============================================================================

/**
 * @param {Array<object>} rows - filas normalizadas (parseAuditRows o extractAssociationEdges)
 * @param {{graph?:string, limit?:number}} [opts]
 */
export function buildAuditReport(rows, opts = {}) {
  const graph = opts.graph || DEFAULT_GRAPH;
  const limit = Number.isFinite(opts.limit) && opts.limit >= 0 ? opts.limit : DEFAULT_LIMIT;

  const total = rows.length;
  const withSourceRows = rows.filter(hasSource);
  const withoutSourceRows = rows.filter((r) => !hasSource(r));
  const pctWithSource = total ? Math.round((withSourceRows.length / total) * 1000) / 10 : 0;

  const byRelation = {};
  for (const rel of ASSOCIATION_RELATIONS) {
    const relRows = rows.filter((r) => r.relacion === rel);
    const relWithSource = relRows.filter(hasSource);
    byRelation[rel] = {
      total: relRows.length,
      withSource: relWithSource.length,
      pctWithSource: relRows.length
        ? Math.round((relWithSource.length / relRows.length) * 1000) / 10
        : 0,
    };
  }

  const missingClassified = withoutSourceRows
    .map((r) => ({ ...r, ...classifyInsignia(r) }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.origen !== b.origen) return a.origen < b.origen ? -1 : 1;
      if (a.destino !== b.destino) return a.destino < b.destino ? -1 : 1;
      return 0;
    });

  const missingByTier = {};
  for (const row of missingClassified) {
    missingByTier[row.label] = (missingByTier[row.label] || 0) + 1;
  }

  const missingTruncated = missingClassified.length > limit;

  return {
    graph,
    totalAssociationEdges: total,
    withSource: withSourceRows.length,
    withoutSource: withoutSourceRows.length,
    pctWithSource,
    byRelation,
    missingByTier,
    missingTruncated,
    missing: missingClassified.slice(0, limit).map((r) => ({
      origen: r.origen,
      origenNombre: r.origenNombre,
      destino: r.destino,
      destinoNombre: r.destinoNombre,
      relacion: r.relacion,
      prioridad: r.label,
    })),
  };
}

const TIER_ORDER = ['milpa_clasica', 'cafe', 'hortalizas', 'otros'];

/**
 * @param {ReturnType<typeof buildAuditReport>} report
 * @returns {string}
 */
export function formatReportText(report) {
  const lines = [];
  lines.push(`Auditoria de citacion — asociacion/milpa — grafo ${report.graph}`);
  lines.push(`Total aristas de asociacion: ${report.totalAssociationEdges}`);
  lines.push(`Con fuente/DOI: ${report.withSource} (${report.pctWithSource}%)`);
  lines.push(`Sin fuente/DOI: ${report.withoutSource}`);
  lines.push('');
  lines.push('Por tipo de relacion:');
  for (const [rel, stats] of Object.entries(report.byRelation)) {
    lines.push(`  ${rel}: ${stats.withSource}/${stats.total} con fuente (${stats.pctWithSource}%)`);
  }
  lines.push('');
  lines.push('Sin fuente, por prioridad de cultivo insignia:');
  for (const label of TIER_ORDER) {
    if (report.missingByTier[label]) {
      lines.push(`  ${label}: ${report.missingByTier[label]}`);
    }
  }
  lines.push('');
  const suffix = report.missingTruncated ? ` [primeras ${report.missing.length} de ${report.withoutSource}]` : '';
  lines.push(`Lista priorizada sin fuente (origen -> destino)${suffix}:`);
  for (const m of report.missing) {
    lines.push(
      `  [${m.prioridad}] ${m.origen} (${m.origenNombre || 's/n'}) -> ${m.destino} (${m.destinoNombre || 's/n'}) [${m.relacion}]`,
    );
  }
  return lines.join('\n');
}

// =============================================================================
// Conexion a AGE — mismo patron que scripts/validate-graph-parity.mjs y
// scripts/load-age-etno-folk-fitopatologia.mjs: CHAGRA_AGE_PSQL_COMMAND
// override, o `sudo podman exec -i postgres-farm psql ...` por defecto.
// Sin credenciales hardcodeadas — todo entra por process.env.
// =============================================================================

export function buildPsqlInvocation() {
  const override = process.env.CHAGRA_AGE_PSQL_COMMAND;
  if (override) {
    return { kind: 'shell', command: override };
  }
  return {
    kind: 'podman',
    file: 'sudo',
    args: [
      'podman', 'exec', '-i', 'postgres-farm',
      'psql', '-U', 'farmos', '-d', 'chagra_kg',
      '-At', '-F', '\t',
    ],
  };
}

export function runPsql(sql) {
  const inv = buildPsqlInvocation();
  if (inv.kind === 'shell') {
    return spawnSync(inv.command, {
      input: sql,
      encoding: 'utf8',
      shell: true,
      env: process.env,
    });
  }
  return spawnSync(inv.file, inv.args, {
    input: sql,
    encoding: 'utf8',
    env: process.env,
  });
}

// =============================================================================
// CLI
// =============================================================================

export function parseArgs(argv) {
  const opts = {
    graph: DEFAULT_GRAPH,
    json: false,
    limit: DEFAULT_LIMIT,
    printSql: false,
    fromDump: null,
    catalogMode: undefined,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--graph') opts.graph = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a === '--print-sql') opts.printSql = true;
    else if (a === '--from-dump') opts.fromDump = argv[++i];
    else if (a === '--catalog-mode') opts.catalogMode = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(
      'Usage: node scripts/audit-milpa-citations.mjs [--graph chagra_kg] [--json]\n'
      + '       [--limit N] [--print-sql] [--from-dump FILE] [--catalog-mode]\n\n'
      + '  --from-dump FILE  Modo offline (NO toca la DB): parsea {nodes,edges} o\n'
      + '                    catalogo {species}. Seguro para CI.\n'
      + '  --print-sql       Imprime el SQL y sale (no ejecuta nada).\n\n'
      + 'Sin --from-dump, consulta chagra_kg vivo via psql. Override con\n'
      + 'CHAGRA_AGE_PSQL_COMMAND; por defecto usa sudo podman exec postgres-farm.',
    );
    return 0;
  }

  const sql = buildMilpaAuditSql(opts.graph);
  if (opts.printSql) {
    console.log(sql);
    return 0;
  }

  let rows;
  if (opts.fromDump) {
    const data = JSON.parse(readFileSync(resolve(opts.fromDump), 'utf8'));
    rows = extractAssociationEdges(data, { catalogMode: opts.catalogMode });
  } else {
    const result = runPsql(sql);
    if (result.error) {
      console.error(`Error ejecutando psql: ${result.error.message}`);
      return 2;
    }
    if (result.status !== 0) {
      if (result.stderr) console.error(String(result.stderr).trim());
      return result.status || 2;
    }
    rows = parseAuditRows(result.stdout);
  }

  const report = buildAuditReport(rows, { graph: opts.graph, limit: opts.limit });
  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReportText(report));
  }
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
