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
  it('"sembrar pino para reforestar" → restauracion (restauración gana: pino/exóticas para "reforestar" deben disparar el guard de restauración, NO el de siembra)', () => {
    // RESTORATION_INTENT_PATTERNS captura "(sembrar|plantar) pino/eucalipto/…"
    // y "reforestar" y se evalúa ANTES que siembra en classifyQueryIntent. Es
    // intencional (DR-RESTAURACION-INCENDIOS): plantar exóticas "para
    // reforestar" es el anti-patrón que el guard de restauración debe advertir;
    // tratarlo como siembra normal se saltaría esa advertencia.
    expect(classifyQueryIntent('sembrar pino para reforestar')).toBe('restauracion');
  });
  it('"especies nativas para paramo" → restauracion', () => {
    expect(classifyQueryIntent('especies nativas para paramo')).toBe('restauracion');
  });
  it('"que siembro en mi finca" → siembra (no restauracion)', () => {
    expect(classifyQueryIntent('que siembro en mi finca')).toBe('siembra');
  });
});
