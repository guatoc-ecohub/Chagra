#!/usr/bin/env node
/**
 * scripts/clasificar-arquetipos-flora.mjs
 *
 * Clasifica las especies del catálogo en 12 arquetipos morfológicos de flora
 * para generación procedural 3D en Chagra.
 *
 * Arquetipos implementados:
 *   1. arbol-dosel-copa-ancha - Árboles de dosel con copa ancha y extendida
 *   2. arbol-emergente - Árboles emergentes que sobresalen del dosel
 *   3. palma - Palmas y palmeras (Arecaceae)
 *   4. arbusto-denso - Arbustos densos de múltiples tallos
 *   5. roseta-columnar-tipo-frailejon - Rosetáceas columnares (frailejones, Espeletia)
 *   6. herbacea-erecta - Herbáceas erectas no leñosas
 *   7. graminea-macolla - Gramíneas formando macollas
 *   8. trepadora-liana - Enredaderas leñosas y herbáceas
 *   9. epifita - Epífitas (orquídeas, bromelias, helechos)
 *   10. suculenta-cactacea - Cactáceas y suculentas
 *   11. helecho-arboreo - Helechos arbóreos
 *   12. rastrera-tapizante - Plantas rastreras formando tapiz
 *
 * Uso:
 *   node scripts/clasificar-arquetipos-flora.mjs              # Clasifica v3.1 (OSS)
 *   node scripts/clasificar-arquetipos-flora.mjs --full       # Clasifica v3.2 (full)
 *   node scripts/clasificar-arquetipos-flora.mjs --dry-run     # Solo reporta sin escribir
 *
 * Reglas:
 *   - Especies vetadas: eucalyptus, pino patula, retamo espinoso, acacia invasora
 *   - Flora verde-dominante (colores variados verdes mayoritarios)
 *   - Confianza baja si faltan datos morfológicos
 *   - NO inventa datos: especies sin información se dejan para revisión
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// =============================================================================
// Definición de arquetipos morfológicos
// =============================================================================

/**
 * Definición de los 12 arquetipos morfológicos de flora
 */
