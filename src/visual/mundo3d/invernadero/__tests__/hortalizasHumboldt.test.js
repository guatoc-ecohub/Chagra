/*
 * hortalizasHumboldt.test — el contrato puro de las láminas nuevas.
 * Los pintores son canvas y se certifican en el gate GPU headed; aquí se
 * prueba lo que no puede mentir: tiles dentro de [0,1], espejo con ancho
 * negativo, determinismo, y que la proporción del tile coincida con la
 * proporción mundo (una lámina estirada miente sobre el porte de la mata).
 */
import { describe, it, expect } from 'vitest';
import { tileDeVarianteEn, variantesDeItemsEn, variantesDe } from '../laminaMasa.js';
import {
  LAMINA_PIMENTON,
  LAMINA_LECHUGA,
  LAYOUT_PIMENTON,
  LAYOUT_LECHUGA,
} from '../hortalizasHumboldt.js';
import { LAMINA_TOMATE } from '../tomateHumboldt.js';

const LAMINAS = [LAMINA_TOMATE, LAMINA_PIMENTON, LAMINA_LECHUGA];

describe('tileDeVarianteEn (los tres layouts)', () => {
  it('mantiene todo tile dentro del atlas [0,1] con su gutter', () => {
    for (const { layout } of LAMINAS) {
      for (let v = 0; v < variantesDe(layout); v++) {
        const [u0, v0, w, h] = tileDeVarianteEn(layout, v);
        for (const c of [u0, v0, u0 + w, v0 + h]) {
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThanOrEqual(1);
        }
        expect(h).toBeGreaterThan(0);
      }
    }
  });

  it('las variantes espejo llevan ancho negativo y cubren el mismo rectángulo', () => {
    for (const { layout } of LAMINAS) {
      const directas = layout.cols * layout.filas;
      for (let v = 0; v < directas; v++) {
        const d = tileDeVarianteEn(layout, v);
        const e = tileDeVarianteEn(layout, v + directas);
        expect(d[2]).toBeGreaterThan(0);
        expect(e[2]).toBeLessThan(0);
        expect(e[0]).toBeCloseTo(d[0] + d[2], 10);
        expect(e[0] + e[2]).toBeCloseTo(d[0], 10);
      }
    }
  });
});

describe('variantesDeItemsEn', () => {
  it('es determinista por layout y semilla', () => {
    for (const { layout, semillaVariantes } of LAMINAS) {
      const a = variantesDeItemsEn(layout, 300, semillaVariantes);
      const b = variantesDeItemsEn(layout, 300, semillaVariantes);
      expect(a.length).toBe(1200);
      expect(Array.from(a)).toEqual(Array.from(b));
    }
  });

  it('usa más de una variante en una siembra grande (el campo no se repite)', () => {
    for (const { layout, semillaVariantes } of LAMINAS) {
      const datos = variantesDeItemsEn(layout, 200, semillaVariantes);
      const offsets = new Set();
      for (let i = 0; i < 200; i++) {
        offsets.add(`${datos[i * 4]}:${datos[i * 4 + 1]}:${datos[i * 4 + 2]}`);
      }
      expect(offsets.size).toBeGreaterThan(8);
    }
  });
});

describe('proporciones de las láminas', () => {
  it('el pimentón es mata erecta (más alto que ancho) y la lechuga roseta (más ancha que alta)', () => {
    expect(LAMINA_PIMENTON.alto).toBeGreaterThan(LAMINA_PIMENTON.ancho);
    expect(LAMINA_LECHUGA.ancho).toBeGreaterThan(LAMINA_LECHUGA.alto);
  });

  it('la proporción mundo coincide con la del tile (la lámina no se estira)', () => {
    for (const { layout, ancho, alto } of LAMINAS) {
      const aspectoTile = layout.tileW / layout.tileH;
      const aspectoMundo = ancho / alto;
      expect(Math.abs(aspectoTile - aspectoMundo)).toBeLessThan(0.05);
    }
  });

  it('cada lámina declara su pintor y sus semillas', () => {
    for (const lamina of LAMINAS) {
      expect(typeof lamina.pintarTile).toBe('function');
      expect(Number.isFinite(lamina.semillaAtlas)).toBe(true);
      expect(Number.isFinite(lamina.semillaVariantes)).toBe(true);
      expect(lamina.planos).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('los layouts nuevos', () => {
  it('pimentón erecto 512×640 y lechuga apaisada 512×384, ambos 4×2', () => {
    expect(LAYOUT_PIMENTON).toMatchObject({ cols: 4, filas: 2, tileW: 512, tileH: 640 });
    expect(LAYOUT_LECHUGA).toMatchObject({ cols: 4, filas: 2, tileW: 512, tileH: 384 });
  });
});
