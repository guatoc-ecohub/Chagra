import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────
// Mock de dbCore.openDB para simular IndexedDB
vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(),
  STORES: {
    SYNC_META: 'sync_meta',
  },
}));

import { openDB } from '../../db/dbCore.js';
import { getDeviceAltitude } from '../altitudeService.js';

// ─── Helpers para crear fake DB ───────────────────────────────────────────
const makeFakeDB = (cachedAltitude = null, cacheTimestamp = Date.now()) => {
  const data = {};
  if (cachedAltitude !== null) {
    data.sync_meta = [
      {
        key: 'last_known_altitude',
        value: { alt: cachedAltitude, ts: cacheTimestamp },
      },
    ];
  }
  return {
    name: 'ChagraDB',
    version: 14,
    transaction(_storeName, _mode) {
      return {
        objectStore(name) {
          return {
            put(_item) {
              const req = {};
              setTimeout(() => {
                req.onsuccess?.({ target: req });
              }, 0);
              return req;
            },
            get(key) {
              const req = {};
              setTimeout(() => {
                const found = data[name]?.find((item) => item.key === key);
                req.result = found || undefined;
                req.onsuccess?.({ target: req });
              }, 0);
              return req;
            },
          };
        },
      };
    },
  };
};

// ─── Setup y cleanup ───────────────────────────────────────────────────────
let originalNavigator;
let originalFetch;

beforeEach(() => {
  vi.clearAllMocks();
  
  // Guardar originales
  originalNavigator = globalThis.navigator;
  originalFetch = globalThis.window?.fetch;
  
  // Setup default navigator
  globalThis.navigator = /** @type {any} */ ({
    geolocation: {
      getCurrentPosition: vi.fn(),
    },
    onLine: true,
  });
  
  // Setup default fetch
  if (typeof window !== 'undefined') {
    window.fetch = vi.fn();
  }
  
  // Setup default env vars
  vi.stubEnv('VITE_DEMO_MODE', 'false');
  vi.stubEnv('VITE_ELEVATION_API_URL', '');
});

afterEach(() => {
  // Restaurar originales
  globalThis.navigator = originalNavigator;
  if (originalFetch && typeof window !== 'undefined') {
    window.fetch = originalFetch;
  }
});

