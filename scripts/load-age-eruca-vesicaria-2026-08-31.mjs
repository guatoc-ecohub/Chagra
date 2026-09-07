#!/usr/bin/env node
/**
 * Emite una carga idempotente y curada para Eruca vesicaria en chagra_kg.
 *
 * Este archivo solo genera SQL. La aplicación al grafo se hace explícitamente
 * por el operador, después de revisar la salida:
 *
 *   node scripts/load-age-eruca-vesicaria-2026-08-31.mjs | \
 *     sudo podman exec -i postgres-farm psql -U farmos -d chagra_kg
 *
 * Las propiedades agronómicas son campos mínimos respaldados por las fuentes
 * públicas declaradas abajo. No se agrega un rendimiento porque no existe una
 * cifra verificada para esta entrada.
 */

const GRAPH = 'chagra_kg';

const cypher = (statement) =>
  `SELECT * FROM cypher('${GRAPH}', $$\n${statement}\n$$) AS (result agtype);`;

const statements = [
  `MERGE (n:Source {id: 'uc-ipm-cole-crops-arugula'})
   SET n += {
     tipo: 'manual_tecnico',
     autores: 'UC Statewide Integrated Pest Management Program',
     titulo: 'Pest Management Guidelines: Cole Crops',
     institucion: 'University of California Agriculture and Natural Resources',
     url: 'https://ipm.ucanr.edu/pdf/pmg/pmgcolecrops.pdf',
     tier: 'A',
     observaciones: 'Incluye rúcula entre los hospederos de roya blanca y describe manejo IPM para crucíferas.'
   }`,
  `MERGE (n:Source {id: 'umn-vegetable-planning-arugula'})
   SET n += {
     tipo: 'manual_tecnico',
     autores: 'University of Minnesota Extension',
     titulo: 'Crop and field planning tools for vegetable farmers',
     institucion: 'University of Minnesota Extension',
     url: 'https://extension.umn.edu/vegetable-growing-guides-farmers/crop-and-field-planning-tools-vegetable-farmers',
     tier: 'A',
     observaciones: 'Clasifica la rúcula como hortaliza de hoja de clima fresco, tolerante a heladas, y ofrece un intervalo de días a madurez para ese contexto de extensión.'
   }`,
  `MERGE (n:Source {id: 'agrosavia-inocuidad-frutas-hortalizas-2019'})
   SET n += {
     tipo: 'manual_tecnico',
     autores: 'AGROSAVIA',
     titulo: 'Cultivando la inocuidad de mis frutas y hortalizas',
     institucion: 'AGROSAVIA',
     doi: '10.21930/agrosavia.nbook.7403084',
     url: 'https://editorial.agrosavia.co/index.php/publicaciones/catalog/book/98',
     tier: 'A',
     observaciones: 'Aborda buenas prácticas, manejo de plagas y enfermedades, producción ecológica, biopreparados y compostaje.'
   }`,
  `MERGE (n:Source {id: 'jbb-rugula-density-2021'})
   SET n += {
     tipo: 'informe_tecnico',
     autores: 'Jardín Botánico de Bogotá José Celestino Mutis',
     titulo: 'Semillas por propagación tradicional y de productividad de 4 especies útiles para la agricultura urbana',
     institucion: 'Jardín Botánico de Bogotá José Celestino Mutis',
     url: 'https://catalogador.jbb.gov.co/app/resource?r=001_bio-em_sc_2021038_2',
     tier: 'A',
     observaciones: 'Recurso experimental que incluye Eruca vesicaria y mediciones de crecimiento y biomasa; no se usa para afirmar un rendimiento general.'
   }`,
  `MERGE (p:Pest {id: 'albugo_candida'})
   SET p += {
     nombre_comun: 'Roya blanca de las crucíferas',
     nombre_cientifico: 'Albugo candida',
     tipo: 'oomiceto',
     fuente: 'UC IPM, Pest Management Guidelines: Cole Crops',
     confianza: 'alta',
     manejo_agroecologico: 'Evitar lotes con antecedentes de roya blanca y reducir la humedad foliar; la fuente indica que las oosporas pueden persistir en suelo y residuos.'
   }`,
  `MERGE (p:Pest {id: 'palomilla_de_las_cruciferas_plutella_xylostella'})
   SET p += {
     nombre_comun: 'Polilla dorso diamante',
     nombre_cientifico: 'Plutella xylostella',
     tipo: 'insecto',
     fuente: 'UC IPM, Integrated Pest Management for Cole Crops and Lettuce',
     manejo_agroecologico: 'Monitorear el cultivo y combinar prácticas culturales y control biológico dentro de un manejo integrado; no asumir una dosis química sin fuente local.'
   }`,
  `MERGE (p:Pest {id: 'afidos_myzus_persicae_aphis_gossypii'})
   SET p += {
     nombre_comun: 'Áfidos de hortalizas',
     nombre_cientifico: 'Myzus persicae y Aphis gossypii',
     tipo: 'insecto',
     fuente: 'UC IPM, Integrated Pest Management for Cole Crops and Lettuce',
     manejo_agroecologico: 'Inspeccionar hojas y brotes, conservar enemigos naturales y decidir controles según monitoreo; la guía trata los áfidos dentro del programa MIP de hortalizas.'
   }`,
  `MERGE (s:Species {id: 'eruca_vesicaria'})
   SET s += {
     nombre_comun: 'Rúcula / Arúgula',
     nombres_comunes: ['rúgula', 'oruga', 'rocket'],
     nombre_cientifico: 'Eruca vesicaria (L.) Cav.',
     categoria: 'hortalizas_hoja',
     familia_botanica: 'Brassicaceae',
     cultivable: true,
     conservation_status: 'naturalizada',
     tracking_mode: 'aggregate',
     altitud_min_msnm: 1910,
     altitud_max_msnm: 2600,
     temp_min: null,
     temp_max: null,
     radiacion: 'sol_pleno',
     requiere_agua: 'medio',
     suelo_textura_drenaje: 'suelo con buen drenaje y humedad uniforme',
     ciclo: 'anual; primera cosecha orientativa de 25-45 días según sistema y variedad',
     rendimiento: null,
     rendimiento_estado: 'SlotPendiente',
     rendimiento_fuente: null,
     nota_entorno: 'POWO registra distribución adventicia en Colombia, Andes, 1910-2600 msnm. Guías de extensión la describen como hortaliza de estación fresca y tolerante a heladas.',
     nota_mip: 'UC IPM documenta roya blanca en rúcula y daño de chinche bagrada en crucíferas; esta entrada conserva únicamente prácticas MIP citadas.',
     nota_biopreparado: 'Bocashi y purín de ortiga se enlazan como apoyos agroecológicos generales del catálogo; no se presentan como control específico validado para Eruca vesicaria.',
     fuente_rendimiento: 'SlotPendiente: no hay cifra de rendimiento específica y transferible documentada para esta entrada.'
   }`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (f:Family {id: 'Brassicaceae'})
   MERGE (s)-[:HAS_FAMILY]->(f)`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (p:PisoTermico {id: 'templado'})
   MERGE (s)-[:GROWS_IN]->(p)`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (p:PisoTermico {id: 'frio'})
   MERGE (s)-[:GROWS_IN]->(p)`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (r:RoleInGuild {id: 'crop'})
   MERGE (s)-[:HAS_ROLE]->(r)`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (src:Source)
   WHERE src.id IN ['powo-kew', 'gbif-taxonomic-backbone', 'bernal-2015-plantas-liquenes-colombia', 'uc-ipm-cole-crops-arugula', 'umn-vegetable-planning-arugula', 'agrosavia-inocuidad-frutas-hortalizas-2019', 'jbb-rugula-density-2021']
   MERGE (s)-[:REFERENCED_BY]->(src)`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (p:Pest)
   WHERE p.id IN ['albugo_candida', 'palomilla_de_las_cruciferas_plutella_xylostella', 'afidos_myzus_persicae_aphis_gossypii']
   MERGE (p)-[:AFFECTS]->(s)`,
  `MATCH (s:Species {id: 'eruca_vesicaria'}), (b:Biopreparado)
   WHERE b.id IN ['bocashi', 'purin_ortiga']
   MERGE (s)-[r:USED_AS_BIOPREPARADO]->(b)
   SET r.base_fuente = 'Catálogo AGROSAVIA/biopreparados; apoyo general, no control específico de rendimiento'`,
  `MATCH (s:Species) WHERE s.id IN ['solanum_lycopersicum', 'solanum_lycopersicum_san_marzano', 'solanum_lycopersicum_cerasiforme']
   SET s.invernadero = true,
       s.invernadero_nota = 'El rango de campo abierto no debe usarse para negar automáticamente el caso de cultivo bajo invernadero a 2200 msnm. Verificar temperatura, ventilación, humedad y sanidad del ambiente protegido; no equivale a ampliar el rango de campo abierto.'`,
];

console.log("LOAD 'age';");
console.log('SET search_path = ag_catalog, "$user", public;');
for (const statement of statements) console.log(cypher(statement));
