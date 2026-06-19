#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeCatalogRef } from './validate-catalog-consistency.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_OUTPUT = join(ROOT, 'catalog/chagra-catalog-graph-export.json');
const DEFAULT_SEED = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
const DEFAULT_GRAPH = 'chagra_kg';

export function buildGraphExportSql(graph = DEFAULT_GRAPH) {
  const graphLiteral = String(graph).replace(/'/g, "''");
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
SELECT row
FROM cypher('${graphLiteral}', $$
  MATCH (s:Species)
  OPTIONAL MATCH (s)-[:HAS_FAMILY]->(family:Family)
  WITH s, family
  OPTIONAL MATCH (s)-[:ASOCIA_CON]->(assoc:Species)
  WITH s, family, collect(DISTINCT assoc.id) AS asocia_con
  OPTIONAL MATCH (s)-[:COMPATIBLE_WITH]->(compat:Species)
  WITH s, family, asocia_con, collect(DISTINCT compat.id) AS compatible_with
  OPTIONAL MATCH (s)-[ub:USED_AS_BIOPREPARADO]->(bio:Biopreparado)
  WITH s, family, asocia_con, compatible_with,
       collect(DISTINCT {
         id: bio.id,
         nombre: bio.nombre,
         tipo: bio.tipo,
         dosis: coalesce(ub.dosis, bio.dosis_aplicacion, bio.dosis),
         carencia: coalesce(ub.carencia, bio.carencia),
         registro_ICA: coalesce(ub.registro_ICA, bio.registro_ICA),
         etapa: ub.etapa,
         source: ub.source
       }) AS biopreparados
  OPTIONAL MATCH (s)-[ctrl:CONTROLS]->(target)
  WITH s, family, asocia_con, compatible_with, biopreparados,
       collect(DISTINCT {
         id: target.id,
         dosis: ctrl.dosis,
         carencia: ctrl.carencia,
         registro_ICA: ctrl.registro_ICA,
         tipo: ctrl.tipo
       }) AS controles_directos
  OPTIONAL MATCH (s)-[stage_rel:TIENE_ETAPA]->(stage)
  WITH s, family, asocia_con, compatible_with, biopreparados, controles_directos,
       collect(DISTINCT {
         id: stage.id,
         nombre: coalesce(stage.nombre, stage.name),
         orden: coalesce(stage_rel.orden, stage.orden),
         duracion_dias: coalesce(stage_rel.duracion_dias, stage.duracion_dias)
       }) AS fenologia
  RETURN {
    id: s.id,
    nombre_comun: s.nombre_comun,
    nombre_cientifico: s.nombre_cientifico,
    familia_botanica: coalesce(family.nombre, family.id, s.familia_botanica),
    category: coalesce(s.category, s.categoria),
    thermal_zones: s.thermal_zones,
    roles_in_guild: s.roles_in_guild,
    cultivable: s.cultivable,
    conservation_status: s.conservation_status,
    altitud_min: s.altitud_min,
    altitud_max: s.altitud_max,
    altitud_min_msnm: s.altitud_min_msnm,
    altitud_max_msnm: s.altitud_max_msnm,
    altitud_msnm: s.altitud_msnm,
    source_ids: s.source_ids,
    fuente_agroclima: s.fuente_agroclima,
    fuente_agroclima_url: s.agroclima_url,
    suelo_fuente: s.suelo_fuente,
    companions: asocia_con + compatible_with,
    biopreparados: biopreparados,
    controles_directos: controles_directos,
    fenologia: fenologia,
    tracking_mode: s.tracking_mode
  } AS row
  ORDER BY s.id
$$) AS (row agtype);
`.trim();
}

function readStdin() {
  return readFileSync(0, 'utf8');
}

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
    if (parts.length === 1 && parts[0].startsWith('{')) {
      rows.push(parseAgtypeMap(parts[0]));
      continue;
    }
    if (parts.length >= 2) {
      rows.push({
        id: stripAgtypeScalar(parts[0]),
        nombre_cientifico: stripAgtypeScalar(parts[1]),
        familia_botanica: stripAgtypeScalar(parts[2]),
      });
    }
  }
  return rows.filter(Boolean);
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((item) => item !== null && item !== undefined && item !== '');
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return asArray(parsed);
    } catch {
      return trimmed.split('|').map((item) => item.trim()).filter(Boolean);
    }
  }
  return [value];
}

function uniqSorted(values) {
  return Array.from(new Set(values.filter(Boolean).map(String))).sort();
}

const CATEGORY_MAP = {
  arbol: 'arboles_sombra',
  cereal: 'cereales',
  fibra: 'fibras_no_maderables',
  forestal: 'arboles_sombra',
  forrajera: 'abonos_verdes_coberturas',
  frutal: 'frutales_perennes',
  hortaliza: 'hortalizas_fruto_flor',
  leguminosa: 'granos_legumbres',
  medicinal: 'medicinales_alelopaticas',
  ornamental: 'ornamentales_nativas',
  pasto: 'abonos_verdes_coberturas',
  tuberculo: 'tuberculos_raices',
};

const ROLE_BY_CATEGORY = {
  abonos_verdes_coberturas: 'ground_cover',
  arboles_sombra: 'nurse_plant',
  atractores_polinizadores: 'pollinator_attractor',
  cereales: 'crop',
  cercas_vivas: 'living_fence',
  fibras_no_maderables: 'crop',
  frutales_perennes: 'crop',
  granos_legumbres: 'crop',
  hortalizas_fruto_flor: 'crop',
  hortalizas_hoja: 'crop',
  medicinales_alelopaticas: 'pest_repellent',
  ornamentales_nativas: 'pollinator_attractor',
  tuberculos_raices: 'crop',
};

const SOURCE_FIELDS = new Set([
  'id',
  'tipo',
  'autores',
  'año',
  'titulo',
  'revista_o_editorial',
  'volumen_numero',
  'paginas',
  'doi',
  'isbn',
  'url',
  'institucion',
  'observaciones',
  'tier',
]);

const BIOPREPARADO_FIELDS = new Set([
  'id',
  'nombre',
  'tipo',
  'proposito',
  'ingredientes',
  'proceso_resumen',
  'tiempo_elaboracion_dias',
  'vida_util_dias',
  'source_ids',
  'uso',
  'dosis',
  'dosis_aplicacion',
  'frecuencia',
  'metodo',
  'precaucion_seguridad',
  'fuente',
  'confianza',
  'target',
  'valor_pedagogico',
  '_curation_status',
]);

function cleanObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === null || item === undefined || item === '') continue;
    if (Array.isArray(item) && item.length === 0) continue;
    out[key] = item;
  }
  return out;
}

function pickAllowed(value, allowed) {
  const cleaned = cleanObject(value);
  const out = {};
  for (const [key, item] of Object.entries(cleaned || {})) {
    if (allowed.has(key)) out[key] = item;
  }
  return out;
}

function sanitizeSource(source) {
  return pickAllowed(source, SOURCE_FIELDS);
}

function sanitizeBiopreparado(bp) {
  return pickAllowed(bp, BIOPREPARADO_FIELDS);
}

function normalizeBio(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = entry.id || entry.biopreparado_id;
  if (!id) return null;
  return cleanObject({
    id: String(id),
    nombre: entry.nombre || entry.name || String(id),
    tipo: entry.tipo || null,
    dosis: entry.dosis || entry.dosis_aplicacion || null,
    carencia: entry.carencia || null,
    registro_ICA: entry.registro_ICA || entry.registro_ica || null,
    etapa: entry.etapa || null,
    source: entry.source || null,
  });
}

function normalizeStage(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = entry.id || entry.nombre || entry.name;
  if (!id) return null;
  return cleanObject({
    id: String(id),
    nombre: entry.nombre || entry.name || String(id),
    orden: entry.orden ?? null,
    duracion_dias: entry.duracion_dias ?? null,
  });
}

function normalizeAltitude(row) {
  if (row.altitud_msnm && typeof row.altitud_msnm === 'object') return row.altitud_msnm;
  const min = row.altitud_min ?? row.altitud_min_msnm ?? row.altitud_optimo_min ?? row.altitudMin ?? null;
  const max = row.altitud_max ?? row.altitud_max_msnm ?? row.altitud_optimo_max ?? row.altitudMax ?? null;
  if (min === null || max === null) return null;
  return {
    min_absoluto: Number(min),
    optimo_min: Number(min),
    optimo_max: Number(max),
    max_absoluto: Number(max),
  };
}

function thermalZonesFromAltitude(altitude) {
  if (!altitude) return [];
  const min = Number(altitude.min_absoluto);
  const max = Number(altitude.max_absoluto);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  const zones = [];
  if (min < 1000 && max >= 0) zones.push('calido');
  if (min < 2000 && max >= 1000) zones.push('templado');
  if (min < 3000 && max >= 2000) zones.push('frio');
  if (max >= 3000) zones.push('paramo');
  return zones;
}

function normalizeCategory(value) {
  if (!value) return null;
  const raw = normalizeCatalogRef(value);
  return CATEGORY_MAP[raw] || raw;
}

function sourceFromText(text, suffix) {
  if (!text) return null;
  const id = `graph_${normalizeCatalogRef(text).slice(0, 70)}_${suffix}`;
  return cleanObject({
    id,
    tipo: 'ficha_tecnica_institucional',
    autores: String(text),
    titulo: String(text),
    institucion: String(text),
    tier: 'B',
  });
}

function requiredReady(species) {
  return [
    'id',
    'nombre_comun',
    'nombre_cientifico',
    'familia_botanica',
    'category',
    'thermal_zones',
    'roles_in_guild',
    'cultivable',
    'conservation_status',
    'altitud_msnm',
    'source_ids',
  ].every((field) => {
    const value = species[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== '';
  });
}

export function graphRowsToCatalog(rows, opts = {}) {
  const seed = opts.seed || {};
  const seedById = new Map(asArray(seed.species).map((sp) => [sp.id, sp]));
  const seedIds = new Set(seedById.keys());
  const seedSourcesById = new Map(asArray(seed.sources).map((source) => [source.id, source]));
  const seedBiosById = new Map(asArray(seed.biopreparados).map((bp) => [bp.id, bp]));
  const species = [];
  const biopreparadoMap = new Map();
  const sourceMap = new Map();
  const skipped = [];
  const emittedIds = new Set();

  for (const row of rows) {
    if (!row?.id) continue;
    const rowId = String(row.id);
    if (emittedIds.has(rowId)) continue;
    emittedIds.add(rowId);
    const bios = asArray(row.biopreparados).map(normalizeBio).filter(Boolean);
    for (const bp of bios) {
      if (seedBiosById.has(bp.id)) biopreparadoMap.set(bp.id, sanitizeBiopreparado(seedBiosById.get(bp.id)));
    }

    if (seedById.has(rowId)) {
      const seedSpecies = structuredClone(seedById.get(rowId));
      seedSpecies.graph_export_meta = { already_in_seed: true };
      species.push(seedSpecies);
      for (const sourceId of asArray(seedSpecies.source_ids)) {
        if (seedSourcesById.has(sourceId)) sourceMap.set(sourceId, sanitizeSource(seedSourcesById.get(sourceId)));
      }
      for (const step of asArray(seedSpecies.feeding_plan_template?.primary_steps)) {
        const bpId = step?.biofertilizer_slug;
        if (seedBiosById.has(bpId)) biopreparadoMap.set(bpId, sanitizeBiopreparado(seedBiosById.get(bpId)));
      }
      continue;
    }

    const altitude = normalizeAltitude(row);
    const category = normalizeCategory(row.category || row.categoria);
    const sourceCandidates = [
      sourceFromText(row.fuente_agroclima, 'agroclima'),
      sourceFromText(row.suelo_fuente, 'suelo'),
    ].filter(Boolean);
    for (const source of sourceCandidates) sourceMap.set(source.id, source);
    const sourceIds = uniqSorted([
      ...asArray(row.source_ids),
      ...sourceCandidates.map((source) => source.id),
    ]);
    const roles = uniqSorted(asArray(row.roles_in_guild));
    if (roles.length === 0 && ROLE_BY_CATEGORY[category]) roles.push(ROLE_BY_CATEGORY[category]);
    const thermalZones = uniqSorted(asArray(row.thermal_zones));
    if (thermalZones.length === 0) thermalZones.push(...thermalZonesFromAltitude(altitude));

    const sp = cleanObject({
      id: String(row.id),
      nombre_comun: row.nombre_comun || row.nombre || row.common_name || null,
      nombre_cientifico: row.nombre_cientifico || row.scientific_name || null,
      familia_botanica: row.familia_botanica || row.familia || null,
      category,
      thermal_zones: thermalZones,
      roles_in_guild: roles,
      cultivable: typeof row.cultivable === 'boolean' ? row.cultivable : row.cultivable ?? null,
      conservation_status: row.conservation_status || 'no_evaluada',
      altitud_msnm: altitude,
      source_ids: sourceIds,
      companions: uniqSorted(asArray(row.companions).map((value) => normalizeCatalogRef(value))),
      tracking_mode: row.tracking_mode ?? null,
      fenologia: asArray(row.fenologia).map(normalizeStage).filter(Boolean),
      graph_export_meta: cleanObject({
        already_in_seed: seedIds.has(String(row.id)),
        biopreparados: bios,
        controles_directos: asArray(row.controles_directos).filter(Boolean),
      }),
    });

    if (!requiredReady(sp)) {
      skipped.push({
        id: String(row.id),
        reason: 'missing_required_v3_1_fields',
        missing: [
          !sp.category && 'category',
          (!sp.thermal_zones || sp.thermal_zones.length === 0) && 'thermal_zones',
          (!sp.roles_in_guild || sp.roles_in_guild.length === 0) && 'roles_in_guild',
          !sp.altitud_msnm && 'altitud_msnm',
          (!sp.source_ids || sp.source_ids.length === 0) && 'source_ids',
          !sp.nombre_comun && 'nombre_comun',
          !sp.nombre_cientifico && 'nombre_cientifico',
          !sp.familia_botanica && 'familia_botanica',
        ].filter(Boolean),
      });
      continue;
    }
    species.push(sp);
  }

  species.sort((a, b) => a.id.localeCompare(b.id));
  const biopreparados = Array.from(biopreparadoMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const sources = Array.from(sourceMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const newSpecies = species.filter((sp) => !seedIds.has(sp.id)).length;
  const existingSpecies = species.length - newSpecies;

  return {
    _meta: {
      generated_by: 'scripts/export-graph-to-catalog.mjs',
      generated_at: new Date().toISOString(),
      source: 'Apache AGE graph via STDIN',
    },
    schema_version: seed.schema_version || '3.1',
    seed_version: 'graph-export-2026-06-19',
    generated_by: 'scripts/export-graph-to-catalog.mjs',
    _graph_export_meta: {
      species_exported: species.length,
      species_new_vs_seed: newSpecies,
      species_already_in_seed: existingSpecies,
      species_skipped_not_schema_ready: skipped.length,
      skipped_examples: skipped.slice(0, 20),
    },
    species,
    sources,
    biopreparados,
  };
}

export function parseArgs(argv) {
  const opts = {
    output: DEFAULT_OUTPUT,
    seed: DEFAULT_SEED,
    graph: DEFAULT_GRAPH,
    printSql: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--output') opts.output = resolve(argv[++i]);
    else if (arg === '--seed') opts.seed = resolve(argv[++i]);
    else if (arg === '--graph') opts.graph = argv[++i];
    else if (arg === '--print-sql') opts.printSql = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log('Usage: node scripts/export-graph-to-catalog.mjs [--output catalog/chagra-catalog-graph-export.json]');
    console.log('       node scripts/export-graph-to-catalog.mjs --print-sql | psql ... | node scripts/export-graph-to-catalog.mjs');
    return 0;
  }
  if (opts.printSql) {
    console.log(buildGraphExportSql(opts.graph));
    return 0;
  }

  const seed = existsSync(opts.seed) ? JSON.parse(readFileSync(opts.seed, 'utf8')) : {};
  const rows = parseGraphRows(readStdin());
  const catalog = graphRowsToCatalog(rows, { seed });
  writeFileSync(opts.output, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Graph catalog export written: ${opts.output}`);
  console.log(`Species exportadas: ${catalog._graph_export_meta.species_exported}`);
  console.log(`Species nuevas vs seed: ${catalog._graph_export_meta.species_new_vs_seed}`);
  console.log(`Species ya en seed: ${catalog._graph_export_meta.species_already_in_seed}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
