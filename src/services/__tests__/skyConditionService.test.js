/**
 * skyConditionService.test.js — TDD del artefacto sol/luna realista.
 *
 * Caso disparador (Choachí 2026-06): el widget mostró ~4 días de "sol" cuando
 * solo hubo 2 — el resto fue muy nublado. Causa: el pronóstico de Open-Meteo
 * llegaba SIN nubosidad y el ícono se decidía solo por precipitación+temp.
 *
 * Cubre:
 *  - classifySkyCondition: nubosidad real → condición honesta.
 *  - Corrección orográfica andina: piso frío/páramo + tarde degrada "despejado".
 *  - Modulación ENSO: La Niña degrada, El Niño confía en el cielo despejado.
 *  - NUNCA mejora hacia más sol (sesgo de honestidad).
 *  - skyForDay: fallback conservador sin nubosidad (el bug de Choachí).
 *  - fetchSkyConditions: cache, offline → null, nunca throw.
 *  - applySensorCalibration: hook futuro, identidad sin sensores.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  classifySkyCondition,
  skyForDay,
  applySensorCalibration,
  SKY_CONDITIONS,
} from '../skyConditionService.js';

const importFresh = async () => {
  vi.resetModules();
  return import('../skyConditionService.js');
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('classifySkyCondition — nubosidad real', () => {
  it('cielo despejado en piso cálido por la mañana → despejado', () => {
    const r = classifySkyCondition({ cloudCoverPct: 10, elevationM: 400, hour: 9 });
    expect(r.condition).toBe('despejado');
    expect(r.degraded).toBe(false);
  });

  it('nubosidad media → parcial', () => {
    const r = classifySkyCondition({ cloudCoverPct: 50, elevationM: 400, hour: 9 });
    expect(r.condition).toBe('parcial');
  });

  it('nubosidad alta → nublado (el caso real de Choachí)', () => {
    const r = classifySkyCondition({ cloudCoverPct: 85, elevationM: 2200, hour: 14 });
    expect(r.condition).toBe('nublado');
  });

  it('código WMO 45/48 → niebla (precipitación oculta altoandina)', () => {
    expect(classifySkyCondition({ weatherCode: 45, elevationM: 2200, hour: 7 }).condition).toBe('niebla');
    expect(classifySkyCondition({ weatherCode: 48, elevationM: 2900, hour: 7 }).condition).toBe('niebla');
  });

  it('código WMO de lluvia o precipitación significativa → lluvia', () => {
    expect(classifySkyCondition({ weatherCode: 61, elevationM: 1200, hour: 15 }).condition).toBe('lluvia');
    expect(classifySkyCondition({ cloudCoverPct: 60, precipMm: 12, elevationM: 1200, hour: 15 }).condition).toBe('lluvia');
  });

  it('sin nubosidad ni código: fallback por precipitación es conservador', () => {
    // <2mm en piso frío NO es "sol": prior climatológico andino → parcial.
    const frio = classifySkyCondition({ precipMm: 0.4, elevationM: 2200, hour: 10 });
    expect(frio.condition).toBe('parcial');
    expect(frio.confidence).toBe('baja');
    // En piso cálido el prior sí permite despejado.
    const calido = classifySkyCondition({ precipMm: 0.4, elevationM: 300, hour: 10 });
    expect(calido.condition).toBe('despejado');
  });
});

describe('classifySkyCondition — corrección orográfica andina + ENSO', () => {
  it('despejado del modelo + piso frío + tarde → degrada a parcial', () => {
    const r = classifySkyCondition({ cloudCoverPct: 15, elevationM: 2200, hour: 15 });
    expect(r.condition).toBe('parcial');
    expect(r.degraded).toBe(true);
    expect(r.reasons.join(' ')).toMatch(/orográfica/i);
  });

  it('despejado + piso frío + mañana NO degrada (amanecer despejado altoandino real)', () => {
    const r = classifySkyCondition({ cloudCoverPct: 15, elevationM: 2200, hour: 8 });
    expect(r.condition).toBe('despejado');
  });

  it('La Niña degrada un paso extra en piso frío', () => {
    const r = classifySkyCondition({ cloudCoverPct: 15, elevationM: 2200, hour: 15, ensoPhase: 'nina_moderada' });
    expect(r.condition).toBe('nublado');
    expect(r.degraded).toBe(true);
  });

  it('El Niño anula la degradación orográfica (Andes más secos y soleados)', () => {
    const r = classifySkyCondition({ cloudCoverPct: 15, elevationM: 2200, hour: 15, ensoPhase: 'nino_moderado' });
    expect(r.condition).toBe('despejado');
  });

  it('El Niño NUNCA mejora la condición del modelo (solo evita degradar)', () => {
    const r = classifySkyCondition({ cloudCoverPct: 85, elevationM: 2200, hour: 15, ensoPhase: 'nino_fuerte' });
    expect(r.condition).toBe('nublado');
  });

  it('piso cálido no recibe corrección orográfica', () => {
    const r = classifySkyCondition({ cloudCoverPct: 15, elevationM: 300, hour: 15, ensoPhase: 'nina_fuerte' });
    expect(r.condition).toBe('despejado');
  });

  it('niebla y lluvia no se degradan ni se mejoran', () => {
    expect(classifySkyCondition({ weatherCode: 45, elevationM: 2900, hour: 15, ensoPhase: 'nina_fuerte' }).condition).toBe('niebla');
    expect(classifySkyCondition({ weatherCode: 63, elevationM: 2900, hour: 15, ensoPhase: 'nino_fuerte' }).condition).toBe('lluvia');
  });
});

describe('skyForDay — día del pronóstico (strip 7 días)', () => {
  it('día seco con nubosidad alta NO es sol (el bug de Choachí)', () => {
    const r = skyForDay(
      { precip_mm: 0.3, cloud_cover_mean_pct: 82 },
      { elevationM: 2200 },
    );
    expect(r.condition).toBe('nublado');
  });

  it('día seco sin dato de nubosidad en piso frío → parcial, no sol', () => {
    const r = skyForDay({ precip_mm: 0.3 }, { elevationM: 2200 });
    expect(r.condition).toBe('parcial');
  });

  it('día realmente despejado en piso cálido → despejado', () => {
    const r = skyForDay(
      { precip_mm: 0, cloud_cover_mean_pct: 12 },
      { elevationM: 300, ensoPhase: 'neutral' },
    );
    expect(r.condition).toBe('despejado');
  });

  it('lluvia fuerte → lluvia', () => {
    const r = skyForDay({ precip_mm: 22, cloud_cover_mean_pct: 95 }, { elevationM: 2200 });
    expect(r.condition).toBe('lluvia');
  });

  it('acepta el shape del sidecar (sin nubosidad) sin romper', () => {
    const r = skyForDay({ precip_mm: 4, temp_max_c: 17 }, { elevationM: 2200 });
    expect(['nublado', 'lluvia', 'parcial']).toContain(r.condition);
    expect(r.condition).not.toBe('despejado');
  });
});

describe('SKY_CONDITIONS — etiquetas honestas en español', () => {
  it('toda condición tiene label es-CO', () => {
    for (const meta of Object.values(SKY_CONDITIONS)) {
      expect(typeof meta.label).toBe('string');
      expect(meta.label.length).toBeGreaterThan(3);
    }
    expect(SKY_CONDITIONS.nublado.label).toMatch(/nublado/i);
  });
});

describe('applySensorCalibration — hook futuro (sensores en campo)', () => {
  it('sin sensores devuelve la clasificación intacta', () => {
    const base = classifySkyCondition({ cloudCoverPct: 15, elevationM: 2200, hour: 15 });
    expect(applySensorCalibration(base, null)).toBe(base);
    expect(applySensorCalibration(base, undefined)).toBe(base);
    expect(applySensorCalibration(base, {})).toBe(base);
  });
});

describe('fetchSkyConditions — fetch directo Open-Meteo', () => {
  const fakePayload = {
    current: { cloud_cover: 78, weather_code: 3, precipitation: 0, is_day: 1 },
    daily: {
      time: ['2026-06-11', '2026-06-12'],
      cloud_cover_mean: [80, 45],
      weather_code: [3, 2],
      precipitation_sum: [0.2, 6],
    },
  };

  it('proyecta el payload de Open-Meteo a shape interno y cachea', async () => {
    const mod = await importFresh();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakePayload,
    });
    vi.stubGlobal('fetch', fetchMock);

    const r = await mod.fetchSkyConditions({ lat: 4.5286, lng: -73.9227, elevation: 2200 });
    expect(r).not.toBeNull();
    expect(r.current.cloud_cover_pct).toBe(78);
    expect(r.daily[0]).toMatchObject({
      date: '2026-06-11',
      cloud_cover_mean_pct: 80,
      weather_code: 3,
      precip_mm: 0.2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('cloud_cover');

    // segunda llamada: cache, sin fetch nuevo
    const r2 = await mod.fetchSkyConditions({ lat: 4.5286, lng: -73.9227, elevation: 2200 });
    expect(r2.current.cloud_cover_pct).toBe(78);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // cache síncrono disponible
    const cached = mod.getCachedSkyConditions(4.5286, -73.9227, 2200);
    expect(cached?.current?.cloud_cover_pct).toBe(78);
  });

  it('HTTP error o fetch reject → null, nunca throw', async () => {
    const mod = await importFresh();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(mod.fetchSkyConditions({ lat: 4, lng: -73 })).resolves.toBeNull();

    const mod2 = await importFresh();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net down')));
    await expect(mod2.fetchSkyConditions({ lat: 4, lng: -73 })).resolves.toBeNull();
  });

  it('sin lat/lng válidos → null sin fetch', async () => {
    const mod = await importFresh();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(mod.fetchSkyConditions(/** @type {any} */ ({}))).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
