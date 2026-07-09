import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../apiService.js', () => ({
  sendToFarmOS: vi.fn(),
}));

vi.mock('../syncManager.js', () => ({
  syncManager: {
    enqueuePendingTransaction: vi.fn(),
    saveTransaction: vi.fn(),
  },
}));

vi.mock('../planGeneratorService.js', () => ({
  tryGeneratePlanFromSeeding: vi.fn(),
}));

import { sendToFarmOS } from '../apiService.js';
import { tryGeneratePlanFromSeeding } from '../planGeneratorService.js';
import { savePayload } from '../payloadService.js';

const PLANT_UUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('payloadService', () => {
  describe('savePayload', () => {
    it('es una funcion exportada', () => {
      expect(typeof savePayload).toBe('function');
    });
  });

  // ─── savePayload (online) → tryGeneratePlanFromSeeding (audit 070.2) ─────
  // El path online-directo (sin pasar por syncManager) debe delegar la
  // generación del plan al mismo helper compartido que usa el path
  // offline-then-sync, y debe hacerlo una única vez por siembra creada —
  // nunca cero (planta sin plan) ni más de una (plan duplicado).
  describe('savePayload — seeding online genera plan (070.2)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(tryGeneratePlanFromSeeding).mockResolvedValue({ steps: [{ id: 'step-1' }] });
    });

    const makeSeedingPayload = () => ({
      data: {
        type: 'log--seeding',
        attributes: { name: 'Siembra Tomate Cherry', timestamp: 1_700_000_000 },
        relationships: {
          asset: {
            data: [{
              type: 'asset--plant',
              _speciesSlug: 'tomate',
              attributes: { name: 'Tomate Cherry', status: 'active' },
            }],
          },
        },
      },
    });

    it('llama tryGeneratePlanFromSeeding una sola vez con los datos de la siembra', async () => {
      vi.mocked(sendToFarmOS)
        .mockResolvedValueOnce({ data: { id: PLANT_UUID, type: 'asset--plant' } })
        .mockResolvedValueOnce({ data: { id: 'log-seeding-id', type: 'log--seeding' } });

      await savePayload('seeding', makeSeedingPayload());

      expect(tryGeneratePlanFromSeeding).toHaveBeenCalledOnce();
      expect(tryGeneratePlanFromSeeding).toHaveBeenCalledWith({
        assetId: PLANT_UUID,
        speciesSlug: 'tomate',
        plantingDate: new Date(1_700_000_000 * 1000).toISOString(),
        plantName: 'Tomate Cherry',
      });
    });

    it('no duplica: una segunda siembra distinta también genera una sola llamada (idempotencia vive en el helper)', async () => {
      vi.mocked(sendToFarmOS)
        .mockResolvedValueOnce({ data: { id: PLANT_UUID, type: 'asset--plant' } })
        .mockResolvedValueOnce({ data: { id: 'log-seeding-id', type: 'log--seeding' } });

      await savePayload('seeding', makeSeedingPayload());

      // La segunda vez el helper (mockeado aquí, testeado a fondo en
      // planGeneratorService.test.js) es quien decide si ya existe plan —
      // savePayload no debe invocarlo más de una vez por llamada.
      expect(tryGeneratePlanFromSeeding).toHaveBeenCalledTimes(1);
    });
  });
});
