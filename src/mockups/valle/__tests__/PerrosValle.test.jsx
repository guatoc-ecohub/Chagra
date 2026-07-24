import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/drei', () => ({
  Html: ({ children, distanceFactor }) => (
    <div data-testid="html-billboard" data-distance-factor={distanceFactor}>
      {children}
    </div>
  ),
}));

vi.mock('../../../visual/creatures/Dalmata.jsx', () => ({
  Dalmata: (props) => <i data-testid="dalmata" data-props={JSON.stringify(props)} />,
}));

vi.mock('../../../visual/creatures/Beagle.jsx', () => ({
  Beagle: (props) => <i data-testid="beagle" data-props={JSON.stringify(props)} />,
}));

import { PerrosValle } from '../PerrosValle.jsx';

afterEach(cleanup);

function propsDe(elemento) {
  return JSON.parse(elemento.getAttribute('data-props'));
}

describe('PerrosValle', () => {
  test('monta un dalmata y un beagle separados y posados en el terreno', () => {
    const alturaDe = vi.fn(() => 2);
    const { container, getAllByTestId, getByTestId } = render(
      <PerrosValle alturaDe={alturaDe} tier="medio" />,
    );

    expect(getAllByTestId('html-billboard')).toHaveLength(2);
    expect(container.querySelectorAll('.valle-critter[data-perro]')).toHaveLength(2);
    expect(alturaDe.mock.calls).toEqual([
      [-2.5, 3.25],
      [0.85, 3.85],
    ]);

    const [[x1, z1], [x2, z2]] = alturaDe.mock.calls;
    expect(Math.hypot(x2 - x1, z2 - z1)).toBeGreaterThan(3);
    expect(propsDe(getByTestId('dalmata'))).toMatchObject({
      size: 42,
      animated: true,
      tier: 'medio',
      vida: true,
    });
    expect(propsDe(getByTestId('beagle'))).toMatchObject({
      size: 38,
      animated: true,
      tier: 'medio',
      vida: true,
    });
  });

  test('congela la vida de ambos perros con movimiento reducido', () => {
    const { getByTestId } = render(
      <PerrosValle alturaDe={() => 0} tier="bajo" reducedMotion />,
    );

    expect(propsDe(getByTestId('dalmata'))).toMatchObject({
      animated: false,
      tier: 'bajo',
      vida: false,
    });
    expect(propsDe(getByTestId('beagle'))).toMatchObject({
      animated: false,
      tier: 'bajo',
      vida: false,
    });
  });

  test('queda conectado a la escena del valle con el mismo contrato', () => {
    const vallePath = resolve('src/mockups/valle/Valle3D.jsx');
    const valleSource = readFileSync(vallePath, 'utf8');

    expect(valleSource).toMatch(
      /import\s+\{\s*PerrosValle\s*\}\s+from\s+'\.\/PerrosValle\.jsx';/,
    );
    expect(valleSource).toMatch(
      /<PerrosValle\s+alturaDe=\{alturaTerreno\}\s+tier=\{tier\}\s+reducedMotion=\{reducedMotion\}\s*\/>/,
    );
  });
});
