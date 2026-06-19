import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../authService.js', () => ({
  getAccessToken: vi.fn().mockResolvedValue('mock-token'),
  refreshAccessToken: vi.fn().mockResolvedValue(null),
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

import { fetchFromFarmOS, fetchWithAuthRetry, sendToFarmOS } from '../apiService.js';

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

  describe('fetchWithAuthRetry', () => {
    beforeEach(async () => {
      const { getAccessToken, refreshAccessToken } = await import('../authService.js');
      getAccessToken.mockReset().mockResolvedValue('mock-token');
      refreshAccessToken.mockReset().mockResolvedValue(null);
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
      });
    });

    it('ante 401 refresca token y reintenta una vez con el Bearer nuevo', async () => {
      const { getAccessToken, refreshAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('token-viejo');
      refreshAccessToken.mockResolvedValueOnce('token-nuevo');

      const fetchSpy = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          headers: { get: vi.fn().mockReturnValue('') },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: { get: vi.fn().mockReturnValue('') },
          json: async () => ({ ok: true }),
        });
      vi.stubGlobal('fetch', fetchSpy);

      const response = await fetchWithAuthRetry('/api/ollama/api/tags', {
        method: 'GET',
        headers: { 'X-Chagra-Token': 'sidecar-token' },
      });

      expect(response.ok).toBe(true);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][1].headers.Authorization).toBe('Bearer token-viejo');
      expect(fetchSpy.mock.calls[0][1].headers['X-Chagra-Token']).toBe('sidecar-token');
      expect(fetchSpy.mock.calls[1][1].headers.Authorization).toBe('Bearer token-nuevo');
      expect(fetchSpy.mock.calls[1][1].headers['X-Chagra-Token']).toBe('sidecar-token');
    });

    it('offline falla rapido sin llamar fetch ni refresh', async () => {
      const { refreshAccessToken } = await import('../authService.js');
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false,
      });
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);

      await expect(fetchWithAuthRetry('/api/ollama/api/tags')).rejects.toThrow('Offline');
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(refreshAccessToken).not.toHaveBeenCalled();
    });
  });

  // Cura del bug "sesión zombi" (operador 2026-06-18): ante un 401 del backend
  // (token rechazado server-side), fetchFromFarmOS intenta UNA renovación con
  // el refresh_token y reintenta, en vez de mandar directo a #login.
  describe('fetchFromFarmOS — auto-refresh en 401', () => {
    beforeEach(async () => {
      // Aislar el conteo de llamadas de refreshAccessToken entre tests.
      const { getAccessToken, refreshAccessToken } = await import('../authService.js');
      getAccessToken.mockClear();
      refreshAccessToken.mockClear();
    });

    it('en 401, si refreshAccessToken da token nuevo, reintenta y devuelve data (sin ir a login)', async () => {
      const { getAccessToken, refreshAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn-viejo');
      refreshAccessToken.mockResolvedValueOnce('tkn-nuevo');

      // 1er fetch: 401. 2do fetch (retry): 200 con data.
      const fetchSpy = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          text: async () => '{"errors":[{"status":"401"}]}',
          headers: { get: vi.fn().mockReturnValue('application/vnd.api+json') },
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: [{ id: 'p1', type: 'asset--plant' }], jsonapi: { version: '1.0' } }),
          headers: { get: vi.fn().mockReturnValue('') },
        });
      vi.stubGlobal('fetch', fetchSpy);

      const r = await fetchFromFarmOS('/api/asset/plant');
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledTimes(2); // 401 + retry
      expect(r.data[0].id).toBe('p1'); // datos cargan tras renovar (no zombi)
    });

    it('en 401, si la renovación falla, NO reintenta en bucle y lanza el error', async () => {
      const { getAccessToken, refreshAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn-viejo');
      refreshAccessToken.mockResolvedValue(null); // refresh muerto

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"errors":[{"status":"401"}]}',
        headers: { get: vi.fn().mockReturnValue('application/vnd.api+json') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      await expect(fetchFromFarmOS('/api/asset/plant')).rejects.toThrow();
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      // 1 intento original + 1 retry (que vuelve a dar 401 pero ya no refresca).
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Estado de sesión CLARO (no zombi): si el 401 persiste tras la renovación,
    // se despacha 'chagra:session-expired' para que App navegue a login en vez
    // de dejar al usuario en el dashboard vacío → OnboardingHero engañoso
    // (prod-down 2026-06-18).
    it('en 401 con renovación fallida, despacha chagra:session-expired', async () => {
      const { getAccessToken, refreshAccessToken } = await import('../authService.js');
      getAccessToken.mockResolvedValue('tkn-viejo');
      refreshAccessToken.mockResolvedValue(null);

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"errors":[{"status":"401"}]}',
        headers: { get: vi.fn().mockReturnValue('application/vnd.api+json') },
      });
      vi.stubGlobal('fetch', fetchSpy);

      const sessionExpired = vi.fn();
      window.addEventListener('chagra:session-expired', sessionExpired);
      try {
        await expect(fetchFromFarmOS('/api/asset/plant')).rejects.toThrow();
        expect(sessionExpired).toHaveBeenCalledTimes(1);
        expect(sessionExpired.mock.calls[0][0].detail.status).toBe(401);
      } finally {
        window.removeEventListener('chagra:session-expired', sessionExpired);
      }
    });
  });
});
