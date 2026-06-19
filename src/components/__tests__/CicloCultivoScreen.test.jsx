/**
 * CicloCultivoScreen — cablea el track de fenología/ciclo (antes "oscuro").
 *
 * Contrato cubierto:
 *   - Vacío: invita a registrar por voz (tie-in con Procesos por voz).
 *   - Con ciclos: lista los FarmProcess y, al tocar uno, muestra el detalle con
 *     la línea de tiempo fenológica (PhenologyTimeline) — piezas antes huérfanas.
 *   - Backfill: hidrata ciclos desde plantas activas de farmOS que no tengan
 *     ciclo local (TASK #ciclo-backfill-plantas-2026-06-19).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { listFarmProcesses, hydrateCyclesFromFarmOS } = vi.hoisted(() => ({
  listFarmProcesses: vi.fn(),
  hydrateCyclesFromFarmOS: vi.fn(),
}));

vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses, hydrateCyclesFromFarmOS }));
vi.mock('../../services/userProfileService', () => ({ getProfile: () => ({ finca_altitud: 2600 }) }));
vi.mock('../../services/cycleTaskService', () => ({
  getTasksForCycle: () => [{ id: 't1', label: 'Regar' }],
  getUrgentTasks: () => [],
}));
vi.mock('../../services/climateCycleService', () => ({ getPestRisksByStage: () => [] }));
// El widget de observación tiene su propio test; acá se stubea para aislar.
vi.mock('../CicloObservacion', () => ({ default: () => null }));

import CicloCultivoScreen from '../CicloCultivoScreen';

const CYCLE = {
  process_id: 'p1',
  type: 'farm_process',
  attributes: {
    subject_label: 'Fresa',
    subject_slug: 'fragaria_x_ananassa',
    current_stage: 'sowing_confirmed',
    created_at: 1749500000000,
    quantity: 5,
    unit: 'plantas',
    status: 'active',
  },
};

beforeEach(() => {
  listFarmProcesses.mockReset();
  hydrateCyclesFromFarmOS.mockReset();
});
afterEach(() => cleanup());

describe('CicloCultivoScreen — ciclo del cultivo (fenología wired)', () => {

  it('estado vacío invita a registrar por voz', async () => {
    listFarmProcesses.mockResolvedValue([]);
    hydrateCyclesFromFarmOS.mockImplementation((cycles) => Promise.resolve(cycles));
    const onNavigate = vi.fn();
    render(<CicloCultivoScreen onBack={() => {}} onNavigate={onNavigate} />);
    const btn = await screen.findByText(/Registrar por voz/i);
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith('procesos');
  });

  it('lista los ciclos y abre el detalle con la línea de tiempo', async () => {
    listFarmProcesses.mockResolvedValue([CYCLE]);
    hydrateCyclesFromFarmOS.mockImplementation((cycles) => Promise.resolve(cycles));
    render(<CicloCultivoScreen onBack={() => {}} onNavigate={() => {}} />);
    // La tarjeta de la lista es un botón con el cultivo (hay otros "Fresa" en el
    // digest DailyTasksView, por eso se apunta al botón, no al texto suelto).
    const card = await screen.findByRole('button', { name: /Fresa/ });
    fireEvent.click(card);
    // El detalle muestra la sección de línea de tiempo y las labores cableadas.
    await waitFor(() => expect(screen.getByText(/Línea de tiempo/i)).toBeTruthy());
    expect(screen.getByText('Regar')).toBeTruthy();
  });

  it('backfill: hidrata ciclos desde plantas de farmOS (TASK #ciclo-backfill-plantas)', async () => {
    const localCycles = [CYCLE];
    const hydratedCycles = [
      CYCLE,
      {
        process_id: 'p2',
        type: 'farm_process',
        attributes: {
          subject_label: 'Café',
          subject_slug: 'caffea_arabica',
          current_stage: 'sowing_confirmed',
          created_at: 1749500000000,
          quantity: 100,
          unit: 'plantas',
          status: 'active',
          _synthetic: true,
        },
      },
    ];

    listFarmProcesses.mockResolvedValue(localCycles);
    hydrateCyclesFromFarmOS.mockResolvedValue(hydratedCycles);

    render(<CicloCultivoScreen onBack={() => {}} onNavigate={() => {}} />);

    // Esperar a que se muestren ambos ciclos
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fresa/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Café/ })).toBeTruthy();
    });

    expect(hydrateCyclesFromFarmOS).toHaveBeenCalledWith(localCycles);
  });

  it('backfill: tolera errores de hidratación y muestra solo locales', async () => {
    const localCycles = [CYCLE];
    listFarmProcesses.mockResolvedValue(localCycles);
    hydrateCyclesFromFarmOS.mockRejectedValue(new Error('Error de hidratación'));

    render(<CicloCultivoScreen onBack={() => {}} onNavigate={() => {}} />);

    // Debería mostrar al menos el ciclo local a pesar del error
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Fresa/ })).toBeTruthy();
    });
  });
});
