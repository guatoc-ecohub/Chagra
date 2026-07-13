import { describe, it, expect } from 'vitest';
import { clasificarPisoTermico } from '../pisoTermicoClassifier.js';

describe('clasificarPisoTermico', () => {
  it('retorna calido para altitud 0-1000', () => {
    const r = clasificarPisoTermico(500);
    expect(r).toBeTruthy();
    expect(r.id).toBe('calido');
  });

  it('retorna templado para altitud 1000-2000', () => {
    const r = clasificarPisoTermico(1500);
    expect(r).toBeTruthy();
    expect(r.id).toBe('templado');
  });

  it('retorna frio para altitud 2000-3000', () => {
    const r = clasificarPisoTermico(2600);
    expect(r).toBeTruthy();
    expect(r.id).toBe('frio');
  });

  it('retorna paramo para altitud >3000', () => {
    const r = clasificarPisoTermico(3200);
    expect(r).toBeTruthy();
    expect(r.id).toBe('paramo');
  });

  it('retorna null para altitud negativa', () => {
    expect(clasificarPisoTermico(-1)).toBeNull();
  });

  it('retorna null para entrada no numerica', () => {
    expect(clasificarPisoTermico(/** @type {any} */ ('mil'))).toBeNull();
  });

  it('retorna null para undefined', () => {
    expect(clasificarPisoTermico(undefined)).toBeNull();
  });
});
