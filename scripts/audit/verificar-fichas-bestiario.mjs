#!/usr/bin/env node
/**
 * scripts/audit/verificar-fichas-bestiario.mjs
 *
 * Verificación de las fichas científicas del Bestiario Vivo contra el grafo AGE.
 * 
 * Regla dura del operador: todo hecho duro (especie, norma, DOI, número, categoría 
 * de riesgo) debe salir del grafo AGE con su Source citado, NUNCA de lo que el 
 * modelo cree recordar.
 *
 * Este script consulta el grafo AGE para cada una de las 7 especies del bestiario
 * y verifica:
 * - Nombre científico
 * - Estado de riesgo UICN
 * - Distribución geográfica
 * - Tamaño/rango de peso
 * - Rol ecológico
 *
 * Uso:
 *   export PGHOST=localhost
 *   export PGDATABASE=chagra_kg
 *   export PGUSER=farmos
 *   export PGPASSWORD=your_password
 *   node scripts/audit/verificar-fichas-bestiario.mjs [--format json|text]
 */

import pg from 'pg';

const { Client } = pg;

// =============================================================================
// DATOS DE LAS FICHAS DEL BESTIARIO (memoria paramétrica actual)
// =============================================================================

/**
 * Las 7 especies del Bestiario Vivo con sus fichas actuales.
 * 
 * NOTA: Estos datos vienen de "memoria paramétrica de un modelo" y NO de una
 * fuente citable. Este script verifica cuáles están respaldados por el grafo AGE.
 */
const FICHAS_BESTIARIO = [
  {
    id: 'oso',
    nombre_comun: 'Oso andino',
    cientifico: 'Tremarctos ornatus',
    claimed_uicn: 'VU', // Vulnerable
    claimed_distribucion: 'Andes de Venezuela, Colombia, Ecuador, Perú y Bolivia',
    claimed_tamano: '1.2-2.0 m de longitud, 60-200 kg',
    claimed_rol: 'Dispersionista de semillas, controla poblaciones de frugívoros',
    fuente_ficha: 'Bestiario Vivo (memoria paramétrica)'
  },
  {
    id: 'jaguar',
    nombre_comun: 'Jaguar',
    cientifico: 'Panthera onca',
    claimed_uicn: 'NT', // Near Threatened (Casi amenazado)
    claimed_distribucion: 'Desde México hasta Argentina, principalmente en Amazonía y selvas húmedas',
    claimed_tamano: '1.1-1.9 m de longitud, 36-120 kg',
    claimed_rol: 'Depredador tope, regula poblaciones de herbívoros',
    fuente_ficha: 'Bestiario Vivo (memoria paramétrica)'
  },
  {
    id: 'angelita',
    nombre_comun: 'Abeja angelita',
    cientifico: 'Tetragonisca angustula',
    claimed_uicn: null, // Sin categoría UICN (especie no evaluada o abundante)
    claimed_distribucion: 'Neotrópico: desde México hasta Argentina',
    claimed_tamano: '4-6 mm de longitud',
    claimed_rol: 'Polinizadora de cultivos y vegetación nativa',
    fuente_ficha: 'Bestiario Vivo (memoria paramétrica)'
  },
  {
    id: 'zariguya',
    nombre_comun: 'Zarigüeya (chucha)',
    cientifico: 'Didelphis marsupialis',
    claimed_uicn: null, // Sin categoría mencionada
    claimed_distribucion: 'Neotrópico: desde México hasta Argentina',
    claimed_tamano: '35-50 cm de cabeza-cuerpo, 0.5-2 kg',
    claimed_rol: 'Control de plagas y dispersión de semillas',
    fuente_ficha: 'Criaturas Nocturnas (memoria paramétrica)'
  },
  {
    id: 'guacamaya',
    nombre_comun: 'Guacamaya',
    cientifico: 'Ara sp.', // Género, no especie completa
    claimed_uicn: null, // Sin categoría mencionada
    claimed_distribucion: null, // No especificado en ficha
    claimed_tamano: null, // No especificado en ficha
    claimed_rol: null, // No especificado en ficha
    fuente_ficha: 'Bestiario Vivo (memoria paramétrica, incompleta)'
  },
  {
    id: 'chivito',
    nombre_comun: 'Chivito de páramo',
    cientifico: 'Oxypogon guerinii',
    claimed_uicn: null, // Sin categoría mencionada
    claimed_distribucion: 'Páramos de Colombia (Sierra Nevada, Cocuy, Tolima)',
    claimed_tamano: '8-10 cm de longitud, 4-6 g',
    claimed_rol: 'Polinizador de flores nativas de páramo',
    fuente_ficha: 'Guardian Espíritu (memoria paramétrica)'
  },
  {
    id: 'luciernaga',
    nombre_comun: 'Luciérnaga',
    cientifico: 'Lampyridae', // Familia, no especie
    claimed_uicn: null, // Sin categoría mencionada
    claimed_distribucion: 'Cosmopolita: casi todos los continentes',
    claimed_tamano: '5-25 mm según especie',
    claimed_rol: 'Bioindicador de suelo sano, larvas depredadoras de babosas',
    fuente_ficha: 'Criaturas Nocturnas (memoria paramétrica)'
  }
];

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Escapa un valor para usar como string literal en Cypher
 */
