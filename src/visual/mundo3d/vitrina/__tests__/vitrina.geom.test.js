/*
 * Pruebas de la geometría PURA del mirador de la Vitrina Maestra. Corren
 * headless: three-core + merge es matemática de buffers, sin WebGL.
 *
 * La prueba CLAVE es la anti-null: mergeGeometries devuelve null EN SILENCIO
 * al mezclar geometrías indexadas con no-indexadas (o con sets de atributos
 * distintos) y la pieza desaparece sin error. Ya mordió tres veces — la
 * tercera tenía INVISIBLES seis especies del páramo (frailejón, roble,
 * encenillo, aliso, gaque, romerillo). Aquí toda fusión TRUENA si falla,
 * y estas pruebas construyen TODAS las piezas para atrapar regresiones.
 */
import { describe, it, expect } from 'vitest';
import {
  fusionar,
  pintar,
  pintarPorVertice,
  ruido1D,
  fbm1D,
  ruido2D,
  fbm2D,
  alturaTerreno,
  geomCieloDomo,
  geomCordilleras,
  geomTerreno,
  geomQuebrada,
  geomPiedrasQuebrada,
  geomArcoPiedra,
  geomLomitas,
  geomBancales,
  geomLajasSendero,
} from '../miradorAndino.geom.js';
import { VINETAS_GEOM, geomVineta } from '../vinetasMundos.geom.js';
import {
  geomFrailejon,
  geomYarumo,
  geomRoble,
  geomEncenillo,
  geomAliso,
  geomGaque,
  geomMortino,
  geomRomerillo,
} from '../../bosque/floraParamo.geom.js';
import * as THREE from 'three';

/** La geometría existe, tiene vértices y trae color horneado. */
function esGeomValida(g) {
  expect(g).toBeTruthy();
  expect(g.attributes.position.count).toBeGreaterThan(0);
  expect(g.attributes.color).toBeTruthy();
  expect(g.attributes.color.count).toBe(g.attributes.position.count);
}

describe('fusionar (la fusión segura)', () => {
  it('mezcla indexadas (cono) con no-indexadas (icosaedro) sin devolver null', () => {
    const cono = pintar(new THREE.ConeGeometry(1, 2, 5), '#446644');
    const ico = pintar(new THREE.IcosahedronGeometry(0.5, 0), '#664444');
    const g = fusionar([cono, ico], 'test');
    esGeomValida(g);
  });

  it('descarta uv para uniformar atributos (parte con uv + parte sin uv)', () => {
    const plano = pintar(new THREE.PlaneGeometry(1, 1), '#446644'); // con uv
    const pelada = new THREE.BufferGeometry(); // sin uv
    pelada.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3),
    );
    pelada.computeVertexNormals();
    pintar(pelada, '#664444');
    const g = fusionar([plano, pelada], 'test');
    esGeomValida(g);
  });
});

describe('ruido determinista', () => {
  it('misma entrada → misma salida, en [0,1]', () => {
    expect(ruido1D(3.7, 5)).toBe(ruido1D(3.7, 5));
    expect(ruido2D(3.7, -2.1, 5)).toBe(ruido2D(3.7, -2.1, 5));
    for (const x of [0, 0.3, 7.7, -4.2, 100.5]) {
      expect(fbm1D(x, 3)).toBeGreaterThanOrEqual(0);
      expect(fbm1D(x, 3)).toBeLessThanOrEqual(1);
      expect(fbm2D(x, x * 0.7, 3)).toBeGreaterThanOrEqual(0);
      expect(fbm2D(x, x * 0.7, 3)).toBeLessThanOrEqual(1);
    }
  });
});

