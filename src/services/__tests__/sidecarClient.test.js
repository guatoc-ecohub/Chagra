/**
 * sidecarClient.test.js — unit tests para el cliente HTTP del sidecar
 * chagra-agro-mcp (ADR-045 Fase 2 Step B/C).
 *
 * Cobertura:
 * - Feature flag off → todas las funciones devuelven null sin fetch.
 * - navigator.onLine=false → null sin fetch (offline-first).
 * - NLU 200 happy path → parsea snake_case → camelCase.
 * - NLU timeout → null sin throw (caller espera contract T | null).
 * - NLU 5xx / 401 → null sin throw.
 * - callTool con tool no permitido → null sin fetch (whitelist defense).
 * - callTool happy path → pasa-through el JSON del sidecar tal cual.
 *
 * Aislamiento: vitest `vi.stubEnv` para `import.meta.env.VITE_*`, `vi.fn()`
 * sobre el global `fetch`. No requiere red real. Usa `vi.resetModules()`
 * para que cada test re-importe `sidecarClient.js` con el env actualizado
 * (algunos paths evalúan env en module-load... aunque acá leemos siempre
 * just-in-time, dejamos resetModules como defensa por si refactoreamos).
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

const disableFlag = () => {
  vi.stubEnv(ENV_FLAG, 'false');
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
  // Por default jsdom marca navigator.onLine=true. Sobreescribimos por
  // test cuando hace falta simular offline.
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnLine });
});

describe('sidecarClient — feature flag off', () => {
  it('isSidecarEnabled() devuelve false si la env var no está set', async () => {
    vi.unstubAllEnvs();
    const { isSidecarEnabled } = await importFresh();
    expect(isSidecarEnabled()).toBe(false);
  });

  it('isSidecarEnabled() devuelve false con "false" explícito', async () => {
    disableFlag();
    const { isSidecarEnabled } = await importFresh();
    expect(isSidecarEnabled()).toBe(false);
  });

  it('planNlu() devuelve null sin hacer fetch cuando flag off', async () => {
    disableFlag();
    const { planNlu } = await importFresh();
    const res = await planNlu('hola');
    expect(res).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('callTool() devuelve null sin hacer fetch cuando flag off', async () => {
    disableFlag();
    const { callTool } = await importFresh();
    const res = await callTool('get_species', { id_or_name: 'maracuya' });
    expect(res).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('sidecarClient — feature flag on', () => {
  beforeEach(() => {
    enableFlag();
  });

  it('isSidecarEnabled() devuelve true con "true"', async () => {
    const { isSidecarEnabled } = await importFresh();
    expect(isSidecarEnabled()).toBe(true);
  });

  it('isSidecarEnabled() acepta "1" como truthy (compat con docker env)', async () => {
    vi.stubEnv(ENV_FLAG, '1');
    const { isSidecarEnabled } = await importFresh();
    expect(isSidecarEnabled()).toBe(true);
  });

  describe('offline behavior', () => {
    it('planNlu() devuelve null sin fetch cuando navigator.onLine=false', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { planNlu } = await importFresh();
      const res = await planNlu('hola');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('callTool() devuelve null sin fetch cuando navigator.onLine=false', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { callTool } = await importFresh();
      const res = await callTool('get_species', { id_or_name: 'mora' });
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('planNlu — happy path + parsing', () => {
    it('200 con body válido → normaliza snake_case → camelCase', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {
        use_tool: true,
        tool: 'get_species',
        args: { id_or_name: 'maracuya' },
        latency_ms: 187,
        model_used: 'gemma3:4b',
        heuristic_skipped: false,
        reason: null,
        error: null,
      }));
      const { planNlu } = await importFresh();
      const res = await planNlu('contame de la maracuyá', 'historial reciente');
      expect(res).toEqual({
        useTool: true,
        tool: 'get_species',
        args: { id_or_name: 'maracuya' },
        // D2 (#246): sin tool_chain en la respuesta → toolChain queda null.
        toolChain: null,
        latencyMs: 187,
        modelUsed: 'gemma3:4b',
        heuristicSkipped: false,
        reason: null,
        error: null,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/nlu');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(opts.headers['Content-Type']).toBe('application/json');
      const body = JSON.parse(opts.body);
      expect(body).toEqual({ user_message: 'contame de la maracuyá', context: 'historial reciente' });
    });

    it('200 sin context (caller no lo pasa) → body no incluye la key', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { use_tool: false }));
      const { planNlu } = await importFresh();
      await planNlu('hola');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ user_message: 'hola' });
      expect('context' in body).toBe(false);
    });

    it('200 con use_tool=false → useTool false + tool/args null', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {
        use_tool: false,
        tool: null,
        args: null,
        reason: 'low_confidence',
      }));
      const { planNlu } = await importFresh();
      const res = await planNlu('contame un chiste');
      expect(res.useTool).toBe(false);
      expect(res.tool).toBeNull();
      expect(res.args).toBeNull();
      expect(res.reason).toBe('low_confidence');
    });

    it('userMessage vacío → null sin fetch', async () => {
      const { planNlu } = await importFresh();
      expect(await planNlu('')).toBeNull();
      expect(await planNlu(null)).toBeNull();
      expect(await planNlu(undefined)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('planNlu — failure modes', () => {
    it('5xx → null sin throw', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'sidecar down' }));
      const { planNlu } = await importFresh();
      const res = await planNlu('test');
      expect(res).toBeNull();
    });

    it('401 unauth → null sin throw', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'invalid token' }));
      const { planNlu } = await importFresh();
      const res = await planNlu('test');
      expect(res).toBeNull();
    });

    it('fetch throws (network failure) → null sin throw', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { planNlu } = await importFresh();
      const res = await planNlu('test');
      expect(res).toBeNull();
    });

    it('AbortError (timeout) → null sin throw', async () => {
      fetchMock.mockImplementationOnce((_url, opts) => {
        // Simula timeout: rechaza con AbortError si el signal aborta antes
        // de que respondamos. Para garantizar el path, abortamos el signal
        // sincrónicamente y rechazamos con el error correspondiente.
        const err = new Error('aborted');
        err.name = 'AbortError';
        if (opts?.signal) {
          // No esperamos al timer real (10s es demasiado para vitest); simulamos
          // el abort directo.
        }
        return Promise.reject(err);
      });
      const { planNlu } = await importFresh();
      const res = await planNlu('test');
      expect(res).toBeNull();
    });

    it('200 pero JSON inválido (json() throws) → null sin throw', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => { throw new SyntaxError('bad json'); },
      });
      const { planNlu } = await importFresh();
      const res = await planNlu('test');
      expect(res).toBeNull();
    });
  });

  describe('callTool — happy path + whitelist', () => {
    it('200 con ficha species → devuelve el body tal cual', async () => {
      const ficha = {
        species_id: 'passiflora_edulis_flavicarpa',
        nombre_comun: ['maracuyá', 'maracuya amarillo'],
        nombre_cientifico: 'Passiflora edulis f. flavicarpa',
        altitud_msnm: [0, 1600],
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, ficha));
      const { callTool } = await importFresh();
      const res = await callTool('get_species', { id_or_name: 'maracuya' });
      expect(res).toEqual(ficha);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/tools/get_species');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(JSON.parse(opts.body)).toEqual({ id_or_name: 'maracuya' });
    });

    it('200 con found=false → pasa-through (no se intercepta)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { found: false }));
      const { callTool } = await importFresh();
      const res = await callTool('get_species', { id_or_name: 'planta_inexistente' });
      expect(res).toEqual({ found: false });
    });

    it('tool name no permitido → ToolError not_allowed sin fetch (whitelist defense)', async () => {
      const { callTool } = await importFresh();
      const res = await callTool('delete_everything', {});
      // Contrato tri-estado documentado de callTool (JSDoc): un tool intentado
      // pero rechazado por la whitelist devuelve ToolError {_error,reason,tool},
      // NO null (null se reserva para "ni se intentó": flag off / offline). Esto
      // permite al caller distinguir "bloqueado" de "no aplica".
      expect(res).toEqual({ _error: true, reason: 'not_allowed', tool: 'delete_everything' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('toolName vacío/no-string → null sin fetch', async () => {
      const { callTool } = await importFresh();
      expect(await callTool('', {})).toBeNull();
      expect(await callTool(null, {})).toBeNull();
      expect(await callTool(42, {})).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('tools nuevos del PR chagra-pro #48 están en whitelist', async () => {
      const { callTool, __TEST__ } = await importFresh();
      expect(__TEST__.ALLOWED_TOOLS.has('get_pest_controllers')).toBe(true);
      expect(__TEST__.ALLOWED_TOOLS.has('get_multihop_companions')).toBe(true);
      expect(__TEST__.ALLOWED_TOOLS.has('validate_visual_match')).toBe(true);
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: 1 }));
      await callTool('get_pest_controllers', { pest_id_or_name: 'fusarium', limit: 5 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/tools/get_pest_controllers');
    });

    it('tools nuevos chagra-pro #64/#65/#66 (ICA/IDEAM/SIPSA) están en whitelist', async () => {
      const { __TEST__ } = await importFresh();
      expect(__TEST__.ALLOWED_TOOLS.has('get_normativa_ica')).toBe(true);
      expect(__TEST__.ALLOWED_TOOLS.has('get_clima_ideam')).toBe(true);
      expect(__TEST__.ALLOWED_TOOLS.has('get_precio_sipsa')).toBe(true);
    });

    it('reconciliación allow-list ↔ NLU (fix P0 2026-06-25): tools SEGURAS expuestas', async () => {
      // El NLU planner conoce 41 tools; estas son las que se agregaron al cliente
      // por ser seguras + valiosas + ruteables por el NLU (grounding del grafo/
      // catálogo/dataset institucional, con id|nombre|término que el planner
      // rellena desde el mensaje). Verificación: están en el allow-list.
      const { __TEST__ } = await importFresh();
      const expuestas = [
        'get_associations',
        'get_fenologia',
        'get_polinizacion',
        'get_invasoras_alternativas',
        'get_saberes_tradicionales',
        'get_variedades_cultivo',
        'get_psa_elegibilidad',
        'get_alerta_carbono',
        'get_alerta_normativa_paramo',
        'get_alerta_clima_consejo',
      ];
      for (const t of expuestas) {
        expect(__TEST__.ALLOWED_TOOLS.has(t)).toBe(true);
      }
    });

    it('reconciliación allow-list ↔ NLU (fix P0 2026-06-25): tools sin args ruteables quedan en DEFLECCIÓN HONESTA', async () => {
      // NO se exponen: exigen credenciales farmOS / coords de dispositivo / NIT
      // DIAN, o un arg obligatorio que el NLU no conoce (altitud de finca, fecha
      // de siembra, biopreparado_id). Si el planner rutea a una de ellas, el
      // guard de AgentScreen inyecta deflección honesta en vez de degradar callado
      // a RAG. Verificación: NO están en el allow-list (callTool las rechaza).
      const { __TEST__ } = await importFresh();
      const deflectadas = [
        'add_planta_finca',
        'get_finca_overview',
        'get_sensor_finca',
        'get_weather_data',
        'get_clima_finca',
        'get_documento_soporte_dian',
        'get_ubicacion_actual',
        'get_cultivos_viables',
        'get_diseno_finca',
        'get_grado_dia',
        'get_dosis_biopreparado',
      ];
      for (const t of deflectadas) {
        expect(__TEST__.ALLOWED_TOOLS.has(t)).toBe(false);
      }
    });

    it('5xx → ToolError fetch_failed sin throw', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(500, { error: 'kg down' }));
      const { callTool } = await importFresh();
      const res = await callTool('get_companions', { species_id: 'maiz' });
      // Tool permitido + intentado pero el sidecar respondió 5xx → ToolError
      // fetch_failed (contrato tri-estado), no null. El turno no se rompe (no
      // throw) y el formatter puede señalar el gap al LLM.
      expect(res).toEqual({ _error: true, reason: 'fetch_failed', tool: 'get_companions' });
    });
  });

  describe('configuración / base URL', () => {
    it('default base URL es /api/mcp/agro si VITE_SIDECAR_URL no está set', async () => {
      vi.stubEnv(ENV_URL, '');
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
      const { planNlu } = await importFresh();
      await planNlu('test');
      expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/nlu');
    });

    it('respeta VITE_SIDECAR_URL custom (sin trailing slash)', async () => {
      vi.stubEnv(ENV_URL, 'https://sidecar.example.test/v1');
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
      const { planNlu } = await importFresh();
      await planNlu('test');
      expect(fetchMock.mock.calls[0][0]).toBe('https://sidecar.example.test/v1/nlu');
    });

    it('strip trailing slash de VITE_SIDECAR_URL para no duplicar /', async () => {
      vi.stubEnv(ENV_URL, '/api/mcp/agro/');
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
      const { planNlu } = await importFresh();
      await planNlu('test');
      expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/nlu');
    });

    it('sin token → no agrega header X-Chagra-Token (no header vacío)', async () => {
      vi.stubEnv(ENV_TOKEN, '');
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {}));
      const { planNlu } = await importFresh();
      await planNlu('test');
      const headers = fetchMock.mock.calls[0][1].headers;
      expect('X-Chagra-Token' in headers).toBe(false);
    });
  });

  describe('wrappers ICA / IDEAM / SIPSA (chagra-pro #64/#65/#66)', () => {
    it('getNormativaIca rechaza action inválida sin fetch', async () => {
      const { getNormativaIca } = await importFresh();
      expect(await getNormativaIca('delete_database', {})).toBeNull();
      expect(await getNormativaIca('', {})).toBeNull();
      expect(await getNormativaIca(null, {})).toBeNull();
      expect(await getNormativaIca(/** @type {any} */ (42), {})).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getNormativaIca con action válida hace POST a /tools/get_normativa_ica con action en body', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { resolutions: [] }));
      const { getNormativaIca } = await importFresh();
      const res = await getNormativaIca('latest_active_ingredients', { limit: 10 });
      expect(res).toEqual({ resolutions: [] });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/tools/get_normativa_ica');
      expect(JSON.parse(opts.body)).toEqual({ action: 'latest_active_ingredients', limit: 10 });
    });

    it('getClimaIdeam valida shape de action (rechaza inválidas, acepta válidas)', async () => {
      const { getClimaIdeam, __TEST__ } = await importFresh();
      // Inválidas → null sin fetch
      expect(await getClimaIdeam('drop_table', { municipio: 'Bogotá' })).toBeNull();
      expect(await getClimaIdeam(undefined, {})).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
      // Set autoritativo de actions
      expect(__TEST__.CLIMA_IDEAM_ACTIONS.has('monthly_avg')).toBe(true);
      expect(__TEST__.CLIMA_IDEAM_ACTIONS.has('stations_near')).toBe(true);
      expect(__TEST__.CLIMA_IDEAM_ACTIONS.has('climate_series')).toBe(true);
      expect(__TEST__.CLIMA_IDEAM_ACTIONS.has('anomalies')).toBe(true);
      // Válida → hace fetch
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { avg_precipitation_mm: 142.3 }));
      const res = await getClimaIdeam('monthly_avg', {
        municipio: 'Mosquera',
        metric: 'precipitation',
        desde: '2026-04-24',
      });
      expect(res).toEqual({ avg_precipitation_mm: 142.3 });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.action).toBe('monthly_avg');
      expect(body.municipio).toBe('Mosquera');
    });

    it('getPrecioSipsa devuelve null si flag off (no fetch)', async () => {
      disableFlag();
      const { getPrecioSipsa } = await importFresh();
      const res = await getPrecioSipsa('latest_price', { producto: 'tomate' });
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('getPrecioSipsa happy path con action válida pasa metadata-ZIP del DANE', async () => {
      const sipsaMeta = {
        action: 'dataset_metadata',
        dataset: 'precios-mayoristas-sipsa',
        zip_url: 'https://www.dane.gov.co/files/.../sipsa.zip',
        notes: 'federated, ZIP only',
      };
      fetchMock.mockResolvedValueOnce(jsonResponse(200, sipsaMeta));
      const { getPrecioSipsa } = await importFresh();
      const res = await getPrecioSipsa('dataset_metadata', {});
      expect(res).toEqual(sipsaMeta);
      expect(fetchMock.mock.calls[0][0]).toBe('/api/mcp/agro/tools/get_precio_sipsa');
    });
  });

  describe('postValidate — capa 2 cross-check', () => {
    it('devuelve null sin fetch cuando flag off', async () => {
      disableFlag();
      const { postValidate } = await importFresh();
      const res = await postValidate('Solanum betaceum es bueno', ['Solanum betaceum Cav.']);
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { postValidate } = await importFresh();
      const res = await postValidate('Solanum betaceum es bueno', ['Solanum betaceum Cav.']);
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando text vacío/no-string', async () => {
      const { postValidate } = await importFresh();
      expect(await postValidate('', ['x'])).toBeNull();
      expect(await postValidate(null, ['x'])).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('POST /post-validate con expected mapea el report y conserva suspect[]', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {
        hallucinated: [],
        validated: [{ scientific_name: 'Solanum lycopersicum', canonical_id: 'solanum_lycopersicum_cerasiforme' }],
        suspect: ['Solanum lycopersicum'],
        age_available: true,
        detected_count: 1,
      }));
      const { postValidate } = await importFresh();
      const res = await postValidate(
        'Para el tomate de árbol, Solanum lycopersicum.',
        ['Solanum betaceum Cav.'],
      );
      expect(res.suspect).toEqual(['Solanum lycopersicum']);
      expect(res.age_available).toBe(true);
      expect(res.detected_count).toBe(1);
      // El cuerpo enviado lleva text + expected.
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/post-validate');
      const body = JSON.parse(opts.body);
      expect(body.text).toContain('Solanum lycopersicum');
      expect(body.expected).toEqual(['Solanum betaceum Cav.']);
    });

    it('NO envía expected cuando el array está vacío (sin cross-check)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {
        hallucinated: [], validated: [], suspect: [], age_available: true, detected_count: 0,
      }));
      const { postValidate } = await importFresh();
      await postValidate('texto sin binomios', []);
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.expected).toBeUndefined();
    });

    it('normaliza un report parcial del sidecar a la forma contractual', async () => {
      // Sidecar viejo sin campo suspect → el cliente lo rellena a [].
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {
        hallucinated: ['Inventus fakeus'],
        validated: [],
        age_available: true,
        detected_count: 1,
      }));
      const { postValidate } = await importFresh();
      const res = await postValidate('Inventus fakeus no existe.', ['Solanum betaceum Cav.']);
      expect(res.suspect).toEqual([]);
      expect(res.hallucinated).toEqual(['Inventus fakeus']);
    });

    it('devuelve null cuando el fetch falla (sidecar caído)', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network'));
      const { postValidate } = await importFresh();
      const res = await postValidate('Solanum betaceum.', ['Solanum betaceum Cav.']);
      expect(res).toBeNull();
    });
  });

  describe('fermentoPrefilter — capa 1 SAFETY-CRITICAL (#159)', () => {
    const FERMENTO_HIT = {
      is_fermento_intent: true,
      fermento_id: 'fermento-kombucha',
      veto_total: false,
      disclaimer_fuerte: true,
      system_prompt_block:
        '=== REGLA DE MÁXIMA PRIORIDAD — FERMENTO DE CONSUMO HUMANO ===\n' +
        'No afirmes propiedades curativas. Disclaimer obligatorio. Cita INVIMA.\n' +
        '=== FIN REGLA FERMENTO ===',
      fuente_autoridad: 'INVIMA',
      reason: 'fermento_intent_resolved',
    };

    const NO_FERMENTO = {
      is_fermento_intent: false,
      fermento_id: null,
      veto_total: false,
      disclaimer_fuerte: false,
      system_prompt_block: '',
      fuente_autoridad: null,
      reason: 'no_fermento_intent',
    };

    it('query de FERMENTO → inyecta el system_prompt_block del sidecar', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, FERMENTO_HIT));
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('cómo hago kombucha casera');
      expect(res).not.toBeNull();
      expect(res.is_fermento_intent).toBe(true);
      expect(res.system_prompt_block).toContain('FERMENTO DE CONSUMO HUMANO');
      expect(res.disclaimer_fuerte).toBe(true);
      expect(res.fuente_autoridad).toBe('INVIMA');
      // POST con user_message a /fermento-prefilter (mismo contrato que /resolve-entities).
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/fermento-prefilter');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(JSON.parse(opts.body)).toEqual({ user_message: 'cómo hago kombucha casera' });
    });

    it('query NO-fermento → is_fermento_intent false + bloque vacío (no se inyecta nada)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, NO_FERMENTO));
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('¿a cómo está la papa?');
      expect(res).not.toBeNull();
      expect(res.is_fermento_intent).toBe(false);
      expect(res.system_prompt_block).toBe('');
      expect(res.veto_total).toBe(false);
    });

    it('veto_total + disclaimer_fuerte se propagan tal cual (refusal)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, {
        ...FERMENTO_HIT,
        fermento_id: 'fermento-hidromiel',
        veto_total: true,
        reason: 'veto_total_menor',
      }));
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('le puedo dar hidromiel al bebé');
      expect(res.veto_total).toBe(true);
      expect(res.disclaimer_fuerte).toBe(true);
      expect(res.fermento_id).toBe('fermento-hidromiel');
    });

    it('normaliza un body parcial del sidecar a la forma contractual (defensivo)', async () => {
      // Sidecar viejo / respuesta incompleta: campos faltantes → defaults seguros.
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { is_fermento_intent: true, system_prompt_block: 'X' }));
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('cómo fermento yuca amarga');
      expect(res.is_fermento_intent).toBe(true);
      expect(res.system_prompt_block).toBe('X');
      expect(res.fermento_id).toBeNull();
      expect(res.veto_total).toBe(false);
      expect(res.disclaimer_fuerte).toBe(false);
      expect(res.fuente_autoridad).toBeNull();
      expect(res.reason).toBe('');
    });

    it('devuelve null sin fetch cuando flag off (degradación graceful)', async () => {
      disableFlag();
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('cómo hago kombucha');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('cómo hago kombucha');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando userMessage vacío/no-string', async () => {
      const { fermentoPrefilter } = await importFresh();
      expect(await fermentoPrefilter('')).toBeNull();
      expect(await fermentoPrefilter(null)).toBeNull();
      expect(await fermentoPrefilter(undefined)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('5xx → null sin throw (sidecar caído, no rompe el turno)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'age down' }));
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('cómo hago kombucha');
      expect(res).toBeNull();
    });

    it('fetch throws → null sin throw', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { fermentoPrefilter } = await importFresh();
      const res = await fermentoPrefilter('cómo hago kombucha');
      expect(res).toBeNull();
    });
  });

  describe('biopreparadoGrounding — capa 1 GROUNDING (#248)', () => {
    const BIOPREPARADO_HIT = {
      has_biopreparado: true,
      biopreparado_id: 'caldo-bordeles',
      system_prompt_block:
        '=== BIOPREPARADO REAL DEL CATÁLOGO — caldo bordelés ===\n' +
        'Composición: sulfato de cobre + cal. Uso: fungicida foliar.\n' +
        'NUNCA digas que este insumo no existe.\n' +
        '=== FIN BIOPREPARADO ===',
      reason: 'biopreparado_resolved',
    };

    const NO_BIOPREPARADO = {
      has_biopreparado: false,
      biopreparado_id: null,
      system_prompt_block: '',
      reason: 'no_biopreparado_intent',
    };

    it('query de BIOPREPARADO → inyecta el system_prompt_block del sidecar', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, BIOPREPARADO_HIT));
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('cómo preparo caldo bordelés');
      expect(res).not.toBeNull();
      expect(res.has_biopreparado).toBe(true);
      expect(res.biopreparado_id).toBe('caldo-bordeles');
      expect(res.system_prompt_block).toContain('NUNCA digas que este insumo no existe');
      // POST con user_message a /biopreparado-grounding (mismo contrato que /fermento-prefilter).
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/biopreparado-grounding');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(JSON.parse(opts.body)).toEqual({ user_message: 'cómo preparo caldo bordelés' });
    });

    it('query SIN biopreparado → has_biopreparado false + bloque vacío (no se inyecta nada)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, NO_BIOPREPARADO));
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('¿a cómo está la papa?');
      expect(res).not.toBeNull();
      expect(res.has_biopreparado).toBe(false);
      expect(res.system_prompt_block).toBe('');
      expect(res.biopreparado_id).toBeNull();
    });

    it('normaliza un body parcial del sidecar a la forma contractual (defensivo)', async () => {
      // Sidecar viejo / respuesta incompleta: campos faltantes → defaults seguros.
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { has_biopreparado: true, system_prompt_block: 'X' }));
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('cómo hago purín de ortiga');
      expect(res.has_biopreparado).toBe(true);
      expect(res.system_prompt_block).toBe('X');
      expect(res.biopreparado_id).toBeNull();
      expect(res.reason).toBe('');
    });

    it('devuelve null sin fetch cuando flag off (degradación graceful)', async () => {
      disableFlag();
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('cómo preparo caldo bordelés');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('cómo preparo caldo bordelés');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando userMessage vacío/no-string', async () => {
      const { biopreparadoGrounding } = await importFresh();
      expect(await biopreparadoGrounding('')).toBeNull();
      expect(await biopreparadoGrounding(null)).toBeNull();
      expect(await biopreparadoGrounding(undefined)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('5xx → null sin throw (MCP caído, FAIL-SAFE: no rompe el turno ni fabrica datos)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'mcp down' }));
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('cómo preparo caldo bordelés');
      expect(res).toBeNull();
    });

    it('fetch throws → null sin throw', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { biopreparadoGrounding } = await importFresh();
      const res = await biopreparadoGrounding('cómo preparo caldo bordelés');
      expect(res).toBeNull();
    });
  });

  describe('pisoTermicoGuard — GUARDA desajuste piso térmico (chagra-pro #288)', () => {
    const MISMATCH_HIT = {
      has_mismatch: true,
      user_piso_termico: 'calido',
      user_piso_origen: 'texto_mensaje',
      species_id: 'arracacia_xanthorrhiza_amarilla',
      species_nombre_comun: 'Arracacha amarilla',
      species_altitud_min: 1800,
      species_altitud_max: 2500,
      viabilidad: 'inviable',
      alternativas: ['Yuca', 'Plátano'],
      system_prompt_block:
        '[GUARD PISO TÉRMICO — DESAJUSTE DETECTADO · innegociable]\n' +
        '"Arracacha amarilla" NO es viable en tierra caliente.',
      reason: 'desajuste_piso_termico_inviable',
    };

    const NO_MISMATCH = {
      has_mismatch: false,
      user_piso_termico: null,
      user_piso_origen: null,
      species_id: null,
      species_nombre_comun: null,
      species_altitud_min: null,
      species_altitud_max: null,
      viabilidad: null,
      alternativas: [],
      system_prompt_block: '',
      reason: 'sin_piso_termico_usuario',
    };

    it('query con DESAJUSTE de piso térmico → inyecta el system_prompt_block del sidecar', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, MISMATCH_HIT));
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('Tengo finca en piso térmico calido. ¿Puedo sembrar arracacha ahí?');
      expect(res).not.toBeNull();
      expect(res.has_mismatch).toBe(true);
      expect(res.system_prompt_block).toContain('DESAJUSTE DETECTADO');
      expect(res.viabilidad).toBe('inviable');
      expect(res.alternativas).toEqual(['Yuca', 'Plátano']);
      // POST con user_message a /piso-termico-guard (mismo contrato que /fermento-prefilter).
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/piso-termico-guard');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(JSON.parse(opts.body)).toEqual({ user_message: 'Tengo finca en piso térmico calido. ¿Puedo sembrar arracacha ahí?' });
    });

    it('reenvía finca_altitud y piso_termico cuando se pasan por opts (prioridad finca > perfil)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, NO_MISMATCH));
      const { pisoTermicoGuard } = await importFresh();
      await pisoTermicoGuard('¿puedo sembrar café?', { fincaAltitud: 2600, pisoTermico: 'frio' });
      const [, opts] = fetchMock.mock.calls[0];
      expect(JSON.parse(opts.body)).toEqual({
        user_message: '¿puedo sembrar café?',
        finca_altitud: 2600,
        piso_termico: 'frio',
      });
    });

    it('query SIN desajuste → has_mismatch false + bloque vacío (no se inyecta nada)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, NO_MISMATCH));
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('¿a cómo está la papa?');
      expect(res).not.toBeNull();
      expect(res.has_mismatch).toBe(false);
      expect(res.system_prompt_block).toBe('');
    });

    it('normaliza un body parcial del sidecar a la forma contractual (defensivo)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { has_mismatch: true, system_prompt_block: 'X' }));
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('cómo siembro arracacha');
      expect(res.has_mismatch).toBe(true);
      expect(res.system_prompt_block).toBe('X');
      expect(res.species_id).toBeNull();
      expect(res.alternativas).toEqual([]);
      expect(res.reason).toBe('');
    });

    it('devuelve null sin fetch cuando flag off (degradación graceful)', async () => {
      disableFlag();
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('cómo siembro arracacha');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('cómo siembro arracacha');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando userMessage vacío/no-string', async () => {
      const { pisoTermicoGuard } = await importFresh();
      expect(await pisoTermicoGuard('')).toBeNull();
      expect(await pisoTermicoGuard(null)).toBeNull();
      expect(await pisoTermicoGuard(undefined)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('5xx → null sin throw (sidecar caído, FAIL-SAFE: no rompe el turno ni fabrica datos)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'age down' }));
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('cómo siembro arracacha');
      expect(res).toBeNull();
    });

    it('fetch throws → null sin throw', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { pisoTermicoGuard } = await importFresh();
      const res = await pisoTermicoGuard('cómo siembro arracacha');
      expect(res).toBeNull();
    });
  });

  describe('confusionEspecieGuard — GUARDA confusión de especie/familia botánica (chagra-pro #292)', () => {
    const CONFUSION_HIT = {
      has_confusion: true,
      species_mentioned: 'limoncillo',
      species_id: 'cymbopogon_citratus',
      species_nombre_cientifico: 'Cymbopogon citratus',
      species_familia_botanica: 'Poaceae',
      confusion_source: 'anti_confusion_curado',
      lookalike_nombre_comun: null,
      lookalike_nombre_cientifico: null,
      lookalike_familia_botanica: null,
      system_prompt_block:
        '[GUARD CONFUSIÓN DE ESPECIE — RIESGO DE FAMILIA/TAXONOMÍA EQUIVOCADA · innegociable]\n' +
        '"limoncillo" (Cymbopogon citratus) pertenece REALMENTE a la familia Poaceae.',
      reason: 'confusion_curada_catalogo',
    };

    const NO_CONFUSION = {
      has_confusion: false,
      species_mentioned: null,
      species_id: null,
      species_nombre_cientifico: null,
      species_familia_botanica: null,
      confusion_source: null,
      lookalike_nombre_comun: null,
      lookalike_nombre_cientifico: null,
      lookalike_familia_botanica: null,
      system_prompt_block: '',
      reason: 'sin_especie_mencionada',
    };

    it('mensaje con especie de riesgo de confusión curado → inyecta el system_prompt_block del sidecar', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, CONFUSION_HIT));
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('¿el limoncillo es lo mismo que la citronela?');
      expect(res).not.toBeNull();
      expect(res.has_confusion).toBe(true);
      expect(res.system_prompt_block).toContain('RIESGO DE FAMILIA/TAXONOMÍA EQUIVOCADA');
      expect(res.species_familia_botanica).toBe('Poaceae');
      // POST con user_message a /confusion-especie-guard (mismo contrato que /piso-termico-guard).
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/confusion-especie-guard');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(JSON.parse(opts.body)).toEqual({ user_message: '¿el limoncillo es lo mismo que la citronela?' });
    });

    it('mensaje SIN riesgo de confusión → has_confusion false + bloque vacío (no se inyecta nada)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, NO_CONFUSION));
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('¿a cómo está la papa?');
      expect(res).not.toBeNull();
      expect(res.has_confusion).toBe(false);
      expect(res.system_prompt_block).toBe('');
    });

    it('normaliza un body parcial del sidecar a la forma contractual (defensivo)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { has_confusion: true, system_prompt_block: 'X' }));
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('cómo siembro limoncillo');
      expect(res.has_confusion).toBe(true);
      expect(res.system_prompt_block).toBe('X');
      expect(res.species_id).toBeNull();
      expect(res.lookalike_nombre_comun).toBeNull();
      expect(res.reason).toBe('');
    });

    it('devuelve null sin fetch cuando flag off (degradación graceful)', async () => {
      disableFlag();
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('cómo siembro limoncillo');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('cómo siembro limoncillo');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando userMessage vacío/no-string', async () => {
      const { confusionEspecieGuard } = await importFresh();
      expect(await confusionEspecieGuard('')).toBeNull();
      expect(await confusionEspecieGuard(null)).toBeNull();
      expect(await confusionEspecieGuard(undefined)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('5xx → null sin throw (sidecar caído, FAIL-SAFE: no rompe el turno ni fabrica datos)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'age down' }));
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('cómo siembro limoncillo');
      expect(res).toBeNull();
    });

    it('fetch throws → null sin throw', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { confusionEspecieGuard } = await importFresh();
      const res = await confusionEspecieGuard('cómo siembro limoncillo');
      expect(res).toBeNull();
    });
  });

  describe('pestVsDiseaseGuard — GUARDA confusión plaga vs enfermedad (chagra-pro #293)', () => {
    const CLASSIFICATION_HIT = {
      has_classification: true,
      term_mentioned: 'Hypothenemus hampei (broca)',
      term_categoria: 'plaga',
      species_id: 'coffea_arabica',
      species_nombre_comun: 'Café caturra',
      heuristica_categoria: 'plaga',
      source: 'catalogo_confirmado_por_heuristica',
      manejo_equivocado_detectado: true,
      system_prompt_block:
        '[GUARD PLAGA VS ENFERMEDAD — CLASIFICACIÓN VERIFICADA · innegociable]\n' +
        '"Hypothenemus hampei (broca)" (en el cultivo de Café caturra) ES PLAGA.',
      reason: 'clasificacion_confirmada_manejo_equivocado_detectado',
    };

    const NO_CLASSIFICATION = {
      has_classification: false,
      term_mentioned: null,
      term_categoria: null,
      species_id: null,
      species_nombre_comun: null,
      heuristica_categoria: null,
      source: null,
      manejo_equivocado_detectado: false,
      system_prompt_block: '',
      reason: 'sin_termino_mencionado',
    };

    it('mensaje con término clasificado (catálogo+heurística coinciden) → inyecta el system_prompt_block del sidecar', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, CLASSIFICATION_HIT));
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('¿qué fungicida uso para la broca del café?');
      expect(res).not.toBeNull();
      expect(res.has_classification).toBe(true);
      expect(res.system_prompt_block).toContain('CLASIFICACIÓN VERIFICADA');
      expect(res.term_categoria).toBe('plaga');
      expect(res.manejo_equivocado_detectado).toBe(true);
      // POST con user_message a /pest-vs-disease-guard (mismo contrato que /confusion-especie-guard).
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toBe('/api/mcp/agro/pest-vs-disease-guard');
      expect(opts.method).toBe('POST');
      expect(opts.headers['X-Chagra-Token']).toBe('test-token-123');
      expect(JSON.parse(opts.body)).toEqual({ user_message: '¿qué fungicida uso para la broca del café?' });
    });

    it('mensaje SIN término clasificado (o desacuerdo catálogo↔heurística) → has_classification false + bloque vacío', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, NO_CLASSIFICATION));
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('¿a cómo está la papa?');
      expect(res).not.toBeNull();
      expect(res.has_classification).toBe(false);
      expect(res.system_prompt_block).toBe('');
    });

    it('normaliza un body parcial del sidecar a la forma contractual (defensivo)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { has_classification: true, system_prompt_block: 'X' }));
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('el trozador es plaga o enfermedad');
      expect(res.has_classification).toBe(true);
      expect(res.system_prompt_block).toBe('X');
      expect(res.species_id).toBeNull();
      expect(res.manejo_equivocado_detectado).toBe(false);
      expect(res.reason).toBe('');
    });

    it('devuelve null sin fetch cuando flag off (degradación graceful)', async () => {
      disableFlag();
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('el trozador es plaga o enfermedad');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando offline', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('el trozador es plaga o enfermedad');
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('devuelve null sin fetch cuando userMessage vacío/no-string', async () => {
      const { pestVsDiseaseGuard } = await importFresh();
      expect(await pestVsDiseaseGuard('')).toBeNull();
      expect(await pestVsDiseaseGuard(null)).toBeNull();
      expect(await pestVsDiseaseGuard(undefined)).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('5xx → null sin throw (sidecar caído, FAIL-SAFE: no rompe el turno ni fabrica datos)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'age down' }));
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('el trozador es plaga o enfermedad');
      expect(res).toBeNull();
    });

    it('fetch throws → null sin throw', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
      const { pestVsDiseaseGuard } = await importFresh();
      const res = await pestVsDiseaseGuard('el trozador es plaga o enfermedad');
      expect(res).toBeNull();
    });
  });
});