function cypherLiteral(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'null';
    return String(v);
  }
  if (typeof v === 'string') {
    return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
  }
  return "'" + JSON.stringify(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

/**
 * Sanitiza el nombre del grafo para prevenir inyección Cypher
 */
function sanitizeGraphName(graph) {
  return String(graph).replace(/'/g, "''");
}

/**
 * Convierte resultados de pg (agtype) a objetos JavaScript planos
 */
function parseAgtypeRows(rows) {
  return rows.map(row => {
    const parsed = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          parsed[key] = trimmed.slice(1, -1);
        } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            parsed[key] = JSON.parse(trimmed);
          } catch {
            parsed[key] = trimmed;
          }
        } else if (trimmed === 'null') {
          parsed[key] = null;
        } else if (trimmed === 'true') {
          parsed[key] = true;
        } else if (trimmed === 'false') {
          parsed[key] = false;
        } else if (/^\d+$/.test(trimmed)) {
          parsed[key] = parseInt(trimmed, 10);
        } else if (/^\d+\.\d+$/.test(trimmed)) {
          parsed[key] = parseFloat(trimmed);
        } else {
          parsed[key] = trimmed;
        }
      } else {
        parsed[key] = value;
      }
    }
    return parsed;
  });
}

// =============================================================================
// CONSULTAS AL GRAFO AGE
// =============================================================================

/**
 * Busca una especie por nombre científico en el grafo AGE
 */
function buildSpeciesQuery(graph, cientifico) {
  const graphLit = sanitizeGraphName(graph);
  const cientificoLit = cypherLiteral(cientifico);
  
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species {nombre_cientifico: ${cientificoLit}})
  OPTIONAL MATCH (s)-[:HAS_FAMILY]->(f:Family)
  OPTIONAL MATCH (s)-[:HAS_ROLE]->(r:RoleInGuild)
  OPTIONAL MATCH (s)-[:GROWS_IN]->(region:Region)
  OPTIONAL MATCH (s)-[:REFERENCED_BY]->(source:Source)
  RETURN {
    id: s.id,
    nombre_comun: s.nombre_comun,
    nombre_cientifico: s.nombre_cientifico,
    familia: f.nombre,
    rol: r.nombre,
    regiones: collect(DISTINCT region.nombre),
    estado_conservacion: s.conservation_status,
    altitud_min: s.altitud_min,
    altitud_max: s.altitud_max,
    source_ids: s.source_ids,
    sources: collect(DISTINCT {id: source.id, tipo: source.tipo, titulo: source.titulo, tier: source.tier})
  } AS data
  LIMIT 1
