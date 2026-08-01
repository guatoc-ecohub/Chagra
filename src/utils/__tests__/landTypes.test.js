import { describe, it, expect } from 'vitest';
import { URBAN_LAND_TYPES, isUrbanLandType, LAND_TYPES } from '../landTypes';

/**
 * Tests para UX-13 (#286): land types urbanos (balcón/terraza/ventana/
 * matera/jardín urbano) y helper isUrbanLandType.
 *
 * Verifica:
 *   - El set URBAN_LAND_TYPES contiene exactamente los 5 tipos urbanos.
 *   - isUrbanLandType acepta strings urbanos y rechaza rurales.
 *   - isUrbanLandType es robusto a null/undefined/empty.
 */

describe('UX-13 — urban land types', () => {
  it('URBAN_LAND_TYPES contiene exactamente los 5 tipos urbanos definidos', () => {
    const expected = ['balcony', 'terrace', 'window_sill', 'indoor_pot', 'urban_garden'];
    expect(URBAN_LAND_TYPES.size).toBe(expected.length);
    for (const t of expected) {
      expect(URBAN_LAND_TYPES.has(t)).toBe(true);
    }
  });

  it('LAND_TYPES sigue exponiendo los 5 rurales legacy + 5 urbanos = 10 total', () => {
    expect(LAND_TYPES).toHaveLength(10);
    const rural = LAND_TYPES.filter((lt) => !lt.urban).map((lt) => lt.value);
    expect(rural).toEqual(['field', 'bed', 'greenhouse', 'paddock', 'building']);
  });

  describe('isUrbanLandType', () => {
    it('retorna true para balcony', () => {
      expect(isUrbanLandType('balcony')).toBe(true);
    });
    it('retorna true para terrace', () => {
      expect(isUrbanLandType('terrace')).toBe(true);
    });
    it('retorna true para window_sill', () => {
      expect(isUrbanLandType('window_sill')).toBe(true);
    });
    it('retorna true para indoor_pot', () => {
      expect(isUrbanLandType('indoor_pot')).toBe(true);
    });
    it('retorna true para urban_garden', () => {
      expect(isUrbanLandType('urban_garden')).toBe(true);
    });
    it('retorna false para field (rural)', () => {
      expect(isUrbanLandType('field')).toBe(false);
    });
    it('retorna false para greenhouse', () => {
      expect(isUrbanLandType('greenhouse')).toBe(false);
    });
    it('retorna false para paddock', () => {
      expect(isUrbanLandType('paddock')).toBe(false);
    });
    it('retorna false para bed', () => {
      expect(isUrbanLandType('bed')).toBe(false);
    });
    it('retorna false para building', () => {
      expect(isUrbanLandType('building')).toBe(false);
    });
    it('retorna false para null / undefined / "" / number', () => {
      expect(isUrbanLandType(null)).toBe(false);
      expect(isUrbanLandType(undefined)).toBe(false);
      expect(isUrbanLandType('')).toBe(false);
      expect(isUrbanLandType(/** @type {any} */ (42))).toBe(false);
    });
  });
});
