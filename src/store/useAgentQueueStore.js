import { create } from 'zustand';

/**
 * useAgentQueueStore — máquina de estados del queue del agente Chagra IA
 * (task #121, 2026-05-24).
 *
 * Problema (UX 2026-05-23 testing manual con operadora real):
 * Cuando una pregunta al agente tarda 12-25s en responder (router dual
 * model: llama3.1:8b ~12.9s simple, granite3.1-dense:8b ~24.7s complex),
 * el operador no espera quieto: dispara 2-3 preguntas seguidas. Con el
 * guard `state !== STATE_IDLE` actual en `handleSubmit`, las preguntas
 * 2 y 3 se ignoraban silenciosamente (`return` mudo). El operador veía
 * el input quedarse quieto sin feedback y asumía que la app estaba rota.
 *
 * Solución: queue explícito con capacidad MÁXIMA 2 (1 procesándose + 1
 * pendiente). La tercera se rechaza con mensaje claro "espera, ya hay
 * 2 en cola". Mientras espera ve ETA dinámico basado en latencia
 * histórica del modelo elegido por el router.
 *
 * Capa pura (no toca DOM, fetch, ni servicios): testeable al 100% con
 * vitest sin renderear nada. AgentScreen orquesta UI alrededor del
 * store via subscripciones + comandos `enqueue` / `markStarted` /
 * `completeProcessing`.
 *
 * Estado:
 *   - processing:   { id, prompt, model, startedAt, expectedEtaMs } | null
 *   - pending:      Array de { id, prompt, enqueuedAt }; max 1 elemento
 *                   (allow 2 total = 1 processing + 1 pending).
 *   - latencyEma:   Object { [model]: emaMs }. Init defaults por modelo
 *                   del bench nocturno 2026-05-24. Se actualiza con
 *                   alpha 0.3 cada `completeProcessing`.
 *   - rejectedCount: contador defensivo para telemetría (cuántas veces
 *                   el operador trató de mandar una 3ra mientras había 2).
 *
 * NO persistimos: el queue es efímero por sesión de chat. Si el operador
 * cierra el navegador, la pregunta pendiente se pierde — y eso es
 * deliberado: el operador escribió pero no le respondimos, no podemos
 * fingir que respondimos tarde sin contexto fresco.
 */

/**
 * Defaults de latencia inicial por route del router (selectChatRoute).
 * Bench nocturno 2026-05-24 (DR bench-modelos-nocturno-2026-05-24.md):
 *   - 'chat' (llama3.1:8b)             ≈ 12.9s avg
 *   - 'chat_complex' (granite3.1-dense:8b) ≈ 24.7s avg
 *   - 'unknown' (fallback defensivo)   ≈ 15.0s
 * Si en el futuro se agrega otro route al router, se cae al fallback
 * limpio en lugar de explotar.
 */
export const DEFAULT_EMA_MS = {
  chat: 12900,
  chat_complex: 24700,
  unknown: 15000,
};

/**
 * Alpha del Exponential Moving Average. 0.3 da peso suave al sample
 * nuevo (30%) preservando inercia histórica (70%). Equilibrio entre
 * reaccionar a degradaciones reales del modelo (cold-start tras swap
 * de VRAM) y no oscilar ante un single outlier.
 */
const EMA_ALPHA = 0.3;

/**
 * Capacidad total del queue (processing + pending). 2 es el valor del
 * task #121: permite que el operador adelante una pregunta siguiente
 * mientras la actual procesa, sin abrir la puerta a colas infinitas que
 * acumulen contexto stale (a los 60s ya no recuerda qué preguntó).
 */
export const QUEUE_MAX = 2;

/**
 * Genera un id estable para cada item del queue. ULID-like pero sin
 * importar dependencia: timestamp + counter local. Suficiente para
 * tracking dentro de una sesión.
 */
let _itemSeq = 0;
function nextItemId() {
  _itemSeq += 1;
  return `q-${Date.now()}-${_itemSeq}`;
}

