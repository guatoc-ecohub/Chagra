#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const DEFAULT_SEED_PATH = join(ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
const DEFAULT_SUBSET_PATH = join(ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json');
const DEFAULT_OUTPUT_JSON = join(ROOT, 'docs/curador-catalogo-huecos.json');
const DEFAULT_OUTPUT_MD = join(ROOT, 'docs/curador-catalogo-huecos.md');

const PHOTO_FIELD_RE = /^(foto|fotos|imagen|imagenes|image|images|photo|photos|media|thumbnail|cover|portada)(?:_|$)/i;
const CONTROL_HINT_RE = /(?:control biol[oó]gico|biocontrol|enemigo natural|enemigos naturales|controlador biol[oó]gico|depredador|parasitoide|entomop[aá]togen[oa]|antagonista)/i;

function parseArgs(argv) {
  const out = {
    seed: DEFAULT_SEED_PATH,
    subset: DEFAULT_SUBSET_PATH,
    outJson: DEFAULT_OUTPUT_JSON,
    outMd: DEFAULT_OUTPUT_MD,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--seed' && argv[i + 1]) {
      out.seed = resolve(ROOT, argv[++i]);
    } else if (arg === '--subset' && argv[i + 1]) {
      out.subset = resolve(ROOT, argv[++i]);
    } else if (arg === '--out-json' && argv[i + 1]) {
      out.outJson = resolve(ROOT, argv[++i]);
    } else if (arg === '--out-md' && argv[i + 1]) {
      out.outMd = resolve(ROOT, argv[++i]);
    } else if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage:',
        '  node scripts/curador-catalogo-huecos.mjs [--seed path] [--subset path] [--out-json path] [--out-md path]',
      ].join('\n'));
      process.exit(0);
    }
  }

  return out;
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    const message = error && error.code === 'ENOENT'
      ? `No se pudo leer ${path}`
      : `JSON invalido en ${path}: ${error.message}`;
    throw new Error(message);
  }
}

function loadCatalog(path, label) {
  if (!existsSync(path)) {
    return null;
  }
  const data = readJson(path);
  const species = Array.isArray(data.species) ? data.species : [];
  const firstSpecies = species[0] && typeof species[0] === 'object' ? species[0] : null;

  return {
    label,
    path,
    topLevelKeys: Object.keys(data),
    speciesCount: species.length,
    firstSpeciesKeys: firstSpecies ? Object.keys(firstSpecies) : [],
    species,
  };
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isMeaningful(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return false;
}

function walkObject(value, visitor, path = []) {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walkObject(value[i], visitor, path.concat(String(i)));
    }
    return;
  }

  if (!isPlainObject(value)) return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = path.concat(key);
    visitor({ key, value: child, path: childPath });
    walkObject(child, visitor, childPath);
  }
}

function hasFieldWithKey(species, keyRe) {
  let found = false;
  walkObject(species, ({ key, value }) => {
    if (!found && keyRe.test(key) && isMeaningful(value)) {
      found = true;
    }
  });
  return found;
}

function collectFieldMatches(species, keyRe) {
  const matches = [];
  walkObject(species, ({ key, value, path }) => {
    if (keyRe.test(key) && isMeaningful(value)) {
      matches.push({ path: path.join('.'), value });
    }
  });
  return matches;
}

function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function hasAltitudeGap(species) {
  const alt = species.altitud_msnm;
  const thermalZones = Array.isArray(species.thermal_zones) ? species.thermal_zones : [];
  const altitudeValid = isPlainObject(alt)
    && Number.isFinite(alt.min_absoluto)
    && Number.isFinite(alt.optimo_min)
    && Number.isFinite(alt.optimo_max)
    && Number.isFinite(alt.max_absoluto);
  const thermalValid = thermalZones.length > 0;
  return !altitudeValid || !thermalValid;
}

function hasPhotoGap(species) {
  return !hasFieldWithKey(species, PHOTO_FIELD_RE);
}

function hasBiocontrolSignal(species) {
  if (hasFieldWithKey(species, /^(validated_relations|plagas_criticas|control_biologico|biocontrol|enemigos_naturales)$/i)) {
    const hints = [];

    if (Array.isArray(species.validated_relations)) {
      for (const relation of species.validated_relations) {
        if (relation && typeof relation === 'object') {
          hints.push(JSON.stringify(relation));
        }
      }
    }

    if (Array.isArray(species.plagas_criticas)) {
      hints.push(...species.plagas_criticas.map((entry) => String(entry)));
    }

    if (typeof species.control_biologico === 'string') {
      hints.push(species.control_biologico);
    }

    if (typeof species.biocontrol === 'string') {
      hints.push(species.biocontrol);
    }

    if (typeof species.enemigos_naturales === 'string') {
      hints.push(species.enemigos_naturales);
    }

    return hints.some((text) => CONTROL_HINT_RE.test(normalizeText(text)));
  }

  const stringFields = [];
  walkObject(species, ({ value }) => {
    if (typeof value === 'string') {
      stringFields.push(value);
    }
  });
  return stringFields.some((text) => CONTROL_HINT_RE.test(normalizeText(text)));
}

