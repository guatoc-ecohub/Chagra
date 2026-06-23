import { describe, it, expect } from 'vitest';
import {
  buildClimaHoy,
  buildTareasSemana,
  buildAgenda,
  agendaPorDia,
  agendaPorSemana,
  ensoTaskPhase,
} from '../hoyEnFincaService';

const DAY_MS = 86400000;

/** Snapshot mínimo del sidecar con pronóstico Open-Meteo real. */
function snapshotConForecast({ ensoPhase = 'neutral', dia0 = {} } = {}) {
  return {
    enso_status: { phase: ensoPhase },
    openmeteo: {
      available: true,
      forecast_7d: [
        {
          date: '2026-06-11',
          temp_max_c: 18,
          temp_min_c: 7,
          precip_mm: 1.2,
          ...dia0,
        },
      ],
    },
  };
}

/** Ciclo activo de papa sembrado hace `dias` días (tiene plantilla fenológica). */
function cicloPapa({ dias = 30, now = Date.now(), extra = {} } = {}) {
  return {
    process_id: 'p-papa-1',
    type: 'farm_process',
    attributes: {
      process_type: 'sowing',
      subject_slug: 'solanum_tuberosum',
      subject_label: 'Papa pastusa',
      status: 'active',
      current_stage: 'vegetative',
      created_at: now - dias * DAY_MS,
      ...extra,
    },
  };
}

describe('buildClimaHoy', () => {
  it('sin datos no fabrica nada: hasData false', () => {
    const r = buildClimaHoy({ snapshot: null, sky: null });
    expect(r.hasData).toBe(false);
    expect(r.condition).toBe(null);
  });

  it('clima honesto: nubosidad real alta → mayormente nublado, no sol', () => {
    const r = buildClimaHoy({
      snapshot: snapshotConForecast(),
      sky: {
        current: { cloud_cover_pct: 85, weather_code: 3, precip_mm: 0 },
        daily: [{ date: '2026-06-11', cloud_cover_mean_pct: 85, weather_code: 3, precip_mm: 1.2 }],
      },
      elevationM: 1950,
    });
    expect(r.hasData).toBe(true);
    expect(r.condition).toBe('nublado');
    expect(r.label).toMatch(/nublado/i);
    expect(r.tempMaxC).toBe(18);
    expect(r.tempMinC).toBe(7);
    expect(r.fuente).toMatch(/Open-Meteo/);
  });

  it('sin nubosidad pero con forecast: usa prior por piso (frío → no promete sol)', () => {
    const r = buildClimaHoy({
      snapshot: snapshotConForecast(),
      sky: null,
      elevationM: 2200,
    });
    expect(r.hasData).toBe(true);
    // Piso frío sin dato de nube: nunca "despejado" optimista.
    expect(['parcial', 'nublado', 'lluvia']).toContain(r.condition);
  });

  it('precipitación fuerte del día gana: lluvia', () => {
    const r = buildClimaHoy({
      snapshot: snapshotConForecast({ dia0: { precip_mm: 12 } }),
      sky: { current: { cloud_cover_pct: null, weather_code: null, precip_mm: null }, daily: [] },
      elevationM: 1500,
    });
    expect(r.condition).toBe('lluvia');
  });
});

describe('ensoTaskPhase', () => {
  it('mapea slugs del sidecar a la fase que entiende climateCycleService', () => {
    expect(ensoTaskPhase('nina_moderada')).toBe('la_nina');
    expect(ensoTaskPhase('nino_fuerte')).toBe('el_nino');
    expect(ensoTaskPhase('neutral')).toBe(null);
    expect(ensoTaskPhase(undefined)).toBe(null);
  });
});

