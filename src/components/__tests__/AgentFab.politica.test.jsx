/**
 * AgentFab.politica.test.jsx — política dura del compai 2D
 * (POLITICA-COMPAI-COMPORTAMIENTO-2D-3D.md, unificación 2026-08-23):
 *   R2 — se ATENÚA cuando el usuario interactúa con la pantalla.
 *   R3 — ENSEÑA en idle (hint contextual de la ruta, plegado del CompaiOverlay),
 *        respetando silencio.
 *   R4 — al tocarlo, el menú ofrece "Ver" (leer el mensaje/panel).
 *   R5 — el mensaje ADAPTADO (respuesta lista) se pinta como burbuja de AVISO.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Los "avisos vivos" (clima / susurro nocturno / agroecología) empujan
// responseReady al montar según el reloj/datos reales → tapan la enseñanza en
// jsdom. Se neutralizan para aislar la política R2/R3/R4; R5 se prueba con un
// aviso EXPLÍCITO en el store.
vi.mock('../../hooks/useCompaiClimaVivo', () => ({ __esModule: true, default: () => {}, useCompaiClimaVivo: () => {} }));
vi.mock('../../hooks/useCompaiSusurroNocturno', () => ({ __esModule: true, default: () => {}, useCompaiSusurroNocturno: () => {} }));
vi.mock('../../hooks/useCompaiAgroecologiaReal', () => ({ __esModule: true, default: () => {}, useCompaiAgroecologiaReal: () => {} }));
vi.mock('../../services/angelitaInteligencia', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, notificacionesInteligentes: () => ({ hay: false }) };
});

import AgentFab from '../AgentFab';
import useAngelitaStore from '../../store/useAngelitaStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';

beforeEach(() => {
  useAngelitaStore.setState({ silenciado: false, hoyNoFecha: null });
  useAngelitaStore.setState({ estado: 'calma', visualEstado: 'acompana', mensaje: null, tipo: null });
  useAgentNotificationStore.setState({ responseReady: false, lastAssistantMessage: null });
});
afterEach(cleanup);

describe('AgentFab — R3 enseña en idle', () => {
  it('en reposo muestra la burbuja de enseñanza con el hint de la ruta', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    expect(screen.getByTestId('compai-fab-hint')).toBeInTheDocument();
    expect(screen.getByText('Su finca en el mapa')).toBeInTheDocument();
  });

  it('sin pantalla no fuerza enseñanza (no hay ruta que explicar)', () => {
    render(<AgentFab onNavigate={() => {}} />);
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
  });

  it('silenciado (🔔): NO enseña — respeta la anti-molestia del store', () => {
    useAngelitaStore.setState({ silenciado: true });
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
  });

  it('la ✕ oculta la enseñanza por esta entrada', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    fireEvent.click(screen.getByRole('button', { name: /Ocultar esta ayuda por ahora/i }));
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
  });
});

describe('AgentFab — política v2: visible 100%, NUNCA se oculta al interactuar', () => {
  // Corrección del operador 2026-08-24 (feedback_compai_politica_v2_visible_roam_natural):
  // el compai es VISIBLE 100% del tiempo. La ocultación anterior
  // (`oculto = interactuando && !hover` → visibility:hidden) era el bug de
  // "al onmouseover desaparece / ahora no sale ninguno". Al interactuar el
  // usuario, el compai vuelve a su posición natural, NO desaparece.
  it('un mouseover global NO oculta el compai (visible 100%)', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    const fab = screen.getByRole('button', { name: /Chagra IA/i });
    expect(fab.parentElement.style.visibility).toBe('visible');
    act(() => { window.dispatchEvent(new Event('mouseover')); });
    expect(fab.parentElement.style.visibility).toBe('visible');
  });

  it('un touchstart en la pantalla NO oculta el compai (sigue presente)', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    const fab = screen.getByRole('button', { name: /Chagra IA/i });
    act(() => { window.dispatchEvent(new Event('touchstart')); });
    expect(fab.parentElement.style.visibility).toBe('visible');
  });
});

describe('AgentFab — R4 menú "Ver" abre el panel de lectura', () => {
  it('tocar el compai → "Ver" muestra el panel con el hint', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Ver$/i }));
    expect(screen.getByTestId('compai-fab-panel')).toBeInTheDocument();
    expect(screen.getByText('Su finca en el mapa')).toBeInTheDocument();
  });
});

describe('AgentFab — R5 aviso adaptado visible en prod 2D', () => {
  it('con respuesta real esperando, pinta el MENSAJE como burbuja de aviso (no solo glow)', () => {
    useAgentNotificationStore.setState({
      responseReady: true,
      lastAssistantMessage: 'En su zona se espera lluvia mañana en la tarde.',
    });
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    expect(screen.getByTestId('compai-fab-aviso')).toBeInTheDocument();
    expect(screen.getAllByText('En su zona se espera lluvia mañana en la tarde.').length).toBeGreaterThan(0);
    // El aviso manda: no se pinta además la enseñanza (una cosa a la vez).
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
  });

  it('cablea la burbuja rica con tipo y ánimo del compai', () => {
    useAngelitaStore.setState({
      estado: 'aviso',
      visualEstado: 'preocupada',
      mensaje: 'Revise la helada de esta noche.',
      tipo: 'alerta',
    });
    useAgentNotificationStore.setState({
      responseReady: true,
      lastAssistantMessage: 'Revise la helada de esta noche.',
    });
    const { container } = render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    expect(container.querySelector('.angelita-burbuja--alerta')).toBeInTheDocument();
    expect(container.querySelector('[data-agt-estado="preocupada"]')).toBeInTheDocument();
  });
});
