/**
 * llmRouter.js — Selector de modelo LLM según tarea (Multi-LLM routing).
 *
 * Decisión de modelo basada en bench empírico 2026-05-15/16 sobre Ollama
 * 0.23.1 + Ryzen 4600G UMA (14 GB RAM) corriendo en alpha. Resultados
 * completos en `Chagra-strategy/ops/bench-ollama-2026-05-15.md` y
 * `Chagra-strategy/ops/bench-llamacpp-puro-2026-05-16.md`.
 *
 * Estrategia: 1 modelo "hot" para chat (gemma3:4b siempre cargado con
 * keep_alive=5m) + 2 modelos "on-demand" para tareas especializadas
 * (qwen2.5-coder:7b para NLU/JSON strict, gemma2:9b para reasoning
 * profundo). Esto evita OOM en 14 GB y mantiene latencia chat <8s.
 *
 * RAM budget worst-case: 3.7 GB (gemma3 hot) + 5.0 GB (gemma2 cargado on
 * demand) + OS/Chagra/services ~4 GB = ~12.7 GB de 14 GB → margen ~1.3 GB.
 * Requiere `llamacpp-server.service` STOPPED en alpha (5 GB de Qwen2.5-7B
 * pinned competía con gemma sin uso real).
 *
 * Modelos DESCARTADOS por bench:
 * - qwen3.5:4b: qwen35 arch hang en Ollama 0.23.1
 * - qwen3:8b, deepseek-r1:8b: output vacío con prompts JSON estrictos
 * - gemma3:12b: OOM con --no-mmap, requiere GPU
 * - qwen2.5vl:7b: multimodal, llama-server no soporta vision standalone
 */

/**
 * Tipos de tarea soportadas por el router.
 * @typedef {'chat' | 'nlu' | 'reasoning'} LLMTask
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
    model: 'gemma3:4b',
    keep_alive_min: 5,
    temperature: 0.7,
    max_tokens: 512,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench: 15.0 t/s (Ollama), 3.7 GB RAM, Tier A papa/oca/cubio. ' +
      '2x más rápido que cualquier 7B+. UX fluida en campo.',
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
      'regionales, taxonomía Tier A, manejos andinos). Spanish quality alto.',
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

export default {
  ROUTES,
  getModelFor,
  buildLLMRequest,
  DEFAULT_MODEL,
};