describe('el paisaje del mirador', () => {
  it('cielo, cordilleras, terreno, quebrada, piedras, lajas y lomitas construyen', () => {
    esGeomValida(geomCieloDomo());
    esGeomValida(geomCordilleras());
    esGeomValida(geomTerreno({ segmentos: 24 }));
    esGeomValida(geomQuebrada());
    esGeomValida(geomPiedrasQuebrada());
    esGeomValida(geomLajasSendero());
    esGeomValida(geomLomitas([[0, 0, -9], [4, 0.5, -9]]));
    esGeomValida(geomBancales([
      { radio: 9.3, altura: 1.6, caida: 2.1, arco: 64 },
      { radio: 12, altura: 3.45, caida: 2.3, arco: 56 },
    ]));
  });

  it('el arco de piedra construye en todas las calidades de tier', () => {
    for (const q of [1, 0.62, 0.42]) {
      esGeomValida(geomArcoPiedra({ q }));
    }
  });

  it('alturaTerreno: plaza casi llana adentro, falda que sube afuera', () => {
    // la plaza de los portales (r<9) es prácticamente plana
    expect(Math.abs(alturaTerreno(0, 6))).toBeLessThan(0.2);
    expect(Math.abs(alturaTerreno(-5, 3))).toBeLessThan(0.2);
    // el pie de monte sube de verdad
    expect(alturaTerreno(0, -28)).toBeGreaterThan(1);
  });

  it('pintarPorVertice hornea un color por vértice', () => {
    const g = new THREE.PlaneGeometry(1, 1);
    pintarPorVertice(g, (x) => new THREE.Color(x > 0 ? '#ffffff' : '#000000'));
    expect(g.attributes.color.count).toBe(g.attributes.position.count);
  });
});

describe('las quince viñetas-diorama', () => {
  it('hay viñeta para los QUINCE mundos del manifiesto', () => {
    const mundos = [
      'valle', 'cafe', 'agua', 'sanidad', 'mercado', 'animales',
      'semillero', 'suelo', 'sierra', 'paramo', 'lluvia', 'compost',
      'cacao', 'papa', 'abejas',
    ];
    expect(Object.keys(VINETAS_GEOM).sort()).toEqual([...mundos].sort());
  });

  it.each(Object.keys(VINETAS_GEOM))('la viñeta "%s" construye con color horneado', (id) => {
    esGeomValida(geomVineta(id, { q: 1 }));
    esGeomValida(geomVineta(id, { q: 0.62 })); // tier medio
  });

  it('geomVineta truena con un mundo desconocido (bug de datos, no silencio)', () => {
    expect(() => geomVineta('narnia')).toThrow(/no hay viñeta/);
  });

  it('cada viñeta cabe en la boca del arco (XY dentro de ~0.8)', () => {
    for (const id of Object.keys(VINETAS_GEOM)) {
      const g = geomVineta(id, { q: 1 });
      g.computeBoundingBox();
      const bb = g.boundingBox;
      expect(bb.max.x).toBeLessThanOrEqual(0.85);
      expect(bb.min.x).toBeGreaterThanOrEqual(-0.85);
      expect(bb.max.y).toBeLessThanOrEqual(0.85);
      expect(bb.min.y).toBeGreaterThanOrEqual(-0.85);
    }
  });
});

describe('regresión: las especies del páramo ya no desaparecen en silencio', () => {
  // Antes del arreglo de `fusionar` en floraParamo.geom, SEIS de estas
  // devolvían null (mezcla indexada/no-indexada) y las matas no se dibujaban.
  it.each([
    ['frailejon', () => geomFrailejon({}, 3)],
    ['yarumo', () => geomYarumo({}, 3)],
    ['roble', () => geomRoble({}, 3)],
    ['encenillo', () => geomEncenillo({}, 3)],
    ['aliso', () => geomAliso({}, 3)],
    ['gaque', () => geomGaque({}, 3)],
    ['mortino', () => geomMortino({}, 3)],
    ['romerillo', () => geomRomerillo({}, 3)],
  ])('%s construye (no-null) con color horneado', (_n, fn) => {
    esGeomValida(fn());
  });
});
