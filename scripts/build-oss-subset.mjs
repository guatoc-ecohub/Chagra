#!/usr/bin/env node
/**
 * build-oss-subset.mjs — Construye el subset OSS público (~50 species) a
 * partir del catálogo full curado por el operador.
 *
 * Reemplaza a `scripts/extract-oss-subset.mjs` (rationale por pisos térmicos)
 * con un criterio editorial más amplio: cultivos comerciales canónicos +
 * árboles de sombra companion de café + medicinales tradicionales +
 * leguminosas/abonos verdes + invasoras prioritarias (valor pedagógico de
 * advertencia) + hortalizas básicas + species de demo (quinoa, amaranto, chía).
 *
 * Entrada: ruta al catálogo full (argv[2] o `catalog/chagra-catalog-seed-v3.1.json`)
 * Salida:  ruta al subset OSS (argv[3] o `catalog/chagra-catalog-seed-v3.1.json`)
 *
 * Por defecto el script lee la copia full que ya vive en `chagra-pro/data/catalog/
 * chagra-catalog-full-v3.1.json` (resuelve relativo al repo). Si no encuentra
 * esa copia (entorno OSS-only), cae en el seed local (escenario de re-runs
 * idempotentes después del swap).
 *
 * Comportamiento:
 *
 * 1. Filtra `species[]` al set OSS_SUBSET_IDS (50 IDs).
 * 2. Para cada species mantenida: poda refs a IDs fuera del subset en los
 *    campos `companions`, `antagonists`, `recommended_covers`,
 *    `recommended_fences`, `especies_nativas_sustitutas`. Los items que
 *    quedan apuntando a IDs presentes se conservan. AMB-10 sigue verde porque
 *    el podado es simétrico (si A.companions perdió B, B.companions también
 *    pierde A — los dos están filtrados con el mismo set).
 * 3. Filtra `sources[]` a los referenciados por las 50 species.
 * 4. Mantiene `biopreparados[]` íntegro — decisión del operador 2026-05-23
 *    (biopreparados-seed.json queda público porque tiene valor pedagógico
 *    inmediato + no contiene curaduría editorial diferencial Pro).
 * 5. Conserva todos los demás fields del catálogo (`schema_version`,
 *    `seed_version`, metadatos) y añade `_subset_meta` para trazabilidad.
 * 6. `variedades_registradas_ica[]` se mantiene íntegro por species — NO
 *    truncado (decisión editorial: el subset es público pero las variedades
 *    ICA son datos públicos del registro ICA, no diferencial editorial).
 *
 * Uso típico (cutover step 2 ADR-024):
 *
 *   # 1. El operador copió previamente full → chagra-pro/data/catalog/
 *   # 2. Este script reconstruye el subset desde el full y SOBREESCRIBE el
 *   #    seed v3.1 del repo público con las 50 species.
 *   node scripts/build-oss-subset.mjs
 *
 * Idempotente: re-correrlo sobre un subset ya generado produce el mismo
 * subset (porque los 50 IDs son hardcoded y la fuente full es estable).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Resolución de input: prioridad argv[2] > chagra-pro/data/catalog/full > seed local.
// Patrón sin existsSync() para evitar la race TOCTOU que flagueaba CodeQL
// (js/file-system-race): hacemos un único `readFileSync` con fallback en catch
// si ENOENT. El consumidor único de este script es CLI, no servicio, pero la
// regla pública del repo es no introducir alertas SAST nuevas.
const FALLBACK_FULL = resolve(ROOT, '../chagra-pro/data/catalog/chagra-catalog-full-v3.1.json');
const LOCAL_SEED = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');

function readInputWithFallback(primary, secondary) {
  try {
    const buf = readFileSync(primary, 'utf8');
    return { path: primary, content: buf };
  } catch (e) {
    if (e.code === 'ENOENT') {
      const buf = readFileSync(secondary, 'utf8');
      return { path: secondary, content: buf };
    }
    throw e;
  }
}

const EXPLICIT_INPUT = process.argv[2] ? resolve(process.argv[2]) : null;
const OUTPUT = process.argv[3]
  ? resolve(process.argv[3])
  : LOCAL_SEED;

/**
 * 50 IDs del subset OSS público (CC-BY-NC-SA 4.0).
 *
 * Composición (criterio editorial v2 — 2026-05-23):
 *   12 cultivos comerciales colombianos (café, plátano, yuca, maíz, papa, frijol,
 *      arracacha, cacao, aguacate, tomate de árbol, lulo, batata).
 *    8 árboles de sombra companion de café (aliso, chachafruto, guamo, cedro real,
 *      nogal cafetero, caoba andina, guayacán rosado, guayacán amarillo).
 *    8 medicinales tradicionales (ortiga, caléndula, yerbabuena, toronjil,
 *      manzanilla, llantén, sábila, orégano).
 *    6 leguminosas/abonos verdes (frijol terciopelo, crotalaria, trébol blanco,
 *      gandul, chocho/tarwi, botón de oro).
 *    6 invasoras prioritarias (buchón de agua, retamo espinoso, kikuyo, helecho
 *      marranero, pasto gordura, eucalipto blanco) — valor pedagógico de advertencia.
 *    5 hortalizas básicas (lechuga, tomate San Marzano, cebolla larga, cilantro,
 *      zanahoria).
 *    5 species especiales para demos (quinoa, amaranto, chía, uchuva, mora).
 *
 * El criterio NO filtra lo más valioso editorialmente: las variedades ICA
 * detalladas, los endemismos paramunos curados (Espeletia spp., Aragoa,
 * Diplostephium) y los cultivares de café/papa con curaduría profunda quedan
 * en el catálogo full Pro.
 */