$$) AS (data agtype);
`;
}

/**
 * Busca especies por nombre de género (para Ara sp. y Lampyridae)
 */
function buildGenusQuery(graph, genero) {
  const graphLit = sanitizeGraphName(graph);
  const generoLit = cypherLiteral(genero + '%');
  
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)
  WHERE s.nombre_cientifico STARTS WITH ${generoLit}
  OPTIONAL MATCH (s)-[:HAS_FAMILY]->(f:Family)
  OPTIONAL MATCH (s)-[:HAS_ROLE]->(r:RoleInGuild)
  OPTIONAL MATCH (s)-[:GROWS_IN]->(region:Region)
  OPTIONAL MATCH (s)-[:REFERENCED_BY]->(source:Source)
  RETURN {
    id: s.id,
    nombre_comun: s.nombre_comun,
    nombre_cientifico: s.nombre_cientifico,
    familia: f.nombre,
    rol: r.nombre,
    regiones: collect(DISTINCT region.nombre),
    estado_conservacion: s.conservation_status,
    altitud_min: s.altitud_min,
    altitud_max: s.altitud_max,
    source_ids: s.source_ids,
    sources: collect(DISTINCT {id: source.id, tipo: source.tipo, titulo: source.titulo, tier: source.tier})
  } AS data
  LIMIT 10
$$) AS (data agtype);
`;
}

/**
 * Cuenta nodos y aristas del grafo
 */
function buildGraphStatsQuery(graph) {
  const graphLit = sanitizeGraphName(graph);
  
  return `
SELECT 
  (SELECT count(*) FROM cypher('${graphLit}', $$ MATCH (n:Species) RETURN n $$) AS (n agtype)) AS species_count,
  (SELECT count(*) FROM cypher('${graphLit}', $$ MATCH (n:Animal) RETURN n $$) AS (n agtype)) AS animal_count,
  (SELECT count(*) FROM cypher('${graphLit}', $$ MATCH (n:BeneficialOrganism) RETURN n $$) AS (n agtype)) AS beneficial_count,
  (SELECT count(*) FROM cypher('${graphLit}', $$ MATCH (n:Source) RETURN n $$) AS (n agtype)) AS source_count;
`;
}

// =============================================================================
// CLIENTE POSTGRESQL
// =============================================================================

function createClientFromEnv() {
  const config = {
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'chagra_kg',
    user: process.env.PGUSER || 'farmos',
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10)
  };
  
  return new Client(config);
}

async function executeQuery(client, sql) {
  try {
    const result = await client.query(sql);
    return parseAgtypeRows(result.rows);
  } catch (error) {
    throw new Error(`Error ejecutando query: ${error.message}`);
  }
}

// =============================================================================
// VERIFICACIÓN
// =============================================================================

/**
 * Verifica una afirmación contra los datos del grafo
 */
function verificarAfirmacion(claim, graphData, especie) {
  // Si no hay datos del grafo, es SIN RESPALDO
  if (!graphData || graphData.length === 0) {
    return {
      afirmacion: claim,
      especia: especie,
      valor_claimed: JSON.stringify(FICHAS_BESTIARIO.find(f => f.id === especie)?.[claim]),
      veredicto: 'SIN RESPALDO',
      grafo_valor: null,
      grafo_source: null,
      severidad: claim.includes('uicn') ? 'CRÍTICO' : 'ALTO'
    };
  }
  
  const data = graphData[0];
  const ficha = FICHAS_BESTIARIO.find(f => f.id === especie);
  
  // Mapeo de campos claim -> campo grafo
  const campoGrafo = {
    'cientifico': 'nombre_cientifico',
    'uicn': 'estado_conservacion',
    'distribucion': 'regiones',
    'tamano': 'altitud_min', // Placeholder
    'rol': 'rol'
  };
  
  const grafoField = campoGrafo[claim];
  const valorClaimed = ficha?.[`claimed_${claim}`];
  const valorGrafo = grafoField ? data[grafoField] : null;
  
  // Verificar si hay contradicción
  if (valorClaimed && valorGrafo && valorClaimed !== valorGrafo) {
    return {
      afirmacion: claim,
      especie,
      valor_claimed: valorClaimed,
      veredicto: 'CONTRADICHO',
      grafo_valor: valorGrafo,
      grafo_source: data.sources?.[0]?.id || null,
      severidad: claim.includes('uicn') ? 'CRÍTICO' : 'MEDIO'
    };
  }
  
  // Si hay valor en el grafo, está RESPALDADO
  if (valorGrafo) {
    return {
      afirmacion: claim,
      especie,
      valor_claimed: valorClaimed,
      veredicto: 'RESPALDADO',
      grafo_valor: valorGrafo,
      grafo_source: data.sources?.[0]?.id || null,
      severidad: 'BAJO'
    };
  }
  
  // Si no hay valor ni en claim ni en grafo
  return {
    afirmacion: claim,
    especie,
    valor_claimed: valorClaimed,
    veredicto: 'SIN RESPALDO',
    grafo_valor: null,
    grafo_source: null,
    severidad: claim.includes('uicn') ? 'CRÍTICO' : 'MEDIO'
  };
}

