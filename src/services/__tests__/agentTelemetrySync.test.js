/* eslint-disable no-undef */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeFakeDB, setOnline } from '../../test-utils/index.js';

/**
 * Tests de sincronización de telemetría del agente (#6230).
 *
 * Cubren:
 * - syncAgentTelemetry respeta consentimiento
 * - syncAgentTelemetry respeta offline
 * - syncAgentTelemetry respeta VITE_TELEMETRY_INGEST_URL vacío
 * - anonymizeRequest remueve PII (prompt, response)
 * - markRequestSynced marca synced: true
 * - POST al endpoint con payload correcto
 * - Falla silente (no lanza)
 */

let fakeDB;

vi.mock('../../db/dbCore.js', () => ({
  openDB: vi.fn(async () => fakeDB),
  STORES: { AGENT_REQUESTS: 'agent_requests' },
}));

// ─── Mock de userProfileService ───
vi.mock('../userProfileService.js', () => ({
  getTelemetryConsent: vi.fn(() => false),
  setTelemetryConsent: vi.fn(() => true),
}));

// ─── Mock de agentRequestQueue ───
vi.mock('../agentRequestQueue.js', () => ({
  listRequests: vi.fn(async () => []),
  getRequest: vi.fn(async (_id) => null),
}));

global.fetch = vi.fn();

beforeEach(() => {
  fakeDB = makeFakeDB();
  setOnline(true);
  vi.clearAllMocks();
  
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  setOnline(true);
});

// Importar los módulos mockeados
import { getTelemetryConsent } from '../userProfileService.js';
import { listRequests, getRequest } from '../agentRequestQueue.js';

