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
 * Extensión 2026-05-18 (audit deep finding #9): además del
 * `valor_pedagogico`, inyectamos secciones markdown adicionales para
 * que el retrieve BM25 las indexe como passages:
 *
 *   - `feeding_plan_text`   ← `species.feeding_plan_template` (steps de
 *     alimentación: D+offset, action, biofertilizer, dose).
 *   - `companions_text`     ← `species.companions[]` resuelto a nombres.
 *   - `antagonists_text`    ← `species.antagonists[]` resuelto a nombres.
 *
 * Las secciones se omiten si el campo está vacío/ausente (no se generan
 * headers vacíos). Tres campos quedan también como arrays estructurados
 * (compatibles legacy): `antagonists`, `companions`,
 * `feeding_plan_template`.
 *
 * Reglas:
 * - NO sobrescribir archivos cycle-content **curados manualmente**
 *   (fresa, lechuga, tomate_chonto están ricamente curados con
 *   milestones/failure_modes que el catalog no tiene — preservarlos).
 *   La detección es por presencia del marker `_generated_by`: un
 *   archivo SIN ese marker es curado a mano y no se toca; un archivo
 *   CON el marker fue producido por este mismo script en una corrida
 *   anterior y SÍ se regenera (idempotencia frente a refinamientos del
 *   catálogo o cambios de este ETL).
 * - SOLO escribir species con `valor_pedagogico` ≥200 chars (criterio
 *   AMB-16). Las cortas siguen siendo stubs y NO ayudan al retrieve.
 * - Shape minimal pero compatible con `flattenDoc`: cualquier string
 *   >20 chars se vuelve passage indexable.
 *
 * Output:
 * - Imprime resumen: N generados/regenerados, K skipped (curados a
 *   mano), M skipped (vp <200).
 * - Después corre `generate-cycle-content-manifest.mjs` para
 *   re-generar el manifest.
 *
 * Uso:
 *   node scripts/build-cycle-content-from-catalog.mjs
 *
 * Idempotente: corre-y-recorre solo cambia los archivos cuando el
 * contenido derivado del catálogo cambia (el timestamp se sustituye
 * por la fecha solo cuando el shape se modifica, no cada corrida —
 * ver `keepStableTimestamp`).
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

/**
 * Index `species[].id → species` para resolver slugs companions/antagonists
 * a nombres comunes legibles en el passage markdown.
 */
function loadSpeciesIndex(catalog) {
  const idx = {};
  (catalog.species || []).forEach((sp) => {
    if (sp.id) idx[sp.id] = sp;
  });
  return idx;
}

function commonNameFor(species) {
  if (!species) return null;
  const nc = species.nombre_comun;
  if (Array.isArray(nc) && nc.length > 0) return nc[0];
  if (typeof nc === 'string' && nc.length > 0) return nc;
  return null;
}

/**
 * Resuelve un slug a la mejor etiqueta humana posible:
 *   - "slug — nombre_comun (Nombre cientifico)"
 *   - "slug — nombre_comun"  si falta científico
 *   - "slug"                  si el slug no existe en el catálogo
 */
function labelForSlug(slug, speciesIndex) {
  const sp = speciesIndex[slug];
  if (!sp) return slug;
  const common = commonNameFor(sp);
  const sci = sp.nombre_cientifico;
  if (common && sci) return `${slug} — ${common} (${sci})`;
  if (common) return `${slug} — ${common}`;
  if (sci) return `${slug} — ${sci}`;
  return slug;
}

/**
 * Formatea `feeding_plan_template` a markdown indexable por BM25. El shape
 * canónico esperado (PR coordinado del agente de feeding plans):
 *
 *   {
 *     "source": "Agrosavia - Manual Fresa",
 *     "primary_steps": [
 *       { "offset_days": 0,  "action": "compost",      "biofertilizer_slug": "bocashi",        "dose_ml": 500, "notes": "Establecimiento" },
 *       { "offset_days": 30, "action": "biofertilizer", "biofertilizer_slug": "biol",          "dose_ml": 250, "notes": "Crecimiento" }
 *     ]
 *   }
 *
 * Tolerante a variantes legacy: si el template no trae `primary_steps[]`
 * sino campos planos (un solo step), formatea ese único step.
 */
function formatFeedingPlanTemplate(template) {
  if (!template || typeof template !== 'object') return null;
  const lines = ['### Plan de alimentación'];
  if (template.source) lines.push(`- Fuente: ${template.source}`);

  const stepLine = (step) => {
    if (!step || typeof step !== 'object') return null;
    const offset = typeof step.offset_days === 'number' ? `D+${step.offset_days}` : 'D+?';
    const action = step.action || 'aplicación';
    const bio = step.biofertilizer_slug || step.biofertilizer || null;
    const dose = step.dose_ml != null
      ? `${step.dose_ml} ml`
      : (step.dose != null ? String(step.dose) : null);
    const notes = step.notes ? ` — ${step.notes}` : '';
    const bioPart = bio ? `, ${bio}` : '';
    const dosePart = dose ? `, dosis ${dose}` : '';
    return `- ${offset}: ${action}${bioPart}${dosePart}${notes}`;
  };

  let stepsAdded = 0;
  if (Array.isArray(template.primary_steps)) {
    for (const step of template.primary_steps) {
      const line = stepLine(step);
      if (line) {
        lines.push(line);
        stepsAdded++;
      }
    }
  } else if (typeof template.action === 'string' || template.biofertilizer_slug) {
    // Variante legacy plana (gulupa, vp pre-refine): tratar el objeto entero
    // como un único step. Resiliente al "shape roto" del seed actual.
    const line = stepLine(template);
    if (line) {
      lines.push(line);
      stepsAdded++;
    }
  }

  if (template.notes && typeof template.notes === 'string' && !stepsAdded) {
    // Si no hay pasos extraíbles pero hay notes a nivel template, agrégalas
    // para que el retrieve indexe al menos la justificación.
    lines.push(`- Notas: ${template.notes}`);
    stepsAdded++;
  }

  // Si no logramos extraer NADA útil más allá del header + source, no emitir
  // sección — un header solo no aporta señal y mete ruido al BM25.
  if (stepsAdded === 0 && lines.length <= 2) return null;
  return lines.join('\n');
}

function formatCompanionList(slugs, speciesIndex) {
  if (!Array.isArray(slugs) || slugs.length === 0) return null;
  const lines = ['### Especies asociadas favorables (companions)'];
  for (const slug of slugs) {
    lines.push(`- ${labelForSlug(slug, speciesIndex)}`);
  }
  return lines.join('\n');
}

function formatAntagonistList(slugs, speciesIndex) {
  if (!Array.isArray(slugs) || slugs.length === 0) return null;
  const lines = ['### Antagonistas (no asociar)'];
  for (const slug of slugs) {
    lines.push(`- ${labelForSlug(slug, speciesIndex)}`);
  }
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

  const companions = Array.isArray(species.companions) ? species.companions : [];
  const antagonists = Array.isArray(species.antagonists) ? species.antagonists : [];
  const feedingTemplate = species.feeding_plan_template || null;

  // Pre-rendered markdown sections (consumidos por flattenDoc → BM25).
  // Se omiten si están vacíos para no inflar el índice con headers sin cuerpo.
  const feedingPlanText = formatFeedingPlanTemplate(feedingTemplate);
  const companionsText = formatCompanionList(companions, speciesIndex);
  const antagonistsText = formatAntagonistList(antagonists, speciesIndex);

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
    companions,
    antagonists,
    especies_nativas_sustitutas: species.especies_nativas_sustitutas || [],
    propagation: species.propagation || null,
    feeding_plan_template: feedingTemplate,
    valor_pedagogico: species.valor_pedagogico,
  };

  // Sólo insertamos las claves *_text cuando hay contenido real, para que
  // `flattenDoc` no las vea como undefined ni el retrieve indexe basura.
  if (feedingPlanText) doc.feeding_plan_text = feedingPlanText;
  if (companionsText) doc.companions_text = companionsText;
  if (antagonistsText) doc.antagonists_text = antagonistsText;

  doc.requirements = {
    agua: species.agua || null,
    altitud_msnm: species.altitud_msnm || null,
    temperatura_c: species.temperatura_c || null,
    radiacion: species.radiacion || null,
    drenaje_requerido: species.drenaje_requerido ?? null,
  };
  doc.sources = sourceRefs;
  doc._generated_by = GENERATED_BY;
  doc._generated_at = new Date().toISOString();
  return doc;
}

