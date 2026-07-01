/* eslint-disable chagra-i18n/no-hardcoded-spanish */
import { TOOL_TIMEOUT_MS } from './sidecarClient.js';
import { fetchWithAuthRetry } from './apiService.js';

/**
 * capabilityHealth — Task 37: estado de disponibilidad de capacidades.
 *
 * Consulta salud de fuentes/MCP y deshabilita claramente capacidades
 * caídas antes de que el usuario escriba.
 */

/**
 * Tools que dependen del sidecar MCP agro (ALLOWED_TOOLS en sidecarClient).
 * Si el sidecar está caído/deshabilitado, las capacidades que usan estas
 * tools se marcan 'down'. Las capacidades con tools NO listadas aquí son
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
  // Reconciliación allow-list ↔ NLU (fix grounding P0 2026-06-25): tools
  // agregadas a ALLOWED_TOOLS en sidecarClient. Se sirven vía el endpoint del
  // sidecar (grafo AGE / catálogo / dataset institucional), así que dependen
  // de que el sidecar esté arriba. Se mantiene en sync con ALLOWED_TOOLS.
  'get_calendario_siembra',
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
]);

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
    const res = await fetchWithAuthRetry('/api/ollama/api/tags', { signal: AbortSignal.timeout(TOOL_TIMEOUT_MS) });
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
 *    NO está habilitado → 'down' (dependencia rota).
 * 3. En cualquier otro caso → 'live' (offline-first o sidecar activo).
 *
 * Degradación segura: si el capabilityId no está en el manifest,
 * retorna 'live' (asume offline-first, no rompe el menú).
 *
 * @param {string} capabilityId — id de la capacidad (ej. 'siembro')
 * @param {Object} deps — dependencias inyectadas (testeable)
 * @param {Array<{id:string, status:string, tool:string|null}>} [deps.manifest]
 * @param {boolean} [deps.isSidecarEnabled=true]
 * @param {Set<string>|Array<string>} [deps.sidecarToolNames]
 * @returns {'live'|'soon'|'down'}
 */
export function getCapabilityHealth(capabilityId, deps = {}) {
  const {
    manifest = [],
    isSidecarEnabled = false,
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

  if (cap.tool && toolsSet.has(cap.tool) && !isSidecarEnabled) {
    return 'down';
  }

  return 'live';
}
