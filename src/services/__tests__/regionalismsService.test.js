import { describe, test, expect } from 'vitest';
import { getRegionFromDepartment, applyRegionalismOverlay, listAvailableRegions } from '../regionalismsService';

describe('regionalismsService', () => {
  describe('getRegionFromDepartment', () => {
    test('antioquia -> paisa', () => {
      expect(getRegionFromDepartment('antioquia')).toBe('paisa');
    });
    test('bogota_dc -> cundiboyacense', () => {
      expect(getRegionFromDepartment('bogota_dc')).toBe('cundiboyacense');
    });
    test('atlantico -> caribe', () => {
      expect(getRegionFromDepartment('atlantico')).toBe('caribe');
    });
    test('meta -> llanero', () => {
      expect(getRegionFromDepartment('meta')).toBe('llanero');
    });
    test('putumayo -> amazonica', () => {
      expect(getRegionFromDepartment('putumayo')).toBe('amazonica');
    });
    test('unknown -> null', () => {
      expect(getRegionFromDepartment('desconocido')).toBeNull();
    });
    test('null -> null', () => {
      expect(getRegionFromDepartment(null)).toBeNull();
    });
  });

  describe('applyRegionalismOverlay', () => {
    test('intensity 0 returns original text', () => {
      const result = applyRegionalismOverlay('test response', 'paisa', 0);
      expect(result).toBe('test response');
    });
    test('intensity 0 with null region returns original', () => {
      const result = applyRegionalismOverlay('test response', null, 0);
      expect(result).toBe('test response');
    });
    test('intensity 1 adds cierre for caribe', () => {
      const result = applyRegionalismOverlay('test response', 'caribe', 1);
      expect(result).toContain('test response');
      expect(result).toMatch(/Saludo desde el Caribe|Buena pa' la chagra/);
    });
    test('intensity 2 adds saludo + cierre for paisa', () => {
      const result = applyRegionalismOverlay('test response', 'paisa', 2);
      expect(result).toMatch(/¡Quí más, parce!|¡Ave maría pues!|Buenas, parcero/);
      expect(result).toContain('test response');
      expect(result).toMatch(/Pa'lante con la chagra|Suerte parce/);
    });
    test('null text returns null', () => {
      const result = applyRegionalismOverlay(null, 'paisa', 1);
      expect(result).toBeNull();
    });
    test('empty text returns empty', () => {
      const result = applyRegionalismOverlay('', 'paisa', 1);
      expect(result).toBe('');
    });
    test('unknown region falls back to neutro', () => {
      const result = applyRegionalismOverlay('test', 'region_desconocida', 1);
      expect(result).toContain('test');
    });
  });

  describe('listAvailableRegions', () => {
    test('returns array of region objects', () => {
      const regions = listAvailableRegions();
      expect(Array.isArray(regions)).toBe(true);
      expect(regions.length).toBeGreaterThan(0);
    });
    test('each region has slug, label, departamentos', () => {
      const regions = listAvailableRegions();
      regions.forEach((r) => {
        expect(typeof r.slug).toBe('string');
        expect(typeof r.label).toBe('string');
        expect(Array.isArray(r.departamentos)).toBe(true);
      });
    });
    test('amazonica has nota_apropiacion', () => {
      const regions = listAvailableRegions();
      const amazonica = regions.find((r) => r.slug === 'amazonica');
      expect(amazonica?.nota_apropiacion).toBeTruthy();
    });
  });
});