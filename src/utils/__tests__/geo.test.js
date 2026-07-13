import { describe, it, expect } from 'vitest';
import {
  geoJsonToWkt,
  closeRing,
  latLngToPoint,
  latLngsToPolygon,
  wktToGeoJson,
  haversineMeters,
  acceptGpsFix,
  warmupDecision,
  dedupeByMinDistance,
  simplifyDouglasPeucker,
  polygonAreaSqMeters,
  buildWalkPolygon,
  GPS_ACCURACY_THRESHOLD_M,
  GPS_MIN_VERTEX_DISTANCE_M,
  GPS_MAX_JUMP_DISTANCE_M,
  GPS_WARMUP_ACCURACY_M,
  GPS_WARMUP_NO_ACCURACY_LIMIT,
  GPS_MAX_WALK_SPEED_MPS,
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
    expect(haversineMeters(/** @type {any} */ (null), { lat: 1, lng: 1 })).toBe(0);
  });
});

describe('acceptGpsFix — síntoma (a) línea loca', () => {
  // --- Primer fix (sin previo) --------------------------------------------------
  it('acepta el primer fix preciso sin previo', () => {
    const r = acceptGpsFix({ lat: 4.53, lng: -73.92, accuracy: 8, timestamp: 1000 }, null);
    expect(r.accepted).toBe(true);
    expect(r.reason).toBeNull();
    expect(r.distance).toBe(0);
  });

  it('acepta el primer fix sin accuracy reportada (navegador la omite)', () => {
    const r = acceptGpsFix({ lat: 4.53, lng: -73.92, timestamp: 1000 }, null);
    expect(r.accepted).toBe(true);
  });

  // --- Rechazo por accuracy -----------------------------------------------------
  it('descarta fix con accuracy peor que el umbral', () => {
    const r = acceptGpsFix(
      { lat: 4.53, lng: -73.92, accuracy: GPS_ACCURACY_THRESHOLD_M + 50, timestamp: 1000 },
      null,
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('accuracy');
  });

  it('descarta fix con accuracy exactamente una unidad sobre el umbral', () => {
    const r = acceptGpsFix(
      { lat: 4.53, lng: -73.92, accuracy: GPS_ACCURACY_THRESHOLD_M + 0.001, timestamp: 1000 },
      null,
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('accuracy');
  });

  it('acepta fix justo en el umbral de accuracy (≤)', () => {
    const r = acceptGpsFix(
      { lat: 4.53, lng: -73.92, accuracy: GPS_ACCURACY_THRESHOLD_M, timestamp: 1000 },
      null,
    );
    expect(r.accepted).toBe(true);
  });

  it('acepta fix con accuracy muy buena (1m)', () => {
    const r = acceptGpsFix({ lat: 4.53, lng: -73.92, accuracy: 1, timestamp: 1000 }, null);
    expect(r.accepted).toBe(true);
  });

  // --- Umbral personalizado -----------------------------------------------------
  it('respeta accuracyThreshold personalizado en opts', () => {
    const r = acceptGpsFix(
      { lat: 4.53, lng: -73.92, accuracy: 30, timestamp: 1000 },
      null,
      { accuracyThreshold: 10 },
    );
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('accuracy');
  });

  // --- Rechazo por velocidad ----------------------------------------------------
  it('descarta salto a velocidad imposible (~111 m/s ≫ 5 m/s)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    const fix = { lat: 4.531, lng: -73.92, accuracy: 8, timestamp: 2000 }; // ~111m en 1s
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('speed');
    expect(r.distance).toBeGreaterThan(100);
  });

  it('descarta velocidad justo por encima del umbral (>5 m/s)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 0 };
    // ~5.5m en 1s → speed=5.5 > 5
    const fix = { lat: 4.53005, lng: -73.92, accuracy: 8, timestamp: 1000 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('speed');
  });

  it('acepta velocidad justo en el umbral (≤5 m/s)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 0 };
    // ~4.4m en 1s → speed≈4.4 ≤ 5 → aceptado
    const fix = { lat: 4.530040, lng: -73.92, accuracy: 8, timestamp: 1000 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(true);
    expect(r.reason).toBeNull();
  });

  it('acepta un paso realista al caminar (~1.4 m/s)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    const fix = { lat: 4.5300126, lng: -73.92, accuracy: 8, timestamp: 2000 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(true);
    expect(r.distance).toBeGreaterThan(0);
    expect(r.distance).toBeLessThan(5);
  });

  it('respeta maxSpeed personalizado en opts', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 0 };
    // ~6m en 1s → con maxSpeed=3 debe rechazar
    const fix = { lat: 4.530054, lng: -73.92, accuracy: 8, timestamp: 1000 };
    const r = acceptGpsFix(fix, prev, { maxSpeed: 3 });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('speed');
  });

  // --- Fallback: salto sin timestamps (bug #57 fix) -----------------------------
  it('descarta salto >50m cuando no hay timestamps (fallback jump)', () => {
    const prev = { lat: 4.53, lng: -73.92 };
    // ~111m de salto sin timestamp
    const fix = { lat: 4.531, lng: -73.92, accuracy: 8 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('jump');
    expect(r.distance).toBeGreaterThan(50);
  });

  it('acepta distancia ≤maxJumpDistance sin timestamps', () => {
    const prev = { lat: 4.53, lng: -73.92 };
    // ~0.5m → dentro del límite
    const fix = { lat: 4.5300045, lng: -73.92, accuracy: 8 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(true);
    expect(r.reason).toBeNull();
  });

  it('descarta salto justo por encima de maxJumpDistance sin timestamps', () => {
    const prev = { lat: 4.53, lng: -73.92 };
    // ~55m → > 50m threshold
    const fix = { lat: 4.530497, lng: -73.92, accuracy: 8 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('jump');
  });

  it('usa velocidad sobre jump cuando hay timestamps válidos', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    // ~5.5m en 1s → velocidad 5.5 > 5, pero distancia < 50m. Debe rechazar
    // por speed, no por jump (speed es más preciso cuando hay timestamps).
    const fix = { lat: 4.53005, lng: -73.92, accuracy: 8, timestamp: 2000 };
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('speed');
  });

  it('respeta maxJumpDistance personalizado en opts', () => {
    const prev = { lat: 4.53, lng: -73.92 };
    // ~20m → rechazado con threshold=10
    const fix = { lat: 4.53018, lng: -73.92, accuracy: 8 };
    const r = acceptGpsFix(fix, prev, { maxJumpDistance: 10 });
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('jump');
  });

  // --- Timestamps no consistentes -----------------------------------------------
  it('ignora velocidad cuando prev no tiene timestamp (cae a jump)', () => {
    const prev = { lat: 4.53, lng: -73.92 }; // sin timestamp
    const fix = { lat: 4.531, lng: -73.92, accuracy: 8, timestamp: 2000 };
    const r = acceptGpsFix(fix, prev);
    // distancia >50m → jump rechazado
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('jump');
  });

  it('ignora velocidad cuando fix no tiene timestamp (cae a jump)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    const fix = { lat: 4.531, lng: -73.92, accuracy: 8 }; // sin timestamp
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('jump');
  });

  it('ignora velocidad con dtMs <= 0 (timestamp regresivo o igual)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 2000 };
    const fix = { lat: 4.531, lng: -73.92, accuracy: 8, timestamp: 1000 }; // dtMs = -1000
    const r = acceptGpsFix(fix, prev);
    // dtMs <= 0 → sin speed check, cae a jump (distancia >50m → rechazado)
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('jump');
  });

  it('acepta dtMs=0 si la distancia es razonable (cae a jump con distancia pequeña)', () => {
    const prev = { lat: 4.53, lng: -73.92, timestamp: 1000 };
    const fix = { lat: 4.530001, lng: -73.92, accuracy: 8, timestamp: 1000 }; // mismo timestamp
    const r = acceptGpsFix(fix, prev);
    expect(r.accepted).toBe(true);
    expect(r.reason).toBeNull();
  });

  // --- Fix inválido -------------------------------------------------------------
  it('descarta coordenadas no finitas', () => {
    expect(acceptGpsFix(/** @type {any} */ ({ lat: NaN, lng: -73.92 }), null).accepted).toBe(false);
    expect(acceptGpsFix(/** @type {any} */ ({ lat: NaN, lng: -73.92 }), null).reason).toBe('invalid');
    expect(acceptGpsFix(/** @type {any} */ (null), null).accepted).toBe(false);
    expect(acceptGpsFix(/** @type {any} */ (null), null).reason).toBe('invalid');
    expect(acceptGpsFix(/** @type {any} */ (undefined), null).accepted).toBe(false);
  });

  it('descarta fix sin lat o lng pero con otros campos', () => {
    expect(acceptGpsFix({ accuracy: 8, timestamp: 1000 }, null).accepted).toBe(false);
    expect(acceptGpsFix({ lat: 1 }, null).accepted).toBe(false);
    expect(acceptGpsFix({ lng: 1 }, null).accepted).toBe(false);
  });

  // --- Simulación de sesión real de trazo caminando -----------------------------
  it('simula sesión de trazo: rechaza línea loca y acepta pasos reales', () => {
    const session = [
      { lat: 4.530000, lng: -73.920000, accuracy: 5, timestamp: 0 },     // t=0: ancla
      { lat: 4.530010, lng: -73.920000, accuracy: 6, timestamp: 1000 },   // t=1s: paso ~1.1m ✓
      { lat: 4.530020, lng: -73.920000, accuracy: 30, timestamp: 2000 },  // t=2s: accuracy mala ✗
      { lat: 4.531000, lng: -73.920000, accuracy: 5, timestamp: 3000 },   // t=3s: salto ~111m en 1s ✗
      { lat: 4.530030, lng: -73.920000, accuracy: 7, timestamp: 4000 },   // t=4s: paso ~1.1m ✓
      { lat: 4.530040, lng: -73.920000, accuracy: 8, timestamp: 5000 },   // t=5s: paso ~1.1m ✓
    ];
    let prev = null;
    const accepted = [];
    for (const fix of session) {
      const r = acceptGpsFix(fix, prev);
      if (r.accepted) {
        accepted.push(fix);
        prev = fix;
      }
    }
    // Deben aceptarse: t=0 (ancla), t=1s, t=4s, t=5s = 4 fixes.
    // Rechazados: t=2s (accuracy), t=3s (speed).
    expect(accepted.length).toBe(4);
    expect(accepted[0].timestamp).toBe(0);
    expect(accepted[1].timestamp).toBe(1000);
    expect(accepted[2].timestamp).toBe(4000);
    expect(accepted[3].timestamp).toBe(5000);
  });
});

