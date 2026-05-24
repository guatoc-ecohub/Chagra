#!/usr/bin/env node
/**
 * extract-oss-subset-v32.mjs — Extrae subset OSS v3.2 (~105 species top-uso) del catálogo full.
 *
 * Contexto: el subset v3.1 (50 species, PR #1011) cortó species críticas
 * (aguacate, tomate, lechuga, acelga, tomate de árbol) y rompió casos de uso
 * reales del agente en producción. Revertido en PR #1012.
 *
 * Re-curado top-N species según criterio intelligence-first + valor público
 * familias agricultoras Colombia (memoria oss-pro-boundary-decisions-2026-05-23):
 *   - frutales mayor + pasifloras (anti-confusión)
 *   - hortalizas hoja/fruto comunes
 *   - tubérculos andinos
 *   - cereales / leguminosas
 *   - especias / medicinales base familiar
 *   - asocios / polinizadores
 *   - sombrío café + forestales funcionales
 *   - páramo / altoandinos emblemáticos
 *   - invasoras comunes (para identificación / manejo)
 *
 * Lee:  catalog/chagra-catalog-seed-v3.1.json  (495 species full)
 * Escribe: catalog/chagra-catalog-oss-subset-v3.2.json  (105 species curadas)
 *
 * Estrategia boundary: subset = OSS público bajo CC-BY-NC-SA;
 * catálogo full queda reserved para chagra-pro post-cutover.
 * Ver memoria project-oss-pro-boundary-decisions-2026-05-23.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const INPUT = resolve(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
const OUTPUT = resolve(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');

const OSS_SUBSET_IDS = new Set([
  // === FRUTALES MAYOR cálido + templado (10) ===
  'persea_americana', 'mangifera_indica', 'musa_paradisiaca', 'ananas_comosus',
  'citrus_sinensis', 'citrus_latifolia', 'theobroma_cacao', 'cocos_nucifera',
  'psidium_guajava_manzana', 'coffea_arabica',

  // === PASIFLORAS anti-confusión taxonómica (5) ===
  'passiflora_edulis_flavicarpa', 'passiflora_edulis_morada', 'passiflora_ligularis',
  'passiflora_tripartita_mollissima', 'passiflora_quadrangularis',

  // === FRUTALES ANDINOS (8) ===
  'solanum_betaceum', 'solanum_quitoense', 'physalis_peruviana', 'rubus_glaucus',
  'fragaria_ananassa_monterrey', 'fragaria_vesca', 'vaccinium_corymbosum_biloxi',
  'vaccinium_meridionale',

  // === FRUTALES AMAZÓNICOS estratégicos (5) ===
  'eugenia_stipitata', 'borojoa_patinoi', 'theobroma_grandiflorum',
  'bactris_gasipaes', 'euterpe_oleracea',

  // === HORTALIZAS HOJA críticas (12) ===
  'lactuca_sativa_capitata', 'lactuca_sativa_crispa_verde', 'lactuca_sativa_longifolia_verde',
  'beta_vulgaris_cicla_blanca', 'beta_vulgaris_var_cicla',
  'brassica_oleracea_acephala_curly', 'brassica_oleracea_capitata_alba',
  'brassica_oleracea_italica',
  'coriandrum_sativum', 'petroselinum_crispum', 'apium_graveolens',
  'allium_fistulosum',

  // === ALLIUM separados (3) ===
  'allium_cepa', 'allium_sativum', 'allium_schoenoprasum',

  // === HORTALIZAS FRUTO/FLOR (7) ===
  'solanum_lycopersicum_cerasiforme', 'solanum_lycopersicum_san_marzano',
  'solanum_lycopersicum_sungold', 'cucurbita_maxima', 'cucurbita_moschata',
  'capsicum_annuum_aji_dulce_caribe', 'capsicum_chinense_aji_panca',

  // === TUBÉRCULOS ANDINOS + tropicales (10) ===
  'solanum_phureja', 'solanum_tuberosum_pastusa_suprema', 'solanum_tuberosum_sabanera',
  'oxalis_tuberosa', 'tropaeolum_tuberosum', 'ullucus_tuberosus',
  'arracacia_xanthorrhiza', 'smallanthus_sonchifolius',
  'manihot_esculenta', 'ipomoea_batatas',

  // === RAÍCES COMUNES (3) ===
  'beta_vulgaris_conditiva', 'daucus_carota_subsp_sativus', 'raphanus_sativus',

  // === CEREALES Y LEGUMINOSAS (8) ===
  'zea_mays', 'chenopodium_quinoa', 'amaranthus_caudatus', 'salvia_hispanica',
  'phaseolus_vulgaris', 'lupinus_mutabilis', 'vicia_faba', 'pisum_sativum_andina',

  // === ESPECIAS/MEDICINALES base familiar (15) ===
  'cymbopogon_citratus', 'zingiber_officinale', 'curcuma_longa',
  'matricaria_chamomilla', 'melissa_officinalis', 'mentha_spicata',
  'rosmarinus_officinalis', 'thymus_vulgaris', 'origanum_vulgare',
  'ocimum_basilicum', 'ruta_graveolens', 'aloe_vera', 'bixa_orellana',
  'foeniculum_vulgare', 'urtica_dioica',

  // === ASOCIOS / POLINIZADORES (5) ===
  'calendula_officinalis', 'tropaeolum_majus', 'tagetes_minuta', 'tagetes_lucida',
  'helianthus_annuus',

  // === SOMBRÍO CAFÉ / FORESTALES funcionales (8) ===
  'inga_edulis', 'erythrina_edulis', 'cordia_alliodora', 'alnus_acuminata',
  'quercus_humboldtii', 'guadua_angustifolia', 'gliricidia_sepium', 'trichanthera_gigantea',

  // === PÁRAMO / ALTOANDINOS emblemáticos (3) ===
  'espeletia_grandiflora', 'polylepis_quadrijuga', 'weinmannia_tomentosa',

  // === INVASORAS comunes — identificación / manejo (3) ===
  'pteridium_aquilinum', 'ulex_europaeus', 'pennisetum_setaceum',
]);

const EXPECTED = 105;

if (OSS_SUBSET_IDS.size !== EXPECTED) {
  console.error(`FATAL: OSS_SUBSET_IDS tiene ${OSS_SUBSET_IDS.size}, esperaba ${EXPECTED}`);
  process.exit(2);
}

const full = JSON.parse(readFileSync(INPUT, 'utf8'));

const rawSpecies = full.species.filter((s) => OSS_SUBSET_IDS.has(s.id));

if (rawSpecies.length !== EXPECTED) {
  console.error(`FATAL: encontré ${rawSpecies.length} matches, esperaba ${EXPECTED}`);
  const found = new Set(rawSpecies.map((s) => s.id));
  const missing = [...OSS_SUBSET_IDS].filter((id) => !found.has(id));
  console.error('IDs faltantes:', missing);
  process.exit(3);
}

// Purga cross-refs a species que NO están en el subset. Si no se purgan,
// el validator AMB-13 dispara cientos de errores "id no existe en species[]"
// (caso documentado: subset v3.1 quedó con 56 errores AMB-13, subset v3.2
// raw quedaría con 201). Filtrar arrays de IDs es preferible a cargar más
// species "sólo para satisfacer refs": rompe la curación intelligence-first.
const CROSS_REF_FIELDS = [
  'companions',
  'antagonists',
  'recommended_covers',
  'recommended_fences',
  'sucesion_pioneras',
  'sucesion_intermedias',
  'sucesion_climax',
  'especies_nativas_sustitutas',
];

const droppedRefs = { count: 0, byField: {} };
const species = rawSpecies.map((sp) => {
  const out = { ...sp };
  for (const f of CROSS_REF_FIELDS) {
    if (Array.isArray(out[f])) {
      const before = out[f].length;
      out[f] = out[f].filter((id) => OSS_SUBSET_IDS.has(id));
      const drop = before - out[f].length;
      if (drop > 0) {
        droppedRefs.count += drop;
        droppedRefs.byField[f] = (droppedRefs.byField[f] || 0) + drop;
      }
    }
  }
  return out;
});

// Filtra sources referenciados por las species seleccionadas (post-purga)
const referencedSourceIds = new Set();
for (const s of species) {
  for (const sid of s.source_ids || []) referencedSourceIds.add(sid);
}

// biopreparados: mantener todos (decisión operador 2026-05-23 — biopreparados
// OSS si legal Y valor público; los 36 del catálogo full son técnicas
// agroecológicas tradicionales documentadas públicamente).
const biopreparados = full.biopreparados || [];

// También incluir sources referenciadas por biopreparados (AMB-13 chequea
// biopreparados.source_ids contra sources[]).
for (const bp of biopreparados) {
  for (const sid of bp.source_ids || []) referencedSourceIds.add(sid);
}

const sources = (full.sources || []).filter((src) => referencedSourceIds.has(src.id));

const subset = {
  ...(full._meta && { _meta: full._meta }),
  schema_version: full.schema_version,
  seed_version: (full.seed_version || 'v3.1') + '-oss-subset-v3.2',
  generated_at: new Date().toISOString(),
  generated_by: 'scripts/extract-oss-subset-v32.mjs',
  _subset_meta: {
    subset_name: 'oss-subset-105',
    subset_version: 'v3.2',
    source_file: 'chagra-catalog-seed-v3.1.json',
    species_count: species.length,
    sources_count: sources.length,
    biopreparados_count: biopreparados.length,
    license: 'CC-BY-NC-SA 4.0',
    rationale:
      'Subset top-uso 105 species curadas según criterio intelligence-first + ' +
      'valor público familias agricultoras Colombia. Cobertura: frutales mayor + ' +
      'pasifloras (anti-confusión taxonómica) + hortalizas comunes + tubérculos andinos + ' +
      'cereales/leguminosas + especias/medicinales base familiar + asocios funcionales + ' +
      'forestales/sombrío café + páramo + amazónicos estratégicos. Re-curado tras revert ' +
      'del subset v3.1 (50 species, PR #1012) que cortó species críticas (aguacate, tomate, ' +
      'lechuga, acelga). Ver catalog/SUBSET_OSS_V3.2_RATIONALE.md.',
  },
  species,
  sources,
  biopreparados,
};

writeFileSync(OUTPUT, JSON.stringify(subset, null, 2) + '\n');
console.log(`OK escrito ${OUTPUT}`);
console.log(`  species: ${species.length}, sources: ${sources.length}, biopreparados: ${biopreparados.length}`);
console.log(`  cross-refs purgados: ${droppedRefs.count}`, droppedRefs.byField);
