/**
 * sidecarClient.nluTimeout.test.js — guardrail del timeout de la NLU (raíz #349).
 *
 * Diagnóstico #349: el cliente PWA abortaba la NLU a 10s, pero bajo contención
 * de GPU (varios turnos concurrentes peleando por la M6000) el sidecar tarda
 * ~17s en el peor caso (p99 concurrente). El AbortController disparaba
 * ERR_ABORTED antes de que llegara el grounding → el modelo de chat respondía
 * sin entidades resueltas → alucinaba.
 *
 * Fix raíz: subir NLU_TIMEOUT_MS de 10000 a 18000 ms. El valor debe quedar:
 *   - < el timeout del servidor (20s) para que el cliente NO sea quien aborte
 *     primero cuando el server igual va a responder, y
 *   - > el p99 concurrente observado (~17s) para no cortar grounding válido.
 *
 * Este test NO ejerce la red: mockea fetch para capturar el `signal` que arma
 * el AbortController y verifica que NO se aborta dentro de la ventana de 10s
 * (regresión: si alguien revierte a 10000, el abort vuelve a dispararse a los
 * 10s y este test falla con timers falsos avanzados a 17s).
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

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  originalOnLine = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  enableFlag();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
});

describe('sidecarClient — NLU timeout raíz #349', () => {
  it('NO aborta la NLU dentro de la ventana de 10s (el viejo límite quedó atrás)', async () => {
    vi.useFakeTimers();

    // fetch que resuelve recién a los 17s, capturando el signal del cliente.
    let captured = null;
    fetchMock.mockImplementation((url, opts) => {
      captured = opts?.signal ?? null;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ use_tool: false, reason: 'no_tool_called' }),
          });
        }, 17000);
      });
    });

    const { planNlu } = await importFresh();
    const promise = planNlu('con qué asocio el café');

    // Avanzamos pasado el VIEJO límite (10s) pero antes del NUEVO (18s).
    await vi.advanceTimersByTimeAsync(10500);
    expect(captured).not.toBeNull();
    // Con el fix a 18000 el signal sigue vivo a los 10.5s.
    expect(/** @type {any} */ (captured).aborted).toBe(false);

    // El sidecar responde a los 17s → llega ANTES del nuevo abort (18s).
    await vi.advanceTimersByTimeAsync(7000);
    const res = await promise;
    expect(res).not.toBeNull();
    if (res) expect(res.useTool).toBe(false);
    // Nunca se abortó: el grounding alcanzó a llegar.
    const aborted = /** @type {any} */ (captured).aborted;
    expect(aborted).toBe(false);
  });

  it('sigue abortando si el sidecar excede el nuevo límite (degrada a null, no throw)', async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementation((url, opts) => {
      const signal = opts?.signal;
      return new Promise((resolve, reject) => {
        // Nunca resuelve por su cuenta: solo el abort del cliente lo corta.
        if (signal) {
          signal.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const { planNlu } = await importFresh();
    const promise = planNlu('con qué asocio el café');

    // Pasado el nuevo límite (18s) el cliente aborta y degrada a null sin throw.
    await vi.advanceTimersByTimeAsync(18500);
    const res = await promise;
    expect(res).toBeNull();
  });
});