describe('warmupDecision — síntoma (c) precisión 1ª corrida', () => {
  it('termina el warm-up cuando la accuracy converge (≤ umbral)', () => {
    const d = warmupDecision({ accuracy: GPS_WARMUP_ACCURACY_M });
    expect(d.warmedUp).toBe(true);
    expect(d.reason).toBe('converged');
  });

  it('termina el warm-up con accuracy buena (5m)', () => {
    expect(warmupDecision({ accuracy: 5 }).warmedUp).toBe(true);
  });

  it('NO termina el warm-up con accuracy imprecisa (> umbral)', () => {
    const d = warmupDecision({ accuracy: GPS_WARMUP_ACCURACY_M + 1 });
    expect(d.warmedUp).toBe(false);
    expect(d.reason).toBe('imprecise');
  });

  // --- El bug residual: fix SIN accuracy reportada ------------------------------
  it('NO ancla con un fix sin accuracy en el primer intento (bug #57c residual)', () => {
    // Antes: la condición finita era falsa → warm-up terminaba y anclaba en el
    // cold-start grueso. Ahora seguimos esperando precisión verificable.
    const d = warmupDecision({}, { noAccuracyCount: 0 });
    expect(d.warmedUp).toBe(false);
    expect(d.reason).toBe('no-accuracy');
  });

  it('NO ancla con accuracy undefined/NaN explícitos', () => {
    expect(warmupDecision({ accuracy: undefined }).warmedUp).toBe(false);
    expect(warmupDecision({ accuracy: NaN }).warmedUp).toBe(false);
    expect(warmupDecision(/** @type {any} */ (null)).warmedUp).toBe(false);
  });

  it('cae a fallback tras el límite de fixes sin accuracy (no cuelga el warm-up)', () => {
    // En el penúltimo intento todavía espera; al alcanzar el límite, ancla.
    const justBefore = warmupDecision({}, { noAccuracyCount: GPS_WARMUP_NO_ACCURACY_LIMIT - 2 });
    expect(justBefore.warmedUp).toBe(false);
    const atLimit = warmupDecision({}, { noAccuracyCount: GPS_WARMUP_NO_ACCURACY_LIMIT - 1 });
    expect(atLimit.warmedUp).toBe(true);
    expect(atLimit.reason).toBe('fallback');
  });

  it('una accuracy buena gana al fallback aunque ya haya muchos fixes sin accuracy', () => {
    const d = warmupDecision({ accuracy: 8 }, { noAccuracyCount: 99 });
    expect(d.warmedUp).toBe(true);
    expect(d.reason).toBe('converged');
  });

  it('respeta warmupAccuracy personalizado en opts', () => {
    expect(warmupDecision({ accuracy: 12 }, { warmupAccuracy: 10 }).warmedUp).toBe(false);
    expect(warmupDecision({ accuracy: 9 }, { warmupAccuracy: 10 }).warmedUp).toBe(true);
  });

  it('respeta noAccuracyLimit personalizado en opts', () => {
    expect(warmupDecision({}, { noAccuracyCount: 1, noAccuracyLimit: 3 }).warmedUp).toBe(false);
    expect(warmupDecision({}, { noAccuracyCount: 2, noAccuracyLimit: 3 }).warmedUp).toBe(true);
  });

  it('simula warm-up con primeros fixes SIN accuracy: NO ancla en el cold-start grueso', () => {
    // Escenario del bug: navegador que omite accuracy en los primeros fixes
    // (cold-start), luego empieza a reportarla. El ancla debe ser el primer
    // fix con accuracy verificablemente buena, no el primero a ciegas.
    const session = [
      { lat: 4.5200, lng: -73.9100 },                 // sin accuracy (cold-start lejano)
      { lat: 4.5250, lng: -73.9150 },                 // sin accuracy
      { lat: 4.5300, lng: -73.9200, accuracy: 40 },   // accuracy mala
      { lat: 4.5300, lng: -73.9200, accuracy: 12 },   // ✓ converge aquí
    ];
    let warmedUp = false;
    let noAccCount = 0;
    let anchor = null;
    for (const fix of session) {
      if (warmedUp) break;
      const d = warmupDecision(fix, { noAccuracyCount: noAccCount });
      if (d.warmedUp) {
        warmedUp = true;
        anchor = fix;
      } else if (!Number.isFinite(fix.accuracy)) {
        noAccCount += 1;
      }
    }
    expect(warmedUp).toBe(true);
    expect(/** @type {any} */ (anchor).accuracy).toBe(12); // ancló en el fix preciso, no en el ciego
  });
});

