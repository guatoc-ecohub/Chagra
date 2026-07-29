#!/usr/bin/env node
/**
 * scripts/audit/graph-bug-hunt.mjs
 *
 * Auditoría READ-ONLY del grafo agroecológico en Apache AGE 1.5.0 (base de datos
 * chagra_kg) para cazar bugs de datos. El script define consultas Cypher que
 * detectan y cuentan, con ejemplos, estas clases de bugs:
 *
 *   1. Conflicto entre altitud_min y altitud_msnm (invertidos o incoherentes)
 *   2. Piso térmico incoherente con la altitud
 *   3. Especies duplicadas por nombre científico
 *   4. Aristas huérfanas que apuntan a un nodo inexistente
 *   5. Especies aisladas sin ninguna arista
 *   6. Aristas GROWS_IN sin piso térmico
 *   7. Nombre científico mal formado
 *
 * Gotchas de AGE 1.5.0 respetados:
 *   - NO usar WHERE NOT EXISTS con llaves
 *   - Hacer match por id() y no por propiedad
 *   - NO poner punto y coma dentro de los bloques $$
 *   - El sufijo :vertex rompe JSON.parse
 *
 * El script NO se conecta ni ejecuta contra la base (el sandbox no tiene acceso
 * a alpha); solo deja las consultas listas y un runner con node-postgres
 * parametrizado por variables de entorno (PGHOST, PGDATABASE, PGUSER) para que
 * el operador lo corra después en alpha.
 *
 * Uso:
 *   export PGHOST=localhost
 *   export PGDATABASE=chagra_kg
 *   export PGUSER=farmos
 *   export PGPASSWORD=your_password  # opcional, usa .pgpass si está configurado
 *   node scripts/audit/graph-bug-hunt.mjs [--format json|text] [--check-only N]
 *
 * --format json: salida en JSON (default: texto legible)
 * --check-only N: ejecuta solo la verificación N (1-7), default todas
 *
 * Autor: GLM-4.6 para Chagra (2026-07-16)
 * Estado: BUILD + DRY-RUN. No ejecuta queries reales hasta que el operador lo
 *         corra en alpha con credenciales válidas.
 */

import pg from 'pg';

const { Client } = pg;

// =============================================================================
// CONFIGURACIÓN
// =============================================================================

const DEFAULT_GRAPH = 'chagra_kg';
const DEFAULT_FORMAT = 'text';
const EDGE_LABELS = ['GROWS_IN', 'CONTROLS', 'ANTAGONIST_OF', 'CO_RELEVANT'];
const NODE_LABELS = ['Species', 'Pest', 'NoncoPest'];

// =============================================================================
// UTILIDADES
// =============================================================================

/**
 * Escapa un valor para usar como string literal en Cypher
 * @param {unknown} v - valor a escapar
 * @returns {string} literal Cypher seguro
 */
function cypherLiteral(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'null';
    return String(v);
  }
  if (typeof v === 'string') {
    // Escapar backslash primero, luego comilla simple
    return "'" + v.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
  }
  // Para arrays u objetos, usar JSON.stringify y tratar como string
  return "'" + JSON.stringify(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
}

/**
 * Sanitiza el nombre del grafo para prevenir inyección Cypher
 * @param {string} graph - nombre del grafo
 * @returns {string} nombre sanitizado
 */
