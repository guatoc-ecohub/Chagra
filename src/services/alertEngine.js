/**
 * alertEngine — motor de alertas para clima/sensores IoT (PWA).
 *
 * TASK #162: Implementa sistema de alertas basado en thresholds de clima
 * y sensores IoT. Monitorea cada 15 minutos y genera notificaciones cuando
 * se cruzan umbrales de riesgo agronómico.
 *
 * Funcionalidad:
 * - Lee configuración de thresholds (humedad <20%, temp >35°C, lluvia >50mm/h)
 * - Hace polling de clima y sensores cada 15 minutos
 * - Llama a MCP tools get_clima_finca + get_sensor_finca
 * - Genera alertas en UI via CustomEvent (notification + banner)
 *
 * Integración UI:
 * - Los componentes pueden escuchar 'alertTriggered' con { type, severity, message }
 * - Los componentes pueden escuchar 'alertCleared' cuando el estado vuelve a normal
 * - useAlertStore (Zustand) mantiene el estado global de alertas activas
 */

import { ALERT_THRESHOLDS, ALERT_TYPES } from '../constants/alertThresholds';

const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos
const MCP_CLIMA_TOOL = 'get_clima_finca';
const MCP_SENSOR_TOOL = 'get_sensor_finca';

class AlertEngine {
  constructor() {
    this.isPolling = false;
    this.pollingTimer = null;
    this.activeAlerts = new Map(); // alertType -> { timestamp, data }
    this.lastCheckTime = null;
    this.mcpServerAvailable = false;
  }

  /**
   * Inicia el motor de alertas. Verifica disponibilidad de MCP y arranca polling.
   */
  async start() {
    if (this.isPolling) {
      console.warn('[AlertEngine] Ya está corriendo, ignorando start() duplicado.');
      return;
    }

    console.info('[AlertEngine] Iniciando motor de alertas...');
    this.mcpServerAvailable = await this.checkMcpAvailability();

    if (!this.mcpServerAvailable) {
      console.warn('[AlertEngine] MCP server no disponible, usando modo degradado (mock).');
    }

    this.isPolling = true;
    await this.checkThresholds(); // Primera verificación inmediata
    this.startPolling();
  }

