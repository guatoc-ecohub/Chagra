#!/usr/bin/env node
/**
 * validate-catalog.mjs
 * ================================================================
 * Validador del catálogo Chagra contra schema v3.1 + 5 validadores
 * de consistencia de las ambigüedades resueltas (AMB-05, 10, 13,
 * 14, 15) del v3.0.
 *
 * Uso:
 *   node scripts/validate-catalog.mjs <catalog.json> [schema.json]
 *
 * Defaults:
 *   catalog = catalog/chagra-catalog-seed-v3.1.json
 *   schema  = catalog/schema-v3.1.json
 *
 * Exit codes:
 *   0 — OK
 *   1 — fallo de JSON Schema (AJV)
 *   2 — fallo de validador semántico (AMB-05/10/13/14/15)
 *   3 — archivo no encontrado o JSON inválido
 *
 * Dependencias: ninguna fuera de stdlib Node. Implementa un subset
 * mínimo de JSON Schema (enough para v3.1) para evitar requerir npm
 * install en Chagra-strategy (que no tiene package.json). Si el
 * schema crece en complejidad, migrar a AJV:
 *   npm i -D ajv
 * y reemplazar validateAgainstSchema() por ajv.compile(schema).
 * ================================================================
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const SEED_MODE = args.includes('--seed-mode');
const positional = args.filter((a) => !a.startsWith('--'));
const [catalogArg, schemaArg] = positional;
const CATALOG_PATH = catalogArg
  ? resolve(catalogArg)
  : join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
const SCHEMA_PATH = schemaArg
  ? resolve(schemaArg)
  : join(ROOT, 'catalog/schema-v3.1.json');

function die(code, msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`);
  process.exit(code);
}

function ok(msg) { console.log(`\x1b[32m✓\x1b[0m ${msg}`); }
function warn(msg) { console.warn(`\x1b[33m⚠ ${msg}\x1b[0m`); }

function loadJSON(path) {
  if (!existsSync(path)) die(3, `Archivo no encontrado: ${path}`);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    die(3, `JSON inválido en ${path}: ${e.message}`);
  }
}

// ----------------------------------------------------------------
// Validador de JSON Schema mínimo (draft-07 subset para v3.1).
// Solo lo necesario: type, enum, const, required, properties,
// items, additionalProperties, pattern, minItems, uniqueItems,
// minimum/maximum, $ref (a #/definitions/*), allOf, if/then.
// ----------------------------------------------------------------

function resolveRef(schema, ref) {
  if (!ref.startsWith('#/')) throw new Error(`$ref externo no soportado: ${ref}`);
  const parts = ref.slice(2).split('/');
  let node = schema;
  for (const p of parts) {
    node = node?.[p];
    if (node === undefined) throw new Error(`$ref no resoluble: ${ref}`);
  }
  return node;
}

function validate(value, schemaNode, rootSchema, path, errors) {
  if (schemaNode.$ref) {
    const deref = resolveRef(rootSchema, schemaNode.$ref);
    validate(value, deref, rootSchema, path, errors);
    return;
  }

  if (schemaNode.const !== undefined && value !== schemaNode.const) {
    errors.push(`${path}: esperado const ${JSON.stringify(schemaNode.const)}, got ${JSON.stringify(value)}`);
  }

  if (schemaNode.enum && !schemaNode.enum.includes(value)) {
    errors.push(`${path}: valor "${value}" no está en enum [${schemaNode.enum.join(', ')}]`);
  }

  if (schemaNode.type) {
    const types = Array.isArray(schemaNode.type) ? schemaNode.type : [schemaNode.type];
    const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    const matches = types.some((t) => {
      if (t === 'number' || t === 'integer') return actual === 'number';
      return actual === t;
    });
    if (!matches) errors.push(`${path}: tipo esperado ${types.join('|')}, got ${actual}`);
  }

  if (schemaNode.pattern && typeof value === 'string') {
    const re = new RegExp(schemaNode.pattern);
    if (!re.test(value)) errors.push(`${path}: "${value}" no matches pattern ${schemaNode.pattern}`);
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
      errors.push(`${path}: array tiene ${value.length} items, mínimo ${schemaNode.minItems}`);
    }
    if (schemaNode.uniqueItems) {
      const seen = new Set();
      for (const v of value) {
        const k = JSON.stringify(v);
        if (seen.has(k)) { errors.push(`${path}: items no únicos (duplicado: ${k})`); break; }
        seen.add(k);
      }
    }
    if (schemaNode.items) {
      value.forEach((v, i) => validate(v, schemaNode.items, rootSchema, `${path}[${i}]`, errors));
    }
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    if (schemaNode.required) {
      for (const k of schemaNode.required) {
        if (!(k in value)) errors.push(`${path}: missing required "${k}"`);
      }
    }
    if (schemaNode.properties) {
      for (const [k, subSchema] of Object.entries(schemaNode.properties)) {
        if (k in value) validate(value[k], subSchema, rootSchema, `${path}.${k}`, errors);
      }
    }
    if (schemaNode.additionalProperties === false && schemaNode.properties) {
      const known = new Set(Object.keys(schemaNode.properties));
      for (const k of Object.keys(value)) {
        if (!known.has(k)) errors.push(`${path}: propiedad adicional no permitida "${k}"`);
      }
    }
    if (schemaNode.additionalProperties && typeof schemaNode.additionalProperties === 'object') {
      const known = new Set(Object.keys(schemaNode.properties || {}));
      for (const [k, v] of Object.entries(value)) {
        if (!known.has(k)) validate(v, schemaNode.additionalProperties, rootSchema, `${path}.${k}`, errors);
      }
    }
  }

  if (schemaNode.allOf) {
    for (const clause of schemaNode.allOf) {
      if (clause.if && clause.then) {
        const ifErrors = [];
        validate(value, clause.if, rootSchema, path, ifErrors);
        if (ifErrors.length === 0) {
          validate(value, clause.then, rootSchema, path, errors);
        }
      } else {
        validate(value, clause, rootSchema, path, errors);
      }
    }
  }
}

// ----------------------------------------------------------------
// Validadores semánticos (AMB-05, 10, 13, 14, 15)
// ----------------------------------------------------------------

function validateAmb05_altitudChain(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const a = sp.altitud_msnm;
    if (!a) continue;
    if (!(a.min_absoluto <= a.optimo_min && a.optimo_min <= a.optimo_max && a.optimo_max <= a.max_absoluto)) {
      errors.push(`AMB-05 [${sp.id}]: altitud_msnm viola min_absoluto ≤ optimo_min ≤ optimo_max ≤ max_absoluto (${JSON.stringify(a)})`);
    }
  }
  return errors;
}

function validateAmb10_companionsSymmetry(catalog) {
  const errors = [];
  const byId = new Map((catalog.species || []).map((s) => [s.id, s]));
  for (const sp of catalog.species || []) {
    for (const coId of sp.companions || []) {
      const co = byId.get(coId);
      if (!co) continue;
      if (!(co.companions || []).includes(sp.id)) {
        errors.push(`AMB-10 [${sp.id}]: tiene ${coId} en companions pero ${coId} no tiene ${sp.id} de vuelta`);
      }
    }
    for (const anId of sp.antagonists || []) {
      const an = byId.get(anId);
      if (!an) continue;
      if (!(an.antagonists || []).includes(sp.id)) {
        errors.push(`AMB-10 [${sp.id}]: tiene ${anId} en antagonists pero ${anId} no tiene ${sp.id} de vuelta`);
      }
    }
  }
  return errors;
}

function validateAmb13_crossRefs(catalog, seedMode) {
  const errors = [];
  const warnings = [];
  const speciesIds = new Set((catalog.species || []).map((s) => s.id));
  const biopreparadoIds = new Set((catalog.biopreparados || []).map((b) => b.id));
  const sourceIds = new Set((catalog.sources || []).map((s) => s.id));

  // En seed mode (<=100 especies), las refs cruzadas a especies aún no
  // migradas se degradan a warning. Refs a biopreparados/sources (catálogos
  // pequeños controlados) siempre son errores duros.
  const speciesRefTarget = seedMode ? warnings : errors;

  for (const sp of catalog.species || []) {
    const speciesRefFields = [
      ['companions', sp.companions],
      ['antagonists', sp.antagonists],
      ['recommended_covers', sp.recommended_covers],
      ['recommended_fences', sp.recommended_fences],
      ['especies_nativas_sustitutas', sp.especies_nativas_sustitutas],
    ];
    for (const [field, refs] of speciesRefFields) {
      for (const r of refs || []) {
        if (!speciesIds.has(r)) speciesRefTarget.push(`AMB-13 [${sp.id}.${field}]: id "${r}" no existe en species[]`);
      }
    }

    for (const sid of sp.source_ids || []) {
      if (!sourceIds.has(sid)) errors.push(`AMB-11 [${sp.id}.source_ids]: source_id "${sid}" no existe en sources[]`);
    }
    for (const sid of sp.saber_origen?.validacion_cientifica_source_ids || []) {
      if (!sourceIds.has(sid)) errors.push(`AMB-13 [${sp.id}.saber_origen.validacion_cientifica_source_ids]: source_id "${sid}" no existe en sources[]`);
    }

    const etapas = sp.plan_nutricion_base?.biopreparados_por_etapa || {};
    for (const [etapa, items] of Object.entries(etapas)) {
      for (const it of items || []) {
        if (it.biopreparado_id && !biopreparadoIds.has(it.biopreparado_id)) {
          errors.push(`AMB-13 [${sp.id}.plan_nutricion_base.biopreparados_por_etapa.${etapa}]: biopreparado_id "${it.biopreparado_id}" no existe en biopreparados[]`);
        }
      }
    }

    const enfermedades = sp.enfermedades_criticas || [];
    for (const enf of enfermedades) {
      for (const b of enf.biopreparados_curativos || []) {
        if (b.biopreparado_id && !biopreparadoIds.has(b.biopreparado_id)) {
          errors.push(`AMB-13 [${sp.id}.enfermedades_criticas]: biopreparado_id "${b.biopreparado_id}" no existe`);
        }
      }
    }
  }

  for (const bp of catalog.biopreparados || []) {
    for (const sid of bp.source_ids || []) {
      if (!sourceIds.has(sid)) errors.push(`AMB-13 [biopreparados.${bp.id}.source_ids]: source_id "${sid}" no existe en sources[]`);
    }
  }

  return { errors, warnings };
}

function validateAmb14_invasorConsistency(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    if (sp.conservation_status === 'invasor') {
      if (sp.category !== 'especies_invasoras') {
        errors.push(`AMB-14 [${sp.id}]: conservation_status=invasor pero category=${sp.category} (debe ser especies_invasoras)`);
      }
      if (sp.cultivable !== false) {
        errors.push(`AMB-14 [${sp.id}]: conservation_status=invasor pero cultivable=${sp.cultivable} (debe ser false)`);
      }
    }
    if (sp.category === 'especies_invasoras' && sp.conservation_status !== 'invasor') {
      errors.push(`AMB-14 [${sp.id}]: category=especies_invasoras pero conservation_status=${sp.conservation_status} (debe ser invasor)`);
    }
  }
  return errors;
}

function validateAmb15_scaleCoherence(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    if (!sp.scale_viability || !sp.manejo_por_escala) continue;
    const viableArray = new Set(sp.scale_viability);
    const manejoKeys = Object.entries(sp.manejo_por_escala);
    const viableInManejo = new Set(manejoKeys.filter(([, v]) => v.viable === true).map(([k]) => k));

    for (const scale of viableArray) {
      if (!viableInManejo.has(scale)) {
        errors.push(`AMB-15 [${sp.id}]: scale_viability incluye "${scale}" pero manejo_por_escala.${scale}.viable no es true`);
      }
    }
    for (const scale of viableInManejo) {
      if (!viableArray.has(scale)) {
        errors.push(`AMB-15 [${sp.id}]: manejo_por_escala.${scale}.viable=true pero "${scale}" no está en scale_viability`);
      }
    }
  }
  return errors;
}

// ----------------------------------------------------------------
// Main
// ----------------------------------------------------------------

console.log('Chagra Catalog Validator v3.1');
console.log(`  catalog: ${CATALOG_PATH}`);
console.log(`  schema:  ${SCHEMA_PATH}`);
console.log('');

const schema = loadJSON(SCHEMA_PATH);
const catalog = loadJSON(CATALOG_PATH);

// 1. JSON Schema
const schemaErrors = [];
validate(catalog, schema, schema, '$', schemaErrors);
if (schemaErrors.length) {
  for (const e of schemaErrors) console.error(`  ✗ schema: ${e}`);
  die(1, `${schemaErrors.length} errores de JSON Schema`);
}
ok('JSON Schema v3.1 — PASS');

// 2. Validadores semánticos
const semanticChecks = [
  ['AMB-05 altitud chain', (c) => ({ errors: validateAmb05_altitudChain(c), warnings: [] })],
  ['AMB-10 companions/antagonists symmetry', (c) => {
    const arr = validateAmb10_companionsSymmetry(c);
    return SEED_MODE ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  ['AMB-13 cross-refs existencia', (c) => validateAmb13_crossRefs(c, SEED_MODE)],
  ['AMB-14 invasor consistency', (c) => ({ errors: validateAmb14_invasorConsistency(c), warnings: [] })],
  ['AMB-15 scale_viability ↔ manejo_por_escala', (c) => ({ errors: validateAmb15_scaleCoherence(c), warnings: [] })],
];

if (SEED_MODE) console.log('  mode:    SEED (refs a species ausentes = warnings)\n');

const allSemanticErrors = [];
for (const [label, fn] of semanticChecks) {
  const { errors, warnings } = fn(catalog);
  if (errors.length) {
    console.error(`  ✗ ${label}: ${errors.length} error(es)`);
    for (const e of errors) console.error(`    ${e}`);
    allSemanticErrors.push(...errors);
  } else if (warnings.length) {
    warn(`${label}: ${warnings.length} warning(s) — refs a species aún no migradas`);
    for (const w of warnings.slice(0, 5)) console.warn(`    ${w}`);
    if (warnings.length > 5) console.warn(`    ... +${warnings.length - 5} más`);
  } else {
    ok(label);
  }
}

if (allSemanticErrors.length) die(2, `${allSemanticErrors.length} errores semánticos`);

console.log('');
console.log('\x1b[32m✓ Catálogo válido\x1b[0m');
console.log(`  ${(catalog.species || []).length} especies, ${(catalog.biopreparados || []).length} biopreparados, ${(catalog.sources || []).length} sources`);
process.exit(0);
