/**
 * useAngelitaGuia — precalentar el pool de variedad en idle (ítem #60 del
 * GAP compAI, 2026-08-13). Archivo separado del resto de useAngelitaGuia.test.js
 * porque necesita fake timers para llevar `useIdleDetection` a idle=true — el
 * resto de la suite usa cortes cortos de act() con timers REALES (ver la nota
 * de infraestructura en ese archivo) y mezclar los dos regímenes es frágil.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('../../services/angelitaVariedad', () => ({
  variarMensaje: vi.fn((texto) => texto),
  precalentarPoolIdle: vi.fn(async () => {}),
}));

import useAngelitaGuia, { PRECALENTAR_IDLE_MS_DEFECTO } from '../useAngelitaGuia.js';
import { precalentarPoolIdle } from '../../services/angelitaVariedad';

function rectFalso({ top, left, width, height }) {
  return { top, left, right: left + width, bottom: top + height, width, height };
}

function elementoFalso(rect) {
  return { getBoundingClientRect: () => rect };
}

function armarParadas(defs) {
  return defs.map((d, i) => ({
    id: d.id ?? `p${i}`,
    ref: { current: elementoFalso(rectFalso({ top: 100 * (i + 1), left: 14, width: 200, height: 60 })) },
    texto: d.texto,
    tipo: d.tipo,
  }));
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
  vi.mocked(precalentarPoolIdle).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAngelitaGuia — precalentar en idle (#60)', () => {
  it('tras el umbral de inactividad, precalienta las PRÓXIMAS paradas (no la actual)', async () => {
    const paradas = armarParadas([
      { texto: 'texto actual', tipo: 'sugerencia' },
      { texto: 'texto siguiente 1', tipo: 'atencion' },
      { texto: 'texto siguiente 2' },
      { texto: 'texto siguiente 3 (fuera de ventana)' },
    ]);
    renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRECALENTAR_IDLE_MS_DEFECTO);
    });

    expect(precalentarPoolIdle).toHaveBeenCalledTimes(1);
    expect(precalentarPoolIdle).toHaveBeenCalledWith([
      { base: 'texto siguiente 1', tipo: 'atencion' },
      { base: 'texto siguiente 2', tipo: 'sugerencia' },
    ]);
  });

  it('avanzar a la siguiente parada reinicia la ventana de precalentamiento', async () => {
    const paradas = armarParadas([
      { texto: 'a' },
      { texto: 'b' },
      { texto: 'c' },
    ]);
    const { result } = renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRECALENTAR_IDLE_MS_DEFECTO);
    });
    expect(precalentarPoolIdle).toHaveBeenCalledWith([
      { base: 'b', tipo: 'sugerencia' },
      { base: 'c', tipo: 'sugerencia' },
    ]);

    vi.mocked(precalentarPoolIdle).mockClear();
    // Ya estábamos idle: avanzar de parada dispara la re-evaluación DE
    // INMEDIATO (el efecto también depende del índice), sin esperar otro
    // umbral completo — la ventana "próximas paradas" se recalcula ya.
    act(() => result.current.siguiente());

    // En 'b', solo queda 'c' por delante.
    expect(precalentarPoolIdle).toHaveBeenCalledWith([{ base: 'c', tipo: 'sugerencia' }]);
  });

  it('con una sola parada no hay nada por delante: no precalienta', async () => {
    const paradas = armarParadas([{ texto: 'única' }]);
    renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRECALENTAR_IDLE_MS_DEFECTO);
    });
    expect(precalentarPoolIdle).not.toHaveBeenCalled();
  });

  it('con variar:false no precalienta (no hay pool de variedad que calentar)', async () => {
    const paradas = armarParadas([{ texto: 'a' }, { texto: 'b' }]);
    renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0, variar: false }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRECALENTAR_IDLE_MS_DEFECTO);
    });
    expect(precalentarPoolIdle).not.toHaveBeenCalled();
  });

  it('antes del umbral de inactividad, no precalienta todavía', async () => {
    const paradas = armarParadas([{ texto: 'a' }, { texto: 'b' }]);
    renderHook(() => useAngelitaGuia(paradas, { demoraInicialMs: 0 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PRECALENTAR_IDLE_MS_DEFECTO - 500);
    });
    expect(precalentarPoolIdle).not.toHaveBeenCalled();
  });
});
