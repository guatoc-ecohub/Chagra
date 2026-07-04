#!/usr/bin/env node
/**
 * add-50-comestibles.mjs
 * ================================================================
 * Agrega 50 especies comestibles nuevas (frutales/hortalizas/
 * tuberculos/aromaticas relevantes para Colombia, incluido el
 * lichi/Litchi chinensis notado como faltante por el operador) al
 * catalogo canonico chagra-catalog-oss-subset-v3.2.json (el que
 * shipea, ver catalog/CATALOG_VERSIONS.md).
 *
 * Sigue el mismo patron que scripts/add-100-species.mjs: lee un
 * batch JSON, filtra IDs ya existentes, hace push, actualiza
 * _subset_meta.species_count y generated_at, y reescribe el archivo.
 *
 * Uso: node scripts/add-50-comestibles.mjs
 * ================================================================
 */

import fs from 'fs';

const CATALOG_PATH = './catalog/chagra-catalog-oss-subset-v3.2.json';
const BATCH_PATH = './scripts/new-species-batch-comestibles.json';

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
const newSpecies = JSON.parse(fs.readFileSync(BATCH_PATH, 'utf-8'));

console.log(`[INFO] Catálogo actual: ${catalog.species.length} species`);
console.log(`[INFO] Batch a integrar: ${newSpecies.length} species`);

const existingIds = new Set(catalog.species.map((s) => s.id));
const speciesToAdd = newSpecies.filter((s) => !existingIds.has(s.id));

console.log(`[INFO] Species a agregar: ${speciesToAdd.length}`);
console.log(`[INFO] IDs duplicados detectados y excluidos: ${newSpecies.length - speciesToAdd.length}`);

catalog.species.push(...speciesToAdd);

catalog._subset_meta.species_count = catalog.species.length;
catalog.generated_at = new Date().toISOString();

fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');

console.log(`[SUCCESS] Catálogo actualizado: ${catalog.species.length} species totales`);
console.log(`[INFO] Archivo: ${CATALOG_PATH}`);
