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
  resolveAltitudToSave,
  getNotificationStyle,
  setNotificationStyle,
  DEFAULT_NOTIFICATION_STYLE,
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

describe('resolveAltitudToSave — coalesce no-destructivo (#1213-regresion)', () => {
  it('manual siempre prevalece — sobrescribe incluso una altitud buena existente', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'manual',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 2580,
      existingFincaAltitud: '1923',
      existingAltitudSource: 'elevation_api',
    });
    expect(finca_altitud).toBe('2580');
    expect(altitud_source).toBe('manual');
  });

  it('regresion #1213: cabecera NO pisa altitud real existente (caso Choachi 2580 vs 1923)', () => {
    // El perfil del operador tiene altitud 2580 (finca vereda alta, fuente no-cabecera).
    // El backfill de municipio Choachi devuelve altitud_fuente='cabecera' (1923).
    // El resultado debe preservar 2580 y NO actualizar finca_altitud.
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 1923, // lo que resolvió el fallback offline
      existingFincaAltitud: '2580',
      existingAltitudSource: 'manual', // o 'elevation_api' o 'dado'
    });
    expect(finca_altitud).toBeUndefined();
    expect(altitud_source).toBeUndefined();
  });

  it('cabecera SÍ persiste cuando el perfil no tiene altitud previa', () => {
    // Perfil nuevo sin altitud → la cabecera es mejor que nada.
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 1923,
      existingFincaAltitud: null,
      existingAltitudSource: null,
    });
    expect(finca_altitud).toBe('1923');
    expect(altitud_source).toBe('cabecera');
  });

  it('cabecera SÍ persiste cuando el perfil ya tiene otra cabecera (no pior que antes)', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'cabecera',
      effectiveAltitud: 1923,
      existingFincaAltitud: '1800',
      existingAltitudSource: 'cabecera',
    });
    // Actualizar cabecera con cabecera está bien (puede haber elegido otro municipio).
    expect(finca_altitud).toBe('1923');
    expect(altitud_source).toBe('cabecera');
  });

  it('elevation_api pisa una cabecera previa (GPS/API > cabecera)', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'elevation_api',
      effectiveAltitud: 2490,
      existingFincaAltitud: '1923',
      existingAltitudSource: 'cabecera',
    });
    expect(finca_altitud).toBe('2490');
    expect(altitud_source).toBe('elevation_api');
  });

  it('dado (GPS real) pisa una cabecera previa', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: 'dado',
      effectiveAltitud: 2580,
      existingFincaAltitud: '1923',
      existingAltitudSource: 'cabecera',
    });
    expect(finca_altitud).toBe('2580');
    expect(altitud_source).toBe('dado');
  });

  it('sin effectiveAltitud devuelve ambos undefined', () => {
    const { finca_altitud, altitud_source } = resolveAltitudToSave({
      altitudSource: 'derived',
      resolvedAltitudFuente: null,
      effectiveAltitud: null,
      existingFincaAltitud: null,
      existingAltitudSource: null,
    });
    expect(finca_altitud).toBeUndefined();
    expect(altitud_source).toBeUndefined();
  });

  describe('estilo de notificación (operador 2026-06-06)', () => {
    it('por defecto es "demo" (chip estilo demo)', () => {
      expect(DEFAULT_NOTIFICATION_STYLE).toBe('demo');
      expect(getNotificationStyle()).toBe('demo');
    });

    it('persiste y relee el estilo seleccionado', () => {
      setNotificationStyle('actual');
      expect(getNotificationStyle()).toBe('actual');
      expect(getProfile().estilo_notificacion).toBe('actual');
      setNotificationStyle('demo');
      expect(getNotificationStyle()).toBe('demo');
    });

    it('un valor inválido cae al default sin corromper el perfil', () => {
      setNotificationStyle('xyz');
      expect(getNotificationStyle()).toBe('demo');
      expect(getProfile().estilo_notificacion).toBe('demo');
    });

    it('un perfil viejo sin el campo devuelve el default', () => {
      saveProfile({ nombre: 'Lili' });
      expect(getNotificationStyle()).toBe('demo');
    });
  });
});
