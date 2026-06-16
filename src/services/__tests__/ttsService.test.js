import { describe, test, expect } from 'vitest';
import { KOKORO_VOICES, DEFAULT_KOKORO_VOICE, DEFAULT_KOKORO_RATE, KOKORO_RATE_MIN, KOKORO_RATE_MAX } from '../ttsService';

describe('ttsService', () => {
  test('KOKORO_VOICES is a non-empty frozen array', () => {
    expect(Array.isArray(KOKORO_VOICES)).toBe(true);
    expect(KOKORO_VOICES.length).toBeGreaterThan(0);
    expect(Object.isFrozen(KOKORO_VOICES)).toBe(true);
  });

  test('KOKORO_VOICES entries have id and label', () => {
    for (const voice of KOKORO_VOICES) {
      expect(voice).toHaveProperty('id');
      expect(voice).toHaveProperty('label');
      expect(typeof voice.id).toBe('string');
      expect(typeof voice.label).toBe('string');
    }
  });

  test('DEFAULT_KOKORO_VOICE is a valid voice id', () => {
    expect(typeof DEFAULT_KOKORO_VOICE).toBe('string');
    const voiceIds = KOKORO_VOICES.map((v) => v.id);
    expect(voiceIds).toContain(DEFAULT_KOKORO_VOICE);
  });

  test('TTS rate constants are numbers in valid range', () => {
    expect(typeof DEFAULT_KOKORO_RATE).toBe('number');
    expect(typeof KOKORO_RATE_MIN).toBe('number');
    expect(typeof KOKORO_RATE_MAX).toBe('number');
    expect(DEFAULT_KOKORO_RATE).toBeGreaterThanOrEqual(KOKORO_RATE_MIN);
    expect(DEFAULT_KOKORO_RATE).toBeLessThanOrEqual(KOKORO_RATE_MAX);
  });
});
