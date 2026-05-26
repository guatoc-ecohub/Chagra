import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { alertEngine } from '../alertEngine';
import { ALERT_THRESHOLDS } from '../../constants/alertThresholds';

describe('alertEngine', () => {
  let mockDispatchedEvents;

  beforeEach(() => {
    // Mock window.dispatchEvent para capturar eventos
    mockDispatchedEvents = [];
    vi.stubGlobal('dispatchEvent', (event) => {
      mockDispatchedEvents.push(event);
      return true;
    });

    // Mock Notification API
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });

    // Reset estado del engine
    alertEngine.stop();
    alertEngine.activeAlerts.clear();
    alertEngine.lastCheckTime = null;
  });

  afterEach(() => {
    alertEngine.stop();
    vi.unstubAllGlobals();
  });

  describe('inicialización', () => {
    it('debería iniciar el motor sin errores', async () => {
      await alertEngine.start();
      expect(alertEngine.isPolling).toBe(true);
      alertEngine.stop();
    });

    it('debería rechazar start() duplicado sin crash', async () => {
      await alertEngine.start();
      await alertEngine.start(); // Segundo start debería ser ignorado
      expect(alertEngine.isPolling).toBe(true);
      alertEngine.stop();
    });

    it('debería detener el motor correctamente', async () => {
      await alertEngine.start();
      alertEngine.stop();
      expect(alertEngine.isPolling).toBe(false);
    });

    it('debería retornar estado correcto', async () => {
      await alertEngine.start();
      const status = alertEngine.getStatus();
      expect(status.isPolling).toBe(true);
      expect(typeof status.activeAlertsCount).toBe('number');
      expect(status.pollingInterval).toBe(15 * 60 * 1000);
      alertEngine.stop();
    });
  });

  describe('obtención de datos (mock)', () => {
    it('debería retornar datos mock de clima cuando MCP no está disponible', async () => {
      const climaData = await alertEngine.getMockClimaData();

      expect(climaData).toHaveProperty('temperatura');
      expect(climaData).toHaveProperty('humedad');
      expect(climaData).toHaveProperty('lluvia');
      expect(climaData).toHaveProperty('viento');
      expect(climaData).toHaveProperty('timestamp');
      expect(climaData._mock).toBe(true);

      // Verificar rangos razonables
      expect(climaData.temperatura).toBeGreaterThan(10);
      expect(climaData.temperatura).toBeLessThan(40);
      expect(climaData.humedad).toBeGreaterThanOrEqual(0);
      expect(climaData.humedad).toBeLessThanOrEqual(100);
    });

    it('debería retornar datos mock de sensores', async () => {
      const sensorData = await alertEngine.getMockSensorData();

      expect(sensorData).toHaveProperty('invernadero');
      expect(sensorData).toHaveProperty('tabaco');
      expect(sensorData).toHaveProperty('timestamp');
      expect(sensorData._mock).toBe(true);

      // Verificar estructura de invernadero
      expect(sensorData.invernadero).toHaveProperty('humedad');
      expect(sensorData.invernadero).toHaveProperty('temperatura');
    });
  });

  describe('evaluación de thresholds', () => {
    it('debería detectar humedad baja y disparar alerta', async () => {
      const climaData = { humedad: 15 }; // Below threshold
      const sensorData = { invernadero: { humedad: 15 } };

      await alertEngine.evaluateHumidityAlert(climaData, sensorData);

      expect(alertEngine.activeAlerts.has('HUMEDAD_BAJA')).toBe(true);
      const alerta = alertEngine.activeAlerts.get('HUMEDAD_BAJA');
      expect(alerta.severity).toBe('warning');
      expect(alerta.data.currentValue).toBe(15);
    });

    it('debería despejar alerta de humedad cuando vuelve a normal', async () => {
      // Primero disparar alerta
      alertEngine.activeAlerts.set('HUMEDAD_BAJA', { type: 'HUMEDAD_BAJA' });

      const climaData = { humedad: 25 }; // Above threshold
      const sensorData = { invernadero: { humedad: 25 } };

      await alertEngine.evaluateHumidityAlert(climaData, sensorData);

      expect(alertEngine.activeAlerts.has('HUMEDAD_BAJA')).toBe(false);
    });

    it('debería detectar temperatura alta y disparar alerta', async () => {
      const climaData = { temperatura: 38 }; // Above threshold
      const sensorData = { invernadero: { temperatura: 38 } };

      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);

      expect(alertEngine.activeAlerts.has('TEMPERATURA_ALTA')).toBe(true);
      const alerta = alertEngine.activeAlerts.get('TEMPERATURA_ALTA');
      expect(alerta.severity).toBe('danger');
      expect(alerta.data.currentValue).toBe(38);
    });

    it('debería detectar lluvia intensa y disparar alerta', async () => {
      const climaData = { lluvia: 55 }; // Above threshold

      await alertEngine.evaluateRainAlert(climaData);

      expect(alertEngine.activeAlerts.has('LLUVIA_INTENSA')).toBe(true);
      const alerta = alertEngine.activeAlerts.get('LLUVIA_INTENSA');
      expect(alerta.severity).toBe('danger');
      expect(alerta.data.currentValue).toBe(55);
    });

    it('debería detectar viento fuerte y disparar alerta', async () => {
      const climaData = { viento: 45 }; // Above threshold

      await alertEngine.evaluateWindAlert(climaData);

      expect(alertEngine.activeAlerts.has('VIENTO_FUERTE')).toBe(true);
      const alerta = alertEngine.activeAlerts.get('VIENTO_FUERTE');
      expect(alerta.severity).toBe('warning');
      expect(alerta.data.currentValue).toBe(45);
    });

    it('no debería disparar alerta si valores están dentro de rango', async () => {
      const climaData = {
        temperatura: 25, // Normal
        humedad: 65, // Normal
        lluvia: 10, // Normal
        viento: 20, // Normal
      };
      const sensorData = {
        invernadero: {
          temperatura: 22,
          humedad: 70,
        },
      };

      await alertEngine.evaluateHumidityAlert(climaData, sensorData);
      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);
      await alertEngine.evaluateRainAlert(climaData);
      await alertEngine.evaluateWindAlert(climaData);

      expect(alertEngine.activeAlerts.size).toBe(0);
    });
  });

  describe('manejo de eventos UI', () => {
    it('debería emitir evento alertTriggered cuando se dispara alerta', async () => {
      const climaData = { temperatura: 38 };
      const sensorData = { invernadero: { temperatura: 38 } };

      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);

      expect(mockDispatchedEvents.length).toBeGreaterThan(0);
      const alertEvent = mockDispatchedEvents.find((e) => e.type === 'alertTriggered');
      expect(alertEvent).toBeDefined();
      expect(alertEvent.detail.type).toBe('TEMPERATURA_ALTA');
      expect(alertEvent.detail.severity).toBe('danger');
    });

    it('debería emitir evento alertCleared cuando se despeja alerta', async () => {
      // Primero crear alerta
      alertEngine.activeAlerts.set('HUMEDAD_BAJA', {
        type: 'HUMEDAD_BAJA',
        severity: 'warning',
      });

      const climaData = { humedad: 25 };
      const sensorData = { invernadero: { humedad: 25 } };

      await alertEngine.evaluateHumidityAlert(climaData, sensorData);

      const clearEvent = mockDispatchedEvents.find((e) => e.type === 'alertCleared');
      expect(clearEvent).toBeDefined();
      expect(clearEvent.detail.type).toBe('HUMEDAD_BAJA');
    });

    it('no debería emitir evento si alerta ya existe (update)', async () => {
      // Crear alerta existente
      alertEngine.activeAlerts.set('TEMPERATURA_ALTA', {
        type: 'TEMPERATURA_ALTA',
        timestamp: Date.now() - 1000,
      });

      mockDispatchedEvents.length = 0; // Limpiar eventos previos

      const climaData = { temperatura: 38 };
      const sensorData = { invernadero: { temperatura: 38 } };

      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);

      // No debería emitir alertTriggered porque la alerta ya existía
      const alertEvent = mockDispatchedEvents.find((e) => e.type === 'alertTriggered');
      expect(alertEvent).toBeUndefined();
    });
  });

  describe('múltiples alertas simultáneas', () => {
    it('debería manejar múltiples alertas activas', async () => {
      const climaData = {
        temperatura: 38, // Danger
        humedad: 15, // Warning
        lluvia: 55, // Danger
        viento: 45, // Warning
      };
      const sensorData = {
        invernadero: {
          temperatura: 38,
          humedad: 15,
        },
      };

      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);
      await alertEngine.evaluateHumidityAlert(climaData, sensorData);
      await alertEngine.evaluateRainAlert(climaData);
      await alertEngine.evaluateWindAlert(climaData);

      expect(alertEngine.activeAlerts.size).toBe(4);
      expect(alertEngine.activeAlerts.has('TEMPERATURA_ALTA')).toBe(true);
      expect(alertEngine.activeAlerts.has('HUMEDAD_BAJA')).toBe(true);
      expect(alertEngine.activeAlerts.has('LLUVIA_INTENSA')).toBe(true);
      expect(alertEngine.activeAlerts.has('VIENTO_FUERTE')).toBe(true);
    });

    it('debería retornar todas las alertas activas', async () => {
      alertEngine.activeAlerts.set('TEMPERATURA_ALTA', { type: 'TEMPERATURA_ALTA', severity: 'danger' });
      alertEngine.activeAlerts.set('HUMEDAD_BAJA', { type: 'HUMEDAD_BAJA', severity: 'warning' });

      const activeAlerts = alertEngine.getActiveAlerts();
      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts.find((a) => a.type === 'TEMPERATURA_ALTA')).toBeDefined();
      expect(activeAlerts.find((a) => a.type === 'HUMEDAD_BAJA')).toBeDefined();
    });
  });

  describe('thresholds configurables', () => {
    it('debería usar valores de ALERT_THRESHOLDS', () => {
      expect(ALERT_THRESHOLDS.HUMEDAD_MIN).toBe(20);
      expect(ALERT_THRESHOLDS.TEMPERATURA_MAX).toBe(35);
      expect(ALERT_THRESHOLDS.LLUVIA_MAX).toBe(50);
      expect(ALERT_THRESHOLDS.VIENTO_MAX).toBe(40);
    });

    it('debería respetar threshold exacto (frontera)', async () => {
      // Valores justo en el threshold no deberían disparar alerta
      const climaData = {
        temperatura: 35, // Exacto al threshold
        humedad: 20, // Exacto al threshold
        lluvia: 50, // Exacto al threshold
        viento: 40, // Exacto al threshold
      };
      const sensorData = {
        invernadero: {
          temperatura: 35,
          humedad: 20,
        },
      };

      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);
      await alertEngine.evaluateHumidityAlert(climaData, sensorData);
      await alertEngine.evaluateRainAlert(climaData);
      await alertEngine.evaluateWindAlert(climaData);

      expect(alertEngine.activeAlerts.size).toBe(0);
    });

    it('debería disparar con valores 1 unidad sobre threshold', async () => {
      const climaData = {
        temperatura: 36, // 1 sobre threshold
      };
      const sensorData = {
        invernadero: { temperatura: 36 },
      };

      await alertEngine.evaluateTemperatureAlert(climaData, sensorData);

      expect(alertEngine.activeAlerts.has('TEMPERATURA_ALTA')).toBe(true);
    });
  });

  describe('integración verificación completa', () => {
    it('debería ejecutar checkThresholds sin errores', async () => {
      await alertEngine.checkThresholds();
      expect(alertEngine.lastCheckTime).toBeDefined();
      expect(typeof alertEngine.lastCheckTime).toBe('string');
    });

    it('debería manejar errores gracefully si fetch falla', async () => {
      // Mock fetchClimaData para lanzar error
      vi.spyOn(alertEngine, 'fetchClimaData').mockRejectedValue(new Error('Network error'));

      await expect(alertEngine.checkThresholds()).resolves.not.toThrow();
      expect(alertEngine.lastCheckTime).toBeDefined();
    });
  });
});
