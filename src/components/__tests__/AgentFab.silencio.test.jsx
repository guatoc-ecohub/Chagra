/**
 * AgentFab.silencio.test.jsx — verifica que el interruptor de silencio
 * (auditoría 2026-07-26, ítems #101/#103) esté REALMENTE cableado a la UI,
 * no solo presente en el store sin nadie que lo llame. Actualizado 2026-07-30
 * (#66/#70): el gesto largo dejó de silenciar y pasó a "hablar directo" — el
 * silencio manual queda SOLO en el botón visible 🔔/🔕; el "hoy no" (#107)
 * vive en el menú del toque corto (AgentFabMenu.test.jsx cubre ese camino).
 *
 * Actualizado 2026-08-27 (superficie del FAB, decisión del operador):
 *   - TAP = PEEK: el toque asoma la pizarra con el último aviso +
 *     Ver / Escuchar / Callar (BurbujaPizarraPeek), ya NO un menú.
 *   - El menú compacto de siempre (Hablar / Enviar foto / callar-hoy) queda un
 *     paso más adentro, tras "Más opciones" del peek.
 *   - LONG-PRESS = 1600 ms (antes 600) → «Hola Chagra» escuchando.
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AgentFab from '../AgentFab';
import useAngelitaStore from '../../store/useAngelitaStore';
import useAgentNotificationStore from '../../store/useAgentNotificationStore';
import { EVENTO_ESCUCHA } from '../../services/escuchaService';

// Abre el menú compacto: toca el compai (asoma el peek) y pulsa "Más opciones".
function abrirMenu() {
  fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
  fireEvent.click(screen.getByRole('button', { name: /Más opciones/i }));
}

beforeEach(() => {
  useAngelitaStore.setState({ silenciado: false });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('AgentFab — interruptor de silencio manual (#101/#103)', () => {
  it('el botón (visible al tocar el compai) alterna silenciado en el store', () => {
    render(<AgentFab onNavigate={() => {}} />);
    // Política v2 (operador 2026-08-24): el ícono de silencio se ve SOLO al
    // tocar el compai, no tapa la cara en reposo. MouseDown representa ese
    // estado de interacción en jsdom.
    fireEvent.mouseDown(screen.getByRole('button', { name: /Chagra IA/i }));
    const boton = screen.getByRole('button', { name: /Que Angelita se quede callada/i });
    expect(boton).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(boton);
    expect(useAngelitaStore.getState().silenciado).toBe(true);

    const botonActivo = screen.getByRole('button', { name: /Volver a oír a Angelita/i });
    expect(botonActivo).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(botonActivo);
    expect(useAngelitaStore.getState().silenciado).toBe(false);
  });

  it('en reposo (sin hover, sin silenciar) el ícono NO se ve — no tapa la cara (v2)', () => {
    render(<AgentFab onNavigate={() => {}} />);
    // Sin tocar el compai, el botón de silencio queda display:none → inaccesible.
    expect(
      screen.queryByRole('button', { name: /Que su compañero se quede callado/i })
    ).toBeNull();
  });

  it('se revela al acercarse, enfocar, tocar o abrir el menú', () => {
    render(<AgentFab onNavigate={() => {}} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });
    const botonSilencio = () => screen.getByRole('button', { name: /Que Angelita se quede callada/i });

    fireEvent.mouseEnter(personaje);
    expect(botonSilencio()).toBeInTheDocument();
    fireEvent.mouseLeave(personaje);

    fireEvent.focus(personaje);
    expect(botonSilencio()).toBeInTheDocument();
    fireEvent.blur(personaje);

    fireEvent.touchStart(personaje, { touches: [{ clientX: 0, clientY: 0 }] });
    expect(botonSilencio()).toBeInTheDocument();
    fireEvent.touchEnd(personaje);

    abrirMenu();
    expect(botonSilencio()).toBeInTheDocument();
  });
});

describe('AgentFab — gesto sobre el personaje (#66/#70, long-press 1600 ms)', () => {
  it('mantener presionado (1600ms) habla DIRECTO — activarEscucha, sin peek ni navegar', () => {
    const onNavigate = vi.fn();
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={onNavigate} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje, { touches: [{ clientX: 0, clientY: 0 }] });
    act(() => {
      vi.advanceTimersByTime(1650);
    });
    expect(onEscucha).toHaveBeenCalledTimes(1);
    // El gesto largo fue "hábleme", no "cállese": no silencia.
    expect(useAngelitaStore.getState().silenciado).toBe(false);

    // El click que sigue al touchend no debe además asomar el peek ni menú.
    fireEvent.touchEnd(personaje);
    fireEvent.click(personaje);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByTestId('compai-fab-peek')).not.toBeInTheDocument();
    expect(screen.queryByRole('menu', { name: /Menú de Chagra IA/i })).not.toBeInTheDocument();

    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });

  it('una pulsación corta (menor a 1600ms) asoma el PEEK, no navega ni habla', () => {
    const onNavigate = vi.fn();
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={onNavigate} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje, { touches: [{ clientX: 0, clientY: 0 }] });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.touchEnd(personaje);

    fireEvent.click(personaje);
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onEscucha).not.toHaveBeenCalled();
    // El toque asoma el PEEK de madera (no el menú vertical).
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    expect(screen.queryByRole('menu', { name: /Menú de Chagra IA/i })).not.toBeInTheDocument();

    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });
});

describe('AgentFab — peek del toque: Ver / Escuchar / Callar', () => {
  it('el peek muestra los tres controles claros', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    expect(screen.getByTestId('compai-fab-peek')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver el mensaje completo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escuchar este aviso en voz alta/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Que se quede callado$/i })).toBeInTheDocument();
  });

  it('peek → "Callar" silencia de verdad (useAngelitaStore.silenciar)', () => {
    render(<AgentFab onNavigate={() => {}} pantalla="mapa" />);
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    fireEvent.click(screen.getByRole('button', { name: /Que se quede callado$/i }));
    expect(useAngelitaStore.getState().silenciado).toBe(true);
    // Al callar, el peek se cierra.
    expect(screen.queryByTestId('compai-fab-peek')).not.toBeInTheDocument();
  });
});

describe('AgentFab — menú del toque corto, cableado VIVO (#66/#70)', () => {
  it('menú → "Hablar" activa el micrófono (mismo trigger que el gesto largo)', () => {
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={() => {}} />);
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Hablar$/i }));
    expect(onEscucha).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument(); // se cierra al elegir
    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });

  it('menú → "Enviar foto" navega al agente con autoOpenCamera', () => {
    const onNavigate = vi.fn();
    render(<AgentFab onNavigate={onNavigate} pantalla="mundo_cultivos" />);
    abrirMenu();
    // Buscar el menuitem con un regex flexible (el texto dice "Enviar una foto")
    fireEvent.click(screen.getByRole('menuitem', { name: /Enviar.*foto/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente', expect.objectContaining({
      autoOpenCamera: true,
      desdePantalla: 'mundo_cultivos',
    }));
  });

  it('menú → "Que se quede callado hoy" activa hoyNoActivo() REAL en el store (#107)', () => {
    useAngelitaStore.setState({ hoyNoFecha: null });
    render(<AgentFab onNavigate={() => {}} />);
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /Que se quede callado hoy/i }));
    expect(useAngelitaStore.getState().hoyNoActivo()).toBe(true);
    // Angelita queda en calma: entrarMundo con datos reales no debe hablar.
    useAngelitaStore.getState().entrarMundo('clima', { snapshot: { alertas_locales: [{}] } });
    expect(useAngelitaStore.getState().estado).toBe('calma');
  });

  it('cerrar el peek sin elegir nada registra una señal de molestia (#102/#106)', () => {
    useAngelitaStore.setState({ molestia: 0 });
    render(<AgentFab onNavigate={() => {}} />);
    // Toca el compai → asoma el peek; cerrarlo con Escape cuenta como molestia.
    fireEvent.click(screen.getByRole('button', { name: /Chagra IA/i }));
    const initialMolestia = useAngelitaStore.getState().molestia;
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(useAngelitaStore.getState().molestia).toBe(initialMolestia + 1);
  });
});

describe('AgentFab — cadencia adaptativa: señales de atención positiva (#102/#106)', () => {
  it('hablar directo (gesto largo) baja el contador de molestia', () => {
    useAngelitaStore.setState({ molestia: 5 });
    render(<AgentFab onNavigate={() => {}} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });
    fireEvent.touchStart(personaje, { touches: [{ clientX: 0, clientY: 0 }] });
    act(() => { vi.advanceTimersByTime(1650); });
    expect(useAngelitaStore.getState().molestia).toBeLessThan(5);
  });

  it('menú → "Hablar" también baja el contador de molestia', () => {
    useAngelitaStore.setState({ molestia: 5 });
    render(<AgentFab onNavigate={() => {}} />);
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Hablar$/i }));
    expect(useAngelitaStore.getState().molestia).toBeLessThan(5);
  });

  it('tocar el FAB con una respuesta esperando ("abrir el tip") baja el contador', () => {
    useAngelitaStore.setState({ molestia: 5 });
    useAgentNotificationStore.setState({ responseReady: true, lastAssistantMessage: 'hola' });
    render(<AgentFab onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Angelita \(Chagra IA\) tiene respuesta nueva/i }));
    expect(useAngelitaStore.getState().molestia).toBeLessThan(5);
    useAgentNotificationStore.setState({ responseReady: false, lastAssistantMessage: null });
  });
});

describe('AgentFab — unificación con EscuchaFab (#compai-mic-fab-unify)', () => {
  it('activarEscucha está disponible en el gesto largo (antes solo en EscuchaFab)', () => {
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={() => {}} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje, { touches: [{ clientX: 0, clientY: 0 }] });
    act(() => {
      vi.advanceTimersByTime(1650);
    });
    expect(onEscucha).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });

  it('activarEscucha está disponible en el menú "Hablar" (antes solo en EscuchaFab)', () => {
    const onEscucha = vi.fn();
    window.addEventListener(EVENTO_ESCUCHA, onEscucha);
    render(<AgentFab onNavigate={() => {}} />);
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Hablar$/i }));
    expect(onEscucha).toHaveBeenCalledTimes(1);
    window.removeEventListener(EVENTO_ESCUCHA, onEscucha);
  });

  it('ambos métodos de escucha usan la misma función activarEscucha', () => {
    const onEscuchaGestoLargo = vi.fn();
    const onEscuchaMenu = vi.fn();
    const handleGestoLargo = (e) => {
      if (e.detail?.fuente === 'compai_largo') {
        onEscuchaGestoLargo();
      }
    };
    const handleMenu = (e) => {
      if (e.detail?.fuente === 'compai_menu') {
        onEscuchaMenu();
      }
    };

    window.addEventListener(EVENTO_ESCUCHA, handleGestoLargo);
    render(<AgentFab onNavigate={() => {}} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    // Test gesto largo
    fireEvent.touchStart(personaje, { touches: [{ clientX: 0, clientY: 0 }] });
    act(() => { vi.advanceTimersByTime(1650); });
    expect(onEscuchaGestoLargo).toHaveBeenCalledTimes(1);

    // Test menú - necesitamos limpiar y volver a renderizar
    cleanup();
    window.removeEventListener(EVENTO_ESCUCHA, handleGestoLargo);
    window.addEventListener(EVENTO_ESCUCHA, handleMenu);
    render(<AgentFab onNavigate={() => {}} />);
    abrirMenu();
    fireEvent.click(screen.getByRole('menuitem', { name: /^Hablar$/i }));
    expect(onEscuchaMenu).toHaveBeenCalledTimes(1);

    window.removeEventListener(EVENTO_ESCUCHA, handleMenu);
  });
});
