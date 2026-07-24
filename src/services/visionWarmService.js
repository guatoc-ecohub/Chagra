/**
 * visionWarmService.js — pre-warm del modelo vision on-click cámara.
 *
 * Estrategia "warm-on-click" (decisión operador 2026-05-27): NO pre-warmear
 * el modelo de visión al login (riesgo de presión sobre la GPU local: el
 * modelo de chat más el de visión juntos quedan cerca del tope de memoria).
 * En su lugar, disparar el warm cuando el operador toca el botón "Tomar
 * foto" — mientras enfoca cámara/galería (3-5 segundos humanos), el modelo
 * carga en GPU.
 *
 * Si el modelo de chat ya está cargado, Ollama gestiona el swap
 * automáticamente. Cuando el operador vuelve al chat texto después, se
 * re-cargará en cold-start, pero ese tradeoff es aceptable: la primera identificación
 * de visión es lo que percibe el operador como "el agente respondió rápido"
 * y eso impacta más la primera impresión (los testers Android+iOS que pruebas
 * mañana 2026-05-27).
 *
 * Idempotente: usar `warmVisionModel()` múltiples veces no dispara N requests
 * — un internal lock previene calls concurrentes mientras una request está
 * en vuelo. El segundo click rápido no quema memoria de GPU extra.
 *
 * Fire-and-forget: el caller NO debe esperar la promesa. Si falla (Ollama
 * down, red intermitente, modelo no instalado), degrada silencioso al
 * cold-start clásico que verá el operador en el momento del análisis.
 */

import { fetchWithAuthRetry } from './apiService.js';
import { ENV } from '../config/env';

const OLLAMA_URL = '/api/ollama/api/generate';
// 2026-07-23 (PR #2738 §9): lee de ENV.VISION_MODEL (src/config/env.js,
// fuente única) — antes hardcodeaba 'llama3.2-vision:11b', retirado por
// bench (0% honestidad, alucinaba en muestras sanas).
const VISION_MODEL = ENV.VISION_MODEL;
// keep_alive 5min: si user demora entre click cámara y submit, el modelo
// sigue caliente. Si user abandona el flow, Ollama lo desaloja en 5min y
// libera memoria de GPU. Más corto causaría re-warm si el flow toma >2min.
const KEEP_ALIVE = '5m';
const WARMUP_TIMEOUT_MS = 30000;

let _warmInFlight = false;
let _lastWarmAt = 0;
// Si el último warm exitoso fue hace menos de 4min, asumimos que sigue
// caliente y no re-disparamos. Threshold defensivo bajo el keep_alive 5min.
const SKIP_IF_RECENT_MS = 4 * 60 * 1000;

/**
 * Dispara warm del modelo de visión en background. Idempotente, no-bloqueante.
 *
 * @returns {Promise<boolean>} true si disparó (o ya estaba warm), false si error.
 *   El caller normalmente ignora el retorno.
 */
export async function warmVisionModel() {
  if (_warmInFlight) return true;
  const now = Date.now();
  if (now - _lastWarmAt < SKIP_IF_RECENT_MS) return true;

  _warmInFlight = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

  try {
    const res = await fetchWithAuthRetry(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt: 'ok',
        stream: false,
        keep_alive: KEEP_ALIVE,
        options: { num_predict: 1 },
      }),
      signal: controller.signal,
    });
    if (res.ok) {
      _lastWarmAt = Date.now();
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
    _warmInFlight = false;
  }
}

/**
 * Reset interno — para tests solamente.
 * @internal
 */
export function __resetVisionWarmState() {
  _warmInFlight = false;
  _lastWarmAt = 0;
}
