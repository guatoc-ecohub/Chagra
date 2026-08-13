/**
 * husmeoCadencia — ítem #58 del GAP compAI (2026-08-13): reconcilia el SPEC
 * (46s) con el feedback en vivo del operador (13s) en una sola curva.
 */
import { describe, it, expect } from 'vitest';
import {
  husmeoCadenciaMs,
  vueltasCompletas,
  HUSMEO_CADA_MS_VIVO,
  HUSMEO_CADA_MS_SPEC,
  HUSMEO_VUELTAS_HASTA_SPEC,
} from '../husmeoCadencia.js';

describe('husmeoCadenciaMs', () => {
  it('en la primera vuelta (0) arranca en el ritmo VIVO (13s, feedback operador)', () => {
    expect(husmeoCadenciaMs(0)).toBe(HUSMEO_CADA_MS_VIVO);
  });

  it('tras HUSMEO_VUELTAS_HASTA_SPEC vueltas, se asienta en el ritmo del SPEC (46s)', () => {
    expect(husmeoCadenciaMs(HUSMEO_VUELTAS_HASTA_SPEC)).toBe(HUSMEO_CADA_MS_SPEC);
  });

  it('más vueltas que el tope no lo pasa de largo (nunca más lento que el SPEC)', () => {
    expect(husmeoCadenciaMs(HUSMEO_VUELTAS_HASTA_SPEC + 50)).toBe(HUSMEO_CADA_MS_SPEC);
  });

  it('sube MONÓTONO entre VIVO y SPEC a medida que pasan vueltas', () => {
    let anterior = husmeoCadenciaMs(0);
    for (let v = 1; v <= HUSMEO_VUELTAS_HASTA_SPEC; v += 1) {
      const actual = husmeoCadenciaMs(v);
      expect(actual).toBeGreaterThanOrEqual(anterior);
      anterior = actual;
    }
  });

  it('nunca sale del rango [VIVO, SPEC]', () => {
    for (let v = 0; v <= 10; v += 1) {
      const c = husmeoCadenciaMs(v);
      expect(c).toBeGreaterThanOrEqual(HUSMEO_CADA_MS_VIVO);
      expect(c).toBeLessThanOrEqual(HUSMEO_CADA_MS_SPEC);
    }
  });

  it('entradas no finitas o negativas se tratan como arranque (0)', () => {
    expect(husmeoCadenciaMs(NaN)).toBe(HUSMEO_CADA_MS_VIVO);
    expect(husmeoCadenciaMs(-3)).toBe(HUSMEO_CADA_MS_VIVO);
    expect(husmeoCadenciaMs(undefined)).toBe(HUSMEO_CADA_MS_VIVO);
  });
});

describe('vueltasCompletas', () => {
  it('menos husmeos que lugares: cero vueltas completas', () => {
    expect(vueltasCompletas(0, 6)).toBe(0);
    expect(vueltasCompletas(5, 6)).toBe(0);
  });

  it('exactamente un ciclo: una vuelta completa', () => {
    expect(vueltasCompletas(6, 6)).toBe(1);
  });

  it('varios ciclos y resto: cuenta solo las COMPLETAS', () => {
    expect(vueltasCompletas(13, 6)).toBe(2);
  });

  it('totalLugares inválido no lanza (cae a 1)', () => {
    expect(() => vueltasCompletas(5, 0)).not.toThrow();
    expect(vueltasCompletas(5, 0)).toBe(5);
  });
});

describe('reconciliación end-to-end: idx de husmeo → cadencia efectiva', () => {
  it('el primer husmeo de la sesión usa el ritmo vivo', () => {
    expect(husmeoCadenciaMs(vueltasCompletas(0, 6))).toBe(HUSMEO_CADA_MS_VIVO);
  });

  it('tras 3 vueltas completas por los 6 lugares (18 husmeos) ya suena al ritmo del SPEC', () => {
    expect(husmeoCadenciaMs(vueltasCompletas(18, 6))).toBe(HUSMEO_CADA_MS_SPEC);
  });
});
