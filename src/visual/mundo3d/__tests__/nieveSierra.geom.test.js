/*
 * Pruebas de las funciones puras del módulo de la nieve de la Sierra
 * (casquete, curvas de nivel, cinta de curvas). Corren headless: marching
 * squares y buffers de three son matemática, no GPU.
 *
 * Cubren además el contrato de tipos que exige el gate tsc: `contornoNivel`
 * recibe una región REQUERIDA (sin ella la grilla sería NaN) y devuelve
 * polilíneas de tuplas [wx, wz] — es lo que consume `geometriaCinta`.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ruidoFino,
  NIEVE,
  nieveEnPunto,
  anadirAtributoNieve,
  contornoNivel,
  geometriaCinta,
} from '../sierra/nieveSierra.js';

describe('ruidoFino determinista', () => {
  it('misma entrada → misma salida', () => {
    expect(ruidoFino(1.5, -2.5)).toBe(ruidoFino(1.5, -2.5));
  });

  it('queda en el rango [-1, 1] (suma de tres senos con pesos que suman 1)', () => {
    for (let i = 0; i < 50; i++) {
      expect(Math.abs(ruidoFino(i * 0.37, -i * 0.61))).toBeLessThanOrEqual(1);
    }
  });
});

describe('nieveEnPunto', () => {
  const hFnPlano = () => 4.4;
  const opts = { lineaHielo: 4.15, sol: [1, 0.5, 0] };

  it('bajo la compuerta gruesa no hay casquete: alfa 0', () => {
    const [r, g, b, a] = nieveEnPunto(0, 0, 4.15 - 0.56, hFnPlano, opts);
    expect(a).toBe(0);
    expect([r, g, b]).toEqual([0, 0, 0]);
  });

  it('en el casquete hay capa: alfa alta y color sRGB en rango', () => {
    const [r, g, b, a] = nieveEnPunto(0, 0, 4.15 + NIEVE.mordidaHoy, hFnPlano, opts);
    expect(a).toBeGreaterThan(0.9);
    for (const c of [r, g, b]) {
      expect(c).toBeGreaterThan(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });
});

describe('anadirAtributoNieve', () => {
  it('adjunta el atributo aNieve (vec4) alineado con la posición', () => {
    const geo = new THREE.PlaneGeometry(2, 2, 4, 4);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 4.4, 0); // toda la ladera arriba de la línea de hielo
    const out = anadirAtributoNieve(geo, () => 4.4, { lineaHielo: 4.15, sol: [1, 0.5, 0] });
    const attr = out.getAttribute('aNieve');
    expect(attr).toBeTruthy();
    expect(attr.itemSize).toBe(4);
    expect(attr.count).toBe(out.getAttribute('position').count);
    for (let i = 0; i < attr.count; i++) {
      expect(attr.getX(i)).toBeGreaterThanOrEqual(0);
      expect(attr.getW(i)).toBeGreaterThan(0.9);
      expect(attr.getW(i)).toBeLessThanOrEqual(1);
    }
  });
});

describe('contornoNivel', () => {
  const region = { x0: -1, x1: 1, z0: -1, z1: 1, paso: 0.25 };

  it('plano que no cruza el nivel → sin polilíneas', () => {
    expect(contornoNivel(() => 5, 0, region)).toEqual([]);
  });

  it('rampa lineal en x → polilínea pegada a x = nivel, dentro de la ventana', () => {
    const lineas = contornoNivel((x) => x, 0, region);
    expect(lineas.length).toBeGreaterThan(0);
    for (const linea of lineas) {
      expect(linea.length).toBeGreaterThanOrEqual(3);
      for (const [wx, wz] of linea) {
        expect(Math.abs(wx)).toBeLessThan(1e-6);
        expect(wz).toBeGreaterThanOrEqual(region.z0);
        expect(wz).toBeLessThanOrEqual(region.z1);
      }
    }
  });
});

describe('geometriaCinta', () => {
  it('polilínea de N puntos → cinta de 2N vértices y 6(N-1) índices', () => {
    const lineas = [[[0, 0], [1, 0], [2, 0]]];
    const geo = geometriaCinta(lineas, () => 0, { ancho: 0.1, alza: 0.01 });
    expect(geo.getAttribute('position').count).toBe(6);
    expect(geo.getIndex().count).toBe(12);
    expect(geo.getAttribute('uv').count).toBe(6);
  });

  it('descarta polilíneas de un solo punto sin romperse', () => {
    const geo = geometriaCinta([[[0, 0]]], () => 0);
    expect(geo.getAttribute('position').count).toBe(0);
  });
});
