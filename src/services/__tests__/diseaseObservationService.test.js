/**
 * diseaseObservationService — detección de enfermedad en bitácora del ciclo
 * para grounding proactivo del agente + alerta del cultivo.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getFarmEvents } = vi.hoisted(() => ({ getFarmEvents: vi.fn() }));
vi.mock('../../db/farmProcessCache', () => ({ getFarmEvents }));

import { detectDiseaseInText, getActiveDiseaseForCycle } from '../diseaseObservationService';

describe('detectDiseaseInText', () => {
  it('detecta mildeo en lechuga y nombra el patógeno (Bremia lactucae)', () => {
    const d = detectDiseaseInText('a la lechuga le salió un polvillo blanco en las hojas', 'lactuca_sativa');
    expect(d).not.toBeNull();
    expect(d.isDisease).toBe(true);
    expect(d.pathogen).toMatch(/Bremia lactucae/);
    expect(d.severity).toBe('alto');
    expect(d.control).toBeTruthy();
  });

  it('detecta pudrición en lechuga', () => {
    const d = detectDiseaseInText('algunas matas se están pudriendo en la base', 'lactuca_sativa');
    expect(d.isDisease).toBe(true);
    expect(d.pathogen).toMatch(/Pudrici|Botrytis|Sclerotinia/i);
  });

  it('síntoma reconocido sin patógeno conocido para la especie → no inventa nombre', () => {
    const d = detectDiseaseInText('las hojas tienen unas manchas raras', 'zea_mays');
    expect(d.isDisease).toBe(true);
    expect(d.pathogen).toBeNull();
    expect(d.severity).toBe('medio');
  });

  it('observación sana NO se marca como enfermedad', () => {
    expect(detectDiseaseInText('la lechuga está creciendo bonita y verde', 'lactuca_sativa')).toBeNull();
    expect(detectDiseaseInText('', 'lactuca_sativa')).toBeNull();
    expect(detectDiseaseInText(null, 'lactuca_sativa')).toBeNull();
  });
});

describe('getActiveDiseaseForCycle', () => {
  // mockClear (no mockReset): mockReset en vitest 4 hace que un throw posterior
  // del mockImplementation se reporte como uncaught aunque el código bajo prueba
  // lo capture. Limpiamos historial y reasignamos la implementación por test.
  beforeEach(() => getFarmEvents.mockClear());

  const obs = (text, occurredAt) => ({
    attributes: { event_type: 'observation', occurred_at: occurredAt, payload: { text } },
  });

  it('devuelve la enfermedad detectada en la observación más reciente', async () => {
    getFarmEvents.mockResolvedValue([
      obs('apareció mildeo / polvillo blanco en las hojas', 2000),
      obs('la lechuga está creciendo bien', 1000),
    ]);
    const d = await getActiveDiseaseForCycle('p1', 'lactuca_sativa');
    expect(d).not.toBeNull();
    expect(d.pathogen).toMatch(/Bremia/);
    expect(d.observedAt).toBe(2000);
  });

  it('null cuando no hay observaciones de enfermedad', async () => {
    getFarmEvents.mockResolvedValue([obs('todo bien, sin novedad', 1000)]);
    const d = await getActiveDiseaseForCycle('p2', 'lactuca_sativa');
    expect(d).toBeNull();
  });

  it('ignora eventos que no son observación', async () => {
    getFarmEvents.mockResolvedValue([
      { attributes: { event_type: 'stage_transition', occurred_at: 3000, payload: { to_stage: 'vegetative' } } },
    ]);
    const d = await getActiveDiseaseForCycle('p3', 'lactuca_sativa');
    expect(d).toBeNull();
  });

  it('degrada limpio (null) si el store falla', async () => {
    getFarmEvents.mockImplementation(() => { throw new Error('IDB down'); });
    const d = await getActiveDiseaseForCycle('p4', 'lactuca_sativa');
    expect(d).toBeNull();
    getFarmEvents.mockReset(); // limpia la impl que lanza para el resto de la suite
  });

  it('null sin processId', async () => {
    expect(await getActiveDiseaseForCycle('', 'lactuca_sativa')).toBeNull();
  });
});
