import { describe, it, expect } from 'vitest';
import {
  buildAnoFinca,
  hitosDeSiembras,
  hitosDeCosechas,
  hitosDeEventos,
  hitosFuturos,
  stageLabel,
  TEMPORADA_POR_MES,
} from '../anoFincaService';

// Año fijo para no depender del reloj: 15 de junio de 2026, 12:00.
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();
const YEAR = 2026;
const ts = (month, day) => new Date(YEAR, month - 1, day, 10, 0, 0).getTime();

const cycle = (id, label, createdAt, extra = {}) => ({
  process_id: id,
  type: 'farm_process',
  attributes: {
    process_type: 'sowing',
    subject_label: label,
    subject_slug: extra.slug || label.toLowerCase(),
    created_at: createdAt,
    location_land_asset_id: extra.lote || 'lote-1',
    status: 'active',
    ...extra,
  },
});

describe('hitosDeSiembras', () => {
  it('agrupa matas equivalentes (misma especie + día + lote) en un hito con count', () => {
    const cycles = [
      cycle('p1', 'Fresa #01', ts(3, 4), { slug: 'fragaria' }),
      cycle('p2', 'Fresa #02', ts(3, 4), { slug: 'fragaria' }),
      cycle('p3', 'Fresa #03', ts(3, 4), { slug: 'fragaria' }),
      cycle('p4', 'Maíz', ts(4, 20), { slug: 'zea_mays' }),
    ];
    const hitos = hitosDeSiembras(cycles, YEAR);
    expect(hitos).toHaveLength(2);
    const fresa = hitos.find((h) => h.label === 'Sembró Fresa');
    expect(fresa.count).toBe(3);
    expect(fresa.month).toBe(3);
    expect(fresa.tipo).toBe('siembra');
    expect(fresa.pasado).toBe(true);
  });

  it('excluye siembras de otros años y sin fecha', () => {
    const cycles = [
      cycle('p1', 'Café', new Date(2024, 2, 1).getTime()),
      cycle('p2', 'Yuca', null),
    ];
    expect(hitosDeSiembras(cycles, YEAR)).toHaveLength(0);
  });
});

describe('hitosDeCosechas', () => {
  it('ubica cada log--harvest del año con su cantidad tal como se registró', () => {
    const logs = [
      {
        id: 'h1',
        type: 'log--harvest',
        name: 'Cosecha de Mora',
        timestamp: Math.floor(ts(5, 10) / 1000), // farmOS: epoch segundos
        quantity: { value: 3, unit: 'kg' },
        status: 'done',
      },
      {
        id: 'h2',
        type: 'log--harvest',
        name: 'Cosecha de Mora',
        timestamp: Math.floor(new Date(2025, 10, 2).getTime() / 1000), // otro año
        quantity: { value: 1, unit: 'kg' },
      },
    ];
    const hitos = hitosDeCosechas(logs, YEAR);
    expect(hitos).toHaveLength(1);
    expect(hitos[0].label).toBe('Cosechó Mora');
    expect(hitos[0].detail).toBe('3 kg');
    expect(hitos[0].month).toBe(5);
    expect(hitos[0].tipo).toBe('cosecha');
  });

  it('descarta logs sin cantidad utilizable (regla de cosechaService)', () => {
    const logs = [{ id: 'h3', name: 'Cosecha de Lulo', timestamp: Math.floor(ts(2, 1) / 1000) }];
    expect(hitosDeCosechas(logs, YEAR)).toHaveLength(0);
  });
});

describe('hitosDeEventos', () => {
  const cyclesById = { p1: cycle('p1', 'Lulo #01', ts(1, 10), { slug: 'solanum_quitoense' }) };
  const ev = (id, type, occurredAt, payload = {}, notes = '') => ({
    event_id: id,
    type: 'farm_process_event',
    attributes: { process_id: 'p1', event_type: type, occurred_at: occurredAt, payload, notes },
  });

  it('convierte la transición a flowering en hito de floración con el nombre de la mata', () => {
    const eventos = { p1: [ev('e1', 'stage_transition', ts(4, 2), { to_stage: 'flowering' })] };
    const hitos = hitosDeEventos(eventos, cyclesById, YEAR);
    expect(hitos).toHaveLength(1);
    expect(hitos[0].tipo).toBe('floracion');
    expect(hitos[0].label).toBe('Floreció Lulo');
    expect(hitos[0].month).toBe(4);
  });

  it('otras transiciones y tareas quedan como labores; observaciones se agregan por mes', () => {
    const eventos = {
      p1: [
        ev('e1', 'stage_transition', ts(2, 5), { to_stage: 'vegetative' }),
        ev('e2', 'task_completed', ts(3, 8), { task_label: 'Deshierbe' }),
        ev('e3', 'observation', ts(3, 9)),
        ev('e4', 'observation', ts(3, 20)),
        ev('e5', 'sowing_confirmed', ts(1, 10)), // omitido (duplicaría la siembra)
      ],
    };
    const hitos = hitosDeEventos(eventos, cyclesById, YEAR);
    expect(hitos).toHaveLength(3);
    expect(hitos.find((h) => h.id === 'evento-e1').label).toBe('Lulo pasó a crecimiento');
    expect(hitos.find((h) => h.id === 'evento-e2').detail).toBe('Deshierbe');
    const obs = hitos.find((h) => h.id.startsWith('obs-'));
    expect(obs.count).toBe(2);
    expect(obs.label).toBe('2 apuntes: Lulo');
  });
});

