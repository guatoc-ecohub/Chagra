import { describe, it, expect } from 'vitest';
import { getTemplate, getAllTemplates } from '../phenologyTemplates';

describe('phenologyTemplates', () => {
  it('retorna todas las plantillas (18 especies)', () => {
    const all = getAllTemplates();
    expect(all.length).toBe(18);
  });

  it('cada plantilla tiene campos requeridos', () => {
    const all = getAllTemplates();
    for (const t of all) {
      expect(t.template_id).toBeTruthy();
      expect(t.species_slug).toBeTruthy();
      expect(t.species_label).toBeTruthy();
      expect(t.version).toBe(1);
      expect(Array.isArray(t.sources)).toBe(true);
      expect(t.sources.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(t.stages)).toBe(true);
      expect(t.stages.length).toBeGreaterThanOrEqual(4);
      for (const s of t.stages) {
        expect(s.code).toBeTruthy();
        expect(s.label).toBeTruthy();
        expect(typeof s.minDays).toBe('number');
        expect(typeof s.sourceIndex).toBe('number');
      }
    }
  });

  it('cada plantilla tiene etapa sowing con minDays=0 maxDays=0', () => {
    const all = getAllTemplates();
    for (const t of all) {
      const sowing = t.stages.find((s) => s.code === 'sowing');
      expect(sowing).toBeTruthy();
      expect(sowing.minDays).toBe(0);
      expect(sowing.maxDays).toBe(0);
    }
  });

  it('cada plantilla termina en etapa closed con maxDays null', () => {
    const all = getAllTemplates();
    for (const t of all) {
      const closed = t.stages[t.stages.length - 1];
      expect(closed.code).toBe('closed');
      expect(closed.maxDays).toBeNull();
    }
  });

  it('búsqueda por slug de especie funciona para las nuevas', () => {
    expect(getTemplate('zea_mays')).toBeTruthy();
    expect(getTemplate('phaseolus_vulgaris')).toBeTruthy();
    expect(getTemplate('manihot_esculenta')).toBeTruthy();
    expect(getTemplate('musa_paradisiaca')).toBeTruthy();
    expect(getTemplate('persea_americana')).toBeTruthy();
    expect(getTemplate('solanum_betaceum')).toBeTruthy();
    expect(getTemplate('solanum_quitoense')).toBeTruthy();
    expect(getTemplate('rubus_glaucus')).toBeTruthy();
    expect(getTemplate('physalis_peruviana')).toBeTruthy();
    expect(getTemplate('fragaria_ananassa')).toBeTruthy();
    expect(getTemplate('lactuca_sativa')).toBeTruthy();
    expect(getTemplate('allium_cepa')).toBeTruthy();
    expect(getTemplate('coriandrum_sativum')).toBeTruthy();
    expect(getTemplate('daucus_carota')).toBeTruthy();
    expect(getTemplate('pisum_sativum')).toBeTruthy();
  });

  it('getTemplate retorna null para slug inexistente', () => {
    expect(getTemplate('no_existe')).toBeNull();
  });

  it('cada fuente tiene name, reference y url', () => {
    const all = getAllTemplates();
    for (const t of all) {
      for (const src of t.sources) {
        expect(src.name).toBeTruthy();
        expect(src.reference).toBeTruthy();
        expect(src.url).toBeTruthy();
      }
    }
  });
});
