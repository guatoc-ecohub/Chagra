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
 * install en el repo de schemas (que no tiene package.json). Si el
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
// --lenient-schema downgrades JSON Schema errors a warnings. Útil para
// cablear el validador a CI/lefthook mientras hay 35 errores legacy en main
// (enums inválidos introducidos por auto-gen pre-pipeline: frutales_nativos,
// ai_draft, naturalizada, LC, rizoma, etc). Los validadores semánticos
// AMB-05..18 siguen siendo strict — son los que catchean bugs nuevos.
const LENIENT_SCHEMA = args.includes('--lenient-schema');
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

// AMB-16: valor_pedagogico ≥200 chars (compromiso template species-batch-prompt
// para que el contenido tenga densidad pedagógica suficiente; species PRs auto-
// generados con vp corto deben ser rechazados).
const VP_MIN_CHARS = 200;
function validateAmb16_vpLength(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    if (typeof sp.valor_pedagogico !== 'string') continue;
    const len = sp.valor_pedagogico.trim().length;
    if (len < VP_MIN_CHARS) {
      errors.push(`AMB-16 [${sp.id}]: valor_pedagogico=${len} chars < ${VP_MIN_CHARS} (densidad pedagógica insuficiente)`);
    }
  }
  return errors;
}

// AMB-17: source_ids con ≥2 fuentes Tier A (rigor científico). Lista canónica
// derivada de templates/species-batch-prompt.md §"FUENTES OBLIGATORIAS Tier A".
// Match laxo (substring) para tolerar variantes del slug (e.g. "gbif-...", "iavh-...").
const TIER_A_KEYWORDS = [
  'iavh', 'humboldt',
  'bernal', 'plantas-liquenes-colombia',
  'powo', 'kew',
  'gbif',
  'tropicos',
  'agrosavia',
  'caldasia', 'acta-biologica',  // peer-reviewed con DOI
  'doi-',
];
function isTierASourceId(sid) {
  const s = String(sid || '').toLowerCase();
  return TIER_A_KEYWORDS.some((kw) => s.includes(kw));
}
function validateAmb17_tierACoverage(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const sids = sp.source_ids || [];
    const tierA = sids.filter(isTierASourceId);
    if (tierA.length < 2) {
      errors.push(`AMB-17 [${sp.id}]: ${tierA.length} fuente(s) Tier A en source_ids=[${sids.join(', ')}] — requiere ≥2`);
    }
  }
  return errors;
}

// AMB-19: normativa_colombiana[].autoridad ∈ enum cerrado de entidades públicas
// colombianas. Origen del validador: auditoría agroecológica 2026-05-21 (Pasada
// 3-5) identificó 7 species con autoridad mal asignada — ICA confundido con
// MinCultura (yajé/brugmansia patrimonio cultural), MADS confundido con
// MinSalud (cannabis Res. 577/2017), ICA confundido con IAvH (thunbergia). El
// campo era free-form string en schema v3.1, lo que permitía typos sin detectar.
const AUTORIDAD_ENUM = new Set([
  'MADS',
  'ICA',
  'IAvH',
  'AGROSAVIA',
  'MinCultura',
  'MinSalud',
  'MinJusticia',
  'CAR Cundinamarca',
  'CORPOBOYACA',
  'CORPOBOYACÁ',
  'Secretaria Distrital Ambiente',
  'Secretaría Distrital Ambiente',
  'Secretaría Distrital de Ambiente Bogotá',
  'Secretaria Distrital de Ambiente Bogota',
  'Consejo Nacional de Estupefacientes',
  'DIAN',
  'IUCN',
  'UICN',
  'IDEAM',
  'IGAC',
  'CITES',
]);
function validateAmb19_autoridadEnum(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const norms = sp.normativa_colombiana;
    if (!Array.isArray(norms)) continue;
    for (let i = 0; i < norms.length; i++) {
      const aut = norms[i]?.autoridad;
      if (typeof aut === 'string' && aut.length > 0 && !AUTORIDAD_ENUM.has(aut)) {
        errors.push(`AMB-19 [${sp.id}.normativa_colombiana[${i}].autoridad]: "${aut}" no está en enum canónico (MADS/ICA/IAvH/AGROSAVIA/MinCultura/MinSalud/MinJusticia/CAR Cundinamarca/CORPOBOYACÁ/Secretaría Distrital Ambiente/Consejo Nacional de Estupefacientes/DIAN/IUCN/IDEAM/IGAC/CITES)`);
      }
    }
  }
  return errors;
}