export const OSS_SUBSET_IDS = new Set([
  // 12 cultivos comerciales colombianos
  'coffea_arabica',
  'musa_paradisiaca',
  'manihot_esculenta',
  'zea_mays',
  'solanum_tuberosum_pastusa_suprema',
  'phaseolus_vulgaris',
  'arracacia_xanthorrhiza',
  'theobroma_cacao',
  'persea_americana',
  'solanum_betaceum',
  'solanum_quitoense',
  'ipomoea_batatas',

  // 8 árboles de sombra (companions café)
  'alnus_acuminata',
  'erythrina_edulis',
  'inga_edulis',
  'cedrela_odorata',
  'cordia_alliodora',
  'swietenia_macrophylla',
  'tabebuia_rosea',
  'tabebuia_chrysantha',

  // 8 medicinales tradicionales
  'urtica_dioica',
  'calendula_officinalis',
  'mentha_spicata',
  'melissa_officinalis',
  'matricaria_chamomilla',
  'plantago_major',
  'aloe_vera',
  'origanum_vulgare',

  // 6 leguminosas / abonos verdes
  'mucuna_pruriens',
  'crotalaria_juncea',
  'trifolium_repens',
  'cajanus_cajan',
  'lupinus_mutabilis',
  'tithonia_diversifolia',

  // 6 invasoras prioritarias
  'eichhornia_crassipes',
  'ulex_europaeus',
  'cenchrus_clandestinus',
  'pteridium_aquilinum',
  'melinis_minutiflora',
  'eucalyptus_globulus',

  // 5 hortalizas básicas
  'lactuca_sativa_capitata',
  'solanum_lycopersicum_san_marzano',
  'allium_fistulosum',
  'coriandrum_sativum',
  'daucus_carota_subsp_sativus',

  // 5 species especiales (demos)
  'chenopodium_quinoa',
  'amaranthus_caudatus',
  'salvia_hispanica',
  'physalis_peruviana',
  'rubus_glaucus',
]);

const REF_FIELDS_TO_FILTER = [
  'companions',
  'antagonists',
  'recommended_covers',
  'recommended_fences',
  'especies_nativas_sustitutas',
];

function die(msg, code = 2) {
  console.error(`\x1b[31mFATAL: ${msg}\x1b[0m`);
  process.exit(code);
}

