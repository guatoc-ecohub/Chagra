import { create } from 'zustand';

/**
 * Helper para resetear el store en los tests.
 * Exportamos esto para poder usarlo en los tests.
 */
export const resetAlertStore = () => {
  useAlertStore.setState({
    activeAlerts: [],
    lastUpdate: null,
    engineStatus: null,
    listenersInitialized: false,
  });
};

/**
 * useAlertStore — estado global de alertas clima/sensor (TASK #162).
 *
 * Este store mantiene las alertas activas y expone métodos para
 * actualizarlas cuando el alertEngine dispara eventos custom.
 *
 * Integración con AlertEngine:
 * - El store escucha eventos 'alertTriggered' y 'alertCleared'
 * - Actualiza automáticamente el estado cuando llegan nuevos eventos
 * - Los componentes UI consumen este estado para mostrar banners/notificaciones
 *
 * Características:
 * - activeAlerts: Map de alertas activas (type -> alert object)
 * - lastUpdate: timestamp de última actualización
 * - dismissAlert: método para descartar alertas manualmente
 * - clearAll: método para limpiar todas las alertas
 */
const useAlertStore = create((set, get) => ({
  activeAlerts: [],
  lastUpdate: null,
  engineStatus: null,
  listenersInitialized: false,

  /**
   * Inicializa los listeners de eventos del alertEngine.
   * Llamar esto una vez en el mount de la app (ej. App.jsx).
   */
  initializeListeners: () => {
    if (get().listenersInitialized) return;

    // Escuchar nuevas alertas
    const handleAlertTriggered = (event) => {
      const newAlert = event.detail;
      set((state) => {
        // Reemplazar alerta existente del mismo tipo o agregar nueva
        const existingIndex = state.activeAlerts.findIndex((a) => a.type === newAlert.type);
        let updatedAlerts;

        if (existingIndex >= 0) {
          updatedAlerts = [...state.activeAlerts];
          updatedAlerts[existingIndex] = newAlert;
        } else {
          updatedAlerts = [...state.activeAlerts, newAlert];
        }

        return {
          activeAlerts: updatedAlerts,
          lastUpdate: Date.now(),
        };
      });
    };

    // Escuchar alertas despejadas
    const handleAlertCleared = (event) => {
      const { type } = event.detail;
      set((state) => ({
        activeAlerts: state.activeAlerts.filter((a) => a.type !== type),
        lastUpdate: Date.now(),
      }));
    };

    // Escuchar actualizaciones de estado del motor
    const handleEngineStatus = (event) => {
      set({ engineStatus: event.detail });
    };

    window.addEventListener('alertTriggered', handleAlertTriggered);
    window.addEventListener('alertCleared', handleAlertCleared);
    window.addEventListener('alertEngineStatus', handleEngineStatus);

    set({ listenersInitialized: true });
  },

  /**
   * Descarta una alerta específica manualmente (no la elimina del engine,
   * solo de la UI). El engine la volverá a disparar si el persiste.
   */
  dismissAlert: (type) => {
    set((state) => ({
      activeAlerts: state.activeAlerts.filter((a) => a.type !== type),
      lastUpdate: Date.now(),
    }));
  },

  /**
   * Limpia todas las alertas de la UI (no afecta el engine).
   */
  clearAll: () => {
    set({
      activeAlerts: [],
      lastUpdate: Date.now(),
    });
  },

  /**
   * Obtiene alertas filtradas por severidad.
   */
  getAlertsBySeverity: (severity) => {
    return get().activeAlerts.filter((a) => a.severity === severity);
  },

  /**
   * Verifica si hay alertas de danger activas.
   */
  hasDangerAlerts: () => {
    return get().activeAlerts.some((a) => a.severity === 'danger');
  },

  /**
   * Cuenta alertas por severidad.
   */
  countBySeverity: () => {
    const alerts = get().activeAlerts;
    return {
      danger: alerts.filter((a) => a.severity === 'danger').length,
      warning: alerts.filter((a) => a.severity === 'warning').length,
      info: alerts.filter((a) => a.severity === 'info').length,
    };
  },
}));

export default useAlertStore;
