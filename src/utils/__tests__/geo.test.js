import { describe, it, expect } from 'vitest';
import {
  geoJsonToWkt,
  closeRing,
  latLngToPoint,
  latLngsToPolygon,
  wktToGeoJson,
  haversineMeters,
  acceptGpsFix,
  dedupeByMinDistance,
  simplifyDouglasPeucker,
  polygonAreaSqMeters,
  buildWalkPolygon,
  GPS_ACCURACY_THRESHOLD_M,
  GPS_MIN_VERTEX_DISTANCE_M,
} from '../geo.js';

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

// --- Bug #57: mapeo caminando estable ------------------------------------

describe('haversineMeters', () => {
  it('mide ~0 para el mismo punto', () => {
    const p = { lat: 4.5306, lng: -73.9247 };
    expect(haversineMeters(p, p)).toBeCloseTo(0, 5);
  });

  it('mide ~111m por ~0.001° de latitud', () => {
    const a = { lat: 4.53, lng: -73.92 };
    const b = { lat: 4.531, lng: -73.92 };
    // 0.001° lat ≈ 111.32 m
    expect(haversineMeters(a, b)).toBeGreaterThan(105);
    expect(haversineMeters(a, b)).toBeLessThan(118);
  });

  it('es simétrica', () => {
    const a = { lat: 4.53, lng: -73.92 };
    const b = { lat: 4.54, lng: -73.93 };
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });

  it('retorna 0 con argumentos faltantes', () => {
    expect(haversineMeters(null, { lat: 1, lng: 1 })).toBe(0);
  });
});

describe('acceptGpsFix — síntoma (a) línea loca', () => {
  it('acepta el primer fix preciso sin previo', () => {
    const r = acceptGpsFix({ lat: 4.53, lng: -73.92, accuracy: 8, timestamp: 1000 }, null);
    expect(r.accepted).toBe(true);
  });

  it('descarta fix con accuracy peor que el umbral', () => {
    const r = acceptGpsFix(
      { lat: 4.53, lng: -73.92, accuracy: GPS_ACCURACY_THRESHOLD_M + 50, timestamp: 1000 },
      null,
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('accuracy');
  });

  it('acepta fix justo en el umbral', () => {
    const r = acceptGpsFix(
      { lat: 4.53, lng: -73.92, accuracy: GPS_ACCURACY_THRESHOLD_M, timestamp: 1000 },
      null,
    );
    expect(r.accepted).toBe(true);
  });

  it('descarta salto a velocidad imposible (distancia/tiempo)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    // ~111m en 1s = 111 m/s ≫ caminata → rechazado
    const fix = { lat: 4.531, lng: -73.92, accuracy: 8, timestamp: 2000 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('speed');
  });

  it('acepta un paso realista al caminar (~1.4 m/s)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    // ~1.4m en 1s
    const fix = { lat: 4.5300126, lng: -73.92, accuracy: 8, timestamp: 2000 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(true);
    expect(r.distance).toBeGreaterThan(0);
  });

  it('descarta coordenadas no finitas', () => {
    expect(acceptGpsFix({ lat: NaN, lng: -73.92 }, null).accepted).toBe(false);
    expect(acceptGpsFix(null, null).accepted).toBe(false);
  });

  it('acepta fix sin accuracy reportada (navegador la omite)', () => {
    const r = acceptGpsFix({ lat: 4.53, lng: -73.92, timestamp: 1000 }, null);
    expect(r.accepted).toBe(true);
  });
});

describe('dedupeByMinDistance — síntoma (b) jitter casi-duplicado', () => {
  it('colapsa puntos a menos de la distancia mínima', () => {
    const jitter = [
      { lat: 4.53, lng: -73.92 },
      { lat: 4.5300001, lng: -73.92 }, // ~0.1m
      { lat: 4.5300002, lng: -73.92 }, // ~0.2m
      { lat: 4.531, lng: -73.92 }, // ~111m
    ];
    const out = dedupeByMinDistance(jitter);
    expect(out.length).toBe(2);
  });

  it('preserva puntos suficientemente separados', () => {
    const pts = [
      { lat: 4.53, lng: -73.92 },
      { lat: 4.531, lng: -73.92 },
      { lat: 4.532, lng: -73.92 },
    ];
    expect(dedupeByMinDistance(pts).length).toBe(3);
  });

  it('retorna vacio para entrada vacia', () => {
    expect(dedupeByMinDistance([])).toEqual([]);
    expect(dedupeByMinDistance(null)).toEqual([]);
  });
});

describe('simplifyDouglasPeucker — síntoma (b) reducir lados que se cruzan', () => {
  it('elimina puntos colineales dentro de la tolerancia', () => {
    const line = [
      { lat: 4.530, lng: -73.92 },
      { lat: 4.5305, lng: -73.92 }, // medio, sobre la recta
      { lat: 4.531, lng: -73.92 },
    ];
    const out = simplifyDouglasPeucker(line, 2);
    expect(out.length).toBe(2);
  });

  it('conserva un vértice que se desvía más que la tolerancia', () => {
    const corner = [
      { lat: 4.530, lng: -73.92 },
      { lat: 4.5305, lng: -73.9195 }, // pico que se desvía ~55m
      { lat: 4.531, lng: -73.92 },
    ];
    const out = simplifyDouglasPeucker(corner, 2);
    expect(out.length).toBe(3);
  });

  it('devuelve la entrada si tiene 2 o menos puntos', () => {
    const two = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
    expect(simplifyDouglasPeucker(two, 2).length).toBe(2);
  });
});

describe('polygonAreaSqMeters', () => {
  it('calcula el área de un cuadrado de ~111m de lado (~12000 m²)', () => {
    // 0.001° ≈ 111m → área ≈ 111 * 111 ≈ 12300 m²
    const square = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.530, lng: -73.919 },
      { lat: 4.531, lng: -73.919 },
      { lat: 4.531, lng: -73.920 },
    ];
    const area = polygonAreaSqMeters(square);
    expect(area).toBeGreaterThan(11000);
    expect(area).toBeLessThan(13500);
  });

  it('es independiente de la orientación (CW vs CCW)', () => {
    const cw = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.531, lng: -73.920 },
      { lat: 4.531, lng: -73.919 },
      { lat: 4.530, lng: -73.919 },
    ];
    const ccw = [...cw].reverse();
    expect(polygonAreaSqMeters(cw)).toBeCloseTo(polygonAreaSqMeters(ccw), 2);
  });

  it('retorna 0 para un anillo degenerado (línea)', () => {
    const line = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.531, lng: -73.920 },
      { lat: 4.532, lng: -73.920 },
    ];
    expect(polygonAreaSqMeters(line)).toBeCloseTo(0, 0);
  });

  it('retorna 0 con menos de 3 puntos', () => {
    expect(polygonAreaSqMeters([{ lat: 0, lng: 0 }])).toBe(0);
  });
});

