import { describe, it, expect } from 'vitest';
import { AVATAR_TYPES } from '../useAgentAvatarType.js';
import { COMPAI_REGISTRO } from '../../visual/mundo3d/escenas/compaiRegistry.js';

/**
 * Test de contrato para el roster-7 con control negativo.
 * 
 * Este test FALLA si el código está en la forma roster-8 (dante+oliver agregados,
 * guacamaya sacada) — control negativo para prevenir que PRs como #2912, #2913,
 * #2914 entren a dev una decisión ya revocada.
 * 
 * Ruling 2026-08-14: Dante y Oliver son SOLO pilotos de Chagra Kart, NUNCA compai.
 * El roster COMPAI = 7 (angelita, jaguar, oso, zariguya, luciernaga, chivito-punk,
 * guacamaya). El Kart tiene su PROPIO roster de 8 pilotos — es OTRA superficie,
 * NO mezclar con compai.
 */
describe('useAgentAvatarType — contrato roster-7 con control negativo', () => {
  const ROSTER_7_CANONICO = ['angelita', 'zariguya', 'jaguar', 'oso-baston', 'luciernaga', 'chivito-punk', 'guacamaya'];
  
  it('guacamaya SÍ está en AVATAR_TYPES (roster-7)', () => {
    expect(AVATAR_TYPES).toContain('guacamaya');
  });

  it('dante NO está en AVATAR_TYPES (solo piloto del Kart, nunca compai)', () => {
    expect(AVATAR_TYPES).not.toContain('dante');
  });

  it('oliver NO está en AVATAR_TYPES (solo piloto del Kart, nunca compai)', () => {
    expect(AVATAR_TYPES).not.toContain('oliver');
  });

  it('todo AVATAR_TYPES tiene entrada en el registry (sin huérfanos)', () => {
    for (const tipo of AVATAR_TYPES) {
      expect(COMPAI_REGISTRO[tipo], `falta ${tipo} en el registro - crearía huérfano 2D/3D`).toBeDefined();
    }
  });

  it('el registry NO tiene dante ni oliver (son del Kart, no compai)', () => {
    expect(COMPAI_REGISTRO['dante']).toBeUndefined();
    expect(COMPAI_REGISTRO['oliver']).toBeUndefined();
  });

  it('AVATAR_TYPES tiene exactamente los 7 canónicos (ni más ni menos)', () => {
    expect(AVATAR_TYPES).toHaveLength(7);
    expect(AVATAR_TYPES.sort()).toEqual(ROSTER_7_CANONICO.sort());
  });
});
