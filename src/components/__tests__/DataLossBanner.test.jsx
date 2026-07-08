import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockShouldWarnDataLoss,
  mockRecoverDataFromFarmOS,
} = vi.hoisted(() => ({
  mockShouldWarnDataLoss: vi.fn(),
  mockRecoverDataFromFarmOS: vi.fn(),
}));

vi.mock('../../services/emptyDbDetector', () => ({
  shouldWarnDataLoss: mockShouldWarnDataLoss,
}));

vi.mock('../../services/dataRecovery', () => ({
  recoverDataFromFarmOS: mockRecoverDataFromFarmOS,
}));

import DataLossBanner from '../DataLossBanner';

describe('DataLossBanner', () => {
  beforeEach(() => {
    mockShouldWarnDataLoss.mockReset();
    mockRecoverDataFromFarmOS.mockReset();
    mockShouldWarnDataLoss.mockResolvedValue({
      shouldWarn: true,
      lastKnownCount: 12,
      lastMarkedAt: '2026-07-01T12:00:00.000Z',
    });
    mockRecoverDataFromFarmOS.mockResolvedValue(undefined);
  });

  it('muestra el CTA de recuperar datos y mantiene acciones secundarias', async () => {
    render(<DataLossBanner onDismiss={vi.fn()} />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /recuperar mis datos/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /importar copia/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /cerrar advertencia/i })).toBeTruthy();
    expect(screen.getByText(/tus datos guardados en la nube de chagra estan a salvo/i)).toBeTruthy();
  });

  it('el CTA principal fuerza el re-pull desde FarmOS y oculta el banner', async () => {
    const onDismiss = vi.fn();
    render(<DataLossBanner onDismiss={onDismiss} />);

    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: /recuperar mis datos/i }));

    await waitFor(() => expect(mockRecoverDataFromFarmOS).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
