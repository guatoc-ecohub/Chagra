/**
 * friendlyErrors.js — mapea errores técnicos crudos a copy claro para el
 * operador agro (UX-12).
 *
 * Motivación: los catch blocks de aiService, syncManager, voiceService y
 * fetch globales devuelven mensajes que reflejan la causa técnica
 * ("NetworkError when attempting to fetch resource", "HTTP 422", "Ollama
 * connection refused", etc.). El operador en finca no necesita ni quiere
 * leer esos detalles — necesita saber qué hacer ahora.
 *
 * Estrategia: una sola función `friendlyMessage(error)` que acepta:
 *   - Un objeto Error (con `message` y opcional `status`/`code`)
 *   - Un número (status HTTP)
 *   - Un string (mensaje crudo, ej. de fetch network error)
 *   - null/undefined → fallback genérico
 *
 * Mapeo (ordenado por especificidad — el primer match gana):
 *   1. Vision OOM (modelo de visión rechazó imagen) → "La foto era muy
 *      grande para procesar. Toma una más liviana."
 *   2. Ollama down (connection refused, ECONNREFUSED, fetch failed contra
 *      ollama/asistente) → "El asistente Chagra se está reiniciando.
 *      Dame un momento."
 *   3. Network timeout / fetch failed genérico → "No pude conectarme.
 *      Revisa tu internet y vuelve a intentar."
 *   4. HTTP 401 / token expired → "Tu sesión expiró. Vuelve a iniciar
 *      sesión."
 *   5. HTTP 422 validation → "Algo en los datos no funcionó. Avísame al
 *      equipo si esto se repite."
 *   6. HTTP 5xx server → "El servidor tuvo un problema. Volveré a
 *      intentar en unos segundos."
 *   7. Cualquier otro → "Algo no funcionó. Intenta de nuevo."
 *
 * Reglas Colombia (no voseo):
 *   - "vuelve a intentar" / "intenta" — NO "intentá" / "volvé"
 *   - "tu sesión" — NO "tu sesión vos"
 *   - "te avisa" / "avísame" — NO "avisame al equipo"
 *
 * Uso:
 *   import { friendlyMessage } from '../utils/friendlyErrors';
 *   try { ... } catch (err) {
 *     showToast(friendlyMessage(err), true);
 *   }
 */

export const FRIENDLY_FALLBACK = 'Algo no funcionó. Intenta de nuevo.';

export const FRIENDLY_MESSAGES = {
  NETWORK: 'No pude conectarme. Revisa tu internet y vuelve a intentar.',
  AUTH_EXPIRED: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  VALIDATION: 'Algo en los datos no funcionó. Avísame al equipo si esto se repite.',
  SERVER: 'El servidor tuvo un problema. Volveré a intentar en unos segundos.',
  OLLAMA_DOWN: 'El asistente Chagra se está reiniciando. Dame un momento.',
  VISION_OOM: 'La foto era muy grande para procesar. Toma una más liviana.',
};

/**
 * Extrae status HTTP de varias formas comunes:
 *   - Error con propiedad `.status` (apiService.js custom)
 *   - Error con propiedad `.code` numérico
 *   - Mensaje string con "HTTP 422" o "status 401"
 */
function extractStatus(input) {
  if (typeof input === 'number') return input;
  if (input && typeof input === 'object') {
    if (typeof input.status === 'number') return input.status;
    if (typeof input.code === 'number') return input.code;
    if (typeof input.statusCode === 'number') return input.statusCode;
  }
  const msg = typeof input === 'string'
    ? input
    : (input && typeof input.message === 'string' ? input.message : '');
  // Busca patterns como "HTTP 422", "status 401", "Error 502: Bad Gateway"
  const match = msg.match(/\b(?:HTTP|status|Error)\s*[:= ]?\s*(\d{3})\b/i);
  if (match) return parseInt(match[1], 10);
  return null;
}

function extractMessage(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object' && typeof input.message === 'string') {
    return input.message;
  }
  return '';
}

/**
 * Mapea un error/status crudo a copy user-friendly.
 *
 * @param {Error|number|string|null|undefined} input
 * @returns {string} mensaje user-friendly listo para toast/banner.
 */
export function friendlyMessage(input) {
  if (input === null || input === undefined) return FRIENDLY_FALLBACK;

  const msg = extractMessage(input).toLowerCase();
  const status = extractStatus(input);

  // 1. Vision OOM — modelo rechazó imagen por tamaño / memoria
  if (
    msg.includes('out of memory') ||
    msg.includes('oom') ||
    msg.includes('cuda error') ||
    msg.includes('image too large') ||
    msg.includes('imagen muy grande') ||
    msg.includes('imagen demasiado') ||
    msg.includes('payload too large') ||
    status === 413
  ) {
    return FRIENDLY_MESSAGES.VISION_OOM;
  }

  // 2. Ollama down — patrones específicos del asistente
  if (
    msg.includes('ollama') ||
    msg.includes('econnrefused') ||
    msg.includes('connection refused') ||
    msg.includes('asistente') ||
    msg.includes('model not found') ||
    msg.includes('llama runner')
  ) {
    return FRIENDLY_MESSAGES.OLLAMA_DOWN;
  }

  // 4. HTTP 401 / token expired — antes del check de network genérico
  if (
    status === 401 ||
    status === 403 ||
    msg.includes('token expired') ||
    msg.includes('token expirado') ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('sesión expir') ||
    msg.includes('sesion expir')
  ) {
    return FRIENDLY_MESSAGES.AUTH_EXPIRED;
  }

  // 5. HTTP 422 validation
  if (
    status === 422 ||
    status === 400 ||
    msg.includes('validation') ||
    msg.includes('validación') ||
    msg.includes('unprocessable')
  ) {
    return FRIENDLY_MESSAGES.VALIDATION;
  }

  // 6. HTTP 5xx server
  if (typeof status === 'number' && status >= 500 && status <= 599) {
    return FRIENDLY_MESSAGES.SERVER;
  }

  // 3. Network timeout / fetch failed (general — chequear después de auth
  //    para que un 401 con texto "failed" caiga en AUTH primero)
  if (
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('network request failed') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('offline') ||
    msg.includes('sin conexión') ||
    msg.includes('sin conexion')
  ) {
    return FRIENDLY_MESSAGES.NETWORK;
  }

  return FRIENDLY_FALLBACK;
}

export default friendlyMessage;
