/*
 * tomateHumboldt.test — la matemática del atlas de la lámina (lo puro).
 * El pintor en sí es canvas y se certifica en el gate GPU headed; aquí se
 * prueba el contrato que no puede mentir: tiles dentro de [0,1], espejo con
 * ancho negativo, gutter anti-sangrado y determinismo de las variantes.
 */
import { describe, it, expect } from 'vitest';
import {
  tileDeVariante,
  variantesDeItems,
  VARIANTES,
  ATLAS_COLS,
  ATLAS_FILAS,
  LAMINA_ALTO,
  LAMINA_ANCHO,
} from '../tomateHumboldt.js';

describe('tileDeVariante', () => {
  it('mantiene todo tile dentro del atlas [0,1] con su gutter', () => {
    for (let v = 0; v < VARIANTES; v++) {
      const [u0, v0, w, h] = tileDeVariante(v);
      const u1 = u0 + w;
      const v1 = v0 + h;
      for (const c of [u0, v0, u1, v1]) {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
      expect(h).toBeGreaterThan(0);
    }
  });

  it('las variantes espejo llevan ancho negativo y las directas positivo', () => {
    const directas = ATLAS_COLS * ATLAS_FILAS;
    for (let v = 0; v < VARIANTES; v++) {
      const [, , w] = tileDeVariante(v);
      if (v < directas) expect(w).toBeGreaterThan(0);
      else expect(w).toBeLessThan(0);
    }
  });

  it('el espejo cubre el mismo rectángulo que su variante directa', () => {
    const directas = ATLAS_COLS * ATLAS_FILAS;
    for (let v = 0; v < directas; v++) {
      const d = tileDeVariante(v);
      const e = tileDeVariante(v + directas);
      // mismo rango de u: [u0, u0+w] directo == [u0+w, u0] espejo
      expect(e[0]).toBeCloseTo(d[0] + d[2], 10);
      expect(e[0] + e[2]).toBeCloseTo(d[0], 10);
      expect(e[1]).toBeCloseTo(d[1], 10);
      expect(e[3]).toBeCloseTo(d[3], 10);
    }
  });
});

describe('variantesDeItems', () => {
  it('es determinista y entrega 4 floats por instancia', () => {
    const a = variantesDeItems(500);
    const b = variantesDeItems(500);
    expect(a.length).toBe(2000);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('usa más de una variante en una siembra grande (el campo no se repite)', () => {
    const datos = variantesDeItems(200);
    const offsets = new Set();
    for (let i = 0; i < 200; i++) {
      offsets.add(`${datos[i * 4]}:${datos[i * 4 + 1]}:${datos[i * 4 + 2]}`);
    }
    expect(offsets.size).toBeGreaterThan(8);
  });
});

describe('proporciones de la lámina', () => {
  it('la tomatera tutorada es claramente más alta que ancha', () => {
    expect(LAMINA_ALTO / LAMINA_ANCHO).toBeGreaterThan(1.5);
  });
});
