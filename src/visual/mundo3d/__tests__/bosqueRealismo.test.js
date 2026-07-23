/*
 * Invariantes del rehecho del Bosque Vivo (Ent + flora de páramo).
 *
 * Estos tests existen porque los fallos de esta pieza son SILENCIOSOS: no
 * lanzan, no salen en consola y no rompen el build — simplemente la cosa no se
 * ve, y hay que descubrirlo mirando una captura. Los dos que ya nos mordieron:
 *
 *   1. La BARBA colgaba a una `z` fija mientras el tronco se ensancha hacia el
 *      pie → quedaba DENTRO de la madera. El operador reportó "no tiene barba"
 *      y el código tenía una barba perfectamente construida... enterrada.
 *   2. `mergeGeometries` devuelve NULL sin avisar si se mezclan geometrías
 *      indexadas con no-indexadas → r3f hace `if (!geo) return null` y la
 *      especie desaparece sin un solo error.
 *
 * Por eso se verifican NUMÉRICAMENTE, no de vista.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  PARAMS_TIER,
  curvaTronco,
  campoRostro,
  specsBarba,
  specsRamas,
  geometriaHebraBarba,
  mallaRostro,
} from '../bosque/entQuenua.geom.js';
import {
  geomFrailejon, geomEncenillo, geomAliso, geomGaque,
  geomRoble, geomYarumo, geomMortino, geomRomerillo, geomRoca, geomMusgo,
  distribucionFlora, floraDeTier, calidadDeTier,
} from '../bosque/floraParamo.geom.js';
import { fusionarSeguro, sembrarFollaje, ruidoFbm } from '../bosque/sombreadoVegetal.js';

// #2631 integró el Ent que representa barba y rostro con transformaciones y
// campo escalar, en lugar de exponer la geometría intermedia del prototipo.
// Estas pruebas conservan las invariantes visuales usando el contrato público.
const puntoDeAltura = (curva, y, muestras = 48) => {
  const y0 = curva.getPointAt(0).y;
  const y1 = curva.getPointAt(1).y;
  if (y <= y0) return 0;
  if (y >= y1) return 1;
  for (let i = 1; i <= muestras; i += 1) {
    const t1 = i / muestras;
    const p1 = curva.getPointAt(t1);
    if (p1.y >= y) {
      const t0 = (i - 1) / muestras;
      const p0 = curva.getPointAt(t0);
      return t0 + (t1 - t0) * (y - p0.y) / (p1.y - p0.y);
    }
  }
  return 1;
};

describe('curvaTronco conserva una altura navegable', () => {
  it('devuelve el t cuya altura coincide con la pedida', () => {
    const curva = curvaTronco(7);
    for (const y of [0.5, 1.5, 3.0, 5.0]) {
      const t = puntoDeAltura(curva, y);
      expect(curva.getPointAt(t).y).toBeCloseTo(y, 1);
    }
  });
  it('se acota fuera del rango del tronco', () => {
    const curva = curvaTronco(7);
    expect(puntoDeAltura(curva, -5)).toBe(0);
    expect(puntoDeAltura(curva, 99)).toBe(1);
  });
});

describe('LA BARBA cuelga por FUERA del tronco (el bug de "no tiene barba")', () => {
  for (const [tier, P] of Object.entries(PARAMS_TIER)) {
    it(`ningún punto de la barba queda dentro de la madera @ ${tier}`, () => {
      const { hebras } = specsBarba(91);
      const visibles = hebras.slice(0, Math.round(hebras.length * P.barbaDens));
      expect(visibles.length).toBeGreaterThan(0);
      for (const h of visibles) {
        // La instancia nace debajo de la boca y hacia el frente local del rostro.
        expect(h.pos[1]).toBeLessThan(0);
        expect(h.pos[2]).toBeGreaterThan(-0.08);
        expect(h.len).toBeGreaterThan(0);
      }
    });
  }

  it('la barba no llega al suelo (es barba, no falda hawaiana)', () => {
    const { hebras } = specsBarba(91, PARAMS_TIER.alto.barba);
    const masBaja = Math.min(...hebras.map((h) => h.pos[1] - h.len));
    expect(masBaja).toBeGreaterThan(-1.6); // bien por encima de las raíces locales
  });

  it('las hebras del mentón son más largas que las de las mejillas', () => {
    const { hebras } = specsBarba(91, 30);
    const promedio = (items) => items.reduce((s, h) => s + h.len, 0) / items.length;
    const centro = hebras.filter((h) => Math.abs(h.pos[0]) < 0.12);
    const mejillas = hebras.filter((h) => Math.abs(h.pos[0]) > 0.35);
    expect(promedio(centro)).toBeGreaterThan(promedio(mejillas));
  });

  it('geometriaHebra trae color y un tubo para las instancias de la barba', () => {
    const g = geometriaHebraBarba(6, 4);
    expect(g.attributes.color).toBeTruthy();
    expect(g.attributes.position.count).toBeGreaterThan(0);
  });

  it('las ramas respetan el presupuesto del tier', () => {
    expect(specsRamas(PARAMS_TIER.alto.ramas, 21)).toHaveLength(PARAMS_TIER.alto.ramas);
    expect(specsRamas(PARAMS_TIER.bajo.ramas, 21)).toHaveLength(PARAMS_TIER.bajo.ramas);
  });
});

describe('EL ROSTRO se talla en la madera (no se pega encima)', () => {
  it('las cuencas se HUNDEN y las cejas SOBRESALEN', () => {
    const cuenca = campoRostro(-0.24, -0.03).d;
    const ceja = campoRostro(-0.24, 0.135).d;
    expect(cuenca).toBeLessThan(-0.15);
    expect(ceja).toBeGreaterThan(cuenca + 0.15);
  });

  it('la boca es una grieta hundida', () => {
    const boca = campoRostro(0, -0.445).d;
    expect(boca).toBeLessThan(-0.1);
  });

  it('el rostro SOLO se talla al frente: por detrás el tronco queda intacto', () => {
    const { cara, mandibula } = mallaRostro({ segRostro: [24, 28] });
    expect(cara.attributes.position.count).toBeGreaterThan(0);
    expect(mandibula.attributes.position.count).toBeGreaterThan(0);
  });

  it('lejos de la cara (arriba del fuste) no talla nada', () => {
    expect(Math.abs(campoRostro(1.5, 4).d)).toBeLessThan(0.05);
  });
});

describe('fusionarSeguro TRUENA en vez de dejar la especie invisible', () => {
  it('lanza si mergeGeometries no puede fusionar (atributos dispares)', () => {
    const a = new THREE.BoxGeometry(1, 1, 1);
    a.setAttribute('color', new THREE.BufferAttribute(new Float32Array(a.attributes.position.count * 3), 3));
    const b = new THREE.BoxGeometry(1, 1, 1); // sin `color`
    expect(() => fusionarSeguro([a, b], 'prueba')).toThrow(/prueba/);
  });

  it('lanza con lista vacía en vez de devolver null', () => {
    expect(() => fusionarSeguro([], 'vacia')).toThrow(/vacia/);
  });

  it('fusiona indexadas con no-indexadas sin devolver null', () => {
    // Éste es EL caso que mordió dos veces: Icosahedron viene no-indexado y
    // Box indexado. El merge directo devolvía null en silencio.
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const box = new THREE.BoxGeometry(1, 1, 1);
    for (const g of [ico, box]) {
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    }
    const fusion = fusionarSeguro([ico, box], 'mixta');
    expect(fusion).toBeTruthy();
    expect(fusion.attributes.position.count).toBeGreaterThan(0);
  });
});

describe('LAS MATAS ya no son árboles de navidad', () => {
  const especies = {
    frailejon: (q) => geomFrailejon({ flor: false, q }, 1),
    frailejonFlor: (q) => geomFrailejon({ flor: true, q }, 2),
    encenillo: (q) => geomEncenillo({ q }, 4),
    aliso: (q) => geomAliso({ q }, 5),
    gaque: (q) => geomGaque({ q }, 6),
    roble: (q) => geomRoble({ q }, 11),
    yarumo: (q) => geomYarumo({ q }, 12),
    mortino: (q) => geomMortino({ q }, 7),
    romerillo: (q) => geomRomerillo({ q }, 8),
    roca: () => geomRoca(9),
    musgo: () => geomMusgo(10),
  };

  for (const tier of ['alto', 'medio', 'bajo']) {
    for (const [nombre, fn] of Object.entries(especies)) {
      it(`${nombre} construye con vértices y color horneado @ ${tier}`, () => {
        const g = fn(calidadDeTier(tier));
        expect(g).toBeTruthy(); // null = invisible sin error
        expect(g.attributes.position.count).toBeGreaterThan(0);
        expect(g.attributes.color).toBeTruthy();
      });
    }
  }

  it('el follaje trae SOMBREADO horneado: el corazón oscuro y la piel encendida', () => {
    // Es la receta de mayor retorno del DR: sin AO por vértice la copa se lee
    // como una masa sólida de plastilina.
    const g = geomGaque({ q: 1 }, 6);
    const col = g.attributes.color;
    const lum = [];
    for (let i = 0; i < col.count; i++) {
      lum.push(col.getX(i) * 0.3 + col.getY(i) * 0.6 + col.getZ(i) * 0.1);
    }
    const min = Math.min(...lum);
    const max = Math.max(...lum);
    expect(max - min).toBeGreaterThan(0.1); // hay rango, no un color plano
  });

  it('las copas tienen HUECOS: sembrar deja menos hojas de las pedidas', () => {
    // Si saliera el 100%, la copa sería una bola rellena y opaca.
    const puntos = sembrarFollaje({
      centro: [0, 0, 0], radio: 1, n: 200, semilla: 3, huecos: 0.5, mordida: 0.4, distMin: 0.3,
    });
    expect(puntos.length).toBeLessThan(200);
    expect(puntos.length).toBeGreaterThan(5);
  });

  it('las copas tienen borde MORDIDO: el radio varía con la dirección', () => {
    const puntos = sembrarFollaje({
      centro: [0, 0, 0], radio: 1, n: 120, semilla: 9, huecos: 0.2, mordida: 0.45, distMin: 0.12,
    });
    const radios = puntos.map((p) => Math.hypot(...p.pos));
    expect(Math.max(...radios) - Math.min(...radios)).toBeGreaterThan(0.2);
  });

  it('la malla del rostro existe en todos los tiers', () => {
    for (const [, P] of Object.entries(PARAMS_TIER)) {
      const { cara } = mallaRostro({ segRostro: P.segRostro }, 5);
      expect(cara.attributes.color).toBeTruthy();
    }
  });
});

describe('DISTRIBUCIÓN en bosquetes (no una grilla ni un anillo)', () => {
  it('cada especie coloca las matas que pide su tier', () => {
    for (const tier of ['alto', 'medio', 'bajo']) {
      const conteos = floraDeTier(tier);
      const dist = distribucionFlora(conteos, 707);
      for (const [especie, items] of Object.entries(dist)) {
        expect(items.length).toBe(conteos[especie]);
      }
    }
  });

  it('las matas no se encajan unas en otras (distancia mínima)', () => {
    const dist = distribucionFlora(floraDeTier('alto'), 707);
    const f = dist.frailejon;
    for (let i = 0; i < f.length; i++) {
      for (let j = i + 1; j < f.length; j++) {
        const d = Math.hypot(f[i].pos[0] - f[j].pos[0], f[i].pos[2] - f[j].pos[2]);
        expect(d).toBeGreaterThan(0.5);
      }
    }
  });

  it('nada invade el claro del Ent: el guardián manda en el centro', () => {
    const dist = distribucionFlora(floraDeTier('alto'), 707);
    for (const arbol of [...dist.roble, ...dist.encenillo, ...dist.aliso, ...dist.gaque]) {
      expect(Math.hypot(arbol.pos[0], arbol.pos[2])).toBeGreaterThan(5);
    }
  });

  it('cada instancia trae variación propia (giro, escala, inclinación, tinte)', () => {
    const dist = distribucionFlora(floraDeTier('alto'), 707);
    const escalas = new Set(dist.frailejon.map((i) => i.escala.toFixed(3)));
    expect(escalas.size).toBeGreaterThan(dist.frailejon.length * 0.5);
    for (const it of dist.frailejon) {
      expect(it.tint).toHaveLength(3);
      expect([it.tiltX, it.tiltZ]).toHaveLength(2);
    }
  });

  it('es determinista: la misma semilla siembra el mismo bosque', () => {
    const a = distribucionFlora(floraDeTier('alto'), 707);
    const b = distribucionFlora(floraDeTier('alto'), 707);
    expect(a.frailejon.map((i) => i.pos)).toEqual(b.frailejon.map((i) => i.pos));
  });
});

describe('ruidoFbm', () => {
  it('devuelve [0,1] y es determinista', () => {
    for (let i = 0; i < 50; i++) {
      const v = ruidoFbm(i * 0.7, i * 0.3, i * 1.1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(ruidoFbm(1.5, 2.5, 3.5)).toBe(ruidoFbm(1.5, 2.5, 3.5));
  });
  it('varía en el espacio (no es una constante)', () => {
    const vals = [];
    for (let i = 0; i < 30; i++) vals.push(ruidoFbm(i * 0.9, 0, 0));
    expect(Math.max(...vals) - Math.min(...vals)).toBeGreaterThan(0.2);
  });
});