function main() {
  if (OSS_SUBSET_IDS.size !== 50) {
    die(`OSS_SUBSET_IDS tiene ${OSS_SUBSET_IDS.size}, esperaba 50`);
  }

  let inputPath;
  let inputContent;
  if (EXPLICIT_INPUT) {
    inputPath = EXPLICIT_INPUT;
    try {
      inputContent = readFileSync(inputPath, 'utf8');
    } catch (e) {
      die(`No pude leer input ${inputPath}: ${e.message}`, 3);
    }
  } else {
    try {
      const r = readInputWithFallback(FALLBACK_FULL, LOCAL_SEED);
      inputPath = r.path;
      inputContent = r.content;
    } catch (e) {
      die(`No pude resolver input (probé ${FALLBACK_FULL} y ${LOCAL_SEED}): ${e.message}`, 3);
    }
  }

  console.log('build-oss-subset.mjs');
  console.log(`  input:  ${inputPath}`);
  console.log(`  output: ${OUTPUT}`);
  console.log('');

  const full = JSON.parse(inputContent);
  const fullSpeciesCount = (full.species || []).length;
  const fullIds = new Set((full.species || []).map((s) => s.id));

  const missing = [...OSS_SUBSET_IDS].filter((id) => !fullIds.has(id));
  if (missing.length > 0) {
    die(`IDs del subset que no existen en el catálogo full: ${missing.join(', ')}`, 4);
  }

  const speciesRaw = (full.species || []).filter((s) => OSS_SUBSET_IDS.has(s.id));
  if (speciesRaw.length !== 50) {
    die(`Filtrado dio ${speciesRaw.length} species, esperaba 50`, 5);
  }

  // Stats antes del podado para reporte.
  let totalRefsBefore = 0;
  for (const s of speciesRaw) {
    for (const f of REF_FIELDS_TO_FILTER) {
      totalRefsBefore += (s[f] || []).length;
    }
  }

  // Poda refs cruzadas a IDs fuera del subset.
  const species = speciesRaw.map((s) => {
    const clone = { ...s };
    for (const f of REF_FIELDS_TO_FILTER) {
      if (Array.isArray(clone[f])) {
        clone[f] = clone[f].filter((id) => OSS_SUBSET_IDS.has(id));
      }
    }
    return clone;
  });

  let totalRefsAfter = 0;
  for (const s of species) {
    for (const f of REF_FIELDS_TO_FILTER) {
      totalRefsAfter += (s[f] || []).length;
    }
  }

  // biopreparados queda íntegro (decisión 2026-05-23 — public + valor pedagógico).
  const biopreparados = full.biopreparados || [];

  // Filtra sources referenciados por: las 50 species (source_ids + saber_origen)
  // Y por los biopreparados (source_ids). Si no incluimos los sources de
  // biopreparados, AMB-13 rompe con cross-refs colgados (los biopreparados
  // del subset OSS apuntan a sources Restrepo/Cho/etc. que se filtrarían).
  const referencedSourceIds = new Set();
  for (const s of species) {
    for (const sid of s.source_ids || []) referencedSourceIds.add(sid);
    for (const sid of s.saber_origen?.validacion_cientifica_source_ids || []) {
      referencedSourceIds.add(sid);
    }
  }
  for (const bp of biopreparados) {
    for (const sid of bp.source_ids || []) referencedSourceIds.add(sid);
  }
  const sources = (full.sources || []).filter((src) => referencedSourceIds.has(src.id));

  // Compone subset. Conserva top-level fields del full.
  const subset = {
    ...(full._meta && { _meta: full._meta }),
    schema_version: full.schema_version,
    seed_version: typeof full.seed_version === 'string' && !full.seed_version.includes('oss-subset')
      ? `${full.seed_version}-oss-subset`
      : full.seed_version,
    // generated_at puede inyectarse con --stamp (no por default para que el
    // output sea determinístico y los diffs git no sean ruidosos en re-runs).
    ...(process.argv.includes('--stamp') ? { generated_at: new Date().toISOString() } : {}),
    generated_by: 'scripts/build-oss-subset.mjs',
    _subset_meta: {
      subset_name: 'oss-subset-50',
      criterio: 'editorial-v2-2026-05-23',
      source_file_basename: inputPath.split('/').pop(),
      source_species_count: fullSpeciesCount,
      subset_species_count: species.length,
      sources_kept: sources.length,
      sources_dropped: (full.sources || []).length - sources.length,
      refs_cruzadas_antes: totalRefsBefore,
      refs_cruzadas_despues: totalRefsAfter,
      refs_cruzadas_podadas: totalRefsBefore - totalRefsAfter,
      biopreparados_count: biopreparados.length,
      composicion: {
        cultivos_comerciales: 12,
        arboles_sombra_companions_cafe: 8,
        medicinales_tradicionales: 8,
        leguminosas_abonos_verdes: 6,
        invasoras_prioritarias: 6,
        hortalizas_basicas: 5,
        especiales_demo: 5,
      },
      license: 'CC-BY-NC-SA 4.0',
      rationale:
        'Subset OSS público (50 species) para divulgación agroecológica colombiana. Cubre queries comunes (café+sombra, plátano, yuca, papa criolla, biopreparados básicos) sin filtrar la curaduría editorial Pro (variedades ICA detalladas, endemismos paramunos, cultivares específicos). El catálogo full vive en repo privado chagra-pro/data/catalog/chagra-catalog-full-v3.1.json. ADR-009 + ADR-024 + ADR-026.',
    },
    species,
    sources,
    biopreparados,
  };

  writeFileSync(OUTPUT, JSON.stringify(subset, null, 2) + '\n');

  console.log('Resumen:');
  console.log(`  species kept:        ${species.length}`);
  console.log(`  species removed:     ${fullSpeciesCount - species.length}`);
  console.log(`  refs cruzadas antes: ${totalRefsBefore}`);
  console.log(`  refs cruzadas tras:  ${totalRefsAfter}`);
  console.log(`  refs podadas:        ${totalRefsBefore - totalRefsAfter}`);
  console.log(`  sources kept:        ${sources.length}/${(full.sources || []).length}`);
  console.log(`  biopreparados:       ${biopreparados.length} (íntegro, decisión 2026-05-23)`);
  console.log('');
  console.log(`\x1b[32m✓ Escrito ${OUTPUT}\x1b[0m`);
}

const IS_CLI = import.meta.url === `file://${process.argv[1]}`;
if (IS_CLI) main();
