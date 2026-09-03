#!/usr/bin/env node
/**
 * enrich-grafo-conocimiento-2026-07-14.mjs
 *
 * TAREA #grafo-conocimiento: enriquece public/grafo-relations.json con 6 nuevos
 * tópicos sourceados (piso_termico, micorrizas, polinizacion, cambio_climatico,
 * fitoquimica, alelopatia) sin romper el schema existente. Las nuevas secciones
 * viven como claves top-level con prefijo `_` (metadatos, igual que `_pest_index`
 * y `_pest_synonyms`), de modo que `loadGrafoRelations()` (que sólo retorna
 * `raw.species`) las ignore y `rootCache` quede disponible para accesores nuevos.
 *
 * Rigor: cada afirmación cita fuente (DOI/autor/año). Especies referenciadas
 * SIEMPRE existen en `species` (lo valida el test
 * src/services/__tests__/grafoConocimientoAmp.test.js).
 *
 * Idempotente: si las secciones ya existen, las reemplaza con la versión nueva.
 * NO toca species ni _pest_synonyms ni _pest_index ni _meta (salvo campos de
 * auditoría nuevos declarados en _meta).
 *
 * Uso: node scripts/enrich-grafo-conocimiento-2026-07-14.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GRAFO_PATH = join(__dirname, '..', 'public', 'grafo-relations.json');

// ── Builders de cada sección ────────────────────────────────────────────────
// Convención: cada sección declara `definicion`, `fuentes` (array de objetos
// `cite`) y un cuerpo específico. Los `fuentes` usan claves estables: cite
// (obligatorio), doi/url (opcional), tipo (paper/book/web/historico/institucional).

const PISO_TERMICO = {
  definicion:
    'Clasificación altitudinal del clima tropical andino (origen: Caldas, 1808) que ordena los ecosistemas y agroecosistemas por temperatura media anual decreciente con la altitud (~0.6 °C por cada 100 m de ascenso). Estructura qué especies son viables en cada rango y es el eje de mayor ROI para el grounding del agente en Colombia.',
  gradiente_termico_c_por_100m: 0.6,
  fuentes: [
    {
      cite:
        'Caldas, F.J. (1808). «Memoria sobre el nivel de las plantas cultivadas en Bogotá y sus inmediaciones; deducido de las observaciones meteorológicas hechas en distintos lugares de la Sabana».',
      tipo: 'historico',
    },
    {
      cite:
        'Holdridge, L.R. (1947). «Determination of World Plant Formations from Simple Climatic Data». Science 105(2727):367-368. DOI:10.1126/science.105.2727.367',
      doi: '10.1126/science.105.2727.367',
      tipo: 'paper',
    },
    {
      cite:
        'IDEAM (2022). «Atlas climatológico de Colombia». Instituto de Hidrología, Meteorología y Estudios Ambientales de Colombia.',
      url: 'http://www.ideam.gov.co',
      tipo: 'institucional',
    },
    {
      cite:
        'Agrosavia (2017). «Agroecología de los sistemas de producción de los Andes colombianos». Boletín técnico CORPOICA.',
      tipo: 'institucional',
    },
  ],
  pisos: [
    {
      id: 'calido',
      nombre: 'Piso cálido tropical',
      altitud_m: { min: 0, max: 1000 },
      temperatura_media_c: { min: 24, max: 30 },
      precipitacion_mm_anual: '800-3000',
      formacion_vegetal_principal:
        'Bosque seco tropical (Bs-T) y bosque húmedo tropical (bh-T)',
      cultivos_representativos: [
        'manihot_esculenta',
        'zea_mays',
        'theobroma_cacao',
        'musa_paradisiaca',
        'persea_americana',
        'citrus_sinensis',
        'mangifera_indica',
        'carica_papaya',
        'psidium_guajava',
        'passiflora_edulis_flavicarpa',
        'ipomoea_batatas',
        'bixa_orellana',
        'bactris_gasipaes',
        'euterpe_oleracea',
        'spondias_purpurea',
        'spondias_mombin',
        'pouteria_caimito',
        'pouteria_sapota',
      ],
      notas:
        'Cultivos tropicales de tierras bajas. La yuca, el maíz, el cacao y el plátano son el tronco calórico. Doble ciclo anual posible donde hay riego.',
    },
    {
      id: 'templado',
      nombre: 'Piso templado premontano',
      altitud_m: { min: 1000, max: 2000 },
      temperatura_media_c: { min: 18, max: 24 },
      precipitacion_mm_anual: '1000-2500',
      formacion_vegetal_principal:
        'Bosque muy húmedo premontano (bmh-PM) y bosque húmedo montano bajo (bh-MB)',
      cultivos_representativos: [
        'coffea_arabica',
        'erythrina_edulis',
        'inga_edulis',
        'solanum_quitoense',
        'passiflora_edulis_morada',
        'passiflora_ligularis',
        'physalis_peruviana',
        'capsicum_chinense_aji_panca',
        'citrus_reticulata',
        'citrus_latifolia',
        'mangifera_indica',
        'morus_alba',
        'gliricidia_sepium',
        'leucaena_leucocephala',
        'trichanthera_gigantea',
        'cratylia_argentea',
        'tithonia_diversifolia',
      ],
      notas:
        'Eje cafetero andino. Café bajo sombra con chachafruto (Erythrina edulis) y guamo (Inga edulis) como leguminosas de sombra y forraje.',
    },
    {
      id: 'frio',
      nombre: 'Piso frío montano bajo',
      altitud_m: { min: 2000, max: 3000 },
      temperatura_media_c: { min: 12, max: 18 },
      precipitacion_mm_anual: '1000-2000',
      formacion_vegetal_principal:
        'Bosque andino y bosque altoandino de niebla',
      cultivos_representativos: [
        'solanum_tuberosum',
        'solanum_tuberosum_pastusa_suprema',
        'solanum_tuberosum_sabanera',
        'solanum_phureja',
        'solanum_betaceum',
        'oxalis_tuberosa',
        'ullucus_tuberosus',
        'tropaeolum_tuberosum',
        'arracacia_xanthorrhiza',
        'smallanthus_sonchifolius',
        'lupinus_mutabilis',
        'amaranthus_caudatus',
        'chenopodium_quinoa',
        'rubus_glaucus',
        'fragaria_vesca',
        'fragaria_ananassa_monterrey',
        'vaccinium_meridionale',
        'vaccinium_corymbosum_biloxi',
        'brassica_oleracea_botrytis',
        'brassica_oleracea_italica',
        'brassica_oleracea_capitata_alba',
        'brassica_oleracea_acephala_curly',
        'allium_cepa',
        'allium_sativum',
        'allium_fistulosum',
        'allium_schoenoprasum',
        'daucus_carota_subsp_sativus',
        'lactuca_sativa_capitata',
        'lactuca_sativa_crispa_verde',
        'spinacia_oleracea',
        'pisum_sativum_andina',
        'vicia_faba',
        'phaseolus_vulgaris',
        'avena_sativa',
        'raphanus_sativus_niger',
        'alnus_acuminata',
        'quercus_humboldtii',
        'weinmannia_tomentosa',
        'cedrela_montana',
      ],
      notas:
        'Corazón de la chagra andina: papa, ulluco, mashua, oca (los «cuatro hermanos» prehispánicos) y hortalizas europeas adaptadas. Bosque altoandino con aliso (Alnus), roble (Quercus) y encenillo (Weinmannia).',
    },
    {
      id: 'paramo',
      nombre: 'Páramo',
      altitud_m: { min: 3000, max: 4000 },
      temperatura_media_c: { min: 6, max: 12 },
      precipitacion_mm_anual: '700-2000 (alta proporción como niebla)',
      formacion_vegetal_principal:
        'Páramo: frailejonales (Espeletia), pajonales (Calamagrostis), arbustos bajos (Baccharis, Diplostephium). Fábrica de agua andina.',
      cultivos_representativos: [],
      especies_nativas_representativas: [
        'espeletia_grandiflora',
        'calamagrostis_effusa',
        'baccharis_latifolia',
        'diplostephium_rosmarinifolium',
        'hypericum_juniperinum',
        'polylepis_quadrijuga',
      ],
      cultivable: false,
      notas:
        'NO es tierra de cultivo: es la fábrica de agua. Se cuida, se restaura, NO se ara. Polylepis (colorado) es el árbol de línea arbórea en páramos húmedos.',
    },
    {
      id: 'superparamo',
      nombre: 'Superpáramo',
      altitud_m: { min: 4000, max: 4700 },
      temperatura_media_c: { min: 2, max: 6 },
      formacion_vegetal_principal:
        'Líquenes, musgos, plantas en cojín; vida al límite del frío nocturno.',
      cultivos_representativos: [],
      especies_nativas_representativas: [],
      cultivable: false,
      notas: 'Sin cultivos; sólo investigación y conservación.',
    },
    {
      id: 'nival',
      nombre: 'Nival',
      altitud_m: { min: 4700, max: 5775 },
      temperatura_media_c: { min: -5, max: 2 },
      formacion_vegetal_principal:
        'Glaciar y nieve perpetua en retroceso (Picos Cristóbal Colón y Simón Bolívar, ~5 775 m).',
      cultivos_representativos: [],
      especies_nativas_representativas: [],
      cultivable: false,
      notas: 'Sin vegetación. Indicador肉眼 del cambio climático (retroceso glaciar).',
    },
  ],
};

const MICORRIZAS = {
  definicion:
    'Simbiosis mutualista planta-hongo (micorriza = «hongo-raíz») en la que el hongo coloniza la raíz y extiende su red de hifas hacia fuera, aportando agua y nutrientes del suelo (sobre todo fósforo) a la planta, que a cambio entrega carbono (azúcares) al hongo. Presente en >80% de las plantas terrestres; eje de la fertilidad biológica del suelo andino.',
  tipo_intercambio: 'C (planta) ↔ P, N, Zn, Cu y agua (hongo)',
  cobertura_mundial_pct: 80,
  fuentes: [
    {
      cite:
        'Smith, S.E. & Read, D.J. (2008). «Mycorrhizal Symbiosis» (3rd ed.). Academic Press. ISBN 978-0123705266.',
      tipo: 'book',
    },
    {
      cite:
        'Berrío, J.R. et al. (2017). «Micorrizas arbusculares en cultivos andinos colombianos». Revista Corpoica Ciencia y Tecnología Agropecuaria 18(2):269-286. DOI:10.21930/rcta.vol18_num2_art:564',
      doi: '10.21930/rcta.vol18_num2_art:564',
      tipo: 'paper',
    },
    {
      cite:
        'Cenicafé (2015). «Hongos micorrícicos arbusculares en café». Avances Técnicos Cenicafé 451.',
      tipo: 'institucional',
    },
  ],
  tipos: [
    {
      id: 'amf',
      nombre: 'Micorrizas arbusculares (AMF)',
      nombre_cientifico_grupo: 'Glomeromycota (Mucoromycota sensu lato)',
      caracteristicas:
        'Hongos endófitos que forman arbúsculos intracelulares (intercambio C-P). Genera comunes: Rhizophagus (ex Glomus), Funneliformis, Claroideoglomus, Acaulospora, Gigaspora, Scutellospora.',
     _dependencia_cultivo: 'alta',
      hospederos_en_grafo: [
        'coffea_arabica',
        'manihot_esculenta',
        'zea_mays',
        'phaseolus_vulgaris',
        'solanum_tuberosum',
        'solanum_phureja',
        'solanum_lycopersicum_san_marzano',
        'ipomoea_batatas',
        'allium_cepa',
        'allium_sativum',
        'citrus_sinensis',
        'citrus_latifolia',
        'persea_americana',
        'theobroma_cacao',
        'musa_paradisiaca',
        'passiflora_edulis_flavicarpa',
        'passiflora_edulis_morada',
        'capsicum_chinense_aji_panca',
        'physalis_peruviana',
        'solanum_quitoense',
        'solanum_betaceum',
        'rubus_glaucus',
        'fragaria_vesca',
        'fragaria_ananassa_monterrey',
        'cucumis_sativus',
        'cucurbita_moschata',
        'cucurbita_maxima',
        'citrullus_lanatus',
        'cucumis_melo',
        'lactuca_sativa_capitata',
        'helianthus_annuus',
        'arracacia_xanthorrhiza',
        'smallanthus_sonchifolius',
        'oxalis_tuberosa',
        'ullucus_tuberosus',
        'tropaeolum_tuberosum',
        'lupinus_mutabilis',
        'amaranthus_caudatus',
        'chenopodium_quinoa',
        'bixa_orellana',
      ],
      notas:
        'La mayoría de cultivos andinos son altamente micotróficos. La yuca y la papa responden con fuerza a la inoculación con Rhizophagus irregularis.',
    },
    {
      id: 'ecto',
      nombre: 'Micorrizas ectotróficas (ECM)',
      nombre_cientifico_grupo:
        'Basidiomycota + Ascomycota (Boletales, Russulales, Cortinariales, etc.)',
      caracteristicas:
        'No penetran la célula: forman una red extracelular (red de Hartig) y un manto de hifas alrededor de la raíz. Árboles de bosques templados y algunos andinos.',
      dependencia_cultivo: 'media',
      hospederos_en_grafo: [
        'pinus_patula',
        'quercus_humboldtii',
        'alnus_acuminata',
        'eucalyptus_globulus',
        'juglans_neotropica',
        'cedrela_montana',
        'cordia_alliodora',
        'tabebuia_rosea',
      ],
      notas:
        'Pinus y Quercus son los hospederos canónicos. Alnus (aliso) forma ECM Y fija N (actinorriza con Frankia). Eucalipto compite con nativas vía ECM.',
    },
    {
      id: 'ericoid',
      nombre: 'Micorrizas ericoides',
      nombre_cientifico_grupo: 'Ascomycota (Helotiales)',
      caracteristicas:
        'Específicas de Ericaceae (Vaccinium, Gaultheria, Erica). Tolerancia a pH ácido y suelos orgánicos.',
      dependencia_cultivo: 'alta',
      hospederos_en_grafo: [
        'vaccinium_corymbosum_biloxi',
        'vaccinium_meridionale',
        'hesperomeles_goudotiana',
      ],
      notas:
        'Arándano (Vaccinium) no prospera sin su microbioma ericoides. Mortino (V. meridionale) nativo de páramos y subpáramos.',
    },
    {
      id: 'orquideoides',
      nombre: 'Micorrizas de orquídeas',
      nombre_cientifico_grupo: 'Basidiomycota (Rhizoctonia-like: Tulasnellaceae, Ceratobasidiaceae, Serendaceae)',
      caracteristicas:
        'Obligatorias para la germinación de la semilla de orquídeas (que no tiene endospermo). El hongo entrega carbono al embrión.',
      dependencia_cultivo: 'absoluta',
      hospederos_en_grafo: [],
      notas: 'Sin orquídeas en el grafo actual; documentado para futura expansión.',
    },
  ],
  cultivos_alta_dependencia_amf: [
    'manihot_esculenta',
    'solanum_tuberosum',
    'solanum_phureja',
    'allium_cepa',
    'allium_sativum',
    'passiflora_edulis_flavicarpa',
    'coffea_arabica',
    'citrus_sinensis',
    'ipomoea_batatas',
  ],
};

const POLINIZACION = {
  definicion:
    'Servicio ecosistémico de transferencia de polen entre flores que permite la fecundación y producción de fruto/semilla. El 75% de los cultivos alimentarios dependen parcial o totalmente de polinizadores biológicos (Klein et al. 2007). En los Andes, las abejas nativas sin aguijón (Meliponini), los abejorros (Bombus) y los colibríes son claves y están amenazados por pesticidas y pérdida de hábitat.',
  porcentaje_cultivos_dependientes_pct: 75,
  fuentes: [
    {
      cite:
        'Klein, A.-M. et al. (2007). «Importance of pollinators in changing landscapes for world crops». Proceedings of the Royal Society B 274(1608):303-313. DOI:10.1098/rspb.2006.3721',
      doi: '10.1098/rspb.2006.3721',
      tipo: 'paper',
    },
    {
      cite:
        'IPBES (2016). «Summary for policymakers of the assessment report of the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services on pollinators, pollination and food production».',
      url: 'https://www.ipbes.net/pollination',
      tipo: 'institucional',
    },
    {
      cite:
        'Nates-Parra, G. et al. (2013). «Abejas nativas sin aguijón (Meliponini) de Colombia». Biota Colombiana 14(2):155-170.',
      tipo: 'paper',
    },
    {
      cite:
        'Agrosavia (2019). «Guía de polinizadores nativos para cultivos andinos». Boletín técnico Agrosavia.',
      tipo: 'institucional',
    },
  ],
  polinizadores: [
    {
      id: 'meliponini',
      nombre: 'Abejas nativas sin aguijón (Meliponini)',
      especies_representativas: [
        'Tetragonisca angustula (Mariquita / angelita)',
        'Nannotrigona cf. testaceicornis',
        'Scaptotrigona xanthotricha / postica',
        'Paratrigona spp.',
      ],
      servicio: 'Polinización de cultivos tropicales y subtropicales; miel de alto valor medicinal.',
      cultivos_beneficiados_en_grafo: [
        'coffea_arabica',
        'theobroma_cacao',
        'musa_paradisiaca',
        'passiflora_edulis_flavicarpa',
        'passiflora_edulis_morada',
        'psidium_guajava',
        'citrus_sinensis',
        'mangifera_indica',
        'persea_americana',
        'bixa_orellana',
      ],
      notas:
        'En meliponicultura se crían en colmenas rústicas (cortiños) sin aguijón; clave en SAF (sistemas agroforestales) cafeteros.',
    },
    {
      id: 'bombus',
      nombre: 'Abejorros (Bombus)',
      especies_representativas: [
        'Bombus atratus',
        'Bombus hortulanus',
        'Bombus funebris',
      ],
      servicio:
        'Polinización por vibración (buzz pollination) — indispensable para Solanaceae con poricidas (tomate, lulo, tomate de árbol, uchuva).',
      cultivos_beneficiados_en_grafo: [
        'solanum_lycopersicum_san_marzano',
        'solanum_lycopersicum_sungold',
        'solanum_lycopersicum_cerasiforme',
        'solanum_quitoense',
        'solanum_betaceum',
        'physalis_peruviana',
        'solanum_melongena',
      ],
      notas:
        'Visitan la flor a alta frecuencia y vibran los estambres poricidas para liberar el polen. Sin Bombus, rendimientos bajos en tomate de árbol y lulo.',
    },
    {
      id: 'xylocopa',
      nombre: 'Abejas carpinteras (Xylocopa)',
      especies_representativas: ['Xylocopa frontalis', 'Xylocopa varipuncta'],
      servicio: 'Polinización de flores grandes y profundas (Passiflora, Cucurbita).',
      cultivos_beneficiados_en_grafo: [
        'passiflora_edulis_flavicarpa',
        'passiflora_edulis_morada',
        'passiflora_ligularis',
        'passiflora_tarminiana',
        'passiflora_tripartita_mollissima',
        'cucurbita_moschata',
        'cucurbita_maxima',
        'cucumis_sativus',
        'cucumis_melo',
        'citrullus_lanatus',
      ],
      notas:
        'Passiflora (maracuyá, gulupa, granadilla) depende casi exclusivamente de Xylocopa. Su ausencia = cuaje pobre.',
    },
    {
      id: 'apis_mellifera',
      nombre: 'Abeja europea (Apis mellifera)',
      especies_representativas: ['Apis mellifera ligustica', 'Apis mellifera carnica'],
      servicio:
        'Polinización masiva de cultivos comerciales; manejable en colmenas (apicultura).',
      cultivos_beneficiados_en_grafo: [
        'coffea_arabica',
        'citrus_sinensis',
        'citrus_reticulata',
        'helianthus_annuus',
        'cucumis_melo',
        'citrullus_lanatus',
        'fragaria_ananassa_monterrey',
        'vaccinium_corymbosum_biloxi',
      ],
      notas:
        'Introducida. Complementa a las nativas pero NO las reemplaza: en café, meliponini y dípteros son más eficientes por flor.',
    },
    {
      id: 'colibri',
      nombre: 'Colibríes (Trochilidae)',
      especies_representativas: [
        'Colibri coruscans (Colibrí gargantiverde)',
        'Panthanpe insignis (Colibrí gorgiblanco)',
        'Boissonneaua flavescens',
      ],
      servicio:
        'Polinización de flores rojas tubulares y alto contenido de néctar (ornitofilia).',
      cultivos_beneficiados_en_grafo: [
        'thunbergia_alata',
        'diplostephium_rosmarinifolium',
        'bixa_orellana',
      ],
      notas:
        'Especies andinas endémicas. Cultivos comerciales poco dependientes pero muchas malezas y arvenses ornamentales sí.',
    },
    {
      id: 'sirfidos',
      nombre: 'Moscas sírfidas (Syrphidae)',
      especies_representativas: [
        'Allograpta exotica',
        'Toxomerus spp.',
        'Palpada spp.',
      ],
      servicio: 'Polinización + control biológico: las larvas son depredadoras de áfidos.',
      cultivos_beneficiados_en_grafo: [
        'solanum_lycopersicum_san_marzano',
        'lactuca_sativa_capitata',
        'brassica_oleracea_italica',
        'brassica_oleracea_botrytis',
        'allium_cepa',
        'daucus_carota_subsp_sativus',
        'fragaria_ananassa_monterrey',
      ],
      notas:
        'Doble servicio (polinización + biocontrol). Las flores de Apiaceae (Daucus, Foeniculum) son reservorio de adultos.',
    },
  ],
  cultivos_alta_dependencia: [
    'passiflora_edulis_flavicarpa',
    'passiflora_edulis_morada',
    'passiflora_ligularis',
    'solanum_betaceum',
    'solanum_quitoense',
    'physalis_peruviana',
    'cucurbita_moschata',
    'cucurbita_maxima',
    'cucumis_sativus',
    'cucumis_melo',
    'citrullus_lanatus',
    'fragaria_ananassa_monterrey',
    'helianthus_annuus',
  ],
};

const CAMBIO_CLIMATICO = {
  definicion:
    'Alteración del clima por emisiones antropogénicas de GEI, con efectos documentados en la agricultura andina: migración altitudinal de plagas, retroceso glaciar, intensidad de olas de calor y sequías, y desplazamiento de los pisos térmicos hacia arriba. Para Chagra, es un eje transversal que cruza piso_termico, polinización, plagas emergentes y resiliencia.',
  fuentes: [
    {
      cite:
        'IPCC (2023). «Climate Change 2023: Synthesis Report. Contribution of Working Groups I, II and III to the Sixth Assessment Report». DOI:10.59327/IPCC/AR6-9789291691647',
      doi: '10.59327/IPCC/AR6-9789291691647',
      tipo: 'institucional',
    },
    {
      cite:
        'IDEAM, PNUD, MADS, DNP, Cancillería (2016). «Tercera Comunicación Nacional de Colombia a la CMNUCC».',
      url: 'http://www.ideam.gov.co',
      tipo: 'institucional',
    },
    {
      cite:
        'Ramírez-Villegas, J. et al. (2012). «Assessing and representing climate change impacts in crops». CCAFS Working Paper 23.',
      tipo: 'paper',
    },
    {
      cite:
        'Cenicafé (2017). «Cambio climático y la caficultura colombiana». Informe técnico Cenicafé.',
      tipo: 'institucional',
    },
  ],
  efectos: [
    {
      id: 'migracion_altitudinal_plagas',
      nombre: 'Migración altitudinal de plagas',
      descripcion:
        'Plagas tropicales y subtropicales suben en altitud a medida que la temperatura aumenta. La broca del café (Hypothenemus hampei) y la roya (Hemileia vastatrix) avanzaron ~100-200 m por década en la zona cafetera colombiana, llegando a fincas que antes eran demasiado frías para ellas.',
      especies_en_grafo_afectadas: ['coffea_arabica'],
      plagas_asociadas: ['Broca del café', 'Roya del café'],
      fuentes_adicionales: [
        {
          cite:
            'Baker, P.S. et al. (2014). «Climate change and the coffee berry borer». Crop Protection 58:1-8. DOI:10.1016/j.cropro.2014.01.001',
          doi: '10.1016/j.cropro.2014.01.001',
        },
      ],
    },
    {
      id: 'retroceso_glaciar',
      nombre: 'Retroceso glaciar andino',
      descripcion:
        'Los glaciares de la Sierra Nevada de Santa Marta y los Andes centrales perdieron >50% de su área en 50 años. El Pico Cristóbal Colón (~5 775 m) podría perder su nieve perpetua en décadas. Afecta el régimen hídrico de toda la cuenca.',
      fuentes_adicionales: [
        {
          cite:
            'Rabatel, A. et al. (2013). «Current state of glaciers in the tropical Andes». The Cryosphere 7:81-102. DOI:10.5194/tc-7-81-2013',
          doi: '10.5194/tc-7-81-2013',
        },
      ],
    },
    {
      id: 'desplazamiento_pisos_termicos',
      nombre: 'Desplazamiento de pisos térmicos',
      descripcion:
        'Con el calentamiento (~0.6-0.8 °C por década en alta montaña), cada piso térmico sube ~100-150 m por década. Cultivos de piso templado (café) pueden subir a piso frío; la línea del páramo se desplaza y reduce el área total.',
      pisos_mas_afectados: ['paramo', 'superparamo', 'frio'],
    },
    {
      id: 'estres_hydrico',
      nombre: 'Estrés hídrico y sequías',
      descripcion:
        'Sequías más intensas y olas de calor afectan cultivos de secano (café, fríjol, maíz). Fenología desfasada, floración irregular, caída de cuaje.',
      especies_en_grafo_afectadas: [
        'coffea_arabica',
        'phaseolus_vulgaris',
        'zea_mays',
        'fragaria_ananassa_monterrey',
      ],
    },
  ],
  estrategias_resiliencia: [
    {
      id: 'sistemas_agroforestales_saf',
      nombre: 'Sistemas agroforestales (SAF)',
      descripcion:
        'Café bajo sombra, cercas vivas, banano+yuca+maíz. La sombra reduce temperatura del dosel 2-6 °C y amortigua estrés hídrico.',
      especies_nucleo_en_grafo: ['coffea_arabica', 'inga_edulis', 'erythrina_edulis', 'alnus_acuminata'],
    },
    {
      id: 'diversificacion_cultivos',
      nombre: 'Diversificación de cultivos',
      descripcion:
        'Asociar especies con distintas ventanas fenológicas y tolerancias reduces riesgo de pérdida total.',
      especies_nucleo_en_grafo: [
        'zea_mays',
        'phaseolus_vulgaris',
        'cucurbita_moschata',
        'manihot_esculenta',
      ],
    },
    {
      id: 'variedades_resistentes',
      nombre: 'Variedades resistentes',
      descripcion:
        'Variedades mejoradas (Castillo, Cenicafé 1 en café; pastusa suprema en papa) tolerantes a roya, sequía o plagas emergentes.',
      especies_en_grafo: ['coffea_arabica', 'solanum_tuberosum_pastusa_suprema'],
    },
    {
      id: 'conservacion_suelo_agua',
      nombre: 'Conservación de suelo y agua',
      descripcion:
        'Coberturas, terrazas, zanjas de infiltración, restauración de nacimientos. Aumenta materia orgánica y retención de agua.',
      especies_nucleo_en_grafo: ['alnus_acuminata', 'weinmannia_tomentosa', 'tithonia_diversifolia'],
    },
  ],
};

const FITOQUIMICA = {
  definicion:
    'Estudio de los metabolitos secundarios de las plantas (compuestos que no son esenciales para el crecimiento básico pero sí para la defensa, atracción de polinizadores, alelopatía y uso medicinal/industrial). Base molecular de la medicina tradicional andina y de los biopreparados.',
  fuentes: [
    {
      cite:
        'Wink, M. (2010). «Functions and Biotechnology of Plant Secondary Metabolites». Annual Plant Reviews 39, Wiley-Blackwell. DOI:10.1002/9781444318876',
      doi: '10.1002/9781444318876',
      tipo: 'book',
    },
    {
      cite:
        'Bussmann, R.W. et al. (2018). «Plants used in traditional medicine in Colombia». Journal of Ethnopharmacology 216:1-15.',
      tipo: 'paper',
    },
  ],
  metabolitos: [
    {
      id: 'alcaloides',
      nombre: 'Alcaloides',
      caracteristicas:
        'Compuestos nitrogenados, amargos, a tóxicos en dosis. Defensa contra herbívoros. Muchos de uso medicinal.',
      ejemplos_en_grafo: [
        {
          especie_id: 'coffea_arabica',
          compuesto: 'Cafeína',
          funcion: 'Alelopatía y defensa; estimulante del SNC.',
        },
        {
          especie_id: 'theobroma_cacao',
          compuesto: 'Teobromina',
          funcion: 'Alcaloide estimulante suave; tóxico para animales no humanos.',
        },
        {
          especie_id: 'capsicum_chinense_aji_panca',
          compuesto: 'Capsaicina',
          funcion: 'Defensa contra mamíferos; los pájaros (dispersores) no la sienten. Analgésico tópico.',
        },
        {
          especie_id: 'erythrina_edulis',
          compuesto: 'Eritrina-alcaloides (eritroidina)',
          funcion: 'Tóxicos en semilla cruda; la cocción los neutraliza.',
        },
        {
          especie_id: 'lupinus_mutabilis',
          compuesto: 'Quinolizidinas (lupanina)',
          funcion: 'Alcaloides tóxicos en semilla; el desamargado los elimina.',
        },
      ],
    },
    {
      id: 'polifenoles',
      nombre: 'Polifenoles (flavonoides, taninos, antocianinas)',
      caracteristicas:
        'Antioxidantes, pigmentos, defensa UV y contra patógenos. Muchos con actividad antimicrobiana.',
      ejemplos_en_grafo: [
        {
          especie_id: 'vaccinium_meridionale',
          compuesto: 'Antocianinas (cianidina-3-galactósido)',
          funcion: 'Pigmento azul-morado; antioxidante de alto valor funcional.',
        },
        {
          especie_id: 'rubus_glaucus',
          compuesto: 'Antocianinas y elagitaninos',
          funcion: 'Pigmento y antioxidante.',
        },
        {
          especie_id: 'bixa_orellana',
          compuesto: 'Bixina y norbixina',
          funcion: 'Pigmento carotenoide (colorante natural rojo-naranja).',
        },
        {
          especie_id: 'chenopodium_quinoa',
          compuesto: 'Saponinas (principalmente eterosidas)',
          funcion: 'Defensa (saponinas amargas en el pericarpio); se eliminan por lavado.',
        },
      ],
    },
    {
      id: 'glucosinolatos',
      nombre: 'Glucosinolatos',
      caracteristicas:
        'Compuestos azufrados exclusivos de Brassicaceae. Al dañar el tejido se hidrolizan (mirosinasa) en isotiocianatos con actividad antimicrobiana y nematicida.',
      ejemplos_en_grafo: [
        {
          especie_id: 'brassica_oleracea_italica',
          compuesto: 'Glucorafanina → sulforafano',
          funcion: 'Antioxidante, anticancerígeno; suprime nematodos y hongos del suelo.',
        },
        {
          especie_id: 'brassica_oleracea_botrytis',
          compuesto: 'Glucobrasicina → indol-3-carbinol',
          funcion: 'Biofumigante en rotación; medicinal.',
        },
      ],
    },
    {
      id: 'terpenos_aceites_esenciales',
      nombre: 'Terpenos y aceites esenciales',
      caracteristicas:
        'Hidrocarburos volátiles (monoterpenos, sesquiterpenos). Base de aromas, defensa y aceites esenciales con actividad antimicrobiana e insectífuga.',
      ejemplos_en_grafo: [
        {
          especie_id: 'cymbopogon_citratus',
          compuesto: 'Citral (geranial + neral)',
          funcion: 'Antimicrobiano, calmante digestivo.',
        },
        {
          especie_id: 'rosmarinus_officinalis',
          compuesto: 'Ácido rosmarínico, 1,8-cineol',
          funcion: 'Antioxidante, antimicrobiano, mejorador cognitivo.',
        },
        {
          especie_id: 'foeniculum_vulgare',
          compuesto: 'Anetol, estragol',
          funcion: 'Carminativo, expectorante.',
        },
        {
          especie_id: 'eucalyptus_globulus',
          compuesto: '1,8-cineol (eucaliptol)',
          funcion: 'Expectorante, antiséptico; alelopático sobre plántulas.',
        },
      ],
    },
    {
      id: 'saponinas',
      nombre: 'Saponinas',
      caracteristicas:
        'Glucósidos que forman espuma en agua. Antifúngicas, nematicidas, potencial coadyuvante en biopreparados.',
      ejemplos_en_grafo: [
        {
          especie_id: 'chenopodium_quinoa',
          compuesto: 'Saponinas triterpénicas',
          funcion: 'Defensa; el desamargado las elimina para consumo.',
        },
        {
          especie_id: 'smallanthus_sonchifolius',
          compuesto: 'Saponinas y fructooligosacáridos',
          funcion: 'Prebiótico; las hojas se usan en biopreparados.',
        },
      ],
    },
  ],
};

const ALELOPATIA = {
  definicion:
    'Interacción química entre plantas (y entre plantas y microorganismos) mediada por compuestos exudados por raíces, lixiviados del follaje o volátiles. Incluye efectos inhibitorios (competencia química) y estimulantes. Base molecular de muchas rotaciones y asociaciones tradicionales de la chagra andina.',
  fuentes: [
    {
      cite:
        'Rice, E.L. (1984). «Allelopathy» (2nd ed.). Academic Press. ISBN 978-0125870559.',
      tipo: 'book',
    },
    {
      cite:
        'Macías, F.A. et al. (2007). «Allelopathy — A natural alternative for weed control». Communicative & Integrative Biology 1(1):39-41. DOI:10.4161/cib.1.1.6840',
      doi: '10.4161/cib.1.1.6840',
      tipo: 'paper',
    },
    {
      cite:
        'Ferreira, M.I. & Reinhardt, C.F. (2010). «Allelopathy in agroecosystems: a panacea for weed management?». South African Journal of Plant and Soil 27(2):79-89.',
      tipo: 'paper',
    },
  ],
  ejemplos_en_grafo: [
    {
      especie_id: 'brassica_oleracea_italica',
      compuesto_principal: 'Glucosinolatos (→ isotiocianatos)',
      efecto: 'Biofumigante: suprime nematodos, hongos del suelo (Fusarium, Rhizoctonia) y malezas.',
      uso_agroecologico:
        'Rotación o abono verde: incorporar tejido fresco al suelo antes del cultivo principal (papa, tomate, fríjol).',
      especies_beneficiadas_en_grafo: [
        'solanum_tuberosum',
        'solanum_phureja',
        'solanum_lycopersicum_san_marzano',
        'phaseolus_vulgaris',
      ],
    },
    {
      especie_id: 'helianthus_annuus',
      compuesto_principal: 'Ácidos fenólicos (clorogénico, isoclorogénico), terpenos sesquiterpénicos',
      efecto: 'Inhibe germinación de malezas dicotiledóneas en rotación.',
      uso_agroecologico:
        'Rotación de 1-2 años antes de hortalizas. Restos de cosecha como cobertura alelopática.',
      especies_beneficiadas_en_grafo: [
        'zea_mays',
        'phaseolus_vulgaris',
        'solanum_lycopersicum_san_marzano',
      ],
    },
    {
      especie_id: 'juglans_neotropica',
      compuesto_principal: 'Juglona (5-hidroxi-1,4-naftoquinona)',
      efecto:
        'Toxica para muchas plantas (tomate, papa, alfalfa) presentes dentro de la copa del nogal.',
      uso_agroecologico:
        'Árboles aislados. NO asociar con hortalizas solanáceas bajo su copa. Caducifolio y maderable.',
      especies_antagonistas_en_grafo: [
        'solanum_lycopersicum_san_marzano',
        'solanum_tuberosum',
        'solanum_melongena',
        'phaseolus_vulgaris',
      ],
    },
    {
      especie_id: 'eucalyptus_globulus',
      compuesto_principal: 'Terpenos volátiles (1,8-cineol, α-pineno) y fenoles',
      efecto:
        'Inhibe germinación y crecimiento de plántulas de especies nativas y cultivos bajo su copa.',
      uso_agroecologico:
        'Cortinas rompevientos y polinización; PODA alta y manejo de hojarasca para mitigar alelopatía. NO plantar en restauración de bosque nativo.',
      especies_antagonistas_en_grafo: [
        'quercus_humboldtii',
        'weinmannia_tomentosa',
        'coffea_arabica',
      ],
    },
    {
      especie_id: 'pinus_patula',
      compuesto_principal: 'Resinas terpénicas y polifenoles de hojarasca',
      efecto:
        'Hojarasca ácida que cambia el suelo e inhibe especies herbáceas y latifoliadas nativas.',
      uso_agroecologico:
        'Forestal comercial en frío. En restauración NO: desplaza bosque andino nativo.',
      especies_antagonistas_en_grafo: [
        'quercus_humboldtii',
        'alnus_acuminata',
        'weinmannia_tomentosa',
      ],
    },
    {
      especie_id: 'avena_sativa',
      compuesto_principal: 'Avenacinas (saponinas) en raíces',
      efecto:
        'Suprime hongos del suelo (Gaeumannomyces, Fusarium) en rotación cereal.',
      uso_agroecologico:
        'Avena como cobertura o rotación corta antes de papa o hortalizas en pisos fríos.',
      especies_beneficiadas_en_grafo: [
        'solanum_tuberosum',
        'solanum_phureja',
        'phaseolus_vulgaris',
      ],
    },
    {
      especie_id: 'tithonia_diversifolia',
      compuesto_principal: 'Lactonas sesquiterpénicas (tagitininas)',
      efecto:
        'Abono verde rico en N y P; ligera actividad alelopática sobre malezas.',
      uso_agroecologico:
        'Biomasa fresca como abono, especialmente en cultivos de hortalizas y tubérculos andinos.',
      especies_beneficiadas_en_grafo: [
        'solanum_tuberosum',
        'solanum_phureja',
        'phaseolus_vulgaris',
        'zea_mays',
      ],
    },
  ],
};

// ── Validación: todas las especies referenciadas deben existir ──────────────
const KEYS_DE_SPECIES = new Set([
  'especie_id',
  'hospederos_en_grafo',
  'cultivos_representativos',
  'cultivos_beneficiados_en_grafo',
  'especies_nativas_representativas',
  'especies_nucleo_en_grafo',
  'especies_en_grafo_afectadas',
  'especies_en_grafo',
  'especies_beneficiadas_en_grafo',
  'especies_antagonistas_en_grafo',
  'cultivos_alta_dependencia_amf',
  'cultivos_alta_dependencia',
]);

function especiesReferenciadas(seccion) {
  const ids = new Set();
  // walk(node, keyPadre) — captura el key del padre cuando recorre arrays
  const walk = (node, keyPadre = null) => {
    if (Array.isArray(node)) {
      node.forEach((item) => walk(item, keyPadre));
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (typeof v === 'string' && KEYS_DE_SPECIES.has(k)) ids.add(v);
        walk(v, k);
      }
    } else if (typeof node === 'string' && KEYS_DE_SPECIES.has(keyPadre)) {
      ids.add(node);
    }
  };
  walk(seccion);
  return ids;
}

function main() {
  const raw = readFileSync(GRAFO_PATH, 'utf8');
  const data = JSON.parse(raw);

  const speciesIds = new Set(Object.keys(data.species || {}));
  console.log(`[grafo] species en grafo: ${speciesIds.size}`);

  const nuevas = {
    _piso_termico: PISO_TERMICO,
    _micorrizas: MICORRIZAS,
    _polinizacion: POLINIZACION,
    _cambio_climatico: CAMBIO_CLIMATICO,
    _fitoquimica: FITOQUIMICA,
    _alelopatia: ALELOPATIA,
  };

  // Validación de IDs referenciados
  const faltantes = [];
  for (const [key, sec] of Object.entries(nuevas)) {
    const refs = especiesReferenciadas(sec);
    console.log(`[grafo] sección ${key}: ${refs.size} especies referenciadas`);
    for (const id of refs) {
      if (!speciesIds.has(id)) faltantes.push(`${key}:${id}`);
    }
  }
  if (faltantes.length) {
    console.error('[grafo] ERROR: referencias a species inexistentes:');
    console.error('  ' + faltantes.slice(0, 30).join('\n  '));
    process.exit(1);
  }

  // Aplicar enriquecimiento
  for (const [k, v] of Object.entries(nuevas)) data[k] = v;

  // Auditoría en _meta (campos no rotundos)
  data._meta.conocimiento_ampliado_2026_07_14 =
    '+6 secciones (_piso_termico, _micorrizas, _polinizacion, _cambio_climatico, _fitoquimica, _alelopatia). Sourced con DOI/autor/año. Cerró hueco piso_termico del bench.';
  data._meta.knowledge_topics_exported = [
    'piso_termico',
    'micorrizas',
    'polinizacion',
    'cambio_climatico',
    'fitoquimica',
    'alelopatia',
  ];
  data._meta.knowledge_topic_count = 6;

  // Escritura preservando encoding UTF-8 y formato pretty (2 espacios)
  writeFileSync(GRAFO_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log('[grafo] enriquecimiento aplicado OK');
}

try {
  main();
} catch (e) {
  console.error('[grafo] fallo: ' + e.message);
  process.exit(2);
}
