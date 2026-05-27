/**
 * textWarmService — QUICK-4 Tier S iter 2 (2026-05-27).
 *
 * Cubre warm fire-and-forget al login de modelos texto Ollama:
 *   - dispara fetch a `/api/ollama/api/generate` para gemma3:4b + granite3.1-dense:8b
 *   - payload correcto (model, prompt vacío, keep_alive=10m)
 *   - idempotencia: en flight, no dispara segunda
 *   - skipIfRecent: si hace <8min, no re-dispara
 *   - errores degradan silenciosos (no throw)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { warmTextModels, __resetTextWarmState, __TEST__ } from '../textWarmService';

describe('textWarmService — QUICK-4 warm modelos texto on-login', () => {
  beforeEach(() => {
    __resetTextWarmState();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('TEXT_MODELS incluye gemma3:4b y granite3.1-dense:8b', () => {
    expect(__TEST__.TEXT_MODELS).toContain('gemma3:4b');
    expect(__TEST__.TEXT_MODELS).toContain('granite3.1-dense:8b');
  });

  it('KEEP_ALIVE = "10m" para warm post-login (8min skip threshold + 2min margen)', () => {
    expect(__TEST__.KEEP_ALIVE).toBe('10m');
  });

  it('warmTextModels dispara POST por cada modelo con payload correcto', async () => {
    fetch.mockResolvedValue({ ok: true });
    const result = await warmTextModels();
    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(__TEST__.TEXT_MODELS.length);

    for (const call of fetch.mock.calls) {
      const [url, opts] = call;
      expect(url).toBe('/api/ollama/api/generate');
      expect(opts.method).toBe('POST');
      const body = JSON.parse(opts.body);
      expect(body.prompt).toBe('');
      expect(body.stream).toBe(false);
      expect(body.keep_alive).toBe('10m');
      expect(__TEST__.TEXT_MODELS).toContain(body.model);
    }
  });

  it('idempotencia: warm reciente (<8min) skipea sin disparar fetch', async () => {
    fetch.mockResolvedValue({ ok: true });
    await warmTextModels();
    expect(fetch).toHaveBeenCalledTimes(__TEST__.TEXT_MODELS.length);

    const callsAfterFirst = fetch.mock.calls.length;
    const result = await warmTextModels();
    expect(result).toBe(true);
    // No nuevos fetches porque el lock SKIP_IF_RECENT_MS está activo.
    expect(fetch.mock.calls.length).toBe(callsAfterFirst);
  });

  it('fetch rechaza → degrada silencioso sin throw', async () => {
    fetch.mockRejectedValue(new Error('network down'));
    // Si no degrada, esto throwearía y rompería el test.
    const result = await warmTextModels();
    expect(result).toBe(false);
  });

  it('fetch responde HTTP 500 → degrada silencioso, retorna false', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500 });
    const result = await warmTextModels();
    expect(result).toBe(false);
  });

  it('warm con un modelo OK + uno fallando → retorna true (best-effort)', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await warmTextModels();
    expect(result).toBe(true);
  });

  it('llamadas concurrentes mientras una está in-flight → idempotente', async () => {
    // Cada fetch captura su resolver — necesitamos resolver TODOS los modelos
    // para que el Promise.all interno termine.
    const resolvers = [];
    fetch.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(() => resolve({ ok: true }));
        }),
    );

    const p1 = warmTextModels();
    const p2 = warmTextModels();
    const p3 = warmTextModels();

    // p2/p3 deben retornar true inmediatamente sin disparar nuevos fetches.
    await expect(p2).resolves.toBe(true);
    await expect(p3).resolves.toBe(true);

    // Resolver todos los fetches para que p1 complete.
    resolvers.forEach((r) => r());
    await p1;
    // Solo TEXT_MODELS fetches del primer call, no de p2/p3.
    expect(fetch).toHaveBeenCalledTimes(__TEST__.TEXT_MODELS.length);
  });
});
