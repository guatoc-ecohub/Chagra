#!/usr/bin/env node
/**
 * scripts/load-age-graph-gaps.mjs
 *
 * Generalización del patrón de `scripts/load-age-etno-folk-fitopatologia.mjs`
 * (PR #1907) para ingerir DRs "de huecos" y "de aristas por especie" al grafo
 * AGE `chagra_kg`. A diferencia de ese loader (que ejecuta SQL curado a mano),
 * este script PARSEA directamente las tablas markdown de aristas que traen
 * los DR (`| origen_id | TIPO | destino_id | fuente | confianza |` y variantes
 * como `NodoA | Relación | NodoB | Fuente | Confianza`), las cura con reglas
 * anti-alucinación, y genera el Cypher MERGE correspondiente.
 *
 * ESTADO: BUILD + DRY-RUN. Este script NUNCA se conecta a postgres/AGE ni
 * ejecuta nada contra el grafo de producción. Su única salida es:
 *   1. un archivo .sql con statements `SELECT * FROM cypher(...)` (MERGE,
 *      no destructivo, idempotente — mismo patrón que catalog-to-age.mjs);
 *   2. un reporte (JSON + texto) de cuántos nodos/aristas se generarían, por
 *      DR y por tipo de relación, y cuántas filas se descartaron y por qué.
 * La aplicación real contra `postgres-farm`/`chagra_kg` es una decisión
 * posterior (fuera de este script), después de revisión humana del Cypher
 * generado — igual que el resto del pipeline de ingesta AGE de este repo.
 *
 * Anti-alucinación / curación CO-strict:
 *   - Se descartan aristas sin `fuente` citada (columna vacía).
 *   - Se descartan aristas cuyo DR de origen no está explícitamente
 *     circunscrito a Colombia/Andes (heurística sobre título+intro del DR:
 *     "colombia", "andin", "andes", "páramo"). Todas las DRs objetivo de este
 *     pipeline ya cumplen esto por diseño (nombre de archivo lo declara),
 *     pero el chequeo es defensivo por si el script se apunta a otras DRs.
 *   - Se descartan filas malformadas (columnas requeridas vacías o fila
 *     truncada por corrupción de generación) y duplicados exactos dentro
 *     del mismo DR.
 *
 * Fuente de las DRs: viven FUERA de este repo (Chagra-strategy, privado).
 * Este script NO conoce ninguna ruta privada por defecto — se pasan por
 * `--dr-dir` / env `CHAGRA_AGE_GAPS_DR_DIR`, igual que `CHAGRA_AGE_ETNO_SQL`
 * en el loader hermano.
 *
 * Nodo genérico + reconciliación de labels: las entidades de estas DRs
 * (especies, plagas, polinizadores, conceptos abstractos como "fuego" o
 * "riesgo_incendio", prácticas de manejo) son demasiado heterogéneas para
 * inferir su label canónico (Species/Pest/...) sin consultar el grafo vivo
 * — y esta etapa sigue siendo offline por diseño (este script NUNCA se
 * conecta a postgres/AGE). Para evitar crear nodos `GraphGapNode` paralelos
 * que dupliquen un nodo canónico ya existente (p.ej. una Species ya
 * catalogada), el script acepta opcionalmente un snapshot de solo-lectura
 * del grafo vivo vía `--live-labels` / env `CHAGRA_AGE_GAPS_LIVE_LABELS`
 * (JSON `{ labels: { "<id>": ["Species", ...] } }`, generado aparte por el
 * operador con una query `MATCH (n) RETURN n.id, labels(n)` — nunca por
 * este script). Con ese snapshot:
 *   - un id que YA existe en el grafo vivo se reconcilia: la arista hace
 *     `MATCH` contra el nodo real con su label real (Species/Pest/...) en
 *     vez de `MERGE` un `GraphGapNode` duplicado. No se toca ni sobreescribe
 *     ninguna propiedad del nodo existente.
 *   - un id genuinamente nuevo recibe un label estimado a partir de la
 *     relación/contenido (`Soil`, `Practice`; ver `estimateNewNodeLabel`),
 *     con `GraphGapNode` como fallback cuando no hay señal suficiente —
 *     mismo espíritu que `FolkSymptom` en el PR #1907: un label explícito
 *     para conceptos que todavía no calzan en la ontología establecida.
 *   - sin `--live-labels`, el comportamiento es idéntico al de antes de la
 *     reconciliación (todo trata como nuevo, con el mismo fallback).
 *
 * Uso:
 *   node scripts/load-age-graph-gaps.mjs \
 *     --dr-dir /ruta/privada/research/edge-tables \
 *     --glob 'aristas-grafo-*.md' \
 *     --file porcicultura-y-avicultura-....md \
 *     --file micorrizas-y-salud-de-suelo-....md \
 *     --file recuperacion-de-suelos-....md \
 *     --file captacion-de-agua-....md \
 *     --live-labels /ruta/privada/ops/age-graph-gaps/live-labels.json \
 *     --out-cypher /ruta/privada/ops/age-graph-gaps/gaps.cypher.sql \
 *     --out-report /ruta/privada/ops/age-graph-gaps/gaps.report.json
 *
 * Si no se pasan `--out-cypher`/`--out-report` (ni sus env vars), se escribe
 * bajo `.local/age-graph-gaps/` (gitignored vía `*.local`) para que nunca
 * quede contenido derivado de DRs privadas trackeado en este repo público.
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { emitNode, emitRel, wrapCypher } from './catalog-to-age.mjs';

const _here = dirname(fileURLToPath(import.meta.url));

export const NODE_LABEL = 'GraphGapNode';

// Prefijo genérico para la propiedad `dr` que queda grabada en cada nodo/
// arista generada (trazabilidad hacia el DR de origen). Deliberadamente
// genérico — el nombre real del directorio/paquete de DRs vive fuera de
// este repo público (Chagra-strategy, privado); ver `--dr-dir` más arriba.
export const RESEARCH_SOURCE_PREFIX = 'research/edge-tables';

// Snapshot de tipos de arista ya establecidos en chagra_kg — fuente:
// Chagra-strategy/ops/INFRA_FACTS.md (auditoría en vivo 2026-06-14) +
// FOLK_NAME_OF (introducido en PR #1907). Solo enriquece el reporte
// (marca si un TIPO es "conocido" o "nuevo" para el grafo); no gatea la
// curación — un tipo nuevo no es motivo de descarte.
export const KNOWN_RELATION_TYPES = new Set([
  'REFERENCED_BY', 'HAS_ROLE', 'GROWS_IN', 'CONTROLS', 'HAS_FAMILY',
  'COMPATIBLE_WITH', 'HAS_HABIT', 'USED_AS_BIOPREPARADO', 'IS_VARIETY_OF',
  'REFERS_TO_SPECIES', 'USED_IN_REGION', 'TARGETS_PEST', 'ANTAGONIST_OF',
  'HAS_ORIGIN', 'RESISTANT_TO', 'AFFECTS', 'DISAMBIGUATES', 'SUSCEPTIBLE_TO',
  'SYNONYM_OF', 'FOLK_NAME_OF',
]);

const CO_SCOPE_RE = /colombia|andin|\bandes\b|p[aá]ramo/i;

// =============================================================================
// Reconciliación de labels contra un snapshot de solo-lectura del grafo vivo
// =============================================================================
//
// Este bloque NUNCA abre una conexión: consume un snapshot ya generado
// (JSON) que otro proceso (fuera de este script) obtuvo con una query
// read-only contra `chagra_kg`. Objetivo: que el MERGE de un id que YA
// existe en el grafo apunte a su label real (Species/Pest/BeneficialOrganism/
// ...) en vez de crear un `GraphGapNode` paralelo con el mismo id.

/**
 * Carga un snapshot de labels del grafo vivo. Acepta dos formas:
 *   - `{ labels: { "<id>": ["Species", ...] } }` (formato recomendado, con
 *     metadata en `meta`).
 *   - `{ "<id>": ["Species", ...] }` (mapa plano, sin envoltorio).
 * Un id puede traer más de un label si el grafo vivo ya tiene una
 * ambigüedad preexistente (mismo id en dos nodos con label distinto) —
 * ver `resolveLiveLabel`. Esto es una condición preexistente del grafo, no
 * algo introducido por este loader.
 *
 * @param {string} filePath
 * @returns {Record<string, string[]>}
 */
