import { beforeEach, describe, expect, it } from 'vitest';
import { speciesAtlasInitialState, useSpeciesAtlasStore } from './useSpeciesAtlasStore.js';

describe('useSpeciesAtlasStore', () => {
  beforeEach(() => useSpeciesAtlasStore.getState().reset());

  it('mantiene la sesión educativa fuera del modelo persistente', () => {
    useSpeciesAtlasStore.getState().openSpecies('zea_mays');
    useSpeciesAtlasStore.getState().setStage('planta');
    useSpeciesAtlasStore.getState().selectMarker('mazorca');

    const state = useSpeciesAtlasStore.getState();
    expect(state.speciesId).toBe('zea_mays');
    expect(state.stageId).toBe('planta');
    expect(state.selectedMarker).toBe('mazorca');
    expect(state).not.toHaveProperty('assetId');
    expect(state).not.toHaveProperty('logId');
  });

  it('califica una respuesta escrita una sola vez y reinicia la pregunta', () => {
    const store = useSpeciesAtlasStore.getState();
    store.openSpecies('solanum_lycopersicum');
    store.setMode('written');
    store.setCorrectAnswer(0);
    store.answerWritten(0);
    store.answerWritten(1);

    expect(useSpeciesAtlasStore.getState().score).toBe(1);
    expect(useSpeciesAtlasStore.getState().selectedAnswer).toBe(0);
    store.nextQuestion();
    expect(useSpeciesAtlasStore.getState().questionIndex).toBe(1);
    expect(useSpeciesAtlasStore.getState().selectedAnswer).toBeNull();
  });

  it('reinicia el estado sin persistir resultados', () => {
    useSpeciesAtlasStore.getState().openSpecies('persea_americana');
    useSpeciesAtlasStore.getState().setMode('identify');
    useSpeciesAtlasStore.getState().answerIdentification('raiz-aguacate', true);
    useSpeciesAtlasStore.getState().reset();

    const state = useSpeciesAtlasStore.getState();
    expect(state.speciesId).toBe(speciesAtlasInitialState.speciesId);
    expect(state.score).toBe(0);
    expect(state.selectedIdentification).toBeNull();
  });
});
