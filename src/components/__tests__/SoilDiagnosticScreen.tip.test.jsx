// SPDX-License-Identifier: MIT
// SPDX-FileCopyrightText: 2026 Guatoc Eco Hub

/**
 * SoilDiagnosticScreen — tip contextual "cómo leer la confiabilidad".
 *
 * El campesino ve los puntos de confiabilidad por primera vez en la lista
 * de pruebas caseras → un tip de primera vez le explica cómo leerlos
 * (3 puntos = confiable, 1 = pista, MITO = no decide). Descartable y NO
 * se repite (contextTips).
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../hooks/useVoiceRecorder', () => ({
  default: () => ({ durationMs: 0, start: vi.fn(), stop: vi.fn(), reset: vi.fn(), error: null }),
}));
vi.mock('../../services/voiceService', () => ({ transcribe: vi.fn() }));

import SoilDiagnosticScreen from '../SoilDiagnosticScreen';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => cleanup());

function irADiagnostico() {
  fireEvent.click(screen.getByText(/Dura como piedra/i));
  fireEvent.click(screen.getByRole('button', { name: /Mirar mi tierra/i }));
}

describe('SoilDiagnosticScreen — tip de confiabilidad', () => {
  it('muestra el tip junto a las pruebas sugeridas la primera vez', () => {
    render(<SoilDiagnosticScreen onBack={() => {}} onNavigate={() => {}} />);
    irADiagnostico();
    const tip = screen.getByTestId('context-tip-diagnostico-confianza');
    expect(tip.textContent).toMatch(/puntos/i);
    expect(tip.textContent).toMatch(/mito/i);
  });

  it('descartado con "Entendido" no vuelve a aparecer', () => {
    const { unmount } = render(<SoilDiagnosticScreen onBack={() => {}} onNavigate={() => {}} />);
    irADiagnostico();
    fireEvent.click(screen.getByRole('button', { name: /entendido/i }));
    expect(screen.queryByTestId('context-tip-diagnostico-confianza')).toBeNull();
    unmount();
    render(<SoilDiagnosticScreen onBack={() => {}} onNavigate={() => {}} />);
    irADiagnostico();
    expect(screen.queryByTestId('context-tip-diagnostico-confianza')).toBeNull();
  });
});
