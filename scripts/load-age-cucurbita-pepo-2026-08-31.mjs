#!/usr/bin/env node
/**
 * Emite una carga idempotente y curada para Cucurbita pepo en chagra_kg.
 *
 * Este archivo solo genera SQL. La aplicación al grafo se hace explícitamente
 * después de revisar la salida:
 *
 *   node scripts/load-age-cucurbita-pepo-2026-08-31.mjs | \
 *     sudo podman exec -i postgres-farm psql -U farmos -d chagra_kg
 *
 * El rendimiento queda intencionalmente ausente: SlotPendiente. Las relaciones
 * de biopreparado son apoyos generales del catálogo y no controles específicos.
 */

const GRAPH = 'chagra_kg';

const cypher = (statement) =>
  `SELECT * FROM cypher('${GRAPH}', $$\n${statement}\n$$) AS (result agtype);`;

const statements = [
  `MERGE (n:Source {id: 'agrosavia-modelo-calabacin-2019'})
   SET n += {
     tipo: 'manual_tecnico',
     autores: 'Jorge Jaramillo Noreña et al.',
     año: 2019,
     titulo: 'Modelo productivo de calabacín (Cucurbita pepo) para los departamentos de Cundinamarca y Antioquia',
     institucion: 'Corporación Colombiana de Investigación Agropecuaria (AGROSAVIA)',
     doi: '10.21930/agrosavia.model.7402759',
     url: 'https://editorial.agrosavia.co/index.php/publicaciones/catalog/book/29',
     tier: 'A',
     observaciones: 'Modelo productivo colombiano que describe C. pepo, zonas productoras entre 1.800 y 2.600 msnm y manejo integrado de plagas y enfermedades; sus cifras de investigación no se importan como rendimiento general.'
   }`,
  `MERGE (n:Source {id: 'uc-ipm-cucurbits'})
   SET n += {
     tipo: 'manual_tecnico',
     autores: 'UC Statewide Integrated Pest Management Program',
     año: 2016,
     titulo: 'Pest Management Guidelines: Cucurbits',
     institucion: 'University of California Agriculture and Natural Resources',
     url: 'https://ipm.ucanr.edu/pdf/pmg/pmgcucurbits.pdf',
     tier: 'A',
     observaciones: 'Guía MIP para cucurbitáceas que documenta mildeo polvoso, mildeo velloso y pudrición de fruto y corona por Phytophthora, con monitoreo, saneamiento, rotación y manejo del agua.'
   }`,
  `MERGE (p:Pest {id: 'diaphania_spp'})
   SET p += {
     nombre_comun: 'Gusano perforador de cucurbitáceas',
     nombre_cientifico: 'Diaphania spp.',
     tipo: 'insecto',
     fuente: 'AGROSAVIA, Modelo productivo de calabacín',
     confianza: 'alta',
     manejo_agroecologico: 'Monitorear brotes, flores y frutos; retirar material afectado y sostener saneamiento y rotación. No asumir dosis ni control específico sin diagnóstico y etiqueta ICA.'
   }`,
  `MERGE (p:Pest {id: 'podosphaera_xanthii'})
   SET p += {
     nombre_comun: 'Mildeo polvoso de las cucurbitáceas',
     nombre_cientifico: 'Podosphaera xanthii',
     tipo: 'hongo',
     fuente: 'UC IPM, Pest Management Guidelines: Cucurbits',
     confianza: 'alta',
     manejo_agroecologico: 'Monitorear desde el desarrollo vegetativo hasta el fruto; priorizar variedades resistentes, saneamiento y control de arvenses. Si se requiere tratamiento, usar únicamente un producto registrado y su etiqueta.'
   }`,
  `MERGE (p:Pest {id: 'pseudoperonospora_cubensis'})
   SET p += {
     nombre_comun: 'Mildeo velloso de las cucurbitáceas',
     nombre_cientifico: 'Pseudoperonospora cubensis',
     tipo: 'oomiceto',
     fuente: 'UC IPM, Pest Management Guidelines: Cucurbits',
     confianza: 'alta',
     manejo_agroecologico: 'Monitorear durante el desarrollo vegetativo y la formación de frutos; evitar riego por aspersión y manejar la humedad foliar. Rotar materiales de control solo con respaldo de etiqueta local.'
   }`,
  `MERGE (p:Pest {id: 'phytophthora_capsici'})
   SET p += {
     nombre_comun: 'Pudrición de fruto y corona por Phytophthora',
     nombre_cientifico: 'Phytophthora capsici',
     tipo: 'oomiceto',
     fuente: 'UC IPM, Pest Management Guidelines: Cucurbits',
     confianza: 'alta',
     manejo_agroecologico: 'Mejorar el drenaje, evitar humedad excesiva y espaciar los riegos cuando el suelo permanezca mojado. La identificación debe confirmar síntomas antes de recomendar un tratamiento.'
   }`,
  `MERGE (s:Species {id: 'cucurbita_pepo'})
   SET s += {
     nombre_comun: 'Calabacín / Zucchini',
     nombres_comunes: ['calabacín', 'zucchini', 'calabacita'],
     nombre_cientifico: 'Cucurbita pepo L.',
     categoria: 'hortalizas_fruto_flor',
     category: 'hortalizas_fruto_flor',
     familia_botanica: 'Cucurbitaceae',
     cultivable: true,
     conservation_status: 'cultivo_comun',
     tracking_mode: 'aggregate',
     altitud_min_msnm: 1800,
     altitud_max_msnm: 2600,
     temp_min: null,
     temp_max: null,
     radiacion: 'sol_pleno',
     requiere_agua: 'medio',
     suelo_textura_drenaje: 'suelo con buen drenaje y humedad manejada',
     ciclo: 'anual; el fruto se cosecha tierno antes de la maduración completa',
     rendimiento: null,
     rendimiento_estado: 'SlotPendiente',
     rendimiento_fuente: null,
     nota_entorno: 'AGROSAVIA documenta zonas productoras de Cundinamarca y Antioquia entre 1.800 y 2.600 msnm; ese rango describe el entorno productivo documentado, no un límite fisiológico universal.',
     nota_mip: 'El MIP parte de observación, saneamiento, buen drenaje y manejo de humedad foliar. AGROSAVIA y UC IPM documentan problemas de Diaphania, mildeos y Phytophthora en este cultivo o grupo de cucurbitáceas.',
     nota_biopreparado: 'Bocashi y purín de ortiga se enlazan como apoyos agroecológicos generales del catálogo; no se presentan como controles específicos validados para Cucurbita pepo.',
     fuente_rendimiento: 'SlotPendiente: no importar como rendimiento general la cifra de una condición experimental o de una variedad particular.'
   }`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (f:Family {id: 'Cucurbitaceae'})
   MERGE (s)-[:HAS_FAMILY]->(f)`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (p:PisoTermico {id: 'templado'})
   MERGE (s)-[:GROWS_IN]->(p)`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (p:PisoTermico {id: 'frio'})
   MERGE (s)-[:GROWS_IN]->(p)`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (r:RoleInGuild {id: 'crop'})
   MERGE (s)-[:HAS_ROLE]->(r)`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (src:Source)
   WHERE src.id IN ['powo-kew', 'gbif-taxonomic-backbone', 'agrosavia-modelo-calabacin-2019', 'uc-ipm-cucurbits', 'agrosavia-manual-biopreparados-2015', 'agrosavia-inocuidad-frutas-hortalizas-2019']
   MERGE (s)-[:REFERENCED_BY]->(src)`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (p:Pest)
   WHERE p.id IN ['diaphania_spp', 'podosphaera_xanthii', 'pseudoperonospora_cubensis', 'phytophthora_capsici']
   MERGE (p)-[:AFFECTS]->(s)`,
  `MATCH (s:Species {id: 'cucurbita_pepo'}), (b:Biopreparado)
   WHERE b.id IN ['bocashi', 'purin_ortiga']
   MERGE (s)-[r:USED_AS_BIOPREPARADO]->(b)
   SET r.base_fuente = 'Catálogo AGROSAVIA/biopreparados; apoyo general, no control específico validado para Cucurbita pepo'`,
];

console.log("LOAD 'age';");
console.log('SET search_path = ag_catalog, "$user", public;');
for (const statement of statements) console.log(cypher(statement));
