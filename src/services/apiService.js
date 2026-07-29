/**
 * apiService — Cliente HTTP para la API JSON:API de FarmOS.
 * Gestiona autenticación OAuth, timeouts, y sanitización de errores.
 *
 * @module apiService
 * @requires authService
 */

import { expireSession, getAccessToken, refreshAccessToken } from './authService';
import { getActiveTenantId } from './tenantContext';

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
    const response = await globalThis.fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

const AUTH_RETRY_STATUSES = new Set([401, 403]);

const withAuthorization = (headersInit, token) => {
  if (headersInit instanceof Headers) {
    const headers = new Headers(headersInit);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  if (Array.isArray(headersInit)) {
    const headers = new Headers(headersInit);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  return {
    ...(headersInit || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/**
 * Fetch autenticado reusable para proxies que aceptan el Bearer de farmOS
 * (sidecar MCP, Ollama detras de nginx, y otros endpoints internos).
 *
 * Mantiene el contrato nativo de fetch: devuelve Response y no parsea body.
 * Ante 401/403 intenta renovar el access token una sola vez y reintenta la
 * misma request con el Bearer nuevo. Si no hay token local, preserva el fetch
 * original sin Authorization para no romper endpoints publicos.
 *
 * @param {RequestInfo|URL} resource
 * @param {RequestInit} [options]
 * @param {boolean} [_retried]
 * @returns {Promise<Response>}
 */
export const fetchWithAuthRetry = async (resource, options = {}, _retried = false) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new TypeError('Offline');
  }

  const token = await getAccessToken();
  const headers = withAuthorization(options.headers, token);

  const response = await globalThis.fetch(resource, { ...options, headers });

  if (!AUTH_RETRY_STATUSES.has(response.status) || _retried) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    if (token) {
      await expireSession({ status: response.status, resource: String(resource) });
    }
    return response;
  }

  const retryHeaders = withAuthorization(options.headers, refreshed);
  console.info(`[API] ${response.status} -> token renovado, reintentando ${resource}.`);
  return globalThis.fetch(resource, { ...options, headers: retryHeaders });
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
 * a los nombres canónicos FarmOS 4.x en sprint post-demo-institucional.
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

/**
 * ADR-036 MVP multi-finca — inyecta `filter[uid.name]=<tenantId>` en GET a
 * /api/asset/* y /api/log/* cuando hay un tenant activo y la URL aún no trae
 * un filtro de owner. Defense-in-depth cliente-side: si el backend ya restringe
 * por OAuth scope esto es redundante; si NO, evita IDOR latente cuando dos
 * pilotos comparten backend.
 *
 * Reglas:
 *  - Solo aplica a /api/asset/* (sin sub-id, ej /api/asset/plant) y /api/log/*.
 *    Para GET por id (/api/asset/plant/<uuid>) NO inyectamos — farmOS valida
 *    por id directo y romper acceso a un id propio sería peor que dejar pasar.
 *  - Solo en URLs sin filter[uid|owner] ya presente — respetar callers que
 *    fijan filtros explícitos (assetService.findPersonByName usa filter[name]).
 *  - Si no hay tenant activo (pre-login, dev sin login), no se toca la URL —
 *    preserva el comportamiento single-tenant histórico.
 *
 * Limitación conocida: farmOS expone `uid` (autor del asset) en asset--*; si
 * el operador hereda assets creados por otro usuario, este filtro los
 * ocultaría. Aceptable en MVP — los pilotos arrancan con bases vacías.
 *
 * TODO(multifinca-backend): cuando did:key + UCAN estén en farmOS (ADR-036
 * sub-i + sub-iv), sustituir `filter[uid.name]` por validación UCAN cap +
 * `filter[finca_did]` en assets y dejar este shim como deprecated.
 */
const injectTenantFilter = (endpoint, method) => {
  if (method && method !== 'GET') return endpoint;
  const tenantId = getActiveTenantId();
  if (!tenantId) return endpoint;

  // Solo bundles de asset/log de lista (no por id concreto).
  const listLikeMatch = endpoint.match(/^\/api\/(asset|log)\/[a-z_]+(?:\?|$)/);
  if (!listLikeMatch) return endpoint;
  // Excluir GET por id: /api/asset/plant/<uuid>
  const afterBundle = endpoint.slice(listLikeMatch[0].length - (listLikeMatch[0].endsWith('?') ? 1 : 0));
  if (afterBundle && afterBundle.startsWith('/')) return endpoint;

  // No pisar filtros pre-existentes de owner/uid (ej. callers que ya saben).
  if (/[?&]filter\[(uid|owner)/.test(endpoint)) return endpoint;

  const sep = endpoint.includes('?') ? '&' : '?';
  // farmOS JSON:API: filter[uid.name]=<username> matchea el autor del asset.
  // Encode para usernames con caracteres no-ASCII.
  return `${endpoint}${sep}filter[uid.name]=${encodeURIComponent(tenantId)}`;
};

// Endpoints que NO existen en FarmOS 4.x — devolver respuesta vacía graceful
// en lugar de 404 que confunde al operador con error rojo en consola.
const FARMOS_BUNDLE_GONE = [
  '/api/asset/person',  // FarmOS 4.x no tiene asset/person; users = /user
];

const isGoneBundle = (endpoint) =>
  FARMOS_BUNDLE_GONE.some((prefix) => endpoint.startsWith(prefix));

export const fetchFromFarmOS = async (endpoint, options = {}, _retried = false) => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    console.info(`[DEMO] blocked FarmOS call to ${endpoint}`);
    return {};
  }

  // Bundles inexistentes en FarmOS 4.x — graceful empty respuesta.
  if (isGoneBundle(endpoint)) {
    console.info(`[API] Bundle obsoleto en FarmOS 4.x ignorado: ${endpoint}`);
    return { data: [], jsonapi: { version: '1.0' } };
  }

  // Mapping de bundles renombrados FarmOS 3.x → 4.x.
  const mappedEndpoint = remapLegacyBundleUrl(endpoint);
  // ADR-036 MVP multi-finca: scoping cliente-side por owner (uid.name).
  const scopedEndpoint = injectTenantFilter(mappedEndpoint, options.method || 'GET');

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
    const response = await fetchWithTimeout(`${baseUrl}${scopedEndpoint}`, {
      ...options,
      method: options.method || 'GET',
      body: outgoingBody,
      headers
    });

    if (!response.ok) {
      // Interceptor de auth (401/403): el access token fue rechazado por el
      // servidor (vencido server-side o revocado) aunque el cliente lo creía
      // vigente. ANTES de mandar al operador a #login (la "sesión zombi": home
      // sin datos + "Tu sesión expiró"), intentar UNA renovación silenciosa con
      // el refresh_token y reintentar la misma petición. Solo si la renovación
      // no da token nuevo redirigimos a login. `_retried` evita bucles.
      if ((response.status === 401 || response.status === 403) && !_retried) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          console.info(`[API] ${response.status} → token renovado, reintentando ${endpoint}.`);
          return fetchFromFarmOS(endpoint, options, true);
        }
      }
      if (response.status === 401 || response.status === 403) {
        console.error(`[API] Auth error ${response.status}. Sesión vencida → re-login.`);
        // Estado de sesión CLARO (no zombi): el token fue rechazado y la
        // renovación no dio uno nuevo → la sesión está realmente muerta.
        // ANTES sólo se hacía `window.location.hash = '#login'`, pero el router
        // de App (HASH_VIEW_ROUTES) NO tiene ruta 'login' → el hash se ignoraba
        // y el usuario quedaba en el dashboard SIN datos: los contadores en 0
        // disparaban el OnboardingHero "¿dónde está su finca?" — engañoso, hace
        // creer que perdió su finca cuando sólo venció el token (prod-down
        // 2026-06-18). Ahora despachamos un evento que App escucha para navegar
        // a la pantalla de login ("Sesión vencida — vuelve a entrar"), y se
        // hace logout limpio para no reintentar con el token muerto. El hash se
        // mantiene como señal secundaria por compatibilidad.
        await expireSession({ status: response.status, endpoint });
      }
      const errorDetail = await response.text().catch(() => '');
      // Sanitize body antes de pegarlo al .message — Drupal/cloudflared a
      // veces devuelven HTML completo (página 404/502) que bloatea el toast
      // del operador (bug 2026-05-08).
      const { buildCleanErrorMessage } = await import('./sanitizeError.js');
      const ctype = response.headers?.get?.('content-type') || '';
      const cleanMsg = buildCleanErrorMessage('FarmOS API Error', response.status, response.statusText, errorDetail, ctype);
      const error = new Error(cleanMsg);
      /** @type {any} */ (error).status = response.status;
      /** @type {any} */ (error).detail = errorDetail;  // raw preservado para debug en console
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

/**
 * Sube un binario (foto/evidencia) a FarmOS por el flujo NATIVO de
 * Drupal 10 JSON:API — "file upload por campo":
 *
 *   POST /api/{entity}/{bundle}/{field}
 *   Content-Type: application/octet-stream
 *   Content-Disposition: file; filename="nombre.jpg"
 *
 * Crea un `file--file` NUEVO (sin adjuntar) y devuelve la respuesta JSON:API
 * con su UUID en `data.id`.
 *
 * BUG HISTÓRICO (2026-07-08, "la foto de perfil no sube a farmOS"): el código
 * usaba `POST /api/file/upload` con FormData — una ruta que NO EXISTE en
 * farmOS 4.x / Drupal 10 (verificado en vivo: 404). Drupal solo expone la
 * subida de archivos por campo de entidad (`/api/log/observation/file` → 403
 * sin auth = la ruta sí existe). Como el caller tragaba el error con un
 * `console.warn` "no bloqueante", la subida fallaba en silencio desde siempre.
 *
 * ⚠️ IMPORTANTE (durabilidad): el file creado queda TEMPORAL (status 0) hasta
 * que alguna entidad lo referencie; el cron de Drupal borra los temporales
 * (~6 h). El caller DEBE adjuntarlo (POST/PATCH con relationships) para que
 * sobreviva — ver uploadToFarmOS (operatorPhotoService) y la evidencia de
 * syncManager (Paso B ya lo hacía).
 *
 * @param {Blob} blob - binario a subir
 * @param {string} filename - nombre del archivo (se sanea para el header)
 * @param {{entity?: string, bundle?: string, field?: string}} [target]
 *   Entidad/bundle/campo destino. Default: log observation, campo `file`.
 * @returns {Promise<Object>} respuesta JSON:API (`data.id` = UUID del file--file)
 * @throws {Error} si el servidor responde no-2xx / red caída (mismo contrato
 *   que fetchFromFarmOS; el caller decide si es fatal)
 */
export const uploadBinaryToFarmOS = async (blob, filename, target = {}) => {
  const { entity = 'log', bundle = 'observation', field = 'file' } = target;
  // Sanear el filename para el header (sin comillas ni saltos de línea).
  const safeName = String(filename || 'archivo.jpg').replace(/["\r\n]/g, '');
  return await fetchFromFarmOS(`/api/${entity}/${bundle}/${field}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `file; filename="${safeName}"`,
    },
    body: blob,
  });
};
