/**
 * agentNluBestEffort.test.js — robustez del routing NLU best-effort del agente.
 *
 * Bug prod 2026-06-02: el planner `/nlu` tiene un prefill de ~9.5s; con el
 * timeout viejo de 10s abortaba justo en el borde en queries agro legítimas y
 * `planNlu` devolvía null. El caso null era un fall-through silencioso en el
 * AgentScreen, dando la impresión de que el turno "moría" (a veces hasta el
 * deadline de 60s, 0 burbujas).
 *
 * Estos tests verifican el INVARIANTE central del fix: NLU es opcional, su
 * ausencia degrada a "chat grounded directo" pero NUNCA bloquea el turno
 * (`proceedToChat` siempre true). Se mockea el sidecar (`planNlu`) para
 * recorrer:
 *   (a) /nlu timeout/fail (planNlu→null) → outcome 'degraded', proceedToChat true.
 *   (b) /nlu OK con tool → routing normal (single_tool / tool_chain).
 *   (c) /nlu OK sin tool → 'no_tool', chat directo (no marcado como degradado).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { decideNluRouting, NLU_OUTCOME } from '../agentNluBestEffort.js';

describe('decideNluRouting — invariante best-effort', () => {
  it('proceedToChat es SIEMPRE true, pase lo que pase con /nlu', () => {
    const inputs = [
      null,
      undefined,
      'no-soy-un-objeto',
      42,
      {},
      { useTool: false },
      { useTool: true, tool: 'get_species', args: { id_or_name: 'maracuya' } },
      { useTool: true, toolChain: [{ tool: 'get_species', args: {} }] },
    ];
    for (const plan of inputs) {
      expect(decideNluRouting(plan).proceedToChat).toBe(true);
    }
  });
});

describe('decideNluRouting — (a) /nlu timeout/fail → chat directo, NO muere el turno', () => {
  it('plan === null (timeout sobre el prefill) → outcome degraded, sin tool, chat directo', () => {
    const r = decideNluRouting(null);
    expect(r.outcome).toBe(NLU_OUTCOME.DEGRADED);
    expect(r.degraded).toBe(true);
    expect(r.proceedToChat).toBe(true);
    expect(r.toolChain).toBeNull();
    expect(r.tool).toBeNull();
    expect(r.args).toBeNull();
  });

  it('plan undefined / no-objeto → mismo degrade graceful', () => {
    for (const bad of [undefined, 'x', 7, true, NaN]) {
      const r = decideNluRouting(bad);
      expect(r.outcome).toBe(NLU_OUTCOME.DEGRADED);
      expect(r.degraded).toBe(true);
      expect(r.proceedToChat).toBe(true);
    }
  });
});

describe('decideNluRouting — (b) /nlu OK con tool → routing normal', () => {
  it('useTool + tool + args → single_tool (NO degradado)', () => {
    const plan = { useTool: true, tool: 'get_species', args: { id_or_name: 'maracuya' }, reason: null };
    const r = decideNluRouting(plan);
    expect(r.outcome).toBe(NLU_OUTCOME.SINGLE_TOOL);
    expect(r.degraded).toBe(false);
    expect(r.proceedToChat).toBe(true);
    expect(r.tool).toBe('get_species');
    expect(r.args).toEqual({ id_or_name: 'maracuya' });
    expect(r.toolChain).toBeNull();
  });

  it('useTool + toolChain no vacío → tool_chain (NO degradado)', () => {
    const chain = [
      { tool: 'get_species', args: { id_or_name: 'maiz' } },
      { tool: 'get_companions', args: { species_id: 'maiz' } },
    ];
    const plan = { useTool: true, toolChain: chain };
    const r = decideNluRouting(plan);
    expect(r.outcome).toBe(NLU_OUTCOME.TOOL_CHAIN);
    expect(r.degraded).toBe(false);
    expect(r.toolChain).toEqual(chain);
    expect(r.tool).toBeNull();
  });

  it('toolChain tiene prioridad sobre tool simple cuando ambos vienen', () => {
    const plan = {
      useTool: true,
      tool: 'get_species',
      args: { id_or_name: 'x' },
      toolChain: [{ tool: 'get_companions', args: {} }],
    };
    expect(decideNluRouting(plan).outcome).toBe(NLU_OUTCOME.TOOL_CHAIN);
  });
});

describe('decideNluRouting — (c) /nlu OK sin tool → chat directo, no degradado', () => {
  it('useTool=false → no_tool, chat directo, degraded=false', () => {
    const plan = { useTool: false, reason: 'low_confidence' };
    const r = decideNluRouting(plan);
    expect(r.outcome).toBe(NLU_OUTCOME.NO_TOOL);
    expect(r.degraded).toBe(false);
    expect(r.proceedToChat).toBe(true);
    expect(r.reason).toBe('low_confidence');
  });

  it('useTool=true pero sin args utilizables → no_tool (no rompe, chat directo)', () => {
    const plan = { useTool: true, tool: 'get_species', args: null };
    const r = decideNluRouting(plan);
    expect(r.outcome).toBe(NLU_OUTCOME.NO_TOOL);
    expect(r.proceedToChat).toBe(true);
  });

  it('toolChain vacío [] NO se trata como cadena → no_tool', () => {
    const plan = { useTool: true, toolChain: [] };
    expect(decideNluRouting(plan).outcome).toBe(NLU_OUTCOME.NO_TOOL);
  });
});

/**
 * Integración con el sidecar real (mockeado): demuestra el flujo end-to-end de
 * la decisión partiendo del CONTRATO de `planNlu`. Esto ata la robustez al
 * comportamiento observable del cliente, no solo a la función pura.
 */
