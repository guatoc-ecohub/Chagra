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
 * (configurado server-side en el proxy Nginx, mismo patrón que /api/ollama/).
 *
 * Telemetría (v13 2026-05-17): cada call registra evento privacy-safe en
 * IDB `llm_telemetry` con modelo, latencia, tokens, processor (gpu/cpu).
 * NUNCA persiste prompt ni respuesta. Falla silente.
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

const classifyError = (err, status) => {
  if (err?.name === 'AbortError') return 'abort';
  if (status >= 500) return 'http_5xx';
  if (status >= 400) return 'http_4xx';
  if (err?.message?.toLowerCase().includes('network')) return 'network';
  if (err?.message?.toLowerCase().includes('timeout')) return 'timeout';
  return 'network';
};

const inferFlujo = (url, body) => {
  if (body?.flujo) return body.flujo;
  if (typeof url !== 'string') return 'other';
  if (url.includes('/v1/chat/completions')) return 'chat';
  return 'other';
};

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
  if (choice.delta && typeof choice.delta.content === 'string') {
    return choice.delta.content;
  }
  if (choice.message && typeof choice.message.content === 'string') {
    return choice.message.content;
  }
  return '';
};

const extractDeltaToolCalls = (parsed) => {
  if (!parsed || !Array.isArray(parsed.choices)) return null;
  const choice = parsed.choices[0];
  if (!choice || !choice.delta || !Array.isArray(choice.delta.tool_calls)) return null;
  return choice.delta.tool_calls;
};

const mergeToolCallDeltas = (acc, deltas) => {
  for (const tc of deltas) {
    const idx = tc.index;
    if (!acc[idx]) {
      acc[idx] = { index: idx, id: tc.id || null, function: { name: null, arguments: '' } };
    }
    if (tc.id) acc[idx].id = tc.id;
    if (tc.function) {
      if (tc.function.name) acc[idx].function.name = tc.function.name;
      if (tc.function.arguments) acc[idx].function.arguments += tc.function.arguments;
    }
  }
  return acc;
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
 * @returns {Promise<{fullText: string, toolCalls: Array|null}>}
 *     Objeto con el texto completo y las tool_calls acumuladas (null si no hubo).
 * @throws {Error} si fetch falla, no-2xx, o body no streameable.
 */
export async function streamOpenAI(url, body, onToken, { signal, onDone } = {}) {
  const t0 = Date.now();
  const modelHint = body?.model || 'unknown';
  const flujoHint = inferFlujo(url, body);
  let response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
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
    throw new Error(buildCleanErrorMessage('LLM', response.status, response.statusText, detail, ctype));
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
  let lastParsed = null;
  let done = false;
  const accumulatedToolCalls = [];

  try {
    while (!done) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

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
          const tc = extractDeltaToolCalls(parsed);
          if (tc) {
            mergeToolCallDeltas(accumulatedToolCalls, tc);
          }
          if (isDoneChunk(parsed)) {
          }
        }
        if (done) break;
      }
    }
  } catch (err) {
    recordLLMEvent({
      model: lastParsed?.model || modelHint,
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

  if (onDone && lastParsed) {
    try { onDone(lastParsed); } catch (_) { /* noop */ }
  }

  const total_ms = Date.now() - t0;
  const usage = lastParsed?.usage || null;
  const eval_count = usage?.completion_tokens ?? null;
  const prompt_eval_count = usage?.prompt_tokens ?? null;
  const eval_rate = (eval_count && total_ms)
    ? Math.round((eval_count / (total_ms / 1000)) * 100) / 100
    : null;
  detectProcessorFor(lastParsed?.model || modelHint).then((processor) => {
    recordLLMEvent({
      model: lastParsed?.model || modelHint,
      endpoint: url,
      flujo: flujoHint,
      status: 'success',
      total_ms,
      load_ms: null,
      prompt_eval_count,
      eval_count,
      eval_rate,
      processor,
    });
  });

  let toolCalls = null;
  if (accumulatedToolCalls.length > 0) {
    toolCalls = accumulatedToolCalls.map((tc) => {
      try {
        tc.function.arguments = JSON.parse(tc.function.arguments);
      } catch {
        tc.function.arguments = null;
      }
      return tc;
    });
  }

  return { fullText, toolCalls };
}

export default streamOpenAI;
