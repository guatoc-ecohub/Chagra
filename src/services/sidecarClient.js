/**
 * sidecarClient.js — Cliente HTTP del sidecar chagra-agro-mcp (ADR-045 Fase 2).
 *
 * Wirea el AgentScreen del PWA con el endpoint `/api/mcp/agro/` (nginx
 * proxia a sidecar :7880 en alpha). Detrás de un feature flag — mientras
 * el deploy del sidecar (PR #103 guatoc-nixos) no esté merged, la flag
 * queda en false y el comportamiento del cliente es idéntico al anterior
 * (todas las funciones devuelven null sin hacer fetch).
 *
 * Pipeline esperado (cuando flag=true + sidecar live):
 *   userMessage → planNlu() → { use_tool, tool, args, ... }
 *                ↓ (si use_tool)
 *                callTool(tool, args) → result (ficha species/companions/etc.)
 *                ↓
 *   El AgentScreen inyecta `result` como context turn antes del chat LLM,
 *   dándole grounding citable. Si NLU/tool fallan o devuelven null, el
 *   chat sigue con el flujo RAG actual sin degradar UX.
 *
 * Reglas operativas:
 * - Offline-first: si `!navigator.onLine` → null inmediato, no fetch.
 * - Timeout corto: NLU 10s, tools 5s (cap defensivo p99 sidecar).
 * - Falla silenciosa: en error/non-200/abort → null + console.debug.
 *   NUNCA throw — el caller espera contract `T | null`.
 * - Auth: header `X-Chagra-Token: ${VITE_CHAGRA_MCP_TOKEN}` siempre.
 * - Sin dependencias: fetch puro + AbortController. Testeable sin red real.
 *
 * Env vars (todas opcionales, default seguro para offline-only):
 * - VITE_USE_SIDECAR_AGRO_MCP=true|false  — master switch (default false)
 * - VITE_SIDECAR_URL=/api/mcp/agro        — base relativa, nginx-proxied
 * - VITE_CHAGRA_MCP_TOKEN=<token>         — build-time, NUNCA en .env commiteado
 *
 * Telemetry: `console.debug('[sidecar]', ...)` con latencias para que el
 * operador mida adopción cuando active la flag (no hay backend de
 * telemetría aún — esto se sumará a una task futura si hace falta).
 */

const NLU_TIMEOUT_MS = 10000;
const TOOL_TIMEOUT_MS = 5000;

/**
 * Lee la flag `VITE_USE_SIDECAR_AGRO_MCP`. Acepta los strings 'true'/'1'
 * como habilitado. Cualquier otro valor (incluido undefined) → false.
 *
 * Exportado para que el caller pueda short-circuitear UI/telemetría sin
 * llamar las funciones (ej. tooltip "sidecar inactivo").
 */
export function isSidecarEnabled() {
  try {
    const raw = import.meta.env?.VITE_USE_SIDECAR_AGRO_MCP;
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1';
    }
    return false;
  } catch (_) {
    return false;
  }
}

function getBaseUrl() {
  try {
    const raw = import.meta.env?.VITE_SIDECAR_URL;
    if (typeof raw === 'string' && raw.trim()) {
      // Strip trailing slash para joinear sin duplicar
      return raw.trim().replace(/\/+$/, '');
    }
  } catch (_) {
    // ignore
  }
  return '/api/mcp/agro';
}

function getToken() {
  try {
    const raw = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    return typeof raw === 'string' ? raw : '';
  } catch (_) {
    return '';
  }
}

/**
 * Wrapper interno: GET con timeout + headers + degrade-to-null. Espejo
 * defensivo de `postJson`. Usado por `/clima/snapshot` (#316). NO exportado.
 */
