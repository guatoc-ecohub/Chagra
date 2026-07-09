/**
 * Tests de veredaLookupService — vereda por point-in-polygon contra DANE
 * (reescritura del onboarding, spec 2026-07-08 §2).
 *
 * Incluye el caso REAL del operador: en Choachí (25181) el GPS cae en la
 * vereda "El Curí" pero Nominatim devolvía "Potrero Grande" (lugar nombrado
 * más cercano). El PIP contra los polígonos DANE resuelve la correcta.
 * El fixture es el dataset REAL generado por scripts/gen-veredas.mjs.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  pointInRing,
  pointInGeometry,
  nearestVeredaByCentroid,
  findVeredaAt,
  loadVeredasMunicipio,
  lookupVereda,
  filterVeredaOptions,
  normalizeNombre,
  _resetVeredaLookupCache,
} from '../veredaLookupService.js';

// Dataset REAL de Choachí (35 veredas DANE) — mismo archivo que sirve la PWA.
const CHOACHI = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'public/veredas/25181.json'), 'utf-8'),
);

// Punto interior REAL de la vereda El Curí (calculado por gen-veredas.mjs).
const EL_CURI_POINT = { lat: 4.58263, lng: -73.95823 };
// Punto interior REAL de la vereda Potrero Grande.
const POTRERO_GRANDE_POINT = { lat: 4.61192, lng: -73.94111 };

describe('pointInRing / pointInGeometry — ray casting even-odd', () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('detecta punto dentro de un anillo simple', () => {
    expect(pointInRing(5, 5, square)).toBe(true);
    expect(pointInRing(15, 5, square)).toBe(false);
    expect(pointInRing(-1, -1, square)).toBe(false);
  });

  it('anillo degenerado (menos de 4 puntos) devuelve false', () => {
    expect(pointInRing(0, 0, [[0, 0], [1, 1]])).toBe(false);
    expect(pointInRing(0, 0, null)).toBe(false);
  });

  it('Polygon con HUECO: caer en el hueco cuenta como fuera (even-odd)', () => {
    const hole = [
      [4, 4],
      [6, 4],
      [6, 6],
      [4, 6],
      [4, 4],
    ];
    const geom = { type: 'Polygon', coordinates: [square, hole] };
    expect(pointInGeometry(5, 5, geom)).toBe(false); // centro del hueco
    expect(pointInGeometry(2, 2, geom)).toBe(true); // dentro, fuera del hueco
  });

  it('MultiPolygon: dentro de cualquiera de las partes', () => {
    const far = [
      [100, 100],
      [110, 100],
      [110, 110],
      [100, 110],
      [100, 100],
    ];
    const geom = { type: 'MultiPolygon', coordinates: [[square], [far]] };
    expect(pointInGeometry(105, 105, geom)).toBe(true);
    expect(pointInGeometry(5, 5, geom)).toBe(true);
    expect(pointInGeometry(50, 50, geom)).toBe(false);
  });

  it('entradas inválidas degradan a false sin lanzar', () => {
    expect(pointInGeometry(NaN, 5, { type: 'Polygon', coordinates: [square] })).toBe(false);
    expect(pointInGeometry(5, 5, null)).toBe(false);
    expect(pointInGeometry(5, 5, { type: 'Point', coordinates: [5, 5] })).toBe(false);
  });
});

describe('caso REAL del operador — Choachí: El Curí vs Potrero Grande', () => {
  it('el punto de la finca cae en EL CURI por polígono (no en Potrero Grande)', () => {
    const hit = findVeredaAt(EL_CURI_POINT.lat, EL_CURI_POINT.lng, CHOACHI.veredas);
    expect(hit).not.toBeNull();
    expect(hit.metodo).toBe('poligono');
    expect(hit.vereda.nombre_dane).toBe('EL CURI');
  });

  it('un punto en Potrero Grande sí resuelve POTRERO GRANDE (sin cruzarse)', () => {
    const hit = findVeredaAt(POTRERO_GRANDE_POINT.lat, POTRERO_GRANDE_POINT.lng, CHOACHI.veredas);
    expect(hit.metodo).toBe('poligono');
    expect(hit.vereda.nombre_dane).toBe('POTRERO GRANDE');
  });

  it('las 35 veredas de Choachí resuelven su propio punto interior (self-consistency)', () => {
    for (const v of CHOACHI.veredas) {
      if (!Array.isArray(v.punto_interior)) continue;
      const hit = findVeredaAt(v.punto_interior[0], v.punto_interior[1], CHOACHI.veredas);
      expect(hit?.vereda?.codigo, `vereda ${v.nombre_dane}`).toBe(v.codigo);
    }
  });

  it('punto fuera de todos los polígonos cae al centroide más cercano', () => {
    // Punto claramente fuera del municipio (Bogotá centro).
    const hit = findVeredaAt(4.6486, -74.0628, CHOACHI.veredas);
    expect(hit).not.toBeNull();
    expect(hit.metodo).toBe('centroide');
  });
});

describe('nearestVeredaByCentroid', () => {
  const veredas = [
    { nombre: 'A', centroide: [4.5, -74.0] },
    { nombre: 'B', centroide: [4.6, -74.1] },
    { nombre: 'C', centroide: null },
  ];

  it('devuelve la vereda con centroide más cercano', () => {
    expect(nearestVeredaByCentroid(4.51, -74.01, veredas)?.nombre).toBe('A');
    expect(nearestVeredaByCentroid(4.59, -74.09, veredas)?.nombre).toBe('B');
  });

  it('ignora centroides inválidos y degrada a null sin candidatos', () => {
    expect(nearestVeredaByCentroid(4.5, -74.0, [{ centroide: null }])).toBeNull();
    expect(nearestVeredaByCentroid(NaN, -74.0, veredas)).toBeNull();
    expect(nearestVeredaByCentroid(4.5, -74.0, 'no-array')).toBeNull();
  });
});

describe('loadVeredasMunicipio / lookupVereda — carga on-demand con degradación', () => {
  beforeEach(() => _resetVeredaLookupCache());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('carga el archivo del municipio y cachea en memoria', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => CHOACHI }));
    vi.stubGlobal('fetch', fetchMock);
    const d1 = await loadVeredasMunicipio('25181');
    const d2 = await loadVeredasMunicipio('25181');
    expect(d1.veredas.length).toBe(35);
    expect(d2).toBe(d1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/veredas/25181.json');
  });

  it('404 (municipio no generado) devuelve null y NO reintenta en bucle', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadVeredasMunicipio('99999')).toBeNull();
    expect(await loadVeredasMunicipio('99999')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fallo de RED devuelve null pero NO se cachea (reintenta al volver la señal)', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => CHOACHI });
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadVeredasMunicipio('25181')).toBeNull();
    const d = await loadVeredasMunicipio('25181');
    expect(d?.veredas?.length).toBe(35);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('código inválido devuelve null sin fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadVeredasMunicipio('abc')).toBeNull();
    expect(await loadVeredasMunicipio(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('lookupVereda: caso operador end-to-end (guess + opciones para corregir)', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: true, status: 200, json: async () => CHOACHI }));
    const r = await lookupVereda({
      lat: EL_CURI_POINT.lat,
      lng: EL_CURI_POINT.lng,
      municipioCodigo: '25181',
    });
    expect(r.vereda?.nombre_dane).toBe('EL CURI');
    expect(r.metodo).toBe('poligono');
    // La corrección inline SIEMPRE tiene la lista completa del municipio.
    expect(r.opciones.length).toBe(35);
    expect(r.opciones.some((o) => o.nombre_dane === 'POTRERO GRANDE')).toBe(true);
  });

  it('lookupVereda sin dataset degrada a vacío sin lanzar', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 404 }));
    const r = await lookupVereda({ lat: 4.5, lng: -73.9, municipioCodigo: '99999' });
    expect(r).toEqual({ vereda: null, metodo: null, opciones: [] });
  });
});

describe('filterVeredaOptions — autocomplete de corrección inline', () => {
  const opciones = CHOACHI.veredas.map((v) => ({
    codigo: v.codigo,
    nombre: v.nombre,
    nombre_dane: v.nombre_dane,
  }));

  it('el caso del operador: escribir "curi" encuentra El Curi', () => {
    const r = filterVeredaOptions(opciones, 'curi');
    expect(r.length).toBe(1);
    expect(r[0].nombre_dane).toBe('EL CURI');
  });

  it('tolera tildes y mayúsculas ("CURÍ" también matchea)', () => {
    expect(filterVeredaOptions(opciones, 'CURÍ')[0]?.nombre_dane).toBe('EL CURI');
  });

  it('query vacío devuelve la lista completa (modo "bajar y tocar")', () => {
    expect(filterVeredaOptions(opciones, '')).toHaveLength(35);
    expect(filterVeredaOptions(opciones)).toHaveLength(35);
  });

  it('entradas inválidas degradan a []', () => {
    expect(filterVeredaOptions(null, 'x')).toEqual([]);
  });
});

describe('normalizeNombre', () => {
  it('quita tildes, baja a minúsculas y colapsa espacios', () => {
    expect(normalizeNombre('  El  CURÍ ')).toBe('el curi');
    expect(normalizeNombre('Fómeque')).toBe('fomeque');
    expect(normalizeNombre(null)).toBe('');
  });
});
