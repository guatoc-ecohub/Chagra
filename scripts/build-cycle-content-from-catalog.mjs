#!/usr/bin/env node
/**
 * build-cycle-content-from-catalog.mjs
 *
 * ETL del catálogo principal `catalog/chagra-catalog-seed-v3.1.json`
 * hacia `public/cycle-content/<species_id>.json` para alimentar el
 * corpus RAG del agente IA (`src/services/ragRetriever.js`).
 *
 * Motivación (gap-analysis 2026-05-17 + audit deep finding #9):
 *   - El agente solo podía `retrieve` sobre 4 species (fresa, lechuga,
 *     tomate_chonto + manifest), de N+ que tiene el catálogo.
 *   - Aún tras generar valor_pedagogico para todas, faltaba exponer
 *     `feeding_plan_template`, `companions` y `antagonists` como
 *     passages estructurados al BM25. Sin esa info estructurada,
 *     AgentScreen no podía recomendar planes ni asociaciones.
 *
 * Reglas:
 *   - NO sobrescribir cycle-content curados a mano (fresa.json,
 *     lechuga.json, tomate_chonto.json — sin marker `_generated_by`).
 *     Esos están ricamente curados con milestones/failure_modes que el
 *     catálogo no tiene.
 *   - SÍ sobrescribir archivos previamente generados por este script
 *     (marker `_generated_by === 'scripts/build-cycle-content-from-catalog.mjs'`).
 *   - SOLO escribir species con `valor_pedagogico` ≥200 chars (criterio
 *     AMB-16). Species con vp corto son stubs y no aportan al retrieve.
 *
 * Output:
 *   - JSON con shape minimal compatible con `flattenDoc` (cualquier
 *     string >20 chars se vuelve passage indexable). Además de los
 *     campos base, incluye tres strings markdown:
 *       - `feeding_plan_markdown` con bullets `D+N: action · biofert · dose`
 *       - `companions_markdown` con `slug — nombre_común (Nombre científico)`
 *       - `antagonists_markdown` con la misma resolución
 *     Estos campos quedan indexables por BM25 vía flattenDoc.
 *   - Imprime resumen: N generados/actualizados, K skipped (curado),
 *     M skipped (vp <200).
 *   - Después corre `generate-cycle-content-manifest.mjs` para
 *     re-generar el manifest.
 *
 * Uso:
 *   node scripts/build-cycle-content-from-catalog.mjs
 *
 * Idempotente: re-correrlo produce los mismos archivos byte-a-byte
 * salvo el timestamp `_generated_at`.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '..', 'catalog', 'chagra-catalog-seed-v3.1.json');
const CYCLE_CONTENT_DIR = join(__dirname, '..', 'public', 'cycle-content');
const MANIFEST_SCRIPT = join(__dirname, 'generate-cycle-content-manifest.mjs');

const MIN_VP_LENGTH = 200;
const GENERATED_BY = 'scripts/build-cycle-content-from-catalog.mjs';

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

function loadSpeciesIndex(catalog) {
  const idx = {};
  (catalog.species || []).forEach((sp) => {
    if (sp.id) idx[sp.id] = sp;
  });
  return idx;
}

/**
 * Formatea `feeding_plan_template` como markdown indexable por BM25.
 * Devuelve null si el template está vacío o falta. Cada step se
 * lista como bullet `D+offset: action · biofertilizer · dose unit`,
 * resolviendo el campo de dosis correcto (`dose_g` vs `dose_ml`).
 */
function formatFeedingPlanTemplate(template) {
  if (!template || typeof template !== 'object') return null;
  const steps = Array.isArray(template.primary_steps) ? template.primary_steps : [];
  if (steps.length === 0) return null;

  const lines = ['### Plan de alimentación'];
  if (template.source) {
    lines.push('');
    lines.push(`Fuente: ${template.source}`);
  }
  lines.push('');
  steps.forEach((step) => {
    const offset = Number.isFinite(step.offset_days) ? `D+${step.offset_days}` : 'D+?';
    const action = step.action || 'acción no especificada';
    const biofert = step.biofertilizer_slug || 'biofertilizante no especificado';
    let dose = 'dosis no especificada';
    if (Number.isFinite(step.dose_g)) dose = `${step.dose_g} g`;
    else if (Number.isFinite(step.dose_ml)) dose = `${step.dose_ml} ml`;
    else if (typeof step.dose === 'string') dose = step.dose;
    const notes = step.notes ? ` — ${step.notes}` : '';
    lines.push(`- ${offset}: ${action} · ${biofert} · ${dose}${notes}`);
  });
  return lines.join('\n');
}

/**
 * Resuelve una lista de slugs a entradas `slug — nombre_común (Nombre científico)`
 * usando el índice de species. Slugs no encontrados se incluyen como
 * `slug — (sin resolver)` para no romper la salida.
 */
