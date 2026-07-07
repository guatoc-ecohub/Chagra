/**
 * cosechaService — agregación y rendimiento de "Mi cosecha".
 *
 * Cubre la matemática DETERMINISTA sobre log--harvest:
 *   - Conversión de unidades a kg (incl. arroba/libra/quintal colombianos).
 *   - Normalización robusta de la cantidad (array / aplanado / {decimal}).
 *   - Nombre de cultivo derivado del nombre del log.
 *   - Agregación por cultivo / lote (kg/planta, kg/ha) y tendencia temporal.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeUnit,
  toKilograms,
  readHarvestQuantity,
  cropLabelFromName,
  normalizeHarvestLog,
  normalizeHarvests,
  aggregateByCrop,
  aggregateByAsset,
  aggregateByLote,
  yieldPerPlantByCrop,
  temporalTrend,
  harvestSummary,
} from '../cosechaService';

// Helper: log--harvest con quantity aplanado (shape de addHarvestLog/logCache).
const harvest = ({ id, assetId = null, name = '', value, unit, ts }) => ({
  id,
  type: 'log--harvest',
  asset_id: assetId,
  name,
  timestamp: ts,
  status: 'done',
  quantity: { value, unit, measure: 'weight' },
});

describe('normalizeUnit — plural español y unidades campesinas', () => {
  it('singulariza -s y -es correctamente', () => {
    expect(normalizeUnit('Kilogramos')).toBe('kilogramo');
    expect(normalizeUnit('Gramos')).toBe('gramo');
    expect(normalizeUnit('Libras')).toBe('libra');
    expect(normalizeUnit('Unidades')).toBe('unidad');
    expect(normalizeUnit('Quintales')).toBe('quintal');
    expect(normalizeUnit('@')).toBe('@');
  });
});

describe('toKilograms — conversión de peso', () => {
  it('convierte gramos, kilos y toneladas', () => {
    expect(toKilograms(1000, 'g')).toEqual({ kg: 1, isWeight: true });
    expect(toKilograms(3, 'Kilogramos')).toEqual({ kg: 3, isWeight: true });
    expect(toKilograms(2, 'Toneladas')).toEqual({ kg: 2000, isWeight: true });
  });

  it('soporta la arroba (12.5 kg) y la libra colombianas', () => {
    expect(toKilograms(2, '@')).toEqual({ kg: 25, isWeight: true }); // 2 arrobas
    expect(toKilograms(1, 'arroba').kg).toBeCloseTo(12.5, 5);
    expect(toKilograms(1, 'Libra').kg).toBeCloseTo(0.45359237, 6);
    expect(toKilograms(1, 'quintal').kg).toBe(50);
  });

  it('las unidades de conteo NO son peso (kg=null)', () => {
    expect(toKilograms(12, 'Unidades')).toEqual({ kg: null, isWeight: false });
    expect(toKilograms(3, 'Manojos')).toEqual({ kg: null, isWeight: false });
  });
});

describe('readHarvestQuantity — shapes heterogéneos', () => {
  it('lee quantity aplanado {value,unit}', () => {
    expect(readHarvestQuantity({ quantity: { value: 10, unit: 'Kilogramos' } }))
      .toEqual({ value: 10, unit: 'Kilogramos', measure: null });
  });

  it('lee quantity array JSON:API con value {decimal}', () => {
    const log = {
      quantity: [{ attributes: { value: { decimal: '2.5' }, label: 'Kilogramos', measure: 'weight' } }],
    };
    expect(readHarvestQuantity(log)).toEqual({ value: 2.5, unit: 'Kilogramos', measure: 'weight' });
  });

  it('cae a attributes.quantity cuando no hay quantity top-level', () => {
    const log = { attributes: { quantity: { value: 4, unit: 'Unidades' } } };
    expect(readHarvestQuantity(log)).toEqual({ value: 4, unit: 'Unidades', measure: null });
  });
});

describe('cropLabelFromName', () => {
  it('quita el prefijo "Cosecha de" y el sufijo de fecha', () => {
    expect(cropLabelFromName('Cosecha de Fresa Monterrey')).toBe('Fresa Monterrey');
    expect(cropLabelFromName('Cosecha: Mora - 2026-07-01')).toBe('Mora');
    expect(cropLabelFromName('Cosecha de Café - 2026-07-01')).toBe('Café');
    expect(cropLabelFromName('')).toBe('Sin cultivo');
  });
});

describe('normalizeHarvestLog', () => {
  it('normaliza a un registro plano con kg y mes', () => {
    const ts = Math.floor(Date.parse('2026-07-01T00:00:00Z') / 1000);
    const n = normalizeHarvestLog(harvest({ id: 'h1', assetId: 'p1', name: 'Cosecha de Fresa', value: 3, unit: 'Kilogramos', ts }));
    expect(n.crop).toBe('Fresa');
    expect(n.kg).toBe(3);
    expect(n.isWeight).toBe(true);
    expect(n.month).toBe('2026-07');
    expect(n.assetId).toBe('p1');
  });

  it('descarta logs con cantidad <= 0', () => {
    expect(normalizeHarvestLog(harvest({ id: 'x', value: 0, unit: 'kg', ts: 1 }))).toBeNull();
  });

  it('registros de conteo dejan kg=null pero conservan value', () => {
    const n = normalizeHarvestLog(harvest({ id: 'h', assetId: 'a', name: 'Cosecha de Huevos', value: 30, unit: 'Unidades', ts: 1 }));
    expect(n.kg).toBeNull();
    expect(n.isWeight).toBe(false);
    expect(n.value).toBe(30);
  });
});

describe('aggregateByCrop', () => {
  it('agrupa por cultivo ignorando mayúsculas/tildes y ordena por kg', () => {
    const norm = normalizeHarvests([
      harvest({ id: '1', name: 'Cosecha de Fresa', value: 2, unit: 'kg', ts: 1 }),
      harvest({ id: '2', name: 'Cosecha de FRESA', value: 3, unit: 'kg', ts: 2 }),
      harvest({ id: '3', name: 'Cosecha de Mora', value: 1, unit: 'kg', ts: 3 }),
    ]);
    const byCrop = aggregateByCrop(norm);
    expect(byCrop[0].crop).toBe('Fresa');
    expect(byCrop[0].totalKg).toBe(5);
    expect(byCrop[0].harvestCount).toBe(2);
    expect(byCrop[1].totalKg).toBe(1);
  });
});

describe('aggregateByAsset', () => {
  it('suma por asset cosechado', () => {
    const norm = normalizeHarvests([
      harvest({ id: '1', assetId: 'p1', name: 'Cosecha de Fresa', value: 2, unit: 'kg', ts: 1 }),
      harvest({ id: '2', assetId: 'p1', name: 'Cosecha de Fresa', value: 3, unit: 'kg', ts: 2 }),
    ]);
    const byAsset = aggregateByAsset(norm);
    expect(byAsset).toHaveLength(1);
    expect(byAsset[0]).toMatchObject({ assetId: 'p1', totalKg: 5, harvestCount: 2 });
  });
});

describe('aggregateByLote — rendimiento espacial', () => {
  it('suma cosechas de plantas del lote y calcula kg/planta y kg/ha', () => {
    const plants = [
      { id: 'p1', relationships: { parent: { data: [{ type: 'asset--land', id: 'lote1' }] } } },
      { id: 'p2', relationships: { parent: { data: [{ type: 'asset--land', id: 'lote1' }] } } },
    ];
    const lands = [{ id: 'lote1', attributes: { name: 'Era 1' } }];
    const norm = normalizeHarvests([
      harvest({ id: '1', assetId: 'p1', name: 'Cosecha de Fresa', value: 5, unit: 'kg', ts: 1 }),
      harvest({ id: '2', assetId: 'p2', name: 'Cosecha de Fresa', value: 5, unit: 'kg', ts: 2 }),
    ]);
    const byLote = aggregateByLote(norm, { plants, lands, areaOf: () => 10000 /* 1 ha */ });
    expect(byLote).toHaveLength(1);
    const l = byLote[0];
    expect(l.name).toBe('Era 1');
    expect(l.totalKg).toBe(10);
    expect(l.plantCount).toBe(2);
    expect(l.kgPerPlant).toBe(5);
    expect(l.kgPerHa).toBe(10);
  });

  it('atribuye una cosecha colgada del lote directo', () => {
    const lands = [{ id: 'lote2', attributes: { name: 'Potrero' } }];
    const norm = normalizeHarvests([
      harvest({ id: '1', assetId: 'lote2', name: 'Cosecha de Pasto', value: 100, unit: 'kg', ts: 1 }),
    ]);
    const byLote = aggregateByLote(norm, { plants: [], lands, areaOf: () => 0 });
    expect(byLote[0].totalKg).toBe(100);
    expect(byLote[0].kgPerHa).toBeNull(); // sin área no se puede rendir por ha
  });
});

