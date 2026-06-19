import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import MundoSubsuelo from '../MundoSubsuelo';

describe('MundoSubsuelo', () => {
  it('renderiza el juego con medidor, guias y cartas de decision', () => {
    render(<MundoSubsuelo />);

    expect(screen.getByTestId('mundo-subsuelo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Mundo Subsuelo' })).toBeInTheDocument();
    expect(screen.getByText('Lombricita')).toBeInTheDocument();
    expect(screen.getByText('Miquito')).toBeInTheDocument();
    expect(screen.getByText('Vida del suelo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compost y bocashi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Exceso quimico/i })).toBeInTheDocument();
  });

  it('una decision de compost sube la vida del suelo y despierta actividad visible', () => {
    render(<MundoSubsuelo />);

    const meter = screen.getByTestId('vida-suelo-valor');
    expect(meter).toHaveTextContent('48');

    fireEvent.click(screen.getByRole('button', { name: /Compost y bocashi/i }));

    expect(meter).toHaveTextContent('62');
    expect(screen.getByText('Logro: Despertaste comida para la red viva')).toBeInTheDocument();
    expect(screen.getByTestId('mundo-subsuelo-escena')).toHaveAttribute('data-soil-life', '62');
    expect(screen.getAllByTestId('nutrient-spark').length).toBeGreaterThan(0);
  });

  it('una mala decision baja la vida del suelo y muestra alerta practica', () => {
    render(<MundoSubsuelo />);

    fireEvent.click(screen.getByRole('button', { name: /Labranza intensa/i }));

    expect(screen.getByTestId('vida-suelo-valor')).toHaveTextContent('32');
    expect(screen.getByText('Alerta: La red se rompio y el agua corre por encima')).toBeInTheDocument();

    const panel = screen.getByTestId('decision-activa');
    expect(within(panel).getByText(/Remover mucho rompe tuneles/)).toBeInTheDocument();
  });
});
