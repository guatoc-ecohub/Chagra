import { describe, it, expect, vi } from 'vitest';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'mock-evt', ...e })),
}));

import { recordFarmEvent } from '../farmEventService';
import { registerObservation } from '../observationService';

describe('registerObservation', () => {
  it('rechaza sin processId', async () => {
    await expect(registerObservation(/** @type {any} */ ({ text: 'se ve bien' }))).rejects.toThrow(/process_id/);
  });

  it('rechaza sin text', async () => {
    await expect(registerObservation(/** @type {any} */ ({ processId: 'p1' }))).rejects.toThrow(/text/);
  });

  it('rechaza text vacio', async () => {
    await expect(registerObservation(/** @type {any} */ ({ processId: 'p1', text: '' }))).rejects.toThrow(/text/);
  });

  it('llama recordFarmEvent con event_type=observation y payload.text', async () => {
    const result = await registerObservation(/** @type {any} */ ({ processId: 'p1', text: 'las hojas están amarillas' }));
    expect(recordFarmEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        process_id: 'p1',
        event_type: 'observation',
        payload: { text: 'las hojas están amarillas' },
        confidence: 1.0,
      })
    );
    expect(result.event_id).toBe('mock-evt');
  });

  it('tolera actor y source custom', async () => {
    await registerObservation(/** @type {any} */ ({ processId: 'p1', text: 'crece bien', actor: 'ai', source: 'vision' }));
    expect(recordFarmEvent).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'ai', source: 'vision' })
    );
  });
});