describe('integración con planNlu mockeado — el turno SIEMPRE puede seguir a chat', () => {
  const ENV_FLAG = 'VITE_USE_SIDECAR_AGRO_MCP';
  const ENV_URL = 'VITE_SIDECAR_URL';
  const ENV_TOKEN = 'VITE_CHAGRA_MCP_TOKEN';
  let fetchMock;
  let originalOnLine;

  const importSidecar = async () => {
    vi.resetModules();
    return import('../sidecarClient.js');
  };

  beforeEach(() => {
    vi.stubEnv(ENV_FLAG, 'true');
    vi.stubEnv(ENV_URL, '/api/mcp/agro');
    vi.stubEnv(ENV_TOKEN, 'test-token');
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
  });

  it('/nlu AbortError (timeout) → planNlu null → decideNluRouting degrada a chat directo', async () => {
    fetchMock.mockImplementationOnce(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const { planNlu } = await importSidecar();
    const plan = await planNlu('cómo combato la broca del café');
    expect(plan).toBeNull(); // contrato: timeout → null sin throw.
    const routing = decideNluRouting(plan);
    expect(routing.degraded).toBe(true);
    expect(routing.proceedToChat).toBe(true); // el turno NO muere: sigue a chat.
  });

  it('/nlu 200 con tool → planNlu parsea → decideNluRouting rutea single_tool', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        use_tool: true,
        tool: 'get_species',
        args: { id_or_name: 'maracuya' },
      }),
    });
    const { planNlu } = await importSidecar();
    const plan = await planNlu('contame de la maracuyá');
    const routing = decideNluRouting(plan);
    expect(routing.outcome).toBe(NLU_OUTCOME.SINGLE_TOOL);
    expect(routing.tool).toBe('get_species');
    expect(routing.proceedToChat).toBe(true);
  });

  it('/nlu 503 (sidecar down) → planNlu null → degrade graceful', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) });
    const { planNlu } = await importSidecar();
    const plan = await planNlu('test');
    expect(plan).toBeNull();
    expect(decideNluRouting(plan).proceedToChat).toBe(true);
  });
});
