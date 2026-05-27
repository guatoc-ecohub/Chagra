import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect } from 'vitest';
import AIBetaBadge from '../AIBetaBadge';

// Smoke tests UX-1 (#284) — el badge debe:
//   - renderizar sin crashear,
//   - exponer un testid estable para los call-sites (chat, species select),
//   - llevar el tooltip default ("Respuesta generada por IA — verifica…"),
//   - permitir override del tooltip vía prop `title`.

describe('AIBetaBadge — pill discreto de respuesta IA', () => {
  test('renderiza con texto "beta" y testid estable', () => {
    render(<AIBetaBadge />);
    const badge = screen.getByTestId('ai-beta-badge');
    expect(badge).toBeInTheDocument();
    expect(badge.textContent).toMatch(/beta/i);
  });

  test('expone tooltip default vía title + aria-label', () => {
    render(<AIBetaBadge />);
    const badge = screen.getByTestId('ai-beta-badge');
    expect(badge.getAttribute('title')).toMatch(/Respuesta generada por IA/i);
    expect(badge.getAttribute('aria-label')).toMatch(/verifica/i);
  });

  test('respeta override de title cuando el call-site lo pasa', () => {
    render(<AIBetaBadge title="Identificación generada por IA — verifica." />);
    const badge = screen.getByTestId('ai-beta-badge');
    expect(badge.getAttribute('title')).toBe('Identificación generada por IA — verifica.');
    expect(badge.getAttribute('aria-label')).toBe('Identificación generada por IA — verifica.');
  });

  test('aplica className extra sin perder las clases base', () => {
    render(<AIBetaBadge className="mt-4" />);
    const badge = screen.getByTestId('ai-beta-badge');
    expect(badge.className).toMatch(/mt-4/);
    expect(badge.className).toMatch(/rounded-full/);
  });
});
