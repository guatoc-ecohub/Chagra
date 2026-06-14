/**
 * glaciarExport.test.js — validación de exportación GeoJSON de reportes glaciares.
 *
 * RFC 7946:
 *   - Tipo: "FeatureCollection"
 *   - Cada Feature: { type: "Feature", geometry: { type: "Point", coordinates: [lng, lat] }, properties: {...} }
 *   - ORDEN coordinates: [lng, lat] NO [lat, lng]
 *   - SIN miembro "crs"
 *
 * Tests:
 *   - Estructura GeoJSON válida
 *   - Orden lon-lat (NO lat-lon) en coordinates
 *   - Properties completas
 *   - Filtrado de reportes sin coordenadas
 *   - Casos vacíos y edge cases
 */
import { describe, it, expect } from 'vitest';
import { toGeoJSON } from '../glaciarExport';

describe('toGeoJSON — estructura GeoJSON básica', () => {
  it('devuelve un FeatureCollection con type correcto', () => {
    const result = toGeoJSON([]);
    expect(result.type).toBe('FeatureCollection');
    expect(Array.isArray(result.features)).toBe(true);
  });

  it('no incluye miembro "crs" (WGS 84 implícito)', () => {
    const result = toGeoJSON([]);
    expect(result).not.toHaveProperty('crs');
  });

  it('devuelve features vacío si input vacío', () => {
    const result = toGeoJSON([]);
    expect(result.features).toEqual([]);
  });
});

describe('toGeoJSON — orden de coordenadas [lng, lat]', () => {
  it('ORDEN LON-LAT: coordinates = [lng, lat] NO [lat, lng]', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'test-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);
    const coords = result.features[0].geometry.coordinates;
    
    // coords[0] = lng, coords[1] = lat
    expect(coords[0]).toBe(-74.1); // lng
    expect(coords[1]).toBe(4.6);   // lat
  });

  it('coordenadas negativas (hemisferio sur, oeste) mantienen orden', () => {
    const reportes = [
      { lat: -12.5, lng: -77.3, puntoId: 'sur-1', guia: 'Juan', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);
    const coords = result.features[0].geometry.coordinates;
    
    expect(coords[0]).toBe(-77.3); // lng
    expect(coords[1]).toBe(-12.5); // lat
  });

  it('valida que NO sea [lat, lng] (regresión)', () => {
    const reportes = [
      { lat: 6.2, lng: -75.5, puntoId: 'test-2', guia: 'Carlos', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);
    const coords = result.features[0].geometry.coordinates;
    
    // Si fuera [lat, lng], coords[0] sería 6.2 (lat). Pero debe ser -75.5 (lng)
    expect(coords[0]).not.toBe(6.2);
    expect(coords[0]).toBe(-75.5);
  });
});

describe('toGeoJSON — estructura Feature', () => {
  it('cada Feature tiene type "Feature"', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'test-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features[0].type).toBe('Feature');
  });

  it('geometry.type es "Point"', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'test-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features[0].geometry.type).toBe('Point');
  });

  it('geometry.coordinates es array de 2 números', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'test-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);
    const coords = result.features[0].geometry.coordinates;
    
    expect(Array.isArray(coords)).toBe(true);
    expect(coords.length).toBe(2);
    expect(typeof coords[0]).toBe('number');
    expect(typeof coords[1]).toBe('number');
  });
});

describe('toGeoJSON — properties', () => {
  it('properties contiene todos los campos requeridos', () => {
    const reportes = [
      {
        lat: 4.6,
        lng: -74.1,
        puntoId: 'punto-tolima',
        montana: 'tolima',
        guia: 'María',
        fechaISO: '2026-06-14T10:00:00Z',
        altitud: 4900,
        dureza: 'H1',
        tipoSuperficie: 'hielo_glaciar_azul',
        estado: 'estable',
        distanciaBordeHieloM: 15.5,
      },
    ];
    const result = toGeoJSON(reportes);
    const props = result.features[0].properties;

    expect(props).toHaveProperty('puntoId');
    expect(props).toHaveProperty('montana');
    expect(props).toHaveProperty('guia');
    expect(props).toHaveProperty('fechaISO');
    expect(props).toHaveProperty('altitud');
    expect(props).toHaveProperty('dureza');
    expect(props).toHaveProperty('tipoSuperficie');
    expect(props).toHaveProperty('estado');
    expect(props).toHaveProperty('distanciaBordeHieloM');
  });

  it('properties mantienen valores correctos', () => {
    const reportes = [
      {
        lat: 4.6,
        lng: -74.1,
        puntoId: 'punto-tolima',
        montana: 'tolima',
        guia: 'María',
        fechaISO: '2026-06-14T10:00:00Z',
        altitud: 4900,
        dureza: 'H1',
        tipoSuperficie: 'hielo_glaciar_azul',
        estado: 'estable',
        distanciaBordeHieloM: 15.5,
      },
    ];
    const result = toGeoJSON(reportes);
    const props = result.features[0].properties;

    expect(props.puntoId).toBe('punto-tolima');
    expect(props.montana).toBe('tolima');
    expect(props.guia).toBe('María');
    expect(props.fechaISO).toBe('2026-06-14T10:00:00Z');
    expect(props.altitud).toBe(4900);
    expect(props.dureza).toBe('H1');
    expect(props.tipoSuperficie).toBe('hielo_glaciar_azul');
    expect(props.estado).toBe('estable');
    expect(props.distanciaBordeHieloM).toBe(15.5);
  });

  it('properties null si campo ausente en reporte', () => {
    const reportes = [
      {
        lat: 4.6,
        lng: -74.1,
        // sin puntoId, montana, guia, fechaISO, etc.
      },
    ];
    const result = toGeoJSON(reportes);
    const props = result.features[0].properties;

    expect(props.puntoId).toBeNull();
    expect(props.montana).toBeNull();
    expect(props.guia).toBeNull();
    expect(props.fechaISO).toBeNull();
    expect(props.dureza).toBeNull();
    expect(props.tipoSuperficie).toBeNull();
    expect(props.estado).toBeNull();
  });

  it('altitud null si es null en reporte', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, altitud: null },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features[0].properties.altitud).toBeNull();
  });

  it('distanciaBordeHieloM null si es null en reporte', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, distanciaBordeHieloM: null },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features[0].properties.distanciaBordeHieloM).toBeNull();
  });
});

