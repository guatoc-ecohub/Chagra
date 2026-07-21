import { describe, it, expect, vi } from 'vitest';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'evt-' + e.event_type })),
}));

import { recordFarmEvent } from '../farmEventService';
import { completeTaskByVoice, rescheduleTaskByVoice } from '../voiceTaskService';

describe('completeTaskByVoice', () => {
  it('rechaza sin processId', async () => {
    await expect(completeTaskByVoice(/** @type {any} */ ({ taskName: 'regar' }))).rejects.toThrow(/process_id/);
  });

  it('registra task_completed', async () => {
    await completeTaskByVoice({ processId: 'p1', taskName: 'regar tomate', actor: 'operator' });
    expect(recordFarmEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        process_id: 'p1',
        event_type: 'task_completed',
        source: 'voice',
        payload: expect.objectContaining({ completed_task: 'regar tomate' }),
      })
    );
  });
});

describe('rescheduleTaskByVoice', () => {
  it('registra note con reschedule', async () => {
    const future = Date.now() + 86400000;
    await rescheduleTaskByVoice({ processId: 'p1', taskName: 'fertilizar', newDate: future });
    expect(recordFarmEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'note',
        payload: expect.objectContaining({
          type: 'reschedule',
          task: 'fertilizar',
          rescheduled_to: future,
        }),
      })
    );
  });
});
