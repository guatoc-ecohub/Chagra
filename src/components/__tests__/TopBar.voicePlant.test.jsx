import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../TopBar';

/**
 * Tests para UX-27 (#286): operador 2026-05-27 — "en la parte de arriba
 * borra el + en su lugar mejora el de micrófono con un icono de + y una
 * planta o algo lindo que le permita inferir que es para agregar una
 * planta con voz".
 *
 * Verifica:
 *   - El botón solo del + (onNavigate='plant_asset') YA NO existe.
 *   - El botón con icono Mic + decoración Sprout existe.
 *   - aria-label "Agregar planta por voz" para screenreaders.
 *   - Tap navega a 'voz' (el flow de voz YA permite registrar plantas).
 *   - Touch target 44x44 (iOS minimum).
 */

// Mocks: EnvironmentalCard / AltitudeBadge / OfflineChip son sub-componentes
// pesados o que tocan store global. No nos importan para este test.
vi.mock('../EnvironmentalCard', () => ({ default: () => <div data-testid="env-stub" /> }));
vi.mock('../AltitudeBadge', () => ({ default: () => <div data-testid="alt-stub" /> }));
vi.mock('../OfflineChip', () => ({ default: () => <div data-testid="chip-stub" /> }));

describe('UX-27 — TopBar botón unificado voz+planta', () => {
  let onNavigate;
  let onLogout;

  beforeEach(() => {
    onNavigate = vi.fn();
    onLogout = vi.fn();
  });

  it('existe un único botón de captura ("Agregar planta por voz")', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    const btn = screen.getByTestId('topbar-add-plant-voice');
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-label', 'Agregar planta por voz');
  });

  it('NO existe el botón Plus solo que navegaba a plant_asset', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    // El antiguo aria-label "Capturar planta" debe haber desaparecido.
    expect(screen.queryByLabelText(/^Capturar planta$/i)).toBeNull();
    // Y el antiguo "Captura por voz" tambien — fue reemplazado por el copy nuevo.
    expect(screen.queryByLabelText(/^Captura por voz$/i)).toBeNull();
  });

  it('al tocar el botón navega a "voz" (flow de voz registra planta)', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    fireEvent.click(screen.getByTestId('topbar-add-plant-voice'));
    expect(onNavigate).toHaveBeenCalledWith('voz');
    // NO debe navegar al form manual.
    expect(onNavigate).not.toHaveBeenCalledWith('plant_asset');
  });

  it('cumple touch target iOS 44x44', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    const btn = screen.getByTestId('topbar-add-plant-voice');
    expect(btn.className).toMatch(/min-h-\[44px\]/);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
  });

  it('tiene title accesible para tooltip desktop', () => {
    render(<TopBar onNavigate={onNavigate} onLogout={onLogout} />);
    const btn = screen.getByTestId('topbar-add-plant-voice');
    expect(btn).toHaveAttribute('title', 'Agregar planta por voz');
  });
});
