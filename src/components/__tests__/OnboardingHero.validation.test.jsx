/**
 * OnboardingHero — validacion de campos requeridos en cold-start.
 *
 * Tarea 76: el hero de primer uso debe mostrar guia explicita cuando datos
 * criticos del perfil (altitud, piso termico) no estan presentes, y las 3
 * rutas de registro deben ser accesibles.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('../../store/useAssetStore', () => ({
  default: vi.fn((selector) => selector({ lands: [] })),
}));
vi.mock('../../config/defaults', () => ({
  FARM_CONFIG: {},
}));

import OnboardingHero from '../_archivo/OnboardingHero';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('OnboardingHero — validacion de campos requeridos', () => {
  it('sin altitud en el perfil: muestra CTA "ubicar finca" como paso obligatorio', () => {
    render(<OnboardingHero onNavigate={vi.fn()} />);
    expect(screen.getByTestId('onboarding-piso-cta')).toBeTruthy();
  });

  it('con altitud sin confirmar: muestra confirmacion obligatoria antes de registrar', () => {
    // La clave real del perfil es `chagra:profile:v1` (userProfileService),
    // no `chagra_profile`. El test antiguo escribía la clave equivocada y el
    // perfil quedaba vacío → nunca se mostraba la confirmación de piso.
    window.localStorage.setItem(
      'chagra:profile:v1',
      JSON.stringify({ finca_altitud: '1800' })
    );
    render(<OnboardingHero onNavigate={vi.fn()} />);
    expect(screen.getByTestId('onboarding-piso-confirm')).toBeTruthy();
    // "correcto" aparece en "¿Es correcto?" y en el botón "Sí, es correcto".
    expect(screen.getAllByText(/correcto/i).length).toBeGreaterThan(0);
  });

  it('las 3 rutas de registro estan presentes tras los pasos de validacion', () => {
    render(<OnboardingHero onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /foto/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /voz/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /escribir/i })).toBeTruthy();
  });

  it('compact sin altitud: solo muestra paso de piso sin las 3 rutas', () => {
    render(<OnboardingHero onNavigate={vi.fn()} compact />);
    expect(screen.getByTestId('onboarding-piso-cta')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /foto/i })).toBeNull();
  });

  it('compact con piso confirmado: no renderiza nada', () => {
    window.localStorage.setItem(
      'chagra:profile:v1',
      JSON.stringify({ finca_altitud: '2200', piso_confirmado: '1' })
    );
    const { container } = render(<OnboardingHero onNavigate={vi.fn()} compact />);
    expect(container.innerHTML).toBe('');
  });
});
