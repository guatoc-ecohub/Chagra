/*
 * Pruebas de la geometría PURA de los árboles de la Sierra. Corren headless:
 * three-core es matemática de buffers, no necesita WebGL.
 *
 * El test que de verdad importa es el de la FUSIÓN: `mergeGeometries` devuelve
 * null en silencio si las partes traen atributos disparejos, r3f hace
 * `if (!geo) return null` y la especie desaparece SIN UN SOLO ERROR. Ya mordió
 * dos veces en este repo — y volvió a morder mientras se escribía este módulo
 * (las primitivas de three traen `uv`, el tubo ahusado no). Por eso `fusionar`
 * normaliza atributos y truena, y por eso esto se prueba.
 */
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  rng,
  fusionar,
  geomArbol,
  ESPECIES,
  arbolDePiso,
  tipoDePiso,
  calidadDeTier,
  CALIDAD_TIER,
  variantesDeTier,
  tuboAhusado,
  SOL,
  JITTER_GIRO,
} from '../sierra/arbolMayor.geom.js';
import {
  BANDAS_BOSQUE,
  bandaConClima,
  sembrarEspecie,
  distribucionBosque,
  bosqueDeTier,
  BOSQUE_TIER,
} from '../sierra/bosqueSierra.js';

const TIPOS = Object.keys(ESPECIES);

describe('rng determinista', () => {
  it('misma semilla → misma secuencia', () => {
    const a = rng(42);
    const b = rng(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
  it('valores en [0,1)', () => {
    const r = rng(7);
    for (let i = 0; i < 40; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('fusionar — el fallo silencioso que ya mordió dos veces', () => {
  const conColor = (geo) => {
    const n = geo.attributes.position.count;
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.5), 3));
    return geo;
  };

  it('mezcla indexada + NO indexada sin devolver null', () => {
    const indexada = conColor(new THREE.CylinderGeometry(0.1, 0.2, 1, 6, 1));
    const noIndexada = conColor(new THREE.IcosahedronGeometry(0.3, 0)); // ya viene sin índice
    expect(indexada.index).not.toBeNull();
    const g = fusionar([indexada, noIndexada], 'prueba');
    expect(g).toBeTruthy();
    expect(g.attributes.position.count).toBeGreaterThan(0);
  });

  it('normaliza atributos disparejos (uv sí / uv no) en vez de devolver null', () => {
    // Cylinder trae uv; un tubo ahusado NO → sin normalizar, esto daba null.
    const conUv = conColor(new THREE.CylinderGeometry(0.1, 0.1, 1, 5, 1));
    expect(conUv.attributes.uv).toBeTruthy();
    const curva = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(0, 1, 0),
    ]);
    const sinUv = conColor(tuboAhusado(curva, 4, 5, () => 0.1));
    expect(sinUv.attributes.uv).toBeFalsy();

    const g = fusionar([conUv, sinUv], 'uv-dispar');
    expect(g).toBeTruthy();
    expect(g.attributes.uv).toBeFalsy(); // se descarta: no hay texturas en la sierra
    expect(g.attributes.color).toBeTruthy();
  });

  it('TRUENA (no devuelve null callado) si una parte no trae color', () => {
    const buena = conColor(new THREE.IcosahedronGeometry(0.2, 0));
    const pelada = new THREE.IcosahedronGeometry(0.2, 0);
    expect(() => fusionar([buena, pelada], 'sin-color')).toThrow(/color horneado/);
  });

  it('truena con lista vacía en vez de devolver algo inútil', () => {
    expect(() => fusionar([], 'vacío')).toThrow();
  });
});

describe('tuboAhusado — la conicidad que la versión vieja prometía y no hacía', () => {
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 2, 0),
  ]);

  it('la punta es MÁS DELGADA que la base', () => {
    const geo = tuboAhusado(curva, 8, 8, (t) => 0.3 * (1 - t * 0.8));
    const pos = geo.attributes.position;
    // radio = distancia al eje Y, medido abajo vs arriba
    let radioAbajo = 0;
    let radioArriba = 0;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const rad = Math.hypot(x, z);
      if (y < 0.2) radioAbajo = Math.max(radioAbajo, rad);
      if (y > 1.8) radioArriba = Math.max(radioArriba, rad);
    }
    expect(radioAbajo).toBeGreaterThan(0.2);
    expect(radioArriba).toBeLessThan(radioAbajo * 0.5);
  });

  it('trae `aRelieve` para poder hornear las grietas de la corteza', () => {
    const geo = tuboAhusado(curva, 4, 6, () => 0.2, 0.1);
    const rel = geo.getAttribute('aRelieve');
    expect(rel).toBeTruthy();
    expect(rel.count).toBe(geo.attributes.position.count);
  });
});

