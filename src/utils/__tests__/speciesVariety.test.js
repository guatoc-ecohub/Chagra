import { describe, it, expect } from 'vitest';
import {
  extractVarieties,
  shouldShowVarietyField,
  varietyHelpText,
} from '../speciesVariety';

/**
 * Tests para UX-14 (#286): variedad dinámica desde catalogDB.
 *
 * Verifica:
 *   - extractVarieties devuelve [] cuando species es null/undefined/sin campo.
 *   - extractVarieties normaliza {value, label, obtentor} correctamente.
 *   - shouldShowVarietyField retorna boolean correcto en cada case.
 *   - varietyHelpText pluraliza correctamente.
 */

const speciesWithVarieties = {
  id: 'arracacia_xanthorrhiza',
  nombre_comun: 'Arracacha',
  variedades_registradas_ica: [
    {
      id_canonico: 'agrosavia-la22-arracacha-2019',
      nombre_comercial: 'AGROSAVIA La 22',
      obtentor: { nombre: 'AGROSAVIA' },
    },
    {
      id_canonico: 'agrosavia-criolla',
      nombre_comercial: 'Criolla',
      obtentor: { nombre: 'AGROSAVIA' },
    },
  ],
};

const speciesWithoutVarieties = {
  id: 'fragaria_x_ananassa',
  nombre_comun: 'Fresa',
  // sin campo variedades_registradas_ica
};

const speciesWithEmptyArray = {
  id: 'rosmarinus_officinalis',
  nombre_comun: 'Romero',
  variedades_registradas_ica: [],
};

describe('UX-14 — speciesVariety', () => {
  describe('extractVarieties', () => {
    it('retorna [] para null / undefined / no-object', () => {
      expect(extractVarieties(null)).toEqual([]);
      expect(extractVarieties(undefined)).toEqual([]);
      expect(extractVarieties('not-an-object')).toEqual([]);
      expect(extractVarieties(42)).toEqual([]);
    });

    it('retorna [] cuando species no trae campo variedades_registradas_ica', () => {
      expect(extractVarieties(speciesWithoutVarieties)).toEqual([]);
    });

    it('retorna [] cuando variedades_registradas_ica es array vacío', () => {
      expect(extractVarieties(speciesWithEmptyArray)).toEqual([]);
    });

    it('normaliza variedades al shape {value, label, obtentor}', () => {
      const result = extractVarieties(speciesWithVarieties);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        value: 'AGROSAVIA La 22',
        label: 'AGROSAVIA La 22',
        obtentor: 'AGROSAVIA',
      });
      expect(result[1].value).toBe('Criolla');
    });

    it('descarta variedades sin nombre_comercial ni id_canonico', () => {
      const species = {
        variedades_registradas_ica: [
          { nombre_comercial: 'OK' },
          { obtentor: { nombre: 'Sin nombre' } },
          null,
          { nombre_comercial: '' },
        ],
      };
      const result = extractVarieties(species);
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('OK');
    });

    it('fallback a id_canonico cuando falta nombre_comercial', () => {
      const species = {
        variedades_registradas_ica: [
          { id_canonico: 'agrosavia-x-2025', obtentor: { nombre: 'AGROSAVIA' } },
        ],
      };
      const result = extractVarieties(species);
      expect(result[0].label).toBe('agrosavia-x-2025');
    });
  });

  describe('shouldShowVarietyField', () => {
    it('retorna true cuando hay variedades', () => {
      expect(shouldShowVarietyField(speciesWithVarieties)).toBe(true);
    });
    it('retorna false cuando NO hay campo', () => {
      expect(shouldShowVarietyField(speciesWithoutVarieties)).toBe(false);
    });
    it('retorna false cuando array es vacío', () => {
      expect(shouldShowVarietyField(speciesWithEmptyArray)).toBe(false);
    });
    it('retorna false para null', () => {
      expect(shouldShowVarietyField(null)).toBe(false);
    });
  });

  describe('varietyHelpText', () => {
    it('pluraliza correctamente para 1 variedad', () => {
      const text = varietyHelpText([{ value: 'X', label: 'X' }]);
      expect(text).toContain('1 variedad ');
      expect(text).toContain('registrada ');
      expect(text).not.toContain('variedades');
    });
    it('pluraliza correctamente para 2+ variedades', () => {
      const text = varietyHelpText([
        { value: 'X', label: 'X' },
        { value: 'Y', label: 'Y' },
      ]);
      expect(text).toContain('2 variedades');
      expect(text).toContain('registradas');
    });
    it('retorna null para [] o no-array', () => {
      expect(varietyHelpText([])).toBeNull();
      expect(varietyHelpText(null)).toBeNull();
      expect(varietyHelpText(/** @type {any} */ ('not-array'))).toBeNull();
    });
    it('menciona "Otra" para que el usuario sepa que puede escribir', () => {
      const text = varietyHelpText([{ value: 'X', label: 'X' }]);
      expect(text).toMatch(/otra/i);
    });
  });
});
