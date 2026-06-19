/**
 * feedbackService.js — Servicio para enviar feedback del agente al sidecar.
 *
 * Implementa el endpoint POST /agent-feedback del sidecar chagra-pro.
 *
 * Schema de feedback:
 * {
 *   id: string,           // ULID único
 *   sessionId: string,    // ID de sesión del operador
 *   prompt: string,       // Pregunta del usuario
 *   response: string,     // Respuesta del agente
 *   thumb: 'up' | 'down', // 👍 o 👎
 *   comment?: string,     // Comentario opcional (solo para 👎)
 *   edges: Array<{        // A-15 (#248): aristas del grafo AGE usadas en el
 *     species_id: string, //   turno (café→guamo COMPATIBLE_WITH, etc.). El
 *     edge_type: string,  //   motor E3 del sidecar las mapea a r.confidence.
 *     target_id: string,  //   [] si el turno no tocó relaciones del grafo
 *   }>,                   //   (sin regresión / back-compat).
 *   consentGiven: true,   // Siempre true si se envía
 *   timestamp: number     // Unix timestamp
 * }
 *
 * Reglas operativas:
 * - Offline-first: si offline → guarda en IndexedDB para envío diferido
 * - Timeout: 8s (feedback no bloquea UX del operador)
 * - Auth: header X-Chagra-Token (igual que sidecarClient)
 * - Falla silenciosa: en error → console.debug, no throw
 */

import { ulid } from 'ulid';
import { fetchWithAuthRetry } from './apiService.js';

const FEEDBACK_TIMEOUT_MS = 8000;
const CONSENT_STORAGE_KEY = 'chagra_feedback_consent_v1';
const QUEUE_STORAGE_KEY = 'chagra_feedback_queue_v1';
const QUEUE_MAX = 50; // cota: el feedback es chico, pero no crece sin límite
const EDGES_MAX = 50; // A-15 (#248): cota de edges por feedback (evita payload inflado)

/**
 * Obtiene el operatorId desde localStorage o genera uno temporal.
 * Usado para el sessionId del feedback.
 */
function getOperatorId() {
  try {
    // Intentar leer desde localStorage (donde usePrefsStore lo guarda)
    const prefs = localStorage.getItem('chagra-prefs');
    if (prefs) {
      const parsed = JSON.parse(prefs);
      if (parsed.operatorId) {
        return parsed.operatorId;
      }
    }
  } catch (_) {
    // ignore
  }
  return 'unknown-operator';
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

/**
 * Verifica si el usuario ya dio consentimiento.
 * @returns {boolean}
 */
export function hasConsent() {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === 'true') return true;
    return false;
  } catch (_) {
    return false;
  }
}

/**
 * Guarda el consentimiento del usuario.
 * @param {boolean} consent
 */
export function saveConsent(consent) {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, consent ? 'true' : 'false');
  } catch (e) {
    console.debug('[feedback] Error saving consent:', e);
  }
}

/**
 * Envía feedback al endpoint /agent-feedback del sidecar.
 *
 * @param {Object} params
 * @param {string} params.prompt - Pregunta del usuario
 * @param {string} params.response - Respuesta del agente
 * @param {'up' | 'down'} params.thumb - 👍 o 👎
 * @param {string} [params.comment] - Comentario opcional (solo para thumb down)
 * @param {Array<{species_id: string, edge_type: string, target_id: string}>} [params.edges]
 *        - A-15 (#248): aristas del grafo AGE usadas en el turno (default []).
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
/**
 * Sanitiza el array de edges que viene del UI a la forma canónica que el
 * motor E3 espera: solo objetos `{species_id, edge_type, target_id}` con los
 * tres campos string no vacíos. Deduplica y cota a EDGES_MAX. Defensivo:
 * cualquier input no-array o entrada malformada → se ignora (devuelve []).
 */
function sanitizeEdges(edges) {
  if (!Array.isArray(edges)) return [];
  const seen = new Set();
  const out = [];
  for (const e of edges) {
    if (!e || typeof e !== 'object') continue;
    const { species_id, edge_type, target_id } = e;
    if (
      typeof species_id !== 'string' || !species_id ||
      typeof edge_type !== 'string' || !edge_type ||
      typeof target_id !== 'string' || !target_id
    ) continue;
    const k = `${species_id}|${edge_type}|${target_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ species_id, edge_type, target_id });
    if (out.length >= EDGES_MAX) break;
  }
  return out;
}

/** Construye el objeto de feedback canónico a partir de los params del UI. */
function buildFeedback({ prompt, response, thumb, comment, edges }) {
  return {
    id: ulid(),
    sessionId: getOperatorId() || 'unknown',
    prompt,
    response,
    thumb,
    comment: comment || null,
    edges: sanitizeEdges(edges),
    consentGiven: true,
    timestamp: Date.now(),
  };
}

/** POST de un objeto de feedback ya construido. Devuelve true si el server lo aceptó. */
async function postFeedback(feedback) {
  const url = `${getBaseUrl()}/agent-feedback`;
  const token = getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEEDBACK_TIMEOUT_MS);
  try {
    const res = await fetchWithAuthRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'X-Chagra-Token': token } : {}) },
      body: JSON.stringify(feedback),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.debug('[feedback] Non-200 response:', res.status, res.statusText);
      return false;
    }
    console.debug('[feedback] Enviado correctamente:', feedback.id);
    return true;
  } catch (error) {
    clearTimeout(timer);
    console.debug('[feedback]', error.name === 'AbortError' ? 'Timeout' : 'Error', error.message || error);
    return false;
  }
}

/** Lee la cola offline de feedback desde localStorage. */
export function getQueuedFeedback() {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

/** Encola un feedback para envío diferido (acotado a QUEUE_MAX, conserva los recientes). */
export function queueFeedbackOffline(feedback) {
  try {
    const q = getQueuedFeedback();
    q.push(feedback);
    const bounded = q.slice(-QUEUE_MAX);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(bounded));
  } catch (e) {
    console.debug('[feedback] Error encolando offline:', e);
  }
}

/** Vacía la cola offline (uso interno + tests). */
export function clearFeedbackQueue() {
  try {
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch (_) {
    // ignore
  }
}

/**
 * Reenvía la cola offline cuando vuelve la conexión. Conserva en cola lo que
 * falle (para reintentar). Devuelve cuántos se enviaron con éxito.
 */
export async function flushFeedbackQueue() {
  const q = getQueuedFeedback();
  if (q.length === 0) return 0;
  const pending = [];
  let flushed = 0;
  for (const fb of q) {
    const ok = await postFeedback(fb);
    if (ok) flushed++;
    else pending.push(fb);
  }
  try {
    if (pending.length === 0) localStorage.removeItem(QUEUE_STORAGE_KEY);
    else localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(pending));
  } catch (_) {
    // ignore
  }
  return flushed;
}

export async function sendFeedback({ prompt, response, thumb, comment, edges }) {
  const feedback = buildFeedback({ prompt, response, thumb, comment, edges });

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[feedback] offline — encolado para envío diferido:', feedback.id);
    queueFeedbackOffline(feedback);
    return false;
  }

  return postFeedback(feedback);
}
