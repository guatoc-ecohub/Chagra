/**
 * subjectTipo — deriva el TIPO botánico de una especie (frutal / hortaliza /
 * aromatica / otro) a partir de su `subject_slug`, para que la escena "Mi Finca
 * Viva" dibuje cada planta con su SILUETA correcta (árbol vs cama de huerta vs
 * mata aromática) — no un árbol genérico para todo.
 *
 * Módulo PURO y SÍNCRONO (sin red, sin IDB, sin WASM): la escena se construye en
 * un `useMemo` síncrono, así que el tipo NO puede depender del catálogo SQLite
 * (asíncrono, browser-only). Aquí vive un MAPA ESTÁTICO slug→categoría derivado
 * del catálogo OSS (chagra-catalog-seed-v3.1.json) + src/config/speciesDefaults
 * (127 especies cubiertas), más reglas de respaldo por SUBSTRING del slug/nombre
 * para que una especie fuera del mapa caiga a un tipo razonable, nunca a un
 * dibujo equivocado. Cero fabricación: si no se puede inferir, cae a 'otro'
 * (silueta neutra de mata), nunca inventa que algo es un frutal.
 *
 * Mantenimiento: el mapa se regenera del catálogo; al agregar especies nuevas,
 * actualizar `CATEGORIA_POR_SLUG` (o confiar en el fallback por substring). Las
 * pruebas anclan los casos insignia del operador (fresa=frutal, aguacate=frutal,
 * hortaliza, romero=aromática).
 *
 * Español de Colombia (tú/usted), sin voseo.
 *
 * @module services/subjectTipo
 */

/** Tipos de planta que la escena sabe dibujar. */
export const TIPOS_PLANTA = Object.freeze(['frutal', 'hortaliza', 'aromatica', 'otro']);

/**
 * Categoría del catálogo → TIPO visual de la escena. Una categoría agronómica
 * del catálogo (p.ej. `frutales_perennes`, `hortalizas_hoja`) se traduce a la
 * silueta que mejor la representa de un vistazo.
 * @type {Record<string, string>}
 */
const CATEGORIA_A_TIPO = Object.freeze({
  frutales_perennes: 'frutal',
  tuberculos_raices: 'hortaliza',
  hortalizas_hoja: 'hortaliza',
  hortalizas_fruto_flor: 'hortaliza',
  cereales: 'hortaliza',
  granos_legumbres: 'hortaliza',
  leguminosas_granos: 'hortaliza',
  abonos_verdes_coberturas: 'hortaliza',
  medicinales_alelopaticas: 'aromatica',
  atractores_polinizadores: 'aromatica',
  ornamentales_nativas: 'aromatica',
  arboles_sombra: 'otro',
  cercas_vivas: 'otro',
  fibras_no_maderables: 'otro',
  especies_invasoras: 'otro',
});

/**
 * Mapa ESTÁTICO slug→tipo, derivado del catálogo OSS + speciesDefaults. Es la
 * fuente principal: lookup O(1) determinista y offline. Cubre las 127 especies
 * con categoría conocida. Las correcciones de criterio VISUAL frente al catálogo
 * (café = frutal/arbolito, no "medicinal") quedan anotadas.
 * @type {Record<string, string>}
 */
