#!/usr/bin/env node
/**
 * scripts/age-etno-preflight.mjs
 *
 * Preflight local para la ingesta etnolingüística fitopatológica.
 * No toca AGE ni red: solo valida que el SQL fuente y el léxico offline
 * están presentes, que los mapeos folk→Pest son consistentes y que el
 * paquete documental tiene la estructura esperada para ejecutar la corrida
 * aplicada luego.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const _here = dirname(fileURLToPath(import.meta.url));

// SQL fuente de la ingesta folk fitopatología: contenido curado que vive FUERA
// de este repo. Se pasa por env CHAGRA_AGE_ETNO_SQL o por --sql; sin default
// versionado (por eso el preflight es opcional/gated en CI).
const SQL_PATH = process.env.CHAGRA_AGE_ETNO_SQL || '';
// Léxico campesino co-locado en este repo (público).
const LEXICO_PATH = resolve(_here, '..', 'public', 'lexico-campesino.json');

export function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

export function loadSql(filePath = SQL_PATH) {
  return readFileSync(filePath, 'utf8');
}

export function extractFolkMappings(sql) {
  const blocks = sql
    .split(/\n--\s+\d+[a-z]?\.\s+/g)
    .slice(1);

  return blocks.map((block) => {
    const folkId = block.match(/MERGE \(f:FolkSymptom \{id: '([^']+)'\}\)/)?.[1] || null;
    const label = block.match(/SET f\.label = '([^']+)'/)?.[1] || null;
    const pestId = block.match(/MATCH \(p:Pest \{id: '([^']+)'\}\)/)?.[1] || null;
    return { folkId, label, pestId };
  }).filter((item) => item.folkId && item.label && item.pestId);
}

export function buildPreflightSummary({
  sqlPath = SQL_PATH,
  lexicoPath = LEXICO_PATH,
} = {}) {
  const sql = loadSql(sqlPath);
  const lexico = loadJson(lexicoPath);
  const entries = Array.isArray(lexico.entries) ? lexico.entries : [];
  const mappings = extractFolkMappings(sql);
  const labels = mappings.map((m) => m.label);
  const pestIds = mappings.map((m) => m.pestId);

  const requiredLabels = [
    'gota',
    'ojo de gallo',
    'candelilla',
    'monilia',
    'tizón',
    'tizón tardío',
    'mancha de hierro',
    'escoba de bruja',
    'se pudre la raíz',
    'mata triste-mustia',
  ];

  const requiredPests = [
    'phytophthora_infestans',
    'mycena_citricolor',
    'moniliophthora_roreri',
    'alternaria_solani',
    'cercospora_coffeicola',
    'moniliophthora_perniciosa',
    'rhizoctonia_solani',
    'ralstonia_solanacearum',
  ];

  const labelSet = new Set(labels);
  const pestSet = new Set(pestIds);
  const missingLabels = requiredLabels.filter((label) => !labelSet.has(label));
  const missingPests = requiredPests.filter((pestId) => !pestSet.has(pestId));

  return {
    sqlPath,
    lexicoPath,
    lexicoKind: lexico?._meta?.kind || null,
    lexicoEntries: entries.length,
    lexicoCategories: Array.isArray(lexico?._meta?.categorias) ? lexico._meta.categorias : [],
    mappingCount: mappings.length,
    uniqueLabelCount: labelSet.size,
    uniquePestCount: pestSet.size,
    mappings,
    missingLabels,
    missingPests,
    ready: sql.includes('FOLK_NAME_OF')
      && sql.includes('FolkSymptom')
      && entries.length > 0
      && mappings.length >= 10
      && missingLabels.length === 0
      && missingPests.length === 0,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const opts = {
    json: false,
    sqlPath: SQL_PATH,
    lexicoPath: LEXICO_PATH,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') opts.json = true;
    else if (a === '--sql') opts.sqlPath = argv[++i];
    else if (a === '--lexico') opts.lexicoPath = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.error(
        'Usage: node scripts/age-etno-preflight.mjs [--json] [--sql FILE] [--lexico FILE]',
      );
      return { ready: false };
    }
  }

  if (!opts.sqlPath) {
    console.error('age-etno-preflight: falta el SQL. Define CHAGRA_AGE_ETNO_SQL o pasa --sql FILE.');
    process.exitCode = 1;
    return { ready: false };
  }

  const summary = buildPreflightSummary(opts);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } else {
    const lines = [
      `lexico_kind=${summary.lexicoKind}`,
      `lexico_entries=${summary.lexicoEntries}`,
      `lexico_categories=${summary.lexicoCategories.join(',')}`,
      `mappings=${summary.mappingCount}`,
      `unique_labels=${summary.uniqueLabelCount}`,
      `unique_pests=${summary.uniquePestCount}`,
      `missing_labels=${summary.missingLabels.length ? summary.missingLabels.join(',') : 'none'}`,
      `missing_pests=${summary.missingPests.length ? summary.missingPests.join(',') : 'none'}`,
      `ready=${summary.ready ? 'yes' : 'no'}`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
  }

  if (!summary.ready) process.exitCode = 1;
  return summary;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('age-etno-preflight failed:', err);
    process.exit(1);
  });
}