describe('buildTareasSemana', () => {
  it('sin ciclos → vacío (no inventa tareas)', () => {
    expect(buildTareasSemana({ processes: [] })).toEqual([]);
  });

  it('ciclo de papa a 30 días → etapa estimada con tareas de la etapa', () => {
    const now = Date.now();
    const grupos = buildTareasSemana({
      processes: [cicloPapa({ dias: 30, now })],
      altitudeM: 2000,
      now,
    });
    expect(grupos).toHaveLength(1);
    const g = grupos[0];
    expect(g.etiqueta).toBe('Papa pastusa');
    // El template de la especie puede aportar una etiqueta más específica
    // (p. ej. "Emergencia" para papa) que prevalece sobre el map genérico
    // STAGE_LABELS ("Brote"). Solo exigimos un stageCode + label no vacíos.
    expect(g.stageCode).toBeTruthy();
    expect(typeof g.stageLabel).toBe('string');
    expect(g.stageLabel.length).toBeGreaterThan(0);
    expect(g.tareas.length).toBeGreaterThan(0);
    // Cada tarea trae nombre + prioridad (sin fabricar campos vacíos).
    for (const t of g.tareas) {
      expect(t.task).toBeTruthy();
      expect(['alta', 'media', 'baja']).toContain(t.priority);
    }
  });

  it('La Niña agrega tareas preventivas ENSO marcadas con origen', () => {
    const now = Date.now();
    const grupos = buildTareasSemana({
      processes: [cicloPapa({ dias: 30, now })],
      altitudeM: 2000,
      ensoPhase: 'nina_moderada',
      now,
    });
    const conEnso = grupos[0].tareas.filter((t) => t.origen === 'enso');
    expect(conEnso.length).toBeGreaterThan(0);
    expect(conEnso[0].task).toMatch(/drenaje|caldo|pudrición/i);
  });

  it('ignora ciclos cerrados', () => {
    const now = Date.now();
    const cerrado = cicloPapa({ dias: 30, now, extra: { status: 'completed' } });
    expect(buildTareasSemana({ processes: [cerrado], now })).toEqual([]);
  });

  it('ciclo sin plantilla usa current_stage del proceso (no descarta)', () => {
    const now = Date.now();
    const sinTemplate = {
      process_id: 'p-x',
      attributes: {
        subject_slug: 'especie_sin_template',
        subject_label: 'Arracacha',
        status: 'active',
        current_stage: 'vegetative',
        created_at: now - 40 * DAY_MS,
      },
    };
    const grupos = buildTareasSemana({ processes: [sinTemplate], now });
    expect(grupos).toHaveLength(1);
    expect(grupos[0].stageCode).toBe('vegetative');
  });
});

describe('buildAgenda', () => {
  it('sin ciclos → agenda vacía', () => {
    expect(buildAgenda({ processes: [] })).toEqual([]);
  });

  it('ventanas fenológicas próximas entran a la agenda con fuente', () => {
    const now = Date.now();
    // Lechuga (ciclo corto): a 10 días de sembrada, vienen etapas pronto.
    const lechuga = {
      process_id: 'p-lechuga',
      attributes: {
        subject_slug: 'lactuca_sativa',
        subject_label: 'Lechuga',
        status: 'active',
        current_stage: 'emergence',
        created_at: now - 10 * DAY_MS,
      },
    };
    const items = buildAgenda({ processes: [lechuga], altitudeM: 2000, now, horizonDays: 60 });
    expect(items.length).toBeGreaterThan(0);
    // Ordenadas por fecha ascendente
    for (let i = 1; i < items.length; i++) {
      expect(items[i].fecha).toBeGreaterThanOrEqual(items[i - 1].fecha);
    }
    // Cada item trae proceso + etapa + fuentes (cero fabricación)
    for (const it of items) {
      expect(it.etiqueta).toBe('Lechuga');
      expect(it.stageLabel).toBeTruthy();
      expect(Array.isArray(it.fuentes)).toBe(true);
    }
  });

  it('no incluye ventanas fuera del horizonte', () => {
    const now = Date.now();
    const papa = cicloPapa({ dias: 1, now }); // sembrada ayer: cosecha lejana
    const items = buildAgenda({ processes: [papa], altitudeM: 2000, now, horizonDays: 7 });
    for (const it of items) {
      expect(it.fecha).toBeLessThanOrEqual(now + 7 * DAY_MS);
    }
  });
});

describe('agendaPorDia / agendaPorSemana', () => {
  const now = new Date('2026-06-11T10:00:00').getTime();
  const items = [
    { fecha: now + 2 * 3600000, etiqueta: 'A', stageLabel: 'Floración' },
    { fecha: now + 1 * DAY_MS, etiqueta: 'B', stageLabel: 'Cosecha' },
    { fecha: now + 10 * DAY_MS, etiqueta: 'C', stageLabel: 'Brote' },
  ];

  it('agrupa por día con labels Hoy/Mañana', () => {
    const dias = agendaPorDia(items, { now, dias: 7 });
    expect(dias).toHaveLength(7);
    expect(dias[0].label).toBe('Hoy');
    expect(dias[1].label).toBe('Mañana');
    expect(dias[0].items.map((i) => i.etiqueta)).toEqual(['A']);
    expect(dias[1].items.map((i) => i.etiqueta)).toEqual(['B']);
    // El item a 10 días NO aparece en la semana
    expect(dias.flatMap((d) => d.items).find((i) => i.etiqueta === 'C')).toBeUndefined();
  });

  it('agrupa por semana para la vista de mes', () => {
    const semanas = agendaPorSemana(items, { now, semanas: 4 });
    expect(semanas).toHaveLength(4);
    expect(semanas[0].label).toBe('Esta semana');
    expect(semanas[1].label).toBe('Próxima semana');
    expect(semanas[0].items.map((i) => i.etiqueta)).toEqual(['A', 'B']);
    expect(semanas[1].items.map((i) => i.etiqueta)).toEqual(['C']);
  });
});
