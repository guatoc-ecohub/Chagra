import { describe, it, expect, beforeEach } from 'vitest';
import {
  isSensorUnavailable,
  generateMockSensorReadings,
  generateMockHistory,
  hasAnomalyNow,
  isMockActive,
  setMockActive,
} from '../iotMockService.js';

/**
 * Tests del generador de readings IoT mock (determinista por minuto).
 * Se usan timestamps fijos para controlar el ciclo de anomalías:
 *   minuteSinceEpoch = floor(nowMs/60000); anomalyCycle = minute % 12.
 *   cycle 0 → spike humedad invernadero · cycle 6 → spike temperatura.
 */

const MIN = 60000;
const ANOMALY_HUMIDITY_MS = 0;        // minuto 0 → cycle 0
const ANOMALY_TEMP_MS = 6 * MIN;      // minuto 6 → cycle 6
const NO_ANOMALY_MS = 3 * MIN;        // minuto 3 → cycle 3

describe('isSensorUnavailable', () => {
  it.each([
    [null, true],
    [undefined, true],
    [{ state: 'unavailable' }, true],
    [{ state: 'UNAVAILABLE' }, true],
    [{ state: 'unknown' }, true],
    [{ state: '' }, true],
    [{ state: 'null' }, true],
    [{ state: '23.5' }, false],
    [{ state: '0' }, false],
  ])('para %o retorna %s', (reading, expected) => {
    expect(isSensorUnavailable(reading)).toBe(expected);
  });
});

describe('generateMockSensorReadings', () => {
  it('genera los 4 sensores con estructura HA-like y flags de mock', () => {
    const r = generateMockSensorReadings(NO_ANOMALY_MS);
    const keys = Object.keys(r);
    expect(keys).toContain('invernaderoHumidity');
    expect(keys).toContain('invernaderoTemperature');
    expect(keys).toContain('tabacoHumidity');
    expect(keys).toContain('tabacoTemperature');
    expect(keys).toHaveLength(4);
    const s = r.invernaderoHumidity;
    expect(s._mock).toBe(true);
    expect(s._mock_reason).toBe('zigbee_offline');
    expect(s.attributes.unit_of_measurement).toBe('%');
    expect(Number.isNaN(Number(s.state))).toBe(false);
  });

  it('es determinista: mismo timestamp → mismas lecturas', () => {
    expect(generateMockSensorReadings(NO_ANOMALY_MS)).toEqual(generateMockSensorReadings(NO_ANOMALY_MS));
  });

  it('en ciclo de anomalía la humedad del invernadero supera 85%', () => {
    const r = generateMockSensorReadings(ANOMALY_HUMIDITY_MS);
    expect(Number(r.invernaderoHumidity.state)).toBeGreaterThan(85);
  });

  it('en ciclo de anomalía de temperatura el invernadero supera 30°C', () => {
    const r = generateMockSensorReadings(ANOMALY_TEMP_MS);
    expect(Number(r.invernaderoTemperature.state)).toBeGreaterThan(30);
  });
});

describe('generateMockHistory', () => {
  it('genera 4 entidades con 48 puntos cada una', () => {
    const h = generateMockHistory(NO_ANOMALY_MS);
    const entities = Object.keys(h);
    expect(entities).toHaveLength(4);
    entities.forEach((e) => expect(h[e]).toHaveLength(48));
  });

  it('cada punto trae entity_id, state, last_changed ISO y _mock', () => {
    const h = generateMockHistory(NO_ANOMALY_MS);
    const p = h['sensor.hobeian_zg_303z_humidity'][0];
    expect(p.entity_id).toBe('sensor.hobeian_zg_303z_humidity');
    expect(typeof p.state).toBe('string');
    expect(p._mock).toBe(true);
    expect(() => new Date(p.last_changed).toISOString()).not.toThrow();
    expect(p.last_changed).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('la serie va de más antiguo a más reciente', () => {
    const h = generateMockHistory(NO_ANOMALY_MS);
    const series = h['sensor.hobeian_zg_303z_humidity'];
    const first = new Date(series[0].last_changed).getTime();
    const last = new Date(series[series.length - 1].last_changed).getTime();
    expect(last).toBeGreaterThan(first);
  });
});

describe('hasAnomalyNow', () => {
  it('detecta anomalía en el ciclo de humedad (minuto 0)', () => {
    expect(hasAnomalyNow(ANOMALY_HUMIDITY_MS)).toBe(true);
  });

  it('detecta anomalía en el ciclo de temperatura (minuto 6)', () => {
    expect(hasAnomalyNow(ANOMALY_TEMP_MS)).toBe(true);
  });

  it('no reporta anomalía fuera de los ciclos (minuto 3)', () => {
    expect(hasAnomalyNow(NO_ANOMALY_MS)).toBe(false);
  });
});

describe('isMockActive / setMockActive', () => {
  beforeEach(() => localStorage.clear());

  it('arranca inactivo', () => {
    expect(isMockActive()).toBe(false);
  });

  it('setMockActive(true) lo activa y (false) lo desactiva', () => {
    setMockActive(true);
    expect(isMockActive()).toBe(true);
    setMockActive(false);
    expect(isMockActive()).toBe(false);
  });
});
