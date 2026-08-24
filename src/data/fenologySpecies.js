/**
 * Datos fenológicos para el motor de recomendaciones.
 *
 * Este archivo es un slice generado del catálogo canónico
 * `catalog/chagra-catalog-oss-subset-v3.2.json`. Los campos taxonómicos,
 * térmicos y de altitud se copian del catálogo. Las ventanas de cosecha se
 * toman de las plantillas versionadas en `src/data/phenology-templates/`.
 * Los tres bloques con temperatura, humedad y sensibilidad son los únicos
 * datos de la sección phenologyData de queue/010.
 *
 * Si una especie no tiene un dato en esas fuentes, el valor queda ausente o
 * `phenology: null`. El motor debe degradar con un fallback honesto.
 */

export const PHENOLOGY_SOURCES = Object.freeze({
  CATALOG: 'catalog/chagra-catalog-oss-subset-v3.2.json',
  SPEC: 'queue/010 phenologyData',
  TEMPLATE: 'src/data/phenology-templates/*.v1.json harvest_window',
});

const SPEC_PHENOLOGY = Object.freeze({
  lactuca_sativa_capitata: {
    germination_days: 7,
    harvest_days: 60,
    optimal_temp_c: [15, 20],
    optimal_humidity_percent: [60, 70],
    frost_sensitive: true,
    drought_sensitive: true,
    altitude_range_m: [2000, 2800],
    lunar_preference: ['waxing_gibbous', 'waxing_crescent'],
    source: 'queue/010 phenologyData lechuga',
  },
  solanum_lycopersicum_san_marzano: {
    germination_days: 10,
    harvest_days: 120,
    optimal_temp_c: [18, 25],
    optimal_humidity_percent: [60, 75],
    frost_sensitive: true,
    drought_sensitive: false,
    altitude_range_m: [1500, 2500],
    lunar_preference: ['waxing_gibbous', 'full_moon'],
    source: 'queue/010 phenologyData tomate',
  },
  solanum_tuberosum: {
    germination_days: 14,
    harvest_days: 90,
    optimal_temp_c: [14, 18],
    optimal_humidity_percent: [70, 80],
    frost_sensitive: false,
    drought_sensitive: false,
    altitude_range_m: [2500, 3200],
    lunar_preference: ['waning_gibbous', 'waning_crescent'],
    source: 'queue/010 phenologyData papa',
  },
});

const TEMPLATE_HARVEST_DAYS = Object.freeze({
  allium_cepa: [100, 130],
  coffea_arabica: [850, 1000],
  coriandrum_sativum: [20, 45],
  daucus_carota_subsp_sativus: [75, 105],
  fragaria_ananassa_monterrey: [65, 120],
  lactuca_sativa_capitata: [45, 65],
  manihot_esculenta: [210, 300],
  musa_paradisiaca: [300, 380],
  persea_americana: [850, 1100],
  phaseolus_vulgaris: [75, 95],
  physalis_peruviana: [110, 180],
  pisum_sativum_andina: [50, 95],
  rubus_glaucus: [195, 300],
  solanum_betaceum: [240, 400],
  solanum_lycopersicum_san_marzano: [75, 120],
  solanum_quitoense: [210, 330],
  solanum_tuberosum: [100, 130],
  zea_mays: [100, 130],
});

const TEMPLATE_SOURCES = Object.freeze({
  allium_cepa: 'src/data/phenology-templates/allium_cepa.v1.json',
  coffea_arabica: 'src/data/phenology-templates/coffea_arabica.v1.json',
  coriandrum_sativum: 'src/data/phenology-templates/coriandrum_sativum.v1.json',
  daucus_carota_subsp_sativus: 'src/data/phenology-templates/daucus_carota.v1.json',
  fragaria_ananassa_monterrey: 'src/data/phenology-templates/fragaria_ananassa.v1.json',
  lactuca_sativa_capitata: 'src/data/phenology-templates/lactuca_sativa.v1.json',
  manihot_esculenta: 'src/data/phenology-templates/manihot_esculenta.v1.json',
  musa_paradisiaca: 'src/data/phenology-templates/musa_paradisiaca.v1.json',
  persea_americana: 'src/data/phenology-templates/persea_americana.v1.json',
  phaseolus_vulgaris: 'src/data/phenology-templates/phaseolus_vulgaris.v1.json',
  physalis_peruviana: 'src/data/phenology-templates/physalis_peruviana.v1.json',
  pisum_sativum_andina: 'src/data/phenology-templates/pisum_sativum.v1.json',
  rubus_glaucus: 'src/data/phenology-templates/rubus_glaucus.v1.json',
  solanum_betaceum: 'src/data/phenology-templates/solanum_betaceum.v1.json',
  solanum_lycopersicum_san_marzano: 'src/data/phenology-templates/solanum_lycopersicum.v1.json',
  solanum_quitoense: 'src/data/phenology-templates/solanum_quitoense.v1.json',
  solanum_tuberosum: 'src/data/phenology-templates/solanum_tuberosum.v1.json',
  zea_mays: 'src/data/phenology-templates/zea_mays.v1.json',
});

