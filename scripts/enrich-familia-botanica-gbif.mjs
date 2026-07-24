#!/usr/bin/env node
/**
 * scripts/enrich-familia-botanica-gbif.mjs
 *
 * Rellena `familia_botanica` en los nodos Species del snapshot del grafo
 * (catalog/chagra-kg-graph-snapshot.json) usando el backbone taxonómico de
 * GBIF (api.gbif.org/v1/species/match) — la familia de un género es un hecho
 * determinista, no requiere investigación. Resuelve por GÉNERO (una llamada
 * por género, cacheada) con fallback a nivel especie cuando el género solo da
 * matchType NONE. Sin key, pool cortés.
 *
 * Uso: node scripts/enrich-familia-botanica-gbif.mjs [--dry]
 * Cache: catalog/_gbif-genus-family-cache.json (idempotente, re-usable).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = resolve(ROOT, 'catalog/chagra-kg-graph-snapshot.json');
const CACHE = resolve(ROOT, 'catalog/_gbif-genus-family-cache.json');
const DRY = process.argv.includes('--dry');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf-8')) : {};

async function gbifMatch(params) {
  const url = `https://api.gbif.org/v1/species/match?${params}`;
  for (let a = 1; a <= 4; a++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'chagra-agroecologia/1.0 (dev@guatoc.co)' } });
      if (r.status === 429 || r.status >= 500) { await sleep(800 * a); continue; }
      return await r.json();
    } catch { await sleep(600 * a); }
  }
  return null;
}

// género -> familia (cacheado). Fallback: match a nivel especie con un epíteto real del grafo.
async function familiaDeGenero(genus, sampleSci) {
  const key = genus.toLowerCase();
  if (cache[key] !== undefined) return cache[key];
  let fam = null;
  let d = await gbifMatch(`rank=GENUS&name=${encodeURIComponent(genus)}`);
  if (d && d.family && d.matchType !== 'NONE') fam = d.family;
  if (!fam && sampleSci) { // fallback: nombre científico completo (Zea mays -> Poaceae)
    d = await gbifMatch(`name=${encodeURIComponent(sampleSci)}`);
    if (d && d.family && d.matchType !== 'NONE') fam = d.family;
  }
  if (!fam) { // último recurso: género sin rank
    d = await gbifMatch(`name=${encodeURIComponent(genus)}`);
    if (d && d.family && d.matchType !== 'NONE') fam = d.family;
  }
  cache[key] = fam || null;
  writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  await sleep(120); // pool cortés
  return cache[key];
}

const genusOf = (n) => {
  const sci = (n.properties?.nombre_cientifico) || n.id || '';
  return sci.trim().split(/[ _]/)[0];
};

const g = JSON.parse(readFileSync(SNAP, 'utf-8'));
const species = g.nodes.filter((n) => (n.labels || []).includes('Species'));
const missing = species.filter((n) => !(n.properties || {}).familia_botanica);
console.log(`Species: ${species.length} · sin familia: ${missing.length}`);

// muestra un nombre científico por género (para el fallback especie-nivel)
const sampleByGenus = {};
for (const n of missing) {
  const gen = genusOf(n).toLowerCase();
  const sci = n.properties?.nombre_cientifico;
  if (sci && /\s|_/.test(sci) && !sampleByGenus[gen]) sampleByGenus[gen] = sci.replace(/_/g, ' ');
}

const genera = [...new Set(missing.map((n) => genusOf(n).toLowerCase()))].filter(Boolean).sort();
console.log(`géneros a resolver: ${genera.length}`);
let resueltos = 0;
for (let i = 0; i < genera.length; i++) {
  const gen = genera[i];
  const fam = await familiaDeGenero(gen[0].toUpperCase() + gen.slice(1), sampleByGenus[gen]);
  if (fam) resueltos++;
  if (i % 40 === 0 || i === genera.length - 1) console.log(`  ${i + 1}/${genera.length} · ${gen} -> ${fam || 'NONE'}`);
}
console.log(`géneros con familia: ${resueltos}/${genera.length}`);

// aplicar a las especies
let filled = 0; const sinFam = new Set();
for (const n of missing) {
  const fam = cache[genusOf(n).toLowerCase()];
  if (fam) { (n.properties ||= {}).familia_botanica = fam; filled++; }
  else sinFam.add(genusOf(n).toLowerCase());
}
console.log(`familia_botanica añadida a ${filled} especies · géneros sin resolver: ${sinFam.size} [${[...sinFam].slice(0, 20).join(', ')}]`);

if (DRY) { console.log('(dry-run: no escribo el snapshot)'); process.exit(0); }
writeFileSync(SNAP, JSON.stringify(g, null, 2) + '\n');
console.log('snapshot actualizado.');
