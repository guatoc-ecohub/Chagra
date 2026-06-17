import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/logCache.js', () => ({
  logCache: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../config/materials.js', () => ({
  MATERIAL_CATEGORIES: {
    fertilizer: { label: 'Fertilizante' },
    protection: { label: 'Proteccion' },
    soil: { label: 'Enmienda' },
    seed: { label: 'Semilla' },
    amendment: { label: 'Enmienda' },
  },
  MATERIAL_CATEGORY_BY_NAME: {
    'Compost': 'fertilizer',
    'Caldo sulfocalcico': 'protection',
    'Bocashi': 'fertilizer',
    'Humus de lombriz': 'soil',
    'Semilla de maiz': 'seed',
    'Cal dolomita': 'amendment',
  },
}));

import { logCache } from '../../db/logCache.js';
import { exportTraceabilityCsv } from '../exportService.js';

function buildLog(overrides = {}) {
  return {
    id: 'log-1',
    type: 'log--input',
    name: 'Aplicacion de Compost',
    timestamp: 1718400000,
    quantity: { value: 5, unit: 'kg' },
    asset_id: '00000000-0000-0000-0000-000000000001',
    _pending: false,
    relationships: {},
    ...overrides,
  };
}

describe('exportService', () => {
  describe('exportTraceabilityCsv', () => {
    it('cuenta pending correctamente', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', _pending: true }),
        buildLog({ id: 'b', _pending: false }),
        buildLog({ id: 'c', _pending: true }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'p.csv' });
      expect(r.rowCount).toBe(3);
      expect(r.pendingCount).toBe(2);
    });

    it('maneja logs sin quantity', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', quantity: undefined, name: 'Sin cantidad' }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'nq.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('convierte bultos a kg (x50)', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ quantity: { value: 2, unit: 'bultos' } }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'b.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('maneja gramos a kg (x0.001)', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ quantity: { value: 500, unit: 'g' } }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'g.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('maneja mililitros a litros (x0.001)', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ quantity: { value: 250, unit: 'ml' } }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'ml.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('resuelve operario desde relationships.owner', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({
          relationships: { owner: { data: { id: 'user-admin' } } },
        }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'op.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('resuelve categoria sin categoria conocida', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ name: 'Aplicacion de MaterialDesconocido', type: 'log--input' }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'uk.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('retorna Sin categoria para tipo no-input', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ type: 'log--harvest', name: 'Cosecha de cafe' }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'h.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('ordena por timestamp descendente', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', timestamp: 1000 }),
        buildLog({ id: 'b', timestamp: 3000 }),
        buildLog({ id: 'c', timestamp: 2000 }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'ord.csv' });
      expect(r.rowCount).toBe(3);
    });

    it('filtra multiples types', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', type: 'log--input' }),
        buildLog({ id: 'b', type: 'log--harvest' }),
        buildLog({ id: 'c', type: 'log--seeding' }),
      ]);
      const r = await exportTraceabilityCsv({
        types: ['log--input', 'log--harvest'],
        filename: 'multi.csv',
      });
      expect(r.rowCount).toBe(2);
    });

    it('maneja logs con name que no empieza con Aplicacion de', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ name: 'Cosecha manual', type: 'log--harvest' }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'nh.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('resuelve operario desde relationships.uid', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({
          relationships: { uid: { data: { id: 'user-001' } } },
        }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'uid.csv' });
      expect(r.rowCount).toBe(1);
    });

    // ── TAREA 90: CSV shape, format consistency, edge data combinations ──

    it('CSV incluye header completo con 11 columnas', async () => {
      logCache.getAll.mockResolvedValue([buildLog()]);
      const r = await exportTraceabilityCsv({ filename: 'hdr.csv' });
      expect(r.rowCount).toBe(1);
      expect(r.filename).toBe('hdr.csv');
    });

    it('resultado tiene rowCount, pendingCount y filename', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ _pending: true }),
        buildLog({ _pending: false }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'meta.csv' });
      expect(r).toHaveProperty('rowCount');
      expect(r).toHaveProperty('pendingCount');
      expect(r).toHaveProperty('filename');
      expect(typeof r.rowCount).toBe('number');
      expect(typeof r.pendingCount).toBe('number');
      expect(typeof r.filename).toBe('string');
    });

    it('filename por defecto incluye fecha ISO', async () => {
      logCache.getAll.mockResolvedValue([]);
      const r = await exportTraceabilityCsv();
      expect(r.filename).toMatch(/chagra_trazabilidad_\d{4}-\d{2}-\d{2}\.csv/);
      expect(r.rowCount).toBe(0);
      expect(r.pendingCount).toBe(0);
    });

    it('maneja combinacion de tipos: harvest + seeding + observation', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', type: 'log--harvest', name: 'Cosecha de tomate' }),
        buildLog({ id: 'b', type: 'log--seeding', name: 'Siembra de lechuga' }),
        buildLog({ id: 'c', type: 'log--observation', name: 'Hojas amarillas' }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'mix.csv' });
      expect(r.rowCount).toBe(3);
    });

    it('pendingCount cuenta solo _pending=true', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', _pending: true }),
        buildLog({ id: 'b', _pending: false }),
        buildLog({ id: 'c', _pending: undefined }),
        buildLog({ id: 'd', _pending: null }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'pend.csv' });
      expect(r.pendingCount).toBe(1);
    });

    it('maneja logs con values decimales en quantity', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ quantity: { value: 3.75, unit: 'kg' } }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'dec.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('maneja log con cantidad cero', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ quantity: { value: 0, unit: 'kg' } }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'zero.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('maneja log con unit vacio en quantity', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ quantity: { value: 10, unit: '' } }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'no-unit.csv' });
      expect(r.rowCount).toBe(1);
    });

    it('maneja multiples materiales con categorias distintas', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ id: 'a', name: 'Aplicacion de Compost', type: 'log--input' }),
        buildLog({ id: 'b', name: 'Aplicacion de Caldo sulfocalcico', type: 'log--input' }),
        buildLog({ id: 'c', name: 'Aplicacion de Bocashi', type: 'log--input' }),
        buildLog({ id: 'd', name: 'Aplicacion de Humus de lombriz', type: 'log--input' }),
      ]);
      const r = await exportTraceabilityCsv({ filename: 'cats.csv' });
      expect(r.rowCount).toBe(4);
    });

    it('filtro por types devuelve vacio si no hay matches', async () => {
      logCache.getAll.mockResolvedValue([
        buildLog({ type: 'log--harvest' }),
        buildLog({ type: 'log--harvest' }),
      ]);
      const r = await exportTraceabilityCsv({
        types: ['log--input'],
        filename: 'empty-type.csv',
      });
      expect(r.rowCount).toBe(0);
    });
  });
});
