/*
 * Invariantes de la VITRINA DE TIERRA del Ent maestro (la lección del subsuelo).
 *
 * Estos tests existen por UNA razón concreta, y no es teórica: la pasada 2 dejó
 * escrito que "la banda de micorrizas se lee oscura y la red se ve más como
 * brillo que como red". Las dos frases describían el mismo fallo, y era
 * aritmético: la red se sembraba en z ∈ [0.05, 0.80] y la cara del bloque de
 * tierra estaba en z = 0.85 → LA RED ENTERA VIVÍA DENTRO DEL LADRILLO OPACO.
 * Cero píxeles, cero errores, cero forma de enterarse sin mirar una captura.
 *
 * Es la MISMA familia del bug de la barba (que colgaba dentro del fuste). Ya van
 * dos veces que una geometría correcta desaparece dentro de otra sin un solo
 * síntoma. Estos tests convierten ese fallo silencioso en un test rojo.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  ANCHO_CUT,
  CARA,
  CAPAS,
  ALTO_CORTE,
  HUECO,
  ANCLAS,
  centrosCapas,
  zFrenteDe,
  puntaDeAncla,
  colorHorizonte,
  construirTierra,
  construirRaicesBanda,
  construirRaicesZona,
  esqueletoRed,
  geometriaRedBanda,
  muestrasDeLuz,
  nodosDeRed,
  pulsosDeBanda,
  construirTerreno,
} from '../bosque/corteSuelo.geom.js';

const banda = CAPAS.find((c) => c.id === 'micorrizas');
const zona = CAPAS.find((c) => c.id === 'raices');
const TIERS = /** @type {const} */ (['alto', 'medio', 'bajo']);

const bbox = (geo) => {
  geo.computeBoundingBox();
  return geo.boundingBox;
};
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

describe('LA RED NO ESTÁ ENTERRADA (el bug que costó la tercera pasada)', () => {
  it.each(TIERS)('en tier %s todo filamento está DELANTE de la cara de la tierra', (tier) => {
    const { hilos } = esqueletoRed(banda.alto, tier);
    const geo = geometriaRedBanda(hilos, tier);
    const bb = bbox(geo);
    // zFrenteDe('micorrizas') es la cara de la tierra: por detrás no se ve NADA
    expect(bb.min.z).toBeGreaterThan(zFrenteDe('micorrizas'));
  });

  it.each(TIERS)('en tier %s la red no se sale del bloque hacia la cámara', (tier) => {
    const { hilos } = esqueletoRed(banda.alto, tier);
    const bb = bbox(geometriaRedBanda(hilos, tier));
    expect(bb.max.z).toBeLessThan(CARA);
  });

  it.each(TIERS)('en tier %s las raíces de la banda también están a la vista', (tier) => {
    const bb = bbox(construirRaicesBanda(banda.alto, tier));
    expect(bb.min.z).toBeGreaterThan(zFrenteDe('micorrizas'));
  });

  it('las raíces de la zona de raíces están delante de SU cara (alcoba propia)', () => {
    const bb = bbox(construirRaicesZona(zona.alto, banda.alto, 'alto'));
    expect(bb.min.z).toBeGreaterThan(zFrenteDe('raices'));
  });

  it('la alcoba de micorrizas es la más abierta: es la lección', () => {
    expect(HUECO.micorrizas).toBeGreaterThan(HUECO.raices);
    expect(HUECO.raices).toBeGreaterThan(HUECO.hojarasca);
  });

  it('ninguna alcoba se come el bloque entero', () => {
    for (const c of CAPAS) expect(zFrenteDe(c.id)).toBeGreaterThan(-CARA);
  });
});

