/**
 * agentPartialMerge.js — Preservación de respuesta parcial ante interrupción.
 *
 * Bug UX (2026-05-30): cuando el stream del LLM se aborta/timeout/cancela a
 * mitad de respuesta, el texto parcial que el operador YA vio se borraba y se
 * reemplazaba por un string de error genérico ("Tiempo agotado o cancelado.
 * Toca de nuevo."), perdiendo contenido útil.
 *
 * Este módulo concentra la **lógica pura de merge del estado final**: dado el
 * texto parcial acumulado del stream y la razón de la interrupción, decide si
 * se conserva el parcial (apendeando un marcador NO destructivo) o si se
 * muestra el mensaje de error completo (caso "primer token nunca llegó", que
 * ya era correcto).
 *
 * Mantener esto como función pura (sin React, sin DOM) lo hace testeable en
 * vitest sin montar el componente y deja AgentScreen delgado.
 */

/**
 * Marcadores NO destructivos que se apendean al parcial. Texto plano: el
 * ChatBubble renderiza `message.content` con `whitespace-pre-wrap` (no es
 * markdown), así que NO usamos sintaxis `_italic_` que se vería con guiones
 * bajos literales. El emoji ⚠️ marca visualmente que la respuesta quedó
 * incompleta sin romper el flujo de lectura.
 */
export const PARTIAL_MARKERS = {
  // timeout total del LLM (LLM_TIMEOUT_MS) o stall sin tokens (watchdog).
  timeout: '\n\n⚠️ Respuesta incompleta (se cortó). Toca Reintentar.',
  // AbortError genérico (red caída mid-stream, signal externo no clasificado).
  abort: '\n\n⚠️ Respuesta incompleta (se cortó). Toca Reintentar.',
  // El operador tocó "Cancelar" a propósito.
  cancel: '\n\n⚠️ Cancelado por ti. Toca Reintentar para continuar.',
};

/**
 * Mensaje de error completo cuando NO hubo parcial (abort antes del primer
 * token). Este es el comportamiento que ya era correcto: mostrar el error en
 * el banner rojo separado, sin burbuja del assistant.
 */
export const FULL_ERROR_MESSAGES = {
  timeout: 'Tiempo agotado. Toca de nuevo para reintentar.',
  abort: 'Tiempo agotado o cancelado. Toca de nuevo.',
  cancel: 'Cancelado. Toca de nuevo si quieres reintentar.',
};

/**
 * Normaliza una razón de interrupción a una clave conocida. Cualquier valor
 * desconocido cae a 'abort' (el caso genérico).
 *
 * @param {string} reason
 * @returns {'timeout'|'abort'|'cancel'}
 */
export function normalizeInterruptReason(reason) {
  if (reason === 'timeout' || reason === 'cancel' || reason === 'abort') {
    return reason;
  }
  return 'abort';
}

/**
 * Decide el estado final de un turno del assistant interrumpido.
 *
 * @param {Object}  params
 * @param {string}  [params.partialContent]  texto acumulado del stream hasta
 *                                            el corte (puede ser '' / null).
 * @param {string}  [params.reason]           'timeout' | 'abort' | 'cancel'.
 * @returns {{
 *   preservePartial: boolean,
 *   content: (string|null),
 *   error: (string|null),
 *   incomplete: boolean,
 *   reason: ('timeout'|'abort'|'cancel'),
 * }}
 *   - `preservePartial=true`  → hay parcial: `content` es el parcial + marcador,
 *     `error` es null (no se muestra banner rojo: la burbuja ya comunica el
 *     corte vía el marcador). `incomplete=true` para que el caller pueda
 *     marcar el mensaje (`_incomplete`) y ofrecer Reintentar.
 *   - `preservePartial=false` → no hubo parcial: `content` es null y `error`
 *     es el mensaje completo para el banner. Comportamiento previo correcto.
 */
export function mergePartialOnInterruption({ partialContent, reason } = {}) {
  const normReason = normalizeInterruptReason(reason);
  const partial = typeof partialContent === 'string' ? partialContent : '';
  const hasPartial = partial.trim().length > 0;

  if (hasPartial) {
    return {
      preservePartial: true,
      content: partial + PARTIAL_MARKERS[normReason],
      error: null,
      incomplete: true,
      reason: normReason,
    };
  }

  return {
    preservePartial: false,
    content: null,
    error: FULL_ERROR_MESSAGES[normReason],
    incomplete: false,
    reason: normReason,
  };
}

export default mergePartialOnInterruption;
