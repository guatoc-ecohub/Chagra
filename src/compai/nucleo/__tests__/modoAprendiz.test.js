/**
 * modoAprendiz — a veces el compAI pregunta en vez de responder (#110).
 *
 * Contratos que cuidamos:
 *   - probabilidad baja: con rand >= probabilidad, nunca pregunta.
 *   - contextos aptos: mis_matas/mis_animales necesitan inventario real; sin
 *     dato, nunca inventa una pregunta sobre una finca vacía.
 *   - mundos no aptos (clima, vender, aprender, finca) nunca preguntan.
 *   - determinista con rand inyectado.
 */
import { describe, it, expect } from 'vitest';
import { preguntaDeAprendiz, PROBABILIDAD_PREGUNTA } from '../modoAprendiz';

describe('preguntaDeAprendiz', () => {
  it('con rand alto (por encima de la probabilidad), nunca pregunta', () => {
    const p = preguntaDeAprendiz({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Café', count: 3 }] },
      rand: () => 0.99,
    });
    expect(p).toBeNull();
  });

  it('con rand bajo (dentro de la probabilidad) y dato real, pregunta', () => {
    const p = preguntaDeAprendiz({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [{ name: 'Café', count: 3 }] },
      rand: () => 0.01,
    });
    expect(typeof p).toBe('string');
    expect(p.length).toBeGreaterThan(0);
    expect(p).toMatch(/\?/); // es una pregunta
  });

  it('sin inventario real en mis_matas, nunca pregunta aunque el azar caiga bajo', () => {
    const p = preguntaDeAprendiz({
      mundo: 'mis_matas',
      datosMundo: { cultivos: [] },
      rand: () => 0.001,
    });
    expect(p).toBeNull();
  });

  it('mis_animales sin animales registrados, nunca pregunta', () => {
    const p = preguntaDeAprendiz({
      mundo: 'mis_animales',
      datosMundo: { especies: [], total: 0 },
      rand: () => 0.001,
    });
    expect(p).toBeNull();
  });

  it('mis_animales con animales reales, sí puede preguntar', () => {
    const p = preguntaDeAprendiz({
      mundo: 'mis_animales',
      datosMundo: { especies: [{ name: 'Gallina', count: 5 }] },
      rand: () => 0.001,
    });
    expect(typeof p).toBe('string');
  });

  it('mundos no aptos (clima, vender, aprender, finca) nunca preguntan', () => {
    for (const mundo of ['clima', 'vender', 'aprender', 'finca']) {
      const p = preguntaDeAprendiz({ mundo, datosMundo: {}, rand: () => 0.001 });
      expect(p).toBeNull();
    }
  });

  it('mundo desconocido o vacío → null', () => {
    expect(preguntaDeAprendiz({ mundo: null, rand: () => 0.001 })).toBeNull();
    expect(preguntaDeAprendiz({ mundo: 'inventado', rand: () => 0.001 })).toBeNull();
  });

  it('bosque y páramo son verdades generales: aptos sin inventario del usuario', () => {
    expect(typeof preguntaDeAprendiz({ mundo: 'bosque', rand: () => 0.001 })).toBe('string');
    expect(typeof preguntaDeAprendiz({ mundo: 'paramo', rand: () => 0.001 })).toBe('string');
  });

  it('la probabilidad por defecto es baja (<= 0.15) — la regla sigue siendo el tip', () => {
    expect(PROBABILIDAD_PREGUNTA).toBeLessThanOrEqual(0.15);
  });

  it('determinista: mismo rand fijo siempre da la misma pregunta', () => {
    const rand = () => 0.05;
    const p1 = preguntaDeAprendiz({ mundo: 'mis_matas', datosMundo: { cultivos: [{ name: 'Papa', count: 1 }] }, rand });
    const p2 = preguntaDeAprendiz({ mundo: 'mis_matas', datosMundo: { cultivos: [{ name: 'Papa', count: 1 }] }, rand });
    expect(p1).toBe(p2);
  });
});
