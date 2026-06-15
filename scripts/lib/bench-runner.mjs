/**
 * bench-runner.mjs — runner compartido para benches de Chagra.
 *
 * Este módulo provee funciones comunes utilizadas por múltiples scripts de
 * benchmark: carga de prompts, ejecución de modelos, guardado de resultados,
 * muestreo de recursos y checkpointing.
 *
 * Objetivo: reducir duplicación de código y hacer más fácil mantener los
 * benches. Los scripts individuales pueden importar solo las funciones que
 * necesitan.
 *
 * @module bench-runner
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuración por defecto ─────────────────────────────────────────────

/**
 * URLs por defecto para servicios utilizados en benches.
 */
export const DEFAULT_URLS = {
  /** URL del sidecar de Chagra (resolve-entities + post-validate) */
  SIDECAR: 'http://localhost:7880',
  /** URL de la API de chat de Ollama */
  OLLAMA_CHAT: 'http://localhost:11434/api/chat',
  /** URL de la API de generate de Ollama */
  OLLAMA_GENERATE: 'http://localhost:11434/api/generate',
  /** URL para listar modelos en Ollama */
  OLLAMA_TAGS: 'http://localhost:11434/api/tags',
};

/**
 * Timeout por defecto para llamadas a Ollama (3 minutos).
 */
export const DEFAULT_OLLAMA_TIMEOUT_MS = 180_000;

/**
 * Timeout por defecto para llamadas al sidecar (10 segundos).
 */
export const DEFAULT_SIDECAR_TIMEOUT_MS = 10_000;

// ── Carga de prompts ─────────────────────────────────────────────────────────

/**
 * Carga prompts desde un array embebido o desde un archivo JSON.
 *
 * @param {string[]|object} source  Array de prompts o path a archivo JSON
 * @param {string} [basePath]  Directorio base para resolver paths relativos
 * @returns {Array} Array de prompts
 */
export function loadPrompts(source, basePath = process.cwd()) {
  if (Array.isArray(source)) {
    return source;
  }

  if (typeof source === 'string') {
    const jsonPath = join(basePath, source);
    if (!existsSync(jsonPath)) {
      throw new Error(`Archivo de prompts no encontrado: ${jsonPath}`);
    }
    const content = readFileSync(jsonPath, 'utf-8');
    const data = JSON.parse(content);

    // Soportar ambos formatos: { prompts: [] } o [] directamente
    return Array.isArray(data) ? data : (data.prompts || []);
  }

  throw new Error('source debe ser un array de prompts o un path a archivo JSON');
}

/**
 * Deduplica prompts por ID (útil cuando se combinan múltiples fixtures).
 *
 * @param {Array} prompts  Array de prompts con campo 'id'
 * @returns {Array} Array deduplicado
 */
export function deduplicatePromptsById(prompts) {
  const seen = new Set();
  const result = [];

  for (const prompt of prompts) {
    if (prompt.id && !seen.has(prompt.id)) {
      seen.add(prompt.id);
      result.push(prompt);
    }
  }

  return result;
}

// ── Ejecución de modelos ─────────────────────────────────────────────────────

/**
 * Llama a la API de chat de Ollama con el modelo y mensajes dados.
 *
 * @param {object} params
 * @param {string} params.model  Nombre del modelo
 * @param {string} params.systemPrompt  Prompt del sistema
 * @param {string} params.userPrompt  Prompt del usuario
 * @param {string} [params.ollamaUrl]  URL de Ollama (default: DEFAULT_URLS.OLLAMA_CHAT)
 * @param {number} [params.timeoutMs]  Timeout en ms (default: DEFAULT_OLLAMA_TIMEOUT_MS)
 * @param {object} [params.options]  Opciones adicionales para Ollama (temperature, etc.)
 * @param {AbortSignal} [params.signal]  AbortSignal para cancelar la petición
 * @returns {Promise<object>} Objeto con response, latency_ms, tokens, etc.
 */
export async function callOllamaChat({
  model,
  systemPrompt,
  userPrompt,
  ollamaUrl = DEFAULT_URLS.OLLAMA_CHAT,
  timeoutMs = DEFAULT_OLLAMA_TIMEOUT_MS,
  options = {},
  signal,
}) {
  const start = performance.now();

  try {
    const controller = signal || new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        stream: false,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        options: {
          temperature: 0.7,
          num_predict: 512,
          ...options,
        },
        keep_alive: '30m',
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
    }

    const data = await res.json();
    const totalLatencyMs = performance.now() - start;

    const promptEvalCount = data.prompt_eval_count || 0;
    const evalCount = data.eval_count || 0;
    const evalDuration = data.eval_duration || 0;
    const loadDuration = data.load_duration || 0;
    const promptEvalDuration = data.prompt_eval_duration || 0;
    const tokensPerSec = evalDuration > 0
      ? Math.round((evalCount / evalDuration) * 1e9)
      : 0;

    return {
      response: data.message?.content || '',
      latency_ms: totalLatencyMs,
      tokens_estimated: data.message?.content?.length || 0,
      load_duration: loadDuration,
      prompt_eval_count: promptEvalCount,
      prompt_eval_duration: promptEvalDuration,
      eval_count: evalCount,
      eval_duration: evalDuration,
      tokens_per_sec: tokensPerSec,
      error: null,
    };
  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('abort')) {
      return {
        response: null,
        latency_ms: performance.now() - start,
        error: 'Timeout',
      };
    }
    return {
      response: null,
      latency_ms: performance.now() - start,
      error: err.message || String(err),
    };
  }
}

