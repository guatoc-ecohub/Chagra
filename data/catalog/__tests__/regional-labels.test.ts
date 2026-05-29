/**
 * regional-labels.test.ts
 * ================================================================
 * Tests vitest para el catálogo regional-labels-v3.3.json
 * Cubren validación de schema, etiquetas únicas, referencias cruzadas,
 * y funcionalidad del validator.
 *
 * Ejecutar: npx vitest run data/catalog/__tests__/regional-labels.test.ts
 * ================================================================
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RegionalLabelsCatalog, RegionalLabel, ConfusionWarning, Region } from '../schemas/regional-label-schema';

const CATALOG_PATH = resolve(__dirname, '../regional-labels-v3.3.json');

let catalog: RegionalLabelsCatalog;

describe('regional-labels-v3.3.json', () => {
  beforeAll(() => {
    const content = readFileSync(CATALOG_PATH, 'utf-8');
    catalog = JSON.parse(content);
  });

  describe('Estructura básica', () => {
    it('debe tener campos raíz obligatorios', () => {
      expect(catalog).toHaveProperty('schema_version');
      expect(catalog).toHaveProperty('generated_at');
      expect(catalog).toHaveProperty('generated_by');
      expect(catalog).toHaveProperty('description');
      expect(catalog).toHaveProperty('stats');
      expect(catalog).toHaveProperty('regional_labels');
      expect(catalog).toHaveProperty('confusion_warnings');
    });

    it('debe tener version de schema v3.3.0', () => {
      expect(catalog.schema_version).toBe('3.3.0');
    });

    it('debe tener arrays de labels y warnings', () => {
      expect(Array.isArray(catalog.regional_labels)).toBe(true);
      expect(Array.isArray(catalog.confusion_warnings)).toBe(true);
    });

    it('debe tener stats con campos requeridos', () => {
      expect(catalog.stats).toHaveProperty('total_regional_labels');
      expect(catalog.stats).toHaveProperty('total_confusion_warnings');
      expect(catalog.stats).toHaveProperty('regions_covered');
      expect(catalog.stats).toHaveProperty('high_confidence_entries');
    });
  });

  describe('RegionalLabels', () => {
    it('cada label debe tener campos obligatorios', () => {
      for (const label of catalog.regional_labels) {
        expect(label).toHaveProperty('label');
        expect(label).toHaveProperty('entity_type');
        expect(label).toHaveProperty('regions');
        expect(label).toHaveProperty('confidence');
        expect(label).toHaveProperty('source');
        expect(label).toHaveProperty('added_at');
      }
    });

    it('label debe ser string no vacío', () => {
      for (const label of catalog.regional_labels) {
        expect(typeof label.label).toBe('string');
        expect(label.label.trim().length).toBeGreaterThan(0);
      }
    });

    it('entity_type debe ser uno de los valores permitidos', () => {
      const validTypes = new Set(['species', 'labor', 'biopreparado', 'unidad', 'plaga']);
      for (const label of catalog.regional_labels) {
        expect(validTypes.has(label.entity_type)).toBe(true);
      }
    });

    it('regions debe ser array no vacío', () => {
      for (const label of catalog.regional_labels) {
        expect(Array.isArray(label.regions)).toBe(true);
        expect(label.regions.length).toBeGreaterThan(0);
      }
    });

    it('regions deben ser válidas', () => {
      const validRegions: Region[] = [
        'andina_norte', 'andina_centro', 'andina_sur', 'antioquia', 'eje_cafetero',
        'cundiboyacense', 'caribe', 'caribe_sabanero', 'guajira', 'cesar',
        'magdalena', 'pacifica', 'choco', 'palenque', 'orinoquia', 'meta',
        'casanare', 'arauca', 'amazonia', 'putumayo', 'caqueta', 'transversal'
      ];
      const validRegionSet = new Set(validRegions);
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          expect(validRegionSet.has(region as Region)).toBe(true);
        }
      }
    });

    it('confidence debe ser alto, medio o bajo', () => {
      const validConfidence = new Set(['alto', 'medio', 'bajo']);
      for (const label of catalog.regional_labels) {
        expect(validConfidence.has(label.confidence)).toBe(true);
      }
    });

    it('source debe ser válido', () => {
      const validSources = new Set(['ALEC', 'ICA', 'AGROSAVIA', 'CENICAFE', 'CORPOICA', 'BERNAL_GALEANO', 'DR_LANG_2', 'CAMPO']);
      for (const label of catalog.regional_labels) {
        expect(validSources.has(label.source)).toBe(true);
      }
    });

    it('added_at debe ser fecha ISO válida', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}/;
      for (const label of catalog.regional_labels) {
        expect(dateRegex.test(label.added_at)).toBe(true);
      }
    });

    it('species_id debe ser string si está presente', () => {
      for (const label of catalog.regional_labels) {
        if ('species_id' in label) {
          expect(typeof label.species_id).toBe('string');
        }
      }
    });

    it('confusion_ids debe referenciar warnings existentes', () => {
      const warningIds = new Set(catalog.confusion_warnings.map(w => w.id));
      for (const label of catalog.regional_labels) {
        if (label.confusion_ids) {
          for (const cid of label.confusion_ids) {
            expect(warningIds.has(cid)).toBe(true);
          }
        }
      }
    });
  });

  describe('ConfusionWarnings', () => {
    it('cada warning debe tener campos obligatorios', () => {
      for (const warning of catalog.confusion_warnings) {
        expect(warning).toHaveProperty('id');
        expect(warning).toHaveProperty('label_ambiguo');
        expect(warning).toHaveProperty('meaning_correct');
        expect(warning).toHaveProperty('meaning_wrong');
        expect(warning).toHaveProperty('region_specific');
        expect(warning).toHaveProperty('severity');
        expect(warning).toHaveProperty('example_query');
        expect(warning).toHaveProperty('explanation');
        expect(warning).toHaveProperty('added_at');
      }
    });

    it('id debe ser único', () => {
      const ids = catalog.confusion_warnings.map(w => w.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('id debe seguir formato conf-XXX', () => {
      const idRegex = /^conf-\d+$/;
      for (const warning of catalog.confusion_warnings) {
        expect(idRegex.test(warning.id)).toBe(true);
      }
    });

    it('label_ambiguo debe ser string no vacío', () => {
      for (const warning of catalog.confusion_warnings) {
        expect(typeof warning.label_ambiguo).toBe('string');
        expect(warning.label_ambiguo.trim().length).toBeGreaterThan(0);
      }
    });

    it('meaning_correct debe ser string no vacío', () => {
      for (const warning of catalog.confusion_warnings) {
        expect(typeof warning.meaning_correct).toBe('string');
        expect(warning.meaning_correct.trim().length).toBeGreaterThan(0);
      }
    });

    it('meaning_wrong debe ser array no vacío', () => {
      for (const warning of catalog.confusion_warnings) {
        expect(Array.isArray(warning.meaning_wrong)).toBe(true);
        expect(warning.meaning_wrong.length).toBeGreaterThan(0);
      }
    });

    it('region_specific debe ser null o array válido', () => {
      const validRegions: Region[] = [
        'andina_norte', 'andina_centro', 'andina_sur', 'antioquia', 'eje_cafetero',
        'cundiboyacense', 'caribe', 'caribe_sabanero', 'guajira', 'cesar',
        'magdalena', 'pacifica', 'choco', 'palenque', 'orinoquia', 'meta',
        'casanare', 'arauca', 'amazonia', 'putumayo', 'caqueta', 'transversal'
      ];
      const validRegionSet = new Set(validRegions);
      for (const warning of catalog.confusion_warnings) {
        if (warning.region_specific !== null) {
          expect(Array.isArray(warning.region_specific)).toBe(true);
          for (const region of warning.region_specific) {
            expect(validRegionSet.has(region as Region)).toBe(true);
          }
        }
      }
    });

    it('severity debe ser critical, high, medium o low', () => {
      const validSeverity = new Set(['critical', 'high', 'medium', 'low']);
      for (const warning of catalog.confusion_warnings) {
        expect(validSeverity.has(warning.severity)).toBe(true);
      }
    });

    it('example_query debe ser string no vacío', () => {
      for (const warning of catalog.confusion_warnings) {
        expect(typeof warning.example_query).toBe('string');
        expect(warning.example_query.trim().length).toBeGreaterThan(0);
      }
    });

    it('explanation debe tener al menos 20 caracteres', () => {
      for (const warning of catalog.confusion_warnings) {
        expect(typeof warning.explanation).toBe('string');
        expect(warning.explanation.trim().length).toBeGreaterThanOrEqual(20);
      }
    });

    it('sources debe ser array si está presente', () => {
      for (const warning of catalog.confusion_warnings) {
        if ('sources' in warning) {
          expect(Array.isArray(warning.sources)).toBe(true);
        }
      }
    });
  });

  describe('Consistencia de stats', () => {
    it('total_regional_labels debe coincidir con array length', () => {
      expect(catalog.stats.total_regional_labels).toBe(catalog.regional_labels.length);
    });

    it('total_confusion_warnings debe coincidir con array length', () => {
      expect(catalog.stats.total_confusion_warnings).toBe(catalog.confusion_warnings.length);
    });

    it('high_confidence_entries debe coincidir con count real', () => {
      const actualHighConfidence = catalog.regional_labels.filter(l => l.confidence === 'alto').length;
      expect(catalog.stats.high_confidence_entries).toBe(actualHighConfidence);
    });

    it('regions_covered debe coincidir con regiones únicas usadas', () => {
      const regionsFound = new Set<Region>();
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          regionsFound.add(region as Region);
        }
      }
      expect(catalog.stats.regions_covered).toBe(regionsFound.size);
    });
  });

  describe('Convergencias de alta confianza (DR-LANG-2)', () => {
    it('debe incluir "palta" para aguacate en Andina Sur', () => {
      const label = catalog.regional_labels.find(l => l.label === 'palta');
      expect(label).toBeDefined();
      expect(label?.species_id).toBe('persea_americana');
      expect(label?.regions).toContain('andina_sur');
    });

    it('debe incluir "cura" para aguacate en Antioquia', () => {
      const label = catalog.regional_labels.find(l => l.label === 'cura');
      expect(label).toBeDefined();
      expect(label?.species_id).toBe('persea_americana');
      expect(label?.regions).toContain('antioquia');
    });

    it('debe incluir "guineo" ambivalente', () => {
      const label = catalog.regional_labels.find(l => l.label === 'guineo');
      expect(label).toBeDefined();
      expect(label?.regions).toContain('caribe');
    });

    it('debe incluir "yuca brava" con advertencia', () => {
      const label = catalog.regional_labels.find(l => l.label === 'yuca brava');
      expect(label).toBeDefined();
      expect(label?.regions).toContain('amazonia');
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-004');
      expect(warning?.label_ambiguo).toBe('yuca brava');
      expect(warning?.severity).toBe('critical');
    });

    it('debe incluir "choclo" para maíz tierno', () => {
      const label = catalog.regional_labels.find(l => l.label === 'choclo');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('species');
      expect(label?.regions).toContain('andina_sur');
    });

    it('debe incluir "gota" como Phytophthora', () => {
      const label = catalog.regional_labels.find(l => l.label === 'gota');
      expect(label).toBeDefined();
      expect(label?.species_id).toBe('phytophthora_infestans');
      expect(label?.entity_type).toBe('plaga');
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-009');
      expect(warning?.severity).toBe('critical');
    });

    it('debe incluir "bocashi" como biopreparado', () => {
      const label = catalog.regional_labels.find(l => l.label === 'bocashi');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('biopreparado');
      expect(label?.source).toBe('DR_LANG_2');
    });

    it('debe incluir "plaza" como unidad de área', () => {
      const label = catalog.regional_labels.find(l => l.label === 'plaza');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('unidad');
      expect(label?.regions).toContain('eje_cafetero');
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-015');
      expect(warning?.severity).toBe('critical');
    });

    it('debe incluir "tarea" como unidad Caribe Sabanero', () => {
      const label = catalog.regional_labels.find(l => l.label === 'tarea');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('unidad');
      expect(label?.regions).toContain('caribe_sabanero');
    });
  });

  describe('Aportes únicos Gemini dialectológico', () => {
    it('debe incluir "topocho" (clón resistente sequía)', () => {
      const label = catalog.regional_labels.find(l => l.label === 'topocho');
      expect(label).toBeDefined();
      expect(label?.regions).toContain('orinoquia');
    });

    it('debe incluir "platear" (labor circular)', () => {
      const label = catalog.regional_labels.find(l => l.label === 'platear');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('labor');
      expect(label?.regions).toContain('andina_centro');
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-018');
      expect(warning?.label_ambiguo).toBe('platear');
    });

    it('debe incluir "guachapear" (roza superficial)', () => {
      const label = catalog.regional_labels.find(l => l.label === 'guachapear');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('labor');
      expect(label?.regions).toContain('caribe');
    });

    it('debe incluir "caballeria" (unidad grande)', () => {
      const label = catalog.regional_labels.find(l => l.label === 'caballeria');
      expect(label).toBeDefined();
      expect(label?.entity_type).toBe('unidad');
      expect(label?.regions).toContain('orinoquia');
    });
  });

  describe('ConfusionWarnings críticas', () => {
    it('debe tener warning para "maracuya" (cruce climático)', () => {
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-006');
      expect(warning).toBeDefined();
      expect(warning.label_ambiguo).toBe('maracuya');
      expect(warning.severity).toBe('critical');
      expect(warning.meaning_correct).toContain('clima frío');
      expect(warning.meaning_correct).toContain('clima cálido');
    });

    it('debe tener warning para "naranjilla" (no es cítrico)', () => {
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-007');
      expect(warning).toBeDefined();
      expect(warning.label_ambiguo).toBe('naranjilla');
      expect(warning.severity).toBe('critical');
      expect(warning.meaning_correct).toContain('NO es cítrico');
    });

    it('debe tener warning para "caldo bordeles" vs sulfocálcico', () => {
      const warning = catalog.confusion_warnings.find(w => w.id === 'conf-013');
      expect(warning).toBeDefined();
      expect(warning.label_ambiguo).toBe('caldo bordeles');
      expect(warning.severity).toBe('critical');
      expect(warning.explanation).toContain('NUNCA mezclar');
    });
  });

  describe('Tipos de entidad', () => {
    it('debe tener labels de tipo species', () => {
      const species = catalog.regional_labels.filter(l => l.entity_type === 'species');
      expect(species.length).toBeGreaterThan(20);
    });

    it('debe tener labels de tipo plaga', () => {
      const pests = catalog.regional_labels.filter(l => l.entity_type === 'plaga');
      expect(pests.length).toBeGreaterThan(5);
    });

    it('debe tener labels de tipo biopreparado', () => {
      const biopreps = catalog.regional_labels.filter(l => l.entity_type === 'biopreparado');
      expect(biopreps.length).toBeGreaterThan(3);
    });

    it('debe tener labels de tipo unidad', () => {
      const units = catalog.regional_labels.filter(l => l.entity_type === 'unidad');
      expect(units.length).toBeGreaterThan(5);
    });

    it('debe tener labels de tipo labor', () => {
      const labors = catalog.regional_labels.filter(l => l.entity_type === 'labor');
      expect(labors.length).toBeGreaterThan(3);
    });
  });

  describe('Cobertura regional', () => {
    it('debe cubrir múltiples regiones andinas', () => {
      const andinaRegions = new Set(['andina_norte', 'andina_centro', 'andina_sur', 'antioquia', 'eje_cafetero', 'cundiboyacense']);
      const regionsFound = new Set<Region>();
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          if (andinaRegions.has(region as Region)) {
            regionsFound.add(region as Region);
          }
        }
      }
      expect(regionsFound.size).toBeGreaterThanOrEqual(4);
    });

    it('debe cubrir región Caribe', () => {
      const caribeRegions = new Set(['caribe', 'caribe_sabanero', 'guajira', 'cesar', 'magdalena']);
      const regionsFound = new Set<Region>();
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          if (caribeRegions.has(region as Region)) {
            regionsFound.add(region as Region);
          }
        }
      }
      expect(regionsFound.size).toBeGreaterThanOrEqual(2);
    });

    it('debe cubrir región Pacífica', () => {
      const pacificaRegions = new Set(['pacifica', 'choco', 'palenque']);
      const regionsFound = new Set<Region>();
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          if (pacificaRegions.has(region as Region)) {
            regionsFound.add(region as Region);
          }
        }
      }
      expect(regionsFound.size).toBeGreaterThanOrEqual(1);
    });

    it('debe cubrir región Orinoquía', () => {
      const orinoquiaRegions = new Set(['orinoquia', 'meta', 'casanare', 'arauca']);
      const regionsFound = new Set<Region>();
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          if (orinoquiaRegions.has(region as Region)) {
            regionsFound.add(region as Region);
          }
        }
      }
      expect(regionsFound.size).toBeGreaterThanOrEqual(2);
    });

    it('debe cubrir región Amazonía', () => {
      const amazoniaRegions = new Set(['amazonia', 'putumayo', 'caqueta']);
      const regionsFound = new Set<Region>();
      for (const label of catalog.regional_labels) {
        for (const region of label.regions) {
          if (amazoniaRegions.has(region as Region)) {
            regionsFound.add(region as Region);
          }
        }
      }
      expect(regionsFound.size).toBeGreaterThanOrEqual(1);
    });
  });
});
