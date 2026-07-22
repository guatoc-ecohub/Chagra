import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../config/glaciarAccess', () => ({
  tieneAccesoGlaciarActual: () => false,
  esOperadorActual: () => false,
}));

vi.mock('../AgentHero', () => ({ default: () => <div data-testid="agent-hero" /> }));
vi.mock('../../PrimerRegistroCard', () => ({ default: () => <div /> }));
vi.mock('../SelectedBackgroundReveal', () => ({ default: () => <div /> }));
vi.mock('../ClimaStrip', () => ({ default: () => <div /> }));
vi.mock('../HoyEnFincaStrip', () => ({ default: () => <div /> }));
vi.mock('../AIStatusFooter', () => ({ default: () => <div /> }));
vi.mock('../AnalisisProactivoIA', () => ({ default: () => <div /> }));

vi.mock('../../../store/useAssetStore', () => ({
  default: (selector) => selector({
    plants: [{ id: 'p1' }],
    lands: [],
    materials: [],
    isHydrated: true,
    iotAlerts: [],
  }),
}));

vi.mock('../../../db/farmProcessCache', () => ({
  listFarmProcesses: vi.fn(async () => []),
}));

let mockProfile = { rol: 'campesino' };
vi.mock('../../../services/userProfileService', async (importOriginal) => {
  const actual = /** @type {any} */ (await importOriginal());
  return {
    ...actual,
    getProfile: vi.fn(() => mockProfile),
    hasManualModuleVisibility: vi.fn(() => false),
  };
});

globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

import DashboardLive from '../DashboardLive';

beforeEach(() => {
  vi.clearAllMocks();
  mockProfile = { rol: 'campesino' };
});

afterEach(() => cleanup());

describe('DashboardLive asociaciones', () => {
  test('el botón Asociaciones abre el módulo desde el Home', async () => {
    const onNavigate = vi.fn();
    render(<DashboardLive onNavigate={onNavigate} />);

    await waitFor(() => expect(screen.getByTestId('agent-hero')).toBeInTheDocument());
    const button = screen.getByRole('button', { name: /Asociaciones/ });
    expect(button).toHaveTextContent('Policultivos y compañía de plantas');

    fireEvent.click(button);
    expect(onNavigate).toHaveBeenCalledWith('asociaciones');
  });
});
