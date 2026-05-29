/**
 * ProfileScreen.tabs.test.jsx — refactor a PESTAÑAS (2026-05-28).
 *
 * El operador reportó "está difícil de navegar, muchas opciones": el Perfil
 * se reorganizó en 4 pestañas (Perfil / Apariencia / Voz y finca / Avanzado).
 * Estos smoke tests verifican que:
 *   - la tab bar renderiza las 4 pestañas,
 *   - la pestaña Perfil es la activa por defecto (aria-selected),
 *   - cambiar de pestaña muestra el contenido correspondiente y oculta el
 *     anterior (sin breaking change funcional: cada opción sigue accesible).
 *
 * Solo navegamos a Perfil y Apariencia para evitar montar HytaPanel/VoiceSelector
 * (que hacen telemetría/fetch de GPU) bajo jsdom — el objetivo es la mecánica de
 * tabs, no esos paneles.
 */
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import ProfileScreen from '../ProfileScreen';

describe('ProfileScreen — pestañas', () => {
  test('renderiza las 4 pestañas en la tab bar', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const tablist = screen.getByRole('tablist', { name: /secciones del perfil/i });
    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(within(tablist).getByRole('tab', { name: /perfil/i })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /apariencia/i })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /voz y finca/i })).toBeInTheDocument();
    expect(within(tablist).getByRole('tab', { name: /avanzado/i })).toBeInTheDocument();
  });

  test('la pestaña Perfil es la activa por defecto', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const tablist = screen.getByRole('tablist', { name: /secciones del perfil/i });
    const perfilTab = within(tablist).getByRole('tab', { name: /perfil/i });
    expect(perfilTab).toHaveAttribute('aria-selected', 'true');
    // El panel de Perfil muestra el formulario de datos del trabajador.
    expect(screen.getByText(/datos del trabajador/i)).toBeInTheDocument();
  });

  test('cambiar a Apariencia muestra su panel y oculta el de Perfil', () => {
    render(<ProfileScreen onBack={() => {}} onHome={() => {}} />);
    const tablist = screen.getByRole('tablist', { name: /secciones del perfil/i });
    const aparienciaTab = within(tablist).getByRole('tab', { name: /apariencia/i });

    fireEvent.click(aparienciaTab);

    expect(aparienciaTab).toHaveAttribute('aria-selected', 'true');
    // Panel de Apariencia presente (sección Personalización + selector de fondo).
    expect(screen.getByText(/personalización/i)).toBeInTheDocument();
    expect(screen.getByText(/fondo de la app/i)).toBeInTheDocument();
    // El formulario de Perfil ya no está montado (render condicional).
    expect(screen.queryByText(/datos del trabajador/i)).not.toBeInTheDocument();
  });
});
