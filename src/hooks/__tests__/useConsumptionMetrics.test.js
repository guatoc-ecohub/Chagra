import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

var logCacheMock = { getByType: vi.fn().mockResolvedValue([]) };

vi.mock('../../db/logCache', function () { return { logCache: logCacheMock }; });

var mod = await import('../useConsumptionMetrics');
var useConsumptionMetrics = mod.useConsumptionMetrics;

describe('useConsumptionMetrics', function () {
  beforeEach(function () {
    vi.clearAllMocks();
  });

  afterEach(function () {
    vi.useRealTimers();
  });

  it('arranca con loading=true y datos vacios', function () {
    logCacheMock.getByType.mockResolvedValue([]);
    var r = renderHook(function () { return useConsumptionMetrics('Bokashi'); }).result;
    expect(r.current.loading).toBe(true);
    expect(r.current.total).toBe(0);
  });

  it('resuelve a loading=false tras fetch exitoso', async function () {
    logCacheMock.getByType.mockResolvedValue([]);
    var r = renderHook(function () { return useConsumptionMetrics('Bokashi'); }).result;
    await vi.waitFor(function () { return expect(r.current.loading).toBe(false); });
    expect(r.current.total).toBe(0);
  });

  it('resuelve a loading=false tras fetch fallido', async function () {
    logCacheMock.getByType.mockRejectedValue(new Error('IDB error'));
    var r = renderHook(function () { return useConsumptionMetrics('Bokashi'); }).result;
    await vi.waitFor(function () { return expect(r.current.loading).toBe(false); });
    expect(r.current.labels).toEqual([]);
    expect(r.current.total).toBe(0);
  });

  it('filtra por materialName en ventana de 30 dias', async function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    var nowSec = Math.floor(Date.now() / 1000);

    logCacheMock.getByType.mockResolvedValue([
      {
        type: 'log--input',
        timestamp: nowSec - 86400,
        attributes: { name: 'Aplicacion de Bokashi', quantity: { value: '10' } },
      },
      {
        type: 'log--input',
        timestamp: nowSec - 86400 * 40,
        attributes: { name: 'Aplicacion de Bokashi', quantity: { value: '5' } },
      },
      {
        type: 'log--input',
        timestamp: nowSec - 86400 * 2,
        attributes: { name: 'Aplicacion de Biol', quantity: { value: '3' } },
      },
    ]);

    var r = renderHook(function () { return useConsumptionMetrics('Bokashi'); }).result;
    await vi.waitFor(function () { return expect(r.current.loading).toBe(false); });
    expect(r.current.total).toBe(10);
    expect(r.current.labels.length).toBe(1);
  });

  it('materialName vacio retorna todos los inputs', async function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    var nowSec = Math.floor(Date.now() / 1000);

    logCacheMock.getByType.mockResolvedValue([
      {
        type: 'log--input',
        timestamp: nowSec - 10000,
        attributes: { name: 'Aplicacion de X', quantity: { value: '10' } },
      },
      {
        type: 'log--input',
        timestamp: nowSec - 20000,
        attributes: { name: 'Aplicacion de Y', quantity: { value: '20' } },
      },
    ]);

    var r = renderHook(function () { return useConsumptionMetrics(''); }).result;
    await vi.waitFor(function () { return expect(r.current.loading).toBe(false); });
    expect(r.current.total).toBe(30);
  });

  it('agrupa por fecha en serie diaria', async function () {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    var nowSec = Math.floor(Date.now() / 1000);

    logCacheMock.getByType.mockResolvedValue([
      {
        type: 'log--input',
        timestamp: nowSec,
        attributes: { name: 'Aplicacion de B', quantity: { value: '7' } },
      },
      {
        type: 'log--input',
        timestamp: nowSec - 86400,
        attributes: { name: 'Aplicacion de B', quantity: { value: '3' } },
      },
      {
        type: 'log--input',
        timestamp: nowSec,
        attributes: { name: 'Aplicacion de B', quantity: { value: '5' } },
      },
    ]);

    var r = renderHook(function () { return useConsumptionMetrics('B'); }).result;
    await vi.waitFor(function () { return expect(r.current.loading).toBe(false); });
    expect(r.current.total).toBe(15);
    expect(r.current.labels.length).toBe(2);
  });
});
