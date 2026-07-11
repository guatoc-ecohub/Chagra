import React from 'react';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach } from 'vitest';

import Efectos2D from '../Efectos2D.jsx';
import Mundo2D from '../../visual/mundo3d/Mundo2D.jsx';
import { MUNDO } from '../../visual/mundo3d/mundoData.js';

afterEach(() => cleanup());

describe('Efectos2D — vitrina de los gemelos 2D', () => {
  test('monta la vitrina con los cuatro gemelos, three-free', () => {
    const { container, getByText } = render(<Efectos2D />);
    expect(getByText('Los gemelos 2D de los mundos 3D')).toBeInTheDocument();
    // una tarjeta por gemelo, cada una con su escena 2D
    const escenas = container.querySelectorAll('.ef2d-card .mundo2d');
    expect(escenas).toHaveLength(4);
    // los cuatro gemelos dibujan un SVG legible
    expect(container.querySelectorAll('.gemelo2d__svg')).toHaveLength(4);
  });

  test('cada gemelo 2D renderiza con los datos REALES de su mundo', () => {
    const casos = [
      { escena: 'corte2d', mundo: 'suelo' },
      { escena: 'flujo2d', mundo: 'agua' },
      { escena: 'recinto2d', mundo: 'animales' },
      { escena: 'estratos2d', mundo: 'disenio' },
    ];
    casos.forEach(({ escena, mundo }) => {
      const d = MUNDO[mundo];
      const { container } = render(
        <Mundo2D
          escena={escena}
          motivo={mundo}
          entrada={{ ...d, params: d.params, hotspots: d.hotspots }}
          tinte={['#3f8f4e', '#dcedc9']}
          onHotspot={() => {}}
        />,
      );
      // dibuja el poster SVG del gemelo
      expect(container.querySelector('.gemelo2d__svg')).toBeInTheDocument();
      // los hotspots del mundo son botones reales (target táctil)
      const botones = container.querySelectorAll('.gemelo2d__hotspot');
      expect(botones.length).toBe((d.hotspots || []).length);
      cleanup();
    });
  });
});
