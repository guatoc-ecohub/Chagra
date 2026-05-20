#!/usr/bin/env node
// scripts/symmetrize-companions.mjs
//
// Symmetrize `companions[]` (and `antagonists[]`) en catalog v3.1 para
// resolver AMB-10 asymmetries. Estrategia conservadora:
//   1. Para cada arista A→B (B en A.companions), si B existe en catalog y
//      no tiene a A en B.companions:
//        - Si B.companions.length >= MAX_COMPANIONS (10): SKIP (pivot
//          saturation). Loguear.
//        - Else: agregar A.id al final de B.companions.
//      Si B no existe en catalog: SKIP (target missing). Loguear.
//   2. Mismo trato para `antagonists[]`.
//   3. NO borra entries existentes. Solo agrega inversas.
//   4. Output:
//        - Catalog modificado a `<input>.symmetrized.json`
//        - Log JSON estructurado a /tmp/amb10-symmetrize-log.json
//        - Resumen a stdout.
//
// CLI:
//   node scripts/symmetrize-companions.mjs catalog/chagra-catalog-seed-v3.1.json catalog/schema-v3.1.json
//
// El segundo arg (schema) se acepta para consistencia con validate-catalog.mjs
// pero no se usa hoy — el script no necesita schema para esta operación.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname, join } from 'node:path';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Uso: node scripts/symmetrize-companions.mjs <catalog.json> [schema.json]');
  process.exit(2);
}
const CATALOG_PATH = resolve(args[0]);
// Cap calibrado para SAF colombiano: cafetal/silvopastoril maduros tienen
// 20-30 especies asociadas legítimas (coffea_arabica, cordia_alliodora,
// alnus_acuminata son pivots agroecológicos documentados). El cap 25 inicial
// dejaba 3 quinas/vismia esperando entrar a coffea_arabica — todas legítimas
// SAF cafetalero. Subido a 30 para drenar el residual a 0.
const MAX_COMPANIONS = 30;
const LOG_PATH = '/tmp/amb10-symmetrize-log.json';

console.log('Chagra AMB-10 Symmetrize Tool');
console.log(`  input:  ${CATALOG_PATH}`);

const raw = readFileSync(CATALOG_PATH, 'utf8');
const catalog = JSON.parse(raw);

const speciesArr = catalog.species || [];
const byId = new Map(speciesArr.map((s) => [s.id, s]));

const log = {
  timestamp: new Date().toISOString(),
  input: CATALOG_PATH,
  decisions: [],
  summary: {
    total_asymmetries: 0,
    resolved_by_addition: 0,
    skipped_pivot_saturation: 0,
    skipped_target_missing: 0,
    pivots_added: {}, // pivot_id -> count of new companions added
  },
};

function tryAddInverse(field, a, b) {
  // a, b son species objects.
  log.summary.total_asymmetries++;
  const arr = b[field] || (b[field] = []);
  if (arr.includes(a.id)) {
    // Defensivo: ya está, contar como resuelto y no duplicar.
    log.decisions.push({
      action: 'SKIP_ALREADY_PRESENT',
      field,
      from: a.id,
      to: b.id,
      reason: 'inverse already present (defensive check)',
    });
    return;
  }
  if (arr.length >= MAX_COMPANIONS) {
    log.summary.skipped_pivot_saturation++;
    log.decisions.push({
      action: 'SKIP_PIVOT_SATURATION',
      field,
      from: a.id,
      to: b.id,
      pivot_size: arr.length,
      message: `${b.id} already has ${arr.length} ${field}, refusing to inflate`,
    });
    return;
  }
  arr.push(a.id);
  log.summary.resolved_by_addition++;
  const key = `${b.id} (${field})`;
  log.summary.pivots_added[key] = (log.summary.pivots_added[key] || 0) + 1;
  log.decisions.push({
    action: 'ADD_INVERSE',
    field,
    from: a.id,
    to: b.id,
    new_pivot_size: arr.length,
  });
}

function logMissingTarget(field, a, targetId) {
  log.summary.total_asymmetries++;
  log.summary.skipped_target_missing++;
  log.decisions.push({
    action: 'SKIP_TARGET_MISSING',
    field,
    from: a.id,
    to: targetId,
    message: `target ${targetId} not in catalog`,
  });
}

// Pasada principal: detectamos asimetrías iterando aristas A→B.
// Importante: capturamos las aristas ANTES de mutar, para no engañarnos con
// las inversas que vamos agregando en pleno loop.
const edgesToProcess = []; // {field, a_id, b_id}
for (const sp of speciesArr) {
  for (const coId of sp.companions || []) {
    edgesToProcess.push({ field: 'companions', a_id: sp.id, b_id: coId });
  }
  for (const anId of sp.antagonists || []) {
    edgesToProcess.push({ field: 'antagonists', a_id: sp.id, b_id: anId });
  }
}

for (const e of edgesToProcess) {
  const a = byId.get(e.a_id);
  const b = byId.get(e.b_id);
  if (!a) continue; // imposible en práctica, defensivo
  if (!b) {
    logMissingTarget(e.field, a, e.b_id);
    continue;
  }
  // Si ya es simétrica, no hace nada.
  const reverseArr = b[e.field] || [];
  if (reverseArr.includes(a.id)) continue;
  tryAddInverse(e.field, a, b);
}

// Output: escribimos a `<input>.symmetrized.json` (mismo dir).
const dir = dirname(CATALOG_PATH);
const base = basename(CATALOG_PATH, '.json');
const OUT_PATH = join(dir, `${base}.symmetrized.json`);

// Conservar el roundtrip (AMB-18): JSON.stringify(obj, null, 2) + '\n'.
const outRaw = JSON.stringify(catalog, null, 2) + '\n';
writeFileSync(OUT_PATH, outRaw, 'utf8');
writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + '\n', 'utf8');

console.log('');
console.log('Resumen:');
console.log(`  Total asimetrías detectadas:      ${log.summary.total_asymmetries}`);
console.log(`  Resueltas por adición:            ${log.summary.resolved_by_addition}`);
console.log(`  Skipped por pivot saturation:     ${log.summary.skipped_pivot_saturation}`);
console.log(`  Skipped por target missing:       ${log.summary.skipped_target_missing}`);
console.log('');

const topPivots = Object.entries(log.summary.pivots_added)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);
if (topPivots.length) {
  console.log('Top pivots (entries añadidas):');
  for (const [key, n] of topPivots) {
    // key formato: "id (field)"
    const m = key.match(/^(.*) \((companions|antagonists)\)$/);
    const pid = m ? m[1] : key;
    const field = m ? m[2] : 'companions';
    const finalSize = byId.get(pid)?.[field]?.length ?? '?';
    console.log(`  ${key}: +${n} (total final: ${finalSize})`);
  }
  console.log('');
}

console.log(`  output:  ${OUT_PATH}`);
console.log(`  log:     ${LOG_PATH}`);
