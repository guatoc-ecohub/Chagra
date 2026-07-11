/*
 * Entrada #/mockups/entrada-3d — NAVEGACIÓN valle ↔ mundos, punta a punta.
 *
 * En jsdom no hay WebGL: el valle monta su 2D digno (Valle2DFallback) y los
 * mundos caen a su gemelo 2D (three-free) — exactamente el camino de un equipo
 * humilde. Se congela el ciclo entero:
 *   · tocar un lugar del valle → panel del mundo → "Entrar a este mundo";
 *   · el viaje (Angelita guía) → la escena del mundo con su miga "‹ El valle";
 *   · una puerta DENTRO del mundo cuenta a qué pantalla real lleva;
 *   · "Volver al valle" → viaje en reversa → el valle otra vez;
 *   · el clima ya es un mundo montable (bóveda): se entra y se vuelve igual.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import EntradaValle3D from '../EntradaValle3D.jsx';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/* El viaje dura ~1.05s; con timers falsos lo cumplimos determinista. */
const cumplirViaje = () => act(() => vi.advanceTimersByTime(1200));

describe('entrada-3d — navegable de punta a punta (valle ↔ mundos)', () => {
  test('entra al mundo del agua, toca una puerta y vuelve al valle', () => {
    vi.useFakeTimers();
    const { container } = render(<EntradaValle3D onBack={() => {}} />);

    // 1) EL VALLE: tocar un lugar abre su panel con la puerta de entrada.
    fireEvent.click(screen.getByRole('button', { name: /Viajar al mundo El agua/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a este mundo' }));

    // 2) EL VIAJE: Angelita guía; el valle sigue debajo del velo.
    expect(screen.getByText('Angelita lo lleva a El agua…')).toBeInTheDocument();
    cumplirViaje();

    // 3) DENTRO DEL MUNDO: la escena del framework (gemelo 2D en jsdom) con
    //    su miga consistente: volver + dónde-estoy.
    expect(container.querySelector('.valle-mundo[data-mundo="agua"]')).toBeInTheDocument();
    expect(container.querySelector('.mundo-root[data-dim="2d"]')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Usted está aquí' })).toHaveTextContent('El agua');
    // el chrome del valle descansa mientras se está dentro
    expect(screen.queryByRole('heading', { level: 1, name: 'El valle de mi finca' })).not.toBeInTheDocument();

    // 4) UNA PUERTA del mundo: en la vitrina cuenta a qué pantalla real lleva.
    fireEvent.click(screen.getByRole('button', { name: 'La quebrada viva' }));
    expect(container.querySelector('.valle-mundo__puerta')).toHaveTextContent('«biodiversidad»');

    // 5) VOLVER: viaje en reversa → el valle completo otra vez.
    fireEvent.click(screen.getByRole('button', { name: 'Volver al valle' }));
    expect(screen.getByText('De vuelta al valle…')).toBeInTheDocument();
    cumplirViaje();
    expect(container.querySelector('.valle-mundo')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Viajar al mundo El agua/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'El valle de mi finca' })).toBeInTheDocument();
  });

  test('un segundo mundo (el suelo vivo) también se entra y se vuelve', () => {
    vi.useFakeTimers();
    const { container } = render(<EntradaValle3D onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Viajar al mundo El suelo vivo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a este mundo' }));
    cumplirViaje();
    expect(container.querySelector('.valle-mundo[data-mundo="suelo"]')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Usted está aquí' })).toHaveTextContent('El suelo vivo');

    fireEvent.click(screen.getByRole('button', { name: 'Volver al valle' }));
    cumplirViaje();
    expect(container.querySelector('.valle-mundo')).not.toBeInTheDocument();
  });

  test('el clima ya es un mundo montable (bóveda): se entra y se vuelve', () => {
    vi.useFakeTimers();
    const { container } = render(<EntradaValle3D onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Viajar al mundo El clima/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a este mundo' }));
    cumplirViaje();
    // en jsdom cae a su gemelo 2D digno (three-free): el cielo dibujado
    expect(container.querySelector('.valle-mundo[data-mundo="clima"]')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Usted está aquí' })).toHaveTextContent('El clima');

    fireEvent.click(screen.getByRole('button', { name: 'Volver al valle' }));
    cumplirViaje();
    expect(container.querySelector('.valle-mundo')).not.toBeInTheDocument();
  });
});