const ARQUETIPOS_MORFOLOGICOS = [
  {
    id: 'arbol-dosel-copa-ancha',
    nombre: 'Árbol de dosel con copa ancha',
    descripcion: 'Árboles de dosel superior con copa extendida y ramificación horizontal',
    altura_tipica: { min: 10, max: 40, unidad: 'm' },
    estratos: ['alto', 'emergente'],
    familias_botanicas_clave: [
      'Fabaceae', 'Lecythidaceae', 'Moraceae', 'Malvaceae', 'Bignoniaceae',
      'Meliaceae', 'Boraginaceae', 'Ulmaceae', 'Sapotaceae'
    ],
    categories_clave: ['arboles_sombra', 'frutales_perennes'],
    color_dominante: { h: 120, s: 60, l: 40 }, // Verde medio
  },
  {
    id: 'arbol-emergente',
    nombre: 'Árbol emergente',
    descripcion: 'Árboles que emergen sobre el dosel superior, superando los 40m',
    altura_tipica: { min: 40, max: 70, unidad: 'm' },
    estratos: ['emergente'],
    familias_botanicas_clave: [
      'Dipterocarpaceae', 'Lecythidaceae', 'Apocynaceae'
    ],
    categories_clave: ['arboles_sombra'],
    color_dominante: { h: 130, s: 50, l: 35 }, // Verde oscuro
  },
  {
    id: 'palma',
    nombre: 'Palma',
    descripcion: 'Palmeras y especies de la familia Arecaceae con estípite único y corona de hojas pinnadas o palmadas',
    altura_tipica: { min: 5, max: 30, unidad: 'm' },
    estratos: ['alto', 'medio'],
    familias_botanicas_clave: ['Arecaceae', 'Cyclanthaceae'],
    categories_clave: ['frutales_perennes', 'fibras_no_maderables'],
    color_dominante: { h: 100, s: 70, l: 45 }, // Verde brillante
  },
  {
    id: 'arbusto-denso',
    nombre: 'Arbusto denso',
    descripcion: 'Arbustos multicaules con ramificación densa, generally 1-5m de altura',
    altura_tipica: { min: 1, max: 5, unidad: 'm' },
    estratos: ['medio', 'bajo'],
    familias_botanicas_clave: [
      'Rubiaceae', 'Asteraceae', 'Lamiaceae', 'Verbenaceae', 'Solanceae',
      'Myrtaceae', 'Ericaceae'
    ],
    categories_clave: ['medicinales_alelopaticas', 'cercas_vivas'],
    color_dominante: { h: 115, s: 55, l: 38 }, // Verde medio-oscuro
  },
  {
    id: 'roseta-columnar-tipo-frailejon',
    nombre: 'Roseta columnar (tipo frailejón)',
    descripcion: 'Plantas rosetáceas columnares de páramo, con hojas en roseta apical y tallo leñoso erecto',
    altura_tipica: { min: 1, max: 4, unidad: 'm' },
    estratos: ['medio'],
    familias_botanicas_clave: ['Asteraceae'],
    categories_clave: ['ornamentales_nativas'],
    generos_clave: ['Espeletia', 'Espeletiopsis', 'Coespeletia'],
    color_dominante: { h: 90, s: 40, l: 50 }, // Verde plateado
  },
  {
    id: 'herbacea-erecta',
    nombre: 'Herbácea erecta',
    descripcion: 'Plantas herbáceas no leñosas con tallo erecto, generalmente anuales o perennes de corta duración',
    altura_tipica: { min: 0.3, max: 2, unidad: 'm' },
    estratos: ['bajo', 'rastrero'],
    familias_botanicas_clave: [
      'Amaranthaceae', 'Apiaceae', 'Brassicaceae', 'Chenopodiaceae',
      'Plantaginaceae', 'Urticaceae', 'Basellaceae', 'Oxalidaceae'
    ],
    categories_clave: [
      'hortalizas_hoja', 'hortalizas_fruto_flor', 'cereales',
      'granos_legumbres', 'medicinales_alelopaticas'
    ],
    color_dominante: { h: 110, s: 65, l: 42 }, // Verde vivo
  },
  {
    id: 'graminea-macolla',
    nombre: 'Gramínea en macolla',
    descripcion: 'Gramíneas que crecen en macollas densas, formando matas con múltiples tallos',
    altura_tipica: { min: 0.2, max: 1.5, unidad: 'm' },
    estratos: ['bajo'],
    familias_botanicas_clave: ['Poaceae'],
    categories_clave: ['cereales', 'abonos_verdes_coberturas'],
    color_dominante: { h: 100, s: 50, l: 48 }, // Verde gramínea
  },
  {
    id: 'trepadora-liana',
    nombre: 'Trepadora/liana',
    descripcion: 'Enredaderas leñosas (lianas) o herbáceas que trepan sobre otros vegetales',
    altura_tipica: { min: 2, max: 30, unidad: 'm' },
    estratos: ['alto', 'medio'],
    familias_botanicas_clave: [
      'Convolvulaceae', 'Cucurbitaceae', 'Fabaceae', 'Vitaceae',
      'Passifloraceae', 'Bignoniaceae', 'Orchidaceae'
    ],
    categories_clave: ['medicinales_alelopaticas', 'frutales_perennes'],
    generos_clave: ['Ipomoea', 'Passiflora', 'Vitis', 'Vanilla'],
    color_dominante: { h: 125, s: 58, l: 36 }, // verde enredadera
  },
  {
    id: 'epifita',
    nombre: 'Epífita',
    descripcion: 'Plantas que crecen sobre otras plantas sin parasitarlas, típicas de bosques húmedos',
    altura_tipica: { min: 0.1, max: 1, unidad: 'm' },
    estratos: ['medio', 'alto'],
    familias_botanicas_clave: ['Orchidaceae', 'Bromeliaceae', 'Piperaceae', 'Cactaceae'],
    categories_clave: ['ornamentales_nativas', 'medicinales_alelopaticas'],
    color_dominante: { h: 105, s: 62, l: 40 }, // Verde epífita
  },
  {
    id: 'suculenta-cactacea',
    nombre: 'Suculenta cactácea',
    descripcion: 'Cactáceas y suculentas con tallos carnosos adaptados a ambientes secos',
    altura_tipica: { min: 0.2, max: 8, unidad: 'm' },
    estratos: ['bajo', 'medio'],
    familias_botanicas_clave: ['Cactaceae', 'Asphodelaceae', 'Crassulaceae', 'Euphorbiaceae'],
    categories_clave: ['ornamentales_nativas', 'frutales_perennes', 'medicinales_alelopaticas'],
    generos_clave: ['Opuntia', 'Selenicereus', 'Hylocereus', 'Aloe', 'Euphorbia'],
    color_dominante: { h: 120, s: 45, l: 32 }, // Verde azulado
  },
  {
    id: 'helecho-arboreo',
    nombre: 'Helecho arbóreo',
    descripcion: 'Helechos arborescentes con pseudo-tronco leñoso y frondes grandes',
    altura_tipica: { min: 2, max: 15, unidad: 'm' },
    estratos: ['medio', 'alto'],
    familias_botanicas_clave: ['Cyatheaceae', 'Dicksoniaceae', 'Dennstaedtiaceae'],
    categories_clave: ['ornamentales_nativas'],
    generos_clave: ['Cyathea', 'Dicksonia', 'Pteridium'],
    color_dominante: { h: 130, s: 48, l: 30 }, // Verde muy oscuro
  },
  {
    id: 'rastrera-tapizante',
    nombre: 'Rastrera tapizante',
    descripcion: 'Plantas rastreras que forman tapices sobre el suelo, estoloníferas o postradas',
    altura_tipica: { min: 0.05, max: 0.5, unidad: 'm' },
    estratos: ['rastrero', 'bajo'],
    familias_botanicas_clave: [
      'Fabaceae', 'Poaceae', 'Caryophyllaceae', 'Plantaginaceae',
      'Rosaceae', 'Dioscoreaceae', 'Basellaceae', 'Oxalidaceae'
    ],
    categories_clave: [
      'abonos_verdes_coberturas', 'medicinales_alelopaticas',
      'tuberculos_raices', 'frutales_perennes'
    ],
    color_dominante: { h: 108, s: 52, l: 44 }, // verde tapiz
  },
];

