#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_EXPORT = join(ROOT, 'catalog/chagra-catalog-graph-export.json');
const DEFAULT_SCHEMA = join(ROOT, 'catalog/schema-v3.1.json');
const DEFAULT_SEED = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');

const COMPARED_SPECIES_FIELDS = [
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
  'tracking_mode',
];

function loadJson(path) {
  if (!existsSync(path)) throw new Error(`Archivo no encontrado: ${path}`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveRef(schema, ref) {
  if (!ref.startsWith('#/')) throw new Error(`$ref externo no soportado: ${ref}`);
  return ref.slice(2).split('/').reduce((node, part) => node?.[part], schema);
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

export function validateJsonSchema(value, schemaNode, rootSchema = schemaNode, path = '$', errors = []) {
  if (!schemaNode) {
    errors.push(`${path}: schema no resoluble`);
    return errors;
  }
  if (schemaNode.$ref) {
    return validateJsonSchema(value, resolveRef(rootSchema, schemaNode.$ref), rootSchema, path, errors);
  }
  if (schemaNode.const !== undefined && value !== schemaNode.const) {
    errors.push(`${path}: esperado const ${JSON.stringify(schemaNode.const)}, got ${JSON.stringify(value)}`);
  }
  if (schemaNode.enum && !schemaNode.enum.includes(value)) {
    errors.push(`${path}: valor ${JSON.stringify(value)} no esta en enum`);
  }
  if (schemaNode.type) {
    const expected = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
    const actual = typeOf(value);
    const ok = expected.some((type) => {
      if (type === 'number') return actual === 'number';
      if (type === 'integer') return actual === 'number' && Number.isInteger(value);
      return actual === type;
    });
    if (!ok) errors.push(`${path}: tipo esperado ${expected.join('|')}, got ${actual}`);
  }
  if (schemaNode.pattern && typeof value === 'string') {
    const re = new RegExp(schemaNode.pattern);
    if (!re.test(value)) errors.push(`${path}: no cumple pattern ${schemaNode.pattern}`);
  }
  if (typeof value === 'number') {
    if (schemaNode.minimum !== undefined && value < schemaNode.minimum) {
      errors.push(`${path}: ${value} < minimum ${schemaNode.minimum}`);
    }
    if (schemaNode.maximum !== undefined && value > schemaNode.maximum) {
      errors.push(`${path}: ${value} > maximum ${schemaNode.maximum}`);
    }
  }
  if (Array.isArray(value)) {
    if (schemaNode.minItems !== undefined && value.length < schemaNode.minItems) {
      errors.push(`${path}: array tiene ${value.length} items, minimo ${schemaNode.minItems}`);
    }
    if (schemaNode.uniqueItems) {
      const seen = new Set();
      for (const item of value) {
        const key = JSON.stringify(item);
        if (seen.has(key)) {
          errors.push(`${path}: item duplicado ${key}`);
          break;
        }
        seen.add(key);
      }
    }
    if (schemaNode.items) {
      value.forEach((item, index) => validateJsonSchema(item, schemaNode.items, rootSchema, `${path}[${index}]`, errors));
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schemaNode.required || []) {
      if (!(key in value)) errors.push(`${path}: missing required "${key}"`);
    }
    for (const [key, subSchema] of Object.entries(schemaNode.properties || {})) {
      if (key in value) validateJsonSchema(value[key], subSchema, rootSchema, `${path}.${key}`, errors);
    }
    if (schemaNode.additionalProperties === false) {
      const allowed = new Set(Object.keys(schemaNode.properties || {}));
      for (const key of Object.keys(value)) {
        if (!allowed.has(key)) errors.push(`${path}: propiedad adicional no permitida "${key}"`);
      }
    }
  }
  return errors;
}

function normalizeComparable(value) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return JSON.stringify([...value].map(String).sort());
  if (typeof value === 'object') return JSON.stringify(value, Object.keys(value).sort());
  return JSON.stringify(value);
}

export function findSeedConflicts(exportCatalog, seedCatalog) {
  const seedById = new Map((seedCatalog.species || []).map((sp) => [sp.id, sp]));
  const conflicts = [];
  const seenExportIds = new Set();

  for (const sp of exportCatalog.species || []) {
    if (!sp?.id) continue;
    if (seenExportIds.has(sp.id)) {
      conflicts.push({ id: sp.id, field: 'id', seed: null, exported: sp.id, reason: 'duplicate_export_id' });
      continue;
    }
    seenExportIds.add(sp.id);
    const seed = seedById.get(sp.id);
    if (!seed) continue;
    for (const field of COMPARED_SPECIES_FIELDS) {
      const exported = normalizeComparable(sp[field]);
      const seeded = normalizeComparable(seed[field]);
      if (exported === null || seeded === null || exported === seeded) continue;
      conflicts.push({ id: sp.id, field, seed: seed[field], exported: sp[field], reason: 'seed_conflict' });
    }
  }
  return conflicts;
}

export function validateCatalogExport(exportCatalog, schema, seedCatalog) {
  const schemaErrors = validateJsonSchema(exportCatalog, schema);
  const conflicts = findSeedConflicts(exportCatalog, seedCatalog);
  return {
    ok: schemaErrors.length === 0 && conflicts.length === 0,
    schemaErrors,
    conflicts,
    stats: {
      species_exported: exportCatalog.species?.length || 0,
      species_new_vs_seed: (exportCatalog.species || []).filter((sp) => !(seedCatalog.species || []).some((seed) => seed.id === sp.id)).length,
      species_already_in_seed: (exportCatalog.species || []).filter((sp) => (seedCatalog.species || []).some((seed) => seed.id === sp.id)).length,
    },
  };
}

export function parseArgs(argv) {
  const opts = { exportPath: DEFAULT_EXPORT, schemaPath: DEFAULT_SCHEMA, seedPath: DEFAULT_SEED };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--export') opts.exportPath = resolve(argv[++i]);
    else if (arg === '--schema') opts.schemaPath = resolve(argv[++i]);
    else if (arg === '--seed') opts.seedPath = resolve(argv[++i]);
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log('Usage: node scripts/validate-catalog-export.mjs [--export catalog/chagra-catalog-graph-export.json]');
    return 0;
  }
  const exportCatalog = loadJson(opts.exportPath);
  const schema = loadJson(opts.schemaPath);
  const seed = loadJson(opts.seedPath);
  const result = validateCatalogExport(exportCatalog, schema, seed);
  if (!result.ok) {
    for (const error of result.schemaErrors.slice(0, 50)) console.error(`schema: ${error}`);
    for (const conflict of result.conflicts.slice(0, 50)) {
      console.error(`conflict: ${conflict.id}.${conflict.field} seed=${JSON.stringify(conflict.seed)} export=${JSON.stringify(conflict.exported)}`);
    }
    if (result.schemaErrors.length > 50) console.error(`schema: +${result.schemaErrors.length - 50} errores mas`);
    if (result.conflicts.length > 50) console.error(`conflict: +${result.conflicts.length - 50} conflictos mas`);
    return 1;
  }
  console.log(`Catalog export valido: ${result.stats.species_exported} species`);
  console.log(`Nuevas vs seed: ${result.stats.species_new_vs_seed}`);
  console.log(`Ya en seed: ${result.stats.species_already_in_seed}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
