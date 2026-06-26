/**
 * registro-redesign.test.jsx — Tarea #22.
 *
 * Cubre el rediseño de las 4 ventanas de registro (Cosechar, Insumos, Labores,
 * Bitácora):
 *   - Con la flag fincaVivaHomePerfilActivo() OFF → markup legacy (sin cambios).
 *   - Con la flag ON → caparazón Chagra (RegistroShell) theme-aware.
 *   - Los formularios siguen funcionando (guardan) en ambos modos.
 *
 * Español de Colombia (tú/usted), sin voseo.
 */
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let flagOn = false;
vi.mock('../../config/fincaVivaHomeFlag', () => ({
  fincaVivaHomePerfilActivo: () => flagOn,
}));

vi.mock('../../services/payloadService', () => ({
  savePayload: vi.fn().mockResolvedValue({ success: true, message: 'OK' }),
}));
vi.mock('../../config/defaults', () => ({
  FARM_CONFIG: { LOCATION_ID: 'loc-1', FARM_NAME: 'Finca Test' },
}));
vi.mock('../../services/syncManager', () => ({
  syncManager: {
    initDB: vi.fn().mockResolvedValue(undefined),
    getPendingTransactions: vi.fn().mockResolvedValue([]),
    fetchPendingTasksFromFarmOS: vi.fn().mockResolvedValue(undefined),
    getPendingTasks: vi.fn().mockResolvedValue([]),
    saveTransaction: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../../db/logCache', () => ({
  logCache: {
    getAll: vi.fn().mockResolvedValue([]),
    getByType: vi.fn().mockResolvedValue([]),
  },
}));

import HarvestLog from '../HarvestLog';
import InputLog from '../InputLog';
import MaintenanceScreen from '../MaintenanceScreen';
import WorkerHistory from '../WorkerHistory';

beforeEach(() => {
  flagOn = false;
});
afterEach(() => cleanup());

describe('Las 4 pantallas montan sin error (flag OFF y ON)', () => {
  it.each([false, true])('HarvestLog (Cosechar) monta — flag=%s', (on) => {
    flagOn = on;
    render(<HarvestLog onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByText('Cosechar')).toBeInTheDocument();
  });

  it.each([false, true])('InputLog (Insumos) monta — flag=%s', (on) => {
    flagOn = on;
    render(<InputLog onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('button', { name: /registrar aplicación/i })).toBeInTheDocument();
  });

  it.each([false, true])('MaintenanceScreen (Labores) monta — flag=%s', (on) => {
    flagOn = on;
    render(<MaintenanceScreen onBack={() => {}} onSave={() => {}} />);
    expect(screen.getByRole('button', { name: /guardar (mantenimiento|labor)/i })).toBeInTheDocument();
  });

  it.each([false, true])('WorkerHistory (Bitácora) monta — flag=%s', (on) => {
    flagOn = on;
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText('Bitácora')).toBeInTheDocument();
  });
});

describe('Rediseño (flag ON): caparazón Chagra theme-aware', () => {
  it('Cosechar usa la clase registro-shell', () => {
    flagOn = true;
    const { container } = render(<HarvestLog onBack={() => {}} onSave={() => {}} />);
    expect(container.querySelector('.registro-shell')).toBeTruthy();
    expect(container.querySelector('.registro-cta')).toBeTruthy();
  });

  it('Insumos usa el caparazón y microcopy campesino', () => {
    flagOn = true;
    const { container } = render(<InputLog onBack={() => {}} onSave={() => {}} />);
    expect(container.querySelector('.registro-shell')).toBeTruthy();
    expect(screen.getByText(/Abonos e insumos/i)).toBeInTheDocument();
  });

  it('Labores usa el caparazón', () => {
    flagOn = true;
    const { container } = render(<MaintenanceScreen onBack={() => {}} onSave={() => {}} />);
    expect(container.querySelector('.registro-shell')).toBeTruthy();
    expect(screen.getByText(/Labores de la finca/i)).toBeInTheDocument();
  });
});

describe('Los formularios siguen funcionando con el rediseño (flag ON)', () => {
  it('Insumos guarda con cantidad válida', async () => {
    flagOn = true;
    const onSave = vi.fn();
    render(<InputLog onBack={() => {}} onSave={onSave} />);

    const materialSelect = screen.getByRole('combobox', { name: /qué aplicaste/i });
    fireEvent.change(materialSelect, { target: { value: 'mat-bio' } });
    const qtyInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(qtyInput, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: /registrar aplicación/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('OK', false));
  });

  it('Insumos valida campos requeridos vacíos', async () => {
    flagOn = true;
    const onSave = vi.fn();
    render(<InputLog onBack={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /registrar aplicación/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('Completa Ubicación, Tipo de Insumo y Cantidad', true),
    );
  });

  it('Labores valida descripción requerida', async () => {
    flagOn = true;
    const onSave = vi.fn();
    render(<MaintenanceScreen onBack={() => {}} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /guardar labor/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('Completa tipo de mantenimiento y descripcion', true),
    );
  });
});

describe('Bitácora útil (UNGATED): historial + CTA agregar', () => {
  it('muestra la barra de "Agregar a la bitácora" aunque la flag esté OFF', () => {
    flagOn = false;
    render(<WorkerHistory onBack={() => {}} />);
    expect(screen.getByText(/Agregar a la bitácora/i)).toBeInTheDocument();
  });

  it('el estado vacío invita a registrar (no es pantalla muerta)', async () => {
    flagOn = false;
    render(<WorkerHistory onBack={() => {}} />);
    expect(await screen.findByText(/Aún no has registrado nada/i)).toBeInTheDocument();
  });

  it('un acceso de agregar despacha el evento chagraNavigate al destino correcto', () => {
    flagOn = false;
    const spy = vi.fn();
    window.addEventListener('chagraNavigate', spy);
    render(<WorkerHistory onBack={() => {}} />);
    fireEvent.click(screen.getByText('Insumo / abono'));
    expect(spy).toHaveBeenCalled();
    const ev = spy.mock.calls[0][0];
    expect(ev.detail.view).toBe('insumos');
    window.removeEventListener('chagraNavigate', spy);
  });
});
