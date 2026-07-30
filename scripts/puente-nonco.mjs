#!/usr/bin/env node
/**
 * scripts/puente-nonco.mjs
 *
 * Tiende puentes CO_RELEVANT entre NoncoPest y Pest para que el agente
 * pueda alcanzar los 423 nodos de control biológico que hoy están inalcanzables.
 *
 * Problema (2026-07-15):
 * - 72 de 114 NoncoPest no tienen puente CO_RELEVANT a un Pest real
 * - Las tools del agente solo consultan Pest/Species, no NoncoPest
 * - 423 nodos de control biológico (NoncoControl + NoncoBiopreparado) son inalcanzables
 *
 * Solución:
 * 1. Emparejar por binomio científico exacto (caso seguro, confianza alta)
 * 2. Emparejar por género (confianza media)
 * 3. Emparejar por sinónimos taxonómicos (confianza media/baja)
 * 4. Lo que no case con evidencia se DEJA sin puente (más seguro no tener puente que uno falso)
 *
 * Uso:
 *   node scripts/puente-nonco.mjs                    # dry-run (default)
 *   node scripts/puente-nonco.mjs --dry-run          # explícito
 *   node scripts/puente-nonco.mjs --write            # aplicar a DB (requiere --backup confirmado)
 *   node scripts/puente-nonco.mjs --out puente.sql   # escribir SQL a archivo
 *
 * Reglas:
 * - --dry-run primero, siempre
 * - Backup antes del --write: pg_dump de chagra_kg a ~/backups/
 * - No inventes correspondencias
 * - Cada puente lleva: metodo, confianza, provenance
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const GRAPH = 'chagra_kg';
const PROVENANCE = 'puente-nonco-2026-07-15';

// =============================================================================
// Conexión AGE (desde snapshot-grafo-crecimiento.mjs)
// =============================================================================

export function buildPsqlInvocation(env = process.env) {
  const host = env.PGHOST || '127.0.0.1';
  const port = env.PGPORT || '5432';
  const user = env.PGUSER || 'farmos';
  const db = env.PGDATABASE || GRAPH;
  const psqlArgs = [
    '-h', host, '-p', port, '-U', user, '-d', db,
    '-t', '-A', '-F', '|', '-f', '-',
  ];
  if (env.PSQL_WRAP === 'none') {
    return { file: 'psql', args: psqlArgs };
  }
  const inner = ['psql', ...psqlArgs.map((a) => (a === '|' ? "'|'" : a))].join(' ');
  return { file: 'nix-shell', args: ['-p', 'postgresql', '--run', inner] };
}

export function runSql(sql, env = process.env) {
  const { file, args } = buildPsqlInvocation(env);
  const childEnv = { ...env };
  if (!childEnv.PGPASSWORD) {
    throw new Error(
      'Falta PGPASSWORD en el entorno. Exportala antes de correr este script.'
    );
  }
  const out = execFileSync(file, args, {
    input: sql,
    encoding: 'utf-8',
    maxBuffer: 64 * 1024 * 1024,
    env: childEnv,
  });
  return out;
}

const PREAMBLE = "LOAD 'age';\nSET search_path = ag_catalog, public;\n";

// =============================================================================
// Queries al grafo
// =============================================================================

/**
 * Obtiene todos los NoncoPest sin puente CO_RELEVANT a un Pest.
 */
/**
 * Parsea la salida agtype de AGE en nodos PLANOS para los matchers.
 * AGE devuelve `{"id": <graphid>, "label": "...", "properties": {...}}::vertex`.
 * - Hay que quitar el sufijo `::vertex` ANTES de JSON.parse (rompe el parse).
 * - Se aplana: props al top-level, `id` = graphid interno (para id(a)= en el MERGE),
 *   `slug` = el id de negocio (props.id) para los reportes legibles.
 */
function parseVertices(out) {
  return out
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== 'v')
    .map(l => {
      const jsonPart = l.replace(/::(vertex|edge|path)\s*$/, '');
      try {
        const node = JSON.parse(jsonPart);
        const props = node.properties || {};
        return { ...props, id: node.id, slug: props.id };
      } catch {
        return null;
      }
    })
    .filter(n => n !== null);
}