function pickSpeciesRecords(catalogs) {
  const byId = new Map();
  const sourceFiles = [];

  for (const catalog of catalogs) {
    if (!catalog) continue;
    sourceFiles.push({
      label: catalog.label,
      path: catalog.path,
      species_count: catalog.speciesCount,
      top_level_keys: catalog.topLevelKeys,
      first_species_keys: catalog.firstSpeciesKeys,
    });

    for (const species of catalog.species) {
      if (!species || typeof species !== 'object' || !species.id) continue;
      byId.set(species.id, {
        ...species,
        _source_file: catalog.path,
        _source_label: catalog.label,
      });
    }
  }

  return {
    species: [...byId.values()].sort((a, b) => String(a.id).localeCompare(String(b.id))),
    sourceFiles,
  };
}

function buildHoleList(species, predicate) {
  return species
    .filter(predicate)
    .map((entry) => ({
      id: entry.id,
      nombre_comun: entry.nombre_comun || '',
      nombre_cientifico: entry.nombre_cientifico || '',
      source_file: entry._source_file,
    }));
}

function sampleSpecies(list, limit = 30) {
  return list.slice(0, limit).map((entry) => `${entry.id} - ${entry.nombre_comun || entry.nombre_cientifico || ''}`);
}

function writeFileEnsured(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function buildMarkdown(report) {
  const { meta, counts, categories } = report;
  const rows = [
    '# Curador de catálogo - huecos',
    '',
    `Total de especies analizadas: ${counts.total_species}`,
    `Fuentes leídas: ${meta.input_files.map((f) => f.path).join(', ')}`,
    `Fusion de registros: por id, con prioridad al archivo leido al final.`,
    `Especie base inspeccionada, claves observadas: ${meta.sample_first_species_keys.join(', ') || 'sin especies'}`,
    '',
    '| Categoria | Conteo | Primeras 30 especies |',
    '|---|---:|---|',
  ];

  for (const [key, category] of Object.entries(categories)) {
    const sample = sampleSpecies(category.list, 30).join('<br>');
    rows.push(`| ${category.label} | ${category.count} | ${sample || '—'} |`);
  }

  rows.push('');
  rows.push('## Metodo');
  rows.push('- Piso termico / rango altitudinal: hueco cuando falta `altitud_msnm` valida o falta `thermal_zones`.');
  rows.push('- Foto / imagen: hueco cuando no existe ningun campo de foto o imagen reconocido en el registro.');
  rows.push('- Control biologico: hueco cuando no hay evidencia textual de asociacion de control o biocontrol en el registro.');
  rows.push('');
  rows.push('## Claves observadas');
  for (const file of meta.input_files) {
    rows.push(`- ${file.label}: ${(file.first_species_keys || []).join(', ') || 'sin especies'}`);
  }

  return rows.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const seedCatalog = loadCatalog(args.seed, 'seed-v3.1');
  const subsetCatalog = loadCatalog(args.subset, 'subset-v3.2');

  if (!seedCatalog && !subsetCatalog) {
    throw new Error('No se encontro ningun catalogo para analizar.');
  }

  const { species, sourceFiles } = pickSpeciesRecords([seedCatalog, subsetCatalog]);

  const missingAltitude = buildHoleList(species, hasAltitudeGap);
  const missingPhoto = buildHoleList(species, hasPhotoGap);
  const missingBiocontrol = buildHoleList(species, (entry) => !hasBiocontrolSignal(entry));

  const report = {
    meta: {
      generated_at: new Date().toISOString(),
      input_files: sourceFiles,
      source_priority: sourceFiles.map((file) => file.label),
      sample_first_species_keys: sourceFiles.flatMap((file) => file.first_species_keys || []).filter(Boolean).slice(0, 40),
    },
    counts: {
      total_species: species.length,
      missing_altitude: missingAltitude.length,
      missing_photo: missingPhoto.length,
      missing_biocontrol: missingBiocontrol.length,
    },
    categories: {
      missing_altitude: {
        label: 'SIN piso termico / rango altitudinal',
        count: missingAltitude.length,
        list: missingAltitude,
      },
      missing_photo: {
        label: 'SIN foto / imagen',
        count: missingPhoto.length,
        list: missingPhoto,
      },
      missing_biocontrol: {
        label: 'SIN controlador biologico asociado',
        count: missingBiocontrol.length,
        list: missingBiocontrol,
      },
    },
  };

  writeFileEnsured(args.outJson, `${JSON.stringify(report, null, 2)}\n`);
  writeFileEnsured(args.outMd, `${buildMarkdown(report)}\n`);

  console.log(`Total especies: ${report.counts.total_species}`);
  console.log(`SIN piso termico / rango altitudinal: ${report.counts.missing_altitude}`);
  console.log(`SIN foto / imagen: ${report.counts.missing_photo}`);
  console.log(`SIN controlador biologico asociado: ${report.counts.missing_biocontrol}`);
}

try {
  main();
} catch (error) {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
}
