/**
 * lipSyncCore.test.js — lógica pura del lip-sync 2D por RMS
 * (ficha DR animación rubber-hose §2). Sin navegador.
 */
import { describe, it, expect } from 'vitest';
import {
  VISEMA,
  UMBRAL_RMS,
  visemaDesdeRMS,
  rmsDeMuestras,
  crearDebounceVisema,
  visemaFallback,
} from '../lipSyncCore.js';

describe('visemaDesdeRMS — umbrales del spec (5% / 30% / 70%)', () => {
  it('silencio y por debajo de 5% → boca cerrada (V1)', () => {
    expect(visemaDesdeRMS(0)).toBe(VISEMA.CERRADA);
    expect(visemaDesdeRMS(0.049)).toBe(VISEMA.CERRADA);
  });
  it('5%–30% → entreabierta (V2)', () => {
    expect(visemaDesdeRMS(UMBRAL_RMS.ENTREABIERTA)).toBe(VISEMA.ENTREABIERTA);
    expect(visemaDesdeRMS(0.2)).toBe(VISEMA.ENTREABIERTA);
    expect(visemaDesdeRMS(0.299)).toBe(VISEMA.ENTREABIERTA);
  });
  it('31%–70% → fruncida (V4)', () => {
    expect(visemaDesdeRMS(UMBRAL_RMS.FRUNCIDA)).toBe(VISEMA.FRUNCIDA);
    expect(visemaDesdeRMS(0.5)).toBe(VISEMA.FRUNCIDA);
    expect(visemaDesdeRMS(0.699)).toBe(VISEMA.FRUNCIDA);
  });
  it('>70% (picos) → abierta amplia (V3)', () => {
    expect(visemaDesdeRMS(UMBRAL_RMS.ABIERTA)).toBe(VISEMA.ABIERTA);
    expect(visemaDesdeRMS(0.95)).toBe(VISEMA.ABIERTA);
  });
  it('valores no finitos o negativos → cerrada (defensivo)', () => {
    expect(visemaDesdeRMS(NaN)).toBe(VISEMA.CERRADA);
    expect(visemaDesdeRMS(-1)).toBe(VISEMA.CERRADA);
    expect(visemaDesdeRMS(undefined)).toBe(VISEMA.CERRADA);
  });
});

describe('rmsDeMuestras', () => {
  it('bytes en silencio (centrados en 128) → RMS 0', () => {
    expect(rmsDeMuestras(new Uint8Array([128, 128, 128, 128]))).toBe(0);
  });
  it('bytes con desviación → RMS conocido (byte normaliza en /128)', () => {
    // 128±64 → cada muestra vale 0.5 → RMS = 0.5
    const r = rmsDeMuestras(new Uint8Array([192, 64, 192, 64]));
    expect(r).toBeCloseTo(0.5, 6);
  });
  it('Float32Array ya en [-1,1]', () => {
    expect(rmsDeMuestras(new Float32Array([1, -1, 1, -1]))).toBeCloseTo(1, 6);
    expect(rmsDeMuestras(new Float32Array([0, 0]))).toBe(0);
  });
  it('sin muestras → 0', () => {
    expect(rmsDeMuestras(new Uint8Array([]))).toBe(0);
    expect(rmsDeMuestras(null)).toBe(0);
  });
});

describe('crearDebounceVisema — anti jaw-chomping', () => {
  it('un candidato nuevo solo gana tras sostenerse `ms`', () => {
    const d = crearDebounceVisema({ ms: 50, inicial: VISEMA.CERRADA });
    expect(d(VISEMA.CERRADA, 0)).toBe(VISEMA.CERRADA);
    expect(d(VISEMA.ABIERTA, 10)).toBe(VISEMA.CERRADA);  // candidato arranca
    expect(d(VISEMA.ABIERTA, 40)).toBe(VISEMA.CERRADA);  // 30ms < 50
    expect(d(VISEMA.ABIERTA, 60)).toBe(VISEMA.ABIERTA);  // 50ms sostenido → cambia
  });
  it('volver al estable cancela una transición en curso (temblor de umbral)', () => {
    const d = crearDebounceVisema({ ms: 50, inicial: VISEMA.CERRADA });
    d(VISEMA.CERRADA, 0);
    d(VISEMA.ENTREABIERTA, 10);              // candidato
    expect(d(VISEMA.CERRADA, 20)).toBe(VISEMA.CERRADA); // vuelve → reset
    d(VISEMA.ENTREABIERTA, 30);              // candidato de nuevo (desde 30)
    expect(d(VISEMA.ENTREABIERTA, 70)).toBe(VISEMA.CERRADA); // 40ms < 50
    expect(d(VISEMA.ENTREABIERTA, 85)).toBe(VISEMA.ENTREABIERTA); // 55ms → cambia
  });
});

describe('visemaFallback — boca de relleno determinista', () => {
  it('siempre devuelve un visema válido', () => {
    const validos = new Set(Object.values(VISEMA));
    for (let t = 0; t < 2000; t += 17) {
      expect(validos.has(visemaFallback(t))).toBe(true);
    }
  });
  it('es determinista (mismo t, mismo visema) y no constante', () => {
    expect(visemaFallback(123)).toBe(visemaFallback(123));
    const muestras = new Set();
    for (let t = 0; t < 1000; t += 5) muestras.add(visemaFallback(t));
    expect(muestras.size).toBeGreaterThan(1); // la boca se mueve
  });
  it('entrada no finita → no explota (t=0)', () => {
    expect(Object.values(VISEMA)).toContain(visemaFallback(NaN));
  });
});
