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
  const actual = /** @type {any} */ (await importOriginal());
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

describe('Home F2 — reestructuración 2.0 "Los mundos de mi finca" (V4)', () => {
  test('el flujo: estado → registrar → LOS MUNDOS → pie de ayuda, en orden', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await waitFor(() => expect(screen.getByTestId('bloque-finca-hoy')).toBeInTheDocument());

    const blocks = [
      'bloque-finca-hoy',  // 1. Cómo va su finca hoy
      'bloque-registrar',  // 2. Registrar en la finca (voz-primero, ancla)
      'bloque-mundos',     // 3. LOS MUNDOS DE SU FINCA
      'footer-ayuda',      // pie: FAQ · Ayuda
    ];
    for (const b of blocks) expect(screen.getByTestId(b)).toBeInTheDocument();

    const order = blocks
      .map((b) => ({ b, top: indexInDom(screen.getByTestId(b)) }))
      .sort((a, z) => a.top - z.top)
      .map((p) => p.b);
    expect(order).toEqual(blocks);
  });

  test('BLOQUE 1 = UN solo card "estado del día" (consolidación 2026-07-04)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-finca-hoy');
    // Los tres paneles ya NO son tres tarjetas apiladas: viven DENTRO de un
    // único card compacto (EstadoDelDiaCard) — el clima de HOY sale una sola
    // vez (cabecera) y "Registrar" sube sobre el fold.
    const card = within(block).getByTestId('estado-del-dia');
    expect(within(card).getByTestId('hoy-strip')).toBeInTheDocument();
    expect(within(card).getByTestId('analisis-ia')).toBeInTheDocument();
    // El pronóstico de 7 días es COLAPSABLE y arranca cerrado (el clima de hoy
    // ya está en la cabecera — así se corta la doble aparición del clima).
    const toggle = within(card).getByTestId('estado-clima-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(card).queryByTestId('clima-strip')).toBeNull();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(card).getByTestId('clima-strip')).toBeInTheDocument();
    // No hay un SEGUNDO panel de IA al pie (AIStatusFooter "Status proactivo IA"
    // NO se monta en F2: su idea ES este bloque).
    expect(screen.queryByTestId('ai-status-footer')).toBeNull();
    // Y solo hay UNA tira "hoy" en todo el home (dedup del strip + tile).
    expect(screen.getAllByTestId('hoy-strip')).toHaveLength(1);
  });

  test('"Registrar" unifica abonos e insumos y usa copy campesino', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-registrar');
    const gestion = within(block).getByTestId('gestion-tiles');
    const tileLabels = within(gestion).getAllByRole('button').map(labelOf);
    expect(tileLabels).toEqual(['Semilleros', 'Cosechar', 'Abonos e insumos', 'Labores de la finca']);
    // La bitácora vive en el bloque de acción.
    expect(block).toHaveTextContent('Bitácora');
  });

  test('"Registrar" conserva el ancla #finca-gestion (destino del portal Mi finca)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-registrar');
    const ancla = document.getElementById('finca-gestion');
    expect(ancla).toBeInTheDocument();
    expect(ancla).toBe(block);
  });

  test('LOS MUNDOS arrancan PLEGADOS tras "Toda mi finca" (usabilidad #5) y un toque los abre completos', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-mundos');
    // Plegados por defecto: el primer pantallazo son las 6 puertas del hero,
    // no ~13 tarjetas + ~35 chips. La grilla NO está montada aún.
    expect(within(block).queryByTestId('mundos-finca')).toBeNull();
    const abrir = within(block).getByTestId('abrir-mundos');
    expect(abrir).toBeInTheDocument();
    fireEvent.click(abrir); // un solo toque: reachability intacta
    expect(within(block).getByTestId('mundos-finca')).toBeInTheDocument();
  });

  test('LOS MUNDOS: la grilla (abierta) monta los 9 mundos con su copy', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    const block = await screen.findByTestId('bloque-mundos');
    fireEvent.click(within(block).getByTestId('abrir-mundos'));
    expect(within(block).getByTestId('mundos-finca')).toBeInTheDocument();
    for (const id of ['cultivos', 'suelo', 'agua', 'abono', 'sanidad', 'clima', 'animales', 'mercado', 'disenio']) {
      expect(within(block).getByTestId(`mundo-${id}`)).toBeInTheDocument();
    }
    expect(block).toHaveTextContent('Los mundos de su finca');
    expect(block).toHaveTextContent('Cultivos y semillas');
    expect(block).toHaveTextContent('Sanidad de la mata');
  });

  test('mundos con pantalla propia navegan a la ruta mundo; los directos a su vista', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    const block = await screen.findByTestId('bloque-mundos');
    fireEvent.click(within(block).getByTestId('abrir-mundos'));

    // Cultivos tiene PORTADA a medida (hub) → navega a su vista propia.
    fireEvent.click(screen.getByTestId('mundo-cultivos'));
    expect(onNavigate).toHaveBeenCalledWith('mundo_cultivos');
    // Mundo con entradas y sin portada → pantalla de mundo genérica.
    fireEvent.click(screen.getByTestId('mundo-mercado'));
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'mercado' });

    // Mundos de UNA pantalla → directo, sin intermedia vacía.
    fireEvent.click(screen.getByTestId('mundo-agua'));
    expect(onNavigate).toHaveBeenCalledWith('agua', undefined);

    // Estiércol y compost ganó su segunda sala ("El compost, paso a paso"):
    // pasó de directo a hub con DOS entradas (compost + del corral al abono),
    // así que ahora abre la pantalla de mundo genérica (mismo caso que clima).
    fireEvent.click(screen.getByTestId('mundo-abono'));
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'abono' });

    // Clima ganó su propia mini-app (#2045): ahora tiene DOS entradas
    // (su día en la finca + el boletín del clima que viene), así que ya no
    // es de una sola pantalla → abre la pantalla de mundo genérica.
    fireEvent.click(screen.getByTestId('mundo-clima'));
    expect(onNavigate).toHaveBeenCalledWith('mundo', { mundo: 'clima' });
  });

  test('las tiles sueltas viejas ya NO existen en F2 (viven dentro de sus mundos)', async () => {
    render(<DashboardLive onNavigate={vi.fn()} />);
    await screen.findByTestId('bloque-mundos');
    // Los bloques desmontados por la reestructuración.
    expect(screen.queryByTestId('bloque-plantas-animales')).toBeNull();
    expect(screen.queryByTestId('bloque-consultar')).toBeNull();
    expect(screen.queryByTestId('destacado-tiles')).toBeNull();
    expect(screen.queryByTestId('aprender-tiles')).toBeNull();
    expect(screen.queryByTestId('mercado-tiles')).toBeNull();
    expect(screen.queryByTestId('seguimiento-cards')).toBeNull();
  });

  test('el pie mantiene FAQ y Ayuda alcanzables', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    const pie = await screen.findByTestId('footer-ayuda');
    fireEvent.click(within(pie).getByRole('button', { name: /Preguntas frecuentes/ }));
    expect(onNavigate).toHaveBeenCalledWith('faq');
    fireEvent.click(within(pie).getByRole('button', { name: /^Ayuda$/ }));
    expect(onNavigate).toHaveBeenCalledWith('ayuda');
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
    // DESTACADO con labels legacy + "Mi mata está enferma" (fix de huérfana
    // 2026-07: SanidadSintomaScreen existía sin entrada visible en prod).
    const destacado = screen.getByTestId('destacado-tiles');
    expect(within(destacado).getAllByRole('button').map(labelOf))
      .toEqual(['Mi mata está enferma', 'Especies', 'Calendario']);
    // GESTIÓN con label legacy "Insumos aplicados" (no "Abonos e insumos").
    const gestion = screen.getByTestId('gestion-tiles');
    expect(within(gestion).getAllByRole('button').map(labelOf))
      .toEqual(['Semilleros', 'Cosechar', 'Insumos aplicados', 'Mantenimiento']);
  });

  test('"Mi mata está enferma" es alcanzable desde el home de prod (ya NO huérfana)', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);
    const destacado = await screen.findByTestId('destacado-tiles');
    const tile = within(destacado)
      .getAllByRole('button')
      .find((b) => labelOf(b) === 'Mi mata está enferma');
    expect(tile).toBeTruthy();
    fireEvent.click(tile);
    expect(onNavigate).toHaveBeenCalledWith('sanidad_sintoma', undefined);
  });
});
