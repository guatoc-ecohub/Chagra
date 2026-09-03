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
import { ENV } from '../config/env';

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
    // Modelo leído de ENV.CHAT_MODEL (src/config/env.js, fuente única de
    // verdad — override en build-time con VITE_LLM_CHAT_MODEL para
    // experimentos, sin tocar código). Ver el comentario de esa clave para
    // el historial de bench (granite3.3 → gemma4:e2b → gemma4:e4b → gemma3:4b).
    model: ENV.CHAT_MODEL,
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
      `${ENV.CHAT_MODEL} (chat+complex unificado, evita cold-start). ` +
      'Detalle + por qué + alternativas en Chagra-strategy/ops/MODELS.md (fuente única).',
  },
  chat_complex: {
    // Modelo leído de ENV.CHAT_COMPLEX_MODEL (src/config/env.js, fuente
    // única de verdad — override en build-time con VITE_LLM_COMPLEX_MODEL
    // para experimentos, sin tocar código). Ver el comentario de esa clave
    // para el historial de bench (granite3.3 → gemma4:e2b → gemma4:e4b → gemma3:4b).
    model: ENV.CHAT_COMPLEX_MODEL,
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
      `${ENV.CHAT_COMPLEX_MODEL} (chat+complex unificado, evita cold-start). ` +
      'Detalle + por qué + alternativas en Chagra-strategy/ops/MODELS.md (fuente única).',
  },
  nlu: {
    // NLU REAL = sidecar agro-mcp nlu.ts (repo aparte chagra-pro, su propia
    // env var runtime NLU_MODEL). Este campo es vestigial: la PWA delega NLU
    // al sidecar /nlu. Se deja consistente con ENV.NLU_MODEL (src/config/env.js,
    // fuente única de verdad) por si algún caller legacy invoca esta ruta.
    model: ENV.NLU_MODEL,
    keep_alive_min: 0,
    temperature: 0,
    max_tokens: 150,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Vestigial — NLU real ejecuta en sidecar agro-mcp nlu.ts con su propio ' +
      `NLU_MODEL runtime (debe alinearse con ${ENV.NLU_MODEL}). ` +
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
    // 2026-07-23 (PR #2738 §9): qwen3-vl:8b JUBILADO. Bench profundo (18
    // plagas + 5 sanas control) da a gemma3:4b 45.5 (33.3% ident., 100%
    // honestidad) contra 16.9 de qwen3-vl:8b (11.1% ident., 80% honestidad,
    // + el swap de ~53s que este cambio elimina al unificar con el modelo
    // de texto). Ver ENV.VISION_MODEL en src/config/env.js (fuente única)
    // para el caveat metodológico pendiente de confirmación (el bench
    // "Arena visual 2026-07-22" citado abajo usaba un diseño distinto —
    // presencia SIEMPRE emparejada con su ausencia — que no se re-testeó
    // con el dataset nuevo).
    model: ENV.VISION_MODEL,
    // 2026-07-26 — ERA 0, decisión del operador: QUITARLO. El 0 venía de
    // cuando visión era `qwen3-vl:8b` y "no cabía" junto al chat en 12 GiB.
    // Medido, esa premisa es falsa: los dos modelos conviven (9691/12288 MiB)
    // y con keep_alive normal la foto baja de ~8,5 s a 0,8 s. Ver
    // `keepAliveEfectivo` abajo para la medición completa y la guarda.
    keep_alive_min: 10,
    temperature: 0.2,
    // marca de rol: la usa `keepAliveEfectivo` y el segundo paso.
    _paso: 1,
    max_tokens: 512,
    url: '/api/ollama/v1/chat/completions',
    rationale:
      'Histórico (Arena visual 2026-07-22, 12 casos, cada presencia emparejada con su ausencia, GPU limpia): qwen3-vl:8b acierta 12/12 — 5/5 presencia y 7/7 ausencia — a 17s por imagen, 100% GPU sin offload (7,6 GB). Le seguían qwen2.5vl:7b 92%, gemma4:e4b 75%, gemma3:4b 58% (fallaba 3 de 7 ausencias — inservible como gate en ESE diseño) y moondream 0%. Superseded por PR #2738 §9 (dataset distinto, 18 plagas + 5 sanas): gemma3:4b sale primero en identificación y honestidad. Detalle en Chagra-strategy/ops/MODELS.md (fuente unica).',
  },
  /* ── EL SEGUNDO PASO DEL DIAGNÓSTICO DE FOTO ─────────────────────────────
     Decisión del operador 2026-07-26: el primero contesta de una y este
     vuelve a mirar en segundo plano, avisando SÓLO si encuentra algo que el
     otro pasó por alto. Un modelo DISTINTO del chat a propósito — si fuera el
     mismo, la segunda mirada no aportaría nada nuevo.

     ⚠️ `num_predict` amplio y NO se le cree a `think:false`: qwen3-vl:4b
     razona igual, y con presupuesto corto devuelve CADENA VACÍA
     (`done_reason: "length"`). Medido: con 90 sacaba 4/11; con presupuesto
     suficiente, 11/11. No es que no sepa — es que no lo dejan hablar.

     ⚠️ Convivencia MEDIDA en alpha: qwen3.5:4b (6,0 GB) + qwen3-vl:4b
     (4,8 GB) = 9691/12288 MiB, y el chat sigue contestando en 0,70 s — pero
     SÓLO serializado. Disparándolo en paralelo con el embebedor del RAG se
     reprodujo el DESALOJO del chat pineado, con 8,56 s de recarga. El cerrojo
     de un-solo-vuelo vive en services/segundaOpinionFoto.js. */
  visionRevision: {
    model: ENV.VISION_REVIEW_MODEL,
    keep_alive_min: 10,
    temperature: 0.1,
    max_tokens: 700,
    url: '/api/ollama/v1/chat/completions',
    _paso: 2,
    rationale:
      'Segundo paso del diagnostico de foto. Bench propio sobre 19 fotos reales de matas del repo, emparejado presencia/ausencia (scripts/bench-vision-matas.mjs, 2026-07-26): qwen3-vl:4b 19/19 (11/11 enfermas, 8/8 sanas) contra 18/19 de qwen3.5:4b, que nunca alarma de mas pero dejo pasar la broca del cafe. Precio: 2,3x en latencia (6,22 s vs 2,75 s de mediana) porque razona aunque se le pida que no; por eso corre en segundo plano, nunca en el camino critico. Los errores de ambos son de TIPO OPUESTO: el segundo cubre el hueco del primero.',
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
/**
 * keep_alive efectivo de una ruta. **La guarda que faltaba.**
 *
 * `keep_alive: 0` significa "descargá el modelo apenas contestes". Es una
 * estrategia legítima cuando la ruta usa un modelo PROPIO (se carga, responde
 * y libera la GPU). Pero desde que los roles se unificaron en un solo modelo
 * (`config/env.js`: chat, nlu, extractor, complex y visión son todos
 * `qwen3.5:4b`), ese 0 dejó de liberar a un invitado y pasó a **echar al
 * dueño de casa**: cada turno con foto le decía a Ollama que descargara el
 * modelo del que depende el chat, y el siguiente mensaje pagaba el arranque
 * en frío completo.
 *
 * MEDIDO en alpha (2026-07-26, Quadro M6000 12 GiB):
 *   · el mecanismo, probado con un modelo señuelo para no tocar producción:
 *     `gemma3:4b` residente + una petición con `keep_alive:0` → desaparece.
 *   · el costo, en el carril de visión: con 0, cada foto paga carga en frío
 *     (8,51 s y 5,72 s). Con `keep_alive` normal: 6,70 s la primera y luego
 *     **0,80 s y 0,78 s**.
 *   · y no hacía falta: `qwen3.5:4b` (6,0 GB) y `qwen3-vl:4b` (4,8 GB)
 *     CONVIVEN en 9691 de 12288 MiB. La premisa de que no cabían era falsa.
 *
 * Por eso la regla es estructural y no ruta-por-ruta: **ninguna ruta puede
 * pedir la descarga del modelo que sirve el chat.** Si una ruta futura vuelve
 * a compartir modelo con el chat, queda protegida sola.
 *
 * @param {ModelRoute} route
 * @returns {number} minutos de keep_alive a enviar.
 */
export function keepAliveEfectivo(route) {
  const min = Number(route?.keep_alive_min) || 0;
  if (min > 0) return min;
  // Comparte modelo con el chat → jamás 0: se hereda el del chat.
  if (route?.model && route.model === ROUTES.chat.model) return ROUTES.chat.keep_alive_min;
  return min;
}

export function buildLLMRequest(task, messages, overrides = {}) {
  const route = getModelFor(task);
  const body = {
    model: route.model,
    messages,
    temperature: overrides.temperature ?? route.temperature,
    max_tokens: overrides.max_tokens ?? route.max_tokens,
    // keep_alive controla cuánto Ollama mantiene el modelo en RAM tras
    // esta request. Formato Ollama: número en segundos o sufijo "m"/"h".
    // Pasa por la guarda: una ruta nunca descarga el modelo del chat.
    keep_alive: `${keepAliveEfectivo(route)}m`,
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
