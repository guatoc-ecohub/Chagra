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
 *   latencyMs: number | null,
 *   modelUsed: string | null,
 *   heuristicSkipped: boolean,
 *   reason: string | null,
 *   error: string | null,
 * }>}
 *
 * Normaliza el snake_case del API a camelCase JS-idiomatic. Devuelve null
 * si: flag off, offline, timeout, non-2xx, body inválido.
 */
export async function planNlu(userMessage, context) {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const body = { user_message: userMessage };
  if (context && typeof context === 'string') body.context = context;

  const raw = await postJson('/nlu', body, NLU_TIMEOUT_MS);
  if (!raw || typeof raw !== 'object') return null;

  return {
    useTool: Boolean(raw.use_tool),
    tool: typeof raw.tool === 'string' ? raw.tool : null,
    args: (raw.args && typeof raw.args === 'object') ? raw.args : null,
    latencyMs: Number.isFinite(raw.latency_ms) ? raw.latency_ms : null,
    modelUsed: typeof raw.model_used === 'string' ? raw.model_used : null,
    heuristicSkipped: Boolean(raw.heuristic_skipped),
    reason: typeof raw.reason === 'string' ? raw.reason : null,
    error: typeof raw.error === 'string' ? raw.error : null,
  };
}

/**
 * Whitelist de tools que el cliente puede invocar. Defensa en profundidad:
 * el endpoint del sidecar es trusted, pero acotamos el set para que un
 * planner buggy/comprometido no pueda pedir paths arbitrarios.
 *
 * Las últimas 3 son nuevas (PR chagra-pro #48 — wire AGE). NLU planner aún
 * no las routea automáticamente; quedan disponibles para invocación manual.
 */
const ALLOWED_TOOLS = new Set([
  'get_species',
  'get_companions',
  'get_biopreparados',
  'get_pest_controllers',
  'get_multihop_companions',
  'validate_visual_match',
  'validate_taxonomy',
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
 * @param {string} userMessage
 * @returns {Promise<null | { entities: Array<{
 *   mentioned: string,
 *   kind: 'species' | 'pest' | 'biopreparado',
 *   canonical_id: string,
 *   nombre_comun: string,
 *   nombre_cientifico: string,
 *   confidence: number,
 * }> }>}
 */
export async function resolveEntities(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') return null;
  const raw = await postJson('/resolve-entities', { user_message: userMessage }, NLU_TIMEOUT_MS);
  if (!raw || typeof raw !== 'object') return null;
  if (!Array.isArray(raw.entities)) return { entities: [] };
  return { entities: raw.entities };
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

// Export interno para testabilidad — los tests pueden assertear el set
// sin tener que reflectar la closure.
export const __TEST__ = { ALLOWED_TOOLS, getBaseUrl, getToken };
