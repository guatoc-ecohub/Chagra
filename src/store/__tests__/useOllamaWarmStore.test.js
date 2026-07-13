// @ts-nocheck
/**
// @ts-nocheck
 * useOllamaWarmStore — NN4 fix 2026-05-23.
 *
 * Cubre el bus global de warm-up del modelo Ollama de CHAT:
 *   - estado inicial 'unknown'
 *   - startWarmup dispara fetch con payload correcto y transiciona
 *     'unknown' → 'warming' → 'warm' al recibir 200 OK
 *   - error de fetch transiciona 'warming' → 'failed'
 *   - idempotencia: llamar startWarmup mientras está 'warming' o 'warm' NO
 *     dispara segunda request
 *   - resetWarmup vuelve al estado inicial limpio
 *
 * Fix cold-start (R2, 2026-06-03): el pre-warm DEBE calentar el modelo que
 * el chat realmente usa (`DEFAULT_MODEL` de llmRouter = ROUTES.chat.model), NO
 * el NLU (gemma3:4b). Antes calentaba gemma → el primer chat con el modelo de
 * chat caía al cold-start de ~46s. Además se pinnea con keep_alive=-1 (sin
 * expiración por timer) en vez de '30m'.
 *
 * El nombre exacto del modelo de chat evoluciona (granite3.1-dense:8b →
 * granite3.3:8b, 2026-06-11). Por eso aserta contra `DEFAULT_MODEL`
 * (importado de llmRouter), NUNCA contra un string hardcoded: la invariante
 * que protege este test es "pre-warm == modelo de chat ≠ NLU", no qué granite
 * específico está promovido hoy.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import useOllamaWarmStore from '../useOllamaWarmStore';
import { DEFAULT_MODEL } from '../../services/llmRouter';

const waitForFetchCalls = async (count) => {
  for (let i = 0; i < 20 && vi.mocked(fetch).mock.calls.length < count; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  expect(fetch).toHaveBeenCalledTimes(count);
};

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

  it('startWarmup dispara fetch al endpoint Ollama con payload correcto', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(/** @type {Response} */ ({ ok: true, status: 200 }));
    useOllamaWarmStore.getState().startWarmup();

    await waitForFetchCalls(1);
    const [url, opts] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('/api/ollama/api/generate');
    expect(opts.method).toBe('POST');
    expect(opts.headers).toMatchObject({ 'Content-Type': 'application/json' });
    const body = JSON.parse(/** @type {string} */ (opts.body));
    expect(body).toMatchObject({
      model: DEFAULT_MODEL,
      prompt: 'ok',
      stream: false,
      keep_alive: -1,
      options: { num_predict: 1 },
    });
  });

  it('pre-warm apunta al modelo de CHAT (granite), no al NLU (gemma)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(/** @type {Response} */ ({ ok: true, status: 200 }));
    useOllamaWarmStore.getState().startWarmup();

    await waitForFetchCalls(1);
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(/** @type {string} */ (opts.body));
    // El modelo pre-calentado debe ser exactamente el del chat configurado
    // en llmRouter (ROUTES.chat.model). Si fueran distintos, el modelo de chat
    // queda frío y el primer chat sufre el cold-start de ~46s. Aserta contra
    // DEFAULT_MODEL (no un string fijo) para sobrevivir promociones de modelo.
    expect(body.model).toBe(DEFAULT_MODEL);
    // Invariante anti-regresión del bug NN4: NUNCA debe calentar el modelo de
    // NLU (gemma3:4b) en vez del de chat.
    expect(body.model).not.toBe('gemma3:4b');
  });

  it('pre-warm pinnea el modelo con keep_alive=-1 (sin expiración por timer)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(/** @type {Response} */ ({ ok: true, status: 200 }));
    useOllamaWarmStore.getState().startWarmup();

    await waitForFetchCalls(1);
    const [, opts] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(/** @type {string} */ (opts.body));
    // keep_alive=-1 mantiene el modelo cargado indefinidamente (no expira a
    // los 30m). Evita que granite se descargue de GPU entre login y chat.
    expect(body.keep_alive).toBe(-1);
  });

  it('transiciona unknown → warming → warm cuando fetch responde 200', async () => {
    let resolveFetch;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFetch = () => resolve(/** @type {any} */ ({ ok: true, status: 200 }));
        }),
    );

    useOllamaWarmStore.getState().startWarmup();
    // Inmediatamente post-dispatch, status debe ser 'warming' con startedAt.
    let s = useOllamaWarmStore.getState();
    expect(s.status).toBe('warming');
    expect(s.startedAt).toBeTypeOf('number');
    expect(s.completedAt).toBeNull();

    await waitForFetchCalls(1);
    // Resolvemos el fetch y flusheamos el microtask queue.
    resolveFetch?.();
    // Resolvemos el fetch y flusheamos el microtask queue.
    await new Promise((r) => setTimeout(r, 0));

    s = useOllamaWarmStore.getState();
    expect(s.status).toBe('warm');
    expect(s.completedAt).toBeTypeOf('number');
    expect(s.completedAt).toBeGreaterThanOrEqual(s.startedAt);
  });

  it('transiciona warming → failed cuando fetch rechaza con error de red', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network down'));

    useOllamaWarmStore.getState().startWarmup();
    expect(useOllamaWarmStore.getState().status).toBe('warming');

    await new Promise((r) => setTimeout(r, 0));

    const s = useOllamaWarmStore.getState();
    expect(s.status).toBe('failed');
    expect(s.completedAt).toBeTypeOf('number');
  });

  it('transiciona warming → failed cuando fetch responde HTTP no-OK', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(/** @type {Response} */ ({ ok: false, status: 500 }));

    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));

    expect(useOllamaWarmStore.getState().status).toBe('failed');
  });

  it('idempotencia: llamar startWarmup en estado warming NO dispara segundo fetch', async () => {
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {})); // pending forever
    useOllamaWarmStore.getState().startWarmup();
    await waitForFetchCalls(1);
    expect(useOllamaWarmStore.getState().status).toBe('warming');

    useOllamaWarmStore.getState().startWarmup();
    useOllamaWarmStore.getState().startWarmup();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('idempotencia: llamar startWarmup en estado warm NO dispara segundo fetch', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(/** @type {Response} */ ({ ok: true, status: 200 }));
    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('warm');
    expect(fetch).toHaveBeenCalledTimes(1);

    useOllamaWarmStore.getState().startWarmup();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('desde estado failed sí permite re-intentar startWarmup', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('first fail'));
    useOllamaWarmStore.getState().startWarmup();
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('failed');
    expect(fetch).toHaveBeenCalledTimes(1);

    // Segundo intento desde 'failed' debe disparar un nuevo fetch.
    vi.mocked(fetch).mockResolvedValueOnce(/** @type {Response} */ ({ ok: true, status: 200 }));
    useOllamaWarmStore.getState().startWarmup();
    await waitForFetchCalls(2);
    await new Promise((r) => setTimeout(r, 0));
    expect(useOllamaWarmStore.getState().status).toBe('warm');
  });

  it('resetWarmup vuelve al estado inicial limpio', () => {
    useOllamaWarmStore.setState({ status: 'warm', startedAt: 1000, completedAt: 2000 });
    useOllamaWarmStore.getState().resetWarmup();
    const s = useOllamaWarmStore.getState();
    expect(s.status).toBe('unknown');
    expect(s.startedAt).toBeNull();
    expect(s.completedAt).toBeNull();
  });
});
