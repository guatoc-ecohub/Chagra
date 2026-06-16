import { describe, test, expect } from 'vitest';
import { lunarPhase, solarTimes, moonPathD, formatLocalHM, formatDayLength } from '../skyEphemeris';

describe('skyEphemeris', () => {
  test('lunarPhase returns expected shape', () => {
    const result = lunarPhase(new Date('2026-06-15'));
    expect(result).toHaveProperty('phase');
    expect(result).toHaveProperty('emoji');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('fraction');
    expect(typeof result.phase).toBe('string');
    expect(typeof result.emoji).toBe('string');
    expect(typeof result.label).toBe('string');
    expect(typeof result.fraction).toBe('number');
  });

  test('lunarPhase with latitude option', () => {
    const result = lunarPhase(new Date('2026-06-15'), { latitude: 4.5 });
    expect(result).toHaveProperty('phase');
  });

  test('lunarPhase default date', () => {
    const result = lunarPhase();
    expect(result).toHaveProperty('phase');
  });

  test('solarTimes returns expected shape', () => {
    const result = solarTimes(new Date('2026-06-15'), 4.5, -74.1);
    expect(result).toHaveProperty('sunrise');
    expect(result).toHaveProperty('sunset');
    expect(result).toHaveProperty('dayLength');
    expect(result.sunrise).toBeInstanceOf(Date);
    expect(result.sunset).toBeInstanceOf(Date);
  });

  test('moonPathD returns path string', () => {
    const result = moonPathD(0.5);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('formatLocalHM formats Date', () => {
    const result = formatLocalHM(new Date('2026-06-15T12:30:00'));
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\d/);
  });

  test('formatDayLength returns readable string', () => {
    const result = formatDayLength(725);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/\d/);
  });
});
