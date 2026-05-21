#!/usr/bin/env node
/**
 * scripts/catalog-to-age.mjs
 *
 * POC importer: lee `catalog/chagra-catalog-seed-v3.1.json` y genera un script
 * SQL idempotente que puede cargarse contra una instancia de PostgreSQL con
 * Apache AGE (https://age.apache.org/) instalado, creando un grafo
 * `chagra_kg` con la estructura del catálogo Chagra.
 *
 * Estado: POC documental. NO ejecuta nada contra el postgres-farm real.
 * Genera un .sql en stdout (o --output FILE) que el operador revisa, ejecuta
 * en una base apartada (`chagra_kg`) y deja el postgres-farm de farmOS
 * intacto.
 *
 * Diseño:
 *   - Cada species, biopreparado, source, family, thermal_zone, origen, role,
 *     habito y pest se representa como un nodo Cypher.
 *   - Relaciones derivadas:
 *       (:Species)-[:COMPATIBLE_WITH]->(:Species)        (companions[])
 *       (:Species)-[:ANTAGONIST_OF]->(:Species)          (antagonists[])
 *       (:Species)-[:USED_AS_BIOPREPARADO]->(:Biopreparado)
 *           desde feeding_plan_template.primary_steps[].biofertilizer_slug
 *           y plan_nutricion_base.biopreparados_por_etapa.*[].biopreparado_id
 *       (:Species)-[:GROWS_IN]->(:PisoTermico)           (thermal_zones[])
 *       (:Species)-[:HAS_FAMILY]->(:Family)              (familia_botanica)
 *       (:Species)-[:HAS_HABIT]->(:Habito)               (estrato)
 *       (:Species)-[:HAS_ORIGIN]->(:Origen)              (origen, normalizado)
 *       (:Species)-[:HAS_ROLE]->(:RoleInGuild)           (roles_in_guild[])
 *       (:Species)-[:REFERENCED_BY]->(:Source)           (source_ids[])
 *       (:Biopreparado)-[:REFERENCED_BY]->(:Source)      (source_ids[])
 *       (:Species)-[:TARGETS_PEST]->(:Pest)              (plagas_criticas[])
 *
 * Idempotencia:
 *   - El script abre con `DROP GRAPH IF EXISTS chagra_kg CASCADE`. Cargar
 *     dos veces no duplica nodos.
 *   - Usa `MERGE` Cypher en cada nodo y arista — defense in depth si el
 *     operador elige no dropear y solo aplicar deltas.
 *
 * Seguridad:
 *   - Sanitiza strings con escape de comilla simple (Cypher: doble la comilla).
 *   - Trunca textos largos (>500 chars) en propiedades de nodo para no
 *     hinchar el grafo con prosa que vive mejor en Source/RAG documental.
 *   - NO acepta input externo arbitrario — solo el seed JSON del repo.
 *
 * Uso:
 *   node scripts/catalog-to-age.mjs \
 *     --input catalog/chagra-catalog-seed-v3.1.json \
 *     --output /tmp/chagra-kg-import.sql \
 *     [--limit 10]        # subset de species (default: todas)
 *     [--no-drop]         # no incluye DROP GRAPH al inicio
 *     [--graph chagra_kg] # nombre del grafo (default: chagra_kg)
 *
 * Pipeline propuesto en postgres real (NO ejecutado por este POC):
 *   psql -h localhost -p 5432 -U farmos -d chagra_kg -f /tmp/chagra-kg-import.sql
 *
 * Limitaciones (documentadas):
 *   - chagra_kg DB debe existir antes (`CREATE DATABASE chagra_kg`).
 *   - Extension AGE debe estar habilitada (`CREATE EXTENSION age`).
 *   - Path debe estar seteado (`SET search_path = ag_catalog, "$user", public`).
 *   - No se genera índice grafo todavía — fase 2 cuando se midan queries.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// =============================================================================
// Utilidades públicas (exportadas para tests)
// =============================================================================

/**
 * Escapa un valor JS para inlining seguro como literal Cypher dentro del
 * argumento string de `cypher('graph', $$ ... $$, ...)`.
 *
 * Reglas:
 *   - null / undefined → 'null' (literal Cypher).
 *   - boolean / number finitos → toString.
 *   - string → comillas simples + dobla cualquier comilla simple interna.
 *     (Cypher es como SQL en eso.)
 *   - cualquier otro tipo (array/object) → JSON.stringify y luego se trata
 *     como string. Útil si el caller quiere meter un blob en una propiedad.
 *
 * @param {unknown} v
 * @returns {string} literal Cypher seguro
 */