const useAgentQueueStore = create((set, get) => ({
  processing: null,
  pending: [],
  latencyEma: { ...DEFAULT_EMA_MS },
  rejectedCount: 0,

  /**
   * Intenta encolar una pregunta nueva. Retorna un objeto descriptivo
   * para que el caller (AgentScreen.handleSubmit) decida qué hacer:
   *   - { status: 'started', item }       → empezar el pipeline LLM ya
   *   - { status: 'queued',  item }       → mensaje "tu pregunta queda en cola"
   *   - { status: 'rejected', reason }    → toast "ya hay 2 en cola, espera"
   *
   * El caller dispara el LLM solo cuando status === 'started'. Cuando
   * `completeProcessing` corre, el store mueve el `pending` a `processing`
   * y retorna el item promovido para que el caller lo dispare a su vez.
   */
  enqueue: (prompt, route = 'chat') => {
    const trimmed = (prompt || '').trim();
    if (!trimmed) return { status: 'rejected', reason: 'empty' };

    const { processing, pending, latencyEma, rejectedCount } = get();

    // CAPACIDAD: 1 processing + 1 pending = 2 total. Tercera rechaza.
    const totalInFlight = (processing ? 1 : 0) + pending.length;
    if (totalInFlight >= QUEUE_MAX) {
      set({ rejectedCount: rejectedCount + 1 });
      return {
        status: 'rejected',
        reason: 'queue_full',
        message: 'Espera un momento. Ya tengo dos preguntas en cola; te respondo en orden.',
      };
    }

    const item = { id: nextItemId(), prompt: trimmed, enqueuedAt: Date.now() };

    if (!processing) {
      // No hay nada procesando — arranca de una.
      const eta = latencyEma[route] ?? latencyEma.unknown ?? DEFAULT_EMA_MS.unknown;
      const processingItem = {
        ...item,
        model: route,
        startedAt: Date.now(),
        expectedEtaMs: eta,
      };
      set({ processing: processingItem });
      return { status: 'started', item: processingItem };
    }

    // Hay algo procesando — encola.
    set({ pending: [...pending, item] });
    return { status: 'queued', item };
  },

  /**
   * Marca el item processing como terminado y actualiza el EMA del
   * modelo usado. Retorna el siguiente item promovido a processing (o
   * null si no había pending). El caller debe disparar el LLM con el
   * item retornado.
   *
   * `failed`: si la inferencia falló (timeout, abort), NO actualizamos
   * el EMA — el sample es ruido (cold-start fallido, red caída) y
   * contaminaría las estimaciones futuras.
   */
  completeProcessing: ({ failed = false } = {}) => {
    const { processing, pending, latencyEma } = get();
    if (!processing) {
      // Defensa: completeProcessing sin processing activo es un bug
      // pero NO debe explotar. Loggea y promueve pending si lo hay
      // (estado limpio).
      console.debug('[useAgentQueueStore] completeProcessing sin processing activo');
    }

    // Actualizar EMA del modelo usado (solo si éxito real).
    let nextEma = latencyEma;
    if (processing && !failed) {
      const elapsed = Date.now() - processing.startedAt;
      // Clamp defensivo: muestras absurdas (< 500ms o > 120s) las
      // descartamos para no envenenar el EMA con anomalías.
      if (elapsed >= 500 && elapsed <= 120000) {
        const key = processing.model || 'unknown';
        const oldEma = latencyEma[key] ?? DEFAULT_EMA_MS.unknown;
        const newEma = Math.round(oldEma * (1 - EMA_ALPHA) + elapsed * EMA_ALPHA);
        nextEma = { ...latencyEma, [key]: newEma };
      }
    }

    // Promover pending si lo hay.
    if (pending.length > 0) {
      const [nextItem, ...rest] = pending;
      // Para el item promovido NO conocemos aún el route definitivo
      // (lo decide el caller con selectChatRoute(prompt)). Pasamos el
      // route como 'chat' por default y `startProcessing` lo corrige.
      const route = 'chat';
      const eta = nextEma[route] ?? nextEma.unknown ?? DEFAULT_EMA_MS.unknown;
      const promotedItem = {
        ...nextItem,
        model: route,
        startedAt: Date.now(),
        expectedEtaMs: eta,
      };
      set({
        processing: promotedItem,
        pending: rest,
        latencyEma: nextEma,
      });
      return promotedItem;
    }

    set({
      processing: null,
      latencyEma: nextEma,
    });
    return null;
  },

  /**
   * Ajusta el route del processing actual. Lo llamamos justo después
   * de `enqueue` o tras promoción cuando el caller ya invocó
   * `selectChatRoute(prompt)` y conoce el modelo real. Recalcula el
   * `expectedEtaMs` con el EMA del nuevo route.
   *
   * Patrón de uso (AgentScreen):
   *   const r = enqueue(prompt);
   *   if (r.status === 'started') {
   *     const route = selectChatRoute(prompt);
   *     updateProcessingRoute(r.item.id, route);
   *     // ...llamar LLM...
   *   }
   */
  updateProcessingRoute: (id, route) => {
    const { processing, latencyEma } = get();
    if (!processing || processing.id !== id) return;
    const eta = latencyEma[route] ?? latencyEma.unknown ?? DEFAULT_EMA_MS.unknown;
    set({
      processing: { ...processing, model: route, expectedEtaMs: eta },
    });
  },

  /**
   * Calcula tiempo restante estimado del item processing actual.
   * Retorna milisegundos restantes (puede ser negativo si pasamos el
   * ETA — la UI lo trata como "ya casi"). Retorna null si no hay
   * processing.
   *
   * NOTA: este getter es pure. AgentScreen llama esto cada segundo
   * vía setInterval para renderear el countdown.
   */
  getRemainingMs: () => {
    const { processing } = get();
    if (!processing) return null;
    const elapsed = Date.now() - processing.startedAt;
    return processing.expectedEtaMs - elapsed;
  },

  /**
   * Reset explícito del store. Para tests y para el botón "Nueva
   * conversación" del header (un reset de conversación debe abortar
   * también cualquier pregunta pendiente — el contexto cambió).
   */
  reset: () => {
    set({
      processing: null,
      pending: [],
      latencyEma: { ...DEFAULT_EMA_MS },
      rejectedCount: 0,
    });
  },
}));

export default useAgentQueueStore;
