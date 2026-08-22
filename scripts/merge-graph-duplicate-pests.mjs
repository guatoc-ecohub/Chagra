#!/usr/bin/env node
/**
 * scripts/merge-graph-duplicate-pests.mjs
 *
 * Detecta y fusiona nodos `Pest` duplicados en
 * `catalog/chagra-kg-graph-snapshot.json`. Tarea #g13brocamerge (2026-07-24).
 *
 * Contexto
 * --------
 * El snapshot ingerido desde AGE (ver `_meta` del archivo) contenía nodos
 * Pest duplicados bajo ids distintos para el mismo organismo: un nodo con
 * id `<binomio>` (canon) y otro con id `<binomio>_<nombrecomun>` (variant
 * con sufijo de nombre común). Las aristas AFFECTS/CONTROLS quedaban
 * repartidas entre los dos, así que una consulta por un solo id devolvía
 * media verdad.
 *
 * Caso conocido (#g13brocamerge): Hypothenemus hampei (broca del café)
 * existía como `hypothenemus_hampei` (AFFECTS a coffea_arabica y
 * coffea_canephora) y como `hypothenemus_hampei_broca` (CONTROLS desde
 * Cephalonomia stephanoderis); Beauveria bassiana aparecía en ambos.
 *
 * Patrón general detectado en el snapshot (5 pares Pest, todos con el
 * MISMO `nombre_cientifico` exacto):
 *
 *   1. hemileia_vastatrix         (canon) <- hemileia_vastatrix_roya
 *   2. hypothenemus_hampei        (canon) <- hypothenemus_hampei_broca
 *   3. bemisia_tabaci             (canon) <- bemisia_tabaci_canonical
 *   4. spodoptera_frugiperda      (canon) <- spodoptera_frugiperda_cogollero
 *   5. hypsipyla_grandella_barrenador_del_cedro_y_la_caoba
 *      (canon - id más corto)     <- hypsipyla_grandella_barrenador_del_cedro_y_la_caoba_perfora_yema_apical_en_plant
 *
 * Algoritmo
 * ---------
 *   1. Grupo: Pest nodes que comparten `nombre_cientifico` normalizado
 *      (lowercase + colapso de whitespace). Sólo label `Pest` — NO se
 *      tocan `Species` (cultivares legítimos), ni `BeneficialOrganism` ni
 *      `Biopreparado` (mismo binomio pero conceptos distintos).
 *   2. Canon: el id igual a `<genus>_<species>` derivado del sci name
 *      (e.g. `hypothenemus_hampei`). Si ninguno de los ids del grupo
 *      calza exactamente (caso hypsipyla), el id más corto (más cercano
 *      al binomio).
 *   3. Merge propiedades: las del canon ganan; las que faltan se heredan
 *      del variant. Así un canon "stub" se enriquece con los datos del
 *      variant sin perder su id canónico.
 *   4. Reasignar aristas: toda arista que apunte al variant id se
 *      retargetiza al canon id.
 *   5. Dedup aristas: same {source, target, label, properties} se
 *      colapsa. Solo se dedup las aristas que tocan el grupo mergeado
 *      (canon existentes + reassigned variants); las duplicadas pre-
 *      existentes en otros nodos no se tocan (estaban antes, seguirán
 *      después — scope de otra tarea).
 *
 * NO ejecuta re-ingesta contra AGE producción: solo modifica el snapshot
 * JSON versionado en el repo (que alimenta `scripts/audit-contaminacion.mjs`
 * y otros). Si hay que propagar el merge al grafo vivo, ver NOTA sobre
 * re-ingesta en el PR #g13brocamerge.
 *
 * Idempotente: correr dos veces no hace nada la segunda (los duplicados
 * ya están fusionados, no hay más nada que mergear).
 *
 * Uso
 * ---
 *   node scripts/merge-graph-duplicate-pests.mjs --check    // dry-run, report
 *   node scripts/merge-graph-duplicate-pests.mjs             // aplica merge
 *   node scripts/merge-graph-duplicate-pests.mjs --snapshot path/to/snap.json
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_SNAPSHOT = join(ROOT, 'catalog', 'chagra-kg-graph-snapshot.json');

/**
 * Normaliza un nombre científico para comparación: trim + lowercase +
 * colapso de whitespace interno. NO descarta autores ni epitetos
 * infraespecíficos — la igualdad exacta es la señal de duplicado real.
 *
 * "Hypothenemus hampei" -> "hypothenemus hampei"
 * "Fusarium oxysporum f.sp. lycopersici" -> "fusarium oxysporum f.sp. lycopersici"
 *
 * @param {string} sci
 * @returns {string}
 */
