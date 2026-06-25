import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Redistribución de "el resto de su finca" (auditoría §7.2 + §7.4 #2):
// verifica que los tiles se reparten en los grupos correctos, en el orden de
// jerarquía esperado (Destacado → Aprender → Gestión → Mercado) y que cada tile
// navega a su ruta. Cubre el layout F2 ON (que filtra el hub `aprende` porque ya
// es portal del hero) y el legacy OFF (que sí muestra el hub `aprende`).

vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

let flagOn = true;
vi.mock('../../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));
vi.mock('../../../config/extensionistaAccess', () => ({
  esExtensionistaActual: () => false,
}));

vi.mock('../AgentHero', () => ({ default: () => <div data-testid="agent-hero" /> }));
// Capturamos las props del hero para verificar el cableado del portal "Gestionar"
// (onGestionar) sin montar todo el hero. El botón expuesto invoca onGestionar tal
// como lo haría el portal real.
let lastHeroProps = null;
vi.mock('../FincaVivaHero', () => ({
  default: (props) => {
    lastHeroProps = props;
    return (
      <div data-testid="finca-viva-hero">
        <button type="button" data-testid="hero-gestionar" onClick={() => props.onGestionar?.()}>
          Gestionar
        </button>
        {props.children}
      </div>
    );
  },
}));
vi.mock('../FincaRedInstitucional', () => ({ default: () => <div /> }));
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
  const actual = await importOriginal();
  return {
    ...actual,
    getProfile: vi.fn(() => mockProfile),
    hasManualModuleVisibility: vi.fn(() => true), // muestra todo, sin gating por perfil
  };
});

globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} };

import DashboardLive from '../DashboardLive';

beforeEach(() => {
  vi.clearAllMocks();
  flagOn = true;
  mockProfile = { rol: 'campesino', piso_confirmado: '1', finca_altitud: '1800' };
});
afterEach(() => cleanup());

const labelOf = (el) => el.getAttribute('aria-label')?.split(':')[0];

describe('DashboardLive — redistribución del resto de su finca', () => {
  test('los 4 grupos existen en el orden de jerarquía esperado', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('destacado-tiles')).toBeInTheDocument());

    const groups = ['destacado-tiles', 'aprender-tiles', 'gestion-tiles', 'mercado-tiles'];
    for (const g of groups) expect(screen.getByTestId(g)).toBeInTheDocument();

    // Orden en el DOM (jerarquía): Destacado antes que Aprender antes que
    // Gestión antes que Mercado.
    const positions = groups.map((g) => {
      const node = screen.getByTestId(g);
      return { g, top: Array.prototype.indexOf.call(document.querySelectorAll('[data-testid]'), node) };
    });
    const order = positions
      .sort((a, b) => a.top - b.top)
      .map((p) => p.g);
    expect(order).toEqual(groups);
  });

  test('DESTACADO eleva solo Especies y Calendario (lo fuerte y grounded)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('destacado-tiles');
    const labels = within(block).getAllByRole('button').map(labelOf);
    expect(labels).toEqual(['Especies', 'Calendario']);
  });

  test('APRENDER consolida el contenido; con F2 ON NO duplica el hub Aprender', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('aprender-tiles');
    const labels = within(block).getAllByRole('button').map(labelOf);
    // F2 ON: el portal "Aprender" del hero ya entra al hub, así que el tile
    // 'aprende' se filtra; quedan las superficies de contenido consolidadas.
    expect(labels).toEqual([
      'Casos de estudio', 'Ciclo de nutrientes', 'Biopreparados', 'Suelo', 'Seguridad', 'Preguntas frecuentes',
    ]);
  });

  test('GESTIÓN agrupa registros/manejo (semilleros incluido)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('gestion-tiles');
    const labels = within(block).getAllByRole('button').map(labelOf);
    expect(labels).toEqual(['Semilleros', 'Cosechar', 'Insumos aplicados', 'Mantenimiento']);
  });

  test('MERCADO queda al fondo, de-enfatizado, y navega a la ruta mercado', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    const block = await screen.findByTestId('mercado-tiles');
    const btn = within(block).getByRole('button', { name: /Mercado/ });
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith('mercado', undefined);
  });

  test('los tiles navegan a sus rutas (directorio, calendario, casos, biopreparados con back)', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    await screen.findByTestId('destacado-tiles');

    fireEvent.click(screen.getByRole('button', { name: /^Especies/ }));
    expect(onNavigate).toHaveBeenCalledWith('directorio', undefined);
    fireEvent.click(screen.getByRole('button', { name: /^Calendario/ }));
    expect(onNavigate).toHaveBeenCalledWith('calendario_finca', undefined);
    fireEvent.click(screen.getByRole('button', { name: /^Casos de estudio/ }));
    expect(onNavigate).toHaveBeenCalledWith('casos', undefined);
    fireEvent.click(screen.getByRole('button', { name: /^Biopreparados/ }));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
  });

  test('la sección de gestión expone el ancla #finca-gestion (destino del portal Gestionar)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('gestion-tiles');
    const ancla = document.getElementById('finca-gestion');
    // El ancla existe y CONTIENE los tiles de gestión (es la sección, no otra cosa).
    expect(ancla).toBeInTheDocument();
    expect(ancla).toContainElement(block);
  });

  test('el hero recibe onGestionar y, al invocarlo, hace scroll al ancla de gestión (no navega al juego)', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    await screen.findByTestId('gestion-tiles');

    const ancla = document.getElementById('finca-gestion');
    ancla.scrollIntoView = vi.fn();
    ancla.focus = vi.fn();

    expect(typeof lastHeroProps.onGestionar).toBe('function');
    fireEvent.click(screen.getByTestId('hero-gestionar'));

    expect(ancla.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalledWith('juego');
  });

  test('layout legacy (F2 OFF) SÍ muestra el hub Aprender como tile', async () => {
    flagOn = false;
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('aprender-tiles');
    const labels = within(block).getAllByRole('button').map(labelOf);
    expect(labels[0]).toBe('Aprender');
    expect(labels).toContain('Casos de estudio');
  });
});