// ─── Tests ─────────────────────────────────────────────────────────────────
describe('altitudeService (#altitude) — obtención de altitud del dispositivo', () => {
  describe('modo demo', () => {
    it('devuelve altitud fija de 3050m cuando VITE_DEMO_MODE=true', async () => {
      vi.stubEnv('VITE_DEMO_MODE', 'true');

      const result = await getDeviceAltitude();
      
      expect(result).toBe(3050);
      expect(openDB).not.toHaveBeenCalled();
    });
  });

  describe('GPS nativo con altitud válida', () => {
    it('devuelve altitud del GPS cuando está disponible y es válida', async () => {
      const mockAltitude = 2600;
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: mockAltitude,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(mockAltitude);
      expect(globalThis.navigator.geolocation.getCurrentPosition).toHaveBeenCalled();
    });

    it('redondea altitud del GPS con Math.round', async () => {
      const mockAltitude = 2600.7;
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: mockAltitude,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(Math.round(mockAltitude));
      expect(result).toBe(2601);
    });

    it('guarda en cache cuando obtiene altitud del GPS', async () => {
      const mockAltitude = 1500;
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: mockAltitude,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      await getDeviceAltitude();
      
      expect(openDB).toHaveBeenCalled();
    });
  });

  describe('GPS sin altitud (fallback a API)', () => {
    it('llama a Open-Elevation API cuando GPS no tiene altitud pero sí lat/lng', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      const apiAltitude = 1800;
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: true,
        json: async () => ({
          results: [{ elevation: apiAltitude }],
        }),
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(apiAltitude);
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.open-elevation.com')
      );
    });

    it('usa URL personalizada si VITE_ELEVATION_API_URL está definida', async () => {
      vi.stubEnv('VITE_ELEVATION_API_URL', 'https://custom-elevation.api/v1/lookup');

      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: true,
        json: async () => ({
          results: [{ elevation: 2000 }],
        }),
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      await getDeviceAltitude();
      
      expect(window.fetch).toHaveBeenCalledWith(
        expect.stringContaining('custom-elevation.api')
      );
    });

    it('guarda en cache cuando obtiene altitud de API', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      const apiAltitude = 2200;
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: true,
        json: async () => ({
          results: [{ elevation: apiAltitude }],
        }),
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      await getDeviceAltitude();
      
      expect(openDB).toHaveBeenCalled();
    });
  });

  describe('fallback a cache cuando GPS y API fallan', () => {
    it('devuelve altitud cacheada si GPS falla y no hay lat/lng para API', async () => {
      const cachedAlt = 2500;
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (_success, error) => {
          error(/** @type {GeolocationPositionError} */ ({ code: 1, message: 'permission denied' }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(cachedAlt));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(Math.round(cachedAlt));
    });

    it('devuelve altitud cacheada si GPS falla y API falla', async () => {
      const cachedAlt = 1700;
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: false,
        status: 500,
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(cachedAlt));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(Math.round(cachedAlt));
    });

    it('ignora cache expirada (más de 24h)', async () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 horas atrás
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (_success, error) => {
          error(/** @type {GeolocationPositionError} */ ({ code: 1, message: 'permission denied' }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(2000, oldTimestamp));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBeNull();
    });

    it('usa cache válida (menos de 24h)', async () => {
      const recentTimestamp = Date.now() - 12 * 60 * 60 * 1000; // 12 horas atrás
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (_success, error) => {
          error(/** @type {GeolocationPositionError} */ ({ code: 1, message: 'permission denied' }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(1900, recentTimestamp));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(1900);
    });
  });

  describe('casos borde - valores extremos de altitud', () => {
    it('acepta altitud 0 (nivel del mar)', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 0,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(0);
    });

    it('acepta altitudes negativas (depresiones geográficas)', async () => {
      // Ejemplo: Mar Muerto (-430m), Lago Assal (-155m)
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: -50,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(-50);
    });

    it('acepta altitudes extremas (>5000m)', async () => {
      // Ejemplo: Monte Everest (~8849m), picos andinos
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 5200,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(5200);
    });
  });

  describe('casos borde - null/undefined/NaN', () => {
    it('devuelve null si GPS altitude es null', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: false,
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(null)); // sin cache
      
      const result = await getDeviceAltitude();
      
      expect(result).toBeNull();
    });

    it('devuelve null si GPS altitude es undefined', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: undefined,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: false,
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(null));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBeNull();
    });

    it('devuelve null si todo falla (sin cache)', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (_success, error) => {
          error(/** @type {GeolocationPositionError} */ ({ code: 2, message: 'unavailable' }));
        }
      );
      
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(null)); // sin cache
      
      const result = await getDeviceAltitude();
      
      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('maneja errores de geolocation sin crash', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        () => {
          throw new Error('Geolocation error');
        }
      );
      
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(1500));
      
      const result = await getDeviceAltitude();
      
      // Debe fallback a cache
      expect(result).toBe(1500);
    });

    it('maneja errores de API sin crash', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockRejectedValue(new Error('Network error'));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(1200));
      
      const result = await getDeviceAltitude();
      
      // Debe fallback a cache
      expect(result).toBe(1200);
    });

    it('maneja errores de IndexedDB en saveToCache sin crash', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 2400,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(openDB).mockRejectedValue(new Error('DB error'));
      
      const result = await getDeviceAltitude();
      
      // Debe devolver altitud aunque cache falle
      expect(result).toBe(2400);
    });

    it('maneja errores de IndexedDB en getFromCache sin crash', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (_success, error) => {
          error(/** @type {GeolocationPositionError} */ ({ code: 1, message: 'denied' }));
        }
      );
      
      vi.mocked(openDB).mockRejectedValue(new Error('DB read error'));
      
      const result = await getDeviceAltitude();
      
      // Debe devolver null si todo falla
      expect(result).toBeNull();
    });
  });

  describe('navigator.geolocation no disponible', () => {
    it('salta a fallbacks cuando navigator.geolocation no existe', async () => {
      // @ts-ignore
      delete globalThis.navigator.geolocation;
      
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(1300));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(1300);
    });

    it('salta a fallbacks cuando getCurrentPosition no es función', async () => {
      // @ts-ignore
      globalThis.navigator.geolocation = /** @type {any} */ ({});
      
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(1600));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(1600);
    });
  });

  describe('offline mode', () => {
    it('no llama a API si navigator.onLine es false', async () => {
      // @ts-ignore
      globalThis.navigator.onLine = false;
      
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(1400));
      
      await getDeviceAltitude();
      
      expect(window.fetch).not.toHaveBeenCalled();
    });
  });

  describe('respuesta inválida de API', () => {
    it('devuelve null si API responde sin results', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: true,
        json: async () => ({ results: [] }),
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(null));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBeNull();
    });

    it('devuelve null si API responde con elevation null', async () => {
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: null,
              accuracy: 10,
            },
          }));
        }
      );
      
      vi.mocked(window.fetch).mockResolvedValue(/** @type {Response} */ ({
        ok: true,
        json: async () => ({
          results: [{ elevation: null }],
        }),
      }));
      vi.mocked(openDB).mockResolvedValue(makeFakeDB(null));
      
      const result = await getDeviceAltitude();
      
      expect(result).toBeNull();
    });
  });

  describe('umbrales de piso térmico (contexto)', () => {
    // Estos tests documentan los umbrales reales del código base,
    // aunque altitudeService NO hace conversión directa (eso está en
    // locationService.getExternalAiPromptBuilder().deriveThermalZoneFromAltitud)
    it('altitud 0 corresponde a piso cálido (umbral < 1000m)', async () => {
      // Solo documenta el umbral, no valida conversión
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 0,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(0);
      // Nota: 0 < 1000 → cálido según deriveThermalZoneFromAltitud
    });

    it('altitud 999 es cálido, 1000 es templado (umbral exacto)', async () => {
      // Documenta el umbral 1000m entre cálido y templado
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 1000,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(1000);
      // Nota: 1000 < 2000 → templado según deriveThermalZoneFromAltitud
    });

    it('altitud 1999 es templado, 2000 es frío (umbral exacto)', async () => {
      // Documenta el umbral 2000m entre templado y frío
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 2000,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(2000);
      // Nota: 2000 < 3000 → frío según deriveThermalZoneFromAltitud
    });

    it('altitud 2999 es frío, 3000 es páramo (umbral exacto)', async () => {
      // Documenta el umbral 3000m entre frío y páramo
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 3000,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(3000);
      // Nota: 3000 < 3600 → páramo según deriveThermalZoneFromAltitud
    });

    it('altitud 3599 es páramo, 3600 es glacial (umbral exacto)', async () => {
      // Documenta el umbral 3600m entre páramo y glacial
      vi.mocked(globalThis.navigator.geolocation.getCurrentPosition).mockImplementation(
        (success) => {
          success(/** @type {GeolocationPosition} */ ({
            coords: {
              latitude: 4.5,
              longitude: -74.0,
              altitude: 3600,
              accuracy: 10,
            },
          }));
        }
      );
      vi.mocked(openDB).mockResolvedValue(makeFakeDB());
      
      const result = await getDeviceAltitude();
      
      expect(result).toBe(3600);
      // Nota: >= 3600 → glacial según deriveThermalZoneFromAltitud
    });
  });
});
