import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { esPasivo, useAngelitaPresencia } from '../useAngelitaPresencia.js';
import { AngelitaSalida } from '../AngelitaSalida.jsx';

describe('esPasivo', () => {
  it('trata idle/acompana/undefined como pasivos (despertar es seguro)', () => {
    expect(esPasivo('acompana')).toBe(true);
    expect(esPasivo('idle')).toBe(true);
    expect(esPasivo(undefined)).toBe(true);
  });
  it('trata los estados activos como NO pasivos (no se pisan)', () => {
    expect(esPasivo('pensando')).toBe(false);
    expect(esPasivo('respondiendo')).toBe(false);
    expect(esPasivo('preocupada')).toBe(false);
  });
});

describe('useAngelitaPresencia', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('con activo=false no despierta ni escucha', () => {
    const { result } = renderHook(() => useAngelitaPresencia({ activo: false }));
    act(() => { window.dispatchEvent(new Event('pointermove')); });
    expect(result.current.despierta).toBe(false);
  });

  it('con activo=true despierta al señal de presencia y se aquieta tras la duración', () => {
    const { result } = renderHook(() => useAngelitaPresencia({ activo: true, duracionMs: 1000 }));
    expect(result.current.despierta).toBe(false);
    act(() => { window.dispatchEvent(new Event('pointermove')); });
    expect(result.current.despierta).toBe(true);
    act(() => { vi.advanceTimersByTime(1200); });
    expect(result.current.despierta).toBe(false);
  });
});

describe('AngelitaSalida', () => {
  it('sin teatro (animated=false) avisa onIdo (se va digna)', () => {
    vi.useFakeTimers();
    const onIdo = vi.fn();
    render(<AngelitaSalida activa animated={false} onIdo={onIdo} />);
    act(() => { vi.advanceTimersByTime(50); });
    expect(onIdo).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