describe('yieldPerPlantByCrop', () => {
  it('divide kg del cultivo entre nº de plantas', () => {
    const plants = [
      { id: 'p1', attributes: { name: 'Fresa' } },
      { id: 'p2', attributes: { name: 'Fresa' } },
    ];
    const norm = normalizeHarvests([
      harvest({ id: '1', assetId: 'p1', name: 'Cosecha de Fresa', value: 8, unit: 'kg', ts: 1 }),
    ]);
    const y = yieldPerPlantByCrop(norm, plants);
    expect(y[0]).toMatchObject({ crop: 'Fresa', plantCount: 2, kgPerPlant: 4 });
  });
});

describe('temporalTrend', () => {
  it('detecta tendencia al alza en meses consecutivos', () => {
    const mk = (m, v) => harvest({ id: `${m}-${v}`, name: 'Cosecha de Fresa', value: v, unit: 'kg', ts: Math.floor(Date.parse(`2026-0${m}-15T00:00:00Z`) / 1000) });
    const norm = normalizeHarvests([mk(1, 1), mk(2, 3), mk(3, 6)]);
    const t = temporalTrend(norm);
    expect(t.series.map((s) => s.period)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(t.series.map((s) => s.totalKg)).toEqual([1, 3, 6]);
    expect(t.direction).toBe('subiendo');
    expect(t.slope).toBeGreaterThan(0);
  });

  it('marca estable con un solo mes', () => {
    const norm = normalizeHarvests([harvest({ id: '1', name: 'Cosecha de Fresa', value: 5, unit: 'kg', ts: 1 })]);
    expect(temporalTrend(norm).direction).toBe('estable');
  });
});

describe('harvestSummary — integración', () => {
  it('compone total, top-crop, por-lote y tendencia', () => {
    const plants = [
      { id: 'p1', attributes: { name: 'Fresa' }, relationships: { parent: { data: [{ id: 'lote1' }] } } },
    ];
    const lands = [{ id: 'lote1', attributes: { name: 'Era 1' } }];
    const logs = [
      harvest({ id: '1', assetId: 'p1', name: 'Cosecha de Fresa', value: 4, unit: 'kg', ts: Math.floor(Date.parse('2026-06-01T00:00:00Z') / 1000) }),
      harvest({ id: '2', assetId: 'p1', name: 'Cosecha de Fresa', value: 6, unit: 'kg', ts: Math.floor(Date.parse('2026-07-01T00:00:00Z') / 1000) }),
    ];
    const s = harvestSummary(logs, { plants, lands, areaOf: () => 5000 });
    expect(s.totalKg).toBe(10);
    expect(s.totalHarvests).toBe(2);
    expect(s.topCrop.crop).toBe('Fresa');
    expect(s.byLote[0].loteId).toBe('lote1');
    expect(s.byLote[0].kgPerHa).toBe(20); // 10 kg / 0.5 ha
    expect(s.trend.direction).toBe('subiendo');
    expect(s.dateRange.firstMs).toBeLessThan(s.dateRange.lastMs);
  });

  it('resumen vacío con 0 cosechas', () => {
    const s = harvestSummary([], {});
    expect(s.totalHarvests).toBe(0);
    expect(s.topCrop).toBeNull();
    expect(s.dateRange).toEqual({ firstMs: null, lastMs: null });
  });
});