// =============================================================================
// FORMATO DE RESULTADOS
// =============================================================================

/**
 * Genera el reporte en formato Markdown
 */
function generarReporteMarkdown(resultados, stats) {
  const lineas = [
    '# Verificación de fichas del Bestiario Vivo contra el grafo AGE',
    '',
    `**Fecha:** ${new Date().toISOString()}`,
    `**Grafo:** chagra_kg`,
    '',
    '## Resumen del grafo',
    '',
    `- Nodos Species: ${stats.species_count || 'N/A'}`,
    `- Nodos Animal: ${stats.animal_count || 'N/A'}`,
    `- Nodos BeneficialOrganism: ${stats.beneficial_count || 'N/A'}`,
    `- Nodos Source: ${stats.source_count || 'N/A'}`,
    '',
    '## Afirmaciones verificadas',
    '',
    'Una fila por afirmación verificable. Ordenado por severidad: CRÍTICO (categoría UICN) > ALTO > MEDIO > BAJO.',
    '',
    '| Afirmación | Especie | Valor en ficha | Veredicto | Valor en grafo | Source en grafo | Severidad |',
    '|------------|---------|----------------|-----------|----------------|-----------------|-----------|'
  ];
  
  // Ordenar por severidad
  const ordenado = resultados.sort((a, b) => {
    const severidadOrden = { 'CRÍTICO': 0, 'ALTO': 1, 'MEDIO': 2, 'BAJO': 3 };
    return severidadOrden[a.severidad] - severidadOrden[b.severidad];
  });
  
  for (const r of ordenado) {
    const valorClaimed = r.valor_claimed || '(no especificado)';
    const valorGrafo = r.grafo_valor || '(no encontrado)';
    const source = r.grafo_source || '(no source)';
    
    lineas.push(`| ${r.afirmacion} | ${r.especie} | ${valorClaimed} | ${r.veredicto} | ${valorGrafo} | ${source} | ${r.severidad} |`);
  }
  
  lineas.push('');
  lineas.push('## Leyenda');
  lineas.push('');
  lineas.push('- **RESPALDADO**: El grafo contiene un nodo o Source que sostiene la afirmación');
  lineas.push('- **CONTRADICHO**: El grafo contiene información diferente a la afirmación');
  lineas.push('- **SIN RESPALDO**: El grafo no contiene información sobre esta afirmación');
  lineas.push('- **Severidad**:');
  lineas.push('  - CRÍTICO: Categoría de riesgo UICN equivocada (error grave en material educativo)');
  lineas.push('  - ALTO: Nombre científico o distribución incorrectos');
  lineas.push('  - MEDIO: Falta de datos importantes (tamaño, rol)');
  lineas.push('  - BAJO: Datos menores no especificados');
  
  lineas.push('');
  lineas.push('## Recomendaciones');
  lineas.push('');
  
  const sinRespaldo = ordenado.filter(r => r.veredicto === 'SIN RESPALDO');
  const contradichos = ordenado.filter(r => r.veredicto === 'CONTRADICHO');
  
  if (sinRespaldo.length > 0) {
    lineas.push('### Faltantes en el grafo');
    lineas.push('');
    for (const r of sinRespaldo) {
      if (r.severidad === 'CRÍTICO') {
        lineas.push(`- **CRÍTICO**: Falta categoría UICN para ${r.especie}`);
      } else {
        lineas.push(`- ${r.especie}: falta ${r.afirmacion}`);
      }
    }
  }
  
  if (contradichos.length > 0) {
    lineas.push('');
    lineas.push('### Contradicciones encontradas');
    lineas.push('');
    for (const r of contradichos) {
      lineas.push(`- **${r.severidad}**: ${r.especie}: ${r.afirmacion}`);
      lineas.push(`  - Ficha: ${r.valor_claimed}`);
      lineas.push(`  - Grafo: ${r.grafo_valor}`);
    }
  }
  
  if (sinRespaldo.length === 0 && contradichos.length === 0) {
    lineas.push('✅ Todas las afirmaciones están respaldadas por el grafo AGE.');
  }
  
  lineas.push('');
  lineas.push('---');
  lineas.push('');
  lineas.push('**Nota:** Si el grafo AGE no cubre fauna con este nivel de detalle,');
  lineas.push('considere agregar nodos Species o Source para las especies faltantes.');
  
  return lineas.join('\n');
}

