/*
 * sueloRico.geom — pruebas headless (three core, sin WebGL).
 *
 * Lo que NO puede fallar en silencio:
 *   · mergeGeometries null (indexadas vs no-indexadas) → fusionar TRUENA.
 *   · el relieve es determinista (misma seed → misma cota).
 *   · el claro queda llano (el héroe de la escena no flota ni se entierra).
 *   · el sendero RECORTA el relieve (el trillo queda bajo su orilla).
 *   · toda geometría sale con color por vértice (el look vive ahí).
 */
import { describe, it, expect } from 'vitest';
import {
  crearSueloRico,
  geomSueloRico,
  geomPiedraSuelo,
  geomMataPaja,
  geomRaizSuelo,
  geomFlorecitas,
  geomLajasSendero,
  distribuirDetalle,
  detalleDeTier,
} from '../sueloRico.geom.js';

const SENDERO = { puntos: [[1.5, 12], [0, 6], [-1, 0], [0, -6]], ancho: 1.1 };

const sueloDePrueba = () =>
  crearSueloRico({
    tam: 60,
    seed: 20,
    amplitud: 1.6,
    claro: { radio: 2.5, transicion: 6 },
    sendero: SENDERO,
  });

describe('crearSueloRico', () => {
  it('es determinista: misma seed, misma cota', () => {
    const a = sueloDePrueba();
    const b = sueloDePrueba();
    for (const [x, z] of [[7, 3], [-11, 8], [4.2, -9.7], [0, 15]]) {
      expect(a.alturaDe(x, z)).toBe(b.alturaDe(x, z));
    }
  });

  it('el claro queda llano para el héroe (|cota| chica en el centro)', () => {
    // sin sendero: el trillo hunde su rasante a propósito (-0.085)
    const s = crearSueloRico({ tam: 60, seed: 20, amplitud: 1.6, claro: { radio: 2.5, transicion: 6 } });
    for (const [x, z] of [[0, 0], [1, 1], [-1.5, 0.5]]) {
      expect(Math.abs(s.alturaDe(x, z))).toBeLessThan(0.08);
    }
  });

  it('lejos del claro HAY relieve (esto no es un plano)', () => {
    const s = sueloDePrueba();
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < 200; i++) {
      const ang = (i / 200) * Math.PI * 2;
      const h = s.alturaDe(Math.cos(ang) * 13, Math.sin(ang) * 13);
      min = Math.min(min, h);
      max = Math.max(max, h);
    }
    expect(max - min).toBeGreaterThan(0.8);
  });

  it('el sendero recorta: el trillo queda por debajo de su orilla', () => {
    const s = sueloDePrueba();
    // punto medio de un tramo del trillo vs su costado (perpendicular)
    const enTrillo = s.alturaDe(-0.5, 3);
    const orilla = (s.alturaDe(-0.5 + 2.6, 3) + s.alturaDe(-0.5 - 2.6, 3)) / 2;
    expect(enTrillo).toBeLessThan(orilla + 0.02);
    const { d } = s.senderoCerca(-0.5, 3);
    expect(d).toBeLessThan(SENDERO.ancho);
  });

  it('pendienteDe devuelve 0..~ y crece donde hay lomo', () => {
    const s = sueloDePrueba();
    expect(s.pendienteDe(0, 0)).toBeLessThan(0.15);
    expect(s.pendienteDe(13, 9)).toBeGreaterThanOrEqual(0);
  });
});

describe('geometrías (fusionar truena en vez de null silencioso)', () => {
  const s = sueloDePrueba();

  it.each([
    ['geomSueloRico', () => geomSueloRico(s, { segmentos: 24 })],
    ['geomPiedraSuelo', () => geomPiedraSuelo(7)],
    ['geomMataPaja', () => geomMataPaja(7)],
    ['geomRaizSuelo', () => geomRaizSuelo(7)],
    ['geomFlorecitas', () => geomFlorecitas(7)],
    ['geomLajasSendero', () => geomLajasSendero(s)],
  ])('%s sale con posiciones y color por vértice', (_nombre, hacer) => {
    const g = hacer();
    expect(g).toBeTruthy();
    expect(g.attributes.position.count).toBeGreaterThan(0);
    expect(g.attributes.color).toBeTruthy();
    expect(g.attributes.color.count).toBe(g.attributes.position.count);
    g.dispose();
  });

  it('geomLajasSendero sin sendero devuelve null (no truena)', () => {
    const sinSenda = crearSueloRico({ seed: 3, sendero: null });
    expect(geomLajasSendero(sinSenda)).toBeNull();
  });
});

describe('distribuirDetalle', () => {
  const s = sueloDePrueba();

  it('siembra n items POSADOS en el relieve', () => {
    const items = distribuirDetalle(s, 40, { seed: 9, hundir: 0 });
    expect(items.length).toBe(40);
    for (const it of items.slice(0, 10)) {
      expect(it.pos[1]).toBeCloseTo(s.alturaDe(it.pos[0], it.pos[2]), 5);
      expect(it.escala).toBeGreaterThan(0);
      expect(it.tint).toHaveLength(3);
    }
  });

  it('respeta el trillo (evitaSendero)', () => {
    const items = distribuirDetalle(s, 60, { seed: 11, evitaSendero: 1.0 });
    for (const it of items) {
      const { d } = s.senderoCerca(it.pos[0], it.pos[2]);
      expect(d).toBeGreaterThanOrEqual(SENDERO.ancho);
    }
  });

  it('detalleDeTier degrada: bajo < medio < alto', () => {
    const alto = detalleDeTier('alto');
    const medio = detalleDeTier('medio');
    const bajo = detalleDeTier('bajo');
    expect(medio.matas).toBeLessThan(alto.matas);
    expect(bajo.matas).toBeLessThan(medio.matas);
    expect(bajo.raices).toBe(0);
  });
});