function getNoncoPestSinPuente(env) {
  // AGE 1.5.0 NO soporta `WHERE NOT EXISTS { ... }` (subquery con llaves).
  // Patrón equivalente compatible: OPTIONAL MATCH + count(r)=0.
  const sql = PREAMBLE + `
SELECT * FROM cypher('${GRAPH}', $$
  MATCH (n:NoncoPest)
  OPTIONAL MATCH (n)-[r:CO_RELEVANT]->(:Pest)
  WITH n, count(r) AS c
  WHERE c = 0
  RETURN n
$$) AS (v agtype);
`;
  return parseVertices(runSql(sql, env));
}

/**
 * Obtiene todos los Pest del grafo con sus propiedades relevantes.
 */
function getAllPests(env) {
  const sql = PREAMBLE + `
SELECT * FROM cypher('${GRAPH}', $$
  MATCH (p:Pest)
  RETURN p
$$) AS (v agtype);
`;
  return parseVertices(runSql(sql, env));
}

/**
 * Obtiene el mapa de sinonimos de plagas desde grafo-relations.json.
 */
function getPestSynonyms() {
  const grafoRelations = JSON.parse(
    readFileSync(resolve(process.cwd(), 'public/grafo-relations.json'), 'utf8')
  );
  return grafoRelations._pest_synonyms || {};
}

// =============================================================================
// Emparejamiento
// =============================================================================

/**
 * Normaliza un binomio científico para comparación.
 */
