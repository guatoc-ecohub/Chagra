import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => <div data-testid="lienzo-3d">{children}</div>,
}));

vi.mock('@react-three/drei', () => ({ OrbitControls: () => null }));

vi.mock('../../../visual/mundo3d/deviceTier.js', () => ({
  decidirTier: () => ({ tier: 'alto' }),
  permite3D: () => true,
}));

vi.mock('../../../visual/mundo3d/infraestructura/Infraestructura.jsx', () => ({
  default: () => <div data-testid="infraestructura-base" />,
}));

vi.mock('../../../visual/mundo3d/infraestructura/InfraestructuraViva.jsx', () => ({
  default: ({ tipo }) => <div data-testid="infraestructura-viva" data-tipo={tipo} />,
}));

import VitrinaInfraestructura from '../VitrinaInfraestructura.jsx';
import {
  INFRAESTRUCTURA,
  INFRAESTRUCTURA_CATEGORIAS,
} from '../../../visual/mundo3d/infraestructura/infraestructuraData.js';

afterEach(() => cleanup());

describe('VitrinaInfraestructura', () => {
  test('monta InfraestructuraViva en los dioramas del catálogo', () => {
    const { container } = render(<VitrinaInfraestructura />);
    const categoriaInicial = INFRAESTRUCTURA_CATEGORIAS[0];
    const esperadas = Object.values(INFRAESTRUCTURA).filter(
      (pieza) => pieza.categoria === categoriaInicial,
    );

    expect(screen.getByRole('heading', { name: 'Vitrina de infraestructura' })).toBeInTheDocument();
    expect(screen.getAllByTestId('infraestructura-viva')).toHaveLength(esperadas.length);
    expect(container.querySelector('[data-testid="infraestructura-base"]')).toBeNull();
  });
});
