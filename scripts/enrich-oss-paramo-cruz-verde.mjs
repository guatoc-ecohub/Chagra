#!/usr/bin/env node
/**
 * enrich-oss-paramo-cruz-verde.mjs — Completa la categoría PÁRAMO del subset
 * OSS público v3.2 con las especies altoandinas curadas del catálogo full.
 *
 * CONTEXTO (2026-06-10): el subset v3.2 YA incluye "páramo" como categoría
 * editorial (ver SUBSET_OSS_V3.2_RATIONALE.md), pero solo traía 2 especies
 * (Espeletia grandiflora + Polylepis quadrijuga). Para la presentación ante
 * MinAmbiente sobre la Sentencia del Páramo de Cruz Verde, se completa la
 * paleta de restauración altoandina (~62 especies) que ya estaba curada en el
 * catálogo full (chagra-pro/data/catalog/chagra-catalog-full-v3.1.json).
 *
 * SEGURIDAD / CONSERVACIÓN (verificado): las especies de páramo NO contienen
 * localidades precisas (solo rangos de altitud + clima + propagación + un campo
 * `nota_conservacion`). Cero coordenadas → la ofuscación geográfica que pide
 * ADR-037 ya está satisfecha por ausencia del dato sensible. NO se publica la
 * curaduría diferencial Pro (variedades ICA detalladas, cultivares específicos):
 * las especies de páramo son nativas silvestres, datos ecológicos de bien
 * público (CC-BY-NC-SA 4.0).
 *
 * Criterio "páramo": thermal_zones incluye "paramo" O altitud óptima/máxima
 * >= 3000 msnm. Idempotente: re-correrlo no duplica (merge por id).
 *
 * Uso:
 *   node scripts/enrich-oss-paramo-cruz-verde.mjs           # aplica in-place
 *   node scripts/enrich-oss-paramo-cruz-verde.mjs --dry-run # solo reporta
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const FULL_PATH = resolve(ROOT, '../chagra-pro/data/catalog/chagra-catalog-full-v3.1.json');
const SUBSET_PATH = join(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
const DRY_RUN = process.argv.includes('--dry-run');

// Campos de referencia que se podan a IDs presentes en el merge.
const REF_FIELDS = [
  'recommended_covers',
  'recommended_fences',
  'especies_nativas_sustitutas',
];

// companions/antagonists exigen SIMETRÍA bidireccional (validador AMB-10): si
// A.companions incluye B, B.companions debe incluir A. Las especies de páramo
// que agregamos son flora silvestre (no datos de intercultivo); sus refs
// apuntan a especies existentes que NO las referencian de vuelta → romperían
// AMB-10. Se vacían en las especies añadidas para no introducir asimetrías
// nuevas (el baseline de prod ya tiene 16 asimetrías legacy, no las tocamos).
const SYMMETRIC_FIELDS = ['companions', 'antagonists'];

// Criterio ESTRICTO: solo flora etiquetada thermal_zones=páramo (nativas
// altoandinas de restauración). NO se usa altitud>=3000 como fallback porque
// arrastra cultivos de clima frío (papa, maca, cañihua, kale) y exóticas
// (ciprés, raygrass, festuca) que crecen alto pero no son flora de páramo —
// impreciso para una demo de restauración ante MinAmbiente.
function isParamo(s) {
  const tz = JSON.stringify(s.thermal_zones || s.thermal_zone || '');
  return /p[áa]ramo/i.test(tz);
}

function main() {
  const full = JSON.parse(readFileSync(FULL_PATH, 'utf8'));
  const subset = JSON.parse(readFileSync(SUBSET_PATH, 'utf8'));

  const fullSpecies = full.species || [];
  const subsetSpecies = subset.species || [];
  const subsetIds = new Set(subsetSpecies.map((s) => s.id));

  const paramo = fullSpecies.filter(isParamo);
  const toAdd = paramo.filter((s) => !subsetIds.has(s.id));

  console.log('enrich-oss-paramo-cruz-verde.mjs');
  console.log(`  full:            ${fullSpecies.length} species`);
  console.log(`  subset (antes):  ${subsetSpecies.length} species`);
  console.log(`  páramo en full:  ${paramo.length}`);
  console.log(`  ya en subset:    ${paramo.length - toAdd.length}`);
  console.log(`  a agregar:       ${toAdd.length}`);

  // Conjunto final de IDs (para podar refs cruzadas a IDs ausentes).
  const mergedIds = new Set([...subsetIds, ...toAdd.map((s) => s.id)]);

  // Poda refs cruzadas de las especies añadidas a IDs presentes en el merge,
  // y vacía companions/antagonists (simetría AMB-10).
  const cleaned = toAdd.map((s) => {
    const clone = { ...s };
    for (const f of REF_FIELDS) {
      if (Array.isArray(clone[f])) {
        clone[f] = clone[f].filter((id) => mergedIds.has(id));
      }
    }
    for (const f of SYMMETRIC_FIELDS) {
      if (Array.isArray(clone[f])) clone[f] = [];
    }
    return clone;
  });

  // Sources referenciadas por las especies añadidas (que falten en el subset).
  const subsetSourceIds = new Set((subset.sources || []).map((s) => s.id));
  const neededSourceIds = new Set();
  for (const s of cleaned) {
    for (const sid of s.source_ids || []) neededSourceIds.add(sid);
    for (const sid of s.saber_origen?.validacion_cientifica_source_ids || []) neededSourceIds.add(sid);
  }
  const fullSources = full.sources || [];
  const sourcesToAdd = fullSources.filter(
    (src) => neededSourceIds.has(src.id) && !subsetSourceIds.has(src.id),
  );

  console.log(`  sources nuevas:  ${sourcesToAdd.length}`);

  const conservationBreakdown = {};
  for (const s of cleaned) {
    const c = s.conservation_status || 'sin_estado';
    conservationBreakdown[c] = (conservationBreakdown[c] || 0) + 1;
  }
  console.log('  por conservación:', JSON.stringify(conservationBreakdown));

  if (DRY_RUN) {
    console.log('\n[dry-run] no se escribió nada.');
    console.log('IDs a agregar:', cleaned.map((s) => s.id).join(', '));
    return;
  }

  subset.species = [...subsetSpecies, ...cleaned];
  subset.sources = [...(subset.sources || []), ...sourcesToAdd];

  // Marca de trazabilidad del enriquecimiento.
  subset._paramo_enrichment = {
    date: '2026-06-10',
    reason: 'Completar categoría páramo para presentación MinAmbiente — Sentencia Páramo Cruz Verde',
    added_species: cleaned.length,
    added_sources: sourcesToAdd.length,
    conservation_breakdown: conservationBreakdown,
    note: 'Datos ecológicos sin localidades precisas (ofuscación ADR-037 satisfecha por ausencia). No incluye curaduría diferencial Pro. Ratifica ADR-009/024/026 para la categoría páramo.',
  };

  writeFileSync(SUBSET_PATH, JSON.stringify(subset, null, 2) + '\n');
  console.log(`\n✓ subset (después): ${subset.species.length} species, ${subset.sources.length} sources`);
  console.log(`✓ escrito ${SUBSET_PATH}`);
}

main();
