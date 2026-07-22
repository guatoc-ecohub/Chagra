import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SyncIndicator from './SyncIndicator';

/**
 * SyncIndicator (rescate #2668 → cableado en App.jsx).
 *
 * Cablea offline-first: el campesino ve cuántos registros esperan a
 * sincronizarse aunque la app ya esté online (no depende de un evento
 * transicional online/offline, a diferencia de NetworkStatusBar).
 */
const getSyncStatsMock = vi.fn();
const syncAllMock = vi.fn();

vi.mock('../services/syncManager.js', () => ({
  syncManager: {
    getSyncStats: (...args) => getSyncStatsMock(...args),
    syncAll: (...args) => syncAllMock(...args),
  },
}));

describe('SyncIndicator', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando no hay operaciones pendientes', async () => {
    getSyncStatsMock.mockResolvedValue({ pendingCount: 0, isOnline: true, isSyncing: false });
    const { container } = render(<SyncIndicator />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('muestra el badge con el conteo cuando hay operaciones pendientes', async () => {
    getSyncStatsMock.mockResolvedValue({ pendingCount: 5, isOnline: true, isSyncing: false });
    render(<SyncIndicator />);
    expect(await screen.findByLabelText('5 pendientes de sincronizar')).toBeInTheDocument();
  });

  it('al tocar el badge dispara syncAll()', async () => {
    getSyncStatsMock.mockResolvedValue({ pendingCount: 2, isOnline: true, isSyncing: false });
    render(<SyncIndicator />);
    const boton = await screen.findByLabelText('2 pendientes de sincronizar');

    await userEvent.click(boton);

    await waitFor(() => expect(syncAllMock).toHaveBeenCalledTimes(1));
  });
});
