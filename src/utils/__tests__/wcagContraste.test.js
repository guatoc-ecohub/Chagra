import { describe, it, expect } from 'vitest';
import { luminanciaRelativa, ratioContraste, auditarContraste, PALETA_AA } from '../wcagContraste.js';

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

describe('WCAG Contraste — paleta REAL de Chagra (regresión)', () => {
  // Cableado (rescate #2668): wcagContraste.js no tenía NINGÚN consumidor en
  // la app — solo este test lo ejercitaba con colores de ejemplo. La app real
  // es mayormente oscura (bg-slate-950 / bg-slate-900 de Tailwind, ej.
  // ErrorFallback.jsx, PendingTasksWidget.jsx, TopBar.jsx) con texto
  // slate-200/300/400. Este bloque audita esas combinaciones REALES — si
  // alguien cambia un tono de texto sobre fondo oscuro y rompe AA, esta
  // prueba lo agarra ANTES de que llegue al campesino leyendo bajo el sol.
  const SLATE_950 = '#020617'; // bg-slate-950 — fondo principal (ErrorFallback, splash)
  const SLATE_900 = '#0f172a'; // bg-slate-900 — superficie de card

  it('texto slate-200 sobre fondo slate-950 cumple AA (texto normal)', () => {
    const r = auditarContraste(SLATE_950, PALETA_AA['slate-200'].hex);
    expect(r.pasa).toBe(true);
  });

  it('texto slate-300 sobre fondo slate-950 cumple AA (texto normal)', () => {
    const r = auditarContraste(SLATE_950, PALETA_AA['slate-300'].hex);
    expect(r.pasa).toBe(true);
  });

  it('texto slate-400 sobre fondo slate-950 cumple AA (texto normal)', () => {
    const r = auditarContraste(SLATE_950, PALETA_AA['slate-400'].hex);
    expect(r.pasa).toBe(true);
  });

  it('acento emerald-400 sobre card slate-900 cumple AA (texto normal)', () => {
    const r = auditarContraste(SLATE_900, PALETA_AA['emerald-400'].hex);
    expect(r.pasa).toBe(true);
  });

  it('slate-500 (placeholder) sobre slate-950 NO cumple AA para texto normal', () => {
    // Documentado en PALETA_AA como "NO usar en texto <18px" — si algún día
    // pasa a cumplir por un cambio de tono, no rompe nada; si empeora más
    // todavía, esta prueba no lo detectaría con más precisión de la ya
    // documentada. El valor de esta prueba es que el warning en el código
    // siga siendo cierto, no una nota obsoleta.
    const r = auditarContraste(SLATE_950, PALETA_AA['slate-500'].hex);
    expect(r.pasa).toBe(false);
    expect(r.ratio).toBeGreaterThan(3); // sí sirve para texto grande (>=18px)
  });
});
