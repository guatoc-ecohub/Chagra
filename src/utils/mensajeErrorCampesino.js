/**
 * mensajeErrorCampesino — traduce excepciones técnicas a frases que un
 * campesino entiende, sin asustar y sin jerga.
 *
 * Regla: al usuario NUNCA se le muestra un `error.message` crudo tipo
 * "Failed to fetch", "Unexpected token", "TypeError: x is undefined". Si el
 * mensaje ya viene curado en español (lo lanzó nuestro propio código con
 * texto pensado para el usuario), se respeta tal cual; si huele a técnico,
 * se reemplaza por una frase cálida y accionable.
 *
 * Uso:
 *   catch (e) { setError(mensajeErrorCampesino(e)); }
 *   catch (e) { alert(mensajeErrorCampesino(e, 'No se pudo guardar el paso.')); }
 */

export const MENSAJE_ERROR_RED =
  'Se fue la señal y no pudimos completar eso. Revise su conexión y vuelva a intentar.';

export const MENSAJE_ERROR_GENERICO =
  'No pude con eso. Intente de nuevo en un momento, o pregunte de otra forma.';

/* Huellas de error de RED: el remedio es esperar/revisar señal y reintentar. */
const RED_RE =
  /failed to fetch|networkerror|network request failed|load failed|fetch failed|econnrefused|econnreset|etimedout|socket hang up|err_internet_disconnected|err_network/i;

/* Huellas de mensaje TÉCNICO (no apto para mostrar): excepciones de JS,
 * parseo, HTTP crudo, timeouts en inglés, stacktraces. */
const TECNICO_RE = new RegExp(
  [
    /^(type|reference|syntax|range)error/i.source,
    /unexpected (token|end of)/i.source,
    /is not (a function|defined|iterable)/i.source,
    /(of|read properties of)? (undefined|null)/i.source,
    /\bjson\b/i.source,
    /http\s*(error)?\s*\d{3}/i.source,
    /\b5\d\d\b.*(server|gateway|unavailable)|internal server error|bad gateway|service unavailable/i.source,
    /request (timed out|timeout)|timeout|timed out/i.source,
    /\babort(ed|error)?\b/i.source,
    /\bat\s+\S+\s+\(.*:\d+:\d+\)/.source, // línea de stacktrace
    /indexeddb|quotaexceeded|transaction/i.source,
  ].join('|'),
  'i',
);

/**
 * @param {unknown} error - la excepción atrapada (Error, string o lo que llegue).
 * @param {string} [fallback] - frase curada propia del contexto (si no se pasa,
 *   se usa el genérico). Solo se usa cuando el mensaje original es técnico.
 * @returns {string} frase segura para mostrar al usuario.
 */
export function mensajeErrorCampesino(error, fallback = MENSAJE_ERROR_GENERICO) {
  const e = /** @type {{ message?: unknown } | string | null | undefined} */ (error);
  const raw = String((e && typeof e === 'object' ? e.message : e) || '').trim();
  if (!raw) return fallback;
  if (RED_RE.test(raw)) return MENSAJE_ERROR_RED;
  if (TECNICO_RE.test(raw)) return fallback;
  return raw; // mensaje ya curado por nuestro código: se respeta.
}

export default mensajeErrorCampesino;