describe('LA RED SE LEE COMO RED (no como un resplandor)', () => {
  it('conecta RAÍCES: cada ancla tiene un filamento naciendo en su punta', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    for (const a of ANCLAS) {
      const punta = puntaDeAncla(a, banda.alto);
      const tocado = hilos.some((h) => h.nivel === 0
        && (h.curva.getPoint(0).distanceTo(punta) < 1e-6
          || h.curva.getPoint(1).distanceTo(punta) < 1e-6));
      expect(tocado, `la raíz "${a.id}" no está conectada a la red`).toBe(true);
    }
  });

  it('hay JERARQUÍA de verdad: rizomorfo → secundaria → punta, y adelgazan', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const r = (n) => hilos.filter((h) => h.nivel === n);
    expect(r(0).length).toBeGreaterThan(0);
    expect(r(1).length).toBeGreaterThan(0);
    expect(r(2).length).toBeGreaterThan(0);
    // cada nivel es más fino que el anterior (si no, no hay jerarquía visible)
    const grosor = (n) => Math.max(...r(n).map((h) => h.r0));
    expect(grosor(0)).toBeGreaterThan(grosor(1));
    expect(grosor(1)).toBeGreaterThan(grosor(2));
  });

  it('todo filamento tiene CONICIDAD (r1 < r0): ninguno es un tubo parejo', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    for (const h of hilos) expect(h.r1).toBeLessThan(h.r0);
  });

  it('la red OCUPA la banda: no es un collar en el tercio bajo', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const bb = bbox(geometriaRedBanda(hilos, 'alto'));
    expect((bb.max.y - bb.min.y) / banda.alto).toBeGreaterThan(0.6);
    expect((bb.max.x - bb.min.x) / ANCHO_CUT).toBeGreaterThan(0.5);
  });

  it('la red se queda DENTRO de su banda (no invade las capas vecinas)', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const bb = bbox(geometriaRedBanda(hilos, 'alto'));
    const media = banda.alto / 2;
    expect(bb.min.y).toBeGreaterThanOrEqual(-media - 1e-6);
    expect(bb.max.y).toBeLessThanOrEqual(media + 1e-6);
  });

  it('la raíz de la QUEÑUA MADRE es la más gruesa: la lección se lee sin texto', () => {
    const madre = ANCLAS.find((a) => a.madre);
    const otras = ANCLAS.filter((a) => !a.madre);
    for (const o of otras) expect(madre.r0).toBeGreaterThan(o.r0);
  });

  it('los nodos brillan en las uniones y el de la madre es el mayor', () => {
    const nodos = nodosDeRed(banda.alto);
    expect(nodos.length).toBe(ANCLAS.length + 3);
    const madre = nodos[ANCLAS.findIndex((a) => a.madre)];
    expect(madre.esc).toBe(Math.max(...nodos.map((n) => n.esc)));
  });

  it('los pulsos corren SOLO por los rizomorfos (por la lección, no al azar)', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const pulsos = pulsosDeBanda(hilos, 26);
    expect(pulsos.length).toBe(26);
    for (const p of pulsos) expect(hilos[p.hilo].nivel).toBe(0);
    // en los DOS sentidos: el mineral sube y el azúcar baja
    expect(pulsos.some((p) => p.dir === 1)).toBe(true);
    expect(pulsos.some((p) => p.dir === -1)).toBe(true);
  });

  it('tier bajo: sin pulsos, pero el espinazo de la lección sigue estando', () => {
    const { hilos } = esqueletoRed(banda.alto, 'bajo');
    expect(pulsosDeBanda(hilos, 0)).toEqual([]);
    expect(hilos.filter((h) => h.nivel === 0).length).toBeGreaterThan(0);
  });

  it('es UN draw-call por pieza: la geometría viene fusionada', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    for (const g of [
      geometriaRedBanda(hilos, 'alto'),
      construirRaicesBanda(banda.alto, 'alto'),
      construirTerreno({ x: 2.5, z: 1.9 }, { tier: 'alto' }),
    ]) {
      expect(g).toBeInstanceOf(THREE.BufferGeometry);
      expect(g.attributes.position.count).toBeGreaterThan(0);
      expect(g.attributes.color).toBeTruthy();
    }
  });
});

describe('LA BANDA DE MICORRIZAS YA NO SE LEE OSCURA', () => {
  /* Sin subir un lift plano: la RED le hornea la luz encima. Un lift plano
     arreglaría la banda y lavaría el filamento — los dos males tiran en
     direcciones opuestas y por eso la luz tiene que ser LOCAL. */
  const caraDeLaBanda = (geo) => {
    const c = geo.attributes.color;
    const p = geo.attributes.position;
    const zF = zFrenteDe('micorrizas');
    const out = [];
    for (let i = 0; i < c.count; i++) {
      if (p.getZ(i) < zF - 0.02) continue;
      out.push(lum(c.getX(i), c.getY(i), c.getZ(i)));
    }
    return out;
  };

  it('la luz de la red levanta la banda respecto a la tierra sin red', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const sin = caraDeLaBanda(construirTierra(banda, { tier: 'alto', luces: [] }));
    const con = caraDeLaBanda(construirTierra(banda, { tier: 'alto', luces: muestrasDeLuz(hilos) }));
    const media = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(media(con)).toBeGreaterThan(media(sin) * 1.5);
  });

  it('la luz es LOCAL, no un lift plano: hay rango dinámico dentro de la banda', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const l = caraDeLaBanda(construirTierra(banda, { tier: 'alto', luces: muestrasDeLuz(hilos) }));
    // cerca del filamento se enciende; en los huecos se queda oscura → contraste
    expect(Math.max(...l) / Math.max(1e-6, Math.min(...l))).toBeGreaterThan(5);
  });

  it('la banda sigue siendo la tierra más oscura: la red tiene contra qué resaltar', () => {
    const parda = ['hojarasca', 'humus', 'raices'].map(
      (id) => new THREE.Color(CAPAS.find((c) => c.id === id).color),
    );
    const mic = new THREE.Color(banda.color);
    for (const p of parda) {
      expect(lum(mic.r, mic.g, mic.b)).toBeLessThan(lum(p.r, p.g, p.b));
    }
  });

  it('ninguna tierra cae a NEGRO (el agujero negro de la primera versión)', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    for (const c of centrosCapas()) {
      const geo = construirTierra(c, {
        tier: 'alto',
        luces: c.id === 'micorrizas' ? muestrasDeLuz(hilos) : [],
      });
      const col = geo.attributes.color;
      let mx = 0;
      for (let i = 0; i < col.count; i++) {
        mx = Math.max(mx, lum(col.getX(i), col.getY(i), col.getZ(i)));
      }
      expect(mx, `la capa "${c.id}" no tiene un solo vértice con luz`).toBeGreaterThan(0.01);
    }
  });

  it('la tierra lleva información horneada: no es un color plano', () => {
    const geo = construirTierra(zona, { tier: 'alto', luces: [] });
    const c = geo.attributes.color;
    const vals = [];
    for (let i = 0; i < c.count; i++) vals.push(lum(c.getX(i), c.getY(i), c.getZ(i)));
    expect(new Set(vals.map((v) => v.toFixed(4))).size).toBeGreaterThan(20);
  });

  it('las muestras de luz salen del espinazo, no de las puntas', () => {
    const { hilos } = esqueletoRed(banda.alto, 'alto');
    const m = muestrasDeLuz(hilos);
    expect(m.length).toBeGreaterThan(0);
    expect(m.some((x) => x.fuerza === 1)).toBe(true);
    expect(m.every((x) => x.fuerza > 0)).toBe(true);
  });
});

