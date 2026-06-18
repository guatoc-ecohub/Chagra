/**
 * deepResearchClient.js — Cliente HTTP del endpoint Deep Research del sidecar.
 *
 * El sidecar expone:
 *   POST /deep-research        → 202 { job_id }
 *   GET  /deep-research/:jobId → { status: 'running'|'done', steps[], report, citations[], timings }
 *
 * Feature flag: `VITE_DEEP_RESEARCH_ENABLED` (default false).
 * En pre-prod se activa con VITE_DEEP_RESEARCH_ENABLED=true.
 * En prod-free queda off por defecto — Deep Research es pro-only y pesado.
 * El gating de tier (free|pro) se aplica en la UI (ChipsToolbar) y en el
 * header `x-chagra-tier` enviado al sidecar (ver tierService.js A1).
 *
 * Reglas operativas (idénticas al sidecarClient existente):
 *   - Offline-first: si !navigator.onLine → null inmediato.
 *   - Timeout: submit 15s, poll 10s.
 *   - Falla silenciosa: catch → null, el caller decide el UX.
 *   - Auth: header X-Chagra-Token igual que el sidecarClient.
 *   - Sin dependencias: fetch puro + AbortController.
 *
 * Polling:
 *   `pollDeepResearch(jobId, onUpdate, signal)` hace GET con backoff
 *   exponencial (1s→2s→4s→8s cap) hasta status=done o señal de abort.
 *   `onUpdate` recibe (steps: string[], status: string) en cada tick
 *   donde hay pasos nuevos o el status cambió.
 *
 * Español colombiano (tú/usted), nunca voseo argentino.
 *
 * Tier gating (A1): x-chagra-tier se inyecta en todos los requests vía
 * `buildSidecarHeaders` (tierService). La allowlist Pro vive en tierService.js.
 * El gating duro es server-side; este header es defense-in-depth cliente.
 */

import { fetchWithAuthRetry } from './apiService.js';
import { buildSidecarHeaders } from './tierService.js';

const SUBMIT_TIMEOUT_MS = 15000;
const POLL_TIMEOUT_MS = 10000;

// Backoff exponencial para polling: 1s→2s→4s→8s (cap). Aislado para tests.
export const BACKOFF_STEPS_MS = [1000, 2000, 4000, 8000, 8000];

/**
 * Lee la flag `VITE_DEEP_RESEARCH_ENABLED`. Acepta 'true'/'1' como activado.
 * Exportado para que el caller pueda desactivar la UI sin llamar las funciones.
 *
 * @returns {boolean}
 */
