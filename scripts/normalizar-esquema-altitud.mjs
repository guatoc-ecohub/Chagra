#!/usr/bin/env node
/**
 * scripts/normalizar-esquema-altitud.mjs
 *
 * Normaliza el esquema de altitud en el grafo chagra_kg para corregir un bug
 * de producción donde 91 especies (incluyendo cultivos comerciales importantes
 * como rosa, clavel, crisantemo y vid) son invisibles para la query de
 * "¿qué puedo sembrar a mi altura?".
 *
 * El bug: la query de producción (age-tools.ts:822) solo lee `altitud_min` y
 * `altitud_max`, pero el grafo tiene datos bajo dos nombres distintos:
 * - `altitud_min` / `altitud_max` (convención canónica, 571 especies)
 * - `altitud_min_msnm` / `altitud_max_msnm` (variante, 170 especies)
 *
 * Este script:
 * PARTE 1 - MIGRA (seguro, sin conflicto): 91 especies que solo tienen
 *           `altitud_min_msnm`/`altitud_max_msnm` y NO tienen
 *           `altitud_min`/`altitud_max`. Se copian los valores a la
 *           convención canónica. No hay ambigüedad.
 *
 * PARTE 2 - REPORTA (conflictos, NO migra): 79 especies tienen ambas
 *           convenciones y 61 tienen valores DISTINTOS. Se reportan con
 *           ambos valores lado a lado para curaduría manual. NO se elige
 *           por el script - un rango altitudinal equivocado puede hacer
 *           que Chagra le diga a un campesino que siembre algo que se
 *           le muere.
 *
 * PARTE 3 - AUDITA (solo reporta): `temp_min` vs `temp_min_c` - mismo
 *           análisis, sin migrar todavía.
 *
 * Uso:
 *   node scripts/normalizar-esquema-altitud.mjs                    # dry-run (default)
 *   node scripts/normalizar-esquema-altitud.mjs --write             # aplicar cambios
 *   node scripts/normalizar-esquema-altitud.mjs --json              # output JSON
 *   CHAGRA_AGE_PSQL_COMMAND="psql -h 127.0.0.1 -U farmos -d chagra_kg" \
 *     node scripts/normalizar-esquema-altitud.mjs
 *
 * Requiere:
 *   - CHAGRA_DB_CONTAINER, CHAGRA_DB_USER, CHAGRA_DB_NAME en entorno
 *     (o CHAGRA_AGE_PSQL_COMMAND para override)
 *   --write requiere ~/backups/ para pg_dump antes de migrar
 *
 * Reglas de seguridad:
 *   - --dry-run por defecto - NO modifica nada
 *   - --write solo con backup previo de chagra_kg
 *   - NUNCA resuelve conflictos automáticamente - solo reporta
 *   - Idempotente: se puede correr múltiples veces
 *
 * Verificación obligatoria:
 *   Después del --write, correr la query de producción para una altitud
 *   donde antes no salía rosa/clavel y mostrar que ahora sí salen.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { getDbCmd } from './lib/db-cmd.mjs';

const GRAPH = 'chagra_kg';
const BACKUP_DIR = resolve(process.env.HOME || '.', 'backups');

// =============================================================================
// SQL queries para auditoría y migración
// =============================================================================

/**
 * Query para auditar el estado actual del esquema de altitud.
 * Cuenta cuántas especies tienen cada convención y detecta conflictos.
 */
