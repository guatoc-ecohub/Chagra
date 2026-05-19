#!/usr/bin/env node
/**
 * build-cycle-content-from-catalog.mjs
 *
 * ETL del catálogo principal `catalog/chagra-catalog-seed-v3.1.json`
 * hacia `public/cycle-content/<species_id>.json` para alimentar el
 * corpus RAG del agente IA (`src/services/ragRetriever.js`).
 *
 * Motivación (gap-analysis 2026-05-17): el agente solo puede `retrieve`
 * sobre 4 species (fresa, lechuga, tomate_chonto + manifest), de 190
 * que tiene el catálogo. Resultado: el agente responde por memoria
 * paramétrica → alucinación alta. Este script materializa el
 * `valor_pedagogico` denso de las 173 species refinadas (vp ≥200 chars)
 * como JSON consumible por `ragRetriever.flattenDoc()`.
 *
 * Reglas:
 * - NO sobrescribir archivos cycle-content existentes (fresa, lechuga,
 *   tomate_chonto están ricamente curados con milestones/failure_modes
 *   que el catalog no tiene — preservarlos).
 * - SOLO escribir species con `valor_pedagogico` ≥200 chars (criterio
 *   AMB-16). Las cortas siguen siendo stubs y NO ayudan al retrieve.
 * - Shape minimal pero compatible con `flattenDoc`: cualquier string
 *   >20 chars se vuelve passage indexable. No requiere milestones para
 *   ser útil.
 *
 * Output:
 * - Imprime resumen: N generados, K skipped (already exist), M skipped
 *   (vp <200).
 * - Después corre `generate-cycle-content-manifest.mjs` para
 *   re-generar el manifest.
 *
 * Uso:
 *   node scripts/build-cycle-content-from-catalog.mjs
 *
 * Idempotente: re-correrlo solo genera archivos nuevos. Para regenerar
 * uno específico, borrarlo primero.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'catalog', 'chagra-catalog-seed-v3.1.json');
const CYCLE_CONTENT_DIR = join(__dirname, '..', 'public', 'cycle-content');
const MANIFEST_SCRIPT = join(__dirname, 'generate-cycle-content-manifest.mjs');

const MIN_VP_LENGTH = 200;

function loadCatalog() {
  const raw = readFileSync(CATALOG_PATH, 'utf-8');
  return JSON.parse(raw);
}

function loadSourcesIndex(catalog) {
  const idx = {};
  (catalog.sources || []).forEach((s) => {
    if (s.id) idx[s.id] = s;
  });
  return idx;
}

function buildCycleDoc(species, sourcesIndex) {
  const sourceRefs = (species.source_ids || [])
    .map((id) => sourcesIndex[id])
    .filter(Boolean)
    .map((s) => ({
      id: s.id,
      title: s.title || s.name || s.id,
      tier: s.tier,
      url: s.url || s.handle || s.doi || null,
    }));

  return {
    species_slug: species.id,
    scientific_name: species.nombre_cientifico || null,
    common_names: species.nombre_comun
      ? (Array.isArray(species.nombre_comun) ? species.nombre_comun : [species.nombre_comun])
      : [],
    family: species.familia_botanica || null,
    category: species.category || null,
    cultivable: species.cultivable ?? null,
    conservation_status: species.conservation_status || null,
    thermal_zones: species.thermal_zones || [],
    roles_in_guild: species.roles_in_guild || [],
    antagonists: species.antagonists || [],
    especies_nativas_sustitutas: species.especies_nativas_sustitutas || [],
    propagation: species.propagation || null,
    requirements: {
      agua: species.agua || null,
      altitud_msnm: species.altitud_msnm || null,
      temperatura_c: species.temperatura_c || null,
      radiacion: species.radiacion || null,
      drenaje_requerido: species.drenaje_requerido ?? null,
    },
    valor_pedagogico: species.valor_pedagogico,
    sources: sourceRefs,
    _generated_by: 'scripts/build-cycle-content-from-catalog.mjs',
    _generated_at: new Date().toISOString(),
  };
}

function main() {
  const catalog = loadCatalog();
  const sourcesIndex = loadSourcesIndex(catalog);
  const species = catalog.species || [];

  const existingFiles = new Set(
    readdirSync(CYCLE_CONTENT_DIR)
      .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
      .map((f) => f.replace(/\.json$/, ''))
  );

  let generated = 0;
  let skippedExisting = 0;
  let skippedShortVp = 0;
  let skippedNoId = 0;

  for (const sp of species) {
    if (!sp.id) {
      skippedNoId++;
      continue;
    }
    if (existingFiles.has(sp.id)) {
      skippedExisting++;
      continue;
    }
    const vpLen = (sp.valor_pedagogico || '').length;
    if (vpLen < MIN_VP_LENGTH) {
      skippedShortVp++;
      continue;
    }

    const doc = buildCycleDoc(sp, sourcesIndex);
    const outPath = join(CYCLE_CONTENT_DIR, `${sp.id}.json`);
    writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
    generated++;
  }

  console.log(`[cycle-content-etl] Catálogo: ${species.length} species`);
  console.log(`[cycle-content-etl] Generados: ${generated}`);
  console.log(`[cycle-content-etl] Skipped (ya existe): ${skippedExisting}`);
  console.log(`[cycle-content-etl] Skipped (vp <${MIN_VP_LENGTH} chars): ${skippedShortVp}`);
  if (skippedNoId > 0) console.log(`[cycle-content-etl] Skipped (sin id): ${skippedNoId}`);

  // Regenerar manifest tras agregar archivos.
  // execFileSync con args array evita CodeQL js/shell-command-injection
  // (MANIFEST_SCRIPT es path local controlado, pero shell interpolation gatilla alerta).
  console.log('[cycle-content-etl] Regenerando manifest.json...');
  execFileSync('node', [MANIFEST_SCRIPT], { stdio: 'inherit' });
}

main();
