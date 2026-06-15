/**
 * gpuTelemetryService.js — Snapshot de GPU/Ollama process state (v13 2026-05-17).
 *
 * Consulta `/api/ollama/api/ps` (proxy → http://localhost:11434/api/ps) para
 * obtener modelos cargados, tamaño en VRAM y processor (gpu/cpu) usado por
 * cada uno. Alimenta el Eco-Oracle Dashboard sección GPU.
 *
 * Cache: 5s — un solo poll alimenta a múltiples consumidores en la misma
 * ventana de render. Sin polling automático: el screen llama al refresh
 * explícito por botón o tras un call LLM.
 *
 * Privacy: solo modelo y bytes VRAM. NO digests, NO usuarios, NO prompts.
 *
 * Response shape Ollama `/api/ps`:
 *   { models: [{ name, model, size, size_vram, expires_at, details: {...} }] }
 */

const BYTES_PER_MB = 1024 * 1024;

const OLLAMA_PS_URL = '/api/ollama/api/ps';
const CACHE_TTL_MS = 5000;
const FETCH_TIMEOUT_MS = 3000;

let cache = null; // { ts, snapshot }

const fetchWithTimeout = async (url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Convierte un model entry Ollama a una fila legible.
 */
const normalizeModel = (m) => {
  const size = Number(m?.size) || 0;
  const sizeVram = Number(m?.size_vram) || 0;
  let processor = 'cpu';
  let gpuShare = 0;
  if (sizeVram > 0 && size > 0) {
    gpuShare = sizeVram / size;
    processor = gpuShare >= 0.99 ? 'gpu' : (gpuShare > 0 ? 'partial' : 'cpu');
  }
  return {
    name: m?.name || m?.model || 'unknown',
    sizeMB: Math.round(size / BYTES_PER_MB),
    vramMB: Math.round(sizeVram / BYTES_PER_MB),
    processor,
    gpuShare: Math.round(gpuShare * 100) / 100,
    expiresAt: m?.expires_at || null,
    details: {
      family: m?.details?.family || null,
      parameterSize: m?.details?.parameter_size || null,
      quantization: m?.details?.quantization_level || null,
    },
  };
};

/**
 * Devuelve snapshot {ts, available, models[]}. Si Ollama está down,
 * retorna {ts, available:false, error}. NUNCA throw.
 *
 * @param {Object} [opts]
 * @param {boolean} [opts.force] - ignora cache 5s
 */
export const getGpuSnapshot = async (opts = {}) => {
  const now = Date.now();
  if (!opts.force && cache && (now - cache.ts) < CACHE_TTL_MS) {
    return cache.snapshot;
  }

  try {
    const response = await fetchWithTimeout(OLLAMA_PS_URL, { method: 'GET' });
    if (!response.ok) {
      const snapshot = {
        ts: new Date().toISOString(),
        available: false,
        error: `HTTP ${response.status} ${response.statusText}`,
        models: [],
        totalVramMB: 0,
      };
      cache = { ts: now, snapshot };
      return snapshot;
    }
    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models.map(normalizeModel) : [];
    const totalVramMB = models.reduce((sum, m) => sum + (m.vramMB || 0), 0);
    const snapshot = {
      ts: new Date().toISOString(),
      available: true,
      models,
      totalVramMB,
      hasGpu: models.some((m) => m.processor === 'gpu' || m.processor === 'partial'),
    };
    cache = { ts: now, snapshot };
    return snapshot;
  } catch (err) {
    const snapshot = {
      ts: new Date().toISOString(),
      available: false,
      error: err?.name === 'AbortError' ? 'timeout' : (err?.message || 'network'),
      models: [],
      totalVramMB: 0,
    };
    cache = { ts: now, snapshot };
    return snapshot;
  }
};

/**
 * Lista de modelos disponibles (no necesariamente cargados) via `/api/tags`.
 * Útil para mostrar catálogo en Oracle.
 */
export const listAvailableModels = async () => {
  try {
    const response = await fetchWithTimeout('/api/ollama/api/tags', { method: 'GET' });
    if (!response.ok) return { available: false, models: [] };
    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models.map((m) => ({
      name: m?.name,
      sizeMB: Math.round((m?.size || 0) / BYTES_PER_MB),
      family: m?.details?.family || null,
      parameterSize: m?.details?.parameter_size || null,
      quantization: m?.details?.quantization_level || null,
    })) : [];
    return { available: true, models };
  } catch (_) {
    return { available: false, models: [] };
  }
};

export const clearGpuCache = () => { cache = null; };
