/**
 * fincaClockService — el RELOJ DEL FRAILEJÓN es GROUNDED: los años salen de
 * los registros reales (primer FarmProcess / primera planta), y una finca
 * nueva muestra el año actual como primer anillo. NUNCA inventa historia.
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(),
}));
vi.mock('../../db/assetCache', () => ({
  assetCache: { getByType: vi.fn() },
}));

import { listFarmProcesses } from '../../db/farmProcessCache';
import { assetCache } from '../../db/assetCache';
import { getAniosFinca, anioDeTimestamp } from '../fincaClockService';

const NOW = new Date('2026-07-09T12:00:00-05:00');
const ANIO = NOW.getFullYear();

beforeEach(() => {
  vi.mocked(listFarmProcesses).mockResolvedValue([]);
  vi.mocked(assetCache.getByType).mockResolvedValue([]);
});

describe('anioDeTimestamp — parseo defensivo', () => {
  test('unix ms, unix segundos e ISO dan el mismo año', () => {
    const ms = Date.parse('2024-03-15T10:00:00Z');
    expect(anioDeTimestamp(ms, ANIO)).toBe(2024);
    expect(anioDeTimestamp(Math.floor(ms / 1000), ANIO)).toBe(2024);
    expect(anioDeTimestamp('2024-03-15T10:00:00Z', ANIO)).toBe(2024);
  });

  test('basura y fechas fuera de la ventana de cordura → null', () => {
    expect(anioDeTimestamp(null, ANIO)).toBe(null);
    expect(anioDeTimestamp(undefined, ANIO)).toBe(null);
    expect(anioDeTimestamp('no-es-fecha', ANIO)).toBe(null);
    expect(anioDeTimestamp(0, ANIO)).toBe(null);
    expect(anioDeTimestamp(-5, ANIO)).toBe(null);
    // año 1999 (< 2000): fuera de cordura
    expect(anioDeTimestamp(Date.parse('1999-01-01'), ANIO)).toBe(null);
    // futuro: un registro no puede ser de un año que no ha llegado
    expect(anioDeTimestamp(Date.parse(`${ANIO + 3}-01-01`), ANIO)).toBe(null);
  });
});

describe('getAniosFinca — un anillo por año REAL', () => {
  test('finca nueva (sin registros): el año actual es el primer anillo', async () => {
    const r = await getAniosFinca({ now: NOW });
    expect(r.fincaNueva).toBe(true);
    expect(r.fuente).toBe('finca-nueva');
    expect(r.primerAnio).toBe(ANIO);
    expect(r.anios).toEqual([ANIO]);
  });

  test('el primer FarmProcess (created_at en ms) fija el primer año', async () => {
    // Fixtures parciales a propósito (solo el campo que el servicio lee);
    // el cast evita exigir un FarmProcess completo en el mock.
    vi.mocked(listFarmProcesses).mockResolvedValue(/** @type {any} */ ([
      { attributes: { created_at: Date.parse('2025-02-01') } },
      { attributes: { created_at: Date.parse('2024-06-10') } },
    ]));
    const r = await getAniosFinca({ now: NOW });
    expect(r.fincaNueva).toBe(false);
    expect(r.fuente).toBe('registros');
    expect(r.primerAnio).toBe(2024);
    expect(r.anios).toEqual([2024, 2025, 2026]);
  });

  test('la primera planta también cuenta: created (segundos farmOS) y _createdAt (ms local)', async () => {
    vi.mocked(assetCache.getByType).mockResolvedValue([
      { attributes: { created: Math.floor(Date.parse('2023-11-20') / 1000) } },
      { _createdAt: Date.parse('2025-01-05') },
    ]);
    const r = await getAniosFinca({ now: NOW });
    expect(r.primerAnio).toBe(2023);
    expect(r.anios).toEqual([2023, 2024, 2025, 2026]);
    expect(assetCache.getByType).toHaveBeenCalledWith('plant');
  });

  test('timestamps basura se ignoran sin romper (degrada a finca nueva)', async () => {
    vi.mocked(listFarmProcesses).mockResolvedValue(/** @type {any} */ ([
      { attributes: { created_at: 'zzz' } },
      { attributes: {} },
      null,
    ]));
    vi.mocked(assetCache.getByType).mockResolvedValue([{ attributes: { created: -1 } }]);
    const r = await getAniosFinca({ now: NOW });
    expect(r.fincaNueva).toBe(true);
    expect(r.anios).toEqual([ANIO]);
  });

  test('IDB caído no truena: degrada honesto a finca nueva', async () => {
    vi.mocked(listFarmProcesses).mockRejectedValue(new Error('idb'));
    vi.mocked(assetCache.getByType).mockRejectedValue(new Error('idb'));
    const r = await getAniosFinca({ now: NOW });
    expect(r.fincaNueva).toBe(true);
    expect(r.anios).toEqual([ANIO]);
  });
});
