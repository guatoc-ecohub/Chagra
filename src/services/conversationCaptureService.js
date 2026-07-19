/**
 * conversationCaptureService.js — Captura server-side de las conversaciones del
 * agente para TODOS los usuarios (task #CHAT-CAPTURE).
 *
 * POR QUÉ EXISTE: hoy el historial del chat es local-only (IndexedDB de cada
 * browser, #120) y el chat va directo a Ollama sin pasar por el sidecar, así que
 * NADA queda guardado central. Para análisis, debugging y mejora del sistema,
 * hay que persistir cada turno (pregunta + respuesta + grounding) en el sidecar.
 * Mirror del patrón de `feedbackService.js` (mismo base URL + token).
 *
 * Endpoint sidecar: POST /log-conversation (chagra-pro, append a JSONL durable).
 *
 * Reglas:
 * - Gated por `VITE_CAPTURE_CONVERSATIONS` (OFF default → privacy-first).
 * - Solo captura si el usuario dio consentimiento (hasConsent() del feedbackService).
 * - Fire-and-forget: NUNCA bloquea ni rompe la UX del chat; falla en silencio.
 * - Opcionalmente anonimiza PII (VITE_CAPTURE_ANONYMIZE=true) → user_name y
 *   finca_nombre se omiten para cumplir Habeas Data (Ley 1581).
 *
 * Schema del evento (1 línea JSONL por turno):
 * {
 *   id, ts,
 *   user_id, user_name,        // identidad del usuario (user_name omitido si anonymize)
 *   finca_slug, finca_nombre,  // finca activa (finca_nombre omitido si anonymize)
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
import { hasConsent } from './feedbackService';
import { fetchWithAuthRetry } from './apiService';

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

/**
 * ¿Se exige consentimiento por-usuario (hasConsent) para capturar?
 * Default TRUE (privacy-first). Puesto en `false` vía VITE_CAPTURE_REQUIRE_CONSENT
 * (build), la captura se aplica a TODOS los usuarios sin el gate de consentimiento
 * in-app — modo PILOTO para auditar el agente con toda la data (los usuarios del
 * piloto deben ser informados fuera de la app; Habeas Data Ley 1581).
 */
export function isConsentRequired() {
  try {
    const raw = import.meta.env?.VITE_CAPTURE_REQUIRE_CONSENT;
    if (raw === false) return false;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      if (v === 'false' || v === '0' || v === 'off') return false;
    }
    return true; // default: exige consentimiento
  } catch (_) {
    return true;
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

/** ¿Anonimizar PII? Gated por VITE_CAPTURE_ANONYMIZE. Exportado para tests. */
export function shouldAnonymizePII() {
  try {
    const raw = import.meta.env?.VITE_CAPTURE_ANONYMIZE;
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

function anonymizeIdentity(identity) {
  if (!shouldAnonymizePII()) return identity;

  return {
    user_id: identity.user_id ?? null,
    user_name: null,
    finca_slug: identity.finca_slug ?? null,
    finca_nombre: null,
  };
}

/**
 * Captura un turno completo (pregunta del usuario + respuesta del agente).
 * Fire-and-forget: devuelve void, no espera, no lanza.
 *
 * Solo captura si:
 * - La flag VITE_CAPTURE_CONVERSATIONS está activada.
 * - El usuario dio consentimiento (hasConsent() del feedbackService).
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
  // Gate de consentimiento: por defecto exigido (privacy-first). En modo PILOTO
  // (VITE_CAPTURE_REQUIRE_CONSENT=false) se captura a todos los usuarios.
  if (isConsentRequired() && !hasConsent()) return;
  // No capturamos turnos vacíos (p. ej. abortados sin respuesta).
  if (!userText && !agentText) return;

  const sanitizedIdentity = anonymizeIdentity(identity);
  const payload = {
    id: ulid(),
    ts: Date.now(),
    user_id: sanitizedIdentity.user_id ?? null,
    user_name: sanitizedIdentity.user_name ?? null,
    finca_slug: sanitizedIdentity.finca_slug ?? null,
    finca_nombre: sanitizedIdentity.finca_nombre ?? null,
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
      eval_rate: typeof meta.eval_rate === 'number' ? meta.eval_rate : null,
      first_token_ms: typeof meta.first_token_ms === 'number' ? meta.first_token_ms : null,
      response_len: typeof meta.response_len === 'number' ? meta.response_len : null,
    };

  const base = getBaseUrl();
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CAPTURE_TIMEOUT_MS);

  // Fire-and-forget: no await, no throw. El chat NO depende de esto.
  fetchWithAuthRetry(`${base}/log-conversation`, {
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
