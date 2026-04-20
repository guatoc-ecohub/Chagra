/**
 * ollamaStream.js — Cliente de streaming NDJSON para Ollama (v0.6.0).
 *
 * Ollama devuelve una secuencia de objetos JSON (uno por linea) cuando se
 * invoca con `stream: true`. Este helper consume la `ReadableStream` de la
 * respuesta, separa los objetos por newline, extrae el chunk textual segun
 * el endpoint (`/api/generate` -> `response`, `/api/chat` -> `message.content`)
 * y entrega cada token al callback `onToken(chunk, fullText)`.
 *
 * Requiere que el proxy (Nginx) desactive buffering sobre `/api/ollama/`:
 *   proxy_buffering off;
 *   proxy_cache off;
 *   proxy_request_buffering off;
 *   chunked_transfer_encoding on;
 *   proxy_http_version 1.1;
 * Sin esa configuracion, los chunks llegan en un unico lote al cliente y el
 * efecto de typewriter se pierde (la request sigue funcionando igual).
 */

const parseLine = (line) => {
  if (!line) return null;
  try { return JSON.parse(line); } catch (_) { return null; }
};

const extractChunk = (parsed) => {
  if (!parsed) return '';
  // /api/generate devuelve { response: "...", done: bool, ... }
  if (typeof parsed.response === 'string') return parsed.response;
  // /api/chat devuelve { message: { role, content }, done: bool, ... }
  if (parsed.message && typeof parsed.message.content === 'string') {
    return parsed.message.content;
  }
  return '';
};

/**
 * Invoca un endpoint de Ollama en modo streaming y emite cada token.
 *
 * @param {string}   url       endpoint absoluto o relativo (ej. '/api/ollama/api/chat').
 * @param {Object}   body      payload JSON sin la flag `stream` (se sobreescribe a true).
 * @param {Function} [onToken] callback (chunk, fullText) invocado por cada token.
 * @param {Object}   [options]
 * @param {AbortSignal} [options.signal] senal de aborto propagada al fetch.
 * @returns {Promise<string>} texto completo concatenado al terminar.
 * @throws {Error} si el fetch falla, el servidor responde no-2xx o el body no es streameable.
 */
export async function streamOllama(url, body, onToken, { signal } = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch (_) { /* noop */ }
    throw new Error(`Ollama ${response.status}: ${detail.slice(0, 200)}`);
  }
  if (!response.body) {
    throw new Error('Respuesta sin body streameable (¿buffering del proxy?)');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let done = false;

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      let nl;
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        const parsed = parseLine(line);
        if (!parsed) continue;

        const chunk = extractChunk(parsed);
        if (chunk) {
          fullText += chunk;
          if (onToken) onToken(chunk, fullText);
        }
        if (parsed.done) {
          done = true;
          break;
        }
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (_) { /* noop */ }
  }

  // Ultimo fragmento sin newline final (caso raro pero posible).
  const tail = buffer.trim();
  if (tail) {
    const parsed = parseLine(tail);
    const chunk = extractChunk(parsed);
    if (chunk) {
      fullText += chunk;
      if (onToken) onToken(chunk, fullText);
    }
  }

  return fullText;
}

export default streamOllama;