function resolveSpeciesSlugs(slugs, speciesIndex) {
  if (!Array.isArray(slugs) || slugs.length === 0) return [];
  return slugs.map((slug) => {
    const target = speciesIndex[slug];
    if (!target) return `${slug} — (sin resolver en catálogo)`;
    const common = Array.isArray(target.nombre_comun)
      ? target.nombre_comun[0]
      : target.nombre_comun;
    const sci = target.nombre_cientifico ? ` (${target.nombre_cientifico})` : '';
    const commonStr = common ? ` — ${common}` : '';
    return `${slug}${commonStr}${sci}`;
  });
}

function formatCompanionList(companions, speciesIndex) {
  const entries = resolveSpeciesSlugs(companions, speciesIndex);
  if (entries.length === 0) return null;
  const lines = ['### Especies asociadas favorables'];
  lines.push('');
  lines.push('Estas especies favorecen el cultivo cuando se siembran cerca:');
  entries.forEach((e) => lines.push(`- ${e}`));
  return lines.join('\n');
}

function formatAntagonistList(antagonists, speciesIndex) {
  const entries = resolveSpeciesSlugs(antagonists, speciesIndex);
  if (entries.length === 0) return null;
  const lines = ['### Antagonistas (no asociar)'];
  lines.push('');
  lines.push('Evite sembrar estas especies cerca; compiten o comparten plagas/patógenos:');
  entries.forEach((e) => lines.push(`- ${e}`));
  return lines.join('\n');
}

function buildCycleDoc(species, sourcesIndex, speciesIndex) {
  const sourceRefs = (species.source_ids || [])
    .map((id) => sourcesIndex[id])
    .filter(Boolean)
    .map((s) => ({
      id: s.id,
      title: s.title || s.name || s.id,
      tier: s.tier,
      url: s.url || s.handle || s.doi || null,
    }));

  const doc = {
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
  };

  // Secciones markdown extendidas (audit deep finding #9). Inyectadas
  // tras valor_pedagogico y antes de sources/metadata para mantener un
  // orden de lectura coherente y dejarlas indexables por flattenDoc.
  const feedingPlanMd = formatFeedingPlanTemplate(species.feeding_plan_template);
  if (feedingPlanMd) doc.feeding_plan_markdown = feedingPlanMd;

  const companionsMd = formatCompanionList(species.companions, speciesIndex);
  if (companionsMd) doc.companions_markdown = companionsMd;

  const antagonistsMd = formatAntagonistList(species.antagonists, speciesIndex);
  if (antagonistsMd) doc.antagonists_markdown = antagonistsMd;

  doc.sources = sourceRefs;
  doc._generated_by = GENERATED_BY;
  doc._generated_at = new Date().toISOString();

  return doc;
}

/**
 * Decide si el archivo existente puede sobrescribirse.
 * - Si no existe → sí (lo crearemos nuevo).
 * - Si existe con marker `_generated_by === GENERATED_BY` → sí (es nuestro).
 * - Si existe sin ese marker o con otro valor → NO (curado a mano).
 */
function isSafeToOverwrite(outPath) {
  if (!existsSync(outPath)) return true;
  try {
    const raw = readFileSync(outPath, 'utf-8');
    const data = JSON.parse(raw);
    return data._generated_by === GENERATED_BY;
  } catch (_) {
    return false;
  }
}

function main() {
  const catalog = loadCatalog();
  const sourcesIndex = loadSourcesIndex(catalog);
  const speciesIndex = loadSpeciesIndex(catalog);
  const species = catalog.species || [];

  let generated = 0;
  let updated = 0;
  let skippedCurated = 0;
  let skippedShortVp = 0;
  let skippedNoId = 0;

  for (const sp of species) {
    if (!sp.id) {
      skippedNoId++;
      continue;
    }
    const vpLen = (sp.valor_pedagogico || '').length;
    if (vpLen < MIN_VP_LENGTH) {
      skippedShortVp++;
      continue;
    }

    const outPath = join(CYCLE_CONTENT_DIR, `${sp.id}.json`);
    const existed = existsSync(outPath);
    if (!isSafeToOverwrite(outPath)) {
      skippedCurated++;
      continue;
    }

    const doc = buildCycleDoc(sp, sourcesIndex, speciesIndex);
    writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n');
    if (existed) updated++;
    else generated++;
  }

  console.log(`[cycle-content-etl] Catálogo: ${species.length} species`);
  console.log(`[cycle-content-etl] Nuevos generados: ${generated}`);
  console.log(`[cycle-content-etl] Actualizados (regenerados): ${updated}`);
  console.log(`[cycle-content-etl] Skipped (curado a mano): ${skippedCurated}`);
  console.log(`[cycle-content-etl] Skipped (vp <${MIN_VP_LENGTH} chars): ${skippedShortVp}`);
  if (skippedNoId > 0) console.log(`[cycle-content-etl] Skipped (sin id): ${skippedNoId}`);

  // Regenerar manifest tras agregar archivos.
  console.log('[cycle-content-etl] Regenerando manifest.json...');
  execSync(`node ${MANIFEST_SCRIPT}`, { stdio: 'inherit' });
}

main();

export {
  formatFeedingPlanTemplate,
  formatCompanionList,
  formatAntagonistList,
  resolveSpeciesSlugs,
};
