/**
 * UpdateAvailableBanner.update.test.jsx — TDD del flujo "Actualizar" (Bug 1
 * operador 2026-06-10: "cuando hay muchas actualizaciones debo dar Actualizar
 * N veces").
 *
 * Contrato del nuevo handleUpdate:
 *  1. Llama `registration.update()` ANTES de skipWaiting → trae el SW MÁS
 *     NUEVO si hubo varios deploys (un click → última versión).
 *  2. Manda `{type:'SKIP_WAITING'}` al SW en waiting.
 *  3. NO recarga acá: la recarga única la hace el listener `controllerchange`
 *     de main.jsx cuando el SW nuevo toma control (patrón Workbox). Recargar
 *     inmediato creaba la carrera que re-mostraba el banner.
 *  4. Fallback: sin SW en waiting (banner stale) → recarga directa.
 *  5. El ack de versión (localStorage) se persiste antes de activar.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import UpdateAvailableBanner, {
  UPDATE_TIMEOUT_MS,
  RELOAD_FALLBACK_MS,
} from '../UpdateAvailableBanner';
import { ACK_STORAGE_KEY } from '../../services/swUpdateAck';
import { reloadPage } from '../../services/pageReload';

// location.reload es non-configurable en jsdom — la recarga pasa por la
// indirección pageReload para poder espiarla acá.
vi.mock('../../services/pageReload', () => ({ reloadPage: vi.fn() }));

function mockServiceWorker(reg) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { ready: Promise.resolve(reg) },
  });
}

function showBanner(version = 'chagra-v999') {
  act(() => {
    window.dispatchEvent(
      new CustomEvent('chagra:update-available', { detail: { version } })
    );
  });
}

describe('UpdateAvailableBanner — flujo Actualizar', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // @ts-ignore
    delete navigator.serviceWorker;
  });

  it('con SW waiting: update() + SKIP_WAITING, SIN reload inmediato', async () => {
    const waiting = { postMessage: vi.fn() };
    const reg = { update: vi.fn().mockResolvedValue(undefined), waiting };
    mockServiceWorker(reg);

    render(<UpdateAvailableBanner />);
    showBanner();
    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => {
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
    expect(reg.update).toHaveBeenCalled();
    // La recarga la hace controllerchange (main.jsx), NO el banner.
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it('persiste el ack de la versión anunciada antes de activar', async () => {
    const waiting = { postMessage: vi.fn() };
    mockServiceWorker({ update: vi.fn().mockResolvedValue(undefined), waiting });

    render(<UpdateAvailableBanner />);
    showBanner('chagra-v321');
    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => expect(waiting.postMessage).toHaveBeenCalled());
    expect(localStorage.getItem(ACK_STORAGE_KEY)).toBe('chagra-v321');
  });

  it('sin SW waiting: fallback a recarga directa', async () => {
    mockServiceWorker({ update: vi.fn().mockResolvedValue(undefined), waiting: null });

    render(<UpdateAvailableBanner />);
    showBanner();
    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
  });

  it('update() que falla (offline) no bloquea: activa el waiting que haya', async () => {
    const waiting = { postMessage: vi.fn() };
    mockServiceWorker({ update: vi.fn().mockRejectedValue(new Error('offline')), waiting });

    render(<UpdateAvailableBanner />);
    showBanner();
    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => {
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    });
    expect(reloadPage).not.toHaveBeenCalled();
  });

  // ── Bug operador 2026-06-11 (Android): botón "Actualizar" pegado ──────────

  it('click muestra "Actualizando…" y deshabilita el botón (feedback inmediato)', async () => {
    const waiting = { postMessage: vi.fn() };
    mockServiceWorker({ update: vi.fn().mockResolvedValue(undefined), waiting });

    render(<UpdateAvailableBanner />);
    showBanner();
    const btn = screen.getByRole('button', { name: /actualizar/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /actualizando/i })).toBeDisabled();
    });
  });

  it('anuncia chagra:sw-update-requested para que main.jsx recargue SIEMPRE en controllerchange', async () => {
    const waiting = { postMessage: vi.fn() };
    mockServiceWorker({ update: vi.fn().mockResolvedValue(undefined), waiting });
    const requested = vi.fn();
    window.addEventListener('chagra:sw-update-requested', requested);

    render(<UpdateAvailableBanner />);
    showBanner();
    fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

    await waitFor(() => expect(waiting.postMessage).toHaveBeenCalled());
    expect(requested).toHaveBeenCalledTimes(1);
    window.removeEventListener('chagra:sw-update-requested', requested);
  });

  it('update() COLGADO (red flaky) no bloquea: SKIP_WAITING sale tras el timeout', async () => {
    vi.useFakeTimers();
    try {
      const waiting = { postMessage: vi.fn() };
      // update() nunca resuelve — simula fetch de sw.js colgado en red rural.
      mockServiceWorker({ update: vi.fn(() => new Promise(() => {})), waiting });

      render(<UpdateAvailableBanner />);
      showBanner();
      fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(UPDATE_TIMEOUT_MS + 50);
      });
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('fallback: si controllerchange nunca recarga, recarga directa tras RELOAD_FALLBACK_MS', async () => {
    vi.useFakeTimers();
    try {
      const waiting = { postMessage: vi.fn() };
      mockServiceWorker({ update: vi.fn().mockResolvedValue(undefined), waiting });

      render(<UpdateAvailableBanner />);
      showBanner();
      fireEvent.click(screen.getByRole('button', { name: /actualizar/i }));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10);
      });
      expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
      expect(reloadPage).not.toHaveBeenCalled();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(RELOAD_FALLBACK_MS + 50);
      });
      expect(reloadPage).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
