import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DefensoresFincaScreen from '../DefensoresFincaScreen';
import { PARES_CONTROL, NIVEL_1 } from '../defensoresFincaData';

// jsdom no implementa canvas 2D: getContext devuelve null. El componente
// guarda contra ctx null, así que el render no crashea y podemos probar el HUD,
// los controles y la lógica de control biológico (que vive en refs).

describe('DefensoresFincaScreen', () => {
  it('renderiza el juego con HUD, controles táctiles y selector de benéficos', () => {
    render(<DefensoresFincaScreen />);

    expect(screen.getByTestId('defensores-finca-screen')).toBeInTheDocument();
    // El título aparece tanto en el ScreenShell (h1) como en el encabezado del
    // juego (h2); basta confirmar que existe al menos uno.
    expect(
      screen.getAllByRole('heading', { name: /Defensores de la Finca/i }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText('Aprende a Cultivar Jugando')).toBeInTheDocument();
    expect(screen.getByTestId('defensores-hud')).toBeInTheDocument();
    expect(screen.getByTestId('defensores-puntaje')).toHaveTextContent('0');

    // Controles táctiles (mobile-first).
    expect(screen.getByRole('button', { name: 'Mover a la izquierda' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mover a la derecha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saltar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soltar el bicho bueno' })).toBeInTheDocument();

    // Un botón por cada benéfico del nivel.
    const paresNivel = PARES_CONTROL.filter((p) => NIVEL_1.paresIds.includes(p.id));
    for (const par of paresNivel) {
      expect(screen.getByTestId(`beneficio-${par.benefico.id}`)).toBeInTheDocument();
    }
  });

  it('al soltar el benéfico correcto muestra la lección de control biológico', () => {
    // El loop de canvas usa requestAnimationFrame; lo dejamos correr sin asserts
    // sobre el dibujo (ctx es null). La acción "soltar benéfico" no depende del
    // canvas: lee el mundo de los refs.
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);

    render(<DefensoresFincaScreen />);

    // El primer benéfico viene seleccionado por defecto.
    const par = PARES_CONTROL.find((p) => NIVEL_1.paresIds.includes(p.id));
    const beneficoBtn = screen.getByTestId(`beneficio-${par.benefico.id}`);
    fireEvent.click(beneficoBtn);
    expect(beneficoBtn).toHaveAttribute('data-selected', 'true');

    // Soltar el benéfico → limpia su plaga y muestra la lección real.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Soltar el bicho bueno' }));

    const leccion = screen.getByTestId('defensores-leccion');
    expect(leccion).toBeInTheDocument();
    expect(leccion.textContent).toContain(par.leccion);

    raf.mockRestore();
  });
});
