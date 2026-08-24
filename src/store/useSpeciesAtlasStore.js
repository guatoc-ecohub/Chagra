import { create } from 'zustand';

const INITIAL = {
  speciesId: null,
  stageId: 'semilla',
  selectedMarker: null,
  mode: 'explore',
  questionIndex: 0,
  selectedAnswer: null,
  selectedIdentification: null,
  score: 0,
};

/**
 * Estado efímero del atlas educativo. No es parte del modelo Asset + Log y no
 * se persiste: una selección de UI o un resultado de quiz no es estado de una
 * especie en la finca.
 */
export const useSpeciesAtlasStore = create((set) => ({
  ...INITIAL,

  openSpecies: (speciesId) => set((state) => (
    state.speciesId === speciesId ? {} : { ...INITIAL, speciesId }
  )),

  setStage: (stageId) => set({ stageId, selectedMarker: null, selectedAnswer: null, selectedIdentification: null }),
  selectMarker: (selectedMarker) => set({ selectedMarker }),
  setMode: (mode) => set({ mode, questionIndex: 0, selectedAnswer: null, selectedIdentification: null, score: 0, selectedMarker: null }),

  answerWritten: (answer) => set((state) => (
    state.selectedAnswer === null ? {
      selectedAnswer: answer,
      score: state.score + (answer === state.correctAnswer ? 1 : 0),
    } : {}
  )),

  answerIdentification: (markerId, correct) => set((state) => (
    state.selectedIdentification === null ? {
      selectedIdentification: markerId,
      selectedMarker: markerId,
      score: state.score + (correct ? 1 : 0),
    } : {}
  )),

  setCorrectAnswer: (correctAnswer) => set({ correctAnswer }),
  nextQuestion: () => set((state) => ({
    questionIndex: state.questionIndex + 1,
    selectedAnswer: null,
    selectedIdentification: null,
    selectedMarker: null,
  })),
  reset: () => set(INITIAL),
}));

export const speciesAtlasInitialState = INITIAL;
