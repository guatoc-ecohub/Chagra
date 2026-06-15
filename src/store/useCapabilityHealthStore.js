import { create } from 'zustand';

/**
 * useCapabilityHealthStore — bus global de estado health de servicios.
 *
 * Expone el estado dinámico del sidecar y ollama para que el UI pueda
 * reaccionar en tiempo real a cambios de disponibilidad. El store se
 * actualiza periódicamente (polling) o cuando el usuario lo solicita.
 *
 * Estados:
 *   - sidecarHealthy: true/false/null (null = no checkeado aún)
 *   - ollamaHealthy: true/false/null
 *   - lastChecked: timestamp del último check exitoso
 *   - isChecking: true si hay un check en progreso
 *
 * Uso:
 *   - checkHealth(): dispara un check inmediato de ambos servicios
 *   - startPolling(intervalMs): checks automáticos periódicos
 *   - stopPolling(): detiene polling
 */
const useCapabilityHealthStore = create((set, get) => ({
  sidecarHealthy: null,
  ollamaHealthy: null,
  lastChecked: null,
  isChecking: false,
  pollingTimer: null,

  /**
   * Dispara un health check de ambos servicios.
   * Actualiza el store con los resultados.
   */
  checkHealth: async () => {
    const { isChecking } = get();
    if (isChecking) return; // Ya hay un check en progreso

    set({ isChecking: true });

    try {
      // Importar funciones de health check dinámico
      const { checkSidecarHealth, checkOllamaHealth } = await import('../services/capabilityHealth.js');

      // Checks en paralelo para speed
      const [sidecarOk, ollamaOk] = await Promise.all([
        checkSidecarHealth().catch(() => false),
        checkOllamaHealth().catch(() => false),
      ]);

      set({
        sidecarHealthy: sidecarOk,
        ollamaHealthy: ollamaOk,
        lastChecked: Date.now(),
        isChecking: false,
      });
    } catch (err) {
      // Si falla el import o los checks, marcamos como no healthy
      set({
        sidecarHealthy: false,
        ollamaHealthy: false,
        lastChecked: Date.now(),
        isChecking: false,
      });
    }
  },

  /**
   * Inicia polling periódico de health checks.
   *
   * @param {number} intervalMs - intervalo en ms (default: 60000 = 1 minuto)
   */
  startPolling: (intervalMs = 60000) => {
    const { pollingTimer } = get();

    // Detener polling existente si lo hay
    if (pollingTimer) {
      clearInterval(pollingTimer);
    }

    // Check inmediato + polling periódico
    const { checkHealth } = get();
    checkHealth(); // fire-and-forget

    const timer = setInterval(() => {
      checkHealth(); // fire-and-forget
    }, intervalMs);

    set({ pollingTimer: timer });
  },

  /**
   * Detiene el polling periódico.
   */
  stopPolling: () => {
    const { pollingTimer } = get();
    if (pollingTimer) {
      clearInterval(pollingTimer);
      set({ pollingTimer: null });
    }
  },

  /**
   * Reset explícito del store. Solo para tests.
   */
  reset: () => {
    const { pollingTimer, stopPolling } = get();
    if (pollingTimer) {
      stopPolling();
    }
    set({
      sidecarHealthy: null,
      ollamaHealthy: null,
      lastChecked: null,
      isChecking: false,
      pollingTimer: null,
    });
  },
}));

export default useCapabilityHealthStore;
