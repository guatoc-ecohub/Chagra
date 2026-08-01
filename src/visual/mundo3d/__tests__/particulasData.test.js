import { describe, test, expect } from 'vitest';

import { PARTICULAS, conteoParticulas, crearRng } from '../particulasData.js';

describe('particulasData — presupuestos del kit de partículas (puras)', () => {
  test('los cuatro tipos existen con presupuesto por tier completo', () => {
    for (const tipo of ['polen', 'luciernagas', 'polvo', 'mariposas']) {
      const cfg = PARTICULAS[tipo];
      expect(cfg, tipo).toBeDefined();
      for (const tier of ['alto', 'medio', 'bajo']) {
        expect(typeof cfg.conteo[tier], `${tipo}.${tier}`).toBe('number');
      }
      /* tier bajo NUNCA recibe más que medio, ni medio más que alto. */
      expect(cfg.conteo.bajo).toBeLessThanOrEqual(cfg.conteo.medio);
      expect(cfg.conteo.medio).toBeLessThanOrEqual(cfg.conteo.alto);
    }
  });

  test('mariposas en tier bajo no montan (coherente con criaturas:0)', () => {
    expect(conteoParticulas(PARTICULAS.mariposas, 'bajo')).toBe(0);
  });

  test('densidad escala pero queda acotada a [0, 2]', () => {
    const cfg = PARTICULAS.polen;
    const base = conteoParticulas(cfg, 'alto', 1);
    expect(conteoParticulas(cfg, 'alto', 0.5)).toBe(Math.round(base * 0.5));
    expect(conteoParticulas(cfg, 'alto', 9)).toBe(base * 2);
    expect(conteoParticulas(cfg, 'alto', -3)).toBe(0);
    expect(conteoParticulas(cfg, 'alto', NaN)).toBe(base);
  });

  test('tier desconocido cae al presupuesto medio, nunca al caro', () => {
    const cfg = PARTICULAS.polvo;
    expect(conteoParticulas(cfg, 'ultra')).toBe(cfg.conteo.medio);
    expect(conteoParticulas(null, 'alto')).toBe(0);
  });

  test('crearRng es determinista por semilla y queda en [0, 1)', () => {
    const a = crearRng(7);
    const b = crearRng(7);
    const c = crearRng(8);
    const serieA = [a(), a(), a()];
    const serieB = [b(), b(), b()];
    expect(serieA).toEqual(serieB);
    expect(serieA).not.toEqual([c(), c(), c()]);
    for (const v of serieA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