export function loadLiveLabelSnapshot(filePath) {
  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const labels = raw && typeof raw === 'object' && raw.labels ? raw.labels : raw;
  return labels && typeof labels === 'object' ? labels : {};
}

// Orden de preferencia cuando un id ya existe en el grafo vivo bajo MÁS DE
// un label (ambigüedad preexistente — p.ej. `beauveria_bassiana` catalogado
// a la vez como `BeneficialOrganism` y `Biopreparado`). No resuelve la
// ambigüedad de fondo (eso es un problema de calidad de datos del grafo,
// fuera de alcance de este loader) — solo decide determinísticamente a cuál
// de los nodos existentes apunta la arista nueva, y lo deja explícito en el
// reporte (`ambiguousLiveMatches`) para revisión humana.
export const LABEL_PRIORITY = [
  'Species', 'Pest', 'Variety', 'Family', 'BeneficialOrganism', 'Biopreparado',
  'Animal', 'Fermento', 'Origen', 'RoleInGuild', 'PisoTermico', 'Region',
  'RegionalLabel', 'Source',
];

/**
 * Resuelve el label "primario" para un id dado su lista de labels en el
 * grafo vivo. Si trae un único label, ese es. Si trae varios, se usa
 * `LABEL_PRIORITY`; si ninguno de los candidatos está priorizado, se elige
 * el primero en orden alfabético (determinístico, no arbitrario).
 *
 * @param {string[]} liveLabelsForId
 * @returns {{label:string, ambiguous:boolean, candidates?:string[]}|null}
 */