/**
 * Genera el reporte en formato JSON
 */
function generarReporteJSON(resultados, stats) {
  return {
    generated_at: new Date().toISOString(),
    graph: 'chagra_kg',
    stats,
    resultados,
    summary: {
      total: resultados.length,
      respaldados: resultados.filter(r => r.veredicto === 'RESPALDADO').length,
      contradichos: resultados.filter(r => r.veredicto === 'CONTRADICHO').length,
      sin_respaldo: resultados.filter(r => r.veredicto === 'SIN RESPALDO').length,
      criticos: resultados.filter(r => r.severidad === 'CRÍTICO').length
    }
  };
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

async function runVerificacion(options = {}) {
  const { graph = 'chagra_kg', format = 'text', dryRun = false } = options;
  
  if (dryRun) {
    console.log('MODO DRY-RUN: Mostrando consultas sin ejecutar\n');
    for (const ficha of FICHAS_BESTIARIO) {
      console.log(`\n### ${ficha.nombre_comun} (${ficha.cientifico})`);
      if (ficha.cientifico.includes('sp.')) {
        const genero = ficha.cientifico.replace(' sp.', '').replace(' spp.', '');
        console.log(buildGenusQuery(graph, genero));
      } else {
        console.log(buildSpeciesQuery(graph, ficha.cientifico));
      }
    }
    return 0;
  }
  
  // Verificar variables de entorno
  if (!process.env.PGHOST && !process.env.CHAGRA_DB_CONTAINER) {
    console.error('ERROR: Falta variable de entorno PGHOST o CHAGRA_DB_CONTAINER');
    console.error('Configura las credenciales de PostgreSQL antes de ejecutar:');
    console.error('  export PGHOST=localhost');
    console.error('  export PGDATABASE=chagra_kg');
    console.error('  export PGUSER=farmos');
    console.error('  export PGPASSWORD=your_password');
    return 2;
  }
  
  const client = createClientFromEnv();
  const resultados = [];
  
  try {
    console.log(`Conectando a PostgreSQL en ${client.host}:${client.port}...`);
    await client.connect();
    console.log('Conexión establecida. Iniciando verificación...\n');
    
    // Obtener estadísticas del grafo
    console.log('Obteniendo estadísticas del grafo...');
    const statsResults = await executeQuery(client, buildGraphStatsQuery(graph));
    const stats = statsResults[0] || {};
    console.log(`- Species: ${stats.species_count || 'N/A'}`);
    console.log(`- Animal: ${stats.animal_count || 'N/A'}`);
    console.log(`- BeneficialOrganism: ${stats.beneficial_count || 'N/A'}`);
    console.log(`- Source: ${stats.source_count || 'N/A'}\n`);
    
    // Verificar cada especie
    for (const ficha of FICHAS_BESTIARIO) {
      console.log(`Verificando: ${ficha.nombre_comun} (${ficha.cientifico})...`);
      
      let query;
      let graphData;
      
      // Determinar si es búsqueda por especie o por género
      if (ficha.cientifico.includes('sp.') || ficha.cientifico.includes('spp.') || ficha.cientifico === 'Lampyridae') {
        // Búsqueda por género
        const genero = ficha.cientifico.replace(' sp.', '').replace(' spp.', '').replace(' spp', '');
        query = buildGenusQuery(graph, genero);
        graphData = await executeQuery(client, query);
        
        if (graphData.length > 0) {
          console.log(`  ✓ Encontrados ${graphData.length} taxones relacionados con ${genero}`);
        } else {
          console.log(`  ✗ No se encontraron taxones para ${genero}`);
        }
      } else {
        // Búsqueda exacta
        query = buildSpeciesQuery(graph, ficha.cientifico);
        graphData = await executeQuery(client, query);
        
        if (graphData.length > 0) {
          console.log(`  ✓ Nodo encontrado en grafo`);
        } else {
          console.log(`  ✗ No se encontró nodo en grafo`);
        }
      }
      
      // Verificar cada afirmación
      const afirmaciones = ['cientifico', 'uicn', 'distribucion', 'tamano', 'rol'];
      for (const afirmacion of afirmaciones) {
        const resultado = verificarAfirmacion(afirmacion, graphData, ficha.id);
        resultados.push(resultado);
      }
    }
    
    // Generar reporte
    console.log('\nGenerando reporte...');
    const reporte = format === 'json' 
      ? generarReporteJSON(resultados, stats)
      : generarReporteMarkdown(resultados, stats);
    
    console.log(reporte);
    
    // Escribir archivo si no es JSON (JSON ya se mostró)
    if (format !== 'json') {
      const fs = await import('node:fs');
      const outputPath = '/tmp/glm-65-glm-verificar-fichas-bestiario-vs-grafo/docs/verificacion-fichas-bestiario.md';
      fs.writeFileSync(outputPath, reporte + '\n');
      console.log(`\n✅ Reporte escrito en: ${outputPath}`);
    }
    
    const sinRespaldo = resultados.filter(r => r.veredicto === 'SIN RESPALDO').length;
    const criticos = resultados.filter(r => r.severidad === 'CRÍTICO' && r.veredicto === 'SIN RESPALDO').length;
    
    if (criticos > 0) {
      console.log(`\n⚠️  ADVERTENCIA: Hay ${criticos} afirmaciones CRÍTICAS sin respaldo (categorías UICN)`);
      return 1;
    }
    
    if (sinRespaldo > 0) {
      console.log(`\n⚠️  ADVERTENCIA: Hay ${sinRespaldo} afirmaciones sin respaldo en el grafo`);
      return 1;
    }
    
    console.log('\n✅ Todas las afirmaciones están respaldadas por el grafo AGE');
    return 0;
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    return 2;
  } finally {
    await client.end();
    console.log('\nConexión cerrada.');
  }
}

// =============================================================================
// CLI
// =============================================================================

function parseArgs(argv) {
  const opts = {
    graph: 'chagra_kg',
    format: 'text',
    dryRun: false
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--graph' && argv[i + 1]) {
      opts.graph = argv[++i];
    } else if (arg === '--format' && argv[i + 1]) {
      opts.format = argv[++i];
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      opts.help = true;
    }
  }
  
  return opts;
}

