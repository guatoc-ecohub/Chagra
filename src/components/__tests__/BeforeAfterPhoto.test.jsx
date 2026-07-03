import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BeforeAfterPhoto from '../BeforeAfterPhoto';

const DAY_MS = 24 * 60 * 60 * 1000;

// Fechas relativas a "hoy" para que las aserciones no dependan del reloj real.
const beforeTs = Date.now() - 34 * DAY_MS;
const afterTs = Date.now();

const beforePhoto = { url: 'blob://foto-vieja', taken_at: beforeTs };
const afterPhoto = { url: 'blob://foto-nueva', taken_at: afterTs };

describe('BeforeAfterPhoto — comparador visual antes/ahora', () => {
  it('renderiza etiquetas Antes/Ahora con fecha y el chip de días transcurridos', () => {
    render(<BeforeAfterPhoto before={beforePhoto} after={afterPhoto} />);

    expect(screen.getByText('Antes')).toBeTruthy();
    expect(screen.getByText('Ahora')).toBeTruthy();
    // Fecha relativa de la foto vieja (34 días → "hace 1 mes") + absoluta es-CO.
    expect(screen.getByText(/hace 1 mes/)).toBeTruthy();
    // Chip de progreso entre ambas fotos.
    expect(screen.getByText('34 días después')).toBeTruthy();
    // Hint en tono usted.
    expect(screen.getByText('Deslice para comparar')).toBeTruthy();
  });

  it('expone el handle como slider accesible y responde a teclado (←/→/Home/End)', () => {
    render(<BeforeAfterPhoto before={beforePhoto} after={afterPhoto} />);

    const handle = screen.getByRole('slider', { name: 'Mover comparación antes/después' });
    expect(handle.getAttribute('aria-valuenow')).toBe('50');

    fireEvent.keyDown(handle, { key: 'ArrowRight' });
    expect(handle.getAttribute('aria-valuenow')).toBe('55');

    fireEvent.keyDown(handle, { key: 'Home' });
    expect(handle.getAttribute('aria-valuenow')).toBe('0');

    fireEvent.keyDown(handle, { key: 'End' });
    expect(handle.getAttribute('aria-valuenow')).toBe('100');
  });

  it('desvanece el hint tras la primera interacción de teclado', () => {
    render(<BeforeAfterPhoto before={beforePhoto} after={afterPhoto} />);

    const hint = screen.getByText('Deslice para comparar');
    expect(hint.style.opacity).toBe('1');

    const handle = screen.getByRole('slider', { name: 'Mover comparación antes/después' });
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(hint.style.opacity).toBe('0');
  });

  it('no renderiza nada si falta la URL de alguna de las dos fotos', () => {
    const { container } = render(
      <BeforeAfterPhoto before={{ url: null }} after={afterPhoto} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
