/**
 * Smoke test del mockup "El día en su finca" (#/mockups/dia-en-finca).
 * Verifica que la superficie completa monta con sus tres franjas de contenido
 * (prioritaria + secundarias + observación), que marcar "Ya lo hice" deja
 * constancia sin festejo (anti-gamificación: ni puntos ni contadores) y que la
 * pantalla respira la franja del día (el titular cambia con la hora).
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import DiaEnFinca from '../DiaEnFinca.jsx';

describe('DiaEnFinca (mockup)', () => {
  test('monta la acción prioritaria con su porqué y el paso concreto', () => {
    render(<DiaEnFinca />);
    expect(screen.getByTestId('mockup-dia-en-finca')).toBeInTheDocument();
    // El titular del día (tesis de la pantalla) y la acción prioritaria.
    expect(screen.getByText('Hoy manda el aguacero de la tarde.')).toBeInTheDocument();
    expect(screen.getByText('Guarde el café que tiene secando')).toBeInTheDocument();
    // El porqué en cristiano cruza clima + cuaderno.
    expect(screen.getByText(/Por la tarde cae un aguacero/)).toBeInTheDocument();
    expect(screen.getByText(/usted anotó que puso café a secar/)).toBeInTheDocument();
  });

  test('trae secundarias con porqué y la franja de observación sin estado "hecho"', () => {
    render(<DiaEnFinca />);
    expect(screen.getByText('Amarre el tomate que abrió flor')).toBeInTheDocument();
    expect(screen.getByTestId('df-hice-tomate')).toBeInTheDocument();
    // La observación invita, no se "completa": no hay botón de hecho, hay voz.
    expect(screen.getByText(/levante la hojarasca al pie del maíz/)).toBeInTheDocument();
    expect(screen.getByTestId('df-contar')).toBeInTheDocument();
  });

  test('marcar "Ya lo hice" deja constancia en el cuaderno, sin festejo', () => {
    render(<DiaEnFinca />);
    const boton = screen.getByTestId('df-hice-cafe');
    expect(boton).toHaveTextContent('Ya lo hice');
    fireEvent.click(boton);
    expect(boton).toHaveTextContent('quedó en su cuaderno');
    expect(screen.getByRole('status')).toHaveTextContent('Quedó anotado en el cuaderno de su finca.');
  });

  test('la pantalla respira la franja del día (el titular cambia con la hora)', () => {
    render(<DiaEnFinca />);
    fireEvent.click(screen.getByRole('button', { name: /franja noche/ }));
    expect(screen.getByText('El aguacero ya pasó. La tierra quedó bebida.')).toBeInTheDocument();
  });
});
