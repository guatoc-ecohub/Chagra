/**
 * AgentFab.silencio.test.jsx — verifica que el interruptor de silencio
 * (auditoría 2026-07-26, ítems #101/#103) esté REALMENTE cableado a la UI,
 * no solo presente en el store sin nadie que lo llame. Actualizado 2026-07-30
 * (#66/#70): el gesto largo dejó de silenciar y pasó a "hablar directo" — el
 * silencio manual queda SOLO en el botón visible 🔔/🔕; el "hoy no" (#107)
 * vive en el menú del toque corto (AgentFabMenu.test.jsx cubre ese camino).
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AgentFab from '../AgentFab';
import useAngelitaStore from '../../store/useAngelitaStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';
import { EVENTO_ESCUCHA } from '../../services/escuchaService';

beforeEach(() => {
  useAngelitaStore.setState({ silenciado: false });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('AgentFab — interruptor de silencio manual (#101/#103)', () => {
  it('el botón visible alterna silenciado en el store', () => {
    render(<AgentFab onNavigate={() => {}} />);
    const boton = screen.getByRole('button', { name: /Que su compañero se quede callado/i });
    expect(boton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(boton);
    expect(useAngelitaStore.getState().silenciado).toBe(true);

    const botonActivo = screen.getByRole('button', { name: /Volver a oír a su compañero/i });
    expect(botonActivo).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(botonActivo);
    expect(useAngelitaStore.getState().silenciado).toBe(false);
  });
});

describe('AgentFab — gesto sobre el personaje (#66/#70)', () => {
  it('mantener presionado (600ms) habla DIRECTO — activarEscucha, sin abrir menú ni navegar', () => {
    const onNavigate = vi.fn();
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={onNavigate} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje);
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(onEscucha).toHaveBeenCalledTimes(1);
    // El gesto largo fue "hábleme", no "cállese": no silencia.
    expect(useAngelitaStore.getState().silenciado).toBe(false);

    // El click que sigue al touchend no debe además abrir el menú.
    fireEvent.touchEnd(personaje);
    fireEvent.click(personaje);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu', { name: /Menú de Chagra IA/i })).not.toBeInTheDocument();

    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });

  it('una pulsación corta (menor a 600ms) abre el MENÚ, no navega directo ni habla', () => {
    const onNavigate = vi.fn();
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={onNavigate} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.touchEnd(personaje);

    fireEvent.click(personaje);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onEscucha).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', { name: /Menú de Chagra IA/i })).toBeInTheDocument();

    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });
});

describe('AgentFab — menú del toque corto, cableado VIVO (#66/#70)', () => {
  it('menú → "Hablar" activa el micrófono (mismo trigger que el gesto largo)', () => {
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA, su compañero de Chagra/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Hablar$/i }));
    expect(onEscucha).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // se cierra al elegir
    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });

  it('menú → "Enviar foto" navega al agente con autoOpenCamera', () => {
    const onNavigate = vi.fn();
    render(<AgentFab onNavigate={onNavigate} pantalla="mundo_cultivos" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA, su compañero de Chagra/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Enviar foto/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      autoOpenCamera: true,
      desdePantalla: 'mundo_cultivos',
    }));
  });

  it('menú → "Que se quede callado hoy" activa hoyNoActivo() REAL en el store (#107)', () => {
    useAngelitaStore.setState({ hoyNoFecha: null });
    render(<AgentFab onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA, su compañero de Chagra/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Que se quede callado hoy/i }));
    expect(useAngelitaStore.getState().hoyNoActivo()).toBe(true);
    // Angelita queda en calma: entrarMundo con datos reales no debe hablar.
    useAngelitaStore.getState().entrarMundo('clima', { snapshot: { alertas_locales: [{}] } });
    expect(useAngelitaStore.getState().estado).toBe('calma');
  });

  it('cerrar el menú sin elegir nada registra una señal de molestia (#102/#106)', () => {
    useAngelitaStore.setState({ molestia: 0 });
    render(<AgentFab onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA, su compañero de Chagra/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useAngelitaStore.getState().molestia).toBeGreaterThan(0);
  });
});

describe('AgentFab — cadencia adaptativa: señales de atención positiva (#102/#106)', () => {
  it('hablar directo (gesto largo) baja el contador de molestia', () => {
    useAngelitaStore.setState({ molestia: 5 });
    render(<AgentFab onNavigate={() => {}} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });
    fireEvent.touchStart(personaje);
    act(() => { vi.advanceTimersByTime(650); });
    expect(useAngelitaStore.getState().molestia).toBeLessThan(5);
  });

  it('menú → "Hablar" también baja el contador de molestia', () => {
    useAngelitaStore.setState({ molestia: 5 });
    render(<AgentFab onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA, su compañero de Chagra/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /^Hablar$/i }));
    expect(useAngelitaStore.getState().molestia).toBeLessThan(5);
  });

  it('tocar el FAB con una respuesta esperando ("abrir el tip") baja el contador', () => {
    useAngelitaStore.setState({ molestia: 5 });
    useAgentNotificationStore.setState({ responseReady: true, lastAssistantMessage: 'hola' });
    render(<AgentFab onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA tiene respuesta nueva/i }));
    expect(useAngelitaStore.getState().molestia).toBeLessThan(5);
    useAgentNotificationStore.setState({ responseReady: false, lastAssistantMessage: null });
  });
});
