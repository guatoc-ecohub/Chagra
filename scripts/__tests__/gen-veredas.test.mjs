/**
 * scripts/__tests__/gen-veredas.test.mjs
 *
 * Cobertura unitaria del generador de veredas. El modulo `gen-veredas.mjs`
 * envuelve su CLI en un guard `import.meta.url`, asi que estos tests importan
 * las funciones puras sin disparar descargas remotas ni escritura de archivos.
 *
 * Se prueba: title-case (siglas D.C.), simplificacion Douglas-Peucker,
 * simplificacion de geometrias Polygon/MultiPolygon, centroide, point-in-polygon
 * (con huecos), resolveVereda (PIP + fallback centroide) y buildDataset
 * (agrupacion por DIVIPOLA + dedupe).
 */
import { describe, it, expect } from 'vitest';

import {
  toTitleCase,
  normalizeName,
  douglasPeucker,
  simplifyGeometry,
  geometryCentroid,
  pointInPolygon,
  resolveVereda,
  buildDataset,
} from '../gen-veredas.mjs';

// Un cuadrado unitario alrededor de (0,0): [-1,-1] .. [1,1] (lng, lat).
const SQUARE = {
  type: 'Polygon',
  coordinates: [
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
      [-1, -1],
    ],
  ],
};

describe('toTitleCase', () => {
  it('pasa MAYUSCULAS del DANE a forma legible con particulas', () => {
    expect(toTitleCase('EL CURI')).toBe('El Curi');
    expect(toTitleCase('VEGA DE SAN JUAN')).toBe('Vega de San Juan');
  });

  it('respeta siglas con puntos (D.C.)', () => {
    expect(toTitleCase('BOGOTÁ, D.C.')).toBe('Bogotá, D.C.');
  });
});

describe('douglasPeucker', () => {
  it('elimina vertices colineales dentro de la tolerancia', () => {
    const line = [
      [0, 0],
      [1, 0.0001],
      [2, 0],
      [3, 0.0001],
      [4, 0],
    ];
    const out = douglasPeucker(line, 0.01);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([4, 0]);
    expect(out.length).toBeLessThan(line.length);
  });

  it('conserva vertices que exceden la tolerancia', () => {
    const line = [
      [0, 0],
      [1, 1],
      [2, 0],
    ];
    expect(douglasPeucker(line, 0.1)).toHaveLength(3);
  });

  it('devuelve la entrada si tiene 2 puntos o menos', () => {
    expect(douglasPeucker([[0, 0], [1, 1]], 0.5)).toHaveLength(2);
  });
});

describe('simplifyGeometry', () => {
  it('mantiene el anillo cerrado tras simplificar un Polygon', () => {
    const simplified = simplifyGeometry(SQUARE, 0.0005);
    const ring = simplified.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ring.length).toBeGreaterThanOrEqual(4);
  });

  it('procesa cada poligono de un MultiPolygon', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [SQUARE.coordinates, SQUARE.coordinates],
    };
    const out = simplifyGeometry(multi, 0.0005);
    expect(out.type).toBe('MultiPolygon');
    expect(out.coordinates).toHaveLength(2);
  });
});

describe('geometryCentroid', () => {
  it('calcula el centroide de un cuadrado en su centro', () => {
    const c = geometryCentroid(SQUARE);
    expect(c.lat).toBeCloseTo(0, 5);
    expect(c.lng).toBeCloseTo(0, 5);
  });

  it('para MultiPolygon toma el poligono de mayor area', () => {
    const bigFar = {
      type: 'MultiPolygon',
      coordinates: [
        // pequeño cerca de (10,10)
        [[[9.9, 9.9], [10.1, 9.9], [10.1, 10.1], [9.9, 10.1], [9.9, 9.9]]],
        // grande en (0,0)
        SQUARE.coordinates,
      ],
    };
    const c = geometryCentroid(bigFar);
    expect(c.lat).toBeCloseTo(0, 4);
    expect(c.lng).toBeCloseTo(0, 4);
  });
});

describe('pointInPolygon', () => {
  it('detecta un punto dentro del poligono', () => {
    expect(pointInPolygon(0, 0, SQUARE)).toBe(true);
  });

  it('detecta un punto fuera del poligono', () => {
    expect(pointInPolygon(5, 5, SQUARE)).toBe(false);
  });

  it('respeta huecos (un punto en el hueco esta fuera)', () => {
    const withHole = {
      type: 'Polygon',
      coordinates: [
        SQUARE.coordinates[0],
        [
          [-0.5, -0.5],
          [0.5, -0.5],
          [0.5, 0.5],
          [-0.5, 0.5],
          [-0.5, -0.5],
        ],
      ],
    };
    expect(pointInPolygon(0, 0, withHole)).toBe(false); // dentro del hueco
    expect(pointInPolygon(0.8, 0.8, withHole)).toBe(true); // anillo entre borde y hueco
  });
});

