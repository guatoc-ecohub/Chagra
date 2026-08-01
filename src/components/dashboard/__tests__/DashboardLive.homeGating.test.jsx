/**
 * DashboardLive.homeGating.test.jsx — GATING del HOME por perfil (2026-06-15):
 * "el usuario solo ve lo que necesita". Verifica a nivel de integración que:
 *
 *  - URBANO (terraza): NO se renderiza la tarjeta de Cerdos (ni silvopastoreo).
 *    De hecho el bloque entero de "Seguimiento de procesos" se oculta — el
 *    selector no permite ninguna tarjeta para un balcón. (criterio de éxito #1)
 *  - GANADERO con cerdos: SÍ se renderiza la tarjeta de Cerdos.
 *  - RESPETO A #1560: si el usuario tiene preferencia MANUAL guardada, esa
 *    gana sobre el default por perfil.
 *
 * Se usan las tarjetas de seguimiento REALES (no se mockea FincaCards) para
 * comprobar el render de "Cerdos"; los demás hijos pesados se stubean. El cache
 * de procesos se mockea vacío (contadores en 0).
 */
import React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Gate glaciar: irrelevante a este test → sin acceso. esOperadorActual: estos
// casos prueban el gating POR PERFIL (urbano/ganadero/restaurador), NO el
// bypass del operador (#1581) — sin este mock, DashboardLive llamaba a un
// esOperadorActual indefinido y el catch fail-open mostraba TODAS las tarjetas.
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

// Hijos pesados → stubs livianos. NO mockeamos FincaCards (queremos las
// tarjetas de seguimiento reales para ver "Cerdos").
vi.mock('../AgentHero', () => ({ default: () => <div data-testid="agent-hero" /> }));
vi.mock('../../OnboardingHero', () => ({ default: () => <div data-testid="onboarding-hero" /> }));
vi.mock('../SelectedBackgroundReveal', () => ({ default: () => <div /> }));
vi.mock('../ClimaStrip', () => ({ default: () => <div /> }));
vi.mock('../HoyEnFincaStrip', () => ({ default: () => <div /> }));
vi.mock('../AIStatusFooter', () => ({ default: () => <div /> }));
vi.mock('../AnalisisProactivoIA', () => ({ default: () => <div /> }));

// Store de assets: plantsCount > 0 para no montar el OnboardingHero de primer uso.
vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({ plants: [{ id: 'p1' }], lands: [], materials: [], isHydrated: true, iotAlerts: [] }),
}));

// Cache de procesos vacío → contadores en 0 (no afecta el render de la tarjeta).
vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(async () => []),
}));

// Perfil CONTROLABLE por test (lo definimos por escenario).
let mockProfile = {};
let mockManual = false;
let mockManualMap = {};
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  return {
    ...actual,
    getProfile: vi.fn(() => mockProfile),
    hasManualModuleVisibility: vi.fn(() => mockManual),
    getModuleVisibility: vi.fn(() =>
      mockManual ? mockManualMap : Object.fromEntries(actual.HOME_MODULES.map((m) => [m.id, true])),
    ),
  };
});

globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import DashboardLive from '../DashboardLive';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockProfile = {};
  mockManual = false;
  mockManualMap = {};
});

afterEach(() => cleanup());

describe('DashboardLive — gating del home por perfil', () => {
  test('URBANO/terraza: NO renderiza la tarjeta Cerdos (criterio #1)', async () => {
    mockProfile = { vocacion: 'urbano', finca_tipo: 'terraza' };
    render(<DashboardLive onNavigate={vi.fn()} />);
    // Dar tiempo al efecto async de contadores (aunque el bloque esté oculto).
    await waitFor(() => expect(screen.getByTestId('agent-hero')).toBeInTheDocument());
    // OBLIGATORIO: ninguna tarjeta de Cerdos / Silvopastoreo para el urbano.
    expect(screen.queryByText('Cerdos')).toBeNull();
    expect(screen.queryByText('Silvopastoreo')).toBeNull();
    // El bloque entero de seguimiento se oculta (urbano no tiene ninguna).
    expect(screen.queryByTestId('seguimiento-cards')).toBeNull();
    expect(screen.queryByText('Seguimiento de procesos')).toBeNull();
  });

  test('GANADERO con cerdos: SÍ renderiza la tarjeta Cerdos', async () => {
    mockProfile = { rol: 'ganadero', animales: ['ganado', 'cerdos'] };
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Cerdos')).toBeInTheDocument());
    expect(screen.getByText('Silvopastoreo')).toBeInTheDocument();
    // No mostramos las que no aplican al ganadero (reforestación/páramo).
    expect(screen.queryByText('Reforestación')).toBeNull();
    expect(screen.queryByText('Páramo')).toBeNull();
  });

  test('GANADERO solo gallinas: Silvopastoreo SÍ, Cerdos NO', async () => {
    mockProfile = { rol: 'ganadero', animales: ['gallinas'] };
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Silvopastoreo')).toBeInTheDocument());
    expect(screen.queryByText('Cerdos')).toBeNull();
  });

  test('RESTAURADOR: Reforestación y Páramo SÍ, Cerdos NO', async () => {
    mockProfile = { rol: 'restaurador', objetivo: ['biodiversidad'] };
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Reforestación')).toBeInTheDocument());
    expect(screen.getByText('Páramo')).toBeInTheDocument();
    expect(screen.queryByText('Cerdos')).toBeNull();
    expect(screen.queryByText('Silvopastoreo')).toBeNull();
  });

  test('#1560: preferencia MANUAL gana — urbano con manual=todo-visible ve Cerdos', async () => {
    // El usuario es urbano por perfil, PERO ya configuró a mano "todo visible".
    // Su elección manual gana: el home respeta su configuración. (Las tarjetas
    // de seguimiento NO se gatean por module-visibility; con manual presente, el
    // default por perfil ya no aplica y se muestran las 4.)
    mockProfile = { vocacion: 'urbano', finca_tipo: 'terraza' };
    mockManual = true;
    mockManualMap = {}; // {} = nada oculto = todo visible (preferencia explícita).
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('Cerdos')).toBeInTheDocument());
  });
});
