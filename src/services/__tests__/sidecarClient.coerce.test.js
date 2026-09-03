import { describe, it, expect } from 'vitest';
import { coerceNumericArgs, normalizePisoTermicoArg } from '../sidecarClient';

// Fix P0 (test integral Daniel 2026-06-13): el sidecar (Zod) espera number en
// altitud_msnm; el chat LLM lo pasaba como string → 502 → Daniel sin respuesta.
describe('coerceNumericArgs', () => {
  it('coerce altitud_msnm string a number', () => {
    expect(coerceNumericArgs({ objetivo: 'ribera', altitud_msnm: '2600' }))
      .toEqual({ objetivo: 'ribera', altitud_msnm: 2600 });
  });

  it('deja un number intacto (misma referencia, sin cambios)', () => {
    const a = { altitud_msnm: 2600 };
    expect(coerceNumericArgs(a)).toBe(a);
  });

  it('elimina string no numérico (no manda basura al sidecar)', () => {
    expect(coerceNumericArgs({ altitud_msnm: 'alto' })).toEqual({});
  });

  it('coerce también altitud y altura', () => {
    expect(coerceNumericArgs({ altitud: '1800', altura: '50' }))
      .toEqual({ altitud: 1800, altura: 50 });
  });

  it('args no-objeto pasa intacto', () => {
    expect(coerceNumericArgs(null)).toBe(null);
    expect(coerceNumericArgs(undefined)).toBe(undefined);
  });

  it('no toca otros campos', () => {
    expect(coerceNumericArgs({ objetivo: 'ribera', altitud_msnm: '2600', invasora_mencionada: 'retamo' }))
      .toEqual({ objetivo: 'ribera', altitud_msnm: 2600, invasora_mencionada: 'retamo' });
  });
});

// BUG-03 (2026-09-03): mismo patron, mismo chokepoint, mismo sintoma que el
// fix P0 de arriba (2026-06-13) pero para el enum `piso_termico`. El sidecar
// (Zod, `get_calendario_siembra`) exige el vocabulario SIN tildes ('frio'/
// 'templado'/'calido'); `pisoTermicoFromAltitud()` (agentService.js) devuelve
// 'frío'/'cálido'/'páramo' CON tildes para lectura humana, y el NLU planner
// (LLM server-side) tiende a lo mismo. Repro real: "...a 2200 msnm" ->
// piso 'frío' -> 502 mcp_call_failed / invalid_enum_value (confirmado en
// vivo contra el sidecar real, 127.0.0.1:7880, 2026-09-03). Con 'frio' (sin
// tilde) el mismo endpoint responde 200 con datos reales.
describe('normalizePisoTermicoArg', () => {
  it("quita la tilde de 'frío' -> 'frio' (repro BUG-03 exacto: piso derivado de 2200 msnm)", () => {
    expect(normalizePisoTermicoArg({ piso_termico: 'frío' })).toEqual({ piso_termico: 'frio' });
  });

  it("normaliza 'cálido' y 'páramo' también", () => {
    expect(normalizePisoTermicoArg({ piso_termico: 'cálido' })).toEqual({ piso_termico: 'calido' });
    expect(normalizePisoTermicoArg({ piso_termico: 'páramo' })).toEqual({ piso_termico: 'paramo' });
  });

  it('normaliza mayúsculas y espacios sueltos', () => {
    expect(normalizePisoTermicoArg({ piso_termico: '  FRÍO  ' })).toEqual({ piso_termico: 'frio' });
  });

  it("deja 'templado' (ya sin tilde) intacto — misma referencia, sin cambios", () => {
    const a = { piso_termico: 'templado', mes: 8 };
    expect(normalizePisoTermicoArg(a)).toBe(a);
  });

  it('NO inventa un valor válido para un piso genuinamente incorrecto (solo quita tildes)', () => {
    // 'montaña' no es un piso_termico real del vocabulario Chagra — el
    // normalizador solo ataca el mismatch de tildes, no valida el enum
    // (esa es responsabilidad del sidecar). El sidecar lo seguirá
    // rechazando, como corresponde.
    expect(normalizePisoTermicoArg({ piso_termico: 'montaña' })).toEqual({ piso_termico: 'montana' });
  });

  it('no toca args sin piso_termico ni args no-objeto', () => {
    const a = { altitud_msnm: 2200 };
    expect(normalizePisoTermicoArg(a)).toBe(a);
    expect(normalizePisoTermicoArg(null)).toBe(null);
    expect(normalizePisoTermicoArg(undefined)).toBe(undefined);
  });
});
