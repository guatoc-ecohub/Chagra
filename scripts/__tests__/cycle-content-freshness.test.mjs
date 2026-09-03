/**
 * cycle-content-freshness.test.mjs — control de frescura seed ↔ corpus RAG.
 *
 * Regresión del incidente 070.9 (2026-09-03): el corpus
 * `public/cycle-content/` llevaba rancio desde 2026-05-19 porque el
 * builder `scripts/build-cycle-content-from-catalog.mjs` estaba roto
 * (import faltante de existsSync) y nadie lo re-corría. Síntoma del
 * operador: "creo planta fresa → no se genera plan" — el corpus tenía
 * `fragaria_ananassa_monterrey.json` pero el seed dice `fragaria_ananassa`.
 *
 * Este test compara los slugs del seed contra los del corpus en la
 * dirección seed→corpus y falla si divergen:
 *   1. Toda especie del seed con valor_pedagogico ≥200 chars (criterio
 *      AMB-16 del builder) debe tener `public/cycle-content/<id>.json`.
 *   2. Ese JSON debe llevar el marker `_generated_by` del builder (si un
 *      curado a mano ocupa el slug, el builder lo salta y quedaría rancio:
 *      queremos que se vea).
 *   3. `species_slug` interno debe coincidir con el nombre del archivo.
 *   4. Si el seed tiene `feeding_plan_template`/`companions`/`antagonists`,
 *      el JSON debe exponer los campos markdown correspondientes.
 *
 * La dirección corpus→seed (JSONs generados cuyo slug ya no vive en el
 * seed) NO falla: borrar corpus es irreversible y es decisión del
 * operador (070.9 dejó 5 huérfanos listados en su PR). Solo se advierte
 * por consola para que quede visible.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = join(fileURLToPath(import.meta.url), '..');
const ROOT_DIR = join(__dirname, '..', '..');
const SEED_PATH = join(ROOT_DIR, 'catalog', 'chagra-catalog-seed-v3.1.json');
const CORPUS_DIR = join(ROOT_DIR, 'public', 'cycle-content');

// Debe mantenerse en sync con scripts/build-cycle-content-from-catalog.mjs
const MIN_VP_LENGTH = 200;
const BUILDER_MARKER = 'scripts/build-cycle-content-from-catalog.mjs';

function loadSeed() {
  return JSON.parse(readFileSync(SEED_PATH, 'utf-8'));
}

function loadCorpusDoc(slug) {
  const path = join(CORPUS_DIR, `${slug}.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function seedSpeciesExpected() {
  const seed = loadSeed();
  return (seed.species || []).filter((sp) => sp.id && (sp.valor_pedagogico || '').length >= MIN_VP_LENGTH);
}

describe('frescura del corpus RAG vs seed v3.1', () => {
  it('toda especie publicable del seed tiene <slug>.json actualizado en el corpus', () => {
    const species = seedSpeciesExpected();
    expect(species.length).toBeGreaterThan(0);

    const failures = [];
    for (const sp of species) {
      const doc = loadCorpusDoc(sp.id);

      if (!doc) {
        failures.push(`${sp.id}: falta public/cycle-content/${sp.id}.json (seed con vp ≥${MIN_VP_LENGTH})`);
        continue;
      }

      if (doc._generated_by !== BUILDER_MARKER) {
        failures.push(
          `${sp.id}: JSON sin marker del builder (_generated_by=${JSON.stringify(doc._generated_by)}) — el ETL nunca lo tocaría y quedaría rancio`,
        );
        continue;
      }

      if (doc.species_slug !== sp.id) {
        failures.push(`${sp.id}: species_slug interno=${JSON.stringify(doc.species_slug)} diverge del archivo`);
      }

      const tpl = sp.feeding_plan_template;
      const hasSteps = tpl && Array.isArray(tpl.primary_steps) && tpl.primary_steps.length > 0;
      if (hasSteps && !(doc.feeding_plan_markdown || '').includes('### Plan de alimentación')) {
        failures.push(`${sp.id}: seed tiene feeding_plan_template pero el corpus no expone feeding_plan_markdown`);
      }

      if (Array.isArray(sp.companions) && sp.companions.length > 0 && !doc.companions_markdown) {
        failures.push(`${sp.id}: seed tiene companions pero el corpus no expone companions_markdown`);
      }

      if (Array.isArray(sp.antagonists) && sp.antagonists.length > 0 && !doc.antagonists_markdown) {
        failures.push(`${sp.id}: seed tiene antagonists pero el corpus no expone antagonists_markdown`);
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `corpus rancio: ${failures.length} divergencia(s) seed→corpus. ` +
          `Re-corré: node scripts/build-cycle-content-from-catalog.mjs\n  - ` +
          failures.join('\n  - '),
      );
    }
  });

  it('los slugs del corpus generado que ya no viven en el seed quedan visibles (aviso, no fallo)', () => {
    const seed = loadSeed();
    const seedIds = new Set((seed.species || []).map((sp) => sp.id).filter(Boolean));

    const orphans = [];
    for (const file of readdirSync(CORPUS_DIR)) {
      if (!file.endsWith('.json') || file === 'manifest.json') continue;
      let doc;
      try {
        doc = JSON.parse(readFileSync(join(CORPUS_DIR, file), 'utf-8'));
      } catch (_) {
        continue;
      }
      if (doc._generated_by !== BUILDER_MARKER) continue;
      const slug = file.replace(/\.json$/, '');
      if (!seedIds.has(slug)) orphans.push(slug);
    }

    orphans.sort();
    if (orphans.length > 0) {
      const sample = orphans.slice(0, 8).join(', ');
      const rest = orphans.length > 8 ? ` …y ${orphans.length - 8} más` : '';
      console.warn(
        `[freshness] ${orphans.length} JSON del builder apuntan a slugs fuera del seed v3.1 ` +
          `(decisión de borrado: operador). Ej: ${sample}${rest}`,
      );
    }
  });
});
