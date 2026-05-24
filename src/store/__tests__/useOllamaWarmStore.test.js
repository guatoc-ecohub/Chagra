/**
 * useOllamaWarmStore — NN4 fix 2026-05-23.
 *
 * Cubre el bus global de warm-up del modelo Ollama gemma3:4b:
 *   - estado inicial 'unknown'
 *   - startWarmup dispara fetch con payload correcto y transiciona
 *     'unknown' → 'warming' → 'warm' al recibir 200 OK
 *   - error de fetch transiciona 'warming' → 'failed'
 *   - idempotencia: llamar startWarmup mientras está 'warming' o 'warm' NO
 *     dispara segunda request
 *   - resetWarmup vuelve al estado inicial limpio
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useOllamaWarmStore from '../useOllamaWarmStore';

describe('useOllamaWarmStore — NN4 pre-warm Ollama al login', () => {
  beforeEach(() => {
    // Reset siempre antes de cada test: el store es singleton entre tests.
    useOllamaWarmStore.getState().resetWarmup();
    // Spy sobre fetch global. Cada test lo configura con su mock específico.
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('estado inicial: status="unknown", startedAt=null, completedAt=null', () => {
    const s = useOllamaWarmStore.getState();
    expect(s.status).toBe('unknown');
    expect(s.startedAt).toBeNull();
    expect(s.completedAt).toBeNull();
  });

  it('startWarmup dispara fetch al endpoint Ollama con payload correcto', () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    useOllamaWarmStore.getState().startWarmup();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('/api/ollama/api/generate');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({
      model: 'gemma3:4b',
      prompt: 'ok',
      stream: false,
      keep_alive: '30m',
      options: { num_predict: 1 },
    });
  });

  it('transiciona unknown → warming → warm cuando fetch responde 200', async () => {
    let resolveFetch;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve({ ok: true, status: 200 });
        }),
    );

    useOllamaWarmStore.getState().startWarmup();
    // Inmediatamente post-dispatch, status debe ser 'warming' con startedAt.
    let s = useOllamaWarmStore.getState();
    expect(s.status).toBe('warming');
    expect(s.startedAt).toBeTypeOf('number');
    expect(s.completedAt).toBeNull();

    // Resolvemos el fetch y flusheamos el microtask queue.
    resolveFetch();
    await new Promise((r) => setTimeout(r, 0));

    s = useOllamaWarmStore.getState();
    expect(s.status).toBe('warm');
    expect(s.completedAt).toBeTypeOf('number');
    expect(s.completedAt).toBeGreaterThanOrEqual(s.startedAt);
  });

  it('transiciona warming → failed cuando fetch rechaza con error de red', async () => {
    fetch.mockRejectedValueOnce(new Error('Network down'));

    useOllamaWarmStore.getState().startWarmup();
    expect(useOllamaWarmStore.getState().status).toBe('warming');

    await new Promise((r) => setTimeout(r, 0));

    const s = useOllamaWarmStore.getState();
    expect(s.status).toBe('failed');
    expect(s.completedAt).toBeTypeOf('number');
  });

  it('transiciona warming → failed cuando fetch responde HTTP no-OK', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));

    expect(useOllamaWarmStore.getState().status).toBe('failed');
  });

  it('idempotencia: llamar startWarmup en estado warming NO dispara segundo fetch', () => {
    fetch.mockImplementation(() => new Promise(() => {})); // pending forever
    useOllamaWarmStore.getState().startWarmup();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(useOllamaWarmStore.getState().status).toBe('warming');

    useOllamaWarmStore.getState().startWarmup();
    useOllamaWarmStore.getState().startWarmup();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('idempotencia: llamar startWarmup en estado warm NO dispara segundo fetch', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('warm');
    expect(fetch).toHaveBeenCalledTimes(1);

    useOllamaWarmStore.getState().startWarmup();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('desde estado failed sí permite re-intentar startWarmup', async () => {
    fetch.mockRejectedValueOnce(new Error('first fail'));
    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('failed');
    expect(fetch).toHaveBeenCalledTimes(1);

    // Segundo intento desde 'failed' debe disparar un nuevo fetch.
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    useOllamaWarmStore.getState().startWarmup();
    expect(fetch).toHaveBeenCalledTimes(2);
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('warm');
  });

  it('resetWarmup vuelve al estado inicial limpio', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200 });
    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('warm');

    useOllamaWarmStore.getState().resetWarmup();
    const s = useOllamaWarmStore.getState();
    expect(s.status).toBe('unknown');
    expect(s.startedAt).toBeNull();
    expect(s.completedAt).toBeNull();
  });
});
