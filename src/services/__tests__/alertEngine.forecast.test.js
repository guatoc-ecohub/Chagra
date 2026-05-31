import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mocks de dependencias del clima real. Hoisted antes del import del engine.
vi.mock('../climaService', () => ({
  fetchClimaSnapshot: vi.fn(),
}));
vi.mock('../userProfileService', () => ({
  getProfile: vi.fn(),
}));

import { alertEngine } from '../alertEngine';
import { fetchClimaSnapshot } from '../climaService';
import { getProfile } from '../userProfileService';

function snapshot(forecast, enso = { phase: 'neutral' }) {
  return {
    enso_status: enso,
    alertas_locales: [],
    openmeteo: { available: true, forecast_7d: forecast },
  };
}

const PROFILE_FRIO = {
  ubicacion_lat: 5.6,
  ubicacion_lng: -73.05,
  departamento: 'Boyacá',
  piso_termico: 'frio',
};

describe('alertEngine — clima real (forecast)', () => {
  beforeEach(() => {
    vi.stubGlobal('dispatchEvent', () => true);
    vi.stubGlobal('Notification', undefined);
    alertEngine.stop();
    alertEngine.activeAlerts.clear();
    fetchClimaSnapshot.mockReset();
    getProfile.mockReset();
    getProfile.mockReturnValue(PROFILE_FRIO);
  });

  afterEach(() => {
    alertEngine.stop();
    vi.unstubAllGlobals();
  });

  it('degrada limpio (sin alertas) cuando no hay coords en el perfil', async () => {
    getProfile.mockReturnValue({ departamento: 'Boyacá' }); // sin lat/lng
    const data = await alertEngine.fetchClimaData();
    expect(data).toBeNull();
    expect(fetchClimaSnapshot).not.toHaveBeenCalled();
    await alertEngine.evaluateForecastAlerts(null);
    expect(alertEngine.activeAlerts.size).toBe(0);
  });

  it('usa las coords del perfil para pedir el snapshot real', async () => {
    fetchClimaSnapshot.mockResolvedValue(snapshot([]));
    await alertEngine.fetchClimaData();
    expect(fetchClimaSnapshot).toHaveBeenCalledWith({ lat: 5.6, lng: -73.05 });
  });

  it('genera alerta de HELADA con umbral de piso frío y la anota con ENSO', async () => {
    const forecast = [
      { date: '2026-06-01', temp_min_c: 3, temp_max_c: 18, precip_mm: 2, wind_max_kmh: 10 },
    ];
    await alertEngine.evaluateForecastAlerts(snapshot(forecast));
    expect(alertEngine.activeAlerts.has('HELADA')).toBe(true);
    const a = alertEngine.activeAlerts.get('HELADA');
    expect(a.source).toBe('forecast');
    expect(a.source_label).toMatch(/Open-Meteo/);
    expect(a.authority).toMatch(/IDEAM/);
    expect(a.data.umbral).toBe(4); // piso frío
    // ENSO: helada es sensible a sequía → se anota incluso en neutral.
    expect(a.enso_context).toBeDefined();
    expect(a.enso_context.region).toBe('andina');
  });

  it('NO dispara helada en piso cálido para la misma mínima', async () => {
    getProfile.mockReturnValue({ ...PROFILE_FRIO, piso_termico: 'calido', departamento: 'Cesar' });
    const forecast = [
      { date: '2026-06-01', temp_min_c: 3, temp_max_c: 30, precip_mm: 0, wind_max_kmh: 5 },
    ];
    await alertEngine.evaluateForecastAlerts(snapshot(forecast));
    // umbral cálido = 1°C; min 3°C no cruza
    expect(alertEngine.activeAlerts.has('HELADA')).toBe(false);
  });

  it('genera OLA_CALOR, LLUVIA_TORRENCIAL y VIENTO_FUERTE_FORECAST', async () => {
    const forecast = [
      { date: '2026-06-01', temp_min_c: 18, temp_max_c: 37, precip_mm: 60, wind_max_kmh: 70 },
    ];
    await alertEngine.evaluateForecastAlerts(snapshot(forecast));
    expect(alertEngine.activeAlerts.has('OLA_CALOR')).toBe(true);
    expect(alertEngine.activeAlerts.get('OLA_CALOR').severity).toBe('danger'); // >=36
    expect(alertEngine.activeAlerts.has('LLUVIA_TORRENCIAL')).toBe(true);
    expect(alertEngine.activeAlerts.has('VIENTO_FUERTE_FORECAST')).toBe(true);
    expect(alertEngine.activeAlerts.get('VIENTO_FUERTE_FORECAST').severity).toBe('danger'); // >=65
  });

  it('genera RACHA_SECA con 4+ días secos consecutivos', async () => {
    const dry = (date) => ({ date, temp_min_c: 14, temp_max_c: 24, precip_mm: 0, wind_max_kmh: 8 });
    const forecast = [
      dry('2026-06-01'), dry('2026-06-02'), dry('2026-06-03'), dry('2026-06-04'),
    ];
    await alertEngine.evaluateForecastAlerts(snapshot(forecast));
    expect(alertEngine.activeAlerts.has('RACHA_SECA')).toBe(true);
    expect(alertEngine.activeAlerts.get('RACHA_SECA').data.valor).toBe(4);
  });

  it('NO genera alertas para un pronóstico benigno (Choachí-like)', async () => {
    // Datos reales tipo Choachí 2026-05-30 (min ~15, max ~22, precip <=25, viento bajo)
    const forecast = [
      { date: '2026-05-30', temp_min_c: 15.9, temp_max_c: 22, precip_mm: 7.5, wind_max_kmh: 8.7 },
      { date: '2026-05-31', temp_min_c: 15.8, temp_max_c: 18.4, precip_mm: 25.1, wind_max_kmh: 6.2 },
      { date: '2026-06-01', temp_min_c: 15.1, temp_max_c: 22.6, precip_mm: 2.3, wind_max_kmh: 10.6 },
    ];
    await alertEngine.evaluateForecastAlerts(snapshot(forecast));
    expect(alertEngine.activeAlerts.size).toBe(0);
  });

  it('despeja una alerta de pronóstico cuando deja de aplicar', async () => {
    const hot = [{ date: 'd', temp_min_c: 18, temp_max_c: 37, precip_mm: 0, wind_max_kmh: 5 }];
    await alertEngine.evaluateForecastAlerts(snapshot(hot));
    expect(alertEngine.activeAlerts.has('OLA_CALOR')).toBe(true);
    const cool = [{ date: 'd', temp_min_c: 18, temp_max_c: 25, precip_mm: 0, wind_max_kmh: 5 }];
    await alertEngine.evaluateForecastAlerts(snapshot(cool));
    expect(alertEngine.activeAlerts.has('OLA_CALOR')).toBe(false);
  });

  it('marca los sensores demo con _demo:true cuando se habilitan', async () => {
    alertEngine.enableSensorDemo(true);
    await alertEngine.triggerSensorAlert('HUMEDAD_BAJA', { currentValue: 10 });
    const a = alertEngine.activeAlerts.get('HUMEDAD_BAJA');
    expect(a._demo).toBe(true);
    expect(a.source).toBe('sensor_demo');
    alertEngine.enableSensorDemo(false);
  });
});
