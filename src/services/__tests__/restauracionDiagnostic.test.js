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
