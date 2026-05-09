/**
 * repetitionGuard.test.js — tests unitarios para detectAndTruncateRepetition (#228).
 *
 * Sigue el patrón del setup existente en tests/unit/setup.js y usa Vitest.
 */
import { describe, it, expect } from 'vitest';
import { detectAndTruncateRepetition } from '../../src/utils/repetitionGuard.js';

describe('detectAndTruncateRepetition', () => {
  it('devuelve string vacío para texto vacío', () => {
    expect(detectAndTruncateRepetition('')).toBe('');
  });

  it('devuelve string vacío para input no-string', () => {
    expect(detectAndTruncateRepetition(null)).toBe('');
    expect(detectAndTruncateRepetition(undefined)).toBe('');
    expect(detectAndTruncateRepetition(123)).toBe('');
  });

  it('devuelve el mismo texto si no hay repeticiones', () => {
    const text = 'Este es un texto normal sin repeticiones.';
    expect(detectAndTruncateRepetition(text)).toBe(text);
  });

  it('trunca al último punto previo en triple repetición', () => {
    const text = 'Primera oración. Segunda oración. excelente excelente excelente basura';
    const result = detectAndTruncateRepetition(text);
    expect(result).toBe('Primera oración. Segunda oración. [Respuesta truncada por repetición detectada]');
  });

  it('trunca antes del loop si no hay punto cercano en triple repetición', () => {
    const text = 'malo malo malo esto es basura';
    const result = detectAndTruncateRepetition(text);
    expect(result).toBe('... [Respuesta truncada]');
  });

  it('trunca a la mitad por densidad de repetición mayor a 30%', () => {
    const text = 'foo foo bar bar baz baz qux qux xyz xyz test test';
    const result = detectAndTruncateRepetition(text);
    expect(result).toContain('[Respuesta truncada por densidad de repetición]');
    expect(result).not.toContain('test test');
  });
});
