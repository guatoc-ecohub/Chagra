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
 *
 * Telemetría (v13 2026-05-17): cada call registra un evento privacy-safe en
 * IDB store `llm_telemetry` con modelo, latencia, tokens y processor
 * (gpu/cpu detectado vía /api/ps cache 5s). NUNCA persiste prompt ni respuesta.
 * Falla silente — telemetría jamás rompe la UX.
 */

import { recordLLMEvent } from './llmTelemetryService';
import { getGpuSnapshot } from './gpuTelemetryService';

const detectProcessorFor = async (model) => {
  try {
    const snapshot = await getGpuSnapshot();
    if (!snapshot?.available) return 'unknown';
    const entry = snapshot.models.find((m) => m.name === model || m.name?.startsWith(`${model}:`) || model?.startsWith(`${m.name}`));
    if (!entry) return 'unknown';
    return entry.processor === 'partial' ? 'partial' : entry.processor;
  } catch (_) {
    return 'unknown';
  }
};

const inferFlujo = (url, body) => {
  if (body?.flujo) return body.flujo;
  if (typeof url !== 'string') return 'other';
  if (url.includes('/api/chat')) return 'chat';
  if (url.includes('/api/generate')) return 'vision'; // generate se usa para vision foliage analysis
  if (url.includes('/v1/chat/completions')) return 'chat';
  return 'other';
};

const classifyError = (err, status) => {
  if (err?.name === 'AbortError') return 'abort';
  if (status >= 500) return 'http_5xx';
  if (status >= 400) return 'http_4xx';
  if (err?.message?.toLowerCase().includes('network')) return 'network';
  if (err?.message?.toLowerCase().includes('timeout')) return 'timeout';
  return 'network';
};

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
 * @param {Function}    [options.onDone] callback invocado con el ultimo objeto
 *        del stream (done:true). Expone metadata de Ollama: model,
 *        total_duration, eval_count, prompt_eval_count, etc.
 * @returns {Promise<string>} texto completo concatenado al terminar.
 * @throws {Error} si el fetch falla, el servidor responde no-2xx o el body no es streameable.
 * @example
 * const full = await streamOllama('/api/ollama/api/generate', { model: 'gemma3:4b', prompt: 'hola' }, tok => setText(tok));
 * // full => "Hola, en que puedo ayudarte?"
 */
export async function streamOllama(url, body, onToken, { signal, onDone } = {}) {
  const t0 = Date.now();
  const modelHint = body?.model || 'unknown';
  const flujoHint = inferFlujo(url, body);
  let lastDoneObj = null;
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    });
  } catch (err) {
    recordLLMEvent({
      model: modelHint,
      endpoint: url,
      flujo: flujoHint,
      status: err?.name === 'AbortError' ? 'abort' : 'error',
      total_ms: Date.now() - t0,
      error_kind: classifyError(err, 0),
    });
    throw err;
  }

  if (!response.ok) {
    let detail = '';
    try { detail = await response.text(); } catch (_) { /* noop */ }
    // Sanitize body antes de exponer — cloudflared 502 / Ollama down devuelven
    // HTML completo que el slice(200) leakea al UI (bug HelpVoiceQuestion 2026-05-08).
    const { buildCleanErrorMessage } = await import('./sanitizeError.js');
    const ctype = response.headers?.get?.('content-type') || '';
    recordLLMEvent({
      model: modelHint,
      endpoint: url,
      flujo: flujoHint,
      status: 'error',
      total_ms: Date.now() - t0,
      error_kind: classifyError(null, response.status),
    });
    throw new Error(buildCleanErrorMessage('Ollama', response.status, response.statusText, detail, ctype));
  }
  if (!response.body) {
    recordLLMEvent({
      model: modelHint,
      endpoint: url,
      flujo: flujoHint,
      status: 'error',
      total_ms: Date.now() - t0,
      error_kind: 'parse',
    });
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
          lastDoneObj = parsed;
          if (onDone) {
            try { onDone(parsed); } catch (_) { /* noop */ }
          }
          done = true;
          break;
        }
      }
    }
  } catch (err) {
    recordLLMEvent({
      model: lastDoneObj?.model || modelHint,
      endpoint: url,
      flujo: flujoHint,
      status: err?.name === 'AbortError' ? 'abort' : 'error',
      total_ms: Date.now() - t0,
      error_kind: classifyError(err, 0),
    });
    throw err;
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
    if (parsed?.done) lastDoneObj = parsed;
  }

  // Telemetría privacy-safe (NUNCA prompt ni respuesta, solo metadata).
  const total_ms = Date.now() - t0;
  const load_ms = lastDoneObj?.load_duration ? Math.round(lastDoneObj.load_duration / 1e6) : null;
  const eval_count = lastDoneObj?.eval_count ?? null;
  const eval_duration_ns = lastDoneObj?.eval_duration || 0;
  const eval_rate = (eval_count && eval_duration_ns)
    ? Math.round((eval_count / (eval_duration_ns / 1e9)) * 100) / 100
    : null;
  // Detección processor non-blocking (no esperamos, schedule en background)
  detectProcessorFor(lastDoneObj?.model || modelHint).then((processor) => {
    recordLLMEvent({
      model: lastDoneObj?.model || modelHint,
      endpoint: url,
      flujo: flujoHint,
      status: 'success',
      total_ms,
      load_ms,
      prompt_eval_count: lastDoneObj?.prompt_eval_count ?? null,
      eval_count,
      eval_rate,
      processor,
    });
  });

  return fullText;
}

export default streamOllama;
