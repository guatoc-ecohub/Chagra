/*
 * Vitrina #/mockups/mundo3d-animales — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * monta el GEMELO 2D del corral (three-free): exactamente el camino del
 * device-tiering real en gama baja. Se congela que:
 *   · la página renderiza título + leyenda sin tocar three;
 *   · el gemelo trae los 3 puntos del corral como botones;
 *   · tocar una puerta cuenta a qué pantalla real de la app lleva (sin sesión
 *     la vitrina NO navega).
 */
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Mundo3DAnimales from '../Mundo3DAnimales.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo de los animales (mockups/mundo3d-animales)', () => {
  test('renderiza el mundo en 2D digno con su leyenda didáctica', () => {
    const { container } = render(<Mundo3DAnimales />);
    expect(screen.getByRole('heading', { level: 1, name: 'El mundo de los animales' })).toBeInTheDocument();
    // jsdom no tiene WebGL → gemelo 2D (three-free), nunca pantalla rota
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    expect(container.querySelectorAll('.mundo2d__hotspot').length).toBe(3);
    // la leyenda enseña el ciclo del abono (esperanzadora, no alarmista)
    expect(screen.getByText('El ciclo del abono, eslabón por eslabón')).toBeInTheDocument();
    expect(screen.getByText('El escarabajo estercolero', { selector: 'b' })).toBeInTheDocument();
  });

  test('tocar una puerta del corral cuenta a qué pantalla real lleva', () => {
    render(<Mundo3DAnimales />);
    fireEvent.click(screen.getByRole('button', { name: 'Del corral al abono' }));
    expect(screen.getByRole('status')).toHaveTextContent('«estiercol»');
  });
});