async function getJson(path, query, timeoutMs) {
  if (!isSidecarEnabled()) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[sidecar] offline — skip', path);
    return null;
  }

  const base = getBaseUrl();
  const qs = query && Object.keys(query).length > 0
    ? '?' + new URLSearchParams(
        Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  const url = `${base}${path}${qs}`;
  const token = getToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {};
  if (token) headers['X-Chagra-Token'] = token;

  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.debug('[sidecar] non-2xx', { path, status: res.status });
      return null;
    }
    const json = await res.json();
    const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
    console.debug('[sidecar] ok', { path, latency_ms: latency });
    return json;
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    console.debug('[sidecar] fail', { path, reason });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Wrapper interno: POST con timeout + headers + degrade-to-null.
 * No exportado — el contrato público son planNlu y callTool.
 */
async function postJson(path, body, timeoutMs) {
  if (!isSidecarEnabled()) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[sidecar] offline — skip', path);
    return null;
  }

  const base = getBaseUrl();
  const url = `${base}${path}`;
  const token = getToken();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;

  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.debug('[sidecar] non-2xx', { path, status: res.status });
      return null;
    }
    const json = await res.json();
    const latency = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
    console.debug('[sidecar] ok', { path, latency_ms: latency });
    return json;
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    console.debug('[sidecar] fail', { path, reason });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Llama `POST ${BASE}/nlu` para que el planner decida si el mensaje del
 * usuario debe routearse a un MCP tool.
 *
 * @param {string} userMessage — texto del operador
 * @param {string} [context] — context turn opcional (ej. historial reciente)
 * @returns {Promise<null | {
 *   useTool: boolean,
 *   tool: string | null,
 *   args: object | null,
 *   toolChain: Array<{tool: string, args: object}> | null,
 *   latencyMs: number | null,
 *   modelUsed: string | null,
 *   heuristicSkipped: boolean,
 *   reason: string | null,
 *   error: string | null,
 * }>}
 *
 * Normaliza el snake_case del API a camelCase JS-idiomatic. Devuelve null
 * si: flag off, offline, timeout, non-2xx, body inválido.
 *
 * D2 (#246) tool composition: cuando el sidecar NLU devuelve `tool_chain`
 * (array no vacío), se expone como `toolChain` camelCase para que el
 * cliente ejecute la cadena con `executeToolChain()`. El modo simple
 * (`tool` + `args`) sigue siendo soportado en paralelo.
 */
export async function planNlu(userMessage, context) {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const body = { user_message: userMessage };
  if (context && typeof context === 'string') body.context = context;

  const raw = await postJson('/nlu', body, NLU_TIMEOUT_MS);
  if (!raw || typeof raw !== 'object') return null;

  let toolChain = null;
  if (Array.isArray(raw.tool_chain) && raw.tool_chain.length > 0) {
    toolChain = raw.tool_chain
      .filter((step) => step && typeof step === 'object' && typeof step.tool === 'string')
      .map((step) => ({
        tool: step.tool,
        args: (step.args && typeof step.args === 'object') ? step.args : {},
      }));
    if (toolChain.length === 0) toolChain = null;
  }

  return {
    useTool: Boolean(raw.use_tool),
    tool: typeof raw.tool === 'string' ? raw.tool : null,
    args: (raw.args && typeof raw.args === 'object') ? raw.args : null,
    toolChain,
    latencyMs: Number.isFinite(raw.latency_ms) ? raw.latency_ms : null,
    modelUsed: typeof raw.model_used === 'string' ? raw.model_used : null,
    heuristicSkipped: Boolean(raw.heuristic_skipped),
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    error: typeof raw.error === 'string' ? raw.error : null,
  };
}

/**
 * D2 (#246) — ejecuta una cadena de tools secuencialmente. Devuelve un
 * array de evidences (uno por tool), preservando el orden. Tools con
 * resultado null (timeout/error) se devuelven con `result: null` para
 * que el formatter pueda señalar el gap al LLM.
 *
 * Cap máximo de pasos: 3 (alineado con el contrato NLU del sidecar). Pasos
 * extra se ignoran para evitar inflar el contexto del LLM.
 *
 * @param {Array<{tool: string, args?: object}>} chain
 * @returns {Promise<Array<{tool: string, args: object, result: any}>>}
 */
export async function executeToolChain(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return [];
  const MAX_STEPS = 3;
  const limited = chain.slice(0, MAX_STEPS);
  // SPEED-5 (#257): los pasos del chain son lecturas INDEPENDIENTES — sus args
  // vienen del query del usuario, no del resultado de un paso previo (ver
  // synthesizeToolChain en el sidecar nlu.ts, que sintetiza p.ej.
  // [get_companions, get_biopreparados] ambos con args del mensaje). Por eso
  // los disparamos en paralelo: la latencia del chain pasa de sum(pasos) a
  // max(pasos). callTool() se invoca AHORA (inicia el fetch en orden → el orden
  // de mock.calls / requests se preserva) y guardamos la promesa; reensamblamos
  // las evidences en el mismo orden del chain. callTool ya tolera errores
  // (devuelve null), así que Promise.all nunca rechaza.
  const pending = [];
  for (const step of limited) {
    if (!step || typeof step.tool !== 'string') continue;
    const args = (step.args && typeof step.args === 'object') ? step.args : {};
    pending.push({ tool: step.tool, args, promise: callTool(step.tool, args) });
  }
  const results = await Promise.all(pending.map((p) => p.promise));
  return pending.map((p, i) => ({ tool: p.tool, args: p.args, result: results[i] }));
}

/**
 * Whitelist de tools que el cliente puede invocar. Defensa en profundidad:
 * el endpoint del sidecar es trusted, pero acotamos el set para que un
 * planner buggy/comprometido no pueda pedir paths arbitrarios.
 *
 * Las últimas 3 (`get_normativa_ica`, `get_clima_ideam`, `get_precio_sipsa`)
 * vienen de los merges chagra-pro #64/#65/#66 + hotfix #67 — exponen
 * normativa ICA defensiva, clima IDEAM nacional y precios SIPSA DANE.
 *
 * TODO(NLU): add keywords agroquimico/clima/precio in chagra-pro nlu.ts
 * (sidecar repo, NO acá) para que el planner las routee automáticamente.
 * Mientras tanto el frontend hace detection por keywords + invocación
 * directa de los wrappers (ver AgentScreen handleSubmit).
 */
const ALLOWED_TOOLS = new Set([
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
  // PoC alertas meteorológicas (#316) — resueltas por el sidecar (NO MCP child).
  // Cache compartida con `/clima/snapshot` y refrescada por systemd timer.
  'get_enso_status',
  'get_alertas_clima_zona',
]);

const NORMATIVA_ICA_ACTIONS = new Set([
  'latest_active_ingredients',
  'extract_resolutions',
  'full_sync',
]);
const CLIMA_IDEAM_ACTIONS = new Set([
  'stations_near',
  'climate_series',
  'monthly_avg',
  'anomalies',
]);
const PRECIO_SIPSA_ACTIONS = new Set([
  'latest_price',
  'dataset_metadata',
  'related_resources',
]);

/**
 * Resuelve entidades vegetales/plagas mencionadas en el user_message contra
 * Apache AGE (chagra_kg). Sirve como capa pre-validation anti-alucinación
 * (DR taxonómico Tier 1 B): el binomio canónico autoritativo se inyecta al
 * system prompt del LLM ANTES de que responda, así no puede inventar
 * "gulupa = Psidium guajava".
 *
 * Returns null si: flag off, offline, AGE down (graceful), timeout.
 * Returns { entities: [...] } con entidades resueltas (puede ser []).
 *
 * Si se pasa `fincaAltitud` (msnm), se reenvía como `finca_altitud` para que el
 * sidecar enriquezca cada entidad con viabilidad/alternativas a esa altitud
 * (viabilidad ∈ {viable,marginal,inviable}, delta_altitud, alternativas_viables,
 * alternativas_cercanas). Es el MISMO request — CERO latencia añadida. El
 * sidecar lo ignora si no soporta el campo (degrada con gracia).
 *
 * @param {string} userMessage
 * @param {object} [opts]
 * @param {number|string|null} [opts.fincaAltitud] — msnm de la finca activa.
 * @returns {Promise<null | { entities: Array<{
 *   mentioned: string,
 *   kind: 'species' | 'pest' | 'biopreparado',
 *   canonical_id: string,
 *   nombre_comun: string,
 *   nombre_cientifico: string,
 *   confidence: number,
 *   altitud_min?: number, altitud_max?: number, piso_termico?: string,
 *   temp_min?: number, temp_max?: number, categoria?: string,
 *   es_invasora?: boolean, conservation_status?: string,
 *   viabilidad?: 'viable' | 'marginal' | 'inviable', delta_altitud?: number,
 *   companions?: Array<string|object>, antagonists?: Array<string|object>,
 *   alternativas_viables?: Array<string|object>, alternativas_cercanas?: Array<string|object>,
 * }> }>}
 */
export async function resolveEntities(userMessage, opts = {}) {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const body = { user_message: userMessage };
  const alt = opts && opts.fincaAltitud != null ? Number(opts.fincaAltitud) : NaN;
  if (Number.isFinite(alt)) body.finca_altitud = alt;
  const raw = await postJson('/resolve-entities', body, NLU_TIMEOUT_MS);
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.entities)) return { entities: [] };
  return { entities: raw.entities };
}

