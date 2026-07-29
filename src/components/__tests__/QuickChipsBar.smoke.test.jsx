// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import QuickChipsBar from '../QuickChipsBar';

// Smoke tests UX-5 (#286) — los chips deben:
//   - renderizar los 3 textos default,
//   - invocar onSelect con el texto exacto del chip clickeado,
//   - aceptar override de questions vía prop,
//   - retornar null si no hay handler (defensa contra mounts incompletos).

describe('QuickChipsBar — chips de preguntas rápidas', () => {
  test('renderiza los 3 chips default', () => {
    render(<QuickChipsBar onSelect={() => {}} />);
    expect(screen.getByText('¿Qué siembro este mes?')).toBeInTheDocument();
    expect(screen.getByText('Tengo plaga en mis plantas')).toBeInTheDocument();
    expect(screen.getByText('Receta de biopreparado para tomate')).toBeInTheDocument();
  });

  test('clickear un chip llama onSelect con el texto exacto', () => {
    const onSelect = vi.fn();
    render(<QuickChipsBar onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Tengo plaga en mis plantas'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('Tengo plaga en mis plantas');
  });

  test('respeta override de questions', () => {
    const onSelect = vi.fn();
    render(<QuickChipsBar onSelect={onSelect} questions={['Pregunta A', 'Pregunta B']} />);
    const chips = screen.getAllByTestId('quick-chip');
    expect(chips).toHaveLength(2);
    expect(screen.getByText('Pregunta A')).toBeInTheDocument();
    expect(screen.getByText('Pregunta B')).toBeInTheDocument();
  });

  test('retorna null si no hay handler onSelect (defensa)', () => {
    const { container } = render(<QuickChipsBar />);
    expect(container.firstChild).toBeNull();
  });
});
