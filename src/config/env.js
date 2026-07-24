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
  // extractor de entidades por voz, chat, chat_complex, visión) DEBE leer
  // su modelo de una de las 5 claves de abajo. Prohibido volver a
  // hardcodear el nombre del modelo en servicios/componentes — si aparece
  // un nuevo caso de uso del agente, agregue una clave aquí, no un literal
  // disperso.
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
  //  - VISION_MODEL:       diagnóstico foliar + reconocimiento de especies
  //                        (aiService.js), pre-warm de cámara
  //                        (visionWarmService.js) y llmRouter ROUTES.vision.
  //
  // 2026-07-23 (PR #2738, §8/§9): gemma4:e4b → gemma3:4b como default de
  // las 5 claves — unifica agente de texto Y visión en un solo modelo de
  // 3.3GB. Texto: 81.7 en el índice de inteligencia interno (línea base
  // reproducible, test #2735), prácticamente empatado con e4b (81.6).
  // Visión (bench profundo, 18 plagas + 5 sanas control): gemma3:4b saca
  // 45.5 (33.3% identificación, 100% honestidad) contra 16.9 de
  // qwen3-vl:8b (11.1% ident., 80% honestidad, swap de ~53s que este
  // cambio elimina). `llama3.2-vision:11b` queda retirado como primary de
  // reconocimiento de especies: 0% honestidad, alucina diagnóstico en
  // TODAS las muestras sanas del bench (peligroso para una feature de
  // salud de planta). Detalle completo en PR #2738 (bench) y
  // Chagra-strategy/ops/MODELS.md (fuente única de detalle/bench).
  //
  // ⚠️ Caveat metodológico (dejar explícito para revisión humana antes de
  // producción): el bench de PR #2738 usa un dataset distinto (18 plagas +
  // 5 sanas, métrica agregada IDENT/HONESTIDAD) del bench "Arena visual
  // 2026-07-22" ya citado en llmRouter.js (12 casos, presencia SIEMPRE
  // emparejada con su ausencia), que había marcado gemma3:4b como
  // "inservible como gate" — fallaba 3/7 casos de AUSENCIA (alucinaba ver
  // algo que no estaba). El bench nuevo no repite ese diseño pareado
  // presencia/ausencia específico, así que no re-testea directamente esa
  // falla puntual; sí corrige un bug real del harness de honestidad
  // (reconocía solo "no sé" literal). PR #2738 está abierto y marcado
  // "No mergear — para revisión" al momento de este cambio. Confirmar con
  // el operador que la lectura de ambos benches se concilia antes de que
  // este PR llegue a producción (dev→main).
  NLU_MODEL: import.meta.env?.VITE_NLU_MODEL || 'gemma3:4b',
  EXTRACTOR_MODEL: import.meta.env?.VITE_EXTRACTOR_MODEL || 'gemma3:4b',
  CHAT_MODEL: import.meta.env?.VITE_LLM_CHAT_MODEL || 'gemma3:4b',
  CHAT_COMPLEX_MODEL: import.meta.env?.VITE_LLM_COMPLEX_MODEL || 'gemma3:4b',
  VISION_MODEL: import.meta.env?.VITE_VISION_MODEL || 'gemma3:4b',
};
