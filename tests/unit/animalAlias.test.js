/**
 * animalAlias.test.js — Contrato de alias: marrano/porcino → cerdos.
 *
 * TAREA 134: Documenta que la entrada acepta "marrano", "marranos",
 * "porcino", "porcinos", "porcicultura" pero la salida canonica
 * siempre usa "cerdos" como clave de seguimiento.
 *
 * Comando: npx vitest run tests/unit/animalAlias.test.js
 */
import { describe, it, expect } from 'vitest';
import { profileTieneCerdos, SEGUIMIENTO_KEYS, selectHomeModules } from '../../src/services/homeModuleSelector.js';

describe('Contrato alias animales — marrano/porcino → cerdos', () => {
  it('profileTieneCerdos acepta "cerdos" en array animales', () => {
    expect(profileTieneCerdos({ animales: ['cerdos'] })).toBe(true);
  });

  it('profileTieneCerdos acepta "marrano" en texto libre', () => {
    expect(profileTieneCerdos({ cultivos_interes: 'quiero criar marranos' })).toBe(true);
  });

  it('profileTieneCerdos acepta "porcinos" en texto libre', () => {
    expect(profileTieneCerdos({ cultivos_actuales: 'porcinos y gallinas' })).toBe(true);
  });

  it('profileTieneCerdos acepta "porcicultura" en texto libre', () => {
    expect(profileTieneCerdos({ cultivos_interes: 'porcicultura a pequena escala' })).toBe(true);
  });

  it('la salida canonica SIEMPRE usa SEGUIMIENTO_KEYS.cerdos (nunca "marrano")', () => {
    const { seguimiento } = selectHomeModules({ animales: ['cerdos'], vocacion: 'campesino' });
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
    // El usuario NUNCA ve "marrano" como clave de seguimiento
    expect(seguimiento).not.toContain('marrano');
    expect(seguimiento).not.toContain('porcino');
    // La clave canonica es 'cerdos'
    expect(SEGUIMIENTO_KEYS.cerdos).toBe('cerdos');
  });

  it('gallinas NO activan la clave cerdos', () => {
    expect(profileTieneCerdos({ animales: ['gallinas'] })).toBe(false);
  });

  it('ganado NO activa la clave cerdos', () => {
    expect(profileTieneCerdos({ animales: ['ganado'] })).toBe(false);
  });

  it('texto libre sin palabras pecuarias NO activa cerdos', () => {
    expect(profileTieneCerdos({ cultivos_actuales: 'cafe, mora, tomate' })).toBe(false);
  });
});