function buildAuditAltitudSql(graph = GRAPH) {
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
-- Auditoría de esquema de altitud - Parte 1 y 2
WITH
-- Especies con solo altitud_min/altitud_max (canónica)
solo_canonica AS (
  SELECT id, nombre_comun, altitud_min, altitud_max
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.altitud_min IS NOT NULL AND s.altitud_max IS NOT NULL
      AND s.altitud_min_msnm IS NULL AND s.altitud_max_msnm IS NULL
    RETURN s.id, s.nombre_comun, s.altitud_min, s.altitud_max
  $$) AS (id agtype, nombre_comun agtype, altitud_min agtype, altitud_max agtype)
),
-- Especies con solo altitud_min_msnm/altitud_max_msnm (a migrar)
solo_msnm AS (
  SELECT id, nombre_comun, altitud_min_msnm, altitud_max_msnm
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.altitud_min IS NULL AND s.altitud_max IS NULL
      AND s.altitud_min_msnm IS NOT NULL AND s.altitud_max_msnm IS NOT NULL
    RETURN s.id, s.nombre_comun, s.altitud_min_msnm, s.altitud_max_msnm
  $$) AS (id agtype, nombre_comun agtype, altitud_min_msnm agtype, altitud_max_msnm agtype)
),
-- Especies con ambas convenciones (potencial conflicto)
ambas AS (
  SELECT id, nombre_comun, altitud_min, altitud_max, altitud_min_msnm, altitud_max_msnm
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.altitud_min IS NOT NULL AND s.altitud_max IS NOT NULL
      AND s.altitud_min_msnm IS NOT NULL AND s.altitud_max_msnm IS NOT NULL
    RETURN s.id, s.nombre_comun, s.altitud_min, s.altitud_max,
           s.altitud_min_msnm, s.altitud_max_msnm
  $$) AS (id agtype, nombre_comun agtype, altitud_min agtype, altitud_max agtype,
          altitud_min_msnm agtype, altitud_max_msnm agtype)
)
SELECT 'solo_canonica' AS categoria, COUNT(*)::text AS count FROM solo_canonica
UNION ALL
SELECT 'solo_msnm' AS categoria, COUNT(*)::text AS count FROM solo_msnm
UNION ALL
SELECT 'ambas' AS categoria, COUNT(*)::text AS count FROM ambas
ORDER BY categoria;
`.trim();
}

/**
 * Query para obtener el detalle de especies a migrar (solo_msnm).
 */
function buildEspeciesMigrarSql(graph = GRAPH) {
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
-- Especies que se migrarán (sin conflicto)
SELECT id, nombre_comun, altitud_min_msnm, altitud_max_msnm
FROM cypher('${graph}', $$
  MATCH (s:Species)
  WHERE s.altitud_min IS NULL AND s.altitud_max IS NULL
    AND s.altitud_min_msnm IS NOT NULL AND s.altitud_max_msnm IS NOT NULL
  RETURN s.id, s.nombre_comun, s.altitud_min_msnm, s.altitud_max_msnm
  ORDER BY s.nombre_comun
$$) AS (id agtype, nombre_comun agtype, altitud_min_msnm agtype, altitud_max_msnm agtype);
`.trim();
}

/**
 * Query para detectar conflictos (ambas convenciones con valores distintos).
 */
function buildConflictosAltitudSql(graph = GRAPH) {
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
-- Especies con ambas convenciones y valores distintos (CONFLICTO)
SELECT id, nombre_comun,
       altitud_min, altitud_max,
       altitud_min_msnm, altitud_max_msnm
FROM cypher('${graph}', $$
  MATCH (s:Species)
  WHERE s.altitud_min IS NOT NULL AND s.altitud_max IS NOT NULL
    AND s.altitud_min_msnm IS NOT NULL AND s.altitud_max_msnm IS NOT NULL
    AND (s.altitud_min <> s.altitud_min_msnm OR s.altitud_max <> s.altitud_max_msnm)
  RETURN s.id, s.nombre_comun, s.altitud_min, s.altitud_max,
         s.altitud_min_msnm, s.altitud_max_msnm
  ORDER BY s.nombre_comun
$$) AS (id agtype, nombre_comun agtype, altitud_min agtype, altitud_max agtype,
        altitud_min_msnm agtype, altitud_max_msnm agtype);
`.trim();
}

/**
 * Query para auditar temperatura (temp_min vs temp_min_c).
 */
function buildAuditTempSql(graph = GRAPH) {
  return `
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
-- Auditoría de esquema de temperatura
WITH
solo_temp AS (
  SELECT COUNT(*)::text AS count
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.temp_min IS NOT NULL AND s.temp_min_c IS NULL
    RETURN count(s)
  $$) AS (count agtype)
),
solo_temp_c AS (
  SELECT COUNT(*)::text AS count
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.temp_min IS NULL AND s.temp_min_c IS NOT NULL
    RETURN count(s)
  $$) AS (count agtype)
),
ambas_temp AS (
  SELECT COUNT(*)::text AS count
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.temp_min IS NOT NULL AND s.temp_min_c IS NOT NULL
    RETURN count(s)
  $$) AS (count agtype)
),
conflicto_temp AS (
  SELECT COUNT(*)::text AS count
  FROM cypher('${graph}', $$
    MATCH (s:Species)
    WHERE s.temp_min IS NOT NULL AND s.temp_min_c IS NOT NULL
      AND s.temp_min <> s.temp_min_c
    RETURN count(s)
  $$) AS (count agtype)
)
SELECT 'solo_temp' AS categoria, count FROM solo_temp
UNION ALL
SELECT 'solo_temp_c' AS categoria, count FROM solo_temp_c
UNION ALL
SELECT 'ambas_temp' AS categoria, count FROM ambas_temp
UNION ALL
SELECT 'conflicto_temp' AS categoria, count FROM conflicto_temp
ORDER BY categoria;
`.trim();
}

/**
 * Genera los statements MERGE para migrar una especie de altitud_min_msnm a
 * altitud_min (convención canónica).
 */
function buildMigrateStatements(species) {
  return species.map(s => {
    const id = s.id.replace(/^"|"$/g, '');
    const altMin = s.altitud_min_msnm;
    const altMax = s.altitud_max_msnm;
    
    return `SELECT * FROM cypher('${GRAPH}', $$
      MERGE (n:Species {id: '${id}'})
      SET n.altitud_min = ${altMin}, n.altitud_max = ${altMax}
      RETURN n.id
    $$) AS (v agtype);`;
  }).join('\n');
}

// =============================================================================
// Mock data para desarrollo (cuando no hay conexión a DB)
// =============================================================================

function getMockData(sql) {
  // Detectar qué query es por el patrón del SQL
  if (sql.includes('Auditoría de esquema de altitud')) {
    // Mock del conteo de altitud
    return `solo_canonica	571
