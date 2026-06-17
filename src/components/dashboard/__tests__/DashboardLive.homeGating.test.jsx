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
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const glaciarAccessMock = vi.hoisted(() => ({
  tieneAccesoGlaciarActual: vi.fn(() => false),
  esOperadorActual: vi.fn(() => false),
}));

// Gate glaciar: controlado por test. Por defecto estos casos prueban el gating
// POR PERFIL (urbano/ganadero/restaurador), NO el bypass del operador (#1581).
vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: (...args) => glaciarAccessMock.tieneAccesoGlaciarActual(...args),
  esOperadorActual: (...args) => glaciarAccessMock.esOperadorActual(...args),
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
  const actual = await importOriginal();
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
  glaciarAccessMock.tieneAccesoGlaciarActual.mockReturnValue(false);
  glaciarAccessMock.esOperadorActual.mockReturnValue(false);
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

  test('OPERADOR sin preferencia manual: ubicación/perfil reducido no oculta módulos ni seguimiento', async () => {
    glaciarAccessMock.esOperadorActual.mockReturnValue(true);
    mockProfile = { rol: 'restaurador', objetivo: ['biodiversidad'] };

    render(<DashboardLive onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Cerdos')).toBeInTheDocument());
    expect(screen.getByText(/Insumos/i)).toBeInTheDocument();
    expect(screen.getByText('Mis zonas')).toBeInTheDocument();
    expect(screen.getByText(/Informes/i)).toBeInTheDocument();
    expect(screen.getByText('Reforestación')).toBeInTheDocument();
    expect(screen.getByText('Silvopastoreo')).toBeInTheDocument();
    expect(screen.getByText('Páramo')).toBeInTheDocument();
  });

  test('OPERADOR con preferencia manual explícita: puede ocultar módulos del Home', async () => {
    glaciarAccessMock.esOperadorActual.mockReturnValue(true);
    mockProfile = { rol: 'restaurador', objetivo: ['biodiversidad'] };
    mockManual = true;
    mockManualMap = {
      insumos: false,
      zonas: false,
      informes: false,
      analisis: false,
    };

    render(<DashboardLive onNavigate={vi.fn()} />);

    await waitFor(() => expect(screen.getByText('Cerdos')).toBeInTheDocument());
    expect(screen.queryByText(/Insumos/i)).toBeNull();
    expect(screen.queryByText('Mis zonas')).toBeNull();
    expect(screen.queryByText(/Informes/i)).toBeNull();
  });

  test('OPERADOR: un evento de visibilidad manual actualiza el Home sin perder seguimiento', async () => {
    glaciarAccessMock.esOperadorActual.mockReturnValue(true);
    mockProfile = { vocacion: 'urbano', finca_tipo: 'terraza' };

    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/Insumos/i)).toBeInTheDocument());

    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:module-visibility-changed', {
        detail: {
          visibility: {
            insumos: false,
            zonas: false,
            informes: false,
            analisis: false,
          },
        },
      }));
    });

    expect(screen.queryByText(/Insumos/i)).toBeNull();
    expect(screen.queryByText('Mis zonas')).toBeNull();
    expect(screen.queryByText(/Informes/i)).toBeNull();
    expect(screen.getByText('Cerdos')).toBeInTheDocument();
  });
});
