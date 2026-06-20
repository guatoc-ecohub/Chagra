import { describe, it, expect } from 'vitest';
import { calculateLifecycleEnd, formatLifecycleEnd, getCurrentStage } from '../phenologyCalculator';

const DAY_MS = 86400000;
const SOWING = 1700000000000; // timestamp fijo

describe('calculateLifecycleEnd (muerte natural / fin de ciclo)', () => {
  it('lechuga usa el bloque lifecycle del template (siembra→cosecha + muerte natural)', () => {
    const lc = calculateLifecycleEnd({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING });
    expect(lc.source).toBe('lifecycle_block');
    // sowing_to_harvest_min/max = 60/90, natural_death = 95 días.
    expect(lc.harvestStart).toBe(SOWING + 60 * DAY_MS);
    expect(lc.harvestEnd).toBe(SOWING + 90 * DAY_MS);
    expect(lc.naturalDeath).toBe(SOWING + 95 * DAY_MS);
    expect(lc.naturalDeath).toBeGreaterThan(lc.harvestEnd);
  });

  it('especie sin bloque lifecycle deriva de las etapas (closed.windowStart como muerte)', () => {
    // tomate no tiene bloque lifecycle: cae al fallback derived_from_stages.
    const lc = calculateLifecycleEnd({ speciesSlug: 'solanum_lycopersicum', sowingDate: SOWING });
    expect(lc.source).toBe('derived_from_stages');
    expect(lc.naturalDeath).not.toBeNull();
    expect(lc.naturalDeath).toBeGreaterThan(SOWING);
  });

  it('degrada a unavailable sin plantilla', () => {
    const lc = calculateLifecycleEnd({ speciesSlug: 'no_existe', sowingDate: SOWING });
    expect(lc.source).toBe('unavailable');
    expect(lc.naturalDeath).toBeNull();
    expect(lc.confidence).toBe(0);
  });

  it('degrada a unavailable sin fecha de siembra', () => {
    const lc = calculateLifecycleEnd({ speciesSlug: 'lactuca_sativa', sowingDate: 0 });
    expect(lc.source).toBe('unavailable');
  });

  it('la altitud alarga la muerte natural esperada', () => {
    const low = calculateLifecycleEnd({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING, altitudeM: 500 });
    const high = calculateLifecycleEnd({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING, altitudeM: 2800 });
    expect(high.naturalDeath).toBeGreaterThan(low.naturalDeath);
  });
});

describe('formatLifecycleEnd', () => {
  it('produce una frase campesina con fecha cuando hay muerte natural', () => {
    const lc = calculateLifecycleEnd({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING });
    const s = formatLifecycleEnd(lc);
    expect(s).toMatch(/Se espera fin de ciclo/);
  });

  it('devuelve cadena vacía si no hay estimación', () => {
    expect(formatLifecycleEnd({ source: 'unavailable', naturalDeath: null })).toBe('');
    expect(formatLifecycleEnd(null)).toBe('');
  });
});

describe('ciclo a mitad — etapa estimada desde la fecha de siembra REAL', () => {
  it('lechuga sembrada HOY (día 0) → etapa inicial (Siembra/Trasplante)', () => {
    const r = getCurrentStage({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING, now: SOWING });
    expect(r).not.toBeNull();
    expect(r.stage.code).toBe('sowing');
    expect(r.stageIndex).toBe(0);
    expect(r.daysElapsed).toBe(0);
  });

  it('lechuga con ~1 mes (30 días) NO arranca en cero — va por una etapa avanzada', () => {
    const r = getCurrentStage({ speciesSlug: 'lactuca_sativa', sowingDate: SOWING, now: SOWING + 30 * DAY_MS });
    expect(r).not.toBeNull();
    expect(r.daysElapsed).toBe(30);
    // A 30 días NO debe estar en la etapa inicial (sowing): el ciclo va a mitad.
    expect(r.stageIndex).toBeGreaterThan(0);
    expect(r.stage.code).not.toBe('sowing');
  });
});
