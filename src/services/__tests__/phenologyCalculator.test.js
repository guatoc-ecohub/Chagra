import { describe, it, expect } from 'vitest';
import { calculateWindows, formatWindow, getCurrentStage, deriveCurrentStage, resolveTemplate } from '../phenologyCalculator';

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

describe('getCurrentStage', () => {
  const SOWING_DAY = 1700000000000;
  const DAY_MS = 86400000;

  it('retorna null si la especie no tiene plantilla', () => {
    const r = getCurrentStage({ speciesSlug: 'no_existe', sowingDate: SOWING_DAY });
    expect(r).toBeNull();
  });

  it('retorna null si sowingDate es 0', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: 0 });
    expect(r).toBeNull();
  });

  it('día 0 → sowing con stageIndex 0 y daysElapsed = 0', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY });
    expect(r).not.toBeNull();
    expect(r.stage.code).toBe('sowing');
    expect(r.stageIndex).toBe(0);
    expect(r.daysElapsed).toBe(0);
  });

  it('día 10 en tomate → vegetative (stageIndex 1)', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 10 * DAY_MS });
    expect(r.stage.code).toBe('vegetative');
    expect(r.stageIndex).toBe(1);
    expect(r.daysElapsed).toBe(10);
  });

  it('día 30 en tomate → flowering', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 30 * DAY_MS });
    expect(r.stage.code).toBe('flowering');
  });

  it('día 60 en tomate → fruiting', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 60 * DAY_MS });
    expect(r.stage.code).toBe('fruiting');
  });

  it('día 90 en tomate → harvest_window', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 90 * DAY_MS });
    expect(r.stage.code).toBe('harvest_window');
  });

  it('día 150 en tomate → closed (más allá de maxDays=120)', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 150 * DAY_MS });
    expect(r.stage.code).toBe('closed');
    expect(r.stageIndex).toBe(5);
  });

  it('daysElapsed se calcula correctamente con altitud', () => {
    const r = getCurrentStage({ speciesSlug: 'coffea_arabica', sowingDate: SOWING_DAY, altitudeM: 2600, now: SOWING_DAY + 60 * DAY_MS });
    expect(r.daysElapsed).toBe(60);
  });

  it('maíz en día 7 → emergence', () => {
    const r = getCurrentStage({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY, now: SOWING_DAY + 7 * DAY_MS });
    expect(r.stage.code).toBe('emergence');
  });

  it('maíz en día 120 → harvest_window', () => {
    const r = getCurrentStage({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY, now: SOWING_DAY + 120 * DAY_MS });
    expect(r.stage.code).toBe('harvest_window');
  });

  it('maíz en día 200 → closed (más allá de maxDays=130)', () => {
    const r = getCurrentStage({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY, now: SOWING_DAY + 200 * DAY_MS });
    expect(r.stage.code).toBe('closed');
  });

  it('lechuga en día 50 → harvest_window (solapamiento, retorna la más avanzada)', () => {
    const r = getCurrentStage({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING_DAY, now: SOWING_DAY + 50 * DAY_MS });
    expect(r.stage.code).toBe('harvest_window');
  });

  it('now por defecto usa Date.now() (no lanza)', () => {
    const r = getCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY });
    expect(r).not.toBeNull();
    expect(typeof r.stage.code).toBe('string');
    expect(typeof r.daysElapsed).toBe('number');
  });

  it('now anterior a la siembra retorna sowing con daysElapsed 0', () => {
    const r = getCurrentStage({ speciesSlug: 'zea_mays', sowingDate: SOWING_DAY, now: SOWING_DAY - 10 * DAY_MS });
    expect(r.stage.code).toBe('sowing');
    expect(r.stageIndex).toBe(0);
    expect(r.daysElapsed).toBe(0);
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
    const s = formatWindow(/** @type {any} */ (w));
    expect(s).toContain('–'); // contiene rango
  });

  it('devuelve mensaje para template_missing', () => {
    expect(formatWindow(/** @type {any} */ ({ status: 'template_missing' }))).toBe('No hay plantilla para esta especie');
  });

  it('devuelve mensaje para insufficient_data', () => {
    expect(formatWindow(/** @type {any} */ ({ status: 'insufficient_data' }))).toBe('Fecha no disponible');
  });
});

