// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * Registro unificado (#23) en el HOME: con la flag VITE_REGISTRO_UNIFICADO ON,
 * el bloque "Registrar en la finca" muestra UNA sola puerta "Registrar"
 * (→ registro_unificado) en vez de los tiles sueltos Cosechar/Insumos/Labores.
 * Con la flag OFF (default/prod) el bloque conserva los tiles separados.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => true,
}));
let registroFlagOn = true;
vi.mock('../../../config/registroUnificadoFlag', () => ({
  registroUnificadoActivo: () => registroFlagOn,
}));
vi.mock('../../../config/extensionistaAccess', () => ({
  esExtensionistaActual: () => false,
  esExtensionistaRealActual: () => false,
}));
vi.mock('../AgentHero', () => ({ default: () => <div data-testid="agent-hero" /> }));
vi.mock('../FincaVivaHero', () => ({
  default: (props) => <div data-testid="finca-viva-hero">{props.children}</div>,
}));
vi.mock('../FincaRedInstitucional', () => ({ default: () => <div /> }));
vi.mock('../../OnboardingHero', () => ({ default: () => <div /> }));
vi.mock('../SelectedBackgroundReveal', () => ({ default: () => <div /> }));
vi.mock('../MiFincaVivaHomeCard', () => ({ default: () => <div /> }));
vi.mock('../../CaseStudyTopWidget', () => ({ default: () => null }));
vi.mock('../ClimaStrip', () => ({ default: () => <div data-testid="clima-strip" /> }));
vi.mock('../HoyEnFincaStrip', () => ({ default: () => <div data-testid="hoy-strip" /> }));
vi.mock('../AIStatusFooter', () => ({ default: () => <div data-testid="ai-status-footer" /> }));
vi.mock('../AnalisisProactivoIA', () => ({ default: () => <div data-testid="analisis-ia" /> }));

vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({
    plants: [{ id: 'p1' }], lands: [], materials: [], isHydrated: true, iotAlerts: [],
  }),
}));
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));

let mockProfile = { rol: 'campesino', piso_confirmado: '1', finca_altitud: '1800' };
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  return {
    ...actual,
    getProfile: vi.fn(() => mockProfile),
    hasManualModuleVisibility: vi.fn(() => true),
  };
});

globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

import DashboardLive from '../DashboardLive';

beforeEach(() => {
  vi.clearAllMocks();
  registroFlagOn = true;
  mockProfile = { rol: 'campesino', piso_confirmado: '1', finca_altitud: '1800' };
});
afterEach(() => cleanup());

describe('Home — registro unificado (#23)', () => {
  test('flag ON: una sola puerta "Registrar" reemplaza Cosechar/Insumos/Labores', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    const block = await screen.findByTestId('bloque-registrar');

    // La puerta única existe y navega al flujo unificado.
    const puerta = within(block).getByTestId('tile-registrar-unificado');
    expect(puerta).toBeInTheDocument();
    fireEvent.click(puerta);
    expect(onNavigate).toHaveBeenCalledWith('registro_unificado');

    // Las 3 entradas de logging sueltas YA NO están como tiles; solo queda
    // Semilleros (herramienta) como acceso secundario.
    const gestion = within(block).getByTestId('gestion-tiles');
    const labels = within(gestion).getAllByRole('button').map((b) => b.getAttribute('aria-label')?.split(':')[0]);
    expect(labels).toEqual(['Semilleros']);
    expect(within(block).queryByLabelText(/Cosechar:/)).toBeNull();
    expect(within(block).queryByLabelText(/Abonos e insumos:/)).toBeNull();
    expect(within(block).queryByLabelText(/Labores de la finca:/)).toBeNull();
  });

  test('flag OFF: el bloque conserva los tiles separados', async () => {
    registroFlagOn = false;
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-registrar');
    expect(within(block).queryByTestId('tile-registrar-unificado')).toBeNull();
    const gestion = within(block).getByTestId('gestion-tiles');
    const labels = within(gestion).getAllByRole('button').map((b) => b.getAttribute('aria-label')?.split(':')[0]);
    expect(labels).toEqual(['Semilleros', 'Cosechar', 'Abonos e insumos', 'Labores de la finca']);
  });
});