// =============================================================================
// Especies vetadas
// =============================================================================

/**
 * Lista de especies vetadas del proyecto (no se deben incluir en arquetipos)
 */
const ESPECIES_VETADAS = new Set([
  'eucalyptus_globulus',        // Eucalipto
  'eucalyptus_camaldulensis',    // Eucalipto
  'eucalyptus_spp',              // Eucalipto genérico
  'pinus_patula',                // Pino patula
  'pinus_radiata',               // Pino radiata
  'pinus_spp',                   // Pino genérico
  'retamo_espinoso',             // Retamo espinoso (Ulex europaeus)
  'ulex_europaeus',              // Retamo espinoso (nombre científico)
  'acacia_mangium',              // Acacia invasora
  'acacia_melanoxylon',          // Acacia invasora
  'acacia_dealbata',             // Acacia invasora
  'acacia_spp',                  // Acacia genérico (excluyendo nativas)
]);

// =============================================================================
// Clasificación por familia botánica
// =============================================================================

/**
 * Reglas de clasificación por familia botánica
 * Map: familia -> arquetipo (o null si requiere más contexto)
 */
const FAMILIA_A_ARQUETIPO = {
  // Palmas
  'Arecaceae': 'palma',
  'Cyclanthaceae': 'palma',

  // Helechos
  'Cyatheaceae': 'helecho-arboreo',
  'Dicksoniaceae': 'helecho-arboreo',
  'Dennstaedtiaceae': 'helecho-arboreo',

  // Cactáceas y suculentas
  'Cactaceae': 'suculenta-cactacea',
  'Asphodelaceae': 'suculenta-cactacea',
  'Crassulaceae': 'suculenta-cactacea',

  // Gramíneas
  'Poaceae': 'graminea-macolla',

  // Orquídeas (epífitas)
  'Orchidaceae': 'epifita',

  // Familias complejas que requieren más contexto
  'Fabaceae': null, // Puede ser: arbusto-denso, arbol-dosel-copa-ancha, rastrera-tapizante, trepadora-liana
  'Asteraceae': null, // Puede ser: arbusto-denso, herbacea-erecta, roseta-columnar-tipo-frailejon
  'Solanaceae': null, // Puede ser: arbusto-denso, herbacea-erecta
  'Rosaceae': null, // Puede ser: arbusto-denso, rastrera-tapizante, arbol-dosel-copa-ancha
  'Myrtaceae': null, // Puede ser: arbusto-denso, arbol-dosel-copa-ancha
};

// =============================================================================
// Carga del catálogo
// =============================================================================

/**
 * Carga un archivo de catálogo JSON
 * @param {string} filepath - Ruta al archivo del catálogo
 * @returns {{schema_version: string, species: Array}} Catálogo cargado
 */
function loadCatalog(filepath) {
  try {
    const raw = readFileSync(filepath, 'utf8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data.species)) {
      throw new Error('Catálogo inválido: missing species array');
    }
    return data;
  } catch (err) {
    throw new Error(`Error cargando ${filepath}: ${err.message}`);
  }
}

/**
 * Carga todos los archivos de catálogo y mergea las especies
 * @param {boolean} fullMode - Si true, carga v3.2 completo, si false, solo v3.1 OSS
 * @returns {Array} Lista mergeada de especies
 */