describe('dedupeByMinDistance — síntoma (b) jitter casi-duplicado', () => {
  it('colapsa puntos a menos de la distancia mínima (default 3m)', () => {
    const jitter = [
      { lat: 4.53, lng: -73.92 },
      { lat: 4.5300001, lng: -73.92 }, // ~0.01m
      { lat: 4.5300002, lng: -73.92 }, // ~0.02m
      { lat: 4.531, lng: -73.92 },     // ~111m
    ];
    const out = dedupeByMinDistance(jitter);
    expect(out.length).toBe(2);
    expect(out[0]).toEqual({ lat: 4.53, lng: -73.92 });
    expect(out[1]).toEqual({ lat: 4.531, lng: -73.92 });
  });

  it('preserva puntos suficientemente separados (>3m)', () => {
    const pts = [
      { lat: 4.53, lng: -73.92 },
      { lat: 4.531, lng: -73.92 }, // ~111m
      { lat: 4.532, lng: -73.92 }, // ~111m más
    ];
    expect(dedupeByMinDistance(pts).length).toBe(3);
  });

  it('retorna array vacío para entrada vacía', () => {
    expect(dedupeByMinDistance([])).toEqual([]);
    expect(dedupeByMinDistance(null)).toEqual([]);
    expect(dedupeByMinDistance(undefined)).toEqual([]);
    expect(dedupeByMinDistance(/** @type {any} */ ('no-array'))).toEqual([]);
  });

  it('retorna el único punto para array de 1 elemento', () => {
    const single = [{ lat: 4.53, lng: -73.92 }];
    const out = dedupeByMinDistance(single);
    expect(out.length).toBe(1);
    expect(out[0]).toEqual(single[0]);
  });

  it('respeta minDistance personalizado', () => {
    const pts = [
      { lat: 4.53, lng: -73.92 },
      { lat: 4.5305, lng: -73.92 }, // ~55m — se mantiene con threshold 3m, se borra con 100m
      { lat: 4.532, lng: -73.92 },  // ~222m
    ];
    // Con threshold 3m: 3 puntos (todos separados >3m)
    expect(dedupeByMinDistance(pts, 3).length).toBe(3);
    // Con threshold 100m: solo 2 puntos (el del medio está a 55m del primero <100m)
    expect(dedupeByMinDistance(pts, 100).length).toBe(2);
  });

  it('elimina múltiples puntos consecutivos con jitter (polígono rayado)', () => {
    // Simula 50 puntos de jitter GPS estando quieto, luego un movimiento real
    const jitterCluster = [];
    for (let i = 0; i < 50; i += 1) {
      jitterCluster.push({
        lat: 4.53 + (Math.random() - 0.5) * 1e-6,
        lng: -73.92 + (Math.random() - 0.5) * 1e-6,
      });
    }
    jitterCluster.push({ lat: 4.531, lng: -73.92 }); // movimiento real
    const out = dedupeByMinDistance(jitterCluster);
    // Debe quedar: primer punto del cluster + el movimiento real = 2
    expect(out.length).toBe(2);
    expect(out[1]).toEqual({ lat: 4.531, lng: -73.92 });
  });

  it('no muta el array original', () => {
    const original = [
      { lat: 4.53, lng: -73.92 },
      { lat: 4.5300001, lng: -73.92 },
    ];
    const copy = [...original];
    dedupeByMinDistance(original);
    expect(original).toEqual(copy);
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
    expect(simplifyDouglasPeucker([], 2).length).toBe(0);
    expect(simplifyDouglasPeucker(null, 2).length).toBe(0);
    expect(simplifyDouglasPeucker(undefined, 2).length).toBe(0);
    expect(simplifyDouglasPeucker([{ lat: 0, lng: 0 }], 2).length).toBe(1);
    expect(simplifyDouglasPeucker([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }], 2).length).toBe(2);
  });

  it('conserva el primer y último punto siempre', () => {
    const line = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.530, lng: -73.919 },
      { lat: 4.530, lng: -73.918 },
      { lat: 4.531, lng: -73.918 },
      { lat: 4.531, lng: -73.917 },
    ];
    const out = simplifyDouglasPeucker(line, 1);
    expect(out[0]).toEqual(line[0]);
    expect(out[out.length - 1]).toEqual(line[line.length - 1]);
  });

  it('reduce drásticamente un camino con mucho jitter (polígono rayado)', () => {
    // Simula un cuadrado de ~111m de lado con 100 puntos de jitter por lado
    const corners = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
    ];
    const noisy = [];
    for (let c = 0; c < corners.length; c += 1) {
      const a = corners[c];
      const b = corners[(c + 1) % corners.length];
      for (let i = 0; i < 25; i += 1) {
        const t = i / 25;
        noisy.push({
          lat: a.lat + (b.lat - a.lat) * t + (Math.random() - 0.5) * 2e-6,
          lng: a.lng + (b.lng - a.lng) * t + (Math.random() - 0.5) * 2e-6,
        });
      }
    }
    noisy.push(noisy[0]); // cerrar
    const simplified = simplifyDouglasPeucker(noisy, 5);
    // Debe reducir los 101 puntos a mucho menos (idealmente ~4-8)
    expect(simplified.length).toBeLessThan(20);
    expect(simplified.length).toBeGreaterThanOrEqual(2);
  });

  it('no muta el array original', () => {
    const original = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.5305, lng: -73.920 },
      { lat: 4.531, lng: -73.920 },
    ];
    const copy = JSON.parse(JSON.stringify(original));
    simplifyDouglasPeucker(original, 2);
    expect(original).toEqual(copy);
  });
});

