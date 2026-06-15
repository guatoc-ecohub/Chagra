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

describe('exportService', () => {
  describe('exportTraceabilityCsv', () => {
    it('genera descarga con logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          type: 'log--input',
          name: 'Aplicacion de Compost',
          timestamp: Math.floor(Date.now() / 1000),
          quantity: { value: 5, unit: 'kg' },
          asset_id: 'abc12345-1234-1234-1234-123456789abc',
          _pending: false,
          relationships: {},
        },
      ];

      logCache.getAll.mockResolvedValue(mockLogs);

      const result = await exportTraceabilityCsv({ filename: 'test.csv' });

      expect(result.rowCount).toBe(1);
      expect(result.filename).toBe('test.csv');
      expect(typeof result.pendingCount).toBe('number');
    });

    it('filtra por types si se especifica', async () => {
      const mockLogs = [
        { id: 'a', type: 'log--input', timestamp: 1000, quantity: {}, name: 'Test', _pending: false, relationships: {} },
        { id: 'b', type: 'log--harvest', timestamp: 2000, quantity: {}, name: 'Test', _pending: false, relationships: {} },
      ];
      logCache.getAll.mockResolvedValue(mockLogs);

      const result = await exportTraceabilityCsv({
        types: ['log--harvest'],
        filename: 'test.csv',
      });
      expect(result.rowCount).toBe(1);
    });

    it('genera filename por defecto con fecha', async () => {
      logCache.getAll.mockResolvedValue([]);
      const result = await exportTraceabilityCsv();
      expect(result.filename).toContain('chagra_trazabilidad_');
    });
  });
});