describe('hitosFuturos', () => {
  const calendar = (id, name, entries, extra = {}) => ({
    id, name, status: 'ok', entries, count: extra.count || 1,
  });

  it('proyecta cosecha/floración/nutrición SOLO en meses por venir del año', () => {
    const cal = calendar('c1', 'Mora', [
      { layer: 'cosecha', title: 'Cosecha', months: [3, 8, 9], approximate: true, source: 'Ciclo perenne del catálogo' },
      { layer: 'fenologia', stageCode: 'flowering', title: 'Floración', months: [7], approximate: true },
      { layer: 'nutricion', anchored: true, title: 'Abonado', months: [10], approximate: false },
      { layer: 'nutricion', anchored: false, title: 'Abonado sin anclar', months: [11] }, // sin siembra real → fuera
      { layer: 'sanidad', months: [8], title: 'Caldo bordelés' }, // capa sin agenda → fuera
    ]);
    const hitos = hitosFuturos([cal], { year: YEAR, currentMonth: 6 });
    expect(hitos.map((h) => `${h.tipo}:${h.month}`).sort()).toEqual([
      'cosecha:8', 'cosecha:9', 'floracion:7', 'nutricion:10',
    ]);
    expect(hitos.every((h) => h.pasado === false)).toBe(true);
    expect(hitos.find((h) => h.month === 8).label).toBe('Viene cosecha de Mora');
  });

  it('resume una cosecha continua en UN hito, no en 12 puntos', () => {
    const cal = calendar('c2', 'Plátano', [
      { layer: 'cosecha', continuous: true, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], title: 'Cosecha casi todo el año' },
    ]);
    const hitos = hitosFuturos([cal], { year: YEAR, currentMonth: 6 });
    expect(hitos).toHaveLength(1);
    expect(hitos[0].month).toBe(7);
    expect(hitos[0].label).toBe('Plátano: cosecha casi todo el año');
  });
});

describe('buildAnoFinca', () => {
  it('arma los 12 meses con estado temporal, tono de temporada y conteos', () => {
    const resultado = buildAnoFinca({
      cycles: [cycle('p1', 'Maíz', ts(4, 20), { slug: 'zea_mays' })],
      harvestLogs: [{
        id: 'h1', name: 'Cosecha de Maíz',
        timestamp: Math.floor(ts(6, 10) / 1000),
        quantity: { value: 2, unit: 'arrobas' },
      }],
      eventsByProcess: {},
      calendars: [{
        id: 'p1', name: 'Maíz', status: 'ok',
        entries: [{ layer: 'cosecha', months: [8], title: 'Cosecha', approximate: true }],
      }],
      now: NOW,
    });

    expect(resultado.year).toBe(YEAR);
    expect(resultado.currentMonth).toBe(6);
    expect(resultado.porMes).toHaveLength(12);
    expect(resultado.vacio).toBe(false);
    expect(resultado.totalPasado).toBe(2);
    expect(resultado.totalFuturo).toBe(1);

    const abril = resultado.porMes[3];
    expect(abril.estado).toBe('pasado');
    expect(abril.tono).toBe('lluvia'); // primeras aguas del almanaque
    expect(abril.counts.siembra).toBe(1);

    const junio = resultado.porMes[5];
    expect(junio.estado).toBe('hoy');
    expect(junio.counts.cosecha).toBe(1);

    const agosto = resultado.porMes[7];
    expect(agosto.estado).toBe('proximo');
    expect(agosto.hitos[0].pasado).toBe(false);
  });

  it('sin registros ni calendario → vacio true (estado acogedor en la UI)', () => {
    const resultado = buildAnoFinca({ now: NOW });
    expect(resultado.vacio).toBe(true);
    expect(resultado.porMes.every((m) => m.total === 0)).toBe(true);
  });
});

describe('helpers', () => {
  it('stageLabel traduce códigos conocidos y devuelve el crudo si no hay traducción', () => {
    expect(stageLabel('flowering')).toBe('Floración');
    expect(stageLabel('growth')).toBe('Crecimiento');
    expect(stageLabel('sowing_confirmed')).toBe('Siembra');
    expect(stageLabel('etapa_rara')).toBe('etapa_rara');
  });

  it('TEMPORADA_POR_MES cubre los 12 meses con el mapeo bimodal del almanaque', () => {
    expect(TEMPORADA_POR_MES).toHaveLength(12);
    expect(TEMPORADA_POR_MES.filter((t) => t.tono === 'lluvia').map((t) => t.mes)).toEqual([4, 5, 10, 11]);
    expect(TEMPORADA_POR_MES.filter((t) => t.tono === 'transicion').map((t) => t.mes)).toEqual([3, 9]);
  });
});
