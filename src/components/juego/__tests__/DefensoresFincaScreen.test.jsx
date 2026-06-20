import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DefensoresFincaScreen from '../DefensoresFincaScreen';
import { PARES_CONTROL, NIVEL_1, NIVEL_2, NIVEL_3, PROGRESO_KEY } from '../defensoresFincaData';

// jsdom no implementa canvas 2D: getContext devuelve null. El componente
// guarda contra ctx null, así que el render no crashea y podemos probar el HUD,
// los controles y la lógica de control biológico (que vive en refs).

describe('DefensoresFincaScreen', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

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

  it('muestra el selector con los tres niveles; el 2 y el 3 arrancan bloqueados', () => {
    render(<DefensoresFincaScreen />);
    expect(screen.getByTestId('defensores-niveles')).toBeInTheDocument();
    const nivel1 = screen.getByTestId('nivel-1');
    const nivel2 = screen.getByTestId('nivel-2');
    const nivel3 = screen.getByTestId('nivel-3');
    expect(nivel1).not.toBeDisabled();
    expect(nivel1).toHaveAttribute('data-selected', 'true');
    // Sin progreso guardado, los niveles 2 y 3 están bloqueados.
    expect(nivel2).toBeDisabled();
    expect(nivel2.textContent).toContain('Gana el nivel anterior');
    expect(nivel3).toBeDisabled();
    expect(nivel3.textContent).toContain('Gana el nivel anterior');
  });

  it('con los niveles 1 y 2 superados, el 3 (cafetal) queda jugable con sus aliados del café', () => {
    localStorage.setItem(PROGRESO_KEY, JSON.stringify({ superados: [1, 2] }));
    render(<DefensoresFincaScreen />);

    const nivel3 = screen.getByTestId('nivel-3');
    expect(nivel3).not.toBeDisabled();
    expect(nivel3.textContent).toContain(NIVEL_3.nombre);

    // Al elegir el nivel 3 cambian subtítulo y aparecen los aliados del café.
    fireEvent.click(nivel3);
    expect(nivel3).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('defensores-subtitulo').textContent).toContain(
      NIVEL_3.subtitulo,
    );
    // El nivel 3 incluye aliados que NO están en el nivel 2 (plagas del café).
    const extra = NIVEL_3.paresIds.find((id) => !NIVEL_2.paresIds.includes(id));
    const parExtra = PARES_CONTROL.find((p) => p.id === extra);
    expect(screen.getByTestId(`beneficio-${parExtra.benefico.id}`)).toBeInTheDocument();
    // El mini-jefe del nivel 3 (la broca) está anunciado.
    expect(screen.getByTestId('defensores-jefe')).toBeInTheDocument();
  });

  it('si el nivel 1 ya fue superado, el 2 queda desbloqueado y seleccionable', () => {
    localStorage.setItem(PROGRESO_KEY, JSON.stringify({ superados: [1] }));
    render(<DefensoresFincaScreen />);

    const nivel2 = screen.getByTestId('nivel-2');
    expect(nivel2).not.toBeDisabled();
    expect(nivel2.textContent).toContain(NIVEL_2.nombre);

    // Al elegir el nivel 2 cambian subtítulo y el set de benéficos del nivel.
    fireEvent.click(nivel2);
    expect(nivel2).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('defensores-subtitulo').textContent).toContain(
      NIVEL_2.subtitulo,
    );
    // El nivel 2 incluye pares que NO están en el nivel 1 (más elementos).
    const extra = NIVEL_2.paresIds.find((id) => !NIVEL_1.paresIds.includes(id));
    const parExtra = PARES_CONTROL.find((p) => p.id === extra);
    expect(screen.getByTestId(`beneficio-${parExtra.benefico.id}`)).toBeInTheDocument();
    // El aviso de mini-jefe del nivel 2 está presente.
    expect(screen.getByTestId('defensores-jefe')).toBeInTheDocument();
  });
});
