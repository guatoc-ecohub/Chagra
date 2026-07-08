/**
 * Tests de EjemplosVoz — la tarjeta de ejemplos del modo campo:
 *  - encabezado honesto + micro-guía siempre visibles
 *  - con movimiento normal: al ABRIR los 3 ejemplos entran en cascada
 *    (acto de entrada), luego colapsa a UN ejemplo que ROTA cada ~4s
 *  - con prefers-reduced-motion: lista estática con los 3 ejemplos, sin timer
 *
 * Español colombiano (tú/usted), NUNCA voseo argentino.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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

  it('al abrir, los 3 ejemplos entran en cascada (acto de entrada)', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    // Acto 1: cascada con los 3 ejemplos visibles a la vez.
    expect(screen.getByTestId('ejemplos-voz-entrada')).toBeInTheDocument();
    EJEMPLOS_VOZ.forEach((e) => {
      expect(screen.getByText(e.frase)).toBeInTheDocument();
    });
    // El stagger va por CSS (animation-delay con --i): cada item lo declara.
    const items = screen.getByTestId('ejemplos-voz-entrada').querySelectorAll('.ejemplos-voz-entrada-item');
    expect(items).toHaveLength(3);
    // Todavía no hay carrusel montado.
    expect(screen.queryByTestId('ejemplos-voz-activo')).not.toBeInTheDocument();
  });

  it('tras la entrada colapsa a un ejemplo a la vez y rota cada ~4s', () => {
    mockMatchMedia(false);
    render(<EjemplosVoz />);
    // Deja pasar la coreografía de entrada en dos pasos — hold (~4.6s) y
    // salida (~0.45s) — porque el segundo timer se agenda en el re-render.
    act(() => { vi.advanceTimersByTime(4700); });
    act(() => { vi.advanceTimersByTime(500); });
    expect(screen.queryByTestId('ejemplos-voz-entrada')).not.toBeInTheDocument();
    // El carrusel arranca en el primero (el que dejó la cascada).
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[0].frase);
    expect(screen.queryByText(EJEMPLOS_VOZ[1].frase)).not.toBeInTheDocument();
    // Tras ~4s pasa al segundo.
    act(() => { vi.advanceTimersByTime(4200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[1].frase);
    // Y da la vuelta completa (tercero → primero).
    act(() => { vi.advanceTimersByTime(4200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[2].frase);
    act(() => { vi.advanceTimersByTime(4200); });
    expect(screen.getByTestId('ejemplos-voz-activo').textContent).toContain(EJEMPLOS_VOZ[0].frase);
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
    act(() => { vi.advanceTimersByTime(9000); });
    EJEMPLOS_VOZ.forEach((e) => {
      expect(screen.getByText(e.frase)).toBeInTheDocument();
    });
  });
});
