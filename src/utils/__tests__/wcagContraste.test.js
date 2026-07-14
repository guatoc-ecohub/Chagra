import { describe, it, expect } from 'vitest';
import { luminanciaRelativa, ratioContraste, auditarContraste } from '../utils/wcagContraste.js';

describe('WCAG Contraste', () => {
  it('calcula luminancia relativa del negro', () => {
    expect(luminanciaRelativa('#000000')).toBeCloseTo(0, 5);
  });

  it('calcula luminancia relativa del blanco', () => {
    expect(luminanciaRelativa('#ffffff')).toBeCloseTo(1, 5);
  });

  it('ratio blanco sobre negro es 21:1', () => {
    const ratio = ratioContraste('#000000', '#ffffff');
    expect(ratio).toBeCloseTo(21, 0);
  });

  it('ratio slate-200 sobre slate-950 cumple AA', () => {
    const result = auditarContraste('#020617', '#e2e8f0');
    expect(result.pasa).toBe(true);
    expect(result.ratio).toBeGreaterThan(10);
  });

  it('ratio gris claro sobre blanco NO cumple AA', () => {
    const result = auditarContraste('#ffffff', '#94a3b8');
    expect(result.pasa).toBe(false);
    expect(result.sugerencia).toBeTruthy();
  });
});
