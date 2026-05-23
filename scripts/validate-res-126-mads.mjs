#!/usr/bin/env node
/**
 * validate-res-126-mads.mjs
 *
 * Cross-validation Chagra catalog vs Resolución 0126/2024 MADS (Colombia)
 * "Por la cual se actualiza el listado de las especies silvestres amenazadas
 *  de la diversidad biológica continental y marino-costera del territorio
 *  nacional" (2104 species amenazadas).
 *
 * STATUS: STUB — TODO: cargar lista oficial Res. 126/2024 desde MADS data
 * portal (https://www.minambiente.gov.co/biodiversidad/ o https://datos.gov.co/).
 *
 * USAGE (cuando lista disponible):
 *   node scripts/validate-res-126-mads.mjs \
 *     --catalog catalog/chagra-catalog-seed-v3.1.json \
 *     --res126 ./data/res-126-mads-2024.json
 *
 * Modo proxy (sin lista oficial cargada): reporta cuentas por
 * conservation_status + cites_appendix como baseline.
 *
 * Batch 5A — Pasada 5 residual conservation + CITES (2026-05-22).
 */

import { readFileSync, existsSync } from 'node:fs';
import { argv, exit } from 'node:process';

const args = Object.fromEntries(
  argv.slice(2).map((arg, i, arr) => {
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : true;
      return [key, val];
    }
    return null;
  }).filter(Boolean),
);

const catalogPath = args.catalog || 'catalog/chagra-catalog-seed-v3.1.json';
const res126Path = args.res126 || null;

if (!existsSync(catalogPath)) {
  console.error(`ERROR: catalog file not found: ${catalogPath}`);
  exit(2);
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const speciesList = catalog.species ?? [];

const counts = {
  total: speciesList.length,
  threatened: 0,
  protected: 0,
  cites_listed: { I: 0, II: 0, III: 0 },
  by_status: {},
};

for (const sp of speciesList) {
  const status = sp.conservation_status;
  if (status) counts.by_status[status] = (counts.by_status[status] ?? 0) + 1;
  if (status === 'en_peligro' || status === 'en_peligro_critico' || status === 'endemica_critica') {
    counts.threatened += 1;
  }
  if (status === 'nativo_protegido') counts.protected += 1;
  if (sp.cites_appendix && counts.cites_listed[sp.cites_appendix] !== undefined) {
    counts.cites_listed[sp.cites_appendix] += 1;
  }
}

console.log('=== Chagra catalog vs Res. 126/2024 MADS — proxy report ===');
console.log(`Catalog: ${catalogPath}`);
console.log(`Species total: ${counts.total}`);
console.log(`Threatened (CR/EN/endemica_critica): ${counts.threatened}`);
console.log(`Nativo protegido (no amenazado strict): ${counts.protected}`);
console.log(`CITES listed: I=${counts.cites_listed.I} II=${counts.cites_listed.II} III=${counts.cites_listed.III}`);
console.log('By conservation_status:');
for (const [k, v] of Object.entries(counts.by_status).sort()) {
  console.log(`  ${k}: ${v}`);
}

if (!res126Path) {
  console.log('\nNOTE: Lista oficial Res. 126/2024 no provista (--res126). Modo proxy.');
  console.log('TODO: cargar lista oficial cuando disponible desde MADS data portal.');
  exit(0);
}

if (!existsSync(res126Path)) {
  console.error(`ERROR: res126 file not found: ${res126Path}`);
  exit(2);
}

console.error('FUTURE: cross-validation logic against Res. 126/2024 — TODO.');
exit(0);
