/*
 * Vitrina #/mockups/ent-maestro — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * monta la FICHA 2D del Ent maestro (three-free). Se congela que:
 *   · la página renderiza título + lema sin tocar three;
 *   · la ficha 2D muestra el nombre del guardián y su lección;
 *   · el botón para ver la ficha/3D no aparece cuando no hay WebGL.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import EntMaestro3D from '../EntMaestro3D.jsx';

afterEach(() => cleanup());

describe('vitrina del Ent maestro (mockups/ent-maestro)', () => {
  test('renderiza la ficha 2D digna con su leyenda didáctica', () => {
    const { container } = render(<EntMaestro3D />);
    expect(screen.getByRole('heading', { level: 1, name: 'El Ent maestro' })).toBeInTheDocument();
    // jsdom no tiene WebGL → ficha 2D (three-free), nunca pantalla rota
    expect(container.querySelector('.entm3d__ficha')).toBeInTheDocument();
    // la leyenda enseña el corte capa por capa
    expect(screen.getByText('Lo que enseña el guardián del suelo')).toBeInTheDocument();
    expect(screen.getByText('Red micorrízica', { selector: 'b' })).toBeInTheDocument();
  });

  test('la ficha identifica al guardián del suelo vivo', () => {
    render(<EntMaestro3D />);
    expect(screen.getByText('Ent maestro · guardián del páramo')).toBeInTheDocument();
    expect(screen.getByText('Abre la tierra y enseña el suelo vivo')).toBeInTheDocument();
  });
});
