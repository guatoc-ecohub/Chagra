/**
 * sidecarClient.judgeVision.test.js — wrapper V-08 (#229) LLM-as-judge visión.
 *
 * Cobertura:
 *  - judgeVision POSTea {species_id, image_b64} a /judge-vision y normaliza la
 *    respuesta {plausible, confidence, motivo}.
 *  - Valida args (sin species_id / sin image_b64 → null sin fetch).
 *  - flag off / offline → null sin fetch (postJson ya lo cubre, smoke).
 *  - Respuesta no-objeto / fetch falla → null.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_FLAG = 'VITE_USE_SIDECAR_AGRO_MCP';
const ENV_URL = 'VITE_SIDECAR_URL';
const ENV_TOKEN = 'VITE_CHAGRA_MCP_TOKEN';

let fetchMock;
let originalOnLine;

const enableFlag = () => {
  vi.stubEnv(ENV_FLAG, 'true');
  vi.stubEnv(ENV_URL, '/api/mcp/agro');
  vi.stubEnv(ENV_TOKEN, 'test-token-123');
};

const importFresh = async () => {
  vi.resetModules();
  return import('../sidecarClient.js');
};

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  originalOnLine = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  enableFlag();
});

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
});

describe('judgeVision — V-08 cross-verify visión', () => {
  it('POSTea {species_id, image_b64} a /judge-vision y normaliza la respuesta', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { plausible: true, confidence: 82, motivo: 'hojas compuestas coinciden' }),
    );
    const { judgeVision } = await importFresh();

    const res = await judgeVision('coffea_arabica', 'BASE64DATA');

    expect(res).toEqual({ plausible: true, confidence: 82, motivo: 'hojas compuestas coinciden' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/judge-vision');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      species_id: 'coffea_arabica',
      image_b64: 'BASE64DATA',
    });
  });

  it('normaliza plausible:null (juez no pudo decidir) sin romper', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { plausible: null, confidence: null, motivo: 'timeout' }),
    );
    const { judgeVision } = await importFresh();

    const res = await judgeVision('zea_mays', 'IMG');
    expect(res).toEqual({ plausible: null, confidence: null, motivo: 'timeout' });
  });

  it('devuelve null sin fetch cuando falta species_id o image_b64', async () => {
    const { judgeVision } = await importFresh();

    expect(await judgeVision('', 'IMG')).toBeNull();
    expect(await judgeVision('coffea_arabica', '')).toBeNull();
    expect(await judgeVision(null, 'IMG')).toBeNull();
    expect(await judgeVision('coffea_arabica', null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve null cuando el sidecar falla (no-200)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'ollama down' }));
    const { judgeVision } = await importFresh();

    const res = await judgeVision('coffea_arabica', 'IMG');
    expect(res).toBeNull();
  });
});

describe('judgeVisionAsync — gate async #328 (encola, 202)', () => {
  it('POSTea a /judge-vision-async y devuelve {request_id}', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(202, { request_id: 'jv-abc-123' }));
    const { judgeVisionAsync } = await importFresh();

    const res = await judgeVisionAsync('coffea_arabica', 'BASE64DATA');

    expect(res).toEqual({ request_id: 'jv-abc-123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/judge-vision-async');
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      species_id: 'coffea_arabica',
      image_b64: 'BASE64DATA',
    });
  });

  it('devuelve null sin fetch cuando falta species_id o image_b64', async () => {
    const { judgeVisionAsync } = await importFresh();

    expect(await judgeVisionAsync('', 'IMG')).toBeNull();
    expect(await judgeVisionAsync('coffea_arabica', '')).toBeNull();
    expect(await judgeVisionAsync(null, 'IMG')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve null si el sidecar responde sin request_id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(202, { ok: true }));
    const { judgeVisionAsync } = await importFresh();

    const res = await judgeVisionAsync('zea_mays', 'IMG');
    expect(res).toBeNull();
  });

  it('devuelve null cuando el sidecar falla (no-2xx)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'queue full' }));
    const { judgeVisionAsync } = await importFresh();

    const res = await judgeVisionAsync('coffea_arabica', 'IMG');
    expect(res).toBeNull();
  });
});

describe('judgeVisionResult — poll del veredicto async #328', () => {
  it('GETea /judge-vision-result con ?request_id y pasa el body crudo (done)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'done', plausible: true, confidence: 77, motivo: 'coincide' }),
    );
    const { judgeVisionResult } = await importFresh();

    const res = await judgeVisionResult('jv-abc-123');

    expect(res).toEqual({ status: 'done', plausible: true, confidence: 77, motivo: 'coincide' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/judge-vision-result?request_id=jv-abc-123');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('pasa el estado pending tal cual (aún juzgando)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'pending' }));
    const { judgeVisionResult } = await importFresh();

    const res = await judgeVisionResult('jv-pending');
    expect(res).toEqual({ status: 'pending' });
  });

  it('devuelve null sin fetch cuando falta request_id', async () => {
    const { judgeVisionResult } = await importFresh();

    expect(await judgeVisionResult('')).toBeNull();
    expect(await judgeVisionResult(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve null cuando el sidecar falla (no-200)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'gone' }));
    const { judgeVisionResult } = await importFresh();

    const res = await judgeVisionResult('jv-abc-123');
    expect(res).toBeNull();
  });
});
