/**
 * Tests de EjemplosVoz — la tarjeta de ejemplos del modo campo:
 *  - encabezado honesto + micro-guía siempre visibles
 *  - con movimiento normal: muestra UN ejemplo y ROTA cada ~6s (aria-live polite)
 *  - la rotación se PAUSA con hover/foco encima y se reanuda al salir
 *  - los puntos indicadores son botones que saltan a ese ejemplo
 *  - con prefers-reduced-motion: lista estática con los 3 ejemplos, sin timer
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import EjemplosVoz, { EJEMPLOS_VOZ } from '../EjemplosVoz.jsx';

const mockMatchMedia = (reduce) => {
  // Cast local: el stub solo trae lo que EjemplosVoz consulta (.matches);
  // tipar MediaQueryList completo acá no aporta nada al test (mismo patrón
  // de casts locales que modoCampoFlag.js frente al gate de tsc:check).
  window.matchMedia = /** @type {any} */ (vi.fn(() => ({
    matches: reduce,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })));
};

describe('EjemplosVoz', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('define exactamente 3 ejemplos, cada uno con capacidad distinta', () => {
    expect(EJEMPLOS_VOZ).toHaveLength(3);
    const capacidades = EJEMPLOS_VOZ.map((e) => e.capacidad);
    expect(new Set(capacidades).size).toBe(3);
    // Cada frase arranca con el wake-word real.
    EJEMPLOS_VOZ.forEach((e) => {
      expect(e.frase.toLowerCase()).toContain('hola chagra');
    });
  });

  it('muestra encabezado honesto y micro-guía', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    expect(screen.getByText('Háblele con las manos ocupadas')).toBeInTheDocument();
    expect(screen.getByTestId('ejemplos-voz-guia').textContent).toContain('«hola chagra»');
    expect(screen.getByTestId('ejemplos-voz-guia').textContent).toContain('enséñele su voz');
  });

  it('con movimiento normal muestra un ejemplo a la vez y rota cada ~6s', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    // Arranca en el primero.
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[0].frase);
    expect(screen.queryByText(EJEMPLOS_VOZ[1].frase)).not.toBeInTheDocument();
    // Tras ~6s pasa al segundo.
    act(() => { vi.advanceTimersByTime(6200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[1].frase);
    // Y da la vuelta completa (tercero → primero).
    act(() => { vi.advanceTimersByTime(6200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[2].frase);
    act(() => { vi.advanceTimersByTime(6200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[0].frase);
  });

  it('la escena anuncia el ejemplo vigente con aria-live polite', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    const escena = screen.getByTestId('ejemplos-voz-activo').parentElement;
    expect(escena.getAttribute('aria-live')).toBe('polite');
    expect(escena.getAttribute('aria-atomic')).toBe('true');
  });

  it('el cross-fade muestra brevemente el ejemplo saliente y luego lo desmonta', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    act(() => { vi.advanceTimersByTime(6200); });
    // Justo tras rotar, el primero sigue en el DOM desvaneciéndose (decorativo,
    // oculto a lectores de pantalla)…
    const saliente = screen.getByText(EJEMPLOS_VOZ[0].frase).closest('.ejemplos-voz-paso--sale');
    expect(saliente).not.toBeNull();
    expect(saliente.getAttribute('aria-hidden')).toBe('true');
    // …y al terminar la animación de salida se desmonta.
    act(() => { vi.advanceTimersByTime(600); });
    expect(screen.queryByText(EJEMPLOS_VOZ[0].frase)).not.toBeInTheDocument();
  });

  it('pausa la rotación con el mouse encima y la reanuda al salir', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    fireEvent.mouseEnter(screen.getByTestId('ejemplos-voz'));
    // Con hover no rota, aunque pase de sobra el intervalo.
    act(() => { vi.advanceTimersByTime(14000); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[0].frase);
    // Al quitar el mouse, retoma la rotación.
    fireEvent.mouseLeave(screen.getByTestId('ejemplos-voz'));
    act(() => { vi.advanceTimersByTime(6200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[1].frase);
  });

  it('pausa la rotación mientras el foco está dentro de la tarjeta', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    fireEvent.focus(screen.getByTestId('ejemplos-voz-punto-0'));
    act(() => { vi.advanceTimersByTime(14000); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[0].frase);
    fireEvent.blur(screen.getByTestId('ejemplos-voz-punto-0'));
    act(() => { vi.advanceTimersByTime(6200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[1].frase);
  });

  it('los puntos son botones que saltan directo a ese ejemplo', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    const punto2 = screen.getByTestId('ejemplos-voz-punto-2');
    expect(punto2.getAttribute('aria-label')).toContain(EJEMPLOS_VOZ[2].capacidad);
    fireEvent.click(punto2);
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[2].frase);
    expect(punto2.getAttribute('aria-current')).toBe('true');
    expect(screen.getByTestId('ejemplos-voz-punto-0').getAttribute('aria-current')).toBeNull();
  });

  it('con prefers-reduced-motion lista los 3 ejemplos estáticos, sin rotar', () => {
    mockMatchMedia(true);
    render(<EjemplosVoz />);
    expect(screen.getByTestId('ejemplos-voz-lista')).toBeInTheDocument();
    EJEMPLOS_VOZ.forEach((e) => {
      expect(screen.getByText(e.frase)).toBeInTheDocument();
    });
    // No hay carrusel montado.
    expect(screen.queryByTestId('ejemplos-voz-activo')).not.toBeInTheDocument();
    // Y avanzar el reloj no cambia nada (no hay interval vivo).
    act(() => { vi.advanceTimersByTime(13000); });
    EJEMPLOS_VOZ.forEach((e) => {
      expect(screen.getByText(e.frase)).toBeInTheDocument();
    });
  });
});
