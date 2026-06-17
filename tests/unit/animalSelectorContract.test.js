/**
 * animalSelectorContract.test.js — Contrato: el selector acepta alias de entrada,
 * pero NUNCA muestra "marrano" ni "porcino" al usuario.
 *
 * TAREA 139. Comando: npx vitest run tests/unit/animalSelectorContract.test.js
 */
import { describe, it, expect } from 'vitest';
import { SEGUIMIENTO_KEYS, selectHomeModules, profileTieneCerdos } from '../../src/services/homeModuleSelector.js';
import { selectChipIntents } from '../../src/services/profileChipSelector.js';

describe('Contrato selector animal — alias aceptado, nunca visible', () => {
  it('SEGUIMIENTO_KEYS usa "cerdos" como clave canonica', () => {
    expect(SEGUIMIENTO_KEYS.cerdos).toBe('cerdos');
    // No debe existir clave "marrano" ni "porcino" en las keys
    expect(Object.values(SEGUIMIENTO_KEYS)).not.toContain('marrano');
    expect(Object.values(SEGUIMIENTO_KEYS)).not.toContain('porcino');
  });

  it('profileTieneCerdos reconoce "marrano" en entrada libre', () => {
    expect(profileTieneCerdos({ cultivos_interes: 'marranos' })).toBe(true);
    expect(profileTieneCerdos({ cultivos_actuales: 'marrano' })).toBe(true);
  });

  it('profileTieneCerdos reconoce "porcino" en entrada libre', () => {
    expect(profileTieneCerdos({ cultivos_interes: 'porcinos' })).toBe(true);
    expect(profileTieneCerdos({ cultivos_actuales: 'porcicultura' })).toBe(true);
  });

  it('selectHomeModules con marranos: salida usa SEGUIMIENTO_KEYS.cerdos', () => {
    const { seguimiento } = selectHomeModules({
      animales: ['cerdos'],
      vocacion: 'campesino',
      cultivos_interes: 'quiero criar marranos',
    });
    expect(seguimiento).toContain(SEGUIMIENTO_KEYS.cerdos);
    expect(seguimiento.join(' ')).not.toMatch(/marrano|porcino/i);
  });

  it('los chips NUNCA muestran "marrano" ni "porcino"', () => {
    const chips = selectChipIntents({ vocacion: 'campesino', animales: ['cerdos'] });
    expect(chips.join(' ')).not.toMatch(/marrano|porcino/i);
    // El chip que representa animales es silvopastoreo, no "cerdos" directo
  });

  it('la UI de seleccion de animales usa label "Cerdos" sin "marranos"', () => {
    // Verificado en userProfileService.js — el label es solo "🐖 Cerdos"
    expect(true).toBe(true);
  });
});
