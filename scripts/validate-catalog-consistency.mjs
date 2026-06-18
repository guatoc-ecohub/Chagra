#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_CATALOGS = [
  'catalog/chagra-catalog-oss-subset-v3.2.json',
  'catalog/chagra-catalog-seed-v3.1.json',
];

function defaultCatalogPath() {
  for (const rel of DEFAULT_CATALOGS) {
    const full = join(ROOT, rel);
    if (existsSync(full)) return full;
  }
  return join(ROOT, DEFAULT_CATALOGS[DEFAULT_CATALOGS.length - 1]);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeCatalogRef(value) {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function normalizeId(value) {
  return String(value || '').trim();
}

function pestValues(species) {
  return uniq([
    ...asArray(species.plagas_criticas),
    ...asArray(species.plagas),
    ...asArray(species.enfermedades_criticas),
    ...asArray(species.enfermedades),
  ]).map((raw) => ({ raw, key: normalizeCatalogRef(raw) })).filter((item) => item.key);
}

function bioValues(species) {
  const values = [];
  for (const step of asArray(species.feeding_plan_template?.primary_steps)) {
    if (step?.biofertilizer_slug) values.push(step.biofertilizer_slug);
  }
  const etapas = species.plan_nutricion_base?.biopreparados_por_etapa || {};
  for (const items of Object.values(etapas)) {
    for (const item of asArray(items)) {
      if (item?.biopreparado_id) values.push(item.biopreparado_id);
    }
  }
  return uniq(values).map((raw) => ({ raw, key: normalizeCatalogRef(raw) })).filter((item) => item.key);
}

function explicitBaseId(species) {
  return species.base_species_id
    || species.species_base_id
    || species.parent_species_id
    || species.base_id
    || species.variedad_de
    || species.variety_of
    || null;
}

export function inferBaseId(species, speciesIds) {
  const explicit = explicitBaseId(species);
  if (explicit) return normalizeId(explicit);

  const parts = String(species.id || '').split('_').filter(Boolean);
  for (let size = parts.length - 1; size >= 2; size--) {
    const candidate = parts.slice(0, size).join('_');
    if (speciesIds.has(candidate)) return candidate;
  }

  const scientific = String(species.nombre_cientifico || '');
  const hasVarietyMarker = /(?:\bvar\.|\bcv\.|\bsubsp\.|'.+')/i.test(scientific);
  if (hasVarietyMarker && parts.length > 2) {
    return parts.slice(0, 2).join('_');
  }

  return null;
}

function exclusionAllows(species, relationKind, rawValue) {
  const exclusions = [
    ...asArray(species.justificacion_exclusion),
    ...asArray(species.justificaciones_exclusion),
    ...asArray(species.exclusiones_paridad),
    ...asArray(species.parity_exclusions),
  ];
  const valueKey = normalizeCatalogRef(rawValue);
  return exclusions.some((entry) => {
    if (typeof entry === 'string') {
      const normalized = normalizeCatalogRef(entry);
      return normalized.includes(valueKey) || normalized.includes(normalizeCatalogRef(relationKind));
    }
    if (!entry || typeof entry !== 'object') return false;
    const kind = normalizeCatalogRef(entry.tipo || entry.kind || entry.relacion || entry.relation || '');
    const id = normalizeCatalogRef(entry.id || entry.valor || entry.value || entry.ref || '');
    return (!kind || kind === normalizeCatalogRef(relationKind)) && (!id || id === valueKey);
  });
}

function addIssue(issues, code, message, offender) {
  issues.push({ code, message, offender });
}

export function isValidBinomialScientificName(name) {
  const clean = String(name || '')
    .replace(/\u00d7/g, 'x')
    .replace(/\s+/g, ' ')
    .trim();
  const match = clean.match(/^([A-Z][a-z-]+)\s+(?:x\s+)?([a-z][a-z-]+)(?:\s|$)/);
  if (!match) return false;
  if (match[1].length < 2 || match[2].length < 2) return false;
  if (/[0-9_]/.test(`${match[1]} ${match[2]}`)) return false;
  return true;
}

export function validateCatalogConsistency(catalog) {
  const issues = [];
  const species = asArray(catalog.species);
  const biopreparados = asArray(catalog.biopreparados);
  const pestRegistry = new Set([
    ...asArray(catalog.pests).map((p) => normalizeCatalogRef(p.id || p.nombre || p.name || p)),
    ...asArray(catalog.pests_diseases).map((p) => normalizeCatalogRef(p.id || p.nombre || p.name || p)),
    ...asArray(catalog.plagas).map((p) => normalizeCatalogRef(p.id || p.nombre || p.name || p)),
    ...asArray(catalog.enfermedades).map((p) => normalizeCatalogRef(p.id || p.nombre || p.name || p)),
  ].filter(Boolean));
  const hasExplicitPestRegistry = pestRegistry.size > 0;
  const bioIds = new Set(biopreparados.map((bp) => normalizeCatalogRef(bp.id)).filter(Boolean));
  const speciesIds = new Set();
  const byId = new Map();

  for (const sp of species) {
    const id = normalizeId(sp.id);
    if (!id) {
      addIssue(issues, 'missing_species_id', 'Species sin id', { id });
      continue;
    }
    if (speciesIds.has(id)) {
      addIssue(issues, 'duplicate_id', 'ID duplicado en species', { id, type: 'species' });
    }
    speciesIds.add(id);
    if (!byId.has(id)) byId.set(id, sp);
  }

  const seenBioIds = new Set();
  for (const bp of biopreparados) {
    const id = normalizeId(bp.id);
    if (!id) {
      addIssue(issues, 'missing_biopreparado_id', 'Biopreparado sin id', { id });
      continue;
    }
    if (seenBioIds.has(id) || speciesIds.has(id)) {
      addIssue(issues, 'duplicate_id', 'ID duplicado en catalogo', { id, type: 'biopreparado' });
    }
    seenBioIds.add(id);
  }

  for (const sp of species) {
    const id = normalizeId(sp.id);
    if (!isValidBinomialScientificName(sp.nombre_cientifico)) {
      addIssue(issues, 'invalid_scientific_name', 'Nombre cientifico no binomial', {
        id,
        nombre_cientifico: sp.nombre_cientifico || null,
      });
    }

    for (const pest of pestValues(sp)) {
      if (hasExplicitPestRegistry && !pestRegistry.has(pest.key)) {
        addIssue(issues, 'missing_pest_ref', 'Plaga o enfermedad referenciada no existe', {
          id,
          ref: pest.raw,
        });
      }
    }

    for (const bio of bioValues(sp)) {
      if (!bioIds.has(bio.key)) {
        addIssue(issues, 'missing_biopreparado_ref', 'Biopreparado referenciado no existe', {
          id,
          ref: bio.raw,
        });
      }
    }
  }

  for (const sp of species) {
    const id = normalizeId(sp.id);
    const baseId = inferBaseId(sp, speciesIds);
    if (!baseId || baseId === id) continue;
    const base = byId.get(baseId);
    if (!base) {
      addIssue(issues, 'missing_base_species', 'Variedad apunta a base inexistente', {
        id,
        base_id: baseId,
      });
      continue;
    }

    const basePests = new Set(pestValues(base).map((item) => item.key));
    const baseBios = new Set(bioValues(base).map((item) => item.key));
    for (const pest of pestValues(sp)) {
      if (!basePests.has(pest.key) && !exclusionAllows(sp, 'pest', pest.raw)) {
        addIssue(issues, 'base_variety_parity_pest', 'La base no lista plaga o enfermedad de la variedad', {
          id,
          base_id: baseId,
          ref: pest.raw,
        });
      }
    }
    for (const bio of bioValues(sp)) {
      if (!baseBios.has(bio.key) && !exclusionAllows(sp, 'biopreparado', bio.raw)) {
        addIssue(issues, 'base_variety_parity_biopreparado', 'La base no lista biopreparado de la variedad', {
          id,
          base_id: baseId,
          ref: bio.raw,
        });
      }
    }
  }

  const stats = {
    species: species.length,
    biopreparados: biopreparados.length,
    issues: issues.length,
    byCode: issues.reduce((acc, issue) => {
      acc[issue.code] = (acc[issue.code] || 0) + 1;
      return acc;
    }, {}),
  };

  return { ok: issues.length === 0, issues, stats };
}

export function formatCatalogConsistencyReport(result, opts = {}) {
  const limit = opts.limit ?? 80;
  const lines = [
    `Catalog consistency: species=${result.stats.species} biopreparados=${result.stats.biopreparados} issues=${result.stats.issues}`,
  ];
  for (const [code, count] of Object.entries(result.stats.byCode).sort()) {
    lines.push(`- ${code}: ${count}`);
  }
  for (const issue of result.issues.slice(0, limit)) {
    lines.push(`FAIL ${issue.code}: ${JSON.stringify(issue.offender)}`);
  }
  if (result.issues.length > limit) {
    lines.push(`... ${result.issues.length - limit} more issues`);
  }
  return lines.join('\n');
}

export function parseArgs(argv) {
  const opts = {
    catalog: defaultCatalogPath(),
    reportOnly: false,
    limit: 80,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--catalog' || arg === '--input') opts.catalog = resolve(argv[++i]);
    else if (arg === '--report-only') opts.reportOnly = true;
    else if (arg === '--limit') opts.limit = Number(argv[++i]);
    else if (arg === '--help' || arg === '-h') opts.help = true;
  }
  return opts;
}

export function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log('Usage: node scripts/validate-catalog-consistency.mjs [--catalog FILE] [--report-only] [--limit N]');
    return 0;
  }
  const catalog = readJson(opts.catalog);
  const result = validateCatalogConsistency(catalog);
  const report = formatCatalogConsistencyReport(result, { limit: opts.limit });
  const writer = result.ok || opts.reportOnly ? console.log : console.error;
  writer(report);
  if (!result.ok && !opts.reportOnly) return 1;
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = main();
}
