/**
 * conversationCaptureService.js - Captura fire-and-forget de turnos del agente.
 *
 * Endpoint sidecar: POST /log-conversation.
 * Gated by VITE_CAPTURE_CONVERSATIONS (OFF by default).
 */

import { ulid } from 'ulid';

const CAPTURE_TIMEOUT_MS = 6000;
const TEXT_MAX = 16000;

export function isCaptureEnabled() {
  try {
    const raw = import.meta.env?.VITE_CAPTURE_CONVERSATIONS;
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const value = raw.trim().toLowerCase();
      return value === 'true' || value === '1' || value === 'on';
    }
  } catch (_) {
    return false;
  }
  return false;
}

function getBaseUrl() {
  try {
    const raw = import.meta.env?.VITE_SIDECAR_URL;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  } catch (_) {
    // noop
  }
  return '/api';
}

function getToken() {
  try {
    const raw = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    return typeof raw === 'string' ? raw : '';
  } catch (_) {
    return '';
  }
}

function clip(text) {
  if (typeof text !== 'string') return '';
  return text.length > TEXT_MAX ? `${text.slice(0, TEXT_MAX)}...[clip]` : text;
}

function buildIdentityPayload(identity = {}) {
  return {
    user_id: identity.user_id ?? null,
    user_name: identity.user_name ?? null,
    finca_id: identity.finca_id ?? null,
  };
}

function buildConversationPayload({ role, text, identity, meta }) {
  return {
    id: ulid(),
    ts: Date.now(),
    role,
    text: clip(text),
    ...buildIdentityPayload(identity),
    session_id: meta?.session_id ?? null,
    turn_index: typeof meta?.turn_index === 'number' ? meta.turn_index : null,
    nlu_route: meta?.nlu_route ?? null,
    entities_grounded: Array.isArray(meta?.entities_grounded) ? meta.entities_grounded.slice(0, 50) : [],
    grounding_used: Boolean(meta?.grounding_used),
    guards_fired: Array.isArray(meta?.guards_fired) ? meta.guards_fired.slice(0, 20) : [],
    latency_ms: typeof meta?.latency_ms === 'number' ? meta.latency_ms : null,
    model: meta?.model ?? null,
  };
}

function postCapture(payload) {
  const base = getBaseUrl();
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  fetch(`${base}/log-conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal,
    keepalive: true,
  })
    .catch((err) => {
      if (import.meta.env?.DEV) {
        console.debug('[conversationCapture] envio fallo (ignorado):', err?.name || err);
      }
    })
    .finally(() => clearTimeout(timer));
}

export function captureExchange({ userText, agentText, identity = {}, meta = {} } = {}) {
  if (!isCaptureEnabled()) return;
  if (typeof userText === 'undefined' && typeof agentText === 'undefined') return;

  if (typeof userText === 'string' && userText.trim()) {
    postCapture(buildConversationPayload({
      role: 'user',
      text: userText,
      identity,
      meta,
    }));
  }

  if (typeof agentText === 'string' && agentText.trim()) {
    postCapture(buildConversationPayload({
      role: 'agent',
      text: agentText,
      identity,
      meta,
    }));
  }
}
