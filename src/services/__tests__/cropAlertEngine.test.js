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

const { listFarmProcesses, getPestRisksByStage, getPrecioSipsa, getActiveDiseaseForCycle } = vi.hoisted(() => ({
  listFarmProcesses: vi.fn(),
  getPestRisksByStage: vi.fn(),
  getPrecioSipsa: vi.fn(),
  getActiveDiseaseForCycle: vi.fn(),
}));

vi.mock('../../db/farmProcessCache', () => ({ listFarmProcesses }));
vi.mock('../climateCycleService', () => ({ getPestRisksByStage }));
vi.mock('../sidecarClient', () => ({ getPrecioSipsa }));
// Sin enfermedad en bitácora por defecto: el canal crop_disease solo agrega un
// 'alertCleared' por ciclo. Mockeado para no tocar IDB real en este test de plaga.
vi.mock('../diseaseObservationService', () => ({ getActiveDiseaseForCycle }));

import { runCropAlerts } from '../cropAlertEngine';

const cycle = (id, stage = 'vegetative', slug = 'coffea_arabica', label = 'Café') => ({
  process_id: id,
  attributes: { current_stage: stage, subject_slug: slug, subject_label: label, status: 'active' },
});

/** Respuesta del sidecar get_precio_sipsa con precio fresco (latest_price). */
const precioFresco = (overrides = {}) => ({
  available: true,
  action: 'latest_price',
  price: {
    fecha: '2026-06-25',
    producto: 'Papa',
    producto_id: 'papa',
    plaza: 'Corabastos, Bogotá',
    plaza_id: 'corabastos_bogota',
    precio_promedio_cop_kg: 2300,
    unidad: 'Kilogramo',
  },
  central_abastos: 'Corabastos, Bogotá',
  frescura: { fecha_dato: '2026-06-25', dias_desde_dato: 1, umbral_dias: 3, desactualizado: false, sello: 'fresco' },
  especie: 'solanum_tuberosum',
  ...overrides,
});

let events;
beforeEach(() => {
  listFarmProcesses.mockReset();
  getPestRisksByStage.mockReset();
  getPrecioSipsa.mockReset();
  getPrecioSipsa.mockResolvedValue(null); // por defecto: sidecar sin dato
  getActiveDiseaseForCycle.mockReset().mockResolvedValue(null);
  events = [];
  vi.spyOn(window, 'dispatchEvent').mockImplementation((ev) => {
    events.push({ name: ev.type, detail: /** @type {CustomEvent} */ (ev).detail });
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
    // 3 limpiezas por ciclo sin novedad: plaga (crop_pest_p2), precio (crop_price_p2,
    // etapa 'sowing' no aplica al aviso de precio) y enfermedad de bitácora
    // (crop_disease_p2, sin enfermedad → clear).
    expect(res.cleared).toBe(3);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_pest_p2')).toBe(true);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_price_p2')).toBe(true);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_disease_p2')).toBe(true);
    expect(events.some((e) => e.name === 'alertTriggered')).toBe(false);
  });

  it('degrada limpio sin ciclos', async () => {
    listFarmProcesses.mockResolvedValue([]);
    const res = await runCropAlerts();
    expect(res).toEqual({ emitted: 0, cleared: 0 });
    expect(events.length).toBe(0);
  });
});

describe('cropAlertEngine — alerta de precio cerca de cosecha (#26)', () => {
  beforeEach(() => {
    // Sin riesgo de plaga: aislamos el track de precio.
    getPestRisksByStage.mockReturnValue([]);
  });

  it('emite alertTriggered de precio para un cultivo en cosecha con precio fresco', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h1', 'harvest_window', 'solanum_tuberosum', 'Papa'),
    ]);
    getPrecioSipsa.mockResolvedValue(precioFresco());

    const res = await runCropAlerts();

    expect(getPrecioSipsa).toHaveBeenCalledWith('latest_price', { producto: 'papa' });
    const triggered = events.find((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_price_h1');
    expect(triggered).toBeTruthy();
    expect(triggered.detail.severity).toBe('info');
    expect(triggered.detail.source).toBe('price');
    expect(triggered.detail.message).toMatch(/papa está para cosechar/i);
    expect(triggered.detail.message).toMatch(/\$2\.300 COP\/kg/);
    expect(triggered.detail.message).toMatch(/Corabastos/);
    expect(triggered.detail.especie).toBe('solanum_tuberosum');
    expect(triggered.detail.precioCopKg).toBe(2300);
    expect(res.emitted).toBe(1);
  });

  it('en fruiting usa el verbo de llenado de fruto', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h2', 'fruiting', 'solanum_lycopersicum_cerasiforme', 'Tomate'),
    ]);
    getPrecioSipsa.mockResolvedValue(
      precioFresco({
        price: { fecha: '2026-06-25', producto: 'Tomate', producto_id: 'tomate', plaza: 'Corabastos', plaza_id: 'corabastos', precio_promedio_cop_kg: 3100, unidad: 'Kilogramo' },
        central_abastos: 'Corabastos',
        especie: 'solanum_lycopersicum_cerasiforme',
      }),
    );

    await runCropAlerts();
    const triggered = events.find((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_price_h2');
    expect(triggered).toBeTruthy();
    expect(triggered.detail.message).toMatch(/va llenando fruto/i);
    expect(triggered.detail.message).toMatch(/\$3\.100 COP\/kg/);
  });

  it('NO emite precio si el dato está desactualizado (anti-alucinación)', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h3', 'harvest_window', 'solanum_tuberosum', 'Papa'),
    ]);
    getPrecioSipsa.mockResolvedValue(
      precioFresco({
        frescura: { fecha_dato: '2026-05-01', dias_desde_dato: 55, umbral_dias: 3, desactualizado: true, sello: 'desactualizado' },
      }),
    );

    await runCropAlerts();
    expect(events.some((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_price_h3')).toBe(false);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_price_h3')).toBe(true);
  });

  it('NO emite precio si el sidecar no devuelve dato (federated/offline → null)', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h4', 'harvest_window', 'solanum_tuberosum', 'Papa'),
    ]);
    getPrecioSipsa.mockResolvedValue(null);

    await runCropAlerts();
    expect(events.some((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_price_h4')).toBe(false);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_price_h4')).toBe(true);
  });

  it('NO consulta precio si la especie no tiene producto SIPSA mapeado', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h5', 'harvest_window', 'coffea_arabica', 'Café'),
    ]);

    await runCropAlerts();
    expect(getPrecioSipsa).not.toHaveBeenCalled();
    expect(events.some((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_price_h5')).toBe(false);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_price_h5')).toBe(true);
  });

  it('NO consulta precio si la etapa no es de cosecha/llenado', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h6', 'vegetative', 'solanum_tuberosum', 'Papa'),
    ]);

    await runCropAlerts();
    expect(getPrecioSipsa).not.toHaveBeenCalled();
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_price_h6')).toBe(true);
  });

  it('degrada limpio si getPrecioSipsa lanza', async () => {
    listFarmProcesses.mockResolvedValue([
      cycle('h7', 'harvest_window', 'solanum_tuberosum', 'Papa'),
    ]);
    getPrecioSipsa.mockRejectedValue(new Error('network'));

    await runCropAlerts();
    expect(events.some((e) => e.name === 'alertTriggered' && e.detail.type === 'crop_price_h7')).toBe(false);
    expect(events.some((e) => e.name === 'alertCleared' && e.detail.type === 'crop_price_h7')).toBe(true);
  });
});
