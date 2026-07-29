import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpHomeScreen from '../HelpHomeScreen.jsx';
import { describe, test, expect, vi } from 'vitest';

const H = /** @type {any} */ (HelpHomeScreen);

/**
 * Smoke test de HelpHomeScreen — home del Manual con buscador simple.
 *
 * Verifica:
 *   - Renderiza las 6 tarjetas de tema (incluye el tema nuevo de datos).
 *   - El buscador filtra por palabra (texto plano, sin IA) e ignora tildes.
 *   - Sin coincidencias muestra un mensaje en lugar de pantalla vacía.
 *   - Tocar una tarjeta invoca onSelect con su key.
 */
describe('HelpHomeScreen smoke', () => {
  test('Muestra el tema nuevo "¿Dónde se guardan mis datos?"', () => {
    render(/** @type {any} */ (<H onSelect={() => {}} />));
    expect(screen.getByText(/¿Dónde se guardan mis datos\?/i)).toBeInTheDocument();
  });

  test('El buscador filtra por palabra e ignora tildes', () => {
    render(/** @type {any} */ (<H onSelect={() => {}} />));
    const input = screen.getByLabelText(/Buscar en la ayuda/i);

    // "camara" (sin tilde) debe encontrar "Cómo usar Chagra" (keyword cámara).
    fireEvent.change(input, { target: { value: 'camara' } });
    expect(screen.getByText(/Cómo usar Chagra/i)).toBeInTheDocument();
    expect(screen.queryByText(/Aprende sembrando/i)).not.toBeInTheDocument();

    // "datos" debe encontrar el tema nuevo.
    fireEvent.change(input, { target: { value: 'datos' } });
    expect(screen.getByText(/¿Dónde se guardan mis datos\?/i)).toBeInTheDocument();
  });

  test('Sin coincidencias muestra mensaje, no pantalla vacía', () => {
    render(/** @type {any} */ (<H onSelect={() => {}} />));
    const input = screen.getByLabelText(/Buscar en la ayuda/i);
    fireEvent.change(input, { target: { value: 'zzzzxxxx' } });
    expect(screen.getByText(/No encontramos un tema con esa palabra/i)).toBeInTheDocument();
  });

  test('Tocar la tarjeta de datos invoca onSelect("datos")', () => {
    const onSelect = vi.fn();
    render(/** @type {any} */ (<H onSelect={onSelect} />));
    const card = screen.getByText(/¿Dónde se guardan mis datos\?/i).closest('button');
    fireEvent.click(/** @type {any} */ (card));
    expect(onSelect).toHaveBeenCalledWith('datos');
  });

  test('El copy del home no contiene voseo argentino', () => {
    const { container } = render(/** @type {any} */ (<H onSelect={() => {}} />));
    const text = container.textContent || '';
    expect(text).not.toMatch(/\btenés\b/i);
    expect(text).not.toMatch(/\bpodés\b/i);
    expect(text).not.toMatch(/\bdale\b/i);
    expect(text).not.toMatch(/\bacá\b/i);
    expect(text).not.toMatch(/\bvos\b/i);
  });
});