// BUG B (ciclos congelados en sowing_confirmed): la etapa debe DERIVARSE de la
// fecha de siembra + fenología, no quedarse fija. deriveCurrentStage es la
// fuente de verdad para current_stage de ciclos sin confirmación manual.
describe('deriveCurrentStage — etapa por fecha (anti-congelamiento)', () => {
  const SOWING_DAY = 1700000000000;
  const DAY_MS = 86400000;

  it('día 0 (recién sembrado) → sowing_confirmed (no se queda en código sowing)', () => {
    const s = deriveCurrentStage({ speciesSlug: 'fragaria_ananassa', sowingDate: SOWING_DAY, now: SOWING_DAY });
    expect(s).toBe('sowing_confirmed');
  });

  it('fresa a los 20 días → vegetative (la etapa AVANZA sola)', () => {
    const s = deriveCurrentStage({ speciesSlug: 'fragaria_ananassa', sowingDate: SOWING_DAY, now: SOWING_DAY + 20 * DAY_MS });
    expect(s).toBe('vegetative');
  });

  it('tomate a los 30 días → flowering', () => {
    const s = deriveCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 30 * DAY_MS });
    expect(s).toBe('flowering');
  });

  it('tomate a los 90 días → harvest_window', () => {
    const s = deriveCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING_DAY, now: SOWING_DAY + 90 * DAY_MS });
    expect(s).toBe('harvest_window');
  });

  it('especie sin plantilla → fallback (sowing_confirmed por defecto)', () => {
    const s = deriveCurrentStage({ speciesSlug: 'no_existe', sowingDate: SOWING_DAY, now: SOWING_DAY + 30 * DAY_MS });
    expect(s).toBe('sowing_confirmed');
  });

  it('sin fecha de siembra → fallback configurable', () => {
    const s = deriveCurrentStage({ speciesSlug: 'solanum_lycopersicum', sowingDate: 0, fallback: 'germination' });
    expect(s).toBe('germination');
  });

  it('respeta fallback custom cuando no hay plantilla', () => {
    const s = deriveCurrentStage({ speciesSlug: 'no_existe', sowingDate: SOWING_DAY, fallback: 'vegetative' });
    expect(s).toBe('vegetative');
  });

  it('nunca lanza ante entrada basura', () => {
    expect(() => deriveCurrentStage(/** @type {any} */ ({}))).not.toThrow();
    expect(deriveCurrentStage(/** @type {any} */ ({}))).toBe('sowing_confirmed');
  });
});

