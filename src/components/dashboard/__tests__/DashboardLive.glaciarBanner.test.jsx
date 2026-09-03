// @ts-nocheck
/**
 * DashboardLive.glaciarBanner.test.jsx — el banner "Reporte de Punto Glaciar"
 * del Home está restringido a los beta testers de "La Cordada".
 *
 * Contrato:
 *  - usuario de La Cordada (tieneAccesoGlaciarActual → true) → el banner del
 *    Home SE renderiza (botón "Reporte de Punto Glaciar").
 *  - usuario fuera de la whitelist (false) → el banner NO se renderiza; el
 *    módulo es invisible desde el Home.
 *
 * El gate (glaciarAccess) se mockea para controlar el acceso por test sin
 * depender de localStorage; su lógica pura ya está cubierta en
 * src/config/__tests__/glaciarAccess.test.js. Los hijos pesados del dashboard
 * (AgentHero, tiras de clima, dnd-kit, stores) se stubean para aislar el banner.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach } from 'vitest';

// Gate CONTROLABLE por test.
const accesoMock = vi.fn(() => false);
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: (...args) => accesoMock(...args),
  esOperadorActual: () => false,
}));

// Hijos pesados → stubs livianos.
vi.mock('../AgentHero', () => ({ default: () => <div data-testid="agent-hero" /> }));
vi.mock('../../PrimerRegistroCard', () => ({ default: () => <div data-testid="primer-registro-card" /> }));
vi.mock('../SelectedBackgroundReveal', () => ({ default: () => <div /> }));
vi.mock('../ClimaStrip', () => ({ default: () => <div /> }));
vi.mock('../HoyEnFincaStrip', () => ({ default: () => <div /> }));
vi.mock('../AIStatusFooter', () => ({ default: () => <div /> }));
vi.mock('../AnalisisProactivoIA', () => ({ default: () => <div /> }));
vi.mock('../FincaCards', () => ({
  PlantasCard: () => <div />, ZonasCard: () => <div />, InsumosCard: () => <div />,
  BitacoraCard: () => <div />, HoyCard: () => <div />, PlagasCard: () => <div />,
  BiodiversidadCard: () => <div />, AsociacionesCard: () => <div />, InformesCard: () => <div />,
  FermentosCard: () => <div />, AnimalesCard: () => <div />,
  SeguimientoCards: () => <div data-testid="seguimiento-cards" />,
}));

vi.mock('../../../services/userProfileService', () => ({
  getProfile: vi.fn(() => ({})),
  isModuleVisible: vi.fn(() => true),
  getModuleVisibility: vi.fn(() => ({})),
  hasManualModuleVisibility: vi.fn(() => false),
  getGuardianEspecie: vi.fn(() => null),
  setGuardianEspecie: vi.fn(),
  // Orden de módulos del home (reorder por drag, 2026-06-15). Para este test el
  // orden por defecto basta; setModuleOrder es no-op.
  HOME_MODULE_DEFAULT_ORDER: [
    'hoyfinca', 'clima', 'analisis', 'asociaciones', 'plantas', 'hoy', 'zonas',
    'insumos', 'plagas', 'bitacora', 'biodiversidad', 'informes',
  ],
  getModuleOrder: vi.fn(() => [
    'hoyfinca', 'clima', 'analisis', 'asociaciones', 'plantas', 'hoy', 'zonas',
    'insumos', 'plagas', 'bitacora', 'biodiversidad', 'informes',
  ]),
  setModuleOrder: vi.fn(),
}));

// Store de assets: plantsCount > 0 para que NO se monte el primer registro de
// "primer uso" (no relevante a este test) y mantener el árbol pequeño.
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [{ id: 'p1' }], needsPisoCapture: false }),
}));

globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import DashboardLive from '../DashboardLive';

const GLACIAR_BANNER = /reporte de punto glaciar/i;

describe('DashboardLive — banner glaciar gateado por La Cordada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('usuario de La Cordada: el banner glaciar SÍ se renderiza', () => {
    accesoMock.mockReturnValue(true);
    render(<DashboardLive onNavigate={vi.fn()} />);
    expect(screen.getByText(GLACIAR_BANNER)).toBeInTheDocument();
  });

  test('usuario fuera de la whitelist: el banner glaciar NO se renderiza', () => {
    accesoMock.mockReturnValue(false);
    render(<DashboardLive onNavigate={vi.fn()} />);
    expect(screen.queryByText(GLACIAR_BANNER)).toBeNull();
  });
});
