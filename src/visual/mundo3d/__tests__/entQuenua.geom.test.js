/*
 * Pruebas de la geometría PURA del Ent de la queñua. Corren headless: three-core
 * (curvas, TubeGeometry, Color) es matemática de buffers, sin contexto WebGL.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  rng,
  paramsDeTier,
  PARAMS_TIER,
  curvaTronco,
  taperTronco,
  desplazamientoCorteza,
  colorCorteza,
  geometriaTronco,
  tuboOrganico,
  specsRamas,
  specsRaices,
  taperLineal,
  clustersCopa,
  hojasDeCluster,
  colorHoja,
  anclaRostro,
  factorParpadeo,
  ALTURA_TRONCO,
} from '../bosque/entQuenua.geom.js';

describe('rng determinista', () => {
  it('misma semilla → misma secuencia', () => {
    const a = rng(42);
    const b = rng(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
  it('devuelve valores en [0,1)', () => {
    const r = rng(9);
    for (let i = 0; i < 50; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('paramsDeTier (tier-safe)', () => {
  it('alto tiene más hojas/segmentos que medio y bajo', () => {
    expect(PARAMS_TIER.alto.hojas).toBeGreaterThan(PARAMS_TIER.medio.hojas);
    expect(PARAMS_TIER.medio.hojas).toBeGreaterThan(PARAMS_TIER.bajo.hojas);
    expect(PARAMS_TIER.alto.tubular).toBeGreaterThan(PARAMS_TIER.bajo.tubular);
  });
  it('solo alto usa material rico y niebla; bajo sin niebla', () => {
    expect(PARAMS_TIER.alto.materialRico).toBe(true);
    expect(PARAMS_TIER.medio.materialRico).toBe(false);
    expect(PARAMS_TIER.bajo.fog).toBe(false);
  });
  it('tier desconocido cae a medio, nunca al más caro', () => {
    expect(paramsDeTier('marciano')).toBe(PARAMS_TIER.medio);
    expect(paramsDeTier('alto')).toBe(PARAMS_TIER.alto);
  });
});

describe('curvaTronco', () => {
  it('arranca en el pie y sube hasta la altura del tronco', () => {
    const c = curvaTronco(7);
    const base = c.getPointAt(0);
    const punta = c.getPointAt(1);
    expect(base.length()).toBeLessThan(0.05);
    expect(punta.y).toBeGreaterThan(ALTURA_TRONCO - 0.6);
  });
  it('es sinuosa: se desvía del eje vertical en el medio', () => {
    const c = curvaTronco(7);
    const medio = c.getPointAt(0.5);
    expect(Math.hypot(medio.x, medio.z)).toBeGreaterThan(0.05);
  });
});

describe('taperTronco', () => {
  it('la base es mucho más gruesa que la punta', () => {
    expect(taperTronco(0)).toBeGreaterThan(taperTronco(1) * 3);
  });
  it('siempre positivo a lo largo del tronco', () => {
    for (let t = 0; t <= 1.0001; t += 0.05) {
      expect(taperTronco(t)).toBeGreaterThan(0);
    }
  });
});

describe('desplazamientoCorteza', () => {
  it('acotado y varía con el ángulo (surcos)', () => {
    let min = Infinity;
    let max = -Infinity;
    for (let a = 0; a < Math.PI * 2; a += 0.3) {
      const d = desplazamientoCorteza(0.2, a);
      expect(Math.abs(d)).toBeLessThan(0.6);
      min = Math.min(min, d);
      max = Math.max(max, d);
    }
    expect(max - min).toBeGreaterThan(0.05); // hay relieve, no es un cilindro liso
  });
});

describe('colorCorteza', () => {
  it('la grieta es más oscura que la cresta pelada', () => {
    const grieta = colorCorteza(-0.15, 0.6);
    const cresta = colorCorteza(0.15, 0.6);
    const lum = (c) => c.r + c.g + c.b;
    expect(lum(cresta)).toBeGreaterThan(lum(grieta));
  });
  it('devuelve una THREE.Color válida', () => {
    const c = colorCorteza(0, 0.3);
    expect(c).toBeInstanceOf(THREE.Color);
    expect(c.r).toBeGreaterThanOrEqual(0);
    expect(c.r).toBeLessThanOrEqual(1);
  });
});

describe('geometriaTronco / tuboOrganico', () => {
  it('malla con posición y color, conteo de vértices esperado', () => {
    const P = { tubular: 40, radial: 8 };
    const geo = geometriaTronco(P, 7);
    expect(geo.attributes.position).toBeTruthy();
    expect(geo.attributes.color).toBeTruthy();
    const esperado = (P.tubular + 1) * (P.radial + 1);
    expect(geo.attributes.position.count).toBe(esperado);
    expect(geo.attributes.color.count).toBe(esperado);
  });
  it('respeta el taper: la base es más ancha que la punta', () => {
    const curve = curvaTronco(7);
    const geo = tuboOrganico(curve, {
      tubular: 60, radial: 10, taperFn: taperTronco, dispAmp: 1, seedAng: 0,
    });
    const pos = geo.attributes.position;
    const nAnillo = 11;
    const radioAnillo = (anillo, centro) => {
      let max = 0;
      for (let j = 0; j <= 10; j++) {
        const k = anillo * nAnillo + j;
        const dx = pos.getX(k) - centro.x;
        const dy = pos.getY(k) - centro.y;
        const dz = pos.getZ(k) - centro.z;
        max = Math.max(max, Math.hypot(dx, dy, dz));
      }
      return max;
    };
    const rBase = radioAnillo(0, curve.getPointAt(0));
    const rPunta = radioAnillo(60, curve.getPointAt(1));
    expect(rBase).toBeGreaterThan(rPunta * 2);
  });
});

describe('ramas y raíces', () => {
  it('specsRamas devuelve n ramas con curva, radio base y punta', () => {
    const specs = specsRamas(5, 21);
    expect(specs).toHaveLength(5);
    for (const s of specs) {
      expect(s.curve).toBeInstanceOf(THREE.CatmullRomCurve3);
      expect(s.r0).toBeGreaterThan(0);
      expect(s.punta).toBeInstanceOf(THREE.Vector3);
    }
  });
  it('specsRaices devuelve n raíces que bajan bajo tierra', () => {
    const specs = specsRaices(6, 33);
    expect(specs).toHaveLength(6);
    for (const s of specs) {
      const fin = s.curve.getPointAt(1);
      expect(fin.y).toBeLessThan(0); // se hunden en la tierra
    }
  });
  it('taperLineal decrece de r0 a la punta', () => {
    const f = taperLineal(0.2, 0.03);
    expect(f(0)).toBeGreaterThan(f(1));
    expect(f(1)).toBeGreaterThan(0);
  });
});

describe('copa instanciada', () => {
  it('clustersCopa reparte el presupuesto de hojas', () => {
    const puntas = specsRamas(5, 21).map((r) => r.punta);
    const clusters = clustersCopa(puntas, { clusters: 6, hojas: 300 }, 51);
    expect(clusters).toHaveLength(6);
    const total = clusters.reduce((a, c) => a + c.count, 0);
    expect(total).toBeGreaterThan(200);
    for (const c of clusters) {
      expect(c.count).toBeGreaterThan(0);
      expect(c.center).toBeInstanceOf(THREE.Vector3);
    }
  });
  it('hojasDeCluster genera hojas dentro del radio con tono válido', () => {
    const hojas = hojasDeCluster({ radio: 0.8, count: 40, seed: 51 });
    expect(hojas).toHaveLength(40);
    for (const h of hojas) {
      expect(h.pos).toHaveLength(3);
      expect(Math.hypot(...h.pos)).toBeLessThanOrEqual(0.8 + 0.001);
      expect(h.tono).toBeGreaterThanOrEqual(0);
      expect(h.tono).toBeLessThanOrEqual(1);
      expect(h.escala).toBeGreaterThan(0);
    }
  });
  it('colorHoja va de verde a verde-plateado', () => {
    const verde = colorHoja(0);
    const plata = colorHoja(1);
    expect(plata.r + plata.g + plata.b).toBeGreaterThan(verde.r + verde.g + verde.b);
  });
});

describe('rostro y parpadeo', () => {
  it('anclaRostro se apoya en el tronco a la altura de la mirada', () => {
    const { centro, radio, t } = anclaRostro(7);
    expect(centro).toBeInstanceOf(THREE.Vector3);
    expect(radio).toBeGreaterThan(0);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(1);
  });
  it('factorParpadeo: casi siempre abierto (1) y se cierra en el pestañeo', () => {
    expect(factorParpadeo(0)).toBeCloseTo(1, 5);
    // el pestañeo ocurre al final del ciclo (~6.2s de periodo por defecto)
    let minimo = 1;
    for (let t = 0; t < 6.2; t += 0.02) {
      minimo = Math.min(minimo, factorParpadeo(t));
    }
    expect(minimo).toBeLessThan(0.3); // sí cierra el ojo
    expect(minimo).toBeGreaterThanOrEqual(0); // pero nunca negativo
  });
});
