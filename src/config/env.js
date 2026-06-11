// Validación de env vars al startup.
// VITE_FARMOS_URL puede ser vacío (proxy relativo via Nginx), así que
// solo validamos que la variable EXISTA (haya sido definida en build-time).
const required = ['VITE_FARMOS_CLIENT_ID'];

for (const key of required) {
  if (import.meta.env[key] === undefined) {
    console.error(`[Config] Variable de entorno requerida no definida: ${key}. Revise .env o .env.local.`);
  }
}

export const ENV = {
  FARMOS_URL: import.meta.env.VITE_FARMOS_URL || '',
  FARMOS_CLIENT_ID: import.meta.env.VITE_FARMOS_CLIENT_ID || '',
  // HA_ACCESS_TOKEN removido del bundle (audit #2). Authorization se
  // inyecta server-side por Nginx desde el store de secretos del servidor.
  DEFAULT_LOCATION_ID: import.meta.env.VITE_DEFAULT_LOCATION_ID || '',
  DEFAULT_FARM_NAME: import.meta.env.VITE_DEFAULT_FARM_NAME || 'Finca Principal',
  // Modelos de inferencia (configurables sin recompilar).
  // Cambia en .env cuando bumpees el modelo en el Nodo Alpha.
  STT_MODEL: import.meta.env.VITE_STT_MODEL || 'base',
  // 2026-06-11: default gemma3:4b → granite3.3:8b. gemma3:4b NO carga junto a
  // granite3.3 pinned (VRAM) → la extracción de voz daba 0 plantas. granite3.3
  // (hot) extrae bien. Alinea el display + HelpVoiceQuestion con el modelo real.
  NLU_MODEL: import.meta.env.VITE_NLU_MODEL || 'granite3.3:8b',
};
