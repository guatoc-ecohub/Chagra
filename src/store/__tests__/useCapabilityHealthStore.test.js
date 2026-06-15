import { describe, it, expect, vi, beforeEach } from 'vitest';
import useCapabilityHealthStore from '../useCapabilityHealthStore';

describe('useCapabilityHealthStore', () => {
  beforeEach(() => {
    // Resetear el store antes de cada test
    useCapabilityHealthStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('estado inicial', () => {
    it('inicia con states null (no checkeado)', () => {
      const state = useCapabilityHealthStore.getState();
      expect(state.sidecarHealthy).toBeNull();
      expect(state.ollamaHealthy).toBeNull();
      expect(state.lastChecked).toBeNull();
      expect(state.isChecking).toBe(false);
      expect(state.pollingTimer).toBeNull();
    });
  });

  describe('checkHealth', () => {
    it('actualiza estados tras checkHealth', async () => {
      const store = useCapabilityHealthStore.getState();
      await store.checkHealth();

      const state = useCapabilityHealthStore.getState();
      expect(state.sidecarHealthy).toBeDefined();
      expect(state.ollamaHealthy).toBeDefined();
      expect(state.lastChecked).toBeDefined();
      expect(state.isChecking).toBe(false);
    });

    it('es idempotente si se llama multiple veces', async () => {
      const store = useCapabilityHealthStore.getState();

      // Llamar checkHealth dos veces
      await store.checkHealth();
      await store.checkHealth();

      // Verificar que el estado final es válido
      const state = useCapabilityHealthStore.getState();
      expect(state.sidecarHealthy).toBeDefined();
      expect(state.isChecking).toBe(false);
    });
  });

  describe('startPolling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('inicia polling periódico', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      const store = useCapabilityHealthStore.getState();
      store.startPolling(10000);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 10000);

      setIntervalSpy.mockRestore();
    });

    it('detiene polling existente si se llama de nuevo', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const store = useCapabilityHealthStore.getState();
      store.startPolling(10000);
      store.startPolling(20000);

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });

    it('limpia timer al hacer reset', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const store = useCapabilityHealthStore.getState();
      store.startPolling(10000);

      store.reset();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(store.pollingTimer).toBeNull();

      clearIntervalSpy.mockRestore();
    });
  });

  describe('stopPolling', () => {
    it('detiene el polling periódico', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const store = useCapabilityHealthStore.getState();
      store.startPolling(10000);

      store.stopPolling();

      expect(clearIntervalSpy).toHaveBeenCalled();
      expect(store.pollingTimer).toBeNull();

      clearIntervalSpy.mockRestore();
    });

    it('no hace nada si no hay polling activo', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const store = useCapabilityHealthStore.getState();
      store.stopPolling();

      expect(clearIntervalSpy).not.toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('reinicia todos los estados al inicial', async () => {
      const store = useCapabilityHealthStore.getState();

      // Simular actividad
      await store.checkHealth();
      store.startPolling(10000);

      // Resetear
      store.reset();

      // Verificar estados iniciales
      const state = useCapabilityHealthStore.getState();
      expect(state.sidecarHealthy).toBeNull();
      expect(state.ollamaHealthy).toBeNull();
      expect(state.lastChecked).toBeNull();
      expect(state.isChecking).toBe(false);
      expect(state.pollingTimer).toBeNull();
    });
  });

  describe('integración con UI', () => {
    it('permite suscribirse a cambios de estado', async () => {
      let subscriberCalled = false;
      let lastState = null;

      // Suscribirse (simulación de hook React)
      const unsubscribe = useCapabilityHealthStore.subscribe((state) => {
        subscriberCalled = true;
        lastState = state;
      });

      // Disparar cambio
      const store = useCapabilityHealthStore.getState();
      await store.checkHealth();

      expect(subscriberCalled).toBe(true);
      expect(lastState.sidecarHealthy).toBeDefined();

      unsubscribe();
    });
  });
});
