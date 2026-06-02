import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  getPisoTermicoInfo,
  PISO_TERMICO_INFO,
  resolveUbicacion,
} from '../locationService.js';

describe('locationService (#201) — piso térmico offline-safe', () => {
  it('clasifica cálido a baja altitud', () => {
    const info = getPisoTermicoInfo(500);
    expect(info.slug).toBe('cálido');
    expect(info.cultivos.length).toBeGreaterThan(0);
  });

  it('clasifica templado en zona cafetera', () => {
    expect(getPisoTermicoInfo(1500).slug).toBe('templado');
  });

  it('clasifica frío en sabana', () => {
    expect(getPisoTermicoInfo(2600).slug).toBe('frío');
  });

  it('clasifica páramo', () => {
    expect(getPisoTermicoInfo(3200).slug).toBe('páramo');
  });

  it('null para altitud inválida', () => {
    expect(getPisoTermicoInfo(null)).toBeNull();
    expect(getPisoTermicoInfo(-50)).toBeNull();
    expect(getPisoTermicoInfo('abc')).toBeNull();
  });

  it('cada piso térmico tiene color, rango y cultivos', () => {
    for (const info of Object.values(PISO_TERMICO_INFO)) {
      expect(info.color).toBeTruthy();
      expect(info.rango).toBeTruthy();
      expect(Array.isArray(info.cultivos)).toBe(true);
    }
  });
});

describe('resolveUbicacion — fallback OFFLINE de municipio/altitud (#338)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sin red, resuelve municipio + departamento por centroide DANE mas cercano', async () => {
    // Simular offline: navigator.onLine=false hace que reverseGeocode y
    // fetchElevation devuelvan null sin tocar la red.
    vi.stubGlobal('navigator', { onLine: false });
    // Coordenadas cerca de Popayan (Cauca).
    const r = await resolveUbicacion({ lat: 2.444, lng: -76.614 });
    expect(r.departamento).toBe('Cauca');
    expect(r.municipio).toMatch(/Popay/);
    // Popayan tiene altitud curada -> piso termico precalculado sin red.
    expect(r.altitud).not.toBeNull();
    expect(r.pisoTermico).not.toBeNull();
  });

  it('respeta la altitud explicita aunque este offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const r = await resolveUbicacion({ lat: 4.711, lng: -74.072, altitud: 2640 });
    expect(r.altitud).toBe(2640);
    expect(r.pisoTermico?.slug).toBe('frío');
    expect(r.municipio).toMatch(/Bogot/);
  });
});

describe('resolveUbicacion — altitud_fuente (#1213-regresion backfill cabecera)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('altitud_fuente=dado cuando se pasa altitud explicita', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    // Coordenadas de Choachi, altitud real de la finca (no la de la cabecera 1923).
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922, altitud: 2580 });
    expect(r.altitud).toBe(2580);
    expect(r.altitud_fuente).toBe('dado');
  });

  it('altitud_fuente=cabecera cuando el fallback offline usa el centroide DANE', async () => {
    // Sin red y sin altitud explicita → debería caer al fallback cabecera DANE.
    vi.stubGlobal('navigator', { onLine: false });
    // Coordenadas de Choachi: centroide DANE tiene altitud 1923 (cabecera).
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922 });
    expect(r.altitud_fuente).toBe('cabecera');
    // La altitud devuelta es la de la cabecera (1923 para Choachi), NO 2580.
    expect(r.altitud).toBe(1923);
  });

  it('regresion #1213: backfill con municipio Choachi NO pisa altitud real 2580', async () => {
    // Escenario exacto de la regresion: perfil con altitud real de finca 2580 msnm
    // (vereda alta Choachi). resolveUbicacion cae al fallback cabecera (1923).
    // La altitud_fuente='cabecera' debe ser detectable para que handleConfirm
    // decida NO sobrescribir la buena altitud del perfil.
    vi.stubGlobal('navigator', { onLine: false });
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922 }); // sin altitud
    // Verificamos que el objeto lleva la marca de cabecera.
    expect(r.altitud_fuente).toBe('cabecera');
    // Y que NO coincide con la altitud real de la finca del operador.
    expect(r.altitud).not.toBe(2580);
    // Al detectar altitud_fuente='cabecera' en handleConfirm, un perfil que ya
    // tiene finca_altitud=2580 con altitud_source!='cabecera' NO debe actualizar.
    // La lógica de coalesce vive en LocationDetectedScreen.handleConfirm; aqui
    // solo verificamos que resolveUbicacion expone la informacion necesaria.
    expect(r.altitud_fuente).not.toBe('dado');
    expect(r.altitud_fuente).not.toBe('elevation_api');
  });

  it('altitud_fuente=elevation_api cuando viene de Open-Elevation (online)', async () => {
    // Simular red disponible y Open-Elevation respondiendo.
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', async (url) => {
      if (String(url).includes('open-elevation') || String(url).includes('lookup')) {
        return {
          ok: true,
          json: async () => ({ results: [{ elevation: 2490 }] }),
        };
      }
      // Nominatim offline (no respondemos para forzar el fallback DANE).
      return { ok: false };
    });
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922 });
    // Con Open-Elevation respondiendo la fuente debe ser elevation_api.
    expect(r.altitud_fuente).toBe('elevation_api');
    expect(r.altitud).toBe(2490);
  });
});
