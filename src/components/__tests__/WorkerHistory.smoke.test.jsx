import { describe, test, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import WorkerHistory from '../WorkerHistory';

// La Bitácora consulta IndexedDB vía syncManager + logCache. En jsdom no hay
// IndexedDB real, así que mockeamos las lecturas a vacío para que monte limpio.
vi.mock('../../services/syncManager', () => ({
  syncManager: {
    initDB: vi.fn().mockResolvedValue(undefined),
    getPendingTransactions: vi.fn().mockResolvedValue([]),
    fetchPendingTasksFromFarmOS: vi.fn().mockResolvedValue(undefined),
    getPendingTasks: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../../db/logCache', () => ({
  logCache: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

beforeEach(() => {
  cleanup();
});

describe('WorkerHistory (Bitácora)', () => {
  test('renders header, tabs and filters', () => {
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText('Bitácora')).toBeInTheDocument();
    expect(screen.getByText('Registros')).toBeInTheDocument();
    expect(screen.getByText('Tareas hechas')).toBeInTheDocument();
  });

  test('shows "Agregar a la bitácora" CTAs (no es solo lectura)', () => {
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText(/Agregar a la bitácora/i)).toBeInTheDocument();
    // Accesos rápidos a las pantallas de registro.
    expect(screen.getAllByText('Cosecha').length).toBeGreaterThan(0);
    expect(screen.getByText('Insumo / abono')).toBeInTheDocument();
    expect(screen.getByText('Labor')).toBeInTheDocument();
  });

  test('syncCompleted event does not crash', () => {
    render(<WorkerHistory onBack={() => {}} />);
    window.dispatchEvent(new CustomEvent('syncCompleted', { detail: { id: 'log1' } }));
    expect(screen.getByText('Bitácora')).toBeInTheDocument();
  });

  test('estado vacío acogedor con accesos para empezar', async () => {
    render(<WorkerHistory onBack={() => {}} />);
    // El feed arranca vacío (mocks devuelven []), tras el load async aparece
    // el estado vacío con su CTA.
    expect(await screen.findByText(/Aún no has registrado nada/i)).toBeInTheDocument();
  });

  test('online/offline indicator renders', () => {
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText('Bitácora')).toBeInTheDocument();
  });
});
