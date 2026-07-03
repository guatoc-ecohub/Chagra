import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Info } from 'lucide-react';
import { SeccionAnimal, FichaAnimalHero } from '../SeccionAnimal';

const TONE = {
  border: 'border-amber-600/40',
  bg: 'bg-gradient-to-br from-amber-600/25 to-yellow-500/10',
  halo: 'bg-amber-400/20',
  chip: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
  aporte: 'text-amber-300',
};

describe('SeccionAnimal', () => {
  it('renderiza título y contenido', () => {
    render(
      <SeccionAnimal
        Icon={Info}
        color={{ border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200', bar: 'from-sky-400 to-cyan-300' }}
        titulo="Registro básico"
      >
        <p>Contenido de la sección</p>
      </SeccionAnimal>,
    );
    expect(screen.getByRole('heading', { name: /registro básico/i })).toBeInTheDocument();
    expect(screen.getByText('Contenido de la sección')).toBeInTheDocument();
  });

  it('no rompe sin cinta de acento (color.bar opcional)', () => {
    render(
      <SeccionAnimal
        color={{ border: 'border-sky-700/40', bg: 'bg-sky-900/20', text: 'text-sky-200' }}
        titulo="Sin cinta"
      >
        <p>ok</p>
      </SeccionAnimal>,
    );
    expect(screen.getByRole('heading', { name: /sin cinta/i })).toBeInTheDocument();
  });
});

describe('FichaAnimalHero', () => {
  it('renderiza emoji, título, chips de produce y aporte', () => {
    render(
      <FichaAnimalHero
        emoji="🐔"
        titulo="Gallinas y aves de corral"
        descripcion="Huevos, carne y gallinaza para su finca."
        produce={[
          { emoji: '🥚', label: 'Huevos' },
          { emoji: '🌱', label: 'Gallinaza (abono)' },
        ]}
        aporte="Aporte al ciclo: la gallinaza es ingrediente del bocashi"
        tone={TONE}
      />,
    );
    expect(screen.getByTestId('ficha-animal-hero')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /gallinas y aves de corral/i })).toBeInTheDocument();
    expect(screen.getByTestId('ficha-animal-produce')).toHaveTextContent('Huevos');
    expect(screen.getByTestId('ficha-animal-produce')).toHaveTextContent('Gallinaza (abono)');
    expect(screen.getByText(/ingrediente del bocashi/i)).toBeInTheDocument();
  });

  it('omite la fila de produce cuando viene vacía', () => {
    render(
      <FichaAnimalHero
        emoji="🐝"
        titulo="Abejas"
        descripcion="Polinización."
        produce={[]}
        aporte=""
        tone={TONE}
      />,
    );
    expect(screen.queryByTestId('ficha-animal-produce')).not.toBeInTheDocument();
  });
});
