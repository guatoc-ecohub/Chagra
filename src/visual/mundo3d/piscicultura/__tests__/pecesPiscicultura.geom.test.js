/*
 * pecesPiscicultura.geom — pruebas de la geometría de los peces de estanque.
 * Todo puro (three-core headless): sin WebGL, sin azar por frame. Verifica que
 * cada especie por piso térmico produce un cuerpo y una cola válidos, con color
 * por vértice, y que el reparto del cardumen es determinista y confinado.
 */
import { describe, test, expect } from 'vitest';
import * as THREE from 'three';
import {
  PAL_PECES,
  geomCuerpoPez,
  geomColaPez,
  repartirCardumen,
} from '../pecesPiscicultura.geom.js';

const ESPECIES = ['trucha', 'mojarra', 'cachama', 'bocachico'];

describe('pecesPiscicultura.geom — especies por piso térmico', () => {
  test('las cuatro especies del DR están en la paleta', () => {
    expect(Object.keys(PAL_PECES).sort()).toEqual(ESPECIES.slice().sort());
    for (const e of ESPECIES) {
      expect(PAL_PECES[e].largo).toBeGreaterThan(0);
      expect(PAL_PECES[e].alto).toBeGreaterThan(0);
    }
  });

  test('cada cuerpo es un buffer con position+color (sin NaN)', () => {
    for (const e of ESPECIES) {
      const geo = geomCuerpoPez(e);
      expect(geo).toBeInstanceOf(THREE.BufferGeometry);
      const pos = geo.getAttribute('position');
      const col = geo.getAttribute('color');
      expect(pos).toBeTruthy();
      expect(col).toBeTruthy();
      expect(pos.count).toBe(col.count);
      expect(pos.count).toBeGreaterThan(30);
      for (let i = 0; i < pos.array.length; i++) {
        expect(Number.isFinite(pos.array[i])).toBe(true);
      }
      // el cuerpo se extiende a lo largo de X (nariz +x → cola −x)
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      expect(bb.max.x - bb.min.x).toBeGreaterThan(bb.max.z - bb.min.z);
      geo.dispose();
    }
  });

  test('la cola es una geometría propia con doble cara', () => {
    const geo = geomColaPez('trucha');
    const pos = geo.getAttribute('position');
    expect(pos.count).toBe(12); // 4 triángulos (2 caras × 2 lóbulos)
    geo.dispose();
  });

  test('la cachama es más alta que la trucha (cuerpo romboidal vs fusiforme)', () => {
    expect(PAL_PECES.cachama.alto).toBeGreaterThan(PAL_PECES.trucha.alto);
    expect(PAL_PECES.trucha.largo).toBeGreaterThan(PAL_PECES.trucha.alto);
  });
});

describe('pecesPiscicultura.geom — reparto del cardumen', () => {
  const estanque = { n: 6, cx: 2, cz: 2, rx: 2, rz: 1.6, ySup: 0.4, hondo: 0.9 };

  test('es determinista por semilla', () => {
    const a = repartirCardumen({ ...estanque, semilla: 7 });
    const b = repartirCardumen({ ...estanque, semilla: 7 });
    expect(a).toEqual(b);
    expect(a.length).toBe(6);
  });

  test('los peces nadan bajo la superficie y dentro del estanque', () => {
    const peces = repartirCardumen({ ...estanque, semilla: 9 });
    for (const p of peces) {
      expect(p.y).toBeLessThanOrEqual(estanque.ySup);
      expect(p.y).toBeGreaterThanOrEqual(estanque.ySup - estanque.hondo);
      // la elipse de nado del pez cabe dentro del estanque
      const dx = Math.abs(p.centro[0] - estanque.cx) + p.radio[0];
      const dz = Math.abs(p.centro[1] - estanque.cz) + p.radio[1];
      expect(dx).toBeLessThanOrEqual(estanque.rx + 1e-6);
      expect(dz).toBeLessThanOrEqual(estanque.rz + 1e-6);
    }
  });

  test('el bocachico va pegado al fondo', () => {
    const fondo = repartirCardumen({ ...estanque, fondo: 1, semilla: 4 });
    const medio = estanque.ySup - estanque.hondo / 2;
    for (const p of fondo) expect(p.y).toBeLessThan(medio);
  });
});