export function normalizeSciName(sci) {
  if (typeof sci !== 'string') return '';
  return sci.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Construye el id binomial esperado `<genus>_<species>` desde un sci name
 * normalizado. Usa solo los primeros 2 tokens (género + epiteto
 * específico), lowercased, separados por `_`.
 *
 * "hypothenemus hampei" -> "hypothenemus_hampei"
 * "fusarium oxysporum f.sp. cubense raza 1" -> "fusarium_oxysporum"
 *
 * @param {string} sciNorm
 * @returns {string}
 */
export function expectedBinomialId(sciNorm) {
  const tokens = sciNorm.split(' ').filter(Boolean);
  if (tokens.length < 2) return sciNorm.replace(/\s+/g, '_');
  return `${tokens[0]}_${tokens[1]}`;
}

/**
 * Elige el id canónico dentro de un grupo de duplicados.
 * Reglas:
 *   (a) Si algún id calza exactamente con el binomio esperado, ese es.
 *   (b) Si ninguno calza, el más corto (más cercano al binomio).
 *
 * @param {string[]} ids
 * @param {string} expectedBinomial
 * @returns {string}
 */
export function pickCanonicalId(ids, expectedBinomial) {
  if (ids.includes(expectedBinomial)) return expectedBinomial;
  return [...ids].sort((a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    return a.localeCompare(b);
  })[0];
}

/**
 * Agrupa nodos `Pest` duplicados por `nombre_cientifico` normalizado.
 * Devuelve una lista de grupos, cada uno con el id canónico y los ids
 * variant (no-canon).
 *
 * @param {Array<{id:string, labels?:string[], properties?:object}>} nodes
 * @returns {Array<{scientificName:string, canonicalId:string, variantIds:string[], allIds:string[]}>}
 */
export function findDuplicatePestGroups(nodes) {
  const groups = new Map(); // normSci -> { ids: [], nodes: [] }
  for (const node of nodes || []) {
    const labels = node.labels || [];
    if (!labels.includes('Pest')) continue;
    const sci = node.properties?.nombre_cientifico;
    if (!sci) continue;
    const norm = normalizeSciName(sci);
    if (!norm) continue;
    if (!groups.has(norm)) groups.set(norm, { ids: [], nodes: [] });
    const g = groups.get(norm);
    g.ids.push(node.id);
    g.nodes.push(node);
  }
  const result = [];
  for (const [norm, g] of groups) {
    if (g.ids.length < 2) continue;
    const canonicalId = pickCanonicalId(g.ids, expectedBinomialId(norm));
    const variantIds = g.ids.filter((id) => id !== canonicalId);
    result.push({
      scientificName: norm,
      canonicalId,
      variantIds,
      allIds: g.ids.slice(),
    });
  }
  return result;
}

/**
 * Merge de propiedades: las del canon ganan; las que falten (undefined,
 * null, '') se heredan del variant. Nunca sobreescribe un campo no-vacío
 * del canon.
 *
 * @param {object} canonProps
 * @param {object} variantProps
 * @returns {object}
 */
export function mergeProperties(canonProps, variantProps) {
  const merged = { ...(canonProps || {}) };
  for (const [k, v] of Object.entries(variantProps || {})) {
    const existing = merged[k];
    if (existing === undefined || existing === null || existing === '') {
      merged[k] = v;
    }
  }
  return merged;
}

function edgeKey(edge) {
  const props = edge.properties ?? {};
  return `${edge.source}|${edge.target}|${edge.label}|${JSON.stringify(props, Object.keys(props).sort())}`;
}

/**
 * Aplica el merge al snapshot completo. Devuelve un nuevo snapshot y un
 * reporte con las estadísticas (sin mutar el input).
 *
 * @param {{_meta?:object, nodes:Array, edges:Array}} snapshot
 * @returns {{snapshot:object, report:object}}
 */
export function applyMerge(snapshot) {
  const { nodes = [], edges = [] } = snapshot;
  const groups = findDuplicatePestGroups(nodes);

  // Mapa variant id -> canon id
  const variantToCanon = new Map();
  const canonIds = new Set();
  for (const g of groups) {
    canonIds.add(g.canonicalId);
    for (const v of g.variantIds) variantToCanon.set(v, g.canonicalId);
  }

  // Indexar nodos canon para evitar O(n^2) en la fusión de props.
  // Recorremos en orden: si vemos un variant antes que su canon, lo
  // plantamos como seed con el id corregido; cuando veamos el canon real
  // sus props ganan y rellenan al seed.
  const canonByIndex = new Map(); // canonId -> index en mergedNodes
  const mergedNodes = [];
  const variantsRemoved = [];

  for (const node of nodes) {
    if (variantToCanon.has(node.id)) {
      const canonId = variantToCanon.get(node.id);
      const idx = canonByIndex.get(canonId);
      if (idx === undefined) {
        // Seed: usamos el variant con el id corregido.
        mergedNodes.push({
          ...node,
          id: canonId,
          properties: { ...node.properties, id: canonId },
        });
        canonByIndex.set(canonId, mergedNodes.length - 1);
      } else {
        const canonNode = mergedNodes[idx];
        canonNode.properties = mergeProperties(canonNode.properties, node.properties);
      }
      variantsRemoved.push(node.id);
    } else if (canonIds.has(node.id)) {
      const existingIdx = canonByIndex.get(node.id);
      if (existingIdx === undefined) {
        mergedNodes.push(node);
        canonByIndex.set(node.id, mergedNodes.length - 1);
      } else {
        // Ya hay un seed del canon creado desde un variant: canon gana.
        const seeded = mergedNodes[existingIdx];
        mergedNodes[existingIdx] = {
          ...node,
          properties: mergeProperties(node.properties, seeded.properties),
        };
      }
    } else {
      mergedNodes.push(node);
    }
  }

  // Reasignar + dedup edges. Solo se tocan aristas que involucran algún
  // variant o algún canon del grupo; las demás se preservan intactas
  // (incluye duplicadas pre-existentes entre otros pares, que son scope
  // de otra tarea).
  const untouched = [];
  const touched = [];
  let reassignedCount = 0;
  for (const edge of edges) {
    const newSource = variantToCanon.get(edge.source) ?? edge.source;
    const newTarget = variantToCanon.get(edge.target) ?? edge.target;
    const reassigned = newSource !== edge.source || newTarget !== edge.target;
    const newEdge = { ...edge, source: newSource, target: newTarget };
    if (reassigned) {
      reassignedCount++;
      touched.push(newEdge);
    } else if (canonIds.has(edge.source) || canonIds.has(edge.target)) {
      touched.push(newEdge);
    } else {
      untouched.push(newEdge);
    }
  }

  // Dedup dentro del set touched.
  const seen = new Set();
  const dedupedTouched = [];
  let dedupedCount = 0;
  for (const edge of touched) {
    const key = edgeKey(edge);
    if (seen.has(key)) {
      dedupedCount++;
      continue;
    }
    seen.add(key);
    dedupedTouched.push(edge);
  }

  const mergedSnapshot = {
    ...snapshot,
    nodes: mergedNodes,
    edges: [...untouched, ...dedupedTouched],
  };

  const report = {
    groups: groups.map((g) => ({
      scientificName: g.scientificName,
      canonicalId: g.canonicalId,
      variantIds: g.variantIds,
    })),
    variantsRemoved,
    nodesBefore: nodes.length,
    nodesAfter: mergedNodes.length,
    edgesBefore: edges.length,
    edgesAfter: untouched.length + dedupedTouched.length,
    edgesReassigned: reassignedCount,
    edgesDeduped: dedupedCount,
  };

  return { snapshot: mergedSnapshot, report };
}

function readSnapshot(path) {
  if (!existsSync(path)) {
    throw new Error(`Snapshot no encontrado: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function main(argv) {
  const args = argv || process.argv.slice(2);
  const opts = { check: false, snapshot: null, help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--check' || a === '--dry-run') opts.check = true;
    else if (a === '--snapshot') opts.snapshot = args[++i];
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  if (opts.help) {
    process.stdout.write(
      'Uso: node scripts/merge-graph-duplicate-pests.mjs [--check] [--snapshot PATH]\n'
      + '\n'
      + '  --check           Dry-run: solo reporta, no escribe.\n'
      + '  --snapshot PATH   Snapshot a leer/escribir (default: catalog/chagra-kg-graph-snapshot.json).\n',
    );
    return 0;
  }

  const path = opts.snapshot ? resolve(process.cwd(), opts.snapshot) : DEFAULT_SNAPSHOT;
  const snap = readSnapshot(path);
  const { snapshot: merged, report } = applyMerge(snap);

  process.stderr.write(
    `[merge-graph-duplicate-pests] ${report.groups.length} grupo(s) duplicado(s), `
    + `${report.variantsRemoved.length} variant(es) eliminada(s), `
    + `${report.edgesReassigned} arista(s) reasignada(s), `
    + `${report.edgesDeduped} arista(s) deduplicada(s).\n`,
  );
  for (const g of report.groups) {
    process.stderr.write(
      `  - ${g.scientificName} -> canon=${g.canonicalId} variant(s)=[${g.variantIds.join(', ')}]\n`,
    );
  }

  if (report.groups.length === 0) {
    process.stderr.write('[merge-graph-duplicate-pests] Snapshot ya consistente (sin duplicados Pest).\n');
  }

  if (opts.check) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    return 0;
  }

  if (report.groups.length === 0) {
    // Sin cambios — no escribir.
    return 0;
  }

  writeFileSync(path, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  process.stderr.write(`[merge-graph-duplicate-pests] Snapshot actualizado: ${path}\n`);
  return 0;
}

// CLI entrypoint
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const code = main();
  if (typeof code === 'number') process.exit(code);
}
