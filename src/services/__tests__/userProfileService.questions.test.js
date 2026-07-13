/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PROFILE_QUESTIONS,
  getApplicableQuestions,
  getProfile,
  saveProfile,
} from '../userProfileService.js';

describe('userProfileService.questions — getApplicableQuestions y saveProfile', () => {
  beforeEach(() => {
    // Mock localStorage completamente aislado por test
    const store = new Map();
    global.localStorage = /** @type {any} */ ({
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });
  });

  describe('getApplicableQuestions — ramas condicionales', () => {
    it('vacío: todas las preguntas sin condicional aplican', () => {
      const applicable = getApplicableQuestions({});
      const ids = applicable.map((q) => q.id);
      
      // Las preguntas sin 'when' siempre aplican
      expect(ids).toContain('nombre');
      expect(ids).toContain('region');
      expect(ids).toContain('vocacion');
      expect(ids).toContain('finca_tipo');
      expect(ids).toContain('cultivos_actuales');
      expect(ids).toContain('anios_cultivando');
      expect(ids).toContain('manejo');
      expect(ids).toContain('problemas');
      expect(ids).toContain('objetivo');
      expect(ids).toContain('cultivos_interes');
      expect(ids).toContain('nivel_respuestas');
      expect(ids).toContain('notif_clima');
    });

    it('vocación urbano: muestra estrato y espacio_urbano, oculta hectáreas y altitud', () => {
      const applicable = getApplicableQuestions({ vocacion: 'urbano' });
      const ids = applicable.map((q) => q.id);
      
      // Aplican para urbano
      expect(ids).toContain('estrato');
      expect(ids).toContain('espacio_urbano');
      
      // NO aplican para urbano
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).not.toContain('finca_altitud');
      expect(ids).not.toContain('riego');
    });

    it('vocación campesino + rural: muestra hectáreas, altitud y riego, oculta estrato', () => {
      const applicable = getApplicableQuestions({ 
        vocacion: 'campesino',
        finca_tipo: 'rural'
      });
      const ids = applicable.map((q) => q.id);
      
      // Aplican para rural
      expect(ids).toContain('finca_hectareas');
      expect(ids).toContain('finca_altitud');
      expect(ids).toContain('riego');
      
      // NO aplican para rural
      expect(ids).not.toContain('estrato');
      expect(ids).not.toContain('espacio_urbano');
    });

    it('vocación técnico + invernadero: muestra hectáreas, altitud y riego', () => {
      const applicable = getApplicableQuestions({ 
        vocacion: 'tecnico',
        finca_tipo: 'invernadero'
      });
      const ids = applicable.map((q) => q.id);
      
      expect(ids).toContain('finca_hectareas');
      expect(ids).toContain('finca_altitud');
      expect(ids).toContain('riego');
      expect(ids).not.toContain('estrato');
    });

    it('finca_tipo balcon + vocación curioso: muestra estrato, oculta hectáreas y riego', () => {
      const applicable = getApplicableQuestions({ 
        vocacion: 'curioso',
        finca_tipo: 'balcon'
      });
      const ids = applicable.map((q) => q.id);
      
      // Balcon activa estrato (porque es urbano-like)
      expect(ids).toContain('estrato');
      expect(ids).toContain('espacio_urbano');
      
      // Balcon NO tiene hectáreas ni riego
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).not.toContain('finca_altitud');
      expect(ids).not.toContain('riego');
    });

    it('finca_tipo terraza + vocación urbano: muestra estrato y espacio_urbano', () => {
      const applicable = getApplicableQuestions({ 
        vocacion: 'urbano',
        finca_tipo: 'terraza'
      });
      const ids = applicable.map((q) => q.id);
      
      expect(ids).toContain('estrato');
      expect(ids).toContain('espacio_urbano');
      expect(ids).not.toContain('finca_hectareas');
      expect(ids).not.toContain('finca_altitud');
      expect(ids).not.toContain('riego');
    });

    it('riego: oculta solo para balcon, muestra para resto', () => {
      // Con balcon - NO muestra riego
      const balcon = getApplicableQuestions({ finca_tipo: 'balcon' });
      expect(balcon.map((q) => q.id)).not.toContain('riego');
      
      // Con terraza - SÍ muestra riego (porque vocacion !== urbano)
      const terraza = getApplicableQuestions({ 
        vocacion: 'campesino',
        finca_tipo: 'terraza'
      });
      expect(terraza.map((q) => q.id)).toContain('riego');
      
      // Con rural - SÍ muestra riego
      const rural = getApplicableQuestions({ finca_tipo: 'rural' });
      expect(rural.map((q) => q.id)).toContain('riego');
    });

    it('respuestas parciales: evalúa solo con lo que tiene', () => {
      // Solo tiene vocacion, sin finca_tipo
      const soloVocacion = getApplicableQuestions({ vocacion: 'urbano' });
      const ids = soloVocacion.map((q) => q.id);
      
      // Como es urbano, debe mostrar estrato y espacio_urbano
      expect(ids).toContain('estrato');
      expect(ids).toContain('espacio_urbano');
      expect(ids).not.toContain('finca_hectareas');
    });
  });

  describe('getApplicableQuestions — orden y estabilidad', () => {
    it('devuelve preguntas en orden estable del catálogo', () => {
      const applicable = getApplicableQuestions({});
      const ids = applicable.map((q) => q.id);
      
      // El orden debe respetar el orden de PROFILE_QUESTIONS
      const expectedOrder = PROFILE_QUESTIONS
        .filter((q) => !q.when || q.when({}))
        .map((q) => q.id);
      
      expect(ids).toEqual(expectedOrder);
    });

    it('llamadas sucesivas con mismas respuestas devuelven mismo orden', () => {
      const answers = { vocacion: 'urbano' };
      const first = getApplicableQuestions(answers).map((q) => q.id);
      const second = getApplicableQuestions(answers).map((q) => q.id);
      
      expect(first).toEqual(second);
    });

    it('respuestas diferentes pueden cambiar el conjunto pero mantienen orden relativo', () => {
      const urbano = getApplicableQuestions({ vocacion: 'urbano' });
      const rural = getApplicableQuestions({ 
        vocacion: 'campesino',
        finca_tipo: 'rural'
      });
      
      const urbanoIds = urbano.map((q) => q.id);
      const ruralIds = rural.map((q) => q.id);
      
      // Ambos contienen las preguntas base (nombre, region, etc)
      expect(urbanoIds).toContain('nombre');
      expect(ruralIds).toContain('nombre');
      
      // Pero divergen en las condicionales
      expect(urbanoIds).toContain('estrato');
      expect(ruralIds).not.toContain('estrato');
      expect(ruralIds).toContain('finca_hectareas');
      expect(urbanoIds).not.toContain('finca_hectareas');
    });
  });

  describe('getApplicableQuestions — casos borde', () => {
    it('answers null lanza error (funciones when asumen objeto), undefined trata como vacío', () => {
      // null causa error porque las funciones when acceden a propiedades
      expect(() => getApplicableQuestions(null)).toThrow(TypeError);

      // undefined se trata como {} en la implementación (parámetro por defecto)
      const conUndefined = getApplicableQuestions(undefined);
      const conVacio = getApplicableQuestions({});
      expect(conUndefined.length).toBe(conVacio.length);
    });

    it('answers con propiedades extra no rompe el filtro', () => {
      const applicable = getApplicableQuestions({ 
        vocacion: 'urbano',
        propiedadInexistente: 'valor',
        otro: 123,
      });
      
      expect(applicable.length).toBeGreaterThan(0);
      expect(applicable.map((q) => q.id)).toContain('estrato');
    });

    it('todas las preguntas condicionales tienen when correctamente definido', () => {
      const preguntasConWhen = PROFILE_QUESTIONS.filter((q) => q.when);
      
      for (const q of preguntasConWhen) {
        expect(typeof q.when).toBe('function');
        
        // Verificar que when puede ejecutarse sin error
        expect(() => {
          q.when({});
        }).not.toThrow();
      }
    });
  });

  describe('saveProfile — persistencia y merge', () => {
    it('guarda perfil con merge de respuestas anteriores', () => {
      saveProfile({ nombre: 'Carlos', vocacion: 'campesino' });
      saveProfile({ region: 'Cauca' });
      
      const profile = getProfile();
      expect(profile.nombre).toBe('Carlos');
      expect(profile.vocacion).toBe('campesino');
      expect(profile.region).toBe('Cauca');
    });

    it('saveProfile añade timestamp updatedAt', () => {
      const before = new Date().toISOString();
      saveProfile({ nombre: 'Test' });
      const after = new Date().toISOString();
      
      const profile = getProfile();
      expect(profile.updatedAt).toBeTruthy();
      expect(profile.updatedAt >= before).toBe(true);
      expect(profile.updatedAt <= after).toBe(true);
    });

    it('saveProfile sobrescribe valores existentes', () => {
      saveProfile({ nombre: 'Original' });
      saveProfile({ nombre: 'Modificado' });
      
      expect(getProfile().nombre).toBe('Modificado');
    });

    it('saveProfile con objeto vacío no borra perfil existente', () => {
      saveProfile({ nombre: 'Carlos', region: 'Cauca' });
      saveProfile({});
      
      const profile = getProfile();
      expect(profile.nombre).toBe('Carlos');
      expect(profile.region).toBe('Cauca');
    });

    it('saveProfile respeta respuestas tipo array (multi-select)', () => {
      const problemas = ['plagas', 'clima', 'suelo'];
      saveProfile({ problemas });
      
      expect(getProfile().problemas).toEqual(problemas);
    });

    it('saveProfile respeta respuestas null y undefined', () => {
      saveProfile({ nombre: 'Test', region: null, cultivos: undefined });
      
      const profile = getProfile();
      expect(profile.nombre).toBe('Test');
      expect(profile.region).toBeNull();
      expect(profile.cultivos).toBeUndefined();
    });

    it('getProfile devuelve {} si localStorage está vacío', () => {
      const profile = getProfile();
      expect(profile).toEqual({});
    });

    it('getProfile devuelve {} si localStorage tiene JSON inválido', () => {
      localStorage.setItem('chagra:profile:v1', 'no es json');
      
      const profile = getProfile();
      expect(profile).toEqual({});
    });

    it('getProfile devuelve {} si localStorage tiene null', () => {
      localStorage.setItem('chagra:profile:v1', 'null');
      
      const profile = getProfile();
      expect(profile).toEqual({});
    });
  });

  describe('saveProfile — manejo de localStorage', () => {
    it('saveProfile usa localStorage.setItem con key correcto', () => {
      saveProfile({ nombre: 'Test' });
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'chagra:profile:v1',
        expect.stringContaining('"nombre":"Test"')
      );
    });

    it('saveProfile llama localStorage.getItem para leer perfil actual', () => {
      saveProfile({ nombre: 'Test' });
      
      expect(localStorage.getItem).toHaveBeenCalledWith('chagra:profile:v1');
    });

    it('saveProfile falla graceful si localStorage.setItem lanza error', () => {
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage full');
      });
      
      // No debe lanzar error
      expect(() => saveProfile({ nombre: 'Test' })).not.toThrow();
    });

    it('saveProfile sin localStorage (SSR) devuelve solo el partial sin updatedAt', () => {
      delete global.localStorage;

      const profile = saveProfile({ nombre: 'Test' });
      expect(profile.nombre).toBe('Test');
      // Sin localStorage, saveProfile retorna { ...partial } sin añadir updatedAt
      expect(profile.updatedAt).toBeUndefined();
      expect(Object.keys(profile).length).toBe(1);
    });
  });

  describe('cobertura exhaustiva de condiciones', () => {
    it('urbano muestra menos preguntas que rural (sin hectáreas/altitud/riego/animales)', () => {
      const urbano = getApplicableQuestions({ vocacion: 'urbano' });
      const rural = getApplicableQuestions({
        vocacion: 'campesino',
        finca_tipo: 'rural'
      });

      // Urbano tiene menos preguntas (sin hectáreas, altitud, riego, animales).
      // El número exacto evoluciona al agregar preguntas por perfil; lo que
      // importa es la RELACIÓN urbano < rural y un piso razonable.
      expect(urbano.length).toBeLessThan(rural.length);
      expect(urbano.length).toBeGreaterThanOrEqual(12);
      // Urbano NO recibe la pregunta de animales (balcón sin espacio pecuario).
      expect(urbano.map((q) => q.id)).not.toContain('animales');
    });

    it('rural muestra 18-20 preguntas (más que urbano)', () => {
      // Subió el rango al sumar la estructura de finca para la escena #34:
      // composicion (base) + invernadero_tiene (condicional rural). La forma y
      // el tamaño del invernadero NO se muestran hasta declarar que SÍ tiene.
      const rural = getApplicableQuestions({
        vocacion: 'campesino',
        finca_tipo: 'rural'
      });

      expect(rural.length).toBeGreaterThanOrEqual(18);
      expect(rural.length).toBeLessThanOrEqual(20);
      expect(rural.map((q) => q.id)).toContain('finca_hectareas');
      expect(rural.map((q) => q.id)).toContain('finca_altitud');
      expect(rural.map((q) => q.id)).toContain('riego');
      expect(rural.map((q) => q.id)).toContain('composicion');
      expect(rural.map((q) => q.id)).toContain('invernadero_tiene');
      // No declaró tener invernadero → no se le piden forma ni tamaño.
      expect(rural.map((q) => q.id)).not.toContain('invernadero_forma');
      expect(rural.map((q) => q.id)).not.toContain('invernadero_tamano');
    });

    it('balcon tiene mismo número que urbano (comparte condicionales)', () => {
      const balcon = getApplicableQuestions({ 
        vocacion: 'curioso',
        finca_tipo: 'balcon'
      });
      const urbano = getApplicableQuestions({ vocacion: 'urbano' });
      
      expect(balcon.length).toBe(urbano.length);
    });

    it('invernadero muestra MÁS que rural: forma y tamaño del invernadero (#34)', () => {
      // finca_tipo === 'invernadero' implica que SÍ tiene invernadero, así que
      // además de las condicionales rurales se le piden forma y tamaño para que
      // la escena #34 pueda dibujar la estructura.
      const invernadero = getApplicableQuestions({
        vocacion: 'tecnico',
        finca_tipo: 'invernadero'
      });
      const rural = getApplicableQuestions({
        vocacion: 'campesino',
        finca_tipo: 'rural'
      });

      // Hereda todo lo rural + forma + tamaño (las dos preguntas extra).
      expect(invernadero.length).toBe(rural.length + 2);
      const ids = invernadero.map((q) => q.id);
      expect(ids).toContain('invernadero_forma');
      expect(ids).toContain('invernadero_tamano');
      expect(ids).toContain('composicion');
    });

    it('todas las preguntas tienen category válida', () => {
      const validCategories = ['identidad', 'finca', 'experiencia', 'objetivos', 'preferencias'];
      
      for (const q of PROFILE_QUESTIONS) {
        expect(validCategories).toContain(q.category);
      }
    });
  });
});
