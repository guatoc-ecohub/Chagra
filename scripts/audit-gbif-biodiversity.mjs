#!/usr/bin/env node
/**
 * scripts/audit-gbif-biodiversity.mjs
 *
 * Auditor GBIF para el catalogo Chagra. Lee el seed v3.1, consulta GBIF
 * Species Match y, opcionalmente, Occurrence Search en Colombia para marcar
 * discrepancias taxonomicas y presencia local.
 *
 * Uso:
 *   node scripts/audit-gbif-biodiversity.mjs [--limit N] [--occurrences] [--json]
 *
 * Salida:
 *   - escribe catalog/gbif-audit-report.json
 *   - imprime un resumen legible o JSON si se pasa --json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CATALOG_PATH = resolve(REPO_ROOT, 'catalog/chagra-catalog-seed-v3.1.json');
const REPORT_PATH = resolve(REPO_ROOT, 'catalog/gbif-audit-report.json');
const GBIF_MATCH_URL = 'https://api.gbif.org/v1/species/match';
const GBIF_OCCURRENCE_URL = 'https://api.gbif.org/v1/occurrence/search';
const BATCH_DELAY_MS = 200;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_ATTEMPTS = 4;
const HIGH_CONFIDENCE_THRESHOLD = 80;

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function parseArgs(argv = process.argv.slice(2)) {
  const out = { limit: null, occurrences: false, json: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--occurrences') {
      out.occurrences = true;
      continue;
    }
    if (arg === '--json') {
      out.json = true;
      continue;
    }
    if (arg === '--limit') {
      const next = argv[i + 1];
      if (next && !String(next).startsWith('--')) {
        out.limit = Number(next);
        i += 1;
      }
      continue;
    }
    if (arg.startsWith('--limit=')) {
      out.limit = Number(arg.slice('--limit='.length));
    }
  }

  if (Number.isNaN(out.limit)) out.limit = null;
  return out;
}

function loadCatalog(catalogPath = CATALOG_PATH) {
  const raw = readFileSync(catalogPath, 'utf8');
  const catalog = JSON.parse(raw);
  if (!catalog || !Array.isArray(catalog.species)) {
    throw new Error('Catalog has no species array');
  }
  return catalog;
}

function getScientificName(species) {
  const raw = species?.nombre_cientifico ?? species?.scientific_name ?? '';
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

function normalizeTaxonText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasKingdomMismatch(species, match) {
  const kingdom = normalizeTaxonText(match?.kingdom);
  const family = normalizeTaxonText(match?.family);
  const catalogFamily = normalizeTaxonText(species?.familia_botanica);

  if (kingdom && kingdom !== 'plantae') {
    return true;
  }

  if (catalogFamily && family && catalogFamily !== family) {
    return true;
  }

  return false;
}

function classifyMatch(species, match) {
  if (!match || !match.usageKey) {
    return 'NONE';
  }

  const matchType = String(match.matchType || '').toUpperCase();
  const confidence = Number(match.confidence ?? 0);

  if (matchType === 'FUZZY') {
    return 'FUZZY';
  }

  if (hasKingdomMismatch(species, match)) {
    return 'KINGDOM_MISMATCH';
  }

  if ((matchType === 'EXACT' || matchType === 'HIGHERRANK') && confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return 'OK';
  }

  return 'NONE';
}

async function fetchJsonWithRetry(url, options = {}, fetchImpl = globalThis.fetch) {
  const fetchFn = typeof fetchImpl === 'function' ? fetchImpl : null;
  if (!fetchFn) {
    throw new Error('fetch is not available');
  }

  let lastError = null;

  for (let attempt = 0; attempt <= RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetchFn(url, options);
      if (!res.ok) {
        if ((res.status === 429 || res.status >= 500) && attempt < RETRY_MAX_ATTEMPTS) {
          const retryAfter = Number(res.headers?.get?.('retry-after'));
          const waitMs = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : RETRY_BASE_DELAY_MS * (2 ** attempt);
          await sleep(waitMs);
          continue;
        }
        const error = new Error(`HTTP ${res.status} for ${url}`);
        error.retryable = false;
        throw error;
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (err?.retryable === false) {
        break;
      }
      if (attempt < RETRY_MAX_ATTEMPTS) {
        await sleep(RETRY_BASE_DELAY_MS * (2 ** attempt));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}

async function matchGbifSpecies(scientificName, fetchImpl = globalThis.fetch) {
  const url = `${GBIF_MATCH_URL}?name=${encodeURIComponent(scientificName)}&strict=false`;
  return fetchJsonWithRetry(url, {}, fetchImpl);
}

async function countGbifOccurrences(taxonKey, fetchImpl = globalThis.fetch) {
  const url = `${GBIF_OCCURRENCE_URL}?taxonKey=${encodeURIComponent(taxonKey)}&country=CO&limit=0`;
  const data = await fetchJsonWithRetry(url, {}, fetchImpl);
  return Number(data?.count ?? 0);
}

function buildEntry(species, match, classification, occurrencesCount) {
  const flags = [];
  if (occurrencesCount === 0) {
    flags.push('NO_CO_OCCURRENCES');
  }

  return {
    id: species.id,
    scientific_name: getScientificName(species),
    common_name: species.nombre_comun ?? null,
    category: species.category ?? null,
    family_botanica: species.familia_botanica ?? null,
    classification,
    flags,
    gbif: match
      ? {
          usageKey: match.usageKey ?? null,
          matchType: match.matchType ?? null,
          confidence: match.confidence ?? null,
          rank: match.rank ?? null,
          status: match.status ?? null,
          kingdom: match.kingdom ?? null,
          family: match.family ?? null,
        }
      : null,
    occurrence_count_co: occurrencesCount ?? null,
  };
}

function buildSummary(entries, stats) {
  const counts = entries.reduce((acc, entry) => {
    acc[entry.classification] = (acc[entry.classification] || 0) + 1;
    for (const flag of entry.flags || []) {
      acc[flag] = (acc[flag] || 0) + 1;
    }
    return acc;
  }, {
    OK: 0,
    FUZZY: 0,
    NONE: 0,
    KINGDOM_MISMATCH: 0,
    NO_CO_OCCURRENCES: 0,
  });

  return {
    _meta: {
      generated_at: new Date().toISOString(),
      catalog_path: CATALOG_PATH,
      report_path: REPORT_PATH,
      limit: stats.limit,
      occurrences: stats.occurrences,
      totals: {
        catalog_species: stats.catalogSpecies,
        species_with_scientific_name: stats.speciesWithScientificName,
        audited: entries.length,
      },
      counts,
    },
    entries,
  };
}

async function runAudit(options = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const catalog = deps.catalog || loadCatalog();
  const speciesSource = Array.isArray(catalog.species) ? catalog.species : [];
  const withScientificName = speciesSource.filter((species) => getScientificName(species));
  const limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.floor(options.limit) : null;
  const targetSpecies = limit ? withScientificName.slice(0, limit) : withScientificName;
  const entries = [];

  for (let i = 0; i < targetSpecies.length; i += 1) {
    const species = targetSpecies[i];
    const scientificName = getScientificName(species);
    if (!scientificName) {
      continue;
    }

    const match = await matchGbifSpecies(scientificName, fetchImpl);
    const classification = classifyMatch(species, match);

    let occurrencesCount = null;
    if (options.occurrences && match?.usageKey) {
      occurrencesCount = await countGbifOccurrences(match.usageKey, fetchImpl);
    }

    entries.push(buildEntry(species, match, classification, occurrencesCount));
    await sleep(BATCH_DELAY_MS);
  }

  const report = buildSummary(entries, {
    limit,
    occurrences: Boolean(options.occurrences),
    catalogSpecies: speciesSource.length,
    speciesWithScientificName: withScientificName.length,
  });

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

function printTextReport(report) {
  const { counts, totals } = report._meta;
  console.log(`Catalog species: ${totals.catalog_species}`);
  console.log(`Audited species: ${totals.audited}`);
  console.log(`OK: ${counts.OK}`);
  console.log(`FUZZY: ${counts.FUZZY}`);
  console.log(`NONE: ${counts.NONE}`);
  console.log(`KINGDOM_MISMATCH: ${counts.KINGDOM_MISMATCH}`);
  console.log(`NO_CO_OCCURRENCES: ${counts.NO_CO_OCCURRENCES}`);
  console.log(`Report written to: ${REPORT_PATH}`);
}

async function main() {
  const options = parseArgs();
  const report = await runAudit(options);
  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    printTextReport(report);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  main().catch((err) => {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

export {
  BATCH_DELAY_MS,
  GBIF_MATCH_URL,
  GBIF_OCCURRENCE_URL,
  buildEntry,
  buildSummary,
  classifyMatch,
  countGbifOccurrences,
  fetchJsonWithRetry,
  getScientificName,
  hasKingdomMismatch,
  loadCatalog,
  main,
  matchGbifSpecies,
  normalizeTaxonText,
  parseArgs,
  printTextReport,
  runAudit,
};