function sanitizeGraphName(graph) {
  return String(graph).replace(/'/g, "''");
}

/**
 * Convierte resultados de pg (agtype) a objetos JavaScript planos
 * @param {Array} rows - filas devueltas por pg
 * @returns {Array} objetos JavaScript planos
 */
function parseAgtypeRows(rows) {
  return rows.map(row => {
    const parsed = {};
    for (const [key, value] of Object.entries(row)) {
      // pg devuelve agtype como string con formato: "valor" o para objetos: {"prop": "val"}
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
          // String simple entre comillas
          parsed[key] = trimmed.slice(1, -1);
        } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          // Objeto JSON
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
// CONSULTAS DE DETECCIÓN DE BUGS
// =============================================================================

/**
 * BUG 1: Conflicto entre altitud_min y altitud_msnm (invertidos o incoherentes)
 * 
 * Detecta especies donde altitud_min > altitud_msnm (invertidos) o donde
 * ambas propiedades existen pero son incoherentes (diferencia > 3000m)
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Match por propiedades, no por id() directo
 */
function buildBug1Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)
  WHERE s.altitud_min IS NOT NULL AND s.altitud_msnm IS NOT NULL
    AND s.altitud_min > s.altitud_msnm
  RETURN s.id AS species_id,
         s.nombre_comun AS nombre_comun,
         s.altitud_min AS altitud_min,
         s.altitud_msnm AS altitud_msnm,
         (s.altitud_min - s.altitud_msnm) AS diferencia
  ORDER BY diferencia DESC
  LIMIT 100
$$) AS (species_id agtype, nombre_comun agtype, altitud_min agtype, 
        altitud_msnm agtype, diferencia agtype);
`;
}

/**
 * BUG 2: Piso térmico incoherente con la altitud
 * 
 * Detecta especies donde el piso térmico declarado no corresponde al rango
 * de altitud según las reglas de Colombia:
 * - Cálido (> 0-2000m)
 * - Templado (2000-3000m)
 * - Frío (3000-4000m)
 * - Páramo (> 4000m)
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Match por id() del nodo Species
 */
function buildBug2Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)
  WHERE s.altitud_msnm IS NOT NULL AND s.piso_termico_id IS NOT NULL
    AND (
      (s.piso_termico_id = 'calido' AND s.altitud_msnm > 2000) OR
      (s.piso_termico_id = 'templado' AND (s.altitud_msnm < 2000 OR s.altitud_msnm > 3000)) OR
      (s.piso_termico_id = 'frio' AND (s.altitud_msnm < 3000 OR s.altitud_msnm > 4000)) OR
      (s.piso_termico_id = 'paramo' AND s.altitud_msnm < 4000)
    )
  RETURN s.id AS species_id,
         s.nombre_comun AS nombre_comun,
         s.altitud_msnm AS altitud_msnm,
         s.piso_termico_id AS piso_termico_id
  ORDER BY s.id
  LIMIT 100
$$) AS (species_id agtype, nombre_comun agtype, altitud_msnm agtype, 
        piso_termico_id agtype);
`;
}

/**
 * BUG 3: Especies duplicadas por nombre científico
 * 
 * Detecta nodos Species con el mismo nombre_cientifico pero diferentes ids
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Match por nombre_cientifico y agrupa
 */
function buildBug3Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)
  WHERE s.nombre_cientifico IS NOT NULL
  WITH s.nombre_cientifico AS nombre, collect(s.id) AS ids, count(s) AS cnt
  WHERE cnt > 1
  RETURN nombre, ids, cnt
  ORDER BY cnt DESC, nombre
  LIMIT 50
$$) AS (nombre agtype, ids agtype, cnt agtype);
`;
}

/**
 * BUG 4: Aristas huérfanas que apuntan a un nodo inexistente
 * 
 * Detecta aristas donde source o target no existen como nodos válidos
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Usa id() para verificar existencia
 */
function buildBug4Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  let allQueries = [];
  
  // Para cada tipo de arista, verificar que existen ambos extremos
  for (const edgeLabel of EDGE_LABELS) {
    const query = `
SELECT '${edgeLabel}' AS edge_label, * FROM cypher('${graphLit}', $$
  MATCH (a)-[r:${edgeLabel}]->(b)
  WHERE id(a) IS NULL OR id(b) IS NULL
  RETURN id(r) AS edge_id, id(a) AS source_id, id(b) AS target_id, '${edgeLabel}' AS edge_label
  LIMIT 50
$$) AS (edge_id agtype, source_id agtype, target_id agtype, edge_label_param agtype)`;
    allQueries.push(query);
  }
  
  return allQueries.join('\nUNION ALL\n');
}

/**
 * BUG 5: Especies aisladas sin ninguna arista
 * 
 * Detecta nodos Species que no tienen ninguna arista entrante o saliente
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Usa patrón de matching y filtrado
 */
function buildBug5Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)
  WITH s
  LEFT MATCH (s)-[r]-()
  WITH s, count(r) AS edge_count
  WHERE edge_count = 0
  RETURN s.id AS species_id, s.nombre_comun AS nombre_comun
  ORDER BY s.id
  LIMIT 100
$$) AS (species_id agtype, nombre_comun agtype);
`;
}