// AMB-20: variedades_registradas_ica strict. Cada variedad debe tener al menos
// nombre_comercial, obtentor.nombre, resolucion_ica.numero, nota_editorial. La
// estructura completa la valida el JSON Schema; este validador catchea
// regresiones donde un script de batch insertó una variedad incompleta.
function validateAmb20_variedadesIca(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const vs = sp.variedades_registradas_ica;
    if (!Array.isArray(vs) || vs.length === 0) continue;
    vs.forEach((v, i) => {
      if (!v.nombre_comercial) {
        errors.push(`AMB-20 [${sp.id}.variedades_registradas_ica[${i}]]: falta nombre_comercial`);
      }
      if (!v.obtentor?.nombre) {
        errors.push(`AMB-20 [${sp.id}.variedades_registradas_ica[${i}]]: falta obtentor.nombre`);
      }
      if (!v.resolucion_ica?.numero) {
        errors.push(`AMB-20 [${sp.id}.variedades_registradas_ica[${i}]]: falta resolucion_ica.numero`);
      }
      if (!v.nota_editorial || v.nota_editorial.length < 50) {
        errors.push(`AMB-20 [${sp.id}.variedades_registradas_ica[${i}]]: nota_editorial obligatoria (≥50 chars) para honestidad epistémica`);
      }
    });
  }
  return errors;
}

// AMB-21: formato resolución ICA. Regex \d{5,6}/\d{4}. Cubre los formatos
// reales del DR consolidado: 00015201/2019, 17702/2019, 067516/2020, etc.
const RES_ICA_FORMAT = /^\d{5,6}\/\d{4}$/;
function validateAmb21_resolucionIcaFormat(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const vs = sp.variedades_registradas_ica;
    if (!Array.isArray(vs)) continue;
    vs.forEach((v, i) => {
      const num = v.resolucion_ica?.numero;
      if (typeof num === 'string' && !RES_ICA_FORMAT.test(num)) {
        errors.push(`AMB-21 [${sp.id}.variedades_registradas_ica[${i}].resolucion_ica.numero]: "${num}" no matches formato NNNNN[N]/AAAA`);
      }
    });
  }
  return errors;
}

// AMB-22: subregiones_naturales_ica ∈ enum cerrado. ICA inscribe variedades
// por subregión natural (no por departamentos). Lista del DR consolidado +
// las dos zonas micro-altitudinales del Altiplano y Nudo de Pastos.
const SUBREGIONES_ICA = new Set([
  'Region Andina',
  'Caribe Seco',
  'Caribe Humedo',
  'Pacifica',
  'Valles Interandinos',
  'Amazonia',
  'Orinoquia',
  'Nudo de los Pastos',
  'Altiplano Cundiboyacense',
]);
function validateAmb22_subregionesEnum(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const vs = sp.variedades_registradas_ica;
    if (!Array.isArray(vs)) continue;
    vs.forEach((v, i) => {
      const subs = v.subregiones_naturales_ica;
      if (!Array.isArray(subs)) return;
      subs.forEach((s, j) => {
        if (s?.nombre && !SUBREGIONES_ICA.has(s.nombre)) {
          errors.push(`AMB-22 [${sp.id}.variedades_registradas_ica[${i}].subregiones_naturales_ica[${j}].nombre]: "${s.nombre}" no está en enum canónico`);
        }
      });
    });
  }
  return errors;
}