describe('buildWalkPolygon — recorrido caminado → anillo estable', () => {
  it('limpia jitter y conserva las esquinas del lote', () => {
    // Recorrido de un cuadrado con jitter denso en cada lado.
    const corners = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
    ];
    const walk = [];
    for (let c = 0; c < corners.length; c += 1) {
      const a = corners[c];
      const b = corners[(c + 1) % corners.length];
      for (let t = 0; t <= 1; t += 0.1) {
        walk.push({
          lat: a.lat + (b.lat - a.lat) * t + (Math.random() - 0.5) * 1e-6,
          lng: a.lng + (b.lng - a.lng) * t + (Math.random() - 0.5) * 1e-6,
        });
      }
    }
    const ring = buildWalkPolygon(walk);
    // 4 esquinas reales (sin cierre duplicado).
    expect(ring.length).toBeGreaterThanOrEqual(4);
    expect(ring.length).toBeLessThan(walk.length); // simplificó
    // El polígono resultante tiene área coherente (no colapsado).
    expect(polygonAreaSqMeters(ring)).toBeGreaterThan(11000);
  });

  it('no deja el primer punto duplicado al final (cierre lo hace closeRing)', () => {
    const square = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
      { lat: 4.53000005, lng: -73.92000005 }, // regreso al inicio (~paso corto)
    ];
    const ring = buildWalkPolygon(square);
    const f = ring[0];
    const l = ring[ring.length - 1];
    expect(haversineMeters(f, l)).toBeGreaterThanOrEqual(GPS_MIN_VERTEX_DISTANCE_M);
  });

  it('devuelve la entrada sin tocar si tiene menos de 3 puntos', () => {
    const two = [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }];
    expect(buildWalkPolygon(two).length).toBe(2);
  });

  it('el anillo limpio serializa a un Polygon WKT cerrado válido', () => {
    const square = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
    ];
    const ring = buildWalkPolygon(square);
    const wkt = geoJsonToWkt(latLngsToPolygon(ring));
    expect(wkt).toContain('POLYGON');
    // closeRing añade el cierre → primer == último en el WKT.
    const coords = wkt.match(/POLYGON\(\((.+)\)\)/)[1].split(',').map((s) => s.trim());
    expect(coords[0]).toBe(coords[coords.length - 1]);
  });
});
