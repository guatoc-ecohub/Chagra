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

/**
 * Mapping de bundles legacy de FarmOS 3.x → FarmOS 4.x.
 * FarmOS 4.x renombró:
 *   - log/task     → log/activity (los "tasks" se modelan como activities)
 *   - log/planting → log/seeding (los "plantings" se llaman seedings)
 *   - asset/person → NO EXISTE (los users de FarmOS 4.x son `users`, no assets;
 *                    Chagra debe migrar gradualmente a usar /user en su lugar)
 * Aplicado 2026-05-13 tras install fresh FarmOS 4.x en alpha.
 *
 * Este mapping es transición: el cliente sigue usando los nombres viejos
 * internamente (log--task, log--planting) por compatibilidad con código
 * existente; sólo la URL outgoing se traduce. Roadmap: migrar el cliente
 * a los nombres canónicos FarmOS 4.x en sprint post-Diana.
 */
const FARMOS_BUNDLE_RENAMES = [
  { legacy: '/api/log/task',     modern: '/api/log/activity' },
  { legacy: '/api/log/planting', modern: '/api/log/seeding'  },
];

// Mapping bidireccional de `type` field en payloads JSON:API.
// El cliente Chagra usa nombres legacy internamente (log--task, log--planting);
// el servidor FarmOS 4.x usa los modernos (log--activity, log--seeding).
const TYPE_LEGACY_TO_MODERN = {
  'log--task':     'log--activity',
  'log--planting': 'log--seeding',
};
const TYPE_MODERN_TO_LEGACY = {
  'log--activity': 'log--task',
  'log--seeding':  'log--planting',
};

/**
 * Walk recursivo de un objeto/array y aplica el mapping a campos `type` string.
 * NO modifica el input — devuelve copia transformada.
 */
const remapTypes = (node, mapping) => {
  if (Array.isArray(node)) return node.map((x) => remapTypes(x, mapping));
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === 'type' && typeof v === 'string' && mapping[v]) {
        out[k] = mapping[v];
      } else {
        out[k] = remapTypes(v, mapping);
      }
    }
    return out;
  }
  return node;
};

const remapLegacyBundleUrl = (endpoint) => {
  for (const { legacy, modern } of FARMOS_BUNDLE_RENAMES) {
    if (endpoint.startsWith(legacy)) {
      // Substituir solo el prefijo, preservar query string y demás.
      return modern + endpoint.slice(legacy.length);
    }
  }
  return endpoint;
};

// Endpoints que NO existen en FarmOS 4.x — devolver respuesta vacía graceful
// en lugar de 404 que confunde al operador con error rojo en consola.
const FARMOS_BUNDLE_GONE = [
  '/api/asset/person',  // FarmOS 4.x no tiene asset/person; users = /user
];

const isGoneBundle = (endpoint) =>
  FARMOS_BUNDLE_GONE.some((prefix) => endpoint.startsWith(prefix));

export const fetchFromFarmOS = async (endpoint, options = {}) => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    console.log(`[DEMO] blocked FarmOS call to ${endpoint}`);
    return {};
  }

  // Bundles inexistentes en FarmOS 4.x — graceful empty respuesta.
  if (isGoneBundle(endpoint)) {
    console.info(`[API] Bundle obsoleto en FarmOS 4.x ignorado: ${endpoint}`);
    return { data: [], jsonapi: { version: '1.0' } };
  }

  // Mapping de bundles renombrados FarmOS 3.x → 4.x.
  const mappedEndpoint = remapLegacyBundleUrl(endpoint);

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

  // Outgoing: mapear `type: log--task` → `log--activity` etc. en el body
  // JSON antes de enviar al server. NO toca FormData (que usa multipart).
  let outgoingBody = options.body;
  if (!isFormData && typeof outgoingBody === 'string' && outgoingBody.includes('"type"')) {
    try {
      const parsed = JSON.parse(outgoingBody);
      const remapped = remapTypes(parsed, TYPE_LEGACY_TO_MODERN);
      outgoingBody = JSON.stringify(remapped);
    } catch (_) {
      // Body no es JSON parseable — dejar como está.
    }
  }

  try {
    const { useFincaActiveStore } = await import('./fincaActiveStore.js');
    const baseUrl = useFincaActiveStore.getState().getActiveEndpoint();
    const response = await fetchWithTimeout(`${baseUrl}${mappedEndpoint}`, {
      ...options,
      method: options.method || 'GET',
      body: outgoingBody,
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
    // Incoming: mapear `type: log--activity` → `log--task` etc. en la
    // respuesta JSON:API antes de devolver al caller. Mantiene compat
    // con el resto del cliente que sigue esperando nombres legacy.
    const data = await response.json();
    return remapTypes(data, TYPE_MODERN_TO_LEGACY);
  } catch (error) {
    if (error.name === 'AbortError') console.error('[Network] Timeout excedido en solicitud a FarmOS:', endpoint);
    throw error;
  }
};

/**
 * Wrapper sobre fetchFromFarmOS para POST/PUT/PATCH/DELETE.
 *
 * NO captura errores intencionalmente — delega al try/catch interno de
 * fetchFromFarmOS (que ya logea AbortError y propaga el error sanitized).
 * Cualquier caller debe envolver en try/catch para mostrar feedback al operador.
 *
 * @param {string} endpoint - ruta JSON:API ej. '/api/log/activity'
 * @param {Object|FormData|null} payload - cuerpo de la request (null para DELETE)
 * @param {'GET'|'POST'|'PUT'|'PATCH'|'DELETE'} [method='POST']
 * @returns {Promise<Object>} respuesta JSON:API parseada y type-remapped
 * @throws {Error} con .status / .detail si el servidor responde no-2xx
 * @throws {Error} si timeout (AbortError) o red caída
 */
export const sendToFarmOS = async (endpoint, payload, method = 'POST') => {
  const isFormData = payload instanceof FormData;
  const options = { method };

  // Solo adjuntar body si hay payload y no es una operación DELETE
  if (payload && method !== 'DELETE') {
    options.body = isFormData ? payload : JSON.stringify(payload);
  }

  return await fetchFromFarmOS(endpoint, options);
};
