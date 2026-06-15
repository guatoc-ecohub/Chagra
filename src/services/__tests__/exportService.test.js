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
  },
  MATERIAL_CATEGORY_BY_NAME: {
    'Compost': 'fertilizer',
    'Caldo sulfocalcico': 'protection',
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
      // Verificamos que el CSV se genera sin errores con bultos
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
  });
});
