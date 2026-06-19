import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('FermentosCard', () => {
  it('debería renderizar correctamente', async () => {
    const { FermentosCard } = await import('../FincaCards');
    const onNavigate = vi.fn();

    const { container } = render(
      <FermentosCard onNavigate={onNavigate} variant="grid" />
    );

    expect(screen.getByText(/Fermentos/i)).toBeInTheDocument();
    expect(screen.getByText(/Recetas tradicionales/i)).toBeInTheDocument();
  });

  it('debería llamar onNavigate al hacer click', async () => {
    const { FermentosCard } = await import('../FincaCards');
    const onNavigate = vi.fn();

    const { container } = render(
      <FermentosCard onNavigate={onNavigate} variant="grid" />
    );

    const button = container.querySelector('button');
    if (button) {
      button.click();
      expect(onNavigate).toHaveBeenCalledWith('fermentos');
    }
  });
});
