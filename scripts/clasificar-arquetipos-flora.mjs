#!/usr/bin/env node
/**
 * clasificar-arquetipos-flora.mjs — Clasificación morfológica de flora.
 *
 * Asigna arquetipos morfológicos a especies del catálogo grande basándose en
 * familia botánica + hábito + porte + categoría.
 *
 * Los 12 arquetipos morfológicos:
 * - arbol-dosel-copa-ancha (árboles de dosel con copa ancha)
 * - arbol-emergente (árboles emergentes sobre el dosel)
 * - palma (palmas)
 * - arbusto-denso (arbustos densos)
 * - roseta-columnar-tipo-frailejon (Espeletia y plantas columnares del páramo)
 * - herbacea-erecta (hierbas erectas)
 * - graminea-macolla (gramíneas en macolla)
 * - trepadora-liana (trepadoras y lianas)
 * - epifita (epifitas)
 * - suculenta-cactacea (cactáceas y suculentas)
 * - helecho-arboreo (helechos arbóreos)
 * - rastrera-tapizante (rastreras y tapizantes)
 *
 * Reglas duras:
 * - Especies vetadas (eucalipto, pino pátula, retamo espinoso, acacia invasora)
 *   → arquetipo = VETADA
 * - Espeletia spp. → roseta-columnar-tipo-frailejon (páramo prioritario)
 * - Arecaceae → palma
 * - Sin datos suficientes → confianza baja + marcar para revisión
 *
 * Output: catalog/arquetipos-flora.json con {especie_id, nombre_cientifico,
 * arquetipo, altura_m, piso_termico, confianza}
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(ROOT_DIR, 'catalog/chagra-catalog-oss-subset-v3.2.json');
const OUTPUT_PATH = path.join(ROOT_DIR, 'catalog/arquetipos-flora.json');

// Los 12 arquetipos morfológicos + VETADA
const ARQUETIPOS = [
  'arbol-dosel-copa-ancha',
  'arbol-emergente',
  'palma',
  'arbusto-denso',
  'roseta-columnar-tipo-frailejon',
  'herbacea-erecta',
  'graminea-macolla',
  'trepadora-liana',
  'epifita',
  'suculenta-cactacea',
  'helecho-arboreo',
  'rastrera-tapizante',
  'VETADA'
];

// Niveles de confianza
const CONF = {
  HIGH: 'alta',      // Datos explícitos + coincide familia botánica
  MEDIUM: 'media',   // Inferencia por categoría + familia
  LOW: 'baja',       // Inferencia débil - necesita revisión
  REVIEW: 'revisar'  // Muy poca información - revisión obligatoria
};

// Especies VETADAS (eucalipto, pino pátula, retamo espinoso, acacia invasora)
const ESPECIES_VETADAS = [
  'eucalyptus globulus',      // Eucalipto
  'eucalyptus',               // Cualquier Eucalyptus
  'pinus patula',              // Pino pátula
  'ulex europaeus',            // Retamo espinoso
  'genista monspessulana',     // Retamo liso
  'acacia mangium',            // Acacia mangium (invasora)
  'acacia melanoxylon',        // Acacia negra (invasora)
  'acacia dealbata',           // Acacia dealbata (invasora)
  'acacia decurrens'           // Acacia decurrens (invasora)
];

// Mapeo de familias botánicas a arquetipos predominantes
const FAMILIA_A_ARQUETIPO = {
  // Palmas
  'arecaceae': 'palma',
  
  // Árboles de dosel
  'fabaceae': 'arbol-dosel-copa-ancha',  // Muchas leguminosas arbóreas
  'myrtaceae': 'arbol-dosel-copa-ancha', // Guayaba, arrayán, etc.
  'rosaceae': 'arbol-dosel-copa-ancha',   // Manzano, peral, frutales de hoja
  'anacardiaceae': 'arbol-dosel-copa-ancha', // Mango, marañón
  'lauraceae': 'arbol-dosel-copa-ancha',  // Aguacate, laurel
  'melastomataceae': 'arbol-dosel-copa-ancha', // Árboles andinos
  
  // Árboles emergentes
  'bignoniaceae': 'arbol-emergente',     // Puy, roble, etc.
  
  // Arbustos densos
  'solanaceae': 'arbusto-denso',         // Tomate, papa (también hierbas)
  'lamiaceae': 'arbusto-denso',          // Menta, tomillo, albahaca
  'asteraceae': 'arbusto-denso',         // Muchas compuestas arbustivas
  'rubiaceae': 'arbusto-denso',          // Café, gardenia
  'ericaceae': 'arbusto-denso',          // Arándano, uva del monte
  'verbenaceae': 'arbusto-denso',        // Lantana, verbena
  
  // Páramo (roseta columnar)
  'bromeliaceae': 'roseta-columnar-tipo-frailejon', // Puya, otras bromelias terrestres
  
  // Hierbas erectas
  'brassicaceae': 'herbacea-erecta',     // Repollo, col, brócoli
  'amaranthaceae': 'herbacea-erecta',    // Amaranto, quinua (también arbusto)
  'apiaceae': 'herbacea-erecta',         // Zanahoria, perejil, hinojo
  'chenopodiaceae': 'herbacea-erecta',   // Acelga, espinaca
  
  // Gramíneas
  'poaceae': 'graminea-macolla',         // Maíz, trigo, arroz, caña
  
  // Trepadoras
  'cucurbitaceae': 'trepadora-liana',    // Ahuyama, pepino, melón
  'passifloraceae': 'trepadora-liana',   // Curuba, granadilla, maracuyá
  'convolvulaceae': 'trepadora-liana',   // Batata, camote
  'fabaceae-trepadora': 'trepadora-liana', // Fríjol, arveja trepadora
  
  // Cactáceas y suculentas
  'cactaceae': 'suculenta-cactacea',     // Opuntia, otros cactus
  'crassulaceae': 'suculenta-cactacea',  // Sedum, otras suculentas
  
  // Helechos
  'pteridaceae': 'helecho-arboreo',      // Helechos arbóreos y terrestres
  'dennstaedtiaceae': 'helecho-arboreo', // Pteridium
};

// Mapeo de categorías a arquetipos (secundario)
const CATEGORIA_A_ARQUETIPO = {
  'frutales_perennes': 'arbol-dosel-copa-ancha',
  'arboles_sombra': 'arbol-dosel-copa-ancha',
  'abonos_verdes_coberturas': 'arbusto-denso',
  'tuberculos_raices': 'herbacea-erecta',
  'hortalizas_hoja': 'herbacea-erecta',
  'hortalizas_fruto_flor': 'herbacea-erecta',
  'granos_legumbres': 'herbacea-erecta',
  'cereales': 'graminea-macolla',
  'especies_invasoras': 'rastrera-tapizante',
  'cercas_vivas': 'arbusto-denso'
};

// Palabras clave en hábito para detectar arquetipo
const HABITO_KEYWORDS = {
  'arbol': 'arbol-dosel-copa-ancha',
  'árbol': 'arbol-dosel-copa-ancha',
  'tree': 'arbol-dosel-copa-ancha',
  'palma': 'palma',
  'palm': 'palma',
  'arbusto': 'arbusto-denso',
  'shrub': 'arbusto-denso',
  'hierba': 'herbacea-erecta',
  'herb': 'herbacea-erecta',
  'herbacea': 'herbacea-erecta',
  'gramínea': 'graminea-macolla',
  'graminea': 'graminea-macolla',
  'grass': 'graminea-macolla',
  'trepadora': 'trepadora-liana',
  'trepador': 'trepadora-liana',
  'liana': 'trepadora-liana',
  'vine': 'trepadora-liana',
  'epifita': 'epifita',
  'epiphyte': 'epifita',
  'cact': 'suculenta-cactacea',
  'suculenta': 'suculenta-cactacea',
  'helecho': 'helecho-arboreo',
  'fern': 'helecho-arboreo',
  'rastrero': 'rastrera-tapizante',
  'rastrera': 'rastrera-tapizante',
  'tapiz': 'rastrera-tapizante',
  'cobertura': 'rastrera-tapizante'
};

/**
 * Determina si una especie está vetada
 */
