/**
 * bench-ollama.mjs — utilidades para trabajar con Ollama en benches.
 *
 * Este módulo provee funciones para verificar disponibilidad de modelos,
 * descargar modelos de VRAM, y otras operaciones comunes con Ollama.
 *
 * @module bench-ollama
 */

import { fetch } from 'undici';

/** URL por defecto para listar modelos */
export const OLLAMA_TAGS_URL = 'http://localhost:11434/api/tags';

/** URL por defecto para generar/descargar modelos */
export const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';

/**
 * Verifica que todos los modelos especificados existan en Ollama.
 * Si falta alguno, lista los comandos ollama pull necesarios y sale con código 1.
 *
 * @param {string[]} modelNames  Nombres de modelos a verificar
 * @param {string} [ollamaTagsUrl]  URL de Ollama (default: OLLAMA_TAGS_URL)
 * @param {(msg:string)=>void} [log=console.log]  Función de logging
 * @param {(code:number)=>void} [exit=process.exit]  Función para salir (inyectable para tests)
 * @returns {Promise<void>}
 */
export async function checkOllamaModels(
  modelNames,
  ollamaTagsUrl = OLLAMA_TAGS_URL,
  log = console.log,
  exit = process.exit
) {
  log('[preflight] Verificando modelos en Ollama...');

  let ollamaUp = false;
  try {
    const res = await fetch(ollamaTagsUrl, { 
      signal: AbortSignal.timeout(5000) 
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    ollamaUp = true;

    const installed = new Set((data.models || []).map(m => m.name));
    const missing = modelNames.filter(m => !installed.has(m));

    if (missing.length === 0) {
      log(`[preflight] Los ${modelNames.length} modelos están presentes.`);
      return;
    }

    log(`[preflight] FALTAN ${missing.length} modelo(s) — abortando.`);
    for (const m of missing) {
      log(`  - ${m}`);
    }
    log('');
    log('Comandos para instalar los faltantes:');
    for (const m of missing) {
      log(`  ollama pull ${m}`);
    }
    exit(1);
  } catch (err) {
    if (!ollamaUp) {
      log('[preflight] No se pudo conectar con Ollama en', ollamaTagsUrl);
      log('[preflight] Asegúrate de que el daemon esté corriendo: ollama serve');
      exit(1);
    }
    log('[preflight] Error inesperado al listar modelos:', err.message);
    exit(1);
  }
}

/**
 * Descarga un modelo de la VRAM (keep_alive:0).
 *
 * Necesario en GPU de slot único: tras la tanda de un modelo, liberamos
 * memoria para que el siguiente pueda cargar.
 *
 * @param {string} modelName  Nombre del modelo a descargar
 * @param {string} [ollamaGenerateUrl]  URL de Ollama (default: OLLAMA_GENERATE_URL)
 * @param {(msg:string)=>void} [log=console.log]  Función de logging
 * @returns {Promise<void>}
 */
export async function unloadModel(
  modelName,
  ollamaGenerateUrl = OLLAMA_GENERATE_URL,
  log = console.log
) {
  try {
    await fetch(ollamaGenerateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: modelName, 
        keep_alive: 0 
      }),
      signal: AbortSignal.timeout(15_000),
    });
    log(`    [unload] ${modelName} descargado de VRAM`);
  } catch (err) {
    log(`    [unload] no se pudo descargar ${modelName}: ${err.message}`);
  }
}

/**
 * Patrones de error que indican incompatibilidad con GPU Maxwell sm_5.2.
 *
 * @type {string[]}
 */
export const MAXWELL_ERROR_PATTERNS = [
  'sm_5.2',
  'maxwell',
  'unsupported architecture',
  'compute capability',
  'sm_52'
];

/**
 * Verifica si un mensaje de error contiene patrones de error de Maxwell.
 *
 * @param {string} errorMessage  Mensaje de error a verificar
 * @returns {boolean} True si indica error de Maxwell
 */
export function checkMaxwellError(errorMessage) {
  const errorLower = (errorMessage || '').toLowerCase();
  return MAXWELL_ERROR_PATTERNS.some(pattern => 
    errorLower.includes(pattern.toLowerCase())
  );
}

/**
 * Llama a la API de generate de Ollama (útil para jueces que usan /generate).
 *
 * @param {object} params
 * @param {string} params.model  Nombre del modelo
 * @param {string} params.prompt  Prompt a enviar
 * @param {string} [params.ollamaUrl]  URL de Ollama (default: OLLAMA_GENERATE_URL)
 * @param {number} [params.timeoutMs]  Timeout en ms
 * @param {object} [params.options]  Opciones adicionales (temperature, etc.)
 * @param {AbortSignal} [params.signal]  AbortSignal para cancelar
 * @returns {Promise<string>} Respuesta del modelo
 */
export async function callOllamaGenerate({
  model,
  prompt,
  ollamaUrl = OLLAMA_GENERATE_URL,
  timeoutMs = 60_000,
  options = {},
  signal,
}) {
  const controller = signal || new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 120,
          ...options,
        },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`judge HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.response || '';
  } finally {
    if (!signal) clearTimeout(timer);
  }
}
