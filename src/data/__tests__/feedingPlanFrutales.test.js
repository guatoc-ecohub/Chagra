import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  getFeedingPlanKindForSpecies,
  resolveFeedingPlanTemplateForSpecies,
  summarizeFeedingPlanCoverage,
} from '../feedingPlanFrutales';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const catalog = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json'), 'utf8'),
);
const species = (catalog.species || []).filter((s) => s && s.id && String(s.category || '').includes('frutal'));

describe('feedingPlanFrutales — derivacion estricta para frutales', () => {
  it('clasifica la cobertura real del catalogo en poblado, generico y sin datos', () => {
    const summary = summarizeFeedingPlanCoverage(species);
    console.log(
      `[feeding-plan-frutales] poblado=${summary.poblado} generico=${summary.generico} sin_datos=${summary.sinDatos}`,
    );
    expect(summary.poblado).toBeGreaterThan(0);
    expect(summary.generico).toBeGreaterThan(0);
    expect(summary.sinDatos).toBe(0);
    expect(summary.poblado + summary.generico + summary.sinDatos).toBe(species.length);
  });

  it('deriva un plan generico por categoria para un frutal sin template explicito', () => {
    const guayaba = species.find((s) => s.id === 'psidium_guajava_manzana');
    expect(guayaba).toBeTruthy();

    const tpl = resolveFeedingPlanTemplateForSpecies(guayaba);
    expect(tpl).toBeTruthy();
    expect(getFeedingPlanKindForSpecies(guayaba)).toBe('generico');
    expect(tpl.source).toMatch(/generico por categoria/i);
    expect(tpl.source).toMatch(/frutales_perennes/i);
    expect(tpl.notes.join(' ')).toMatch(/No existe plan_nutricion_base/i);
    expect(tpl.notes.join(' ')).toMatch(/Fenologia documentada/i);
  });

  it('protege a Ericaceae de la cal dolomitica', () => {
    const blueberry = species.find((s) => s.id === 'vaccinium_corymbosum_biloxi');
    expect(blueberry).toBeTruthy();

    const tpl = resolveFeedingPlanTemplateForSpecies(blueberry);
    expect(tpl).toBeTruthy();
    const slugs = tpl.primary_steps.map((step) => step.biofertilizer_slug).filter(Boolean);
    expect(slugs).not.toContain('cal_dolomita');
    expect(tpl.notes.join(' ')).toMatch(/no encales/i);
  });
});