function isVetada(species) {
  const sciName = (species.nombre_cientifico || '').toLowerCase();
  const commonName = (species.nombre_comun || '').toLowerCase();
  
  // Verificar nombre científico
  for (const vetada of ESPECIES_VETADAS) {
    if (sciName.includes(vetada.toLowerCase())) {
      return true;
    }
  }
  
  // Verificar nombres comunes específicos
  if (commonName.includes('eucalipto') || 
      commonName.includes('pino pátula') ||
      commonName.includes('retamo espinoso') ||
      commonName.includes('retamo liso')) {
    return true;
  }
  
  return false;
}

/**
 * Determina si una especie es Espeletia (páramo)
 */
function isEspeletia(species) {
  const sciName = (species.nombre_cientifico || '').toLowerCase();
  return sciName.startsWith('espeletia');
}

/**
 * Extrae altura estimada en metros desde diferentes campos
 */
function extractAltura(species) {
  // Buscar en hábito explícito
  if (species.habito) {
    const alturaMatch = species.habito.match(/(\d+[\d,\.]*)\s*m/i);
    if (alturaMatch) {
      return parseFloat(alturaMatch[1].replace(',', '.'));
    }
    
    // Buscar rango de altura
    const rangoMatch = species.habito.match(/(\d+[\d,\.]*)\s*[-–]\s*(\d+[\d,\.]*)\s*m/i);
    if (rangoMatch) {
      const max = parseFloat(rangoMatch[2].replace(',', '.'));
      return max;
    }
  }
  
  // Estimar por estrato
  if (species.estrato) {
    switch (species.estrato.toLowerCase()) {
      case 'emergente': return 30;
      case 'alto': return 15;
      case 'medio': return 5;
      case 'bajo': return 1;
      case 'rastrero': return 0.3;
    }
  }
  
  // Estimar por categoría
  if (species.category) {
    switch (species.category) {
      case 'frutales_perennes':
      case 'arboles_sombra':
        return 10;
      case 'abonos_verdes_coberturas':
      case 'cercas_vivas':
        return 3;
      case 'tuberculos_raices':
      case 'hortalizas_hoja':
      case 'hortalizas_fruto_flor':
      case 'granos_legumbres':
        return 1;
      case 'cereales':
        return 2;
    }
  }
  
  return null;
}

