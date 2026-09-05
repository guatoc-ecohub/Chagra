#!/usr/bin/env node
/**
 * migrate-v31-to-v32.mjs
 * ================================================================
 * Migra el catálogo v3.1 al v3.2 agregando el campo tracking_mode
 * según ADR-030 Regla 1: Granularidad de inserción.
 *
 * tracking_mode enum:
 *   - "individual": especies trackeadas planta por planta (perennes,
 *                  árboles, tubérculos, estructurales)
 *   - "aggregate":  especies trackeadas por superficie/cama (hortalizas
 *                  masa, cereales, leguminosas)
 *   - null:         invasoras o especies donde no aplica
 *
 * El script asigna defaults por categoría según la tabla del ADR-030:
 *   INDIVIDUAL:
 *     - frutales_perennes (café, gulupa, mora, cítricos, mango)
 *     - tuberculos_raices (papa, yuca, ñame, batata)
 *     - estructurales como plátano/banano (category: frutales_perennes)
 *     - abonos_verdes_coberturas (árboles fijadores como aliso)
 *     - arboles_sombra
 *     - cercas_vivas
 *   AGGREGATE:
 *     - hortalizas_hoja (lechuga, cilantro, espinaca, cebolla)
 *     - hortalizas_fruto_flor (brassicas, etc.)
 *     - cereales (maíz, quinua)
 *     - granos_legumbres (frijol, arveja)
 *   NULL:
 *     - especies_invasoras
 *   MANUAL (requiere revisión humana):
 *     - medicinales_alelopaticas (orégano, romero, tomillo, lavanda →
 *       individual, pero requiere validación agronómica)
 *     - atractores_polinizadores
 *     - ornamentales_nativas
 *     - fibras_no_maderables
 *
 * Output: chagra-catalog-seed-v3.2.json con:
 *   { schema_version: "3.2", species, biopreparados, sources }
 *
 * Los arrays biopreparados[] y sources[] se copian de v3.1 sin cambios.
 *
 * Uso:
 *   node scripts/migrate-v31-to-v32.mjs
 *   node scripts/migrate-v31-to-v32.mjs --permitir-bajas  # escribe aunque pierda ids
 * ================================================================
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const V31_PATH = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
const OUT_PATH = join(ROOT, 'catalog/chagra-catalog-seed-v3.2.json');

const v31 = JSON.parse(readFileSync(V31_PATH, 'utf8'));

// --- Mapeo de categorías a tracking_mode según ADR-030 ---
const CATEGORY_TRACKING_MAP = {
  // INDIVIDUAL: perennes, árboles, tubérculos, estructurales
  'frutales_perennes': 'individual',           // café, gulupa, mora, cítricos, mango, plátano, banano
  'tuberculos_raices': 'individual',           // papa, yuca, ñame, batata
  'abonos_verdes_coberturas': 'individual',    // aliso, árboles fijadores de N
  'arboles_sombra': 'individual',              // árboles de sombra
  'cercas_vivas': 'individual',                // cercas vivas perennes
  
  // AGGREGATE: cultivos masivos por superficie
  'hortalizas_hoja': 'aggregate',              // lechuga, cilantro, espinaca, cebolla
  'hortalizas_fruto_flor': 'aggregate',        // brassicas, tomate, etc.
  'cereales': 'aggregate',                      // maíz, quinua
  'granos_legumbres': 'aggregate',             // frijol, arveja
  
  // NULL: especies donde tracking no aplica
  'especies_invasoras': null,                  // invasoras no se trackean
};

// Categorías que requieren revisión humana (no se asigna default automático)
const MANUAL_REVIEW_CATEGORIES = new Set([
  'medicinales_alelopaticas',    // orégano, romero, etc. → individual, pero requiere validación
  'atractores_polinizadores',    // requiere criterio agronómico
  'ornamentales_nativas',       // requiere criterio agronómico
  'fibras_no_maderables',        // requiere criterio agronómico
]);

/**
 * Determina el tracking_mode para una especie basado en su categoría.
 * Retorna el modo asignado o null si requiere revisión manual.
 */
