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
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
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

  /* Desde 2026-07-22 'calido' YA tiene Ent (la ceiba): el caso dejó de ser
     "piso sin tallar" y pasó a ser un protagonista más. El PR de la ceiba
     (#2691) entró sin actualizar esta aserción y el archivo quedó rojo en dev. */
  test('perfil cálido → protagonista cálido (ceiba), vecino templado (el de arriba)', () => {
    perfilRef.current = { pisoTermico: 'calido' };
    render(<TresEntsGradiente3D />);
    const escena = screen.getByTestId('escena-stub');
    expect(escena).toHaveAttribute('data-foco', 'calido');
    expect(escena).toHaveAttribute('data-pisos-visibles', 'calido,templado');
  });

  test('un piso sin Ent tallado (desconocido) cae al mismo default', () => {
    perfilRef.current = { pisoTermico: 'glacial' };
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
    /* El grupo de navegación trae EXACTAMENTE un botón por Ent. Fuera del
       grupo puede vivir otro cromo (p. ej. «Leer más» de la carta plegable en
       teléfono) — lo que este test cuida es que la navegación nunca ofrezca
       un camino de vuelta a "los tres juntos". */
    const grupo = screen.getByRole('group', { name: /los ents del gradiente/i });
    const botones = within(grupo).getAllByRole('button');
    /* El orden es el de PISOS_CON_ENT (cálido→páramo): con la ceiba adentro
       son CUATRO botones — y sigue sin existir un "verlos todos juntos". */
    expect(botones.map((b) => b.textContent)).toEqual(['La ceiba', 'El roble', 'El aliso', 'La queñua']);
    expect(screen.queryByRole('button', { name: /los tres/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /los cuatro/i })).not.toBeInTheDocument();
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