/**
 * Capa 2 anti-alucinación (cross-check de contexto). Llama
 * `POST ${BASE}/post-validate` con el TEXTO que el LLM ya generó y, opcional,
 * los `nombre_cientifico` de las entidades que la capa 1 resolvió para el turno
 * (`expected`). El sidecar:
 *   - extrae los binomios Linneanos del texto,
 *   - los valida contra Apache AGE (los inexistentes → `hallucinated`),
 *   - y si pasás `expected`, marca como `suspect` los binomios que SÍ existen
 *     pero NO corresponden a la entidad que el usuario mencionó (caso "nombre
 *     correcto, especie equivocada": dice Solanum lycopersicum para 'tomate de
 *     árbol', que en realidad es Solanum betaceum).
 *
 * Se invoca DESPUÉS de `callLLM` (no antes — necesita la respuesta). NUNCA
 * bloquea: el PWA usa el resultado solo para un badge no intrusivo. Devuelve
 * null si flag off / offline / sidecar falla / timeout → el caller degrada a
 * "sin advertencia" (política conservadora: no advertir si no se pudo verificar).
 *
 * @param {string} text — respuesta del LLM ya generada.
 * @param {string[]} [expected] — nombre_cientifico de las entidades resueltas.
 * @returns {Promise<null | {hallucinated: string[], validated: Array<{scientific_name: string, canonical_id: string}>, suspect: string[], age_available: boolean, detected_count: number}>}
 */
