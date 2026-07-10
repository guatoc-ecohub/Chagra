/**
 * Smoke test del mockup "El camino del primer cultivo" (#/mockups/primer-cultivo).
 * Verifica que el onboarding aspiracional monta, que el clima manda lo que se
 * recomienda sembrar (con su ESPERA real), que el camino se recorre paso a paso
 * y que el corazón educativo (paciencia + reencuadre del fracaso) llega intacto
 * y SIN gamificación (ni puntos, ni medallas, ni "completado").
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import PrimerCultivo from '../PrimerCultivo.jsx';

describe('PrimerCultivo (mockup)', () => {
  test('monta el primer paso y recomienda según el clima por defecto (templado → café)', () => {
    render(<PrimerCultivo />);
    expect(screen.getByTestId('mockup-primer-cultivo')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Qué va a sembrar');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('El café');
    // La expectativa es honesta, sin promesas mágicas.
    expect(screen.getByText(/da su primera cosecha de verdad a los dos años/)).toBeInTheDocument();
  });

  test('el clima manda: escoger tierra fría cambia la mata a la papa y su espera', () => {
    render(<PrimerCultivo />);
    fireEvent.click(screen.getByRole('button', { name: /Tierra fría/ }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('La papa');
    expect(screen.getByText(/de 4 a 5 meses/)).toBeInTheDocument();
  });

  test('el camino se recorre paso a paso hasta el gesto de sembrar', () => {
    render(<PrimerCultivo />);
    // Saltar directo al paso "Sembrar" por el mapa de mojones.
    fireEvent.click(screen.getByRole('button', { name: /Paso 3: Sembrar/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('El gesto de sembrar');
    // El gesto concreto: hondura y distancia.
    expect(screen.getByText('A qué hondura')).toBeInTheDocument();
    expect(screen.getByText('A qué distancia')).toBeInTheDocument();
  });

  test('el corazón: paciencia + "no falló usted", sin premio ni "completado"', () => {
    render(<PrimerCultivo />);
    fireEvent.click(screen.getByRole('button', { name: /Paso 5: Esperar/ }));
    expect(screen.getByText(/no falló usted/i)).toBeInTheDocument();
    expect(screen.getByText(/no se mide en cosecha/i)).toBeInTheDocument();
    // Anti-gamificación: nada de puntos, medallas, rachas ni "completado".
    const paso = screen.getByTestId('mockup-primer-cultivo');
    expect(within(paso).queryByText(/completad|felicit|medalla|puntos|racha|nivel/i)).toBeNull();
  });
});
