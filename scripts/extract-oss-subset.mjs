#!/usr/bin/env node
/**
 * extract-oss-subset.mjs — Extrae subset 50 species OSS del catálogo full.
 *
 * Lee:  catalog/chagra-catalog-seed-v3.1.json  (488 species full)
 * Escribe: catalog/chagra-catalog-oss-subset-v3.1.json  (50 species curadas)
 *
 * Filtra:
 * - 50 IDs hardcoded (cobertura multi-piso + cultivos canónicos colombianos)
 * - sources[] solo los referenciados por las 50 species
 * - biopreparados[] mantiene los presentes en catálogo full (sin filtrado)
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

const INPUT = resolve(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
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

const full = JSON.parse(readFileSync(INPUT, 'utf8'));

const species = full.species.filter((s) => OSS_SUBSET_IDS.has(s.id));

if (species.length !== 50) {
  console.error(`FATAL: encontré ${species.length} matches, esperaba 50`);
  const found = new Set(species.map((s) => s.id));
  const missing = [...OSS_SUBSET_IDS].filter((id) => !found.has(id));
  console.error('IDs faltantes:', missing);
  process.exit(3);
}

// Filtra sources referenciados por las 50 species
const referencedSourceIds = new Set();
for (const s of species) {
  for (const sid of s.source_ids || []) referencedSourceIds.add(sid);
}
const sources = (full.sources || []).filter((src) => referencedSourceIds.has(src.id));

// biopreparados: mantener tal cual (catalogo separado, no filtra por species)
const subset = {
  ...(full._meta && { _meta: full._meta }),
  schema_version: full.schema_version,
  seed_version: (full.seed_version || 'v3.1') + '-oss-subset',
  generated_at: new Date().toISOString(),
  generated_by: 'scripts/extract-oss-subset.mjs',
  _subset_meta: {
    subset_name: 'oss-subset-50',
    source_file: 'chagra-catalog-seed-v3.1.json',
    species_count: species.length,
    sources_count: sources.length,
    license: 'CC-BY-NC-SA 4.0',
    rationale: 'Subset representativo multi-piso (12 cálidas + 13 templadas + 13 frías + 12 páramo/altoandinas) para uso OSS público bajo CC-BY-NC-SA. Catálogo full queda reserved para chagra-pro post-cutover. Plan detallado: Chagra-strategy/legal/oss-pro-corpus-split-plan-2026-05-20.md.',
  },
  species,
  sources,
  biopreparados: full.biopreparados || [],
};

writeFileSync(OUTPUT, JSON.stringify(subset, null, 2) + '\n');
console.log(`✓ Escrito ${OUTPUT}`);
console.log(`  species: ${species.length}, sources: ${sources.length}, biopreparados: ${(full.biopreparados || []).length}`);
