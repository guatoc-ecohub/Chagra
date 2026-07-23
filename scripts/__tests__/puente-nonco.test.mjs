/**
 * scripts/__tests__/puente-nonco.test.mjs
 * 
 * Tests para el script de puente NONCO.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Importar funciones del script
import {
  normalizeBinomio,
  extractGenus,
  matchByBinomioExacto,
  matchByGenero,
  matchBySinonimos,
  emitCoRelevantRel,
  wrapCypher,
} from '../puente-nonco.mjs';

describe('puente-nonco - utilidades', () => {
  describe('normalizeBinomio', () => {
    it('debería normalizar binomios correctamente', () => {
      expect(normalizeBinomio('Spodoptera frugiperda')).toBe('spodoptera frugiperda');
      expect(normalizeBinomio('  Spodoptera  frugiperda  ')).toBe('spodoptera frugiperda');
      expect(normalizeBinomio('SPODOPTERA FRUGIPERDA')).toBe('spodoptera frugiperda');
    });

    it('debería manejar null/undefined', () => {
      expect(normalizeBinomio(null)).toBeNull();
      expect(normalizeBinomio(undefined)).toBeNull();
      expect(normalizeBinomio('')).toBeNull();
    });
  });

  describe('extractGenus', () => {
    it('debería extraer el género correctamente', () => {
      expect(extractGenus('Spodoptera frugiperda')).toBe('spodoptera');
      expect(extractGenus('Spodoptera sp.')).toBe('spodoptera');
      expect(extractGenus('Spodoptera spp.')).toBe('spodoptera');
    });

    it('debería manejar null/undefined', () => {
      expect(extractGenus(null)).toBeNull();
      expect(extractGenus(undefined)).toBeNull();
      expect(extractGenus('')).toBeNull();
    });
  });
});

describe('puente-nonco - emparejamiento', () => {
  let noncoPestMock;
  let pestMock;

  beforeEach(() => {
    noncoPestMock = {
      id: 'spodoptera_frugiperda_nonco',
      nombre: 'Gusano cogollero',
      nombre_cientifico: 'Spodoptera frugiperda',
    };

    pestMock = {
      id: 'spodoptera_frugiperda',
      nombre: 'Gusano cogollero del maíz',
      nombre_cientifico: 'Spodoptera frugiperda',
    };
  });

  describe('matchByBinomioExacto', () => {
    it('debería emparejar por binomio exacto', () => {
      const allPests = [pestMock];
      const matches = matchByBinomioExacto(noncoPestMock, allPests);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        noncoPest: 'spodoptera_frugiperda_nonco',
        pest: 'spodoptera_frugiperda',
        metodo: 'binomio_exacto',
        confianza: 1.0,
      });
      expect(matches[0].razon).toContain('Spodoptera frugiperda');
    });

    it('no debería emparejar si los binomios son diferentes', () => {
      const allPests = [{
        id: 'spodoptera_eralis',
        nombre_cientifico: 'Spodoptera eralis',
      }];
      const matches = matchByBinomioExacto(noncoPestMock, allPests);

      expect(matches).toHaveLength(0);
    });

    it('debería manejar NoncoPest sin nombre_cientifico', () => {
      const noncoPestSinBinomio = {
        id: 'plaga_sin_binomio',
        nombre: 'Alguna plaga',
      };
      const allPests = [pestMock];
      const matches = matchByBinomioExacto(noncoPestSinBinomio, allPests);

      expect(matches).toHaveLength(0);
    });
  });

  describe('matchByGenero', () => {
    it('debería emparejar por género cuando NoncoPest es sp.', () => {
      const noncoPestSp = {
        id: 'spodoptera_sp_nonco',
        nombre: 'Spodoptera sp.',
        nombre_cientifico: 'Spodoptera sp.',
      };
      const allPests = [pestMock];
      const matches = matchByGenero(noncoPestSp, allPests);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        noncoPest: 'spodoptera_sp_nonco',
        pest: 'spodoptera_frugiperda',
        metodo: 'genero',
        confianza: 0.6,
      });
      expect(matches[0].razon).toContain('spodoptera');
    });

    it('no debería emparejar si NoncoPest tiene epíteto específico', () => {
      const allPests = [pestMock];
      const matches = matchByGenero(noncoPestMock, allPests);

      expect(matches).toHaveLength(0);
    });

    it('no debería emparejar si los géneros son diferentes', () => {
      const allPests = [{
        id: 'helicoverpa_armigera',
        nombre_cientifico: 'Helicoverpa armigera',
      }];
      const noncoPestSp = {
        id: 'spodoptera_sp_nonco',
        nombre_cientifico: 'Spodoptera sp.',
      };
      const matches = matchByGenero(noncoPestSp, allPests);

      expect(matches).toHaveLength(0);
    });
  });

  describe('matchBySinonimos', () => {
    it('debería emparejar por sinónimos de nombre', () => {
      const pestSynonyms = {
        'broca del café': 'Broca del café',
        'broca': 'Broca del café',
      };

      const noncoPestBroca = {
        id: 'broca_cafe_nonco',
        nombre: 'broca del café',
      };

      const pestBroca = {
        id: 'hypothenemus_hampei',
        nombre: 'Broca del café',
        nombre_cientifico: 'Hypothenemus hampei',
      };

      const allPests = [pestBroca];
      const matches = matchBySinonimos(noncoPestBroca, allPests, pestSynonyms);

      expect(matches).toHaveLength(1);
      expect(matches[0]).toMatchObject({
        noncoPest: 'broca_cafe_nonco',
        pest: 'hypothenemus_hampei',
        metodo: 'sinonimo',
        confianza: 0.7,
      });
    });

    it('debería manejar sinónimos vacíos', () => {
      const noncoPestBroca = {
        id: 'broca_cafe_nonco',
        nombre: 'broca del café',
      };

      const pestBroca = {
        id: 'hypothenemus_hampei',
        nombre: 'Broca del café',
      };

      const allPests = [pestBroca];
      const matches = matchBySinonimos(noncoPestBroca, allPests, {});

      expect(matches).toHaveLength(0);
    });
  });
});

describe('puente-nonco - generación SQL', () => {
  describe('emitCoRelevantRel', () => {
    it('debería generar SQL válido para puente CO_RELEVANT', () => {
      const sql = emitCoRelevantRel(
        10977524091715694,
        2251799813685379,
        'binomio_exacto',
        1.0,
        'Binomio científico idéntico',
        '2026-07-16T00:00:00.000Z'
      );

      // AGE 1.5.0: empareja por id INTERNO (id(a)=...), no por propiedad `id`.
      expect(sql).toContain('WHERE id(a) = 10977524091715694 AND id(b) = 2251799813685379');
      expect(sql).toContain('MERGE (a)-[r:CO_RELEVANT');
      expect(sql).toContain('r.metodo');
      expect(sql).toContain('r.confianza');
      expect(sql).toContain('r.razon');
      expect(sql).toContain('provenance');
      // sin `;` dentro del bloque Cypher (rompe el cypher() de AGE)
      expect(sql).not.toContain('RETURN id(r);');
    });
  });

  describe('wrapCypher', () => {
    it('debería envolver Cypher en SELECT FROM cypher', () => {
      const cypher = 'MATCH (n:Pest) RETURN n';
      const wrapped = wrapCypher(cypher);

      expect(wrapped).toContain("SELECT * FROM cypher('chagra_kg'");
      expect(wrapped).toContain('$$');
      expect(wrapped).toContain('AS (v agtype)');
    });
  });
});
