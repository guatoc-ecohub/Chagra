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

/**
 * Tipos de tarea soportadas por el router.
 * @typedef {'chat' | 'nlu' | 'reasoning' | 'vision'} LLMTask
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
    keep_alive_min: 30,
    temperature: 0.3,
    max_tokens: 80,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench GPU 2026-05-17: 118 t/s, 4 GB VRAM, load 3s. keep_alive=30m. ' +
      'temperature 0.7→0.3 tras incidente alucinación "chorcho" 2026-05-17: ' +
      'gemma3:12b (probado en PR #809, cerrado) NO resolvió — inventó OTRA ' +
      'definición con más confianza. La fix real es system prompt agresivo ' +
      '(ver AgentScreen.getSystemPrompt) + temperature baja. Mantener 4b ' +
      'por velocidad y VRAM (vision cabe on-demand). Solución modelo-agnóstica. ' +
      'max_tokens 512→80 2026-05-20 (Task #45 fix latencia TTS): ' +
      'kokoro-82m CPU escala lineal con caracteres, 512 tokens ≈ 23s audio. ' +
      '80 tokens ≈ 30 palabras ≈ 3-4s audio = sustentable para UX rural por voz. ' +
      'system prompt agroecológico ya tiene REGLA 6 que pide concisión + ' +
      'pregunta de seguimiento si necesita detalle.',
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

export default {
  ROUTES,
  getModelFor,
  buildLLMRequest,
  DEFAULT_MODEL,
};
