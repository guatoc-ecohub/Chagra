import { describe, it, expect } from 'vitest';
import { resolveSipsaProduct } from '../sipsaPriceMap.js';

describe('resolveSipsaProduct', () => {
  it('match exacto minusculas', () => {
    expect(resolveSipsaProduct('papa')).toBe('solanum_tuberosum');
  });

  it('match exacto con mayusculas', () => {
    expect(resolveSipsaProduct('Papa')).toBe('solanum_tuberosum');
  });

  it('match con tildes', () => {
    expect(resolveSipsaProduct('Limón')).toBe('citrus_latifolia');
  });

  it('match con tildes y espacios extra', () => {
    expect(resolveSipsaProduct('  Tomate árbol  ')).toBe('solanum_betaceum');
  });

  it('match producto compuesto', () => {
    expect(resolveSipsaProduct('cebolla larga')).toBe('allium_fistulosum');
  });

  it('producto inexistente retorna null', () => {
    expect(resolveSipsaProduct('mandarina')).toBeNull();
  });

  it('producto inexistente con tildes retorna null', () => {
    expect(resolveSipsaProduct('Mandarina común')).toBeNull();
  });

  it('string vacio retorna null', () => {
    expect(resolveSipsaProduct('')).toBeNull();
  });

  it('alias mismo slug sandia y patilla', () => {
    const sandia = resolveSipsaProduct('sandia');
    const patilla = resolveSipsaProduct('patilla');
    expect(sandia).toBe(patilla);
    expect(sandia).toBe('citrullus_lanatus');
  });

  it('banano y platano mismo slug', () => {
    expect(resolveSipsaProduct('banano')).toBe('musa_paradisiaca');
    expect(resolveSipsaProduct('platano')).toBe('musa_paradisiaca');
  });

  it('frijol y habichuela mismo slug', () => {
    expect(resolveSipsaProduct('frijol')).toBe('phaseolus_vulgaris');
    expect(resolveSipsaProduct('habichuela')).toBe('phaseolus_vulgaris');
  });

  it('papa criolla varietal distinto de papa', () => {
    const papa = resolveSipsaProduct('papa');
    const criolla = resolveSipsaProduct('papa criolla');
    expect(papa).toBe('solanum_tuberosum');
    expect(criolla).toBe('solanum_phureja');
  });

  it('null input retorna null', () => {
    expect(resolveSipsaProduct(null)).toBeNull();
  });

  it('undefined input retorna null', () => {
    expect(resolveSipsaProduct(undefined)).toBeNull();
  });
});
