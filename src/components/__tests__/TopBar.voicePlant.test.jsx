import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopBar from '../TopBar';

/**
 * Tests del TopBar tras el rediseño #323 (2026-05-28).
 *
 * Historia:
 *   - UX-27 (#286, 2026-05-27): se unificaron los dos botones de captura
 *     (Mic solo + Plus solo) en un único "Agregar planta por voz"
 *     (data-testid="topbar-add-plant-voice").
 *   - #323 (2026-05-28): el operador pidió quitar el botón de voz flotante
 *     en toda la app; el agregar-planta-por-voz lo hace ahora el agente
 *     Chagra directamente. El mic+sprout del TopBar fue REEMPLAZADO por el
 *     NotificationsBell (ver comentario en TopBar.jsx ~L192-196).
 *
 * Por eso este test verifica el estado ACTUAL:
 *   - El botón unificado "Agregar planta por voz" YA NO existe.
 *   - Tampoco existen los botones legacy (Plus "Capturar planta" / "Captura
 *     por voz").
 *   - En su lugar aparece el NotificationsBell.
 */

// Mocks: sub-componentes pesados o que tocan store global. No nos importan
// para este test del TopBar.
vi.mock('../EnvironmentalCard', () => ({ default: () => <div data-testid="env-stub" /> }));
vi.mock('../AltitudeBadge', () => ({ default: () => <div data-testid="alt-stub" /> }));
vi.mock('../OfflineChip', () => ({ default: () => <div data-testid="chip-stub" /> }));
vi.mock('../NotificationsBell', () => ({
  default: () => <div data-testid="notifications-bell-stub" />,
}));

describe('TopBar — captura por voz removida (#323)', () => {
  let onNavigate;
  let onLogout;

  beforeEach(() => {
    onNavigate = vi.fn();
    onLogout = vi.fn();
    localStorage.clear();
  });

  it('YA NO existe el botón unificado "Agregar planta por voz"', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    expect(screen.queryByTestId('topbar-add-plant-voice')).toBeNull();
    expect(screen.queryByLabelText(/^Agregar planta por voz$/i)).toBeNull();
  });

  it('tampoco existen los botones legacy (Plus / Captura por voz)', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    expect(screen.queryByLabelText(/^Capturar planta$/i)).toBeNull();
    expect(screen.queryByLabelText(/^Captura por voz$/i)).toBeNull();
  });

  // 2026-06-11 (bug "dos campanas"): el NotificationsBell del TopBar solo se
  // renderiza si el operador eligió 'actual' en Perfil. Con 'demo' (default)
  // la campana única es la de la portada del agente (AgentHero).
  it('renderiza el NotificationsBell solo con estilo "actual"', () => {
    localStorage.setItem('chagra:profile:v1', JSON.stringify({ estilo_notificacion: 'actual' }));
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    expect(screen.getByTestId('notifications-bell-stub')).toBeInTheDocument();
  });

  it('con estilo "demo" (default) NO renderiza el NotificationsBell (campana única en el hero)', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    expect(screen.queryByTestId('notifications-bell-stub')).toBeNull();
  });
});
