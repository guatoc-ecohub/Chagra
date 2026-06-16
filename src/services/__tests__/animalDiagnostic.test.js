import { describe, it, expect } from 'vitest';
import { detectarEspecie, recomendarForraje, recomendarAlimentosPecuarios, getGuardas, diagnosticarAnimal, formatearGroundingAnimal } from '../animalDiagnostic';

describe('detectarEspecie', () => {
  it('"tengo 5 vacas lecheras" → bovino leche', () => {
    const e = detectarEspecie('tengo 5 vacas lecheras');
    expect(e).not.toBeNull();
    expect(e.id).toBe('bovino');
    expect(e.funcion_detectada).toBe('leche');
  });
  it('"mis gallinas ponedoras" → avicola huevo', () => {
    expect(detectarEspecie('mis gallinas ponedoras').id).toBe('avicola');
  });
  it('"cabras y chivos" → caprino', () => {
    expect(detectarEspecie('tengo cabras y chivos').id).toBe('caprino');
  });
  it('"marrano" → porcino', () => {
    expect(detectarEspecie('los marranos').id).toBe('porcino');
  });
  it('"cerdos" → porcino', () => {
    expect(detectarEspecie('tengo cerdos en la finca').id).toBe('porcino');
  });
  it('"angelitas y colmenas" → apicola', () => {
    expect(detectarEspecie('tengo angelitas en el colmenar').id).toBe('apicola');
  });
  it('sin datos → null', () => {
    expect(detectarEspecie('hola buenos dias')).toBeNull();
  });
});

describe('getGuardas', () => {
  it('porcino → leucaena PROHIBIDA + estres termico', () => {
    const g = getGuardas('porcino');
    expect(g.some((g) => g.includes('PROHIBIDA') && g.includes('Leucaena'))).toBe(true);
    expect(g.some((g) => g.includes('estres_termico') || g.includes('calor'))).toBe(true);
    expect(g.some((g) => g.includes('veterinario') || g.includes('ICA'))).toBe(true);
  });
  it('avicola → leucaena PROHIBIDA + estres termico', () => {
    const g = getGuardas('avicola');
    expect(g.some((g) => g.includes('PROHIBIDA'))).toBe(true);
    expect(g.some((g) => g.includes('aves') || g.includes('calor'))).toBe(true);
  });
  it('equino → leucaena PROHIBIDA', () => {
    const g = getGuardas('equino');
    expect(g.some((g) => g.includes('PROHIBIDA') && g.includes('EQUINOS'))).toBe(true);
  });
  it('apicola → Apis vs meliponas', () => {
    expect(getGuardas('apicola').some((g) => g.includes('Apis') || g.includes('meliponas'))).toBe(true);
  });
  it('bovino (rumiante) → SIN guarda de leucaena PROHIBIDA', () => {
    const g = getGuardas('bovino');
    expect(g.some((g) => g.includes('PROHIBIDA'))).toBe(false);
  });
});

describe('recomendarForraje', () => {
  it('bovino → leucaena incluida (rumiante)', () => {
    const f = recomendarForraje('bovino');
    expect(f.some((f) => f.id === 'leucaena')).toBe(true);
  });
  it('porcino → leucaena EXCLUIDA (monogastrico, 0%)', () => {
    const f = recomendarForraje('porcino');
    expect(f.some((f) => f.id === 'leucaena')).toBe(false);
  });
  it('avicola → nacedero, boton de oro, morera (max pct >0)', () => {
    const f = recomendarForraje('avicola');
    expect(f.some((f) => f.id === 'nacedero')).toBe(true);
    expect(f.some((f) => f.id === 'morera')).toBe(true);
  });
});

describe('recomendarAlimentosPecuarios', () => {
  it('porcino → incluye alimentos locales curados', () => {
    const alimentos = recomendarAlimentosPecuarios('porcino');
    expect(alimentos.some((f) => f.id === 'yuca_cocida')).toBe(true);
    expect(alimentos.some((f) => f.id === 'suero_leche')).toBe(true);
  });
});

describe('diagnosticarAnimal', () => {
  it('sin datos → sin_datos true', () => {
    expect(diagnosticarAnimal('').sin_datos).toBe(true);
  });
  it('"tengo 5 vacas" → bovino con forrajes', () => {
    const d = diagnosticarAnimal('tengo 5 vacas lecheras');
    expect(d.sin_datos).toBe(false);
    expect(d.especie.id).toBe('bovino');
    expect(d.forrajes.length).toBeGreaterThan(0);
  });
  it('"cerdos y leucaena" → guarda de PROHIBIDA', () => {
    const d = diagnosticarAnimal('les doy leucaena a los cerdos');
    expect(d.guardas.some((g) => g.includes('PROHIBIDA'))).toBe(true);
    expect(d.alimentos.some((f) => f.id === 'yuca_cocida')).toBe(true);
  });
});

describe('formatearGroundingAnimal', () => {
  it('sin datos → vacio', () => {
    expect(formatearGroundingAnimal({ sin_datos: true })).toBe('');
  });
  it('bovino → incluye especie + forrajes + guardas', () => {
    const d = diagnosticarAnimal('tengo vacas lecheras');
    const f = formatearGroundingAnimal(d);
    expect(f).toContain('Bovino');
    expect(f).toContain('Forrajeras');
    expect(f).toContain('GUARDAS');
  });
});
