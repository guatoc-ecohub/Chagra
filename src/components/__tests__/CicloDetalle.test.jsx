/* eslint-disable chagra-i18n/no-hardcoded-spanish -- aserciones de UI ES-CO en test. */
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
vi.mock('../PhenologyTimeline', () => ({
  default: ({ phenologyTemplate }) => (
    <div>
      {(phenologyTemplate?.stages || []).map((stage) => (
        <span key={stage.code}>{stage.label}</span>
      ))}
    </div>
  ),
}));
vi.mock('../CicloObservacion', () => ({ default: () => null }));
vi.mock('../CicloFotos', () => ({ default: () => null }));
vi.mock('../SpeciesImage', () => ({ default: () => null }));
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
// CicloDetalle resuelve la especie de forma tolerante con getAllSpecies +
// matchSpeciesInCatalog (igual que la ficha de especie). El mock devuelve el
// catálogo completo; el matcher hace el match exacto por id/slug.
vi.mock('../../db/catalogDB', () => ({
  getAllSpecies: async () => [
    { id: 'coffea_arabica', slug: 'coffea_arabica', nombre_comun: 'Café', nombre_cientifico: 'Coffea arabica', category: 'cafe' },
    { id: 'fragaria_ananassa', slug: 'fragaria_ananassa', nombre_comun: 'Fresa', nombre_cientifico: 'Fragaria ananassa', category: 'frutales' },
    {
      id: 'catalogo_especifico',
      slug: 'catalogo_especifico',
      nombre_comun: 'Cultivo catálogo',
      phenology_template: {
        stages: [
          { code: 'sowing', label: 'Siembra catálogo', minDays: 0, maxDays: 0 },
          { code: 'brotacion_catalogo', label: 'Brotación específica del catálogo', minDays: 1, maxDays: 10 },
        ],
        sources: [{ name: 'Catálogo Chagra' }],
      },
    },
  ],
}));

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

  it('usa la fenología específica del catálogo antes que la plantilla genérica por slug', async () => {
    render(<CicloDetalle
      cycle={{
        process_id: 'p-cat',
        attributes: {
          subject_label: 'Cultivo catálogo',
          subject_slug: 'catalogo_especifico',
          current_stage: 'sowing_confirmed',
          created_at: new Date('2026-06-01T00:00:00Z').getTime(),
          status: 'active',
        },
      }}
      altitudeM={1500}
      onReload={() => {}}
    />);

    // La especie se resuelve de forma asíncrona (getAllSpecies), así que la
    // plantilla del catálogo aparece tras el match tolerante.
    expect(await screen.findByText('Brotación específica del catálogo')).toBeTruthy();
  });

  it('resuelve la fenología por slug canónico cuando el ciclo guarda el nombre común (fresa)', async () => {
    // Regresión 2026-06-20 (operador, fresa): subject_slug="fresa" no coincide
    // con el id del catálogo "fragaria_ananassa"; el match tolerante por nombre
    // común debe llevar a getTemplate('fragaria_ananassa') → timeline poblada,
    // nunca "Datos insuficientes".
    const { container } = render(<CicloDetalle
      cycle={{
        process_id: 'p-fresa',
        attributes: {
          subject_label: 'Fresa',
          subject_slug: 'fresa',
          current_stage: 'vegetative',
          created_at: new Date('2026-05-01T00:00:00Z').getTime(),
          status: 'active',
        },
      }}
      altitudeM={1800}
      onReload={() => {}}
    />);

    // El mock de PhenologyTimeline renderiza un <span> por etapa del template;
    // si la resolución fallara, no habría ninguno.
    await waitFor(() => expect(container.querySelectorAll('span').length).toBeGreaterThan(0));
  });
});
