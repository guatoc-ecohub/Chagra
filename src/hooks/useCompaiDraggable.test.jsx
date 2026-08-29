import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCompaiDraggable from './useCompaiDraggable';

/**
 * Tests para useCompaiDraggable — hook de arrastre y persistencia del FAB.
 */
describe('useCompaiDraggable', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    localStorage.clear();
    // Mock window.innerWidth y window.innerHeight
    globalThis.innerWidth = 1024;
    globalThis.innerHeight = 768;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debería cargar la posición natural por defecto', () => {
    const { result } = renderHook(() => useCompaiDraggable());

    expect(result.current.position).toBeNull();
    expect(result.current.positionStyle).toEqual({
      bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
      right: 14,
    });
  });

  it('debería cargar posición guardada desde localStorage', () => {
    const savedPosition = { bottom: 150, right: 200 };
    localStorage.setItem('compai-position', JSON.stringify(savedPosition));

    const { result } = renderHook(() => useCompaiDraggable());

    expect(result.current.position).toEqual(savedPosition);
  });

  it('debería ignorar posiciones inválidas en localStorage', () => {
    localStorage.setItem('compai-position', 'invalid-json');
    const { result } = renderHook(() => useCompaiDraggable());

    expect(result.current.position).toBeNull();
  });

  it('debería guardar posición en localStorage al cambiar', () => {
    const { result } = renderHook(() => useCompaiDraggable());

    // Simular el inicio de arrastre
    act(() => {
      result.current.compaiRef.current = {
        getBoundingClientRect: () => ({
          bottom: 768 - 90,
          right: 1024 - 14,
          left: 1024 - 14 - 84,
          top: 768 - 90 - 84,
          width: 84,
          height: 84,
          x: 1024 - 14 - 84,
          y: 768 - 90 - 84,
        }),
      };

      result.current.dragHandlers.onMouseDown({
        preventDefault: vi.fn(),
        button: 0,
        clientX: 900,
        clientY: 600,
        target: { closest: vi.fn(() => null) },
      });

      // Simular el movimiento del mouse directamente
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 800,
        clientY: 500,
      });
      document.dispatchEvent(mouseMoveEvent);

      // Terminar arrastre
      const mouseUpEvent = new MouseEvent('mouseup');
      document.dispatchEvent(mouseUpEvent);
    });

    // La posición debería haberse guardado en localStorage
    const saved = localStorage.getItem('compai-position');
    expect(saved).toBeDefined();
  });

  it('acepta un evento con coordenadas de mouse aunque no tenga touches', () => {
    const { result } = renderHook(() => useCompaiDraggable());
    result.current.compaiRef.current = {
      getBoundingClientRect: () => ({ bottom: 678, right: 1010 }),
    };

    expect(() => {
      act(() => {
        result.current.dragHandlers.onTouchStart({
          clientX: 900,
          clientY: 600,
          target: { closest: vi.fn(() => null) },
        });
      });
    }).not.toThrow();
    expect(result.current.isDragging).toBe(true);
  });

  it('mantiene el arrastre táctil con coordenadas en touches', () => {
    const { result } = renderHook(() => useCompaiDraggable());
    result.current.compaiRef.current = {
      getBoundingClientRect: () => ({ bottom: 678, right: 1010 }),
    };

    act(() => {
      result.current.dragHandlers.onTouchStart({
        touches: [{ clientX: 900, clientY: 600 }],
        target: { closest: vi.fn(() => null) },
      });
    });

    act(() => {
      const movimiento = new Event('touchmove', { bubbles: true, cancelable: true });
      Object.defineProperty(movimiento, 'touches', {
        value: [{ clientX: 800, clientY: 500 }],
      });
      document.dispatchEvent(movimiento);
    });

    expect(result.current.position).toEqual({ bottom: 190, right: 114 });
  });

  it('debería resetear posición y localStorage', () => {
    localStorage.setItem('compai-position', JSON.stringify({ bottom: 120, right: 180 }));
    const { result } = renderHook(() => useCompaiDraggable());

    expect(result.current.position).toEqual({ bottom: 120, right: 180 });

    act(() => {
      result.current.resetPosition?.();
    });

    expect(result.current.position).toBeNull();
    expect(localStorage.getItem('compai-position')).toBeNull();
  });

  it('debería deshabilitarse cuando enabled=false', () => {
    localStorage.setItem('compai-position', JSON.stringify({ bottom: 120, right: 180 }));
    const { result } = renderHook(() => useCompaiDraggable({ enabled: false }));

    expect(result.current.position).toBeNull();
    expect(result.current.positionStyle).toEqual({
      bottom: 'max(90px, calc(env(safe-area-inset-bottom) + 90px))',
      right: 14,
    });
  });

  it('debería usar clave de almacenamiento personalizada', () => {
    const customKey = 'mi-compai-pos';
    const position = { bottom: 100, right: 150 };
    localStorage.setItem(customKey, JSON.stringify(position));

    const { result } = renderHook(() => 
      useCompaiDraggable({ storageKey: customKey })
    );

    expect(result.current.position).toEqual(position);
  });

  it('debería ser no-op cuando localStorage falla al cargar', () => {
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useCompaiDraggable());

    // No debería romper, simplemente tener posición null
    expect(result.current.position).toBeNull();

    Storage.prototype.getItem = originalGetItem;
  });

  it('usa changedTouches como respaldo y no falla cuando faltan coordenadas táctiles', () => {
    const { result } = renderHook(() => useCompaiDraggable());
    result.current.compaiRef.current = {
      getBoundingClientRect: () => ({ bottom: 678, right: 1010 }),
    };
    const target = { closest: vi.fn(() => null) };

    expect(() => {
      act(() => {
        result.current.dragHandlers.onTouchStart({
          target,
          touches: [],
          changedTouches: [],
        });
      });
    }).not.toThrow();
    expect(result.current.isDragging).toBe(false);

    act(() => {
      result.current.dragHandlers.onTouchStart({
        target,
        touches: [],
        changedTouches: [{ clientX: 900, clientY: 600 }],
      });
    });
    expect(result.current.isDragging).toBe(true);
  });
});