const TIPO_POR_SLUG = Object.freeze({
  // ── Frutales (árbol/arbusto con fruto) ──────────────────────────────────
  acca_sellowiana: 'frutal',
  anacardium_occidentale: 'frutal',
  annona_muricata: 'frutal',
  bactris_gasipaes: 'frutal',
  citrus_limon: 'frutal',
  // Café: el catálogo lo marca 'medicinales_alelopaticas', pero VISUALMENTE es
  // un arbusto con cerezas → frutal (silueta de arbolito reconocible).
  coffea_arabica: 'frutal',
  elaeis_guineensis: 'frutal',
  erythrina_edulis: 'frutal',
  ficus_carica: 'frutal',
  fragaria_ananassa: 'frutal',
  inga_edulis: 'frutal',
  malus_domestica: 'frutal',
  musa_paradisiaca: 'frutal',
  passiflora_edulis: 'frutal',
  passiflora_ligularis: 'frutal',
  passiflora_tarminiana: 'frutal',
  persea_americana: 'frutal',
  physalis_peruviana: 'frutal',
  prunus_persica: 'frutal',
  psidium_guajava: 'frutal',
  pyrus_communis: 'frutal',
  rubus_fruticosus: 'frutal',
  rubus_glaucus: 'frutal',
  rubus_idaeus: 'frutal',
  selenicereus_megalanthus: 'frutal',
  solanum_betaceum: 'frutal',
  solanum_quitoense: 'frutal',
  theobroma_cacao: 'frutal',
  vaccinium_corymbosum: 'frutal',
  vaccinium_meridionale: 'frutal',
  vasconcellea_pubescens: 'frutal',
  vitis_vinifera: 'frutal',

  // ── Hortalizas / huerta (cama, hilera, plántulas) ───────────────────────
  allium_fistulosum: 'hortaliza',
  alnus_acuminata: 'otro', // aliso = árbol de sombra (corrección)
  amaranthus_caudatus: 'hortaliza',
  apium_graveolens: 'hortaliza',
  arracacia_xanthorrhiza: 'hortaliza',
  avena_sativa: 'hortaliza',
  beta_vulgaris_cicla: 'hortaliza',
  beta_vulgaris_rubra: 'hortaliza',
  brassica_oleracea_botrytis: 'hortaliza',
  brassica_oleracea_capitata: 'hortaliza',
  brassica_oleracea_italica: 'hortaliza',
  brassica_oleracea_sabellica: 'hortaliza',
  cajanus_cajan: 'hortaliza',
  capsicum_annuum: 'hortaliza',
  chenopodium_quinoa: 'hortaliza',
  coriandrum_sativum: 'aromatica', // cilantro: hierba de cocina (corrección)
  crotalaria_juncea: 'hortaliza',
  cucumis_sativus: 'hortaliza',
  cucurbita_maxima: 'hortaliza',
  cucurbita_pepo: 'hortaliza',
  daucus_carota: 'hortaliza',
  daucus_carota_subsp_sativus: 'hortaliza',
  dioscorea_alata_rotundata: 'hortaliza',
  ipomoea_batatas: 'hortaliza',
  lactuca_sativa: 'hortaliza',
  lactuca_sativa_capitata: 'hortaliza',
  lupinus_mutabilis: 'hortaliza',
  manihot_esculenta: 'hortaliza',
  mucuna_pruriens: 'hortaliza',
  oryza_sativa: 'hortaliza',
  oxalis_tuberosa: 'hortaliza',
  petroselinum_crispum: 'aromatica', // perejil: hierba de cocina (corrección)
  phaseolus_vulgaris: 'hortaliza',
  pisum_sativum: 'hortaliza',
  plukenetia_volubilis: 'hortaliza',
  raphanus_sativus: 'hortaliza',
  salvia_hispanica: 'hortaliza',
  smallanthus_sonchifolius: 'hortaliza',
  solanum_lycopersicum: 'hortaliza',
  solanum_lycopersicum_cherry: 'hortaliza',
  solanum_lycopersicum_chonto: 'hortaliza',
  solanum_lycopersicum_san_marzano: 'hortaliza',
  solanum_phureja: 'hortaliza',
  solanum_tuberosum: 'hortaliza',
  solanum_tuberosum_nativas: 'hortaliza',
  solanum_tuberosum_pastusa: 'hortaliza',
  solanum_tuberosum_pastusa_suprema: 'hortaliza',
  solanum_tuberosum_sabanera: 'hortaliza',
  spinacia_oleracea: 'hortaliza',
  tithonia_diversifolia: 'aromatica', // botón de oro: arbustiva florida
  trifolium_repens: 'hortaliza',
  tropaeolum_tuberosum: 'hortaliza',
  ullucus_tuberosus: 'hortaliza',
  vicia_faba: 'hortaliza',
  vicia_sativa: 'hortaliza',
  zea_mays: 'hortaliza',

  // ── Aromáticas / medicinales / florales (mata redondeada compacta) ──────
  allium_cepa: 'hortaliza', // cebolla: huerta (corrección)
  allium_schoenoprasum: 'aromatica',
  aloe_vera: 'aromatica',
  aloysia_citrodora: 'aromatica',
  artemisia_absinthium: 'aromatica',
  calendula_officinalis: 'aromatica',
  chrysanthemum_morifolium: 'aromatica',
  cymbopogon_citratus: 'aromatica',
  dianthus_caryophyllus: 'aromatica',
  foeniculum_vulgare: 'aromatica',
  heliconia_psittacorum: 'aromatica',
  matricaria_chamomilla: 'aromatica',
  melissa_officinalis: 'aromatica',
  mentha_piperita: 'aromatica',
  mentha_spicata: 'aromatica',
  ocimum_basilicum: 'aromatica',
  origanum_vulgare: 'aromatica',
  pimpinella_anisum: 'aromatica',
  plantago_major: 'aromatica',
  rosa_hybrida: 'aromatica',
  rosmarinus_officinalis: 'aromatica',
  ruta_graveolens: 'aromatica',
  symphytum_officinale: 'aromatica',
  tropaeolum_majus: 'aromatica',
  urtica_dioica: 'aromatica',
  vanilla_planifolia: 'aromatica',

  // ── Otros (árboles maderables/sombra, palmas, invasoras: silueta neutra) ─
  carludovica_palmata: 'otro',
  cedrela_odorata: 'otro',
  cenchrus_clandestinus: 'otro',
  cordia_alliodora: 'otro',
  eichhornia_crassipes: 'otro',
  eucalyptus_globulus: 'otro',
  melinis_minutiflora: 'otro',
  murraya_paniculata: 'otro',
  pteridium_aquilinum: 'otro',
  swietenia_macrophylla: 'otro',
  tabebuia_chrysantha: 'otro',
  tabebuia_rosea: 'otro',
  ulex_europaeus: 'otro',
});

