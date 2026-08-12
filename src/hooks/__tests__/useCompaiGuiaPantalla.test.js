/**
 * useCompaiGuiaPantalla.test.js — el compAI ELEGIDO se presenta al entrar a
 * una pantalla, UNA vez por sesión, sin pisar: ni a quien escribe (ocupado),
 * ni el silencio manual, ni las pantallas con guía propia (paradas de paseo).
 *
 * Cubre el decidir PUR0 (`decidirGuia`) y el hook con timers falsos.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCompaiGuiaPantalla, { decidirGuia, DEMORA_DEFECTO_MS, DURACION_DEFECTO_MS } from '../useCompaiGuiaPantalla.js';
import { limpiarRegistro, registrarParadas } from '../../services/compaiParadasPorPantalla.js';
import useAngelitaStore from '../../store/useAngelitaStore.js';

const BASE = { conExplicacion: true, conParadas: false, yaVista: false, silenciado: false, ocupado: false };

beforeEach(() => {
  limpiarRegistro();
  useAngelitaStore.setState({ silenciado: false });
  sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('decidirGuia — la decisión, pura', () => {
  it('muestra cuando todo está bien', () => {
    expect(decidirGuia(BASE)).toEqual({ mostrar: true, motivo: 'entrada' });
  });

  it('apagado por el host → no', () => {
    expect(decidirGuia({ ...BASE, activo: false })).toEqual({ mostrar: false, motivo: 'inactivo' });
  });

  it('pantalla sin explicación → no', () => {
    expect(decidirGuia({ ...BASE, conExplicacion: false })).toEqual({ mostrar: false, motivo: 'sin-explicacion' });
  });

  it('pantalla con guía propia (paradas de paseo) → cede, UNO SOLO por pantalla', () => {
    expect(decidirGuia({ ...BASE, conParadas: true })).toEqual({ mostrar: false, motivo: 'pantalla-con-guia-propia' });
  });

  it('ya vista en la sesión → no se repite', () => {
    expect(decidirGuia({ ...BASE, yaVista: true })).toEqual({ mostrar: false, motivo: 'ya-vista' });
  });

  it('silencio manual → no se auto-presenta', () => {
    expect(decidirGuia({ ...BASE, silenciado: true })).toEqual({ mostrar: false, motivo: 'silenciado' });
  });

  it('ocupado (escribiendo/grabando) → no interrumpe', () => {
    expect(decidirGuia({ ...BASE, ocupado: true })).toEqual({ mostrar: false, motivo: 'ocupado' });
  });
});

describe('useCompaiGuiaPantalla — el hook', () => {
  it('al entrar a una pantalla cubierta, explica y se cierra sola', () => {
    const { result } = renderHook(() => useCompaiGuiaPantalla('activos'));
    expect(result.current.visible).toBe(false);

    act(() => {
      vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10);
    });
    expect(result.current.visible).toBe(true);
    expect(result.current.explicacion.titulo).toBeTruthy();
    expect(result.current.explicacion.texto).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(DURACION_DEFECTO_MS + 10);
    });
    expect(result.current.visible).toBe(false);
    expect(result.current.explicacion).toBeNull();
  });

  it('una vez por pantalla por sesión (sessionStorage)', () => {
    const { result, rerender } = renderHook(({ p }) => useCompaiGuiaPantalla(p), {
      initialProps: { p: 'activos' },
    });
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(true);

    // Cambia de pantalla y vuelve: la segunda entrada NO repite.
    rerender({ p: 'mapa' });
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(true);

    rerender({ p: 'activos' });
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(false);
  });

  it('cede si la pantalla tiene su propia guía (paradas)', () => {
    registrarParadas('hoy-en-finca', [
      { id: 'a', ref: { current: { getBoundingClientRect: () => ({ top: 0, left: 0, right: 100, bottom: 50 }) } }, texto: 'x' },
    ]);
    const { result } = renderHook(() => useCompaiGuiaPantalla('hoy-en-finca'));
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(false);
  });

  it('no aparece en pantalla sin explicación', () => {
    const { result } = renderHook(() => useCompaiGuiaPantalla('ruta-desconocida'));
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(false);
  });

  it('no aparece con silencio manual', () => {
    useAngelitaStore.setState({ silenciado: true });
    const { result } = renderHook(() => useCompaiGuiaPantalla('activos'));
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(false);
  });

  it('descartar() cierra de inmediato', () => {
    const { result } = renderHook(() => useCompaiGuiaPantalla('activos'));
    act(() => vi.advanceTimersByTime(DEMORA_DEFECTO_MS + 10));
    expect(result.current.visible).toBe(true);

    act(() => result.current.descartar());
    expect(result.current.visible).toBe(false);
    expect(result.current.explicacion).toBeNull();
  });
});
