/**
 * bench-sidecar.mjs - helpers COMPARTIDOS de sidecar + GPU + generador para los
 * benches anti-alucinacion (complejos-juez-independiente, capabilities-A-vs-C).
 *
 * REINGENIERIA 2026-06-15: getSidecarToken / gpuTemp / thermalGuard /
 * resolveEntities / postValidate / generate / judgeOllamaCall estaban
 * COPIADOS casi byte-a-byte en 3 benches (borde, complejos, capabilities) - ver
 * BENCH_INVENTORY.md "duplicacion x3". Aca viven UNA sola vez, parametrizados
 * (URLs/token/modelo/timeouts se inyectan; no se leen de globals de modulo), asi
 * son reutilizables y testeables sin red.
 *
 * NOTA: bench-borde-alucinacion.mjs NO se reconecta a este lib a proposito - su
 * contrato (exports + env vars + output) esta SELLADO ("NO ROMPER"). complejos y
 * capabilities, que no tienen ese contrato, si lo usan.
 *
 * @module bench/lib/bench-sidecar (vive en scripts/lib por convencion del repo)
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

export const DEFAULT_SIDECAR_URL = 'http://localhost:7880';
export const DEFAULT_OLLAMA_CHAT_URL = 'http://localhost:11434/api/chat';
export const DEFAULT_OLLAMA_GEN_URL = 'http://localhost:11434/api/generate';
export const DEFAULT_GPU_TEMP_LIMIT = 88;
export const DEFAULT_GPU_TEMP_RESUME = 75;

/** sleep - pausa N ms. */
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * getSidecarToken - lee el token del sidecar (~/.config o env). PURO-ish (FS).
 * @param {object} [env=process.env]
 * @returns {string}
 */
export function getSidecarToken(env = process.env) {
  const tokenPath = `${env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) return readFileSync(tokenPath, 'utf-8').trim();
  return env.SIDECAR_TOKEN || '';
}

/**
 * gpuTemp - temperatura de la GPU via nvidia-smi; null si no disponible.
 * runner inyectable para test.
 * @param {(cmd:string)=>string} [exec]
 * @returns {number|null}
 */
export function gpuTemp(exec) {
  const run =
    exec ||
    ((cmd) => execSync(cmd, { encoding: 'utf-8', timeout: 8000 }));
  try {
    const out = run('nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits');
    const t = parseInt(String(out).trim().split('\n')[0], 10);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

/**
 * thermalGuard - si la GPU esta caliente, espera hasta enfriar. No bloquea si no
 * hay telemetria. Inyectable (tempFn/waitFn) para test.
 * @param {object} [opts]
 * @param {number} [opts.limit=DEFAULT_GPU_TEMP_LIMIT]
 * @param {number} [opts.resume=DEFAULT_GPU_TEMP_RESUME]
 * @param {()=>number|null} [opts.tempFn=gpuTemp]
 * @param {(ms:number)=>Promise<void>} [opts.waitFn=sleep]
 * @param {(msg:string)=>void} [opts.log=console.log]
 * @returns {Promise<void>}
 */
export async function thermalGuard({
  limit = DEFAULT_GPU_TEMP_LIMIT,
  resume = DEFAULT_GPU_TEMP_RESUME,
  tempFn = () => gpuTemp(),
  waitFn = sleep,
  log = console.log,
} = {}) {
  let t = tempFn();
  if (t == null) return;
  while (t >= limit) {
    log(`  [thermal] GPU ${t}C >= ${limit}C - pausando hasta <=${resume}C`);
    await waitFn(30_000);
    t = tempFn();
    if (t == null) return;
    if (t <= resume) break;
  }
}

/**
 * resolveEntities - llama al sidecar /resolve-entities. Degrada a {entities:[]}.
 * @param {string} userMessage
 * @param {object} [opts]
 * @param {string} [opts.sidecarUrl=DEFAULT_SIDECAR_URL]
 * @param {string} [opts.token]  default getSidecarToken()
 * @param {typeof fetch} [opts.fetchImpl=fetch]
 * @param {number} [opts.timeoutMs=15000]
 * @returns {Promise<{entities:object[]}>}
 */
export async function resolveEntities(
  userMessage,
  { sidecarUrl = DEFAULT_SIDECAR_URL, token = getSidecarToken(), fetchImpl = fetch, timeoutMs = 15_000 } = {},
) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetchImpl(`${sidecarUrl}/resolve-entities`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { entities: [] };
    const data = await res.json();
    return { entities: data.entities || [] };
  } catch (err) {
    console.log(`    [resolve-entities] ${String(err.message).slice(0, 60)}`);
    return { entities: [] };
  }
}

/**
 * postValidate - llama al sidecar /post-validate. Degrada graceful.
 * @param {string} userMessage
 * @param {string} response
 * @param {object} [opts]  (mismos que resolveEntities)
 * @returns {Promise<{hallucinated:object[], detected_count:number, age_available:boolean}>}
 */
export async function postValidate(
  userMessage,
  response,
  { sidecarUrl = DEFAULT_SIDECAR_URL, token = getSidecarToken(), fetchImpl = fetch, timeoutMs = 15_000 } = {},
) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Chagra-Token'] = token;
  try {
    const res = await fetchImpl(`${sidecarUrl}/post-validate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_message: userMessage, response }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return { hallucinated: [], detected_count: 0, age_available: false };
    const data = await res.json();
    return {
      hallucinated: data.hallucinated || [],
      detected_count: data.detected_count || 0,
      age_available: Boolean(data.age_available),
    };
  } catch {
    return { hallucinated: [], detected_count: 0, age_available: false };
  }
}

