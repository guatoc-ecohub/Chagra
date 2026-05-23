import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpAgentSection from '../HelpAgentSection';
import { describe, test, expect, vi } from 'vitest';

/**
 * Smoke test del sub-componente HelpAgentSection (task #123).
 *
 * Verifica:
 *   - Renderiza sin crashear.
 *   - Muestra las secciones clave (cero hype, qué SÍ, qué NO, auditar).
 *   - El botón "Volver al Manual" invoca onBackToHome.
 *   - El CTA "Volver a usar el agente" invoca onNavigate('agente').
 *   - Confirma que NO aparecen términos prohibidos por la regla editorial
 *     en el contenido visible (cero hype + sin voseo argentino).
 */
describe('HelpAgentSection smoke', () => {
  test('Renderiza secciones clave', () => {
    render(<HelpAgentSection onBackToHome={() => {}} onNavigate={() => {}} />);
    // El título aparece tanto en el sub-header (breadcrumb) como en el
    // hero h2 — usamos getAllByText para tolerar ambos.
    expect(screen.getAllByText(/Sobre el agente Chagra/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /¿Qué es el agente Chagra\?/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Qué SÍ puede hacer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Qué NO puede hacer/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /¿Cómo audito una respuesta\?/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Limitaciones honestas/i })).toBeInTheDocument();
  });

  test('Botón "Volver al Manual" invoca onBackToHome', () => {
    const onBackToHome = vi.fn();
    render(<HelpAgentSection onBackToHome={onBackToHome} onNavigate={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver al Manual/i }));
    expect(onBackToHome).toHaveBeenCalled();
  });

  test('CTA "Volver a usar el agente" invoca onNavigate("agente")', () => {
    const onNavigate = vi.fn();
    render(<HelpAgentSection onBackToHome={() => {}} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /Volver a usar el agente/i }));
    expect(onNavigate).toHaveBeenCalledWith('agente');
  });

  test('Contenido visible no incluye términos de hype ni voseo argentino', () => {
    const { container } = render(
      <HelpAgentSection onBackToHome={() => {}} onNavigate={() => {}} />
    );
    const text = container.textContent || '';
    // Regla editorial task #123: cero hype + sin dialecto rioplatense.
    // Buscamos como palabras completas para no chocar con "vos" dentro de
    // "voseo" (que sí aparece en algún heading técnico permitido) y para
    // no falsear sobre "avanzada" si nunca está. Estos términos NO deben
    // aparecer en el contenido visible al usuario.
    expect(text).not.toMatch(/\brevolucionari[oa]\b/i);
    expect(text).not.toMatch(/inteligencia artificial avanzada/i);
    expect(text).not.toMatch(/mejor que un experto/i);
    expect(text).not.toMatch(/lo último en tecnología/i);
    // Voseo argentino (verbos típicos como segunda persona singular).
    expect(text).not.toMatch(/\bquerés\b/i);
    expect(text).not.toMatch(/\btenés\b/i);
    expect(text).not.toMatch(/\bdecímelo\b/i);
    expect(text).not.toMatch(/\babrís\b/i);
  });
});
