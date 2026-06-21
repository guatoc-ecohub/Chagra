/**
 * Barrido de datos sobre el catálogo REAL: verifica, por especie, que
 *   (1) el plan de alimentación resuelve y es estructuralmente válido, y
 *   (2) el ciclo fenológico resuelve, produce etapas monótonas y una etapa
 *       actual derivable.
 *
 * No es un test visual: ejercita las MISMAS funciones que usan la ficha de
 * especie (resolveGenericFeedingForSpecies) y la pantalla de ciclo
 * (resolveTemplate / calculateWindows / deriveCurrentStage) contra cada
 * entrada del catálogo. Reporta cobertura real y marca categorías oscuras.
 *
 * Filosofía: test auto-mejorable — si una categoría cubierta deja de resolver
 * (p.ej. mismatch de `category`), este test lo caza antes que el operador.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  resolveGenericFeedingForSpecies,
  getGenericFeedingTemplate,
  getGenericFeedingCategories,
} from '../feedingPlanGeneric';
import { getGenericCategories } from '../phenologyGeneric';
import { getTemplate } from '../phenologyTemplates';
import {
  resolveTemplate,
  calculateWindows,
  deriveCurrentStage,
} from '../../services/phenologyCalculator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const catalog = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json'), 'utf8'),
);
const species = (catalog.species || catalog.especies || []).filter((s) => s && s.id);

const SOWING = Date.UTC(2026, 0, 15); // timestamp ms (la API usa epoch ms)
const ALT = 1800;
const feedingCats = new Set(getGenericFeedingCategories());
const cycleCats = new Set(getGenericCategories());

function feedingKind(s) {
  if (s.feeding_plan_template) return 'explicit';
  return resolveGenericFeedingForSpecies(s) ? 'generic' : 'none';
}
function cycleKind(s) {
  if (getTemplate(s.id)) return 'specific';
  return resolveTemplate({ speciesSlug: s.id, category: s.category }) ? 'generic' : 'none';
}

describe('Cobertura plan de alimentación + ciclo por especie (catálogo real)', () => {
  it(`tiene especies cargadas (${species.length})`, () => {
    expect(species.length).toBeGreaterThan(100);
  });

  it('reporta cobertura y NO deja sin resolver una categoría que SÍ tiene plantilla', () => {
    const feed = { explicit: 0, generic: 0, none: 0 };
    const cyc = { specific: 0, generic: 0, none: 0 };
    const feedDark = {};
    const cycDark = {};
    for (const s of species) {
      const fk = feedingKind(s);
      feed[fk] += 1;
      if (fk === 'none') feedDark[s.category] = (feedDark[s.category] || 0) + 1;
      const ck = cycleKind(s);
      cyc[ck] += 1;
      if (ck === 'none') cycDark[s.category] = (cycDark[s.category] || 0) + 1;
    }
    const pct = (n) => `${Math.round((n / species.length) * 100)}%`;
    console.log(`\n── NUTRICIÓN (${species.length} especies) ──`);
    console.log(`  con plan: ${feed.explicit + feed.generic} (${pct(feed.explicit + feed.generic)})  [explícito ${feed.explicit} + genérico ${feed.generic}]`);
    console.log(`  SIN plan: ${feed.none} (${pct(feed.none)})  por categoría: ${JSON.stringify(feedDark)}`);
    console.log(`── CICLO FENOLÓGICO ──`);
    console.log(`  con ciclo: ${cyc.specific + cyc.generic} (${pct(cyc.specific + cyc.generic)})  [específico ${cyc.specific} + genérico ${cyc.generic}]`);
    console.log(`  SIN ciclo: ${cyc.none} (${pct(cyc.none)})  por categoría: ${JSON.stringify(cycDark)}`);

    // Regresión dura: ninguna especie cuya categoría tenga plantilla puede fallar.
    const feedMiss = species.filter(
      (s) => !s.feeding_plan_template && feedingCats.has(s.category) && !resolveGenericFeedingForSpecies(s),
    );
    const cycMiss = species.filter(
      (s) => !getTemplate(s.id) && cycleCats.has(s.category) && !resolveTemplate({ speciesSlug: s.id, category: s.category }),
    );
    expect(feedMiss.map((s) => s.id)).toEqual([]);
    expect(cycMiss.map((s) => s.id)).toEqual([]);

    // Tripwire de cobertura: si cae por debajo del piso conocido, algo se rompió.
    // (Sube estos pisos cuando agregues plantillas perennes/medicinales.)
    expect(feed.explicit + feed.generic, 'cobertura nutrición').toBeGreaterThanOrEqual(104);
    expect(cyc.specific + cyc.generic, 'cobertura ciclo').toBeGreaterThanOrEqual(101);
  });

  it('todo plan de nutrición devuelto es estructuralmente válido', () => {
    for (const s of species) {
      if (s.feeding_plan_template) continue; // los explícitos se validan en su propio validador de catálogo
      const plan = resolveGenericFeedingForSpecies(s);
      if (!plan) continue;
      expect(Array.isArray(plan.primary_steps), `${s.id}: primary_steps array`).toBe(true);
      expect(plan.primary_steps.length, `${s.id}: tiene pasos`).toBeGreaterThan(0);
      expect(Array.isArray(plan.notes), `${s.id}: notes array`).toBe(true);
      expect(typeof plan.label, `${s.id}: label`).toBe('string');
      // Paso 0 de suelo presente (cal o roca fosfórica) en todo plan genérico.
      const tieneSuelo = plan.primary_steps.some((p) => /cal_dolomita|roca_fosforica/.test(p.biofertilizer_slug || ''));
      expect(tieneSuelo, `${s.id}: incluye paso de suelo`).toBe(true);
    }
  });

  it('todo ciclo devuelto produce etapas monótonas y etapa actual derivable', () => {
    for (const s of species) {
      const tpl = resolveTemplate({ speciesSlug: s.id, category: s.category });
      if (!tpl) continue;
      const win = calculateWindows({ speciesSlug: s.id, sowingDate: SOWING, altitudeM: ALT, category: s.category });
      expect(win.length, `${s.id}: ventanas`).toBeGreaterThan(0);
      expect(win.every((w) => w.status === 'computed'), `${s.id}: todas computed`).toBe(true);
      let prev = -Infinity;
      for (const w of win) {
        expect(w.windowStart, `${s.id}: windowStart no nulo`).not.toBeNull();
        expect(w.windowStart >= prev, `${s.id}: inicios monótonos`).toBe(true);
        prev = w.windowStart;
      }
      const cur = deriveCurrentStage({
        speciesSlug: s.id,
        sowingDate: SOWING,
        altitudeM: ALT,
        now: SOWING + 40 * 86400000,
        category: s.category,
      });
      expect(typeof cur, `${s.id}: etapa actual string`).toBe('string');
      expect(cur.length, `${s.id}: etapa no vacía`).toBeGreaterThan(0);
    }
  });

  it('override leguminosa: Fabaceae / nitrogen_fixer recibe el plan de legumbre (sin N externo)', () => {
    const legPlan = getGenericFeedingTemplate('granos_legumbres');
    expect(legPlan, 'plantilla de legumbres existe').toBeTruthy();
    expect(legPlan.isLegume).toBe(true);
    const fab = species.find((s) => s.familia_botanica === 'Fabaceae');
    if (fab) {
      const plan = resolveGenericFeedingForSpecies(fab);
      expect(plan, `${fab.id}: resuelve plan`).toBeTruthy();
      expect(plan.isLegume, `${fab.id}: marcado como legumbre`).toBe(true);
    }
  });

  it('override solanácea: el plan de una Solanaceae incluye la nota de calcio/BER', () => {
    const sol = species.find((s) => s.familia_botanica === 'Solanaceae' && !s.feeding_plan_template && feedingCats.has(s.category));
    if (sol) {
      const plan = resolveGenericFeedingForSpecies(sol);
      expect(plan).toBeTruthy();
      const tieneNotaCalcio = plan.notes.some((n) => /punta de abajo|calcio|cal\b/i.test(n));
      expect(tieneNotaCalcio, `${sol.id}: nota de calcio reescrita`).toBe(true);
    }
  });
});
