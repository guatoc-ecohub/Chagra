/**
 * llmRouter.js — Selector de modelo LLM según tarea (Multi-LLM routing).
 *
 * Decisión de modelo basada en bench empírico CPU 2026-05-15/16 + bench
 * GPU Quadro M6000 sm_52 2026-05-17. Resultados detallados en docs
 * operacionales internos (no en este repo).
 *
 * Estado actual: GPU offload 35/35 layers para todos los modelos listados.
 * Eval rate chat gemma3:4b 13.5 t/s CPU → 118 t/s GPU (+8.7×); load time
 * 7.6s → 3.0s (2.5× más rápido).
 *
 * Estrategia: 1 modelo "hot" para chat (gemma3:4b keep_alive=30m, viable
 * post-GPU porque load es barato y VRAM 4 GB) + 2 modelos "on-demand"
 * para tareas especializadas (qwen2.5-coder:7b NLU/JSON, gemma2:9b
 * reasoning) + 1 vision (qwen2.5vl:7b on-demand, nuevo post-GPU).
 *
 * Budget VRAM M6000 (12 GB): gemma3:4b hot (4.0 GB) + cualquier 7B/8B
 * on-demand (~5-7 GB). gemma3:12b (9.6 GB) y llava:13b (11.6 GB) caben
 * solos pero requieren unload de hot. nlu/reasoning unload tras request
 * (keep_alive=0) para liberar VRAM al siguiente turno chat.
 *
 * Modelos HABILITADOS post-GPU (antes inviables en CPU):
 * - qwen2.5vl:7b vision (78 t/s GPU, 11.8 GB VRAM)
 * - gemma3:12b reasoning (37.6 t/s GPU, 9.6 GB VRAM)
 * - deepseek-r1:8b reasoning chain-of-thought (46 t/s GPU)
 * - llava:13b vision alt (22.94 t/s GPU)
 *
 * Modelos DESCARTADOS por bench:
 * - qwen3.5:4b: qwen35 arch hang en Ollama 0.23.x
 * - qwen3:8b: output vacío con prompts JSON estrictos
 */

import { analyzeQueryComplexity } from './queryComplexityAnalyzer';

/**
 * Tipos de tarea soportadas por el router.
 *
 * `chat`         → modelo rápido para queries simples del agente Chagra IA.
 * `chat_complex` → modelo con mayor capacidad anti-alucinación para queries
 *                  complejas (plagas regionales, pasifloras confundibles,
 *                  planes multi-aspecto, queries largas). Bench 2026-05-23:
 *                  granite3.1-dense:8b clavó "Monalonion velezangeli" donde
 *                  gemma3:4b alucinaba. Override via env VITE_LLM_COMPLEX_MODEL.
 *                  Routing se decide en frontend con `selectChatRoute(query)`
 *                  (importable desde `./queryComplexityAnalyzer`).
 *
 * @typedef {'chat' | 'chat_complex' | 'nlu' | 'reasoning' | 'vision'} LLMTask
 */

/**
 * Configuración por tarea.
 * @typedef {Object} ModelRoute
 * @property {string} model           - Nombre del modelo en Ollama (ej. "gemma3:4b").
 * @property {number} keep_alive_min  - Minutos que Ollama mantiene el modelo cargado tras última request.
 *                                       0 = unload inmediato; 5 = caliente para próxima petición.
 * @property {number} temperature     - Default per task.
 * @property {number} max_tokens      - Default per task.
 * @property {string} url             - Endpoint OpenAI-compat (`/api/ollama/v1/chat/completions`).
 * @property {string} rationale       - Por qué este modelo para esta tarea.
 */

