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
  // 2026-07-22: granite3.3:8b → gemma4:e2b, por medición con juez semántico sobre
  // 70 sondas: granite3.3 contamina el 47,7% de sus respuestas y falla el piso
  // térmico el 41,7% de las veces (le da consejo de tierra caliente a alguien de
  // páramo). gemma4:e2b baja a 10% global y 6,7% en piso térmico — 4,8x mejor.
  // Además pesa 8,1GB cargado contra 7,2GB, y CONVIVE con el embedder del RAG
  // (snowflake-arctic-embed2) en la M6000 de 12GB, cosa que granite3.3 no hacía:
  // con granite el embedder daba cudaMalloc OOM y el RAG semántico se apagaba en
  // silencio. Verificado en vivo: embed 200ms + agente 860-1450ms, conviviendo.
  NLU_MODEL: import.meta.env?.VITE_NLU_MODEL || 'gemma4:e2b',
};