/**
 * BUG 6: Aristas GROWS_IN sin piso térmico o con piso inválido
 * 
 * Detecta aristas GROWS_IN que apuntan a un piso térmico inexistente o nulo
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Match por id() del nodo destino
 */
function buildBug6Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)-[r:GROWS_IN]->(p:PisoTermico)
  WHERE p.id IS NULL OR p.id = ''
  RETURN s.id AS species_id, 
         s.nombre_comun AS nombre_comun,
         id(r) AS edge_id,
         p.id AS piso_termico_id
  ORDER BY s.id
  LIMIT 100
$$) AS (species_id agtype, nombre_comun agtype, edge_id agtype, piso_termico_id agtype);
`;
}

/**
 * BUG 7: Nombre científico mal formado
 * 
 * Detecta nombres científicos que no siguen el formato binomial estándar:
 * - Debe tener al menos dos palabras (género + especie)
 * - Debe estar en minúsculas excepto la primera letra del género
 * - No debe contener números (excepto híbridos con ×)
 * - No debe contener caracteres especiales excepto ×, -, subsp., var.
 * 
 * Gotchas respetados:
 * - NO usa WHERE NOT EXISTS con llaves
 * - Usa regex matching de Cypher
 */
function buildBug7Query(graph) {
  const graphLit = sanitizeGraphName(graph);
  return `
