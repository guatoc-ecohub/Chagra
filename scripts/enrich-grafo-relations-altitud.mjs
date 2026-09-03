#!/usr/bin/env node
/**
 * scripts/enrich-grafo-relations-altitud.mjs
 *
 * Fix cross_thermal (bench-contaminacion.mjs midió 40% de contaminación,
 * 6/15, 2026-07-10): el agente recomendaba especies de un piso térmico
 * equivocado porque los servicios de diagnóstico y los guards de salida NO
 * tenían el rango de altitud de cada especie disponible offline — solo el
 * sidecar (chagra-pro, online) lo devolvía en `resolvedEntities`.
 *
 * Este script cierra ese hueco en el lado del cliente: agrega
 * `altitud_min` / `altitud_max` / `temp_min` / `temp_max` / `helada_letal`
 * a cada especie YA presente en `public/grafo-relations.json`, leyendo esos
 * campos DIRECTO del grafo de conocimiento `chagra_kg` (Apache AGE, host
 * `alpha`, ver Chagra-strategy/ops/INFRA_FACTS.md §2). NO agrega especies
 * nuevas — solo enriquece las 134 ya exportadas por
 * `chagra-pro/scripts/export-grafo-offline.mjs` (grafoRelations.js:18-20).
 *
 * Verificado en vivo 2026-07-10: 742 Species en chagra_kg, 571 con
 * altitud_min/altitud_max pobladas. De las 134 especies exportadas a
 * `public/grafo-relations.json`, 133 tienen el dato en el grafo (la única
 * ausente, `ceroxylon_quindiuense`, no tiene nodo Species con ese id en
 * `chagra_kg` — se deja sin enriquecer, degradación graceful, ningún guard
 * exige el dato).
 *
 * ── USO ───────────────────────────────────────────────────────────────────
 *   # 1) imprime el SQL a correr contra chagra_kg (usa los ids YA presentes
 *   #    en public/grafo-relations.json, así el merge nunca inventa ids):
 *   node scripts/enrich-grafo-relations-altitud.mjs --print-sql > q.sql
 *
 *   # 2) correr contra el grafo (fuera de este script, revisión humana
 *   #    primero) y mergear la salida:
 *   cat q.sql | ssh alpha 'sudo podman exec -i postgres-farm psql -U farmos -d chagra_kg -t -A' \
 *     | node scripts/enrich-grafo-relations-altitud.mjs
 *
 * Idempotente: correr dos veces con el mismo snapshot del grafo produce el
 * mismo `public/grafo-relations.json` (excepto `_meta.altitud_enriched_at`).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseGraphRows } from './export-graph-to-catalog.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_TARGET = join(ROOT, 'public/grafo-relations.json');
const DEFAULT_GRAPH = 'chagra_kg';

const ALTITUD_FIELDS = ['altitud_min', 'altitud_max', 'temp_min', 'temp_max', 'helada_letal'];

/**
 * Arma el SQL (LOAD/SET/cypher) que trae altitud_min/altitud_max/temp_min/
 * temp_max/helada_letal de las especies cuyo `id` YA está en `speciesIds`.
 * Restringir a `speciesIds` (en vez de traer TODO chagra_kg, 742 nodos) evita
 * enriquecer con especies fuera del subset offline exportado. PURA.
 * @param {string[]} speciesIds
 * @param {string} [graph]
 * @returns {string}
 */
