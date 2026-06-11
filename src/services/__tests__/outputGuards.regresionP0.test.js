import { describe, it, expect } from 'vitest';
import { classifyQueryIntent } from '../outputGuards';

describe('regresion P0 audit — classifyQueryIntent', () => {
  // Task 2: restauracion keywords
  it('"arboles nativos a 3200m" → restauracion', () => {
    expect(classifyQueryIntent('arboles nativos a 3200m')).toBe('restauracion');
  });
  it('"recuperar el monte" → restauracion', () => {
    expect(classifyQueryIntent('recuperar el monte')).toBe('restauracion');
  });
  it('"especies nativas para paramo" → restauracion', () => {
    expect(classifyQueryIntent('especies nativas para paramo')).toBe('restauracion');
  });

  // Task 3: carbon keywords
  it('"me quieren pagar por sembrar arboles" → carbono', () => {
    expect(classifyQueryIntent('me quieren pagar por sembrar arboles')).toBe('carbono');
  });
  it('"bonos de carbono" → carbono', () => {
    expect(classifyQueryIntent('bonos de carbono para mi finca')).toBe('carbono');
  });
  it('"PSA Decreto 1007" → carbono', () => {
    expect(classifyQueryIntent('como aplico al PSA Decreto 1007')).toBe('carbono');
  });

  // Task 5: pino/eucalipto in free text routes to restauracion
  it('"siembro pino para restaurar el bosque" → restauracion (NO siembra)', () => {
    expect(classifyQueryIntent('siembro pino para restaurar el bosque')).toBe('restauracion');
  });
  it('"voy a plantar eucalipto" → restauracion', () => {
    expect(classifyQueryIntent('voy a plantar eucalipto')).toBe('restauracion');
  });

  // Siembra normal still works
  it('"que siembro en mi finca" → siembra', () => {
    expect(classifyQueryIntent('que siembro en mi finca')).toBe('siembra');
  });
  it('"a como esta el bulto de papa" → precio', () => {
    expect(classifyQueryIntent('a como esta el bulto de papa')).toBe('precio');
  });
});
