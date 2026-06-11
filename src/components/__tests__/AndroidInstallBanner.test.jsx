/**
 * AndroidInstallBanner.test.jsx — TDD del banner de instalación PWA para
 * Android Chrome (Bug 2 operador 2026-06-10: "en Android Chrome no me da la
 * opción de instalar la PWA").
 *
 * Contrato:
 *  - No renderiza nada hasta que el navegador dispare `beforeinstallprompt`
 *    (solo Chromium lo emite — iOS jamás, por eso este banner no colisiona
 *    con IosInstallBanner).
 *  - Al capturar el evento: preventDefault() (mata el mini-infobar de Chrome)
 *    y muestra botón claro "Instalar Chagra".
 *  - Click en instalar → deferredPrompt.prompt() + espera userChoice y oculta.
 *  - No aparece si ya está instalada (display-mode: standalone) ni si el
 *    usuario lo descartó antes (localStorage).
 *  - Se oculta con `appinstalled`.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import AndroidInstallBanner, { DISMISS_KEY } from '../AndroidInstallBanner';

function makeBipEvent(outcome = 'accepted') {
  const event = new Event('beforeinstallprompt');
  event.preventDefault = vi.fn();
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

function setStandalone(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(display-mode: standalone)' ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('AndroidInstallBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    setStandalone(false);
  });

  it('no renderiza nada antes de beforeinstallprompt', () => {
    const { container } = render(<AndroidInstallBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('captura beforeinstallprompt: preventDefault + muestra "Instalar Chagra"', () => {
    render(<AndroidInstallBanner />);
    const event = makeBipEvent();
    act(() => { window.dispatchEvent(event); });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /instalar chagra/i })).toBeInTheDocument();
  });

  it('click en instalar dispara prompt() y oculta el banner tras userChoice', async () => {
    render(<AndroidInstallBanner />);
    const event = makeBipEvent('accepted');
    act(() => { window.dispatchEvent(event); });
    fireEvent.click(screen.getByRole('button', { name: /instalar chagra/i }));
    expect(event.prompt).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /instalar chagra/i })).not.toBeInTheDocument();
    });
  });

  it('oculta también si el usuario rechaza el prompt nativo (dismissed)', async () => {
    render(<AndroidInstallBanner />);
    act(() => { window.dispatchEvent(makeBipEvent('dismissed')); });
    fireEvent.click(screen.getByRole('button', { name: /instalar chagra/i }));
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /instalar chagra/i })).not.toBeInTheDocument();
    });
  });

  it('NO aparece si la app ya corre standalone (instalada)', () => {
    setStandalone(true);
    render(<AndroidInstallBanner />);
    act(() => { window.dispatchEvent(makeBipEvent()); });
    expect(screen.queryByRole('button', { name: /instalar chagra/i })).not.toBeInTheDocument();
  });

  it('NO aparece si fue descartado antes (localStorage)', () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    render(<AndroidInstallBanner />);
    act(() => { window.dispatchEvent(makeBipEvent()); });
    expect(screen.queryByRole('button', { name: /instalar chagra/i })).not.toBeInTheDocument();
  });

  it('botón cerrar persiste el descarte y oculta', () => {
    render(<AndroidInstallBanner />);
    act(() => { window.dispatchEvent(makeBipEvent()); });
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(localStorage.getItem(DISMISS_KEY)).toBe('true');
    expect(screen.queryByRole('button', { name: /instalar chagra/i })).not.toBeInTheDocument();
  });

  it('se oculta al recibir appinstalled', () => {
    render(<AndroidInstallBanner />);
    act(() => { window.dispatchEvent(makeBipEvent()); });
    expect(screen.getByRole('button', { name: /instalar chagra/i })).toBeInTheDocument();
    act(() => { window.dispatchEvent(new Event('appinstalled')); });
    expect(screen.queryByRole('button', { name: /instalar chagra/i })).not.toBeInTheDocument();
  });
});
