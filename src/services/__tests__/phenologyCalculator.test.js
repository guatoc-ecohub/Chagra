import { describe, it, expect } from 'vitest';
import { calculateWindows, formatWindow } from '../phenologyCalculator';

const SOWING = 1700000000000; // fixed timestamp

describe('calculateWindows', () => {
  it('retorna template_missing si speciesSlug no existe', () => {
    const r = calculateWindows({ speciesSlug: 'nonexistent', sowingDate: SOWING });
    expect(r).toHaveLength(1);
    expect(r[0].status).toBe('template_missing');
    expect(r[0].confidence).toBe(0);
  });

  it('retorna insufficient_data si falta sowingDate', () => {
    const r = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: 0 });
    expect(r[0].status).toBe('insufficient_data');
  });

  it('calcula ventanas para tomate y sowing tiene confianza 1.0', () => {
    const r = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING });
    const sowing = r.find((s) => s.code === 'sowing');
    expect(sowing).toBeDefined();
    expect(sowing.confidence).toBe(1.0);
    expect(sowing.windowStart).toBe(SOWING);
  });

  it('ventana de cosecha de tomate cae ~75-120 días post-siembra', () => {
    const r = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING });
    const harvest = r.find((s) => s.code === 'harvest_window');
    expect(harvest).toBeDefined();
    expect(harvest.status).toBe('computed');
    // 75 días en ms
    const day75 = SOWING + 75 * 86400000;
    const day120 = SOWING + 120 * 86400000;
    expect(harvest.windowStart).toBe(day75);
    expect(harvest.windowEnd).toBe(day120);
  });

  it('altitud alarga los rangos', () => {
    const low = calculateWindows({ speciesSlug: 'coffea_arabica', sowingDate: SOWING, altitudeM: 500 });
    const high = calculateWindows({ speciesSlug: 'coffea_arabica', sowingDate: SOWING, altitudeM: 2600 });

    const lowHarvest = low.find((s) => s.code === 'harvest_window');
    const highHarvest = high.find((s) => s.code === 'harvest_window');

    expect(highHarvest.windowStart).toBeGreaterThan(lowHarvest.windowStart);
    expect(highHarvest.windowEnd).toBeGreaterThan(lowHarvest.windowEnd);
  });

  it('sin altitud, confianza baja a 0.55 maximo', () => {
    const r = calculateWindows({ speciesSlug: 'solanum_tuberosum', sowingDate: SOWING });
    const veg = r.find((s) => s.code === 'vegetative');
    expect(veg.confidence).toBeLessThan(0.7);
    expect(veg.confidence).toBeGreaterThanOrEqual(0.4);
  });

  it('confianza base es 0.7 con altitud', () => {
    const r = calculateWindows({ speciesSlug: 'solanum_tuberosum', sowingDate: SOWING, altitudeM: 1500 });
    const veg = r.find((s) => s.code === 'vegetative');
    expect(veg.confidence).toBe(0.7);
  });

  it('closed stage tiene windowEnd null', () => {
    const r = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING, altitudeM: 1000 });
    const closed = r.find((s) => s.code === 'closed');
    expect(closed.windowEnd).toBeNull();
  });
});

/**
 * Helper de test: determina la etapa actual y días transcurridos
 * a partir de las ventanas retornadas por calculateWindows. NO es
 * una función de producción — solo para verificar el cálculo de etapa.
 *
 * @param {ReturnType<calculateWindows>} windows
 * @param {number} today — timestamp ms actual
 * @returns {{ stageCode: string, daysElapsed: number, window: object|null }}
 */
function deriveCurrentStage(windows, today) {
  const daysElapsed = Math.floor((today - windows[0]?.windowStart) / 86400000);
  // Recorrer ventanas en orden inverso para encontrar la última que aplica
  for (let i = windows.length - 1; i >= 0; i--) {
    const w = windows[i];
    if (w.status !== 'computed' || w.windowStart === null) continue;
    const afterStart = today >= w.windowStart;
    const beforeEnd = w.windowEnd === null || today <= w.windowEnd;
    if (afterStart && beforeEnd) {
      return { stageCode: w.code, daysElapsed, window: w };
    }
  }
  // Si today es anterior a la siembra, devolver sowing
  return { stageCode: 'sowing', daysElapsed: Math.max(0, daysElapsed), window: null };
}