export function cypherLiteral(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'null';
    return String(v);
  }
  if (typeof v === 'string') {
    return `'${v.replace(/'/g, "''")}'`;
  }
  // arrays / objects → string JSON saneado
  return cypherLiteral(JSON.stringify(v));
}

/**
 * Convierte un id de catálogo (`solanum_lycopersicum_san_marzano`) al
 * formato canónico que se guarda en el nodo. Acá no hay transformación
 * porque ya viene normalizado, pero la función existe para centralizar
 * la decisión y poder reescribirla sin tocar callsites.
 *
 * @param {string} id
 */
export function nodeId(id) {
  return String(id).trim();
}

/**
 * Trunca un campo libre a maxLen para no inflar nodos con prosa larga.
 * El detalle completo vive en el JSON original (Source/RAG documental).
 *
 * @param {string|null|undefined} text
 * @param {number} maxLen
 */
export function truncText(text, maxLen = 500) {
  if (text === null || text === undefined) return null;
  const s = String(text);
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 3) + '...';
}

/**
 * Normaliza el campo `origen` de una species a un id corto.
 * Es prosa libre en el seed (ej. "Sudeste de Australia ..."), así que
 * extraemos las primeras 4 palabras alfanuméricas y las slug-ificamos.
 *
 * @param {string|null|undefined} origenText
 * @returns {string|null}
 */
export function normalizeOrigen(origenText) {
  if (!origenText) return null;
  const cleaned = String(origenText)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .join('_');
  return cleaned || null;
}

/**
 * Normaliza un nombre de plaga (string libre) a id slug.
 *
 * @param {string} pestName
 */