export async function postValidate(text, expected) {
  if (!text || typeof text !== 'string') return null;
  const body = { text };
  if (Array.isArray(expected) && expected.length > 0) {
    const clean = expected.filter((e) => typeof e === 'string' && e.trim().length > 0);
    if (clean.length > 0) body.expected = clean;
  }
  const raw = await postJson('/post-validate', body, NLU_TIMEOUT_MS);
  if (!raw || typeof raw !== 'object') return null;
  return {
    hallucinated: Array.isArray(raw.hallucinated) ? raw.hallucinated : [],
    validated: Array.isArray(raw.validated) ? raw.validated : [],
    suspect: Array.isArray(raw.suspect) ? raw.suspect : [],
    age_available: raw.age_available === true,
    detected_count: typeof raw.detected_count === 'number' ? raw.detected_count : 0,
  };
}

/**
 * Llama `POST ${BASE}/tools/<toolName>` con los args dados.
 *
 * @param {string} toolName — uno de ALLOWED_TOOLS
 * @param {object} args — body raw (forma específica por tool)
 * @returns {Promise<null | object>} respuesta del sidecar tal cual, o null
 *   si flag off / offline / tool no permitido / fetch falla.
 */
export async function callTool(toolName, args) {
  if (!toolName || typeof toolName !== 'string') return null;
  if (!ALLOWED_TOOLS.has(toolName)) {
    console.debug('[sidecar] tool no permitido', toolName);
    return null;
  }
  return postJson(`/tools/${toolName}`, args || {}, TOOL_TIMEOUT_MS);
}

