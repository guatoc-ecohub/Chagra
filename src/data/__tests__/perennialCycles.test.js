/**
 * Tests del modelo HÍBRIDO de ciclo de perennes:
 *   (1) cada entrada de datos es estructuralmente válida y honesta, y
 *   (2) el resolver (perennialCalculator) devuelve fases coherentes para una
 *       fecha de siembra dada y degrada limpio sin datos.
 *
 * También verifica contra el catálogo REAL que todos los ids de perennes con
 * ciclo grounded existan en el catálogo (no apuntan a un id inventado).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  PERENNIAL_CYCLES,
  PERENNIAL_REGIMES,
  getPerennialCycle,
  isPerennialSpecies,
  getPerennialSpeciesIds,
  monthShortName,
} from '../perennialCycles';
import { resolvePerennialCycle } from '../../services/perennialCalculator';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const catalog = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'catalog/chagra-catalog-oss-subset-v3.2.json'), 'utf8'),
);
const catalogIds = new Set((catalog.species || []).filter((s) => s && s.id).map((s) => s.id));

const entries = Object.entries(PERENNIAL_CYCLES);
const validMonth = (m) => Number.isInteger(m) && m >= 1 && m <= 12;

describe('perennialCycles — datos', () => {
  it('tiene varias especies perennes con ciclo grounded', () => {
    expect(entries.length).toBeGreaterThanOrEqual(15);
  });

  it.each(entries)('%s: estructura y meses válidos', (id, c) => {
    // years_to_first_harvest coherente
    expect(Array.isArray(c.years_to_first_harvest)).toBe(true);
    expect(c.years_to_first_harvest).toHaveLength(2);
    const [minY, maxY] = c.years_to_first_harvest;
    expect(Number.isFinite(minY)).toBe(true);
    expect(Number.isFinite(maxY)).toBe(true);
    expect(minY).toBeGreaterThan(0);
    expect(minY).toBeLessThanOrEqual(maxY);

    // vida productiva: número positivo o null
    expect(c.productive_life_years === null || c.productive_life_years > 0).toBe(true);

    // régimen permitido
    expect(PERENNIAL_REGIMES).toContain(c.regime);

    // meses válidos 1-12
    expect(Array.isArray(c.flowering_months)).toBe(true);
    expect(Array.isArray(c.harvest_months)).toBe(true);
    expect(c.flowering_months.every(validMonth)).toBe(true);
    expect(c.harvest_months.every(validMonth)).toBe(true);

    // fuente y nota presentes y no vacías
    expect(typeof c.source).toBe('string');
    expect(c.source.trim().length).toBeGreaterThan(0);
    expect(typeof c.region_note).toBe('string');
    expect(c.region_note.trim().length).toBeGreaterThan(0);
    expect(['alta', 'media', 'baja']).toContain(c.confidence);
  });

  it('régimen unknown no lista meses (honestidad)', () => {
    for (const [id, c] of entries) {
      if (c.regime === 'unknown') {
        expect(c.flowering_months, `${id}: unknown sin floración`).toHaveLength(0);
        expect(c.harvest_months, `${id}: unknown sin cosecha`).toHaveLength(0);
      }
    }
  });

  it('régimen bimodal/seasonal sí lista meses de cosecha', () => {
    for (const [id, c] of entries) {
      if (c.regime === 'bimodal' || c.regime === 'seasonal') {
        expect(c.harvest_months.length, `${id}: ${c.regime} con meses`).toBeGreaterThan(0);
      }
    }
  });

  it('todos los ids de perennes existen en el catálogo real', () => {
    const missing = getPerennialSpeciesIds().filter((id) => !catalogIds.has(id));
    expect(missing).toEqual([]);
  });

  it('helpers básicos', () => {
    expect(isPerennialSpecies('persea_americana')).toBe(true);
    expect(isPerennialSpecies('no_existe')).toBe(false);
    expect(getPerennialCycle('coffea_arabica')).toBeTruthy();
    expect(getPerennialCycle('no_existe')).toBeNull();
    expect(monthShortName(1)).toBe('ene');
    expect(monthShortName(12)).toBe('dic');
    expect(monthShortName(0)).toBe('');
    expect(monthShortName(13)).toBe('');
  });
});

describe('perennialCalculator — resolver', () => {
  const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

  it('sin datos perennes → null (degrada al ciclo anual)', () => {
    expect(resolvePerennialCycle({ speciesId: 'no_existe', plantingDate: Date.now() })).toBeNull();
    expect(resolvePerennialCycle(/** @type {any} */ ({}))).toBeNull();
  });

  it('fase establishment cuando aún no llega al mínimo de años', () => {
    const planting = Date.now() - 0.2 * YEAR_MS; // ~2.4 meses
    const res = resolvePerennialCycle({ speciesId: 'persea_americana', plantingDate: planting });
    expect(res).toBeTruthy();
    expect(res.phase).toBe('establishment');
    expect(res.establishment.progress).toBeGreaterThanOrEqual(0);
    expect(res.establishment.progress).toBeLessThan(1);
    expect(res.establishment.yearsElapsed).toBeGreaterThan(0);
    expect(res.establishment.firstHarvestYear).toBeGreaterThan(new Date(planting).getFullYear());
  });

  it('fase productive cuando supera el mínimo de años', () => {
    const planting = Date.now() - 6 * YEAR_MS;
    const res = resolvePerennialCycle({ speciesId: 'persea_americana', plantingDate: planting });
    expect(res.phase).toBe('productive');
    expect(res.establishment.progress).toBe(1);
  });

  it('sin fecha de siembra → productive con establecimiento sin progreso', () => {
    const res = resolvePerennialCycle({ speciesId: 'theobroma_cacao' });
    expect(res.phase).toBe('productive');
    expect(res.establishment.progress).toBeNull();
    expect(res.establishment.yearsElapsed).toBeNull();
    expect(res.establishment.firstHarvestYear).toBeNull();
    expect(res.establishment.yearsToFirstHarvest).toEqual([2, 5]);
  });

  it('régimen continuo marca cosecha en cualquier mes', () => {
    // febrero
    const now = Date.UTC(2026, 1, 10);
    const res = resolvePerennialCycle({ speciesId: 'physalis_peruviana', now });
    expect(res.annual.regime).toBe('continuous');
    expect(res.annual.isHarvest).toBe(true);
  });

  it('régimen seasonal: cosecha solo en los meses listados', () => {
    const cosecha = Date.UTC(2026, 10, 10); // noviembre (mango cosecha 11,12)
    const fuera = Date.UTC(2026, 2, 10); // marzo
    const inMonth = resolvePerennialCycle({ speciesId: 'mangifera_indica', now: cosecha });
    const outMonth = resolvePerennialCycle({ speciesId: 'mangifera_indica', now: fuera });
    expect(inMonth.annual.isHarvest).toBe(true);
    expect(outMonth.annual.isHarvest).toBe(false);
  });

  it('floración refleja flowering_months del régimen seasonal', () => {
    const sep = Date.UTC(2026, 8, 10); // septiembre (mango flor 8,9,10)
    const res = resolvePerennialCycle({ speciesId: 'mangifera_indica', now: sep });
    expect(res.annual.isFlowering).toBe(true);
  });

  it('nextHarvestMonths ordena de forma circular desde el mes actual', () => {
    const may = Date.UTC(2026, 4, 15); // mediados de mayo (seguro en cualquier huso)
    const res = resolvePerennialCycle({ speciesId: 'coffea_arabica', now: may });
    // café cosecha [4,5,6,9,10,11,12] → desde mayo: 5,6,9,10,11,12,4
    expect(res.annual.nextHarvestMonths[0]).toBe(5);
    expect(res.annual.nextHarvestMonths[res.annual.nextHarvestMonths.length - 1]).toBe(4);
  });

  it('régimen unknown: no marca floración ni cosecha y nota honesta', () => {
    const res = resolvePerennialCycle({ speciesId: 'citrus_sinensis', now: Date.UTC(2026, 5, 1) });
    expect(res.annual.regime).toBe('unknown');
    expect(res.annual.isFlowering).toBe(false);
    expect(res.annual.isHarvest).toBe(false);
    expect(res.annual.note.toLowerCase()).toContain('varía');
  });

  it('expone fuente y confianza de la especie', () => {
    const res = resolvePerennialCycle({ speciesId: 'acca_sellowiana' });
    expect(res.source.length).toBeGreaterThan(0);
    expect(['alta', 'media', 'baja']).toContain(res.confidence);
  });
});
