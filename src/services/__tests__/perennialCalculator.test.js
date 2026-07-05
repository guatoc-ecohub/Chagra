/**
 * perennialCalculator.test.js — cobertura complementaria del resolver de ciclo
 * HÍBRIDO de perennes (src/services/perennialCalculator.js).
 *
 * `src/data/__tests__/perennialCycles.test.js` YA cubre el contrato principal
 * (fases establishment/productive, regímenes continuous/seasonal/unknown,
 * degradación sin datos). Este archivo agrega lo que ese no cubre:
 *
 *   - Las 4 ramas de `regimeNote` (texto de `annual.note`), incluida la
 *     variante continuous CON vs SIN picos listados.
 *   - El límite exacto de la transición de fase (yearsElapsed === minYears).
 *   - `nextHarvestMonths` cuando el mes actual ES un mes de cosecha.
 *   - Entradas defensivas: `plantingDate` inválido (negativo/NaN) y
 *     `now` inválido (0) caen a los defaults documentados.
 *
 * Español colombiano (tú/usted). NUNCA voseo argentino.
 */
import { describe, it, expect } from 'vitest';
import { resolvePerennialCycle } from '../perennialCalculator';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

describe('perennialCalculator — regimeNote (annual.note)', () => {
  it('continuous CON meses listados: nota menciona los picos', () => {
    // theobroma_cacao: regime continuous, harvest_months no vacío.
    const res = resolvePerennialCycle({ speciesId: 'theobroma_cacao', now: Date.UTC(2026, 0, 1) });
    expect(res.annual.regime).toBe('continuous');
    expect(res.annual.harvestMonths.length).toBeGreaterThan(0);
    expect(res.annual.note).toBe('Produce casi todo el año, con picos en los meses resaltados.');
  });

  it('continuous SIN meses listados: nota no promete picos', () => {
    // rubus_glaucus: regime continuous, harvest_months vacío (dato no firme).
    const res = resolvePerennialCycle({ speciesId: 'rubus_glaucus', now: Date.UTC(2026, 0, 1) });
    expect(res.annual.regime).toBe('continuous');
    expect(res.annual.harvestMonths).toEqual([]);
    expect(res.annual.note).toBe('Produce casi todo el año una vez establecida.');
  });

  it('bimodal: nota menciona dos temporadas', () => {
    const res = resolvePerennialCycle({ speciesId: 'coffea_arabica', now: Date.UTC(2026, 0, 1) });
    expect(res.annual.regime).toBe('bimodal');
    expect(res.annual.note).toBe('Tiene dos temporadas de producción al año.');
  });

  it('seasonal: nota menciona una temporada marcada', () => {
    const res = resolvePerennialCycle({ speciesId: 'mangifera_indica', now: Date.UTC(2026, 0, 1) });
    expect(res.annual.regime).toBe('seasonal');
    expect(res.annual.note).toBe('Tiene una temporada de producción marcada al año.');
  });

  it('unknown: nota honesta de variabilidad regional', () => {
    const res = resolvePerennialCycle({ speciesId: 'citrus_sinensis', now: Date.UTC(2026, 0, 1) });
    expect(res.annual.regime).toBe('unknown');
    expect(res.annual.note).toBe(
      'El calendario varía por región y altitud; consulta el comportamiento en tu zona.',
    );
  });
});

describe('perennialCalculator — límite exacto de la transición de fase', () => {
  it('yearsElapsed === minYears entra en fase productive (borde inclusive)', () => {
    // persea_americana: years_to_first_harvest [2, 4]. Siembra hace EXACTO
    // 2 años respecto al `now` fijado → cae justo en el mínimo.
    const now = Date.UTC(2026, 0, 1);
    const planting = now - 2 * YEAR_MS;
    const res = resolvePerennialCycle({ speciesId: 'persea_americana', plantingDate: planting, now });
    expect(res.phase).toBe('productive');
  });

  it('un instante ANTES del mínimo sigue en fase establishment', () => {
    const now = Date.UTC(2026, 0, 1);
    // Un día antes de cumplir el mínimo de 2 años.
    const planting = now - (2 * YEAR_MS - 24 * 60 * 60 * 1000);
    const res = resolvePerennialCycle({ speciesId: 'persea_americana', plantingDate: planting, now });
    expect(res.phase).toBe('establishment');
  });
});

describe('perennialCalculator — nextHarvestMonths', () => {
  it('cuando el mes actual ES mes de cosecha, aparece primero en la lista', () => {
    // coffea_arabica cosecha [4,5,6,9,10,11,12]; abril (mes 4) es cosecha.
    const abril = Date.UTC(2026, 3, 10);
    const res = resolvePerennialCycle({ speciesId: 'coffea_arabica', now: abril });
    expect(res.annual.currentMonth).toBe(4);
    expect(res.annual.isHarvest).toBe(true);
    expect(res.annual.nextHarvestMonths[0]).toBe(4);
  });

  it('sin meses de cosecha (continuous sin dato firme) devuelve lista vacía', () => {
    const res = resolvePerennialCycle({ speciesId: 'rubus_glaucus', now: Date.UTC(2026, 0, 1) });
    expect(res.annual.nextHarvestMonths).toEqual([]);
  });
});

describe('perennialCalculator — entradas defensivas', () => {
  it('plantingDate negativo se trata como "sin siembra" (no revienta ni da NaN)', () => {
    const res = resolvePerennialCycle({ speciesId: 'theobroma_cacao', plantingDate: -100, now: Date.UTC(2026, 0, 1) });
    expect(res.phase).toBe('productive');
    expect(res.establishment.progress).toBeNull();
    expect(res.establishment.yearsElapsed).toBeNull();
  });

  it('plantingDate NaN se trata como "sin siembra"', () => {
    const res = resolvePerennialCycle({ speciesId: 'theobroma_cacao', plantingDate: NaN, now: Date.UTC(2026, 0, 1) });
    expect(res.establishment.progress).toBeNull();
  });

  it('now inválido (0) cae al Date.now() real, no revienta', () => {
    const res = resolvePerennialCycle({ speciesId: 'theobroma_cacao', now: 0 });
    expect(res.annual.currentMonth).toBe(new Date().getMonth() + 1);
  });

  it('progress nunca excede 1 aunque yearsElapsed supere maxYears por mucho', () => {
    // Siembra hace 50 años: muy por encima del rango [2,5] de theobroma_cacao.
    const now = Date.UTC(2026, 0, 1);
    const planting = now - 50 * YEAR_MS;
    const res = resolvePerennialCycle({ speciesId: 'theobroma_cacao', plantingDate: planting, now });
    expect(res.establishment.progress).toBe(1);
    expect(res.phase).toBe('productive');
  });
});
