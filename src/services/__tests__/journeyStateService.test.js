import { describe, it, expect, beforeEach } from 'vitest';
import {
  getStoredJourneyState,
  setJourneyState,
  deriveInitialStage,
  resolveJourneyState,
  marcarAccionHecha,
  avanzarEtapa,
} from '../journeyStateService';

beforeEach(() => { localStorage.clear(); });

describe('journeyStateService', () => {
  it('set/get roundtrip', () => {
    setJourneyState('f1', { stageId: 'tierra_viva', accionesHechas: ['a'] });
    const s = getStoredJourneyState('f1');
    expect(s.stageId).toBe('tierra_viva');
    expect(s.accionesHechas).toEqual(['a']);
    expect(s.updatedAt).toBeTruthy();
  });

  it('get devuelve null si no hay nada o el stageId es inválido', () => {
    expect(getStoredJourneyState('nope')).toBeNull();
    localStorage.setItem('chagra:journey:bad', JSON.stringify({ stageId: 'xxx' }));
    expect(getStoredJourneyState('bad')).toBeNull();
  });

  it('deriveInitialStage: sin procesos → despertar; con procesos activos → pausa_quimica', () => {
    expect(deriveInitialStage({ processes: [] })).toBe('despertar');
    expect(deriveInitialStage({ processes: [{ attributes: { status: 'active' } }] })).toBe('pausa_quimica');
    expect(deriveInitialStage({ processes: [{ attributes: { status: 'completed' } }] })).toBe('despertar');
  });

  it('resolveJourneyState deriva y persiste cuando no hay estado', () => {
    const s = resolveJourneyState(/** @type {any} */ ({ fincaSlug: 'f2', processes: [] }));
    expect(s.stageId).toBe('despertar');
    expect(getStoredJourneyState('f2').stageId).toBe('despertar');
  });

  it('resolveJourneyState respeta el estado guardado', () => {
    setJourneyState('f3', { stageId: 'equilibrio', accionesHechas: [] });
    expect(resolveJourneyState(/** @type {any} */ ({ fincaSlug: 'f3', processes: [] })).stageId).toBe('equilibrio');
  });

  it('marcarAccionHecha agrega sin duplicar', () => {
    setJourneyState('f4', { stageId: 'despertar', accionesHechas: [] });
    marcarAccionHecha('f4', 'X');
    marcarAccionHecha('f4', 'X');
    marcarAccionHecha('f4', 'Y');
    expect(getStoredJourneyState('f4').accionesHechas).toEqual(['X', 'Y']);
  });

  it('avanzarEtapa pasa a la siguiente y reinicia acciones; Irradiación no avanza', () => {
    setJourneyState('f5', { stageId: 'despertar', accionesHechas: ['z'] });
    expect(avanzarEtapa('f5').stageId).toBe('pausa_quimica');
    expect(getStoredJourneyState('f5').accionesHechas).toEqual([]);
    setJourneyState('f6', { stageId: 'irradiacion', accionesHechas: [] });
    expect(avanzarEtapa('f6').stageId).toBe('irradiacion');
  });
});
