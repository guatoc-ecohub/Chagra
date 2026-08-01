/*
 * micorrizas.geom — pruebas de la geometría/datos de la RED MICORRÍZICA. Todo es
 * puro (three-core headless): sin WebGL, sin azar por frame. Verifica que la red
 * se teje con estructura (conexa, con puentes entre plantas), que los pulsos y
 * las curvas son coherentes, y que la geometría fundida es un solo buffer.
 */
import { describe, test, expect } from 'vitest';
import * as THREE from 'three';
import {
  PARAMS_TIER,
  paramsDeTier,
  PLANTAS,
  bezier2,
  sistemaRaices,
  nodosLibres,
  construirRed,
  curvaHilo,
  geometriaRed,
  tuboRaizGeom,
  pulsosDeRed,
  motasSuelo,
  mergeGeos,
  SUELO,
} from '../micorrizas/micorrizas.geom.js';

describe('micorrizas.geom — tiers', () => {
  test('los tres tiers existen y bajan de detalle', () => {
    expect(Object.keys(PARAMS_TIER).sort()).toEqual(['alto', 'bajo', 'medio']);
    expect(PARAMS_TIER.alto.nodosLibres).toBeGreaterThan(PARAMS_TIER.medio.nodosLibres);
    expect(PARAMS_TIER.medio.nodosLibres).toBeGreaterThan(PARAMS_TIER.bajo.nodosLibres);
    // gama baja: sin pulsos ni Ent (mínimo digno)
    expect(PARAMS_TIER.bajo.pulsos).toBe(0);
    expect(PARAMS_TIER.bajo.conEnt).toBe(false);
    expect(PARAMS_TIER.alto.conEnt).toBe(true);
  });

  test('paramsDeTier cae a medio ante lo desconocido (nunca al más caro)', () => {
    expect(paramsDeTier('alto')).toBe(PARAMS_TIER.alto);
    expect(paramsDeTier('zzz')).toBe(PARAMS_TIER.medio);
  });
});

describe('micorrizas.geom — bezier2 (hilos y pulsos)', () => {
  const a = new THREE.Vector3(0, 0, 0);
  const c = new THREE.Vector3(1, 2, 0);
  const b = new THREE.Vector3(2, 0, 0);
  test('extremos y punto medio', () => {
    expect(bezier2(a, c, b, 0).distanceTo(a)).toBeLessThan(1e-9);
    expect(bezier2(a, c, b, 1).distanceTo(b)).toBeLessThan(1e-9);
    const mid = bezier2(a, c, b, 0.5);
    // en t=0.5: (a + 2c + b)/4 → (1, 1, 0)
    expect(mid.x).toBeCloseTo(1, 6);
    expect(mid.y).toBeCloseTo(1, 6);
  });
});

describe('micorrizas.geom — raíces', () => {
  test('cada planta aporta al menos una punta-nodo de raíz, deterministas', () => {
    const s1 = sistemaRaices(11);
    const s2 = sistemaRaices(11);
    expect(s1.curvas.length).toBeGreaterThan(0);
    expect(s1.puntasRaiz.length).toBeGreaterThanOrEqual(PLANTAS.reduce((n, p) => n + p.raices, 0));
    // determinismo: misma semilla, mismas puntas
    expect(s1.puntasRaiz[0].pos.distanceTo(s2.puntasRaiz[0].pos)).toBeLessThan(1e-9);
    // todas las puntas están BAJO tierra (y < 0)
    expect(s1.puntasRaiz.every((p) => p.pos.y < 0)).toBe(true);
    // cada planta del registro tiene al menos una punta
    for (const pl of PLANTAS) {
      expect(s1.puntasRaiz.some((p) => p.planta === pl.id)).toBe(true);
    }
  });
});

describe('micorrizas.geom — nodos libres', () => {
  test('respeta el conteo y caen dentro del volumen del suelo', () => {
    const nl = nodosLibres(14, 23);
    expect(nl).toHaveLength(14);
    for (const n of nl) {
      expect(Math.abs(n.pos.x)).toBeLessThanOrEqual(SUELO.ancho);
      expect(n.pos.y).toBeLessThan(0); // bajo la superficie
      expect(['nodo', 'espora']).toContain(n.tipo);
    }
  });
});

