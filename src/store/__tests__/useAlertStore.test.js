import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import useAlertStore from '../useAlertStore';

describe('useAlertStore', () => {
  beforeEach(() => {
    // Limpiar estado del store
    useAlertStore.setState({
      activeAlerts: [],
      lastUpdate: null,
      engineStatus: null,
      listenersInitialized: false,
    });
  });

  afterEach(() => {
    // Limpiar store después de cada test
    useAlertStore.setState({
      activeAlerts: [],
      lastUpdate: null,
      engineStatus: null,
      listenersInitialized: false,
    });
  });

  describe('inicialización', () => {
    it('debería inicializar con estado vacío', () => {
      const state = useAlertStore.getState();
      expect(state.activeAlerts).toEqual([]);
      expect(state.lastUpdate).toBeNull();
      expect(state.engineStatus).toBeNull();
    });

    it('debería tener initializeListeners function disponible', () => {
      const state = useAlertStore.getState();
      expect(typeof state.initializeListeners).toBe('function');
    });

    it('debería registrar listeners cuando se llama a initializeListeners', () => {
      const state = useAlertStore.getState();
      expect(state.listenersInitialized).toBe(false);

      state.initializeListeners();

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.listenersInitialized).toBe(true);
    });

    it('debería registrar event listeners al inicializar', () => {
      const state = useAlertStore.getState();
      state.initializeListeners();

      // Verificar que podemos disparar eventos sin errores
      const testEvent = new CustomEvent('alertTriggered', {
        detail: { type: 'TEST', severity: 'warning', timestamp: Date.now() },
      });
      expect(() => window.dispatchEvent(testEvent)).not.toThrow();

      // Verificar que el evento fue procesado
      const stateAfter = useAlertStore.getState();
      expect(stateAfter.activeAlerts).toHaveLength(1);
    });
  });

  describe('manejo de eventos alertTriggered', () => {
    beforeEach(() => {
      useAlertStore.getState().initializeListeners();
    });

    it('debería agregar alerta cuando recibe evento alertTriggered', () => {
      const alertMock = {
        type: 'TEMPERATURA_ALTA',
        severity: 'danger',
        title: 'Temperatura Elevada',
        message: 'Alerta de prueba',
        timestamp: Date.now(),
      };

      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertMock }));

      const state = useAlertStore.getState();
      expect(state.activeAlerts).toHaveLength(1);
      expect(state.activeAlerts[0]).toMatchObject({
        type: 'TEMPERATURA_ALTA',
        severity: 'danger',
      });
      expect(state.lastUpdate).toBeTruthy();
    });

    it('debería reemplazar alerta existente del mismo tipo', () => {
      const alertV1 = {
        type: 'HUMEDAD_BAJA',
        severity: 'warning',
        title: 'Humedad Baja',
        message: 'Primera versión',
        timestamp: Date.now() - 1000,
      };

      const alertV2 = {
        type: 'HUMEDAD_BAJA',
        severity: 'warning',
        title: 'Humedad Baja',
        message: 'Segunda versión actualizada',
        timestamp: Date.now(),
      };

      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertV1 }));
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertV2 }));

      const state = useAlertStore.getState();
      expect(state.activeAlerts).toHaveLength(1);
      expect(state.activeAlerts[0].message).toBe('Segunda versión actualizada');
    });

    it('debería mantener múltiples alertas de diferentes tipos', () => {
      const alert1 = {
        type: 'TEMPERATURA_ALTA',
        severity: 'danger',
        timestamp: Date.now(),
      };

      const alert2 = {
        type: 'HUMEDAD_BAJA',
        severity: 'warning',
        timestamp: Date.now(),
      };

      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alert1 }));
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alert2 }));

      const state = useAlertStore.getState();
      expect(state.activeAlerts).toHaveLength(2);
    });
  });

  describe('manejo de eventos alertCleared', () => {
    beforeEach(() => {
      useAlertStore.getState().initializeListeners();

      // Agregar una alerta primero
      const alertMock = {
        type: 'LLUVIA_INTENSA',
        severity: 'danger',
        timestamp: Date.now(),
      };
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertMock }));
    });

    it('debería eliminar alerta cuando recibe evento alertCleared', () => {
      const stateBefore = useAlertStore.getState();
      expect(stateBefore.activeAlerts).toHaveLength(1);

      window.dispatchEvent(
        new CustomEvent('alertCleared', {
          detail: { type: 'LLUVIA_INTENSA' },
        })
      );

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.activeAlerts).toHaveLength(0);
    });

    it('solo debería eliminar la alerta específica', () => {
      // Agregar segunda alerta
      const alert2 = {
        type: 'VIENTO_FUERTE',
        severity: 'warning',
        timestamp: Date.now(),
      };
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alert2 }));

      const stateBefore = useAlertStore.getState();
      expect(stateBefore.activeAlerts).toHaveLength(2);

      // Limpiar solo una
      window.dispatchEvent(
        new CustomEvent('alertCleared', {
          detail: { type: 'LLUVIA_INTENSA' },
        })
      );

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.activeAlerts).toHaveLength(1);
      expect(stateAfter.activeAlerts[0].type).toBe('VIENTO_FUERTE');
    });
  });

  describe('métodos de utilidad', () => {
    beforeEach(() => {
      useAlertStore.getState().initializeListeners();

      // Agregar alertas de prueba
      const alerts = [
        { type: 'TEMPERATURA_ALTA', severity: 'danger', title: 'T1', message: 'M1', timestamp: Date.now() },
        { type: 'HUMEDAD_BAJA', severity: 'warning', title: 'T2', message: 'M2', timestamp: Date.now() },
        { type: 'LLUVIA_INTENSA', severity: 'danger', title: 'T3', message: 'M3', timestamp: Date.now() },
      ];

      alerts.forEach((alert) => {
        window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alert }));
      });
    });

    it('dismissAlert debería eliminar alerta específica', () => {
      const state = useAlertStore.getState();
      expect(state.activeAlerts).toHaveLength(3);

      state.dismissAlert('HUMEDAD_BAJA');

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.activeAlerts).toHaveLength(2);
      expect(stateAfter.activeAlerts.find((a) => a.type === 'HUMEDAD_BAJA')).toBeUndefined();
    });

    it('clearAll debería eliminar todas las alertas', () => {
      const state = useAlertStore.getState();
      expect(state.activeAlerts).toHaveLength(3);

      state.clearAll();

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.activeAlerts).toHaveLength(0);
    });

    it('getAlertsBySeverity debería filtrar correctamente', () => {
      const state = useAlertStore.getState();
      const dangerAlerts = state.getAlertsBySeverity('danger');
      expect(dangerAlerts).toHaveLength(2);
      expect(dangerAlerts.every((a) => a.severity === 'danger')).toBe(true);
    });

    it('hasDangerAlerts debería retornar true si hay alertas danger', () => {
      const state = useAlertStore.getState();
      expect(state.hasDangerAlerts()).toBe(true);
    });

    it('hasDangerAlerts debería retornar false si no hay alertas danger', () => {
      useAlertStore.getState().clearAll();

      const alertWarning = {
        type: 'VIENTO_FUERTE',
        severity: 'warning',
        title: 'W',
        message: 'M',
        timestamp: Date.now(),
      };
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertWarning }));

      const state = useAlertStore.getState();
      expect(state.hasDangerAlerts()).toBe(false);
    });

    it('countBySeverity debería contar correctamente', () => {
      const state = useAlertStore.getState();
      const counts = state.countBySeverity();

      expect(counts.danger).toBe(2);
      expect(counts.warning).toBe(1);
      expect(counts.info).toBe(0);
    });
  });

  describe('manejo de eventos engineStatus', () => {
    beforeEach(() => {
      useAlertStore.getState().initializeListeners();
    });

    it('debería actualizar engineStatus al recibir evento', () => {
      const statusMock = {
        isPolling: true,
        lastCheckTime: new Date().toISOString(),
        activeAlertsCount: 2,
      };

      window.dispatchEvent(new CustomEvent('alertEngineStatus', { detail: statusMock }));

      const state = useAlertStore.getState();
      expect(state.engineStatus).toMatchObject(statusMock);
    });
  });

  describe('actualización de lastUpdate', () => {
    beforeEach(() => {
      useAlertStore.getState().initializeListeners();
    });

    it('debería actualizar lastUpdate en cada evento', async () => {
      // Primero agregar una alerta para que lastUpdate tenga un valor
      const alertMock1 = {
        type: 'INITIAL',
        severity: 'info',
        timestamp: Date.now(),
      };
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertMock1 }));

      const state = useAlertStore.getState();
      const initialUpdate = state.lastUpdate;

      // Esperar un poco para asegurar timestamp diferente
      await new Promise((resolve) => setTimeout(resolve, 10));

      const alertMock = {
        type: 'TEST',
        severity: 'info',
        timestamp: Date.now(),
      };
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertMock }));

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.lastUpdate).toBeGreaterThan(initialUpdate);
    });

    it('dismissAlert debería actualizar lastUpdate', async () => {
      const alertMock = {
        type: 'TEST',
        severity: 'info',
        timestamp: Date.now(),
      };
      window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alertMock }));

      const state = useAlertStore.getState();
      const initialUpdate = state.lastUpdate;

      await new Promise((resolve) => setTimeout(resolve, 10));

      state.dismissAlert('TEST');

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.lastUpdate).toBeGreaterThan(initialUpdate);
    });
  });

  describe('edge cases', () => {
    it('debería manejar alertCleared para tipo inexistente sin crash', () => {
      const state = useAlertStore.getState();
      state.initializeListeners();

      expect(() => {
        window.dispatchEvent(new CustomEvent('alertCleared', { detail: { type: 'INEXISTENTE' } }));
      }).not.toThrow();

      const stateAfter = useAlertStore.getState();
      expect(stateAfter.activeAlerts).toHaveLength(0);
    });

    it('debería manejar dismissAlert para tipo inexistente sin crash', () => {
      const state = useAlertStore.getState();

      expect(() => {
        state.dismissAlert('INEXISTENTE');
      }).not.toThrow();
    });

    it('debería manejar múltiples initializeListeners sin duplicar listeners', () => {
      const state = useAlertStore.getState();

      state.initializeListeners();
      state.initializeListeners();
      state.initializeListeners();

      // La implementación debería prevenir duplicación
      const stateAfter = useAlertStore.getState();
      expect(stateAfter.listenersInitialized).toBe(true);
    });
  });
});
