import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeSelector from '../ThemeSelector.jsx';

describe('ThemeSelector — a11y teclado', () => {
  it('todos los temas son botones con aria-pressed', () => {
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.getAttribute('aria-pressed')).toBeDefined();
    }
  });

  it('activa un tema al hacer click', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  });

  it('se navega con Tab entre temas', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    buttons[0].focus();
    expect(document.activeElement).toBe(buttons[0]);
    await user.tab();
    expect(document.activeElement).toBe(buttons[1]);
  });

  it('activa tema con tecla Enter', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    buttons[2].focus();
    await user.keyboard('{Enter}');
    expect(buttons[2].getAttribute('aria-pressed')).toBe('true');
  });

  it('activa tema con tecla Space', async () => {
    const user = userEvent.setup();
    render(<ThemeSelector />);
    const buttons = screen.getAllByRole('button');
    buttons[3].focus();
    await user.keyboard(' ');
    expect(buttons[3].getAttribute('aria-pressed')).toBe('true');
  });
});
