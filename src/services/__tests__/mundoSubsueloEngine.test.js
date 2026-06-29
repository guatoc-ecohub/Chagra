/*
 * Tests de la lógica pura de "Mundo Subsuelo": meta de suelo vivo, evaluación
 * del objetivo, etapa del suelo y mensaje de meta. Es la capa de OBJETIVO que da
 * un arco de reto al sandbox (gated dev-only en la UI); la lógica en sí es
 * universal y testeable sin canvas.
 *
 * i18n: minijuego solo es-CO.
 */
import { describe, expect, it } from 'vitest';
import {
  META_VIDA, clampVida, etapaSuelo, evaluarSubsuelo, mensajeMeta,
} from '../mundoSubsueloEngine';

describe('clampVida / etapaSuelo', () => {
  it('clampVida acota a [0,100]', () => {
    expect(clampVida(-5)).toBe(0);
    expect(clampVida(150)).toBe(100);
    expect(clampVida(48)).toBe(48);
  });

  it('etapaSuelo respeta los umbrales históricos', () => {
    expect(etapaSuelo(10)).toBe('cansado');
    expect(etapaSuelo(34)).toBe('cansado');
    expect(etapaSuelo(35)).toBe('en cuidado');
    expect(etapaSuelo(54)).toBe('en cuidado');
    expect(etapaSuelo(55)).toBe('despertando');
    expect(etapaSuelo(74)).toBe('despertando');
    expect(etapaSuelo(75)).toBe('vivo');
    expect(etapaSuelo(100)).toBe('vivo');
  });

  it('la meta coincide con el umbral de "suelo vivo"', () => {
    expect(META_VIDA).toBe(75);
    expect(etapaSuelo(META_VIDA)).toBe('vivo');
  });
});

describe('evaluarSubsuelo — estado del objetivo', () => {
  it('por debajo de la meta no está alcanzada y reporta cuánto falta', () => {
    const e = evaluarSubsuelo(48, 0);
    expect(e.alcanzada).toBe(false);
    expect(e.meta).toBe(75);
    expect(e.restante).toBe(27);
    expect(e.etapa).toBe('en cuidado');
    expect(e.jugadas).toBe(0);
  });

  it('al alcanzar la meta queda alcanzada y sin restante', () => {
    const e = evaluarSubsuelo(80, 3);
    expect(e.alcanzada).toBe(true);
    expect(e.restante).toBe(0);
    expect(e.etapa).toBe('vivo');
    expect(e.jugadas).toBe(3);
  });

  it('acota vida fuera de rango y nunca da jugadas negativas', () => {
    const e = evaluarSubsuelo(140, -2);
    expect(e.vida).toBe(100);
    expect(e.alcanzada).toBe(true);
    expect(e.jugadas).toBe(0);
  });

  it('progreso es relativo a la meta (75 → 100%)', () => {
    expect(evaluarSubsuelo(75, 1).progreso).toBe(100);
    expect(evaluarSubsuelo(0, 0).progreso).toBe(0);
  });
});

describe('mensajeMeta — copy claro es-CO', () => {
  it('antes de lograr la meta indica cuántos puntos faltan', () => {
    const msg = mensajeMeta(evaluarSubsuelo(48, 1));
    expect(msg).toMatch(/Meta/);
    expect(msg).toMatch(/27/);
  });

  it('al lograr la meta celebra y dice las jugadas (singular/plural)', () => {
    expect(mensajeMeta(evaluarSubsuelo(80, 1))).toMatch(/1 jugada\b/);
    expect(mensajeMeta(evaluarSubsuelo(80, 4))).toMatch(/4 jugadas/);
  });

  it('sin voseo argentino', () => {
    const VOSEO = /\b(usá|usás|tenés|querés|empezá|elegí|llegá)\b/i;
    expect(mensajeMeta(evaluarSubsuelo(48, 1))).not.toMatch(VOSEO);
    expect(mensajeMeta(evaluarSubsuelo(80, 2))).not.toMatch(VOSEO);
  });
});
