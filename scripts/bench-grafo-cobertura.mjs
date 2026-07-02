#!/usr/bin/env node
/**
 * bench-grafo-cobertura.mjs — Cobertura de la capa de conocimiento (Apache AGE `chagra_kg`, capa Co).
 *
 * READ-ONLY. Mide que fraccion de las relaciones que afirma el catalogo canonico
 * (especie->plaga, especie<->companera, especie<->antagonista, especie->biopreparado)
 * estan presentes como ARISTAS en el grafo AGE. Cuantifica los "holes": relaciones
 * que el catalogo conoce pero el grafo no tiene -> el agente no las puede aterrizar.
 *
 * Origen: el prompt del subagente de medicion de holes (2026-06-17), convertido en
 * bench recurrente para que la cobertura sea TENDENCIA visible (memoria
 * project-test-bench-automejorable). NO escribe en el grafo. NO inventa. Solo cuenta.
 *
 * Acceso AGE: `sudo podman exec -i <container> psql` via CHAGRA_DB_* (sin dependencia
 * pg, sin rutas personales en codigo). Salta limpio si la infra "age" no esta
 * disponible (p. ej. en CI) y bench/run.mjs lo salta.
 *
 * @module scripts/bench-grafo-cobertura
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDbCmd } from './lib/db-cmd.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const HISTORY_DIR = join(REPO_ROOT, 'bench', 'history');

// ── Acceso AGE (lote, sin pg) ──
function ageQuery(cypher, ncols) {
  const cols = Array.from({ length: ncols }, (_, i) => `c${i} agtype`).join(', ');
  const sql = `LOAD 'age'; SET search_path=ag_catalog,public; SELECT * FROM cypher('chagra_kg', $$ ${cypher} $$) as (${cols});`;
  const dbCmd = getDbCmd();
  const r = spawnSync(
    dbCmd.file,
    [...dbCmd.args, '-tAF', '\t', '-c', sql],
    { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 },
  );
  if (r.status !== 0) throw new Error('AGE no accesible: ' + String(r.stderr || r.error || '').slice(0, 200));
  return r.stdout
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => line.split('\t').map((x) => x.replace(/^"|"$/g, '')));
}

// ── Normalizador de nombre de plaga (igual que el plan de ingesta) ──
function norm(s) {
  if (!s) return '';
  return String(s)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/—.*$/, ' ')
    .replace(/\bf\.?\s*sp\.?/gi, '')
    .replace(/\bspp?\.?/gi, '')
    .replace(/\bvar\.?/gi, '')
    .replace(/[^a-zA-Záéíóúñ ]/gi, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function genusSp(s) {
  return norm(s).split(' ').slice(0, 2).join(' ');
}
function isGeneric(str) {
  return norm(str).split(' ').length < 2;
}

// ── Catalogo: encuentra el mas completo (full v3.x del repo privado vecino, o el del repo) ──
function loadCatalog() {
  const candidates = [
    process.env.CHAGRA_CATALOG_FULL,
    join(REPO_ROOT, '..', 'chagra-pro', 'data', 'catalog', 'chagra-catalog-full-v3.1.json'),
    join(REPO_ROOT, 'catalog', 'chagra-catalog-seed-v3.2.json'),
    join(REPO_ROOT, 'catalog', 'chagra-catalog-seed-v3.1.json'),
    join(REPO_ROOT, 'public', 'catalog', 'chagra-catalog-seed-v3.1.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) {
      const raw = JSON.parse(readFileSync(p, 'utf8'));
      const list = Array.isArray(raw) ? raw : raw.species || raw.especies || raw.entries || [];
      return { path: p, species: list };
    }
  }
  throw new Error('No encontre catalogo (define CHAGRA_CATALOG_FULL o ten ../chagra-pro/data/catalog/...).');
}

// Extrae relaciones de una especie del catalogo, defensivo ante variaciones de esquema.
function relsOf(sp) {
  const plagas = [...(sp.plagas_criticas || []), ...(sp.enfermedades_criticas || []), ...(sp.plagas || []), ...(sp.enfermedades || [])]
    .map((x) => (typeof x === 'string' ? x : x?.nombre || x?.nombre_cientifico || '')).filter(Boolean);
  const companions = (sp.companions || sp.companeras || []).map((x) => (typeof x === 'string' ? x : x?.id || x?.slug || '')).filter(Boolean);
  const antagonists = (sp.antagonists || sp.antagonistas || []).map((x) => (typeof x === 'string' ? x : x?.id || x?.slug || '')).filter(Boolean);
  const feeding = [];
  const steps = sp.feeding_plan_template?.primary_steps || [];
  for (const st of steps) if (st?.biofertilizer_slug) feeding.push(st.biofertilizer_slug);
  for (const b of sp.biopreparados || []) feeding.push(typeof b === 'string' ? b : b?.id || b?.slug);
  return { id: sp.id || sp.slug, plagas, companions, antagonists, feeding: feeding.filter(Boolean) };
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 1000) / 10 : 100;
}

function gitCommit() {
  const r = spawnSync('git', ['-C', REPO_ROOT, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}

function main() {
  // 1) Snapshot del grafo (pocas consultas en lote)
  const ageSpecies = new Set(ageQuery('MATCH (s:Species) RETURN s.id', 1).map((r) => r[0]));
  const agePestsRaw = ageQuery("MATCH (p:Pest) RETURN p.id, coalesce(p.nombre_cientifico,''), coalesce(p.nombre_comun,'')", 3);
  const ageBiopIds = new Set(ageQuery('MATCH (b:Biopreparado) RETURN b.id', 1).map((r) => r[0]));
  const tpPairs = ageQuery('MATCH (p:Pest)-[:TARGETS_PEST]->(s:Species) RETURN p.id, s.id', 2);
  const cwPairs = ageQuery('MATCH (a:Species)-[:COMPATIBLE_WITH]->(b:Species) RETURN a.id, b.id', 2);
  const aoPairs = ageQuery('MATCH (a:Species)-[:ANTAGONIST_OF]->(b:Species) RETURN a.id, b.id', 2);
  const ubPairs = ageQuery('MATCH (s:Species)-[:USED_AS_BIOPREPARADO]->(b:Biopreparado) RETURN s.id, b.id', 2);

  const tpSet = new Set(tpPairs.map((r) => r[0] + '|' + r[1]));
  const ubSet = new Set(ubPairs.map((r) => r[0] + '|' + r[1]));
  const undir = (a, b) => [a, b].sort().join('|');
  const cwSet = new Set(cwPairs.map((r) => undir(r[0], r[1])));
  const aoSet = new Set(aoPairs.map((r) => undir(r[0], r[1])));

  // lookup de plagas por nombre normalizado (id-derivado + nombre_cientifico + nombre_comun)
  const pestByNorm = new Map();
  const pestByGenusSp = new Map();
  for (const [id, sci, com] of agePestsRaw) {
    for (const cand of [sci, com, (id || '').replace(/_/g, ' ')].filter(Boolean)) {
      const n = norm(cand);
      if (n && !pestByNorm.has(n)) pestByNorm.set(n, id);
      const g = genusSp(cand);
      if (g.includes(' ') && !pestByGenusSp.has(g)) pestByGenusSp.set(g, id);
    }
  }
  function matchPest(str) {
    const n = norm(str);
    if (pestByNorm.has(n)) return pestByNorm.get(n);
    if (isGeneric(str)) {
      for (const [k, v] of pestByNorm) if (k === n && k.split(' ').length === 1) return v;
      return null;
    }
    const g = genusSp(str);
    if (g.includes(' ') && pestByGenusSp.has(g)) return pestByGenusSp.get(g);
    for (const [k, v] of pestByNorm) {
      if (k.split(' ').length < 2) continue;
      if (k.startsWith(n + ' ') || n.startsWith(k + ' ')) return v;
    }
    return null;
  }

  // 2) Recorre el catalogo y clasifica cada relacion: mapeable? cubierta?
  const { path: catPath, species } = loadCatalog();
  const cat = { tp: 0, cw: 0, ao: 0, ub: 0 }; // instancias declaradas
  const map = { tp: 0, cw: 0, ao: 0, ub: 0 }; // mapeables a nodos existentes
  const cov = { tp: 0, cw: 0, ao: 0, ub: 0 }; // ya presentes como arista
  let noNode = 0; // relacion con algun extremo sin nodo en AGE (hole profundo)

  for (const raw of species) {
    const sp = relsOf(raw);
    if (!sp.id) continue;
    const here = ageSpecies.has(sp.id);
    for (const pstr of sp.plagas) {
      cat.tp++;
      const pid = matchPest(pstr);
      if (!pid || !here) { noNode++; continue; }
      map.tp++;
      if (tpSet.has(pid + '|' + sp.id)) cov.tp++;
    }
    for (const c of sp.companions) {
      cat.cw++;
      if (!here || !ageSpecies.has(c)) { noNode++; continue; }
      map.cw++;
      if (cwSet.has(undir(sp.id, c))) cov.cw++;
    }
    for (const a of sp.antagonists) {
      cat.ao++;
      if (!here || !ageSpecies.has(a)) { noNode++; continue; }
      map.ao++;
      if (aoSet.has(undir(sp.id, a))) cov.ao++;
    }
    for (const b of sp.feeding) {
      cat.ub++;
      if (!here || !ageBiopIds.has(b)) { noNode++; continue; }
      map.ub++;
      if (ubSet.has(sp.id + '|' + b)) cov.ub++;
    }
  }

  const mapTotal = map.tp + map.cw + map.ao + map.ub;
  const covTotal = cov.tp + cov.cw + cov.ao + cov.ub;
  const metrics = {
    cobertura_pct: pct(covTotal, mapTotal),
    targets_pest_cov_pct: pct(cov.tp, map.tp),
    compatible_cov_pct: pct(cov.cw, map.cw),
    antagonist_cov_pct: pct(cov.ao, map.ao),
    biop_cov_pct: pct(cov.ub, map.ub),
    holes: mapTotal - covTotal,
    sin_nodo: noNode,
    relaciones_co: tpPairs.length + cwPairs.length + aoPairs.length + ubPairs.length,
  };

  // 3) Registro de historial estandar (schema v1)
  if (!existsSync(HISTORY_DIR)) mkdirSync(HISTORY_DIR, { recursive: true });
  const date = new Date().toISOString();
  const record = {
    schema: 1,
    bench: 'grafo-cobertura',
    date,
    model: null,
    config: 'age-chagra_kg/co',
    commit: gitCommit(),
    metrics,
    passCount: covTotal,
    failCount: metrics.holes,
    passPct: metrics.cobertura_pct,
    notes: `catalogo=${catPath.split('/').slice(-1)[0]} declaradas=${cat.tp + cat.cw + cat.ao + cat.ub} mapeables=${mapTotal} cubiertas=${covTotal}`,
    seed: false,
  };
  const fname = `grafo-cobertura__co-chagra_kg__${date.replace(/[:.]/g, '-')}.json`;
  writeFileSync(join(HISTORY_DIR, fname), JSON.stringify(record, null, 2) + '\n', 'utf8');

  console.log('=== GRAFO-COBERTURA (capa Co, chagra_kg) ===');
  console.log('catalogo:', catPath);
  console.log('relaciones declaradas (catalogo):', cat);
  console.log('mapeables (ambos nodos existen) :', map);
  console.log('cubiertas (arista presente)     :', cov);
  console.log('metricas:', metrics);
  console.log('historial:', fname);
  // Cobertura baja NO rompe el bench (es una medicion); solo informa.
  return 0;
}

try {
  process.exit(main());
} catch (e) {
  console.error('[grafo-cobertura] ' + e.message);
  process.exit(2);
}