export function normalizePest(pestName) {
  if (!pestName) return null;
  return String(pestName)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

/**
 * Construye un CREATE/MERGE Cypher para un nodo.
 *
 * @param {string} label - 'Species', 'Biopreparado', etc.
 * @param {Record<string, unknown>} props - debe incluir `id`.
 * @returns {string} fragmento Cypher (`MERGE (n:Label {id: 'x'}) SET n += {...}`)
 */
export function emitNode(label, props) {
  const id = props.id;
  if (!id) throw new Error(`emitNode(${label}): missing id`);
  const setProps = Object.entries(props)
    .filter(([k]) => k !== 'id')
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${cypherLiteral(v)}`)
    .join(', ');
  const setClause = setProps ? `SET n += {${setProps}}` : '';
  return `MERGE (n:${label} {id: ${cypherLiteral(id)}}) ${setClause}`.trim();
}

/**
 * Construye un MERGE Cypher para una arista entre nodos ya existentes.
 *
 * @param {{label:string,id:string}} from
 * @param {string} relType
 * @param {{label:string,id:string}} to
 * @param {Record<string, unknown>} [relProps]
 */
export function emitRel(from, relType, to, relProps = {}) {
  const propEntries = Object.entries(relProps)
    .filter(([, v]) => v !== null && v !== undefined && v !== '');
  const propClause = propEntries.length
    ? ` {${propEntries.map(([k, v]) => `${k}: ${cypherLiteral(v)}`).join(', ')}}`
    : '';
  return [
    `MATCH (a:${from.label} {id: ${cypherLiteral(from.id)}})`,
    `MATCH (b:${to.label} {id: ${cypherLiteral(to.id)}})`,
    `MERGE (a)-[r:${relType}${propClause}]->(b)`,
  ].join(' ');
}

/**
 * Genera el bloque SQL completo `SELECT * FROM cypher(...)` que envuelve
 * uno o más statements Cypher. AGE no soporta múltiples statements por
 * cypher() call, así que cada statement va en su propio SELECT.
 *
 * @param {string} graphName
 * @param {string} cypher
 */
export function wrapCypher(graphName, cypher) {
  // AGE requiere RETURN explícito; usamos un id sintético cuando no hay nada que retornar.
  const needsReturn = !/\breturn\b/i.test(cypher);
  const finalCypher = needsReturn ? `${cypher} RETURN 0` : cypher;
  return `SELECT * FROM cypher(${cypherLiteral(graphName)}, $$\n  ${finalCypher}\n$$) AS (v agtype);`;
}

// =============================================================================
// Construcción del corpus de statements
// =============================================================================

/**
 * Punto de entrada principal. Recibe el seed parseado y devuelve un array
 * de statements SQL en el orden correcto (nodos antes que aristas).
 *
 * @param {object} seed
 * @param {object} [opts]
 * @param {number} [opts.limit] - subset de species
 * @param {string} [opts.graph='chagra_kg']
 * @param {boolean} [opts.includeDrop=true]
 */
export function buildSqlScript(seed, opts = {}) {
  const graph = opts.graph || 'chagra_kg';
  const includeDrop = opts.includeDrop !== false;
  const speciesAll = Array.isArray(seed.species) ? seed.species : [];
  const species = typeof opts.limit === 'number'
    ? speciesAll.slice(0, opts.limit)
    : speciesAll;
  const biopreparados = Array.isArray(seed.biopreparados) ? seed.biopreparados : [];
  const sources = Array.isArray(seed.sources) ? seed.sources : [];

  const statements = [];

  // 0. Preamble: cargar AGE + setear search_path + opcionalmente recrear grafo.
  statements.push('LOAD \'age\';');
  statements.push('SET search_path = ag_catalog, "$user", public;');
  if (includeDrop) {
    statements.push(`SELECT drop_graph(${cypherLiteral(graph)}, true);`);
  }
  statements.push(`SELECT create_graph(${cypherLiteral(graph)});`);

  // 1. Nodos taxonómicos / ontológicos (sets pequeños, derivados de species).
  const families = new Set();
  const habitats = new Set();
  const origins = new Set();
  const roles = new Set();
  const thermalZones = new Set();
  const pests = new Set();

  for (const sp of species) {
    if (sp.familia_botanica) families.add(sp.familia_botanica);
    if (sp.estrato) habitats.add(sp.estrato);
    const o = normalizeOrigen(sp.origen);
    if (o) origins.add(o);
    for (const r of (sp.roles_in_guild || [])) roles.add(r);
    for (const tz of (sp.thermal_zones || [])) thermalZones.add(tz);
    for (const pest of (sp.plagas_criticas || [])) {
      const n = normalizePest(pest);
      if (n) pests.add(n);
    }
  }

  for (const f of families) {
    statements.push(wrapCypher(graph, emitNode('Family', { id: f, nombre: f })));
  }
  for (const h of habitats) {
    statements.push(wrapCypher(graph, emitNode('Habito', { id: h })));
  }
  for (const o of origins) {
    statements.push(wrapCypher(graph, emitNode('Origen', { id: o })));
  }
  for (const r of roles) {
    statements.push(wrapCypher(graph, emitNode('RoleInGuild', { id: r })));
  }
  for (const tz of thermalZones) {
    statements.push(wrapCypher(graph, emitNode('PisoTermico', { id: tz })));
  }
  for (const p of pests) {
    statements.push(wrapCypher(graph, emitNode('Pest', { id: p })));
  }

  // 2. Source nodes (todos los sources del catálogo).
  for (const s of sources) {
    statements.push(wrapCypher(graph, emitNode('Source', {
      id: nodeId(s.id),
      titulo: truncText(s.titulo, 240),
      autores: truncText(s.autores, 120),
      ano: s['año'] ?? null, // ñ-aware
      tier: s.tier ?? null,
      tipo: s.tipo ?? null,
      institucion: truncText(s.institucion, 120),
    })));
  }

  // 3. Biopreparado nodes.
  for (const bp of biopreparados) {
    statements.push(wrapCypher(graph, emitNode('Biopreparado', {
      id: nodeId(bp.id),
      nombre: bp.nombre || null,
      tipo: bp.tipo || null,
      proposito: Array.isArray(bp.proposito) ? bp.proposito.join('|') : null,
      tiempo_elaboracion_dias: bp.tiempo_elaboracion_dias ?? null,
      vida_util_dias: bp.vida_util_dias ?? null,
      uso: truncText(bp.uso, 300),
    })));
    // Bp → Source
    for (const sid of (bp.source_ids || [])) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Biopreparado', id: bp.id },
        'REFERENCED_BY',
        { label: 'Source', id: sid },
      )));
    }
  }

  // 4. Species nodes + relaciones.
  for (const sp of species) {
    statements.push(wrapCypher(graph, emitNode('Species', {
      id: nodeId(sp.id),
      nombre_comun: sp.nombre_comun || null,
      nombre_cientifico: sp.nombre_cientifico || null,
      categoria: sp.category || null,
      cultivable: sp.cultivable ?? null,
      conservation_status: sp.conservation_status || null,
      validation_level: sp.validation_level || null,
      tracking_mode: sp.tracking_mode || null,
      // Numéricos planos útiles para queries con WHERE:
      altitud_min: sp.altitud_msnm?.optimo_min ?? sp.altitud_msnm?.min_absoluto ?? null,
      altitud_max: sp.altitud_msnm?.optimo_max ?? sp.altitud_msnm?.max_absoluto ?? null,
      temp_min: sp.temperatura_c?.optimo_min ?? null,
      temp_max: sp.temperatura_c?.optimo_max ?? null,
      // valor_pedagogico va a Source/RAG documental; aquí solo un teaser:
      teaser: truncText(sp.valor_pedagogico, 240),
    })));

    // Species → Family
    if (sp.familia_botanica) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'HAS_FAMILY',
        { label: 'Family', id: sp.familia_botanica },
      )));
    }
    // Species → Habito
    if (sp.estrato) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'HAS_HABIT',
        { label: 'Habito', id: sp.estrato },
      )));
    }
    // Species → Origen
    const origen = normalizeOrigen(sp.origen);
    if (origen) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'HAS_ORIGIN',
        { label: 'Origen', id: origen },
      )));
    }
    // Species → PisoTermico
    for (const tz of (sp.thermal_zones || [])) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'GROWS_IN',
        { label: 'PisoTermico', id: tz },
      )));
    }
    // Species → RoleInGuild
    for (const r of (sp.roles_in_guild || [])) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'HAS_ROLE',
        { label: 'RoleInGuild', id: r },
      )));
    }
    // Species → Species companions (COMPATIBLE_WITH)
    for (const comp of (sp.companions || [])) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'COMPATIBLE_WITH',
        { label: 'Species', id: comp },
      )));
    }
    // Species → Species antagonists (ANTAGONIST_OF)
    for (const ant of (sp.antagonists || [])) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'ANTAGONIST_OF',
        { label: 'Species', id: ant },
      )));
    }
    // Species → Source
    for (const sid of (sp.source_ids || [])) {
      statements.push(wrapCypher(graph, emitRel(
        { label: 'Species', id: sp.id },
        'REFERENCED_BY',
        { label: 'Source', id: sid },
      )));
    }
    // Species → Pest
    for (const pest of (sp.plagas_criticas || [])) {
      const pid = normalizePest(pest);
      if (pid) {
        statements.push(wrapCypher(graph, emitRel(
          { label: 'Species', id: sp.id },
          'TARGETS_PEST',
          { label: 'Pest', id: pid },
          { raw_name: pest },
        )));
      }
    }
    // Species → Biopreparado (vía feeding_plan_template)
    const seenBp = new Set();
    const steps = sp.feeding_plan_template?.primary_steps || [];
    for (const step of steps) {
      const bp = step.biofertilizer_slug;
      if (bp && !seenBp.has(bp)) {
        seenBp.add(bp);
        statements.push(wrapCypher(graph, emitRel(
          { label: 'Species', id: sp.id },
          'USED_AS_BIOPREPARADO',
          { label: 'Biopreparado', id: bp },
          { source: 'feeding_plan_template' },
        )));
      }
    }
    // Species → Biopreparado (vía plan_nutricion_base.biopreparados_por_etapa)
    const etapas = sp.plan_nutricion_base?.biopreparados_por_etapa || {};
    for (const etapa of Object.keys(etapas)) {
      const arr = Array.isArray(etapas[etapa]) ? etapas[etapa] : [];
      for (const item of arr) {
        const bp = item?.biopreparado_id;
        if (bp && !seenBp.has(`${bp}:${etapa}`)) {
          seenBp.add(`${bp}:${etapa}`);
          statements.push(wrapCypher(graph, emitRel(
            { label: 'Species', id: sp.id },
            'USED_AS_BIOPREPARADO',
            { label: 'Biopreparado', id: bp },
            { source: 'plan_nutricion_base', etapa },
          )));
        }
      }
    }
  }

  return statements;
}

/**
 * CLI entry point.
 *
 * @param {string[]} argv - process.argv.slice(2)
 * @returns {Promise<{outputPath: string|null, statementCount: number, bytes: number}>}
 */
export async function main(argv = process.argv.slice(2)) {
  // Parsing manual (sin deps externas para mantener el script ligero).
  const opts = {
    input: 'catalog/chagra-catalog-seed-v3.1.json',
    output: null,
    limit: null,
    graph: 'chagra_kg',
    includeDrop: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') opts.input = argv[++i];
    else if (a === '--output') opts.output = argv[++i];
    else if (a === '--limit') opts.limit = Number(argv[++i]);
    else if (a === '--graph') opts.graph = argv[++i];
    else if (a === '--no-drop') opts.includeDrop = false;
    else if (a === '--help' || a === '-h') {
      // eslint-disable-next-line no-console
      console.error(
        'Usage: node scripts/catalog-to-age.mjs [--input FILE] [--output FILE] [--limit N] [--graph NAME] [--no-drop]',
      );
      return { outputPath: null, statementCount: 0, bytes: 0 };
    }
  }

  const seedPath = resolve(opts.input);
  const seed = JSON.parse(readFileSync(seedPath, 'utf-8'));
  const statements = buildSqlScript(seed, {
    limit: opts.limit ?? undefined,
    graph: opts.graph,
    includeDrop: opts.includeDrop,
  });

  const header = [
    '-- chagra-kg-import.sql',
    `-- Generated by scripts/catalog-to-age.mjs at ${new Date().toISOString()}`,
    `-- Source: ${opts.input}`,
    `-- Graph: ${opts.graph}`,
    `-- Statements: ${statements.length}`,
    '--',
    '-- WARNING: this script DROPs and re-creates the graph by default.',
    '-- Use --no-drop to apply as a delta MERGE.',
    '',
  ].join('\n');

  const body = statements.join('\n') + '\n';
  const out = header + body;

  if (opts.output) {
    writeFileSync(opts.output, out, 'utf-8');
    // eslint-disable-next-line no-console
    console.error(`Wrote ${statements.length} statements (${out.length} bytes) to ${opts.output}`);
    return { outputPath: opts.output, statementCount: statements.length, bytes: out.length };
  }
  // stdout
  process.stdout.write(out);
  return { outputPath: null, statementCount: statements.length, bytes: out.length };
}

// ESM-friendly entry-point check.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('catalog-to-age failed:', err);
    process.exit(1);
  });
}
