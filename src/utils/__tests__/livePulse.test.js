import { describe, expect, it } from 'vitest';
import {
  deriveLivePulse,
  getMostRecentActivity,
  livePulseCopy,
  LIVE_PULSE_STATES,
  toTimestampMs,
} from '../livePulse.js';

const NOW = Date.parse('2026-08-24T12:00:00Z');

describe('livePulse', () => {
  it('normaliza segundos, milisegundos e ISO sin mezclar unidades', () => {
    expect(toTimestampMs(1_755_000_000)).toBe(1_755_000_000_000);
    expect(toTimestampMs(1_755_000_000_000)).toBe(1_755_000_000_000);
    expect(toTimestampMs('2026-08-24T12:00:00Z')).toBe(NOW);
    expect(toTimestampMs('no es fecha')).toBeNull();
  });

  it('deriva el último hecho observado sin mutar la colección', () => {
    const sensors = [
      { id: 'a', last_changed: '2026-08-24T11:55:00Z' },
      { id: 'b', timestamp: '2026-08-24T11:58:00Z' },
    ];
    expect(getMostRecentActivity(sensors)).toBe(Date.parse('2026-08-24T11:58:00Z'));
    expect(sensors).toHaveLength(2);
    expect(getMostRecentActivity([])).toBeNull();
  });

  it('clasifica el borde vivo con ventanas deterministas', () => {
    expect(deriveLivePulse(NOW - 60_000, NOW)).toBe(LIVE_PULSE_STATES.LIVE);
    expect(deriveLivePulse(NOW - 5 * 60_000, NOW)).toBe(LIVE_PULSE_STATES.IDLE);
    expect(deriveLivePulse(NOW - 31 * 60_000, NOW)).toBe(LIVE_PULSE_STATES.STALE);
    expect(deriveLivePulse(null, NOW)).toBe(LIVE_PULSE_STATES.UNKNOWN);
  });

  it('no declara live cuando no hay actividad observada', () => {
    expect(livePulseCopy(LIVE_PULSE_STATES.UNKNOWN, null, NOW)).toEqual({
      label: 'Sin actividad',
      detail: 'esperando una lectura',
    });
    expect(livePulseCopy(LIVE_PULSE_STATES.STALE, NOW - 45 * 60_000, NOW).detail).toBe('última lectura hace 45 min');
  });
});
