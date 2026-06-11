/**
 * skyEphemeris.moonPath.test.js — geometría SVG de la fase lunar REAL
 * (artefacto sol/luna del agente). La luna del artefacto era una creciente
 * FIJA independiente de la fase real; moonPathD la hace astronómica.
 */

import { describe, it, expect } from 'vitest';
import { moonPathD, lunarPhase } from '../skyEphemeris.js';

describe('moonPathD — fase lunar real en SVG', () => {
  it('luna nueva (f≈0) → kind new, sin path', () => {
    expect(moonPathD(0).kind).toBe('new');
    expect(moonPathD(0.99).kind).toBe('new');
  });

  it('luna llena (f=0.5) → kind full', () => {
    expect(moonPathD(0.5).kind).toBe('full');
  });

  it('cuarto creciente (f=0.25) → mitad derecha (terminador recto, rx≈0)', () => {
    const { kind, d } = moonPathD(0.25, 32, 32, 13);
    expect(kind).toBe('partial');
    // arco exterior con sweep 1 (limbo derecho) y terminador degenerado rx≈0
    expect(d).toContain('A 13 13 0 1 1 32 45');
    expect(d).toMatch(/A 0\.00 13/);
  });

  it('cuarto menguante (f=0.75) → mitad izquierda (sweep exterior 0)', () => {
    const { d } = moonPathD(0.75, 32, 32, 13);
    expect(d).toContain('A 13 13 0 1 0 32 45');
  });

  it('creciente vs gibosa flipean el sweep del terminador', () => {
    const crescent = moonPathD(0.1, 32, 32, 13); // iluminación < 50%
    const gibbousWax = moonPathD(0.4, 32, 32, 13); // iluminación > 50%
    const rxCres = crescent.d.match(/A (\d+\.\d+) 13 0 1 (\d)/);
    const rxGib = gibbousWax.d.match(/A (\d+\.\d+) 13 0 1 (\d)/);
    expect(rxCres[2]).not.toBe(rxGib[2]);
  });

  it('fraction fuera de [0,1) se normaliza sin throw', () => {
    expect(moonPathD(1.25).kind).toBe(moonPathD(0.25).kind);
    expect(moonPathD(-0.75).kind).toBe(moonPathD(0.25).kind);
  });

  it('integra con lunarPhase: la fraction real produce path válido', () => {
    const { fraction } = lunarPhase(new Date('2026-06-11T00:00:00Z'));
    const out = moonPathD(fraction);
    expect(['new', 'full', 'partial']).toContain(out.kind);
    if (out.kind === 'partial') expect(out.d).toMatch(/^M 32 19 A 13 13/);
  });
});