function assignTrackingMode(species) {
  const { category, id, nombre_comun } = species;
  
  // Si ya tiene tracking_mode, respetarlo (idempotencia)
  if (species.tracking_mode !== undefined) {
    return species.tracking_mode;
  }
  
  // Verificar si la categoría requiere revisión manual
  if (MANUAL_REVIEW_CATEGORIES.has(category)) {
    return null;  // Requiere revisión humana
  }
  
  // Buscar en el mapeo de categorías
  const trackingMode = CATEGORY_TRACKING_MAP[category];
  
  if (trackingMode === undefined) {
    console.warn(`[${id}] categoría '${category}' no está en el mapeo → requiere revisión manual`);
    return null;
  }
  
  return trackingMode;
}

/**
 * Migra una especie individual de v3.1 a v3.2.
 * Solo agrega tracking_mode, preserva todos los demás campos.
 */
function migrateSpecies(sp) {
  const out = { ...sp };
  
  // Asignar tracking_mode según categoría ADR-030
  const trackingMode = assignTrackingMode(sp);
  out.tracking_mode = trackingMode;
  
  // Log de asignación para auditoría
  if (trackingMode === null) {
    console.warn(`[${sp.id}] (${sp.category}) → tracking_mode=NULL (revisión manual requerida)`);
  } else {
    console.log(`[${sp.id}] (${sp.category}) → tracking_mode=${trackingMode}`);
  }
  
  return out;
}

// --- Procesar todas las especies ---
const speciesV31 = v31.species || [];
const migratedSpecies = [];
const stats = {
  individual: 0,
  aggregate: 0,
  null: 0,
  manual_review: 0,
};

for (const sp of speciesV31) {
  if (!sp || typeof sp !== 'object') continue;
  
  const migrated = migrateSpecies(sp);
  migratedSpecies.push(migrated);
  
  // Estadísticas
  if (migrated.tracking_mode === 'individual') {
    stats.individual++;
  } else if (migrated.tracking_mode === 'aggregate') {
    stats.aggregate++;
  } else if (migrated.tracking_mode === null) {
    stats.null++;
  }
}

// Contar especies que requieren revisión manual
const manualReviewSpecies = migratedSpecies.filter(sp => 
  sp.tracking_mode === null && MANUAL_REVIEW_CATEGORIES.has(sp.category)
);
stats.manual_review = manualReviewSpecies.length;

// --- Generar reporte de especies sin clasificar ---
const unclassifiedSpecies = migratedSpecies.filter(sp => sp.tracking_mode === null);
const unclassifiedReport = unclassifiedSpecies.map(sp => ({
  id: sp.id,
  nombre_comun: sp.nombre_comun,
  category: sp.category,
  motivo: MANUAL_REVIEW_CATEGORIES.has(sp.category) 
    ? 'Categoría requiere revisión agronómica' 
    : 'Categoría no mapeada',
}));

// --- Output ---
const output = {
  schema_version: '3.2',
  seed_version: v31.seed_version || '0.3.0',
  generated_at: new Date().toISOString().slice(0, 10),
  generated_by: 'scripts/migrate-v31-to-v32.mjs — transform automático v3.1 → v3.2. ADR-030 Regla 1 (tracking_mode). Revisión agronómica requerida para especies con tracking_mode=null.',
  _meta: {
    fuente_migracion: 'chagra-catalog-seed-v3.1.json',
    adr_referencia: 'ADR-030 Regla 1: Granularidad de inserción + tracking_mode',
    cambio_principal: 'Adición de campo tracking_mode en species con default por categoría según ADR-030',
    estadisticas: {
      total_especies: migratedSpecies.length,
      tracking_individual: stats.individual,
      tracking_aggregate: stats.aggregate,
      tracking_null: stats.null,
      requeridas_revision_manual: stats.manual_review,
    },
    especines_sin_clasificar: unclassifiedReport.length,
    advertencia: `Especies con tracking_mode=null requieren asignación manual por agrónomo. Ver reporte en _meta.especies_sin_clasificar.`,
  },
  _meta_especies_sin_clasificar: unclassifiedReport,
  species: migratedSpecies,
  biopreparados: v31.biopreparados || [],
  sources: v31.sources || [],
};

