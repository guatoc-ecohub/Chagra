/**
 * conversationCaptureService.js — Captura server-side de las conversaciones del
 * agente para el demo/piloto (entrega de usuarios 2026-06-05).
 *
 * POR QUÉ EXISTE: hoy el historial del chat es local-only (IndexedDB de cada
 * browser, #120) y el chat va directo a Ollama sin pasar por el sidecar, así que
 * NADA queda guardado central. Para evaluar las pruebas de cada usuario al final
 * del día, hay que persistir cada turno (pregunta + respuesta + grounding) en el
 * sidecar. Mirror del patrón de `feedbackService.js` (mismo base URL + token).
 *
 * Endpoint sidecar: POST /log-conversation (chagra-pro, append a JSONL durable).
 *
 * Reglas:
 * - Gated por `VITE_CAPTURE_CONVERSATIONS` (ON solo para el demo; OFF default →
 *   respeta la privacidad de grupos futuros, que requieren Habeas Data / DR-F).
 * - Fire-and-forget: NUNCA bloquea ni rompe la UX del chat; falla en silencio.
 * - El grupo del primer demo es gente cercana → captura texto completo + identidad
 *   (decisión explícita del operador 2026-06-05).
 *
 * Schema del evento (1 línea JSONL por turno):
 * {
 *   id, ts,
 *   user_id, user_name,        // identidad del usuario logueado
 *   finca_slug, finca_nombre,  // finca activa
 *   session_id, turn_index,
 *   user_text,                 // pregunta del usuario (limpia)
 *   agent_text,                // respuesta del agente (final)
 *   nlu_route,                 // ruta NLU elegida (si la hubo)
 *   entities_grounded,         // entidades resueltas en el grafo
 *   guards_fired,              // guards de seguridad que actuaron
 *   grounded_status,           // _grounded.status
 *   latency_ms, model
 * }
 */

import { ulid } from 'ulid';

const CAPTURE_TIMEOUT_MS = 6000;
const TEXT_MAX = 16000; // cota por campo (un turno largo del agente ~2-4k; holgado)

/** ¿Captura activa? Gated por env. OFF por defecto. */
export function isCaptureEnabled() {
  try {
    const raw = import.meta.env?.VITE_CAPTURE_CONVERSATIONS;
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1' || v === 'on';
    }
    return false;
  } catch (_) {
    return false;
  }
}

function getBaseUrl() {
  try {
    const raw = import.meta.env?.VITE_SIDECAR_URL;
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().replace(/\/+$/, '');
    }
  } catch (_) {
    // ignore
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

function clip(s) {
  if (typeof s !== 'string') return '';
  return s.length > TEXT_MAX ? `${s.slice(0, TEXT_MAX)}…[clip]` : s;
}

/**
 * Captura un turno completo (pregunta del usuario + respuesta del agente).
 * Fire-and-forget: devuelve void, no espera, no lanza.
 *
 * @param {Object} p
 * @param {string} p.userText      pregunta del usuario
 * @param {string} p.agentText     respuesta final del agente
 * @param {Object} [p.identity]    { user_id, user_name, finca_slug, finca_nombre }
 * @param {Object} [p.meta]        { session_id, turn_index, nlu_route, entities_grounded,
 *                                   guards_fired, grounded_status, latency_ms, model }
 */
export function captureExchange({ userText, agentText, identity = {}, meta = {} } = {}) {
  if (!isCaptureEnabled()) return;
  // No capturamos turnos vacíos (p. ej. abortados sin respuesta).
  if (!userText && !agentText) return;

  const payload = {
    id: ulid(),
    ts: Date.now(),
    user_id: identity.user_id ?? null,
    user_name: identity.user_name ?? null,
    finca_slug: identity.finca_slug ?? null,
    finca_nombre: identity.finca_nombre ?? null,
    session_id: meta.session_id ?? null,
    turn_index: typeof meta.turn_index === 'number' ? meta.turn_index : null,
    user_text: clip(userText),
    agent_text: clip(agentText),
    nlu_route: meta.nlu_route ?? null,
    entities_grounded: Array.isArray(meta.entities_grounded) ? meta.entities_grounded.slice(0, 50) : [],
    guards_fired: Array.isArray(meta.guards_fired) ? meta.guards_fired.slice(0, 20) : [],
    grounded_status: meta.grounded_status ?? null,
    latency_ms: typeof meta.latency_ms === 'number' ? meta.latency_ms : null,
    model: meta.model ?? null,
  };

  const base = getBaseUrl();
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  // Fire-and-forget: no await, no throw. El chat NO depende de esto.
  fetch(`${base}/log-conversation`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal,
    keepalive: true, // sobrevive si el usuario navega justo después
  })
    .catch((err) => {
      // Silencioso por diseño: la captura jamás degrada la UX.
      if (import.meta.env?.DEV) {
        console.debug('[conversationCapture] envío falló (ignorado):', err?.name || err);
      }
    })
    .finally(() => clearTimeout(timer));
}
