/**
 * speciesDefaults.js — Mapa de correlación especie → (categoría, estrato, gremio,
 * producción, compañeros y antagonistas).
 *
 * Claves (`id`) coinciden con CROP_TAXONOMY para lookup O(1).
 * Principio: cada especie tiene un default agroecológico basado en permacultura y
 * prácticas de Jairo Restrepo. El operario SIEMPRE puede sobrescribir.
 *
 * Campos añadidos en Fase 18:
 *   - companions:   [id...] compañeros explícitos de gremio
 *   - antagonists:  [id...] especies con alelopatía negativa
 */

export const SPECIES_DEFAULTS = {
  // --- Frutales y Perennes ---
  passiflora_edulis:       { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 8, companions: ['phaseolus_vulgaris', 'calendula_officinalis', 'tropaeolum_majus'], antagonists: [] },
  passiflora_tarminiana:   { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 10, companions: ['phaseolus_vulgaris', 'calendula_officinalis'], antagonists: [] },
  passiflora_ligularis:    { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 9, companions: ['phaseolus_vulgaris', 'tropaeolum_majus'], antagonists: [] },
  rubus_glaucus:           { category: 'frutales_perennes', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 6, companions: ['vicia_faba', 'calendula_officinalis', 'avena_sativa'], antagonists: [] },
  rubus_fruticosus:        { category: 'frutales_perennes', estrato: 'bajo', gremio: 'productor_biomasa', production: 'fruto', cycleMonths: 8, companions: ['vicia_sativa', 'calendula_officinalis'], antagonists: [] },
  rubus_idaeus:            { category: 'frutales_perennes', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 5, companions: ['vicia_faba', 'calendula_officinalis'], antagonists: [] },
  fragaria_ananassa:       { category: 'frutales_perennes', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 4, companions: ['allium_cepa', 'spinacia_oleracea', 'petroselinum_crispum'], antagonists: ['brassica_oleracea_capitata'] },
  physalis_peruviana:      { category: 'frutales_perennes', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 5, companions: ['calendula_officinalis', 'coriandrum_sativum'], antagonists: [] },
  solanum_betaceum:        { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 12, companions: ['vicia_faba', 'calendula_officinalis'], antagonists: ['solanum_tuberosum'] },
  vaccinium_corymbosum:    { category: 'frutales_perennes', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 18, companions: ['avena_sativa', 'vicia_sativa'], antagonists: [] },
  coffea_arabica:          { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'grano', cycleMonths: null, companions: ['zea_mays', 'phaseolus_vulgaris', 'psidium_guajava'], antagonists: [] },
  psidium_guajava:         { category: 'frutales_perennes', estrato: 'alto', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['coffea_arabica', 'phaseolus_vulgaris', 'cucurbita_maxima'], antagonists: [] },
  malus_domestica:         { category: 'frutales_perennes', estrato: 'alto', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['tropaeolum_majus', 'allium_cepa', 'vicia_sativa'], antagonists: [] },
  pyrus_communis:          { category: 'frutales_perennes', estrato: 'alto', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['tropaeolum_majus', 'vicia_sativa'], antagonists: [] },
  prunus_persica:          { category: 'frutales_perennes', estrato: 'alto', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['tropaeolum_majus', 'calendula_officinalis', 'vicia_faba'], antagonists: [] },
  acca_sellowiana:         { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['vicia_sativa', 'calendula_officinalis'], antagonists: [] },
  vasconcellea_pubescens:  { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['phaseolus_vulgaris'], antagonists: [] },
  ficus_carica:            { category: 'frutales_perennes', estrato: 'alto', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['vicia_sativa', 'tropaeolum_majus'], antagonists: [] },
  citrus_limon:            { category: 'frutales_perennes', estrato: 'medio', gremio: 'productivo_principal', production: 'fruto', cycleMonths: null, companions: ['calendula_officinalis', 'rosmarinus_officinalis', 'tropaeolum_majus'], antagonists: [] },

  // --- Leguminosas y Granos ---
  // Milpa clásica: Maíz + Frijol + Calabaza (Tres Hermanas americanas)
  zea_mays:                { category: 'leguminosas_granos', estrato: 'medio', gremio: 'productivo_principal', production: 'grano', cycleMonths: 4, companions: ['phaseolus_vulgaris', 'cucurbita_maxima', 'cucurbita_pepo'], antagonists: [] },
  phaseolus_vulgaris:      { category: 'leguminosas_granos', estrato: 'bajo', gremio: 'fijador_nitrogeno', production: 'grano', cycleMonths: 3, companions: ['zea_mays', 'cucurbita_maxima', 'daucus_carota'], antagonists: ['allium_cepa', 'allium_cepa'] },
  pisum_sativum:           { category: 'leguminosas_granos', estrato: 'bajo', gremio: 'fijador_nitrogeno', production: 'grano', cycleMonths: 3, companions: ['daucus_carota', 'lactuca_sativa', 'spinacia_oleracea'], antagonists: ['allium_cepa'] },
  vicia_faba:              { category: 'leguminosas_granos', estrato: 'bajo', gremio: 'fijador_nitrogeno', production: 'grano', cycleMonths: 4, companions: ['solanum_tuberosum', 'spinacia_oleracea', 'avena_sativa'], antagonists: ['allium_cepa'] },
  lupinus_mutabilis:       { category: 'leguminosas_granos', estrato: 'bajo', gremio: 'fijador_nitrogeno', production: 'grano', cycleMonths: 6, companions: ['solanum_tuberosum', 'zea_mays'], antagonists: [] },
  chenopodium_quinoa:      { category: 'leguminosas_granos', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'grano', cycleMonths: 5, companions: ['vicia_faba', 'lupinus_mutabilis'], antagonists: [] },
  amaranthus_caudatus:     { category: 'leguminosas_granos', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'grano', cycleMonths: 4, companions: ['zea_mays', 'phaseolus_vulgaris'], antagonists: [] },

  // --- Hortalizas de Hoja ---
  lactuca_sativa:             { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'productivo_principal', production: 'hoja', cycleMonths: 2, companions: ['daucus_carota', 'fragaria_ananassa', 'coriandrum_sativum'], antagonists: ['petroselinum_crispum'] },
  spinacia_oleracea:          { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'hoja', cycleMonths: 2, companions: ['fragaria_ananassa', 'pisum_sativum', 'daucus_carota'], antagonists: [] },
  beta_vulgaris_cicla:        { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'hoja', cycleMonths: 2, companions: ['allium_cepa', 'daucus_carota'], antagonists: [] },
  brassica_oleracea_capitata: { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'productivo_principal', production: 'hoja', cycleMonths: 3, companions: ['calendula_officinalis', 'rosmarinus_officinalis', 'coriandrum_sativum'], antagonists: ['fragaria_ananassa', 'solanum_lycopersicum'] },
  brassica_oleracea_sabellica:{ category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'hoja', cycleMonths: 3, companions: ['calendula_officinalis', 'allium_cepa'], antagonists: ['fragaria_ananassa'] },
  apium_graveolens:           { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'productivo_principal', production: 'tallo', cycleMonths: 4, companions: ['solanum_lycopersicum', 'phaseolus_vulgaris'], antagonists: [] },
  coriandrum_sativum:         { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'atrayente_polinizadores', production: 'hoja', cycleMonths: 1, companions: ['solanum_lycopersicum', 'lactuca_sativa', 'spinacia_oleracea'], antagonists: [] },
  petroselinum_crispum:       { category: 'hortalizas_hoja', estrato: 'bajo', gremio: 'atrayente_polinizadores', production: 'hoja', cycleMonths: 2, companions: ['solanum_lycopersicum', 'daucus_carota'], antagonists: ['lactuca_sativa'] },

  // --- Hortalizas de Fruto ---
  cucurbita_maxima:            { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'cobertura_suelo', production: 'fruto', cycleMonths: 4, companions: ['zea_mays', 'phaseolus_vulgaris'], antagonists: ['solanum_tuberosum'] },
  cucurbita_pepo:              { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'cobertura_suelo', production: 'fruto', cycleMonths: 3, companions: ['zea_mays', 'phaseolus_vulgaris'], antagonists: ['solanum_tuberosum'] },
  brassica_oleracea_botrytis:  { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'flor', cycleMonths: 4, companions: ['calendula_officinalis', 'coriandrum_sativum'], antagonists: ['fragaria_ananassa'] },
  brassica_oleracea_italica:   { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'flor', cycleMonths: 4, companions: ['calendula_officinalis', 'rosmarinus_officinalis'], antagonists: ['fragaria_ananassa'] },
  solanum_lycopersicum:        { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 4, companions: ['ocimum_basilicum', 'coriandrum_sativum', 'calendula_officinalis', 'daucus_carota'], antagonists: ['brassica_oleracea_capitata', 'solanum_tuberosum'] },
  solanum_lycopersicum_chonto: { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 4, companions: ['ocimum_basilicum', 'coriandrum_sativum', 'calendula_officinalis'], antagonists: ['brassica_oleracea_capitata'] },
  solanum_lycopersicum_cherry: { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 3, companions: ['ocimum_basilicum', 'calendula_officinalis'], antagonists: ['brassica_oleracea_capitata'] },
  capsicum_annuum:             { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 4, companions: ['ocimum_basilicum', 'daucus_carota', 'coriandrum_sativum'], antagonists: [] },
  cucumis_sativus:             { category: 'hortalizas_fruto_flor', estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto', cycleMonths: 2, companions: ['phaseolus_vulgaris', 'lactuca_sativa', 'zea_mays'], antagonists: [] },

  // --- Tubérculos y Raíces ---
  solanum_tuberosum:           { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo', cycleMonths: 4, companions: ['vicia_faba', 'zea_mays', 'calendula_officinalis'], antagonists: ['solanum_lycopersicum', 'cucurbita_maxima'] },
  solanum_tuberosum_pastusa:   { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo', cycleMonths: 5, companions: ['vicia_faba', 'zea_mays'], antagonists: ['solanum_lycopersicum'] },
  solanum_tuberosum_sabanera:  { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo', cycleMonths: 5, companions: ['vicia_faba', 'zea_mays'], antagonists: ['solanum_lycopersicum'] },
  solanum_phureja:             { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo', cycleMonths: 3, companions: ['vicia_faba', 'calendula_officinalis'], antagonists: ['solanum_lycopersicum'] },
  solanum_tuberosum_nativas:   { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo', cycleMonths: 6, companions: ['vicia_faba', 'lupinus_mutabilis'], antagonists: ['solanum_lycopersicum'] },
  oxalis_tuberosa:             { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo', cycleMonths: 8, companions: ['ullucus_tuberosus', 'tropaeolum_tuberosum'], antagonists: [] },
  ullucus_tuberosus:           { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'cobertura_suelo', production: 'tubérculo', cycleMonths: 7, companions: ['oxalis_tuberosa', 'tropaeolum_tuberosum', 'solanum_tuberosum'], antagonists: [] },
  tropaeolum_tuberosum:        { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'repelente_plagas', production: 'tubérculo', cycleMonths: 8, companions: ['oxalis_tuberosa', 'ullucus_tuberosus'], antagonists: [] },
  daucus_carota:               { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'raíz', cycleMonths: 3, companions: ['allium_cepa', 'lactuca_sativa', 'pisum_sativum', 'solanum_lycopersicum'], antagonists: [] },
  beta_vulgaris_rubra:         { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'raíz', cycleMonths: 3, companions: ['allium_cepa', 'lactuca_sativa'], antagonists: [] },
  smallanthus_sonchifolius:    { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'raíz', cycleMonths: 8, companions: ['vicia_faba', 'calendula_officinalis'], antagonists: [] },
  arracacia_xanthorrhiza:      { category: 'tuberculos_raices', estrato: 'bajo', gremio: 'productivo_principal', production: 'raíz', cycleMonths: 10, companions: ['zea_mays', 'phaseolus_vulgaris'], antagonists: [] },

  // --- Medicinales y Alelopatía ---
  aloe_vera:              { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: [], antagonists: [] },
  calendula_officinalis:  { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'atrayente_polinizadores', production: 'flor', cycleMonths: 3, companions: ['solanum_lycopersicum', 'brassica_oleracea_capitata'], antagonists: [] },
  tropaeolum_majus:       { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'flor', cycleMonths: 3, companions: ['cucurbita_maxima', 'malus_domestica', 'passiflora_edulis'], antagonists: [] },
  allium_cepa:            { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'bulbo', cycleMonths: 4, companions: ['daucus_carota', 'lactuca_sativa', 'fragaria_ananassa'], antagonists: ['phaseolus_vulgaris', 'pisum_sativum', 'vicia_faba'] },
  rosmarinus_officinalis: { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: ['brassica_oleracea_capitata', 'daucus_carota'], antagonists: [] },
  artemisia_absinthium:   { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: [], antagonists: ['lactuca_sativa', 'pisum_sativum'] },
  ruta_graveolens:        { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: [], antagonists: ['ocimum_basilicum'] },
  matricaria_chamomilla:  { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'atrayente_polinizadores', production: 'flor', cycleMonths: 3, companions: ['brassica_oleracea_capitata', 'allium_cepa'], antagonists: [] },
  urtica_dioica:          { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'hoja', cycleMonths: null, companions: ['solanum_lycopersicum', 'mentha_spicata'], antagonists: [] },
  symphytum_officinale:   { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'acumulador_dinamico', production: 'hoja', cycleMonths: null, companions: ['malus_domestica', 'rubus_glaucus'], antagonists: [] },
  mentha_spicata:         { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: ['brassica_oleracea_capitata', 'solanum_lycopersicum'], antagonists: [] },
  mentha_piperita:        { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: ['brassica_oleracea_capitata'], antagonists: [] },
  aloysia_citrodora:      { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'atrayente_polinizadores', production: 'hoja', cycleMonths: null, companions: [], antagonists: [] },
  foeniculum_vulgare:     { category: 'medicinales_alelopaticas', estrato: 'medio', gremio: 'atrayente_polinizadores', production: 'hoja', cycleMonths: null, companions: [], antagonists: ['solanum_lycopersicum', 'phaseolus_vulgaris'] },
  cymbopogon_citratus:    { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: null, companions: [], antagonists: [] },
  pimpinella_anisum:      { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'atrayente_polinizadores', production: 'semilla', cycleMonths: 4, companions: ['coriandrum_sativum'], antagonists: [] },
  ocimum_basilicum:       { category: 'medicinales_alelopaticas', estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja', cycleMonths: 3, companions: ['solanum_lycopersicum', 'capsicum_annuum'], antagonists: ['ruta_graveolens'] },

  // --- Abonos Verdes y Coberturas ---
  avena_sativa:     { category: 'abonos_verdes_coberturas', estrato: 'bajo', gremio: 'productor_biomasa', production: 'biomasa', cycleMonths: 3, companions: ['vicia_sativa'], antagonists: [] },
  raphanus_sativus: { category: 'abonos_verdes_coberturas', estrato: 'bajo', gremio: 'productor_biomasa', production: 'biomasa', cycleMonths: 2, companions: ['vicia_sativa', 'avena_sativa'], antagonists: [] },
  vicia_sativa:     { category: 'abonos_verdes_coberturas', estrato: 'bajo', gremio: 'fijador_nitrogeno', production: 'biomasa', cycleMonths: 3, companions: ['avena_sativa', 'raphanus_sativus'], antagonists: ['allium_cepa'] },
};

export const CATEGORY_FALLBACKS = {
  frutales_perennes:        { estrato: 'medio', gremio: 'productivo_principal', production: 'fruto' },
  leguminosas_granos:       { estrato: 'bajo', gremio: 'fijador_nitrogeno', production: 'grano' },
  hortalizas_hoja:          { estrato: 'bajo', gremio: 'productivo_principal', production: 'hoja' },
  hortalizas_fruto_flor:    { estrato: 'bajo', gremio: 'productivo_principal', production: 'fruto' },
  tuberculos_raices:        { estrato: 'bajo', gremio: 'productivo_principal', production: 'tubérculo' },
  medicinales_alelopaticas: { estrato: 'bajo', gremio: 'repelente_plagas', production: 'hoja' },
  abonos_verdes_coberturas: { estrato: 'bajo', gremio: 'productor_biomasa', production: 'biomasa' },
};

// ADR-030 Bloque A Regla 1 — tracking_mode default per category.
// Espejo del mapping en Chagra-strategy/scripts/migrate-v31-to-v32.mjs.
// Se aplica si el catálogo SQLite no expone tracking_mode (ej. species
// inserción libre fuera del catálogo). Mantener sincronizado con el
// catalog seed v3.2.
export const CATEGORY_TRACKING_MODE = {
  // individual (trazabilidad por planta)
  frutales_perennes:        'individual',
  tuberculos_raices:        'individual',
  medicinales_alelopaticas: 'individual',
  // aggregate (siembra masiva, cama corrida)
  leguminosas_granos:       'aggregate',
  hortalizas_hoja:          'aggregate',
  hortalizas_fruto_flor:    'aggregate',
  abonos_verdes_coberturas: 'aggregate',
};

export const resolveSpeciesDefaults = (speciesId, categoryId = null) => {
  const base = speciesId && SPECIES_DEFAULTS[speciesId]
    ? SPECIES_DEFAULTS[speciesId]
    : (categoryId && CATEGORY_FALLBACKS[categoryId]
        ? { ...CATEGORY_FALLBACKS[categoryId], cycleMonths: null, companions: [], antagonists: [] }
        : null);
  if (!base) return null;
  // Resolver tracking_mode según category. Operario puede override per-creación
  // en el form (link sutil "Registrar individualmente" / "Agrupar siembra").
  const cat = base.category || categoryId;
  const tracking_mode = cat && CATEGORY_TRACKING_MODE[cat] ? CATEGORY_TRACKING_MODE[cat] : 'individual';
  return { ...base, tracking_mode };
};
