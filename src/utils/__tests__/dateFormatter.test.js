import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTimestamp,
  formatRelativeTime,
  toISODate,
  toISODateTime,
} from '../dateFormatter.js';

/**
 * Tests de dateFormatter: helpers puros de fecha. Cubren el happy path y los
 * guards de entrada inválida (null/''/NaN) que evitan "Invalid Date" en la UI.
 */

describe('formatDate (UNIX segundos → "YYYY-MM-DD HH:mm")', () => {
  it('formatea un timestamp UNIX en segundos', () => {
    // 2024-05-07T20:30:56Z → la salida depende del TZ del runner, validamos shape
    expect(formatDate(1715113856)).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('devuelve "" para entrada nula/vacía/inválida', () => {
    expect(formatDate(undefined)).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('abc')).toBe('');
  });
});

describe('formatTimestamp (ISO → localizado)', () => {
  it('formatea una fecha ISO válida', () => {
    expect(formatTimestamp('2024-05-07T20:30:00')).toMatch(/\d/);
  });

  it('devuelve guion largo para entrada inválida', () => {
    expect(formatTimestamp(undefined)).toBe('—');
    expect(formatTimestamp('no-fecha')).toBe('—');
  });
});

describe('formatRelativeTime', () => {
  it('"Ahora mismo" para el instante actual', () => {
    expect(formatRelativeTime(new Date())).toBe('Ahora mismo');
  });

  it('minutos / horas / días recientes', () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 2 * 60000)).toBe('Hace 2 min');
    expect(formatRelativeTime(now - 3 * 3600000)).toBe('Hace 3h');
    expect(formatRelativeTime(now - 2 * 86400000)).toBe('Hace 2d');
  });

  it('cae a fecha corta para > 7 días', () => {
    const old = Date.now() - 30 * 86400000;
    const r = formatRelativeTime(old);
    expect(r).not.toMatch(/Hace|Ahora/);
  });

  it('devuelve "" para entrada inválida', () => {
    expect(formatRelativeTime(null)).toBe('');
    expect(formatRelativeTime('x')).toBe('');
  });
});

describe('toISODate / toISODateTime', () => {
  it('toISODate devuelve solo la fecha YYYY-MM-DD', () => {
    expect(toISODate('2024-05-07T20:30:00Z')).toBe('2024-05-07');
  });

  it('toISODateTime devuelve ISO-8601 completo', () => {
    expect(toISODateTime('2024-05-07T20:30:00Z')).toBe('2024-05-07T20:30:00.000Z');
  });

  it('ambos devuelven "" para entrada inválida', () => {
    expect(toISODate(null)).toBe('');
    expect(toISODate('nope')).toBe('');
    expect(toISODateTime('')).toBe('');
    expect(toISODateTime('nope')).toBe('');
  });
});
