import { describe, it, expect, vi } from 'vitest';

vi.mock('../farmEventService', () => ({
  recordFarmEvent: vi.fn((e) => Promise.resolve({ event_id: 'mock-evt', ...e })),
}));

import { recordFarmEvent } from '../farmEventService';
import { registerVoiceObservation } from '../voiceObservationService';

describe('registerVoiceObservation', () => {
  it('rechaza sin processId', async () => {
    await expect(registerVoiceObservation(/** @type {any} */ ({ transcription: 'se ve bien' }))).rejects.toThrow(/process_id/);
  });

  it('rechaza transcription vacia', async () => {
    await expect(registerVoiceObservation(/** @type {any} */ ({ processId: 'p1', transcription: '' }))).rejects.toThrow(/transcription/);
  });

  it('guarda con source=voice y capture_mode=voice', async () => {
    await registerVoiceObservation(/** @type {any} */ ({ processId: 'p1', transcription: 'el cafetal está florido' }));
    expect(recordFarmEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        process_id: 'p1',
        event_type: 'observation',
        source: 'voice',
        payload: { text: 'el cafetal está florido', capture_mode: 'voice' },
        confidence: 0.85,
      })
    );
  });
});
