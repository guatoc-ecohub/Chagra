import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeciesAtlasStore } from '../../store/useSpeciesAtlasStore.js';

vi.mock('@react-three/fiber', () => ({
  Canvas: () => <div data-testid="atlas-canvas" />,
}));

vi.mock('@react-three/drei', () => ({
  Html: ({ children }) => <>{children}</>,
  OrbitControls: () => null,
}));

import SpeciesAtlas from './SpeciesAtlas.jsx';

describe('SpeciesAtlas', () => {
  beforeEach(() => useSpeciesAtlasStore.getState().reset());

  it('muestra estados, marcadores y quiz en una especie curada', () => {
    render(<SpeciesAtlas speciesId="zea_mays" commonName="Maíz criollo" />);

    expect(screen.getByRole('heading', { name: 'Atlas de Maíz criollo' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Brote/ })).toBeInTheDocument();
    expect(screen.getByText('Endospermo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Planta/ }));
    expect(screen.getByText('Mazorca')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Quiz escrito' }));
    expect(screen.getByText('¿Qué reserva domina dentro del grano de maíz?')).toBeInTheDocument();
  });

  it('degrada a ficha textual cuando no existe una lámina curada', () => {
    render(<SpeciesAtlas speciesId="espeletia_grandiflora" commonName="Frailejón" />);

    expect(screen.getByRole('heading', { name: 'Atlas de Frailejón' })).toBeInTheDocument();
    expect(screen.getByText(/todavía no tiene una lámina anatómica 3D curada/)).toBeInTheDocument();
    expect(screen.queryByTestId('atlas-canvas')).not.toBeInTheDocument();
  });
});