export function buildAltitudSql(speciesIds, graph = DEFAULT_GRAPH) {
  const graphLiteral = String(graph).replace(/'/g, "''");
  const idsLiteral = `[${speciesIds.map((id) => `'${String(id).replace(/'/g, "''")}'`).join(',')}]`;
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT s
FROM cypher('${graphLiteral}', $$
  MATCH (s:Species)
  WHERE s.id IN ${idsLiteral}
  RETURN {
    id: s.id,
    altitud_min: s.altitud_min,
    altitud_max: s.altitud_max,
    temp_min: s.temp_min,
    temp_max: s.temp_max,
    helada_letal: s.helada_letal
  }
$$) AS (s agtype);
`.trim();
}

/**
 * Filtra los campos de altitud/temp no-nulos de una fila del grafo. PURA.
 * @param {object} row
 * @returns {object}
 */
export function pickAltitudFields(row) {
  const out = {};
  for (const field of ALTITUD_FIELDS) {
    const value = row?.[field];
    if (value === null || value === undefined || value === '') continue;
    const num = Number(value);
    if (!Number.isFinite(num)) continue;
    out[field] = num;
  }
  return out;
}

/**
 * Mergea filas del grafo (id + campos de altitud/temp) dentro del objeto
 * `species` de un `grafo-relations.json` ya cargado. Solo TOCA especies que
 * ya existen en `species` (nunca agrega especies nuevas al catálogo
 * offline). PURA — no muta los argumentos, devuelve un objeto nuevo.
 * @param {object} grafoRelations  raíz completa del JSON (_meta, species, …)
 * @param {object[]} rows          filas parseadas del grafo (id + campos)
 * @returns {{ grafoRelations: object, enriched: number, skippedNotInSpecies: number, skippedNoData: number }}
 */
export function mergeAltitudIntoGrafoRelations(grafoRelations, rows) {
  const species = grafoRelations?.species && typeof grafoRelations.species === 'object' ? grafoRelations.species : {};
  const nextSpecies = { ...species };
  let enriched = 0;
  let skippedNotInSpecies = 0;
  let skippedNoData = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const id = row?.id;
    if (!id || typeof id !== 'string') continue;
    if (!Object.prototype.hasOwnProperty.call(nextSpecies, id)) {
      skippedNotInSpecies += 1;
      continue;
    }
    const fields = pickAltitudFields(row);
    if (Object.keys(fields).length === 0) {
      skippedNoData += 1;
      continue;
    }
    nextSpecies[id] = { ...nextSpecies[id], ...fields };
    enriched += 1;
  }

  return {
    grafoRelations: { ...grafoRelations, species: nextSpecies },
    enriched,
    skippedNotInSpecies,
    skippedNoData,
  };
}

function readStdin() {
  return readFileSync(0, 'utf8');
}

export function parseArgs(argv) {
  const opts = { target: DEFAULT_TARGET, graph: DEFAULT_GRAPH, printSql: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--target') opts.target = resolve(argv[++i]);
    else if (arg === '--graph') opts.graph = argv[++i];
    else if (arg === '--print-sql') opts.printSql = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log('Usage: node scripts/enrich-grafo-relations-altitud.mjs [--print-sql] [--target public/grafo-relations.json] [--graph chagra_kg]');
    return 0;
  }
  if (!existsSync(opts.target)) {
    console.error(`[enrich-grafo-relations-altitud] no existe: ${opts.target}`);
    return 1;
  }
  const current = JSON.parse(readFileSync(opts.target, 'utf8'));

  if (opts.printSql) {
    const ids = Object.keys(current.species || {});
    console.log(buildAltitudSql(ids, opts.graph));
    return 0;
  }

  const rows = parseGraphRows(readStdin());
  const { grafoRelations: merged, enriched, skippedNotInSpecies, skippedNoData } = mergeAltitudIntoGrafoRelations(current, rows);
  merged._meta = {
    ...merged._meta,
    altitud_enriched_at: new Date().toISOString(),
    altitud_enriched_source: 'chagra_kg (Apache AGE) vía scripts/enrich-grafo-relations-altitud.mjs',
    altitud_enriched_fields: ALTITUD_FIELDS,
    altitud_enriched_count: enriched,
  };
  writeFileSync(opts.target, `${JSON.stringify(merged, null, 2)}\n`);
  console.log(`Especies enriquecidas: ${enriched}`);
  console.log(`Filas del grafo sin match en species (ignoradas): ${skippedNotInSpecies}`);
  console.log(`Filas del grafo sin ningún campo de altitud/temp (ignoradas): ${skippedNoData}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
