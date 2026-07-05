#!/usr/bin/env node
/**
 * export-cultivos-insignia.mjs — exporta los CULTIVOS INSIGNIA del grafo de
 * conocimiento `chagra_kg` a public/cultivos-insignia.json, porque la PWA NO
 * consulta AGE en vivo (mismo patrón que public/nutricion-humana.json y
 * public/soil-life).
 *
 * Por cada cultivo insignia trae, GROUNDED en el grafo (cero invención):
 *   - familia botánica (HAS_FAMILY), hábito (HAS_HABIT)
 *   - piso(s) térmico(s) donde va (GROWS_IN → PisoTermico: altitud + temp)
 *   - qué demanda del suelo N/P/K (DEMANDA_NUTRIENTE: nivel + nota + fuente)
 *   - con qué se asocia (COMPATIBLE_WITH) y con qué NO (INCOMPATIBLE_WITH)
 *   - qué lo ataca (SUSCEPTIBLE_TO → Pest) y con qué se maneja (Pest←CONTROLS)
 *
 * Ejecuta las queries Cypher vía `ssh alpha` contra el contenedor
 * postgres-farm (AGE 1.5). Idempotente: reescribe el JSON completo.
 *
 * Uso:  node scripts/export-cultivos-insignia.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'cultivos-insignia.json');

// Roster de cultivos insignia: id de grafo + emoji + término Wikimedia (para
// el manifest de fotos, en export-cultivos-fotos.mjs). El orden = editorial.
const ROSTER = [
  { id: 'zea_mays', emoji: '🌽', slug: 'maiz' },
  { id: 'phaseolus_vulgaris', emoji: '🫘', slug: 'frijol' },
  { id: 'cucurbita_moschata', emoji: '🎃', slug: 'ahuyama' },
  { id: 'solanum_tuberosum', emoji: '🥔', slug: 'papa' },
  { id: 'coffea_arabica', emoji: '☕', slug: 'cafe' },
  { id: 'persea_americana', emoji: '🥑', slug: 'aguacate' },
  { id: 'solanum_lycopersicum', emoji: '🍅', slug: 'tomate' },
  { id: 'musa_paradisiaca', emoji: '🍌', slug: 'platano' },
  { id: 'theobroma_cacao', emoji: '🍫', slug: 'cacao' },
  { id: 'saccharum_officinarum', emoji: '🎋', slug: 'cana' },
  { id: 'allium_cepa', emoji: '🧅', slug: 'cebolla' },
  { id: 'daucus_carota_subsp_sativus', emoji: '🥕', slug: 'zanahoria' },
];
const IDS = ROSTER.map((r) => r.id);
const IDS_CYPHER = '[' + IDS.map((i) => JSON.stringify(i)).join(', ') + ']';

/** Corre una query Cypher en alpha y devuelve las filas como arrays de celdas. */
function cypher(query, cols) {
  const colDefs = cols.map((c) => `${c} agtype`).join(', ');
  const sql = `LOAD 'age'; SET search_path=ag_catalog,public;
SELECT * FROM cypher('chagra_kg', $$ ${query} $$) AS (${colDefs});`;
  const remote = `sudo podman exec -i postgres-farm psql -U farmos -d chagra_kg -t -A -F '' -c ${shq(sql)}`;
  const out = execFileSync('ssh', ['alpha', remote], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  return out
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== 'LOAD' && l !== 'SET')
    .map((l) => l.split('').map((cell) => parseAg(cell)));
}