describe('cálculo de etapa actual (derivado de calculateWindows)', () => {
  const SOWING_DAY = 1700000000000;
  const DAY_MS = 86400000;

  it('día 0 → sowing con días transcurridos = 0', () => {
    const windows = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    const { stageCode, daysElapsed } = deriveCurrentStage(windows, SOWING_DAY);
    expect(stageCode).toBe('sowing');
    expect(daysElapsed).toBe(0);
  });

  it('día 10 en tomate → vegetative (minDays=1, maxDays=25)', () => {
    const windows = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 10 * DAY_MS;
    const { stageCode, daysElapsed } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('vegetative');
    expect(daysElapsed).toBe(10);
  });

  it('día 30 en tomate → flowering (minDays=25, maxDays=45)', () => {
    const windows = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 30 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('flowering');
  });

  it('día 60 en tomate → fruiting (minDays=45, maxDays=80)', () => {
    const windows = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 60 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('fruiting');
  });

  it('día 90 en tomate → harvest_window (minDays=75, maxDays=120)', () => {
    const windows = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 90 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('harvest_window');
  });

  it('día 150 en tomate → closed (más allá de harvest_window maxDays=120)', () => {
    const windows = calculateWindows({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 150 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('closed');
  });

  it('días transcurridos se calculan correctamente con altitud', () => {
    const windows = calculateWindows({ speciesSlug: 'coffea_arabica', sowingDate: SOWING_DAY, altitudeM: 2600 });
    const today = SOWING_DAY + 60 * DAY_MS;
    const { daysElapsed } = deriveCurrentStage(windows, today);
    expect(daysElapsed).toBe(60);
  });

  it('maíz en día 7 → emergence (minDays=4, maxDays=10)', () => {
    const windows = calculateWindows({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 7 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('emergence');
  });

  it('maíz en día 120 → harvest_window (minDays=100, maxDays=130)', () => {
    const windows = calculateWindows({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 120 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('harvest_window');
  });

  it('maíz en día 200 → closed (más allá de maxDays=130)', () => {
    const windows = calculateWindows({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 200 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('closed');
  });

  it('lechuga en día 50 → harvest_window a pesar de solapamiento con cogollo', () => {
    // lactuca: fruiting(cogollo) minDays=25 maxDays=50, harvest minDays=45 maxDays=65
    // día 50 cae en ambas ventanas; deriveCurrentStage itera al revés
    // y retorna harvest_window (la más avanzada entre las que aplican)
    const windows = calculateWindows({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING_DAY });
    const today = SOWING_DAY + 50 * DAY_MS;
    const { stageCode } = deriveCurrentStage(windows, today);
    expect(stageCode).toBe('harvest_window');
  });

  it('especie sin plantilla retorna stageCode sowing por defecto', () => {
    const windows = calculateWindows({ speciesSlug: 'no_existe', sowingDate: SOWING_DAY });
    const { stageCode } = deriveCurrentStage(windows, SOWING_DAY);
    expect(stageCode).toBe('sowing');
  });
});

describe('formatWindow', () => {
  it('formatea ventana computada', () => {
    const w = {
      code: 'flowering',
      label: 'Floración',
      windowStart: 1700000000000,
      windowEnd: 1700864000000,
      status: 'computed',
      confidence: 0.7,
      sources: [],
    };
    const s = formatWindow(w);
    expect(s).toContain('–'); // contiene rango
  });

  it('devuelve mensaje para template_missing', () => {
    expect(formatWindow({ status: 'template_missing' })).toBe('No hay plantilla para esta especie');
  });

  it('devuelve mensaje para insufficient_data', () => {
    expect(formatWindow({ status: 'insufficient_data' })).toBe('Fecha no disponible');
  });
});