describe('micorrizas.geom — la red se teje con estructura', () => {
  const { puntasRaiz } = sistemaRaices(11);
  const libres = nodosLibres(14, 23);
  const { nodos, hilos } = construirRed(puntasRaiz, libres, { vecinos: 2 }, 37);

  test('nodos = raíces + libres; hay hilos', () => {
    expect(nodos.length).toBe(puntasRaiz.length + libres.length);
    expect(hilos.length).toBeGreaterThan(nodos.length / 2);
  });

  test('sin auto-lazos ni hilos duplicados', () => {
    const vistos = new Set();
    for (const h of hilos) {
      expect(h.a.distanceTo(h.b)).toBeGreaterThan(1e-6); // no a==b
      expect(vistos.has(h.k)).toBe(false);
      vistos.add(h.k);
    }
  });

  test('hay PUENTES entre plantas distintas (la lección del reparto)', () => {
    const puentes = hilos.filter((h) => h.puente);
    expect(puentes.length).toBeGreaterThan(0);
  });

  test('el punto medio del hilo cuelga (sag hacia abajo)', () => {
    const conBajada = hilos.filter((h) => h.mid.y < (h.a.y + h.b.y) / 2 + 1e-6);
    // la mayoría cuelga (algún ruido lateral puede subir alguno apenas)
    expect(conBajada.length).toBeGreaterThan(hilos.length * 0.6);
  });
});

describe('micorrizas.geom — curvas y geometría fundida', () => {
  const { curvas: raizCurvas, puntasRaiz } = sistemaRaices(11);
  const libres = nodosLibres(10, 23);
  const { hilos } = construirRed(puntasRaiz, libres, { vecinos: 2 }, 37);

  test('curvaHilo respeta los extremos', () => {
    const c = curvaHilo(hilos[0]);
    expect(c.getPoint(0).distanceTo(hilos[0].a)).toBeLessThan(1e-6);
    expect(c.getPoint(1).distanceTo(hilos[0].b)).toBeLessThan(1e-6);
  });

  test('geometriaRed funde toda la red en un solo buffer con color', () => {
    const geo = geometriaRed(hilos, { tubK: 8, tubM: 4, radioHilo: 0.016 });
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    expect(geo.attributes.position.count).toBeGreaterThan(0);
    expect(geo.attributes.color).toBeTruthy();
    expect(geo.index).toBeTruthy();
    geo.dispose();
  });

  test('tuboRaizGeom devuelve una malla fundida de raíces', () => {
    const geo = tuboRaizGeom(raizCurvas, { radial: 5, tubular: 10 });
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);
    expect(geo.attributes.color).toBeTruthy();
    geo.dispose();
  });

  test('mergeGeos suma vértices e índices', () => {
    const g1 = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
    // toNonIndexed no trae index; usamos cajas indexadas:
    const a = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.BoxGeometry(1, 1, 1);
    a.setAttribute('color', new THREE.BufferAttribute(new Float32Array(a.attributes.position.count * 3), 3));
    b.setAttribute('color', new THREE.BufferAttribute(new Float32Array(b.attributes.position.count * 3), 3));
    const merged = mergeGeos([a, b]);
    expect(merged.attributes.position.count).toBe(a.attributes.position.count + b.attributes.position.count);
    expect(merged.index.count).toBe(a.index.count + b.index.count);
    g1.dispose(); a.dispose(); b.dispose(); merged.dispose();
  });
});

describe('micorrizas.geom — pulsos y motas', () => {
  const { puntasRaiz } = sistemaRaices(11);
  const libres = nodosLibres(12, 23);
  const { hilos } = construirRed(puntasRaiz, libres, { vecinos: 2 }, 37);

  test('sin presupuesto → sin pulsos', () => {
    expect(pulsosDeRed(hilos, 0)).toEqual([]);
  });

  test('respeta el presupuesto y cada pulso apunta a un hilo válido', () => {
    const pu = pulsosDeRed(hilos, 40, 53);
    expect(pu.length).toBeLessThanOrEqual(40);
    expect(pu.length).toBeGreaterThan(0);
    for (const p of pu) {
      expect(p.hilo).toBeGreaterThanOrEqual(0);
      expect(p.hilo).toBeLessThan(hilos.length);
      expect([1, -1]).toContain(p.dir);
      expect(p.color).toBeInstanceOf(THREE.Color);
    }
  });

  test('los puentes llevan pulsos en los dos sentidos (reparto recíproco)', () => {
    const idxPuente = hilos.findIndex((h) => h.puente);
    if (idxPuente >= 0) {
      const pu = pulsosDeRed(hilos, 60, 53).filter((p) => p.hilo === idxPuente);
      const dirs = new Set(pu.map((p) => p.dir));
      expect(dirs.has(1) && dirs.has(-1)).toBe(true);
    }
  });

  test('motasSuelo respeta el conteo (0 → vacío)', () => {
    expect(motasSuelo(0)).toEqual([]);
    expect(motasSuelo(30)).toHaveLength(30);
  });
});
