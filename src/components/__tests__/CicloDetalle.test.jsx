/**
 * CicloDetalle — enriquecimiento del detalle del ciclo (antes "oscuro"):
 * confirmar etapa (stageConfirmationService), biopreparados por etapa
 * (climateCycleService) y completar labor (voiceTaskService).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { confirmStage, completeTaskByVoice } = vi.hoisted(() => ({
  confirmStage: vi.fn(), completeTaskByVoice: vi.fn(),
}));

vi.mock('../FarmProcessSummary', () => ({ default: () => null }));
vi.mock('../PhenologyTimeline', () => ({ default: () => null }));
vi.mock('../CicloObservacion', () => ({ default: () => null }));
vi.mock('../CicloFotos', () => ({ default: () => null }));
vi.mock('../../services/cycleTaskService', () => ({
  getTasksForCycle: () => [{ id: 't1', label: 'Regar el café' }],
  getUrgentTasks: () => [],
}));
vi.mock('../../services/climateCycleService', () => ({
  getPestRisksByStage: () => [],
  getBiopreparadosForStage: () => [{ nombre: 'Caldo bordelés', uso: 'Preventivo fungoso' }],
  getEnsemblePreventiveTasks: () => [],
}));
vi.mock('../../services/ensoService', () => ({ getEnsoServicePhase: () => null, getEnsoLabel: () => 'Neutral' }));
vi.mock('../../services/stageConfirmationService', () => ({ confirmStage }));
vi.mock('../../services/voiceTaskService', () => ({ completeTaskByVoice }));

import CicloDetalle from '../CicloDetalle';

const CYCLE = { process_id: 'p1', attributes: { subject_label: 'Café', subject_slug: 'coffea_arabica', current_stage: 'vegetative', status: 'active' } };

beforeEach(() => { confirmStage.mockReset().mockResolvedValue({}); completeTaskByVoice.mockReset().mockResolvedValue({}); });
afterEach(() => cleanup());

describe('CicloDetalle', () => {
  it('muestra biopreparados de la etapa y la labor', () => {
    render(<CicloDetalle cycle={CYCLE} altitudeM={1500} onReload={() => {}} />);
    expect(screen.getByText('Caldo bordelés')).toBeTruthy();
    expect(screen.getByText('Regar el café')).toBeTruthy();
  });

  it('confirmar etapa llama a confirmStage con el processId', async () => {
    const onReload = vi.fn();
    render(<CicloDetalle cycle={CYCLE} altitudeM={1500} onReload={onReload} />);
    fireEvent.click(screen.getByText('¿Cambió de etapa?'));
    fireEvent.click(screen.getByLabelText('Confirmar etapa Floración'));
    await waitFor(() => expect(confirmStage).toHaveBeenCalledTimes(1));
    expect(confirmStage.mock.calls[0][0]).toMatchObject({ processId: 'p1', newStage: 'flowering' });
    await waitFor(() => expect(onReload).toHaveBeenCalled());
  });

  it('marcar labor hecha llama a completeTaskByVoice', async () => {
    render(<CicloDetalle cycle={CYCLE} altitudeM={1500} onReload={() => {}} />);
    fireEvent.click(screen.getByText('Marcar hecha'));
    await waitFor(() => expect(completeTaskByVoice).toHaveBeenCalledTimes(1));
    expect(completeTaskByVoice.mock.calls[0][0]).toMatchObject({ processId: 'p1', taskName: 'Regar el café' });
  });
});
