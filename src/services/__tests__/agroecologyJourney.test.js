import { describe, it, expect } from 'vitest';
import {
  JOURNEY_STAGES,
  JOURNEY_CONTEXTS,
  contextoDesdeVocacion,
  getStage,
  nextStageId,
  siguientePaso,
} from '../agroecologyJourney';

describe('agroecologyJourney — modelo de 6 etapas', () => {
  it('tiene 6 etapas en orden 1..6', () => {
    expect(JOURNEY_STAGES).toHaveLength(6);
    expect(JOURNEY_STAGES.map((s) => s.orden)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(JOURNEY_STAGES.map((s) => s.id)).toEqual([
      'despertar', 'pausa_quimica', 'tierra_viva', 'diversificacion', 'equilibrio', 'irradiacion',
    ]);
  });

  it('cada etapa trae las 4 variaciones de contexto', () => {
    for (const s of JOURNEY_STAGES) {
      for (const ctx of JOURNEY_CONTEXTS) {
        expect(typeof s.variaciones[ctx]).toBe('string');
        expect(s.variaciones[ctx].length).toBeGreaterThan(0);
      }
    }
  });

  it('los niveles Gliessman avanzan (0 base → 4 red/política)', () => {
    expect(getStage('despertar').gliessman).toBe(0);
    expect(getStage('pausa_quimica').gliessman).toBe(1);
    expect(getStage('tierra_viva').gliessman).toBe(2);
    expect(getStage('diversificacion').gliessman).toBe(3);
    expect(getStage('irradiacion').gliessman).toBe(4);
  });
});

describe('getStage / nextStageId', () => {
  it('getStage devuelve la etapa o null', () => {
    expect(getStage('tierra_viva').nombre).toBe('Tierra Viva');
    expect(getStage('no-existe')).toBeNull();
  });

  it('nextStageId encadena las etapas; la última (Irradiación) no tiene siguiente', () => {
    expect(nextStageId('despertar')).toBe('pausa_quimica');
    expect(nextStageId('equilibrio')).toBe('irradiacion');
    expect(nextStageId('irradiacion')).toBeNull();
    expect(nextStageId('no-existe')).toBeNull();
  });
});

describe('contextoDesdeVocacion (onboarding → contexto de viaje)', () => {
  it('mapea las vocaciones del onboarding', () => {
    expect(contextoDesdeVocacion('horticola')).toBe('hortaliza');
    expect(contextoDesdeVocacion('invernadero')).toBe('hortaliza');
    expect(contextoDesdeVocacion('urbana')).toBe('hortaliza');
    expect(contextoDesdeVocacion('bosque')).toBe('restauracion');
    expect(contextoDesdeVocacion('paramo')).toBe('paramo');
    expect(contextoDesdeVocacion('frutales')).toBe('finca_diversificada');
    expect(contextoDesdeVocacion('mixto')).toBe('finca_diversificada');
  });

  it('vocación desconocida → finca_diversificada (default conservador)', () => {
    expect(contextoDesdeVocacion('otro')).toBe('finca_diversificada');
    expect(contextoDesdeVocacion(undefined)).toBe('finca_diversificada');
  });
});

describe('siguientePaso — motor de guía proactiva', () => {
  it('devuelve las acciones pendientes de la etapa + la variación del contexto', () => {
    const r = siguientePaso({ stageId: 'despertar', accionesHechas: [] }, 'restauracion');
    expect(r.etapa.id).toBe('despertar');
    expect(r.siguientesAcciones.length).toBeGreaterThan(0);
    expect(r.siguientesAcciones.length).toBeLessThanOrEqual(3);
    expect(r.variacion).toContain('nacimientos'); // variación de restauración del Despertar
    expect(r.listoParaAvanzar).toBe(false);
  });

  it('cuando completó todas las acciones → listo para avanzar + siguiente etapa', () => {
    const todas = getStage('despertar').accionesUsuario.slice();
    const r = siguientePaso({ stageId: 'despertar', accionesHechas: todas }, 'hortaliza');
    expect(r.listoParaAvanzar).toBe(true);
    expect(r.siguientesAcciones).toEqual([]);
    expect(r.siguienteEtapaId).toBe('pausa_quimica');
  });

  it('contexto inválido cae a finca_diversificada (no rompe)', () => {
    const r = siguientePaso({ stageId: 'pausa_quimica' }, 'inexistente');
    expect(r.variacion).toBe(getStage('pausa_quimica').variaciones.finca_diversificada);
  });

  it('etapa inválida → resultado vacío seguro', () => {
    const r = siguientePaso({ stageId: 'no-existe' });
    expect(r.etapa).toBeNull();
    expect(r.siguientesAcciones).toEqual([]);
    expect(r.listoParaAvanzar).toBe(false);
  });
});