export function resolveLiveLabel(liveLabelsForId) {
  if (!Array.isArray(liveLabelsForId) || liveLabelsForId.length === 0) return null;
  if (liveLabelsForId.length === 1) return { label: liveLabelsForId[0], ambiguous: false };
  const candidates = [...liveLabelsForId].sort();
  const byPriority = LABEL_PRIORITY.find((l) => candidates.includes(l));
  return { label: byPriority || candidates[0], ambiguous: true, candidates };
}

// Heurísticas para estimar el label de un id GENUINAMENTE nuevo (no existe
// en el grafo vivo) a partir de su propio texto. Cubre los dos casos reales
// vistos en el corpus de "huecos" (agua/riego, incendios, micorrizas-suelo):
// conceptos de suelo (`suelo_...`, `soil_fertility`) y de prácticas de
// manejo. Deliberadamente conservador: solo dos labels nuevos con evidencia
// real en los DR de esta línea de trabajo (ver queue/081 — "micorrizas
// sería el primer nodo Soil real del grafo"); todo lo demás cae en el
// fallback `GraphGapNode`, igual que antes de la reconciliación.
export const NEW_NODE_LABEL_HINTS = [
  { pattern: /(^|_)(suelo|soil)(_|$)/i, label: 'Soil' },
  { pattern: /(^|_)(practica|manejo|practice)(_|$)/i, label: 'Practice' },
];

/**
 * Estima el label de un id nuevo (no reconciliado contra el grafo vivo).
 * Primero prueba el propio texto del id (más específico — p.ej.
 * `soil_fertility` ya lo dice todo aunque el TIPO de la arista sea el
 * genérico `AFFECTS`); si no matchea, prueba el/los TIPO(s) de arista donde
 * el id participa como **destino** (objeto de la relación — p.ej. un futuro
 * `AFFECTS_SOIL_FERTILITY`; el origen de esa arista típicamente es un
 * animal/práctica que AFECTA el suelo, no el suelo en sí — ver
 * `buildNodeLabelPlan`, que es quien decide qué TIPOs pasar aquí). Si nada
 * matchea, fallback a `GraphGapNode`.
 *
 * @param {string} nodeId
 * @param {Iterable<string>} [relTypes] - TIPOs de arista donde el id es destino
 * @returns {string}
 */
export function estimateNewNodeLabel(nodeId, relTypes = []) {
  for (const hint of NEW_NODE_LABEL_HINTS) {
    if (hint.pattern.test(nodeId)) return hint.label;
  }
  for (const relType of relTypes) {
    if (/SOIL/.test(relType)) return 'Soil';
    if (/PRACTIC|MANEJO|MANAGEMENT/.test(relType)) return 'Practice';
  }
  return NODE_LABEL;
}

/**
 * Construye el plan de labels para todos los ids (origen+destino) de un
 * batch de aristas curadas: para cada id, decide si ya existe en el grafo
 * vivo (y con qué label real) o si es nuevo (con label estimado).
 *
 * Nota de dirección: el TIPO de arista solo se usa como señal secundaria de
 * `estimateNewNodeLabel` cuando el id aparece como **destino** (objeto) de
 * esa relación — no como origen. Ej.: en
 * `cerdo -[AFFECTS_SOIL_FERTILITY]-> suelo_(...)`, el TIPO "suelo-ish" es
 * evidencia razonable para `suelo_(...)` (destino) pero NO para `cerdo`
 * (origen, claramente un animal) — usar el TIPO sin importar la dirección
 * fue un bug real encontrado corriendo este loader contra el corpus real
 * (etiquetaba `cerdo_(sus_scrofa_domesticus)` como `Soil`).
 *
 * @param {Array<{origen:string,tipo:string,destino:string}>} acceptedEdges
 * @param {Record<string,string[]>} [liveLabels]
 * @returns {{plan: Map<string,{label:string,isLive:boolean,ambiguous:boolean}>, ambiguous: Array<{id:string,labels:string[],chosen:string}>}}
 */
export function buildNodeLabelPlan(acceptedEdges, liveLabels = {}) {
  const allNodeIds = new Set();
  const destinoRelTypesByNode = new Map();
  for (const e of acceptedEdges) {
    allNodeIds.add(e.origen);
    allNodeIds.add(e.destino);
    if (!destinoRelTypesByNode.has(e.destino)) destinoRelTypesByNode.set(e.destino, new Set());
    destinoRelTypesByNode.get(e.destino).add(e.tipo);
  }

  const plan = new Map();
  const ambiguous = [];
  for (const nodeId of allNodeIds) {
    const resolved = resolveLiveLabel(liveLabels[nodeId]);
    if (resolved) {
      plan.set(nodeId, { label: resolved.label, isLive: true, ambiguous: resolved.ambiguous });
      if (resolved.ambiguous) {
        ambiguous.push({ id: nodeId, labels: resolved.candidates, chosen: resolved.label });
      }
    } else {
      const relTypes = destinoRelTypesByNode.get(nodeId) || new Set();
      plan.set(nodeId, { label: estimateNewNodeLabel(nodeId, relTypes), isLive: false, ambiguous: false });
    }
  }
  return { plan, ambiguous };
}

