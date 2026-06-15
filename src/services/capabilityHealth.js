/**
 * capabilityHealth — Task 37: estado de disponibilidad de capacidades.
 *
 * Consulta salud de fuentes/MCP y deshabilita claramente capacidades
 * caídas antes de que el usuario escriba.
 *
 * Task 6331: health check dinámico del sidecar/ollama con fallback offline.
 * El estado de las capabilities ahora se actualiza en tiempo real según
 * la salud real de los servicios, no solo por feature flags estáticas.
 */

/**
 * Tools que dependen del sidecar MCP agro (ALLOWED_TOOLS en sidecarClient).
 * Si el sidecar está caído/deshabilitado, las capacidades que usan estas
 * tools se marcan 'down'. Las capacidades con tools NO listadas acá son
 * offline-first y siempre están 'live'.
 */
export const SIDECAR_TOOL_NAMES = new Set([
  'get_species',
  'get_companions',
  'get_biopreparados',
  'get_pest_controllers',
  'get_multihop_companions',
  'get_subgrafo_relacional',
  'get_diseno_restauracion',
  'get_diseno_silvopastoril',
  'validate_visual_match',
  'validate_taxonomy',
  'get_normativa_ica',
  'get_clima_ideam',
  'get_precio_sipsa',
  'get_enso_status',
  'get_alertas_clima_zona',
  'get_saberes',
  'get_toxicidad',
  'get_variedades',
  'get_suelo',
]);

/**
 * Cache en memoria para health checks dinámicos.
 * Evita llamadas redundantes y provee respuesta rápida al UI.
 *
 * TTL: 30 segundos para sidecar (balance entre frescura y performance),
 * 60 segundos para ollama (cambio menos frecuente).
 */
const healthCache = {
  sidecar: { result: null, timestamp: 0, ttl: 30000 },
  ollama: { result: null, timestamp: 0, ttl: 60000 },
};

/**
 * Verifica dinámicamente si el sidecar está respondiendo.
 *
 * @param {Object} deps - dependencias inyectadas (testeable)
 * @param {Function} [deps.isSidecarEnabled] - función que retorna si sidecar está habilitado
 * @param {string} [deps.sidecarUrl] - URL base del sidecar
 * @param {Function} [deps.fetch] - fetch implementation (para tests)
 * @param {Object} [deps.cache] - cache object (para tests)
 * @returns {Promise<boolean>} - true si sidecar está healthy, false si no
 */
