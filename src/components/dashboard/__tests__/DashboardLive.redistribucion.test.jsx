import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// Reorganización del HOME F2 EN 5 BLOQUES (audit botones/distribución
// 2026-06-26). Verifica que, con la flag F2 ON, el "resto de su finca" se ordena
// por el flujo mental del campesino (estado → tengo → hago → consulto → vendo),
// con copy campesino, dedup aplicado y el bloque condicional de proyectos BAJADO.
// Y que con la flag OFF el home conserva su layout legacy (grid draggable +
// AIStatusFooter + rótulos viejos) — "flag OFF = home actual intacto".

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
// Capturamos las props del hero para verificar el cableado del portal "Mi finca"
// (onGestionar) sin montar todo el hero. El botón expuesto invoca onGestionar tal
// como lo haría el portal real.
let lastHeroProps = null;
vi.mock('../FincaVivaHero', () => ({
  default: (props) => {
    lastHeroProps = props;
    return (
      <div data-testid="finca-viva-hero">
        <button type="button" data-testid="hero-gestionar" onClick={() => props.onGestionar?.()}>
          Mi finca
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
const indexInDom = (node) =>
  Array.prototype.indexOf.call(document.querySelectorAll('[data-testid]'), node);

describe('Home F2 — reorganización en 5 bloques (audit 2026-06-26)', () => {
  test('los 5 bloques existen en el orden del flujo del campesino', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('bloque-finca-hoy')).toBeInTheDocument());

    // estado → tengo → hago → consulto → vendo.
    const blocks = [
      'bloque-finca-hoy',        // 1. Cómo va su finca hoy
      'bloque-plantas-animales', // 2. Sus plantas y animales
      'bloque-registrar',        // 3. Registrar en la finca
      'bloque-consultar',        // 4. Consultar y aprender
      'mercado-tiles',           // 5. Vender y comprar
    ];
    for (const b of blocks) expect(screen.getByTestId(b)).toBeInTheDocument();

    const order = blocks
      .map((b) => ({ b, top: indexInDom(screen.getByTestId(b)) }))
      .sort((a, z) => a.top - z.top)
      .map((p) => p.b);
    expect(order).toEqual(blocks);
  });

  test('BLOQUE 1 funde el día + clima + aviso de Chagra y NO duplica IA ni "hoy"', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-finca-hoy');
    // El estado del día: UNA sola tira "hoy", el clima y el aviso de Chagra.
    expect(within(block).getByTestId('hoy-strip')).toBeInTheDocument();
    expect(within(block).getByTestId('clima-strip')).toBeInTheDocument();
    expect(within(block).getByTestId('analisis-ia')).toBeInTheDocument();
    // No hay un SEGUNDO panel de IA al pie (AIStatusFooter "Status proactivo IA"
    // NO se monta en F2: su idea ES este bloque).
    expect(screen.queryByTestId('ai-status-footer')).toBeNull();
    // Y solo hay UNA tira "hoy" en todo el home (dedup del strip + tile).
    expect(screen.getAllByTestId('hoy-strip')).toHaveLength(1);
  });

  test('BLOQUE 2 agrupa plantas, zonas, plagas, asociaciones y flora/fauna', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-plantas-animales');
    const txt = block.textContent;
    expect(block).toHaveTextContent('Sus plantas y animales');
    for (const t of ['Mis plantas', 'Mis zonas', 'Plagas', 'Asociaciones', 'Plantas y animales del monte']) {
      expect(txt).toContain(t);
    }
  });

  test('BLOQUE 3 "Registrar" unifica abonos e insumos y usa copy campesino', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-registrar');
    const gestion = within(block).getByTestId('gestion-tiles');
    const tileLabels = within(gestion).getAllByRole('button').map(labelOf);
    expect(tileLabels).toEqual(['Semilleros', 'Cosechar', 'Abonos e insumos', 'Labores de la finca']);
    // La bitácora vive en el bloque de acción.
    expect(block).toHaveTextContent('Bitácora');
  });

  test('BLOQUE 3 conserva el ancla #finca-gestion (destino del portal Mi finca)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-registrar');
    const ancla = document.getElementById('finca-gestion');
    expect(ancla).toBeInTheDocument();
    expect(ancla).toBe(block);
  });

  test('BLOQUE 4 "Consultar y aprender" con catálogo, calendario, contenido y reportes', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-consultar');

    // Lo fuerte y grounded, con copy campesino.
    const destacado = within(block).getByTestId('destacado-tiles');
    expect(within(destacado).getAllByRole('button').map(labelOf))
      .toEqual(['Qué puedo sembrar', 'Calendario de la finca']);

    // El contenido consolidado + "Sacar reportes"; NO duplica el hub "Aprender"
    // (ese es el portal del hero en F2).
    const aprender = within(block).getByTestId('aprender-tiles');
    const labels = within(aprender).getAllByRole('button').map(labelOf);
    expect(labels).not.toContain('Aprender');
    expect(labels).toEqual([
      'Casos reales', 'Ciclo de nutrientes', 'Del corral al abono', 'Biopreparados', 'Suelo', 'Seguridad', 'Preguntas frecuentes', 'Sacar reportes',
    ]);
  });

  test('BLOQUE 5 Mercado al fondo y navega a la ruta mercado', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    const block = await screen.findByTestId('mercado-tiles');
    fireEvent.click(within(block).getByRole('button', { name: /Mercado/ }));
    expect(onNavigate).toHaveBeenCalledWith('mercado', undefined);
  });

  test('"Sus proyectos de finca" va MÁS ABAJO que lo cotidiano (estado/registrar)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await screen.findByTestId('seguimiento-cards');
    const seguimiento = screen.getByTestId('seguimiento-cards');
    const registrar = screen.getByTestId('bloque-registrar');
    const hoy = screen.getByTestId('bloque-finca-hoy');
    // El bloque condicional de proyectos queda debajo de lo cotidiano.
    expect(indexInDom(seguimiento)).toBeGreaterThan(indexInDom(registrar));
    expect(indexInDom(seguimiento)).toBeGreaterThan(indexInDom(hoy));
    // Y lleva su rótulo campesino renombrado.
    expect(seguimiento.closest('[class*="px-4"]')).toHaveTextContent('Sus proyectos de finca');
  });

  test('los tiles navegan a sus rutas reales (directorio, calendario, casos, biopreparados con back, reportes)', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    await screen.findByTestId('bloque-consultar');

    fireEvent.click(screen.getByRole('button', { name: /^Qué puedo sembrar/ }));
    expect(onNavigate).toHaveBeenCalledWith('directorio', undefined);
    fireEvent.click(screen.getByRole('button', { name: /^Calendario de la finca/ }));
    expect(onNavigate).toHaveBeenCalledWith('calendario_finca', undefined);
    fireEvent.click(screen.getByRole('button', { name: /^Casos reales/ }));
    expect(onNavigate).toHaveBeenCalledWith('casos', undefined);
    fireEvent.click(screen.getByRole('button', { name: /^Biopreparados/ }));
    expect(onNavigate).toHaveBeenCalledWith('biopreparados', { back: 'dashboard' });
    fireEvent.click(screen.getByRole('button', { name: /^Sacar reportes/ }));
    expect(onNavigate).toHaveBeenCalledWith('informes', undefined);
  });

  test('el hero recibe onGestionar y, al invocarlo, hace scroll al ancla de gestión (no navega al juego)', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    await screen.findByTestId('bloque-registrar');

    const ancla = document.getElementById('finca-gestion');
    ancla.scrollIntoView = vi.fn();
    ancla.focus = vi.fn();

    expect(typeof lastHeroProps.onGestionar).toBe('function');
    fireEvent.click(screen.getByTestId('hero-gestionar'));

    expect(ancla.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalledWith('juego');
  });
});