// =============================================================================
// Detección genérica de tablas markdown
// =============================================================================

// Placeholder para proteger pipes escapados (`\|`, sintaxis GFM válida dentro
// de una celda — observado en al menos un DR real: "texto \| más texto") del
// split por `|`. Sin esto, una celda con un pipe escapado corta la fila en el
// lugar equivocado y desplaza fuente/confianza de las columnas siguientes.
const ESCAPED_PIPE_PLACEHOLDER = '\u0001';

/** Divide una línea `| a | b | c |` en celdas trimmeadas, respetando `\|` escapado. */
export function splitTableRow(line) {
  let s = line.trim().replace(/\\\|/g, ESCAPED_PIPE_PLACEHOLDER);
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim().split(ESCAPED_PIPE_PLACEHOLDER).join('|'));
}

/** true si todas las celdas son separadores markdown (`:--`, `---`, `--:`). */
export function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-{1,}:?$/.test(c.trim()));
}

/**
 * Encuentra todas las tablas markdown bien-formadas (header + fila separadora
 * + 0..n filas de cuerpo) en un texto. Ignora bloques `| ... |` que no traen
 * la fila separadora inmediatamente después (p.ej. una tabla degenerada por
 * un glitch de generación, sin filas de cuerpo reales).
 */
export function findMarkdownTables(text) {
  const lines = text.split(/\r?\n/);
  const tables = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith('|')) {
      const headerCells = splitTableRow(line);
      const sepLine = lines[i + 1];
      if (sepLine && sepLine.trim().startsWith('|') && isSeparatorRow(splitTableRow(sepLine))) {
        const rows = [];
        let j = i + 2;
        while (j < lines.length && lines[j].trim().startsWith('|')) {
          const cells = splitTableRow(lines[j]);
          if (!isSeparatorRow(cells)) rows.push(cells);
          j++;
        }
        tables.push({ headerCells, rows, startLine: i + 1 });
        i = j;
        continue;
      }
    }
    i++;
  }
  return tables;
}

// =============================================================================
// Clasificación de encabezados "tabla de aristas" (con alias)
// =============================================================================