/**
 * V-08 (#229) — LLM-as-judge anti-alucinación de visión. Pregunta al modelo
 * multimodal si la FOTO realmente muestra `speciesId` (complementa a
 * `validate_visual_match`, que solo verifica que el NOMBRE exista en catálogo).
 * El sidecar tiene timeout duro de 500 ms y nunca bloquea: si no puede juzgar
 * devuelve `{plausible: null, ...}`.
 *
 * @param {string} speciesId — id snake_case canónico del catálogo.
 * @param {string} imageB64 — base64 crudo de la foto (sin prefijo data:).
 * @returns {Promise<null | {plausible: boolean|null, confidence: number|null, motivo: string}>}
 *   null si flag off / offline / sin args / sidecar falla.
 */
export async function judgeVision(speciesId, imageB64) {
  if (!speciesId || typeof speciesId !== 'string') return null;
  if (!imageB64 || typeof imageB64 !== 'string') return null;
  const raw = await postJson(
    '/judge-vision',
    { species_id: speciesId, image_b64: imageB64 },
    TOOL_TIMEOUT_MS,
  );
  if (!raw || typeof raw !== 'object') return null;
  return {
    plausible: typeof raw.plausible === 'boolean' ? raw.plausible : null,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    motivo: typeof raw.motivo === 'string' ? raw.motivo : '',
  };
}

/**
 * Wrapper defensivo de `get_normativa_ica`. Validá la action localmente
 * para que el frontend NO pueda pedir paths arbitrarios al sidecar.
 *
 * USO DEFENSIVO ÚNICAMENTE: este tool sirve para validar si un producto
 * agroquímico está registrado/restringido por el ICA. NUNCA debe usarse
 * para responder "¿qué le pongo a la plaga X?" — para eso primero
 * `get_biopreparados` + `get_pest_controllers` (agroecológico). El system
 * prompt del agente debe explicitar esta restricción.
 *
 * @param {string} action — uno de NORMATIVA_ICA_ACTIONS
 * @param {object} [args] — body adicional pasado al tool
 * @returns {Promise<null | object>}
 */
export async function getNormativaIca(action, args) {
  if (!action || typeof action !== 'string' || !NORMATIVA_ICA_ACTIONS.has(action)) {
    console.debug('[sidecar] get_normativa_ica action inválida', action);
    return null;
  }
  return callTool('get_normativa_ica', { action, ...(args || {}) });
}

/**
 * Wrapper de `get_clima_ideam`. Estaciones IDEAM nacional para grounding
 * climático histórico. El sidecar devuelve null si IDEAM no responde
 * (graceful degrade — caller debe seguir sin clima inyectado).
 *
 * @param {string} action — uno de CLIMA_IDEAM_ACTIONS
 * @param {object} [args] — body adicional (municipio, metric, desde, etc.)
 * @returns {Promise<null | object>}
 */
export async function getClimaIdeam(action, args) {
  if (!action || typeof action !== 'string' || !CLIMA_IDEAM_ACTIONS.has(action)) {
    console.debug('[sidecar] get_clima_ideam action inválida', action);
    return null;
  }
  return callTool('get_clima_ideam', { action, ...(args || {}) });
}

/**
 * Wrapper de `get_precio_sipsa`. Precios mayoristas SIPSA — hoy el dataset
 * DANE está publicado como ZIP federated (no consulta directa), así que
 * el tool devuelve metadata + URL del ZIP en vez de precio puntual. El
 * agente debe orientar al usuario al ZIP DANE o sugerir Corabastos.
 *
 * @param {string} action — uno de PRECIO_SIPSA_ACTIONS
 * @param {object} [args] — body adicional (producto, fecha, etc.)
 * @returns {Promise<null | object>}
 */
