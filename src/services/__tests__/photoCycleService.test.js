import { describe, it, expect, vi } from 'vitest';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'evt-' + e.event_type })),
}));

import { recordFarmEvent } from '../farmEventService';
import { attachPhotoToCycle, isOutOfDomain } from '../photoCycleService';

describe('attachPhotoToCycle', () => {
  it('rechaza sin processId', async () => {
    await expect(attachPhotoToCycle(/** @type {any} */ ({ visionResult: {} }))).rejects.toThrow(/process_id/);
  });

  it('rechaza sin visionResult', async () => {
    await expect(attachPhotoToCycle(/** @type {any} */ ({ processId: 'p1' }))).rejects.toThrow(/visionResult/);
  });

  it('guarda evento photo_attached con análisis', async () => {
    const vision = { diagnosis: 'mancha foliar', confidence: 0.85, issues: ['hongo'], treatment_suggestion: 'caldo bordelés' };
    await attachPhotoToCycle(/** @type {any} */ ({ processId: 'p1', visionResult: vision, imageHash: 'abc123' }));

    expect(recordFarmEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        process_id: 'p1',
        event_type: 'photo_attached',
        source: 'camera',
        payload: expect.objectContaining({
          image_hash: 'abc123',
          analysis: expect.objectContaining({
            diagnosis: 'mancha foliar',
            confidence: 0.85,
          }),
        }),
      })
    );
  });

  it('marca out-of-domain si el resultado lo indica', () => {
    expect(isOutOfDomain({ is_out_of_domain: true })).toBe(true);
    expect(isOutOfDomain({ confidence: 0.05 })).toBe(true);
    expect(isOutOfDomain({ rejection_reason: 'non_agricultural' })).toBe(true);
    expect(isOutOfDomain({ confidence: 0.8 })).toBe(false);
    expect(isOutOfDomain(null)).toBe(false);
  });
});
