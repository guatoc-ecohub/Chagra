import { describe, it, expect, vi } from 'vitest';

vi.mock('../authService.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue('mock-token'),
}));

vi.mock('../tenantContext.js', () => ({
  getActiveTenantId: vi.fn().mockReturnValue(null),
}));

vi.mock('../fincaActiveStore.js', () => ({
  useFincaActiveStore: {
    getState: () => ({
      getActiveEndpoint: () => 'https://farmos.example.com',
    }),
  },
}));

vi.stubGlobal('fetch', vi.fn());

import { fetchFromFarmOS, sendToFarmOS } from '../apiService.js';

describe('apiService', () => {
  describe('fetchFromFarmOS', () => {
    it('es una funcion exportada', () => {
      expect(typeof fetchFromFarmOS).toBe('function');
    });

    it('retorna data vacia para bundle obsoleto asset/person', async () => {
      const r = await fetchFromFarmOS('/api/asset/person');
      expect(r.data).toEqual([]);
      expect(r.jsonapi).toBeDefined();
    });

    it('retorna objeto vacio en demo mode', async () => {
      const original = import.meta.env.VITE_DEMO_MODE;
      import.meta.env.VITE_DEMO_MODE = 'true';
      const r = await fetchFromFarmOS('/api/asset/plant');
      expect(r).toEqual({});
      import.meta.env.VITE_DEMO_MODE = original;
    });

    it('lanza error si no hay token', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValueOnce(null);
      await expect(fetchFromFarmOS('/api/asset/plant')).rejects.toThrow('Token');
    });
  });

  describe('sendToFarmOS', () => {
    it('es una funcion exportada', () => {
      expect(typeof sendToFarmOS).toBe('function');
    });
  });
});
