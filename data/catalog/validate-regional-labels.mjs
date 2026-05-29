#!/usr/bin/env node
/**
 * validate-regional-labels.mjs
 * ================================================================
 * Validador del catálogo regional-labels-v3.3.json contra schema.
 * Validaciones:
 *   1. JSON Schema (estructura, tipos, enums)
 *   2. Etiquetas únicas (no duplicados)
 *   3. ConfusionWarnings con IDs únicos
 *   4. Referencias cruzadas (confusion_ids en regional_labels)
 *   5. Regiones válidas (enum de 20 regiones)
 *   6. Campos obligatorios presentes
 *
 * Uso:
 *   node data/catalog/validate-regional-labels.mjs [catalog.json]
 *
 * Defaults:
 *   catalog = data/catalog/regional-labels-v3.3.json
 *
 * Exit codes:
 *   0 — OK
 *   1 — fallo de validación
 *   2 — archivo no encontrado o JSON inválido
 * ================================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');

const args = process.argv.slice(2);
const catalogArg = args[0] || join(ROOT, 'data/catalog/regional-labels-v3.3.json');
const CATALOG_PATH = resolve(catalogArg);

// Enum de regiones válidas (debe coincidir con schema)
const VALID_REGIONS = new Set([
  'andina_norte',
  'andina_centro',
  'andina_sur',
  'antioquia',
  'eje_cafetero',
  'cundiboyacense',
  'caribe',
  'caribe_sabanero',
  'guajira',
  'cesar',
  'magdalena',
  'pacifica',
  'choco',
  'palenque',
  'orinoquia',
  'meta',
  'casanare',
  'arauca',
  'amazonia',
  'putumayo',
  'caqueta',
  'transversal'
]);

const VALID_ENTITY_TYPES = new Set(['species', 'labor', 'biopreparado', 'unidad', 'plaga']);
const VALID_CONFIDENCE = new Set(['alto', 'medio', 'bajo']);
const VALID_SOURCE = new Set(['ALEC', 'ICA', 'AGROSAVIA', 'CENICAFE', 'CORPOICA', 'BERNAL_GALEANO', 'DR_LANG_2', 'CAMPO']);
const VALID_SEVERITY = new Set(['critical', 'high', 'medium', 'low']);

function die(code, msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(code);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.warn(`\x1b[33m⚠ ${msg}\x1b[0m`);
}

function loadJSON(path) {
  if (!existsSync(path)) die(2, `Archivo no encontrado: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(2, `JSON inválido en ${path}: ${e.message}`);
  }
}

// Validadores
function validateSchema(catalog) {
  const errors = [];

  // Campos raíz obligatorios
  const requiredRoot = ['schema_version', 'generated_at', 'generated_by', 'description', 'stats', 'regional_labels', 'confusion_warnings'];
  for (const field of requiredRoot) {
    if (!(field in catalog)) {
      errors.push(`Campo raíz faltante: ${field}`);
    }
  }

  // Stats
  if (catalog.stats) {
    const requiredStats = ['total_regional_labels', 'total_confusion_warnings', 'regions_covered', 'high_confidence_entries'];
    for (const field of requiredStats) {
      if (!(field in catalog.stats)) {
        errors.push(`Campo stats faltante: ${field}`);
      }
    }
  }

  // Arrays presentes
  if (!Array.isArray(catalog.regional_labels)) {
    errors.push('regional_labels debe ser un array');
  }
  if (!Array.isArray(catalog.confusion_warnings)) {
    errors.push('confusion_warnings debe ser un array');
  }

  return errors;
}

function validateRegionalLabels(labels, confusionWarnings) {
  const errors = [];
  const warnings = [];
  const seenLabels = new Set();
  const confusionIds = new Set(confusionWarnings.map(w => w.id));

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const prefix = `regional_labels[${i}]`;

    // Campos obligatorios
    const required = ['label', 'entity_type', 'regions', 'confidence', 'source', 'added_at'];
    for (const field of required) {
      if (!(field in label)) {
        errors.push(`${prefix}: campo faltante ${field}`);
      }
    }

    // Tipos
    if (typeof label.label !== 'string') {
      errors.push(`${prefix}: label debe ser string`);
    }
    if (label.label && label.label.trim().length === 0) {
      errors.push(`${prefix}: label está vacío`);
    }
    if (label.label && seenLabels.has(label.label.trim().toLowerCase())) {
      warnings.push(`${prefix}: label duplicado "${label.label}" (case-insensitive)`);
    }
    if (label.label) {
      seenLabels.add(label.label.trim().toLowerCase());
    }

    if (label.entity_type && !VALID_ENTITY_TYPES.has(label.entity_type)) {
      errors.push(`${prefix}: entity_type "${label.entity_type}" inválido (debe ser ${[...VALID_ENTITY_TYPES].join(', ')})`);
    }

    if (!Array.isArray(label.regions)) {
      errors.push(`${prefix}: regions debe ser un array`);
    } else {
      for (let j = 0; j < label.regions.length; j++) {
        const region = label.regions[j];
        if (!VALID_REGIONS.has(region)) {
          errors.push(`${prefix}.regions[${j}]: región inválida "${region}"`);
        }
      }
    }

    if (label.confidence && !VALID_CONFIDENCE.has(label.confidence)) {
      errors.push(`${prefix}: confidence "${label.confidence}" inválido`);
    }

    if (label.source && !VALID_SOURCE.has(label.source)) {
      errors.push(`${prefix}: source "${label.source}" inválido`);
    }

    // Referencias a confusion_warnings
    if (label.confusion_ids) {
      if (!Array.isArray(label.confusion_ids)) {
        errors.push(`${prefix}: confusion_ids debe ser un array`);
      } else {
        for (const cid of label.confusion_ids) {
          if (!confusionIds.has(cid)) {
            errors.push(`${prefix}: confusion_id "${cid}" no existe en confusion_warnings`);
          }
        }
      }
    }

    // species_id opcional pero si está presente debe ser string
    if (label.species_id !== undefined && typeof label.species_id !== 'string') {
      errors.push(`${prefix}: species_id debe ser string o undefined`);
    }
  }

  return { errors, warnings };
}

function validateConfusionWarnings(warnings) {
  const errors = [];
  const seenIds = new Set();

  for (let i = 0; i < warnings.length; i++) {
    const warning = warnings[i];
    const prefix = `confusion_warnings[${i}]`;

    // Campos obligatorios
    const required = ['id', 'label_ambiguo', 'meaning_correct', 'meaning_wrong', 'region_specific', 'severity', 'example_query', 'explanation', 'added_at'];
    for (const field of required) {
      if (!(field in warning)) {
        errors.push(`${prefix}: campo faltante ${field}`);
      }
    }

    // Tipos
    if (typeof warning.id !== 'string') {
      errors.push(`${prefix}: id debe ser string`);
    }
    if (warning.id && seenIds.has(warning.id)) {
      errors.push(`${prefix}: id duplicado "${warning.id}"`);
    }
    if (warning.id) {
      seenIds.add(warning.id);
    }

    if (typeof warning.label_ambiguo !== 'string') {
      errors.push(`${prefix}: label_ambiguo debe ser string`);
    }

    if (!Array.isArray(warning.meaning_wrong)) {
      errors.push(`${prefix}: meaning_wrong debe ser un array`);
    } else if (warning.meaning_wrong.length === 0) {
      errors.push(`${prefix}: meaning_wrong no puede estar vacío`);
    }

    if (warning.region_specific !== null && !Array.isArray(warning.region_specific)) {
      errors.push(`${prefix}: region_specific debe ser null o un array`);
    } else if (Array.isArray(warning.region_specific)) {
      for (let j = 0; j < warning.region_specific.length; j++) {
        const region = warning.region_specific[j];
        if (!VALID_REGIONS.has(region)) {
          errors.push(`${prefix}.region_specific[${j}]: región inválida "${region}"`);
        }
      }
    }

    if (warning.severity && !VALID_SEVERITY.has(warning.severity)) {
      errors.push(`${prefix}: severity "${warning.severity}" inválido`);
    }

    if (typeof warning.example_query !== 'string') {
      errors.push(`${prefix}: example_query debe ser string`);
    }
    if (warning.example_query && warning.example_query.trim().length === 0) {
      errors.push(`${prefix}: example_query está vacío`);
    }

    if (typeof warning.explanation !== 'string') {
      errors.push(`${prefix}: explanation debe ser string`);
    }
    if (warning.explanation && warning.explanation.trim().length < 20) {
      errors.push(`${prefix}: explanation muy corta (mínimo 20 chars)`);
    }
  }

  return errors;
}

function validateStats(catalog) {
  const errors = [];

  const stats = catalog.stats;
  if (!stats) return errors;

  // Verificar que los números coinciden con los arrays
  if (stats.total_regional_labels !== catalog.regional_labels.length) {
    errors.push(`stats.total_regional_labels (${stats.total_regional_labels}) != regional_labels.length (${catalog.regional_labels.length})`);
  }

  if (stats.total_confusion_warnings !== catalog.confusion_warnings.length) {
    errors.push(`stats.total_confusion_warnings (${stats.total_confusion_warnings}) != confusion_warnings.length (${catalog.confusion_warnings.length})`);
  }

  // Verificar high_confidence_entries
  const highConfidenceCount = catalog.regional_labels.filter(l => l.confidence === 'alto').length;
  if (stats.high_confidence_entries !== highConfidenceCount) {
    errors.push(`stats.high_confidence_entries (${stats.high_confidence_entries}) != actual count (${highConfidenceCount})`);
  }

  // Verificar regions_covered
  const regionsFound = new Set();
  for (const label of catalog.regional_labels) {
    for (const region of label.regions || []) {
      regionsFound.add(region);
    }
  }
  if (stats.regions_covered !== regionsFound.size) {
    errors.push(`stats.regions_covered (${stats.regions_covered}) != actual unique regions (${regionsFound.size})`);
  }

  return errors;
}

function validateRegionMetadata(metadata) {
  const errors = [];

  if (!metadata) return errors; // opcional

  for (const [regionKey, data] of Object.entries(metadata)) {
    if (!VALID_REGIONS.has(regionKey)) {
      errors.push(`region_metadata: clave inválida "${regionKey}"`);
      continue;
    }

    if (!data || typeof data !== 'object') {
      errors.push(`region_metadata.${regionKey}: debe ser un objeto`);
      continue;
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push(`region_metadata.${regionKey}.name: faltante o no string`);
    }

    if (!data.main_departamentos || !Array.isArray(data.main_departamentos)) {
      errors.push(`region_metadata.${regionKey}.main_departamentos: faltante o no array`);
    }
  }

  return errors;
}

// Main
const catalogPath = CATALOG_PATH;
console.log('Regional Labels Validator v3.3');
console.log(`  catalog: ${catalogPath}`);
console.log('');

const catalog = loadJSON(catalogPath);

let hasErrors = false;
let hasWarnings = false;

// 1. Schema básico
const schemaErrors = validateSchema(catalog);
if (schemaErrors.length > 0) {
  console.error('  ✗ Schema validation:');
  for (const e of schemaErrors) console.error(`    ${e}`);
  hasErrors = true;
} else {
  ok('Schema validation');
}

// 2. RegionalLabels
const { errors: labelErrors, warnings: labelWarnings } = validateRegionalLabels(
  catalog.regional_labels || [],
  catalog.confusion_warnings || []
);
if (labelErrors.length > 0) {
  console.error('  ✗ RegionalLabels validation:');
  for (const e of labelErrors) console.error(`    ${e}`);
  hasErrors = true;
} else if (labelWarnings.length > 0) {
  console.warn('  ⚠ RegionalLabels warnings:');
  for (const w of labelWarnings.slice(0, 10)) console.warn(`    ${w}`);
  if (labelWarnings.length > 10) console.warn(`    ... +${labelWarnings.length - 10} más`);
  hasWarnings = true;
} else {
  ok('RegionalLabels validation');
}

// 3. ConfusionWarnings
const warningErrors = validateConfusionWarnings(catalog.confusion_warnings || []);
if (warningErrors.length > 0) {
  console.error('  ✗ ConfusionWarnings validation:');
  for (const e of warningErrors) console.error(`    ${e}`);
  hasErrors = true;
} else {
  ok('ConfusionWarnings validation');
}

// 4. Stats
const statsErrors = validateStats(catalog);
if (statsErrors.length > 0) {
  console.error('  ✗ Stats validation:');
  for (const e of statsErrors) console.error(`    ${e}`);
  hasErrors = true;
} else {
  ok('Stats validation');
}

// 5. RegionMetadata (opcional)
const metadataErrors = validateRegionMetadata(catalog.region_metadata);
if (metadataErrors.length > 0) {
  console.error('  ✗ RegionMetadata validation:');
  for (const e of metadataErrors) console.error(`    ${e}`);
  hasErrors = true;
} else if (catalog.region_metadata) {
  ok('RegionMetadata validation');
}

// Resumen
console.log('');
if (hasErrors) {
  console.error(`\x1b[31m✗ Validación fallida\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m✓ Catálogo regional-labels-v3.3 válido\x1b[0m');
  console.log(`  ${catalog.regional_labels.length} regional_labels, ${catalog.confusion_warnings.length} confusion_warnings`);
  if (hasWarnings) {
    console.warn('  ⚠ Warnings presentes (revisar arriba)');
    process.exit(0);
  }
  process.exit(0);
}
