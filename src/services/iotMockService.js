/**
 * iotMockService — generador de readings realistas de sensores IoT cuando
 * Home Assistant no responde o los sensores Zigbee están unavailable.
 *
 * Operator reporte 2026-05-18: USB Zigbee físico roto → HA devuelve
 * state="unavailable" para todos los sensores → TelemetryAlerts hace early
 * return → AIStreamPanel nunca se ejecuta → operador no ve la inferencia IA
 * que es valor diferencial demo institucional 2026-05-19.
 *
 * Solución: cuando detectemos unavailable mass, sustituimos los valores con
 * mock realista (Guatoc invernadero altitud 2400m biocultural páramo) que
 * mantiene el flujo completo + ocasionalmente sale de rango para disparar
 * análisis IA visible.
 *
 * Diseño:
 * - Determinista por timestamp (mismo minuto → mismo valor) para evitar
 *   flicker visual entre re-renders.
 * - Variabilidad realista: humedad 65-82%, temperatura 16-24°C con sinusoide
 *   diurno (más caliente al mediodía local Bogotá).
 * - Ocasionalmente (cada ~3 minutos) un sensor sale de rango para disparar
 *   alerta determinista + IA. Pattern: humedad invernadero sube a 85%+ por
 *   minutos al "amanecer simulado" (mantener atención del operador).
 */

const MOCK_FLAG_KEY = '_chagra_iot_mock';

const SENSOR_BASELINES = {
  invernaderoHumidity: { base: 73, range: [65, 82], unit: '%' },
  invernaderoTemperature: { base: 19, range: [16, 24], unit: '°C' },
  tabacoHumidity: { base: 56, range: [48, 68], unit: '%' },
  tabacoTemperature: { base: 21, range: [18, 25], unit: '°C' },
};

/**
 * Generador determinista por minuto.
 * @returns {{ value: number, isAnomaly: boolean }}
 */
function deterministicReading(baseline, sensorKey, nowMs) {
  const minuteSinceEpoch = Math.floor(nowMs / 60000);
  const hourOfDay = (new Date(nowMs).getHours() + 24) % 24;

  // Variación diurna sinusoidal (pico al mediodía local)
  const diurnal = Math.sin(((hourOfDay - 6) / 24) * 2 * Math.PI);
  const diurnalDelta = sensorKey.includes('Temperature') ? diurnal * 2 : -diurnal * 4;

  // Ruido reproducible (seed minute + sensor)
  const seed = minuteSinceEpoch + sensorKey.length * 7;
  const noise = (Math.sin(seed * 0.7919) + 1) / 2; // 0..1
  const noiseDelta = (noise - 0.5) * 1.2;

  let value = baseline.base + diurnalDelta + noiseDelta;

  // Pattern de anomalía periódica: cada 4 minutos el invernadero spike a
  // humedad alta o temperatura alta para disparar alerta + IA visible.
  const anomalyCycle = minuteSinceEpoch % 12;
  let isAnomaly = false;
  if (anomalyCycle === 0 && sensorKey === 'invernaderoHumidity') {
    value = 88 + (noise * 3); // 88-91% → trigger "exceso humedad" alert
    isAnomaly = true;
  } else if (anomalyCycle === 6 && sensorKey === 'invernaderoTemperature') {
    value = 31 + (noise * 2); // 31-33°C → trigger "temperatura elevada" alert
    isAnomaly = true;
  }

  // Clamp al rango razonable
  value = Math.max(baseline.range[0] - 5, Math.min(baseline.range[1] + 15, value));

  return { value: Number(value.toFixed(1)), isAnomaly };
}

/**
 * Detecta si una lectura HA es unavailable.
 */
export function isSensorUnavailable(haReading) {
  if (!haReading) return true;
  const state = String(haReading.state ?? '').toLowerCase();
  return state === 'unavailable' || state === 'unknown' || state === 'null' || state === '';
}

/**
 * Genera mock readings para los 4 sensores. Reemplaza estructura HA-like.
 * @param {number} [nowMs] - timestamp opcional, default Date.now()
 */
export function generateMockSensorReadings(nowMs = Date.now()) {
  const readings = {};
  for (const [key, baseline] of Object.entries(SENSOR_BASELINES)) {
    const { value } = deterministicReading(baseline, key, nowMs);
    readings[key] = {
      state: String(value),
      _mock: true,
      _mock_reason: 'zigbee_offline',
      attributes: { unit_of_measurement: baseline.unit, friendly_name: key },
    };
  }
  return readings;
}

/**
 * Genera histórico de 24h mock para sparklines (un punto cada 30min = 48 puntos).
 */
export function generateMockHistory(nowMs = Date.now()) {
  const STEP_MS = 30 * 60 * 1000;
  const POINTS = 48;
  const entityKeyMap = {
    'sensor.matera_cocina_humidity': 'tabacoHumidity',
    'sensor.matera_cocina_temperature': 'tabacoTemperature',
    'sensor.hobeian_zg_303z_humidity': 'invernaderoHumidity',
    'sensor.hobeian_zg_303z_temperature': 'invernaderoTemperature',
  };

  const history = {};
  for (const [entityId, sensorKey] of Object.entries(entityKeyMap)) {
    const baseline = SENSOR_BASELINES[sensorKey];
    const series = [];
    for (let i = POINTS - 1; i >= 0; i--) {
      const ts = nowMs - i * STEP_MS;
      const { value } = deterministicReading(baseline, sensorKey, ts);
      series.push({
        entity_id: entityId,
        state: String(value),
        last_changed: new Date(ts).toISOString(),
        _mock: true,
      });
    }
    history[entityId] = series;
  }
  return history;
}

/**
 * Indica si en este momento al menos un sensor está en patrón anomalía
 * (para forzar disparo de análisis IA en demo).
 */
export function hasAnomalyNow(nowMs = Date.now()) {
  for (const [key, baseline] of Object.entries(SENSOR_BASELINES)) {
    const { isAnomaly } = deterministicReading(baseline, key, nowMs);
    if (isAnomaly) return true;
  }
  return false;
}

/**
 * Util para UI: chequea si los mocks están activos via flag.
 */
export function isMockActive() {
  try {
    return localStorage.getItem(MOCK_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}
export function setMockActive(active) {
  try {
    if (active) localStorage.setItem(MOCK_FLAG_KEY, '1');
    else localStorage.removeItem(MOCK_FLAG_KEY);
  } catch { /* noop */ }
}
