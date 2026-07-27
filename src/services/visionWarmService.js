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
 *
 * ═══ 2026-07-26 — DOS COSAS CAMBIARON, Y UNA ERA UN BUG ═══════════════════
 *
 * **(1) El warm le estaba ACORTANDO EL PIN al modelo del chat.** Hoy
 * `VISION_MODEL` y `CHAT_MODEL` son el MISMO `qwen3.5:4b`, y este servicio
 * mandaba `keep_alive: '5m'`. En Ollama el `keep_alive` de una petición
 * **reescribe** la expiración del modelo ya residente. Medido en `alpha` con
 * señuelo (`gemma3:4b`, sin tocar producción):
 *
 *     carga con keep_alive 24h  → expira 2026-07-27T18:44   (+24 h)
 *     misma petición, 5m        → expira 2026-07-26T18:49   (+5 min)  ⚠️
 *
 * O sea: **cada toque a la cámara degradaba el pin de 24 h del chat a 5
 * minutos**, y a los 5 minutos de inactividad Ollama lo desalojaba — el
 * siguiente mensaje pagaba el arranque en frío. Es la misma familia del
 * `keep_alive:0` que ya se corrigió en `llmRouter.keepAliveEfectivo()`, por
 * otra puerta. Ahora el warm **no toca jamás el modelo del chat**.
 *
 * **(2) Entró el precalentado del SEGUNDO paso** (`warmVisionReviewModel`),
 * que es el que de verdad está frío: `qwen3-vl:4b` tarda **17,5 s** la
 * primera vez y ~5 s residente. Se dispara al abrir la cámara — cuando el
 * usuario está enfocando— y no cuando ya mandó la foto.
 *
 * ⚠️ **El precalentado no puede disparar concurrencia.** Lo que desaloja al
 * chat no es el tamaño (los dos caben: 9691/12288 MiB) sino dos cargas a la
 * vez: medido, en paralelo con el embebedor del RAG el chat fue desalojado y
 * el siguiente mensaje pagó 8,56 s. Por eso hay **un solo cerrojo compartido**
 * por los dos warms y el caller pasa `ocupado()` para no precalentar mientras
 * hay un turno en vuelo.
 */

import { fetchWithAuthRetry } from './apiService.js';
import { ENV } from '../config/env';

const OLLAMA_URL = '/api/ollama/api/generate';
const OLLAMA_PS_URL = '/api/ollama/api/ps';
// 2026-07-23 (PR #2738 §9): lee de ENV.VISION_MODEL (src/config/env.js,
// fuente única) — antes hardcodeaba 'llama3.2-vision:11b', retirado por
// bench (0% honestidad, alucinaba en muestras sanas).
const VISION_MODEL = ENV.VISION_MODEL;
// keep_alive 5min: si user demora entre click cámara y submit, el modelo
// sigue caliente. Si user abandona el flow, Ollama lo desaloja en 5min y
// libera memoria de GPU. Más corto causaría re-warm si el flow toma >2min.
const KEEP_ALIVE = '5m';
const WARMUP_TIMEOUT_MS = 30000;
// El de revisión arranca en 17,5 s en frío (medido). 30 s dejaba casi cero
// margen si la GPU está atendiendo otra cosa; 45 s es holgura real, y como es
// fire-and-forget no le cuesta nada a nadie esperarlo.
const REVIEW_WARMUP_TIMEOUT_MS = 45000;

// EL SEGUNDO PASO del diagnóstico. Este SÍ está frío de verdad: 17,5 s la
// primera vez contra ~5 s ya residente. Es el que hay que precalentar.
const REVIEW_MODEL = ENV.VISION_REVIEW_MODEL;
// El del chat, que es sagrado: está pineado y NADIE le acorta la expiración.
const CHAT_MODEL = ENV.CHAT_MODEL;