/** @type {Record<LLMTask, ModelRoute>} */
export const ROUTES = {
  chat: {
    // Bench nocturno 2026-05-24 (DR bench-modelos-nocturno-2026-05-24.md):
    // llama3.1:8b ranked #2 con tools (44% anti-halluc, 0 halluc flags, 12.9s lat),
    // mientras gemma3:4b quedó #4 (40% AH). Sin sacrificar latencia significativa
    // (mismo orden de magnitud) ganamos 4 puntos AH. Override via env
    // VITE_LLM_CHAT_MODEL para volver a gemma3:4b si necesitamos comparar.
    model:
      (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_LLM_CHAT_MODEL) ||
      'llama3.1:8b',
    keep_alive_min: 30,
    temperature: 0.3,
    max_tokens: 512,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench nocturno 2026-05-24 (8h, 100 prompts × 8 finalistas con tools+AGE): ' +
      'llama3.1:8b ranked #2 (44% anti-halluc, 0 halluc flags, 12.9s avg). ' +
      'gemma3:4b ranked #4 (40% AH, 11.7s) — diferencia 4 puntos AH a costo ' +
      '~1s latencia. Aplicación de intelligence-first principle: priorizar ' +
      'anti-alucinación sobre velocidad marginal. ~5 GB VRAM (vs 4 GB gemma3:4b), ' +
      'aún cabe vision on-demand. keep_alive=30m. ' +
      'Override env: VITE_LLM_CHAT_MODEL para experimentos. ' +
      'Routing dual 2026-05-23: queries "complex" (plagas regionales, ' +
      'pasifloras, planes multi-aspecto, queries largas) caen a `chat_complex` ' +
      'route con granite3.1-dense:8b (#1 ranking bench, 56% AH).',
  },
  chat_complex: {
    // Override por env para que el operador pueda probar gemma3:12b u otros
    // sin redeploy de código. Si VITE_LLM_COMPLEX_MODEL no está seteado,
    // default a granite3.1-dense:8b (bench 2026-05-23: única opción que
    // clavó Monalonion velezangeli sin alucinación + cupo VRAM razonable).
    model:
      (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_LLM_COMPLEX_MODEL) ||
      'granite3.1-dense:8b',
    keep_alive_min: 5,
    temperature: 0.3,
    max_tokens: 768,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench 2026-05-23 anti-alucinación: granite3.1-dense:8b 37 t/s, ' +
      '~6 GB VRAM, ~37s avg con context completo. Más lento que gemma3:4b ' +
      'pero clavó "Monalonion velezangeli" sin pifia donde 4b derivaba a ' +
      'Fusarium genéricos. keep_alive_min=5 (no 30): el chat hot sigue ' +
      'siendo gemma3:4b → no mantener dos modelos calientes simultáneos ' +
      'para no presionar VRAM contra vision (qwen2.5vl 11.8 GB). ' +
      'max_tokens 768 (vs 512 del chat simple) porque queries complejas ' +
      'tienden a respuestas más estructuradas (planes, asocios, ' +
      'enumeraciones). temperature mantenida en 0.3 — la regla ' +
      'intelligence-first aplica igual: temperature baja + prompt ' +
      'agresivo > modelo más grande con temperature alta.',
  },
  nlu: {
    model: 'qwen2.5-coder:7b',
    keep_alive_min: 0,
    temperature: 0,
    max_tokens: 150,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench: único modelo que pasó chat ✓ AND NLU ✓ en llama.cpp puro ' +
      'con prompts JSON estrictos. gemma3:4b devuelve {} plano cuando ' +
      'schema pide [{...}] (bug #685). qwen2.5-coder entrenado en código, ' +
      'devuelve schemas válidos consistentemente.',
  },
  reasoning: {
    model: 'gemma2:9b',
    keep_alive_min: 0,
    temperature: 0.5,
    max_tokens: 1024,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench: NLU ✓ AND chat ✓ en llama.cpp puro. 9.2B params = más ' +
      'knowledge embedded para temas agroecológicos específicos (variedades ' +
      'regionales, taxonomía Tier A, manejos andinos). Spanish quality alto. ' +
      'Alternativas post-GPU pendientes bench round 2: gemma3:12b (37.6 t/s, ' +
      'mejor capability) o deepseek-r1:8b (46 t/s, chain-of-thought).',
  },
  vision: {
    model: 'qwen2.5vl:7b',
    keep_alive_min: 0,
    temperature: 0.2,
    max_tokens: 512,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench GPU: 78 t/s, 11.8 GB VRAM (apretado pero cabe en M6000 12 GB). ' +
      'Multimodal nativo, antes inviable por OOM CPU. Habilita pest ' +
      'diagnostic (DR-040 F2) y plant ID. Alternativa: llava:13b (22.94 t/s) ' +
      'si Qwen falla con flora silvestre. unload tras request porque ' +
      'compite con chat hot por VRAM.',
  },
};

