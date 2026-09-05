/**
 * AgentFab.politica.test.jsx — política dura del compai 2D
 * (POLITICA-COMPAI-COMPORTAMIENTO-2D-3D.md, unificación 2026-08-23):
 *   R2 — se ATENÚA cuando el usuario interactúa con la pantalla.
 *   R3/R5 — RETIRADAS (2026-09-03, feedback_pizarra_unico_aviso_compai): las
 *        burbujas AUTO-POP "enseña en idle" (R3, hint por ruta) y "aviso rico"
 *        (R5, mensaje adaptado con tipo/ánimo) competían con la pizarra —
 *        orden dura del operador: "el único que debe salir en toda la app es
 *        la pizarra, no más elementos para compai en ese sentido". Se
 *        retiraron los DOS render blocks y su testid (`compai-fab-hint`,
 *        `compai-fab-aviso`) — el contenido NO se perdió: sigue siendo
 *        exactamente lo que `contenidoPanel` calcula (mensaje vivo → última
 *        respuesta → explicación de la pantalla vía getHintForRuta), que es
 *        lo que `BurbujaPizarraPeek` muestra al TOCAR el compai (ver describe
 *        "R4" abajo). Este archivo prueba ahora que (a) esos testids nunca
 *        aparecen sin que el usuario toque nada, y (b) la información sigue
 *        alcanzable por el peek.
 *   R4 — al tocarlo, ASOMA el peek de pizarra (BurbujaPizarraPeek); su "Ver"
 *        abre el panel de lectura.
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

describe('AgentFab — R3 retirada: sin burbuja de enseñanza AUTO-POP', () => {
  it('en reposo NO aparece ninguna burbuja sola — solo la pizarra al tocar', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
    // La explicación de la pantalla (compaiExplicaPantallas, cableado
    // 2026-09-03: el texto de la pantalla SALE EN LA PIZARRA SIEMPRE) sigue
    // ahí, pero solo se lee TOCANDO el compai (peek, que muestra la
    // DESCRIPCIÓN del aviso de la ruta; el título vive en el panel "Ver").
    // El texto lo pinta <Typewriter> en grafemas — se busca por textContent
    // del contenedor, no por getByText (que exige un solo nodo de texto).
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    expect(screen.getByTestId('compai-fab-peek').textContent)
      .toContain('Su finca en el mapa, con sus lotes, aguas y siembras ubicados.');
  });

  it('sin pantalla tampoco hay burbuja sola (nunca la hubo, ahora es universal)', () => {
    render(<AgentFab onNavigate={() => {}} />);
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
  });

  it('silenciado (🔔): sigue sin burbuja sola (el silencio ya no tiene nada que tapar)', () => {
    useAngelitaStore.setState({ silenciado: true });
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
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

describe('AgentFab — R4 peek "Ver" abre el panel de lectura', () => {
  it('tocar el compai asoma el peek y su "Ver" muestra el panel con la explicación de la pantalla', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    // TAP = PEEK (decisión operador 2026-08-27): el toque asoma la PIZARRA
    // (BurbujaPizarraPeek, chalk, nunca madera) con el último aviso +
    // Ver/Escuchar/Callar (no un menú).
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Ver el mensaje completo/i }));
    expect(screen.getByTestId('compai-fab-panel')).toBeInTheDocument();
    // Cableado 2026-09-03: el título del panel ES el del manifiesto
    // (compaiExplicaPantallas) para las pantallas cubiertas.
    expect(screen.getByText('El mapa')).toBeInTheDocument();
  });
});

describe('AgentFab — R5 retirada: el aviso adaptado NO pinta su propia burbuja', () => {
  it('con respuesta real esperando, NO aparece ninguna burbuja sola — el avatar invita, y el mensaje está en la pizarra al tocar', () => {
    useAgentNotificationStore.setState({
      responseReady: true,
      lastAssistantMessage: 'En su zona se espera lluvia mañana en la tarde.',
    });
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    // Ni la burbuja rica retirada (R5) ni la de enseñanza (R3): CERO avisos
    // sueltos. La única señal de "hay algo nuevo" es el propio avatar
    // (estado 'invita' + .agt-avatar-glow, ver aria-label abajo).
    expect(screen.queryByTestId('compai-fab-aviso')).toBeNull();
    expect(screen.queryByTestId('compai-fab-hint')).toBeNull();
    expect(screen.getByRole('button', { name: /tiene respuesta nueva/i })).toBeInTheDocument();
    // El mensaje NO se perdió: tocar el compai lo muestra en la pizarra.
    fireEvent.click(screen.getByRole('button', { name: /tiene respuesta nueva/i }));
    expect(screen.getAllByText('En su zona se espera lluvia mañana en la tarde.').length).toBeGreaterThan(0);
  });

  it('ya no cablea la burbuja rica por tipo/ánimo (esa riqueza visual murió con R5): la pizarra es sobria para TODO tipo de aviso', () => {
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
    // Sin BurbujaAngelita montada sola: no hay clase rica `.angelita-burbuja--*`
    // en el DOM hasta que el usuario toque y abra la pizarra.
    expect(container.querySelector('.angelita-burbuja--alerta')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    // Tocar SÍ muestra el mensaje — en la pizarra sobria, sin variante "rica".
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    expect(screen.getAllByText('Revise la helada de esta noche.').length).toBeGreaterThan(0);
    expect(container.querySelector('.angelita-burbuja--alerta')).toBeNull();
  });
});
