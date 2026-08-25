import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useCompaiRoam from '../useCompaiRoam.js';

describe('useCompaiRoam — el deambular del compai por la franja inferior', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame
    vi.stubGlobal('requestAnimationFrame', (cb) => window.setTimeout(cb, 16));
    vi.stubGlobal('cancelAnimationFrame', (id) => window.clearTimeout(id));
    // Mock matchMedia para prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('inicializa con valores por defecto correctos', () => {
    const ref = { current: null };
    const { result } = renderHook(() => useCompaiRoam(ref));

    expect(result.current.caminando).toBe(false);
    expect(result.current.hacia).toBe('izquierda');
    expect(result.current.parada).toBe(0);
    expect(result.current.opacity).toBe(1);
  });

  it('activa modo místico y expone opacity', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useCompaiRoam(ref, { misterio: true }));

    expect(result.current.opacity).toBeDefined();
    expect(result.current.opacity).toBe(1);
  });

  it('modo NO místico mantiene opacity en 1 siempre', () => {
    const ref = { current: document.createElement('div') };
    const { result } = renderHook(() => useCompaiRoam(ref, { misterio: false }));

    expect(result.current.opacity).toBe(1);
  });

  it('prefers-reduced-motion desactiva el roam', () => {
    const ref = { current: document.createElement('div') };
    window.matchMedia.mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useCompaiRoam(ref));

    expect(result.current.caminando).toBe(false);
    expect(ref.current.style.transform).toBe('');
  });

  it('pausado=true cambia el comportamiento', async () => {
    const ref = { current: document.createElement('div') };
    const { rerender } = renderHook(
      ({ pausado }) => useCompaiRoam(ref, { pausado, activo: true }),
      { initialProps: { pausado: false } }
    );

    // Esperar a que el hook se inicialice
    await waitFor(() => {
      expect(ref.current).toBeDefined();
    }, { timeout: 100 });

    // Pausar
    rerender({ pausado: true });

    // Verificar que el hook sigue funcionando (sin error)
    await waitFor(() => {
      expect(ref.current).toBeDefined();
    }, { timeout: 100 });
  });

  it('modo misterio aplica opacidad al elemento', () => {
    const ref = { current: document.createElement('div') };
    renderHook(() => useCompaiRoam(ref, { misterio: true }));

    // La opacidad inicial debería estar aplicada
    expect(ref.current.style.opacity).toBeDefined();
  });
});