describe('sidecarClient — getClimaSnapshot elevation (gradiente térmico)', () => {
  beforeEach(() => {
    enableFlag();
  });

  const okSnap = { fetched_at: 't', enso_status: { phase: 'neutral' } };

  it('incluye elevation en el query string cuando es válida', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, okSnap));
    const { getClimaSnapshot } = await importFresh();
    await getClimaSnapshot({ lat: 4.5288, lng: -73.9236, elevation: 2580 });
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('lat=4.5288');
    expect(url).toContain('lng=-73.9236');
    expect(url).toContain('elevation=2580');
  });

  it('omite elevation si no se pasa (Open-Meteo usa su grilla)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, okSnap));
    const { getClimaSnapshot } = await importFresh();
    await getClimaSnapshot({ lat: 4.5288, lng: -73.9236 });
    expect(fetchMock.mock.calls[0][0]).not.toContain('elevation');
  });

  it('descarta elevation fuera de rango físico (clamp defensivo)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, okSnap));
    const { getClimaSnapshot } = await importFresh();
    // 8467 m ≈ una altitud en pies mal interpretada → se descarta.
    await getClimaSnapshot({ lat: 4.5, lng: -73.9, elevation: 8467 });
    expect(fetchMock.mock.calls[0][0]).not.toContain('elevation');
  });

  it('descarta elevation NaN sin romper el request de coords', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, okSnap));
    const { getClimaSnapshot } = await importFresh();
    await getClimaSnapshot({ lat: 4.5, lng: -73.9, elevation: Number.NaN });
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('lat=4.5');
    expect(url).not.toContain('elevation');
  });
});

