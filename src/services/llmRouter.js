/**
 * llmRouter.js — Selector de modelo LLM según tarea (Multi-LLM routing).
 *
 * Decisión de modelo basada en bench interno. Resultados detallados en docs
 * operacionales internos (no en este repo).
 *
 * Estado actual: los modelos listados corren con offload completo en GPU
 * local, con mejoras de throughput y de tiempo de carga frente a CPU.
 *
 * Estrategia: 1 modelo "hot" para chat (keep_alive prolongado) + modelos
 * "on-demand" para tareas especializadas (NLU/JSON, reasoning) + 1 de
 * visión on-demand.
 *
 * Presupuesto de GPU local: el modelo de chat queda caliente y los modelos
 * on-demand se cargan según necesidad. Los modelos más grandes caben solos
 * pero requieren liberar el hot. nlu/reasoning hacen unload tras la request
 * (keep_alive=0) para liberar memoria al siguiente turno de chat.
 */

import { analyzeQueryComplexity } from './queryComplexityAnalyzer';

/**
 * BUG A (fuga de roles, incidente prod 2026-05-30) — stop sequences anti
 * "turno falso". `conversationMemory.getContextString` inyecta el historial
 * con etiquetas `Usuario:` / `Asistente:`. Sin `stop` tokens, el modelo de
 * chat (granite/gemma) autocompleta el patrón del diálogo y emite un turno
 * inventado del usuario ("Usuario: Hola Dante, gracias por tu consulta...").
 * Estos tokens cortan la generación EN CUANTO el modelo intenta abrir un
 * turno nuevo. Cubrimos: inicio-de-línea (\n + etiqueta), variantes con
 * espacio antes de los dos puntos, ES + EN, y el marcador de chat-template
 * de Ollama/llama.cpp (`<|im_start|>`, `<|im_end|>`, `<|user|>`).
 *
 * Nota: es defensa estructural #1. La defensa #2 (post-proceso que trunca
 * cualquier turno falso que igual se cuele, p.ej. por el path de streaming
 * del sidecar que no reenvía `stop`) vive en `agentService.stripRoleLeak`.
 */
export const CHAT_STOP_SEQUENCES = Object.freeze([
  '\nUsuario:',
  '\nUsuario :',
  '\nAsistente:',
  '\nAsistente :',
  '\nUser:',
  '\nAssistant:',
  '\n\nUsuario:',
  '\n\nAsistente:',
  '<|im_start|>',
  '<|im_end|>',
  '<|user|>',
  '<|assistant|>',
]);

/**
 * Tipos de tarea soportadas por el router.
 *
 * `chat`         → modelo rápido para queries simples del agente Chagra IA.
 * `chat_complex` → modelo con mayor capacidad anti-alucinación para queries
 *                  complejas (plagas regionales, pasifloras confundibles,
 *                  planes multi-aspecto, queries largas). Según bench interno,
 *                  el modelo complex evita confusiones taxonómicas donde el
 *                  modelo simple alucinaba. Override via env
 *                  VITE_LLM_COMPLEX_MODEL. Routing se decide en frontend con
 *                  `selectChatRoute(query)` (importable desde
 *                  `./queryComplexityAnalyzer`).
 *
 * @typedef {'chat' | 'chat_complex' | 'nlu' | 'reasoning' | 'vision'} LLMTask
 */

/**
 * Configuración por tarea.
 * @typedef {Object} ModelRoute
 * @property {string} model           - Nombre del modelo en Ollama.
 * @property {number} keep_alive_min  - Minutos que Ollama mantiene el modelo cargado tras última request.
 *                                       0 = unload inmediato; 5 = caliente para próxima petición.
 * @property {number} temperature     - Default per task.
 * @property {number} max_tokens      - Default per task.
 * @property {string} url             - Endpoint OpenAI-compat (`/api/ollama/v1/chat/completions`).
 * @property {string} rationale       - Por qué este modelo para esta tarea.
 * @property {string[]|readonly string[]} [stop]        - Stop sequences (opcional).
 */