describe('polygonAreaSqMeters', () => {
  it('calcula el área de un cuadrado de ~111m de lado (~12300 m²)', () => {
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

  it('calcula área de un triángulo rectángulo ~111m de catetos (~6170 m²)', () => {
    const triangle = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.530, lng: -73.919 },
      { lat: 4.531, lng: -73.920 },
    ];
    const area = polygonAreaSqMeters(triangle);
    expect(area).toBeGreaterThan(5000);
    expect(area).toBeLessThan(7000);
    // Área teórica: 0.5 * 111 * 111 ≈ 6172
    expect(area).toBeCloseTo(6172, -2); // precisión de centenas
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

  it('retorna 0 para un anillo degenerado (línea colineal)', () => {
    const line = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.531, lng: -73.920 },
      { lat: 4.532, lng: -73.920 },
    ];
    expect(polygonAreaSqMeters(line)).toBeCloseTo(0, 0);
  });

  it('retorna 0 con menos de 3 puntos', () => {
    expect(polygonAreaSqMeters([])).toBe(0);
    expect(polygonAreaSqMeters(null)).toBe(0);
    expect(polygonAreaSqMeters([{ lat: 0, lng: 0 }])).toBe(0);
    expect(polygonAreaSqMeters([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])).toBe(0);
  });

  it('área de anillo cerrado (primer==último) es igual a área de anillo abierto', () => {
    const open = [
      { lat: 4.530, lng: -73.920 },
      { lat: 4.530, lng: -73.919 },
      { lat: 4.531, lng: -73.919 },
      { lat: 4.531, lng: -73.920 },
    ];
    const closed = [...open, open[0]];
    expect(polygonAreaSqMeters(open)).toBeCloseTo(polygonAreaSqMeters(closed), 1);
  });

  it('área de un lote realista (~1 ha, 10000 m²)', () => {
    // ~100m x 100m
    const lote = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9191 }, // ~100m E
      { lat: 4.5309, lng: -73.9191 }, // ~100m N
      { lat: 4.5309, lng: -73.9200 }, // ~100m W
    ];
    const area = polygonAreaSqMeters(lote);
    expect(area).toBeGreaterThan(8000);
    expect(area).toBeLessThan(12000);
  });
});

