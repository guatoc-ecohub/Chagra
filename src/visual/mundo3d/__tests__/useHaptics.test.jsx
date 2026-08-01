// @ts-nocheck
/*
 * useHaptics — pruebas del contrato DR-3D-HAPTICA (§9):
 * patrones exactos del catálogo, gate triple (soporte + pref + reduced-motion),
 * throttle de 120 ms, y no-op sin throw cuando no hay Vibration API.
 */
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePrefsStore from '../../../store/usePrefsStore.js';

// La detección de soporte se captura al CARGAR el módulo: instalamos el mock
// de navigator.vibrate ANTES del import dinámico del hook.
const vibrate = vi.fn(() => true);
Object.defineProperty(navigator, 'vibrate', {
  value: vibrate, configurable: true, writable: true,
});
const { default: useHaptics, PATRONES_HAPTICOS } = await import('../useHaptics.js');

beforeEach(() => {
  vibrate.mockClear();
  act(() => { usePrefsStore.setState({ haptics: 'auto' }); });
});

describe('useHaptics — catálogo y disparo', () => {
  it('cada método dispara su patrón exacto (cancel-then-fire)', () => {
    const { result } = renderHook(() => useHaptics({ reducedMotion: false }));
    expect(result.current.supported).toBe(true);
    expect(result.current.enabled).toBe(true);

    const casos = [
      ['tap', PATRONES_HAPTICOS.tap],
      ['abeja', PATRONES_HAPTICOS.abeja],
      ['viajeEntrar', PATRONES_HAPTICOS.viajeEntrar],
      ['viajeVolver', PATRONES_HAPTICOS.viajeVolver],
      ['descubrimiento', PATRONES_HAPTICOS.descubrimiento],
      ['error', PATRONES_HAPTICOS.error],
    ];
    for (const [metodo, patron] of casos) {
      vibrate.mockClear();
      /** @type {any} */ (result.current)[metodo]();
      // cancel-then-fire: primero vibrate(0), luego el patrón del catálogo.
      expect(vibrate).toHaveBeenNthCalledWith(1, 0);
      expect(vibrate).toHaveBeenNthCalledWith(2, /** @type {any} */ (patron));
    }
  });

  it('fire() acepta clave del catálogo o patrón crudo; stop() cancela', () => {
    const { result } = renderHook(() => useHaptics({ reducedMotion: false }));
    result.current.fire('tap');
    expect(vibrate).toHaveBeenLastCalledWith(PATRONES_HAPTICOS.tap);
    result.current.fire([12, 40, 12]);
    expect(vibrate).toHaveBeenLastCalledWith([12, 40, 12]);
    vibrate.mockClear();
    result.current.stop();
    expect(vibrate).toHaveBeenCalledWith(0);
  });

  it('throttle: el mismo evento dentro de 120 ms se ignora', () => {
    const { result } = renderHook(() => useHaptics({ reducedMotion: false }));
    result.current.tap();
    result.current.tap(); // inmediato → dentro de la ventana de 120 ms
    const disparosTap = vibrate.mock.calls.filter(
      (c) => /** @type {any} */ (c)[0] === PATRONES_HAPTICOS.tap,
    );
    expect(disparosTap).toHaveLength(1);
  });
});

describe('useHaptics — gate triple', () => {
  it("pref 'off' → nunca vibra", () => {
    act(() => { usePrefsStore.setState({ haptics: 'off' }); });
    const { result } = renderHook(() => useHaptics({ reducedMotion: false }));
    expect(result.current.enabled).toBe(false);
    result.current.tap();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("'auto' + reduced-motion → apagada", () => {
    const { result } = renderHook(() => useHaptics({ reducedMotion: true }));
    expect(result.current.enabled).toBe(false);
    result.current.viajeEntrar();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("'on' + reduced-motion → SÍ vibra (el usuario sensorial manda)", () => {
    act(() => { usePrefsStore.setState({ haptics: 'on' }); });
    const { result } = renderHook(() => useHaptics({ reducedMotion: true }));
    expect(result.current.enabled).toBe(true);
    result.current.viajeEntrar();
    expect(vibrate).toHaveBeenLastCalledWith(PATRONES_HAPTICOS.viajeEntrar);
  });
});

describe('useHaptics — sin Vibration API (iOS/Safari, Firefox 129+)', () => {
  it('todos los métodos son no-op silenciosos, sin throw', async () => {
    vi.resetModules();
    // Simular plataforma sin la API ANTES de recargar el módulo.
    delete navigator.vibrate;
    const { default: useHapticsSinAPI } = await import('../useHaptics.js');
    const { result } = renderHook(() => useHapticsSinAPI({ reducedMotion: false }));
    expect(result.current.supported).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(() => {
      result.current.tap();
      result.current.abeja();
      result.current.stop();
    }).not.toThrow();
    // Restaurar para otros archivos de test.
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrate, configurable: true, writable: true,
    });
  });
});
