import { describe, it, expect } from 'vitest';
import { modularPorENSO } from '../ensoModulador.js';

describe('modularPorENSO', () => {
  it('modula con fase El Nino', () => {
    const r = modularPorENSO('el_nino', 'Sembrar en epoca seca');
    expect(r).toContain('Contexto ENSO el_nino');
    expect(r).toContain('seco');
  });

  it('modula con fase La Nina', () => {
    const r = modularPorENSO('la_nina', 'Sembrar en epoca humeda');
    expect(r).toContain('Contexto ENSO la_nina');
    expect(r).toContain('humedo');
  });

  it('modula con fase neutro', () => {
    const r = modularPorENSO('neutro', 'Sembrar normal');
    expect(r).toContain('Contexto ENSO neutro');
  });

  it('retorna base sin modificar si fase no existe', () => {
    const r = modularPorENSO('inexistente', 'Recomendacion');
    expect(r).toBe('Recomendacion');
  });

  it('retorna base sin modificar si fase es null', () => {
    expect(modularPorENSO(null, 'Recomendacion')).toBe('Recomendacion');
  });
});
