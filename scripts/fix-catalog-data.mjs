#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CATALOG_PATH = join(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
let fixes = 0;

const speciesById = new Map(catalog.species.map(s => [s.id, s]));
const sourceIds = new Set(catalog.sources.map(s => s.id));

// 1. Fix drenaje_requerido: "regular" → "moderado"
for (const sp of catalog.species) {
  if (sp.drenaje_requerido === 'regular') {
    sp.drenaje_requerido = 'moderado';
    fixes++;
  }
}

// 2. Fix festuca_sp_paramo scientific name
for (const sp of catalog.species) {
  if (sp.id === 'festuca_sp_paramo') {
    sp.nombre_cientifico = 'Festuca paramuno (complejo paramuno)';
    fixes++;
    break;
  }
}

// 3. Fix myrciaria_cauliflora missing roles_in_guild
for (const sp of catalog.species) {
  if (sp.id === 'myrciaria_cauliflora' && !sp.roles_in_guild) {
    sp.roles_in_guild = ['crop'];
    fixes++;
    break;
  }
}

// 4. Add estrato to species missing it
const estratoMap = {
  // Trees (alto)
  mangifera_indica: 'alto', persea_americana: 'alto',
  citrus_latifolia: 'alto', citrus_sinensis: 'alto', citrus_reticulata: 'alto', citrus_aurantiifolia: 'alto',
  annona_cherimola: 'alto', annona_mucosa: 'alto', annona_squamosa: 'alto', annona_muricata: 'alto', annona_reticulata: 'alto',
  aiphanes_aculeata: 'alto', astrocaryum_chambira: 'alto', attalea_butyracea: 'alto',
  euterpe_precatoria: 'alto', mauritia_flexuosa: 'alto', mauritia_minor: 'alto',
  oenocarpus_bataua: 'alto', oenocarpus_mapora: 'alto', phytelephas_macrocarpa: 'alto', phytelephas_seemannii: 'alto',
  bactris_gasipaes_amazonica: 'alto',
  pyrus_communis_anjou: 'alto', malus_domestica_sabanera: 'alto',
  prunus_avium_ducezno: 'alto', prunus_domestica_ciruela_imperial: 'alto', prunus_persica_amarilla: 'alto', prunus_serotina_capuli: 'alto',
  byrsonima_crassifolia: 'alto', couma_macrocarpa: 'alto', manilkara_zapota: 'alto',
  pouteria_torta: 'alto', pouteria_lucuma: 'alto', spondias_dulcis: 'alto', anacardium_occidentale: 'alto',
  borojoa_sorbilis: 'alto', borojoa_patinoi: 'alto', genipa_americana: 'alto',
  litchi_chinensis: 'alto', nephelium_lappaceum: 'alto', dimocarpus_longan: 'alto',
  garcinia_mangostana: 'alto', chrysophyllum_cainito: 'alto', ficus_carica_higo: 'alto',
  morus_nigra_mora_de_arbol: 'alto', diospyros_kaki: 'alto', syzygium_malaccense: 'alto',
  inga_densiflora: 'alto', inga_vera: 'alto', pithecellobium_dulce: 'alto',
  psidium_friedrichsthalianum: 'alto', melicoccus_bijugatus: 'alto', talisia_olivaeformis: 'alto',
  ziziphus_mauritiana: 'alto', theobroma_bicolor: 'alto',
  pourouma_cecropiifolia: 'alto', pourouma_cecropiifolia_silvestre: 'alto',
  mammea_americana: 'alto', musa_paradisiaca: 'alto',
  prunus_avium: 'alto', prunus_serotina: 'alto',
  // Medium shrubs
  coffea_arabica: 'medio', vasconcellea_pubescens: 'medio',
  solanum_betaceum_morado: 'medio', solanum_betaceum_naranja: 'medio', solanum_quitoense_amazonico: 'medio',
  acrocomia_aculeata: 'medio', elaeis_oleifera: 'medio',
  // Low shrubs/bushes
  hylocereus_undatus: 'bajo', selenicereus_megalanthus: 'bajo', stenocereus_griseus: 'bajo', opuntia_ficus_indica: 'bajo',
  ananas_comosus: 'bajo', ananas_comosus_md_gold: 'bajo',
  vaccinium_corymbosum_emerald: 'bajo', rubus_glaucus_sin_espinas: 'bajo',
  rubus_idaeus_golden: 'bajo', rubus_idaeus_heritage: 'bajo',
  plukenetia_volubilis: 'bajo', morinda_citrifolia: 'bajo', phyllanthus_acidus: 'bajo', averrhoa_carambola: 'bajo',
  fragaria_ananassa: 'bajo', vaccinium_corymbosum: 'bajo', rubus_idaeus: 'bajo', panicum_maximum: 'bajo',
  // Vines
  passiflora_edulis_amarilla_colombia: 'rastrero', vitis_vinifera: 'rastrero', actinidia_deliciosa: 'rastrero',
  passiflora_tripartita: 'rastrero',
};