function shq(s) {
  return `'${s.replace(/'/g, `'\\''`)}'`;
}

/** agtype → JS: quita comillas de strings, castea números, null. */
function parseAg(cell) {
  if (cell === '' || cell === 'null') return null;
  if (/^-?\d+$/.test(cell)) return Number(cell);
  const m = cell.match(/^"([\s\S]*)"$/);
  if (m) return m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  return cell;
}

console.error('· Base (familia, hábito, piso, categoría)…');
const base = new Map();
for (const [id, nombre, cientifico, categoria, familia] of cypher(
  `MATCH (s:Species) WHERE s.id IN ${IDS_CYPHER}
   OPTIONAL MATCH (s)-[:HAS_FAMILY]->(f:Family)
   RETURN s.id, s.nombre_comun, s.nombre_cientifico, s.categoria, f.nombre`,
  ['id', 'nombre', 'cientifico', 'categoria', 'familia'],
)) {
  base.set(id, { id, nombre, cientifico, categoria, familia, habito: null, pisos: [], npk: {}, asocia: [], incompat: [], plagas: [] });
}

console.error('· Hábito…');
for (const [id, habito] of cypher(
  `MATCH (s:Species)-[:HAS_HABIT]->(h:Habito) WHERE s.id IN ${IDS_CYPHER} RETURN s.id, h.id`,
  ['id', 'habito'],
)) {
  if (base.has(id) && !base.get(id).habito) base.get(id).habito = habito;
}

console.error('· Pisos térmicos…');
for (const [id, piso, altMin, altMax, temp] of cypher(
  `MATCH (s:Species)-[:GROWS_IN]->(p:PisoTermico) WHERE s.id IN ${IDS_CYPHER}
   RETURN s.id, p.id, p.altitud_min, p.altitud_max, p.temp_media_c`,
  ['id', 'piso', 'altMin', 'altMax', 'temp'],
)) {
  if (base.has(id)) base.get(id).pisos.push({ id: piso, altMin, altMax, temp });
}

console.error('· N/P/K (DEMANDA_NUTRIENTE)…');
for (const [id, nutriente, nivel, nota, fuente] of cypher(
  `MATCH (s:Species)-[r:DEMANDA_NUTRIENTE]->() WHERE s.id IN ${IDS_CYPHER}
   RETURN s.id, r.nutriente, r.nivel, r.nota, r.fuente`,
  ['id', 'nutriente', 'nivel', 'nota', 'fuente'],
)) {
  if (base.has(id) && nutriente) base.get(id).npk[nutriente] = { nivel, nota, fuente };
}

console.error('· Asocios (COMPATIBLE_WITH)…');
for (const [id, cid, nombre] of cypher(
  `MATCH (s:Species)-[:COMPATIBLE_WITH]->(c:Species) WHERE s.id IN ${IDS_CYPHER}
   RETURN DISTINCT s.id, c.id, c.nombre_comun`,
  ['id', 'cid', 'nombre'],
)) {
  if (base.has(id) && nombre) base.get(id).asocia.push({ id: cid, nombre });
}

console.error('· Incompatibles (INCOMPATIBLE_WITH + ANTAGONIST_OF)…');
for (const rel of ['INCOMPATIBLE_WITH', 'ANTAGONIST_OF']) {
  for (const [id, cid, nombre] of cypher(
    `MATCH (s:Species)-[:${rel}]->(c:Species) WHERE s.id IN ${IDS_CYPHER}
     RETURN DISTINCT s.id, c.id, c.nombre_comun`,
    ['id', 'cid', 'nombre'],
  )) {
    if (base.has(id) && nombre && !base.get(id).incompat.some((x) => x.id === cid)) {
      base.get(id).incompat.push({ id: cid, nombre });
    }
  }
}

console.error('· Plagas (SUSCEPTIBLE_TO → Pest)…');
const pestOf = new Map(); // id → [{pid,nombre,tipo}]
for (const [id, pid, nombre, tipo] of cypher(
  `MATCH (s:Species)-[:SUSCEPTIBLE_TO]->(p:Pest) WHERE s.id IN ${IDS_CYPHER}
   RETURN DISTINCT s.id, p.id, p.nombre_comun, p.tipo`,
  ['id', 'pid', 'nombre', 'tipo'],
)) {
  if (!nombre) continue;
  if (!pestOf.has(id)) pestOf.set(id, []);
  pestOf.get(id).push({ pid, nombre, tipo });
}

console.error('· Controles de cada plaga (Pest ← CONTROLS)…');
const allPids = [...new Set([...pestOf.values()].flat().map((p) => p.pid))];
const controlsOf = new Map(); // pid → [{nombre,tipo}]
if (allPids.length) {
  const pidList = '[' + allPids.map((i) => JSON.stringify(i)).join(', ') + ']';
  for (const rel of ['CONTROLS', 'TARGETS_PEST']) {
    for (const [pid, tipo, nombre, nombreComun] of cypher(
      `MATCH (p:Pest)<-[:${rel}]-(x) WHERE p.id IN ${pidList}
       RETURN DISTINCT p.id, labels(x)[0], x.nombre, x.nombre_comun`,
      ['pid', 'tipo', 'nombre', 'nombreComun'],
    )) {
      const label = nombre || nombreComun;
      if (!label) continue;
      if (!controlsOf.has(pid)) controlsOf.set(pid, []);
      const arr = controlsOf.get(pid);
      if (!arr.some((c) => c.nombre === label)) arr.push({ nombre: label, tipo });
    }
  }
}

// Ensambla plagas con hasta 4 controles cada una.
for (const [id, pests] of pestOf) {
  if (!base.has(id)) continue;
  base.get(id).plagas = pests.map((p) => ({
    id: p.pid,
    nombre: p.nombre,
    tipo: p.tipo,
    controles: (controlsOf.get(p.pid) || []).slice(0, 4),
  }));
}

// Serializa en orden de roster, adosando emoji + slug de foto. Recorta asocios
// a un máximo editorial (12) para no saturar la UI; conserva todos en _full.
const cultivos = ROSTER.map((r) => {
  const c = base.get(r.id);
  if (!c) {
    console.error(`  ⚠ sin datos en grafo: ${r.id}`);
    return null;
  }
  return {
    ...c,
    emoji: r.emoji,
    fotoSlug: r.slug,
    asocia: c.asocia.slice(0, 12),
    asocia_total: c.asocia.length,
  };
}).filter(Boolean);

const payload = {
  _meta: {
    fuente: 'Grafo de conocimiento chagra_kg (Apache AGE) — export determinista',
    generado: new Date().toISOString().slice(0, 10),
    script: 'scripts/export-cultivos-insignia.mjs',
    nota: 'Datos GROUNDED en el grafo. Piso térmico: IDEAM/IGAC. N/P/K: Agrosavia/Fedearroz/FAO. Asocios y plagas: catálogo agroecológico Chagra. Cero invención de cifras.',
    cultivos: cultivos.length,
  },
  cultivos,
};

fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
console.error(`\n✓ ${cultivos.length} cultivos → ${path.relative(process.cwd(), OUT)}`);
for (const c of cultivos) {
  console.error(
    `  ${c.emoji} ${c.nombre.padEnd(28)} fam=${c.familia || '—'} pisos=${c.pisos.length} npk=${Object.keys(c.npk).join('')} asoc=${c.asocia_total} plagas=${c.plagas.length}`,
  );
}
