/**
 * scripts/scrape-gbif-vernacular.mjs
 *
 * Scrapes GBIF Species API for Spanish/CO vernacular names on species
 * that lack nombre_comunes_regionales in the catalog.
 *
 * Usage: node scripts/scrape-gbif-vernacular.mjs
 * Output: catalog/gbif-vernacular-CO.json
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, '../catalog/chagra-catalog-oss-subset-v3.2.json');
const OUTPUT_PATH = resolve(__dirname, '../catalog/gbif-vernacular-CO.json');
const GBIF_BASE = 'https://api.gbif.org/v1/species';
const BATCH_DELAY_MS = 200;

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GBIF ${res.status} for ${url}`);
  }
  return res.json();
}

async function getUsageKey(nombreCientifico) {
  const url = `${GBIF_BASE}/match?name=${encodeURIComponent(nombreCientifico)}`;
  const data = await fetchJson(url);
  if (data.confidence >= 80 && data.status === 'ACCEPTED' && data.usageKey) {
    return data.usageKey;
  }
  if (data.alternatives && data.alternatives.length > 0) {
    const best = data.alternatives.find(a => a.status === 'ACCEPTED' && a.usageKey);
    if (best) return best.usageKey;
  }
  return null;
}

async function getAllVernacularPages(usageKey) {
  const names = [];
  let offset = 0;
  const limit = 100;

  for (let attempt = 0; attempt < 10; attempt++) {
    const url = `${GBIF_BASE}/${usageKey}/vernacularNames?offset=${offset}&limit=${limit}`;
    const data = await fetchJson(url).catch(() => ({ results: [], endOfRecords: true }));
    if (!data.results) break;

    for (const r of data.results) {
      if (r.language === 'spa' || r.country === 'CO') {
        if (r.vernacularName && !names.includes(r.vernacularName)) {
          names.push(r.vernacularName);
        }
      }
    }

    if (data.endOfRecords) break;
    offset += limit;
  }

  return names.sort();
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export { fetchJson, getUsageKey, getAllVernacularPages };

async function main() {
  if (!existsSync(CATALOG_PATH)) {
    console.error(`Catalog not found: ${CATALOG_PATH}`);
    process.exit(1);
  }

  const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  const speciesList = catalog.species;

  if (!Array.isArray(speciesList)) {
    console.error('Catalog has no species array');
    process.exit(1);
  }

  const targetSpecies = speciesList.filter(s => !s.nombre_comunes_regionales || s.nombre_comunes_regionales.length === 0);
  console.log(`Total species: ${speciesList.length}`);
  console.log(`Species without comunes: ${targetSpecies.length}`);

  let existing = {};
  if (existsSync(OUTPUT_PATH)) {
    existing = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
    console.log(`Resuming from existing output with ${Object.keys(existing).length} entries`);
  }

  const results = { ...existing };
  let matchCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < targetSpecies.length; i++) {
    const s = targetSpecies[i];
    const slug = s.id;

    if (results[slug]) {
      skipCount++;
      continue;
    }

    const nc = s.nombre_cientifico;
    process.stdout.write(`[${i + 1}/${targetSpecies.length}] ${slug} (${nc})... `);

    try {
      const usageKey = await getUsageKey(nc);

      if (!usageKey) {
        console.log('NO MATCH');
        results[slug] = { nombres: [], fuente: 'gbif-vernacular' };
        failCount++;
        await sleep(BATCH_DELAY_MS);
        continue;
      }

      const names = await getAllVernacularPages(usageKey);

      if (names.length > 0) {
        console.log(`${names.length} names: ${names.join(', ')}`);
        matchCount++;
      } else {
        console.log('no spa/CO names');
        failCount++;
      }

      results[slug] = { nombres: names, fuente: 'gbif-vernacular' };
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results[slug] = { nombres: [], fuente: 'gbif-vernacular', error: err.message };
      failCount++;
    }

    await sleep(BATCH_DELAY_MS);
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2) + '\n', 'utf-8');
  console.log(`\nDone. Written to ${OUTPUT_PATH}`);
  console.log(`Matches: ${matchCount}, No match/fail: ${failCount}, Skipped: ${skipCount}`);
  console.log(`Total entries: ${Object.keys(results).length}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}
