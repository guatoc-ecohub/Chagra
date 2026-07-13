import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

var logStore = { logsByAsset: {} };

vi.mock('../../store/useLogStore', function () {
  return {
    __esModule: true,
    default: vi.fn(function (selector) {
      if (typeof selector === 'function') return selector(logStore);
      return logStore;
    }),
  };
});

vi.mock('../../config/materials', function () {
  return {
    MATERIAL_CATEGORIES: {
      fertilization: { label: 'Fertilizacion' },
      protection: { label: 'Fitoproteccion' },
      remineralization: { label: 'Remineralizacion' },
      biofabrica: { label: 'Biofabrica' },
    },
    MATERIAL_CATEGORY_BY_NAME: {
      Bokashi: 'fertilization',
      Biol: 'fertilization',
      'Caldo Sulfocalcico': 'protection',
      'Harina de Rocas / Basalto': 'remineralization',
      'Melaza de Cana': 'biofabrica',
    },
  };
});

var mod = await import('../useAssetPerformance');
var useAssetPerformance = mod.useAssetPerformance;

/**
 * @param {any} name
 * @param {any} qtyValue
 * @param {any} [qtyUnit]
 * @param {any} [ts]
 */
function mkInput(name, qtyValue, qtyUnit, ts) {
  return {
    id: crypto.randomUUID(),
    type: 'log--input',
    name: 'Aplicaci\u00f3n de ' + name,
    timestamp: ts || 1718500000,
    quantity: { value: qtyValue, unit: qtyUnit || 'kg' },
    attributes: {
      name: 'Aplicaci\u00f3n de ' + name,
      timestamp: ts || 1718500000,
      quantity: { value: qtyValue, unit: qtyUnit || 'kg' },
    },
  };
}

/**
 * @param {any} qtyValue
 * @param {any} qtyUnit
 * @param {any} [ts]
 */
function mkHarvest(qtyValue, qtyUnit, ts) {
  return {
    id: crypto.randomUUID(),
    type: 'log--harvest',
    timestamp: ts || 1718600000,
    quantity: { value: qtyValue, unit: qtyUnit || 'kg' },
    attributes: {
      timestamp: ts || 1718600000,
      quantity: { value: qtyValue, unit: qtyUnit || 'kg' },
    },
  };
}

describe('useAssetPerformance', function () {
  beforeEach(function () {
    logStore.logsByAsset = {};
  });

  it('hasData=false sin logs', function () {
    var r = renderHook(function () { return useAssetPerformance('asset-1'); }).result;
    expect(r.current.hasData).toBe(false);
    expect(r.current.inputCount).toBe(0);
    expect(r.current.harvestCount).toBe(0);
    expect(r.current.globalRatio).toBe('0.00');
  });

  it('suma peso total de cosechas en kg', function () {
    logStore.logsByAsset = {
      'asset-1': [mkHarvest(50, 'kg'), mkHarvest(30, 'kg')],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-1'); }).result;
    expect(r.current.totalHarvestWeight).toBe('80.00');
    expect(r.current.harvestCount).toBe(2);
  });

  it('convierte gramos a kg', function () {
    logStore.logsByAsset = { 'asset-2': [mkHarvest(500, 'g')] };
    var r = renderHook(function () { return useAssetPerformance('asset-2'); }).result;
    expect(r.current.totalHarvestWeight).toBe('0.50');
  });

  it('convierte mililitros a base', function () {
    logStore.logsByAsset = { 'asset-ml': [mkHarvest(2000, 'ml')] };
    var r = renderHook(function () { return useAssetPerformance('asset-ml'); }).result;
    expect(r.current.totalHarvestWeight).toBe('2.00');
  });

  it('convierte bultos a kg (x50)', function () {
    logStore.logsByAsset = { 'asset-3': [mkHarvest(2, 'bultos')] };
    var r = renderHook(function () { return useAssetPerformance('asset-3'); }).result;
    expect(r.current.totalHarvestWeight).toBe('100.00');
  });

  it('ratio global excluye biofabrica del input', function () {
    logStore.logsByAsset = {
      'asset-4': [
        mkHarvest(100, 'kg'),
        mkInput('Bokashi', 10, 'kg', 1718500000),
        mkInput('Biol', 5, 'l', 1718500000),
        mkInput('Melaza de Cana', 3, 'l', 1718500000),
      ],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-4'); }).result;
    expect(r.current.totalInputWeight).toBe('15.00');
    expect(r.current.globalRatio).toBe('6.67');
    expect(r.current.efficiencyRatio).toBe('6.67');
  });

  it('agrupa insumos por categoria funcional', function () {
    logStore.logsByAsset = {
      'asset-5': [
        mkHarvest(80, 'kg'),
        mkInput('Bokashi', 20, 'kg', 1718500000),
        mkInput('Caldo Sulfocalcico', 500, 'ml', 1718500000),
      ],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-5'); }).result;
    var byCat = /** @type {any} */ (r.current.byCategory);
    expect(byCat.fertilization.total).toBe(20);
    expect(byCat.fertilization.count).toBe(1);
    expect(byCat.protection.total).toBe(0.5);
    expect(byCat.protection.count).toBe(1);
  });

  it('calcula ratio por categoria', function () {
    logStore.logsByAsset = {
      'asset-6': [mkHarvest(60, 'kg'), mkInput('Bokashi', 30, 'kg', 1718500000)],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-6'); }).result;
    var byCatR = /** @type {any} */ (r.current.byCategory);
    expect(byCatR.fertilization.ratio).toBe('2.00');
  });

  it('maneja cantidades nulas sin explotar', function () {
    logStore.logsByAsset = {
      'asset-null': [mkHarvest(null, 'kg'), mkInput('Bokashi', null, 'kg')],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-null'); }).result;
    expect(r.current.totalHarvestWeight).toBe('0.00');
    expect(r.current.hasData).toBe(true);
  });

  it('weeklyTrend ISO semanas en orden', function () {
    logStore.logsByAsset = {
      'asset-weekly': [
        mkHarvest(50, 'kg', 1718500000),
        mkInput('Bokashi', 10, 'kg', 1718500000),
        mkHarvest(30, 'kg', 1718700000),
      ],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-weekly'); }).result;
    expect(r.current.weeklyTrend.length).toBeGreaterThanOrEqual(1);
    var weeks = r.current.weeklyTrend.map(function (w) { return w.week; });
    expect(weeks).toEqual(weeks.slice().sort());
  });

  it('material desconocido cae a fertilization', function () {
    logStore.logsByAsset = {
      'asset-dc': [mkHarvest(20, 'kg'), mkInput('Material Desconocido', 10, 'kg')],
    };
    var r = renderHook(function () { return useAssetPerformance('asset-dc'); }).result;
    var byCatDc = /** @type {any} */ (r.current.byCategory);
    expect(byCatDc.fertilization.count).toBe(1);
    expect(byCatDc.fertilization.total).toBe(10);
  });

  it('sin assetId no explota y retorna vacio', function () {
    var r = renderHook(function () { return useAssetPerformance(null); }).result;
    expect(r.current.hasData).toBe(false);
    expect(r.current.inputCount).toBe(0);
  });
});
