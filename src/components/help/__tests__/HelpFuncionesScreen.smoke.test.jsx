import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpFuncionesScreen from '../HelpFuncionesScreen.jsx';
import { CAPABILITY_MANIFEST } from '../../../services/agentCapabilities.js';
import { describe, test, expect, vi } from 'vitest';

/**
 * Smoke test de HelpFuncionesScreen — "¿Qué puede hacer Chagra?".
 *
 * Grounding por construcción: la pantalla se DERIVA de CAPABILITY_MANIFEST.
 * Verifica:
 *   - Renderiza TODAS las capacidades live visibles de la mano (hero !== false).
 *   - Deep-link 'nav' navega a la vista del manifiesto (heroRoute.view).
 *   - Deep-link 'ask'/chip navega al agente.
 *   - El buscador filtra y el estado vacío no deja pantalla en blanco.
 *   - Sin voseo argentino en el copy.
 */
describe('HelpFuncionesScreen smoke', () => {
  const vivas = CAPABILITY_MANIFEST.filter(
    (c) => c.status === 'live' && (c.hero !== false || c.intent)
  );

  test('Renderiza una tarjeta por cada capacidad live de la mano', () => {
    render(<HelpFuncionesScreen onBackToHome={() => {}} onNavigate={() => {}} />);
    for (const cap of vivas) {
      expect(screen.getByTestId(`funcion-${cap.id}`)).toBeInTheDocument();
    }
  });

  test('Capacidad nav abre su vista real del manifiesto', () => {
    const onNavigate = vi.fn();
    render(<HelpFuncionesScreen onBackToHome={() => {}} onNavigate={onNavigate} />);
    const capNav = vivas.find((c) => c.heroRoute?.kind === 'nav' && c.heroRoute.view);
    fireEvent.click(screen.getByTestId(`funcion-${capNav.id}`));
    expect(onNavigate).toHaveBeenCalledWith(capNav.heroRoute.view);
  });

  test('Capacidad de consulta (ask/chip) abre el agente', () => {
    const onNavigate = vi.fn();
    render(<HelpFuncionesScreen onBackToHome={() => {}} onNavigate={onNavigate} />);
    const capAsk = vivas.find((c) => c.heroRoute?.kind === 'ask');
    fireEvent.click(screen.getByTestId(`funcion-${capAsk.id}`));
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  test('El buscador filtra y sin coincidencias muestra mensaje', () => {
    render(<HelpFuncionesScreen onBackToHome={() => {}} onNavigate={() => {}} />);
    const input = screen.getByLabelText(/Buscar una función/i);
    fireEvent.change(input, { target: { value: 'zzzzxxxx' } });
    expect(screen.getByText(/Ninguna función se llama así/i)).toBeInTheDocument();
  });

  test('El copy no contiene voseo argentino', () => {
    const { container } = render(
      <HelpFuncionesScreen onBackToHome={() => {}} onNavigate={() => {}} />
    );
    const text = container.textContent || '';
    expect(text).not.toMatch(/\btenés\b/i);
    expect(text).not.toMatch(/\bpodés\b/i);
    expect(text).not.toMatch(/\bacá\b/i);
    expect(text).not.toMatch(/\bvos\b/i);
  });
});
