import { describe, it, expect, vi } from 'vitest';
import {
  attachClimateToCycle,
  recalculateWithClimate,
  getEnsemblePreventiveTasks,
  getPestRisksByStage,
  getBiopreparadosForStage,
} from '../climateCycleService';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'evt-' + e.event_type })),
}));

describe('attachClimateToCycle', () => {
  it('rechaza sin processId', async () => {
    await expect(attachClimateToCycle(/** @type {any} */ ({}))).rejects.toThrow(/process_id/);
  });
});

describe('recalculateWithClimate', () => {
  it('retorna ventanas incluso sin clima (usa defaults)', () => {
    const r = recalculateWithClimate(/** @type {any} */ ({ speciesSlug: 'solanum_lycopersicum', sowingDate: 1700000000000 }));
    expect(r.length).toBeGreaterThan(0);
    expect(r[0].status).toBe('computed');
  });

  it('temperatura alta acorta ventanas (menor altitud efectiva)', () => {
    const normal = recalculateWithClimate(/** @type {any} */ ({ speciesSlug: 'solanum_lycopersicum', sowingDate: 1700000000000, altitudeM: 1000 }));
    const hot = recalculateWithClimate(/** @type {any} */ ({ speciesSlug: 'solanum_lycopersicum', sowingDate: 1700000000000, altitudeM: 1000, avgTempC: 30 }));
    // Altitud corregida menor → ventanas más tempranas
    expect(hot[4].windowStart).toBeLessThanOrEqual(normal[4].windowStart);
  });
});

describe('getEnsemblePreventiveTasks', () => {
  it('retorna tareas para El Niño en vegetative', () => {
    const tasks = getEnsemblePreventiveTasks('El Niño', 'vegetative');
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some((t) => t.task.includes('riego'))).toBe(true);
  });

  it('retorna array vacio sin fase', () => {
    expect(getEnsemblePreventiveTasks(null, 'vegetative')).toEqual([]);
  });

  it('retorna tareas para La Niña', () => {
    const tasks = getEnsemblePreventiveTasks('La Niña', 'harvest_window');
    expect(tasks.some((t) => t.task.includes('cosecha'))).toBe(true);
  });
});

describe('getPestRisksByStage', () => {
  it('retorna riesgos para etapa vegetativa', () => {
    const pests = getPestRisksByStage('vegetative');
    expect(pests.length).toBeGreaterThan(0);
    expect(pests.some((p) => p.pest.includes('Áfidos'))).toBe(true);
  });

  it('incluye broca para café en floración', () => {
    const pests = getPestRisksByStage('flowering', 'coffea_arabica');
    expect(pests.some((p) => p.pest.includes('Broca'))).toBe(true);
  });

  it('incluye gota para papa en vegetativo', () => {
    const pests = getPestRisksByStage('vegetative', 'solanum_tuberosum');
    expect(pests.some((p) => p.pest.includes('Gota'))).toBe(true);
  });
});

describe('getBiopreparadosForStage', () => {
  it('retorna biopreparados para vegetative', () => {
    const bios = getBiopreparadosForStage('vegetative');
    expect(bios.some((b) => b.nombre.includes('Caldo bordelés'))).toBe(true);
  });

  it('retorna array vacio para etapa sin datos', () => {
    expect(getBiopreparadosForStage('unknown')).toEqual([]);
  });
});
