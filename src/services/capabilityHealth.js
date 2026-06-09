/**
 * capabilityHealth — Task 37: estado de disponibilidad de capacidades.
 *
 * Consulta salud de fuentes/MCP y deshabilita claramente capacidades
 * caídas antes de que el usuario escriba.
 */

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
