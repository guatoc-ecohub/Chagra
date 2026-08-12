import { describe, expect, it } from 'vitest';
import {
  analyzeDay,
  buildWindow,
  classifyPiso,
  computeClimateWarnings,
  parseForecast,
  recommendSowing,
  resolveSpeciesEntry,
} from '../fenologyRecommendations';
import { FENOLOGY_CATALOG, FENOLOGY_CATALOG_COUNT } from '../../data/fenologySpecies';

const LOCATION = { latitude: 4.8, longitude: -73.9, altitude_m: 2200 };
const FORECAST = {
  source: 'fixture',
  days: [
    { date: '2026-08-12', temp_min: 10, temp_max: 20, precip_mm: 0, humidity_avg: 65 },
    { date: '2026-08-13', temp_min: 11, temp_max: 21, precip_mm: 0, humidity_avg: 65 },
    { date: '2026-08-14', temp_min: 11, temp_max: 21, precip_mm: 0, humidity_avg: 65 },
  ],
};

describe('fenologySpecies', () => {
  it('usa el slice canónico y conserva nombres científicos del catálogo', () => {
    expect(FENOLOGY_CATALOG_COUNT).toBe(23);
    expect(resolveSpeciesEntry('lechuga').nombre_cientifico).toBe('Lactuca sativa var. capitata L.');
    expect(resolveSpeciesEntry('tomate').id).toBe('solanum_lycopersicum_san_marzano');
    expect(resolveSpeciesEntry('pimenton')).toBeNull();
  });
});

describe('clasificación y normalización climática', () => {
  it('respeta los límites de los pisos, incluido 0 msnm', () => {
    expect(classifyPiso(0)).toBe('calido');
    expect(classifyPiso(999)).toBe('calido');
    expect(classifyPiso(1000)).toBe('templado');
    expect(classifyPiso(2000)).toBe('frio');
    expect(classifyPiso(3000)).toBe('paramo');
    expect(classifyPiso(-1)).toBeNull();
  });

  it('acepta las variables del contrato IDEAM sin inventar precipitación', () => {
    const parsed = parseForecast({}, {
      forecast: {
        days: [{ date: '2026-08-12', temp_min: 8, temp_max: 22, precip_prob: 80, humidity_avg: 70 }],
      },
    });
    expect(parsed.days[0]).toMatchObject({ temp_min_c: 8, temp_max_c: 22, precip_prob: 80, precip_mm: null });
  });
});

describe('reglas de riesgo y ventanas', () => {
  it('bloquea helada para especie sensible y la marca como severa bajo cero', () => {
    const entry = FENOLOGY_CATALOG.find(({ id }) => id === 'lactuca_sativa_capitata');
    expect(analyzeDay({ temp_min_c: -1, temp_max_c: 12, precip_mm: 0, humidity_avg: 60 }, entry).blocked).toBe(true);
    expect(analyzeDay({ temp_min_c: -1, temp_max_c: 12, precip_mm: 0, humidity_avg: 60 }, entry).frostSevere).toBe(true);
  });

  it('emite sequía solo cuando hay precipitación cuantificada', () => {
    const days = Array.from({ length: 7 }, (_, index) => ({
      date: `2026-08-${String(12 + index).padStart(2, '0')}`,
      temp_min_c: 10,
      temp_max_c: 20,
      precip_mm: 0,
      humidity_avg: 60,
    }));
    expect(computeClimateWarnings({ days }).some(({ type }) => type === 'drought_risk')).toBe(true);
    expect(computeClimateWarnings({ days: days.map((day) => ({ ...day, precip_mm: null })) }).some(({ type }) => type === 'drought_risk')).toBe(false);
  });

  it('devuelve la primera ventana continua favorable', () => {
    const days = [
      { date: '2026-08-12', timestamp: Date.parse('2026-08-12T00:00:00Z') },
      { date: '2026-08-13', timestamp: Date.parse('2026-08-13T00:00:00Z') },
      { date: '2026-08-15', timestamp: Date.parse('2026-08-15T00:00:00Z') },
    ];
    expect(buildWindow(days, Date.parse('2026-08-12T00:00:00Z'))).toEqual({
      best_date: '2026-08-12', window_start: '2026-08-12', window_end: '2026-08-13',
    });
  });
});

describe('recommendSowing', () => {
  it('combina luna, clima y catálogo en una recomendación específica', () => {
    const response = recommendSowing({
      location: LOCATION,
      date: '2026-08-12',
      species_id: 'lechuga',
    }, {
      forecast: FORECAST,
      lunarPhaseFn: () => ({ name: 'Gibosa creciente', fraction: 0.35, illumination: 0.8 }),
    });
    expect(response.recommendations).toHaveLength(1);
    expect(response.recommendations[0].species_id).toBe('lactuca_sativa_capitata');
    expect(response.recommendations[0].reason.join(' ')).toMatch(/coincide/);
    expect(response.recommendations[0].timing.best_date).toBe('2026-08-12');
    expect(response.meta.lunar_phase.key).toBe('waxing_gibbous');
    expect(response.meta.generated_at).toBe('2026-08-12T00:00:00.000Z');
  });

  it('devuelve fallback histórico sin forecast y no inventa fechas', () => {
    const response = recommendSowing({ location: LOCATION, species_id: 'lechuga' }, { now: '2026-08-12' });
    expect(response.recommendations).toEqual([]);
    expect(response.meta.fallback_mode).toBe('historical_climate');
    expect(response.warnings.some(({ type }) => type === 'data_unavailable')).toBe(true);
  });

  it('devuelve fallback genérico para especie ausente', () => {
    const response = recommendSowing({ location: LOCATION, species_id: 'especie_no_catalogada' }, {
      forecast: FORECAST,
      now: '2026-08-12',
    });
    expect(response.meta.fallback_mode).toBe('generic_recommendation');
    expect(response.recommendations[0]).toMatchObject({ species_id: 'generic_hoja', fallback_available: true });
    expect(response.warnings.some(({ type }) => type === 'incomplete_catalog')).toBe(true);
  });

  it('devuelve alerta de riesgo extremo cuando todo el horizonte tiene helada severa', () => {
    const response = recommendSowing({ location: LOCATION, species_id: 'lechuga' }, {
      forecast: {
        days: [
          { date: '2026-08-12', temp_min: -2, temp_max: 8, precip_mm: 0, humidity_avg: 50 },
          { date: '2026-08-13', temp_min: -1, temp_max: 8, precip_mm: 0, humidity_avg: 50 },
        ],
      },
      now: '2026-08-12',
    });
    expect(response.recommendations).toEqual([]);
    expect(response.meta.fallback_mode).toBe('risk_alert');
    expect(response.warnings[0]).toMatchObject({ type: 'frost_risk', severity: 'high' });
  });

  it('sin luna sigue recomendando por clima y deja el metadato en null', () => {
    const response = recommendSowing({
      location: LOCATION,
      species_id: 'papa',
      preferences: { use_lunar: false },
    }, { forecast: FORECAST, now: '2026-08-12' });
    expect(response.meta.lunar_phase).toBeNull();
    expect(response.recommendations).toHaveLength(1);
    expect(response.warnings.some(({ type }) => type === 'lunar_informational')).toBe(false);
  });
});