describe('Home — flag OFF conserva el layout legacy (prod intacto)', () => {
  beforeEach(() => { flagOn = false; });

  test('NO existen los bloques F2 nuevos', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await screen.findByTestId('destacado-tiles');
    expect(screen.queryByTestId('bloque-finca-hoy')).toBeNull();
    expect(screen.queryByTestId('bloque-plantas-animales')).toBeNull();
    expect(screen.queryByTestId('bloque-registrar')).toBeNull();
    expect(screen.queryByTestId('bloque-consultar')).toBeNull();
  });

  test('conserva el grid draggable + AIStatusFooter + rótulos viejos', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await screen.findByTestId('destacado-tiles');
    // Footer de IA legacy presente (en F2 se omite, acá NO).
    expect(screen.getByTestId('ai-status-footer')).toBeInTheDocument();
    // Hub "Aprender" como tile (con OFF SÍ se muestra) y labels legacy.
    const aprender = screen.getByTestId('aprender-tiles');
    const labels = within(aprender).getAllByRole('button').map(labelOf);
    expect(labels[0]).toBe('Aprender');
    expect(labels).toContain('Casos de estudio'); // copy legacy, NO "Casos reales"
    // DESTACADO con labels legacy.
    const destacado = screen.getByTestId('destacado-tiles');
    expect(within(destacado).getAllByRole('button').map(labelOf)).toEqual(['Especies', 'Calendario']);
    // GESTIÓN con label legacy "Insumos aplicados" (no "Abonos e insumos").
    const gestion = screen.getByTestId('gestion-tiles');
    expect(within(gestion).getAllByRole('button').map(labelOf))
      .toEqual(['Semilleros', 'Cosechar', 'Insumos aplicados', 'Mantenimiento']);
  });
});