// AMB-23: source.tier ∈ {A, B, C} obligatorio. Catálogo v3.1 tiene
// mayoría con tier=A/B pero algunas sources legacy sin tier — eso es ambigüedad
// editorial. Forzar tier explícito facilita auditorías futuras.
function validateAmb23_sourceTier(catalog) {
  const errors = [];
  const VALID_TIERS = new Set(['A', 'B', 'C']);
  for (const src of catalog.sources || []) {
    if (!src.tier) {
      errors.push(`AMB-23 [sources.${src.id}]: falta campo tier (debe ser A/B/C)`);
    } else if (!VALID_TIERS.has(src.tier)) {
      errors.push(`AMB-23 [sources.${src.id}.tier]: "${src.tier}" no está en enum {A, B, C}`);
    }
  }
  return errors;
}

// AMB-24: species con endemica/endemica_critica/en_peligro debería tener
// conservation_status + (idealmente) IUCN category o nota documentando la
// fuente. Para no romper el seed legacy, este validador es soft: solo emite
// warning cuando endemica_critica sin nota_conservacion / clasificacion_uicn.
function validateAmb24_endemicaConservation(catalog) {
  const errors = [];
  for (const sp of catalog.species || []) {
    const cs = sp.conservation_status;
    if (cs === 'endemica_critica' || cs === 'endemica_colombia') {
      const hasIucn = typeof sp.clasificacion_uicn === 'string' && sp.clasificacion_uicn.length > 0;
      const hasNote = typeof sp.nota_conservacion === 'string' && sp.nota_conservacion.length > 0;
      if (!hasIucn && !hasNote) {
        errors.push(`AMB-24 [${sp.id}]: conservation_status="${cs}" requiere clasificacion_uicn o nota_conservacion`);
      }
    }
  }
  return errors;
}

// AMB-18: roundtrip de formato. JSON.stringify(parsed, null, 2) === raw file.
// Detecta bugs de indentación introducidos por generators que escriben texto
// directo (e.g. TIER1 minimax dejó "source_ids": [ sin indent en PR #728).
// El catálogo de Chagra es source-of-truth para reproducibilidad cross-host —
// re-formatear constantemente con `prettier --write` evita merge-conflicts
// triviales.
function validateAmb18_formatRoundtrip(catalogPath) {
  const raw = readFileSync(catalogPath, 'utf8');
  const parsed = JSON.parse(raw);
  const formatted = JSON.stringify(parsed, null, 2) + '\n';
  if (raw === formatted) return [];
  // Identificar línea del primer mismatch para feedback útil
  const rawLines = raw.split('\n');
  const fmtLines = formatted.split('\n');
  const max = Math.min(rawLines.length, fmtLines.length);
  for (let i = 0; i < max; i++) {
    if (rawLines[i] !== fmtLines[i]) {
      return [`AMB-18: formato no normalizado (primer mismatch línea ${i + 1}).\n    raw: ${rawLines[i].slice(0, 80)}\n    fmt: ${fmtLines[i].slice(0, 80)}\n    Fix: node -e "const fs=require('fs'); const p='${catalogPath}'; fs.writeFileSync(p, JSON.stringify(JSON.parse(fs.readFileSync(p,'utf8')), null, 2) + '\\n');"`];
    }
  }
  return [`AMB-18: formato no normalizado (length diff: raw=${rawLines.length} líneas vs fmt=${fmtLines.length})`];
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
  if (LENIENT_SCHEMA) {
    warn(`JSON Schema v3.1: ${schemaErrors.length} warning(s) (lenient)`);
    for (const e of schemaErrors.slice(0, 10)) console.warn(`    ${e}`);
    if (schemaErrors.length > 10) console.warn(`    ... +${schemaErrors.length - 10} más`);
  } else {
    for (const e of schemaErrors) console.error(`  ✗ schema: ${e}`);
    die(1, `${schemaErrors.length} errores de JSON Schema (usa --lenient-schema para downgrade a warnings)`);
  }
} else {
  ok('JSON Schema v3.1 — PASS');
}

