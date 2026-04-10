import { getAccessToken } from './authService';

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
  const token = await getAccessToken();
  if (!token) {
    console.error('[API] Token no disponible. Redirigiendo a login.');
    if (typeof window !== 'undefined') window.location.hash = '#login';
    throw new Error('Token no disponible. Reautentique desde el login.');
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
    const response = await fetchWithTimeout(`${import.meta.env.VITE_FARMOS_URL}${endpoint}`, {
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
      const error = new Error(`FarmOS API Error ${response.status}: ${response.statusText} - ${errorDetail}`);
      error.status = response.status;
      error.detail = errorDetail;
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
