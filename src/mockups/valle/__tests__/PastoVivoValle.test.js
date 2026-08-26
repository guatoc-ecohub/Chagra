import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import {
  crearGeometriaPasto,
  despejadoParaPasto,
  PRESUPUESTO_PASTO,
  sembrarPasto,
} from '../pastoVivoValle.js';

const alturaDe = (x, z) => x * 0.02 + z * 0.03;

describe('PastoVivoValle', () => {
  test('siembra el mismo valle para la misma semilla', () => {
    const a = sembrarPasto({ count: 40, alturaDe, seed: 11 });
    const b = sembrarPasto({ count: 40, alturaDe, seed: 11 });
    expect(a).toEqual(b);
    expect(a).toHaveLength(40);
  });

  test('posa cada mechón sobre el terreno y despeja el corazón del valle', () => {
    const items = sembrarPasto({ count: 80, alturaDe, seed: 19 });
    expect(items.every((item) => item.y === alturaDe(item.x, item.z) + 0.015)).toBe(true);
    expect(items.every((item) => despejadoParaPasto(item.x, item.z))).toBe(true);
    expect(despejadoParaPasto(-0.1, 1.8)).toBe(false);
  });

  test('mantiene el presupuesto por tier y una geometría renderizable', () => {
    expect(PRESUPUESTO_PASTO.bajo).toBeLessThan(PRESUPUESTO_PASTO.medio);
    expect(PRESUPUESTO_PASTO.medio).toBeLessThan(PRESUPUESTO_PASTO.alto);
    const geometry = crearGeometriaPasto();
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(geometry.index.count).toBeGreaterThan(0);
    geometry.dispose();
  });
});