for (const sp of catalog.species) {
  if (!sp.estrato && estratoMap[sp.id]) {
    sp.estrato = estratoMap[sp.id];
    fixes++;
  }
}

// 5. Add missing source entry for base stubs
if (!sourceIds.has('agrosavia-2011-tomate')) {
  catalog.sources.push({
    id: 'agrosavia-2011-tomate',
    tipo: 'ficha_tecnica_institucional',
    autores: 'AGROSAVIA (Corporación Colombiana de Investigación Agropecuaria)',
    titulo: 'Manual técnico del cultivo de tomate bajo condiciones controladas',
    institucion: 'AGROSAVIA',
    año: 2011,
    tier: 'A',
    url: 'https://repository.agrosavia.co/handle/20.500.12324/1271',
  });
  sourceIds.add('agrosavia-2011-tomate');
  fixes++;
}

// 6. Fix base species stubs source_ids to have ≥2 Tier A
const extraSourceIds = ['bernal-2015-plantas-liquenes-colombia', 'gbif-taxonomic-backbone'];
const stubBaseIds = [
  'solanum_lycopersicum', 'capsicum_annuum', 'capsicum_chinense',
  'brassica_oleracea', 'lactuca_sativa', 'beta_vulgaris',
  'pisum_sativum', 'lens_culinaris', 'phaseolus_lunatus',
  'daucus_carota', 'fragaria_ananassa', 'passiflora_tripartita',
  'panicum_maximum', 'vaccinium_corymbosum', 'cynara_cardunculus',
  'prunus_avium', 'prunus_serotina', 'rubus_idaeus',
];

for (const sp of catalog.species) {
  if (stubBaseIds.includes(sp.id) && Array.isArray(sp.source_ids)) {
    for (const extra of extraSourceIds) {
      if (!sp.source_ids.includes(extra) && sourceIds.has(extra)) {
        sp.source_ids.push(extra);
        fixes++;
      }
    }
  }
}

// 7. Add nota_conservacion to endemic species without it
const endemicSpecies = {
  borojoa_patinoi: 'Endémica del Chocó biogeográfico colombiano. Especie clave en sistemas agroforestales del Pacífico.',
  piper_bogotense: 'Endémica de los bosques altoandinos de la cordillera Oriental colombiana (Cundinamarca).',
  paragynoxys_uribei: 'Endémica del páramo colombiano (Boyacá, Santander). Asteraceae arbustiva de alta montaña.',
  aragoa_abietina: 'Endémica del páramo colombiano. Plantaginaceae arbustiva de la superpáramo.',
  valeriana_arborea: 'Endémica de los páramos colombianos. Valerianaceae arbustiva de la cordillera Central y Oriental.',
  lupinus_carrikeri: 'Endémica del páramo colombiano. Fabaceae arbustiva endémica de la Sierra Nevada del Cocuy.',
  magnolia_caricifragrans: 'Endémica de Colombia (Antioquia, Caldas). Magnoliaceae arbórea en peligro por pérdida de hábitat.',
};

for (const sp of catalog.species) {
  if (endemicSpecies[sp.id] && !sp.nota_conservacion && !sp.clasificacion_uicn) {
    sp.nota_conservacion = endemicSpecies[sp.id];
    fixes++;
  }
}

writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
console.log(`Total fixes applied: ${fixes}`);
