import { describe, it, expect } from 'vitest';
import { geoJsonToWkt, closeRing, latLngToPoint, latLngsToPolygon, wktToGeoJson } from '../geo.js';

describe('geoJsonToWkt', () => {
  it('convierte Point a WKT', () => {
    const g = { type: 'Point', coordinates: [-73.9247, 4.5306] };
    const w = geoJsonToWkt(g);
    expect(w).toContain('POINT');
    expect(w).toContain('-73.9247000');
    expect(w).toContain('4.5306000');
  });

  it('retorna vacio sin geometry', () => {
    expect(geoJsonToWkt(null)).toBe('');
    expect(geoJsonToWkt({})).toBe('');
  });

  it('convierte Polygon a WKT', () => {
    const g = { type: 'Polygon', coordinates: [[[-73.9, 4.5], [-73.8, 4.5], [-73.8, 4.6], [-73.9, 4.5]]] };
    const w = geoJsonToWkt(g);
    expect(w).toContain('POLYGON');
  });

  it('convierte MultiPolygon a WKT', () => {
    const g = {
      type: 'MultiPolygon',
      coordinates: [
        [[[-73.9, 4.5], [-73.8, 4.5], [-73.9, 4.5]]],
        [[[-73.7, 4.4], [-73.6, 4.4], [-73.7, 4.4]]],
      ],
    };
    const w = geoJsonToWkt(g);
    expect(w).toContain('MULTIPOLYGON');
  });
});

describe('closeRing', () => {
  it('cierra ring abierto', () => {
    const ring = [[0, 0], [1, 0], [1, 1]];
    const r = closeRing(ring);
    expect(r.length).toBe(4);
    expect(r[3]).toEqual([0, 0]);
  });

  it('no modifica ring ya cerrado', () => {
    const ring = [[0, 0], [1, 0], [1, 1], [0, 0]];
    expect(closeRing(ring).length).toBe(4);
  });

  it('retorna ring corto sin modificar', () => {
    expect(closeRing([[0, 0]]).length).toBe(1);
  });
});

describe('latLngToPoint', () => {
  it('convierte Leaflet LatLng a GeoJSON Point', () => {
    const r = latLngToPoint({ lat: 4.5, lng: -73.9 });
    expect(r.type).toBe('Point');
    expect(r.coordinates).toEqual([-73.9, 4.5]);
  });
});

describe('latLngsToPolygon', () => {
  it('convierte array de LatLng a GeoJSON Polygon', () => {
    const r = latLngsToPolygon([
      { lat: 4.5, lng: -73.9 },
      { lat: 4.6, lng: -73.8 },
      { lat: 4.5, lng: -73.7 },
    ]);
    expect(r.type).toBe('Polygon');
    expect(r.coordinates[0].length).toBeGreaterThan(0);
  });
});

describe('wktToGeoJson', () => {
  it('parses POINT WKT', () => {
    const r = wktToGeoJson('POINT(-73.9247 4.5306)');
    expect(r.type).toBe('Point');
    expect(r.coordinates[0]).toBeCloseTo(-73.9247);
  });

  it('parses POLYGON WKT', () => {
    const r = wktToGeoJson('POLYGON((-73.9 4.5, -73.8 4.5, -73.9 4.5))');
    expect(r.type).toBe('Polygon');
  });

  it('retorna null para WKT invalido', () => {
    expect(wktToGeoJson('')).toBeNull();
    expect(wktToGeoJson(null)).toBeNull();
    expect(wktToGeoJson('GARBAGE')).toBeNull();
  });
});
