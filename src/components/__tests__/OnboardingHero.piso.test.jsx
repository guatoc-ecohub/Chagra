// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * OnboardingHero — paso "piso térmico" del primer uso.
 *
 * El piso térmico (altitud) es el FILTRO MAESTRO de todos los módulos
 * (suelo/agua/animal/restauración/clima). El hero de primer uso debe:
 *   - Sin altitud en el perfil → tarjeta GRANDE "ubique su finca" que
 *     navega a `ubicacion-detectada` (LocationDetectedScreen reusado).
 *   - Con altitud sin confirmar → strip de confirmación visual
 *     "clima Frío, ~2200 m — ¿correcto?" con [Sí] y [Corregir].
 *   - Confirmado → ninguna de las dos (no molesta).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../store/useAssetStore', () => ({
  default: vi.fn((selector) => selector({ lands: [] })),
}));
vi.mock('../../config/defaults', () => ({
  FARM_CONFIG: {},
}));

import OnboardingHero from '../_archivo/OnboardingHero';
import { saveProfile, getProfile } from '../../services/userProfileService';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

describe('OnboardingHero — captura de piso térmico (primer uso)', () => {
  it('sin altitud en el perfil muestra la tarjeta "ubicar finca" y navega a ubicacion-detectada', () => {
    const onNavigate = vi.fn();
    render(<OnboardingHero onNavigate={onNavigate} />);
    const card = screen.getByTestId('onboarding-piso-cta');
    expect(card).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ubicar mi finca/i }));
    expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
  });

  it('con altitud sin confirmar muestra clima + metros y pide confirmación', () => {
    saveProfile({ finca_altitud: '2200' });
    const onNavigate = vi.fn();
    render(<OnboardingHero onNavigate={onNavigate} />);
    const strip = screen.getByTestId('onboarding-piso-confirm');
    expect(strip.textContent).toMatch(/Frío/i);
    expect(strip.textContent).toMatch(/2200/);
    // "Corregir" lleva a la pantalla de ubicación (LocationDetectedScreen).
    fireEvent.click(screen.getByRole('button', { name: /corregir/i }));
    expect(onNavigate).toHaveBeenCalledWith('ubicacion-detectada');
  });

  it('"Sí, es correcto" guarda piso_confirmado y oculta el strip', () => {
    saveProfile({ finca_altitud: '2200' });
    render(<OnboardingHero onNavigate={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /sí, es correcto/i }));
    expect(getProfile().piso_confirmado).toBe('1');
    expect(screen.queryByTestId('onboarding-piso-confirm')).toBeNull();
  });

  it('confirmado → no muestra ni tarjeta ni strip (no molesta)', () => {
    saveProfile({ finca_altitud: '2200', piso_confirmado: '1' });
    render(<OnboardingHero onNavigate={vi.fn()} />);
    expect(screen.queryByTestId('onboarding-piso-cta')).toBeNull();
    expect(screen.queryByTestId('onboarding-piso-confirm')).toBeNull();
  });

  it('las 3 rutas de registro (Foto/Voz/Escribir) siguen presentes', () => {
    render(<OnboardingHero onNavigate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /foto/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /voz/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /escribir/i })).toBeTruthy();
  });
});