/**
 * Determina piso térmico desde rangos de altitud
 */
function extractPisoTermico(species) {
  if (!species.altitud_msnm) return null;
  
  const optimoMin = species.altitud_msnm.optimo_min;
  const optimoMax = species.altitud_msnm.optimo_max;
  
  if (!optimoMin && !optimoMax) return null;
  
  const rangoMedio = ((optimoMin || 0) + (optimoMax || 3000)) / 2;
  
  if (rangoMedio < 1000) return 'cálido';
  if (rangoMedio < 2000) return 'templado';
  if (rangoMedio < 3000) return 'frío';
  if (rangoMedio >= 3000) return 'páramo';
  
  return null;
}

/**
 * Clasifica una especie en un arquetipo morfológico
 */
function clasificarEspecie(species) {
  // 1. REGLA DURA: Especies vetadas
  if (isVetada(species)) {
    return {
      arquetipo: 'VETADA',
      confianza: CONF.HIGH,
      razon: 'Especie vetada del proyecto (exótica invasora)'
    };
  }
  
  // 2. REGLA DURA: Espeletia (páramo prioritario)
  if (isEspeletia(species)) {
    return {
      arquetipo: 'roseta-columnar-tipo-frailejon',
      confianza: CONF.HIGH,
      razon: 'Espeletia spp. - planta columnar del páramo'
    };
  }
  
  // 3. REGLA DURA: Arecaceae (palmas)
  if ((species.familia_botanica || '').toLowerCase() === 'arecaceae') {
    return {
      arquetipo: 'palma',
      confianza: CONF.HIGH,
      razon: 'Familia Arecaceae - palmas'
    };
  }
  
  // 4. Buscar hábito explícito con keywords
  if (species.habito) {
    const habitoLower = species.habito.toLowerCase();
    for (const [keyword, arquetipo] of Object.entries(HABITO_KEYWORDS)) {
      if (habitoLower.includes(keyword)) {
        return {
          arquetipo,
          confianza: CONF.HIGH,
          razon: `Hábito explícito contiene "${keyword}"`
        };
      }
    }
  }
  
  // 5. Inferir por familia botánica
  const familia = (species.familia_botanica || '').toLowerCase();
  if (familia && FAMILIA_A_ARQUETIPO[familia]) {
    // Verificar si coincide con categoría para mayor confianza
    const categoria = (species.category || '').toLowerCase();
    const arquetipoPorFamilia = FAMILIA_A_ARQUETIPO[familia];
    const arquetipoPorCategoria = CATEGORIA_A_ARQUETIPO[categoria];
    
    if (arquetipoPorCategoria === arquetipoPorFamilia) {
      return {
        arquetipo: arquetipoPorFamilia,
        confianza: CONF.HIGH,
        razon: `Familia ${familia} coincide con categoría ${categoria}`
      };
    }
    
    return {
      arquetipo: arquetipoPorFamilia,
      confianza: CONF.MEDIUM,
      razon: `Inferido por familia botánica ${familia}`
    };
  }
  
  // 6. Inferir por categoría
  const categoria = (species.category || '').toLowerCase();
  if (categoria && CATEGORIA_A_ARQUETIPO[categoria]) {
    return {
      arquetipo: CATEGORIA_A_ARQUETIPO[categoria],
      confianza: CONF.LOW,
      razon: `Inferido por categoría ${categoria} - revisar familia botánica`
    };
  }
  
  // 7. Inferir por estrato
  if (species.estrato) {
    switch (species.estrato.toLowerCase()) {
      case 'emergente':
        return {
          arquetipo: 'arbol-emergente',
          confianza: CONF.MEDIUM,
          razon: 'Estrato emergente'
        };
      case 'alto':
        return {
          arquetipo: 'arbol-dosel-copa-ancha',
          confianza: CONF.MEDIUM,
          razon: 'Estrato alto'
        };
      case 'medio':
        return {
          arquetipo: 'arbusto-denso',
          confianza: CONF.LOW,
          razon: 'Estrato medio - revisar arquetipo específico'
        };
      case 'bajo':
        return {
          arquetipo: 'herbacea-erecta',
          confianza: CONF.LOW,
          razon: 'Estrato bajo - revisar arquetipo específico'
        };
      case 'rastrero':
        return {
          arquetipo: 'rastrera-tapizante',
          confianza: CONF.MEDIUM,
          razon: 'Estrato rastrero'
        };
    }
  }
  
  // 8. Sin información suficiente
  return {
    arquetipo: null,
    confianza: CONF.REVIEW,
    razon: 'Sin información suficiente - revisión manual requerida'
  };
}

