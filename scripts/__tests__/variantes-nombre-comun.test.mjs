/**
 * scripts/__tests__/variantes-nombre-comun.test.mjs
 *
 * Tests del normalizador de variantes de nombre común de especies.
 *
 * Estos tests verifican que el módulo resuelve correctamente confusiones
 * taxonómicas causadas por variantes de grafía del mismo nombre común.
 */

import { describe, it, expect } from 'vitest';

import {
  normalizarNombreComun,
  resolverEspecie,
  MAPA_VARIANTES,
} from '../lib/variantes-nombre-comun.mjs';

// Mock del catálogo con las especies relevantes
const CATÁLOGO_MOCK = [
  {
    id: 'passiflora_tripartita_mollissima',
    nombre_comun: 'Curuba de Castilla',
    nombre_cientifico: 'Passiflora tripartita var. mollissima (Kunth) Holm-Niels. & Jørg.',
  },
  {
    id: 'physalis_peruviana',
    nombre_comun: 'Uchuva',
    nombre_cientifico: 'Physalis peruviana L.',
  },
  {
    id: 'solanum_betaceum',
    nombre_comun: 'Tomate de árbol / Tamarillo',
    nombre_cientifico: 'Solanum betaceum Cav.',
  },
  {
    id: 'mangifera_indica',
    nombre_comun: 'Mango',
    nombre_cientifico: 'Mangifera indica L.',
  },
];

describe('normalizarNombreComun', () => {
  it('normaliza curubo → curuba de castilla', () => {
    expect(normalizarNombreComun('curubo')).toBe('curuba de castilla');
  });

  it('normaliza curuba → curuba de castilla', () => {
    expect(normalizarNombreComun('curuba')).toBe('curuba de castilla');
  });

  it('normaliza uvilla → uchuva', () => {
    expect(normalizarNombreComun('uvilla')).toBe('uchuva');
  });

  it('normaliza uchuva → uchuva (canónico)', () => {
    expect(normalizarNombreComun('uchuva')).toBe('uchuva');
  });

  it('normaliza tomate de palo → tomate de arbol / tamarillo', () => {
    expect(normalizarNombreComun('tomate de palo')).toBe('tomate de árbol / tamarillo');
  });

  it('normaliza tomate de arbol (sin acento) → tomate de arbol / tamarillo', () => {
    expect(normalizarNombreComun('tomate de arbol')).toBe('tomate de árbol / tamarillo');
  });

  it('normaliza CURUBA (mayúsculas) → curuba de castilla', () => {
    expect(normalizarNombreComun('CURUBA')).toBe('curuba de castilla');
  });

  it('normaliza Curuba de Castilla (con acentos y mayúsculas) → curuba de castilla', () => {
    expect(normalizarNombreComun('Curuba de Castilla')).toBe('curuba de castilla');
  });

  it('NO colapsa mango → mang (falso positivo obvio)', () => {
    // MANGO debe permanecer como "mango", NO convertirse a "mang"
    expect(normalizarNombreComun('mango')).toBe('mango');
    expect(normalizarNombreComun('mango')).not.toBe('mang');
  });

  it('devuelve nombre normalizado si no es variante conocida', () => {
    // Nombre desconocido sin variantes
    expect(normalizarNombreComun('papaya')).toBe('papaya');
    expect(normalizarNombreComun('Zanahoria')).toBe('zanahoria');
  });

  it('maneja strings vacías y edge cases', () => {
    expect(normalizarNombreComun('')).toBe('');
    expect(normalizarNombreComun('   ')).toBe('');
    expect(normalizarNombreComun(null)).toBe('');
  });
});

describe('resolverEspecie', () => {
  it('resuelve curubo → Passiflora tripartita', () => {
    expect(resolverEspecie('curubo', CATÁLOGO_MOCK)).toBe(
      'Passiflora tripartita var. mollissima (Kunth) Holm-Niels. & Jørg.'
    );
  });

  it('resuelve curuba → Passiflora tripartita', () => {
    expect(resolverEspecie('curuba', CATÁLOGO_MOCK)).toBe(
      'Passiflora tripartita var. mollissima (Kunth) Holm-Niels. & Jørg.'
    );
  });

  it('resuelve uvilla → Physalis peruviana', () => {
    expect(resolverEspecie('uvilla', CATÁLOGO_MOCK)).toBe(
      'Physalis peruviana L.'
    );
  });

  it('resuelve tomate de palo → Solanum betaceum', () => {
    expect(resolverEspecie('tomate de palo', CATÁLOGO_MOCK)).toBe(
      'Solanum betaceum Cav.'
    );
  });

  it('resuelve mango (si está en catálogo) → Mangifera indica', () => {
    expect(resolverEspecie('mango', CATÁLOGO_MOCK)).toBe(
      'Mangifera indica L.'
    );
  });

  it('devuelve null para nombre desconocido', () => {
    // Nombre que NO está en el catálogo
    expect(resolverEspecie('nombre_inexistente', CATÁLOGO_MOCK)).toBeNull();
  });

  it('devuelve null para string vacío', () => {
    expect(resolverEspecie('', CATÁLOGO_MOCK)).toBeNull();
    expect(resolverEspecie('   ', CATÁLOGO_MOCK)).toBeNull();
  });

  it('devuelve null si catálogo está vacío', () => {
    expect(resolverEspecie('curuba', [])).toBeNull();
    expect(resolverEspecie('curuba', null)).toBeNull();
  });

  it('devuelve null si catálogo no es array', () => {
    expect(resolverEspecie('curuba', {})).toBeNull();
    expect(resolverEspecie('curuba', 'no-array')).toBeNull();
    expect(resolverEspecie('curuba', undefined)).toBeNull();
  });
});

describe('MAPA_VARIANTES', () => {
  it('tiene las variantes críticas para el detector de confusión taxonómica', () => {
    // Verificar que existen las variantes mencionadas en el task
    const todasLasVariantes = Object.values(MAPA_VARIANTES).flat();
    
    // Variantes críticas que deben existir
    expect(todasLasVariantes).toContain('curuba');
    expect(todasLasVariantes).toContain('curubo');
    expect(todasLasVariantes).toContain('uchuva');
    expect(todasLasVariantes).toContain('uvilla');
    expect(todasLasVariantes).toContain('tomate de árbol');
    expect(todasLasVariantes).toContain('tomate de arbol');
    expect(todasLasVariantes).toContain('tomate de palo');
  });

  it('NO tiene variantes que causen falsos positivos obvios', () => {
    // Verificar que NO existe una entrada que colapsaría "mango" → "mang"
    const todasLasVariantes = Object.values(MAPA_VARIANTES).flat();
    
    // "mang" NO debería estar como variante de nada
    expect(todasLasVariantes).not.toContain('mang');
  });

  it('es extensible (tiene estructura correcta)', () => {
    // Verificar que el mapa tiene la estructura esperada
    expect(typeof MAPA_VARIANTES).toBe('object');
    
    for (const [canonica, variantes] of Object.entries(MAPA_VARIANTES)) {
      expect(typeof canonica).toBe('string');
      expect(Array.isArray(variantes)).toBe(true);
      expect(variantes.length).toBeGreaterThan(0);
      
      // Todas las variantes deben ser strings
      for (const variante of variantes) {
        expect(typeof variante).toBe('string');
      }
    }
  });
});