/**
 * Idempotencia: si el doc nuevo es funcionalmente equivalente al existente
 * (mismo contenido salvo `_generated_at`), preserva el timestamp anterior
 * para evitar diffs ruidosos en cada corrida del ETL.
 */
function keepStableTimestamp(newDoc, prevDoc) {
  if (!prevDoc || typeof prevDoc !== 'object') return newDoc;
  const a = { ...newDoc, _generated_at: null };
  const b = { ...prevDoc, _generated_at: null };
  if (JSON.stringify(a) === JSON.stringify(b)) {
    return { ...newDoc, _generated_at: prevDoc._generated_at };
  }
  return newDoc;
}

function readJsonSafe(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function main() {
  const catalog = loadCatalog();
  const sourcesIndex = loadSourcesIndex(catalog);
  const speciesIndex = loadSpeciesIndex(catalog);
  const species = catalog.species || [];

  // Mapea slug → archivo existente (si lo hay) y lee su `_generated_by`.
  // - Sin `_generated_by`: curado a mano → preservar.
  // - Con `_generated_by`: producido por este script → regenerar.
  const existingFiles = readdirSync(CYCLE_CONTENT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json');
  const curatedSlugs = new Set();
  const regenerableSlugs = new Set();
  for (const f of existingFiles) {
    const slug = f.replace(/\.json$/, '');
    const existing = readJsonSafe(join(CYCLE_CONTENT_DIR, f));
    if (existing && existing._generated_by === GENERATED_BY) {
      regenerableSlugs.add(slug);
    } else {
      curatedSlugs.add(slug);
    }
  }

  let written = 0;
  let unchanged = 0;
  let skippedCurated = 0;
  let skippedShortVp = 0;
  let skippedNoId = 0;
  let firstTime = 0;

  for (const sp of species) {
    if (!sp.id) {
      skippedNoId++;
      continue;
    }
    if (curatedSlugs.has(sp.id)) {
      skippedCurated++;
      continue;
    }
    const vpLen = (sp.valor_pedagogico || '').length;
    if (vpLen < MIN_VP_LENGTH) {
      skippedShortVp++;
      continue;
    }

    const outPath = join(CYCLE_CONTENT_DIR, `${sp.id}.json`);
    const prevDoc = existsSync(outPath) ? readJsonSafe(outPath) : null;
    const newDoc = buildCycleDoc(sp, sourcesIndex, speciesIndex);
    const finalDoc = keepStableTimestamp(newDoc, prevDoc);

    const prevJson = prevDoc ? JSON.stringify(prevDoc) : null;
    const nextJson = JSON.stringify(finalDoc);
    if (prevJson === nextJson) {
      unchanged++;
      continue;
    }

    writeFileSync(outPath, JSON.stringify(finalDoc, null, 2) + '\n');
    written++;
    if (!regenerableSlugs.has(sp.id)) firstTime++;
  }

  console.log(`[cycle-content-etl] Catálogo: ${species.length} species`);
  console.log(`[cycle-content-etl] Escritos: ${written} (de los cuales nuevos: ${firstTime})`);
  console.log(`[cycle-content-etl] Sin cambios: ${unchanged}`);
  console.log(`[cycle-content-etl] Skipped (curados a mano): ${skippedCurated}`);
  console.log(`[cycle-content-etl] Skipped (vp <${MIN_VP_LENGTH} chars): ${skippedShortVp}`);
  if (skippedNoId > 0) console.log(`[cycle-content-etl] Skipped (sin id): ${skippedNoId}`);

  // Regenerar manifest tras agregar archivos.
  console.log('[cycle-content-etl] Regenerando manifest.json...');
  execSync(`node ${MANIFEST_SCRIPT}`, { stdio: 'inherit' });
}

main();
