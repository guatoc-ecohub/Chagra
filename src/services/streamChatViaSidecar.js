/**
 * streamChatViaSidecar.js — SSE chat streaming client (SPEED-1).
 *
 * ⚠️ IN-5 (auditoria 2026-06-10): el endpoint `POST /chat/stream` NO existe
 * en el sidecar de produccion. Este modulo esta GATEADO detras del flag
 * `VITE_AGENT_STREAMING` (default OFF en .env). Si se activa, el cliente
 * intentara conectar a una ruta fantasma → 404. NO activar hasta que el
 * sidecar implemente el endpoint. Mientras tanto, la PWA usa streamOpenAI
 * (comportamiento por defecto, estable).
 *
 * Companion to the sidecar `POST /chat/stream` endpoint. Speaks the
 * sidecar's custom SSE shape (NOT raw Ollama, NOT OpenAI):
 *
 *   data: {"type":"start","model":"...","request_id":"..."}\n\n
 *   data: {"type":"delta","content":"Hola "}\n\n
 *   data: {"type":"delta","content":"mijo"}\n\n
 *   data: {"type":"done","total_ms":1234,"first_token_ms":420,"eval_count":42,"eval_rate":8.5}\n\n
 *   data: [DONE]\n\n
 *
 * Why a separate client (vs reusing openaiStream.js):
 *
 *   - openaiStream expects OpenAI chat completions schema
 *     (`choices[0].delta.content`). Our sidecar emits a flatter shape
 *     (`{type:"delta", content:"..."}`) that's cheaper to parse and easier
 *     to extend with start/done/error events without polluting the OpenAI
 *     contract.
 *   - We want first-class typed events (start/delta/done/error) callbacks
 *     so the UI can wire a progress bar / token cursor without re-parsing.
 *   - Telemetry of the sidecar path is its own row in the LLM telemetry
 *     store (`flujo: 'chat_sidecar'`) so we can A/B compare against the
 *     direct path.
 *
 * Feature flag: gated on the caller. AgentScreen reads
 * `VITE_AGENT_STREAMING` and falls back to `streamOpenAI` when off.
 *
 * Cancellation: the caller passes an AbortSignal (typically from
 * AgentScreen's `activeControllerRef`). When aborted, fetch tears down and
 * the sidecar sees `req.raw.on('close')` and cancels the upstream Ollama
 * fetch. Same UX as `streamOpenAI`.
 */

import { recordLLMEvent } from './llmTelemetryService';

const NLU_DEFAULT_URL = '/api/mcp/agro';
const SSE_DATA_PREFIX = 'data: ';

const classifyError = (err, status) => {
  if (err?.name === 'AbortError') return 'abort';
  if (status >= 500) return 'http_5xx';
  if (status >= 400) return 'http_4xx';
  if (err?.message?.toLowerCase().includes('network')) return 'network';
  if (err?.message?.toLowerCase().includes('timeout')) return 'timeout';
  return 'network';
};

function getBaseUrl() {
  try {
    const raw = import.meta.env?.VITE_SIDECAR_URL;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  } catch (_) {
    // ignore
  }
  return NLU_DEFAULT_URL;
}

function getToken() {
  try {
    const raw = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    return typeof raw === 'string' ? raw : '';
  } catch (_) {
    return '';
  }
}

/**
 * Reads the streaming feature flag. Accepts 'true' / '1'. Anything else
 * (incl. undefined) → false. Default OFF for safety: the sidecar streaming
 * path is opt-in until baseline metrics validate it across all bench
 * scenarios.
 *
 * @returns {boolean}
 */
