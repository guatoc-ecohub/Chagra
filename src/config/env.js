// Validación de env vars al startup.
// VITE_FARMOS_URL puede ser vacío (proxy relativo via Nginx), así que
// solo validamos que la variable EXISTA (haya sido definida en build-time).
// `import.meta.env` es un objeto real en Vite (build + runtime, con todas las
// VITE_*), pero es `undefined` cuando estos módulos se importan desde node puro
// (benches/harness que reutilizan src/services). Sin guarda, `import.meta.env[key]`
// lanza "Cannot read properties of undefined" al cargar el módulo y tumba toda
// la cadena de imports (p.ej. getToolsForLLM, ragRetriever). El optional-chaining
// `import.meta.env?.VITE_X` mantiene el acceso literal que Vite reemplaza/provee
// y degrada a default en node. NO afecta el bundle del navegador.
const required = ['VITE_FARMOS_CLIENT_ID'];

if (import.meta.env) {
  for (const key of required) {
    if (import.meta.env[key] === undefined) {
      console.error(`[Config] Variable de entorno requerida no definida: ${key}. Revise .env o .env.local.`);
    }
  }
}

export const ENV = {
  FARMOS_URL: import.meta.env?.VITE_FARMOS_URL || '',
  FARMOS_CLIENT_ID: import.meta.env?.VITE_FARMOS_CLIENT_ID || '',
  // HA_ACCESS_TOKEN removido del bundle (audit #2). Authorization se
  // inyecta server-side por Nginx desde el store de secretos del servidor.
  DEFAULT_LOCATION_ID: import.meta.env?.VITE_DEFAULT_LOCATION_ID || '',
  // eslint-disable-next-line chagra-i18n/no-hardcoded-spanish -- default de env (no UI), no i18n
  DEFAULT_FARM_NAME: import.meta.env?.VITE_DEFAULT_FARM_NAME || 'Finca Principal',
  // Modelos de inferencia (configurables sin recompilar).
  // Cambia en .env cuando bumpees el modelo local.
  STT_MODEL: import.meta.env?.VITE_STT_MODEL || 'base',

  // ─────────────────────────────────────────────────────────────────────
  // FUENTE DE VERDAD del/los modelo(s) del agente — cambiar SOLO aquí.
  //
  // Todo el código de este repo que invoca el LLM del agente (NLU local,
  // extractor de entidades por voz, chat, chat_complex) DEBE leer su
  // modelo de una de las 4 claves de abajo. Prohibido volver a hardcodear
  // el nombre del modelo en servicios/componentes — si aparece un nuevo
  // caso de uso del agente, agregue una clave aquí, no un literal disperso.
  //
  // El sidecar (chagra-pro, repo aparte) corre su propio NLU real
  // (agro-mcp nlu.ts) con su propia env var runtime `NLU_MODEL` — ESE valor
  // vive fuera de este repo y debe alinearse manualmente con este valor.
  //
  // Roles:
  //  - NLU_MODEL:          voiceRouter.callNlu (clasificación+extracción de
  //                        intención por voz, on-device Ollama directo) y
  //                        HelpVoiceQuestion (Q&A sobre contenido).
  //  - EXTRACTOR_MODEL:    entityExtractor (extrae {crop,quantity,location}
  //                        de la transcripción). Rol propio porque su
  //                        elección histórica se basó en co-residencia/hot-
  //                        load en GPU, no en calidad NLU per se.
  //  - CHAT_MODEL:         llmRouter ROUTES.chat (queries simples).
  //  - CHAT_COMPLEX_MODEL: llmRouter ROUTES.chat_complex (queries complejas,
  //                        anti-alucinación taxonómica/piso térmico).
  //
  // 2026-07-23: gemma4:e2b → gemma4:e4b como default de las 4 claves. Índice
  // de inteligencia interno (línea base reproducible, ver test #2735): e4b
  // 81.6 vs e2b 69.9 (+11.7). e4b + nomic-embed conviven en la M6000 de 12GB
  // (10.9/12 GB verificado). Ver Chagra-strategy/ops/MODELS.md (fuente
  // única de detalle/bench).
  //
  // Historial previo (2026-07-22): granite3.3:8b → gemma4:e2b, por medición
  // con juez semántico sobre 70 sondas: granite3.3 contamina el 47,7% de sus
  // respuestas y falla el piso térmico el 41,7% de las veces (le da consejo
  // de tierra caliente a alguien de páramo). gemma4:e2b bajaba a 10% global
  // y 6,7% en piso térmico — 4,8x mejor, y convivía con el embedder del RAG
  // (snowflake-arctic-embed2) en la M6000 de 12GB sin el cudaMalloc OOM que
  // sufría granite3.3.
  NLU_MODEL: import.meta.env?.VITE_NLU_MODEL || 'gemma4:e4b',
  EXTRACTOR_MODEL: import.meta.env?.VITE_EXTRACTOR_MODEL || 'gemma4:e4b',
  CHAT_MODEL: import.meta.env?.VITE_LLM_CHAT_MODEL || 'gemma4:e4b',
  CHAT_COMPLEX_MODEL: import.meta.env?.VITE_LLM_COMPLEX_MODEL || 'gemma4:e4b',
};
