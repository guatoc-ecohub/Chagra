/**
 * nluDegradeGrounding.test.js — INVARIANTE #349: cuando el NLU planner muere, el
 * turno NO sale sin grounding.
 *
 * Reproduce a nivel de servicios (sin montar el AgentScreen de 3000 líneas, que el
 * repo evita por frágil) el contrato que el wiring del AgentScreen garantiza:
 *
 *   1. `resolveEntities` (barato/determinístico, corre EN PARALELO antes del
 *      planner) SOBREVIVE aunque `planNlu` expire/falle — son endpoints
 *      independientes del sidecar. El grounding ligero (binomio canónico) SIEMPRE
 *      llega al system prompt.
 *   2. Cuando `planNlu` devuelve null (NLU muerto), `planNluFallback` deriva un
 *      tool de GROUNDING (get_species/get_pest_controllers/get_biopreparados) — el
 *      AgentScreen lo ejecuta con `callTool`, así el LLM recibe evidencia rica en
 *      vez de caer a generativo puro.
 *
 * El bug que cierra: antes del fix, NLU muerto → NINGÚN tool → respuesta sin la
 * evidencia del grafo → alucinación máxima.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { planNluFallback } from '../agentNluFallback.js';

const ENV_FLAG = 'VITE_USE_SIDECAR_AGRO_MCP';
const ENV_URL = 'VITE_SIDECAR_URL';
const ENV_TOKEN = 'VITE_CHAGRA_MCP_TOKEN';

let fetchMock;
let originalOnLine;

const importFresh = async () => {
  vi.resetModules();
  return import('../sidecarClient.js');
};

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  originalOnLine = navigator.onLine;
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  vi.stubEnv(ENV_FLAG, 'true');
  vi.stubEnv(ENV_URL, '/api/mcp/agro');
  vi.stubEnv(ENV_TOKEN, 'test-token-123');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
});

describe('#349 — resolveEntities sobrevive a un /nlu muerto', () => {
  it('aunque POST /nlu falle (HTTP 500), POST /resolve-entities devuelve sus entidades', async () => {
    // El sidecar: /nlu cae (500) pero /resolve-entities responde el grounding.
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/nlu')) {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
      }
      if (String(url).endsWith('/resolve-entities')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            entities: [
              { mentioned: 'café', kind: 'species', canonical_id: 'coffea_arabica', nombre_cientifico: 'Coffea arabica', confidence: 0.95 },
            ],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    const { planNlu, resolveEntities } = await importFresh();
    // Espejo del AgentScreen: ambos se piden en el MISMO turno (resolveEntities en
    // paralelo, planNlu después). El planner muere → null.
    const [resolved, plan] = await Promise.all([
      resolveEntities('cómo cuido el café'),
      planNlu('cómo cuido el café'),
    ]);

    expect(plan).toBeNull(); // NLU muerto.
    // PERO el grounding ligero SÍ llegó: el LLM tendrá el binomio canónico.
    expect(resolved).not.toBeNull();
    expect(resolved.entities).toHaveLength(1);
    expect(resolved.entities[0].canonical_id).toBe('coffea_arabica');
    expect(resolved.entities[0].nombre_cientifico).toBe('Coffea arabica');
  });
});

describe('#349 — NLU muerto + entidad resuelta → fallback dispara un tool de grounding RICO', () => {
  it('con la entidad resuelta del turno, planNluFallback rutea a get_species por canonical_id', async () => {
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/nlu')) {
        // Timeout simulado: el cliente degrada a null (non-2xx).
        return Promise.resolve({ ok: false, status: 504, json: async () => ({}) });
      }
      if (String(url).endsWith('/resolve-entities')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            entities: [{ mentioned: 'café', kind: 'species', canonical_id: 'coffea_arabica', confidence: 0.95 }],
          }),
        });
      }
      if (String(url).includes('/tools/get_species')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ found: true, id: 'coffea_arabica', altitud_min: 1200, altitud_max: 1800, companions: ['guamo', 'platano'] }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    const { planNlu, resolveEntities, callTool } = await importFresh();
    const [resolved, plan] = await Promise.all([
      resolveEntities('cómo cuido el café'),
      planNlu('cómo cuido el café'),
    ]);
    expect(plan).toBeNull();

    // Path de fallo: derivamos el tool obvio desde las entidades resueltas.
    const fbPlan = planNluFallback('cómo cuido el café', resolved.entities);
    expect(fbPlan.tool).toBe('get_species');
    expect(fbPlan.args).toEqual({ id_or_name: 'coffea_arabica' });

    // Y al ejecutarlo, llega evidencia RICA (companions/altitud) — no generativo puro.
    const evidence = await callTool(fbPlan.tool, fbPlan.args);
    expect(evidence).not.toBeNull();
    expect(evidence.found).toBe(true);
    expect(evidence.companions).toContain('guamo');
  });

  it('NLU muerto SIN entidad resuelta (plaga por keyword) → fallback rutea a get_pest_controllers', async () => {
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/nlu')) return Promise.resolve({ ok: false, status: 500, json: async () => ({}) });
      if (String(url).endsWith('/resolve-entities')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ entities: [] }) });
      }
      if (String(url).includes('/tools/get_pest_controllers')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ found: true, controllers: ['beauveria_bassiana'] }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    const { planNlu, resolveEntities, callTool } = await importFresh();
    const [resolved, plan] = await Promise.all([
      resolveEntities('cómo controlo el gusano cogollero'),
      planNlu('cómo controlo el gusano cogollero'),
    ]);
    expect(plan).toBeNull();
    expect(resolved.entities).toHaveLength(0); // sin entidad resuelta.

    const fbPlan = planNluFallback('cómo controlo el gusano cogollero', resolved.entities);
    expect(fbPlan.tool).toBe('get_pest_controllers');

    const evidence = await callTool(fbPlan.tool, fbPlan.args);
    expect(evidence.found).toBe(true);
    expect(evidence.controllers).toContain('beauveria_bassiana');
  });
});

describe('#349 — NLU VIVO no es pisado por el fallback (no se fuerza tool sobre un no_tool deliberado)', () => {
  it('si planNlu responde un plan (aunque sea useTool:false), el AgentScreen NO usaría el fallback', async () => {
    // Documenta el invariante del gate del wiring: `!toolEvidence && !plan`. Aquí
    // `plan` es truthy (no null) → el fallback NO debe correr. Verificamos que el
    // plan NO es null (la condición de gate `!plan` sería false).
    fetchMock.mockImplementation((url) => {
      if (String(url).endsWith('/nlu')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ use_tool: false, reason: 'inventario_directo' }) });
      }
      if (String(url).endsWith('/resolve-entities')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ entities: [] }) });
      }
      return Promise.resolve({ ok: false, status: 404, json: async () => ({}) });
    });

    const { planNlu } = await importFresh();
    const plan = await planNlu('cuántas plantas tengo');
    expect(plan).not.toBeNull();
    expect(plan.useTool).toBe(false);
    // Gate del wiring: `!plan` === false → el fallback NO corre. El "no_tool"
    // deliberado del planner se respeta (preguntas de inventario, etc.).
  });
});
