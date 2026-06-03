/**
 * streamDeadline.js — Deadline stream-aware (idle-timeout) para la inferencia
 * del agente.
 *
 * FIX prod P0 (2026-06-02): el cliente de chat abortaba respuestas largas con
 * "Tiempo agotado". El deadline era TOTAL: arrancaba un `setTimeout` de 60s al
 * iniciar la inferencia y disparaba `controller.abort()` aunque el stream
 * estuviera avanzando token a token. Bajo carga las completions del modelo de
 * chat rozan 20-29s y, sumando cold-load + RAG + tool-chain, una respuesta
 * sana-pero-lenta podía cruzar los 60s y morir a mitad de generación. Bench
 * prod 2026-06-02: 4 de 6 prompts murieron por este abort.
 *
 * Política nueva:
 *
 *   1. IDLE-timeout (criterio primario): mide el GAP entre tokens, NO el total.
 *      Se reinicia con cada token recibido. Un stream que avanza nunca lo
 *      cruza; solo un STALL real (el backend dejó de emitir) lo dispara. Esto
 *      tolera respuestas largas bajo carga sin techarlas artificialmente.
 *
 *   2. HARD-CEILING (backstop extremo): un techo absoluto desde el inicio que
 *      NO se reinicia con tokens. Generoso (no infinito) para que la UI no
 *      quede colgada para siempre si el backend emite un token cada N segundos
 *      indefinidamente (caso patológico). Una respuesta sana termina mucho
 *      antes de tocarlo.
 *
 * Se mantiene como factory puro (sin React, sin DOM, sin red) para testearlo
 * con fake timers, igual que `agentPartialMerge.js`. El componente sólo cablea
 * `start()` / `onToken()` / `stop()` y un `onTimeout(reason)` que dispara el
 * `controller.abort()`.
 */

/**
 * Idle-timeout por defecto: GAP máximo tolerado entre tokens antes de
 * considerar el stream estancado. 35s deja margen cómodo sobre el peor caso
 * observado de first-token bajo carga (cold-load del modelo + prefill del
 * system prompt + RAG context). Mientras el modelo siga emitiendo dentro de
 * esa ventana, la respuesta NO se aborta por más larga que sea en total.
 */
export const IDLE_TIMEOUT_MS = 40000;

/**
 * Techo absoluto desde el arranque (backstop extremo). NO se reinicia con
 * tokens. 120s es ampliamente suficiente para cualquier respuesta legítima del
 * agente (incluyendo planes multi-aspecto largos en el modelo complejo); su
 * único fin es evitar que la UI quede colgada indefinidamente ante un backend
 * que gotea tokens para siempre. NO es infinito a propósito.
 */
export const HARD_CEILING_MS = 120000;

/**
 * Crea un controlador de deadline stream-aware.
 *
 * @param {Object}   [params]
 * @param {number}   [params.idleMs=IDLE_TIMEOUT_MS]   idle-timeout (reinicia por token).
 * @param {number}   [params.ceilingMs=HARD_CEILING_MS] techo absoluto (no reinicia).
 * @param {Function} params.onTimeout  callback `(reason: 'idle'|'ceiling') => void`
 *                                      invocado UNA sola vez cuando vence alguno
 *                                      de los plazos. Típicamente dispara
 *                                      `controller.abort()`.
 * @returns {{
 *   start: () => void,
 *   onToken: () => void,
 *   stop: () => void,
 * }}
 *   - `start()`   arma idle + ceiling. Idempotente (re-arma limpio).
 *   - `onToken()` reinicia SOLO el idle-timer (señal de que el stream vive).
 *                 No-op si ya se detuvo o ya disparó.
 *   - `stop()`    limpia ambos timers. Llamar al completar/abortar la respuesta.
 */
export function createStreamDeadline({
  idleMs = IDLE_TIMEOUT_MS,
  ceilingMs = HARD_CEILING_MS,
  onTimeout,
} = {}) {
  let idleTimer = null;
  let ceilingTimer = null;
  // Latch: el deadline sólo puede disparar/limpiar una vez. Evita que idle y
  // ceiling se pisen (doble onTimeout) y que un onToken tardío re-arme tras fin.
  let finished = false;

  const clearTimers = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (ceilingTimer !== null) {
      clearTimeout(ceilingTimer);
      ceilingTimer = null;
    }
  };

  const fire = (reason) => {
    if (finished) return;
    finished = true;
    clearTimers();
    if (typeof onTimeout === 'function') {
      try {
        onTimeout(reason);
      } catch (_) {
        // El callback (abort) jamás debe romper el deadline.
      }
    }
  };

  const armIdle = () => {
    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }
    idleTimer = setTimeout(() => fire('idle'), idleMs);
  };

  return {
    start() {
      // Idempotente: re-arranque limpio (no acumula timers huérfanos).
      clearTimers();
      finished = false;
      armIdle();
      ceilingTimer = setTimeout(() => fire('ceiling'), ceilingMs);
    },
    onToken() {
      // Llegó un token: el stream está vivo → reinicia SOLO el idle-timer.
      // El techo absoluto sigue corriendo sin tocar. No-op tras stop/disparo.
      if (finished || idleTimer === null) return;
      armIdle();
    },
    stop() {
      finished = true;
      clearTimers();
    },
  };
}

export default createStreamDeadline;