// Cascada de resolución de plantilla: orden de preferencia explícita >
// específica > genérica > null. Cubre los 4 niveles del invariante.
describe('resolveTemplate — cascada de preferencia', () => {
  it('retorna plantilla especifica por slug cuando existe', () => {
    const t = resolveTemplate({ speciesSlug: 'solanum_lycopersicum' });
    expect(t).toBeTruthy();
    expect(t.species_slug).toBe('solanum_lycopersicum');
    expect(t.is_generic).toBeFalsy();
  });

  it('retorna null para especie sin plantilla y sin categoria', () => {
    expect(resolveTemplate({ speciesSlug: 'no_existe' })).toBeNull();
  });

  it('retorna null con input vacio', () => {
    expect(resolveTemplate(/** @type {any} */ ({}))).toBeNull();
  });

  it('retorna null con undefined', () => {
    expect(resolveTemplate()).toBeNull();
  });

  it('la plantilla explicita gana sobre la especifica y la generica', () => {
    const explicit = {
      template_id: 'expl.test',
      species_slug: 'test_explicita',
      version: 1,
      sources: [{ name: 'Fuente explicita' }],
      stages: [
        { code: 'sowing', label: 'Siembra', minDays: 0, maxDays: 0, sourceIndex: 0 },
        { code: 'closed', label: 'Cerrado', minDays: 99, maxDays: null, sourceIndex: 0 },
      ],
    };
    const t = resolveTemplate({ speciesSlug: 'solanum_lycopersicum', template: explicit, category: 'hortalizas_fruto_flor' });
    expect(t.template_id).toBe('expl.test');
    expect(t.stages).toHaveLength(2);
    expect(t.stages[1].minDays).toBe(99);
    expect(t.is_generic).toBeFalsy();
  });

  it('la plantilla especifica gana sobre la generica cuando ambas existen', () => {
    const t = resolveTemplate({ speciesSlug: 'zea_mays', category: 'cereales' });
    expect(t).toBeTruthy();
    expect(t.species_slug).toBe('zea_mays');
    expect(t.is_generic).toBeFalsy();
  });

  it('cae al generico cuando no hay plantilla especifica pero categoria es estimable', () => {
    const t = resolveTemplate({ speciesSlug: 'desconocida_anual', category: 'hortalizas_hoja' });
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
  });

  it('retorna null cuando no hay plantilla especifica y categoria no es estimable', () => {
    expect(resolveTemplate({ speciesSlug: 'desconocida_perenne', category: 'frutales_perennes' })).toBeNull();
  });

  it('cultivar con especie madre con plantilla resuelve a la especifica, no al generico', () => {
    const t = resolveTemplate({ speciesSlug: 'solanum_lycopersicum_san_marzano', category: 'hortalizas_fruto_flor' });
    expect(t).toBeTruthy();
    expect(t.derived_from).toBe('solanum_lycopersicum');
    expect(t.is_generic).toBeFalsy();
  });

  it('cultivar sin especie madre con categoria estimable cae al generico', () => {
    const t = resolveTemplate({ speciesSlug: 'capsicum_annuum_cayenne', category: 'hortalizas_fruto_flor' });
    expect(t).toBeTruthy();
    expect(t.is_generic).toBe(true);
    expect(t.template_id).toBe('generic.hortalizas_fruto_flor');
  });

  it('cultivar sin especie madre y con categoria no estimable devuelve null', () => {
    const t = resolveTemplate({ speciesSlug: 'citrus_sinensis_valencia', category: 'frutales_perennes' });
    expect(t).toBeNull();
  });

  it('la plantilla explicita con template_id propio no hereda is_generic del generico', () => {
    const explicit = {
      template_id: 'manual.override',
      species_slug: 'manual_override',
      version: 1,
      sources: [{ name: 'Override manual' }],
      stages: [
        { code: 'sowing', label: 'Siembra', minDays: 0, maxDays: 0, sourceIndex: 0 },
        { code: 'closed', label: 'Cerrado', minDays: 50, maxDays: null, sourceIndex: 0 },
      ],
    };
    const t = resolveTemplate({ speciesSlug: 'manual_override', template: explicit, category: 'hortalizas_hoja' });
    expect(t.is_generic).toBeFalsy();
  });

  it('getCurrentStage con especie sin plantilla y sin categoria retorna null', () => {
    const r = getCurrentStage({ speciesSlug: 'no_existe', sowingDate: SOWING });
    expect(r).toBeNull();
  });

  it('getCurrentStage con especie generica retorna etapas marcadas isGeneric', () => {
    const r = getCurrentStage(/** @type {any} */ ({ speciesSlug: 'allium_fistulosum', sowingDate: SOWING, now: SOWING + 20 * 86400000, category: 'hortalizas_hoja' }));
    expect(r).not.toBeNull();
    expect(/** @type {any} */ (r.stage).isGeneric).toBe(true);
    expect(r.stage.confidence).toBeLessThanOrEqual(0.3);
  });
});
