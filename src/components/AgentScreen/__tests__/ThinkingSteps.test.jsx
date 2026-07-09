/**
 * Tests para ThinkingSteps — loading contextual por fase del "pensando"
 * (lever de velocidad PERCIBIDA: reemplaza el spinner mudo).
 *
 * Contrato:
 *   - Fase real del pipeline (thinkingPhase) → paso contextual ícono+texto.
 *   - Fase larga 'consultando' rota sus pasos cada ~2s SIN loopear:
 *     catálogo → grafo → fuentes, y se queda en el último.
 *   - Cambio de fase real resetea al primer paso de la fase nueva.
 *   - Fase null/desconocida → "Pensando" genérico (comportamiento previo).
 *   - a11y: texto rotativo aria-hidden + sr-only con la fase real estable.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ThinkingSteps from '../ThinkingSteps.jsx';
import { MSG } from '../../../config/messages';

describe('ThinkingSteps — loading contextual por fase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fase null cae al "Pensando" genérico', () => {
    render(<ThinkingSteps phase={null} />);
    expect(screen.getByText(MSG.agente.pensandoTexto)).toBeTruthy();
    expect(screen.queryByTestId('thinking-step')).toBeNull();
  });

  it('fase desconocida cae al "Pensando" genérico', () => {
    render(<ThinkingSteps phase="fase-inventada" />);
    expect(screen.getByText(MSG.agente.pensandoTexto)).toBeTruthy();
  });

  it("fase 'entendiendo' muestra su paso con ícono", () => {
    render(<ThinkingSteps phase="entendiendo" />);
    const step = screen.getByTestId('thinking-step');
    expect(step.textContent).toContain('Entendiendo tu pregunta');
    expect(step.textContent).toContain('🌱');
  });

  it("fase 'consultando' rota catálogo → grafo → fuentes y se queda en el último", () => {
    render(<ThinkingSteps phase="consultando" />);
    expect(screen.getByTestId('thinking-step').textContent).toContain('Consultando el catálogo');

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId('thinking-step').textContent).toContain('Revisando el grafo de tu finca');

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByTestId('thinking-step').textContent).toContain('Verificando las fuentes');

    // Sin loop hacia atrás: mucho después sigue en el último paso.
    act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByTestId('thinking-step').textContent).toContain('Verificando las fuentes');
  });

  it('cambio de fase real resetea al primer paso de la fase nueva', () => {
    const { rerender } = render(<ThinkingSteps phase="consultando" />);
    act(() => vi.advanceTimersByTime(4000)); // → último paso (fuentes)
    expect(screen.getByTestId('thinking-step').textContent).toContain('Verificando las fuentes');

    rerender(<ThinkingSteps phase="escribiendo" />);
    const step = screen.getByTestId('thinking-step');
    expect(step.textContent).toContain('Preparando la respuesta');
    expect(step.textContent).toContain('✍️');
  });

  it('fases de UN paso no programan rotación (no cambia con el tiempo)', () => {
    render(<ThinkingSteps phase="escribiendo" />);
    act(() => vi.advanceTimersByTime(8000));
    expect(screen.getByTestId('thinking-step').textContent).toContain('Preparando la respuesta');
  });

  it('a11y: paso rotativo aria-hidden + sr-only anuncia solo la fase real', () => {
    render(<ThinkingSteps phase="consultando" />);
    const step = screen.getByTestId('thinking-step');
    expect(step.getAttribute('aria-hidden')).toBe('true');
    // El sr-only lleva el label de la fase real (estable, no rota cada 2s).
    expect(screen.getByText(MSG.agente.fases.consultando).className).toContain('sr-only');
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText(MSG.agente.fases.consultando).className).toContain('sr-only');
  });
});
