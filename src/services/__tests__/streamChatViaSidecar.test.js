/**
 * streamChatViaSidecar.test.js — unit tests para el cliente SSE de
 * /chat/stream del sidecar (SPEED-1).
 *
 * Cobertura:
 *   - Feature flag `isAgentStreamingEnabled()` parseado correctamente
 *   - Streaming SSE happy path: emite onStart → onToken×N → onDone con stats
 *   - Multi-chunk decoder (deltas que llegan partidos en TCP) reensambla bien
 *   - `data: [DONE]` cierra el stream
 *   - 502 del sidecar → throw con mensaje legible
 *   - AbortSignal aborta fetch y propaga AbortError
 *   - Eventos `{type:"error"}` mid-stream invocan onError sin abortar
 *
 * Aislamiento: mock `globalThis.fetch` con ReadableStream + TextEncoder.
 * Sin red real. `vi.stubEnv` para configurar env vars `VITE_*`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ENV_FLAG = 'VITE_AGENT_STREAMING';
const ENV_URL = 'VITE_SIDECAR_URL';
const ENV_TOKEN = 'VITE_CHAGRA_MCP_TOKEN';

// Mock telemetry para no escribir IDB en tests.
vi.mock('../llmTelemetryService', () => ({
  recordLLMEvent: vi.fn(),
}));

const importFresh = async () => {
  vi.resetModules();
  return import('../streamChatViaSidecar.js');
};

/**
 * Builds a ReadableStream that emits `chunks` (each a string). Each chunk
 * may contain one or more SSE events. The stream closes after the last
 * chunk. Use this to simulate TCP fragmentation (split chunks at weird
 * boundaries to stress the decoder).
 */
function makeSseBody(chunks) {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    async pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(enc.encode(chunks[i]));
      i++;
    },
  });
}

function sseResponse(chunks, { status = 200 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    body: makeSseBody(chunks),
    headers: new Map([['content-type', 'text/event-stream']]),
    text: async () => '',
  };
}

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isAgentStreamingEnabled', () => {
  it('default false sin env var', async () => {
    vi.unstubAllEnvs();
    const { isAgentStreamingEnabled } = await importFresh();
    expect(isAgentStreamingEnabled()).toBe(false);
  });

  it('"true" → true', async () => {
    vi.stubEnv(ENV_FLAG, 'true');
    const { isAgentStreamingEnabled } = await importFresh();
    expect(isAgentStreamingEnabled()).toBe(true);
  });

  it('"1" → true (compat docker env)', async () => {
    vi.stubEnv(ENV_FLAG, '1');
    const { isAgentStreamingEnabled } = await importFresh();
    expect(isAgentStreamingEnabled()).toBe(true);
  });

  it('"false" → false', async () => {
    vi.stubEnv(ENV_FLAG, 'false');
    const { isAgentStreamingEnabled } = await importFresh();
    expect(isAgentStreamingEnabled()).toBe(false);
  });

  it('cualquier otro string → false', async () => {
    vi.stubEnv(ENV_FLAG, 'maybe');
    const { isAgentStreamingEnabled } = await importFresh();
    expect(isAgentStreamingEnabled()).toBe(false);
  });
});