// --- Guardia anti-regeneración destructiva (2026-09-04) ---
//
// El catálogo v3.2 en disco puede contener especies (y fuentes) dadas de alta a mano
// DESPUÉS de la última migración. Este script parte de la fuente v3.1 y regenera el
// archivo de salida incondicionalmente: si esas altas manuales no existen en v3.1, la
// regeneración las borra en silencio y sale con exit 0. Eso ya pasó dos veces en un día
// (incidente 2026-09-04): el borrado se llevó eruca_vesicaria (rúcula) y
// cucurbita_pepo (calabacín), justo las del hard-test de entrega a usuarios prueba.
//
// Guardia: si el archivo de salida ya existe en disco, se compara el conjunto de ids
// (species + sources) del existente contra el que se va a escribir. Si la salida PIERDE
// aunque sea un id, se aborta sin escribir, se listan las bajas en stderr y se sale con
// código distinto de cero. Con --permitir-bajas se escribe igual, pero el aviso se imprime.
function idsOf(catalog) {
  const set = new Set();
  for (const sp of catalog.species || []) {
    if (sp && typeof sp.id === 'string') set.add('sp:' + sp.id);
  }
  for (const src of catalog.sources || []) {
    if (src && typeof src.id === 'string') set.add('src:' + src.id);
  }
  return set;
}

const ALLOW_LOSSES = process.argv.includes('--permitir-bajas');

function writeGuarded() {
  const json = JSON.stringify(output, null, 2) + '\n';
  const hasExisting = existsSync(OUT_PATH);
  if (hasExisting && !ALLOW_LOSSES) {
    const existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    const existingIds = idsOf(existing);
    const newIds = idsOf(output);
    const lost = [...existingIds].filter((id) => !newIds.has(id));
    if (lost.length > 0) {
      const detalles = lost.map((id) => {
        const [kind, key] = id.split(':');
        const entry =
          kind === 'sp'
            ? (output.species || []).find((s) => s.id === key)
            : (output.sources || []).find((s) => s.id === key);
        const nombre =
          kind === 'sp'
            ? entry?.nombre_comun || entry?.nombre_cientifico || ''
            : entry?.titulo || entry?.title || entry?.nombre || '';
        return `  - ${kind === 'sp' ? 'especie' : 'fuente'} ${key}${nombre ? ` (${nombre})` : ''}`;
      });
      console.error('\n[ABORTO] la migración perdería datos ya presentes en el catálogo v3.2:');
      console.error(detalles.join('\n'));
      console.error('\nSi el borrado es intencional, corré con la bandera --permitir-bajas.');
      process.exit(1);
    }
  } else if (hasExisting && ALLOW_LOSSES) {
    const existing = JSON.parse(readFileSync(OUT_PATH, 'utf8'));
    const existingIds = idsOf(existing);
    const newIds = idsOf(output);
    const lost = [...existingIds].filter((id) => !newIds.has(id));
    if (lost.length > 0) {
      console.error(`\n[--permitir-bajas] se registran ${lost.length} bajas contra el catálogo existente:`);
      console.error(lost.join('\n'));
    }
  }
  writeFileSync(OUT_PATH, json);
}

writeGuarded();

// --- Resumen en consola ---
console.log('\n=== MIGRACIÓN v3.1 → v3.2 COMPLETADA ===');
console.log(`✓ Migradas ${migratedSpecies.length} especies → ${OUT_PATH}`);
console.log(`  biopreparados: ${output.biopreparados.length}`);
console.log(`  sources: ${output.sources.length}`);
console.log('\nESTADÍSTICAS tracking_mode:');
console.log(`  individual:  ${stats.individual} especies`);
console.log(`  aggregate:   ${stats.aggregate} especies`);
console.log(`  null:        ${stats.null} especies (invasoras o sin clasificar)`);
console.log(`  manual:      ${stats.manual_review} especies requieren revisión agronómica`);

if (unclassifiedReport.length > 0) {
  console.log(`\n⚠️  ${unclassifiedReport.length} especies sin tracking_mode asignado:`);
  unclassifiedReport.forEach(sp => {
    console.log(`     - ${sp.nombre_comun} (${sp.id}) [${sp.category}]`);
  });
  console.log(`\n→ Estas especies requieren asignación manual por agrónomo (Lili).`);
}

console.log(`\nValidar con: node scripts/validate-catalog.mjs --schema catalog/schema-v3.2.json`);
