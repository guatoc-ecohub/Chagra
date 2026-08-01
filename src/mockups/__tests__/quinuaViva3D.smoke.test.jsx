/*
 * Vitrina #/mockups/quinua-viva-3d — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * monta la FICHA con las dos panojas (three-free) en vez de `MundoQuinua`
 * (Canvas/@react-three): exactamente el camino real del device-tiering en
 * gama baja. Congela que el cableo del huérfano (QuinuaViva3D.jsx no tenía
 * entrada en el router de App.jsx) quedó completo:
 *   · la página renderiza título + la ficha didáctica, sin tocar three;
 *   · la ficha trae las dos panojas (glomerulada y amarantiforme) rotuladas;
 *   · los 4 saberes del quinual aparecen.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import QuinuaViva3D from '../QuinuaViva3D.jsx';

afterEach(() => cleanup());

describe('vitrina del mundo de la quinua (mockups/quinua-viva-3d)', () => {
  test('renderiza la ficha 2D digna con su lección', () => {
    const { container } = render(<QuinuaViva3D />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'El quinual maduro de la tierra fría' }),
    ).toBeInTheDocument();

    // jsdom no tiene WebGL → ficha con las dos panojas (three-free)
    expect(container.querySelector('.qviva__ficha')).toBeInTheDocument();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.qviva__panoja--glom')).toBeInTheDocument();
    expect(container.querySelector('.qviva__panoja--amar')).toBeInTheDocument();

    // los 4 saberes verificados del quinual
    expect(screen.getByText('Hay dos formas de panoja', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('El color dice la variedad', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('Se trilla y se avienta', { selector: 'b' })).toBeInTheDocument();
    expect(screen.getByText('Y se le lava lo amargo', { selector: 'b' })).toBeInTheDocument();
  });
});
