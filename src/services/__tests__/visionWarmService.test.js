import { describe, it, expect, beforeEach, vi } from 'vitest';
import { warmVisionModel, __resetVisionWarmState } from '../visionWarmService.js';

/**
 * Tests del pre-warm del modelo de visión (fire-and-forget, idempotente).
 * Se mockea fetch global; el estado interno se reinicia con __resetVisionWarmState.
 * No se asercionan nombres de modelo (se mantienen fuera del test).
 */

beforeEach(() => {
  __resetVisionWarmState();
  vi.unstubAllGlobals();
});

/** @param {*} mockFn @param {*} count */
const waitForMockCalls = async (mockFn, count) => {
  for (let i = 0; i < 20 && mockFn.mock.calls.length < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(mockFn).toHaveBeenCalledTimes(count);
};

describe('warmVisionModel', () => {
  it('dispara un fetch POST al endpoint de ollama y retorna true si responde ok', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const r = await warmVisionModel();
    expect(r).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = /** @type {any[]} */ (fetchMock.mock.calls[0]);
    expect(url).toContain('/api/ollama/api/generate');
    expect(/** @type {any} */ (opts).method).toBe('POST');
    expect(/** @type {any} */ (opts).body).toContain('keep_alive');
  });

  it('retorna false si la respuesta no es ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    expect(await warmVisionModel()).toBe(false);
  });

  it('retorna false (degrada silencioso) si fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network'); }));
    expect(await warmVisionModel()).toBe(false);
  });

  it('idempotente: tras un warm exitoso reciente NO vuelve a fetchear', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await warmVisionModel();
    await warmVisionModel(); // dentro de la ventana SKIP_IF_RECENT
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tras __resetVisionWarmState vuelve a fetchear', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    await warmVisionModel();
    __resetVisionWarmState();
    await warmVisionModel();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('lock in-flight: una segunda llamada concurrente no dispara otro fetch', async () => {
    let resolveFetch;
    const fetchMock = vi.fn(() => new Promise((res) => { resolveFetch = () => res({ ok: true }); }));
    vi.stubGlobal('fetch', fetchMock);
    const p1 = warmVisionModel();        // queda in-flight
    const r2 = await warmVisionModel();  // debe cortocircuitar por el lock
    expect(r2).toBe(true);
    await waitForMockCalls(fetchMock, 1);
    /** @type {any} */ (resolveFetch)();
    expect(await p1).toBe(true);
  });
});