export function isDeepResearchEnabled() {
  try {
    const raw = import.meta.env?.VITE_DEEP_RESEARCH_ENABLED;
    if (raw === true) return true;
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      return v === 'true' || v === '1';
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
  return '/api/mcp/agro';
}

function getToken() {
  try {
    const raw = import.meta.env?.VITE_CHAGRA_MCP_TOKEN;
    return typeof raw === 'string' ? raw : '';
  } catch (_) {
    return '';
  }
}

function makeHeaders() {
  // buildSidecarHeaders agrega Content-Type + X-Chagra-Token + x-chagra-tier.
  // El tier se resuelve del tenantId activo (defense-in-depth; gating duro es server-side).
  return buildSidecarHeaders(getToken());
}

/**
 * Envía la pregunta al endpoint POST /deep-research.
 *
 * @param {string} query — pregunta del usuario
 * @returns {Promise<null | { job_id: string }>}
 *   null si: flag off, offline, timeout, non-2xx, body inválido.
 */
export async function submitDeepResearch(query) {
  if (!isDeepResearchEnabled()) return null;
  if (!query || typeof query !== 'string' || !query.trim()) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[deep-research] offline — skip submit');
    return null;
  }

  const base = getBaseUrl();
  const url = `${base}/deep-research`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

  const t0 = Date.now();
  try {
    const res = await fetchWithAuthRetry(url, {
      method: 'POST',
      headers: makeHeaders(),
      body: JSON.stringify({ query: query.trim() }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.debug('[deep-research] submit non-2xx', { status: res.status });
      return null;
    }
    const json = await res.json();
    const latency = Date.now() - t0;
    console.debug('[deep-research] submit ok', { job_id: json?.job_id, latency_ms: latency });
    if (!json || typeof json.job_id !== 'string') return null;
    return { job_id: json.job_id };
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown');
    console.debug('[deep-research] submit fail', { reason });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Lee el estado actual de un job (GET /deep-research/:jobId).
 *
 * @param {string} jobId
 * @param {AbortSignal} [signal]
 * @returns {Promise<null | DeepResearchStatus>}
 *
 * @typedef {Object} DeepResearchStatus
 * @property {'running'|'done'|'error'} status
 * @property {string[]} steps   — sub-preguntas investigadas hasta ahora
 * @property {string}   report  — informe acumulado (vacío si running)
 * @property {Citation[]} citations
 * @property {object}   timings — métricas opcionales del sidecar
 *
 * @typedef {Object} Citation
 * @property {string} source_id
 * @property {string} [label]
 * @property {string} [url]
 */
export async function fetchDeepResearchStatus(jobId, signal) {
  if (!isDeepResearchEnabled()) return null;
  if (!jobId || typeof jobId !== 'string') return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    console.debug('[deep-research] offline — skip poll');
    return null;
  }

  const base = getBaseUrl();
  const url = `${base}/deep-research/${encodeURIComponent(jobId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POLL_TIMEOUT_MS);

  // Conectar señal externa para cancel-on-demand
  let externalAbortListener;
  if (signal) {
    externalAbortListener = () => controller.abort();
    signal.addEventListener('abort', externalAbortListener, { once: true });
  }

  // Incluir x-chagra-tier en el poll también — el sidecar puede aplicar
  // rate limits o degradar features Pro según el header.
  const headers = buildSidecarHeaders(getToken());

  try {
    const res = await fetchWithAuthRetry(url, { method: 'GET', headers, signal: controller.signal });
    if (!res.ok) {
      console.debug('[deep-research] poll non-2xx', { jobId, status: res.status });
      return null;
    }
    const json = await res.json();
    if (!json || typeof json !== 'object') return null;
    return normalizeStatus(json);
  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout/cancelled' : (err?.message || 'unknown');
    console.debug('[deep-research] poll fail', { jobId, reason });
    return null;
  } finally {
    clearTimeout(timer);
    if (signal && externalAbortListener) {
      signal.removeEventListener('abort', externalAbortListener);
    }
  }
}

/**
 * Normaliza el body del sidecar a una forma canónica y defensiva.
 * No falla si algún campo falta — degrada con valores vacíos seguros.
 * @param {object} raw
 * @returns {DeepResearchStatus}
 */
export function normalizeStatus(raw) {
  const validStatuses = new Set(['running', 'done', 'error']);
  const status = validStatuses.has(raw.status) ? raw.status : 'running';
  const steps = Array.isArray(raw.steps)
    ? raw.steps.filter((s) => typeof s === 'string' && s.trim().length > 0)
    : [];
  const report = typeof raw.report === 'string' ? raw.report : '';
  const citations = Array.isArray(raw.citations)
    ? raw.citations.filter((c) => c && typeof c === 'object')
    : [];
  const timings = (raw.timings && typeof raw.timings === 'object') ? raw.timings : {};
  return { status, steps, report, citations, timings };
}

/**
 * Polling loop completo con backoff exponencial.
 * Llama `fetchDeepResearchStatus` hasta status=done o signal abortado.
 *
 * @param {string} jobId
 * @param {function(steps: string[], status: string): void} onUpdate
 *   Callback en cada tick con pasos nuevos o cambio de status.
 * @param {AbortSignal} [signal] — para cancelar el loop desde fuera.
 * @returns {Promise<DeepResearchStatus | null>}
 *   Resuelve con el estado final (done/error), o null si cancelado.
 */
export async function pollDeepResearch(jobId, onUpdate, signal) {
  if (!jobId) return null;
  let attempt = 0;
  let lastStepCount = 0;

  while (true) {
    if (signal?.aborted) return null;

    const result = await fetchDeepResearchStatus(jobId, signal);

    if (signal?.aborted) return null;

    if (result) {
      if (result.steps.length > lastStepCount || result.status === 'done' || result.status === 'error') {
        lastStepCount = result.steps.length;
        if (typeof onUpdate === 'function') {
          onUpdate(result.steps, result.status);
        }
      }
      if (result.status === 'done' || result.status === 'error') {
        return result;
      }
    }

    // Esperar con backoff antes del siguiente poll
    const delay = BACKOFF_STEPS_MS[Math.min(attempt, BACKOFF_STEPS_MS.length - 1)];
    attempt++;
    await new Promise((resolve, reject) => {
      const t = setTimeout(resolve, delay);
      if (signal) {
        const onAbort = () => {
          clearTimeout(t);
          reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }).catch(() => null); // abort durante sleep → el while-guard lo captura
  }
}
