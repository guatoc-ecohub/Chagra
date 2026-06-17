/**
 * networkRetry.js — fetch con reintento y backoff exponencial.
 *
 * Tarea 77: solo GET requests (POST mutations pasan por la cola existente
 * en agentRequestQueue). Backoff: 1s, 2s, 4s con maximo 3 reintentos.
 *
 * Patron consistente con agentRequestQueue y deepResearchClient.
 */

const BACKOFF_MS = [1000, 2000, 4000];
const MAX_RETRIES = 3;

/**
 * @param {string} url
 * @param {RequestInit & { retries?: number }} [options]
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const maxRetries = options.retries ?? MAX_RETRIES;

  if (method !== 'GET') {
    return fetch(url, options);
  }

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.ok || response.status < 500) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);

      if (attempt < maxRetries) {
        const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
        await sleep(delay);
      }
    } catch (err) {
      lastError = err;

      if (attempt < maxRetries) {
        const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
