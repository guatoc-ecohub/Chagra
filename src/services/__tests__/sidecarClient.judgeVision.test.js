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