describe('geomArbol — cada especie se construye de verdad', () => {
  it.each(TIPOS)('%s: fusiona, trae color horneado y no está vacío', (tipo) => {
    const geo = geomArbol(tipo, { q: 1, variante: 0 });
    expect(geo).toBeTruthy();
    expect(geo.attributes.position.count).toBeGreaterThan(100);
    expect(geo.attributes.color).toBeTruthy();
    expect(geo.attributes.normal).toBeTruthy();
    // color por vértice, uno por posición
    expect(geo.attributes.color.count).toBe(geo.attributes.position.count);
  });

  it.each(TIPOS)('%s: cabe en el presupuesto (~2-5k triángulos en alto)', (tipo) => {
    const tris = geomArbol(tipo, { q: 1 }).attributes.position.count / 3;
    expect(tris).toBeGreaterThan(800); // menos que esto no es un árbol
    expect(tris).toBeLessThanOrEqual(5600);
  });

  it.each(TIPOS)('%s: tier bajo cuesta MENOS que tier alto', (tipo) => {
    const alto = geomArbol(tipo, { q: CALIDAD_TIER.alto }).attributes.position.count;
    const bajo = geomArbol(tipo, { q: CALIDAD_TIER.bajo }).attributes.position.count;
    expect(bajo).toBeLessThan(alto);
  });

  it.each(TIPOS)('%s: es determinista (misma clave → misma malla)', (tipo) => {
    const a = geomArbol(tipo, { q: 1, variante: 1 });
    const b = geomArbol(tipo, { q: 1, variante: 1 });
    expect(a.attributes.position.count).toBe(b.attributes.position.count);
    expect(a.attributes.position.array[0]).toBe(b.attributes.position.array[0]);
  });

  it.each(TIPOS)('%s: las variantes dan árboles DISTINTOS (R3: romper la simetría)', (tipo) => {
    const v0 = geomArbol(tipo, { q: 1, variante: 0 });
    const v1 = geomArbol(tipo, { q: 1, variante: 1 });
    // no basta con que cuenten distinto: que la malla no sea la misma
    const igual =
      v0.attributes.position.count === v1.attributes.position.count &&
      v0.attributes.position.array[10] === v1.attributes.position.array[10];
    expect(igual).toBe(false);
  });

  it('especie desconocida truena (no devuelve un roble callado)', () => {
    expect(() => geomArbol('pino-de-navidad')).toThrow(/especie desconocida/);
  });

  it('el árbol se para en el suelo (y=0), no flota ni se entierra', () => {
    for (const tipo of TIPOS) {
      const geo = geomArbol(tipo, { q: 1 });
      geo.computeBoundingBox();
      const box = geo.boundingBox;
      expect(box.min.y).toBeGreaterThan(-0.35); // no se hunde
      expect(box.min.y).toBeLessThan(0.3); // ni levita
      // y crece hacia arriba, con la altura declarada (±40%: ramifica orgánico)
      expect(box.max.y).toBeGreaterThan(ESPECIES[tipo].alto * 0.6);
    }
  });
});

describe('R1 — el sombreado horneado (la receta de mayor retorno del DR)', () => {
  it('el follaje NO es de un solo color plano: hay AO y gradiente', () => {
    const geo = geomArbol('roble', { q: 1 });
    const col = geo.attributes.color;
    const vistos = new Set();
    for (let i = 0; i < col.count; i += 7) {
      vistos.add(`${col.getX(i).toFixed(2)},${col.getY(i).toFixed(2)}`);
    }
    // un blob de color plano daría un puñado de tonos; horneado da decenas
    expect(vistos.size).toBeGreaterThan(30);
  });

  it('la copa se aclara hacia arriba (gradiente de altura)', () => {
    const geo = geomArbol('roble', { q: 1 });
    const pos = geo.attributes.position;
    const col = geo.attributes.color;
    geo.computeBoundingBox();
    const yMax = geo.boundingBox.max.y;
    let sumaAlto = 0, nAlto = 0, sumaBajo = 0, nBajo = 0;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      // solo follaje (verde): el tronco tiene su propia lógica
      const esVerde = col.getY(i) > col.getX(i) * 1.15;
      if (!esVerde) continue;
      const brillo = col.getX(i) + col.getY(i) + col.getZ(i);
      if (y > yMax * 0.8) { sumaAlto += brillo; nAlto++; }
      else if (y < yMax * 0.55) { sumaBajo += brillo; nBajo++; }
    }
    expect(nAlto).toBeGreaterThan(5);
    expect(nBajo).toBeGreaterThan(5);
    expect(sumaAlto / nAlto).toBeGreaterThan(sumaBajo / nBajo);
  });

  it('sss=true hornea contraluz; sss=false no (para instancias que giran)', () => {
    const con = geomArbol('roble', { q: 1, variante: 0, sss: true });
    const sin = geomArbol('roble', { q: 1, variante: 0, sss: false });
    expect(con.attributes.position.count).toBe(sin.attributes.position.count);
    let difiere = false;
    for (let i = 0; i < con.attributes.color.count; i++) {
      if (Math.abs(con.attributes.color.getX(i) - sin.attributes.color.getX(i)) > 0.01) {
        difiere = true;
        break;
      }
    }
    expect(difiere).toBe(true);
  });

  it('el SOL es unitario y el jitter de giro es chico (si no, el contraluz miente)', () => {
    expect(SOL.length()).toBeCloseTo(1, 5);
    expect(JITTER_GIRO).toBeGreaterThan(0);
    expect(JITTER_GIRO).toBeLessThan(0.35);
  });
});