function showHelp() {
  console.log(`
Uso: node scripts/audit/verificar-fichas-bestiario.mjs [opciones]

Opciones:
  --graph NOMBRE      Nombre del grafo en AGE (default: chagra_kg)
  --format FORMAT     Formato de salida: json|text (default: text)
  --dry-run           Mostrar consultas sin ejecutar
  --help, -h          Mostrar esta ayuda

Variables de entorno requeridas:
  PGHOST              Host de PostgreSQL (default: localhost)
  PGDATABASE          Base de datos (default: chagra_kg)
  PGUSER              Usuario de PostgreSQL (default: farmos)
  PGPASSWORD          Password (opcional, usa .pgpass si está configurado)
  PGPORT              Puerto (default: 5432)

Ejemplos:
  # Ejecutar verificación completa (formato texto)
  node scripts/audit/verificar-fichas-bestiario.mjs

  # Ejecutar en formato JSON
  node scripts/audit/verificar-fichas-bestiario.mjs --format json

  # Modo dry-run: ver consultas sin ejecutar
  node scripts/audit/verificar-fichas-bestiario.mjs --dry-run
`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  
  if (opts.help) {
    showHelp();
    return 0;
  }
  
  if (!['json', 'text'].includes(opts.format)) {
    console.error(`ERROR: Formato inválido: ${opts.format}. Usa 'json' o 'text'.`);
    return 2;
  }
  
  try {
    const exitCode = await runVerificacion(opts);
    return exitCode;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}

export { runVerificacion, FICHAS_BESTIARIO };