describe('streamChatViaSidecar — happy path', () => {
  beforeEach(() => {
    vi.stubEnv(ENV_FLAG, 'true');
    vi.stubEnv(ENV_URL, '/api/mcp/agro');
    vi.stubEnv(ENV_TOKEN, 'test-token-123');
  });

  it('emite onStart, onToken×N, onDone con stats y devuelve fullText', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"granite3.1-dense:8b","request_id":"r1"}\n\n',
      'data: {"type":"delta","content":"Hola "}\n\n',
      'data: {"type":"delta","content":"mijo"}\n\n',
      'data: {"type":"done","total_ms":1234,"first_token_ms":420,"eval_count":3,"eval_rate":6.5,"total_chars":9,"model":"granite3.1-dense:8b","prompt_eval_count":8}\n\n',
      'data: [DONE]\n\n',
    ]));

    const tokens = [];
    const starts = [];
    let doneStats = null;
    const { streamChatViaSidecar } = await importFresh();

    const { fullText, stats } = await streamChatViaSidecar({
      model: 'granite3.1-dense:8b',
      messages: [{ role: 'user', content: 'hola' }],
      onStart: (e) => starts.push(e),
      onToken: (chunk, full) => tokens.push({ chunk, full }),
      onDone: (s) => { doneStats = s; },
    });

    expect(fullText).toBe('Hola mijo');
    expect(starts).toHaveLength(1);
    expect(starts[0].model).toBe('granite3.1-dense:8b');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual({ chunk: 'Hola ', full: 'Hola ' });
    expect(tokens[1]).toEqual({ chunk: 'mijo', full: 'Hola mijo' });
    expect(doneStats).toBeDefined();
    expect(/** @type {any} */ (doneStats).eval_count).toBe(3);
    expect(/** @type {any} */ (doneStats).eval_rate).toBe(6.5);
    expect(/** @type {any} */ (doneStats).prompt_eval_count).toBe(8);
    expect(stats.fullText).toBe('Hola mijo');
    expect(stats.sidecar_first_token_ms).toBe(420);
  });

  it('reensambla SSE cuando los chunks se parten a mitad de evento (TCP fragmentation)', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"m"',  // chunk 1: evento parcial
      ',"request_id":"x"}\n\ndata: {"type":"delta","content":"abc"}\n',  // chunk 2: cierra start + abre delta sin doble-newline
      '\ndata: {"type":"delta","content":"def"}\n\n',  // chunk 3: termina delta1 + nuevo delta
      'data: {"type":"done","total_ms":1,"first_token_ms":1,"eval_count":2,"eval_rate":2,"total_chars":6}\n\ndata: [DONE]\n\n',
    ]));

    const tokens = [];
    const { streamChatViaSidecar } = await importFresh();

    const { fullText } = await streamChatViaSidecar({
      model: 'm',
      messages: [{ role: 'user', content: 'hola' }],
      onToken: (chunk) => tokens.push(chunk),
    });

    expect(fullText).toBe('abcdef');
    expect(tokens).toEqual(['abc', 'def']);
  });

  it('manda headers Auth + Content-Type + Accept y body con messages/model', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"m"}\n\n',
      'data: {"type":"delta","content":"x"}\n\n',
      'data: {"type":"done","total_ms":1,"first_token_ms":1,"eval_count":1,"eval_rate":1,"total_chars":1}\n\n',
      'data: [DONE]\n\n',
    ]));

    const { streamChatViaSidecar } = await importFresh();
    await streamChatViaSidecar({
      model: 'granite3.1-dense:8b',
      messages: [{ role: 'user', content: 'hola' }],
      options: { temperature: 0.3 },
      keep_alive: '30m',
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/mcp/agro/chat/stream');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Accept']).toBe('text/event-stream');
    expect(init.headers['X-Chagra-Token']).toBe('test-token-123');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('granite3.1-dense:8b');
    expect(body.messages).toHaveLength(1);
    expect(body.options).toEqual({ temperature: 0.3 });
    expect(body.keep_alive).toBe('30m');
  });

  it('omite header X-Chagra-Token cuando el token no está set', async () => {
    vi.unstubAllEnvs();
    vi.stubEnv(ENV_FLAG, 'true');
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"m"}\n\n',
      'data: {"type":"done","total_ms":1,"first_token_ms":null,"eval_count":0,"eval_rate":null,"total_chars":0}\n\n',
      'data: [DONE]\n\n',
    ]));

    const { streamChatViaSidecar } = await importFresh();
    await streamChatViaSidecar({
      model: 'm',
      messages: [{ role: 'user', content: 'hola' }],
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Chagra-Token']).toBeUndefined();
  });
});

