import { describe, it, expect } from 'vitest';
import { coerceNumericArgs } from '../sidecarClient';

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
