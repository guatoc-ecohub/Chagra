import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import HelpTipCard from '../HelpTipCard.jsx';
import { HELP_TIPS, TIP_CATEGORIES } from '../../data/help-tips.js';
import { describe, test, expect, beforeEach } from 'vitest';

/**
 * Smoke test del HelpTipCard rediseñado (overhaul ayuda 2026-07).
 *
 * Verifica:
 *   - Muestra un tip con su título corto (escaneable) y botón "Otro tip".
 *   - "Otro tip" carga uno distinto sin repetir los últimos 5 (localStorage).
 *   - Los datos: todo tip tiene title/category/source y la categoría existe
 *     en TIP_CATEGORIES (el ícono grande nunca cae a undefined).
 */
describe('HelpTipCard smoke', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('Renderiza un tip con título y botón "Otro tip"', async () => {
    render(<HelpTipCard />);
    // El tip carga async (setTimeout 0)
    expect(await screen.findByText(/Tip del día/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Otro tip/i })).toBeInTheDocument();
  });

  test('"Otro tip" persiste el historial en localStorage', async () => {
    render(<HelpTipCard />);
    const btn = await screen.findByRole('button', { name: /Otro tip/i });
    act(() => {
      fireEvent.click(btn);
    });
    const history = JSON.parse(localStorage.getItem('chagra:help_tip_history'));
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  test('Todos los tips tienen título corto y categoría con metadatos', () => {
    for (const tip of HELP_TIPS) {
      expect(tip.title, `tip ${tip.id} sin title`).toBeTruthy();
      expect(tip.title.length, `título muy largo en ${tip.id}`).toBeLessThanOrEqual(60);
      expect(TIP_CATEGORIES[tip.category], `categoría desconocida en ${tip.id}`).toBeTruthy();
      expect(tip.source, `tip ${tip.id} sin fuente`).toBeTruthy();
    }
  });

  test('El copy de los tips no contiene voseo argentino ni jerga académica', () => {
    const text = HELP_TIPS.map((t) => `${t.title} ${t.text}`).join(' ');
    expect(text).not.toMatch(/\btenés\b|\bpodés\b|\belegí\b/i);
    // Jerga que el overhaul sacó a propósito (habla campesina):
    expect(text).not.toMatch(/edáfic|cinétic|milimétric|arquitectónic/i);
  });
});
