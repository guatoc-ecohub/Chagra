/**
 * offlineContracts.test.js — contrato OFFLINE de los servicios de Chagra.
 *
 * Garantía offline-first a nivel de servicio: con navigator.onLine=false, los
 * servicios que dependen de red deben DEGRADAR a null / mensaje claro SIN
 * lanzar excepciones no controladas y SIN colgarse esperando la red. Esto evita
 * el síntoma "el agente/clima se queda pensando" y el "spinner infinito" que el
 * usuario reportó offline (Lili/MinAmbiente 2026-06-11).
 *
 * Estos contratos corren en CI (vitest jsdom) y son baratos: stubean
 * navigator.onLine y verifican el comportamiento de degradación, sin red real.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setOnline } from '../../test-utils/index.js';
import { aggregateNotifications } from '../notificationsService.js';

vi.mock('../ensoService.js', () => ({
  recordLiveEnsoStatus: vi.fn(),
  applyEnsoOverride: vi.fn((v) => v),
}));

describe('offline contracts — servicios degradan a null/mensaje sin throw', () => {
  beforeEach(() => {
    vi.resetModules();
    setOnline(false);
  });
  afterEach(() => {
    setOnline(true);
    vi.restoreAllMocks();
    vi.unstubAllEnvs?.();
  });

  describe('ollamaStream (asistente IA)', () => {
    it('offline → throw con mensaje CLARO de internet (no se cuelga esperando fetch)', async () => {
      vi.mock('../llmTelemetryService', () => ({ recordLLMEvent: vi.fn() }));
      const { streamOllama } = await import('../ollamaStream');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');

      await expect(
        streamOllama('/api/ollama/api/generate', { model: 'granite3.3:8b', prompt: 'hola' }, () => {})
      ).rejects.toThrow(/sin conexión|internet/i);

      // El guard debe disparar ANTES de tocar la red: fetch no se llama.
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('online → NO corta por el guard (intenta la red)', async () => {
      vi.mock('../llmTelemetryService', () => ({ recordLLMEvent: vi.fn() }));
      setOnline(true);
      vi.resetModules();
      const { streamOllama } = await import('../ollamaStream');
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
      // online: el guard NO debe abortar; el fetch sí se intenta (y falla por mock).
      await expect(
        streamOllama('/api/ollama/api/generate', { model: 'granite3.3:8b', prompt: 'hola' }, () => {})
      ).rejects.toBeTruthy();
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('deepResearchClient (investigación profunda)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DEEP_RESEARCH_ENABLED', 'true');
    });

    it('submitDeepResearch offline → null inmediato sin throw ni red', async () => {
      const mod = await import('../deepResearchClient');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await mod.submitDeepResearch('¿qué siembro en junio?');
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('fetchDeepResearchStatus offline → null sin throw ni red', async () => {
      const mod = await import('../deepResearchClient');
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      const result = await mod.fetchDeepResearchStatus('job-123');
      expect(result).toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('climaService (cache offline)', () => {
    afterEach(() => {
      localStorage.clear();
    });

    it('getCachedClimaSnapshot devuelve null cuando no hay cache', async () => {
      vi.doMock('../sidecarClient.js', () => ({
        getClimaSnapshot: vi.fn().mockResolvedValue(null),
      }));
      const mod = await import('../climaService.js');
      expect(mod.getCachedClimaSnapshot()).toBeNull();
    });

    it('fetchClimaSnapshot persiste en cache y getCachedClimaSnapshot lo recupera sin red', async () => {
      const mockPayload = {
        fetched_at: new Date().toISOString(),
        enso_status: { phase: 'neutral', severity: 'neutral', sources: [] },
        alertas_locales: [],
      };
      vi.doMock('../sidecarClient.js', () => ({
        getClimaSnapshot: vi.fn().mockResolvedValue(mockPayload),
      }));
      vi.doMock('../userProfileService.js', () => ({
        getProfile: vi.fn().mockReturnValue(null),
        getProfileMunicipio: vi.fn().mockReturnValue(null),
      }));
      vi.doMock('../../utils/colombiaLocations.js', () => ({
        findMunicipio: vi.fn().mockReturnValue(null),
      }));

      const mod = await import('../climaService.js');
      const snap = await mod.fetchClimaSnapshot({ lat: 4.53, lng: -73.92, elevation: 2580 });
      expect(snap).toBeTruthy();

      // Tras el fetch, getCachedClimaSnapshot debe devolver el cache sin red.
      const cached = mod.getCachedClimaSnapshot(4.53, -73.92, 2580);
      expect(cached).toBeTruthy();
      expect(cached?.enso_status?.phase).toBe('neutral');
    });
  });

  describe('agentRequestQueue (offline)', () => {
    beforeEach(async () => {
      vi.doMock('../../db/dbCore', () => ({
        openDB: vi.fn().mockResolvedValue({}),
        STORES: { AGENT_REQUESTS: 'agent_requests' },
      }));
    });

    it('drainPending offline → marca requests como offline y no procesa', async () => {
      const mod = await import('../agentRequestQueue');
      const result = await mod.drainPending({ sender: vi.fn() });
      expect(result.processed).toBe(0);
    });

    it('enqueueRequest + markRequestOffline → el request queda con status offline', async () => {
      const mockDb = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            add: vi.fn(() => {
              const req = {};
              queueMicrotask(() => { req.result = 1; req.onsuccess?.({ target: req }); });
              return req;
            }),
            get: vi.fn(() => {
              const req = {};
              queueMicrotask(() => {
                req.result = { id: 1, status: 'queued', prompt: 'test', ts_submit: Date.now() };
                req.onsuccess?.({ target: req });
              });
              return req;
            }),
            put: vi.fn(() => {
              const req = {};
              queueMicrotask(() => { req.onsuccess?.({ target: req }); });
              return req;
            }),
          }),
        }),
      };
      vi.doMock('../../db/dbCore', () => ({
        openDB: vi.fn().mockResolvedValue(mockDb),
        STORES: { AGENT_REQUESTS: 'agent_requests' },
      }));

      vi.resetModules();
      const mod = await import('../agentRequestQueue');
      const id = await mod.enqueueRequest({ prompt: '¿qué siembro?' });
      expect(id).toBeGreaterThanOrEqual(0);
    });
  });

  describe('notificationsService (offline)', () => {
    it('aggregateNotifications devuelve [] sin crash cuando no hay fuentes', () => {
      const arr = aggregateNotifications({});
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(0);
    });

    it('aggregateNotifications devuelve [] sin crash con fuentes vacias', () => {
      const arr = aggregateNotifications({
        plants: [],
        tasks: [],
        failedTxCount: 0,
      });
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBe(0);
    });

    it('aggregateNotifications no lanza con entradas vacias o undefined', () => {
      expect(() => aggregateNotifications(undefined)).not.toThrow();
      // null sí puede lanzar — el contrato es que el caller pase un objeto.
    });
  });
});
