import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpDatosScreen from '../HelpDatosScreen';
import { describe, test, expect, vi } from 'vitest';

/**
 * Smoke test de HelpDatosScreen — tema nuevo "¿Dónde se guardan mis datos?".
 *
 * Verifica:
 *   - Renderiza sin crashear y muestra las 4 preguntas frecuentes.
 *   - El botón "Volver al Manual" invoca onBackToHome.
 *   - El CTA hacia la sección del agente invoca onNavigate('agente') —
 *     conexión con task #123, NO duplica ese contenido.
 *   - El copy NO contiene voseo argentino (regla editorial del proyecto).
 */
describe('HelpDatosScreen smoke', () => {
  test('Renderiza el título y las preguntas frecuentes', () => {
    render(<HelpDatosScreen onBackToHome={() => {}} onNavigate={() => {}} />);
    // El título aparece en el breadcrumb y en el hero h2.
    expect(screen.getAllByText(/¿Dónde se guardan mis datos\?/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /¿Funciona sin internet\?/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /¿Por qué veo cosas distintas en mis aparatos\?/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /¿Puedo perder mis datos\?/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /¿Y el chat con la IA\?/i })).toBeInTheDocument();
  });

  test('Explica qué SÍ y qué NO puede hacer con los datos', () => {
    render(<HelpDatosScreen onBackToHome={() => {}} onNavigate={() => {}} />);
    expect(screen.getByText(/Lo que Chagra SÍ hace por ti/i)).toBeInTheDocument();
    expect(screen.getByText(/Lo que Chagra NO puede hacer/i)).toBeInTheDocument();
    // Garantía clave: nunca borra datos si el servidor falla.
    expect(
      screen.getByText(/Nunca borra tus datos si el servidor falla/i)
    ).toBeInTheDocument();
  });

  test('Botón "Volver al Manual" invoca onBackToHome', () => {
    const onBackToHome = vi.fn();
    render(<HelpDatosScreen onBackToHome={onBackToHome} onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver al Manual/i }));
    expect(onBackToHome).toHaveBeenCalled();
  });

  test('CTA hacia la IA invoca onNavigate("agente") sin duplicar task #123', () => {
    const onNavigate = vi.fn();
    render(<HelpDatosScreen onBackToHome={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(
      screen.getByRole('button', { name: /Ver qué puede y qué no puede la IA/i })
    );
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  test('El copy no contiene voseo argentino', () => {
    const { container } = render(
      <HelpDatosScreen onBackToHome={() => {}} onNavigate={() => {}} />
    );
    const text = container.textContent || '';
    // Verbos y muletillas típicas del dialecto rioplatense — prohibidos.
    expect(text).not.toMatch(/\btenés\b/i);
    expect(text).not.toMatch(/\bquerés\b/i);
    expect(text).not.toMatch(/\bpodés\b/i);
    expect(text).not.toMatch(/\bsabés\b/i);
    expect(text).not.toMatch(/\bmirá\b/i);
    expect(text).not.toMatch(/\bdale\b/i);
    expect(text).not.toMatch(/\bacá\b/i);
    expect(text).not.toMatch(/\bvos\b/i);
    expect(text).not.toMatch(/\belegí\b/i);
    expect(text).not.toMatch(/\bfijate\b/i);
  });
});
