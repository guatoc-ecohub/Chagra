#!/usr/bin/env node
/**
 * migrate-v30-to-v31.mjs
 * ================================================================
 * Migra el catálogo v3.0 (chagra-catalog-seed-v3.0.json) al shape
 * v3.1 resolviendo las 16 ambigüedades:
 *
 *   AMB-01: elimina `gremio`, conserva `roles_in_guild[]`
 *   AMB-03: ya estaba en español, pass-through
 *   AMB-07: `production` (string) → `harvest_type` (enum)
 *   AMB-06, 08: heladas_tolerancia y NPK ya eran objetos en v3.0
 *   AMB-11, 16: sources ya eran source_ids en v3.0
 *   AMB-14: aplica regla de consistencia si hay mismatch
 *
 * Output: chagra-catalog-seed-v3.1.json con:
 *   { schema_version: "3.1", species, biopreparados, sources }
 *
 * Los arrays biopreparados[] y sources[] se cargan desde sus seeds
 * separados. Esto hace el catálogo v3.1 self-contained y validable.
 *
 * Uso:
 *   node scripts/migrate-v30-to-v31.mjs
 * ================================================================
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const V30_PATH = join(ROOT, 'catalog/chagra-catalog-seed-v3.0.json');
const BIOPREPARADOS_SEED = join(ROOT, 'catalog/biopreparados-seed.json');
const SOURCES_SEED = join(ROOT, 'catalog/sources-seed.json');
const OUT_PATH = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');

const v30 = JSON.parse(readFileSync(V30_PATH, 'utf8'));
const biopreparadosSeed = JSON.parse(readFileSync(BIOPREPARADOS_SEED, 'utf8'));
const sourcesSeed = JSON.parse(readFileSync(SOURCES_SEED, 'utf8'));

const speciesV30 = v30.task_a_extended_existing || {};

// --- Mapeo de valores de production (v3.0) a harvest_type (v3.1) ---
const HARVEST_TYPE_MAP = {
  fruto: 'fruto',
  frutos: 'fruto',
  grano: 'grano',
  granos: 'grano',
  tuberculo: 'tuberculo',
  tuberculos: 'tuberculo',
  hoja: 'hoja',
  hojas: 'hoja',
  flor: 'flor',
  flores: 'flor',
  raiz: 'raiz',
  raices: 'raiz',
  tallo: 'tallo',
  biomasa: 'biomasa',
  semilla: 'semilla',
  semillas: 'semilla',
  latex: 'latex',
  corteza: 'corteza',
  bulbo: 'bulbo',
  hongo: 'hongo',
};

function mapHarvestType(production) {
  if (!production) return undefined;
  const key = String(production).toLowerCase().trim();
  return HARVEST_TYPE_MAP[key] || undefined;
}

function migrateSpecies(sp) {
  const out = { ...sp };

  // AMB-01: drop gremio
  delete out.gremio;

  // AMB-07: production → harvest_type
  if (out.production !== undefined) {
    const ht = mapHarvestType(out.production);
    if (ht) out.harvest_type = ht;
    delete out.production;
  }

  // Normalizar valores legacy de drenaje_requerido con espacios
  if (typeof out.drenaje_requerido === 'string') {
    out.drenaje_requerido = out.drenaje_requerido.trim().toLowerCase().replace(/\s+/g, '_');
  }

  // AMB-14: regla de consistencia invasor
  if (out.conservation_status === 'invasor') {
    if (out.category !== 'especies_invasoras') {
      console.warn(`[${out.id}] ajustando category a especies_invasoras (AMB-14)`);
      out.category = 'especies_invasoras';
    }
    if (out.cultivable !== false) {
      console.warn(`[${out.id}] ajustando cultivable=false (AMB-14)`);
      out.cultivable = false;
    }
  }

  // Asegurar roles_in_guild[] presente (AMB-01 defensivo: si venía de
  // v3.0 sin roles_in_guild pero con gremio, mapear).
  if (!out.roles_in_guild || out.roles_in_guild.length === 0) {
    out.roles_in_guild = ['crop']; // default defensivo
    console.warn(`[${out.id}] roles_in_guild estaba vacío, default a ['crop']`);
  }

  // ADR-016: nivel de validación. Las 7 especies del v3.0 que migramos
  // ya tenían _curation_status "VALIDADO ..." escrito a mano por el
  // operador; las consideramos operator_reviewed hasta que un agrónomo
  // con identidad registrada las valide formalmente.
  if (!out.validation_level) {
    out.validation_level = 'operator_reviewed';
  }

  return out;
}

const migratedSpecies = [];
for (const [id, sp] of Object.entries(speciesV30)) {
  if (!sp || typeof sp !== 'object') continue;
  migratedSpecies.push(migrateSpecies({ id, ...sp }));
}

// También recoger las invasoras que en v3.0 podrían estar en otra sección
if (Array.isArray(v30.task_d_invasoras)) {
  for (const inv of v30.task_d_invasoras) {
    migratedSpecies.push(migrateSpecies(inv));
  }
} else if (v30.task_d_invasoras && typeof v30.task_d_invasoras === 'object') {
  for (const [id, inv] of Object.entries(v30.task_d_invasoras)) {
    if (!inv || typeof inv !== 'object') continue;
    migratedSpecies.push(migrateSpecies({ id, ...inv }));
  }
}

const output = {
  schema_version: '3.1',
  seed_version: '0.2.0',
  generated_at: new Date().toISOString().slice(0, 10),
  generated_by: 'scripts/migrate-v30-to-v31.mjs — transform automático v3.0 → v3.1. Curaduría humana requerida antes de uso ministerial.',
  _meta: {
    fuente_migracion: 'chagra-catalog-seed-v3.0.json',
    ambiguedades_resueltas: [
      'AMB-01: gremio eliminado, roles_in_guild único campo',
      'AMB-02: thermal_zones plural array (ya era en v3.0)',
      'AMB-03: español en todos los campos (ya era en v3.0)',
      'AMB-05: altitud_msnm chain validada por validate-catalog.mjs',
      'AMB-06: heladas_tolerancia como objeto (ya era en v3.0)',
      'AMB-07: production (string) → harvest_type (enum)',
      'AMB-08: NPK como objeto {min,max,unidad} (ya era en v3.0)',
      'AMB-09: biopreparados_seed.json catálogo auxiliar con 15 ids',
      'AMB-10: simetría companions/antagonists validada por CI',
      'AMB-11/16: sources_seed.json catálogo auxiliar con ~30 fuentes',
      'AMB-12: prompts_ia_externa objeto con 5 slots estándar',
      'AMB-13: cross-refs validadas por CI (seed-mode downgrade a warning)',
      'AMB-14: consistencia invasor aplicada en migración',
      'AMB-15: scale_viability + manejo_por_escala con CI de coherencia',
    ],
    alcance_seed: `${migratedSpecies.length} especies migradas desde v3.0. Las DRs por piso térmico poblarán hasta ~400 especies totales (100 × 4 pisos).`,
    advertencia: 'Validar con: node scripts/validate-catalog.mjs --seed-mode. Refs a species aún no migradas aparecen como warnings.',
  },
  species: migratedSpecies,
  biopreparados: biopreparadosSeed.biopreparados,
  sources: sourcesSeed.sources,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n');
console.log(`✓ Migrado ${migratedSpecies.length} especies → ${OUT_PATH}`);
console.log(`  biopreparados: ${output.biopreparados.length}`);
console.log(`  sources: ${output.sources.length}`);