/**
 * Resuelve la configuración del modelo para una tarea dada.
 *
 * @param {LLMTask} task - Tipo de tarea: 'chat', 'nlu', o 'reasoning'.
 * @returns {ModelRoute} - Config del modelo (model, keep_alive_min, etc).
 * @throws {Error} si la tarea no existe en el routing table.
 */
export function getModelFor(task) {
  const route = ROUTES[task];
  if (!route) {
    throw new Error(`[llmRouter] Tarea desconocida: ${task}. Valores válidos: ${Object.keys(ROUTES).join(', ')}`);
  }
  return route;
}

/**
 * Helper para invocar Ollama OpenAI-compat con la config de la tarea.
 *
 * Sólo crea el body base del request — el caller decide si usa fetch
 * directo, streamOpenAI, streamOllama, etc. Esto preserva el patrón
 * existente sin imponer un cliente HTTP.
 *
 * @param {LLMTask} task         - chat, nlu, o reasoning.
 * @param {Array}   messages     - Array OpenAI-format de {role, content}.
 * @param {Object}  [overrides]  - Sobrescribe temperature/max_tokens si necesario.
 * @returns {{url: string, body: Object}} - Listo para fetch / streamOpenAI.
 *
 * @example
 *   const { url, body } = buildLLMRequest('chat', [
 *     { role: 'system', content: 'Eres asistente...' },
 *     { role: 'user', content: '¿cuándo siembro tomate?' },
 *   ]);
 *   const response = await streamOpenAI(url, body, onToken);
 */
export function buildLLMRequest(task, messages, overrides = {}) {
  const route = getModelFor(task);
  return {
    url: route.url,
    body: {
      model: route.model,
      messages,
      temperature: overrides.temperature ?? route.temperature,
      max_tokens: overrides.max_tokens ?? route.max_tokens,
      // keep_alive controla cuánto Ollama mantiene el modelo en RAM tras
      // esta request. Formato Ollama: número en segundos o sufijo "m"/"h".
      keep_alive: `${route.keep_alive_min}m`,
    },
  };
}

/**
 * Modelo "default" cuando no se especifica tarea — chat.
 * Útil para callsites legacy que esperan un solo modelo.
 */
export const DEFAULT_MODEL = ROUTES.chat.model;

/**
 * Selector de ruta de chat para el agente Chagra IA basado en análisis
 * de complejidad de la query (ver `queryComplexityAnalyzer.js`). Devuelve
 * el nombre de task ('chat' o 'chat_complex') que el caller pasa a
 * `buildLLMRequest`. Mantiene el contrato existente (`buildLLMRequest`
 * sigue recibiendo un LLMTask) — sólo agrega un paso de decisión.
 *
 * Logging: emite `console.debug` con la decisión para facilitar diagnóstico
 * de routing en field testing. Si el operador reporta latencias raras o
 * respuestas pobres, el log permite confirmar qué modelo se eligió sin
 * añadir telemetría adicional.
 *
 * @param {string} query - Query del usuario.
 * @returns {LLMTask} - 'chat' (simple) o 'chat_complex' (compleja).
 */
export function selectChatRoute(query) {
  // Import estático arriba (no dinámico) — el analyzer no depende de
  // ROUTES, así que no hay ciclo. Si en el futuro el analyzer necesitara
  // leer ROUTES, romper el ciclo moviendo este selector a un módulo
  // tercero o invirtiendo la dependencia.
  const complexity = analyzeQueryComplexity(query);
  const task = complexity === 'complex' ? 'chat_complex' : 'chat';
  const route = ROUTES[task];
  const preview = typeof query === 'string' ? query.slice(0, 60) : '<no-string>';
  console.debug(`[router] query "${preview}" → ${complexity} → ${route.model}`);
  return task;
}

export default {
  ROUTES,
  getModelFor,
  buildLLMRequest,
  selectChatRoute,
  DEFAULT_MODEL,
};
