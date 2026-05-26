#!/usr/bin/env node

/**
 * Script para agregar ~100 species nuevas al catálogo OSS subset v3.2
 * Task #189: Expandir catálogo species 105 → ~205
 */

import fs from 'fs';
import path from 'path';

const CATALOG_PATH = './catalog/chagra-catalog-oss-subset-v3.2.json';

// Leer catálogo actual
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
console.log(`[INFO] Catálogo actual: ${catalog.species.length} species`);

// Nuevas species a agregar (generadas según schema v3.1 OSS)
const newSpecies = [
  // ===== CULTIVOS COMERCIALES COLOMBIANOS =====
  {
    id: "acca_sellowiana",
    nombre_comun: "Feijoa / Guayabo del país",
    nombre_cientifico: "Acca sellowiana (O.Berg) Burret",
    familia_botanica: "Myrtaceae",
    category: "frutales_perennes",
    thermal_zones: ["frio", "templado"],
    estrato: "medio",
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 1800, optimo_min: 2200, optimo_max: 2800, max_absoluto: 3200 },
    temperatura_c: { helada_letal: -3, optimo_min: 13, optimo_max: 22, max_tolerable: 30 },
    radiacion: "sol_pleno",
    agua: "medio",
    drenaje_requerido: "bueno",
    propagation: { metodo_principal: "semilla", notas: "Se propaga por semilla (plántula) o por estacas semi-leñosas. Reiere polinización cruzada." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "El feijoa (Acca sellowiana) es un arbusto frutal perenne de la familia Myrtaceae, nativo de Sudamérica (sur de Brasil, Uruguay, Paraguay, Argentina), cultivado en Colombia para producción de frutos comestibles de aroma y sabor característicos. Se cultiva en Boyacá, Cundinamarca, Antioquia y Nariño entre 2.200 y 2.800 msnm en zona térmica fría. Los frutos son bayas verdes que maduran a amarillo-pálido, de pulpa gelatinosa aromática, ricos en vitamina C y yodo, se consumen frescos, en jugos, mermeladas y postres. Requiere polinización cruzada (variedades con diferente época de floración) para buena fructificación. En chagra campesina andina, se integra como cerca viva comestible y sombrío para cultivos de hoja. Lección viva: muestra la adaptación de especies exóticas a ecosistemas andinos colombianos, la importancia de la polinización cruzada en frutales, y el potencial de cercas vivas multiuso (producción + protección + biodiversidad). Fuentes: POWO Kew, GBIF Backbone Taxonomy.",
    validation_level: "claude_draft",
    tracking_mode: "individual"
  },
  {
    id: "cyclanthera_pedata",
    nombre_comun: "Pepinoillo / Caigua",
    nombre_cientifico: "Cyclanthera pedata (L.) Schrad.",
    familia_botanica: "Cucurbitaceae",
    category: "hortalizas_fruto_flor",
    thermal_zones: ["frio", "templado"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 1500, optimo_min: 2000, optimo_max: 2800, max_absoluto: 3200 },
    temperatura_c: { helada_letal: -2, optimo_min: 14, optimo_max: 20, max_tolerable: 26 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "semilla", notas: "Siembra directa en sitio definitivo o almácigo con trasplante a los 30 días. Enredadora necesita tutorado." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "El pepinoillo o caigua (Cyclanthera pedata) es una cucurbita trepadora anual nativa de los Andes, cultivada en chagras andinas colombianas por sus frutos verdes huecos que se consumen cocidos (rellenos, en sopas) o crudos en ensaladas. Se cultiva en Nariño, Boyacá y Cundinamarca entre 2.000 y 2.800 msnm. Planta trepadora vigorosa (2-4 m) que requiere tutorado (en caña guadua, estacas), produce frutos alargados verde claro que se cosechan inmaduros (15-20 cm) antes de que se pongan fibrosos. Asociación favorable con maíz (físico) y frijol (nitrogen_fixer). Lección: demuestra el uso vertical del espacio en chagras compactas, la importancia de las cucurbitáceas andinas alternativas al pepino comercial, y el valor de las trepadoras comestibles en optimización de área. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate",
    companions: ["zea_mays", "phaseolus_vulgaris"]
  },
  {
    id: "physalis_angulata",
    nombre_comun: "Uchuva silvestre / Topotopo",
    nombre_cientifico: "Physalis angulata L.",
    familia_botanica: "Solanaceae",
    category: "hortalizas_fruto_flor",
    thermal_zones: ["calido", "templado"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "naturalizada",
    altitud_msnm: { min_absoluto: 0, optimo_min: 800, optimo_max: 1800, max_absoluto: 2200 },
    temperatura_c: { helada_letal: 0, optimo_min: 18, optimo_max: 26, max_tolerable: 35 },
    radiacion: "sol_pleno",
    agua: "medio",
    drenaje_requerido: "bueno",
    propagation: { metodo_principal: "semilla", notas: "Semilla pequeña; siembra en almácigo con trasplante o siembra directa al voleo en sistemas de chagra." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La uchuva silvestre o topotopo (Physalis angulata) es una solanácea herbácea anual nativa de América tropical, que produce frutos pequeños anaranjados dentro del cálculo (lanternilla china) que se consumen frescos. Crece espontánea en chagras, bordes de camino y rastrojos colombianos hasta 1.800 msnm. Es planta pionera que coloniza suelos perturbados, indicadora de suelos en recuperación. En la chagra tradicional, se permite su crecimiento espontáneo como fuente de alimento fresco de fácil acceso (niños, ancianos), y sus frutos se usan en medicina tradicional (diurético, antiinflamatorio). Diferente de la uchuva cultivada (Physalis peruviana), más grande y comercial. Lección: enseña el valor de la espontaneidad en chagra, el papel de las plantas pioneras en sucesión ecológica, y la diferencia entre especies silvestres y domesticadas del mismo género. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate"
  },
  {
    id: "passiflora_maliformis",
    nombre_comun: "Granadilla de fraile / Maracuyá silvestre",
    nombre_cientifico: "Passiflora maliformis L.",
    familia_botanica: "Passifloraceae",
    category: "frutales_perennes",
    thermal_zones: ["calido", "templado"],
    estrato: "alto",
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "naturalizada",
    altitud_msnm: { min_absoluto: 0, optimo_min: 500, optimo_max: 1500, max_absoluto: 2000 },
    temperatura_c: { helada_letal: 2, optimo_min: 22, optimo_max: 28, max_tolerable: 35 },
    radiacion: "sol_pleno",
    agua: "medio",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "semilla", notas: "Siembra en almácigo con trasplante o siembra directa. Trepadora vigorosa requiere tutorado estructurado." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La granadilla de fraile o maracuyá silvestre (Passiflora maliformis) es una pasiflora trepadora perenne nativa de América tropical, que produce frutos amarillo-verdosos comestibles de pulpa ácida aromática. Se cultiva en Colombia como cercana viva productiva o en sistemas agroforestales de ladera en zonas cálidas y templadas del Valle del Cauca, Tolima, Huila y Cundinamarca (0-1.500 msnm). Los frutos son más pequeños que la maracuyá (Passiflora edulis) pero de sabor intenso, se consumen frescos o en jugos. Planta rústica, tolerante sequía, de uso tradicional en cercas vivas multifuncionales (producción + delimitación + control erosión). Lección: muestra la diversidad de pasifloras colombianas (~50 especies nativas), el valor de las especies silvestres emparentadas con cultivos comerciales como reserva genética, y el uso multifuncional de cercas vivas. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "individual"
  },
  {
    id: "passiflora_tarminiana",
    nombre_comun: "Granadilla común / Granadilla de China",
    nombre_cientifico: "Passiflora tarminiana Coppens & V.E.Barney",
    familia_botanica: "Passifloraceae",
    category: "frutales_perennes",
    thermal_zones: ["templado"],
    estrato: "alto",
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 1800, optimo_min: 2200, optimo_max: 2800, max_absoluto: 3200 },
    temperatura_c: { helada_letal: -2, optimo_min: 16, optimo_max: 20, max_tolerable: 24 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "semilla", notas: "Siembra en almácigo con trasplante a los 45 días. Requiere polinización cruzada (abejas grandes del género Xylocopa)." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La granadilla común (Passiflora tarminiana) es una pasiflora trepadora perenne cultivada en Colombia por sus frutos ovoides verde-amarillentos de pulpa ácida aromática, rica en vitamina A y C. Es el cultivo de pasifloras más importante del país después del maracuyá, con énfasis en producción de Huila, Boyacá, Cundinamarca y Antioquia entre 2.200 y 2.800 msnm en zona térmica templada. Planta vigorosa (5-8 m), requiere tutorado y podas de formación, producción de 15-20 kg/planta/año. Requiere polinización por abejorros grandes (Xylocopa), por lo que se recomienda conservar poblaciones de polinizadores nativos. Lección: enseña la importancia de la polinización entomófila en frutales andinos, el manejo de trepadoras perennes en sistemas productivos, y el papel de las pasifloras en seguridad alimentaria campesina. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "individual",
    companions: ["zea_mays"],
    antagonists: ["solanum_tuberosum_sabanera"]
  },
  {
    id: "solanum_melongena",
    nombre_comun: "Berenjena",
    nombre_cientifico: "Solanum melongena L.",
    familia_botanica: "Solanaceae",
    category: "hortalizas_fruto_flor",
    thermal_zones: ["calido", "templado"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 0, optimo_min: 800, optimo_max: 1800, max_absoluto: 2200 },
    temperatura_c: { helada_letal: 2, optimo_min: 20, optimo_max: 28, max_tolerable: 35 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "semilla", notas: "Almácigo 45-60 días antes de trasplante. Sensible a bajas temperaturas (<10°C)." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La berenjena (Solanum melongena) es una solanácea arbustiva anual cultivada por sus frutos berry grandes púrpura-negros de piel brillante, que se consumen cocidos (asados, rellenos, en curries). De origen asiático (India), se cultiva en Colombia en huertos caseros y producción escala pequeña en Cundinamarca, Boyacá y Antioquia entre 800 y 1.800 msnm. Planta de clima cálido a templado, sensible a frío, requiere suelos bien drenados y abono orgánico generoso. Asociación favorable con pimientos y ajo (repelentes), desfavorable con papa (comparten plagas). Lección: muestra la diversificación de hortalizas en chagra colombiana más allá de lo andino tradicional, el manejo de especies sensibles a frío, y el potencial de cultivos globales adaptados a contextos locales. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate",
    companions: ["allium_sativum"],
    antagonists: ["solanum_tuberosum_sabanera", "solanum_phureja"]
  },
  {
    id: "cucumis_sativus",
    nombre_comun: "Pepino cohombro",
    nombre_cientifico: "Cucumis sativus L.",
    familia_botanica: "Cucurbitaceae",
    category: "hortalizas_fruto_flor",
    thermal_zones: ["calido", "templado"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 0, optimo_min: 600, optimo_max: 1600, max_absoluto: 2000 },
    temperatura_c: { helada_letal: 2, optimo_min: 18, optimo_max: 26, max_tolerable: 32 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "semilla", notas: "Siembra directa en sitio definitivo o almácigo con trasplante precoz (15-20 días). Requiere tutorado o suelo cubierto con mulch." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "El pepino o cohombro (Cucumis sativus) es una cucurbita rastrera anual cultivada por sus frutos cilíndricos verdes de piel crujiente, que se consumen frescos (ensaladas) o encurtidos. De origen indio, se cultiva en Colombia en huertos caseros y producción comercial en Cundinamarca, Boyacá, Antioquia y Valle del Cauca entre 600 y 1.600 msnm. Planta de rápido crecimiento (50-70 días a cosecha), requiere alta humedad edáfica y riego constante, sensible a mildiú y oidio en época lluviosa. Asociación favorable con frijol (tutorado mutuo) y maíz (sombra parcial), desfavorable con papas y tomates (comparten enfermedades). Lección: enseña el manejo de cucurbitáceas de ciclo corto en chagra, la importancia del mulching para frutos en contacto con suelo, y la rotación de cultivos para evitar enfermedades de suelo. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate",
    companions: ["phaseolus_vulgaris", "zea_mays"],
    antagonists: ["solanum_lycopersicum_san_marzano", "solanum_tuberosum_sabanera"]
  },
  {
    id: "cucumis_melo",
    nombre_comun: "Melón",
    nombre_cientifico: "Cucumis melo L.",
    familia_botanica: "Cucurbitaceae",
    category: "hortalizas_fruto_flor",
    thermal_zones: ["calido", "templado"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 0, optimo_min: 400, optimo_max: 1400, max_absoluto: 1800 },
    temperatura_c: { helada_letal: 2, optimo_min: 20, optimo_max: 28, max_tolerable: 35 },
    radiacion: "sol_pleno",
    agua: "medio",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "semilla", notas: "Siembra directa en camellones con espacio amplio (2m x 1m). Rastrero, requiere suelo bien drenado y no excesivamente húmedo (pudrición fruto)." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "El melón (Cucumis melo) es una cucurbita rastrera anual cultivada por sus frutos grandes dulces aromáticos, de origen africano/asiático. En Colombia se cultiva comercialmente en la Atlántico, Huila, Tolima y Cundinamarca (400-1.400 msnm), y en huertos caseros escala pequeña. Planta de clima cálido, requiere alta radiación y temperaturas >20°C para dulzura óptima, sensible a exceso humedad (pudrición apical, oidio). Hay variedades de red (reticulado), cantalupo (rayado), honeydew (blanco) y casaba (verde). Lección: muestra la adaptación de cucurbitáceas globales a contextos tropicales, la importancia del clima en calidad poscosecha (dulzura), y el manejo del riego en frutos de alta demanda hídrica. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate"
  },
  {
    id: "citrullus_lanatus",
    nombre_comun: "Patilla / Sandía",
    nombre_cientifico: "Citrullus lanatus (Thunb.) Matsum. & Nakai",
    familia_botanica: "Cucurbitaceae",
    category: "hortalizas_fruto_flor",
    thermal_zones: ["calido"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 0, optimo_min: 200, optimo_max: 1000, max_absoluto: 1400 },
    temperatura_c: { helada_letal: 5, optimo_min: 22, optimo_max: 30, max_tolerable: 40 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "bueno_a_moderado",
    propagation: { metodo_principal: "semilla", notas: "Siembra directa en época de lluvia. Rastrero vigoroso que cubre mucho área (3-5 m por planta)." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La patilla o sandía (Citrullus lanatus) es una cucurbita rastrera anual originaria de África, cultivada por sus frutos gigantes verdes (o rayados) de pulpa roja dulce, refrescante y diurética. En Colombia es cultivo comercial importante en la Atlántico, Magdalena, Tolima y Huila (200-1.000 msnm), y en huertos caseros de clima cálido. Planta de alta demanda hídrica, requiere riego constante en etapa de fructificación, tolera suelos moderadamente drenados. Requiere polinización por abejas (flores unisexuales, flores masculinas y femeninas separadas). Lección: enseña el cultivo de cucurbitáceas de gran tamaño en chagra tropical, la importancia de polinizadores en cucurbitáceas, y el manejo del riego para evitar frutos agrietados por estrés hídrico irregular. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate",
    companions: ["zea_mays"]
  },
  {
    id: "ananas_comosus_md_gold",
    nombre_comun: "Piña MD-2 / Sweet Gold",
    nombre_cientifico: "Ananas comosus (L.) Merr. 'MD-2'",
    familia_botanica: "Bromeliaceae",
    category: "frutales_perennes",
    thermal_zones: ["calido", "templado"],
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "cultivo_comun",
    altitud_msnm: { min_absoluto: 0, optimo_min: 400, optimo_max: 1200, max_absoluto: 1600 },
    temperatura_c: { helada_letal: 2, optimo_min: 22, optimo_max: 28, max_tolerable: 35 },
    radiacion: "sol_pleno",
    agua: "medio",
    drenaje_requerido: "excelente",
    propagation: { metodo_principal: "esqueje", notas: "Hijuelos o corona. Densidad 25.000-35.000 plantas/ha según variedad. Floración inducida con etefón." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La piña MD-2 o Sweet Gold es una variedad híbrida de Ananas comosus desarrollada en Hawai (1990s), de pulpa amarilla muy dulce (14-16°Brix), baja acidez y alto aroma, que reemplazó a la variedad Cayena lisa en exportaciones colombianas. Colombia es uno de los mayores exportadores mundiales de piña, con cultivos comerciales en Urabá, Cundinamarca y Santander (400-1.200 msnm). Variedad de precosecha más larga que Cayena (14-16 meses), pero mejor calidad poscosecha (vida útil 3-4 semanas a 7°C). Requiere suelos ácidos (pH 4.5-5.5) y muy bien drenados, susceptible a fusariosis (Fusarium subglutinans). Lección: muestra la evolución varietal en frutales comerciales, la importancia de la calidad poscosecha en exportaciones, y el manejo fitosanitario en monocultivos escalados. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "aggregate"
  },

  // ===== FRUTALES TROPICALES AMAZÓNICOS =====
  {
    id: "pouteria_caimito",
    nombre_comun: "Abiu / Caimito amarillo",
    nombre_cientifico: "Pouteria caimito (Ruiz & Pav.) Radlk.",
    familia_botanica: "Sapotaceae",
    category: "frutales_perennes",
    thermal_zones: ["calido", "templado"],
    estrato: "alto",
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "naturalizada",
    altitud_msnm: { min_absoluto: 0, optimo_min: 300, optimo_max: 1200, max_absoluto: 1600 },
    temperatura_c: { helada_letal: 3, optimo_min: 22, optimo_max: 28, max_tolerable: 35 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "bueno",
    propagation: { metodo_principal: "semilla", notas: "Semilla recalcitrante (pierde viabilidad rápido). Siembra en sitio definitivo o bolsa con trasplante precoz (<3 meses)." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "El abiu o caimito amarillo (Pouteria caimito) es un árbol frutal perenne de la familia Sapotaceae, nativo de la Amazonía (Perú, Brasil, Colombia), cultivado por sus frutos dulces de pulpa cremosa amarilla, que se consumen frescos. En Colombia se cultiva en Amazonas, Caquetá, Putumayo y Guainía (0-1.200 msnm) como frutal de patio y en sistemas agroforestales amazónicos. Árbol mediano (10-20 m), de copa densa, fructificación 3-4 años desde semilla, producción estacional (noviembre-enero). Los frutos son bayas redondeadas amarillas de 5-10 cm, pulpa translúcida dulce (12-15°Brix), rica en calcio y fósforo. Lección: enseña el uso de frutales amazónicos en sistemas productivos diversificados, la importancia de las especies tardías (3-4 años) en planificación de chagra, y el valor de especies natives con potencial agroindustrial. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "individual"
  },
  {
    id: "myrciaria_dubia",
    nombre_comun: "Camu camu / Cari-cari",
    nombre_cientifico: "Myrciaria dubia (Kunth) McVaugh",
    familia_botanica: "Myrtaceae",
    category: "frutales_perennes",
    thermal_zones: ["calido"],
    estrato: "medio",
    roles_in_guild: ["crop"],
    cultivable: true,
    conservation_status: "nativo_silvestre",
    altitud_msnm: { min_absoluto: 0, optimo_min: 100, optimo_max: 500, max_absoluto: 800 },
    temperatura_c: { helada_letal: 5, optimo_min: 24, optimo_max: 30, max_tolerable: 38 },
    radiacion: "sol_pleno",
    agua: "pantanoso",
    drenaje_requerido: "bajo",
    propagation: { metodo_principal: "semilla", notas: "Semilla recalcitrante, requiere siembra inmediata. Planta amazónica tolerante inundaciones periódicas (várzea)." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "El camu camu (Myrciaria dubia) es un arbusto frutal amazónico de la familia Myrtaceae, nativo de la cuenca amazónica, famoso por sus frutos pequeños rojo-purpúreos con la mayor concentración de vitamina C del planeta (2-3 g/100g pulpa, 30-60 veces más que naranja). En Colombia crece silvestre en varzeas inundables del Amazonas, Putumayo y Caquetá (0-500 msnm), cosechado por poblaciones locales (ribereños) para venta fresca o procesada (pulpa congelada, jugo, cápsulas). Arbusto de 3-8 m, tolerante inundaciones estacionales (hasta 6 meses), producción 8-12 kg/planta/año. Fructificación silvestre (diciembre-abril) con cosecha de canoas. Actualmente en proceso de domesticación para cultivo comercial. Lección: muestra el valor de especies nativas silvestres con alto potencial nutricional, el manejo de cosecha en ecosistemas inundables amazónicos, y la domesticación incipiente de especies promisorias. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "individual"
  },
  {
    id: "myrciaria_cauliflora",
    nombre_comun: "Jabuticaba / Jaboticaba",
    nombre_cientifico: "Myrciaria cauliflora (Mart.) O.Berg",
    familia_botanica: "Myrtaceae",
    category: "frutales_perennes",
    thermal_zones: ["calido", "templado"],
    estrato: "bajo",
    roles_in_guid: ["crop"],
    cultivable: true,
    conservation_status: "naturalizada",
    altitud_msnm: { min_absoluto: 0, optimo_min: 400, optimo_max: 1400, max_absoluto: 1800 },
    temperatura_c: { helada_letal: 2, optimo_min: 20, optimo_max: 26, max_tolerable: 32 },
    radiacion: "sol_pleno",
    agua: "alto",
    drenaje_requerido: "bueno",
    propagation: { metodo_principal: "semilla", notas: "Cauliflora: frutos nacen directemente en tronco y ramas gruesas. Semi-herbácea cuando joven." },
    source_ids: ["powo-kew", "gbif-taxonomic-backbone"],
    valor_pedagogico: "La jabuticaba o jaboticaba (Myrciaria cauliflora) es un árbol frutal brasileño de la familia Myrtaceae, singular por su caulifloria (frutos nacen directamente en tronco y ramas gruesas), produciendo cientos de frutos pequeños redondos negro-purpúreos de pulpa dulce blanca que se consumen frescos o en jaleas. De origen brasilero, se cultiva en Colombia como frutal de patio en Antioquia, Cundinamarca, Valle del Cauca y Santander (400-1.400 msnm). Árbol de lento crecimiento, fructificación 6-8 años desde semilla, producción estacional masiva (diciembre-febrero) que literalmente cubre el tronco. Los frutos son muy perecederos (fermentan en 3-4 días post-cosecha), por lo que se consumen frescos o procesados localmente. Lección: enseña el fenómeno de caulifloria en botánica, la adaptación de especies exóticas a contextos colombianos, y el manejo de especies de frutos extremadamente perecederos en circuitos locales. Fuentes: POWO Kew, GBIF.",
    validation_level: "claude_draft",
    tracking_mode: "individual"
  },
  // Continuará en siguiente parte...
];

// Filtrar IDs que ya existen
const existingIds = new Set(catalog.species.map(s => s.id));
const speciesToAdd = newSpecies.filter(s => !existingIds.has(s.id));

console.log(`[INFO] Species a agregar: ${speciesToAdd.length}`);
console.log(`[INFO] IDs duplicados detectados y excluidos: ${newSpecies.length - speciesToAdd.length}`);

// Agregar nuevas species
catalog.species.push(...speciesToAdd);

// Actualizar metadatos
catalog._subset_meta.species_count = catalog.species.length;
catalog.generated_at = new Date().toISOString();

// Guardar catálogo actualizado
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');

console.log(`[SUCCESS] Catálogo actualizado: ${catalog.species.length} species totales`);
console.log(`[INFO] Archivo: ${CATALOG_PATH}`);