function normalizeHeaderCell(cell) {
  return String(cell || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/_/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ORIGEN_ALIASES = new Set(['origen id', 'origen', 'nodoa', 'nodo a']);
const TIPO_ALIASES = new Set(['tipo', 'relacion', 'tipo relacion']);
const DESTINO_ALIASES = new Set(['destino id', 'destino', 'nodob', 'nodo b']);
const FUENTE_ALIASES = new Set(['fuente']);
const CONFIANZA_ALIASES = new Set(['confianza']);

/**
 * Clasifica un header de tabla como "tabla de aristas" si trae, a la vez,
 * una columna origen-like, una tipo-like y una destino-like (en cualquier
 * orden/posición). Requerir las tres a la vez es lo que descarta falsos
 * positivos como una tabla de índice de fuentes `Origen_ID | TIPO | Fuente |
 * Confianza` (sin destino) que aparece en al menos un DR real.
 *
 * @returns {{origenIdx:number,tipoIdx:number,destinoIdx:number,fuenteIdx:number,confianzaIdx:number}|null}
 */
export function classifyEdgeHeader(headerCells) {
  const normalized = headerCells.map(normalizeHeaderCell);
  const origenIdx = normalized.findIndex((c) => ORIGEN_ALIASES.has(c));
  const tipoIdx = normalized.findIndex((c) => TIPO_ALIASES.has(c));
  const destinoIdx = normalized.findIndex((c) => DESTINO_ALIASES.has(c));
  if (origenIdx === -1 || tipoIdx === -1 || destinoIdx === -1) return null;
  const fuenteIdx = normalized.findIndex((c) => FUENTE_ALIASES.has(c));
  const confianzaIdx = normalized.findIndex((c) => CONFIANZA_ALIASES.has(c));
  return { origenIdx, tipoIdx, destinoIdx, fuenteIdx, confianzaIdx };
}

// =============================================================================
// Extracción de aristas crudas
// =============================================================================

/**
 * Recorre todas las tablas del texto, clasifica cuáles son tablas de
 * aristas, y extrae las filas como cuádruplos crudos (sin curar todavía).
 */
export function extractRawEdgesFromText(text) {
  const tables = findMarkdownTables(text);
  const rawEdges = [];
  let edgeTablesFound = 0;
  let malformedRowCount = 0;
  for (const table of tables) {
    const cols = classifyEdgeHeader(table.headerCells);
    if (!cols) continue;
    edgeTablesFound++;
    for (const row of table.rows) {
      const origen = row[cols.origenIdx];
      const tipo = row[cols.tipoIdx];
      const destino = row[cols.destinoIdx];
      if (!origen || !tipo || !destino) {
        malformedRowCount++;
        continue;
      }
      const fuente = cols.fuenteIdx >= 0 ? (row[cols.fuenteIdx] || '') : '';
      const confianza = cols.confianzaIdx >= 0 ? (row[cols.confianzaIdx] || '') : '';
      rawEdges.push({
        origen: origen.trim(),
        tipo: tipo.trim(),
        destino: destino.trim(),
        fuente: fuente.trim(),
        confianza: confianza.trim(),
        tableStartLine: table.startLine,
      });
    }
  }
  return { tablesFound: tables.length, edgeTablesFound, rawEdges, malformedRowCount };
}

// =============================================================================
// Normalización + curación (anti-alucinación, CO-strict)
// =============================================================================

export function slugifyId(raw) {
  return String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
}

export function sanitizeRelType(tipo) {
  let s = String(tipo || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!s) return null;
  if (/^[0-9]/.test(s)) s = `REL_${s}`;
  return s;
}

const CONFIANZA_MAP = { alta: 'alta', media: 'media', baja: 'baja' };
export function normalizeConfianza(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (CONFIANZA_MAP[s]) return CONFIANZA_MAP[s];
  return s ? 'sin_normalizar' : 'sin_dato';
}

/** Heurística de scoping CO/Andes sobre el título + intro del DR (primeros ~4000 chars). */
export function isColombiaScopedText(text) {
  return CO_SCOPE_RE.test(text.slice(0, 4000));
}

/**
 * Cura una lista de aristas crudas de un mismo DR. Reglas de descarte:
 *   - dr_no_co_scoped: el DR no declara scope Colombia/Andes.
 *   - tipo_invalido: TIPO vacío tras sanitizar.
 *   - nodo_vacio: origen/destino vacío tras slugify.
 *   - sin_fuente: columna fuente vacía (anti-alucinación — no hay cita).
 *   - duplicado: mismo (origen,tipo,destino) ya visto en este DR.
 */
export function curateRawEdges(rawEdges, { drScoped, drId }) {
  const accepted = [];
  const rejected = [];
  const seen = new Set();
  for (const raw of rawEdges) {
    if (!drScoped) { rejected.push({ ...raw, reason: 'dr_no_co_scoped' }); continue; }
    const tipo = sanitizeRelType(raw.tipo);
    if (!tipo) { rejected.push({ ...raw, reason: 'tipo_invalido' }); continue; }
    const origen = slugifyId(raw.origen);
    const destino = slugifyId(raw.destino);
    if (!origen || !destino) { rejected.push({ ...raw, reason: 'nodo_vacio' }); continue; }
    if (!raw.fuente) { rejected.push({ ...raw, reason: 'sin_fuente' }); continue; }
    const key = `${origen}|${tipo}|${destino}`;
    if (seen.has(key)) { rejected.push({ ...raw, reason: 'duplicado' }); continue; }
    seen.add(key);
    accepted.push({
      origen,
      tipo,
      destino,
      fuente: raw.fuente,
      confianza: normalizeConfianza(raw.confianza),
      confianzaRaw: raw.confianza,
      drId,
      isKnownRelationType: KNOWN_RELATION_TYPES.has(tipo),
    });
  }
  const byReason = {};
  for (const r of rejected) byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  return { accepted, rejected, byReason };
}

// =============================================================================
// Generación de Cypher (reutiliza primitivas de catalog-to-age.mjs)
// =============================================================================

/**
 * Construye los statements SQL `SELECT * FROM cypher(...)` para un batch de
 * aristas ya curadas. Dedupea el MERGE de nodo por id (el mismo id puede
 * aparecer en decenas de aristas dentro y entre DRs) para no inflar el
 * archivo de salida con el mismo MERGE repetido.
 *
 * Reconciliación (`liveLabels`, opcional): para un id que YA existe en el
 * grafo vivo, NO se emite un `MERGE` de nodo — la arista se conecta por
 * `MATCH` directo contra el nodo real (ver `emitRel`), con su label real
 * (Species/Pest/...). Así el apply es idempotente y no crea un
 * `GraphGapNode` paralelo ni toca las propiedades del nodo existente. Solo
 * los ids genuinamente nuevos (no encontrados en `liveLabels`) reciben un
 * `MERGE` de nodo, con label estimado (`estimateNewNodeLabel`).
 *
 * @param {Array<object>} acceptedEdges
 * @param {{graph?:string, dateStr?:string, liveLabels?:Record<string,string[]>}} [opts]
 */
export function buildCypherStatements(acceptedEdges, { graph = 'chagra_kg', dateStr, liveLabels = {} } = {}) {
  const statements = [];
  const emittedNodes = new Set();
  const today = dateStr || new Date().toISOString().slice(0, 10);
  const { plan, ambiguous } = buildNodeLabelPlan(acceptedEdges, liveLabels);
  let newNodeMergeCount = 0;
  let reconciledNodeCount = 0;
  const reconciledByLabel = {};
  const newByEstimatedLabel = {};

  for (const e of acceptedEdges) {
    const drRef = `${RESEARCH_SOURCE_PREFIX}:${e.drId}`;
    for (const nodeId of [e.origen, e.destino]) {
      if (emittedNodes.has(nodeId)) continue;
      emittedNodes.add(nodeId);
      const info = plan.get(nodeId);
      if (info.isLive) {
        // Nodo ya existe en chagra_kg — se referencia por MATCH en la
        // arista (abajo), sin tocar sus propiedades.
        reconciledNodeCount++;
        reconciledByLabel[info.label] = (reconciledByLabel[info.label] || 0) + 1;
        continue;
      }
      newNodeMergeCount++;
      newByEstimatedLabel[info.label] = (newByEstimatedLabel[info.label] || 0) + 1;
      statements.push(wrapCypher(graph, emitNode(info.label, {
        id: nodeId,
        source: drRef,
        added_at: today,
      })));
    }
    statements.push(wrapCypher(graph, emitRel(
      { label: plan.get(e.origen).label, id: e.origen },
      e.tipo,
      { label: plan.get(e.destino).label, id: e.destino },
      {
        source: e.fuente,
        confidence: e.confianza,
        dr: drRef,
        added_at: today,
      },
    )));
  }
  return {
    statements,
    nodeCount: emittedNodes.size,
    newNodeMergeCount,
    reconciledNodeCount,
    reconciledByLabel,
    newByEstimatedLabel,
    ambiguousLiveMatches: ambiguous,
  };
}

// =============================================================================
// Procesamiento por DR + reporte agregado
// =============================================================================

export function drIdFromPath(filePath) {
  return basename(filePath).replace(/\.md$/i, '');
}

export function processDrFile(filePath) {
  const text = readFileSync(filePath, 'utf8');
  const drId = drIdFromPath(filePath);
  const drScoped = isColombiaScopedText(text);
  const { tablesFound, edgeTablesFound, rawEdges, malformedRowCount } = extractRawEdgesFromText(text);
  const { accepted, rejected, byReason } = curateRawEdges(rawEdges, { drScoped, drId });
  const relationTypeCounts = {};
  for (const e of accepted) relationTypeCounts[e.tipo] = (relationTypeCounts[e.tipo] || 0) + 1;
  return {
    drId,
    filePath,
    drScoped,
    tablesFound,
    edgeTablesFound,
    rawEdgeCount: rawEdges.length,
    malformedRowCount,
    acceptedCount: accepted.length,
    rejectedCount: rejected.length,
    rejectedByReason: byReason,
    relationTypeCounts,
    accepted,
    rejected,
  };
}

export function buildDryRunReport(perDrResults, { graph = 'chagra_kg' } = {}) {
  const allAccepted = perDrResults.flatMap((r) => r.accepted);
  const relationTypeCounts = {};
  for (const e of allAccepted) relationTypeCounts[e.tipo] = (relationTypeCounts[e.tipo] || 0) + 1;
  const rejectedByReason = {};
  for (const r of perDrResults) {
    for (const [reason, count] of Object.entries(r.rejectedByReason)) {
      rejectedByReason[reason] = (rejectedByReason[reason] || 0) + count;
    }
  }
  const newRelationTypes = [...new Set(allAccepted.map((e) => e.tipo))]
    .filter((t) => !KNOWN_RELATION_TYPES.has(t)).sort();
  const nodeIds = new Set();
  for (const e of allAccepted) { nodeIds.add(e.origen); nodeIds.add(e.destino); }

  return {
    graph,
    generatedAt: new Date().toISOString(),
    drCount: perDrResults.length,
    totals: {
      tablesFound: perDrResults.reduce((n, r) => n + r.tablesFound, 0),
      edgeTablesFound: perDrResults.reduce((n, r) => n + r.edgeTablesFound, 0),
      rawEdges: perDrResults.reduce((n, r) => n + r.rawEdgeCount, 0),
      malformedRows: perDrResults.reduce((n, r) => n + r.malformedRowCount, 0),
      accepted: allAccepted.length,
      rejected: perDrResults.reduce((n, r) => n + r.rejectedCount, 0),
      newNodeIds: nodeIds.size,
    },
    relationTypeCounts,
    newRelationTypes,
    rejectedByReason,
    perDr: perDrResults.map((r) => ({
      drId: r.drId,
      drScoped: r.drScoped,
      tablesFound: r.tablesFound,
      edgeTablesFound: r.edgeTablesFound,
      rawEdgeCount: r.rawEdgeCount,
      malformedRowCount: r.malformedRowCount,
      acceptedCount: r.acceptedCount,
      rejectedCount: r.rejectedCount,
      rejectedByReason: r.rejectedByReason,
      relationTypeCounts: r.relationTypeCounts,
    })),
  };
}

export function formatReportText(report) {
  const lines = [];
  lines.push(`[age-graph-gaps] modo=DRY-RUN (no se tocó ${report.graph})`);
  lines.push(`[age-graph-gaps] DRs procesadas: ${report.drCount}`);
  lines.push(`[age-graph-gaps] tablas detectadas: ${report.totals.tablesFound} (de aristas: ${report.totals.edgeTablesFound})`);
  lines.push(`[age-graph-gaps] aristas crudas: ${report.totals.rawEdges} | filas malformadas: ${report.totals.malformedRows}`);
  lines.push(`[age-graph-gaps] aristas aceptadas: ${report.totals.accepted} | descartadas: ${report.totals.rejected}`);
  lines.push(`[age-graph-gaps] nodos nuevos (ids únicos): ${report.totals.newNodeIds}`);
  lines.push('[age-graph-gaps] descartes por motivo:');
  for (const [reason, count] of Object.entries(report.rejectedByReason).sort((a, b) => b[1] - a[1])) {
    lines.push(`  - ${reason}: ${count}`);
  }
  lines.push('[age-graph-gaps] aristas aceptadas por tipo de relación:');
  for (const [tipo, count] of Object.entries(report.relationTypeCounts).sort((a, b) => b[1] - a[1])) {
    const known = KNOWN_RELATION_TYPES.has(tipo) ? '' : ' (NUEVO)';
    lines.push(`  - ${tipo}: ${count}${known}`);
  }
  lines.push('[age-graph-gaps] por DR:');
  for (const dr of report.perDr) {
    lines.push(`  - ${dr.drId}: aceptadas=${dr.acceptedCount} descartadas=${dr.rejectedCount} tablas_aristas=${dr.edgeTablesFound}/${dr.tablesFound} scoped_co=${dr.drScoped ? 'si' : 'no'}`);
  }
  if (report.reconciliation) {
    const rc = report.reconciliation;
    lines.push(`[age-graph-gaps] reconciliación live-labels: snapshot=${rc.liveLabelsProvided ? 'si' : 'no'}`);
    lines.push(`[age-graph-gaps] nodos referenciados: ${rc.totalNodeIds} | reconciliados (label real): ${rc.reconciledCount} | nuevos (label estimado): ${rc.newCount}`);
    if (rc.reconciledCount) {
      lines.push('[age-graph-gaps] reconciliados por label real (MATCH, sin MERGE de nodo):');
      for (const [label, count] of Object.entries(rc.reconciledByLabel).sort((a, b) => b[1] - a[1])) {
        lines.push(`  - ${label}: ${count}`);
      }
    }
    if (rc.newCount) {
      lines.push('[age-graph-gaps] nuevos por label estimado (MERGE de nodo):');
      for (const [label, count] of Object.entries(rc.newByEstimatedLabel).sort((a, b) => b[1] - a[1])) {
        lines.push(`  - ${label}: ${count}`);
      }
    }
    if (rc.ambiguousMatches.length) {
      lines.push(`[age-graph-gaps] AVISO: ${rc.ambiguousMatches.length} id(s) con más de un label en el grafo vivo (ambigüedad preexistente, no introducida por este loader):`);
      for (const a of rc.ambiguousMatches) {
        lines.push(`  - ${a.id}: candidatos=[${a.labels.join(', ')}] elegido=${a.chosen}`);
      }
    }
  }
  return lines.join('\n');
}

// =============================================================================
// CLI
// =============================================================================

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

export function parseArgs(argv) {
  const opts = {
    drDir: process.env.CHAGRA_AGE_GAPS_DR_DIR || '',
    globs: [],
    files: [],
    outCypher: process.env.CHAGRA_AGE_GAPS_OUT_CYPHER || '',
    outReport: process.env.CHAGRA_AGE_GAPS_OUT_REPORT || '',
    liveLabels: process.env.CHAGRA_AGE_GAPS_LIVE_LABELS || '',
    graph: 'chagra_kg',
    json: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dr-dir') opts.drDir = argv[++i];
    else if (a === '--glob') opts.globs.push(argv[++i]);
    else if (a === '--file') opts.files.push(argv[++i]);
    else if (a === '--out-cypher') opts.outCypher = argv[++i];
    else if (a === '--out-report') opts.outReport = argv[++i];
    else if (a === '--live-labels') opts.liveLabels = argv[++i];
    else if (a === '--graph') opts.graph = argv[++i];
    else if (a === '--json') opts.json = true;
    else if (a === '--help' || a === '-h') opts.help = true;
  }
  return opts;
}

/** Resuelve la lista final de archivos (unión de --glob y --file, deduplicada). */
export function resolveFileList(opts) {
  const resolved = new Set();
  if (opts.globs.length) {
    const entries = readdirSync(opts.drDir);
    const regexes = opts.globs.map(globToRegExp);
    for (const entry of entries) {
      if (regexes.some((re) => re.test(entry))) {
        resolved.add(resolve(opts.drDir, entry));
      }
    }
  }
  for (const f of opts.files) {
    resolved.add(resolve(opts.drDir, f));
  }
  return [...resolved].sort();
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log([
      'Usage: node scripts/load-age-graph-gaps.mjs --dr-dir DIR [--glob PATTERN]... [--file NAME]... [--live-labels FILE] [--out-cypher FILE] [--out-report FILE] [--graph chagra_kg] [--json]',
      '',
      'BUILD + DRY-RUN: nunca se conecta a AGE/postgres. Genera Cypher + reporte a archivo.',
      '--live-labels FILE (o env CHAGRA_AGE_GAPS_LIVE_LABELS): snapshot read-only',
      'del grafo vivo ({ labels: { "<id>": ["Species", ...] } }) para reconciliar',
      'MERGE contra nodos reales en vez de crear GraphGapNode paralelos.',
    ].join('\n'));
    return 0;
  }
  if (!opts.drDir) {
    console.error('ERROR: falta --dr-dir (o env CHAGRA_AGE_GAPS_DR_DIR). Las DRs viven fuera de este repo.');
    return 2;
  }
  if (!opts.globs.length && !opts.files.length) {
    console.error('ERROR: pasa al menos un --glob o --file para seleccionar qué DRs procesar.');
    return 2;
  }

  const files = resolveFileList(opts);
  if (!files.length) {
    console.error(`ERROR: no se encontró ningún archivo con los --glob/--file dados bajo ${opts.drDir}`);
    return 2;
  }

  const liveLabels = opts.liveLabels ? loadLiveLabelSnapshot(opts.liveLabels) : {};

  const perDrResults = files.map((f) => processDrFile(f));
  const allAccepted = perDrResults.flatMap((r) => r.accepted);
  const {
    statements, nodeCount, newNodeMergeCount, reconciledNodeCount,
    reconciledByLabel, newByEstimatedLabel, ambiguousLiveMatches,
  } = buildCypherStatements(allAccepted, { graph: opts.graph, liveLabels });
  const report = buildDryRunReport(perDrResults, { graph: opts.graph });
  report.totals.cypherStatements = statements.length;
  report.totals.cypherNodeMerges = newNodeMergeCount;
  report.reconciliation = {
    liveLabelsProvided: Boolean(opts.liveLabels),
    totalNodeIds: nodeCount,
    reconciledCount: reconciledNodeCount,
    newCount: newNodeMergeCount,
    reconciledByLabel,
    newByEstimatedLabel,
    ambiguousMatches: ambiguousLiveMatches,
  };

  const outCypher = opts.outCypher || join(_here, '..', '.local', 'age-graph-gaps', 'gaps.cypher.sql');
  const outReport = opts.outReport || join(_here, '..', '.local', 'age-graph-gaps', 'gaps.report.json');
  mkdirSync(dirname(outCypher), { recursive: true });
  mkdirSync(dirname(outReport), { recursive: true });

  const cypherHeader = [
    '-- Generado por scripts/load-age-graph-gaps.mjs — DRY-RUN, NO aplicado.',
    `-- Grafo destino: ${opts.graph}`,
    `-- DRs fuente: ${perDrResults.map((r) => r.drId).join(', ')}`,
    `-- Statements: ${statements.length} (MERGE/MATCH, idempotente, no destructivo)`,
    `-- Reconciliación live-labels: ${opts.liveLabels ? 'aplicada' : 'NO aplicada (todo id tratado como nuevo)'} — ` +
      `${reconciledNodeCount} nodo(s) reconciliado(s) contra label real (MATCH, sin MERGE), ${newNodeMergeCount} nodo(s) nuevo(s) (MERGE).`,
    '-- Revisión humana requerida antes de ejecutar contra postgres-farm.',
    '',
    "LOAD 'age';",
    'SET search_path = ag_catalog, "$user", public;',
    '',
  ].join('\n');
  writeFileSync(outCypher, `${cypherHeader}${statements.join('\n\n')}\n`, 'utf8');
  writeFileSync(outReport, JSON.stringify(report, null, 2), 'utf8');

  if (opts.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(formatReportText(report));
  }
  console.log(`[age-graph-gaps] Cypher escrito en ${outCypher}`);
  console.log(`[age-graph-gaps] Reporte escrito en ${outReport}`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