describe('sidecarClient — companionSpeciesGuard post-LLM', () => {
  beforeEach(() => {
    enableFlag();
  });

  it('200 con bloque de correccion → normaliza has_companion_species y system_prompt_block', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, {
      has_companion_species: true,
      system_prompt_block: '[CORRECCION] La especie companera correcta es X.',
      reason: 'catalog_match',
    }));
    const { companionSpeciesGuard } = await importFresh();
    const res = await companionSpeciesGuard('respuesta del agente ya generada');
    expect(res).toEqual({
      has_companion_species: true,
      system_prompt_block: '[CORRECCION] La especie companera correcta es X.',
      reason: 'catalog_match',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/mcp/agro/companion-species-guard');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body).toEqual({ response: 'respuesta del agente ya generada' });
  });

  it('degrada a null si el endpoint cae o no responde 2xx', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'down' }));
    const { companionSpeciesGuard } = await importFresh();
    expect(await companionSpeciesGuard('respuesta')).toBeNull();
  });

  it('devuelve null sin fetch cuando la respuesta viene vacia', async () => {
    const { companionSpeciesGuard } = await importFresh();
    expect(await companionSpeciesGuard('')).toBeNull();
    expect(await companionSpeciesGuard('   ')).toBeNull();
    expect(await companionSpeciesGuard(null)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
