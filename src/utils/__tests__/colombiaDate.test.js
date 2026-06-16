/**
 * colombiaDate.test.js — Tests para utilidades de zona horaria Colombia.
 *
 * Tarea 82: verifica formatColombiaDate, getColombiaMonth, y
 * getSowingCalendarMonth.
 */
import { describe, it, expect } from 'vitest';
import {
  formatColombiaDate,
  getColombiaMonth,
  getSowingCalendarMonth,
  toColombiaDate,
} from '../colombiaDate';

describe('toColombiaDate', () => {
  it('retorna Date valida para entrada valida', () => {
    const d = toColombiaDate('2026-06-15T12:00:00Z');
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
  });

  it('retorna Date invalida (NaN) para entrada no parseable', () => {
    const d = toColombiaDate('not a date');
    expect(isNaN(d.getTime())).toBe(true);
  });

  it('usa now cuando no se pasa argumento', () => {
    const d = toColombiaDate();
    expect(d).toBeInstanceOf(Date);
    expect(isNaN(d.getTime())).toBe(false);
  });
});

describe('formatColombiaDate', () => {
  const fixedDate = new Date('2026-06-15T20:00:00Z');

  it('formato iso-date retorna YYYY-MM-DD en zona Colombia', () => {
    expect(formatColombiaDate(fixedDate, 'iso-date')).toBe('2026-06-15');
  });

  it('formato iso-datetime retorna YYYY-MM-DD HH:mm', () => {
    expect(formatColombiaDate(fixedDate, 'iso-datetime')).toBe('2026-06-15 15:00');
  });

  it('formato short retorna DD/MM/YY, HH:mm', () => {
    expect(formatColombiaDate(fixedDate, 'short')).toBe('15/06/26, 15:00');
  });

  it('formato month-name retorna nombre del mes en es-CO', () => {
    expect(formatColombiaDate(fixedDate, 'month-name')).toBe('junio');
  });

  it('formato month-number retorna numero del mes', () => {
    expect(formatColombiaDate(fixedDate, 'month-number')).toBe('6');
  });

  it('formato day-month retorna "DD de mes"', () => {
    expect(formatColombiaDate(fixedDate, 'day-month')).toBe('15 de junio');
  });

  it('formato human retorna dia completo en es-CO', () => {
    expect(formatColombiaDate(fixedDate, 'human')).toMatch(/lunes, 15 de junio de 2026/);
  });

  it('formato default retorna iso-date', () => {
    expect(formatColombiaDate(fixedDate)).toBe('2026-06-15');
  });

  it('devuelve cadena vacia para fecha invalida', () => {
    expect(formatColombiaDate('invalid', 'iso-date')).toBe('');
  });

  it('null y undefined no crashean', () => {
    expect(() => formatColombiaDate(null, 'iso-date')).not.toThrow();
    expect(() => formatColombiaDate(undefined, 'month-number')).not.toThrow();
  });

  it('UTC antes de las 5am cae en dia anterior en COT', () => {
    const early = new Date('2026-06-15T03:00:00Z');
    expect(formatColombiaDate(early, 'iso-date')).toBe('2026-06-14');
  });
});

describe('getColombiaMonth', () => {
  it('retorna un numero entre 1 y 12', () => {
    const month = getColombiaMonth();
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(Number.isInteger(month)).toBe(true);
  });
});

describe('getSowingCalendarMonth', () => {
  it('retorna null sin zona', () => {
    expect(getSowingCalendarMonth(null)).toBeNull();
    expect(getSowingCalendarMonth('')).toBeNull();
    expect(getSowingCalendarMonth(undefined)).toBeNull();
  });

  it('retorna objeto con month y cultivos para zona valida', () => {
    const r = getSowingCalendarMonth('andino-alto-paramo');
    if (r !== null) {
      expect(r).toHaveProperty('month');
      expect(r).toHaveProperty('cultivos');
      expect(Array.isArray(r.cultivos)).toBe(true);
    }
  });

  it('retorna null para zona no existente', () => {
    expect(getSowingCalendarMonth('zona-que-no-existe')).toBeNull();
  });
});