describe('resolveVereda', () => {
  const veredas = [
    {
      nombre: 'El Curi',
      centroid: { lat: 0, lng: 0 },
      geometry: SQUARE,
    },
    {
      nombre: 'Potrero Grande',
      centroid: { lat: 10, lng: 10 },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]],
        ],
      },
    },
  ];

  it('resuelve por point-in-polygon a la vereda correcta', () => {
    const r = resolveVereda(0, 0, veredas);
    expect(r).toEqual({ nombre: 'El Curi', method: 'point-in-polygon' });
  });

  it('discrimina entre veredas vecinas', () => {
    expect(resolveVereda(10, 10, veredas).nombre).toBe('Potrero Grande');
  });

  it('cae a centroide mas cercano cuando ningun poligono contiene el punto', () => {
    // (lat=5, lng=0.6) queda fuera de ambos poligonos; el centroide mas
    // cercano es El Curi (0,0) frente a Potrero Grande (10,10).
    const r = resolveVereda(5, 0.6, veredas);
    expect(r.method).toBe('nearest-centroid');
    expect(r.nombre).toBe('El Curi');
  });

  it('devuelve null sin veredas', () => {
    expect(resolveVereda(0, 0, [])).toBeNull();
  });
});

describe('buildDataset', () => {
  const features = [
    {
      type: 'Feature',
      properties: {
        DPTOMPIO: '25181',
        CODIGO_VER: '25181017',
        NOMBRE_VER: 'EL CURI',
        NOMB_MPIO: 'CHOACHÍ',
        NOM_DEP: 'CUNDINAMARCA',
      },
      geometry: SQUARE,
    },
    {
      type: 'Feature',
      properties: {
        DPTOMPIO: '25181',
        CODIGO_VER: '25181023',
        NOMBRE_VER: 'POTRERO GRANDE',
        NOMB_MPIO: 'CHOACHÍ',
        NOM_DEP: 'CUNDINAMARCA',
      },
      geometry: SQUARE,
    },
    {
      type: 'Feature',
      properties: {
        DPTOMPIO: '25279',
        CODIGO_VER: '25279001',
        NOMBRE_VER: 'LA UNIÓN',
        NOMB_MPIO: 'FÓMEQUE',
        NOM_DEP: 'CUNDINAMARCA',
      },
      geometry: SQUARE,
    },
  ];

  it('agrupa por codigo DIVIPOLA de municipio', () => {
    const { byMunicipio } = buildDataset(features, 0.0005);
    expect(Object.keys(byMunicipio).sort()).toEqual(['25181', '25279']);
    expect(byMunicipio['25181'].veredas).toHaveLength(2);
  });

  it('title-casea nombre de vereda y municipio', () => {
    const { byMunicipio } = buildDataset(features, 0.0005);
    const nombres = byMunicipio['25181'].veredas.map((v) => v.nombre);
    expect(nombres).toContain('El Curi');
    expect(byMunicipio['25181'].municipio).toBe('Choachí');
  });

  it('dedupe por codigo de vereda repetido', () => {
    const dup = [...features, features[0]];
    const { byMunicipio } = buildDataset(dup, 0.0005);
    expect(byMunicipio['25181'].veredas).toHaveLength(2);
  });

  it('avisa cuando falta DPTOMPIO', () => {
    const bad = [{ type: 'Feature', properties: {}, geometry: SQUARE }];
    const { warnings } = buildDataset(bad, 0.0005);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it('cada vereda queda con centroide y geometria', () => {
    const { byMunicipio } = buildDataset(features, 0.0005);
    const v = byMunicipio['25181'].veredas[0];
    expect(v.centroid).toHaveProperty('lat');
    expect(v.centroid).toHaveProperty('lng');
    expect(v.geometry.type).toBe('Polygon');
  });
});

describe('normalizeName', () => {
  it('quita tildes y baja a minusculas', () => {
    expect(normalizeName('El Curí')).toBe('el curi');
    expect(normalizeName('  FÓMEQUE ')).toBe('fomeque');
  });
});
