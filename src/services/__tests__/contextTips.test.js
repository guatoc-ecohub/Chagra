// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * contextTips — registro local de tips contextuales ya vistos.
 *
 * Contrato:
 *   - hasSeenTip(id) → false si nunca se marcó.
 *   - markTipSeen(id) → persiste en localStorage; hasSeenTip(id) → true.
 *   - resetSeenTips() → limpia todos los flags.
 *   - Storage corrupto NO lanza (degrada a "no visto").
 *   - 100% offline (localStorage, cero red).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasSeenTip,
  markTipSeen,
  resetSeenTips,
  TIPS_STORAGE_KEY,
} from '../contextTips';

beforeEach(() => {
  window.localStorage.clear();
});

describe('contextTips', () => {
  it('hasSeenTip devuelve false para un tip nunca visto', () => {
    expect(hasSeenTip('voz-hablar-natural')).toBe(false);
  });

  it('markTipSeen persiste y hasSeenTip devuelve true', () => {
    markTipSeen('voz-hablar-natural');
    expect(hasSeenTip('voz-hablar-natural')).toBe(true);
    // Persistencia real en localStorage (sobrevive un remount).
    const raw = window.localStorage.getItem(TIPS_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw)['voz-hablar-natural']).toBeTruthy();
  });

  it('tips distintos son independientes', () => {
    markTipSeen('foto-diagnostico');
    expect(hasSeenTip('foto-diagnostico')).toBe(true);
    expect(hasSeenTip('voz-hablar-natural')).toBe(false);
  });

  it('resetSeenTips limpia todos los flags', () => {
    markTipSeen('a');
    markTipSeen('b');
    resetSeenTips();
    expect(hasSeenTip('a')).toBe(false);
    expect(hasSeenTip('b')).toBe(false);
  });

  it('storage corrupto no lanza y degrada a no-visto', () => {
    window.localStorage.setItem(TIPS_STORAGE_KEY, '{corrupto!!');
    expect(() => hasSeenTip('x')).not.toThrow();
    expect(hasSeenTip('x')).toBe(false);
    // markTipSeen sobre storage corrupto tampoco lanza y recupera.
    expect(() => markTipSeen('x')).not.toThrow();
    expect(hasSeenTip('x')).toBe(true);
  });

  it('id vacío o nulo degrada sin lanzar', () => {
    expect(hasSeenTip('')).toBe(false);
    expect(hasSeenTip(null)).toBe(false);
    expect(() => markTipSeen(null)).not.toThrow();
  });
});