describe('catálogo de especies', () => {
  it('cada piso con árbol resuelve a su especie, ida y vuelta', () => {
    for (const [clave, def] of Object.entries(ESPECIES)) {
      expect(arbolDePiso(def.piso)).toBe(def);
      expect(tipoDePiso(def.piso)).toBe(clave);
    }
  });
  it('los pisos SIN árbol devuelven null (no se inventa uno)', () => {
    expect(arbolDePiso('superparamo')).toBeNull();
    expect(arbolDePiso('nival')).toBeNull();
    expect(tipoDePiso('nival')).toBeNull();
  });
  it('cada especie declara nombre, científico y rasgo (van al rótulo)', () => {
    for (const def of Object.values(ESPECIES)) {
      expect(def.nombre).toBeTruthy();
      expect(def.cientifico).toMatch(/^[A-Z][a-z]+ /); // binomial
      expect(def.rasgo).toBeTruthy();
      expect(def.alto).toBeGreaterThan(0);
    }
  });
  it('la ceiba es la más alta y la queñua la más baja (silueta relativa real)', () => {
    const altos = Object.values(ESPECIES).map((e) => e.alto);
    expect(ESPECIES.ceiba.alto).toBe(Math.max(...altos));
    expect(ESPECIES.quenua.alto).toBe(Math.min(...altos));
  });
  it('calidadDeTier y variantesDeTier: alto ≥ medio ≥ bajo, y lo raro es frugal', () => {
    expect(calidadDeTier('alto')).toBeGreaterThan(calidadDeTier('medio'));
    expect(calidadDeTier('medio')).toBeGreaterThan(calidadDeTier('bajo'));
    expect(calidadDeTier('marciano')).toBe(CALIDAD_TIER.medio);
    expect(variantesDeTier('alto')).toBeGreaterThanOrEqual(variantesDeTier('bajo'));
  });
});

/* ── La DISPOSICIÓN: lo que el operador señaló con nombre propio ───────────── */

