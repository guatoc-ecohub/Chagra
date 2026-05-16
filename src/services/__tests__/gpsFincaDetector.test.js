import { describe, it, expect, vi, afterEach } from 'vitest';
import { distanceKm, detectFincaByGps } from '../gpsFincaDetector';

describe('gpsFincaDetector', () => {
  describe('distanceKm (Haversine)', () => {
    it('returns 0 for identical coords', () => {
      const d = distanceKm([4.5167, -73.9333], [4.5167, -73.9333]);
      expect(d).toBeCloseTo(0, 5);
    });

    it('computes ~5 km between Guatoc and Los Sitios placeholder', () => {
      // Guatoc (4.5167, -73.9333) → Los Sitios (4.5500, -73.9000)
      const d = distanceKm([4.5167, -73.9333], [4.5500, -73.9000]);
      // Diagonal ~5km esperado para ese delta lat+lng en ecuador
      expect(d).toBeGreaterThan(4);
      expect(d).toBeLessThan(6);
    });

    it('returns symmetric distance', () => {
      const a = [4.5167, -73.9333];
      const b = [4.5500, -73.9000];
      expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 5);
    });
  });

  describe('detectFincaByGps', () => {
    const fincas = [
      { slug: 'guatoc', nombre: 'Guatoc', coords: [4.5167, -73.9333] },
      { slug: 'los-sitios', nombre: 'Los Sitios', coords: [4.5500, -73.9000] },
    ];

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns permission_denied when geolocation throws code 1', async () => {
      globalThis.navigator.geolocation = {
        getCurrentPosition: (_ok, err) => err({ code: 1, message: 'denied' }),
      };
      const result = await detectFincaByGps(fincas);
      expect(result.reason).toBe('permission_denied');
      expect(result.finca).toBeNull();
    });

    it('returns geolocation_unavailable when API missing', async () => {
      const original = globalThis.navigator.geolocation;
      // @ts-ignore
      delete globalThis.navigator.geolocation;
      const result = await detectFincaByGps(fincas);
      expect(result.reason).toBe('geolocation_unavailable');
      globalThis.navigator.geolocation = original;
    });

    it('matches the closest finca when within range', async () => {
      // Operador exactamente en Guatoc
      globalThis.navigator.geolocation = {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 4.5167, longitude: -73.9333, accuracy: 5 } }),
      };
      const result = await detectFincaByGps(fincas);
      expect(result.finca?.slug).toBe('guatoc');
      expect(result.distanceKm).toBeCloseTo(0, 3);
    });

    it('returns out_of_range when farther than maxDistanceKm', async () => {
      // Operador a >100 km
      globalThis.navigator.geolocation = {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 10.0, longitude: -75.0, accuracy: 5 } }),
      };
      const result = await detectFincaByGps(fincas, { maxDistanceKm: 5 });
      expect(result.reason).toBe('out_of_range');
      expect(result.finca).toBeNull();
    });

    it('picks the nearer of two equidistant-ish fincas', async () => {
      // Posición más cerca de Los Sitios que Guatoc
      globalThis.navigator.geolocation = {
        getCurrentPosition: (ok) =>
          ok({ coords: { latitude: 4.5450, longitude: -73.9050, accuracy: 5 } }),
      };
      const result = await detectFincaByGps(fincas, { maxDistanceKm: 10 });
      expect(result.finca?.slug).toBe('los-sitios');
    });
  });
});
