import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CHAGRA_TIPS, useRotatingTip, __test } from '../tipsService.js';

/**
 * Tests de tipsService: invariantes de la data curada (incluye guard
 * anti-voseo, alineado con la política de dialecto colombiano) y el
 * comportamiento del hook useRotatingTip con timers falsos.
 */

describe('CHAGRA_TIPS — invariantes de data', () => {
  it('tiene tips y todos traen id, icon y text no vacíos', () => {
    expect(CHAGRA_TIPS.length).toBeGreaterThan(0);
    for (const tip of CHAGRA_TIPS) {
      expect(typeof tip.id).toBe('string');
      expect(tip.id.length).toBeGreaterThan(0);
      expect(typeof tip.icon).toBe('string');
      expect(tip.icon.length).toBeGreaterThan(0);
      expect(typeof tip.text).toBe('string');
      expect(tip.text.length).toBeGreaterThan(0);
    }
  });

  it('los ids son únicos', () => {
    const ids = CHAGRA_TIPS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('mantiene los tips cortos para móvil (≤ 120 chars)', () => {
    for (const tip of CHAGRA_TIPS) {
      expect(tip.text.length, `tip ${tip.id}`).toBeLessThanOrEqual(120);
    }
  });

  it('NO contiene voseo argentino (política de dialecto colombiano)', () => {
    const voseo = /\b(vos|tenés|querés|podés|sabés|hacés|mandá|fijate|dale|acá|elegí)\b/i;
    for (const tip of CHAGRA_TIPS) {
      expect(voseo.test(tip.text), `tip ${tip.id} tiene voseo: "${tip.text}"`).toBe(false);
    }
  });
});

describe('useRotatingTip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // fija el tip inicial para que el test sea determinista
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('devuelve null cuando active=false', () => {
    const { result } = renderHook(() => useRotatingTip(false));
    expect(result.current.tip).toBeNull();
    expect(typeof result.current.dismiss).toBe('function');
  });

  it('devuelve un tip válido cuando active=true', () => {
    const { result } = renderHook(() => useRotatingTip(true));
    expect(result.current.tip).toEqual(CHAGRA_TIPS[0]);
  });

  it('rota al siguiente tip tras el intervalo', () => {
    const { result } = renderHook(() => useRotatingTip(true));
    expect(result.current.tip).toEqual(CHAGRA_TIPS[0]);
    act(() => { vi.advanceTimersByTime(__test.ROTATION_INTERVAL_MS); });
    expect(result.current.tip).toEqual(CHAGRA_TIPS[1 % CHAGRA_TIPS.length]);
  });

  it('dismiss() oculta el tip', () => {
    const { result } = renderHook(() => useRotatingTip(true));
    act(() => { result.current.dismiss(); });
    expect(result.current.tip).toBeNull();
  });

  it('reabre tips en una nueva sesión thinking tras un dismiss', () => {
    const { result, rerender } = renderHook(({ active }) => useRotatingTip(active), {
      initialProps: { active: true },
    });
    act(() => { result.current.dismiss(); });
    expect(result.current.tip).toBeNull();
    // active baja a false (terminó de pensar) → resetea dismissed
    rerender({ active: false });
    // active vuelve a true (nueva pregunta) → tips de nuevo visibles
    rerender({ active: true });
    expect(result.current.tip).not.toBeNull();
  });
});
