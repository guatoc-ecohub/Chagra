import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AhorcadoContaminado from '../AhorcadoContaminado';
import { PALABRAS } from '../../../data/juegos/ahorcadoContaminado';

// El juego elige palabra al azar (Math.random). Para un smoke determinista,
// forzamos Math.random a 0: siempre cae en la primera palabra del banco
// activo (mezcla → PALABRAS[0] = 'NAUSEA', categoría sintoma).
describe('AhorcadoContaminado', () => {
  let randomSpy;

  beforeEach(() => {
    randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    randomSpy.mockRestore();
  });

  it('renderiza el juego con la escena de contaminacion, palabra oculta y teclado', () => {
    render(<AhorcadoContaminado />);

    expect(screen.getByTestId('ahorcado-contaminado')).toBeInTheDocument();
    expect(screen.getByTestId('escena-contaminacion')).toBeInTheDocument();
    expect(screen.getByTestId('palabra-oculta')).toBeInTheDocument();
    expect(screen.getByTestId('contador-intentos')).toHaveTextContent('Intentos: 0 / 6');
    expect(screen.getByTestId('tecla-A')).toBeInTheDocument();
  });

  it('una jugada ganadora revela la pista educativa y la fuente', () => {
    render(<AhorcadoContaminado />);

    // Con Math.random mockeado a 0, la palabra activa es PALABRAS[0].
    const palabra = PALABRAS[0].palabra;
    const letrasUnicas = [...new Set(palabra.replace(/[^A-ZÑ]/gi, '').split(''))];

    letrasUnicas.forEach((letra) => {
      fireEvent.click(screen.getByTestId(`tecla-${letra}`));
    });

    expect(screen.getByTestId('resultado-juego')).toBeInTheDocument();
    expect(screen.getByTestId('resultado-juego')).toHaveClass('gano');
    expect(screen.getByTestId('pista-educativa')).toHaveTextContent(PALABRAS[0].pista);
    expect(screen.getByTestId('fuente-dato')).toBeInTheDocument();
  });

  it('una jugada perdida tambien revela la palabra y la pista (educativo, no punitivo)', () => {
    render(<AhorcadoContaminado />);

    // Letras que casi seguro no están en 'NAUSEA' para forzar 6 errores.
    const fallos = ['B', 'C', 'D', 'F', 'G', 'H'];
    fallos.forEach((letra) => {
      fireEvent.click(screen.getByTestId(`tecla-${letra}`));
    });

    expect(screen.getByTestId('contador-intentos')).toHaveTextContent('Intentos: 6 / 6');
    expect(screen.getByTestId('resultado-juego')).toHaveClass('perdio');
    expect(screen.getByTestId('pista-educativa')).toHaveTextContent(PALABRAS[0].pista);
  });

  it('muestra la advertencia toxicologica al abrir el modal del pie', () => {
    render(<AhorcadoContaminado />);

    fireEvent.click(screen.getByTestId('abrir-advertencia'));

    expect(screen.getByTestId('modal-advertencia')).toBeInTheDocument();
    expect(screen.getByText(/CIATOX/)).toBeInTheDocument();
    expect(screen.getByText(/123/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cerrar-advertencia'));
    expect(screen.queryByTestId('modal-advertencia')).not.toBeInTheDocument();
  });
});
