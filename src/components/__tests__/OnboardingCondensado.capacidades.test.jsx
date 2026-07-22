import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingCondensado from '../OnboardingCondensado';

const promptInstall = vi.fn();

vi.mock('../../hooks/usePwaInstall', () => ({
  default: () => ({
    canInstall: true,
    installed: false,
    isIos: false,
    promptInstall,
  }),
}));

vi.mock('../ChagraAgentAvatarAngelita', () => ({
  default: () => <div data-testid="angelita-stub" />,
}));

describe('OnboardingCondensado, capacidades consolidadas', () => {
  beforeEach(() => {
    promptInstall.mockClear();
    window.localStorage.clear();
  });

  it('conserva capacidades e instalación PWA en el paso final', () => {
    render(<OnboardingCondensado onComplete={vi.fn()} />);

    fireEvent.click(screen.getByTestId('onb2-siguiente'));
    fireEvent.click(screen.getByTestId('onb2-ubicacion-despues'));
    fireEvent.click(screen.getByTestId('onb2-terminar-finca'));
    fireEvent.click(screen.getByRole('button', { name: /Una finca o cultivo abierto/i }));
    fireEvent.click(screen.getByTestId('onb2-guardar-escala'));
    fireEvent.click(screen.getByTestId('onb2-invernadero-no'));
    fireEvent.click(screen.getByTestId('onb2-guardar-invernadero'));
    fireEvent.click(screen.getByRole('button', { name: /Lluvia/i }));
    fireEvent.click(screen.getByTestId('onb2-guardar-agua'));

    expect(screen.getByTestId('onb2-capacidades').textContent).toContain('Hablar por voz');
    expect(screen.getByTestId('onb2-capacidades').textContent).toContain('Mostrar una foto');
    expect(screen.getByTestId('onb2-capacidades').textContent).toContain('Revisar fuentes');

    fireEvent.click(screen.getByTestId('onb2-instalar-pwa'));
    expect(promptInstall).toHaveBeenCalledOnce();
  });
});
