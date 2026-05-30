import { describe, it, expect } from 'vitest';
import { fuzzyFilter } from '../fuzzySearch.js';

/**
 * Tests de fuzzySearch: filtro aproximado del selector de especies.
 * Función pura. Cubre los casos del módulo: "Gulpa"→"Gulupa",
 * tolerancia a acentos, prefijo > contención > subsecuencia, y límite.
 */

const especies = ['Gulupa', 'Guayaba', 'Guanábana', 'Papa', 'Passiflora edulis'];

describe('fuzzyFilter', () => {
  it('query vacío devuelve los items (hasta el límite)', () => {
    expect(fuzzyFilter('', especies)).toEqual(especies);
    expect(fuzzyFilter('   ', especies)).toEqual(especies);
  });

  it('encuentra por prefijo y lo prioriza', () => {
    const r = fuzzyFilter('gulu', especies);
    expect(r[0]).toBe('Gulupa');
  });

  it('tolera typos por subsecuencia ("gulpa" → "Gulupa")', () => {
    const r = fuzzyFilter('gulpa', especies);
    expect(r).toContain('Gulupa');
  });

  it('es insensible a acentos y mayúsculas', () => {
    const r = fuzzyFilter('guanabana', especies);
    expect(r).toContain('Guanábana');
  });

  it('excluye items sin match de todos los caracteres del query', () => {
    const r = fuzzyFilter('zzz', especies);
    expect(r).toHaveLength(0);
  });

  it('respeta el límite de resultados', () => {
    const muchos = Array.from({ length: 50 }, (_, i) => `Planta ${i}`);
    expect(fuzzyFilter('planta', muchos, (x) => x, 10)).toHaveLength(10);
  });

  it('usa el accessor para objetos', () => {
    const items = [{ nombre: 'Gulupa' }, { nombre: 'Papa' }];
    const r = fuzzyFilter('gul', items, (x) => x.nombre);
    expect(r[0].nombre).toBe('Gulupa');
  });
});