const CATALOG_SLICE = [
  ['allium_cepa', 'Cebolla cabezona', 'Allium cepa L.', 'tuberculos_raices', ['frio', 'templado'], [0, 1500, 2800, 3500]],
  ['beta_vulgaris_cicla_blanca', 'Acelga blanca', 'Beta vulgaris var. cicla L.', 'hortalizas_hoja', ['frio', 'templado'], [800, 1500, 2800, 3200]],
  ['beta_vulgaris_conditiva', 'Remolacha', 'Beta vulgaris L. subsp. vulgaris Conditiva Group', 'tuberculos_raices', ['frio', 'templado'], [0, 1500, 2800, 3200]],
  ['coriandrum_sativum', 'Cilantro', 'Coriandrum sativum L.', 'hortalizas_hoja', ['templado', 'frio'], [0, 1000, 2400, 2800]],
  ['coffea_arabica', 'Café caturra / Castillo / Cenicafé 1', 'Coffea arabica L.', 'medicinales_alelopaticas', ['templado'], [1200, 1500, 2000, 2200]],
  ['daucus_carota_subsp_sativus', 'Zanahoria', 'Daucus carota L. subsp. sativus (Hoffm.) Arcang.', 'tuberculos_raices', ['frio', 'templado'], [800, 1500, 2700, 3200]],
  ['fragaria_ananassa_monterrey', 'Fresa Monterrey', "Fragaria × ananassa 'Monterrey'", 'frutales_perennes', ['templado', 'frio'], [1000, 1800, 2800, 3200]],
  ['lactuca_sativa_capitata', 'Lechuga cogollo morada', 'Lactuca sativa var. capitata L.', 'hortalizas_hoja', ['frio', 'templado'], [800, 1800, 2700, 3200]],
  ['manihot_esculenta', 'Yuca brava amazónica', 'Manihot esculenta Crantz', 'tuberculos_raices', ['calido'], [0, 100, 800, 1500]],
  ['musa_paradisiaca', 'Plátano', 'Musa × paradisiaca L.', 'frutales_perennes', ['calido', 'templado'], [0, 0, 1800, 2200]],
  ['passiflora_edulis_morada', 'Gulupa', 'Passiflora edulis f. edulis Sims', 'frutales_perennes', ['templado', 'frio'], [1600, 1800, 2300, 2600]],
  ['persea_americana', 'Aguacate', 'Persea americana Mill.', 'frutales_perennes', ['calido', 'templado'], [0, 800, 2200, 2500]],
  ['phaseolus_vulgaris', 'Frijol arbustivo / voluble', 'Phaseolus vulgaris L.', 'granos_legumbres', ['frio', 'templado', 'calido'], [0, 1500, 2400, 2800]],
  ['physalis_peruviana', 'Uchuva', 'Physalis peruviana L.', 'frutales_perennes', ['templado', 'frio'], [1200, 1800, 2800, 3200]],
  ['pisum_sativum_andina', 'Arveja andina', 'Pisum sativum L. var. andina', 'granos_legumbres', ['frio'], [1800, 2200, 2800, 3200]],
  ['rubus_glaucus', 'Mora andina / Mora de Castilla', 'Rubus glaucus Benth.', 'frutales_perennes', ['templado', 'frio'], [1500, 1800, 2600, 2800]],
  ['solanum_betaceum', 'Tomate de árbol / Tamarillo', 'Solanum betaceum Cav.', 'frutales_perennes', ['templado', 'frio'], [1200, 1800, 2400, 3000]],
  ['solanum_lycopersicum_san_marzano', 'Tomate San Marzano', "Solanum lycopersicum 'San Marzano'", 'hortalizas_fruto_flor', ['templado', 'frio'], [0, 1500, 2400, 2800]],
  ['solanum_quitoense', 'Lulo / Naranjilla / Chuva', 'Solanum quitoense Lam.', 'frutales_perennes', ['templado', 'frio'], [1200, 1600, 2400, 2800]],
  ['solanum_tuberosum', 'Papa parda pastusa', 'Solanum tuberosum L. subsp. andigenum var. parda pastusa', 'tuberculos_raices', ['frio', 'paramo'], [2400, 2600, 3300, 3400]],
  ['spinacia_oleracea', 'Espinaca', 'Spinacia oleracea L.', 'hortalizas_hoja', ['frio', 'templado'], [1200, 2000, 2800, 3200]],
  ['tropaeolum_tuberosum', 'Mashua / Cubio', 'Tropaeolum tuberosum Ruiz & Pav.', 'tuberculos_raices', ['frio'], [2000, 2500, 3200, 3600]],
  ['zea_mays', 'Maíz criollo', 'Zea mays L.', 'cereales', ['frio', 'templado', 'calido'], [0, 1800, 2800, 3200]],
];

