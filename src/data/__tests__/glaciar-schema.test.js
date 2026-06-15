/**
 * glaciar-schema.test.js — tests de deduplicación y backward compatibility.
 *
 * Verifica que:
 * 1. Solo hay 2 duplicados intencionales: hielo_podrido y penitentes
 * 2. PELIGROS_DUPLICADOS lista explícitamente los duplicados
 * 3. Backward compatibility: hielo_podrido y penitentes funcionan como peligros
 * 4. La lógica de safety funciona con ambos arrays
 */
import { describe, it, expect } from 'vitest';
import {
  TIPOS_SUPERFICIE,
  PELIGROS,
  PELIGROS_DUPLICADOS,
  PELIGRO_BY_KEY,
} from '../glaciar-schema.js';

describe('glaciar-schema — deduplicación de peligros', () => {
  it('PELIGROS no contiene keys duplicados internos', () => {
    const keys = PELIGROS.map((p) => p.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('TIPOS_SUPERFICIE no contiene keys duplicados internos', () => {
    const keys = TIPOS_SUPERFICIE.map((t) => t.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('Solo hay 2 keys duplicados entre TIPOS_SUPERFICIE y PELIGROS', () => {
    const superficieKeys = new Set(TIPOS_SUPERFICIE.map((t) => t.key));
    const peligroKeys = new Set(PELIGROS.map((p) => p.key));

    const duplicados = [...superficieKeys].filter((key) => peligroKeys.has(key));
    expect(duplicados).toEqual(expect.arrayContaining(['hielo_podrido', 'penitentes']));
    expect(duplicados.length).toBe(2);
  });

  it('PELIGROS_DUPLICADOS contiene exactamente los duplicados', () => {
    const superficieKeys = new Set(TIPOS_SUPERFICIE.map((t) => t.key));
    const peligroKeys = new Set(PELIGROS.map((p) => p.key));

    const duplicadosReales = [...superficieKeys].filter((key) => peligroKeys.has(key));
    const duplicadosDeclarados = new Set(PELIGROS_DUPLICADOS);

    expect(duplicadosReales.length).toBe(2);
    expect(duplicadosDeclarados.has('hielo_podrido')).toBe(true);
    expect(duplicadosDeclarados.has('penitentes')).toBe(true);
    expect(duplicadosDeclarados.size).toBe(duplicadosReales.length);
  });
});

describe('glaciar-schema — backward compatibility', () => {
  it('hielo_podrido está tanto en TIPOS_SUPERFICIE como en PELIGROS', () => {
    const superficieKeys = new Set(TIPOS_SUPERFICIE.map((t) => t.key));
    const peligroKeys = new Set(PELIGROS.map((p) => p.key));

    expect(superficieKeys.has('hielo_podrido')).toBe(true);
    expect(peligroKeys.has('hielo_podrido')).toBe(true);
  });

  it('penitentes está tanto en TIPOS_SUPERFICIE como en PELIGROS', () => {
    const superficieKeys = new Set(TIPOS_SUPERFICIE.map((t) => t.key));
    const peligroKeys = new Set(PELIGROS.map((p) => p.key));

    expect(superficieKeys.has('penitentes')).toBe(true);
    expect(peligroKeys.has('penitentes')).toBe(true);
  });

  it('PELIGRO_BY_KEY incluye hielo_podrido y penitentes', () => {
    expect(PELIGRO_BY_KEY['hielo_podrido']).toBeDefined();
    expect(PELIGRO_BY_KEY['penitentes']).toBeDefined();
  });

  it('seracs está en PELIGROS pero NO en TIPOS_SUPERFICIE', () => {
    const superficieKeys = new Set(TIPOS_SUPERFICIE.map((t) => t.key));
    const peligroKeys = new Set(PELIGROS.map((p) => p.key));

    expect(superficieKeys.has('seracs')).toBe(false);
    expect(peligroKeys.has('seracs')).toBe(true);
  });

  it('no hay otros duplicados además de hielo_podrido y penitentes', () => {
    const superficieKeys = new Set(TIPOS_SUPERFICIE.map((t) => t.key));
    const peligroKeys = new Set(PELIGROS.map((p) => p.key));

    const duplicados = [...superficieKeys].filter((key) => peligroKeys.has(key));
    const duplicadosSinConocidos = duplicados.filter((k) => !PELIGROS_DUPLICADOS.includes(k));

    expect(duplicadosSinConocidos).toEqual([]);
  });
});