describe('buildWalkPolygon — recorrido caminado → anillo estable', () => {
  it('limpia jitter y conserva las esquinas del lote', () => {
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
    expect(ring.length).toBeGreaterThanOrEqual(4);
    expect(ring.length).toBeLessThan(walk.length);
    expect(polygonAreaSqMeters(ring)).toBeGreaterThan(11000);
  });

  it('no deja el primer punto duplicado al final (cierre lo hace closeRing)', () => {
    const square = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
      { lat: 4.53000001, lng: -73.92000001 }, // regreso al inicio (~paso corto <3m)
    ];
    const ring = buildWalkPolygon(square);
    const f = ring[0];
    const l = ring[ring.length - 1];
    expect(haversineMeters(f, l)).toBeGreaterThanOrEqual(GPS_MIN_VERTEX_DISTANCE_M);
  });

  it('devuelve la entrada sin tocar si tiene menos de 3 puntos', () => {
    expect(buildWalkPolygon([]).length).toBe(0);
    expect(buildWalkPolygon(null)).toEqual([]);
    expect(buildWalkPolygon(undefined)).toEqual([]);
    expect(buildWalkPolygon([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]).length).toBe(2);
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
    const coords = (/** @type {string} */ (wkt)).match(/POLYGON\(\((.+)\)\)/)[1].split(',').map((s) => s.trim());
    expect(coords[0]).toBe(coords[coords.length - 1]);
  });

  it('respeta minDistance y toleranceM personalizados', () => {
    const square = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
    ];
    const aggressive = buildWalkPolygon(square, { minDistance: 50, toleranceM: 30 });
    // Con thresholds muy agresivos, puede quedar reducido a pocos puntos
    expect(aggressive.length).toBeGreaterThanOrEqual(2);
    expect(aggressive.length).toBeLessThanOrEqual(4);
  });

  it('no elimina la cola si el regreso al inicio está lejos (>minDistance)', () => {
    const squareSinCerrar = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9190 },
      { lat: 4.5310, lng: -73.9200 },
    ];
    // El último punto está a ~111m del primero → no se elimina
    const ring = buildWalkPolygon(squareSinCerrar);
    expect(ring.length).toBe(4);
  });

  it('produce un anillo con área no colapsada (no degenera)', () => {
    // Recorrido realista de un triángulo con jitter fuerte
    const triangle = [
      { lat: 4.5300, lng: -73.9200 },
      { lat: 4.5301, lng: -73.9200 },
      { lat: 4.5302, lng: -73.9200 },
      { lat: 4.5303, lng: -73.9200 },
      { lat: 4.5304, lng: -73.9200 },
      { lat: 4.5304, lng: -73.9190 },
      { lat: 4.5304, lng: -73.9180 },
      { lat: 4.5304, lng: -73.9170 },
      { lat: 4.5300, lng: -73.9190 },
      { lat: 4.5300, lng: -73.9180 },
      { lat: 4.5300, lng: -73.9170 },
    ];
    const ring = buildWalkPolygon(triangle);
    expect(ring.length).toBeGreaterThanOrEqual(3);
    // El área debe ser > 0 (no colapsó a línea)
    expect(polygonAreaSqMeters(ring)).toBeGreaterThan(100);
  });
});

