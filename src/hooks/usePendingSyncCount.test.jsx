import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { usePendingSyncCount } from './usePendingSyncCount';

/**
 * usePendingSyncCount (rescate #2668 → cableado).
 *
 * Bug corregido: la versión original llamaba a `syncManager.getPendingCount()`,
 * un método que nunca existió (ni en dev ni en app-3d) — el contador siempre
 * caía al fallback de IndexedDB crudo. Este test fija el contrato correcto:
 * el hook debe leer `syncManager.getSyncStats().pendingCount`, el método REAL
 * que ya usa NetworkStatusBar en producción.
 */
vi.mock('../services/syncManager.js', () => ({
  syncManager: {
    getSyncStats: vi.fn(async () => ({ pendingCount: 3, isOnline: true, isSyncing: false })),
  },
}));

function Sonda() {
  const { pending } = usePendingSyncCount();
  return <div data-testid="pending">{pending}</div>;
}

describe('usePendingSyncCount', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('lee pendingCount desde syncManager.getSyncStats() (no desde getPendingCount)', async () => {
    render(<Sonda />);
    await waitFor(() => {
      expect(screen.getByTestId('pending')).toHaveTextContent('3');
    });
  });

  it('se refresca cuando el syncManager dispara syncComplete', async () => {
    const { syncManager } = await import('../services/syncManager.js');
    render(<Sonda />);
    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('3'));

    vi.mocked(syncManager.getSyncStats).mockResolvedValueOnce({ pendingCount: 0, isOnline: true, isSyncing: false });
    window.dispatchEvent(new CustomEvent('syncComplete'));

    await waitFor(() => expect(screen.getByTestId('pending')).toHaveTextContent('0'));
  });
});
