// @ts-nocheck
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCinemaMode } from '../useCinemaMode';

describe('useCinemaMode', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      writable: true,
      configurable: true,
      value: null,
    });
    document.documentElement.requestFullscreen = vi.fn().mockResolvedValue();
    document.exitFullscreen = vi.fn().mockResolvedValue();
  });

  afterEach(() => {
    delete document.documentElement.requestFullscreen;
    delete document.exitFullscreen;
  });

  it('starts with isCinema = false', () => {
    const { result } = renderHook(() => useCinemaMode());
    expect(result.current.isCinema).toBe(false);
  });

  it('isFullscreenApi es true cuando la API está disponible', () => {
    const { result } = renderHook(() => useCinemaMode());
    expect(result.current.isFullscreenApi).toBe(true);
  });

  it('toggleCinema: primera vez llama requestFullscreen', () => {
    const { result } = renderHook(() => useCinemaMode());
    act(() => result.current.toggleCinema());
    expect(document.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.isCinema).toBe(true);
  });

  it('toggleCinema: segunda vez llama exitFullscreen', () => {
    const { result } = renderHook(() => useCinemaMode());
    act(() => result.current.toggleCinema());
    expect(result.current.isCinema).toBe(true);

    act(() => result.current.toggleCinema());
    expect(document.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(result.current.isCinema).toBe(false);
  });

  it('fullscreenchange sincroniza isCinema con document.fullscreenElement', () => {
    const { result } = renderHook(() => useCinemaMode());
    expect(result.current.isCinema).toBe(false);

    act(() => {
      // @ts-ignore
      // @ts-ignore
// @ts-ignore
document.fullscreenElement = document.documentElement;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isCinema).toBe(true);

    act(() => {
      document.fullscreenElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });
    expect(result.current.isCinema).toBe(false);
  });

  it('Escape key sale de cinema mode', () => {
    const { result } = renderHook(() => useCinemaMode());

    act(() => result.current.toggleCinema());
    expect(result.current.isCinema).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.isCinema).toBe(false);
  });
});
