import { describe, it, expect } from 'vitest';
import { classifyQueryIntent } from '../outputGuards';

describe('classifyQueryIntent — restauracion (Task 2, audit ministerio)', () => {
  it('"arboles nativos a 3200m" → restauracion', () => {
    expect(classifyQueryIntent('arboles nativos a 3200m')).toBe('restauracion');
  });
  it('"recuperar el monte" → restauracion', () => {
    expect(classifyQueryIntent('recuperar el monte')).toBe('restauracion');
  });
  it('"restaurar la quebrada" → restauracion', () => {
    expect(classifyQueryIntent('restaurar la quebrada')).toBe('restauracion');
  });
  it('"sembrar pino para reforestar" → siembra (siembra gana en prioridad)', () => {
    expect(classifyQueryIntent('sembrar pino para reforestar')).toBe('siembra');
  });
  it('"especies nativas para paramo" → restauracion', () => {
    expect(classifyQueryIntent('especies nativas para paramo')).toBe('restauracion');
  });
  it('"que siembro en mi finca" → siembra (no restauracion)', () => {
    expect(classifyQueryIntent('que siembro en mi finca')).toBe('siembra');
  });
});
