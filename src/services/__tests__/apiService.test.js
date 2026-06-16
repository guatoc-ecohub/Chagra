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

    it('remappea bundle URL legacy log/task a log/activity', async () => {
      // Verificamos que la URL se transforma antes del fetch
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      const r = await fetchFromFarmOS('/api/log/task');
      expect(r.data).toEqual([]);

      // La URL llamada deberia contener /api/log/activity (remapped)
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('/api/log/activity');
      expect(calledUrl).not.toContain('/api/log/task');
    });

    it('remappea bundle URL legacy log/planting a log/seeding', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await fetchFromFarmOS('/api/log/planting');
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('/api/log/seeding');
    });

    it('no remappea URLs que no son legacy', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await fetchFromFarmOS('/api/asset/plant');
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('/api/asset/plant');
    });

    it('inyecta filtro de tenant si hay tenant activo', async () => {
      const { getAccessToken } = await import('../authService.js');
      const { getActiveTenantId } = await import('../tenantContext.js');
      getAccessToken.mockResolvedValue('tkn');
      getActiveTenantId.mockReturnValue('finca-principal');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await fetchFromFarmOS('/api/asset/plant');
      const calledUrl = fetchSpy.mock.calls[0][0];
      expect(calledUrl).toContain('filter[uid.name]=finca-principal');
    });

    it('no inyecta filtro de tenant si ya existe filter[uid]', async () => {
      const { getAccessToken } = await import('../authService.js');
      const { getActiveTenantId } = await import('../tenantContext.js');
      getAccessToken.mockResolvedValue('tkn');
      getActiveTenantId.mockReturnValue('otra-finca');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await fetchFromFarmOS('/api/asset/plant?filter[uid.name]=existente');
      const calledUrl = fetchSpy.mock.calls[0][0];
      // No debe agregar el filtro duplicado
      expect(calledUrl).not.toContain('otra-finca');
    });

    it('construye headers con Authorization Bearer', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('bearer-token-123');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await fetchFromFarmOS('/api/asset/plant');
      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.headers.Authorization).toBe('Bearer bearer-token-123');
      expect(opts.headers.Accept).toBe('application/vnd.api+json');
    });

    it('remappea type en el body outgoing', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      const body = JSON.stringify({
        data: { type: 'log--task', attributes: { name: 'Test' } },
      });

      await fetchFromFarmOS('/api/log/activity', {
        method: 'POST',
        body,
        headers: {},
      });

      const [, opts] = fetchSpy.mock.calls[0];
      const sentBody = JSON.parse(opts.body);
      expect(sentBody.data.type).toBe('log--activity');
    });

    it('remappea type en respuesta incoming', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn');

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            { type: 'log--activity', id: '1', attributes: {} },
            { type: 'log--seeding', id: '2', attributes: {} },
          ],
          jsonapi: { version: '1.0' },
        }),
        headers: { get: vi.fn().mockReturnValue('') },
      }));

      const r = await fetchFromFarmOS('/api/log/activity');
      expect(r.data[0].type).toBe('log--task');
      expect(r.data[1].type).toBe('log--planting');
    });
  });

  describe('sendToFarmOS', () => {
    it('es una funcion exportada', () => {
      expect(typeof sendToFarmOS).toBe('function');
    });

    it('no adjunta body en DELETE', async () => {
      const { getAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn');

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [], jsonapi: { version: '1.0' } }),
        headers: { get: vi.fn().mockReturnValue('') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await sendToFarmOS('/api/asset/plant/123', { some: 'data' }, 'DELETE');
      const [, opts] = fetchSpy.mock.calls[0];
      expect(opts.body).toBeUndefined();
    });
  });
});
