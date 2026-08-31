/**
 * ChatHistory.greeting.test.jsx — render del SALUDO PROACTIVO en el empty-state.
 *
 * Verifica el cableado visual de la primera impresión del agente:
 *   - CON pendientes → lidera nombrando la alerta/tarea top + hint del resto.
 *   - SIN pendientes → idea contextual, sin pintar ítems de alarma.
 *   - Sin saludo resuelto → cae al copy estático de siempre (backward compat).
 *   - La pastilla-CTA de sugerencia YA NO se renderiza (retirada en tarea #58).
 *   - COHERENCIA: el saludo NOMBRA al compAI ACTIVO (no hard-coded a Angelita) y
 *     cambia de nombre cuando el usuario cambia de avatar (reactivo).
 *
 * La LÓGICA del saludo se prueba en services/__tests__/proactiveGreeting.test.js.
 * Aquí solo probamos que ChatHistory lo renderiza fiel a los datos.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ChatHistory from '../ChatHistory';
import { LLAVE_COMPANERO } from '../../../compai/nucleo/elenco.js';

// El avatar trae assets/animaciones que no aportan al test del saludo.
vi.mock('../../ChagraAgentAvatar', () => ({ default: () => <div data-testid="avatar-mock" /> }));

// El saludo lee el compAI elegido de localStorage (useAgentAvatarType). Cada
// caso parte de un almacenamiento limpio → default 'angelita'.
beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* modo privado */ }
});
afterEach(() => {
  try { window.localStorage.clear(); } catch { /* modo privado */ }
});

/** Fija el compAI activo como si el usuario lo hubiera elegido en el selector. */
function elegirCompai(slug) {
  window.localStorage.setItem(LLAVE_COMPANERO, slug);
}

describe('ChatHistory — saludo proactivo (empty state)', () => {
  it('CON pendientes: lidera nombrando la alerta top y muestra el ítem', () => {
    const greeting = {
      hi: 'Buenos días',
      state: 'pending',
      lead: 'Ojo: Riesgo de helada esta noche (hoy, 2–6 a.m.). Te lo dejo de primero para que no se pase.',
      items: [{ kind: 'alert', icon: '❄️', title: 'Riesgo de helada esta noche', due: 'Hoy, 2–6 a.m.' }],
      restCount: 2,
      prompt: '¿Qué hago con la alerta de mi finca?',
    };
    render(<ChatHistory messages={[]} proactiveGreeting={greeting} />);
    expect(screen.getByTestId('proactive-greeting')).toHaveAttribute('data-greeting-state', 'pending');
    expect(screen.getByTestId('proactive-greeting-lead')).toHaveTextContent('Riesgo de helada esta noche');
    expect(screen.getByTestId('proactive-greeting-items')).toHaveTextContent('Riesgo de helada esta noche');
    // El resto va a la campana, no se listan todos.
    expect(screen.getByTestId('proactive-greeting-rest')).toHaveTextContent('2 pendientes más');
  });

  it('SIN pendientes: idea contextual, sin ítems de alarma', () => {
    const greeting = {
      hi: 'Buenas tardes',
      state: 'idea',
      lead: 'Todo tranquilo por ahora. Como estamos en segunda temporada seca, es buena semana para revisar tu papa. ¿Te armo un plan?',
      items: [],
      restCount: 0,
      prompt: 'Dame un resumen del estado de mi finca hoy.',
    };
    render(<ChatHistory messages={[]} proactiveGreeting={greeting} />);
    expect(screen.getByTestId('proactive-greeting')).toHaveAttribute('data-greeting-state', 'idea');
    expect(screen.getByTestId('proactive-greeting-lead')).toHaveTextContent('Todo tranquilo por ahora');
    // No hay lista de pendientes ni hint de resto en estado idea.
    expect(screen.queryByTestId('proactive-greeting-items')).toBeNull();
    expect(screen.queryByTestId('proactive-greeting-rest')).toBeNull();
  });

  it('NO renderiza la pastilla-CTA de sugerencia (retirada en tarea #58)', () => {
    const greeting = {
      hi: 'Buenos días', state: 'idea', lead: 'Todo tranquilo por ahora.', items: [], restCount: 0,
      prompt: 'Dame un resumen del estado de mi finca hoy.',
    };
    render(<ChatHistory messages={[]} proactiveGreeting={greeting} />);
    // El saludo se muestra, pero ya no hay chip clickeable que dispare un flujo.
    expect(screen.getByTestId('proactive-greeting')).toBeInTheDocument();
    expect(screen.queryByTestId('proactive-greeting-cta')).toBeNull();
  });

  it('sin saludo resuelto → copy estático de siempre (backward compat)', () => {
    render(<ChatHistory messages={[]} proactiveGreeting={null} />);
    expect(screen.queryByTestId('proactive-greeting')).toBeNull();
    expect(screen.getByText(/Soy Angelita, su asistente agroecológica/i)).toBeInTheDocument();
  });
});

describe('ChatHistory — coherencia: el saludo nombra al compAI ACTIVO', () => {
  const greetingIdea = {
    hi: 'Buenas noches', state: 'idea', lead: 'Todo tranquilo por ahora.', items: [], restCount: 0,
    prompt: 'Dame un resumen del estado de mi finca hoy.',
  };

  it('default (abeja): saludo proactivo dice "Soy Angelita, de Chagra"', () => {
    render(<ChatHistory messages={[]} proactiveGreeting={greetingIdea} />);
    expect(screen.getByTestId('proactive-greeting-nombre')).toHaveTextContent('Angelita');
    expect(screen.getByTestId('proactive-greeting')).toHaveTextContent('Buenas noches. Soy Angelita, de Chagra.');
  });

  it('jaguar elegido: saludo proactivo dice "Soy el jaguar, de Chagra"', () => {
    elegirCompai('jaguar');
    render(<ChatHistory messages={[]} proactiveGreeting={greetingIdea} />);
    expect(screen.getByTestId('proactive-greeting-nombre')).toHaveTextContent('el jaguar');
    expect(screen.getByTestId('proactive-greeting')).toHaveTextContent('Buenas noches. Soy el jaguar, de Chagra.');
    // NO debe seguir diciendo Angelita.
    expect(screen.getByTestId('proactive-greeting')).not.toHaveTextContent('Angelita');
  });

  it('oso elegido: fallback estático concuerda en género (agroecológico)', () => {
    elegirCompai('oso-baston');
    render(<ChatHistory messages={[]} proactiveGreeting={null} />);
    expect(screen.getByText(/Soy el oso de anteojos, su asistente agroecológico\./i)).toBeInTheDocument();
    expect(screen.queryByText(/Soy Angelita/i)).toBeNull();
  });

  it('zarigüeya elegida: usa artículo (no el posesivo "su"), femenino', () => {
    elegirCompai('zariguya');
    render(<ChatHistory messages={[]} proactiveGreeting={null} />);
    expect(screen.getByText(/Soy la zarigüeya, su asistente agroecológica\./i)).toBeInTheDocument();
  });

  it('reactivo: al cambiar de avatar, el saludo cambia de nombre sin remount', () => {
    render(<ChatHistory messages={[]} proactiveGreeting={greetingIdea} />);
    expect(screen.getByTestId('proactive-greeting-nombre')).toHaveTextContent('Angelita');
    // El usuario cambia de avatar en otra parte de la app.
    act(() => {
      window.dispatchEvent(new CustomEvent('chagra:agent-avatar-changed', { detail: 'luciernaga' }));
    });
    expect(screen.getByTestId('proactive-greeting-nombre')).toHaveTextContent('la luciérnaga');
  });
});
