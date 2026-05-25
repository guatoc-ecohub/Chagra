#!/usr/bin/env node

/**
 * Script para agregar batches de species al catálogo OSS subset v3.2
 * Task #189: Expandir catálogo species 105 → ~205
 */

import fs from 'fs';
import path from 'path';

const CATALOG_PATH = './catalog/chagra-catalog-oss-subset-v3.2.json';
const BATCH_DIR = './scripts';

// Leer catálogo actual
const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
console.log(`[INFO] Catálogo actual: ${catalog.species.length} species`);

// Leer todos los batches disponibles
const batchFiles = fs.readdirSync(BATCH_DIR)
  .filter(f => f.startsWith('new-species-batch') && f.endsWith('.json'))
  .sort();

console.log(`[INFO] Batches encontrados: ${batchFiles.length}`);

let totalAdded = 0;
const existingIds = new Set(catalog.species.map(s => s.id));

for (const batchFile of batchFiles) {
  const batchPath = path.join(BATCH_DIR, batchFile);
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
  
  const speciesToAdd = batch.filter(s => !existingIds.has(s.id));
  const duplicates = batch.filter(s => existingIds.has(s.id));
  
  if (speciesToAdd.length > 0) {
    catalog.species.push(...speciesToAdd);
    speciesToAdd.forEach(s => existingIds.add(s.id));
    totalAdded += speciesToAdd.length;
    console.log(`[INFO] ${batchFile}: agregadas ${speciesToAdd.length} species`);
  }
  
  if (duplicates.length > 0) {
    console.log(`[WARN] ${batchFile}: ${duplicates.length} duplicados excluidos`);
  }
}

// Actualizar metadatos
catalog._subset_meta.species_count = catalog.species.length;
catalog.generated_at = new Date().toISOString();

// Guardar catálogo actualizado
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');

console.log(`[SUCCESS] Catálogo actualizado: ${catalog.species.length} species totales`);
console.log(`[INFO] Total agregadas en esta ejecución: ${totalAdded}`);
console.log(`[INFO] Archivo: ${CATALOG_PATH}`);

