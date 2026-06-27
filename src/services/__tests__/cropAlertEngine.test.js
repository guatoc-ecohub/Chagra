/**
 * cropAlertEngine — productor de alertas del cultivo (antes "oscuro").
 *
 * Contrato cubierto:
 *   - Emite 'alertTriggered' (mismo canal que el clima → chip del home) cuando un
 *     ciclo activo tiene riesgo de plaga crítico/alto en su etapa.
 *   - severity: crítico→danger, alto→warning.
 *   - Limpia ('alertCleared') cuando no hay riesgo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { listFarmProcesses, getPestRisksByStage, getPrecioSipsa } = vi.hoisted(() => ({
  listFarmProcesses: vi.fn(),
  getPestRisksByStage: vi.fn(),
  getPrecioSipsa: vi.fn(),
}));

vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses }));
vi.mock('../climateCycleService', () => ({ getPestRisksByStage }));
vi.mock('../sidecarClient', () => ({ getPrecioSipsa }));

import { runCropAlerts } from '../cropAlertEngine';

const cycle = (id, stage = 'vegetative', slug = 'coffea_arabica', label = 'Café') => ({
  process_id: id,
  attributes: { current_stage: stage, subject_slug: slug, subject_label: label, status: 'active' },
});

let events;
beforeEach(() => {
  listFarmProcesses.mockReset();
  getPestRisksByStage.mockReset();
  getPrecioSipsa.mockReset();
  getPrecioSipsa.mockResolvedValue(null);
  events = [];
  vi.spyOn(window, 'dispatchEvent').mockImplementation((ev) => {
    events.push({ name: ev.type, detail: ev.detail });
    return true;
  });
});
afterEach(() => vi.restoreAllMocks());

describe('cropAlertEngine.runCropAlerts', () => {
  it('emite alertTriggered con severity danger ante riesgo crítico', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p1')]);
    getPestRisksByStage.mockReturnValue([
      { pest: 'Broca del café', risk: 'crítico', control: 'Trampas Brocap' },
    ]);
    const res = await runCropAlerts();
    expect(res.emitted).toBe(1);
    const triggered = events.find((e) => e.name === 'alertTriggered');
    expect(triggered).toBeTruthy();
    expect(triggered.detail.type).toBe('crop_pest_p1');
    expect(triggered.detail.severity).toBe('danger');
    expect(triggered.detail.message).toMatch(/Broca/);
  });

  it('emite alertCleared cuando no hay riesgo en la etapa', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p2', 'sowing')]);
    getPestRisksByStage.mockReturnValue([]);
    const res = await runCropAlerts();
    expect(res.cleared).toBe(1);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_pest_p2')).toBe(true);
    expect(events.some((e) => e.name === 'alertTriggered')).toBe(false);
  });

  it('degrada limpio sin ciclos', async () => {
    listFarmProcesses.mockResolvedValue([]);
    const res = await runCropAlerts();
    expect(res).toEqual({ emitted: 0, cleared: 0 });
    expect(events.length).toBe(0);
  });

  it('en cosecha: emite alerta con el PRECIO REAL de SIPSA anexado', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p3', 'harvest_window', 'solanum_tuberosum', 'Papa')]);
    getPestRisksByStage.mockReturnValue([]);
    getPrecioSipsa.mockResolvedValue({
      available: true,
      price: { precio_promedio_cop_kg: 4600, plaza: 'Bucaramanga, Centroabastos', fecha: '2026-06-25' },
      frescura: { desactualizado: false },
    });
    const res = await runCropAlerts();
    const harvest = events.find((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_harvest_p3');
    expect(harvest).toBeTruthy();
    expect(harvest.detail.message).toMatch(/cosecha/i);
    expect(harvest.detail.message).toMatch(/\$4\.600\/kg/);
    expect(harvest.detail.message).toMatch(/SIPSA\/DANE/);
    expect(getPrecioSipsa).toHaveBeenCalledWith('latest_price', { producto: 'Papa' });
    expect(res.emitted).toBeGreaterThanOrEqual(1);
  });

  it('en cosecha sin dato de precio: alerta sale igual, SIN inventar precio', async () => {
    listFarmProcesses.mockResolvedValue([cycle('p4', 'harvest_window', 'zea_mays', 'Maíz')]);
    getPestRisksByStage.mockReturnValue([]);
    getPrecioSipsa.mockResolvedValue({ available: false, reason: 'no_matches' });
    await runCropAlerts();
    const harvest = events.find((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_harvest_p4');
    expect(harvest).toBeTruthy();
    expect(harvest.detail.message).toMatch(/cosecha/i);
    expect(harvest.detail.message).not.toMatch(/\$/);
  });
});
