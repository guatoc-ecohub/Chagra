import { describe, it, expect } from 'vitest';
import { checklistBiodiversidad } from '../biodiversidadMonitor.js';

describe('checklistBiodiversidad', () => {
  it('retorna array de indicadores', () => {
    const r = checklistBiodiversidad();
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });

  it('cada indicador tiene nombre y como_se_hace', () => {
    const r = checklistBiodiversidad();
    for (const ind of r) {
      expect(ind.nombre).toBeTruthy();
      expect(ind.como_se_hace).toBeTruthy();
      expect(ind.confiabilidad).toBeTruthy();
    }
  });

  it('incluye indicador de conteo de aves', () => {
    const r = checklistBiodiversidad();
    const aves = r.find((i) => i.nombre?.toLowerCase().includes('ave'));
    expect(aves).toBeTruthy();
  });
});
