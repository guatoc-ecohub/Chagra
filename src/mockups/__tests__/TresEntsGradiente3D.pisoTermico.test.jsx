/*
 * TresEntsGradiente3D — cablea el Ent protagonista al piso térmico del perfil.
 *
 * `EscenaTresEnts` se STUBEA a propósito: es la escena 3D pesada (bloque de
 * montaña, InstancedMesh de vegetación, Ents tallados) y montarla de verdad en
 * jsdom exige un mock de `@react-three/fiber` mucho más profundo del que trae
 * el repo hoy (los `useLayoutEffect` de `Banco`/`ChispasAgua`/`NodosRed` llaman
 * `mesh.setMatrixAt`/`setColorAt` sobre el nodo DOM real, que no es un
 * `THREE.InstancedMesh` — revienta en cualquier mock superficial). Lo que este
 * test verifica es la RESPONSABILIDAD de esta pantalla: qué `foco` y qué
 * `pisosVisibles` calcula y le pasa a la escena según el perfil, y qué botones
 * ofrece — no cómo se ve la ladera (eso lo prueba el screenshot del PR).
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated }) => {
    React.useEffect(() => onCreated?.(), [onCreated]);
    return <div data-testid="canvas">{children}</div>;
  },
  useFrame: vi.fn(),
  useThree: (selector) => selector({ size: { width: 800, height: 600 } }),
}));

vi.mock('@react-three/drei', () => ({
  AdaptiveDpr: () => null,
  OrbitControls: () => null,
}));

vi.mock('../../visual/mundo3d/bosque/EscenaTresEnts.jsx', () => ({
  default: ({ foco, pisosVisibles }) => (
    <div
      data-testid="escena-stub"
      data-foco={foco ?? ''}
      data-pisos-visibles={pisosVisibles ? pisosVisibles.join(',') : ''}
    />
  ),
}));

const perfilRef = { current: { pisoTermico: null } };
vi.mock('../../store/usePerfilFincaStore.js', () => ({
  default: (selector) => selector({ perfil: perfilRef.current }),
}));

import TresEntsGradiente3D from '../TresEntsGradiente3D.jsx';

afterEach(() => {
  cleanup();
  perfilRef.current = { pisoTermico: null };
});

describe('el Ent protagonista sale del piso térmico de la finca', () => {
  test('perfil frío → protagonista frío (aliso), vecino páramo — máximo dos', () => {
    perfilRef.current = { pisoTermico: 'frio' };
    render(<TresEntsGradiente3D />);
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'frio');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'frio,paramo');
  });

  test('perfil páramo → protagonista páramo (queñua), vecino frío (no tiene piso arriba)', () => {
    perfilRef.current = { pisoTermico: 'paramo' };
    render(<TresEntsGradiente3D />);
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'paramo');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'paramo,frio');
  });

  test('perfil templado → protagonista templado (roble), vecino frío', () => {
    perfilRef.current = { pisoTermico: 'templado' };
    render(<TresEntsGradiente3D />);
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'templado');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'templado,frio');
  });

  test('sin perfil (demo) cae al default templado+frío — nunca a "mostrar todo"', () => {
    perfilRef.current = { pisoTermico: null };
    render(<TresEntsGradiente3D />);
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'templado');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'templado,frio');
  });

  test('un piso sin Ent tallado todavía (calido) cae al mismo default', () => {
    perfilRef.current = { pisoTermico: 'calido' };
    render(<TresEntsGradiente3D />);
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'templado');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'templado,frio');
  });
});

describe('los botones — se conservan para ir a ver los otros, nunca "Los tres"', () => {
  test('hay un botón por Ent y NINGUNO ofrece ver los tres juntos', () => {
    perfilRef.current = { pisoTermico: 'frio' };
    render(<TresEntsGradiente3D />);
    const botones = screen.getAllByRole('button');
    expect(botones.map((b) => b.textContent)).toEqual(['El roble', 'El aliso', 'La queñua']);
    expect(screen.queryByRole('button', { name: /los tres/i })).not.toBeInTheDocument();
  });

  test('navegar a otro Ent reemplaza el par visible, nunca lo agrega a un tercero', () => {
    perfilRef.current = { pisoTermico: 'templado' }; // par inicial: templado, frio
    render(<TresEntsGradiente3D />);
    fireEvent.click(screen.getByRole('button', { name: 'La queñua' }));
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'paramo');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'paramo,frio');
  });
});