/**
 * Procesa todas las especies del catálogo
 */
function main() {
  console.log('Clasificando arquetipos morfológicos de flora...\n');
  
  // Leer catálogo
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const species = catalog.species || [];
  console.log(`Catálogo cargado: ${species.length} especies\n`);
  
  const resultados = [];
  const conteoPorArquetipo = {};
  
  // Procesar cada especie
  for (const sp of species) {
    const clasificacion = clasificarEspecie(sp);
    const altura = extractAltura(sp);
    const pisoTermico = extractPisoTermico(sp);
    
    const resultado = {
      especie_id: sp.id || null,
      nombre_cientifico: sp.nombre_cientifico || null,
      nombre_comun: sp.nombre_comun || null,
      familia_botanica: sp.familia_botanica || null,
      categoria: sp.category || null,
      arquetipo: clasificacion.arquetipo,
      altura_m: altura,
      piso_termico: pisoTermico,
      confianza: clasificacion.confianza,
      razon: clasificacion.razon,
      habito_raw: sp.habito || null,
      estrato_raw: sp.estrato || null
    };
    
    resultados.push(resultado);
    
    // Contar por arquetipo
    const arq = clasificacion.arquetipo || 'SIN_CLASIFICAR';
    conteoPorArquetipo[arq] = (conteoPorArquetipo[arq] || 0) + 1;
  }
  
  // Escribir output
  const output = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    source_catalog: 'chagra-catalog-oss-subset-v3.2.json',
    total_especies: resultados.length,
    arquetipos_definidos: ARQUETIPOS.length - 1, // Excluyendo VETADA
    conteo_por_arquetipo: conteoPorArquetipo,
    especies: resultados
  };
  
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
  
  // Estadísticas
  console.log('\n=== ESTADÍSTICAS ===');
  console.log(`Total especies procesadas: ${resultados.length}`);
  console.log(`\nConteo por arquetipo:`);
  
  // Ordenar por conteo
  const sortedArquetipos = Object.entries(conteoPorArquetipo)
    .sort((a, b) => b[1] - a[1]);
  
  for (const [arq, count] of sortedArquetipos) {
    const pct = ((count / resultados.length) * 100).toFixed(1);
    console.log(`  ${arq}: ${count} (${pct}%)`);
  }
  
  // Especies sin clasificar
  const sinClasificar = conteoPorArquetipo['SIN_CLASIFICAR'] || 0;
  const sinClasificarPct = ((sinClasificar / resultados.length) * 100).toFixed(1);
  console.log(`\n⚠ Especies sin clasificar: ${sinClasificar} (${sinClasificarPct}%)`);
  
  // Cobertura
  const cobertura = ((resultados.length - sinClasificar) / resultados.length * 100).toFixed(1);
  console.log(`\n✅ Cobertura de clasificación: ${cobertura}%`);
  
  console.log(`\nOutput escrito en: ${OUTPUT_PATH}`);
  
  return resultados.length;
}

// Ejecutar
try {
  main();
  console.log('\n✅ Script completado exitosamente');
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
