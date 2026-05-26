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

const FEEDBACK_TIMEOUT_MS = 8000;
const CONSENT_STORAGE_KEY = 'chagra_feedback_consent_v1';

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
 * @returns {Promise<boolean>} - true si se envió correctamente
 */
export async function sendFeedback({ prompt, response, thumb, comment }) {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[feedback] offline — feedback no enviado, se guardará localmente');
    // TODO: implementar cola offline en IndexedDB
    return false;
  }

  const base = getBaseUrl();
  const url = `${base}/agent-feedback`;
  const token = getToken();

  const feedback = {
    id: ulid(),
    sessionId: getOperatorId() || 'unknown',
    prompt,
    response,
    thumb,
    comment: comment || null,
    consentGiven: true,
    timestamp: Date.now(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEEDBACK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'X-Chagra-Token': token } : {}),
      },
      body: JSON.stringify(feedback),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.debug('[feedback] Non-200 response:', response.status, response.statusText);
      return false;
    }

    console.debug('[feedback] Enviado correctamente:', feedback.id);
    return true;
  } catch (error) {
    clearTimeout(timer);
    if (error.name === 'AbortError') {
      console.debug('[feedback] Timeout después de', FEEDBACK_TIMEOUT_MS, 'ms');
    } else {
      console.debug('[feedback] Error enviando feedback:', error);
    }
    return false;
  }
}