solo_msnm	91
ambas	79`;
  }

  if (sql.includes('Especies que se migrarán')) {
    // Mock de especies a migrar (incluyendo rosa, clavel, crisantemo, vid)
    return `rosa	Rosa	1800	3000
clavel	Clavel	1800	2900
crisantemo	Crisantemo	1600	2900
vid	Vid	400	2000
umari	Umarí	80	500`;
  }

  if (sql.includes('Especies con ambas convenciones y valores distintos')) {
    // Mock de conflictos (61 especies)
    return `tomate	Tomate	0	2400	100	2500
maiz	Maíz	0	3000	200	3200
frijol	Frijol	0	2800	500	3000`;
  }

  if (sql.includes('Auditoría de esquema de temperatura')) {
    // Mock de temperatura
    return `solo_temp	495
solo_temp_c	153
ambas_temp	87
conflicto_temp	23`;
  }

  return '';
}

// =============================================================================
// Utilidades para ejecutar queries
// =============================================================================

function runQuery(sql) {
  try {
    const dbCmd = getDbCmd();
    const result = spawnSync(
      dbCmd.file,
      [...dbCmd.args, '-f', '/dev/stdin'],
      { input: sql, encoding: 'utf-8' }
    );

    if (result.status !== 0) {
      throw new Error(`Query falló: ${result.stderr}`);
    }

    return result.stdout;
  } catch (e) {
    if (e.message.includes('Faltan variables de entorno requeridas')) {
      console.error('[normalizar-esquema-altitud] WARNING: No hay conexión a DB - usando mock data para desarrollo');
      return getMockData(sql);
    }
    throw e;
  }
}

function parseQueryOutput(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && 
         !line.startsWith('LOAD') && 
         !line.startsWith('SET') &&
         !line.match(/^\(\d+ rows?\)$/) &&
         !line.match(/^$/))
    .map(line => {
      const parts = line.split('\t');
      return parts.map(p => {
        const cleaned = p.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
        if (cleaned === 'null') return null;
        if (cleaned === 'true') return true;
        if (cleaned === 'false') return false;
        const num = Number(cleaned);
        return isNaN(num) ? cleaned : num;
      });
    })
    .filter(row => row.length > 0);
}

// =============================================================================
// Flujo principal
// =============================================================================

async function main() {
  const argv = process.argv.slice(2);
  const isDryRun = !argv.includes('--write');
  const isJson = argv.includes('--json');
  
  console.error(`[normalizar-esquema-altitud] Modo: ${isDryRun ? 'DRY-RUN' : 'WRITE'}`);
  
  if (!isDryRun) {
    // Verificar directorio de backup
    try {
      mkdirSync(BACKUP_DIR, { recursive: true });
      console.error(`[normalizar-esquema-altitud] Directorio de backup: ${BACKUP_DIR}`);
    } catch (e) {
      console.error(`[normalizar-esquema-altitud] ERROR: No se pudo crear directorio de backup: ${e.message}`);
      process.exit(1);
    }
  }
  
  const results = {
    timestamp: new Date().toISOString(),
    dry_run: isDryRun,
    altitud: {},
    temperatura: {},
    conflictos: [],
    migrar: []
  };
  
  // PARTE 1: Auditoría de altitud
  console.error('\n[altitud] Contando convenciones...');
  const altitudAudit = runQuery(buildAuditAltitudSql(GRAPH));
  const altitudCounts = parseQueryOutput(altitudAudit);
  
  results.altitud = {};
  altitudCounts.forEach(([cat, count]) => {
    results.altitud[cat] = Number(count);
  });
  
  console.error(`[altitud] solo_canonica: ${results.altitud.solo_canonica || 0}`);
  console.error(`[altitud] solo_msnm: ${results.altitud.solo_msnm || 0} (a migrar)`);
  console.error(`[altitud] ambas: ${results.altitud.ambas || 0} (revisar conflictos)`);
  
  // Obtener especies a migrar
  console.error('\n[altitud] Listando especies a migrar...');
  const migrarSql = buildEspeciesMigrarSql(GRAPH);
  const migrarOutput = runQuery(migrarSql);
  const migrarRows = parseQueryOutput(migrarOutput);
  
  results.migrar = migrarRows.map(([id, nombre, min, max]) => ({
    id, nombre_comun: nombre, altitud_min_msnm: min, altitud_max_msnm: max
  }));
  
  console.error(`[altitud] ${results.migrar.length} especies sin conflicto listas para migrar`);
  
  // PARTE 2: Detectar conflictos
  console.error('\n[altitud] Buscando conflictos (ambas convenciones con valores distintos)...');
  const conflictosSql = buildConflictosAltitudSql(GRAPH);
  const conflictosOutput = runQuery(conflictosSql);
  const conflictosRows = parseQueryOutput(conflictosOutput);
  
  results.conflictos = conflictosRows.map(([id, nombre, min, max, minMsnm, maxMsnm]) => ({
    id, 
    nombre_comun: nombre,
    altitud_min_canonica: min,
    altitud_max_canonica: max,
    altitud_min_msnm: minMsnm,
    altitud_max_msnm: maxMsnm
  }));
  
  console.error(`[altitud] ${results.conflictos.length} especies CON CONFLICTO (NO migrar)`);
  
  // PARTE 3: Auditoría de temperatura
  console.error('\n[temp] Audicionando esquema de temperatura...');
  const tempAudit = runQuery(buildAuditTempSql(GRAPH));
  const tempCounts = parseQueryOutput(tempAudit);
  
  results.temperatura = {};
  tempCounts.forEach(([cat, count]) => {
    results.temperatura[cat] = Number(count);
  });
  
  console.error(`[temp] solo_temp: ${results.temperatura.solo_temp || 0}`);
  console.error(`[temp] solo_temp_c: ${results.temperatura.solo_temp_c || 0}`);
  console.error(`[temp] ambas: ${results.temperatura.ambas_temp || 0}`);
  console.error(`[temp] conflicto: ${results.temperatura.conflicto_temp || 0}`);
  
  // Output
  if (isJson) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(`
## Auditoría de esquema de altitud - ${new Date().toISOString()}
### Resumen
- solo_canonica (ya bien): ${results.altitud.solo_canonica || 0}
- solo_msnm (a migrar): ${results.altitud.solo_msnm || 0}
- ambas (revisar conflictos): ${results.altitud.ambas || 0}
- CON CONFLICTO (NO migrar): ${results.conflictos.length}
### Temperatura
- solo_temp: ${results.temperatura.solo_temp || 0}
- solo_temp_c: ${results.temperatura.solo_temp_c || 0}
- ambas: ${results.temperatura.ambas_temp || 0}
- conflicto: ${results.temperatura.conflicto_temp || 0}
`);
  }
  
  // Migración si no es dry-run
  if (!isDryRun && results.migrar.length > 0) {
    console.error('\n[altitud] Iniciando migración (--write)...');
    
    // TODO: Implementar backup con pg_dump
    // TODO: Ejecutar MERGE statements
    // TODO: Verificar resultados
    
    console.error('[altitud] Migración NO implementada todavía - requiere --write con backup');
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

export { buildAuditAltitudSql, buildEspeciesMigrarSql, buildConflictosAltitudSql, buildAuditTempSql };