/**
 * buildEnrichedSystemPrompt - system prompt enriquecido con entidades del
 * catalogo (mismo que la PWA en prod). Para CONFIG C / grounding basico.
 * @param {object[]} entities
 * @returns {string}
 */
export function buildEnrichedSystemPrompt(entities) {
  const basePrompt =
    'Eres un asistente agroecologico experto para Colombia. Responde en espanol claro, practico para agricultores.\n\n' +
    'Si mencionas entidades (especies, plagas, biopreparados), usa los nombres canonicos del catalogo Chagra para evitar alucinaciones.';
  if (!entities || entities.length === 0) return basePrompt;
  const entityContext = entities
    .map((e) => {
      if (e.kind === 'species') return `- ${e.mentioned} = especie: ${e.nombre_cientifico} (${e.nombre_comun})`;
      if (e.kind === 'pest') return `- ${e.mentioned} = plaga: ${e.nombre_cientifico || e.nombre_comun}`;
      if (e.kind === 'biopreparado') return `- ${e.mentioned} = biopreparado: ${e.nombre_comun}`;
      return null;
    })
    .filter(Boolean)
    .join('\n');
  return `${basePrompt}\n\nENTIDADES DEL CATALOGO (usa estos nombres canonicos):\n${entityContext}`;
}

/**
 * generateChat - generador chat a CONFIG-PROD (temp + seed + max_tokens). Mide
 * latencia. Inyectable (fetchImpl) para test.
 * @param {object} p
 * @param {string} p.model
 * @param {string} p.systemPrompt
 * @param {string} p.userPrompt
 * @param {number} [p.temperature=0.3]
 * @param {number} [p.seed=42]
 * @param {number} [p.maxTokens=768]
 * @param {string} [p.ollamaUrl=DEFAULT_OLLAMA_CHAT_URL]
 * @param {number} [p.timeoutMs=180000]
 * @param {typeof fetch} [p.fetchImpl=fetch]
 * @returns {Promise<{response:string, latency_ms:number}>}
 */
export async function generateChat({
  model,
  systemPrompt,
  userPrompt,
  temperature = 0.3,
  seed = 42,
  maxTokens = 768,
  ollamaUrl = DEFAULT_OLLAMA_CHAT_URL,
  timeoutMs = 180_000,
  fetchImpl = fetch,
}) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchImpl(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: { temperature, seed, num_predict: maxTokens },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`gen HTTP ${res.status}`);
    const data = await res.json();
    return { response: data.message?.content || '', latency_ms: performance.now() - start };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * makeJudgeOllamaCall - fabrica un caller del juez contra ollama /api/generate.
 * Devuelve una funcion (prompt)=>Promise<string>, compatible con
 * scoreAntiHalluc({ ollamaCall }) de bench-scorer.mjs.
 * @param {object} p
 * @param {string} p.model
 * @param {number} [p.temperature=0]
 * @param {number} [p.seed=42]
 * @param {number} [p.maxTokens=160]
 * @param {number} [p.timeoutMs=120000]
 * @param {string} [p.ollamaUrl=DEFAULT_OLLAMA_GEN_URL]
 * @param {typeof fetch} [p.fetchImpl=fetch]
 * @returns {(prompt:string)=>Promise<string>}
 */
export function makeJudgeOllamaCall({
  model,
  temperature = 0,
  seed = 42,
  maxTokens = 160,
  timeoutMs = 120_000,
  ollamaUrl = DEFAULT_OLLAMA_GEN_URL,
  fetchImpl = fetch,
}) {
  return async function judgeOllamaCall(prompt) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(ollamaUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature, seed, num_predict: maxTokens },
          keep_alive: '30m',
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`judge HTTP ${res.status}`);
      const data = await res.json();
      return data.response || '';
    } finally {
      clearTimeout(timer);
    }
  };
}
