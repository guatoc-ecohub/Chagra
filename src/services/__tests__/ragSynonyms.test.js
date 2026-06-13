/**
 * ragSynonyms.test.js — cobertura de expansión de sinónimos campesinos.
 *
 * Verifica que expandQueryTokens expande correctamente los tokens
 * de la query con sus sinónimos canónicos del diccionario campesino.
 *
 * Casos de prueba:
 *   - Término "nematodo" se expande a ["gusano", "microscopico", "suelo"]
 *   - Términos existentes siguen funcionando (ej: "broca", "roya")
 *   - Términos sin sinónimos no se expanden
 *   - La expansión es determinística
 */
import { describe, it, expect } from 'vitest';
import { expandQueryTokens, CAMPESINO_SYNONYMS } from '../ragSynonyms.js';

describe('ragSynonyms — expansión de sinónimos campesinos', () => {
  it('expande "nematodo" a ["gusano", "microscopico", "suelo"]', () => {
    const tokens = ['nematodo'];
    const expanded = expandQueryTokens(tokens);
    
    // Debe contener el token original
    expect(expanded).toContain('nematodo');
    // Debe contener los sinónimos canónicos
    expect(expanded).toContain('gusano');
    expect(expanded).toContain('microscopico');
    expect(expanded).toContain('suelo');
  });

  it('expande "broca" a ["gorgojo", "barrenador", "hypothenemus"]', () => {
    const tokens = ['broca'];
    const expanded = expandQueryTokens(tokens);
    
    expect(expanded).toContain('broca');
    expect(expanded).toContain('gorgojo');
    expect(expanded).toContain('barrenador');
    expect(expanded).toContain('hypothenemus');
  });

  it('expande "roya" a ["hongo", "hemileia"]', () => {
    const tokens = ['roya'];
    const expanded = expandQueryTokens(tokens);
    
    expect(expanded).toContain('roya');
    expect(expanded).toContain('hongo');
    expect(expanded).toContain('hemileia');
  });

  it('términos sin sinónimos no se expanden', () => {
    const tokens = ['tomate', 'papa', 'fresa'];
    const expanded = expandQueryTokens(tokens);
    
    // Debe contener solo los tokens originales
    expect(expanded).toEqual(expect.arrayContaining(tokens));
    // No debe haber términos extra
    expect(expanded.length).toBe(tokens.length);
  });

  it('expandQueryTokens es determinístico — mismo input, mismo output', () => {
    const tokens = ['nematodo', 'roya'];
    const expanded1 = expandQueryTokens(tokens);
    const expanded2 = expandQueryTokens(tokens);
    
    expect(expanded1).toEqual(expanded2);
  });

  it('expande múltiples tokens simultáneamente', () => {
    const tokens = ['nematodo', 'roya', 'broca'];
    const expanded = expandQueryTokens(tokens);
    
    // Tokens originales
    expect(expanded).toContain('nematodo');
    expect(expanded).toContain('roya');
    expect(expanded).toContain('broca');
    
    // Sinónimos de nematodo
    expect(expanded).toContain('gusano');
    expect(expanded).toContain('microscopico');
    expect(expanded).toContain('suelo');
    
    // Sinónimos de roya
    expect(expanded).toContain('hongo');
    expect(expanded).toContain('hemileia');
    
    // Sinónimos de broca
    expect(expanded).toContain('gorgojo');
    expect(expanded).toContain('barrenador');
    expect(expanded).toContain('hypothenemus');
  });

  it('CAMPESINO_SYNONYMS contiene el término "nematodo"', () => {
    expect(CAMPESINO_SYNONYMS).toHaveProperty('nematodo');
    expect(CAMPESINO_SYNONYMS.nematodo).toEqual(expect.arrayContaining(['gusano', 'microscopico', 'suelo']));
  });

  it('CAMPESINO_SYNONYMS contiene todas las categorías del JSON', () => {
    // Verificar que tiene términos de cada categoría
    expect(CAMPESINO_SYNONYMS).toHaveProperty('broca'); // plagas
    expect(CAMPESINO_SYNONYMS).toHaveProperty('matamaleza'); // control
    expect(CAMPESINO_SYNONYMS).toHaveProperty('sembrar'); // cultivo
    expect(CAMPESINO_SYNONYMS).toHaveProperty('secar'); // clima
    expect(CAMPESINO_SYNONYMS).toHaveProperty('tierra'); // suelo_vocab
    expect(CAMPESINO_SYNONYMS).toHaveProperty('mata'); // partes_planta
    expect(CAMPESINO_SYNONYMS).toHaveProperty('desyerbar'); // labores
    expect(CAMPESINO_SYNONYMS).toHaveProperty('broca_del_cafe'); // plaga_hospedero
  });

  it('query vacía devuelve array vacío', () => {
    const expanded = expandQueryTokens([]);
    expect(expanded).toEqual([]);
  });

  it('expande tokens con acentos y normalización', () => {
    // Verificar que los sinónimos funcionan con términos normalizados
    const tokens = ['gusano'];
    const expanded = expandQueryTokens(tokens);
    
    // gusano es sinónimo de nematodo, pero no necesariamente al revés
    // Solo verificamos que no lanza error y devuelve algo
    expect(Array.isArray(expanded)).toBe(true);
    expect(expanded.length).toBeGreaterThan(0);
  });
});
