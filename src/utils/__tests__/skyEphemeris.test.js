import { describe, test, expect } from 'vitest';
import { lunarPhase, solarTimes, moonPathD, formatLocalHM, formatDayLength } from '../skyEphemeris';

describe('skyEphemeris', () => {
  test('lunarPhase returns expected shape', () => {
    const result = lunarPhase(new Date('2026-06-15'));
    expect(result).toHaveProperty('fraction');
    expect(result).toHaveProperty('illumination');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('icon');
    expect(result).toHaveProperty('fraction');
    expect(typeof result.name).toBe('string');
    expect(typeof result.icon).toBe('string');
    expect(typeof result.fraction).toBe('number');
  });

  test('lunarPhase with latitude option', () => {
    const result = lunarPhase(new Date('2026-06-15'), { latitude: 4.5 });
    expect(result).toHaveProperty('icon');
  });

  test('lunarPhase default date', () => {
    const result = lunarPhase();
    expect(result).toHaveProperty('name');
  });

  test('solarTimes returns expected shape', () => {
    const result = solarTimes(new Date('2026-06-15'), 4.5, -74.1);
    expect(result).toHaveProperty('sunrise');
    expect(result).toHaveProperty('sunset');
    expect(result).toHaveProperty('solarNoon');
    expect(result).toHaveProperty('dayLengthMinutes');
    expect(result).toHaveProperty('isDaylight');
    expect(result.sunrise).toBeInstanceOf(Date);
    expect(result.sunset).toBeInstanceOf(Date);
  });

  test('moonPathD returns path object', () => {
    const result = moonPathD(0.5);
    expect(result).toHaveProperty('kind');
    expect(result).toHaveProperty('d');
    expect(result.kind).toBe('full');
    expect(result.d).toBeNull();
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
