#!/usr/bin/env node
/**
 * scripts/load-age-paramo-species-2026-07-09.mjs
 *
 * Loader offline-first para el ecosistema páramo y sus especies en el grafo
 * `chagra_kg`. Fuente ÚNICA — no se inventa ninguna especie ni dato:
 *
 *   Chagra-strategy/ops/GROUNDING-PARAMO-2026-07-09.md
 *
 * que a su vez cita:
 *   - Doc.1: Vásquez & Buitrago (Eds.), "El gran libro de los páramos",
 *     IAvH/Proyecto Páramo Andino, 2011. ISBN 978-958-8343-65-5.
 *   - Doc.2: Marín & Parra, "Páramos Vivos: Bitácora de flora",
 *     IAvH/Fondo Adaptación, 2015. ISBN 978-958-8889-33-7.
 *
 * Genera SQL idempotente (MERGE + SET, nunca CREATE / ON CREATE SET) que:
 *
 *   1. MERGE de un nodo `Ecosystem {id:'paramo'}` con los datos duros
 *      citables de la sección "Ecosistema" del doc (área, % territorio,
 *      % agua de ciudades andinas, endemismo, etc.).
 *   2. Por cada especie de las tablas "Frailejones", "Otras plantas
 *      notables" y "Fauna": MERGE de un nodo `Species` cuya clave es el
 *      id-slug del binomio (genus_species en minúscula, ej.
 *      `espeletia_grandiflora`), con SET siempre de:
 *        scientific_name, common_name, family, conservation_status (UICN),
 *        source.
 *   3. MERGE de la arista `(Species)-[:HABITAT_OF]->(Ecosystem {id:'paramo'})`.
 *
 * ---------------------------------------------------------------------------
 * DECISIONES DE DISEÑO (documentadas para revisión humana antes de correr):
 * ---------------------------------------------------------------------------
 *
 * A) Convención de id: underscore, NO dash.
 *    El encargo original sugería un ejemplo con guion (`espeletia-grandiflora`),
 *    pero el grafo YA tiene especies de páramo cargadas desde el catálogo
 *    (`catalog/chagra-catalog-oss-subset-v3.2.json`, 62 especies con
 *    thermal_zones=páramo) con ids `genus_species` en snake_case — ej.
 *    `espeletia_grandiflora`, `polylepis_quadrijuga`, `vaccinium_floribundum`,
 *    `macleania_rupestris`, `quercus_humboldtii`, `espeletia_argentea`,
 *    `espeletia_pycnophylla`, `puya_goudotiana`, `cinchona_pubescens`,
 *    `calamagrostis_effusa` (verificado 2026-07-09 vía grep sobre el JSON).
 *    Si este script usara guiones, esas 10+ especies quedarían DUPLICADAS en
 *    vez de enriquecidas (MERGE fallaría por id distinto). Se usa underscore
 *    para que el MERGE caiga sobre el nodo ya existente y lo enriquezca con
 *    conservation_status/family/HABITAT_OF, sin fragmentar el grafo.
 *
 * B) Nombres de propiedad: se setean AMBAS convenciones.
 *    El esquema YA establecido de `Species` en chagra_kg (ver
 *    scripts/catalog-to-age.mjs, y los consumidores reales
 *    src/services/agentService.js, src/services/grafoRelations.js,
 *    src/services/sidecarClient.js) lee `nombre_cientifico` / `nombre_comun`
 *    / `conservation_status` — NO `scientific_name` / `common_name`. Si este
 *    script solo escribiera los nombres en inglés pedidos en el encargo, las
 *    32 especies de páramo quedarían invisibles para el agente/grounding (el
 *    consumidor real nunca lee esos campos). Por eso se setean ambos pares:
 *      - nombre_cientifico / nombre_comun  (leídos por el agente hoy)
 *      - scientific_name   / common_name   (pedidos explícitamente)
 *    `conservation_status` coincide en ambas convenciones, se setea una vez.
 *
 * C) `family` se setea como propiedad escalar (pedido explícito) Y ADEMÁS
 *    se emite la arista `(Species)-[:HAS_FAMILY]->(Family)` que es el
 *    patrón establecido en catalog-to-age.mjs para el resto del catálogo.
 *    Así las especies de páramo son alcanzables por ambas vías.
 *
 * D) Aristas con propiedades (HABITAT_OF) usan SET por-campo
 *    (`SET r.k = v`), NO `SET r += {mapa}`. `emitRelUpsert` de
 *    catalog-to-age.mjs usa el mapa, que AGE 1.5 NO persiste sobre aristas
 *    (queda `{}` — verificado empíricamente 2026-07-06, ver
 *    scripts/load-age-frutales-tuberculos-fable-2026-07-06.mjs). Se copia
 *    aquí el mismo helper local `emitRelUpsertScalar` que usa ese script.
 *
 * E) Entradas NO ingestadas (para no inventar especies):
 *    - "Lítamo *Draba* spp." y "Musgo turbera *Sphagnum* spp." — género sin
 *      epíteto específico, no hay binomio real que sluggear.
 *    - "~77 orquídeas (CITES Ap.II)" — conteo agregado, no una especie.
 *    Filas compuestas SÍ se separan en especies individuales porque cada
 *    binomio es real y está listado explícitamente:
 *    - "Puya nitida/goudotiana/trianae" → 3 Species (Puya nitida, Puya
 *      goudotiana, Puya trianae).
 *    - "Atelopus muisca/lozanoi" → 2 Species (Atelopus muisca, Atelopus
 *      lozanoi).
 *
 * F) `conservation_status` y `family` solo se setean cuando el doc los da
 *    explícitamente. La tabla de frailejones trae UICN por fila; "Otras
 *    plantas" solo da UICN explícito para Bejaria resinosa ("EN"); Fauna no
 *    trae ni UICN ni familia en el doc — se dejan `null` (emitNode omite
 *    props null del SET, no se inventa un valor).
 *
 * G) `source`: el doc no distingue Doc.1 vs Doc.2 para frailejones/otras
 *    plantas, así que se usa el string compuesto tal como lo pide el
 *    encargo: "IAvH 2011/2015". La sección Fauna SÍ está explícitamente
 *    anotada "(Doc.1)" en el doc, así que fauna usa "IAvH 2011" a secas
 *    (más preciso, no se sobre-atribuye a Doc.2). Además de la propiedad
 *    escalar `source`, se emiten nodos `Source` reales (iavh-2011-*,
 *    iavh-2015-*) + aristas `REFERENCED_BY` para trazabilidad, siguiendo el
 *    patrón del resto de los loaders del repo.
 *
 * Este script NO toca la base de datos: imprime a stdout (o `--out`) un SQL
 * idempotente. Ejecutarlo dos veces no duplica nada (todo MERGE).
 *
 * Uso:
 *   node scripts/load-age-paramo-species-2026-07-09.mjs > paramo.sql
 *   node scripts/load-age-paramo-species-2026-07-09.mjs --out .local/paramo.sql
 *
 * Para aplicar el .sql resultante contra chagra_kg (fuera de este script,
 * revisión humana primero):
 *   sudo podman exec -i <db_container> psql -U <user> -d <db> -f paramo.sql
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cypherLiteral, emitNode, emitRelUpsert, wrapCypher } from './catalog-to-age.mjs';

const GRAPH = 'chagra_kg';

/**
 * MERGE de arista con propiedades por-campo (`SET r.k = v`).
 *
 * AGE 1.5 NO persiste `SET r += {mapa}` sobre aristas (queda `{}`), a
 * diferencia de los nodos. Para grabar provenance (`fuente`) EN la arista se
 * usa SET por campo, que sí persiste. Copiado de
 * scripts/load-age-frutales-tuberculos-fable-2026-07-06.mjs (verificado
 * empíricamente contra chagra_kg, 2026-07-06).
 *
 * @param {{label:string,id:string}} from
 * @param {string} relType
 * @param {{label:string,id:string}} to
 * @param {Record<string, unknown>} [relProps]
 */
