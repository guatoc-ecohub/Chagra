/**
 * recorridoService — tripas del "Recorrido de finca por voz".
 * Cubre: point-in-polygon, resolución de lote (dentro / anidado / cercano /
 * sin lote), construcción y captura de observación, detectores de intención y
 * readback del resumen.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  pointInRing,
  loteRing,
  pointInLote,
  resolveLoteForPoint,
  buildObservacion,
  capturarObservacion,
  detectarIntencionCamara,
  detectarIntencionResumen,
  construirResumenRecorrido,
  leerResumenRecorrido,
} from '../recorridoService';

// ── Fixtures de lotes (asset--land con WKT) ──────────────────────────────────

/** Construye un asset--land con geometría polígono desde vértices [lng,lat]. */
const lotePoligono = (id, name, ringLngLat) => ({
  id,
  type: 'asset--land',
  attributes: {
    name,
    land_type: 'field',
    intrinsic_geometry: {
      value: `POLYGON((${ringLngLat.map(([lng, lat]) => `${lng} ${lat}`).join(', ')}))`,
    },
  },
});

/** Construye un asset--land tipo punto (sin polígono). */
const lotePunto = (id, name, lng, lat) => ({
  id,
  type: 'asset--land',
  attributes: {
    name,
    land_type: 'bed',
    intrinsic_geometry: { value: `POINT(${lng} ${lat})` },
  },
});

// Cuadrado grande ~ (4.529..4.531, -73.925..-73.923)
const POTRERO = lotePoligono('potrero', 'Potrero de abajo', [
  [-73.925, 4.529],
  [-73.925, 4.531],
  [-73.923, 4.531],
  [-73.923, 4.529],
  [-73.925, 4.529],
]);

// Cuadrado pequeño DENTRO del potrero (era anidada).
const ERA = lotePoligono('era', 'Era de cilantro', [
  [-73.9245, 4.5295],
  [-73.9245, 4.5300],
  [-73.9240, 4.5300],
  [-73.9240, 4.5295],
  [-73.9245, 4.5295],
]);

describe('pointInRing', () => {
  const ring = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 2 },
    { lat: 2, lng: 2 },
    { lat: 2, lng: 0 },
  ];
  it('detecta un punto interior', () => {
    expect(pointInRing({ lat: 1, lng: 1 }, ring)).toBe(true);
  });
  it('rechaza un punto exterior', () => {
    expect(pointInRing({ lat: 5, lng: 5 }, ring)).toBe(false);
  });
  it('es defensivo con entradas inválidas', () => {
    expect(pointInRing(null, ring)).toBe(false);
    expect(pointInRing({ lat: 1, lng: 1 }, [])).toBe(false);
    expect(pointInRing({ lat: NaN, lng: 1 }, ring)).toBe(false);
  });
});

describe('loteRing / pointInLote', () => {
  it('extrae el anillo de un lote polígono', () => {
    const ring = loteRing(POTRERO);
    expect(Array.isArray(ring)).toBe(true);
    expect(ring.length).toBeGreaterThanOrEqual(4);
    expect(ring[0]).toHaveProperty('lat');
    expect(ring[0]).toHaveProperty('lng');
  });
  it('devuelve null para un lote punto', () => {
    expect(loteRing(lotePunto('p', 'Punto', -73.9, 4.6))).toBeNull();
  });
  it('pointInLote respeta la geometría', () => {
    expect(pointInLote({ lat: 4.530, lng: -73.924 }, POTRERO)).toBe(true);
    expect(pointInLote({ lat: 4.540, lng: -73.900 }, POTRERO)).toBe(false);
  });
});

describe('resolveLoteForPoint', () => {
  it('resuelve DENTRO cuando el punto cae en el polígono', () => {
    const r = resolveLoteForPoint({ lat: 4.530, lng: -73.924 }, [POTRERO]);
    expect(r.pertenencia).toBe('dentro');
    expect(r.loteId).toBe('potrero');
    expect(r.loteNombre).toBe('Potrero de abajo');
    expect(r.distanciaM).toBe(0);
  });

  it('con lotes anidados gana el de menor área (más específico)', () => {
    // Punto dentro de la era (que está dentro del potrero).
    const r = resolveLoteForPoint({ lat: 4.52975, lng: -73.92425 }, [POTRERO, ERA]);
    expect(r.pertenencia).toBe('dentro');
    expect(r.loteId).toBe('era');
  });

  it('cae a CERCANO por centroide cuando no hay contención', () => {
    const punto = lotePunto('semillero', 'Semillero', -73.8, 4.6);
    // ~11 m al norte del centroide del punto.
    const r = resolveLoteForPoint({ lat: 4.6001, lng: -73.8 }, [punto], { maxNearbyM: 30 });
    expect(r.pertenencia).toBe('cercano');
    expect(r.loteId).toBe('semillero');
    expect(r.distanciaM).toBeGreaterThan(0);
    expect(r.distanciaM).toBeLessThanOrEqual(30);
  });

  it('devuelve SIN_LOTE cuando está lejos de todo', () => {
    const r = resolveLoteForPoint({ lat: 10, lng: -70 }, [POTRERO, ERA]);
    expect(r.pertenencia).toBe('sin_lote');
    expect(r.loteId).toBeNull();
  });

  it('es defensivo con coordenada inválida', () => {
    expect(resolveLoteForPoint(null, [POTRERO]).pertenencia).toBe('sin_lote');
    expect(resolveLoteForPoint({ lat: NaN, lng: 1 }, [POTRERO]).pertenencia).toBe('sin_lote');
  });
});

