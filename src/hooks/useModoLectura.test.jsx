import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useModoLectura } from './useModoLectura';

const KEY = 'chagra:modo-lectura';

function Sonda() {
  const { activo, toggle } = useModoLectura();
  return (
    <button onClick={toggle} data-testid="toggle">
      {activo ? 'activo' : 'inactivo'}
    </button>
  );
}

describe('useModoLectura', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('chagra-lectura-grande');
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('chagra-lectura-grande');
  });

  it('arranca inactivo por default y sin la clase en <html>', () => {
    render(<Sonda />);
    expect(screen.getByTestId('toggle')).toHaveTextContent('inactivo');
    expect(document.documentElement.classList.contains('chagra-lectura-grande')).toBe(false);
  });

  it('al activar, agrega la clase a <html> y persiste en localStorage', async () => {
    render(<Sonda />);
    await userEvent.click(screen.getByTestId('toggle'));

    expect(screen.getByTestId('toggle')).toHaveTextContent('activo');
    expect(document.documentElement.classList.contains('chagra-lectura-grande')).toBe(true);
    expect(localStorage.getItem(KEY)).toBe('1');
  });

  it('al desactivar, quita la clase y actualiza localStorage', async () => {
    render(<Sonda />);
    const boton = screen.getByTestId('toggle');
    await userEvent.click(boton); // activar
    await userEvent.click(boton); // desactivar

    expect(boton).toHaveTextContent('inactivo');
    expect(document.documentElement.classList.contains('chagra-lectura-grande')).toBe(false);
    expect(localStorage.getItem(KEY)).toBe('0');
  });

  it('respeta una preferencia previa guardada en localStorage al montar', () => {
    localStorage.setItem(KEY, '1');
    render(<Sonda />);
    expect(screen.getByTestId('toggle')).toHaveTextContent('activo');
    expect(document.documentElement.classList.contains('chagra-lectura-grande')).toBe(true);
  });
});