function emitRelUpsertScalar(from, relType, to, relProps = {}) {
  const sets = Object.entries(relProps)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `r.${k} = ${cypherLiteral(v)}`);
  const setClause = sets.length ? ` SET ${sets.join(', ')}` : '';
  return [
    `MATCH (a:${from.label} {id: ${cypherLiteral(from.id)}})`,
    `MATCH (b:${to.label} {id: ${cypherLiteral(to.id)}})`,
    `MERGE (a)-[r:${relType}]->(b)${setClause}`,
  ].join(' ');
}

/**
 * Convierte un binomio ("Espeletia grandiflora Bonpl.") en un id-slug
 * `genus_species` (los primeros dos tokens, sin autor, sin acentos).
 * Devuelve null si no hay al menos dos tokens (género + epíteto) — así
 * evitamos sluggear entradas de solo-género ("Draba spp.", "Sphagnum spp.").
 * "sp." / "spp." (abreviatura taxonómica de "especie(s) sin determinar") NO
 * cuenta como epíteto real: aceptarlo fabricaría una especie que no existe.
 *
 * @param {string} binomio
 * @returns {string|null}
 */
export function binomialSlug(binomio) {
  const cleaned = String(binomio || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  const tokens = cleaned.trim().split(/\s+/);
  const genus = (tokens[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  const epithetRaw = (tokens[1] || '').toLowerCase().replace(/[^a-z]/g, '');
  const epithet = epithetRaw === 'sp' || epithetRaw === 'spp' ? '' : epithetRaw;
  if (!genus || !epithet) return null;
  return `${genus}_${epithet}`;
}

// ---------------------------------------------------------------------------
// Ecosystem — datos duros citables de la sección "Ecosistema" del doc.
// ---------------------------------------------------------------------------
export const ECOSYSTEM = {
  id: 'paramo',
  nombre: 'Páramo',
  area_km2_aprox: 29000,
  pct_territorio_colombia_aprox: 2.5,
  pct_flora_nacional_colombia_aprox: 17,
  pct_paramos_andinos_mundo_aprox: 50,
  num_complejos: 36,
  num_sectores: 6,
  pct_agua_ciudades_andinas_aprox: 70,
  endemismo_pct_aprox: 60,
  num_especies_plantas_col_aprox: 4700,
  source: 'IAvH 2011/2015',
};

// ---------------------------------------------------------------------------
// Sources (Doc.1 / Doc.2 del grounding de páramo).
// ---------------------------------------------------------------------------
export const SOURCES = [
  {
    id: 'iavh-2011-gran-libro-paramos',
    tipo: 'libro',
    ano: 2011,
    tier: 'A',
    titulo: 'El gran libro de los páramos',
    autores: 'Vásquez, A. & Buitrago, M. (Eds.)',
    institucion: 'Instituto Alexander von Humboldt (IAvH) / Proyecto Páramo Andino',
    isbn: '978-958-8343-65-5',
  },
  {
    id: 'iavh-2015-paramos-vivos-flora',
    tipo: 'libro',
    ano: 2015,
    tier: 'A',
    titulo: 'Páramos Vivos: Bitácora de flora',
    autores: 'Marín, C. & Parra, L.N.',
    institucion: 'Instituto Alexander von Humboldt (IAvH) / Fondo Adaptación',
    isbn: '978-958-8889-33-7',
  },
];

const SOURCE_FLORA = ['iavh-2011-gran-libro-paramos', 'iavh-2015-paramos-vivos-flora'];
const SOURCE_FAUNA = ['iavh-2011-gran-libro-paramos'];

// ---------------------------------------------------------------------------
// Frailejones (Asteraceae) — 9 fichas con UICN, altura y distribución.
// ---------------------------------------------------------------------------
export const FRAILEJONES = [
  { comun: 'Frailejón blanco', binomio: 'Espeletia argentea Bonpl.', uicn: 'LC', altura_max_m: 1, distribucion: 'Col' },
  { comun: 'Frailejón motoso', binomio: 'Espeletia barclayana Cuatrec.', uicn: 'LC', altura_max_m: 2, distribucion: 'Col' },
  { comun: 'Frailejón Guerrero', binomio: 'Espeletia cayetana (Cuatrec.) Cuatrec.', uicn: 'EN', altura_max_m: 4, distribucion: 'Col endémico' },
  { comun: 'Frailejón común', binomio: 'Espeletia grandiflora Bonpl.', uicn: 'LC', altura_max_m: 3, distribucion: 'Col' },
  { comun: 'Frailejón', binomio: 'Espeletia hartwegiana Sch.Bip. ex Cuatrec.', uicn: 'LC', altura_max_m: 4, distribucion: 'Col' },
  { comun: 'Frailejón', binomio: 'Espeletia pycnophylla Cuatrec.', uicn: 'LC', altura_max_m: 3, distribucion: 'Col+Ecuador' },
  { comun: 'Frailejón negro', binomio: 'Espeletiopsis corymbosa (Bonpl.) Cuatrec.', uicn: 'LC', altura_max_m: 2.5, distribucion: 'Col' },
  { comun: 'Frailejón/tache', binomio: 'Espeletiopsis santanderensis (A.C.Sm.) Cuatrec.', uicn: 'LC', altura_max_m: 1, distribucion: 'Col' },
  { comun: 'Frailejón', binomio: 'Paramiflos glandulosus (Cuatrec.) Cuatrec.', uicn: 'VU', altura_max_m: 1.5, distribucion: 'Col' },
].map((f) => ({
  id: binomialSlug(f.binomio),
  nombre_comun: f.comun,
  nombre_cientifico: f.binomio,
  family: 'Asteraceae',
  conservation_status: f.uicn,
  altura_max_m: f.altura_max_m,
  distribucion: f.distribucion,
  source_ids: SOURCE_FLORA,
  source: 'IAvH 2011/2015',
}));

// ---------------------------------------------------------------------------
// Otras plantas notables. UICN/nota solo cuando el doc lo da explícito
// (Bejaria resinosa = EN). Fila "Puya nitida/goudotiana/trianae" se
// separa en 3 especies reales.
// ---------------------------------------------------------------------------
export const OTRAS_PLANTAS = [
  { comun: 'Roble', binomio: 'Quercus humboldtii', family: 'Fagaceae' },
  { comun: 'Colorado/sietecueros', binomio: 'Polylepis quadrijuga', family: 'Rosaceae' },
  { comun: 'Pegamosco', binomio: 'Bejaria resinosa', family: 'Ericaceae', uicn: 'EN' },
  { comun: 'Agraz', binomio: 'Vaccinium floribundum', family: 'Ericaceae', nota: 'comestible' },
  { comun: 'Uva camarona', binomio: 'Macleania rupestris', family: 'Ericaceae', nota: 'alimento oso de anteojos' },
  { comun: 'Chusque', binomio: 'Chusquea tessellata', family: 'Poaceae' },
  { comun: 'Mano de oso', binomio: 'Oreopanax mutisianus', family: 'Araliaceae' },
  { comun: 'Puya', binomio: 'Puya nitida', family: 'Bromeliaceae' },
  { comun: 'Puya', binomio: 'Puya goudotiana', family: 'Bromeliaceae' },
  { comun: 'Puya', binomio: 'Puya trianae', family: 'Bromeliaceae' },
  { comun: 'Paja', binomio: 'Calamagrostis effusa', family: 'Poaceae' },
  { comun: 'Quina', binomio: 'Cinchona pubescens', family: 'Rubiaceae' },
  // NO ingestados (sin binomio específico o agregado, ver nota E del header):
  // 'Lítamo' Draba spp. (Brassicaceae, medicinal) — solo género.
  // 'Musgo turbera' Sphagnum spp. — solo género.
  // ~77 orquídeas (CITES Ap.II) — conteo agregado, no una especie.
].map((p) => ({
  id: binomialSlug(p.binomio),
  nombre_comun: p.comun,
  nombre_cientifico: p.binomio,
  family: p.family,
  conservation_status: p.uicn || null,
  nota: p.nota || null,
  source_ids: SOURCE_FLORA,
  source: 'IAvH 2011/2015',
}));

// ---------------------------------------------------------------------------
// Fauna (Doc.1 explícito). Sin UICN ni familia en el doc → se dejan null.
// Fila "Atelopus muisca/lozanoi" se separa en 2 especies reales.
// ---------------------------------------------------------------------------
export const FAUNA = [
  { comun: 'Cóndor', binomio: 'Vultur gryphus' },
  { comun: 'Águila páramo', binomio: 'Geranoaetus melanoleucus' },
  { comun: 'Oso de anteojos', binomio: 'Tremarctos ornatus' },
  { comun: 'Danta de páramo', binomio: 'Tapirus pinchaque' },
  { comun: 'Puma', binomio: 'Puma concolor' },
  { comun: 'Venado', binomio: 'Mazama rufina' },
  { comun: 'Conejo', binomio: 'Sylvilagus brasiliensis' },
  { comun: 'Rana arlequín', binomio: 'Atelopus muisca', nota: 'endémica, en declive' },
  { comun: 'Rana arlequín', binomio: 'Atelopus lozanoi', nota: 'endémica, en declive' },
  { comun: 'Tingua bogotana', binomio: 'Rallus semiplumbeus' },
  { comun: 'Perico', binomio: 'Bolborhynchus ferrugineifrons', nota: 'endémico' },
].map((f) => ({
  id: binomialSlug(f.binomio),
  nombre_comun: f.comun,
  nombre_cientifico: f.binomio,
  family: null,
  conservation_status: null,
  nota: f.nota || null,
  source_ids: SOURCE_FAUNA,
  source: 'IAvH 2011',
}));

/** Todas las especies de páramo del doc, ya normalizadas. */
export const ALL_SPECIES = [...FRAILEJONES, ...OTRAS_PLANTAS, ...FAUNA];

/** Construye la lista ordenada de statements SQL (nodos antes que aristas). */
export function buildStatements() {
  const stmts = [];

  // 1) Ecosystem
  stmts.push(wrapCypher(GRAPH, emitNode('Ecosystem', ECOSYSTEM)));

  // 2) Sources
  for (const src of SOURCES) {
    const { id, ...rest } = src;
    stmts.push(wrapCypher(GRAPH, emitNode('Source', { id, ...rest })));
  }

  // 3) Species (+ Family, + REFERENCED_BY, + HABITAT_OF)
  const emittedFamilies = new Set();
  for (const sp of ALL_SPECIES) {
    if (!sp.id) {
      throw new Error(`No se pudo generar id-slug para: ${sp.nombre_cientifico}`);
    }

    stmts.push(wrapCypher(GRAPH, emitNode('Species', {
      id: sp.id,
      // Convención establecida del grafo (leída por agentService.js /
      // grafoRelations.js / sidecarClient.js):
      nombre_cientifico: sp.nombre_cientifico,
      nombre_comun: sp.nombre_comun,
      conservation_status: sp.conservation_status,
      // Nombres pedidos explícitamente en el encargo (alias, mismo valor):
      scientific_name: sp.nombre_cientifico,
      common_name: sp.nombre_comun,
      family: sp.family,
      source: sp.source,
      // Extra, mismo doc/tabla (no inventado):
      altura_max_m: sp.altura_max_m ?? null,
      distribucion: sp.distribucion ?? null,
      nota: sp.nota ?? null,
    })));

    // Species → Family (patrón establecido, ver catalog-to-age.mjs)
    if (sp.family) {
      if (!emittedFamilies.has(sp.family)) {
        emittedFamilies.add(sp.family);
        stmts.push(wrapCypher(GRAPH, emitNode('Family', { id: sp.family, nombre: sp.family })));
      }
      stmts.push(wrapCypher(GRAPH, emitRelUpsert(
        { label: 'Species', id: sp.id },
        'HAS_FAMILY',
        { label: 'Family', id: sp.family },
      )));
    }

    // Species → Source(s)
    for (const sid of sp.source_ids) {
      stmts.push(wrapCypher(GRAPH, emitRelUpsert(
        { label: 'Species', id: sp.id },
        'REFERENCED_BY',
        { label: 'Source', id: sid },
      )));
    }

    // Species → Ecosystem (HABITAT_OF), con provenance por-campo.
    stmts.push(wrapCypher(GRAPH, emitRelUpsertScalar(
      { label: 'Species', id: sp.id },
      'HABITAT_OF',
      { label: 'Ecosystem', id: ECOSYSTEM.id },
      { fuente: sp.source },
    )));
  }

  return stmts;
}

function buildSql() {
  const header = [
    '-- load-age-paramo-species-2026-07-09',
    '-- Delta idempotente (MERGE-only) para el ecosistema páramo y sus especies.',
    '-- Fuente: Chagra-strategy/ops/GROUNDING-PARAMO-2026-07-09.md (IAvH 2011/2015).',
    '-- Generado por scripts/load-age-paramo-species-2026-07-09.mjs',
    `-- Especies: ${ALL_SPECIES.length} (frailejones=${FRAILEJONES.length}, otras_plantas=${OTRAS_PLANTAS.length}, fauna=${FAUNA.length})`,
    "LOAD 'age';",
    'SET search_path = ag_catalog, "$user", public;',
    '',
  ].join('\n');
  return `${header}\n${buildStatements().join('\n')}\n`;
}

function main() {
  const argv = process.argv.slice(2);
  const outIdx = argv.indexOf('--out');
  const sql = buildSql();
  if (outIdx !== -1 && argv[outIdx + 1]) {
    const outPath = resolve(process.cwd(), argv[outIdx + 1]);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, sql, 'utf8');
    process.stderr.write(`[paramo-species] SQL → ${argv[outIdx + 1]} (${buildStatements().length} statements, ${ALL_SPECIES.length} especies)\n`);
  } else {
    process.stdout.write(sql);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
