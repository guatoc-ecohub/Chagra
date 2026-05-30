import { describe, it, expect } from 'vitest';
import { getParentLandIdFromAsset } from '../assetRelationships.js';

/**
 * Tests de assetRelationships: resolución del parent-land id desde el shape
 * JSON:API de un asset. Función pura. Cubre array vs objeto único y el
 * fallback parent.data → location.data (compat FarmOS v2 + legacy).
 */

describe('getParentLandIdFromAsset', () => {
  it('lee parent.data como objeto único', () => {
    const asset = { relationships: { parent: { data: { id: 'land-1' } } } };
    expect(getParentLandIdFromAsset(asset)).toBe('land-1');
  });

  it('lee parent.data como array (toma el primero)', () => {
    const asset = { relationships: { parent: { data: [{ id: 'land-2' }, { id: 'land-3' }] } } };
    expect(getParentLandIdFromAsset(asset)).toBe('land-2');
  });

  it('cae a location.data cuando no hay parent.data', () => {
    const asset = { relationships: { location: { data: { id: 'loc-9' } } } };
    expect(getParentLandIdFromAsset(asset)).toBe('loc-9');
  });

  it('prioriza parent.data sobre location.data', () => {
    const asset = {
      relationships: {
        parent: { data: { id: 'parent-id' } },
        location: { data: { id: 'loc-id' } },
      },
    };
    expect(getParentLandIdFromAsset(asset)).toBe('parent-id');
  });

  it('devuelve null para asset nulo o sin relationships', () => {
    expect(getParentLandIdFromAsset(null)).toBeNull();
    expect(getParentLandIdFromAsset(undefined)).toBeNull();
    expect(getParentLandIdFromAsset({})).toBeNull();
    expect(getParentLandIdFromAsset({ relationships: {} })).toBeNull();
  });

  it('devuelve null si el array está vacío', () => {
    const asset = { relationships: { parent: { data: [] } } };
    expect(getParentLandIdFromAsset(asset)).toBeNull();
  });
});
