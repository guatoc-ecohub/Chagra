import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test } from 'vitest';
import { cleanup } from '@testing-library/react';
import { FichasMural } from '../murales/FichasMural.jsx';
import { FICHAS_POR_MURAL } from '../murales/fichasMuralData.js';

afterEach(cleanup);

describe('fichas 2D dentro de los tres murales actuales', () => {
  test.each([
    ['cafe', ['diagnostico-foto', 'evidencia-ilustrada']],
    ['agua', ['gemelos-2d']],
    ['semillero', ['hoja-vida-mata']],
  ])('el mural de %s monta sus fichas y no las manda a otra ruta', (mundo, fichas) => {
    const { container } = render(<FichasMural mundo={mundo} />);
    const panel = container.querySelector(`[data-mundo="${mundo}"]`);

    expect(panel).toBeInTheDocument();
    expect([...panel.querySelectorAll('[data-ficha]')].map((item) => item.dataset.ficha))
      .toEqual(fichas);
    expect([...panel.querySelectorAll('[data-ficha-origen]')].map((item) => item.dataset.fichaOrigen))
      .toEqual(FICHAS_POR_MURAL[mundo].map((ficha) => ficha.origen));
    expect(panel.querySelectorAll('a')).toHaveLength(0);
  });

  test('el mural de cafe conserva ambas caras y permite mostrar la evidencia', () => {
    const { container } = render(<FichasMural mundo="cafe" />);
    const diagnostico = container.querySelector('[data-ficha="diagnostico-foto"]');
    const evidencia = container.querySelector('[data-ficha="evidencia-ilustrada"]');

    expect(diagnostico).not.toHaveAttribute('hidden');
    expect(evidencia).toHaveAttribute('hidden');

    fireEvent.click(screen.getByRole('tab', { name: 'Evidencia' }));

    expect(diagnostico).toHaveAttribute('hidden');
    expect(evidencia).not.toHaveAttribute('hidden');
    expect(screen.getByText('Proteja antes de la lluvia')).toBeVisible();
  });

  test('el mural de semillero permite recorrer la hoja de vida de la mata', () => {
    render(<FichasMural mundo="semillero" reducedMotion />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver etapa Cosecha' }));

    expect(screen.getByRole('heading', { name: 'Cosecha' })).toBeVisible();
    expect(screen.getByLabelText('Fichas del mural de semillero'))
      .toHaveAttribute('data-reduced-motion', 'true');
  });
});