export async function checkSidecarHealth(deps = {}) {
  const {
    isSidecarEnabled = () => false,
    sidecarUrl = '/api/mcp/agro',
    fetch = globalThis.fetch,
    cache = healthCache.sidecar,
  } = deps;

  // Si la flag está deshabilitada, sidecar no está disponible
  if (!isSidecarEnabled()) {
    cache.result = false;
    cache.timestamp = Date.now();
    return false;
  }

  // Retornar cache si es válido (TTL)
  const now = Date.now();
  if (cache.result !== null && now - cache.timestamp < cache.ttl) {
    return cache.result;
  }

  // Health check: fetch rápido al sidecar
  // Usamos /nlu con body mínimo - endpoint real que sidecar expone
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch(`${sidecarUrl}/nlu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_message: '.' }), // mensaje mínimo
      signal: controller.signal,
    });

    clearTimeout(timer);

    const isHealthy = res.ok;
    cache.result = isHealthy;
    cache.timestamp = now;
    return isHealthy;
  } catch {
    cache.result = false;
    cache.timestamp = now;
    return false;
  }
}

/**
 * Verifica dinámicamente si Ollama está respondiendo.
 *
 * @param {Object} deps - dependencias inyectadas (testeable)
 * @param {Function} [deps.fetch] - fetch implementation (para tests)
 * @param {Object} [deps.cache] - cache object (para tests)
 * @returns {Promise<boolean>} - true si Ollama está healthy, false si no
 */
export async function checkOllamaHealth(deps = {}) {
  const {
    fetch = globalThis.fetch,
    cache = healthCache.ollama,
  } = deps;

  // Retornar cache si es válido (TTL)
  const now = Date.now();
  if (cache.result !== null && now - cache.timestamp < cache.ttl) {
    return cache.result;
  }

  // Health check: fetch a /api/ollama/api/tags
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const res = await fetch('/api/ollama/api/tags', {
      signal: controller.signal,
    });

    clearTimeout(timer);

    const isHealthy = res.ok;
    cache.result = isHealthy;
    cache.timestamp = now;
    return isHealthy;
  } catch {
    cache.result = false;
    cache.timestamp = now;
    return false;
  }
}

/**
 * Verifica ambos servicios (sidecar + ollama) en paralelo.
 *
 * @param {Object} deps - dependencias inyectadas
 * @returns {Promise<{sidecar: boolean, ollama: boolean}>}
 */
export async function checkAllServicesHealth(deps = {}) {
  const [sidecar, ollama] = await Promise.all([
    checkSidecarHealth(deps).catch(() => false),
    checkOllamaHealth(deps).catch(() => false),
  ]);
  return { sidecar, ollama };
}

/**
 * Limpia el cache de health checks. Útil para tests o para forzar re-verify.
 *
 * @param {string} [service] - 'sidecar' | 'ollama' | undefined (todos)
 */
export function clearHealthCache(service) {
  if (service === 'sidecar') {
    healthCache.sidecar.result = null;
    healthCache.sidecar.timestamp = 0;
  } else if (service === 'ollama') {
    healthCache.ollama.result = null;
    healthCache.ollama.timestamp = 0;
  } else {
    healthCache.sidecar.result = null;
    healthCache.sidecar.timestamp = 0;
    healthCache.ollama.result = null;
    healthCache.ollama.timestamp = 0;
  }
}

/**
 * @typedef {Object} CapabilityStatus
 * @property {string} name — nombre legible
 * @property {'ok'|'degraded'|'down'} status
 * @property {string} [message] — mensaje para el usuario
 */

/**
 * Verifica salud de todas las capacidades del sistema.
 * Degrada graceful si detecta fallos.
 */
export async function checkCapabilityHealth() {
  const results = [];

  // IDB
  try {
    const db = await import('../db/dbCore').then((m) => m.openDB());
    if (db) {
      results.push({ name: 'Almacenamiento local', status: 'ok' });
    }
  } catch {
    results.push({ name: 'Almacenamiento local', status: 'down', message: 'No se pudo abrir la base de datos local.' });
  }

  // LLM vía health check básico
  try {
    const res = await fetch('/api/ollama/api/tags', { signal: AbortSignal.timeout(5000) });
    results.push({ name: 'Modelo de IA (Ollama)', status: res.ok ? 'ok' : 'degraded', message: res.ok ? undefined : 'El modelo no responde correctamente.' });
  } catch {
    results.push({ name: 'Modelo de IA (Ollama)', status: 'down', message: 'No hay conexión con el servidor de IA.' });
  }

  // Conexión de red
  results.push({
    name: 'Conexión de red',
    status: navigator.onLine ? 'ok' : 'degraded',
    message: navigator.onLine ? undefined : 'Sin conexión a Internet. Los datos se guardan localmente.',
  });

  // Catálogo de especies
  try {
    const templates = await import('../data/phenologyTemplates').then((m) => m.getAllTemplates());
    results.push({ name: 'Catálogo de especies', status: templates.length > 0 ? 'ok' : 'degraded', message: templates.length > 0 ? undefined : 'Catálogo vacío.' });
  } catch {
    results.push({ name: 'Catálogo de especies', status: 'degraded', message: 'No se pudo cargar el catálogo de especies.' });
  }

  return results;
}

/**
 * Retorna true si alguna capacidad crítica está caída.
 */
export function hasCriticalFailure(statuses) {
  return statuses.some((s) => s.status === 'down');
}

/**
 * Filtra solo las capacidades con problemas.
 */
export function getDegradedCapabilities(statuses) {
  return statuses.filter((s) => s.status !== 'ok');
}

/**
 * Determina el estado real de una capacidad individual.
 *
 * Reglas determinísticas, sin side-effects ocultos:
 * 1. Si el manifest marca `status: 'soon'` → 'soon' (futura).
 * 2. Si la tool de la capacidad está en `sidecarToolNames` y el sidecar
 *    NO está healthy (flag off OR servicio caído) → 'down' (dependencia rota).
 * 3. En cualquier otro caso → 'live' (offline-first o sidecar activo).
 *
 * Degradación segura: si el capabilityId no está en el manifest,
 * retorna 'live' (asume offline-first, no rompe el menú).
 *
 * Task 6331: ahora acepta `sidecarHealthy` opcional para health dinámico.
 * Si no se proporciona, degrada al comportamiento anterior (solo check de flag).
 *
 * @param {string} capabilityId — id de la capacidad (ej. 'siembro')
 * @param {Object} deps — dependencias inyectadas (testeable)
 * @param {Array<{id:string, status:string, tool:string|null}>} [deps.manifest]
 * @param {boolean} [deps.isSidecarEnabled=true] - flag estática del sidecar
 * @param {boolean} [deps.sidecarHealthy] - health REAL del sidecar (dinámico)
 * @param {Set<string>|Array<string>} [deps.sidecarToolNames]
 * @returns {'live'|'soon'|'down'}
 */
export function getCapabilityHealth(capabilityId, deps = {}) {
  const {
    manifest = [],
    isSidecarEnabled = false,
    sidecarHealthy = null, // null = no se ha checkeado, usar flag
    sidecarToolNames = SIDECAR_TOOL_NAMES,
  } = deps;

  const toolsSet = sidecarToolNames instanceof Set
    ? sidecarToolNames
    : new Set(sidecarToolNames);

  const cap = Array.isArray(manifest)
    ? manifest.find((c) => c.id === capabilityId)
    : null;

  if (!cap) return 'live';

  if (cap.status === 'soon') return 'soon';

  // Determinar si sidecar está disponible:
  // - Si sidecarHealthy !== null, usar el health dinámico real
  // - Si no, degradar al comportamiento anterior (solo flag)
  const sidecarAvailable = sidecarHealthy !== null
    ? sidecarHealthy
    : isSidecarEnabled;

  if (cap.tool && toolsSet.has(cap.tool) && !sidecarAvailable) {
    return 'down';
  }

  return 'live';
}

// Export interno para tests — permite verificar estado del cache
export const __TEST__ = {
  healthCache,
};
