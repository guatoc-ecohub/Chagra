/**
 * gestos — el repertorio ocioso del compAI.
 *
 * Contratos que cuidamos:
 *   - elegirSinRepetir NUNCA devuelve el candidato previo (salvo que sea el
 *     único posible, donde repetir es la única salida honesta).
 *   - respeta los pesos: con azar inyectado y determinista, cae en el
 *     candidato esperado.
 *   - acepta array de nombres (peso 1 parejo) y tabla nombre→{peso}.
 *   - MOMENTOS_IDLE incluye 'guino' (picarse el ojo, SPEC 2026-07-26).
 *   - elegirMomentoIdle nunca devuelve un momento de peso 0 (flota/posada/
 *     despega son de secuencia, no de azar).
 *   - duracionDeMomento: valor fijo cuando `dur` es número, dentro de rango
 *     cuando es [min,max].
 */
import { describe, it, expect } from 'vitest';
import { MOMENTOS_IDLE, elegirSinRepetir, elegirMomentoIdle, duracionDeMomento } from '../gestos';

describe('elegirSinRepetir', () => {
  it('nunca devuelve el previo (muchas iteraciones, azar real)', () => {
    const candidatos = ['a', 'b', 'c', 'd'];
    let previo = null;
    for (let i = 0; i < 500; i += 1) {
      const elegido = elegirSinRepetir(candidatos, previo);
      expect(elegido).not.toBe(previo);
      previo = elegido;
    }
  });

  it('con un solo candidato repite (es el único caso posible) y no lanza', () => {
    expect(() => elegirSinRepetir(['a'], 'a')).not.toThrow();
    for (let i = 0; i < 20; i += 1) {
      expect(elegirSinRepetir(['a'], 'a')).toBe('a');
    }
  });

  it('con lista vacía devuelve null', () => {
    expect(elegirSinRepetir([], null)).toBeNull();
    expect(elegirSinRepetir([])).toBeNull();
    expect(elegirSinRepetir({}, null)).toBeNull();
  });

  it('respeta los pesos con rand inyectado determinista (tabla nombre→{peso})', () => {
    const tabla = { a: { peso: 1 }, b: { peso: 3 } }; // total = 4
    // bola = rand*total. bola=0 → cae en 'a' (primero en agotar el peso).
    expect(elegirSinRepetir(tabla, null, () => 0)).toBe('a');
    // bola=0.5*4=2 → 'a' consume 1 (queda 1), 'b' consume 3 (bola llega a -2) → 'b'.
    expect(elegirSinRepetir(tabla, null, () => 0.5)).toBe('b');
    // bola casi 4 → agota 'a' y casi todo 'b' → sigue cayendo en 'b'.
    expect(elegirSinRepetir(tabla, null, () => 0.99)).toBe('b');
  });

  it('acepta tanto array de nombres (peso 1 parejo) como tabla nombre→{peso}', () => {
    const arr = ['x', 'y', 'z']; // total = 3
    expect(elegirSinRepetir(arr, null, () => 0.99)).toBe('z'); // bola=2.97 → agota x,y → z
    const tabla = { x: { peso: 1 }, y: { peso: 1 }, z: { peso: 1 } };
    expect(elegirSinRepetir(tabla, null, () => 0.99)).toBe('z');
  });

  it('excluye correctamente al previo antes de aplicar los pesos', () => {
    const tabla = { a: { peso: 1 }, b: { peso: 1 } };
    // con 'a' excluido, sólo queda 'b' — cualquier rand cae en 'b'.
    expect(elegirSinRepetir(tabla, 'a', () => 0)).toBe('b');
    expect(elegirSinRepetir(tabla, 'a', () => 0.99)).toBe('b');
  });
});

describe('MOMENTOS_IDLE', () => {
  it('incluye guino', () => {
    expect(Object.keys(MOMENTOS_IDLE)).toContain('guino');
    expect(MOMENTOS_IDLE.guino.peso).toBeGreaterThan(0);
  });
});

describe('elegirMomentoIdle', () => {
  it('nunca devuelve un momento de peso 0 (flota, posada, despega)', () => {
    const pesoCero = ['flota', 'posada', 'despega'];
    let previo = null;
    for (let i = 0; i < 500; i += 1) {
      const m = elegirMomentoIdle(previo);
      expect(pesoCero).not.toContain(m);
      previo = m;
    }
  });
});

describe('duracionDeMomento', () => {
  it('devuelve un valor fijo para los momentos con número (ignora rand)', () => {
    expect(duracionDeMomento('mira', () => 0)).toBe(2600);
    expect(duracionDeMomento('mira', () => 1)).toBe(2600);
    expect(duracionDeMomento('guino')).toBe(1800);
  });

  it('devuelve un valor dentro del rango [min,max] para los momentos con rango', () => {
    const [min, max] = MOMENTOS_IDLE.flota.dur;
    expect(duracionDeMomento('flota', () => 0)).toBe(min);
    expect(duracionDeMomento('flota', () => 1)).toBe(max);
    for (let i = 0; i < 200; i += 1) {
      const d = duracionDeMomento('flota');
      expect(d).toBeGreaterThanOrEqual(min);
      expect(d).toBeLessThanOrEqual(max);
    }
  });

  it('un momento desconocido cae al default (flota)', () => {
    expect(duracionDeMomento('momento_inventado', () => 0)).toBe(MOMENTOS_IDLE.flota.dur[0]);
  });
});
