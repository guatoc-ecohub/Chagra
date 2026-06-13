import { describe, it, expect } from 'vitest';
import { diagnosticarRestauracion, formatearGroundingRestauracion } from '../restauracionDiagnostic';

describe('diagnosticarRestauracion', () => {
  it('"recuperar el monte" → nucleacion + pioneras', () => {
    const d = diagnosticarRestauracion('quiero recuperar el monte');
    expect(d.arreglo.id).toBe('nucleacion');
  });
  it('"proteger el nacimiento" → corredor ripario', () => {
    const d = diagnosticarRestauracion('necesito proteger el nacimiento de agua');
    expect(d.arreglo.id).toBe('corredor_ripario');
  });
  it('"paramo se esta secando" → alerta Ley 1930 + pasiva', () => {
    const d = diagnosticarRestauracion('el paramo se esta secando');
    expect(d.alertas.some((a) => a.includes('1930') || a.includes('pasiva'))).toBe(true);
  });
  it('"tengo retamo invadiendo" → alerta NO quemar', () => {
    const d = diagnosticarRestauracion('tengo retamo invadiendo el lote');
    expect(d.alertas.some((a) => a.includes('NO') && a.includes('quem'))).toBe(true);
  });
  it('"me quieren pagar por sembrar" → alerta bonos carbono', () => {
    const d = diagnosticarRestauracion('me quieren pagar por sembrar arboles');
    expect(d.alertas.some((a) => a.includes('BONOS') || a.includes('carbono'))).toBe(true);
  });
  it('mencionar pino → guarda anti-exoticas', () => {
    const d = diagnosticarRestauracion('voy a sembrar pino para restaurar');
    expect(d.alertas.some((a) => a.includes('Pino') || a.includes('NO son restauracion'))).toBe(true);
  });
  it('sin datos → sin_datos true', () => {
    expect(diagnosticarRestauracion('').sin_datos).toBe(true);
  });
  it('siempre incluye guarda de pino/eucalipto y densidad', () => {
    const d = diagnosticarRestauracion('recuperar el monte');
    expect(d.guardas.some((g) => g.includes('Pino'))).toBe(true);
    expect(d.guardas.some((g) => g.includes('densidad'))).toBe(true);
  });
});

describe('formatearGroundingRestauracion', () => {
  it('sin datos → vacio', () => {
    expect(formatearGroundingRestauracion({ sin_datos: true })).toBe('');
  });
  it('incluye arreglo + sucesion + guardas', () => {
    const d = diagnosticarRestauracion('recuperar el monte en tierra fria');
    const f = formatearGroundingRestauracion(d);
    expect(f).toContain('Nucleacion');
    expect(f).toContain('Sucesion');
    expect(f).toContain('GUARDAS');
  });
});

describe('especies nativas reales (anti-fabricacion — escenario Daniel)', () => {
  it('la altitud del perfil deriva el piso y trae especies del catalogo', () => {
    const d = diagnosticarRestauracion('quiero proteger el nacimiento de agua', { altitud: 2600 });
    expect(d.especies).toBeTruthy();
    expect(d.especies.pioneras.length).toBeGreaterThan(0);
  });
  it('Daniel (nacimiento, 2600m frio) → grounding con especies reales con nombre cientifico + NO inventes', () => {
    const d = diagnosticarRestauracion('arboles nativos en el nacimiento de agua', { altitud: 2600 });
    const f = formatearGroundingRestauracion(d);
    expect(f).toContain('Alnus acuminata'); // Aliso — piso frio, cientifico real del catalogo
    expect(f).toMatch(/NO inventes/i);
  });
  it('la altitud mapea al piso correcto (calido vs paramo)', () => {
    expect(formatearGroundingRestauracion(diagnosticarRestauracion('recuperar el bosque', { altitud: 400 }))).toContain('Ochroma pyramidale'); // Balso, calido
    expect(formatearGroundingRestauracion(diagnosticarRestauracion('recuperar el bosque', { altitud: 3200 }))).toContain('Espeletia'); // Frailejon, paramo
  });
  it('sin altitud ni piso en el texto → especies null (NO inventa), pero la guarda anti-fabricacion sigue', () => {
    const d = diagnosticarRestauracion('quiero proteger el nacimiento de agua');
    expect(d.especies).toBeNull();
    expect(formatearGroundingRestauracion(d)).toMatch(/NUNCA inventes/i);
  });
});
