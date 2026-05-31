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