function loadAllCatalogs(fullMode = false) {
  const catalogs = [];

  // Siempre cargamos v3.1 (OSS subset)
  const v31Path = resolve(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
  catalogs.push(loadCatalog(v31Path));

  // Si es full mode, también cargamos v3.2
  if (fullMode) {
    const v32Path = resolve(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
    catalogs.push(loadCatalog(v32Path));
  }

  // Mergeamos especies eliminando duplicados (prevalece la última ocurrencia)
  const speciesMap = new Map();
  for (const catalog of catalogs) {
    for (const species of catalog.species) {
      speciesMap.set(species.id, species);
    }
  }

  return Array.from(speciesMap.values());
}

// =============================================================================
// Clasificación de arquetipos
// =============================================================================

/**
 * Verifica si una especie está vetada
 * @param {{id: string, nombre_cientifico: string}} species
 * @returns {boolean}
 */
function isVetada(species) {
  // Verificación por ID
  if (ESPECIES_VETADAS.has(species.id)) {
    return true;
  }

  // Verificación por nombre científico (case-insensitive)
  const nombre = species.nombre_cientifico?.toLowerCase() || '';
  if (ESPECIES_VETADAS.has(species.id)) {
    return true;
  }

  // Patrones específicos para detectar especies vetadas
  const vetPatterns = [
    /eucalyptus/i,
    /pinus\s+patula/i,
    /pinus\s+radiata/i,
    /ulex\s+europaeus/i,
    /retamo\s+espinoso/i,
    /acacia\s+mangium/i,
    /acacia\s+melanoxylon/i,
    /acacia\s+dealbata/i,
  ];

  for (const pattern of vetPatterns) {
    if (pattern.test(nombre) || pattern.test(species.id || '')) {
      return true;
    }
  }

  return false;
}

/**
 * Deriva el arquetipo morfológico basado en familia botánica, categoría y estrato
 * @param {{id: string, nombre_cientifico: string, familia_botanica: string, category: string, estrato: string}} species
 * @returns {{arquetipo: string, confianza: number, razon: string}}
 */
function clasificarArquetipo(species) {
  // 1. Verificar si está vetada
  if (isVetada(species)) {
    return {
      arquetipo: 'VETADA',
      confianza: 1.0,
      razon: 'Especie vetada del proyecto (eucalipto, pino, retamo, acacia invasora)',
    };
  }

  const familia = species.familia_botanica?.toLowerCase() || '';
  const category = species.category?.toLowerCase() || '';
  const estrato = species.estrato?.toLowerCase() || '';
  const nombre = species.nombre_cientifico?.toLowerCase() || '';
  const genero = species.nombre_cientifico?.split(' ')[0]?.toLowerCase() || '';

  // 2. Clasificación directa por familia
  const familiaNormalizada = species.familia_botanica || '';
  if (FAMILIA_A_ARQUETIPO[familiaNormalizada]) {
    return {
      arquetipo: FAMILIA_A_ARQUETIPO[familiaNormalizada],
      confianza: 0.85,
      razon: `Familia botánica ${familiaNormalizada} es característica del arquetipo`,
    };
  }

  // 3. Clasificación por género
  if (genero === 'espeletia' || genero === 'espeletiopsis' || genero === 'coespeletia') {
    return {
      arquetipo: 'roseta-columnar-tipo-frailejon',
      confianza: 0.95,
      razon: 'Género Espeletia (frailejones) típico de páramo andino',
    };
  }

  if (genero === 'cyathea' || genero === 'dicksonia') {
    return {
      arquetipo: 'helecho-arboreo',
      confianza: 0.9,
      razon: 'Género de helechos arbóreos',
    };
  }

  if (genero === 'ipomoea' || genero === 'passiflora' || genero === 'vitis' || genero === 'vanilla') {
    return {
      arquetipo: 'trepadora-liana',
      confianza: 0.88,
      razon: `Género ${genero} trepador/liana`,
    };
  }

  if (genero === 'opuntia' || genero === 'selenicereus' || genero === 'hylocereus' || genero === 'aloe') {
    return {
      arquetipo: 'suculenta-cactacea',
      confianza: 0.92,
      razon: `Género ${genero} de cactáceas/suculentas`,
    };
  }

  // 4. Clasificación por categoría + estrato
  if (category.includes('arboles') || category.includes('frutales_perennes')) {
    if (estrato === 'emergente') {
      return {
        arquetipo: 'arbol-emergente',
        confianza: 0.8,
        razon: 'Categoría de árbol con estrato emergente',
      };
    }
    if (estrato === 'alto') {
      return {
        arquetipo: 'arbol-dosel-copa-ancha',
        confianza: 0.75,
        razon: 'Categoría de árbol con estrato alto',
      };
    }
  }

  if (category.includes('medicinales') || category.includes('alelopaticas')) {
    if (estrato === 'medio' || estrato === 'bajo') {
      return {
        arquetipo: 'arbusto-denso',
        confianza: 0.65,
        razon: 'Categoría medicinal/alelopática con estrato medio/bajo',
      };
    }
  }

  // 5. Clasificación por estrato
  if (estrato === 'rastrero') {
    return {
      arquetipo: 'rastrera-tapizante',
      confianza: 0.7,
      razon: 'Estrato rastrero indica planta tapizante',
    };
  }

  if (estrato === 'bajo') {
    // Distinguir entre gramíneas y otras herbáceas
    if (familia === 'poaceae' || familia === 'cyperaceae') {
      return {
        arquetipo: 'graminea-macolla',
        confianza: 0.82,
        razon: 'Familia Poaceae con estrato bajo',
      };
    }
    return {
      arquetipo: 'herbacea-erecta',
      confianza: 0.6,
      razon: 'Estrato bajo, herbácea por defecto',
    };
  }

  if (estrato === 'medio') {
    // Podría ser arbusto o árbol pequeño
    if (category.includes('frutales') || category.includes('arboles')) {
      return {
        arquetipo: 'arbol-dosel-copa-ancha',
        confianza: 0.55,
        razon: 'Estrato medio con categoría frutal/arbol',
      };
    }
    return {
      arquetipo: 'arbusto-denso',
      confianza: 0.5,
      razon: 'Estrato medio, arbusto por defecto',
    };
  }

  if (estrato === 'alto') {
    return {
      arquetipo: 'arbol-dosel-copa-ancha',
      confianza: 0.68,
      razon: 'Estrato alto indica árbol de dosel',
    };
  }

  if (estrato === 'emergente') {
    return {
      arquetipo: 'arbol-emergente',
      confianza: 0.75,
      razon: 'Estrato emergente indica árbol superior',
    };
  }

  // 6. Clasificación por categoría cuando no hay estrato
  if (category.includes('hortalizas') || category.includes('cereales') || category.includes('granos')) {
    return {
      arquetipo: 'herbacea-erecta',
      confianza: 0.45,
      razon: 'Categoría de cultivo herbáceo, confianza baja por falta de estrato',
    };
  }

  if (category.includes('tuberculos') || category.includes('raices')) {
    if (nombre.includes('dioscorea') || nombre.includes('ullucus') || nombre.includes('oxalis')) {
      return {
        arquetipo: 'rastrera-tapizante',
        confianza: 0.55,
        razon: 'Tubérculo con hábito rastrero conocido',
      };
    }
    return {
      arquetipo: 'herbacea-erecta',
      confianza: 0.4,
      razon: 'Tubérculo/raíz, herbácea por defecto (confianza baja)',
    };
  }

  if (category.includes('abonos_verdes') || category.includes('coberturas')) {
    if (familia === 'poaceae' || familia === 'fabaceae') {
      return {
        arquetipo: 'rastrera-tapizante',
        confianza: 0.5,
        razon: 'Cobertura leguminosa/gramínea, probable rastrera',
      };
    }
    return {
      arquetipo: 'arbusto-denso',
      confianza: 0.35,
      razon: 'Cobertura, arbusto por defecto (confianza baja)',
    };
  }

  // 7. Si no hay suficiente información
  return {
    arquetipo: 'herbacea-erecta',
    confianza: 0.25,
    razon: 'Sin información morfológica suficiente, herbácea por defecto (REVISAR)',
  };
}

/**
 * Deriva la altura estimada basado en categoría, estrato y datos del catálogo
 * @param {{category: string, estrato: string, altitud_msnm: object}} species
 * @returns {{min: number, max: number, unidad: string}|null}
 */
function derivarAltura(species) {
  const category = species.category?.toLowerCase() || '';
  const estrato = species.estrato?.toLowerCase() || '';

  // Si hay datos explícitos de altitud, los usamos como proxy
  // (NO es lo mismo que altura de planta, pero en bosques andinos
  // la altura de planta se correlaciona con el piso térmico)

  // Clasificación por estrato
  if (estrato === 'emergente') {
    return { min: 40, max: 70, unidad: 'm' };
  }
  if (estrato === 'alto') {
    if (category.includes('frutales') || category.includes('arboles')) {
      return { min: 10, max: 35, unidad: 'm' };
    }
    return { min: 8, max: 25, unidad: 'm' };
  }
  if (estrato === 'medio') {
    if (category.includes('frutales')) {
      return { min: 3, max: 8, unidad: 'm' };
    }
    if (category.includes('medicinales') || category.includes('alelopaticas')) {
      return { min: 1.5, max: 4, unidad: 'm' };
    }
    return { min: 2, max: 6, unidad: 'm' };
  }
  if (estrato === 'bajo') {
    return { min: 0.3, max: 1.5, unidad: 'm' };
  }
  if (estrato === 'rastrero') {
    return { min: 0.05, max: 0.5, unidad: 'm' };
  }

  // Clasificación por categoría
  if (category.includes('arboles') || category.includes('frutales_perennes')) {
    return { min: 5, max: 20, unidad: 'm' };
  }
  if (category.includes('hortalizas') || category.includes('cereales')) {
    return { min: 0.3, max: 1.5, unidad: 'm' };
  }
  if (category.includes('tuberculos') || category.includes('raices')) {
    return { min: 0.3, max: 1, unidad: 'm' };
  }

  // Default: herbácea
  return { min: 0.2, max: 0.8, unidad: 'm' };
}

/**
 * Deriva el piso térmico basado en thermal_zones o altitud_msnm
 * @param {{thermal_zones: string[], altitud_msnm: object}} species
 * @returns {string[]} Lista de pisos térmicos
 */
function derivarPisoTermico(species) {
  const thermalZones = species.thermal_zones || [];
  const altitud = species.altitud_msnm || {};

  // Si hay thermal_zones explícitos, los usamos
  if (thermalZones.length > 0) {
    return thermalZones;
  }

  // Si no, derivamos de altitud
  const altMin = altitud.min_absoluto || altitud.optimo_min;
  const altMax = altitud.max_absoluto || altitud.optimo_max;

  if (altMin === undefined || altMax === undefined) {
    return [];
  }

  const pisos = [];
  if (altMin <= 1000 && altMax >= 0) pisos.push('calido');
  if (altMin <= 2000 && altMax >= 1000) pisos.push('templado');
  if (altMin <= 3000 && altMax >= 2000) pisos.push('frio');
  if (altMin <= 4000 && altMax >= 3000) pisos.push('paramo');

  return pisos;
}

/**
 * Clasifica una especie y retorna el objeto de arquetipo
 * @param species
 * @returns {{especie_id: string, nombre_cientifico: string, arquetipo: string, altura_m: object, piso_termico: string[], confianza: number, razon: string}}
 */
function procesarEspecie(species) {
  const clasificacion = clasificarArquetipo(species);
  const altura = derivarAltura(species);
  const pisoTermico = derivarPisoTermico(species);

  return {
    especie_id: species.id,
    nombre_cientifico: species.nombre_cientifico,
    familia_botanica: species.familia_botanica || null,
    category: species.category || null,
    estrato: species.estrato || null,
    arquetipo: clasificacion.arquetipo,
    altura_m: altura,
    piso_termico: pisoTermico,
    confianza: clasificacion.confianza,
    razon: clasificacion.razon,
  };
}

// =============================================================================
// Análisis y reportes
// =============================================================================

/**
 * Genera estadísticas de clasificación
 * @param {Array} clasificaciones
 * @returns {object}
 */
function generarEstadisticas(clasificaciones) {
  const stats = {
    total_especies: clasificaciones.length,
    por_arquetipo: {},
    por_confianza: {
      alta: 0,    // > 0.8
      media: 0,   // 0.5 - 0.8
      baja: 0,    // < 0.5
    },
    vetadas: 0,
    sin_piso_termico: 0,
    por_categoria: {},
  };

  for (const c of clasificaciones) {
    // Por arquetipo
    stats.por_arquetipo[c.arquetipo] = (stats.por_arquetipo[c.arquetipo] || 0) + 1;

    // Por confianza
    if (c.confianza > 0.8) stats.por_confianza.alta++;
    else if (c.confianza >= 0.5) stats.por_confianza.media++;
    else stats.por_confianza.baja++;

    // Vetadas
    if (c.arquetipo === 'VETADA') stats.vetadas++;

    // Sin piso térmico
    if (!c.piso_termico || c.piso_termico.length === 0) stats.sin_piso_termico++;

    // Por categoría
    if (c.category) {
      stats.por_categoria[c.category] = (stats.por_categoria[c.category] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Imprime reporte de clasificación
 * @param {Array} clasificaciones
 * @param {object} stats
 */
function imprimirReporte(clasificaciones, stats) {
  console.error('\n=== REPORTE DE CLASIFICACIÓN DE ARQUETIPOS MORFOLÓGICOS ===\n');

  console.error('Especies procesadas:', stats.total_especies);
  console.error('Especies vetadas:', stats.vetadas);
  console.error('Especies sin piso térmico:', stats.sin_piso_termico);
  console.error('');

  console.error('Distribución por arquetipo:');
  const arquetiposOrdenados = Object.entries(stats.por_arquetipo).sort((a, b) => b[1] - a[1]);
  for (const [arquetipo, count] of arquetiposOrdenados) {
    const pct = ((count / stats.total_especies) * 100).toFixed(1);
    console.error(`  ${arquetipo}: ${count} (${pct}%)`);
  }
  console.error('');

  console.error('Distribución por confianza:');
  console.error(`  Alta (>0.8): ${stats.por_confianza.alta}`);
  console.error(`  Media (0.5-0.8): ${stats.por_confianza.media}`);
  console.error(`  Baja (<0.5): ${stats.por_confianza.baja}`);
  console.error('');

  console.error('Top 10 categorías:');
  const categoriasOrdenadas = Object.entries(stats.por_categoria).sort((a, b) => b[1] - a[1]);
  for (const [cat, count] of categoriasOrdenadas.slice(0, 10)) {
    console.error(`  ${cat}: ${count}`);
  }
  console.error('');

  // Especies con confianza baja (requieren revisión)
  const bajaConfianza = clasificaciones.filter(c => c.confianza < 0.5 && c.arquetipo !== 'VETADA');
  if (bajaConfianza.length > 0) {
    console.error(`Especies con confianza baja (<0.5) para revisión: ${bajaConfianza.length}`);
    console.error('Primeras 15 especies con confianza baja:');
    for (const c of bajaConfianza.slice(0, 15)) {
      console.error(`  ${c.especie_id}: ${c.arquetipo} (conf: ${c.confianza.toFixed(2)}) - ${c.razon}`);
    }
    if (bajaConfianza.length > 15) {
      console.error(`  ... y ${bajaConfianza.length - 15} más`);
    }
    console.error('');
  }

  console.error('=== FIN DEL REPORTE ===\n');
}

// =============================================================================
// Generación de documentación
// =============================================================================

/**
 * Genera documentación Markdown de arquetipos
 * @param {Array} clasificaciones
 * @param {object} stats
 * @returns {string} Markdown
 */
function generarDocumentacion(clasificaciones, stats) {
  const lines = [
    '# Arquetipos Morfológicos de Flora - Chagra',
    '',
    'Documento de referencia para los 12 arquetipos morfológicos de flora utilizados en',
    'la generación procedural 3D de Chagra.',
    '',
    `**Fecha de generación:** ${new Date().toISOString()}`,
    `**Total especies clasificadas:** ${stats.total_especies}`,
    `**Especies vetadas:** ${stats.vetadas}`,
    '',
    '## Los 12 Arquetipos Morfológicos',
    '',
  ];

  // Tabla de arquetipos
  lines.push('| Arquetipo | Descripción | Altura típica | Especies | % |');
  lines.push('|-----------|-------------|----------------|----------|---|');

  for (const arquetipo of ARQUETIPOS_MORFOLOGICOS) {
    const count = stats.por_arquetipo[arquetipo.id] || 0;
    const pct = stats.total_especies > 0 ? ((count / stats.total_especies) * 100).toFixed(1) : '0.0';
    const altura = `${arquetipo.altura_tipica.min}-${arquetipo.altura_tipica.max} ${arquetipo.altura_tipica.unidad}`;
    lines.push(`| ${arquetipo.id} | ${arquetipo.descripcion} | ${altura} | ${count} | ${pct}% |`);
  }

  // Agregar VETADA a la tabla
  if (stats.vetadas > 0) {
    const vetPct = ((stats.vetadas / stats.total_especies) * 100).toFixed(1);
    lines.push('| VETADA | Especies vetadas del proyecto | N/A | ' + stats.vetadas + ' | ' + vetPct + '% |');
  }

  lines.push('');
  lines.push('## Descripción Detallada por Arquetipo');
  lines.push('');

  for (const arquetipo of ARQUETIPOS_MORFOLOGICOS) {
    const especiesEnArquetipo = clasificaciones.filter(c => c.arquetipo === arquetipo.id);
    const count = especiesEnArquetipo.length;

    lines.push(`### ${arquetipo.id}: ${arquetipo.nombre}`);
    lines.push('');
    lines.push(arquetipo.descripcion);
    lines.push('');
    lines.push(`**Estratos:** ${arquetipo.estratos.join(', ')}`);
    lines.push(`**Familias botánicas clave:** ${arquetipo.familias_botanicas_clave.join(', ')}`);
    if (arquetipo.generos_clave) {
      lines.push(`**Géneros clave:** ${arquetipo.generos_clave.join(', ')}`);
    }
    lines.push(`**Categorías clave:** ${arquetipo.categories_clave.join(', ')}`);
    lines.push('');
    lines.push(`**Especies en este arquetipo (${count}):**`);

    if (count === 0) {
      lines.push('* Ninguna especie clasificada en este arquetipo');
    } else if (count <= 20) {
      for (const esp of especiesEnArquetipo) {
        const conf = esp.confianza.toFixed(2);
        lines.push(`* ${esp.nombre_cientifico} (\`${esp.especie_id}\`) - confianza: ${conf}`);
      }
    } else {
      for (const esp of especiesEnArquetipo.slice(0, 20)) {
        const conf = esp.confianza.toFixed(2);
        lines.push(`* ${esp.nombre_cientifico} (\`${esp.especie_id}\`) - confianza: ${conf}`);
      }
      lines.push(`* ... y ${count - 20} especies más`);
    }
    lines.push('');
  }

  // Sección de especies vetadas
  if (stats.vetadas > 0) {
    lines.push('### VETADA: Especies Vetadas del Proyecto');
    lines.push('');
    lines.push('Las siguientes especies están vetadas y no deben incluirse en la simulación 3D:');
    lines.push('');
    const vetadas = clasificaciones.filter(c => c.arquetipo === 'VETADA');
    for (const esp of vetadas) {
      lines.push(`* ${esp.nombre_cientifico} (\`${esp.especie_id}\`) - ${esp.razon}`);
    }
    lines.push('');
  }

  // Sección de especies con baja confianza
  const bajaConfianza = clasificaciones.filter(c => c.confianza < 0.5 && c.arquetipo !== 'VETADA');
  if (bajaConfianza.length > 0) {
    lines.push('## Especies con Confianza Baja (<0.5)');
    lines.push('');
    lines.push('Las siguientes especies requieren revisión manual por falta de información morfológica:');
    lines.push('');
    for (const esp of bajaConfianza) {
      lines.push(`* ${esp.nombre_cientifico} (\`${esp.especie_id}\`)`);
      lines.push(`  - Arquetipo: ${esp.arquetipo}`);
      lines.push(`  - Confianza: ${esp.confianza.toFixed(2)}`);
      lines.push(`  - Razón: ${esp.razon}`);
      lines.push(`  - Familia: ${esp.familia_botanica || 'N/A'}`);
      lines.push(`  - Categoría: ${esp.category || 'N/A'}`);
      lines.push(`  - Estrato: ${esp.estrato || 'N/A'}`);
      lines.push('');
    }
  }

  // Metadatos
  lines.push('## Metadatos');
  lines.push('');
  lines.push('**Archivo fuente:** `scripts/clasificar-arquetipos-flora.mjs`');
  lines.push('**Catálogos procesados:** `catalog/chagra-catalog-seed-v3.1.json` + `catalog/chagra-catalog-oss-subset-v3.2.json`');
  lines.push('**Salida:** `catalog/arquetipos-flora.json`');
  lines.push('');
  lines.push('## Colores por Arquetipo');
  lines.push('');
  lines.push('Todos los arquetipos usan una paleta verde-dominante, con variaciones sutiles:');
  lines.push('');
  lines.push('| Arquetipo | H | S | L | Descripción del color |');
  lines.push('|-----------|---|---|---|----------------------|');
  for (const arquetipo of ARQUETIPOS_MORFOLOGICOS) {
    const color = arquetipo.color_dominante;
    lines.push(`| ${arquetipo.id} | ${color.h} | ${color.s} | ${color.l} | Verde ${arquetipo.descripcion.split(' ')[0].toLowerCase()} |`);
  }
  lines.push('');
  lines.push('*H = Hue (0-360), S = Saturation (0-100), L = Lightness (0-100)*');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Main
// =============================================================================

/**
 * Punto de entrada principal
 */
async function main(argv = process.argv.slice(2)) {
  const opts = {
    dryRun: false,
    full: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--full') opts.full = true;
    else if (a === '--help' || a === '-h') {
      console.error('Uso: node scripts/clasificar-arquetipos-flora.mjs [--dry-run] [--full]');
      console.error('  --dry-run: Solo reporta sin escribir archivos');
      console.error('  --full: Procesa catálogos completos (v3.1 + v3.2)');
      process.exit(0);
    }
  }

  console.error('=== Clasificación de Arquetipos Morfológicos de Flora ===\n');

  // 1. Cargar catálogos
  const mode = opts.full ? 'FULL (v3.1 + v3.2)' : 'OSS (v3.1)';
  console.error(`1. Cargando catálogos [modo: ${mode}]...`);
  const species = loadAllCatalogs(opts.full);
  console.error(`   Especies cargadas: ${species.length}\n`);

  // 2. Clasificar especies
  console.error('2. Clasificando especies en arquetipos...');
  const clasificaciones = species.map(procesarEspecie);
  console.error(`   Especies clasificadas: ${clasificaciones.length}\n`);

  // 3. Generar estadísticas
  console.error('3. Generando estadísticas...');
  const stats = generarEstadisticas(clasificaciones);
  console.error(`   Arquetipos representados: ${Object.keys(stats.por_arquetipo).length}\n`);

  // 4. Imprimir reporte
  imprimirReporte(clasificaciones, stats);

  // 5. Escribir archivos
  if (!opts.dryRun) {
    console.error('5. Escribiendo archivos...');

    // Escribir JSON de arquetipos
    const outputPath = resolve(ROOT, 'catalog/arquetipos-flora.json');
    const outputData = {
      version: '1.0.0',
      fecha_generacion: new Date().toISOString(),
      catalogos_procesados: opts.full
        ? ['chagra-catalog-seed-v3.1.json', 'chagra-catalog-oss-subset-v3.2.json']
        : ['chagra-catalog-seed-v3.1.json'],
      total_especies: clasificaciones.length,
      estadisticas: stats,
      clasificaciones,
    };
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.error(`   Escrito: catalog/arquetipos-flora.json`);

    // Escribir documentación Markdown
    const docsPath = resolve(ROOT, 'docs/arquetipos-flora.md');
    const docs = generarDocumentacion(clasificaciones, stats);
    writeFileSync(docsPath, docs, 'utf8');
    console.error(`   Escrito: docs/arquetipos-flora.md\n`);

    console.error('=== ARCHIVOS GENERADOS EXITOSAMENTE ===');
  } else {
    console.error('MODO DRY-RUN: No se escribieron archivos.\n');
    console.error('Para ejecutar y generar archivos:');
    console.error('  node scripts/clasificar-arquetipos-flora.mjs');
  }

  return { clasificaciones, stats };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Error en clasificar-arquetipos-flora:', err);
    process.exit(1);
  });
}

export {
  main,
  ARQUETIPOS_MORFOLOGICOS,
  ESPECIES_VETADAS,
  FAMILIA_A_ARQUETIPO,
  isVetada,
  clasificarArquetipo,
  derivarAltura,
  derivarPisoTermico,
  procesarEspecie,
  generarEstadisticas,
  generarDocumentacion,
};