export async function getPrecioSipsa(action, args) {
  if (!action || typeof action !== 'string' || !PRECIO_SIPSA_ACTIONS.has(action)) {
    console.debug('[sidecar] get_precio_sipsa action inválida', action);
    return null;
  }
  return callTool('get_precio_sipsa', { action, ...(args || {}) });
}

/**
 * GET `${BASE}/clima/snapshot` con lat/lng (+ elevation opcional) (#316).
 *
 * Devuelve el snapshot completo: ENSO + 7d forecast + alertas. Si no se pasan
 * coords, el sidecar responde solo el bloque ENSO (NOAA + IDEAM + CIIFEN) y
 * deja `openmeteo: null` + `alertas_locales: []`.
 *
 * `elevation` (msnm reales de la finca): Open-Meteo corrige la temperatura por
 * gradiente térmico (lapse rate ~6.5 °C/1000 m) usando la elevación que se le
 * pase. Si NO se pasa, Open-Meteo usa la elevación de SU grilla, que para un
 * municipio andino cae cerca de la CABECERA (valle/casco urbano), no de la
 * finca en ladera alta — y el pronóstico sale varios grados más cálido de lo
 * real (p. ej. finca a 2580 msnm vs cabecera ~1900 msnm: ~4–5 °C de
 * diferencia). Pasar la altitud real corrige eso. El sidecar reenvía este
 * parámetro a Open-Meteo (`?elevation=`).
 *
 * Reglas: flag off → null. Offline → null. HTTP ≥400 → null. Nunca throw.
 *
 * @param {{ lat?: number, lng?: number, elevation?: number }} [opts]
 * @returns {Promise<null | object>}
 */
export async function getClimaSnapshot(opts = {}) {
  const query = {};
  if (typeof opts.lat === 'number' && Number.isFinite(opts.lat)) query.lat = opts.lat;
  if (typeof opts.lng === 'number' && Number.isFinite(opts.lng)) query.lng = opts.lng;
  // elevation: solo si es número finito y físicamente plausible (msnm). El
  // techo de 6000 m cubre el pico más alto de Colombia (Cristóbal Colón,
  // 5775 m) con margen y descarta basura tipo pies, sensores locos o NaN.
  if (typeof opts.elevation === 'number' && Number.isFinite(opts.elevation)
      && opts.elevation >= -100 && opts.elevation <= 6000) {
    query.elevation = opts.elevation;
  }
  return getJson('/clima/snapshot', query, TOOL_TIMEOUT_MS);
}

/**
 * POST `${BASE}/tools/get_enso_status` — narrow shape ENSO-only (#316).
 *
 * Útil cuando el agente solo necesita el bloque ENSO sin pronóstico local.
 * El sidecar ya lo expone como tool al planner, así que esto es un atajo
 * para wireos directos desde el frontend (ej. badge del bell).
 *
 * @returns {Promise<null | object>}
 */
export async function getEnsoStatus() {
  return callTool('get_enso_status', {});
}

/**
 * POST `${BASE}/tools/get_alertas_clima_zona` — alertas + forecast local (#316).
 *
 * @param {{ lat: number, lng: number }} args
 * @returns {Promise<null | object>}
 */
export async function getAlertasClimaZona(args) {
  if (!args || typeof args.lat !== 'number' || typeof args.lng !== 'number') {
    console.debug('[sidecar] get_alertas_clima_zona lat/lng requeridos');
    return null;
  }
  return callTool('get_alertas_clima_zona', { lat: args.lat, lng: args.lng });
}

// Export interno para testabilidad — los tests pueden assertear el set
// sin tener que reflectar la closure.
export const __TEST__ = {
  ALLOWED_TOOLS,
  NORMATIVA_ICA_ACTIONS,
  CLIMA_IDEAM_ACTIONS,
  PRECIO_SIPSA_ACTIONS,
  getBaseUrl,
  getToken,
};