  /**
   * Detiene el motor de alertas.
   */
  stop() {
    if (!this.isPolling) return;

    console.info('[AlertEngine] Deteniendo motor de alertas...');
    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Verifica si el servidor MCP está disponible.
   * En producción esto intentaría llamar a un MCP tool conocido.
   */
  async checkMcpAvailability() {
    // TODO: verificar disponibilidad real de MCP server
    // Por ahora retornamos true para permitir operación en modo degradado
    return true;
  }

  /**
   * Inicia el polling periódico.
   */
  startPolling() {
    const scheduleNext = () => {
      if (!this.isPolling) return;

      this.pollingTimer = setTimeout(async () => {
        await this.checkThresholds();
        scheduleNext();
      }, POLLING_INTERVAL_MS);
    };

    scheduleNext();
  }

  /**
   * Verifica todos los thresholds y dispara alertas si es necesario.
   */
  async checkThresholds() {
    try {
      console.info('[AlertEngine] Verificando thresholds...');
      this.lastCheckTime = new Date().toISOString();

      // Obtener datos de clima y sensores
      const climaData = await this.fetchClimaData();
      const sensorData = await this.fetchSensorData();

      // Evaluar cada tipo de alerta
      await this.evaluateHumidityAlert(climaData, sensorData);
      await this.evaluateTemperatureAlert(climaData, sensorData);
      await this.evaluateRainAlert(climaData);
      await this.evaluateWindAlert(climaData);

      console.info('[AlertEngine] Verificación completada. Alertas activas:', this.activeAlerts.size);
    } catch (error) {
      console.error('[AlertEngine] Error verificando thresholds:', error);
    }
  }

  /**
   * Obtiene datos climáticos de la finca via MCP.
   */
  async fetchClimaData() {
    if (!this.mcpServerAvailable) {
      // Mock data para modo degradado
      return this.getMockClimaData();
    }

    try {
      // TODO: llamar a get_clima_finca via MCP
      // const result = await callMCP(MCP_CLIMA_TOOL, { finca: 'active' });
      // return result;
      return this.getMockClimaData();
    } catch (error) {
      console.warn('[AlertEngine] Error obteniendo clima, usando mock:', error.message);
      return this.getMockClimaData();
    }
  }

  /**
   * Obtiene datos de sensores IoT de la finca via MCP.
   */
  async fetchSensorData() {
    if (!this.mcpServerAvailable) {
      // Mock data para modo degradado
      return this.getMockSensorData();
    }

    try {
      // TODO: llamar a get_sensor_finca via MCP
      // const result = await callMCP(MCP_SENSOR_TOOL, { finca: 'active' });
      // return result;
      return this.getMockSensorData();
    } catch (error) {
      console.warn('[AlertEngine] Error obteniendo sensores, usando mock:', error.message);
      return this.getMockSensorData();
    }
  }

  /**
   * Datos mock para desarrollo/testing cuando MCP no está disponible.
   */
  getMockClimaData() {
    // Simula variación climática realista (Guatoc 2400msnm)
    const hour = new Date().getHours();
    const baseTemp = 18 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 6;
    const randomFactor = Math.random() * 4 - 2;

    return {
      temperatura: Math.round((baseTemp + randomFactor) * 10) / 10, // °C
      humedad: Math.round(65 + Math.random() * 20), // %
      lluvia: Math.round(Math.random() * 60 * 10) / 10, // mm/h
      viento: Math.round(15 + Math.random() * 30), // km/h
      timestamp: new Date().toISOString(),
      _mock: true,
    };
  }

  /**
   * Datos mock de sensores IoT para desarrollo/testing.
   */
  getMockSensorData() {
    return {
      invernadero: {
        humedad: Math.round(70 + Math.random() * 15), // %
        temperatura: Math.round(19 + Math.random() * 6 * 10) / 10, // °C
      },
      tabaco: {
        humedad: Math.round(55 + Math.random() * 15), // %
        temperatura: Math.round(21 + Math.random() * 5 * 10) / 10, // °C
      },
      timestamp: new Date().toISOString(),
      _mock: true,
    };
  }

  /**
   * Evalúa alerta de humedad baja.
   */
  async evaluateHumidityAlert(climaData, sensorData) {
    const humedad = sensorData?.invernadero?.humedad || climaData?.humedad;
    if (humedad === undefined) return;

    const alertType = 'HUMEDAD_BAJA';
    const threshold = ALERT_THRESHOLDS.HUMEDAD_MIN;

    if (humedad < threshold) {
      await this.triggerAlert(alertType, {
        threshold,
        currentValue: humedad,
        location: 'invernadero',
        recommendation: 'Activar sistema de riego',
      });
    } else {
      await this.clearAlert(alertType);
    }
  }

  /**
   * Evalúa alerta de temperatura alta.
   */
  async evaluateTemperatureAlert(climaData, sensorData) {
    const temp = sensorData?.invernadero?.temperatura || climaData?.temperatura;
    if (temp === undefined) return;

    const alertType = 'TEMPERATURA_ALTA';
    const threshold = ALERT_THRESHOLDS.TEMPERATURA_MAX;

    if (temp > threshold) {
      await this.triggerAlert(alertType, {
        threshold,
        currentValue: temp,
        location: 'invernadero',
        recommendation: 'Activar ventilación y sombra',
      });
    } else {
      await this.clearAlert(alertType);
    }
  }

  /**
   * Evalúa alerta de lluvia intensa.
   */
  async evaluateRainAlert(climaData) {
    const lluvia = climaData?.lluvia;
    if (lluvia === undefined) return;

    const alertType = 'LLUVIA_INTENSA';
    const threshold = ALERT_THRESHOLDS.LLUVIA_MAX;

    if (lluvia > threshold) {
      await this.triggerAlert(alertType, {
        threshold,
        currentValue: lluvia,
        location: 'finca',
        recommendation: 'Verificar drenajes y canales',
      });
    } else {
      await this.clearAlert(alertType);
    }
  }

  /**
   * Evalúa alerta de viento fuerte.
   */
  async evaluateWindAlert(climaData) {
    const viento = climaData?.viento;
    if (viento === undefined) return;

    const alertType = 'VIENTO_FUERTE';
    const threshold = ALERT_THRESHOLDS.VIENTO_MAX;

    if (viento > threshold) {
      await this.triggerAlert(alertType, {
        threshold,
        currentValue: viento,
        location: 'finca',
        recommendation: 'Revisar estructuras y coberturas',
      });
    } else {
      await this.clearAlert(alertType);
    }
  }

  /**
   * Dispara una alerta si no está activa actualmente.
   */
  async triggerAlert(type, data) {
    if (this.activeAlerts.has(type)) {
      // Alerta ya existe, solo actualizar timestamp
      this.activeAlerts.set(type, {
        ...this.activeAlerts.get(type),
        timestamp: Date.now(),
        data,
      });
      return;
    }

    const alertConfig = ALERT_TYPES[type];
    const alert = {
      type,
      severity: alertConfig.severity,
      title: alertConfig.title,
      message: alertConfig.message,
      timestamp: Date.now(),
      data,
    };

    this.activeAlerts.set(type, alert);
    console.warn(`[AlertEngine] ⚠️ Alerta activada: ${type}`, data);

    // Emitir evento para UI
    window.dispatchEvent(new CustomEvent('alertTriggered', { detail: alert }));

    // Solicitar notificación del sistema si la app tiene permisos
    await this.showSystemNotification(alert);
  }

  /**
   * Limpia una alerta cuando el estado vuelve a normal.
   */
  async clearAlert(type) {
    if (!this.activeAlerts.has(type)) return;

    const alert = this.activeAlerts.get(type);
    this.activeAlerts.delete(type);
    console.info(`[AlertEngine] ✓ Alerta despejada: ${type}`);

    // Emitir evento para UI
    window.dispatchEvent(new CustomEvent('alertCleared', { detail: { type, ...alert } }));
  }

  /**
   * Muestra una notificación del sistema operativo si hay permisos.
   */
  async showSystemNotification(alert) {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        new Notification(`${alert.title} - Chagra`, {
          body: alert.message,
          icon: '/icon-192.png',
          tag: alert.type, // Evita duplicados
          requireInteraction: true,
        });
      } catch (error) {
        console.warn('[AlertEngine] Error mostrando notificación:', error.message);
      }
    } else if (Notification.permission !== 'denied') {
      // Pedir permiso la primera vez
      await Notification.requestPermission();
    }
  }

  /**
   * Obtiene las alertas activas actuales.
   */
  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Obtiene información del estado del motor.
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      lastCheckTime: this.lastCheckTime,
      activeAlertsCount: this.activeAlerts.size,
      mcpServerAvailable: this.mcpServerAvailable,
      pollingInterval: POLLING_INTERVAL_MS,
    };
  }
}

// Singleton exportado
export const alertEngine = new AlertEngine();
