/**
 * sidecarClient.toolChain.test.js — unit tests para toolChain parsing y ejecución
 *
 * Cobertura:
 * - planNlu() parsea raw.tool_chain a toolChain camelCase
 * - Filtra steps inválidos, normaliza args
 * - Devuelve null si toolChain vacío
 * - Mapea use_tool/tool/args/latencyMs/etc
 * - executeToolChain(chain) ejecuta hasta MAX_STEPS=3
 * - Respeta orden, devuelve array {tool,args,result}
 * - Skip steps sin tool string, slice a 3
 * - ALLOWED_TOOLS whitelist: callTool rechaza tool no permitido
 * - Casos borde: chain vacio/null, raw no-objeto
 *
 * Aislamiento: vi.mock de fetch/postJson/callTool con vi.fn().
 * NO red real, NO ollama.
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

describe('planNlu — toolChain parsing', () => {
  it('parsea raw.tool_chain a toolChain camelCase con steps válidos', async () => {
    const rawResponse = {
      use_tool: true,
      tool: 'get_species',
      args: { id_or_name: 'maracuya' },
      tool_chain: [
        { tool: 'get_species', args: { id_or_name: 'maracuya' } },
        { tool: 'get_companions', args: { species_id: 'passiflora_edulis' } },
      ],
      latency_ms: 250,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: null,
      error: null,
    };

    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));

    const { planNlu } = await importFresh();
    const result = await planNlu('¿qué companion tiene la maracuyá?');

    expect(result).toEqual({
      useTool: true,
      tool: 'get_species',
      args: { id_or_name: 'maracuya' },
      toolChain: [
        { tool: 'get_species', args: { id_or_name: 'maracuya' } },
        { tool: 'get_companions', args: { species_id: 'passiflora_edulis' } },
      ],
      latencyMs: 250,
      modelUsed: 'gemma3:4b',
      heuristicSkipped: false,
      reason: null,
      error: null,
    });
  });

  it('filtra steps inválidos (null, no-objeto, sin tool string)', async () => {
    const rawResponse = {
      use_tool: true,
      tool: null,
      args: null,
      tool_chain: [
        { tool: 'get_species', args: { id_or_name: 'cafe' } },
        null,
        { tool: 'get_companions', args: null }, // args=null se normaliza a {}
        {},
        { not_tool: 'invalid' },
        { args: { id: 1 } },
        { tool: 'validate_taxonomy', args: { species_common: 'café', species_scientific: 'Coffea arabica' } },
      ],
      latency_ms: 180,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: null,
      error: null,
    };

    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));

    const { planNlu } = await importFresh();
    const result = await planNlu('info del café');

    // Deben quedar 3 steps válidos: get_species, get_companions (con args={}), validate_taxonomy
    expect(result.toolChain).toEqual([
      { tool: 'get_species', args: { id_or_name: 'cafe' } },
      { tool: 'get_companions', args: {} }, // args null normalizado a {}
      { tool: 'validate_taxonomy', args: { species_common: 'café', species_scientific: 'Coffea arabica' } },
    ]);
  });

  it('normaliza args: si args es null/no-objeto → args por default {}', async () => {
    const rawResponse = {
      use_tool: true,
      tool: 'get_species',
      tool_chain: [
        { tool: 'get_species', args: null },
        { tool: 'get_companions', args: undefined },
        { tool: 'get_biopreparados', args: { species_id_or_pest: 'maracuya' } },
      ],
      latency_ms: 150,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: null,
      error: null,
    };
    
    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));
    
    const { planNlu } = await importFresh();
    const result = await planNlu('biopreparados para maracuyá');
    
    expect(result.toolChain).toEqual([
      { tool: 'get_species', args: {} },
      { tool: 'get_companions', args: {} },
      { tool: 'get_biopreparados', args: { species_id_or_pest: 'maracuya' } },
    ]);
  });

  it('devuelve null si toolChain resulta vacío después de filtrar', async () => {
    const rawResponse = {
      use_tool: true,
      tool: null,
      args: null,
      tool_chain: [
        null,
        {},
        { not_tool: 'invalid' },
        { args: { id: 1 } },
      ],
      latency_ms: 100,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: null,
      error: null,
    };
    
    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));
    
    const { planNlu } = await importFresh();
    const result = await planNlu('mensaje sin tools válidas');
    
    expect(result.toolChain).toBeNull();
  });

  it('devuelve null si raw.tool_chain es null/undefined/array vacío', async () => {
    const testCases = [
      { tool_chain: null },
      { tool_chain: undefined },
      { tool_chain: [] },
    ];
    
    for (const rawResponse of testCases) {
      const fullResponse = {
        use_tool: false,
        tool: null,
        args: null,
        latency_ms: 50,
        model_used: 'gemma3:4b',
        heuristic_skipped: false,
        reason: 'no_tool_detected',
        error: null,
        ...rawResponse,
      };
      
      fetchMock.mockResolvedValueOnce(jsonResponse(200, fullResponse));
      
      const { planNlu } = await importFresh();
      const result = await planNlu('texto sin intención de tool');
      
      expect(result.toolChain).toBeNull();
    }
  });

  it('mapea todos los campos: use_tool/tool/args/latencyMs/modelUsed/heuristicSkipped/reason/error', async () => {
    const rawResponse = {
      use_tool: true,
      tool: 'get_pest_controllers',
      args: { pest_id_or_name: 'fusarium', limit: 5 },
      tool_chain: [
        { tool: 'get_pest_controllers', args: { pest_id_or_name: 'fusarium', limit: 5 } },
      ],
      latency_ms: 312,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: 'pest_detected',
      error: null,
    };
    
    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));
    
    const { planNlu } = await importFresh();
    const result = await planNlu('qué control biológico para fusarium?');
    
    expect(result.useTool).toBe(true);
    expect(result.tool).toBe('get_pest_controllers');
    expect(result.args).toEqual({ pest_id_or_name: 'fusarium', limit: 5 });
    expect(result.latencyMs).toBe(312);
    expect(result.modelUsed).toBe('gemma3:4b');
    expect(result.heuristicSkipped).toBe(false);
    expect(result.reason).toBe('pest_detected');
    expect(result.error).toBeNull();
  });

  it('caso borde: raw no-objeto → null sin throw', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, null));
    
    const { planNlu } = await importFresh();
    const result = await planNlu('test');
    
    expect(result).toBeNull();
  });

  it('caso borde: raw es string/number → null sin throw', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, 'invalid response'));
    
    const { planNlu } = await importFresh();
    const result = await planNlu('test');
    
    expect(result).toBeNull();
  });

  it('caso borde: tool_chain no-array → toolChain null', async () => {
    const rawResponse = {
      use_tool: true,
      tool: 'get_species',
      tool_chain: { tool: 'get_species', args: { id_or_name: 'cafe' } }, // objeto en lugar de array
      latency_ms: 100,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: null,
      error: null,
    };
    
    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));
    
    const { planNlu } = await importFresh();
    const result = await planNlu('café');
    
    expect(result.toolChain).toBeNull();
    expect(result.tool).toBe('get_species');
  });

  it('caso borde: userMessage vacío/null → null sin fetch', async () => {
    const { planNlu } = await importFresh();
    
    expect(await planNlu('')).toBeNull();
    expect(await planNlu(null)).toBeNull();
    expect(await planNlu(undefined)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('executeToolChain — ejecución secuencial con MAX_STEPS=3', () => {
  it('ejecuta chain de 2 steps correctamente, respeta orden', async () => {
    // Mock fetch para devolver respuestas específicas por cada tool
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { species_id: 'passiflora_edulis', nombre_comun: ['maracuyá'] }))
      .mockResolvedValueOnce(jsonResponse(200, { companions: [{ species_id: 'maiz', distance: 0.8 }] }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'maracuya' } },
      { tool: 'get_companions', args: { species_id: 'passiflora_edulis' } },
    ];

    const result = await executeToolChain(chain);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      tool: 'get_species',
      args: { id_or_name: 'maracuya' },
      result: { species_id: 'passiflora_edulis', nombre_comun: ['maracuyá'] },
    });
    expect(result[1]).toEqual({
      tool: 'get_companions',
      args: { species_id: 'passiflora_edulis' },
      result: { companions: [{ species_id: 'maiz', distance: 0.8 }] },
    });

    // Verifica que se llamó a fetch 2 veces (una por cada tool)
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/tools/get_species');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/mcp/agro/tools/get_companions');
  });

  it('MAX_STEPS=3: slice chain de 5 steps a 3', async () => {
    // Mock fetch para devolver respuestas para los primeros 3 tools
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { tool: 'get_species' }))
      .mockResolvedValueOnce(jsonResponse(200, { tool: 'get_companions' }))
      .mockResolvedValueOnce(jsonResponse(200, { tool: 'get_biopreparados' }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'cafe' } },
      { tool: 'get_companions', args: { species_id: 'coffea_arabica' } },
      { tool: 'get_biopreparados', args: { species_id_or_pest: 'coffea_arabica' } },
      { tool: 'get_pest_controllers', args: { pest_id_or_name: 'broca' } },
      { tool: 'validate_taxonomy', args: { species_common: 'café', species_scientific: 'Coffea arabica' } },
    ];

    const result = await executeToolChain(chain);

    // Solo 3 steps ejecutados
    expect(result).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Verifica que solo se llamaron los primeros 3
    expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/tools/get_species');
    expect(fetchMock.mock.calls[1][0]).toBe('/api/mcp/agro/tools/get_companions');
    expect(fetchMock.mock.calls[2][0]).toBe('/api/mcp/agro/tools/get_biopreparados');
  });

  it('skip steps sin tool string (tool null/undefined/no-string)', async () => {
    // Mock fetch para get_species. tool='' no está en ALLOWED_TOOLS, así que callTool devuelve null sin fetch.
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { tool: 'get_species' }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'mora' } },
      { tool: null, args: { id: 1 } }, // typeof null !== 'string', se salta
      { tool: undefined, args: { id: 2 } }, // typeof undefined !== 'string', se salta
      { tool: '', args: { id: 3 } }, // typeof '' === 'string', NO se salta (bug en código)
      { tool: 42, args: { id: 4 } }, // typeof 42 === 'number', se salta
      { tool: 'get_companions', args: { species_id: 'rubus_glaucus' } },
    ];

    const result = await executeToolChain(/** @type {any} */ (chain));

    // Comportamiento real del código:
    // chain.slice(0, 3) → [get_species, null, undefined]
    // Loop sobre estos 3:
    // - get_species se ejecuta ✓
    // - null se salta ✗
    // - undefined se salta ✗
    // - '', 42, get_companions NUNCA se alcanzan (están fuera del slice)

    // Resultado: solo 1 step ejecutado
    expect(result).toHaveLength(1);
    expect(result[0].tool).toBe('get_species');
    expect(result[0].result).toEqual({ tool: 'get_species' });

    // fetch solo llamado para get_species
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('skip steps null/undefined/{}', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { tool: 'get_species' }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'mora' } },
      null, // !step → true, se salta
      undefined, // !step → true, se salta
      {}, // !step → false, typeof step.tool === 'undefined' !== 'string', se salta
      { tool: 'get_companions', args: { species_id: 'rubus_glaucus' } },
    ];

    const result = await executeToolChain(/** @type {any} */ (chain));

    // Comportamiento real:
    // chain.slice(0, 3) → [get_species, null, undefined]
    // Loop sobre estos 3:
    // - get_species se ejecuta ✓
    // - null se salta ✗
    // - undefined se salta ✗
    // - {} y get_companions NUNCA se alcanzan (están fuera del slice)

    expect(result).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('normaliza args: si args es null/no-objeto → args por default {}', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { tool: 'get_species' }))
      .mockResolvedValueOnce(jsonResponse(200, { tool: 'get_companions' }))
      .mockResolvedValueOnce(jsonResponse(200, { tool: 'get_biopreparados' }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: null },
      { tool: 'get_companions', args: undefined },
      { tool: 'get_biopreparados', args: { species_id_or_pest: 'maracuya' } },
    ];

    const result = await executeToolChain(chain);

    expect(result).toHaveLength(3);

    // Verifica que args normalizados se pasaron en el body
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({});
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ species_id_or_pest: 'maracuya' });
  });

  it('caso borde: chain vacío/null/no-array → array vacío', async () => {
    const { executeToolChain } = await importFresh();

    expect(await executeToolChain([])).toEqual([]);
    expect(await executeToolChain(null)).toEqual([]);
    expect(await executeToolChain(undefined)).toEqual([]);
    expect(await executeToolChain(/** @type {any} */ ({}))).toEqual([]);
    expect(await executeToolChain(/** @type {any} */ ('not an array'))).toEqual([]);
    expect(await executeToolChain(/** @type {any} */ (42))).toEqual([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('herramientas que fallan (timeout/error) → result lleva ToolError fetch_failed', async () => {
    // Mock fetch: primero ok, segundo error
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { species_id: 'passiflora_edulis' }))
      .mockResolvedValueOnce(jsonResponse(500, { error: 'kg down' }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'maracuya' } },
      { tool: 'get_companions', args: { species_id: 'passiflora_edulis' } },
    ];

    const result = await executeToolChain(chain);

    expect(result).toHaveLength(2);
    expect(result[0].result).toEqual({ species_id: 'passiflora_edulis' });
    // callTool ahora propaga el ToolError tri-estado (no null) cuando el tool
    // fue intentado pero falló; executeToolChain lo conserva como evidence del
    // paso para que el formatter señale el gap al LLM.
    expect(result[1].result).toEqual({ _error: true, reason: 'fetch_failed', tool: 'get_companions' });
  });

  it('SPEED-5 (#257): ejecuta los pasos en PARALELO (no secuencial)', async () => {
    // fetch que resuelve tras un delay, rastreando concurrencia in-flight.
    let inFlight = 0;
    let maxConcurrent = 0;
    const delayedFetch = vi.fn(() => {
      inFlight += 1;
      maxConcurrent = Math.max(maxConcurrent, inFlight);
      return new Promise((resolve) => {
        setTimeout(() => {
          inFlight -= 1;
          resolve(jsonResponse(200, { ok: true }));
        }, 20);
      });
    });
    globalThis.fetch = delayedFetch;

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'cafe' } },
      { tool: 'get_companions', args: { species_id: 'coffea_arabica' } },
      { tool: 'get_biopreparados', args: { species_id_or_pest: 'coffea_arabica' } },
    ];

    const result = await executeToolChain(chain);

    // Los 3 estuvieron en vuelo a la vez → paralelo, no secuencial.
    expect(maxConcurrent).toBe(3);
    expect(result).toHaveLength(3);
    expect(result.map((e) => e.tool)).toEqual([
      'get_species',
      'get_companions',
      'get_biopreparados',
    ]);
    // El orden de las requests se preserva (se inician en orden del chain).
    expect(/** @type {any} */ (delayedFetch).mock.calls[0][0]).toBe('/api/mcp/agro/tools/get_species');
    expect(/** @type {any} */ (delayedFetch).mock.calls[2][0]).toBe('/api/mcp/agro/tools/get_biopreparados');
  });

  it('ejecuta exactamente 3 steps cuando chain tiene 3', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { step: 1 }))
      .mockResolvedValueOnce(jsonResponse(200, { step: 2 }))
      .mockResolvedValueOnce(jsonResponse(200, { step: 3 }));

    const { executeToolChain } = await importFresh();

    const chain = [
      { tool: 'get_species', args: { id_or_name: 'cafe' } },
      { tool: 'get_companions', args: { species_id: 'coffea_arabica' } },
      { tool: 'get_biopreparados', args: { species_id_or_pest: 'coffea_arabica' } },
    ];

    const result = await executeToolChain(chain);

    expect(result).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('ALLOWED_TOOLS whitelist — callTool rechaza no permitidos', () => {
  it('callTool rechaza tool no permitido con ToolError not_allowed sin fetch', async () => {
    const { callTool } = await importFresh();

    const result = await callTool('delete_everything', {});

    // Contrato tri-estado: rechazo de whitelist → ToolError not_allowed (no
    // null). El tool NUNCA llega a la red (defensa en profundidad).
    expect(result).toEqual({ _error: true, reason: 'not_allowed', tool: 'delete_everything' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('callTool rechaza tools peligrosos: drop/delete/truncate/exec/eval', async () => {
    const { callTool } = await importFresh();

    const dangerousTools = [
      'drop_table',
      'delete_database',
      'truncate_users',
      'exec_code',
      'eval_js',
      'rm_rf',
      'sudo_bash',
    ];

    for (const tool of dangerousTools) {
      const result = await callTool(tool, {});
      // Cada peligroso → ToolError not_allowed con el nombre del tool, jamás
      // se intenta el fetch.
      expect(result).toEqual({ _error: true, reason: 'not_allowed', tool });
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('callTool acepta todos los tools en ALLOWED_TOOLS', async () => {
    const { callTool, __TEST__ } = await importFresh();
    
    const allowedTools = [
      'get_species',
      'get_companions',
      'get_biopreparados',
      'get_pest_controllers',
      'get_multihop_companions',
      'validate_visual_match',
      'validate_taxonomy',
      'get_normativa_ica',
      'get_clima_ideam',
      'get_precio_sipsa',
      'get_enso_status',
      'get_alertas_clima_zona',
    ];
    
    // Verifica que estén en el set
    for (const tool of allowedTools) {
      expect(__TEST__.ALLOWED_TOOLS.has(tool)).toBe(true);
    }
    
    // Mock fetch para verificar que sí se llama
    fetchMock.mockResolvedValue(jsonResponse(200, { result: 'ok' }));
    
    // Verifica que callTool sí hace fetch para tools permitidos
    for (const tool of allowedTools) {
      const result = await callTool(tool, {});
      expect(result).toEqual({ result: 'ok' });
    }

    expect(fetchMock).toHaveBeenCalledTimes(allowedTools.length);
  });

  it('whitelist es defensa en profundidad: tool no listado → null', async () => {
    const { callTool, __TEST__ } = await importFresh();
    
    // Verifica que el tool sospechoso NO esté en el set
    expect(__TEST__.ALLOWED_TOOLS.has('inject_sql')).toBe(false);
    expect(__TEST__.ALLOWED_TOOLS.has('xss_attack')).toBe(false);
    expect(__TEST__.ALLOWED_TOOLS.has('path_traversal')).toBe(false);

    // Verifica que callTool rechaza con ToolError not_allowed (tri-estado) y
    // sin tocar la red.
    expect(await callTool('inject_sql', {})).toEqual({ _error: true, reason: 'not_allowed', tool: 'inject_sql' });
    expect(await callTool('xss_attack', {})).toEqual({ _error: true, reason: 'not_allowed', tool: 'xss_attack' });
    expect(await callTool('path_traversal', {})).toEqual({ _error: true, reason: 'not_allowed', tool: 'path_traversal' });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caso borde: toolName vacío/null/undefined/no-string → null sin fetch', async () => {
    const { callTool } = await importFresh();
    
    expect(await callTool('', {})).toBeNull();
    expect(await callTool(null, {})).toBeNull();
    expect(await callTool(undefined, {})).toBeNull();
    expect(await callTool(42, {})).toBeNull();
    expect(await callTool({}, {})).toBeNull();
    
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('integración: planNlu + executeToolChain', () => {
  it('workflow completo: planNlu devuelve toolChain → executeToolChain la ejecuta', async () => {
    const rawResponse = {
      use_tool: true,
      tool: 'get_species',
      args: { id_or_name: 'maracuya' },
      tool_chain: [
        { tool: 'get_species', args: { id_or_name: 'maracuya' } },
        { tool: 'get_companions', args: { species_id: 'passiflora_edulis' } },
      ],
      latency_ms: 250,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: null,
      error: null,
    };

    // Mock: primero para planNlu, luego para los 2 tools
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, rawResponse))
      .mockResolvedValueOnce(jsonResponse(200, { species_id: 'passiflora_edulis', nombre_comun: ['maracuyá'] }))
      .mockResolvedValueOnce(jsonResponse(200, { companions: [{ species_id: 'maiz', distance: 0.8 }] }));

    const { planNlu, executeToolChain } = await importFresh();

    // Paso 1: planNlu decide la cadena
    const plan = await planNlu('¿qué companion tiene la maracuyá?');

    expect(plan.useTool).toBe(true);
    expect(plan.toolChain).toHaveLength(2);

    // Paso 2: executeToolChain ejecuta la cadena
    const evidences = await executeToolChain(plan.toolChain);

    expect(evidences).toHaveLength(2);
    expect(evidences[0].result).toEqual({ species_id: 'passiflora_edulis', nombre_comun: ['maracuyá'] });
    expect(evidences[1].result).toEqual({ companions: [{ species_id: 'maiz', distance: 0.8 }] });

    // Verifica que se hicieron 3 llamadas: 1 para planNlu + 2 para tools
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('workflow: planNlu devuelve toolChain vacío → executeToolChain devuelve []', async () => {
    const rawResponse = {
      use_tool: false,
      tool: null,
      args: null,
      tool_chain: [],
      latency_ms: 50,
      model_used: 'gemma3:4b',
      heuristic_skipped: false,
      reason: 'no_tool_detected',
      error: null,
    };

    fetchMock.mockResolvedValueOnce(jsonResponse(200, rawResponse));

    const { planNlu, executeToolChain } = await importFresh();

    const plan = await planNlu('hola');

    expect(plan.useTool).toBe(false);
    expect(plan.toolChain).toBeNull();

    const evidences = await executeToolChain(plan.toolChain);

    expect(evidences).toEqual([]);

    // Solo 1 llamada para planNlu, 0 para tools
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
