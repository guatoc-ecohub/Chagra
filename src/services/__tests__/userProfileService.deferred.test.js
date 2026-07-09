/**
 * Tests del flag `deferred` en PROFILE_QUESTIONS (reescritura onboarding
 * 2026-07-08 §3.2): lo que sale del arranque queda marcado para progressive
 * profiling, y el flujo clásico sigue viendo el catálogo completo.
 */
import { describe, it, expect } from 'vitest';
import {
  PROFILE_QUESTIONS,
  getApplicableQuestions,
  getDeferredQuestions,
} from '../userProfileService.js';

const CORE_IDS = ['nombre', 'vocacion', 'rol', 'finca_tipo', 'composicion', 'cultivos_actuales', 'animales'];

describe('PROFILE_QUESTIONS — deferred (reescritura onboarding)', () => {
  it('las preguntas del flujo condensado NO están diferidas', () => {
    for (const id of CORE_IDS) {
      const q = PROFILE_QUESTIONS.find((x) => x.id === id);
      expect(q, `pregunta ${id}`).toBeTruthy();
      expect(q.deferred, `pregunta ${id} no debe ser deferred`).toBeFalsy();
    }
  });

  it('region y finca_altitud quedan diferidas (las resuelve el botón Ubicar)', () => {
    expect(PROFILE_QUESTIONS.find((q) => q.id === 'region')?.deferred).toBe(true);
    expect(PROFILE_QUESTIONS.find((q) => q.id === 'finca_altitud')?.deferred).toBe(true);
  });

  it('getApplicableQuestions NO cambia (flujo clásico intacto: 19 para campesino rural)', () => {
    const campesinoRural = {
      vocacion: 'campesino',
      rol: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'no',
      animales: ['ninguno'],
    };
    expect(getApplicableQuestions(campesinoRural).length).toBe(19);
  });

  it('getDeferredQuestions devuelve solo diferidas aplicables SIN respuesta', () => {
    const answers = {
      vocacion: 'campesino',
      finca_tipo: 'rural',
      manejo: 'organico', // ya respondida → no debe salir
    };
    const ids = getDeferredQuestions(answers).map((q) => q.id);
    expect(ids).not.toContain('manejo');
    expect(ids).toContain('riego');
    expect(ids).toContain('anios_cultivando');
    // Condicional urbana no aplica a rural.
    expect(ids).not.toContain('estrato');
    // Todas marcadas deferred.
    for (const q of getDeferredQuestions(answers)) expect(q.deferred).toBe(true);
  });

  it('multi vacío cuenta como sin responder', () => {
    const ids = getDeferredQuestions({ vocacion: 'campesino', problemas: [] }).map((q) => q.id);
    expect(ids).toContain('problemas');
  });
});
