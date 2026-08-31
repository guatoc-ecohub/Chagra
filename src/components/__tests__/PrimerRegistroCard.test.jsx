import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PrimerRegistroCard from '../PrimerRegistroCard';

const save = vi.fn();

vi.mock('../../store/useAssetStore', () => ({
  default: (selector) => selector({ lands: [] }),
}));

vi.mock('../../services/perfilFincaService', () => ({
  getContextoGeoFinca: () => ({ altitudMsnm: null, thermalZones: [] }),
}));

vi.mock('../../hooks/useAutosave', () => ({
  useAutosave: () => ({ save }),
}));

describe('PrimerRegistroCard', () => {
  beforeEach(() => save.mockClear());

  it('envia la configuracion inicial al unico onboarding vigente', () => {
    const onNavigate = vi.fn();
    render(<PrimerRegistroCard onNavigate={onNavigate} compact />);

    fireEvent.click(screen.getByRole('button', { name: /Configurar mi finca/i }));

    expect(onNavigate).toHaveBeenCalledWith('onboarding-perfil');
    expect(save).toHaveBeenCalledWith({ lastCta: 'onboarding-perfil' });
  });

  it.each([
    ['Foto', 'plant_asset'],
    ['Voz', 'voz'],
    ['Escribir', 'sembrar'],
  ])('conserva la entrada de registro por %s', (label, route) => {
    const onNavigate = vi.fn();
    render(<PrimerRegistroCard onNavigate={onNavigate} />);

    fireEvent.click(screen.getByRole('button', { name: new RegExp(label, 'i') }));

    expect(onNavigate).toHaveBeenCalledWith(route);
  });
});
