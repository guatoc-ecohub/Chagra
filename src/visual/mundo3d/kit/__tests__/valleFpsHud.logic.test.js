import { describe, it, expect } from 'vitest';
import { clasificarFps, hudHabilitado, MS_CUADRO_LENTO } from '../valleFpsHud.logic.js';

describe('clasificarFps', () => {
  it('good para fps >= 55', () => {
    expect(clasificarFps(60)).toBe('good');
    expect(clasificarFps(55)).toBe('good');
  });
  it('watch para 45..54', () => {
    expect(clasificarFps(54)).toBe('watch');
    expect(clasificarFps(45)).toBe('watch');
  });
  it('slow para < 45', () => {
    expect(clasificarFps(44)).toBe('slow');
    expect(clasificarFps(1)).toBe('slow');
  });
  it('pending para 0 o valores inválidos', () => {
    expect(clasificarFps(0)).toBe('pending');
    expect(clasificarFps(-5)).toBe('pending');
    expect(clasificarFps(NaN)).toBe('pending');
    expect(clasificarFps(Infinity)).toBe('pending');
  });
});

describe('hudHabilitado', () => {
  it('se activa con ?fps o ?fps=1', () => {
    expect(hudHabilitado('?fps', null)).toBe(true);
    expect(hudHabilitado('?fps=1', null)).toBe(true);
  });
  it('?fps=0 lo apaga aunque el localStorage lo pida', () => {
    expect(hudHabilitado('?fps=0', { getItem: () => '1' })).toBe(false);
  });
  it('opt-in por localStorage sin query', () => {
    expect(hudHabilitado('', { getItem: () => '1' })).toBe(true);
    expect(hudHabilitado('', { getItem: () => null })).toBe(false);
  });
  it('inerte por defecto (sin query ni storage)', () => {
    expect(hudHabilitado('', null)).toBe(false);
    expect(hudHabilitado(undefined, undefined)).toBe(false);
  });
});

describe('MS_CUADRO_LENTO', () => {
  it('es 25ms (umbral de cuadro lento)', () => {
    expect(MS_CUADRO_LENTO).toBe(25);
  });
});
