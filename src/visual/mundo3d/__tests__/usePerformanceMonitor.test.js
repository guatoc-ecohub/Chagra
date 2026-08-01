/*
 * usePerformanceMonitor — tests de las derivaciones puras y del store.
 * Sin canvas, sin GPU: el monitor drei real solo corre dentro de un Canvas;
 * aquí se ejercita la política (niveles, DPR, escala, siembra, fallback).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  TECHO_DPR,
  presupuestoDeTier,
  detectarTierInicial,
  factorInicialPorTier,
  nivelPorFactor,
  dprPorFactor,
  escalaParticulasPorFactor,
  leerCalidad,
  leerFps,
  sembrarCalidad,
  reiniciarCalidad,
  __internos,
} from '../usePerformanceMonitor.jsx';

describe('derivaciones puras', () => {
  it('factorInicialPorTier: alto pleno, medio a media marcha, bajo minimo', () => {
    expect(factorInicialPorTier('alto')).toBe(1);
    expect(factorInicialPorTier('medio')).toBe(0.6);
    expect(factorInicialPorTier('bajo')).toBe(0.2);
  });

  it('nivelPorFactor: umbrales 0.7 y 0.35', () => {
    expect(nivelPorFactor(1)).toBe('alto');
    expect(nivelPorFactor(0.7)).toBe('alto');
    expect(nivelPorFactor(0.69)).toBe('medio');
    expect(nivelPorFactor(0.35)).toBe('medio');
    expect(nivelPorFactor(0.34)).toBe('bajo');
    expect(nivelPorFactor(0)).toBe('bajo');
  });

  it('dprPorFactor: cuantizado a 0.25, acotado a [1, techo]', () => {
    expect(dprPorFactor(1, 1.5)).toBe(1.5);
    expect(dprPorFactor(0, 1.5)).toBe(1);
    expect(dprPorFactor(0.5, 1.5)).toBe(1.25);
    expect(dprPorFactor(0.6, 1.25)).toBe(1.25);
    expect(dprPorFactor(2, 1.5)).toBe(1.5); // clamp de factor fuera de rango
    expect(dprPorFactor(-1, 1.5)).toBe(1);
    // nunca por encima del techo del DR (1.5)
    expect(dprPorFactor(1, TECHO_DPR.alto)).toBeLessThanOrEqual(1.5);
  });

  it('escalaParticulasPorFactor: lineal 0.4..1, nunca vacia la escena', () => {
    expect(escalaParticulasPorFactor(1)).toBe(1);
    expect(escalaParticulasPorFactor(0)).toBe(0.4);
    expect(escalaParticulasPorFactor(0.5)).toBe(0.7);
  });

  it('presupuestoDeTier: alto pleno, medio frugal, bajo minimo', () => {
    expect(presupuestoDeTier('alto')).toEqual({
      maxCriaturasAmbientales: 5,
      maxFlora: 100,
      bloom: true,
      sombras: true,
      dpr: 1.5,
      postfx: true,
    });
    expect(presupuestoDeTier('medio')).toEqual({
      maxCriaturasAmbientales: 3,
      maxFlora: 56,
      bloom: false,
      sombras: false,
      dpr: 1.25,
      postfx: false,
    });
    expect(presupuestoDeTier('bajo')).toEqual({
      maxCriaturasAmbientales: 1,
      maxFlora: 24,
      bloom: false,
      sombras: false,
      dpr: 1,
      postfx: false,
    });
  });

  it('detectarTierInicial baja el techo con UA viejo o valle3d apagado', () => {
    expect(detectarTierInicial({ tier: 'alto', ua: 'Mozilla/5.0 (Linux; Android 7.0; Pixel)' })).toBe('bajo');
    expect(detectarTierInicial({ tier: 'alto', valle3d: false })).toBe('bajo');
  });
});

describe('store de calidad', () => {
  beforeEach(() => {
    reiniciarCalidad('medio');
  });

  it('arranca sembrado por tier con derivados coherentes', () => {
    sembrarCalidad('alto');
    const c = leerCalidad();
    expect(c.tier).toBe('alto');
    expect(c.factor).toBe(1);
    expect(c.nivel).toBe('alto');
    expect(c.dpr).toBe(TECHO_DPR.alto);
    expect(c.fallback).toBe(false);
  });

  it('sembrar el mismo tier es idempotente: conserva lo aprendido', () => {
    sembrarCalidad('alto');
    __internos.acusarCambio({ factor: 0.5, fps: 38 });
    const aprendido = leerCalidad();
    sembrarCalidad('alto'); // remonte de escena, mismo equipo
    expect(leerCalidad()).toBe(aprendido);
    expect(leerFps()).toBe(38);
  });

  it('el DPR en vivo respeta el techo del tier', () => {
    sembrarCalidad('medio');
    __internos.acusarCambio({ factor: 1, fps: 60 });
    expect(leerCalidad().dpr).toBeLessThanOrEqual(TECHO_DPR.medio);
  });

  it('fallback clava la calidad: acepta bajadas, ignora subidas', () => {
    sembrarCalidad('alto');
    __internos.acusarFallback({ factor: 0.4, fps: 30 });
    expect(leerCalidad().fallback).toBe(true);
    expect(leerCalidad().factor).toBe(0.4);

    __internos.acusarCambio({ factor: 0.9, fps: 60 }); // intento de subir
    expect(leerCalidad().factor).toBe(0.4);

    __internos.acusarCambio({ factor: 0.2, fps: 25 }); // bajar si se puede
    expect(leerCalidad().factor).toBe(0.2);
    expect(leerCalidad().nivel).toBe('bajo');
  });

  it('baja el tier cuando el FPS se mantiene por debajo de 30', () => {
    sembrarCalidad('alto');
    for (let i = 0; i < 4; i += 1) {
      __internos.acusarCambio({ factor: 0.95, fps: 28 });
    }
    const c = leerCalidad();
    expect(c.tier).toBe('medio');
    expect(c.presupuesto).toEqual(presupuestoDeTier('medio'));
    expect(c.dpr).toBeLessThanOrEqual(TECHO_DPR.medio);
  });

  it('sube el tier con histeresis cuando el FPS se mantiene alto', () => {
    sembrarCalidad('alto');
    for (let i = 0; i < 4; i += 1) {
      __internos.acusarCambio({ factor: 0.95, fps: 28 });
    }
    for (let i = 0; i < 5; i += 1) {
      __internos.acusarCambio({ factor: 0.95, fps: 60 });
    }
    expect(leerCalidad().tier).toBe('alto');
    expect(leerCalidad().presupuesto).toEqual(presupuestoDeTier('alto'));
  });

  it('reiniciarCalidad limpia fallback y fps', () => {
    __internos.acusarFallback({ factor: 0.1, fps: 20 });
    reiniciarCalidad('medio');
    const c = leerCalidad();
    expect(c.fallback).toBe(false);
    expect(c.factor).toBe(0.6);
    expect(leerFps()).toBe(0);
  });
});
