/**
 * useCompaiPaseo — el cableado en vivo del planificador de paseo.
 *
 * Cubre lo que pide el encargo:
 *   - Sin paradas registradas, nunca sale del puesto.
 *   - Con paradas, sale a pasear y trae las paradas del anillo correcto.
 *   - #28: `estaOcupado()` en true bloquea salir / corta el paseo en curso.
 *   - #34: pestaña oculta detiene el interval por completo (cero timers).
 *   - #33: `abortarPaseo()` corta el paseo y pasa por 'volviendo' antes de
 *     aterrizar en 'puesto' (regreso animado, #32 — nunca un salto directo).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCompaiPaseo from '../useCompaiPaseo.js';
import {
  registrarParadas,
  limpiarRegistro,
} from '../../services/compaiParadasPorPantalla.js';
import { marcarOcupado, liberarOcupacion } from '../../services/compaiOcupado.js';

const ref = () => ({ current: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 10, bottom: 10 }) } });

function setVisibility(estado) {
  Object.defineProperty(document, 'visibilityState', { value: estado, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.useFakeTimers();
  setVisibility('visible');
});

afterEach(() => {
  limpiarRegistro();
  liberarOcupacion();
  vi.useRealTimers();
});

describe('sin paradas registradas', () => {
  it('nunca sale del puesto', () => {
    const { result } = renderHook(() => useCompaiPaseo('pantalla-vacia'));
    expect(result.current.enPuesto).toBe(true);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.enPuesto).toBe(true);
    expect(result.current.paradasActivas).toEqual([]);
  });
});

describe('con paradas registradas', () => {
  it('sale a pasear y trae las paradas del anillo "cerca" primero', () => {
    registrarParadas('finca', [
      { id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' },
      { id: 'b', ref: ref(), texto: 'b', anillo: 'pantalla' },
    ]);
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.paseando).toBe(true);
    expect(result.current.fase).toBe('cerca');
    expect(result.current.paradasActivas.map((p) => p.id)).toEqual(['a']);
  });

  it('a los 60s de paseo pasa al anillo "pantalla"', () => {
    registrarParadas('finca', [
      { id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' },
      { id: 'b', ref: ref(), texto: 'b', anillo: 'pantalla' },
    ]);
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      vi.advanceTimersByTime(2000); // arranca en 'cerca'
    });
    expect(result.current.fase).toBe('cerca');
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.fase).toBe('pantalla');
    expect(result.current.paradasActivas.map((p) => p.id)).toEqual(['b']);
  });
});

describe('#28 — ocupado bloquea el paseo', () => {
  it('estaOcupado()=true nunca deja salir del puesto', () => {
    registrarParadas('finca', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' }]);
    marcarOcupado('voz');
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.enPuesto).toBe(true);
  });

  it('marcarOcupado a mitad de paseo lo corta hacia "volviendo"', () => {
    registrarParadas('finca', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' }]);
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.paseando).toBe(true);
    act(() => {
      marcarOcupado('form:mata');
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.fase).toBe('volviendo');
  });
});

describe('#34 — background detiene el planificador entero', () => {
  it('con la pestaña oculta, no avanza de fase aunque pase el tiempo', () => {
    registrarParadas('finca', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' }]);
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.paseando).toBe(true);

    act(() => {
      setVisibility('hidden');
    });
    // Con la pestaña oculta, el próximo tick (si corriera) cortaría a
    // 'volviendo'; pero el interval se limpió — nada corre.
    const faseAlOcultar = result.current.fase;
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.fase).toBe(faseAlOcultar);
  });

  it('al volver a visible, retoma la evaluación', () => {
    registrarParadas('finca', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' }]);
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      setVisibility('hidden');
    });
    act(() => {
      setVisibility('visible');
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.paseando).toBe(true);
  });
});

describe('#33/#32 — abortarPaseo corta y vuelve animado, nunca salta', () => {
  it('abortarPaseo() a mitad de paseo pasa por "volviendo" antes de "puesto"', () => {
    registrarParadas('finca', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' }]);
    const { result } = renderHook(() => useCompaiPaseo('finca', { msRegreso: 500 }));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.paseando).toBe(true);

    act(() => {
      result.current.abortarPaseo();
    });
    expect(result.current.fase).toBe('volviendo');
    expect(result.current.enPuesto).toBe(false);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.enPuesto).toBe(true);
  });

  it('abortarPaseo() en el puesto no hace nada', () => {
    const { result } = renderHook(() => useCompaiPaseo('finca'));
    act(() => {
      result.current.abortarPaseo();
    });
    expect(result.current.enPuesto).toBe(true);
  });
});

describe('activo=false', () => {
  it('apaga el paseo entero aunque haya paradas', () => {
    registrarParadas('finca', [{ id: 'a', ref: ref(), texto: 'a', anillo: 'cerca' }]);
    const { result } = renderHook(() => useCompaiPaseo('finca', { activo: false }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.enPuesto).toBe(true);
  });
});