describe('bosqueSierra — disposición biogeográfica, no una grilla', () => {
  // una ladera de prueba: sube parejo con z, con una loma que le da relieve
  const CIMA = 6.2;
  const altura = (x, z) => {
    const base = Math.max(0, ((z + 9) / 10.6) * CIMA * 0.9);
    return Math.min(CIMA, base + Math.sin(x * 0.7) * 0.35);
  };
  const area = { x0: -10, x1: 10, z0: -8.5, z1: 3.5 };

  it('cada árbol cae DENTRO de la banda de altitud de su especie', () => {
    for (const especie of Object.keys(BANDAS_BOSQUE)) {
      const banda = bandaConClima(especie, 0);
      const items = sembrarEspecie({
        especie, cuantos: 20, altura, cima: CIMA, area, d: 0, seed: 5,
      });
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) {
        const yf = it.pos[1] / CIMA;
        expect(yf).toBeGreaterThanOrEqual(banda.min - 1e-6);
        expect(yf).toBeLessThanOrEqual(banda.max + 1e-6);
      }
    }
  });

  it('LÍNEA ARBÓREA: por encima del páramo no hay un solo árbol', () => {
    const todo = distribucionBosque({
      altura, cima: CIMA, area, conteos: bosqueDeTier('alto'), claros: [], d: 0,
    });
    const techo = Math.max(...Object.values(BANDAS_BOSQUE).map((b) => b.max));
    for (const items of Object.values(todo)) {
      for (const it of items) {
        expect(it.pos[1] / CIMA).toBeLessThanOrEqual(techo + 1e-6);
      }
    }
  });

  it('NO es una grilla: los vecinos están a distancias desiguales (rodales)', () => {
    const items = sembrarEspecie({
      especie: 'roble', cuantos: 30, altura, cima: CIMA, area, d: 0, seed: 11,
    });
    expect(items.length).toBeGreaterThan(10);
    // distancia al vecino más cercano de cada árbol
    const vecinas = items.map((a) => {
      let min = Infinity;
      for (const b of items) {
        if (a === b) continue;
        const dx = a.pos[0] - b.pos[0], dz = a.pos[2] - b.pos[2];
        min = Math.min(min, Math.hypot(dx, dz));
      }
      return min;
    });
    const media = vecinas.reduce((s, v) => s + v, 0) / vecinas.length;
    const varianza = vecinas.reduce((s, v) => s + (v - media) ** 2, 0) / vecinas.length;
    // en una grilla la distancia al vecino es CONSTANTE (varianza ~0). Un bosque
    // agrupado tiene mucha dispersión: es la diferencia que se ve en pantalla.
    expect(Math.sqrt(varianza) / media).toBeGreaterThan(0.25);
  });

  it('los CLAROS de los héroes se respetan (el bosque no se le encima al hito)', () => {
    const claros = [{ x: 0, z: -2, r: 2.5 }];
    const items = sembrarEspecie({
      especie: 'roble', cuantos: 30, altura, cima: CIMA, area, claros, d: 0, seed: 3,
    });
    for (const it of items) {
      const d = Math.hypot(it.pos[0] - 0, it.pos[2] - (-2));
      expect(d).toBeGreaterThanOrEqual(2.5 - 1e-6);
    }
  });

  it('ningún par de árboles se pisa', () => {
    const items = sembrarEspecie({
      especie: 'quenua', cuantos: 24, altura, cima: CIMA, area, d: 0, seed: 9,
    });
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].pos[0] - items[j].pos[0];
        const dz = items[i].pos[2] - items[j].pos[2];
        expect(dx * dx + dz * dz).toBeGreaterThanOrEqual(0.34 - 1e-9);
      }
    }
  });

  it('el clima empuja el bosque CUESTA ARRIBA (migra con su piso)', () => {
    const hoy = bandaConClima('roble', 0);
    const futuro = bandaConClima('roble', 1);
    expect(futuro.min).toBeGreaterThan(hoy.min);
    expect(futuro.max).toBeGreaterThan(hoy.max);
  });

  it('variación por instancia: ni giro grande, ni dos árboles idénticos', () => {
    const items = sembrarEspecie({
      especie: 'roble', cuantos: 20, altura, cima: CIMA, area, d: 0, seed: 2, variantes: 3,
    });
    for (const it of items) {
      // el giro tiene que ser CHICO: la luz va horneada (ver §ROTACIÓN)
      expect(Math.abs(it.giroY)).toBeLessThanOrEqual(JITTER_GIRO + 1e-9);
      expect(it.variante).toBeGreaterThanOrEqual(0);
      expect(it.variante).toBeLessThan(3);
      expect(it.escala).toBeGreaterThan(0);
    }
    expect(new Set(items.map((i) => i.escala)).size).toBeGreaterThan(5);
    expect(new Set(items.map((i) => i.variante)).size).toBeGreaterThan(1);
  });

  it('determinista: la misma semilla siembra el mismo bosque', () => {
    const args = { especie: 'roble', cuantos: 12, altura, cima: CIMA, area, d: 0, seed: 77 };
    const a = sembrarEspecie(args);
    const b = sembrarEspecie(args);
    expect(a.length).toBe(b.length);
    expect(a[0].pos).toEqual(b[0].pos);
  });

  it('tier-safe: alto siembra más que medio, y medio más que bajo', () => {
    expect(BOSQUE_TIER.alto.roble).toBeGreaterThan(BOSQUE_TIER.medio.roble);
    expect(BOSQUE_TIER.medio.roble).toBeGreaterThan(BOSQUE_TIER.bajo.roble);
    expect(bosqueDeTier('marciano')).toBe(BOSQUE_TIER.medio); // lo raro, frugal
  });

  it('una banda imposible no revienta: devuelve vacío', () => {
    const items = sembrarEspecie({
      especie: 'quenua', cuantos: 10, altura: () => 0, cima: CIMA, area, d: 0, seed: 1,
    });
    expect(items).toEqual([]); // a nivel del mar no hay queñua, y no truena
  });
});
