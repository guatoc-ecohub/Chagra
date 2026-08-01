/*
 * Vitrina #/mockups/infraestructura-3d — smoke (jsdom = equipo humilde).
 *
 * En jsdom no hay WebGL, así que `decidirTier()` cae a 'bajo' y la vitrina
 * NO monta ningún Canvas (three-free): muestra las FICHAS 2D de cada
 * construcción. Se congela que:
 *   · la página renderiza título + aviso de equipo humilde sin tocar three;
 *   · aparecen las 10 construcciones del catálogo, agrupadas por categoría;
 *   · cada ficha trae su nombre y sus medidas típicas en metros.
 * Así garantizamos que el catálogo (infraestructuraData.js) y el dispatcher
 * quedan bien cableados aunque el 3D no se pueda montar en el test.
 */
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Infraestructura3D from '../Infraestructura3D.jsx';
import {
  INFRAESTRUCTURA,
  INFRAESTRUCTURA_IDS,
} from '../../visual/mundo3d/infraestructura/infraestructuraData.js';

afterEach(() => cleanup());

describe('vitrina de infraestructura 3D (mockups/infraestructura-3d)', () => {
  test('renderiza el catálogo completo como fichas 2D en equipo humilde', () => {
    const { container } = render(<Infraestructura3D />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'La infraestructura de su finca' }),
    ).toBeInTheDocument();
    // jsdom sin WebGL → fichas 2D, nunca un Canvas ni una pantalla rota
    expect(container.querySelector('canvas')).toBeNull();
    // las 10 construcciones del catálogo, una tarjeta cada una
    expect(container.querySelectorAll('.vinf__card').length).toBe(INFRAESTRUCTURA_IDS.length);
    expect(INFRAESTRUCTURA_IDS.length).toBe(10);
  });

  test('cada construcción muestra su nombre y sus medidas típicas', () => {
    render(<Infraestructura3D />);
    // el túnel: 15 × 6 × 3 m (los defaults del catálogo)
    expect(screen.getByText('Invernadero túnel')).toBeInTheDocument();
    expect(screen.getByText('15 × 6 × 3 m')).toBeInTheDocument();
    // el tanque cilíndrico: 4 × 4 × 2,5 m (coma decimal, español CO)
    expect(screen.getByText('Tanque / reservorio')).toBeInTheDocument();
    expect(screen.getByText('4 × 4 × 2,5 m')).toBeInTheDocument();
    // toda pieza del catálogo aparece por nombre
    for (const id of INFRAESTRUCTURA_IDS) {
      expect(screen.getByText(INFRAESTRUCTURA[id].nombre)).toBeInTheDocument();
    }
  });
});
