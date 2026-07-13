/**
 * transformacion.test.js — resolución del aura por bicho (modo poder).
 */
import { describe, it, expect } from 'vitest';
import { auraDeBicho, AURA_POR_BICHO, AURA_DEFECTO } from '../transformacion.js';

describe('auraDeBicho', () => {
  it('devuelve el color del bicho conocido', () => {
    expect(auraDeBicho('abeja-angelita')).toBe('#ffd54a');
    expect(auraDeBicho('jaguar')).toBe('#a855f7');
    expect(auraDeBicho('oso-andino')).toBe('#ff3b30');
  });

  it('slug desconocido / no-string → aura por defecto', () => {
    expect(auraDeBicho('bicho-fantasma')).toBe(AURA_DEFECTO);
    expect(auraDeBicho(null)).toBe(AURA_DEFECTO);
    expect(auraDeBicho(undefined)).toBe(AURA_DEFECTO);
    expect(auraDeBicho(/** @type {any} */ (123))).toBe(AURA_DEFECTO);
  });

  it('todo valor del mapa es un color hex válido', () => {
    for (const color of Object.values(AURA_POR_BICHO)) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });
});
