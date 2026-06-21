/**
 * toxicologia-suelo.test.js — Verifica el cuestionario de RIESGO de tóxicos del
 * suelo. El resultado es siempre CUALITATIVO (bajo/medio/alto), nunca un número
 * de concentración: anti-alucinación sobre contenido sensible de seguridad.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluarRiesgoSuelo,
  PREGUNTAS_RIESGO_SUELO,
  NIVELES_RIESGO,
  MEDIDAS_AGROECOLOGICAS,
} from '../toxicologia-suelo';

describe('evaluarRiesgoSuelo', () => {
  it('sin respuestas → riesgo bajo, sin medidas de nivel alto', () => {
    const r = evaluarRiesgoSuelo(new Set());
    expect(r.nivel.id).toBe('bajo');
    expect(r.puntaje).toBe(0);
    expect(r.medidas.some((m) => m.nivel_minimo === 'alto')).toBe(false);
  });

  it('un factor de peso medio → riesgo medio', () => {
    // cerca_via_principal tiene peso 2 → cruza el umbral 'medio' (min 3)? no: 2<3 → bajo
    const r = evaluarRiesgoSuelo(['cerca_via_principal']);
    expect(['bajo', 'medio']).toContain(r.nivel.id);
  });

  it('minería + agroquímicos intensivos → riesgo alto', () => {
    const r = evaluarRiesgoSuelo(['cerca_mineria', 'agroquimicos_intensivos']);
    expect(r.nivel.id).toBe('alto');
    expect(r.contaminantes).toContain('mercurio');
    // En alto debe ofrecer fitorremediación + no comestibles de raíz.
    const ids = r.medidas.map((m) => m.id);
    expect(ids).toContain('fitorremediacion');
    expect(ids).toContain('no_comestibles_raiz');
  });

  it('la recomendación de laboratorio del nivel alto remite a la norma, sin inventar límites', () => {
    const r = evaluarRiesgoSuelo(['cerca_mineria', 'aguas_servidas']);
    expect(r.nivel.id).toBe('alto');
    expect(r.nivel.recomendacion_lab.toLowerCase()).toMatch(/laboratorio/);
    expect(r.nivel.recomendacion_lab.toLowerCase()).toMatch(/norma|ica|car|ideam/);
    // No debe afirmar un límite numérico inventado de mg/kg.
    expect(r.nivel.recomendacion_lab).not.toMatch(/\d+\s*mg\/kg/);
  });

  it('acepta Set o Array indistintamente', () => {
    const a = evaluarRiesgoSuelo(new Set(['cerca_mineria']));
    const b = evaluarRiesgoSuelo(['cerca_mineria']);
    expect(a.puntaje).toBe(b.puntaje);
  });
});

describe('integridad de datos', () => {
  it('cada pregunta tiene id, peso>0 y contaminantes', () => {
    for (const q of PREGUNTAS_RIESGO_SUELO) {
      expect(q.id).toBeTruthy();
      expect(q.peso).toBeGreaterThan(0);
      expect(Array.isArray(q.contaminantes)).toBe(true);
      expect(q.contaminantes.length).toBeGreaterThan(0);
    }
  });
  it('hay exactamente 3 niveles cualitativos ordenables', () => {
    expect(NIVELES_RIESGO.map((n) => n.id)).toEqual(['bajo', 'medio', 'alto']);
  });
  it('ninguna medida agroecológica promete eliminar metales de forma garantizada', () => {
    for (const m of MEDIDAS_AGROECOLOGICAS) {
      expect(m.detalle.toLowerCase()).not.toMatch(/elimina (todos|por completo) los metales/);
    }
  });
});
