/**
 * CicloCultivoScreen — cablea el track de fenología/ciclo (antes "oscuro").
 *
 * Contrato cubierto:
 *   - Vacío: invita a registrar por voz (tie-in con Procesos por voz).
 *   - Con ciclos: lista los FarmProcess y, al tocar uno, muestra el detalle con
 *     la línea de tiempo fenológica (PhenologyTimeline) — piezas antes huérfanas.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { listFarmProcesses } = vi.hoisted(() => ({ listFarmProcesses: vi.fn() }));

vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses }));
vi.mock('../../services/userProfileService', () => ({ getProfile: () => ({ finca_altitud: 2600 }) }));
vi.mock('../../services/cycleTaskService', () => ({
  getTasksForCycle: () => [{ id: 't1', label: 'Regar' }],
  getUrgentTasks: () => [],
}));
vi.mock('../../services/climateCycleService', () => ({ getPestRisksByStage: () => [] }));

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

beforeEach(() => { listFarmProcesses.mockReset(); });
afterEach(() => cleanup());

describe('CicloCultivoScreen — ciclo del cultivo (fenología wired)', () => {
  it('estado vacío invita a registrar por voz', async () => {
    listFarmProcesses.mockResolvedValue([]);
    const onNavigate = vi.fn();
    render(<CicloCultivoScreen onBack={() => {}} onNavigate={onNavigate} />);
    const btn = await screen.findByText(/Registrar por voz/i);
    fireEvent.click(btn);
    expect(onNavigate).toHaveBeenCalledWith('procesos');
  });

  it('lista los ciclos y abre el detalle con la línea de tiempo', async () => {
    listFarmProcesses.mockResolvedValue([CYCLE]);
    render(<CicloCultivoScreen onBack={() => {}} onNavigate={() => {}} />);
    // La lista muestra el cultivo.
    const card = await screen.findByText('Fresa');
    fireEvent.click(card);
    // El detalle muestra la sección de línea de tiempo y las labores cableadas.
    await waitFor(() => expect(screen.getByText(/Línea de tiempo/i)).toBeTruthy());
    expect(screen.getByText('Regar')).toBeTruthy();
  });
});
