/**
 * apiService — Cliente HTTP para la API JSON:API de FarmOS.
 * Gestiona autenticación OAuth, timeouts, y sanitización de errores.
 *
 * @module apiService
 * @requires authService
 */

import { getAccessToken } from './authService';

/**
 * @typedef {Object} FetchOptions
 * @property {number} [timeout=10000]
 * @property {string} [method='GET']
 * @property {Object.<string,string>} [headers]
 * @property {BodyInit} [body]
 * @property {AbortSignal} [signal]
 */

/**
 * Fetch con timeout configurable.
 * @param {string} resource
 * @param {FetchOptions} options
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = async (resource, options = {}) => {
  const { timeout = 10000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const fetchFromFarmOS = async (endpoint, options = {}) => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    console.log(`[DEMO] blocked FarmOS call to ${endpoint}`);
    return {};
  }

  const token = await getAccessToken();
  if (!token) {
    const isLoginPage = typeof window !== 'undefined' && window.location.hash === '#login';
    if (!isLoginPage) {
      console.warn('[API] Token no disponible. Continuando en modo offline.');
    }
    throw new Error('Token no disponible.');
  }

  const isFormData = options.body instanceof FormData;
  const headers = {
    'Accept': 'application/vnd.api+json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/vnd.api+json';
  } else if (isFormData) {
    delete headers['Content-Type'];
  }

  try {
    const { useFincaActiveStore } = await import('./fincaActiveStore.js');
    const baseUrl = useFincaActiveStore.getState().getActiveEndpoint();
    const response = await fetchWithTimeout(`${baseUrl}${endpoint}`, {
      ...options,
      method: options.method || 'GET',
      headers
    });

    if (!response.ok) {
      // Interceptor: redirigir a login en 401/403 (token expirado o revocado)
      if (response.status === 401 || response.status === 403) {
        console.error(`[API] Auth error ${response.status}. Redirigiendo a login.`);
        if (typeof window !== 'undefined') window.location.hash = '#login';
      }
      const errorDetail = await response.text().catch(() => '');
      // Sanitize body antes de pegarlo al .message — Drupal/cloudflared a
      // veces devuelven HTML completo (página 404/502) que bloatea el toast
      // del operador (bug 2026-05-08).
      const { buildCleanErrorMessage } = await import('./sanitizeError.js');
      const ctype = response.headers?.get?.('content-type') || '';
      const cleanMsg = buildCleanErrorMessage('FarmOS API Error', response.status, response.statusText, errorDetail, ctype);
      const error = new Error(cleanMsg);
      error.status = response.status;
      error.detail = errorDetail;  // raw preservado para debug en console
      throw error;
    }
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') console.error('[Network] Timeout excedido en solicitud a FarmOS:', endpoint);
    throw error;
  }
};

export const sendToFarmOS = async (endpoint, payload, method = 'POST') => {
  const isFormData = payload instanceof FormData;
  const options = { method };

  // Solo adjuntar body si hay payload y no es una operación DELETE
  if (payload && method !== 'DELETE') {
    options.body = isFormData ? payload : JSON.stringify(payload);
  }

  return await fetchFromFarmOS(endpoint, options);
};
