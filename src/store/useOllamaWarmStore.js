import { create } from 'zustand';

/**
 * useOllamaWarmStore — bus global de estado warm-up del modelo Ollama
 * (gemma3:4b) que usa el agente Chagra IA.
 *
 * Problema (NN4, Playwright 2026-05-23 Q1 curuba): la primera query al
 * agente tras una sesión fresca tardaba 116s porque Ollama carga el modelo
 * en GPU bajo demanda (~4.6 GB VRAM). PR #1020 introdujo pre-warm al entrar
 * al dashboard, pero el `keep_alive=30m` se mide desde el último request:
 * si entre sesiones de Playwright el modelo se descargó del VRAM, el
 * pre-warm al dashboard llegaba tarde si el operador iba directo al agente.
 *
 * Solución (este PR): disparar el pre-warm al login success ANTES de
 * navegar al dashboard. Esto da ~15-30s de margen extra entre login y la
 * primera interacción con el agente (el operador tiene que mirar el
 * dashboard, escoger una tile, abrir el agente — tiempo humano natural).
 *
 * El store es la fuente de verdad sobre si el modelo está caliente o no.
 * AgentScreen suscribe a `status` y muestra un banner pequeño "preparando
 * agente IA" si status !== 'warm'. El banner desaparece automáticamente
 * cuando el pre-warm completa.
 *
 * Estados:
 *   - 'unknown'  : no se ha intentado pre-warm en esta sesión (post-reload).
 *   - 'warming'  : pre-warm en vuelo. Banner visible si user entra al agente.
 *   - 'warm'     : pre-warm OK. Banner oculto. Modelo cargado por ~30 min.
 *   - 'failed'   : pre-warm falló (red, timeout, Ollama down). Banner
 *                  igualmente oculto — el primer request del agente caerá
 *                  al cold-start clásico y mostrará su propio progreso.
 *
 * Reglas de transición:
 *   - startWarmup() es idempotente: si status === 'warming' o 'warm', NO
 *     dispara una segunda request. Evita pre-warm duplicados si el login
 *     se llama dos veces (re-mount) o si el fallback del dashboard se
 *     superpone.
 *   - resetWarmup() existe para tests; no debe usarse en runtime.
 *
 * NO persistimos en localStorage: el status del modelo es efímero (vive
 * solo mientras el proceso ollama lo tenga cargado). Post-reload del
 * navegador, el modelo podría seguir cargado o no — un nuevo startWarmup
 * resuelve el estado real al primer intento.
 */

// Timeout total del pre-warm. La primera carga gemma3:4b en GPU M6000
// tarda ~25-40s. 180s es defensivo para casos de Ollama recuperándose
// de un crash de runner o swap en disco.
const WARMUP_TIMEOUT_MS = 180000;

const useOllamaWarmStore = create((set, get) => ({
  status: 'unknown',
  startedAt: null,
  completedAt: null,

  /**
   * Dispara el pre-warm POST a `/api/ollama/api/generate` con prompt
   * mínimo + keep_alive=30m. Fire-and-forget desde el caller (no await).
   * El store maneja transiciones de status internamente.
   *
   * Idempotente: si ya estamos en 'warming' o 'warm', retorna sin
   * disparar nada. Solo re-dispara desde 'unknown' o 'failed'.
   */
  startWarmup: () => {
    const { status } = get();
    if (status === 'warming' || status === 'warm') return;

    set({ status: 'warming', startedAt: Date.now(), completedAt: null });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);

    fetch('/api/ollama/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma3:4b',
        prompt: 'ok',
        stream: false,
        keep_alive: '30m',
        options: { num_predict: 1 },
      }),
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timer);
        if (res.ok) {
          set({ status: 'warm', completedAt: Date.now() });
          console.debug('[useOllamaWarmStore] gemma3:4b warm-up OK');
        } else {
          set({ status: 'failed', completedAt: Date.now() });
          console.debug('[useOllamaWarmStore] warm-up falló: HTTP', res.status);
        }
      })
      .catch((err) => {
        clearTimeout(timer);
        set({ status: 'failed', completedAt: Date.now() });
        console.debug(
          '[useOllamaWarmStore] warm-up degradó (cold-start clásico):',
          err?.message,
        );
      });
  },

  /**
   * Reset explícito del store. Solo para tests — en runtime el ciclo
   * natural cubre los casos esperados (unknown → warming → warm/failed).
   */
  resetWarmup: () => {
    set({ status: 'unknown', startedAt: null, completedAt: null });
  },
}));

export default useOllamaWarmStore;
