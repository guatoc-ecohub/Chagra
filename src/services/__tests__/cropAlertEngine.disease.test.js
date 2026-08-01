/**
 * cropAlertEngine — alerta PROACTIVA de enfermedad observada en la bitácora.
 *
 * Contrato: cuando un ciclo activo tiene una observación de enfermedad en su
 * bitácora, runCropAlerts emite 'alertTriggered' en el canal `crop_disease_<id>`
 * (separado del riesgo de plaga por etapa) → chip del home + grounding del agente.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { listFarmProcesses, getPestRisksByStage, getActiveDiseaseForCycle, getEnsoServicePhase, getEnsoLabel } =
  vi.hoisted(() => ({
    listFarmProcesses: vi.fn(),
    getPestRisksByStage: vi.fn(),
    getActiveDiseaseForCycle: vi.fn(),
    getEnsoServicePhase: vi.fn(),
    getEnsoLabel: vi.fn(),
  }));

vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses }));
vi.mock('../climateCycleService', () => ({ getPestRisksByStage }));
vi.mock('../diseaseObservationService', () => ({ getActiveDiseaseForCycle }));
vi.mock('../ensoService', () => ({ getEnsoServicePhase, getEnsoLabel }));

import { runCropAlerts } from '../cropAlertEngine';

const cycle = (id, slug = 'lactuca_sativa', label = 'Lechuga') => ({
  process_id: id,
  attributes: { current_stage: 'vegetative', subject_slug: slug, subject_label: label, status: 'active' },
});

let events;
beforeEach(() => {
  listFarmProcesses.mockReset();
  getPestRisksByStage.mockReset().mockReturnValue([]);
  getActiveDiseaseForCycle.mockReset().mockResolvedValue(null);
  getEnsoServicePhase.mockReset().mockReturnValue(null);
  getEnsoLabel.mockReset().mockReturnValue('Neutral');
  events = [];
  vi.spyOn(window, 'dispatchEvent').mockImplementation((ev) => {
    events.push({ name: ev.type, detail: /** @type {CustomEvent} */ (ev).detail });
    return true;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('cropAlertEngine — enfermedad de bitácora (proactiva)', () => {
  it('emite alertTriggered crop_disease cuando la bitácora reporta enfermedad', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p1')]);
    getActiveDiseaseForCycle.mockResolvedValue({
      isDisease: true,
      pathogen: 'Mildeo velloso (Bremia lactucae)',
      severity: 'alto',
      control: 'Mejora la aireación y evita el riego sobre las hojas.',
      symptom: 'polvillo blanco en las hojas',
      observedAt: 123,
    });
    await runCropAlerts();
    const trig = events.find((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_disease_p1');
    expect(trig).toBeTruthy();
    expect(trig.detail.message).toMatch(/Bremia lactucae/);
    expect(trig.detail.severity).toBe('warning');
    expect(trig.detail.source).toBe('crop');
  });

  it('limpia crop_disease cuando NO hay enfermedad en la bitácora', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p2')]);
    getActiveDiseaseForCycle.mockResolvedValue(null);
    await runCropAlerts();
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_disease_p2')).toBe(true);
    expect(events.some((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_disease_p2')).toBe(false);
  });

  it('síntoma sin patógeno identificado emite alerta info "a vigilar"', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p3', 'zea_mays', 'Maíz')]);
    getActiveDiseaseForCycle.mockResolvedValue({
      isDisease: true,
      pathogen: null,
      severity: 'medio',
      control: null,
      symptom: 'manchas raras en las hojas',
      observedAt: 1,
    });
    await runCropAlerts();
    const trig = events.find((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_disease_p3');
    expect(trig).toBeTruthy();
    expect(trig.detail.severity).toBe('info');
    expect(trig.detail.message).toMatch(/vigilar/i);
  });
});
