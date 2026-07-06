/**
 * ErrorStateCampo — estado de error inline de la familia campo.
 * Verifica: copy cálido, botón de reintento funcional, slot children.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi } from 'vitest';
import ErrorStateCampo from '../common/ErrorStateCampo.jsx';

describe('ErrorStateCampo', () => {
  test('renderiza title y hint personalizados', () => {
    render(
      <ErrorStateCampo
        title="No pudimos cargar el mercado."
        hint="Puede ser la señal. Vuelva a intentar."
      />,
    );
    expect(screen.getByText('No pudimos cargar el mercado.')).toBeInTheDocument();
    expect(screen.getByText('Puede ser la señal. Vuelva a intentar.')).toBeInTheDocument();
  });

  test('sin props muestra el copy default (negación explícita, sin jerga)', () => {
    render(<ErrorStateCampo />);
    expect(screen.getByText('Esto no cargó.')).toBeInTheDocument();
    expect(screen.getByText(/Espere un momento y vuelva a intentar/)).toBeInTheDocument();
  });

  test('con onRetry muestra el botón y lo dispara al tocar', () => {
    const onRetry = vi.fn();
    render(<ErrorStateCampo onRetry={onRetry} />);
    const btn = screen.getByRole('button', { name: /Intentar de nuevo/ });
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('sin onRetry no renderiza botón de reintento', () => {
    render(<ErrorStateCampo />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('children se renderiza debajo (slot para CTA secundario)', () => {
    render(
      <ErrorStateCampo>
        <a href="#volver">Volver</a>
      </ErrorStateCampo>,
    );
    expect(screen.getByText('Volver')).toBeInTheDocument();
  });

  test('la viñeta SVG está oculta a lectores de pantalla', () => {
    const { container } = render(<ErrorStateCampo />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
