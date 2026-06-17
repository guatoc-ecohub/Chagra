import { describe, test, expect } from 'vitest';
import { CAPABILITY_MANIFEST, CHIP_INTENTS, CHIP_DEFS } from '../agentCapabilities';

describe('agentCapabilities', () => {
  test('CAPABILITY_MANIFEST is a non-empty frozen array', () => {
    expect(Array.isArray(CAPABILITY_MANIFEST)).toBe(true);
    expect(CAPABILITY_MANIFEST.length).toBeGreaterThan(0);
    expect(Object.isFrozen(CAPABILITY_MANIFEST)).toBe(true);
  });

  test('CAPABILITY_MANIFEST entries have required fields', () => {
    for (const cap of CAPABILITY_MANIFEST) {
      expect(cap).toHaveProperty('id');
      expect(typeof cap.id).toBe('string');
    }
  });

  test('CHIP_INTENTS is a non-empty frozen object', () => {
    expect(typeof CHIP_INTENTS).toBe('object');
    expect(CHIP_INTENTS).not.toBeNull();
    expect(Object.keys(CHIP_INTENTS).length).toBeGreaterThan(0);
    expect(Object.isFrozen(CHIP_INTENTS)).toBe(true);
  });

  test('CHIP_DEFS is a non-empty frozen array', () => {
    expect(Array.isArray(CHIP_DEFS)).toBe(true);
    expect(CHIP_DEFS.length).toBeGreaterThan(0);
    expect(Object.isFrozen(CHIP_DEFS)).toBe(true);
  });
});
