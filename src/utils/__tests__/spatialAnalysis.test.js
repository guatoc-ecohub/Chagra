import { describe, it, expect } from 'vitest';
import { haversineDistance, getCoords, proximityCheck, findNearestLand, checkInvasiveProximity } from '../spatialAnalysis.js';

describe('haversineDistance', () => {
  it('calcula distancia entre dos puntos conocidos', () => {
    // Bogota vs Medellin ~ 245 km
    const d = haversineDistance([-74.0817, 4.7110], [-75.5636, 6.2476]);
    expect(d).toBeGreaterThan(200000);
    expect(d).toBeLessThan(300000);
  });

  it('retorna 0 para mismo punto', () => {
    const d = haversineDistance([-74.0, 4.5], [-74.0, 4.5]);
    expect(d).toBeCloseTo(0, 0);
  });
});

describe('getCoords', () => {
  it('extrae de Point', () => {
    const c = getCoords({ type: 'Point', coordinates: [-74, 4.5] });
    expect(c).toEqual([-74, 4.5]);
  });

  it('extrae centroide de Polygon', () => {
    const c = getCoords({ type: 'Polygon', coordinates: [[[0, 0], [0, 2], [2, 2], [2, 0]]] });
    expect(c[0]).toBeCloseTo(1.0);
    expect(c[1]).toBeCloseTo(1.0);
  });

  it('retorna null para geometry nula', () => {
    expect(getCoords(null)).toBeNull();
    expect(getCoords({})).toBeNull();
  });
});

describe('proximityCheck', () => {
  it('detecta cercania dentro del umbral', () => {
    const pos = { coords: { longitude: -74.0817, latitude: 4.7110 } };
    // Mismo punto, 50m umbral
    const r = proximityCheck(pos, { type: 'Point', coordinates: [-74.0817, 4.7110] }, 50);
    expect(r.isClose).toBe(true);
    expect(r.distance).toBe(0);
  });

  it('detecta lejania', () => {
    const pos = { coords: { longitude: -74.0, latitude: 4.5 } };
    const r = proximityCheck(pos, { type: 'Point', coordinates: [-75.5, 6.2] }, 50);
    expect(r.isClose).toBe(false);
  });
});

describe('findNearestLand', () => {
  it('retorna null sin lands', () => {
    expect(findNearestLand('POINT(-74 4.5)', [])).toBeNull();
  });

  it('retorna la zona mas cercana', () => {
    const lands = [
      { id: 'z1', attributes: { intrinsic_geometry: { value: 'POINT(-74.08 4.71)' } } },
      { id: 'z2', attributes: { intrinsic_geometry: 'POINT(-74.09 4.72)' } },
    ];
    const r = findNearestLand('POINT(-74.08 4.71)', lands);
    expect(r).not.toBeNull();
    expect(r.land.id).toBe('z1');
  });
});

describe('checkInvasiveProximity', () => {
  it('detecta especie invasora cercana', () => {
    const plants = [
      { name: 'Thunbergia alata', attributes: { intrinsic_geometry: 'POINT(-74.08 4.71)' } },
    ];
    const r = checkInvasiveProximity([-74.08, 4.71], plants, 100);
    expect(r.length).toBe(1);
    expect(r[0].distance).toBe(0);
  });

  it('ignora plantas no invasoras', () => {
    const plants = [
      { name: 'Cafe arabica', attributes: { intrinsic_geometry: 'POINT(-74.08 4.71)' } },
    ];
    const r = checkInvasiveProximity([-74.08, 4.71], plants, 10);
    expect(r.length).toBe(0);
  });

  it('ignora plantas lejanas', () => {
    const plants = [
      { name: 'retamo liso', attributes: { intrinsic_geometry: 'POINT(-75.5 6.2)' } },
    ];
    const r = checkInvasiveProximity([-74.0, 4.5], plants, 50);
    expect(r.length).toBe(0);
  });
});
