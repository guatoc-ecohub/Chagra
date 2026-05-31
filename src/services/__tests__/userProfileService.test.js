import { describe, it, expect, beforeEach } from 'vitest';
import {
  PROFILE_QUESTIONS,
  getApplicableQuestions,
  getProfile,
  getProfileMunicipio,
  saveProfile,
  markProfileDone,
  markProfileSkipped,
  hasSeenProfileOnboarding,
  buildUserProfileBlock,
} from '../userProfileService.js';

describe('userProfileService (#200)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('catálogo de preguntas', () => {
    it('define hasta 18 preguntas', () => {
      expect(PROFILE_QUESTIONS.length).toBeLessThanOrEqual(18);
      expect(PROFILE_QUESTIONS.length).toBeGreaterThanOrEqual(15);
    });

    it('cada pregunta tiene id, category, title y type', () => {
      for (const q of PROFILE_QUESTIONS) {
        expect(q.id).toBeTruthy();
        expect(q.category).toBeTruthy();
        expect(q.title).toBeTruthy();
        expect(['text', 'number', 'single', 'multi']).toContain(q.type);
      }
    });

    it('los ids son únicos', () => {
      const ids = PROFILE_QUESTIONS.map((q) => q.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('preguntas condicionales', () => {
    it('usuario urbano NO ve hectáreas ni altitud rural', () => {
      const applicable = getApplicableQuestions({ vocacion: 'urbano' });
      const ids = applicable.map((q) => q.id);
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).not.toContain('finca_altitud');
      expect(ids).not.toContain('riego');
    });

    it('usuario urbano SÍ ve estrato y espacio urbano', () => {
      const applicable = getApplicableQuestions({ vocacion: 'urbano' });
      const ids = applicable.map((q) => q.id);
      expect(ids).toContain('estrato');
      expect(ids).toContain('espacio_urbano');
    });

    it('usuario rural SÍ ve hectáreas y altitud', () => {
      const applicable = getApplicableQuestions({ vocacion: 'campesino', finca_tipo: 'rural' });
      const ids = applicable.map((q) => q.id);
      expect(ids).toContain('finca_hectareas');
      expect(ids).toContain('finca_altitud');
      expect(ids).not.toContain('estrato');
    });

    it('balcón NO ve hectáreas (aunque vocación no sea urbano)', () => {
      const applicable = getApplicableQuestions({ vocacion: 'curioso', finca_tipo: 'balcon' });
      const ids = applicable.map((q) => q.id);
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).toContain('estrato');
    });
  });

  describe('persistencia localStorage chagra:profile:*', () => {
    it('saveProfile + getProfile hace merge', () => {
      saveProfile({ nombre: 'Lucía' });
      saveProfile({ region: 'Choachí' });
      const p = getProfile();
      expect(p.nombre).toBe('Lucía');
      expect(p.region).toBe('Choachí');
    });

    it('markProfileDone marca onboarding visto', () => {
      expect(hasSeenProfileOnboarding()).toBe(false);
      markProfileDone();
      expect(hasSeenProfileOnboarding()).toBe(true);
    });

    it('markProfileSkipped marca onboarding visto (respeta #283)', () => {
      markProfileSkipped();
      expect(hasSeenProfileOnboarding()).toBe(true);
    });
  });

  describe('buildUserProfileBlock', () => {
    it('vacío sin perfil', () => {
      expect(buildUserProfileBlock({})).toBe('');
    });

    it('incluye nombre, región y cultivos', () => {
      const block = buildUserProfileBlock({
        nombre: 'Pedro',
        region: 'Cauca',
        cultivos_actuales: 'café, plátano',
      });
      expect(block).toContain('Pedro');
      expect(block).toContain('Cauca');
      expect(block).toContain('café, plátano');
      expect(block).toContain('PERFIL DEL USUARIO');
    });

    it('traduce valores de opción única a etiquetas legibles', () => {
      const block = buildUserProfileBlock({ vocacion: 'campesino', manejo: 'organico' });
      expect(block).toMatch(/campesino/i);
      expect(block).toMatch(/orgánico|Orgánico/);
    });

    it('respuestas multi se unen con coma', () => {
      const block = buildUserProfileBlock({ problemas: ['plagas', 'clima'] });
      expect(block).toMatch(/Plagas e insectos/);
      expect(block).toMatch(/Clima/);
    });

    it('preferencia simple añade directiva de tono', () => {
      const block = buildUserProfileBlock({ nombre: 'X', nivel_respuestas: 'simple' });
      expect(block).toMatch(/SIMPLES/);
    });

    it('preferencia detallado añade directiva técnica', () => {
      const block = buildUserProfileBlock({ nombre: 'X', nivel_respuestas: 'detallado' });
      expect(block).toMatch(/DETALLADAS/);
    });
  });
});

describe('getProfileMunicipio — backfill offline de perfiles viejos (#338)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('prefiere el campo municipio limpio cuando existe', () => {
    saveProfile({ municipio: 'Popayán', region: 'otra cosa' });
    expect(getProfileMunicipio()).toBe('Popayán');
  });

  it('resuelve municipio desde region (texto libre) en perfiles sin municipio', () => {
    // Perfil viejo: solo region en texto libre, sin campo municipio.
    saveProfile({ region: 'Choachí, Cundinamarca' });
    expect(getProfileMunicipio()).toMatch(/Choach/);
  });

  it('devuelve null si no hay municipio ni region resoluble', () => {
    saveProfile({ region: 'Zzqxnoexiste' });
    expect(getProfileMunicipio()).toBeNull();
    localStorage.clear();
    expect(getProfileMunicipio()).toBeNull();
  });
});
