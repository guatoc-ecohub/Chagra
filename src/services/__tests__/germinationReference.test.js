import { describe, it, expect } from 'vitest';
import { listGerminationReferences, getGerminationReference } from '../germinationReference';

/**
 * Contrato anti-alucinación del módulo Germinación: los días de referencia a
 * germinar/emerger salen EXCLUSIVAMENTE de las plantillas fenológicas reales
 * (stage `emergence`). Nada se inventa. Solo especies de semilla verdadera.
 */
describe('germinationReference', () => {
  it('lista solo especies de semilla verdadera con rango de días real', () => {
    const refs = listGerminationReferences();
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) {
      expect(r.slug).toBeTruthy();
      expect(r.label).toBeTruthy();
      expect(Number.isFinite(r.minDays)).toBe(true);
      expect(Number.isFinite(r.maxDays)).toBe(true);
      expect(r.minDays).toBeGreaterThan(0);
      expect(r.maxDays).toBeGreaterThanOrEqual(r.minDays);
    }
  });

  it('NO incluye especies que se propagan por tubérculo/estaca (papa, yuca)', () => {
    const slugs = listGerminationReferences().map((r) => r.slug);
    expect(slugs).not.toContain('solanum_tuberosum');
    expect(slugs).not.toContain('manihot_esculenta');
  });

  it('expone maíz y fríjol con sus días reales de la plantilla', () => {
    const maiz = getGerminationReference('zea_mays');
    expect(maiz).not.toBeNull();
    expect(maiz.minDays).toBe(4);
    expect(maiz.maxDays).toBe(10);
    expect(maiz.sourceName).toBeTruthy();

    const frijol = getGerminationReference('phaseolus_vulgaris');
    expect(frijol).not.toBeNull();
    expect(frijol.minDays).toBe(4);
    expect(frijol.maxDays).toBe(8);
  });

  it('devuelve null para una especie sin dato (no inventa)', () => {
    expect(getGerminationReference('especie_inexistente_xyz')).toBeNull();
    // Papa tiene emergence pero NO es semilla verdadera → null, no número falso.
    expect(getGerminationReference('solanum_tuberosum')).toBeNull();
  });

  it('lista ordenada alfabéticamente por etiqueta', () => {
    const labels = listGerminationReferences().map((r) => r.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, 'es'));
    expect(labels).toEqual(sorted);
  });
});
