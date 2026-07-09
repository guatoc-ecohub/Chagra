/**
 * stress/lib/mockFetch.mjs — backend sintético para DRY_RUN=1.
 *
 * Objetivo: poder ejecutar los 5 scripts de stress de punta a punta (pool de
 * concurrencia, timers, percentiles, reporte, umbrales) SIN tocar red real
 * — ni sidecar, ni ollama, ni AGE — para validar sintaxis/imports/lógica
 * antes de apuntarlos a un host de verdad. Es la forma en que este set se
 * "prueba a sí mismo" sin arriesgar alpha/prod.
 *
 * El mock es STATEFUL: cuenta requests en vuelo (`inFlight`) y, por encima
 * de `saturationThreshold`, sube la probabilidad de 503 y la latencia — así
 * el reporte de un dry-run ya muestra una curva de saturación creíble
 * (útil para confirmar que el script DETECTA saturación, no solo que corre).
 *
 * Respeta `AbortSignal` (timeout real de cada script) lanzando un error con
 * `name: 'AbortError'`, igual que el `fetch` nativo — así el código que
 * distingue timeout de otros errores se ejercita igual en dry-run que en
 * producción.
 *
 * @module stress/lib/mockFetch
 */
import { sleep } from './pool.mjs';

/**
 * @param {object} [opts]
 * @param {number} [opts.minLatencyMs=60]
 * @param {number} [opts.maxLatencyMs=350]
 * @param {number} [opts.saturationThreshold=6] — inFlight por encima del cual sube 503/latencia.
 * @param {number} [opts.base503Prob=0.01]
 * @param {number} [opts.saturated503Prob=0.55]
 * @param {number} [opts.networkErrorProb=0.01]
 * @returns {typeof fetch} función compatible con `fetch(url, init)`.
 */
export function makeMockFetch({
  minLatencyMs = 60,
  maxLatencyMs = 350,
  saturationThreshold = 6,
  base503Prob = 0.01,
  saturated503Prob = 0.55,
  networkErrorProb = 0.01,
} = {}) {
  let inFlight = 0;

  return async function mockFetch(url, init = {}) {
    inFlight += 1;
    try {
      const over = Math.max(0, inFlight - saturationThreshold);
      const jitter = minLatencyMs + Math.random() * (maxLatencyMs - minLatencyMs);
      const latency = jitter + over * 25; // degradación bajo contención simulada

      await abortableSleep(latency, init.signal);

      if (Math.random() < networkErrorProb) {
        throw new Error('mock: ECONNREFUSED (dry-run network error simulado)');
      }

      const p503 = over > 0 ? saturated503Prob : base503Prob;
      const status = Math.random() < p503 ? 503 : 200;
      const body = buildMockBody(String(url), init);

      return {
        ok: status >= 200 && status < 300,
        status,
        async json() {
          return body;
        },
        async text() {
          return JSON.stringify(body);
        },
      };
    } finally {
      inFlight -= 1;
    }
  };
}

/** abortableSleep — como sleep(), pero rechaza con AbortError si `signal` se dispara antes. */
function abortableSleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(makeAbortError());
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(makeAbortError());
      },
      { once: true },
    );
  });
}

function makeAbortError() {
  const err = new Error('The operation was aborted (dry-run)');
  err.name = 'AbortError';
  return err;
}

/** buildMockBody — shape de respuesta según el endpoint pegado en la URL. */
function buildMockBody(url) {
  if (url.includes('/healthz')) {
    return { status: 'ok', build_sha: 'dryrun0000', uptime_s: 3600 };
  }
  if (url.includes('/nlu')) {
    const useTool = Math.random() < 0.4;
    return {
      use_tool: useTool,
      tool: useTool ? 'get_species' : null,
      args: useTool ? { query: 'cafe' } : null,
      tool_chain: null,
      latency_ms: 80 + Math.random() * 120,
      model_used: 'qwen3.5:4b (mock)',
      heuristic_skipped: false,
      reason: 'dry-run mock',
      error: null,
    };
  }
  if (url.includes('/resolve-entities')) {
    return {
      entities: [
        {
          mentioned: 'cafe',
          kind: 'species',
          canonical_id: 'coffea-arabica',
          nombre_comun: 'Café',
          nombre_cientifico: 'Coffea arabica',
          confidence: 0.9,
        },
      ],
      grounding: {
        semaphore: 'verde',
        policy: 'answer',
        reason: 'dry-run mock',
        resolved_entities: 1,
        min_confidence: 0.9,
        provenance: [],
        block: '',
      },
      age_available: true,
    };
  }
  if (url.includes('/post-validate')) {
    return { hallucinated: [], detected_count: 0, age_available: true };
  }
  if (url.includes('/fermento-prefilter') || url.includes('/biopreparado-grounding') || url.includes('/piso-termico-guard')) {
    return { is_fermento_intent: false, veto_total: false, system_prompt_block: '', reason: 'dry-run mock' };
  }
  if (url.includes('/tools/')) {
    return { found: true, mock: true, source: 'dry-run' };
  }
  if (url.includes('/api/chat')) {
    return { message: { content: 'respuesta simulada (dry-run)' }, done: true };
  }
  if (url.includes('/api/generate')) {
    return { response: 'respuesta simulada (dry-run)', done: true };
  }
  if (url.includes('/api/tags')) {
    return { models: [{ name: 'granite3.3:8b' }, { name: 'qwen3.5:4b' }] };
  }
  return { mock: true };
}
