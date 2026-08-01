import { describe, it, expect, vi } from 'vitest';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'evt-' + e.event_type })),
}));

vi.mock('../../db/farmProcessCache', () => ({
  getFarmProcess: vi.fn(),
  putFarmProcess: vi.fn(),
}));

vi.mock('../../types/farmProcess', () => ({
  validateFarmProcess: vi.fn(),
}));

import { recordFarmEvent } from '../farmEventService';
import { getFarmProcess, putFarmProcess } from '../../db/farmProcessCache';
import { confirmStage } from '../stageConfirmationService';

describe('confirmStage', () => {
  it('rechaza sin processId', async () => {
    await expect(confirmStage(/** @type {any} */ ({ newStage: 'flowering' }))).rejects.toThrow(/process_id/);
  });

  it('rechaza sin newStage', async () => {
    await expect(confirmStage(/** @type {any} */ ({ processId: 'p1' }))).rejects.toThrow(/newStage/);
  });

  it('lanza si proceso no existe', async () => {
    vi.mocked(getFarmProcess).mockResolvedValue(undefined);
    await expect(confirmStage({ processId: 'p1', newStage: 'flowering' })).rejects.toThrow(/not found/);
  });

  it('registra evento y actualiza proceso', async () => {
    const mockProcess = {
      process_id: 'p1',
      type: 'farm_process',
      attributes: {
        current_stage: 'vegetative',
        updated_at: 1000,
      },
    };
    vi.mocked(getFarmProcess).mockResolvedValue(/** @type {any} */ (mockProcess));

    const result = await confirmStage({ processId: 'p1', newStage: 'flowering', reason: 'Flores visibles' });

    expect(recordFarmEvent).toHaveBeenCalled();
    expect(/** @type {any} */ (mockProcess).attributes.current_stage).toBe('flowering');
    expect(putFarmProcess).toHaveBeenCalledWith(/** @type {any} */ (mockProcess));
    expect(result.process.attributes.current_stage).toBe('flowering');
  });

  it('genera stage_corrected si la etapa cambia', async () => {
    const mockProcess = {
      process_id: 'p1',
      type: 'farm_process',
      attributes: { current_stage: 'vegetative', updated_at: 1000 },
    };
    vi.mocked(getFarmProcess).mockResolvedValue(/** @type {any} */ (mockProcess));

    await confirmStage({ processId: 'p1', newStage: 'flowering' });

    const corrected = vi.mocked(recordFarmEvent).mock.calls.find(c => c[0].event_type === 'stage_corrected');
    expect(corrected).toBeDefined();
    expect(corrected[0].payload.previous_stage).toBe('vegetative');
    expect(corrected[0].payload.new_stage).toBe('flowering');
  });
});