describe('buildObservacion', () => {
  it('arma una observación con lote resuelto', () => {
    const obs = buildObservacion({
      texto: '  aquí sembré 20 tomates  ',
      tipo: 'observacion',
      coord: { lat: 4.530, lng: -73.924 },
      accuracy: 8,
      lotes: [POTRERO],
      now: 1000,
      id: 'obs-1',
    });
    expect(obs).toMatchObject({
      id: 'obs-1',
      texto: 'aquí sembré 20 tomates',
      tipo: 'observacion',
      coord: { lat: 4.530, lng: -73.924 },
      accuracy: 8,
      loteId: 'potrero',
      pertenencia: 'dentro',
      timestamp: 1000,
    });
  });

  it('sin coord → sin lote, coord null', () => {
    const obs = buildObservacion({ texto: 'este lote está seco', coord: null, lotes: [POTRERO], now: 5 });
    expect(obs.coord).toBeNull();
    expect(obs.pertenencia).toBe('sin_lote');
    expect(obs.loteId).toBeNull();
    expect(typeof obs.id).toBe('string');
  });
});

describe('capturarObservacion', () => {
  it('captura GPS inyectado y resuelve el lote', async () => {
    const getPosition = vi.fn().mockResolvedValue({ lat: 4.530, lng: -73.924, accuracy: 6 });
    const obs = await capturarObservacion({
      texto: 'mata de plátano cargada',
      lotes: [POTRERO],
      getPosition,
      now: 42,
    });
    expect(getPosition).toHaveBeenCalledTimes(1);
    expect(obs.coord).toEqual({ lat: 4.530, lng: -73.924 });
    expect(obs.accuracy).toBe(6);
    expect(obs.loteId).toBe('potrero');
    expect(obs.timestamp).toBe(42);
  });

  it('si el GPS falla registra igual SIN coord (offline-first)', async () => {
    const getPosition = vi.fn().mockRejectedValue(new Error('permission_denied'));
    const obs = await capturarObservacion({ texto: 'lote seco', lotes: [POTRERO], getPosition, now: 7 });
    expect(obs.coord).toBeNull();
    expect(obs.pertenencia).toBe('sin_lote');
    expect(obs.texto).toBe('lote seco');
  });
});

describe('detectarIntencionCamara', () => {
  it.each([
    'mira esta mata',
    'revisa esta planta que está rara',
    'qué tiene este árbol',
    'tómale foto a esta matica',
    'reconoce este arbolito',
  ])('detecta "%s"', (frase) => {
    const r = detectarIntencionCamara(frase);
    expect(r.match).toBe(true);
    expect(r.sujeto).toBe('planta');
    expect(r.frase).toBe(frase);
  });

  it.each([
    'aquí sembré veinte tomates',
    'mira el cielo que está despejado',
    'este lote está seco',
    '',
  ])('NO dispara con "%s"', (frase) => {
    expect(detectarIntencionCamara(frase).match).toBe(false);
  });
});

describe('detectarIntencionResumen', () => {
  it.each([
    'cómo quedó el recorrido',
    'resumen del recorrido por favor',
    'qué llevo registrado hoy',
    'léeme el recorrido',
  ])('detecta "%s"', (frase) => {
    expect(detectarIntencionResumen(frase).match).toBe(true);
  });

  it.each([
    'aquí sembré veinte tomates',
    'mira esta mata',
    'este lote está seco',
    '',
  ])('NO dispara con "%s"', (frase) => {
    expect(detectarIntencionResumen(frase).match).toBe(false);
  });
});

describe('construirResumenRecorrido', () => {
  it('mensaje vacío sin observaciones', () => {
    expect(construirResumenRecorrido([])).toMatch(/todav[ií]a no has registrado/i);
  });

  it('agrupa por lote y cuenta', () => {
    const obs = [
      { texto: 'sembré 20 tomates', loteNombre: 'Potrero de abajo' },
      { texto: 'está seco', loteNombre: 'Potrero de abajo' },
      { texto: 'mata cargada', loteNombre: 'Era de cilantro' },
    ];
    const texto = construirResumenRecorrido(obs);
    expect(texto).toContain('3 observaciones');
    expect(texto).toContain('Potrero de abajo');
    expect(texto).toContain('Era de cilantro');
    // Sin markdown (apto TTS).
    expect(texto).not.toMatch(/[*`#]/);
  });

  it('agrupa las sin lote como "Sin lote asignado"', () => {
    const texto = construirResumenRecorrido([{ texto: 'algo', loteNombre: null }]);
    expect(texto).toContain('Sin lote asignado');
  });
});

describe('leerResumenRecorrido', () => {
  it('arma el texto y lo pasa al speaker inyectado', async () => {
    const speak = vi.fn().mockResolvedValue(true);
    const texto = await leerResumenRecorrido(
      [{ texto: 'sembré tomates', loteNombre: 'Potrero' }],
      { speak },
    );
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith(texto);
    expect(texto).toContain('1 observación');
  });

  it('un TTS caído no tumba el resumen (devuelve el texto)', async () => {
    const speak = vi.fn().mockRejectedValue(new Error('kokoro down'));
    const texto = await leerResumenRecorrido([{ texto: 'x', loteNombre: 'L' }], { speak });
    expect(typeof texto).toBe('string');
    expect(texto.length).toBeGreaterThan(0);
  });
});
