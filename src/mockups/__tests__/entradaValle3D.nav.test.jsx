/*
 * Entrada #/mockups/entrada-3d — NAVEGACIÓN valle ↔ mundos, punta a punta.
 *
 * En jsdom no hay WebGL: el valle monta su 2D digno (Valle2DFallback) y los
 * mundos caen a su gemelo 2D (three-free) — exactamente el camino de un equipo
 * humilde. Se congela el ciclo entero:
 *   · tocar un lugar del valle → panel del mundo → "Entrar a este mundo";
 *   · el viaje (Angelita guía) → la escena del mundo con su miga "‹ El valle";
 *   · DENTRO del mundo el agente PERSISTE (BUG-AG-02, el "cuarto mudo"):
 *     la barra "Pregúntele…" + estado de voz siguen, y Angelita narra el
 *     lugar en su burbuja (sin speechSynthesis en jsdom = el texto ES la voz);
 *   · una puerta DENTRO del mundo: Angelita cuenta a qué pantalla real lleva;
 *   · "Volver al valle" → viaje en reversa → el valle otra vez;
 *   · el clima ya es un mundo montable (bóveda): se entra y se vuelve igual.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, afterEach, vi } from 'vitest';

import EntradaValle3D from '../EntradaValle3D.jsx';
import { momentoCubiertoTunel } from '../../visual/mundo3d/transiciones/tunelLaminaData.js';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete window.speechSynthesis;
  delete window.SpeechSynthesisUtterance;
  delete globalThis.SpeechSynthesisUtterance;
  window.location.hash = '';
});

/* El viaje dura ~1.05s; con timers falsos lo cumplimos determinista. */
const cumplirViaje = () => act(() => vi.advanceTimersByTime(1200));

describe('entrada-3d — navegable de punta a punta (valle ↔ mundos)', () => {
  test('abre una pantalla 2D bajo el túnel de lámina desde el CTA del valle 3D', () => {
    vi.useFakeTimers();
    render(<EntradaValle3D onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ir a Agua' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir El agua' }));

    expect(screen.getByTestId('tunel-lamina')).toHaveAttribute('data-fase', 'saliendo');
    expect(window.location.hash).toBe('');

    act(() => vi.advanceTimersByTime(momentoCubiertoTunel('saliendo', 'medio', false)));
    expect(window.location.hash).toBe('#agua');
  });

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

    // 3b) EL MUNDO NO ES MUDO (BUG-AG-02): la barra del agente PERSISTE
    //     (preguntar + estado de voz) y Angelita narra el lugar en su burbuja
    //     (jsdom no trae speechSynthesis → el texto ES la voz, nunca mudo).
    expect(screen.getByRole('button', { name: 'Pregúntele a Chagra' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Texto|Voz/ })).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(800)); // la narración entra con una pausita
    expect(container.querySelector('.valle-companero')).toHaveTextContent(
      /sale el agua para toda la finca/,
    );

    // 4) UNA PUERTA del mundo: ANGELITA la nombra — en la vitrina cuenta a
    //    qué pantalla real lleva.
    fireEvent.click(screen.getByRole('button', { name: 'La quebrada viva' }));
    expect(container.querySelector('.valle-companero')).toHaveTextContent('«biodiversidad»');

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

describe('entrada-3d — voz con respaldo visible', () => {
  test('saluda solo después del primer gesto y escribe la bienvenida', () => {
    vi.useFakeTimers();
    const { container } = render(<EntradaValle3D onBack={() => {}} />);

    act(() => vi.advanceTimersByTime(1000));
    // Antes del primer gesto Angelita no ha dicho nada: la burbuja de voz ni
    // se monta (el chip ya no lleva frase fija de ánimo — una sola abeja, la
    // de la escena).
    expect(container.querySelector('.valle-companero')).toBeNull();

    fireEvent.pointerDown(container.querySelector('.valle-root'));
    expect(container.querySelector('.valle-companero')).toHaveTextContent(/Bienvenido/i);
  });

  test('espera voiceschanged y usa la voz en español en la primera lectura', () => {
    let voces = [];
    const eventos = new EventTarget();
    const synth = {
      cancel: vi.fn(),
      speak: vi.fn(),
      getVoices: vi.fn(() => voces),
      addEventListener: eventos.addEventListener.bind(eventos),
      removeEventListener: eventos.removeEventListener.bind(eventos),
    };
    class Utterance {
      constructor(text) { this.text = text; }
    }
    window.speechSynthesis = /** @type {any} */ (synth);
    window.SpeechSynthesisUtterance = /** @type {any} */ (Utterance);
    globalThis.SpeechSynthesisUtterance = /** @type {any} */ (Utterance);

    const { container } = render(<EntradaValle3D onBack={() => {}} />);
    fireEvent.pointerDown(container.querySelector('.valle-root'));
    expect(synth.speak).not.toHaveBeenCalled();

    const vozEspanol = { lang: 'es-CO', name: 'Angelita' };
    voces = [vozEspanol];
    act(() => eventos.dispatchEvent(new Event('voiceschanged')));
    fireEvent.click(screen.getByRole('button', { name: /Viajar al mundo El agua/ }));

    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0].voice).toBe(vozEspanol);
    expect(container.querySelector('.valle-companero')).toHaveTextContent(/sale el agua/i);
  });
});
