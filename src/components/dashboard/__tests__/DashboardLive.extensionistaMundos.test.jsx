import React from 'react';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * DashboardLive.extensionistaMundos.test.jsx — REGRESIÓN del gate del home V4.
 *
 * Bug: en el home finca-viva (flag F2 ON), el OPERADOR es extensionista por
 * bypass (operator_override → esOperador → esExtensionista). Un gate
 * `esExtensionista ? null` borraba la hoja `.fvh-resto` COMPLETA, así que el
 * operador/extensionista se quedaba SIN "Los mundos de mi finca" (mundos-finca)
 * mientras un campesino normal SÍ los veía.
 *
 * Fix: la red institucional sigue siendo la PORTADA del hero, pero la hoja
 * .fvh-resto (con los mundos) se renderiza ADITIVAMENTE debajo para TODOS los
 * perfiles. Este test congela ese contrato: extensionista/operador ve la RED
 * arriba Y la grilla de mundos abajo.
 */

vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => true, // el operador ve todo (renderCampoPanel, etc.)
}));

vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => true, // home F2 ON
}));

// Extensionista REAL (flag + whitelist): modo supervisor multi-finca activo.
// (Hotfix P0 2026-07-04: la portada del home la decide esExtensionistaRealActual
// — el bypass del operador ya NO cambia la portada, solo el acceso al panel.)
vi.mock('../../../config/extensionistaAccess', () => ({
  esExtensionistaActual: () => true,
  esExtensionistaRealActual: () => true,
}));

// El hero real es pesado: lo stubeamos pero RENDERIZAMOS sus children para que
// la red institucional (que va como child cuando esExtensionista) sea visible.
vi.mock('../FincaVivaHero', () => ({
  default: (props) => (
    <div data-testid="finca-viva-hero" data-titulo={props.titulo}>
      {props.children}
    </div>
  ),
}));
vi.mock('../FincaRedInstitucional', () => ({
  default: () => <div data-testid="red-institucional" />,
}));

vi.mock('../AgentHero', () => ({ default: () => <div data-testid="agent-hero" /> }));
vi.mock('../../OnboardingHero', () => ({ default: () => <div /> }));
vi.mock('../SelectedBackgroundReveal', () => ({ default: () => <div /> }));
vi.mock('../MiFincaVivaHomeCard', () => ({ default: () => <div /> }));
vi.mock('../../CaseStudyTopWidget', () => ({ default: () => null }));
vi.mock('../ClimaStrip', () => ({ default: () => <div /> }));
vi.mock('../HoyEnFincaStrip', () => ({ default: () => <div /> }));
vi.mock('../AIStatusFooter', () => ({ default: () => <div /> }));
vi.mock('../AnalisisProactivoIA', () => ({ default: () => <div /> }));

vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({
    plants: [{ id: 'p1' }], lands: [], materials: [], isHydrated: true, iotAlerts: [],
  }),
}));
vi.mock('../../../db/farmProcessCache', () => ({ listFarmProcesses: vi.fn(async () => []) }));

let mockProfile = { rol: 'campesino', piso_confirmado: '1', finca_altitud: '1800' };
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = /** @type {typeof import('../../../services/userProfileService')} */ (
    await importOriginal()
  );
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
  localStorage.clear();
  localStorage.setItem('chagra:operator_override', '1');
  mockProfile = { rol: 'campesino', piso_confirmado: '1', finca_altitud: '1800' };
});
afterEach(() => cleanup());

describe('DashboardLive — operador/extensionista ve los mundos (aditivo, no reemplazo)', () => {
  test('la RED institucional es la portada Y "Los mundos de mi finca" se ven debajo', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);

    // La red institucional ocupa el hero (portada del supervisor).
    // timeout explícito: FincaVivaHero es lazy() (PERF-1, 2026-07) — el
    // import() dinámico tarda más que el default de waitFor (1000ms) en el
    // pipeline de transform de vitest.
    await waitFor(() => expect(screen.getByTestId('red-institucional')).toBeInTheDocument(), { timeout: 5000 });
    expect(screen.getByTestId('finca-viva-hero').getAttribute('data-titulo'))
      .toBe('Red de fincas que acompaño');

    // Y la hoja .fvh-resto NO se oculta: el bloque de mundos está presente.
    // Desde la usabilidad campesina #5 los mundos arrancan PLEGADOS ("Toda mi
    // finca"): un toque abre la grilla completa (reachability intacta).
    const bloque = screen.getByTestId('bloque-mundos');
    fireEvent.click(within(bloque).getByTestId('abrir-mundos'));
    expect(within(bloque).getByTestId('mundos-finca')).toBeInTheDocument();
    // La hoja completa se renderiza (antes era null para el extensionista).
    expect(screen.getByTestId('fvh-resto')).toBeInTheDocument();
  });
});
