/**
 * ConoceChagra.test.jsx — recorrido guiado "Conoce Chagra" (tour opt-in).
 *
 * Cubre:
 *   1. Escena 1 (la mano) + Saltar siempre visible.
 *   2. Avanzar por las 7 escenas hasta el cierre; "Empezar a andar mi finca"
 *      cierra y deja la huella '1' en localStorage.
 *   3. Saltar cierra y deja huella (skippeable desde cualquier escena).
 *   4. La escena de mundos pinta los MUNDOS REALES (fuente única
 *      mundosFinca.js — si un mundo cambia, el tour lo refleja solo).
 *   5. "Ver todo lo que Chagra hace" navega a la ayuda.
 *   6. Honestidad del copy: infraestructura propia (no "on-device") y la
 *      aclaración de que el agente sí necesita señal.
 *   7. ConoceChagraInvite: auto-oferta una sola vez (huella la silencia),
 *      "Ahora no" persiste 'omitido', "Verlo" dispara onStart.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ConoceChagra from '../ConoceChagra.jsx';
import { ESCENAS } from '../escenasConoce.jsx';
import ConoceChagraInvite from '../ConoceChagraInvite.jsx';
import { CONOCE_VISTO_KEY } from '../conoceVisto.js';
import { MUNDOS_FINCA } from '../../dashboard/mundosFinca.js';

beforeEach(() => {
  window.localStorage.clear();
});

const avanzarHasta = (escenaIdx) => {
  for (let i = 0; i < escenaIdx; i += 1) {
    fireEvent.click(screen.getByTestId('cnc-siguiente'));
  }
};

describe('ConoceChagra (el recorrido)', () => {
  it('tiene 7 escenas con ids únicos', () => {
    expect(ESCENAS).toHaveLength(7);
    expect(new Set(ESCENAS.map((e) => e.id)).size).toBe(7);
  });

  it('abre en la escena de la mano, con Saltar visible', () => {
    render(<ConoceChagra onClose={vi.fn()} />);
    expect(screen.getByText('Su mano en el campo.')).toBeInTheDocument();
    expect(screen.getByTestId('cnc-saltar')).toBeInTheDocument();
    // Al abrir deja huella "abierto" (el invite no vuelve a insistir).
    expect(window.localStorage.getItem(CONOCE_VISTO_KEY)).toBe('abierto');
  });

  it('recorre las 7 escenas y al final "Empezar" cierra con huella', () => {
    const onClose = vi.fn();
    render(<ConoceChagra onClose={onClose} />);
    ESCENAS.forEach((esc, i) => {
      expect(screen.getByTestId('conoce-chagra')).toHaveAttribute('data-escena', esc.id);
      expect(screen.getByText(esc.titulo)).toBeInTheDocument();
      if (i < ESCENAS.length - 1) fireEvent.click(screen.getByTestId('cnc-siguiente'));
    });
    fireEvent.click(screen.getByText('Empezar a andar mi finca'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(CONOCE_VISTO_KEY)).toBe('1');
  });

  it('Saltar cierra desde cualquier escena y deja huella', () => {
    const onClose = vi.fn();
    render(<ConoceChagra onClose={onClose} />);
    avanzarHasta(2);
    fireEvent.click(screen.getByTestId('cnc-saltar'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(CONOCE_VISTO_KEY)).toBe('1');
  });

  it('la escena de mundos pinta TODOS los mundos reales de mundosFinca.js', () => {
    render(<ConoceChagra onClose={vi.fn()} />);
    const idx = ESCENAS.findIndex((e) => e.id === 'mundos');
    avanzarHasta(idx);
    MUNDOS_FINCA.forEach((m) => {
      expect(screen.getByTestId(`cnc-mundo-${m.id}`)).toBeInTheDocument();
      expect(screen.getByText(m.titulo)).toBeInTheDocument();
    });
  });

  it('"Ver todo lo que Chagra hace" navega a la ayuda con huella', () => {
    const onNavigate = vi.fn();
    render(<ConoceChagra onClose={vi.fn()} onNavigate={onNavigate} />);
    avanzarHasta(ESCENAS.length - 1);
    fireEvent.click(screen.getByTestId('cnc-ver-todo'));
    expect(onNavigate).toHaveBeenCalledWith('ayuda');
    expect(window.localStorage.getItem(CONOCE_VISTO_KEY)).toBe('1');
  });

  it('copy honesto: infraestructura propia y agente-necesita-señal', () => {
    const textos = ESCENAS.map((e) => `${e.titulo} ${e.sub}`).join(' ');
    expect(textos).toMatch(/infraestructura propia/);
    expect(textos).toMatch(/agente sí necesita señal/);
    // Anti-sobrepromesa: nunca afirmar on-device ni "todo funciona sin internet".
    expect(textos).not.toMatch(/on.device/i);
  });

  it('navega con las flechas del teclado y Escape salta', () => {
    const onClose = vi.fn();
    render(<ConoceChagra onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByTestId('conoce-chagra')).toHaveAttribute('data-escena', ESCENAS[1].id);
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByTestId('conoce-chagra')).toHaveAttribute('data-escena', ESCENAS[0].id);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ConoceChagraInvite (auto-oferta de primera vez)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('aparece tras el retraso de cortesía si no hay huella', () => {
    render(<ConoceChagraInvite onStart={vi.fn()} />);
    expect(screen.queryByTestId('conoce-invite')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId('conoce-invite')).toBeInTheDocument();
  });

  it('NO aparece si ya hay huella (visto/omitido/abierto)', () => {
    window.localStorage.setItem(CONOCE_VISTO_KEY, 'omitido');
    render(<ConoceChagraInvite onStart={vi.fn()} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByTestId('conoce-invite')).not.toBeInTheDocument();
  });

  it('"Verlo" dispara onStart y deja huella', () => {
    const onStart = vi.fn();
    render(<ConoceChagraInvite onStart={onStart} />);
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByTestId('conoce-invite-ver'));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(CONOCE_VISTO_KEY)).toBe('abierto');
  });

  it('"Ahora no" la descarta para siempre', () => {
    render(<ConoceChagraInvite onStart={vi.fn()} />);
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByTestId('conoce-invite-cerrar'));
    expect(screen.queryByTestId('conoce-invite')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(CONOCE_VISTO_KEY)).toBe('omitido');
  });
});