export function isAgentStreamingEnabled() {
  try {
    const raw = import.meta.env?.VITE_AGENT_STREAMING;
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1';
    }
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Parse a single SSE `data:` line. Returns either a parsed JSON object,
 * the literal `'[DONE]'` sentinel, or null if the line is empty/garbage.
 */
function parseSseLine(line) {
  if (!line.startsWith(SSE_DATA_PREFIX)) return null;
  const raw = line.slice(SSE_DATA_PREFIX.length).trim();
  if (!raw) return null;
  if (raw === '[DONE]') return '[DONE]';
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

/**
 * Stream chat from the sidecar.
 *
 * @param {Object}   params
 * @param {string}   params.model     — Ollama tag (e.g. "<modelo-configurado>")
 * @param {Array}    params.messages  — OpenAI-style [{role, content}, ...]
 * @param {string}   [params.system]  — optional system prepended by sidecar
 *                                       if first message isn't already system
 * @param {Object}   [params.options] — Ollama options passthrough
 *                                       (temperature, num_predict, etc.)
 * @param {string}   [params.keep_alive] — Ollama keep_alive ("5m", "30m")
 * @param {Function} [params.onToken]   — (chunk, fullText) per delta
 * @param {Function} [params.onStart]   — ({model, request_id})
 * @param {Function} [params.onDone]    — (stats) once, before promise resolves
 * @param {Function} [params.onError]   — (errInfo) for upstream stream errors
 *                                         emitted as {type:"error"} mid-stream
 * @param {AbortSignal} [params.signal] — abort propagated to fetch
 * @returns {Promise<{fullText: string, stats: Object}>}
 * @throws {Error} when transport fails, sidecar returns non-2xx, or
 *                  AbortError on signal cancellation.
 */
export async function streamChatViaSidecar({
  model,
  messages,
  system,
  options,
  keep_alive,
  onToken,
  onStart,
  onDone,
  onError,
  signal,
}) {
  if (!model || typeof model !== 'string') {
    throw new Error('model required');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be non-empty array');
  }

  const t0 = (typeof performance !== 'undefined' && performance.now)
    ? performance.now()
    : Date.now();
  const base = getBaseUrl();
  const url = `${base}/chat/stream`;
  const token = getToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };
  if (token) headers['X-Chagra-Token'] = token;

  const body = { model, messages };
  if (system) body.system = system;
  if (options) body.options = options;
  if (keep_alive) body.keep_alive = keep_alive;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    recordLLMEvent({
      model,
      endpoint: url,
      flujo: 'chat_sidecar',
      status: err?.name === 'AbortError' ? 'abort' : 'error',
      total_ms: Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0),
      error_kind: classifyError(err, 0),
    });
    throw err;
  }

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch (_) {
      // ignore
    }
    recordLLMEvent({
      model,
      endpoint: url,
      flujo: 'chat_sidecar',
      status: 'error',
      total_ms: Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0),
      error_kind: classifyError(null, response.status),
    });
    const cleanDetail = (detail || '').slice(0, 200);
    throw new Error(`Sidecar chat error ${response.status}: ${cleanDetail || response.statusText}`);
  }
  if (!response.body) {
    recordLLMEvent({
      model,
      endpoint: url,
      flujo: 'chat_sidecar',
      status: 'error',
      total_ms: Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0),
      error_kind: 'parse',
    });
    throw new Error('Sidecar returned non-streamable response (¿buffering del proxy?)');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let doneEventStats = null;
  let firstTokenWallMs = null;
  let streamFinished = false;

  try {
    while (!streamFinished) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE separates events with a blank line (\n\n).
      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const eventBlock = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);

        for (const line of eventBlock.split('\n')) {
          const parsed = parseSseLine(line);
          if (parsed === null) continue;
          if (parsed === '[DONE]') {
            streamFinished = true;
            break;
          }
          // Typed event shape from sidecar: {type, ...}
          if (parsed.type === 'start') {
            if (onStart) {
              try { onStart(parsed); } catch (_) { /* noop */ }
            }
          } else if (parsed.type === 'delta' && typeof parsed.content === 'string') {
            if (firstTokenWallMs === null) {
              firstTokenWallMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
            }
            fullText += parsed.content;
            if (onToken) {
              try { onToken(parsed.content, fullText); } catch (_) { /* noop */ }
            }
          } else if (parsed.type === 'done') {
            doneEventStats = parsed;
          } else if (parsed.type === 'error') {
            if (onError) {
              try { onError(parsed); } catch (_) { /* noop */ }
            }
          }
        }
        if (streamFinished) break;
      }
    }
  } catch (err) {
    recordLLMEvent({
      model: doneEventStats?.model || model,
      endpoint: url,
      flujo: 'chat_sidecar',
      status: err?.name === 'AbortError' ? 'abort' : 'error',
      total_ms: Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0),
      error_kind: classifyError(err, 0),
    });
    throw err;
  } finally {
    try { reader.releaseLock(); } catch (_) { /* noop */ }
  }

  const totalMs = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0);
  const stats = {
    fullText,
    total_ms: totalMs,
    first_token_ms: firstTokenWallMs,
    sidecar_first_token_ms: doneEventStats?.first_token_ms ?? null,
    sidecar_total_ms: doneEventStats?.total_ms ?? null,
    eval_count: doneEventStats?.eval_count ?? null,
    eval_rate: doneEventStats?.eval_rate ?? null,
    prompt_eval_count: doneEventStats?.prompt_eval_count ?? null,
    model: doneEventStats?.model || model,
    total_chars: doneEventStats?.total_chars ?? fullText.length,
  };

  if (onDone) {
    try { onDone(stats); } catch (_) { /* noop */ }
  }

  // Telemetry — same shape used by openaiStream / ollamaStream, with the
  // distinct `flujo: 'chat_sidecar'` tag so the dashboard can isolate the
  // streaming path and the operator can A/B compare baseline vs SPEED-1.
  recordLLMEvent({
    model: stats.model,
    endpoint: url,
    flujo: 'chat_sidecar',
    status: 'success',
    total_ms: totalMs,
    load_ms: null,
    prompt_eval_count: stats.prompt_eval_count,
    eval_count: stats.eval_count,
    eval_rate: stats.eval_rate,
    processor: 'unknown',
    first_token_ms: firstTokenWallMs,
  });

  return { fullText, stats };
}

export default streamChatViaSidecar;