/**
 * Reglas de RESPALDO por substring (slug/nombre), para especies fuera del mapa.
 * Orden importa: la primera que matchea gana. Cubre familias/términos comunes
 * en español e inglés botánico (citrus, mango, herbs, etc.). Nunca afirma frutal
 * sin señal clara: lo dudoso cae a 'otro'.
 * @type {Array<{ re: RegExp, tipo: string }>}
 */
/** @type {ReadonlyArray<{ re: RegExp, tipo: string }>} */
const FALLBACK_SUBSTR = Object.freeze([
  // Frutales por género/término inequívoco
  { re: /(citrus|mango|mangifera|mangostan|aguacate|persea|guayab|psidium|guanaban|annona|chirimoy|maracuy|passiflora|granadill|gulupa|curuba|mora\b|rubus|frambues|aranadan|vaccinium|fresa|fragaria|uchuva|physalis|tomate.?de.?arbol|tamarillo|lulo|naranjill|durazno|prunus|manzan|malus|pera\b|pyrus|higo|ficus|uva\b|vitis|banano|platano|musa|cacao|theobroma|cafe\b|coffea|cereza|pitahaya|pitaya|coco\b|cocos|chontaduro|bactris|feijoa|borojo|papayuel|vasconcellea|breva)/i, tipo: 'frutal' },
  // Aromáticas / medicinales / hierbas de cocina / florales
  { re: /(romero|rosmarinus|tomillo|thymus|albahac|ocimum|menta|mentha|hierbabuena|yerbabuena|cilantr|coriandrum|perejil|petroselinum|manzanill|matricaria|calendul|calendul|toronjil|melissa|cidron|aloysia|limoncill|cymbopogon|sabila|aloe|ruda\b|ruta\b|organo|oregano|origanum|salvia\b|lavanda|lavandul|hinojo|foeniculum|anis\b|ortiga|urtica|llanten|plantago|consuelda|symphytum|ajenj|artemisia|caléndula|rosa\b|clavel|dianthus|crisantem|heliconi|orquid|vainilla|vanilla|flor\b|ornamental|aromatic|medicinal|hierba|herb\b)/i, tipo: 'aromatica' },
  // Hortalizas / huerta / raíces / granos / legumbres
  { re: /(lechug|lactuca|espinac|spinacia|acelga|repollo|brocoli|brócoli|coliflor|brassica|col\b|kale|tomate|lycopersic|pimenton|aji\b|pepin|cucumis|calabaz|cucurbit|ahuyam|zapall|zucchin|zanahori|daucus|rabano|raphanus|remolach|beta_|papa\b|patata|solanum_tuber|yuca\b|manihot|arracach|batata|ipomoea|name\b|ñame|dioscorea|ulluc|oca\b|oxalis|mashua|tropaeolum_tub|frijol|fríjol|phaseolus|haba\b|vicia|arvej|pisum|garbanz|lentej|quinua|quinoa|chenopodium|amarant|maiz|maíz|zea_|arroz|oryza|avena|cebada|trigo|chia|chía|cebolla|allium|hortaliz|verdur|tuber|grano|legumbr|cereal|abono.?verd|cobertur)/i, tipo: 'hortaliza' },
]);

/** Normaliza un texto a minúsculas sin tildes ni separadores. Tolerante. */
function norm(v) {
  if (typeof v !== 'string') return '';
  return v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Deriva el TIPO de planta de una especie para la escena.
 *
 * Cascada (offline, sin red):
 *   1. Mapa estático por slug exacto (fuente principal, 127 especies).
 *   2. Categoría explícita pasada por el caller (si la trae el proceso/catálogo).
 *   3. Respaldo por substring del slug y del nombre común.
 *   4. Default seguro: 'otro' (silueta neutra de mata) — nunca afirma frutal.
 *
 * @param {string} slug             subject_slug del proceso (id de especie).
 * @param {Object} [opts]
 * @param {string} [opts.nombre]    nombre común (para el respaldo por substring).
 * @param {string} [opts.categoria] categoría del catálogo (si está disponible).
 * @returns {'frutal'|'hortaliza'|'aromatica'|'otro'}
 */
export function tipoDeSubject(slug, { nombre = '', categoria = '' } = {}) {
  const s = norm(slug);

  // 1. Mapa estático por slug exacto.
  if (s && Object.prototype.hasOwnProperty.call(TIPO_POR_SLUG, s)) {
    return /** @type {('frutal'|'hortaliza'|'aromatica'|'otro')} */ (TIPO_POR_SLUG[s]);
  }

  // 2. Categoría explícita del caller (catálogo dinámico v3.1+).
  const cat = norm(categoria);
  if (cat && Object.prototype.hasOwnProperty.call(CATEGORIA_A_TIPO, cat)) {
    return /** @type {('frutal'|'hortaliza'|'aromatica'|'otro')} */ (CATEGORIA_A_TIPO[cat]);
  }

  // 3. Respaldo por substring (slug + nombre).
  const texto = `${s} ${norm(nombre)}`;
  for (const { re, tipo } of FALLBACK_SUBSTR) {
    if (re.test(texto)) return /** @type {('frutal'|'hortaliza'|'aromatica'|'otro')} */ (tipo);
  }

  // 4. Default seguro.
  return 'otro';
}
