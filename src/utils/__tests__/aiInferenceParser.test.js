import { describe, it, expect } from 'vitest';
import { parseAiInference, parseAiReview } from '../aiInferenceParser.js';

/**
 * Tests del parser de metadata IA en notas (ADR-019 Phase 3). Funciones puras:
 * parsean bloques de texto con prefijo [AI_INFERENCE] / [AI_REVIEW]. Cubre el
 * happy path, los campos opcionales, y los casos borde (null, prefijo ausente,
 * confidence no numérica) que evitan que el agente rompa con salida inesperada.
 */

const INFERENCE_BLOCK = [
  '[AI_INFERENCE]',
  'source: vision-pipeline',
  'model_version: v3',
  'confidence: 0.82',
  'needs_human_review: false',
  '--- Findings ---',
  '- Mancha foliar en hoja inferior',
  '- Posible deficiencia de nitrógeno',
  '--- Suggested treatment ---',
  'Aplicar caldo bordelés cada 8 días.',
  'Revisar drenaje del lote.',
].join('\n');

describe('parseAiInference', () => {
  it('retorna null cuando el input es falsy o no tiene el prefijo', () => {
    expect(parseAiInference('')).toBeNull();
    expect(parseAiInference(null)).toBeNull();
    expect(parseAiInference(undefined)).toBeNull();
    expect(parseAiInference('una nota cualquiera del usuario')).toBeNull();
  });

  it('parsea los campos escalares del bloque', () => {
    const r = parseAiInference(INFERENCE_BLOCK);
    expect(r.isAi).toBe(true);
    expect(r.source).toBe('vision-pipeline');
    expect(r.model_version).toBe('v3');
    expect(r.confidence).toBe(0.82);
    expect(r.needs_human_review).toBe(false);
  });

  it('acumula los findings de la sección correspondiente', () => {
    const r = parseAiInference(INFERENCE_BLOCK);
    expect(r.findings).toEqual([
      'Mancha foliar en hoja inferior',
      'Posible deficiencia de nitrógeno',
    ]);
  });

  it('une el tratamiento multilínea con saltos de línea', () => {
    const r = parseAiInference(INFERENCE_BLOCK);
    expect(r.treatment).toBe('Aplicar caldo bordelés cada 8 días.\nRevisar drenaje del lote.');
  });

  it('confidence inválida cae a 0 (no NaN)', () => {
    const r = parseAiInference('[AI_INFERENCE]\nconfidence: abc');
    expect(r.confidence).toBe(0);
  });

  it('needs_human_review por defecto true si no se especifica', () => {
    const r = parseAiInference('[AI_INFERENCE]\nsource: x');
    expect(r.needs_human_review).toBe(true);
  });

  it('bloque mínimo sin secciones devuelve findings/treatment vacíos', () => {
    const r = parseAiInference('[AI_INFERENCE]');
    expect(r.findings).toEqual([]);
    expect(r.treatment).toBe('');
  });
});

const REVIEW_BLOCK = [
  '[AI_REVIEW]',
  'target_log_id: log-123',
  'verdict: confirmed',
  'reviewer_id: op-hash-abc',
  'reviewed_at: 2026-05-30',
  'notes: Coincide con lo observado en campo',
].join('\n');

describe('parseAiReview', () => {
  it('retorna null sin prefijo [AI_REVIEW]', () => {
    expect(parseAiReview('')).toBeNull();
    expect(parseAiReview(null)).toBeNull();
    expect(parseAiReview('[AI_INFERENCE]\nsource: x')).toBeNull();
  });

  it('parsea los campos de la revisión', () => {
    const r = parseAiReview(REVIEW_BLOCK);
    expect(r.isReview).toBe(true);
    expect(r.target_log_id).toBe('log-123');
    expect(r.verdict).toBe('confirmed');
    expect(r.reviewer_id).toBe('op-hash-abc');
    expect(r.reviewed_at).toBe('2026-05-30');
    expect(r.notes).toContain('Coincide con lo observado en campo');
  });

  it('bloque mínimo devuelve campos vacíos sin romper', () => {
    const r = parseAiReview('[AI_REVIEW]');
    expect(r.isReview).toBe(true);
    expect(r.verdict).toBe('');
    expect(r.notes).toBe('');
  });
});