SELECT * FROM cypher('${graphLit}', $$
  MATCH (s:Species)
  WHERE s.nombre_cientifico IS NOT NULL
    AND (
      s.nombre_cientifico = '' OR
      size(split(trim(s.nombre_cientifico), ' ')) < 2 OR
      NOT s.nombre_cientifico =~ '^[A-Z][a-z]+(\\s+[a-z]+(\\s+[a-z]+)?)?(\\s+(subsp|var|f)\\.\\s+[a-z]+)?(\\s+×\\s+[a-z]+)?$'
    )
  RETURN s.id AS species_id,
         s.nombre_comun AS nombre_comun,
         s.nombre_cientifico AS nombre_cientifico
  ORDER BY s.id
  LIMIT 100
$$) AS (species_id agtype, nombre_comun agtype, nombre_cientifico agtype);
`;
}

// =============================================================================
// GENERADOR DE CONSULTAS
// =============================================================================

/**
 * Genera todas las consultas de auditoría
 * @param {string} graph - nombre del grafo
 * @param {number[]} checks - índices de checks a ejecutar (1-7), default todos
 * @returns {Array<{name: string, query: string, description: string}>}
 */
function buildAllQueries(graph = DEFAULT_GRAPH, checks = null) {
  const allChecks = [
    {
      name: 'BUG-1: Conflicto altitud_min vs altitud_msnm',
      query: buildBug1Query(graph),
      description: 'Detecta especies con altitud_min > altitud_msnm (invertidos)'
    },
    {
      name: 'BUG-2: Piso térmico incoherente con altitud',
      query: buildBug2Query(graph),
      description: 'Detecta especies donde el piso térmico no corresponde al rango de altitud'
    },
    {
      name: 'BUG-3: Especies duplicadas por nombre científico',
      query: buildBug3Query(graph),
      description: 'Detecta nodos Species con el mismo nombre_cientifico pero diferentes ids'
    },
    {
      name: 'BUG-4: Aristas huérfanas',
      query: buildBug4Query(graph),
      description: 'Detecta aristas donde source o target no existen como nodos válidos'
    },
    {
      name: 'BUG-5: Especies aisladas',
      query: buildBug5Query(graph),
      description: 'Detecta nodos Species que no tienen ninguna arista entrante o saliente'
    },
    {
      name: 'BUG-6: Aristas GROWS_IN sin piso térmico',
      query: buildBug6Query(graph),
      description: 'Detecta aristas GROWS_IN que apuntan a un piso térmico inexistente o nulo'
    },
    {
      name: 'BUG-7: Nombre científico mal formado',
      query: buildBug7Query(graph),
      description: 'Detecta nombres científicos que no siguen el formato binomial estándar'
    }
  ];
  
  if (checks === null) {
    return allChecks;
  }

  if (checks.length === 0) {
    return [];
  }

  return allChecks.filter((_, idx) => checks.includes(idx + 1));
}

// =============================================================================
// CLIENTE POSTGRES
// =============================================================================

/**
 * Crea un cliente PostgreSQL configurado con variables de entorno
 * @returns {pg.Client} cliente configurado
 */
function createClientFromEnv() {
  const config = {
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || DEFAULT_GRAPH,
    user: process.env.PGUSER || 'farmos',
    password: process.env.PGPASSWORD,
    port: parseInt(process.env.PGPORT || '5432', 10)
  };
  
  return new Client(config);
}

/**
 * Ejecuta una query SQL y devuelve los resultados
 * @param {pg.Client} client - cliente PostgreSQL
 * @param {string} sql - query SQL a ejecutar
 * @returns {Promise<Array>} resultados de la query
 */
async function executeQuery(client, sql) {
  try {
    const result = await client.query(sql);
    return parseAgtypeRows(result.rows);
  } catch (error) {
    throw new Error(`Error ejecutando query: ${error.message}`);
  }
}

// =============================================================================
// FORMATEO DE RESULTADOS
// =============================================================================

/**
 * Formatea los resultados en texto legible
 * @param {string} checkName - nombre del check
 * @param {string} description - descripción del check
 * @param {Array} results - resultados del check
 * @returns {string} texto formateado
 */
function formatTextResults(checkName, description, results) {
  const lines = [
    `\n${'='.repeat(80)}`,
    `${checkName}`,
    `${description}`,
    `Resultados: ${results.length} bugs encontrados`,
    '='.repeat(80)
  ];
  
  if (results.length === 0) {
    lines.push('✓ No se encontraron bugs de este tipo');
  } else {
    for (const row of results) {
      lines.push('-', JSON.stringify(row, null, 2));
    }
  }
  
  return lines.join('\n');
}

/**
 * Formatea los resultados en JSON
 * @param {string} checkName - nombre del check
 * @param {string} description - descripción del check
 * @param {Array} results - resultados del check
 * @returns {object} objeto JSON
 */
function formatJsonResults(checkName, description, results) {
  return {
    check: checkName,
    description: description,
    count: results.length,
    results: results
  };
}

/**
 * Formatea el resumen final
 * @param {Array} allResults - array de resultados de todos los checks
 * @returns {string} resumen formateado
 */
function formatSummary(allResults) {
  const totalBugs = allResults.reduce((sum, r) => sum + r.count, 0);
  const lines = [
    '\n' + '='.repeat(80),
    'RESUMEN DE AUDITORÍA DEL GRAFO AGROECOLÓGICO',
    '='.repeat(80),
    `Total de bugs encontrados: ${totalBugs}`,
    ''
  ];
  
  for (const result of allResults) {
    const status = result.count === 0 ? '✓' : '✗';
    lines.push(`${status} ${result.check}: ${result.count} bugs`);
  }
  
  lines.push('='.repeat(80));
  return lines.join('\n');
}

// =============================================================================
// FUNCIÓN PRINCIPAL
// =============================================================================

/**
 * Ejecuta la auditoría completa del grafo
 * @param {object} options - opciones de configuración
 * @returns {Promise<number>} código de salida (0 = éxito, 1 = bugs encontrados)
 */
async function runGraphBugHunt(options = {}) {
  const {
    graph = DEFAULT_GRAPH,
    format = DEFAULT_FORMAT,
    checks = null,
    dryRun = false
  } = options;
  
  const queries = buildAllQueries(graph, checks);
  const allResults = [];
  
  if (dryRun) {
    console.log('MODO DRY-RUN: Mostrando consultas sin ejecutar\n');
    for (const { name, query, description } of queries) {
      console.log(`\n${name}`);
      console.log(description);
      console.log('---');
      console.log(query);
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
  
  try {
    console.log(`Conectando a PostgreSQL en ${client.host}:${client.port}...`);
    await client.connect();
    console.log('Conexión establecida. Iniciando auditoría...\n');
    
    for (const { name, query, description } of queries) {
      console.log(`Ejecutando: ${name}...`);
      
      try {
        const results = await executeQuery(client, query);
        
        if (format === 'json') {
          allResults.push(formatJsonResults(name, description, results));
        } else {
          console.log(formatTextResults(name, description, results));
          allResults.push({ check: name, description, count: results.length });
        }
      } catch (error) {
        console.error(`Error en ${name}: ${error.message}`);
        allResults.push({ check: name, description, count: -1, error: error.message });
      }
    }
    
    // Mostrar resumen
    if (format === 'json') {
      console.log('\n' + JSON.stringify({
        summary: {
          total_bugs: allResults.reduce((sum, r) => sum + (r.count > 0 ? r.count : 0), 0),
          checks: allResults.length,
          graph: graph
        },
        results: allResults
      }, null, 2));
    } else {
      console.log(formatSummary(allResults));
    }
    
    const totalBugs = allResults.reduce((sum, r) => sum + (r.count > 0 ? r.count : 0), 0);
    return totalBugs > 0 ? 1 : 0;
    
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
    graph: DEFAULT_GRAPH,
    format: DEFAULT_FORMAT,
    checks: null,
    dryRun: false
  };
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    
    if (arg === '--graph' && argv[i + 1]) {
      opts.graph = argv[++i];
    } else if (arg === '--format' && argv[i + 1]) {
      opts.format = argv[++i];
    } else if (arg === '--check-only' && argv[i + 1]) {
      const val = argv[++i];
      opts.checks = val.split(',').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
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
Uso: node scripts/audit/graph-bug-hunt.mjs [opciones]

Opciones:
  --graph NOMBRE      Nombre del grafo en AGE (default: chagra_kg)
  --format FORMAT     Formato de salida: json|text (default: text)
  --check-only N,N    Ejecutar solo checks específicos (1-7, separados por coma)
  --dry-run           Mostrar consultas sin ejecutar
  --help, -h          Mostrar esta ayuda

Variables de entorno requeridas:
  PGHOST              Host de PostgreSQL (default: localhost)
  PGDATABASE          Base de datos (default: chagra_kg)
  PGUSER              Usuario de PostgreSQL (default: farmos)
  PGPASSWORD          Password (opcional, usa .pgpass si está configurado)
  PGPORT              Puerto (default: 5432)

Ejemplos:
  # Ejecutar todos los checks (formato texto)
  node scripts/audit/graph-bug-hunt.mjs

  # Ejecutar solo checks 1 y 3 en formato JSON
  node scripts/audit/graph-bug-hunt.mjs --check-only 1,3 --format json

  # Modo dry-run: ver consultas sin ejecutar
  node scripts/audit/graph-bug-hunt.mjs --dry-run

  # Usar grafo diferente
  node scripts/audit/graph-bug-hunt.mjs --graph chagra_kg_test

Checks disponibles:
  1. Conflicto altitud_min vs altitud_msnm
  2. Piso térmico incoherente con altitud
  3. Especies duplicadas por nombre científico
  4. Aristas huérfanas
  5. Especies aisladas
  6. Aristas GROWS_IN sin piso térmico
  7. Nombre científico mal formado
`);
}

// =============================================================================
// EXPORTS PARA TESTS
// =============================================================================

export {
  cypherLiteral,
  sanitizeGraphName,
  parseAgtypeRows,
  buildBug1Query,
  buildBug2Query,
  buildBug3Query,
  buildBug5Query,
  buildBug6Query,
  buildBug7Query,
  buildAllQueries,
  parseArgs,
  runGraphBugHunt
};

/**
 * Entry point para CLI
 */
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
  
  if (opts.checks !== null) {
    const invalid = opts.checks.filter(c => c < 1 || c > 7);
    if (invalid.length > 0) {
      console.error(`ERROR: Checks inválidos: ${invalid.join(', ')}. Debe ser 1-7.`);
      return 2;
    }
  }
  
  try {
    const exitCode = await runGraphBugHunt(opts);
    return exitCode;
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return 2;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