describe('agentTelemetrySync — syncAgentTelemetry', () => {
  it('respeta consentimiento denegado (default OFF)', async () => {
    // Recargar módulo con VITE_TELEMETRY_INGEST_URL vacío
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', '');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(false);

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('respeta offline', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', '');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(false);

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('respeta VITE_TELEMETRY_INGEST_URL vacío (no-op)', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', '');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('no hace nada si no hay requests pendientes de sync', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);
    listRequests.mockResolvedValue([]);

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('anonimiza y envía requests con status=done y synced !== true', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const doneRequests = [
      {
        id: 1,
        ts_submit: 1234567890,
        ts_done: 1234567900,
        prompt: '¿Qué le pasa a mi café?', // PII - debe removerse
        response: 'Tu café tiene...', // PII - debe removerse
        route: 'chat',
        model: 'llama3:70b',
        grounding: { entities: ['cafe'], tools: ['get_species'] },
        latency: { t_total_ms: 1500, t_first_token_ms: 200 },
        tokens_in: 50,
        tokens_out: 100,
        retries: 0,
        status: 'done',
        synced: false,
      },
      {
        id: 2,
        ts_submit: 1234567891,
        ts_done: 1234567910,
        prompt: 'Ayuda con mi tomate', // PII - debe removerse
        response: 'Para tu tomate...', // PII - debe removerse
        route: 'foliage',
        model: 'gpt-4o',
        grounding: { entities: ['tomate'], tools: [] },
        latency: { t_total_ms: 2000 },
        tokens_in: 60,
        tokens_out: 120,
        retries: 1,
        status: 'done',
        synced: false,
      },
    ];

    listRequests.mockResolvedValue(doneRequests);
    getRequest.mockImplementation(async (_id) => {
      return doneRequests.find((r) => r.id === _id) || null;
    });

    await syncAgentTelemetry();

    // Verificar que se llamó a fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const fetchCall = global.fetch.mock.calls[0];
    expect(fetchCall[0]).toBe('https://telemetry.example.com/ingest');
    expect(fetchCall[1].method).toBe('POST');
    expect(fetchCall[1].headers['Content-Type']).toBe('application/json');

    // Verificar payload anonimizado
    const payload = JSON.parse(fetchCall[1].body);
    expect(payload).toHaveLength(2);

    // Primer request anonimizado
    expect(payload[0].id).toBe(1);
    expect(payload[0].prompt).toBeUndefined(); // PII removido
    expect(payload[0].response).toBeUndefined(); // PII removido
    expect(payload[0].route).toBe('chat');
    expect(payload[0].model).toBe('llama3:70b');
    expect(payload[0].grounding).toEqual({ entities: ['cafe'], tools: ['get_species'] });
    expect(payload[0].latency.t_total_ms).toBe(1500);

    // Segundo request anonimizado
    expect(payload[1].id).toBe(2);
    expect(payload[1].prompt).toBeUndefined(); // PII removido
    expect(payload[1].response).toBeUndefined(); // PII removido
    expect(payload[1].route).toBe('foliage');
    expect(payload[1].model).toBe('gpt-4o');
  });

  it('default al sidecar /ingest + envía X-Chagra-Token (Tarea #8)', async () => {
    vi.unstubAllEnvs();
    // Sin VITE_TELEMETRY_INGEST_URL: cae al sidecar. Token presente.
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', '');
    vi.stubEnv('VITE_SIDECAR_URL', 'https://chagra.example.co/api');
    vi.stubEnv('VITE_CHAGRA_MCP_TOKEN', 'tok-123');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');

    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const doneRequests = [{ id: 9, route: 'chat', model: 'granite3.3:8b', status: 'done', synced: false }];
    listRequests.mockResolvedValue(doneRequests);
    getRequest.mockImplementation(async (_id) => doneRequests.find((r) => r.id === _id) || null);

    await syncAgentTelemetry();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://chagra.example.co/api/ingest');
    expect(opts.headers['X-Chagra-Token']).toBe('tok-123');
  });

  it('ignora requests que no están done', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const requests = [
      { id: 1, status: 'queued', synced: false }, // No done
      { id: 2, status: 'failed', synced: false }, // No done
      { id: 3, status: 'sending', synced: false }, // No done
    ];

    listRequests.mockResolvedValue(requests);

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('ignora requests ya sincronizados (synced: true)', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const requests = [
      {
        id: 1,
        status: 'done',
        synced: true, // Ya sincronizado
        prompt: 'test',
        route: 'chat',
      },
    ];

    listRequests.mockResolvedValue(requests);

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 0 });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('marca requests como sincronizados tras POST exitoso', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const doneRequests = [
      {
        id: 1,
        ts_submit: 1234567890,
        ts_done: 1234567900,
        prompt: 'test',
        route: 'chat',
        model: 'llama3:70b',
        status: 'done',
        synced: false,
        grounding: {},
        latency: {},
      },
    ];

    listRequests.mockResolvedValue(doneRequests);
    getRequest.mockImplementation(async (_id) => {
      return doneRequests.find((r) => r.id === _id) || null;
    });

    const Result = await syncAgentTelemetry();

    expect(Result.synced).toBe(1);
    expect(Result.errors).toBe(0);

    // Verificar que el request quedó marcado como synced: true
    const syncedRequest = await getRequest(1);
    expect(syncedRequest.synced).toBe(true);
  });

  it('falla silente si el endpoint responde error', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    const doneRequests = [
      {
        id: 1,
        ts_submit: 1234567890,
        ts_done: 1234567900,
        prompt: 'test',
        route: 'chat',
        status: 'done',
        synced: false,
        grounding: {},
        latency: {},
      },
    ];

    listRequests.mockResolvedValue(doneRequests);

    // Mock response error
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const Result = await syncAgentTelemetry();

    expect(Result).toEqual({ synced: 0, errors: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('falla silente si hay excepción (no lanza)', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { syncAgentTelemetry } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    // Mock que lanza excepción
    getTelemetryConsent.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const Result = await syncAgentTelemetry();

    expect(Result).toBeNull(); // Falla silente
  });
});

describe('agentTelemetrySync — isTelemetrySyncEnabled', () => {
  it('devuelve false si consentimiento denegado', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { isTelemetrySyncEnabled } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(false);
    setOnline(true);

    expect(isTelemetrySyncEnabled()).toBe(false);
  });

  it('devuelve false si offline', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { isTelemetrySyncEnabled } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(false);

    expect(isTelemetrySyncEnabled()).toBe(false);
  });

  it('default al sidecar /ingest cuando VITE_TELEMETRY_INGEST_URL está vacío (Tarea #8)', async () => {
    // Comportamiento nuevo: sin override explícito la URL cae al endpoint
    // /ingest del sidecar, así que con consentimiento + online queda habilitado.
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', '');
    const { isTelemetrySyncEnabled, getTelemetryIngestUrl } = await import('../agentTelemetrySync.js');

    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    expect(getTelemetryIngestUrl()).toMatch(/\/ingest$/);
    expect(isTelemetrySyncEnabled()).toBe(true);
  });

  it('devuelve true si todo está habilitado', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_TELEMETRY_INGEST_URL', 'https://telemetry.example.com/ingest');
    const { isTelemetrySyncEnabled } = await import('../agentTelemetrySync.js');
    
    getTelemetryConsent.mockReturnValue(true);
    setOnline(true);

    expect(isTelemetrySyncEnabled()).toBe(true);
  });
});
