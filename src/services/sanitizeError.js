/**
 * sanitizeError.js
 *
 * Helpers para limpiar response bodies de upstream antes de mostrarlos al
 * usuario. Caso de uso real: cloudflared / Drupal / Ollama devuelven HTML
 * cuando hay 404/502/etc. Si pegamos ese body al toast / banner / log
 * persisted, el operador ve `<!DOCTYPE html> <html lang="es" dir="ltr">...`
 * que es ruido cognitivo + leaks de implementación + viola anti-ladrillo
 * (chagra-ux-principles P2 + P4).
 *
 * Bugs operador 2026-05-08:
 *  - BitacoraEntryDetail mostraba HTML completo de página 404 Drupal/FarmOS
 *  - HelpVoiceQuestion mostraba HTML completo de página 502 cloudflared/Ollama
 *
 * Estrategia:
 *  1. Detectar si el body es HTML (starts with <!DOCTYPE / <html / contiene <body
 *     en los primeros 500 chars). Si lo es → descartar body, devolver null.
 *  2. Detectar si es JSON:API error (FarmOS/Drupal). Si lo es → extraer
 *     errors[0].detail clean.
 *  3. Detectar si es JSON simple {error: "..."} / {message: "..."} y extraer.
 *  4. Si nada coincide → texto plano truncado a MAX_DETAIL_CHARS.
 */

const MAX_DETAIL_CHARS = 240;

/**
 * Sanitiza un response body string antes de mostrarlo al usuario.
 * Returns clean detail string (≤240 chars) o null si el body era HTML
 * sin info útil.
 *
 * @param {string|null|undefined} rawBody — response.text() crudo
 * @param {string} [contentType] — opcional, content-type header
 * @returns {string|null}
 */
export function sanitizeErrorDetail(rawBody, contentType = '') {
  if (!rawBody || typeof rawBody !== 'string') return null;
  const head = rawBody.slice(0, 500).trim();

  const isHtml =
    /^<!DOCTYPE/i.test(head) ||
    /^<html\b/i.test(head) ||
    /<body\b/i.test(head) ||
    (contentType && /text\/html/i.test(contentType));

  if (isHtml) {
    return null;
  }

  // JSON:API spec (FarmOS/Drupal): { errors: [{ detail, title, status, ... }] }
  if (/^\s*\{/.test(head) && (contentType.includes('json') || /"errors"|"error"|"message"|"detail"/.test(head))) {
    try {
      const parsed = JSON.parse(rawBody);
      if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
        const first = parsed.errors[0];
        const detail = first?.detail || first?.title || first?.message;
        if (detail) return String(detail).slice(0, MAX_DETAIL_CHARS);
      }
      const directDetail = parsed?.detail || parsed?.error || parsed?.message;
      if (directDetail) return String(directDetail).slice(0, MAX_DETAIL_CHARS);
    } catch (_) {
      // JSON malformado, caer a fallback texto plano
    }
  }

  // Plain text — truncar y limpiar tags HTML residuales
  const cleaned = rawBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.slice(0, MAX_DETAIL_CHARS);
}

/**
 * Construye un Error message clean a partir de status + statusText + body.
 * Si el body es HTML descartable, devuelve solo `Error <status>: <statusText>`.
 *
 * @param {string} prefix — "FarmOS API Error" o "Ollama" o similar
 * @param {number} status — HTTP status code
 * @param {string} statusText — HTTP status text
 * @param {string|null} rawBody — response body string
 * @param {string} [contentType] — content-type header
 * @returns {string}
 */
export function buildCleanErrorMessage(prefix, status, statusText, rawBody, contentType = '') {
  const cleaned = sanitizeErrorDetail(rawBody, contentType);
  const base = `${prefix} ${status}${statusText ? `: ${statusText}` : ''}`;
  if (!cleaned) return base;
  return `${base} — ${cleaned}`;
}