// ── Muestreo de recursos ────────────────────────────────────────────────────

/**
 * Muestrea VRAM, RAM y swap de forma segura sin requerir privilegios.
 *
 * En GPU usa `nvidia-smi --query --format=csv` si está disponible;
 * si no, reporta 'N/A'. RAM y swap se leen de /proc/meminfo.
 *
 * @returns {object} { vram_peak_mib, ram_peak_mb, swap_peak_mb }
 */
export function sampleResources() {
  const result = { vram_peak_mib: 'N/A', ram_peak_mb: 'N/A', swap_peak_mb: 'N/A' };

  try {
    const meminfo = readFileSync('/proc/meminfo', 'utf-8');
    const totalMatch = meminfo.match(/MemTotal:\s+(\d+)/);
    const availMatch = meminfo.match(/MemAvailable:\s+(\d+)/);
    const swapTotalMatch = meminfo.match(/SwapTotal:\s+(\d+)/);
    const swapFreeMatch = meminfo.match(/SwapFree:\s+(\d+)/);

    if (totalMatch && availMatch) {
      const usedKb = parseInt(totalMatch[1], 10) - parseInt(availMatch[1], 10);
      result.ram_peak_mb = Math.round(usedKb / 1024);
    }

    if (swapTotalMatch && swapFreeMatch) {
      const usedSwapKb = parseInt(swapTotalMatch[1], 10) - parseInt(swapFreeMatch[1], 10);
      result.swap_peak_mb = Math.round(usedSwapKb / 1024);
    }
  } catch (_) { /* best-effort */ }

  try {
    const smi = spawnSync('nvidia-smi', [
      '--query-gpu=memory.used',
      '--format=csv,noheader,nounits',
    ], { timeout: 5000, encoding: 'utf-8' });

    if (smi.status === 0 && smi.stdout) {
      const val = parseInt(smi.stdout.trim(), 10);
      if (!isNaN(val)) result.vram_peak_mib = val;
    }
  } catch (_) { /* best-effort */ }

  return result;
}

// ── Guardado de resultados ───────────────────────────────────────────────────

/**
 * Guarda resultados de un bench en formato JSONL.
 *
 * @param {Array} results  Array de resultados a guardar
 * @param {string} jsonlPath  Path del archivo JSONL
 */
export function saveJsonl(results, jsonlPath) {
  const dir = dirname(jsonlPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const jsonlLines = results.map(r => JSON.stringify(r));
  writeFileSync(jsonlPath, jsonlLines.join('\n') + '\n');
}

/**
 * Genera el path para un archivo de bench con fecha.
 *
 * @param {string} benchName  Nombre del bench
 * @param {string} outputDir  Directorio de salida
 * @param {string} [dateStr]  Fecha en formato YYYY-MM-DD (default: hoy)
 * @returns {object} { jsonlPath, summaryPath }
 */
export function generateBenchPaths(benchName, outputDir, dateStr = null) {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const basename = `${benchName}-${date}`;

  return {
    jsonlPath: join(outputDir, `${basename}.jsonl`),
    summaryPath: join(outputDir, `${basename}-summary.md`),
  };
}

// ── Token del sidecar ────────────────────────────────────────────────────────

/**
 * Obtiene el token de autenticación del sidecar.
 *
 * Prioridad:
 * 1. Archivo ~/.config/chagra-sidecar-token.txt
 * 2. Variable de entorno SIDECAR_TOKEN
 *
 * @returns {string} Token o string vacío
 */
export function getSidecarToken() {
  const tokenPath = `${process.env.HOME}/.config/chagra-sidecar-token.txt`;
  if (existsSync(tokenPath)) {
    return readFileSync(tokenPath, 'utf-8').trim();
  }
  return process.env.SIDECAR_TOKEN || '';
}

// ── Utilidades ───────────────────────────────────────────────────────────────

/**
 * Obtiene el directorio de salida para benches.
 *
 * Prioridad:
 * 1. Variable de entorno BENCH_OUTPUT_DIR
 * 2. Directorio data/bench-runs del repo
 *
 * @param {string} rootDir  Directorio raíz del repo
 * @returns {string} Path del directorio de salida
 */
export function getBenchOutputDir(rootDir) {
  return process.env.BENCH_OUTPUT_DIR || join(rootDir, 'data', 'bench-runs');
}

/**
 * Asegura que un directorio existe, creándolo si es necesario.
 *
 * @param {string} dirPath  Path del directorio
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}
