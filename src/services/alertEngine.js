/**
 * alertEngine — motor de alertas para clima/sensores (PWA).
 *
 * TASK #162 + alertas-reales (2026-05-30): el motor ahora consume CLIMA REAL.
 *
 * Antes: este motor era 100% mock (getMockClimaData / getMockSensorData) y
 * nunca generaba alertas reales. Ahora:
 *
 *   - CLIMA: REAL. Consume climaService.fetchClimaSnapshot({lat,lng}) usando
 *     las coordenadas del perfil/finca. Deriva alertas del pronóstico de 7 días
 *     de Open-Meteo (helada por piso térmico, ola de calor, lluvia torrencial,
 *     racha seca, viento fuerte) con timestamp + fuente. Si NO hay coordenadas,
 *     degrada limpio: no inventa clima ni dispara alertas falsas.
 *
 *   - ENSO: las alertas sensibles a sequía/helada se ANOTAN con el contexto
 *     regional ENSO (ensoContext) cuando la fase o la región lo ameritan.
 *
 *   - SENSORES IoT: siguen siendo DEMO (no hay hardware todavía). Por defecto
 *     NO se evalúan, para no contaminar el botón de alertas con datos falsos.
 *     Si se habilitan (enableSensorDemo()), las alertas salen marcadas
 *     `_demo: true` para que la UI las etiquete como simulado.
 *
 * Integración UI (sin cambios de contrato):
 *   - Los componentes escuchan 'alertTriggered' con { type, severity, message, ... }
 *   - Los componentes escuchan 'alertCleared' cuando el estado vuelve a normal
 *   - useAlertStore (Zustand) mantiene el estado global de alertas activas
 */

import {
  ALERT_THRESHOLDS,
  ALERT_TYPES,
  FORECAST_THRESHOLDS,
  FORECAST_ALERT_TYPES,
} from '../constants/alertThresholds';
import { fetchClimaSnapshot } from './climaService';
import { getProfile } from './userProfileService';
import { annotateAlertWithEnso, regionFromProfile } from './ensoContext';

const POLLING_INTERVAL_MS = 15 * 60 * 1000; // 15 minutos
const SOURCE_OPENMETEO = 'Open-Meteo (pronóstico 7d) · umbrales agroecológicos Chagra';
const AUTHORITY = 'IDEAM / ICA (autoridad meteorológica y fitosanitaria)';

class AlertEngine {
  constructor() {
    this.isPolling = false;
    this.pollingTimer = null;
    this.activeAlerts = new Map(); // alertType -> alert object
    this.lastCheckTime = null;
    this.lastClimaSnapshot = null;
    // Sensores IoT: demo OFF por defecto (no hay hardware). El clima SÍ es real.
    this.sensorDemoEnabled = false;
  }