// --- Bug #57(c): simulacro completo de warm-up GPS + trazo caminando ------------

describe('ciclo completo trazo caminando — warm-up + filtros + build', () => {
  /**
   * Simula la sesión completa como la ejecuta MapPicker.jsx:
   * 1. Warm-up: descartar fixes con accuracy > GPS_WARMUP_ACCURACY_M hasta que
   *    el GPS converja.
   * 2. Trazo: acceptGpsFix filtra línea loca (accuracy, speed, jump).
   * 3. Final: buildWalkPolygon limpia jitter y entrega anillo estable.
   */
  it('descarta fixes imprecisos durante warm-up y ancla con el primer fix bueno', () => {
    const warmupSession = [
      { lat: 4.5300, lng: -73.9200, accuracy: 45, timestamp: 0 },     // malo (warm-up: >20m)
      { lat: 4.5305, lng: -73.9205, accuracy: 35, timestamp: 1000 },   // malo
      { lat: 4.5310, lng: -73.9210, accuracy: 22, timestamp: 2000 },   // malo (22 > 20)
      { lat: 4.5312, lng: -73.9210, accuracy: 18, timestamp: 3000 },   // ✓ warm-up termina aquí
      { lat: 4.53124, lng: -73.9210, accuracy: 15, timestamp: 4000 },  // ✓ paso ~4.4m en 1s → aceptado
    ];

    let warmedUp = false;
    let prev = null;
    const traced = [];

    for (const fix of warmupSession) {
      // Warm-up check (idéntico a MapPicker.jsx lógica)
      if (!warmedUp) {
        if (Number.isFinite(fix.accuracy) && fix.accuracy > GPS_WARMUP_ACCURACY_M) {
          continue; // ignorar, GPS no ha convergido
        }
        warmedUp = true;
        // El primer fix que pasa warm-up es el ancla
        prev = fix;
        traced.push({ lat: fix.lat, lng: fix.lng });
        continue;
      }
      // Trazo normal con filtros
      const verdict = acceptGpsFix(fix, prev);
      if (verdict.accepted) {
        prev = fix;
        traced.push({ lat: fix.lat, lng: fix.lng });
      }
    }

    // Solo los últimos 2 fixes deben pasar (accuracy ≤20m)
    expect(traced.length).toBe(2);
    expect(traced[0].lat).toBeCloseTo(4.5312, 4);
    expect(traced[1].lat).toBeCloseTo(4.53124, 4);
  });

  it('ciclo completo: warm-up + trazo + build → anillo estable con área coherente', () => {
    // Recorrido completo de un cuadrado de ~111m con:
    // - 3 fixes malos de warm-up
    // - jitter en cada lado
    // - 1 salto loco en la mitad
    // - accuracy mala en un punto

    // Generar recorrido con ruido
    const rawFixes = [];

    // Warm-up: 3 fixes malos (accuracy >20m)
    rawFixes.push({ lat: 4.5200, lng: -73.9100, accuracy: 50, timestamp: 0 });
    rawFixes.push({ lat: 4.5250, lng: -73.9150, accuracy: 40, timestamp: 1000 });
    rawFixes.push({ lat: 4.5280, lng: -73.9180, accuracy: 25, timestamp: 2000 });

    // Warm-up termina: primer fix bueno
    rawFixes.push({ lat: 4.5300, lng: -73.9200, accuracy: 15, timestamp: 3000 });

    // Lado 1 con jitter (sur → este). ~11m c/3s ≈ 3.7 m/s → aceptado.
    for (let t = 1; t <= 10; t += 1) {
      rawFixes.push({
        lat: 4.5300 + (Math.random() - 0.5) * 1e-7,
        lng: -73.9200 + t * 0.0001 + (Math.random() - 0.5) * 1e-7,
        accuracy: 6 + Math.random() * 4,
        timestamp: 3000 + t * 3000,
      });
    }

    // Línea loca: salto falso (~111m en 1s → rechazado por speed)
    rawFixes.push({ lat: 4.5400, lng: -73.9100, accuracy: 3, timestamp: 36000 });

    // Lado 2 (este → norte)
    for (let t = 1; t <= 10; t += 1) {
      rawFixes.push({
        lat: 4.5300 + t * 0.0001 + (Math.random() - 0.5) * 1e-7,
        lng: -73.9190 + (Math.random() - 0.5) * 1e-7,
        accuracy: 6 + Math.random() * 4,
        timestamp: 37000 + t * 3000,
      });
    }

    // Fix con accuracy mala
    rawFixes.push({ lat: 4.5305, lng: -73.9180, accuracy: 50, timestamp: 68000 });

    // Lado 3 (norte → oeste)
    for (let t = 1; t <= 10; t += 1) {
      rawFixes.push({
        lat: 4.5310 + (Math.random() - 0.5) * 1e-7,
        lng: -73.9190 - t * 0.0001 + (Math.random() - 0.5) * 1e-7,
        accuracy: 6 + Math.random() * 4,
        timestamp: 69000 + t * 3000,
      });
    }

    // Lado 4 (oeste → sur, cierre)
    for (let t = 1; t <= 10; t += 1) {
      rawFixes.push({
        lat: 4.5310 - t * 0.0001 + (Math.random() - 0.5) * 1e-7,
        lng: -73.9200 + (Math.random() - 0.5) * 1e-7,
        accuracy: 6 + Math.random() * 4,
        timestamp: 100000 + t * 3000,
      });
    }

    // Simular el ciclo
    let warmedUp = false;
    let prev = null;
    const traced = [];

    for (const fix of rawFixes) {
      if (!warmedUp) {
        if (Number.isFinite(fix.accuracy) && fix.accuracy > GPS_WARMUP_ACCURACY_M) {
          continue;
        }
        warmedUp = true;
        prev = fix;
        traced.push({ lat: fix.lat, lng: fix.lng });
        continue;
      }
      const verdict = acceptGpsFix(fix, prev);
      if (verdict.accepted) {
        prev = fix;
        traced.push({ lat: fix.lat, lng: fix.lng });
      }
    }

    // Verificar que se trazaron suficientes puntos (>3 para un polígono)
    expect(traced.length).toBeGreaterThan(3);

    // Construir el anillo final
    const ring = buildWalkPolygon(traced);

    // Verificar que el anillo es estable
    expect(ring.length).toBeGreaterThanOrEqual(3);
    expect(ring.length).toBeLessThan(traced.length); // simplificó

    // El área debe ser coherente (~12300 m² para 0.001° x 0.001°)
    const area = polygonAreaSqMeters(ring);
    expect(area).toBeGreaterThan(5000);
    expect(area).toBeLessThan(20000);

    // El anillo serializa correctamente a WKT
    if (ring.length >= 3) {
      const wkt = geoJsonToWkt(latLngsToPolygon(ring));
      expect(wkt).toContain('POLYGON');
    }
  });

  it('si el warm-up nunca converge (todos los fixes accuracy >20m), no traza nada', () => {
    const allBad = [
      { lat: 4.53, lng: -73.92, accuracy: 45, timestamp: 0 },
      { lat: 4.53, lng: -73.92, accuracy: 35, timestamp: 1000 },
      { lat: 4.53, lng: -73.92, accuracy: 30, timestamp: 2000 },
    ];

    let warmedUp = false;
    const traced = [];

    for (const fix of allBad) {
      if (!warmedUp) {
        if (Number.isFinite(fix.accuracy) && fix.accuracy > GPS_WARMUP_ACCURACY_M) {
          continue;
        }
        warmedUp = true;
        traced.push({ lat: fix.lat, lng: fix.lng });
        continue;
      }
      traced.push({ lat: fix.lat, lng: fix.lng });
    }

    expect(warmedUp).toBe(false);
    expect(traced.length).toBe(0);
  });
});

