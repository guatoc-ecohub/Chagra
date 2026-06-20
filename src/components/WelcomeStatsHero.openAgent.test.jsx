/**
 * WelcomeStatsHero.openAgent.test.jsx — abrir el overlay del agente desde el
 * colibrí "Abrir Chagra IA" en MÓVIL.
 *
 * Bug 2026-06-20: en móvil el tap sobre "Abrir Chagra IA" NO abría el overlay.
 * Causa: el botón solo navegaba en `onClick`, pero el `transform: scale()` del
 * press cambia la geometría del target entre touchstart/touchend → el navegador
 * móvil cancela el click sintético → `onNavigate('agente')` nunca corría.
 *
 * Contrato cubierto:
 *   1. touchEnd sobre el colibrí navega a 'agente' (la ruta del overlay).
 *   2. El click sintético que llega DESPUÉS del touchEnd NO navega doble.
 *   3. Un click puro de mouse (sin touch) sigue navegando (desktop).
 *   4. Pre-login (sin onNavigate) el botón queda inerte (disabled), por diseño.
 *
 * jsdom no reproduce el cancel real del click sintético del navegador móvil;
 * el test fija el CONTRATO del handler (touchEnd abre + dedupe del ghost-click),
 * que es lo que garantiza la apertura fiable en viewport angosto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WelcomeStatsHero from './WelcomeStatsHero';

const mockAssetStore = { plants: { length: 0 } };
vi.mock('../store/useAssetStore', () => ({
  default: (selector) => selector(mockAssetStore),
}));

describe('WelcomeStatsHero — abrir Chagra IA (overlay del agente) en móvil', () => {
  beforeEach(() => {
    mockAssetStore.plants.length = 0;
    try { globalThis.localStorage.clear(); } catch { /* ignore */ }
  });

  it('touchEnd sobre "Abrir Chagra IA" navega al agente', () => {
    const onNavigate = vi.fn();
    render(<WelcomeStatsHero mode="post-login" onNavigate={onNavigate} />);
    // Hay 2 botones con el mismo aria-label (header + modal); el primero basta.
    const chip = screen.getAllByRole('button', { name: 'Abrir Chagra IA' })[0];

    fireEvent.touchStart(chip);
    fireEvent.touchEnd(chip);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  it('el click sintético tras el touchEnd NO navega dos veces', () => {
    const onNavigate = vi.fn();
    render(<WelcomeStatsHero mode="post-login" onNavigate={onNavigate} />);
    const chip = screen.getAllByRole('button', { name: 'Abrir Chagra IA' })[0];

    fireEvent.touchStart(chip);
    fireEvent.touchEnd(chip);
    // Ghost-click que algunos navegadores móviles emiten después del touch.
    fireEvent.click(chip);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  it('un click puro de mouse (desktop) sigue abriendo el agente', () => {
    const onNavigate = vi.fn();
    render(<WelcomeStatsHero mode="post-login" onNavigate={onNavigate} />);
    const chip = screen.getAllByRole('button', { name: 'Abrir Chagra IA' })[0];

    fireEvent.click(chip);

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  it('pre-login (sin onNavigate) el botón queda inerte (disabled)', () => {
    render(<WelcomeStatsHero mode="pre-login" />);
    // El aria-label es constante; pre-login el botón se renderiza disabled.
    const chip = screen.getAllByRole('button', { name: 'Abrir Chagra IA' })[0];
    expect(chip).toBeDisabled();
  });
});