// UN SOLO cerrojo para los dos warms: el desalojo se produce por CONCURRENCIA,
// no por tamaño (medido). Dos precalentados a la vez son exactamente lo que no
// puede pasar.
let _warmInFlight = false;
let _lastWarmAt = 0;
let _lastReviewWarmAt = 0;
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
  // ⚠️ GUARDA NUEVA (2026-07-26). Si el modelo de visión ES el del chat —hoy
  // lo es: los dos son `qwen3.5:4b`— precalentarlo no gana NADA (ya está
  // residente y pineado) y cuesta caro: la petición le reescribiría la
  // expiración de 24 h a los 5 min de `KEEP_ALIVE`. Medido con señuelo, ver
  // la cabecera. No hay warm que hacer: se sale diciendo que sí.
  if (VISION_MODEL === CHAT_MODEL) return true;
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
 * Qué modelos tiene Ollama residentes AHORA MISMO.
 *
 * Lo usa la guarda del segundo paso (`puedeCorrerSegundoPaso`): si el modelo
 * del chat ya no está, la GPU está peleada y meter otra carga sólo empeora
 * las cosas. Devuelve `[]` si no se puede consultar — el caller trata la
 * lista vacía como "no sé", no como "no hay ninguno".
 *
 * @returns {Promise<string[]>}
 */
export async function modelosResidentes() {
  try {
    const res = await fetchWithAuthRetry(OLLAMA_PS_URL, { method: 'GET' });
    if (!res.ok) return [];
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    return models.map((m) => m?.name || m?.model).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * PRECALENTAR EL SEGUNDO PASO — al abrir la cámara, no al mandar la foto.
 *
 * `qwen3-vl:4b` tarda **17,5 s en frío** y ~5 s ya residente (medido contra
 * `alpha`). Como la segunda opinión corre en segundo plano, esos 17 s no se
 * "sienten"… salvo que el usuario cierre la app antes de que llegue. Cargarlo
 * mientras enfoca la foto lo vuelve casi gratis.
 *
 * ⚠️ **Nunca desaloja al chat.** Tres candados, y ninguno es teórico:
 *   1. Jamás precalienta el modelo del chat (ver `warmVisionModel`).
 *   2. Cerrojo COMPARTIDO: no puede haber dos warms a la vez. Lo que desalojó
 *      el chat en la medición fue la concurrencia, no el tamaño.
 *   3. `ocupado()` — el caller le dice si hay un turno del agente en vuelo. El
 *      caso malo reproducido fue precisamente precalentar mientras corría el
 *      embebedor del RAG: el chat pineado cayó y el mensaje siguiente pagó
 *      8,56 s. Si está ocupado, no se precalienta: se pagarán los 17 s en
 *      segundo plano, que es el mal MENOR.
 *
 * @param {Object} [opts]
 * @param {() => boolean} [opts.ocupado] — ¿hay trabajo del LLM en vuelo?
 * @returns {Promise<boolean>} true si quedó (o ya estaba) caliente.
 */
export async function warmVisionReviewModel({ ocupado } = {}) {
  if (!REVIEW_MODEL) return false;
  // Candado 1: si por configuración fuera el mismo del chat, no hay nada que
  // precalentar y sí un pin que arruinar.
  if (REVIEW_MODEL === CHAT_MODEL) return true;
  // Candado 3: nunca en paralelo con un turno del agente.
  try {
    if (typeof ocupado === 'function' && ocupado()) return false;
  } catch { /* si la sonda del caller falla, se sigue con los otros candados */ }
  // Candado 2: cerrojo compartido con el otro warm.
  if (_warmInFlight) return true;
  const now = Date.now();
  if (now - _lastReviewWarmAt < SKIP_IF_RECENT_MS) return true;

  _warmInFlight = true;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REVIEW_WARMUP_TIMEOUT_MS);

  try {
    const res = await fetchWithAuthRetry(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: REVIEW_MODEL,
        prompt: 'ok',
        stream: false,
        keep_alive: KEEP_ALIVE,
        // ⚠️ `think:false` Y presupuesto > 0: este modelo razona igual aunque
        // se le pida que no, y con presupuesto corto devuelve cadena vacía
        // (`done_reason: "length"`). Para un warm da lo mismo lo que conteste
        // —lo que importa es que el modelo quede cargado— pero se deja
        // explícito para que nadie copie este bloque a una ruta que sí lea la
        // respuesta.
        think: false,
        options: { num_predict: 1 },
      }),
      signal: controller.signal,
    });
    if (res.ok) {
      _lastReviewWarmAt = Date.now();
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
  _lastReviewWarmAt = 0;
}
