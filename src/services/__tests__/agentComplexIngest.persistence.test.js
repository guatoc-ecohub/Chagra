import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../loteService.js', () => ({
  createLote: vi.fn(),
}));

vi.mock('../farmEventService.js', () => ({
  createFarmProcess: vi.fn(),
  recordFarmEvent: vi.fn(),
}));

import { createLote } from '../loteService.js';
import { createFarmProcess, recordFarmEvent } from '../farmEventService.js';
import { decomposeComplexIngest, persistComplexIngest } from '../agentComplexIngest.js';

const MESSAGE = 'sembré 10 tomate cherry en surco 12 hace 3 meses, 3 cosechas, abono c/15d, trozador+gota';
const NOW = new Date('2026-08-28T12:00:00.000Z');

describe('persistComplexIngest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createLote).mockResolvedValue({ id: 'land-12', type: 'asset--land' });
    vi.mocked(createFarmProcess).mockImplementation(async (process) => ({
      process,
      event: { event_id: 'seed-event', type: 'farm_process_event' },
    }));
    vi.mocked(recordFarmEvent).mockImplementation(async (input) => ({
      event_id: `event-${input.event_type}-${input.idempotency_key}`,
      type: 'farm_process_event',
      attributes: input,
    }));
  });

  it('persiste el ciclo y los 6 eventos posteriores del mensaje corto', async () => {
    const plan = decomposeComplexIngest(MESSAGE, { now: NOW });
    const result = await persistComplexIngest(plan, { operatorId: 'operator-1', now: NOW.getTime() });

    expect(result).toMatchObject({ status: 'executed', executed: 8, failed: 0, landId: 'land-12' });
    expect(createLote).toHaveBeenCalledWith({ name: 'Surco 12', landType: 'bed' });
    expect(createFarmProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'farm_process',
        attributes: expect.objectContaining({
          process_type: 'sowing',
          subject_kind: 'aggregate',
          subject_slug: 'solanum_lycopersicum',
          quantity: 10,
          location_land_asset_id: 'land-12',
          created_at: new Date('2026-05-28T12:00:00.000Z').getTime(),
        }),
      }),
      { awaitSync: true },
    );
    expect(recordFarmEvent).toHaveBeenCalledTimes(6);
    expect(vi.mocked(recordFarmEvent).mock.calls.map(([input]) => input.event_type)).toEqual([
      'harvest_confirmed', 'harvest_confirmed', 'harvest_confirmed',
      'task_completed', 'observation', 'observation',
    ]);
    expect(vi.mocked(recordFarmEvent).mock.calls.every(([input]) => input.await_sync === true)).toBe(true);
    expect(vi.mocked(recordFarmEvent).mock.calls.slice(-2).map(([input]) => input.payload.name)).toEqual(['trozador', 'gota']);
  });

  it('no declara éxito total si falla una escritura', async () => {
    vi.mocked(recordFarmEvent).mockRejectedValueOnce(new Error('IDB unavailable'));
    const plan = decomposeComplexIngest(MESSAGE, { now: NOW });
    const result = await persistComplexIngest(plan, { operatorId: 'operator-1', now: NOW.getTime() });

    expect(result).toMatchObject({ status: 'partial', failed: 1, executed: 2 });
    expect(result.results.at(-1)).toMatchObject({ status: 'failed', error: 'IDB unavailable' });
  });
});
