/**
 * openaiStream.js — Cliente SSE para backends OpenAI-compatibles (v0.13.0).
 *
 * Reemplaza a ollamaStream.js para consumidores que apuntan a /api/llamacpp/
 * (llama-server nativo, ver DR hardware-llm 2026-05-11) o cualquier otro
 * backend que exponga /v1/chat/completions estándar OpenAI.
 *
 * Formato de respuesta SSE (Server-Sent Events) — distinto al NDJSON de Ollama:
 *
 *   data: {"choices":[{"delta":{"content":"hola"}}],"model":"olmoe"}\n\n
 *   data: {"choices":[{"delta":{"content":" mundo"}}]}\n\n
 *   data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{...}}\n\n
 *   data: [DONE]\n\n
 *
 * Cada chunk inicia con `data: ` y termina con doble newline. El último
 * mensaje literal es `data: [DONE]\n\n` (sin JSON, marca el fin). El chunk
 * antes de `[DONE]` puede contener `usage` (tokens consumidos) y
 * `finish_reason` ('stop', 'length', 'tool_calls', etc.) — equivalente al
 * objeto `{ done: true, ... }` de Ollama.
 *
 * Requiere que el proxy (Nginx) desactive buffering sobre /api/llamacpp/:
 *   proxy_buffering off;
 *   proxy_cache off;
 *   chunked_transfer_encoding on;
 * (configurado en hosts/alpha/default.nix, mismo patrón que /api/ollama/).
 */

const SSE_DATA_PREFIX = 'data: ';

const parseSSEData = (rawData) => {
  const trimmed = rawData.trim();
  if (!trimmed || trimmed === '[DONE]') return null;
  try { return JSON.parse(trimmed); } catch (_) { return null; }
};

const extractDeltaContent = (parsed) => {
  if (!parsed || !Array.isArray(parsed.choices)) return '';
  const choice = parsed.choices[0];
  if (!choice) return '';
  // streaming: delta.content (token incremental)
  if (choice.delta && typeof choice.delta.content === 'string') {
    return choice.delta.content;
  }
  // non-stream fallback: message.content (respuesta completa de una)
  if (choice.message && typeof choice.message.content === 'string') {
    return choice.message.content;
  }
  return '';
};

const isDoneChunk = (parsed) =>
  parsed && Array.isArray(parsed.choices) &&
  parsed.choices.some((c) => c?.finish_reason);

/**
 * Invoca un endpoint OpenAI-compatible en modo streaming y emite cada token.
 *
 * @param {string}   url       endpoint (ej. '/api/llamacpp/v1/chat/completions').
 * @param {Object}   body      payload OpenAI (model, messages, temperature, etc).
 *                             El flag `stream` se sobreescribe a true.
 * @param {Function} [onToken] callback (chunk, fullText) por cada delta.content.
 * @param {Object}   [options]
 * @param {AbortSignal} [options.signal] señal de aborto.
 * @param {Function}    [options.onDone] callback con el último chunk parseado
 *        (incluye `usage` y `finish_reason` si el backend lo emite).
 * @returns {Promise<string>} texto completo concatenado.
 * @throws {Error} si fetch falla, no-2xx, o body no streameable.
 */
export async function streamOpenAI(url, body, onToken, { signal, onDone } = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify({ ...body, stream: true }),
    signal,
  });

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch (_) { /* noop */ }
    const { buildCleanErrorMessage } = await import('./sanitizeError.js');
    const ctype = response.headers?.get?.('content-type') || '';
    throw new Error(buildCleanErrorMessage('LLM', response.status, response.statusText, detail, ctype));
  }
  if (!response.body) {
    throw new Error('Respuesta sin body streameable (¿buffering del proxy?)');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let lastParsed = null;
  let done = false;

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE separa eventos por doble newline. Cada evento puede tener
      // múltiples líneas pero para chat completions siempre es una sola
      // línea `data: {...}`.
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        for (const line of eventBlock.split('\n')) {
          if (!line.startsWith(SSE_DATA_PREFIX)) continue;
          const rawData = line.slice(SSE_DATA_PREFIX.length);
          if (rawData.trim() === '[DONE]') {
            done = true;
            break;
          }
          const parsed = parseSSEData(rawData);
          if (!parsed) continue;
          lastParsed = parsed;
          const chunk = extractDeltaContent(parsed);
          if (chunk) {
            fullText += chunk;
            if (onToken) onToken(chunk, fullText);
          }
          if (isDoneChunk(parsed)) {
            // Algunos backends emiten finish_reason ANTES del [DONE]
            // literal; usage/eval_count viene en este último chunk.
          }
        }
        if (done) break;
      }
    }
  } finally {
    try { reader.releaseLock(); } catch (_) { /* noop */ }
  }

  if (onDone && lastParsed) {
    try { onDone(lastParsed); } catch (_) { /* noop */ }
  }

  return fullText;
}

export default streamOpenAI;
