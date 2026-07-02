#!/usr/bin/env node
/**
 * extract-oss-subset.mjs — Extrae el subset OSS público v3.1 a partir del
 * catálogo full y cierra las referencias cruzadas mínimas necesarias.
 *
 * Lee:  catalog/chagra-catalog-oss-subset-v3.2.json
 * Escribe: catalog/chagra-catalog-oss-subset-v3.1.json
 *
 * Estrategia:
 * - Semilla de 50 IDs hardcoded (cobertura multi-piso + cultivos canónicos)
 * - Clausura recursiva de species referenciadas por companions/antagonists/
 *   recommended_covers/recommended_fences/especies_nativas_sustitutas
 * - Conserva biopreparados[] íntegro
 * - Incluye todos los sources[] referenciados por species y biopreparados
 *
 * Estrategia boundary: subset = OSS público bajo CC-BY-NC-SA;
 * catálogo full queda para chagra-pro post-cutover (decisión separada,
 * ver Chagra-strategy/legal/oss-pro-corpus-split-plan-2026-05-20.md).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const INPUT = resolve(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
const OUTPUT = resolve(ROOT, 'catalog/chagra-catalog-oss-subset-v3.1.json');

const OSS_SUBSET_IDS = new Set([
  // Cálidas 0-1000m (12)
  'cocos_nucifera', 'euterpe_oleracea', 'passiflora_edulis_flavicarpa',
  'manihot_esculenta', 'theobroma_cacao', 'capsicum_annuum_aji_dulce_caribe',
  'enterolobium_cyclocarpum', 'inga_edulis', 'tabebuia_rosea',
  'cymbopogon_citratus', 'ipomoea_batatas', 'gliricidia_sepium',
  // Templadas 1000-2000m (13)
  'coffea_arabica', 'psidium_guajava_manzana', 'solanum_quitoense',
  'physalis_peruviana', 'coriandrum_sativum', 'phaseolus_vulgaris',
  'zea_mays', 'cucurbita_moschata', 'cucurbita_maxima',
  'passiflora_edulis_morada', 'cedrela_montana', 'cordia_alliodora',
  'capsicum_chinense_aji_panca',
  // Frías 2000-3000m (13)
  'solanum_tuberosum_pastusa_suprema', 'solanum_tuberosum_sabanera',
  'fragaria_ananassa_monterrey', 'fragaria_vesca', 'rubus_glaucus',
  'alnus_acuminata', 'erythrina_edulis', 'lactuca_sativa_capitata',
  'brassica_oleracea_acephala_curly', 'brassica_oleracea_capitata_alba',
  'allium_cepa', 'allium_sativum', 'beta_vulgaris_conditiva',
  // Páramo y altoandinas 2400m+ (12)
  'lupinus_mutabilis', 'oxalis_tuberosa', 'tropaeolum_tuberosum',
  'ullucus_tuberosus', 'chenopodium_quinoa', 'amaranthus_caudatus',
  'melissa_officinalis', 'origanum_vulgare', 'foeniculum_vulgare',
  'calendula_officinalis', 'mentha_spicata', 'allium_fistulosum',
]);

if (OSS_SUBSET_IDS.size !== 50) {
  console.error(`FATAL: OSS_SUBSET_IDS tiene ${OSS_SUBSET_IDS.size}, esperaba 50`);
  process.exit(2);
}

export const REF_FIELDS_TO_CLOSE = [
  'companions',
  'antagonists',
  'recommended_covers',
  'recommended_fences',
  'especies_nativas_sustitutas',
];

function collectReferencedSpeciesIds(byId, seedIds) {
  const closure = new Set();
  const missingRefs = new Set();
  const queue = [...seedIds].map((id) => ({ id, required: true }));

  while (queue.length > 0) {
    const entry = queue.pop();
    const id = typeof entry === 'string' ? entry : entry.id;
    const required = entry.required;
    if (closure.has(id)) continue;
    const sp = byId.get(id);
    if (!sp) {
      if (required) {
        throw new Error(`ID semilla no existe en species[]: ${id}`);
      }
      missingRefs.add(id);
      continue;
    }

    closure.add(id);

    for (const field of REF_FIELDS_TO_CLOSE) {
      for (const refId of sp[field] || []) {
        if (!closure.has(refId)) {
          queue.push({ id: refId, required: false });
        }
      }
    }
  }

  return { closure, missingRefs };
}

export function buildOssSubset(full) {
  const allSpecies = full.species || [];
  const byId = new Map(allSpecies.map((s) => [s.id, s]));
  const { closure: speciesIds, missingRefs } = collectReferencedSpeciesIds(byId, OSS_SUBSET_IDS);

  const species = allSpecies.filter((s) => speciesIds.has(s.id));

  const missingSeeds = [...OSS_SUBSET_IDS].filter((id) => !speciesIds.has(id));
  if (missingSeeds.length > 0) {
    throw new Error(`No se pudieron resolver los IDs semilla: ${missingSeeds.join(', ')}`);
  }

  const referencedSourceIds = new Set();
  for (const s of species) {
    for (const sid of s.source_ids || []) referencedSourceIds.add(sid);
    for (const sid of s.saber_origen?.validacion_cientifica_source_ids || []) {
      referencedSourceIds.add(sid);
    }
  }

  const biopreparados = full.biopreparados || [];
  for (const bp of biopreparados) {
    for (const sid of bp.source_ids || []) referencedSourceIds.add(sid);
  }

  const sources = (full.sources || []).filter((src) => referencedSourceIds.has(src.id));

  return {
    ...(full._meta && { _meta: full._meta }),
    schema_version: full.schema_version,
    seed_version: (full.seed_version || 'v3.1') + '-oss-subset',
    generated_at: new Date().toISOString(),
    generated_by: 'scripts/extract-oss-subset.mjs',
    _subset_meta: {
      subset_name: 'oss-subset-50-closure',
      source_file: 'chagra-catalog-oss-subset-v3.2.json',
      seed_species_count: OSS_SUBSET_IDS.size,
      species_count: species.length,
      sources_count: sources.length,
      unresolved_species_refs_count: missingRefs.size,
      license: 'CC-BY-NC-SA 4.0',
      rationale: 'Subset representativo multi-piso con clausura de referencias cruzadas para species y biopreparados. El catálogo público canónico v3.2 aporta el corpus completo para resolver los ids referenciados. Catálogo full queda reserved para chagra-pro post-cutover. Plan detallado: Chagra-strategy/legal/oss-pro-corpus-split-plan-2026-05-20.md.',
    },
    species,
    sources,
    biopreparados,
  };
}

function main() {
  const full = JSON.parse(readFileSync(INPUT, 'utf8'));
  const subset = buildOssSubset(full);

  writeFileSync(OUTPUT, JSON.stringify(subset, null, 2) + '\n');
  console.log(`✓ Escrito ${OUTPUT}`);
  console.log(`  species: ${subset.species.length}, sources: ${subset.sources.length}, biopreparados: ${subset.biopreparados.length}`);
  if (subset._subset_meta.unresolved_species_refs_count > 0) {
    console.warn(`  refs de species no resolubles en full: ${subset._subset_meta.unresolved_species_refs_count}`);
  }
}

const IS_CLI = import.meta.url === `file://${process.argv[1]}`;
if (IS_CLI) {
  try {
    main();
  } catch (error) {
    console.error(`FATAL: ${error.message}`);
    process.exit(3);
  }
}
