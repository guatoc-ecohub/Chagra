/**
 * platanoBananoData — la aritmética de densidad de siembra es determinista y
 * exacta (geometría), y los datos grounded no están vacíos. Igual filosofía que
 * almacenamientoCalculator.test.js: la matemática se verifica, no se adivina.
 */
import { describe, it, expect } from 'vitest';
import {
  calcularDensidadSiembra,
  VARIEDADES,
  SIGATOKA,
  PICUDO,
  DISTANCIAS_REFERENCIA,
} from '../platanoBananoData';

describe('calcularDensidadSiembra — geometría exacta', () => {
  it('3 × 3 m da 1.111 matas por hectárea', () => {
    const r = calcularDensidadSiembra('3', '3');
    expect(r.matasPorHa).toBe(1111); // round(10000 / 9)
    expect(r.area).toBe('9.00');
  });

  it('4 × 4 m da 625 matas por hectárea', () => {
    expect(calcularDensidadSiembra('4', '4').matasPorHa).toBe(625);
  });

  it('acepta coma decimal (3,5 × 3,5 m ≈ 816 matas/ha)', () => {
    const r = calcularDensidadSiembra('3,5', '3,5');
    expect(r.matasPorHa).toBe(816); // round(10000 / 12.25)
  });

  it('rechaza entradas no válidas (vacío, cero, negativo)', () => {
    expect(calcularDensidadSiembra('', '3')).toBeNull();
    expect(calcularDensidadSiembra('0', '3')).toBeNull();
    expect(calcularDensidadSiembra('-2', '3')).toBeNull();
    expect(calcularDensidadSiembra('abc', 'xyz')).toBeNull();
  });
});

describe('datos grounded no vacíos', () => {
  it('hay variedades campesinas clave (hartón, dominico, banano)', () => {
    const ids = VARIEDADES.map((v) => v.id);
    expect(ids).toContain('harton');
    expect(ids).toContain('dominico-harton');
    expect(ids).toContain('banano-criollo');
    // toda variedad tiene región, uso y foto grounded
    for (const v of VARIEDADES) {
      expect(v.donde).toBeTruthy();
      expect(v.como).toBeTruthy();
      expect(v.foto).toBeTruthy();
    }
  });

  it('las distancias de referencia coinciden con Agrosavia (3×3 a 4×4)', () => {
    const etiquetas = DISTANCIAS_REFERENCIA.map((d) => d.etiqueta);
    expect(etiquetas).toContain('3 × 3 m');
    expect(etiquetas).toContain('4 × 4 m');
  });

  it('las amenazas traen nombre científico y manejo agroecológico', () => {
    expect(SIGATOKA.cientifico).toMatch(/Mycosphaerella fijiensis/);
    expect(PICUDO.cientifico).toMatch(/Cosmopolites sordidus/);
    expect(SIGATOKA.manejo.length).toBeGreaterThan(0);
    expect(PICUDO.manejo.length).toBeGreaterThan(0);
    // el picudo declara honestamente que la dosis del biocontrol va pendiente
    expect(PICUDO.biocontrolPendiente).toBeTruthy();
  });
});