  /**
   * Inicia el motor de alertas y arranca el polling.
   */
  async start() {
    if (this.isPolling) {
      console.warn('[AlertEngine] Ya está corriendo, ignorando start() duplicado.');
      return;
    }
    console.info('[AlertEngine] Iniciando motor de alertas (clima real)...');
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
   * Habilita la evaluación de sensores IoT DEMO (datos simulados). Off por
   * defecto. Cuando se habilita, las alertas de sensor salen con `_demo:true`.
   */
  enableSensorDemo(on = true) {
    this.sensorDemoEnabled = !!on;
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
   * Resuelve las coordenadas de la finca desde el perfil del usuario.
   * @returns {{ lat:number, lng:number } | null}
   */
  resolveCoords() {
    try {
      const p = getProfile();
      const lat = Number(p.ubicacion_lat);
      const lng = Number(p.ubicacion_lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    } catch (e) {
      console.debug('[AlertEngine] No se pudo leer coords del perfil:', e?.message);
    }
    return null;
  }

  /**
   * Resuelve el piso térmico del perfil (para el umbral de helada).
   * @returns {string} slug ('paramo'|'frio'|'templado'|'calido'|'default')
   */
  resolvePisoTermico() {
    try {
      const p = getProfile();
      const piso = (p.piso_termico || '').toLowerCase().trim();
      if (piso.includes('paramo') || piso.includes('páramo')) return 'paramo';
      if (piso.includes('frio') || piso.includes('frío')) return 'frio';
      if (piso.includes('templado')) return 'templado';
      if (piso.includes('calido') || piso.includes('cálido')) return 'calido';
      // Fallback por altitud si no hay piso térmico explícito.
      const alt = Number(p.finca_altitud);
      if (Number.isFinite(alt)) {
        if (alt >= 3000) return 'paramo';
        if (alt >= 2000) return 'frio';
        if (alt >= 1000) return 'templado';
        return 'calido';
      }
    } catch (_) { /* noop */ }
    return 'default';
  }

  /**
   * Verifica todos los thresholds y dispara alertas si es necesario.
   */
  async checkThresholds() {
    try {
      console.info('[AlertEngine] Verificando thresholds (clima real)...');
      this.lastCheckTime = new Date().toISOString();

      // --- CLIMA REAL (Open-Meteo via sidecar) ---
      const climaSnapshot = await this.fetchClimaData();
      await this.evaluateForecastAlerts(climaSnapshot);

      // --- SENSORES IoT (DEMO, opt-in) ---
      if (this.sensorDemoEnabled) {
        const sensorData = await this.fetchSensorData();
        await this.evaluateHumidityAlert(null, sensorData);
        await this.evaluateTemperatureAlert(null, sensorData);
      }

      console.info('[AlertEngine] Verificación completada. Alertas activas:', this.activeAlerts.size);
    } catch (error) {
      console.error('[AlertEngine] Error verificando thresholds:', error);
    }
  }

  /**
   * Obtiene el snapshot de clima REAL del sidecar usando coords del perfil.
   * Devuelve null si no hay coords o el sidecar no responde (degradación limpia,
   * SIN mock).
   *
   * @returns {Promise<object|null>}
   */
  async fetchClimaData() {
    const coords = this.resolveCoords();
    if (!coords) {
      console.info('[AlertEngine] Sin coordenadas en el perfil — no se evalúa clima (degradación limpia, sin mock).');
      this.lastClimaSnapshot = null;
      return null;
    }
    try {
      const snapshot = await fetchClimaSnapshot({ lat: coords.lat, lng: coords.lng });
      this.lastClimaSnapshot = snapshot || null;
      return snapshot || null;
    } catch (error) {
      console.warn('[AlertEngine] Error obteniendo clima real:', error?.message);
      this.lastClimaSnapshot = null;
      return null;
    }
  }

  /**
   * Deriva alertas reales desde el pronóstico de 7 días de Open-Meteo y las
   * anota con contexto ENSO regional. Cada alerta lleva timestamp + fuente.
   *
   * Tipos: HELADA (umbral por piso térmico), OLA_CALOR, LLUVIA_TORRENCIAL,
   * RACHA_SECA, VIENTO_FUERTE_FORECAST.
   *
   * @param {object|null} snapshot
   */
  async evaluateForecastAlerts(snapshot) {
    const forecast = snapshot?.openmeteo?.available ? snapshot.openmeteo.forecast_7d : null;
    const present = new Set();

    if (Array.isArray(forecast) && forecast.length > 0) {
      const piso = this.resolvePisoTermico();
      const heladaUmbral = FORECAST_THRESHOLDS.HELADA_MIN_C[piso] ?? FORECAST_THRESHOLDS.HELADA_MIN_C.default;
      const enso = snapshot?.enso_status || {};
      const region = regionFromProfile(getProfile());
      const ensoCtx = { phase: enso.phase || 'neutral', region };

      // HELADA — primer día que cruza el umbral del piso térmico.
      const heladaDia = forecast.find(
        (d) => typeof d.temp_min_c === 'number' && d.temp_min_c <= heladaUmbral,
      );
      if (heladaDia) {
        present.add('HELADA');
        this.triggerForecastAlert('HELADA', {
          dia: heladaDia.date,
          valor: heladaDia.temp_min_c,
          umbral: heladaUmbral,
          piso_termico: piso,
          severity: heladaDia.temp_min_c <= 0 ? 'danger' : 'warning',
          detail: `Mínima de ${heladaDia.temp_min_c}°C el ${heladaDia.date} (umbral ${heladaUmbral}°C para piso ${piso}). Cubre los cultivos sensibles antes del anochecer.`,
        }, ensoCtx);
      }

      // OLA DE CALOR — primer día que cruza el umbral de calor.
      const calorDia = forecast.find(
        (d) => typeof d.temp_max_c === 'number' && d.temp_max_c >= FORECAST_THRESHOLDS.CALOR_EXTREMO_MAX_C,
      );
      if (calorDia) {
        present.add('OLA_CALOR');
        this.triggerForecastAlert('OLA_CALOR', {
          dia: calorDia.date,
          valor: calorDia.temp_max_c,
          umbral: FORECAST_THRESHOLDS.CALOR_EXTREMO_MAX_C,
          severity: calorDia.temp_max_c >= FORECAST_THRESHOLDS.CALOR_EXTREMO_CRITICO_C ? 'danger' : 'warning',
          detail: `Máxima de ${calorDia.temp_max_c}°C el ${calorDia.date}. Riega temprano y aplica mulch para reducir el estrés hídrico.`,
        }, ensoCtx);
      }

      // LLUVIA TORRENCIAL — primer día que cruza el umbral de precipitación.
      const lluviaDia = forecast.find(
        (d) => typeof d.precip_mm === 'number' && d.precip_mm >= FORECAST_THRESHOLDS.LLUVIA_TORRENCIAL_MM_DIA,
      );
      if (lluviaDia) {
        present.add('LLUVIA_TORRENCIAL');
        this.triggerForecastAlert('LLUVIA_TORRENCIAL', {
          dia: lluviaDia.date,
          valor: lluviaDia.precip_mm,
          umbral: FORECAST_THRESHOLDS.LLUVIA_TORRENCIAL_MM_DIA,
          severity: lluviaDia.precip_mm >= FORECAST_THRESHOLDS.LLUVIA_TORRENCIAL_CRITICA_MM_DIA ? 'danger' : 'warning',
          detail: `${lluviaDia.precip_mm} mm el ${lluviaDia.date}. Revisa drenajes y evita labores en ladera.`,
        }, ensoCtx);
      }

      // RACHA SECA — N días consecutivos con precip < umbral.
      const dryRun = this.longestDryRun(forecast, FORECAST_THRESHOLDS.SEQUIA_MM_DIA);
      if (dryRun.length >= FORECAST_THRESHOLDS.SEQUIA_DIAS_SEGUIDOS) {
        present.add('RACHA_SECA');
        this.triggerForecastAlert('RACHA_SECA', {
          dias: dryRun.map((d) => d.date),
          valor: dryRun.length,
          umbral: FORECAST_THRESHOLDS.SEQUIA_DIAS_SEGUIDOS,
          severity: 'warning',
          detail: `Periodo seco previsto (${dryRun.length} días sin lluvia significativa). Programa riego eficiente y conserva humedad con mulch.`,
        }, ensoCtx);
      }

      // VIENTO FUERTE — primer día que cruza el umbral de viento.
      const vientoDia = forecast.find(
        (d) => typeof d.wind_max_kmh === 'number' && d.wind_max_kmh >= FORECAST_THRESHOLDS.VIENTO_FUERTE_KMH,
      );
      if (vientoDia) {
        present.add('VIENTO_FUERTE_FORECAST');
        this.triggerForecastAlert('VIENTO_FUERTE_FORECAST', {
          dia: vientoDia.date,
          valor: vientoDia.wind_max_kmh,
          umbral: FORECAST_THRESHOLDS.VIENTO_FUERTE_KMH,
          severity: vientoDia.wind_max_kmh >= FORECAST_THRESHOLDS.VIENTO_FUERTE_CRITICO_KMH ? 'danger' : 'warning',
          detail: `Viento máx ${vientoDia.wind_max_kmh} km/h el ${vientoDia.date}. Tutora plantas altas y cosecha fruta madura para evitar caída.`,
        }, ensoCtx);
      }
    }

    // Despeja las alertas de pronóstico que ya no aplican.
    for (const type of Object.keys(FORECAST_ALERT_TYPES)) {
      if (!present.has(type) && this.activeAlerts.has(type)) {
        await this.clearAlert(type);
      }
    }
  }

  /**
   * Devuelve la racha seca más larga (días consecutivos con precip < umbral).
   * @returns {object[]} subarray del forecast
   */
  longestDryRun(forecast, umbral) {
    let best = [];
    let cur = [];
    for (const d of forecast) {
      if (typeof d.precip_mm === 'number' && d.precip_mm < umbral) {
        cur.push(d);
        if (cur.length > best.length) best = cur;
      } else {
        cur = [];
      }
    }
    return best;
  }

  /**
   * Dispara/actualiza una alerta de PRONÓSTICO (clima real). Anota ENSO y
   * agrega timestamp + fuente. Source = 'forecast' para que la UI la etiquete
   * como clima real (Open-Meteo).
   */
  triggerForecastAlert(type, data, ensoCtx) {
    const config = FORECAST_ALERT_TYPES[type];
    const severity = data.severity || config.severity;
    let alert = {
      type,
      severity,
      title: config.title,
      message: data.detail || config.message,
      timestamp: Date.now(),
      source: 'forecast',
      source_label: SOURCE_OPENMETEO,
      authority: AUTHORITY,
      data,
    };
    // Anota contexto ENSO regional cuando aplica (sequía/helada o fase activa).
    alert = annotateAlertWithEnso(alert, ensoCtx || {});

    const existing = this.activeAlerts.get(type);
    if (existing) {
      // Ya activa: actualiza datos/timestamp sin re-emitir 'alertTriggered'.
      this.activeAlerts.set(type, { ...alert });
      return;
    }
    this.activeAlerts.set(type, alert);
    console.warn(`[AlertEngine] ⚠️ Alerta clima real: ${type}`, data);
    this.dispatch('alertTriggered', alert);
    this.showSystemNotification(alert);
  }

  /**
   * Obtiene datos de sensores IoT DEMO (no hay hardware todavía).
   */
  async fetchSensorData() {
    return this.getMockSensorData();
  }

  /**
   * Datos DEMO de sensores IoT. Marcados `_demo:true`.
   * Mantiene la forma histórica para compatibilidad de tests.
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
      _demo: true,
      _mock: true,
    };
  }

  /**
   * Datos DEMO de clima (solo para tests/legacy). El motor REAL ya no lo usa.
   * Marcado `_demo:true`.
   */
  getMockClimaData() {
    const hour = new Date().getHours();
    const baseTemp = 18 + Math.sin((hour - 6) / 24 * Math.PI * 2) * 6;
    const randomFactor = Math.random() * 4 - 2;
    return {
      temperatura: Math.round((baseTemp + randomFactor) * 10) / 10,
      humedad: Math.round(65 + Math.random() * 20),
      lluvia: Math.round(Math.random() * 60 * 10) / 10,
      viento: Math.round(15 + Math.random() * 30),
      timestamp: new Date().toISOString(),
      _demo: true,
      _mock: true,
    };
  }

  /**
   * Evalúa alerta de humedad baja (SENSOR DEMO). Marca `_demo`.
   */
  async evaluateHumidityAlert(climaData, sensorData) {
    const humedad = sensorData?.invernadero?.humedad ?? climaData?.humedad;
    if (humedad === undefined) return;

    const alertType = 'HUMEDAD_BAJA';
    const threshold = ALERT_THRESHOLDS.HUMEDAD_MIN;
    if (humedad < threshold) {
      await this.triggerSensorAlert(alertType, {
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
   * Evalúa alerta de temperatura alta (SENSOR DEMO). Marca `_demo`.
   */
  async evaluateTemperatureAlert(climaData, sensorData) {
    const temp = sensorData?.invernadero?.temperatura ?? climaData?.temperatura;
    if (temp === undefined) return;

    const alertType = 'TEMPERATURA_ALTA';
    const threshold = ALERT_THRESHOLDS.TEMPERATURA_MAX;
    if (temp > threshold) {
      await this.triggerSensorAlert(alertType, {
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
   * Evalúa alerta de lluvia intensa (SENSOR DEMO). Mantenida para compat tests.
   */
  async evaluateRainAlert(climaData) {
    const lluvia = climaData?.lluvia;
    if (lluvia === undefined) return;
    const alertType = 'LLUVIA_INTENSA';
    const threshold = ALERT_THRESHOLDS.LLUVIA_MAX;
    if (lluvia > threshold) {
      await this.triggerSensorAlert(alertType, {
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
   * Evalúa alerta de viento fuerte (SENSOR DEMO). Mantenida para compat tests.
   */
  async evaluateWindAlert(climaData) {
    const viento = climaData?.viento;
    if (viento === undefined) return;
    const alertType = 'VIENTO_FUERTE';
    const threshold = ALERT_THRESHOLDS.VIENTO_MAX;
    if (viento > threshold) {
      await this.triggerSensorAlert(alertType, {
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
   * Dispara/actualiza una alerta de SENSOR (demo). Marca `_demo:true` y
   * source='sensor_demo' para que la UI la etiquete como simulado.
   */
  async triggerSensorAlert(type, data) {
    const config = ALERT_TYPES[type];
    // El título queda limpio; la UI etiqueta "simulado/demo" a partir de
    // `_demo:true` + `source:'sensor_demo'`, no del texto del título.
    const alert = {
      type,
      severity: config.severity,
      title: config.title,
      message: config.message,
      timestamp: Date.now(),
      source: 'sensor_demo',
      _demo: true,
      data,
    };
    if (this.activeAlerts.has(type)) {
      this.activeAlerts.set(type, { ...alert });
      return;
    }
    this.activeAlerts.set(type, alert);
    console.warn(`[AlertEngine] (demo) Alerta de sensor: ${type}`, data);
    this.dispatch('alertTriggered', alert);
    await this.showSystemNotification(alert);
  }

  /**
   * Compat: dispara una alerta genérica (usado por tests legacy de sensor).
   * Mantiene el comportamiento histórico de `triggerAlert`.
   */
  async triggerAlert(type, data) {
    if (this.activeAlerts.has(type)) {
      this.activeAlerts.set(type, {
        ...this.activeAlerts.get(type),
        timestamp: Date.now(),
        data,
      });
      return;
    }
    const config = ALERT_TYPES[type] || FORECAST_ALERT_TYPES[type] || { severity: 'info', title: type, message: '' };
    const alert = {
      type,
      severity: config.severity,
      title: config.title,
      message: config.message,
      timestamp: Date.now(),
      data,
    };
    this.activeAlerts.set(type, alert);
    console.warn(`[AlertEngine] ⚠️ Alerta activada: ${type}`, data);
    this.dispatch('alertTriggered', alert);
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
    this.dispatch('alertCleared', { type, ...alert });
  }

  /**
   * dispatch helper — envuelve window.dispatchEvent con guard SSR/test.
   */
  dispatch(name, detail) {
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(name, { detail }));
      } else if (typeof dispatchEvent === 'function') {
        // jsdom global fallback (algunos tests stubbean dispatchEvent global)
        dispatchEvent(new CustomEvent(name, { detail }));
      }
    } catch (e) {
      console.debug('[AlertEngine] dispatch falló:', e?.message);
    }
  }

  /**
   * Muestra una notificación del sistema operativo si hay permisos.
   */
  async showSystemNotification(alert) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(`${alert.title} - Chagra`, {
          body: alert.message,
          icon: '/icon-192.png',
          tag: alert.type,
          requireInteraction: true,
        });
      } catch (error) {
        console.warn('[AlertEngine] Error mostrando notificación:', error.message);
      }
    } else if (Notification.permission !== 'denied') {
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
      sensorDemoEnabled: this.sensorDemoEnabled,
      hasClima: !!this.lastClimaSnapshot,
      // Compat con consumidores/tests legacy: el clima ya no depende de un
      // "MCP server" booleano, pero mantenemos la clave para no romper el
      // contrato del getStatus histórico (siempre false: ya no se usa).
      mcpServerAvailable: false,
      pollingInterval: POLLING_INTERVAL_MS,
    };
  }
}

// Singleton exportado
export const alertEngine = new AlertEngine();