describe('streamChatViaSidecar — errores', () => {
  beforeEach(() => {
    vi.stubEnv(ENV_FLAG, 'true');
    vi.stubEnv(ENV_URL, '/api/mcp/agro');
  });

  it('throws cuando model no es string', async () => {
    const { streamChatViaSidecar } = await importFresh();
    await expect(
      streamChatViaSidecar({ model: null, messages: [{ role: 'user', content: 'x' }] }),
    ).rejects.toThrow(/model required/);
  });

  it('throws cuando messages está vacío', async () => {
    const { streamChatViaSidecar } = await importFresh();
    await expect(
      streamChatViaSidecar({ model: 'm', messages: [] }),
    ).rejects.toThrow(/non-empty array/);
  });

  it('throws en HTTP non-2xx del sidecar con detalle del body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      body: makeSseBody(['']),
      text: async () => '{"error":"ollama_unreachable"}',
    });

    const { streamChatViaSidecar } = await importFresh();
    await expect(
      streamChatViaSidecar({
        model: 'm',
        messages: [{ role: 'user', content: 'hola' }],
      }),
    ).rejects.toThrow(/502/);
  });

  it('throws en HTTP non-2xx sin body parseable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      body: makeSseBody(['']),
      text: async () => { throw new Error('cant read'); },
    });

    const { streamChatViaSidecar } = await importFresh();
    await expect(
      streamChatViaSidecar({
        model: 'm',
        messages: [{ role: 'user', content: 'hola' }],
      }),
    ).rejects.toThrow(/503/);
  });

  it('propaga AbortError cuando el signal es abortado antes del fetch', async () => {
    const controller = new AbortController();
    controller.abort();
    fetchMock.mockImplementationOnce((_url, init) => {
      // El fetch real respetaría el signal — lo simulamos.
      if (init?.signal?.aborted) {
        const err = new Error('aborted');
        err.name = 'AbortError';
        return Promise.reject(err);
      }
      return Promise.resolve(sseResponse(['data: [DONE]\n\n']));
    });

    const { streamChatViaSidecar } = await importFresh();
    await expect(
      streamChatViaSidecar({
        model: 'm',
        messages: [{ role: 'user', content: 'hola' }],
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('invoca onError cuando el sidecar emite {type:"error"} mid-stream pero no aborta', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"m"}\n\n',
      'data: {"type":"delta","content":"par"}\n\n',
      'data: {"type":"error","detail":"upstream lost connection"}\n\n',
      'data: {"type":"delta","content":"cial"}\n\n',
      'data: {"type":"done","total_ms":1,"first_token_ms":1,"eval_count":2,"eval_rate":2,"total_chars":6}\n\n',
      'data: [DONE]\n\n',
    ]));

    const errs = [];
    const { streamChatViaSidecar } = await importFresh();
    const { fullText } = await streamChatViaSidecar({
      model: 'm',
      messages: [{ role: 'user', content: 'hola' }],
      onError: (e) => errs.push(e),
    });

    expect(errs).toHaveLength(1);
    expect(errs[0].detail).toMatch(/upstream lost connection/);
    expect(fullText).toBe('parcial');
  });
});

describe('streamChatViaSidecar — URL base', () => {
  beforeEach(() => {
    vi.stubEnv(ENV_FLAG, 'true');
  });

  it('usa VITE_SIDECAR_URL cuando está set, sin trailing slash', async () => {
    vi.stubEnv(ENV_URL, 'https://custom.example.com/api/mcp/agro/');
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"m"}\n\n',
      'data: {"type":"done","total_ms":1,"first_token_ms":null,"eval_count":0,"eval_rate":null,"total_chars":0}\n\n',
      'data: [DONE]\n\n',
    ]));
    const { streamChatViaSidecar } = await importFresh();
    await streamChatViaSidecar({
      model: 'm',
      messages: [{ role: 'user', content: 'hola' }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe('https://custom.example.com/api/mcp/agro/chat/stream');
  });

  it('cae al default /api/mcp/agro si VITE_SIDECAR_URL no está set', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([
      'data: {"type":"start","model":"m"}\n\n',
      'data: {"type":"done","total_ms":1,"first_token_ms":null,"eval_count":0,"eval_rate":null,"total_chars":0}\n\n',
      'data: [DONE]\n\n',
    ]));
    const { streamChatViaSidecar } = await importFresh();
    await streamChatViaSidecar({
      model: 'm',
      messages: [{ role: 'user', content: 'hola' }],
    });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/chat/stream');
  });
});
