import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TopBar from '../TopBar';

/**
 * TopBar.locationLine.test.jsx — línea de ubicación bajo el nombre.
 *
 * Bajo el nombre del operador se muestra "📍 {municipio}, vereda {vereda} ·
 * {altitud} msnm". La fuente de los datos es, en orden: finca activa
 * (multi-finca) → PERFIL del usuario (onboarding / LocationDetectedScreen) →
 * FARM_CONFIG (demo). Antes solo leía de la finca activa, así que el piloto
 * que confirma su ubicación por LocationDetectedScreen (que guarda en el
 * perfil) veía la línea vacía.
 *
 * Vereda: el dataset DANE no la trae; solo se muestra si el perfil/finca la
 * tiene de onboarding manual. Si no, se omite sin romper.
 */

vi.mock('../EnvironmentalCard', () => ({ default: () => <div data-testid="env-stub" /> }));
vi.mock('../AltitudeBadge', () => ({ default: () => <div data-testid="alt-stub" /> }));
vi.mock('../OfflineChip', () => ({ default: () => <div data-testid="chip-stub" /> }));
vi.mock('../NotificationsBell', () => ({ default: () => <div data-testid="bell-stub" /> }));

// Finca activa SIN ubicación → fuerza el fallback al perfil.
vi.mock('../../services/fincaActiveStore', () => {
  const store = { activeFincaSlug: 'guatoc', fincas: [] };
  const useFincaActiveStore = (selector) => selector(store);
  return { default: useFincaActiveStore };
});

vi.mock('../../store/useOllamaWarmStore', () => ({
  default: (selector) => selector({ status: 'idle' }),
}));
vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ syncProgress: null }),
}));

vi.mock('../../config/defaults', () => ({
  FARM_CONFIG: { MUNICIPIO: null, ALTITUD_MSNM: null },
}));

vi.mock('../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({})),
}));
import { getProfile } from '../../services/userProfileService';

describe('TopBar — línea de ubicación bajo el nombre', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('chagra:operator:name', 'Miguel');
    getProfile.mockReturnValue({});
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('muestra municipio + altitud del perfil (msnm) bajo el nombre', () => {
    getProfile.mockReturnValue({ municipio: 'Choachí', finca_altitud: '2580' });
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Choachí')).toBeInTheDocument();
    expect(screen.getByText(/2580 msnm/)).toBeInTheDocument();
  });

  it('incluye la vereda si el perfil la tiene', () => {
    getProfile.mockReturnValue({ municipio: 'Choachí', vereda: 'Aguanica', finca_altitud: '2580' });
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText(/vereda Aguanica/)).toBeInTheDocument();
  });

  it('NO rompe (ni muestra vereda) si el perfil no la trae', () => {
    getProfile.mockReturnValue({ municipio: 'Une', finca_altitud: '1875' });
    render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Une')).toBeInTheDocument();
    expect(screen.queryByText(/vereda/)).toBeNull();
  });

  it('re-lee el perfil al recibir chagra:location-updated', () => {
    const { rerender } = render(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    // Sin ubicación todavía.
    expect(screen.queryByText(/msnm/)).toBeNull();
    // El usuario confirma su ubicación → el evento dispara re-lectura del perfil.
    getProfile.mockReturnValue({ municipio: 'Choachí', finca_altitud: '2580' });
    fireEvent(window, new CustomEvent('chagra:location-updated'));
    rerender(<TopBar onNavigate={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText(/2580 msnm/)).toBeInTheDocument();
  });
});
