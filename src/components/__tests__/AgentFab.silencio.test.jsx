/**
 * AgentFab.silencio.test.jsx — verifica que el interruptor de silencio
 * (auditoría 2026-07-26, ítems #101/#103) esté REALMENTE cableado a la UI,
 * no solo presente en el store sin nadie que lo llame.
 *
 * Dos caminos al mismo flag `useAngelitaStore.silenciar`:
 *   1. el botón visible pegado al personaje (🔔/🔕, aria-pressed).
 *   2. mantener presionado el personaje mismo (pulsación larga, 600ms).
 *
 * Español de Colombia (usted), sin voseo.
 */
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AgentFab from '../AgentFab';
import useAngelitaStore from '../../store/useAngelitaStore';

beforeEach(() => {
  useAngelitaStore.setState({ silenciado: false });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('AgentFab — interruptor de silencio (#101/#103)', () => {
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

  it('mantener presionado el personaje (600ms) silencia sin abrir el agente', () => {
    const onNavigate = vi.fn();
    render(<AgentFab onNavigate={onNavigate} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje);
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(useAngelitaStore.getState().silenciado).toBe(true);

    // El gesto largo fue "cállese", no "hábleme": el click que sigue al
    // touchend no debe además navegar al agente.
    fireEvent.touchEnd(personaje);
    fireEvent.click(personaje);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('una pulsación corta (menor a 600ms) NO silencia y sí abre el agente', () => {
    const onNavigate = vi.fn();
    render(<AgentFab onNavigate={onNavigate} />);
    const personaje = screen.getByRole('button', { name: /Chagra IA/i });

    fireEvent.touchStart(personaje);
    act(() => {
      vi.advanceTimersByTime(150);
    });
    fireEvent.touchEnd(personaje);
    expect(useAngelitaStore.getState().silenciado).toBe(false);

    fireEvent.click(personaje);
    expect(onNavigate).toHaveBeenCalled();
  });
});