// --- Verificación de constantes exportadas -------------------------------------

describe('constantes GPS', () => {
  it('GPS_ACCURACY_THRESHOLD_M es 25', () => {
    expect(GPS_ACCURACY_THRESHOLD_M).toBe(25);
  });
  it('GPS_WARMUP_ACCURACY_M es 20 (más estricto que el umbral de descarte)', () => {
    expect(GPS_WARMUP_ACCURACY_M).toBe(20);
    expect(GPS_WARMUP_ACCURACY_M).toBeLessThan(GPS_ACCURACY_THRESHOLD_M);
  });
  it('GPS_WARMUP_NO_ACCURACY_LIMIT es un entero positivo (fallback acotado)', () => {
    expect(Number.isInteger(GPS_WARMUP_NO_ACCURACY_LIMIT)).toBe(true);
    expect(GPS_WARMUP_NO_ACCURACY_LIMIT).toBeGreaterThan(0);
  });
  it('GPS_MAX_WALK_SPEED_MPS es 5', () => {
    expect(GPS_MAX_WALK_SPEED_MPS).toBe(5);
  });
  it('GPS_MIN_VERTEX_DISTANCE_M es 3', () => {
    expect(GPS_MIN_VERTEX_DISTANCE_M).toBe(3);
  });
  it('GPS_MAX_JUMP_DISTANCE_M es 50', () => {
    expect(GPS_MAX_JUMP_DISTANCE_M).toBe(50);
  });
});
