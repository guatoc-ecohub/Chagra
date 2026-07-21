import { describe, it, expect, afterEach, vi } from 'vitest';
import veredas25181 from '../../../public/veredas/25181.json' with { type: 'json' };
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
    expect(getPisoTermicoInfo(/** @type {any} */ ('abc'))).toBeNull();
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

  it('altitud_fuente=elevation_api cuando viene de Open-Meteo Elevation (online)', async () => {
    // Simular red disponible y Open-Meteo Elevation respondiendo (fuente por
    // defecto desde la reescritura del onboarding §2.4 — Copernicus GLO-90).
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', async (url) => {
      if (String(url).includes('open-meteo.com/v1/elevation')) {
        return {
          ok: true,
          json: async () => ({ elevation: [2490] }),
        };
      }
      // Nominatim/veredas offline (no respondemos para forzar el fallback DANE).
      return { ok: false };
    });
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922 });
    expect(r.altitud_fuente).toBe('elevation_api');
    expect(r.altitud).toBe(2490);
  });

  it('override VITE_ELEVATION_API_URL estilo Open-Elevation sigue funcionando', async () => {
    // La forma de respuesta { results: [{ elevation }] } se sigue aceptando.
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', async (url) => {
      if (String(url).includes('locations=')) {
        return { ok: true, json: async () => ({ results: [{ elevation: 1881 }] }) };
      }
      return { ok: false };
    });
    vi.stubEnv('VITE_ELEVATION_API_URL', 'https://mi-proxy.example/api/v1/lookup');
    try {
      const r = await resolveUbicacion({ lat: 4.527, lng: -73.922 });
      expect(r.altitud).toBe(1881);
      expect(r.altitud_fuente).toBe('elevation_api');
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('resolveUbicacion — vereda por point-in-polygon DANE (reescritura onboarding)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('expone municipio_codigo DIVIPOLA resuelto offline', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922, altitud: 2580 });
    expect(r.municipio).toMatch(/Choach/);
    expect(r.municipio_codigo).toBe('25181');
  });

  it('la vereda por polígono DANE manda sobre el guess de Nominatim (Potrero Grande → El Curí)', async () => {
    const { _resetVeredaLookupCache } = await import('../veredaLookupService.js');
    _resetVeredaLookupCache();
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', async (url) => {
      const u = String(url);
      if (u.includes('/reverse')) {
        // Caso REAL del operador: Nominatim devuelve el lugar nombrado más
        // cercano ("Potrero Grande") en vez de la vereda real ("El Curí").
        return {
          ok: true,
          json: async () => ({
            address: { city: 'Potrero Grande', county: 'Choachí', state: 'Cundinamarca' },
            display_name: 'Potrero Grande, Choachí, Cundinamarca',
          }),
        };
      }
      if (u.includes('/veredas/25181.json')) {
        return { ok: true, status: 200, json: async () => veredas25181 };
      }
      return { ok: false };
    });
    // Punto interior REAL de la vereda El Curí (dataset DANE, gen-veredas.mjs).
    const r = await resolveUbicacion({ lat: 4.58263, lng: -73.95823, altitud: 2200 });
    expect(r.vereda).toBe('El Curi');
    expect(r.vereda_fuente).toBe('poligono_dane');
    expect(r.vereda_codigo).toBe('25181010');
    // Y las opciones para la corrección inline traen TODAS las del municipio.
    expect(r.veredaOptions.length).toBe(35);
    expect(r.veredaOptions.some((o) => o.nombre_dane === 'POTRERO GRANDE')).toBe(true);
  });

  it('sin dataset del municipio conserva el guess de Nominatim', async () => {
    const { _resetVeredaLookupCache } = await import('../veredaLookupService.js');
    _resetVeredaLookupCache();
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('fetch', async (url) => {
      const u = String(url);
      if (u.includes('/reverse')) {
        return {
          ok: true,
          json: async () => ({
            address: { city: 'La Esperanza', county: 'Choachí', state: 'Cundinamarca' },
          }),
        };
      }
      return { ok: false, status: 404 };
    });
    const r = await resolveUbicacion({ lat: 4.527, lng: -73.922, altitud: 2200 });
    expect(r.vereda).toBe('La Esperanza');
    expect(r.vereda_fuente).toBe('nominatim');
    expect(r.vereda_codigo).toBeNull();
  });
});
