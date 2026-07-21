/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PROFILE_QUESTIONS,
  getApplicableQuestions,
  buildUserProfileBlock,
} from '../userProfileService.js';

/**
 * Tests del ONBOARDING POR PERFIL — preguntas nuevas dependientes del rol:
 *   - rol (single): refina qué herramientas mostrar.
 *   - animales (multi): pertinente para campesinos/ganaderos, no urbanos.
 *   - gallinas_manejo (single): solo si marcó gallinas.
 *   - restauracion_objetivo (multi): solo restaurador / guía glaciar.
 *
 * Verifican que las preguntas SE MUESTREN solo cuando aplican (lógica
 * perfil→preguntas) y que el contexto del agente incluya los datos nuevos.
 */

describe('userProfileService.rol — preguntas por perfil', () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = /** @type {any} */ ({
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });
  });

  it('la pregunta de rol existe y es de opción única con los roles de producto', () => {
    const rol = PROFILE_QUESTIONS.find((q) => q.id === 'rol');
    expect(rol).toBeTruthy();
    expect(rol.type).toBe('single');
    const values = rol.options.map((o) => o.value);
    expect(values).toEqual(
      expect.arrayContaining([
        'campesino',
        'ganadero',
        'restaurador',
        'guia_glaciar',
        'tecnico',
        'socio',
      ]),
    );
  });

  it('rol siempre aplica (sin condicional) — se le pregunta a todos', () => {
    const ids = getApplicableQuestions({}).map((q) => q.id);
    expect(ids).toContain('rol');
  });

  describe('animales — condicional por tipo de cultivo', () => {
    it('campesino rural: SÍ se pregunta por animales', () => {
      const ids = getApplicableQuestions({ vocacion: 'campesino' }).map((q) => q.id);
      expect(ids).toContain('animales');
    });

    it('urbano: NO se pregunta por animales (balcón sin espacio pecuario)', () => {
      const ids = getApplicableQuestions({ vocacion: 'urbano' }).map((q) => q.id);
      expect(ids).not.toContain('animales');
    });

    it('finca_tipo balcón: NO se pregunta por animales', () => {
      const ids = getApplicableQuestions({ finca_tipo: 'balcon' }).map((q) => q.id);
      expect(ids).not.toContain('animales');
    });
  });

  describe('gallinas_manejo — condicional por animales', () => {
    it('marcó gallinas: SÍ se pregunta cómo las maneja', () => {
      const ids = getApplicableQuestions({
        vocacion: 'campesino',
        animales: ['gallinas'],
      }).map((q) => q.id);
      expect(ids).toContain('gallinas_manejo');
    });

    it('marcó solo cerdos: NO se pregunta por manejo de gallinas', () => {
      const ids = getApplicableQuestions({
        vocacion: 'campesino',
        animales: ['cerdos'],
      }).map((q) => q.id);
      expect(ids).not.toContain('gallinas_manejo');
    });

    it('sin animales: NO se pregunta por manejo de gallinas', () => {
      const ids = getApplicableQuestions({ vocacion: 'campesino' }).map((q) => q.id);
      expect(ids).not.toContain('gallinas_manejo');
    });
  });

  describe('restauracion_objetivo — condicional por rol ecológico', () => {
    it('rol restaurador: SÍ se pregunta qué quiere recuperar', () => {
      const ids = getApplicableQuestions({ rol: 'restaurador' }).map((q) => q.id);
      expect(ids).toContain('restauracion_objetivo');
    });

    it('rol guía glaciar: SÍ se pregunta qué quiere recuperar', () => {
      const ids = getApplicableQuestions({ rol: 'guia_glaciar' }).map((q) => q.id);
      expect(ids).toContain('restauracion_objetivo');
    });

    it('rol campesino: NO se pregunta por objetivo de restauración', () => {
      const ids = getApplicableQuestions({ rol: 'campesino' }).map((q) => q.id);
      expect(ids).not.toContain('restauracion_objetivo');
    });
  });

  describe('perfiles del brief — ejemplos concretos', () => {
    it('carlos.rivera (campesino con animales): pregunta animales + gallinas_manejo', () => {
      const ids = getApplicableQuestions({
        vocacion: 'campesino',
        rol: 'ganadero',
        finca_tipo: 'rural',
        animales: ['gallinas', 'cerdos'],
      }).map((q) => q.id);
      expect(ids).toContain('animales');
      expect(ids).toContain('gallinas_manejo');
      // No le preguntamos cosas urbanas.
      expect(ids).not.toContain('estrato');
      expect(ids).not.toContain('espacio_urbano');
    });

    it('Ana (restauradora institucional): pregunta restauracion_objetivo', () => {
      const ids = getApplicableQuestions({
        rol: 'restaurador',
        finca_tipo: 'rural',
        objetivo: ['biodiversidad'],
      }).map((q) => q.id);
      expect(ids).toContain('restauracion_objetivo');
      expect(ids).not.toContain('gallinas_manejo');
    });
  });
});

describe('userProfileService.rol — buildUserProfileBlock incluye datos nuevos', () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = /** @type {any} */ ({
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });
  });

  it('inyecta rol, animales y manejo de gallinas en el contexto del agente', () => {
    const block = buildUserProfileBlock({
      nombre: 'Carlos',
      rol: 'ganadero',
      animales: ['gallinas', 'cerdos'],
      gallinas_manejo: 'galpon',
    });
    expect(block).toContain('Rol:');
    expect(block).toContain('Animales:');
    expect(block).toContain('Gallinas o pollos');
    expect(block).toContain('Manejo de gallinas:');
  });

  it('inyecta objetivo de restauración para perfiles ecológicos', () => {
    const block = buildUserProfileBlock({
      rol: 'restaurador',
      restauracion_objetivo: ['bosque', 'paramo'],
    });
    expect(block).toContain('Quiere restaurar:');
    expect(block).toContain('Bosque nativo');
  });

  it('perfil sin campos nuevos no rompe (sin breaking change)', () => {
    const block = buildUserProfileBlock({ nombre: 'Sin rol' });
    expect(block).toContain('Sin rol');
    expect(block).not.toContain('Rol:');
  });
});
