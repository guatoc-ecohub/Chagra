import { describe, it, expect } from 'vitest';
import { normalize, similarity, bestFuzzyMatch } from '../entityMatcher.js';

/**
 * Tests de entityMatcher: resolución fuzzy de entidades contra la taxonomía
 * local para el pipeline de voz. Funciones puras (0 imports). Cubre los casos
 * reales descritos en el módulo: transcripciones imperfectas de Whisper
 * ("sarandano"→"arándano", "Invernadero 1"→"invernadero").
 */

describe('normalize', () => {
  it('baja a minúsculas, quita acentos y colapsa espacios', () => {
    expect(normalize('  Arándano  Azul ')).toBe('arandano azul');
    // la ñ se descompone (NFD) y la tilde se strippea → 'name'; esto es
    // intencional para que "ñame" y "name" matcheen en el pipeline de voz.
    expect(normalize('ÑAME')).toBe('name');
  });

  it('maneja falsy sin romper', () => {
    expect(normalize(null)).toBe('');
    expect(normalize(undefined)).toBe('');
    expect(normalize('')).toBe('');
  });
});

describe('similarity', () => {
  it('1.0 para strings iguales tras normalizar (acentos/mayúsculas)', () => {
    expect(similarity('Arándano', 'arandano')).toBe(1);
  });

  it('1.0 para dos vacíos, 0 si solo uno es vacío', () => {
    expect(similarity('', '')).toBe(1);
    expect(similarity('papa', '')).toBe(0);
    expect(similarity('', 'papa')).toBe(0);
  });

  it('bonus por substring está en el rango 0.7..1.0', () => {
    const s = similarity('invernadero', 'invernadero 1');
    expect(s).toBeGreaterThanOrEqual(0.7);
    expect(s).toBeLessThan(1);
  });

  it('typo cercano da score alto pero < 1 (sarandano vs arandano)', () => {
    const s = similarity('sarandano', 'arandano');
    expect(s).toBeGreaterThan(0.65);
    expect(s).toBeLessThan(1);
  });

  it('strings muy distintos dan score bajo', () => {
    expect(similarity('papa', 'helicóptero')).toBeLessThan(0.4);
  });
});

describe('bestFuzzyMatch', () => {
  const catalogo = [
    { id: 'vaccinium_corymbosum', nombre: 'arándano' },
    { id: 'solanum_tuberosum', nombre: 'papa' },
    { id: 'zea_mays', nombre: 'maíz' },
  ];
  const keyFn = (c) => c.nombre;

  it('retorna null con query/candidatos vacíos', () => {
    expect(bestFuzzyMatch('', catalogo, keyFn)).toBeNull();
    expect(bestFuzzyMatch('papa', [], keyFn)).toBeNull();
    expect(bestFuzzyMatch('papa', null, keyFn)).toBeNull();
  });

  it('mapea una transcripción imperfecta al canónico', () => {
    const r = bestFuzzyMatch('sarandano', catalogo, keyFn);
    expect(r).not.toBeNull();
    expect(r.match.id).toBe('vaccinium_corymbosum');
    expect(r.score).toBeGreaterThan(0.65);
  });

  it('elige el candidato de mayor score', () => {
    const r = bestFuzzyMatch('maiz', catalogo, keyFn);
    expect(r.match.id).toBe('zea_mays');
  });

  it('retorna null si ninguno supera el threshold', () => {
    expect(bestFuzzyMatch('helicóptero', catalogo, keyFn, 0.65)).toBeNull();
  });

  it('un threshold más laxo permite matches que el estricto rechaza', () => {
    const estricto = bestFuzzyMatch('papax', catalogo, keyFn, 0.95);
    const laxo = bestFuzzyMatch('papax', catalogo, keyFn, 0.5);
    expect(estricto).toBeNull();
    expect(laxo?.match.id).toBe('solanum_tuberosum');
  });

  it('salta candidatos cuya key es vacía', () => {
    const conVacio = [{ nombre: '' }, { nombre: 'papa' }];
    const r = bestFuzzyMatch('papa', conVacio, (c) => c.nombre);
    expect(r.match.nombre).toBe('papa');
  });
});