// 2. Validadores semánticos
// Nota: AMB-16/17/18 introducidos 2026-05-16 tras detectar bugs en species PRs
// auto-generados (vp corto, source_ids sin Tier A, formato sin roundtrip).
// SEED_MODE relaja AMB-16/17 a warnings: el catálogo seed legacy aún tiene
// entradas pre-pipeline con vp/sources incompletos que se completan progresivo
// vía batches. main no debe REGRESAR — el guard es para PRs nuevos, no existing.
const semanticChecks = [
  ['AMB-05 altitud chain', (c) => ({ errors: validateAmb05_altitudChain(c), warnings: [] })],
  ['AMB-10 companions/antagonists symmetry', (c) => {
    const arr = validateAmb10_companionsSymmetry(c);
    return SEED_MODE ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  ['AMB-13 cross-refs existencia', (c) => validateAmb13_crossRefs(c, SEED_MODE)],
  ['AMB-14 invasor consistency', (c) => ({ errors: validateAmb14_invasorConsistency(c), warnings: [] })],
  ['AMB-15 scale_viability ↔ manejo_por_escala', (c) => ({ errors: validateAmb15_scaleCoherence(c), warnings: [] })],
  ['AMB-16 valor_pedagogico ≥200 chars', (c) => {
    const arr = validateAmb16_vpLength(c);
    return SEED_MODE ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  ['AMB-17 source_ids ≥2 Tier A', (c) => {
    const arr = validateAmb17_tierACoverage(c);
    return SEED_MODE ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  ['AMB-18 format roundtrip', () => {
    const arr = validateAmb18_formatRoundtrip(CATALOG_PATH);
    return SEED_MODE ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  // AMB-19..24 introducidos 2026-05-21 tras auditoría agroecológica (Pasadas
  // 3-5-7). Schema v3.2 formaliza variedades_registradas_ica + enum cerrado
  // de autoridades. Soft mode (warnings only) por default para no romper seed
  // legacy mientras se aplican fixes batch a normativa_colombiana.
  // AMB-19..22 + AMB-24: soft mode default (warnings) — el seed legacy v3.1
  // tiene casos pre-existentes (autoridades regionales con typos, species
  // endémicas sin clasificacion_uicn ni nota_conservacion). Validators
  // capturan regresiones nuevas con --strict; en lefthook/CI quedan como
  // warnings hasta completar el sweep de catálogo. AMB-20/21/22 son strict
  // dentro de variedades_registradas_ica (estructura nueva, sin legacy).
  ['AMB-19 autoridad enum canónico', (c) => {
    const arr = validateAmb19_autoridadEnum(c);
    return LENIENT_SCHEMA ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  ['AMB-20 variedades_registradas_ica strict', (c) => ({
    errors: validateAmb20_variedadesIca(c),
    warnings: [],
  })],
  ['AMB-21 resolucion ICA formato NNNNN/AAAA', (c) => ({
    errors: validateAmb21_resolucionIcaFormat(c),
    warnings: [],
  })],
  ['AMB-22 subregiones_naturales_ica enum', (c) => ({
    errors: validateAmb22_subregionesEnum(c),
    warnings: [],
  })],
  ['AMB-23 source.tier ∈ {A,B,C}', (c) => {
    const arr = validateAmb23_sourceTier(c);
    return SEED_MODE ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
  ['AMB-24 endémica con conservation context', (c) => {
    const arr = validateAmb24_endemicaConservation(c);
    return LENIENT_SCHEMA ? { errors: [], warnings: arr } : { errors: arr, warnings: [] };
  }],
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
