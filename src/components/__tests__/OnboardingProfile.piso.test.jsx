// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * OnboardingProfile — pregunta de altitud con quick-pick visual de piso
 * térmico (baja alfabetización: si el campesino no sabe los msnm, escoge
 * el clima de su tierra con un botón grande con emoji).
 *
 * Cero fabricación: el chip guarda SOLO piso_termico (declarado por el
 * usuario); la altitud numérica real la confirma LocationDetectedScreen.
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import OnboardingProfile from '../_archivo/OnboardingProfile';
import { saveProfile, getProfile } from '../../services/userProfileService';

beforeEach(() => {
  window.localStorage.clear();
  // Perfil rural pre-sembrado para que la pregunta de altitud aplique.
  saveProfile({ vocacion: 'campesino', finca_tipo: 'rural' });
});
afterEach(() => cleanup());

/** Avanza con "Saltar pregunta" hasta que aparezca la pregunta de altura. */
function goToAltitudQuestion() {
  for (let i = 0; i < 8; i += 1) {
    if (screen.queryByText(/¿A qué altura está su finca\?/i)) return;
    fireEvent.click(screen.getByRole('button', { name: /saltar pregunta/i }));
  }
}

describe('OnboardingProfile — quick-pick de piso térmico', () => {
  it('la pregunta de altura muestra los 4 pisos térmicos con emoji y rango', () => {
    render(<OnboardingProfile onComplete={vi.fn()} />);
    goToAltitudQuestion();
    expect(screen.getByText(/¿A qué altura está su finca\?/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /cálido/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /templado/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /frío/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /páramo/i })).toBeTruthy();
    // Rangos visibles para quien sí maneja msnm.
    expect(screen.getByText(/0–1000 msnm/)).toBeTruthy();
  });

  it('tocar un piso guarda piso_termico (sin inventar altitud)', () => {
    render(<OnboardingProfile onComplete={vi.fn()} />);
    goToAltitudQuestion();
    fireEvent.click(screen.getByRole('button', { name: /frío/i }));
    const profile = getProfile();
    expect(profile.piso_termico).toBe('frío');
    // CERO fabricación: no se inventa un número de altitud.
    expect(profile.finca_altitud ?? '').toBe('');
  });

  it('escribir la altitud a mano sigue funcionando', () => {
    render(<OnboardingProfile onComplete={vi.fn()} />);
    goToAltitudQuestion();
    const input = screen.getByPlaceholderText('1730');
    fireEvent.change(input, { target: { value: '2450' } });
    expect(getProfile().finca_altitud).toBe('2450');
  });
});