/** @type {Record<LLMTask, ModelRoute>} */
export const ROUTES = {
  chat: {
    // Swap post-bug producción: se promueve el modelo de chat configurado al
    // baseline. La selección prioriza anti-alucinación (factor decisivo para
    // mitigar errores geográficos + piso térmico observados en producción).
    // Plus: usar el mismo modelo para chat simple y complex elimina el
    // cold-start cuando el router escala (no hay 2do modelo que cargar).
    // Tradeoff de latencia amortizado por UX queueing + tip flotante.
    // Override via env VITE_LLM_CHAT_MODEL para experimentos.
    model:
      (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_LLM_CHAT_MODEL) ||
      'granite3.3:8b',
    keep_alive_min: 30,
    temperature: 0.3,
    // 2026-06-06: 512→768. Fuga real (interacción operador): respuesta de
    // siembra cortada a media frase ("…riego regular para") porque una lista
    // de 5 especies con descripción supera 512 tokens. Intelligence-first:
    // no truncar el consejo agronómico por ahorrar tokens.
    // 2026-06-11: 768→1024. La auditoría agroecológica (marca) halló que 768
    // AÚN mutila respuestas agronómicas: dosis + pasos + especies + precaución
    // + fuente superan 768 → se corta a media frase ("concise-guard truncation"
    // sistémica en todos los dominios). 1024 deja pasar el consejo completo.
    max_tokens: 1024,
    // BUG A fix (2026-05-30): corta turnos falsos "Usuario:"/"Asistente:".
    stop: CHAT_STOP_SEQUENCES,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'granite3.3:8b (chat+complex unificado, evita cold-start). ' +
      'Detalle + por qué + alternativas en Chagra-strategy/ops/MODELS.md (fuente única).',
  },
  chat_complex: {
    // Override por env para que el operador pueda probar otros modelos
    // sin redeploy de código. Si VITE_LLM_COMPLEX_MODEL no está seteado,
    // usa el modelo complex configurado (según bench interno, la opción que
    // evita confusiones taxonómicas con cupo de GPU razonable).
    model:
      (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_LLM_COMPLEX_MODEL) ||
      'granite3.3:8b',
    keep_alive_min: 5,
    temperature: 0.3,
    // 2026-06-06: 768→1024. Las queries complejas (planes multi-cultivo,
    // asocios, enumeraciones con descripción) son justo las que más se
    // truncaban. Intelligence-first sobre latencia.
    max_tokens: 1024,
    // BUG A fix (2026-05-30): corta turnos falsos "Usuario:"/"Asistente:".
    stop: CHAT_STOP_SEQUENCES,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'granite3.3:8b (chat+complex unificado, evita cold-start). ' +
      'Detalle + por qué + alternativas en Chagra-strategy/ops/MODELS.md (fuente única).',
  },
  nlu: {
    // NLU REAL = sidecar agro-mcp nlu.ts (granite3.3:8b). Este campo es
    // vestigial: la PWA delega NLU al sidecar /nlu. Ver
    // Chagra-strategy/ops/MODELS.md (fuente única de verdad de modelos).
    model: 'granite3.3:8b',
    keep_alive_min: 0,
    temperature: 0,
    max_tokens: 150,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Vestigial — NLU real ejecuta en sidecar agro-mcp nlu.ts con ' +
      'granite3.3:8b (unificado con chat para no tener 2 modelos en 12 GB). ' +
      'Detalle en Chagra-strategy/ops/MODELS.md (fuente única).',
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
    model: 'gemma3:4b',
    keep_alive_min: 0,
    temperature: 0.2,
    max_tokens: 512,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Bench visión M6000 2026-06-23: qwen2.5vl:7b es el PEOR (alucina + ' +
      'offload 14 GB → thrash). gemma3:4b co-reside con granite3.3:8b ' +
      '(10.2/12 GB, sin offload) e identifica patógenos mejor. Validado ' +
      'contra gate AGE validate_visual_match. Detalle en ' +
      'Chagra-strategy/ops/MODELS.md (fuente única).',
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
  const body = {
    model: route.model,
    messages,
    temperature: overrides.temperature ?? route.temperature,
    max_tokens: overrides.max_tokens ?? route.max_tokens,
    // keep_alive controla cuánto Ollama mantiene el modelo en RAM tras
    // esta request. Formato Ollama: número en segundos o sufijo "m"/"h".
    keep_alive: `${route.keep_alive_min}m`,
  };
  // BUG A fix (2026-05-30): forward stop sequences (de la ruta o del
  // override). Ollama OpenAI-compat respeta `stop` (string[]). Solo se
  // setea cuando hay algo que cortar, para no enviar `stop: undefined`.
  const stop = overrides.stop ?? route.stop;
  if (Array.isArray(stop) && stop.length > 0) {
    body.stop = stop;
  }
  return { url: route.url, body };
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