function normalizeBinomio(binomio) {
  if (!binomio) return null;
  return String(binomio)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Extrae el género de un binomio científico.
 */
function extractGenus(binomio) {
  if (!binomio) return null;
  const parts = binomio.trim().split(/\s+/);
  return parts[0]?.toLowerCase() || null;
}

/**
 * Empareja NoncoPest con Pest por binomio científico exacto.
 */
function matchByBinomioExacto(noncoPest, allPests) {
  const matches = [];
  const noncoBinomio = normalizeBinomio(noncoPest.nombre_cientifico || noncoPest.binomio);
  
  if (!noncoBinomio) return matches;

  for (const pest of allPests) {
    const pestBinomio = normalizeBinomio(pest.nombre_cientifico || pest.binomio);
    if (!pestBinomio) continue;

    if (noncoBinomio === pestBinomio) {
      matches.push({
        noncoPest: noncoPest.id,
        pest: pest.id,
        metodo: 'binomio_exacto',
        confianza: 1.0,
        razon: `Binomio científico idéntico: ${noncoBinomio}`,
      });
    }
  }

  return matches;
}

/**
 * Empareja NoncoPest con Pest por género.
 */
function matchByGenero(noncoPest, allPests) {
  const matches = [];
  const noncoGenus = extractGenus(noncoPest.nombre_cientifico || noncoPest.binomio);
  
  if (!noncoGenus) return matches;

  for (const pest of allPests) {
    const pestGenus = extractGenus(pest.nombre_cientifico || pest.binomio);
    if (!pestGenus) continue;

    if (noncoGenus === pestGenus) {
      // Solo match si el NoncoPest tiene "sp." o similar
      const noncoBinomio = normalizeBinomio(noncoPest.nombre_cientifico || noncoPest.binomio);
      if (noncoBinomio?.includes('sp.') || noncoBinomio?.includes('sp')) {
        matches.push({
          noncoPest: noncoPest.id,
          pest: pest.id,
          metodo: 'genero',
          confianza: 0.6,
          razon: `Mismo género (${noncoGenus}) pero NoncoPest es sp. (coincidencia parcial)`,
        });
      }
    }
  }

  return matches;
}

/**
 * Empareja NoncoPest con Pest por sinónimos taxonómicos.
 */
function matchBySinonimos(noncoPest, allPests, pestSynonyms) {
  const matches = [];
  const noncoNombre = (noncoPest.nombre || '').toLowerCase().trim();
  const noncoBinomio = normalizeBinomio(noncoPest.nombre_cientifico || noncoPest.binomio);
  
  if (!noncoNombre && !noncoBinomio) return matches;

  for (const pest of allPests) {
    const pestNombre = (pest.nombre || '').toLowerCase().trim();
    const pestBinomio = normalizeBinomio(pest.nombre_cientifico || pest.binomio);

    // Buscar si hay sinonimo que conecte
    for (const [synonym, canonical] of Object.entries(pestSynonyms)) {
      const synLower = synonym.toLowerCase();
      
      // Si el NoncoPest coincide con un sinonimo del Pest
      if (noncoNombre === synLower || noncoBinomio === synLower) {
        matches.push({
          noncoPest: noncoPest.id,
          pest: pest.id,
          metodo: 'sinonimo',
          confianza: 0.7,
          razon: `NoncoPest coincide con sinónimo "${synonym}" de ${canonical}`,
        });
      }
      
      // Si el Pest coincide con un sinonimo del NoncoPest
      if (pestNombre === synLower || pestBinomio === synLower) {
        matches.push({
          noncoPest: noncoPest.id,
          pest: pest.id,
          metodo: 'sinonimo',
          confianza: 0.7,
          razon: `Pest coincide con sinónimo "${synonym}" de ${canonical}`,
        });
      }
    }
  }

  return matches;
}

// =============================================================================
// Generación de SQL
// =============================================================================

/**
 * Genera un MERGE para crear un puente CO_RELEVANT.
 */
function emitCoRelevantRel(fromId, toId, metodo, confianza, razon, createdAt = new Date().toISOString()) {
  // AGE 1.5.0: los NoncoPest/Pest se emparejan por su id INTERNO (id(a)=<graphid>),
  // NO por una propiedad `id`. Cada valor va con su tipo: strings escapadas y entre
  // comillas, números crudos. Se evita `SET r += {map}` (soporte dudoso) usando SET
  // explícito por propiedad. created_at se pasa como arg para no depender de reloj.
  // La barra invertida se escapa PRIMERO: escapar solo la comilla dejaba que un
  // valor terminado en `\` se comiera la comilla de cierre y siguiera como Cypher
  // ejecutable (CodeQL js/incomplete-sanitization, high).
  const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const setClauses = [
    `r.metodo = ${q(metodo)}`,
    `r.confianza = ${Number(confianza)}`,
    `r.razon = ${q(razon)}`,
    `r.created_at = ${q(createdAt)}`,
  ].join(', ');

  return `
MATCH (a:NoncoPest), (b:Pest)
WHERE id(a) = ${fromId} AND id(b) = ${toId}
MERGE (a)-[r:CO_RELEVANT {provenance: '${PROVENANCE}'}]->(b)
SET ${setClauses}
RETURN id(r)
`;
}

/**
 * Envuelve un Cypher en SELECT * FROM cypher(...).
 */
function wrapCypher(cypher) {
  return `SELECT * FROM cypher('${GRAPH}', $$\n  ${cypher}\n$$) AS (v agtype);`;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = !argv.includes('--write');
  const outIdx = argv.indexOf('--out');
  const outPath = outIdx !== -1 && argv[outIdx + 1] ? resolve(process.cwd(), argv[outIdx + 1]) : null;

  console.error('[puente-nonco] Iniciando...');
  console.error('[puente-nonco] Modo:', dryRun ? 'DRY-RUN (no se escribirá a DB)' : 'WRITE (se escribirá a DB)');
  
  if (!dryRun) {
    console.error('[puente-nonco] ⚠️  WARNING: --write requiere backup previo de chagra_kg');
    console.error('[puente-nonco] ⚠️  Ejecuta: pg_dump -U farmos -d chagra_kg > ~/backups/chagra_kg-before-puente-nonco.sql');
  }

  try {
    // 1. Obtener datos del grafo
    console.error('[puente-nonco] Obteniendo NoncoPest sin puente...');
    const noncoPestSinPuente = getNoncoPestSinPuente();
    console.error(`[puente-nonco]   ${noncoPestSinPuente.length} NoncoPest sin puente CO_RELEVANT`);

    console.error('[puente-nonco] Obteniendo todos los Pest...');
    const allPests = getAllPests();
    console.error(`[puente-nonco]   ${allPests.length} Pest en el grafo`);

    console.error('[puente-nonco] Cargando sinónimos taxonómicos...');
    const pestSynonyms = getPestSynonyms();
    console.error(`[puente-nonco]   ${Object.keys(pestSynonyms).length} sinónimos cargados`);

    // 2. Emparejar
    console.error('[puente-nonco] Emparejando por binomio exacto...');
    const matchesByBinomio = [];
    const matchesByGenero = [];
    const matchesBySinonimos = [];
    const noncoPestNoCasados = [];

    for (const noncoPest of noncoPestSinPuente) {
      const binomioMatches = matchByBinomioExacto(noncoPest, allPests);
      const generoMatches = matchByGenero(noncoPest, allPests);
      const sinonimoMatches = matchBySinonimos(noncoPest, allPests, pestSynonyms);

      if (binomioMatches.length > 0) {
        matchesByBinomio.push(...binomioMatches);
      } else if (generoMatches.length > 0) {
        matchesByGenero.push(...generoMatches);
      } else if (sinonimoMatches.length > 0) {
        matchesBySinonimos.push(...sinonimoMatches);
      } else {
        noncoPestNoCasados.push(noncoPest);
      }
    }

    console.error(`[puente-nonco]   ${matchesByBinomio.length} matches por binomio exacto`);
    console.error(`[puente-nonco]   ${matchesByGenero.length} matches por género`);
    console.error(`[puente-nonco]   ${matchesBySinonimos.length} matches por sinónimos`);
    console.error(`[puente-nonco]   ${noncoPestNoCasados.length} NoncoPest sin casar`);

    // 3. Generar SQL
    console.error('[puente-nonco] Generando SQL...');
    const sqlStatements = [];

    for (const match of matchesByBinomio) {
      const cypher = emitCoRelevantRel(
        match.noncoPest,
        match.pest,
        match.metodo,
        match.confianza,
        match.razon
      );
      sqlStatements.push(wrapCypher(cypher));
    }

    for (const match of matchesByGenero) {
      const cypher = emitCoRelevantRel(
        match.noncoPest,
        match.pest,
        match.metodo,
        match.confianza,
        match.razon
      );
      sqlStatements.push(wrapCypher(cypher));
    }

    // ⚠️ matchBySinonimos tiene un bug de lógica: la rama `pestNombre === synLower`
    // no involucra al NoncoPest actual → puentea a TODO Pest cuyo nombre sea sinónimo
    // (explosión cartesiana: 2053 falsos positivos para 75 NoncoPest). Se DESACTIVA por
    // defecto hasta arreglar el matcher (canonicalizar ambos lados y comparar canónicos).
    // Habilitar solo con --incluir-sinonimos-ROTO para inspección.
    if (argv.includes('--incluir-sinonimos-ROTO')) {
      for (const match of matchesBySinonimos) {
        const cypher = emitCoRelevantRel(
          match.noncoPest,
          match.pest,
          match.metodo,
          match.confianza,
          match.razon
        );
        sqlStatements.push(wrapCypher(cypher));
      }
    } else if (matchesBySinonimos.length > 0) {
      console.error(`[puente-nonco] ⚠️  ${matchesBySinonimos.length} matches por sinónimos OMITIDOS (matcher con bug de explosión cartesiana — pendiente de arreglo).`);
    }

    const sql = `${PREAMBLE}\n${sqlStatements.join('\n')}`;

    // 4. Salida
    if (outPath) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, sql, 'utf8');
      console.error(`[puente-nonco] SQL escrito a: ${outPath}`);
    } else {
      console.log(sql);
    }

    // 5. Resumen
    console.error('\n=== RESUMEN ===');
    console.error(`NoncoPest sin puente: ${noncoPestSinPuente.length}`);
    console.error(`Matches por binomio exacto: ${matchesByBinomio.length} (confianza 1.0)`);
    console.error(`Matches por género: ${matchesByGenero.length} (confianza 0.6)`);
    console.error(`Matches por sinónimos: ${matchesBySinonimos.length} (confianza 0.7)`);
    console.error(`Total puentes a crear: ${sqlStatements.length}`);
    console.error(`NoncoPest sin casar: ${noncoPestNoCasados.length}`);

    if (noncoPestNoCasados.length > 0) {
      console.error('\n=== NoncoPest SIN CASAR (requieren curaduría manual) ===');
      for (const np of noncoPestNoCasados) {
        console.error(`  - ${np.id}: ${np.nombre || np.nombre_cientifico || '(sin nombre)'}`);
      }
    }

    if (!dryRun) {
      console.error('\n⚠️  Modo WRITE: SQL se ejecutará contra la base de datos');
      console.error('⚠️  Asegúrate de haber hecho backup antes de proceder');
      // Aquí se podría agregar la ejecución real si se confirma el backup
    }

  } catch (error) {
    console.error('[puente-nonco] ERROR:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