describe('toGeoJSON — filtrado de reportes sin coordenadas', () => {
  it('filtra reportes con lat null', () => {
    const reportes = [
      { lat: null, lng: -74.1, puntoId: 'sin-lat', guia: 'Test' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features).toHaveLength(0);
  });

  it('filtra reportes con lng null', () => {
    const reportes = [
      { lat: 4.6, lng: null, puntoId: 'sin-lng', guia: 'Test' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features).toHaveLength(0);
  });

  it('filtra reportes con lat NaN', () => {
    const reportes = [
      { lat: NaN, lng: -74.1, puntoId: 'lat-nan', guia: 'Test' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features).toHaveLength(0);
  });

  it('filtra reportes con lng NaN', () => {
    const reportes = [
      { lat: 4.6, lng: NaN, puntoId: 'lng-nan', guia: 'Test' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features).toHaveLength(0);
  });

  it('incluye solo reportes con coordenadas válidas (mix)', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'valido-1', guia: 'Test' },
      { lat: null, lng: -74.1, puntoId: 'invalido-1', guia: 'Test' },
      { lat: 5.1, lng: -75.0, puntoId: 'valido-2', guia: 'Test' },
      { lat: 4.6, lng: NaN, puntoId: 'invalido-2', guia: 'Test' },
    ];
    const result = toGeoJSON(reportes);
    expect(result.features).toHaveLength(2);
    expect(result.features[0].properties.puntoId).toBe('valido-1');
    expect(result.features[1].properties.puntoId).toBe('valido-2');
  });
});

describe('toGeoJSON — múltiples reportes', () => {
  it('procesa múltiples reportes correctamente', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'punto-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
      { lat: 5.1, lng: -75.0, puntoId: 'punto-2', guia: 'Juan', fechaISO: '2026-06-14T11:00:00Z' },
      { lat: 6.2, lng: -76.5, puntoId: 'punto-3', guia: 'Carlos', fechaISO: '2026-06-14T12:00:00Z' },
    ];
    const result = toGeoJSON(reportes);

    expect(result.features).toHaveLength(3);
    expect(result.features[0].properties.puntoId).toBe('punto-1');
    expect(result.features[1].properties.puntoId).toBe('punto-2');
    expect(result.features[2].properties.puntoId).toBe('punto-3');
  });

  it('cada Feature mantiene coordenadas independientes', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'punto-1', guia: 'María' },
      { lat: 5.1, lng: -75.0, puntoId: 'punto-2', guia: 'Juan' },
    ];
    const result = toGeoJSON(reportes);

    expect(result.features[0].geometry.coordinates).toEqual([-74.1, 4.6]);
    expect(result.features[1].geometry.coordinates).toEqual([-75.0, 5.1]);
  });
});

describe('toGeoJSON — robustez', () => {
  it('es pura: mismo input → mismo output', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'test-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result1 = toGeoJSON(reportes);
    const result2 = toGeoJSON(reportes);
    expect(result1).toEqual(result2);
  });

  it('tolera input undefined (array vacío)', () => {
    const result = toGeoJSON(undefined);
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toEqual([]);
  });

  it('tolera input null (array vacío)', () => {
    const result = toGeoJSON(null);
    expect(result.type).toBe('FeatureCollection');
    expect(result.features).toEqual([]);
  });
});

describe('toGeoJSON — compliance RFC 7946', () => {
  it('GeoJSON válido: tiene type, features (mínimo)', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'test-1', guia: 'María', fechaISO: '2026-06-14T10:00:00Z' },
    ];
    const result = toGeoJSON(reportes);

    // GeoJSON raíz
    expect(result).toHaveProperty('type');
    expect(result).toHaveProperty('features');

    // Feature válido
    const feature = result.features[0];
    expect(feature).toHaveProperty('type');
    expect(feature).toHaveProperty('geometry');
    expect(feature).toHaveProperty('properties');

    // Geometry válida
    expect(feature.geometry).toHaveProperty('type');
    expect(feature.geometry).toHaveProperty('coordinates');
  });

  it('FeatureCollection con múltiples Features válido', () => {
    const reportes = [
      { lat: 4.6, lng: -74.1, puntoId: 'p1', guia: 'A', fechaISO: '2026-06-14T10:00:00Z' },
      { lat: 5.1, lng: -75.0, puntoId: 'p2', guia: 'B', fechaISO: '2026-06-14T11:00:00Z' },
    ];
    const result = toGeoJSON(reportes);

    expect(result.features).toHaveLength(2);
    result.features.forEach((feature) => {
      expect(feature.type).toBe('Feature');
      expect(feature.geometry.type).toBe('Point');
      expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
      expect(feature.geometry.coordinates).toHaveLength(2);
      expect(typeof feature.properties).toBe('object');
    });
  });
});