describe('EL AIRE MUERTO: el corte ya no flota en el cielo', () => {
  const terreno = construirTerreno({ x: 2.5, z: 1.9 }, { tier: 'alto' });

  it('el macizo llega HASTA la cara del corte y tapa por detrás', () => {
    const bb = bbox(terreno);
    expect(bb.max.z).toBeCloseTo(1.9 + CARA, 5);
    // sin la caja de DETRÁS se veía el cielo por encima del bloque
    expect(bb.min.z).toBeLessThan(1.9 - CARA);
  });

  it('el macizo baja MÁS que el corte: no se le ve el fondo', () => {
    expect(bbox(terreno).min.y).toBeLessThan(-ALTO_CORTE);
  });

  it('el macizo no invade la huella del corte por delante (nada de z-fighting)', () => {
    const p = terreno.attributes.position;
    const x0 = 2.5 - ANCHO_CUT / 2;
    const x1 = 2.5 + ANCHO_CUT / 2;
    const zCara = 1.9 + CARA;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const dentro = x > x0 + 1e-6 && x < x1 - 1e-6
        && y > -ALTO_CORTE + 1e-6 && y < -1e-6
        && z > 1.9 - CARA + 1e-6;
      expect(dentro && Math.abs(z - zCara) < 1e-6).toBe(false);
    }
  });

  it('el macizo enseña LOS MISMOS horizontes del corte', () => {
    for (const c of centrosCapas()) {
      const medio = (c.top + c.bottom) / 2;
      expect(colorHorizonte(medio).getHexString()).toBe(
        new THREE.Color(c.color).getHexString(),
      );
    }
  });

  it('por debajo del corte la roca madre sigue: la tierra no se acaba en la vitrina', () => {
    const roca = new THREE.Color(CAPAS[CAPAS.length - 1].color).getHexString();
    expect(colorHorizonte(-ALTO_CORTE - 3).getHexString()).toBe(roca);
  });

  it('la superficie es musgo de páramo, no tierra', () => {
    const c = terreno.attributes.color;
    const p = terreno.attributes.position;
    let verdes = 0;
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) > -1e-6 && c.getY(i) > c.getX(i) && c.getY(i) > c.getZ(i)) verdes++;
    }
    expect(verdes).toBeGreaterThan(0);
  });

  it('tier bajo: el macizo sigue existiendo pero mucho más barato', () => {
    const bajo = construirTerreno({ x: 2.5, z: 1.9 }, { tier: 'bajo' });
    expect(bajo.attributes.position.count).toBeGreaterThan(0);
    expect(bajo.attributes.position.count).toBeLessThan(terreno.attributes.position.count / 2);
  });
});

describe('Presupuesto tier-safe (el equipo humilde no se muere)', () => {
  it.each(TIERS)('tier %s: la red cabe en el presupuesto', (tier) => {
    const { hilos } = esqueletoRed(banda.alto, tier);
    const tris = geometriaRedBanda(hilos, tier).attributes.position.count / 3;
    const techo = tier === 'alto' ? 9000 : tier === 'medio' ? 4000 : 1500;
    expect(tris).toBeLessThan(techo);
  });

  it('el tier alto tiene más red que el bajo (si no, el tier no sirve de nada)', () => {
    const n = (t) => esqueletoRed(banda.alto, t).hilos.length;
    expect(n('alto')).toBeGreaterThan(n('medio'));
    expect(n('medio')).toBeGreaterThan(n('bajo'));
  });

  it('es determinista: el mismo suelo en cada carga', () => {
    const a = esqueletoRed(banda.alto, 'alto').hilos;
    const b = esqueletoRed(banda.alto, 'alto').hilos;
    expect(a.length).toBe(b.length);
    for (let i = 0; i < a.length; i++) {
      expect(a[i].curva.getPoint(0.5).toArray()).toEqual(b[i].curva.getPoint(0.5).toArray());
    }
  });
});