const LUNAR_PREFERENCES = Object.freeze({
  lactuca_sativa_capitata: ['waxing_gibbous', 'waxing_crescent'],
  spinacia_oleracea: ['waxing_gibbous', 'waxing_crescent'],
  beta_vulgaris_cicla_blanca: ['waxing_gibbous', 'waxing_crescent'],
  daucus_carota_subsp_sativus: ['waning_gibbous', 'waning_crescent'],
  beta_vulgaris_conditiva: ['waning_gibbous', 'waning_crescent'],
  allium_cepa: ['waning_gibbous', 'waning_crescent'],
  solanum_lycopersicum_san_marzano: ['waxing_gibbous', 'full_moon'],
  passiflora_edulis_morada: ['waxing_gibbous', 'full_moon'],
  solanum_tuberosum: ['waning_gibbous', 'waning_crescent'],
  tropaeolum_tuberosum: ['waning_gibbous', 'waning_crescent'],
  manihot_esculenta: ['waning_gibbous', 'waning_crescent'],
});

function makeEntry([id, nombre_comun, nombre_cientifico, category, thermal_zones, altitude]) {
  const [min_absoluto, optimo_min, optimo_max, max_absoluto] = altitude;
  const templateHarvest = TEMPLATE_HARVEST_DAYS[id];
  const spec = SPEC_PHENOLOGY[id];
  const lunar = LUNAR_PREFERENCES[id];
  const phenology = spec || templateHarvest || lunar
    ? {
        ...(templateHarvest ? { harvest_days: templateHarvest, source: TEMPLATE_SOURCES[id] } : {}),
        ...(spec || {}),
        ...(lunar && !spec ? { lunar_preference: lunar } : {}),
      }
    : null;
  if (spec && templateHarvest) phenology.harvest_days_template = templateHarvest;
  return {
    id,
    nombre_comun,
    nombre_cientifico,
    category,
    thermal_zones,
    altitud_msnm: { min_absoluto, optimo_min, optimo_max, max_absoluto },
    phenology,
  };
}

export const FENOLOGY_CATALOG = Object.freeze(CATALOG_SLICE.map(makeEntry));

/** Alias normalizados según los nombres usados por queue/010 y el catálogo. */
export const SPECIES_ALIASES = Object.freeze({
  acelga: 'beta_vulgaris_cicla_blanca',
  cebolla: 'allium_cepa',
  cilantro: 'coriandrum_sativum',
  espinaca: 'spinacia_oleracea',
  fresa: 'fragaria_ananassa_monterrey',
  frijol: 'phaseolus_vulgaris',
  gulupa: 'passiflora_edulis_morada',
  lechuga: 'lactuca_sativa_capitata',
  maiz: 'zea_mays',
  mashua: 'tropaeolum_tuberosum',
  papa: 'solanum_tuberosum',
  remolacha: 'beta_vulgaris_conditiva',
  tomate: 'solanum_lycopersicum_san_marzano',
  yuca: 'manihot_esculenta',
  zanahoria: 'daucus_carota_subsp_sativus',
});

export const FENOLOGY_CATALOG_COUNT = FENOLOGY_CATALOG.length;
