/*
 * Pruebas del toolkit 3D compartido (parte three-core, headless).
 *
 * Cubre lo que garantiza la CONGRUENCIA y lo que ya mordió en producción:
 *   · ruidoTerreno determinista (dos escenas siembran igual).
 *   · fusionarSeguro TRUENA en vez de dejar geometría invisible (null silencioso).
 *   · construirTerreno arma la malla con color por vértice.
 *   · atmosferaDeFamilia hereda la hora del valle (coherencia de paleta).
 *   · sembrarEnAnillo es determinista y respeta el anillo.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ruidoTerreno, smoothstep, saturar } from '../ruido.js';
import { fusionarSeguro, sembrarEnAnillo } from '../geometria.js';
import { construirTerreno } from '../terreno.js';
import { atmosferaDeFamilia } from '../atmosfera.js';
import { rng } from '../ruido.js';

const esHex = (s) => typeof s === 'string' && /^#[0-9a-f]{6}$/i.test(s);

describe('ruido', () => {
  it('ruidoTerreno es determinista y ~[-1,1]', () => {
    for (let i = 0; i < 50; i++) {
      const x = (i - 25) * 0.7;
      const z = (i * 1.3) % 11;
      const a = ruidoTerreno(x, z);
      const b = ruidoTerreno(x, z);
      expect(a).toBe(b);
      expect(a).toBeGreaterThanOrEqual(-1.0001);
      expect(a).toBeLessThanOrEqual(1.0001);
    }
  });

  it('smoothstep sube monótono de 0 a 1; saturar recorta', () => {
    expect(smoothstep(0, 10, -5)).toBe(0);
    expect(smoothstep(0, 10, 15)).toBe(1);
    expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5, 5);
    expect(saturar(-2)).toBe(0);
    expect(saturar(2)).toBe(1);
    expect(saturar(0.4)).toBe(0.4);
  });
});

describe('fusionarSeguro (anti null silencioso)', () => {
  it('fusiona partes compatibles en una geometría', () => {
    const a = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.ConeGeometry(0.5, 1, 6); // indexada; se desindexa dentro
    const g = fusionarSeguro([a, b], 'test');
    expect(g).toBeInstanceOf(THREE.BufferGeometry);
    expect(g.attributes.position.count).toBeGreaterThan(0);
  });

  it('TRUENA sin partes (no deja geometría vacía silenciosa)', () => {
    expect(() => fusionarSeguro([], 'vacio')).toThrow(/vacio/);
  });

  it('TRUENA con atributos dispares (la mordida de mergeGeometries→null)', () => {
    const a = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.BoxGeometry(1, 1, 1);
    b.deleteAttribute('uv'); // atributos ya no coinciden con `a`
    expect(() => fusionarSeguro([a, b], 'dispar')).toThrow(/dispar/);
  });
});

describe('construirTerreno', () => {
  it('arma heightfield con position y color; respeta seg', () => {
    const seg = 8;
    const geo = construirTerreno({
      ancho: 10,
      fondo: 10,
      seg,
      altura: (wx, wz) => ruidoTerreno(wx * 0.3, wz * 0.3) * 0.5,
      pintar: (wx, wz, alt, out) => out.setRGB(0.4, 0.6, 0.3),
    });
    expect(geo.attributes.position.count).toBe((seg + 1) * (seg + 1));
    expect(geo.attributes.color).toBeTruthy();
    expect(geo.index).toBeTruthy(); // indexada por defecto
  });

  it('plano:true desindexa (look facetado)', () => {
    const geo = construirTerreno({
      ancho: 4, fondo: 4, seg: 4,
      altura: () => 0,
      pintar: (wx, wz, alt, out) => out.setRGB(1, 1, 1),
      plano: true,
    });
    expect(geo.index).toBeNull();
  });
});

describe('atmosferaDeFamilia (coherencia con la hora del valle)', () => {
  it('devuelve colores hex y arco solar por franja', () => {
    const dorada = atmosferaDeFamilia('sotobosque', 'tarde');
    expect(esHex(dorada.fondo)).toBe(true);
    expect(esHex(dorada.niebla)).toBe(true);
    expect(esHex(dorada.luz)).toBe(true);
    expect(Array.isArray(dorada.solPos)).toBe(true);
    expect(dorada.solPos).toHaveLength(3);
  });

  it('la noche baja intensidad y enciende estrellas; la franja viaja', () => {
    const noche = atmosferaDeFamilia('sotobosque', 'noche');
    const mediodia = atmosferaDeFamilia('sotobosque', 'mediodia');
    expect(noche.estrellas).toBeGreaterThan(0);
    expect(mediodia.estrellas).toBe(0);
    expect(noche.intensidad).toBeLessThan(mediodia.intensidad);
    expect(noche.franja).toBe('noche');
    expect(noche.fondo).not.toBe(mediodia.fondo);
  });

  it('familia desconocida cae a neutro sin romper', () => {
    const x = atmosferaDeFamilia('no-existe', 'mediodia');
    expect(esHex(x.fondo)).toBe(true);
  });
});

describe('sembrarEnAnillo', () => {
  it('es determinista por semilla y respeta el anillo', () => {
    const gen = () => sembrarEnAnillo({ n: 12, rMin: 3, rMax: 8, rand: rng(42) });
    const a = gen();
    const b = gen();
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
    for (const it of a) {
      const rad = Math.hypot(it.pos[0], it.pos[2]);
      expect(rad).toBeGreaterThanOrEqual(3 - 1e-6);
      expect(rad).toBeLessThanOrEqual(8 + 1e-6);
      expect(it.pos[1]).toBe(0);
    }
  });
});
