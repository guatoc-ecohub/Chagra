import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MundoSubsuelo from '../MundoSubsuelo';
import * as flag from '../../../config/fincaVivaHomeFlag';

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

  describe('capa de objetivo (gated dev-only)', () => {
    afterEach(() => { vi.restoreAllMocks(); });

    it('con la flag OFF (default, prod) NO muestra meta ni celebración: sandbox intacto', () => {
      vi.spyOn(flag, 'fincaVivaHomePerfilActivo').mockReturnValue(false);
      render(<MundoSubsuelo />);
      expect(screen.queryByTestId('subsuelo-meta')).toBeNull();
      // Aun subiendo el suelo por encima de la meta, no aparece la celebración.
      for (let i = 0; i < 4; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: /Compost y bocashi/i }));
      }
      expect(screen.queryByTestId('subsuelo-meta-lograda')).toBeNull();
    });

    it('con la flag ON muestra la meta y celebra al llegar a suelo vivo', () => {
      vi.spyOn(flag, 'fincaVivaHomePerfilActivo').mockReturnValue(true);
      render(<MundoSubsuelo />);

      // La línea de meta es visible desde el arranque.
      expect(screen.getByTestId('subsuelo-meta').textContent).toMatch(/Meta/);

      // Compost (+14) repetido empuja el suelo de 48 a >= 75 (meta).
      for (let i = 0; i < 3; i += 1) {
        fireEvent.click(screen.getByRole('button', { name: /Compost y bocashi/i }));
      }
      expect(screen.getByTestId('vida-suelo-valor')).toHaveTextContent('90');
      const celebracion = screen.getByTestId('subsuelo-meta-lograda');
      expect(celebracion).toBeInTheDocument();
      expect(within(celebracion).getByRole('heading', { name: /Suelo vivo/i })).toBeInTheDocument();

      // "Empezar de nuevo" reinicia el suelo a la base y cierra la celebración.
      fireEvent.click(screen.getByTestId('subsuelo-reiniciar'));
      expect(screen.getByTestId('vida-suelo-valor')).toHaveTextContent('48');
      expect(screen.queryByTestId('subsuelo-meta-lograda')).toBeNull();
    });
  });
});
