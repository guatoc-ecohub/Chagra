/*
 * Vitrina #/mockups/mundo3d-suelo — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * monta el GEMELO 2D del corte (three-free): exactamente el camino del
 * device-tiering real en gama baja. Se congela que:
 *   · la página renderiza título + leyenda sin tocar three;
 *   · el gemelo trae los 3 puntos del corte como botones;
 *   · tocar una puerta cuenta a qué pantalla real de la app lleva (sin sesión
 *     la vitrina NO navega).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Mundo3DSuelo from '../Mundo3DSuelo.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo del suelo (mockups/mundo3d-suelo)', () => {
  test('renderiza el mundo en 2D digno con su leyenda didáctica', () => {
    const { container } = render(<Mundo3DSuelo />);
    expect(screen.getByRole('heading', { level: 1, name: 'El mundo del suelo' })).toBeInTheDocument();
    // jsdom no tiene WebGL → gemelo 2D (three-free), nunca pantalla rota
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    expect(container.querySelectorAll('.mundo2d__hotspot').length).toBe(3);
    // la leyenda enseña el corte capa por capa (esperanzadora, no alarmista)
    expect(screen.getByText('El suelo, capa por capa')).toBeInTheDocument();
    expect(screen.getByText('Las lombrices', { selector: 'b' })).toBeInTheDocument();
  });

  test('tocar una puerta del corte cuenta a qué pantalla real lleva', () => {
    render(<Mundo3DSuelo />);
    fireEvent.click(screen.getByRole('button', { name: 'Despierte su suelo' }));
    expect(screen.getByRole('status')).toHaveTextContent('«subsuelo»');
  });
});
