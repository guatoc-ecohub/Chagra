import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEMO_PROFILES,
  getDemoProfile,
  applyDemoProfile,
  clearDemoProfile,
  isDemoActive,
} from '../demoProfile';

describe('demoProfile service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('DEMO_PROFILES', () => {
    it('has 6 entries', () => {
      expect(DEMO_PROFILES).toHaveLength(6);
    });

    it('all entries have id, label, emoji, profile', () => {
      for (const entry of DEMO_PROFILES) {
        expect(entry).toHaveProperty('id');
        expect(typeof entry.id).toBe('string');
        expect(entry).toHaveProperty('label');
        expect(typeof entry.label).toBe('string');
        expect(entry).toHaveProperty('emoji');
        expect(typeof entry.emoji).toBe('string');
        expect(entry).toHaveProperty('profile');
        expect(typeof entry.profile).toBe('object');
      }
    });
  });

  describe('getDemoProfile', () => {
    it('returns correct profile for campesino', () => {
      const p = getDemoProfile('campesino');
      expect(p).toBeDefined();
      expect(p.rol).toBe('campesino');
      expect(p.vocacion).toBe('campesino');
      expect(p.animales).toEqual(['gallinas']);
      expect(p.cultivos_actuales).toBe('cafe, mora');
    });

    it('returns correct profile for urbano', () => {
      const p = getDemoProfile('urbano');
      expect(p).toBeDefined();
      expect(p.rol).toBe('campesino');
      expect(p.vocacion).toBe('urbano');
      expect(p.finca_tipo).toBe('balcon');
      expect(p.cultivos_actuales).toBe('tomate, albahaca');
    });

    it('returns correct profile for restaurador', () => {
      const p = getDemoProfile('restaurador');
      expect(p).toBeDefined();
      expect(p.rol).toBe('restaurador');
      expect(p.objetivo).toEqual(['biodiversidad']);
      expect(p.restauracion_objetivo).toEqual(['bosque', 'paramo']);
    });

    it('returns correct profile for ganadero_cerdos', () => {
      const p = getDemoProfile('ganadero_cerdos');
      expect(p).toBeDefined();
      expect(p.rol).toBe('ganadero');
      expect(p.animales).toEqual(['cerdos', 'ganado']);
    });

    it('returns correct profile for guia_glaciar', () => {
      const p = getDemoProfile('guia_glaciar');
      expect(p).toBeDefined();
      expect(p.vocacion).toBe('campesino');
    });

    it('returns correct profile for tecnico', () => {
      const p = getDemoProfile('tecnico');
      expect(p).toBeDefined();
      expect(p.rol).toBe('tecnico');
      expect(p.vocacion).toBe('tecnico');
    });

    it('returns undefined for unknown id', () => {
      expect(getDemoProfile('nonexistent')).toBeUndefined();
    });

    it('returns a shallow copy, not a reference', () => {
      const p1 = getDemoProfile('campesino');
      const p2 = getDemoProfile('campesino');
      expect(p1).toEqual(p2);
      expect(p1).not.toBe(p2);
    });
  });

  describe('applyDemoProfile', () => {
    it('saves profile to localStorage under chagra:profile:v1', () => {
      applyDemoProfile('campesino');
      const raw = localStorage.getItem('chagra:profile:v1');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw);
      expect(parsed.rol).toBe('campesino');
    });

    it('sets chagra:demo:switch-active to "1"', () => {
      applyDemoProfile('campesino');
      expect(localStorage.getItem('chagra:demo:switch-active')).toBe('1');
    });

    it('dispatches chagra:profile:demo-switched event', () => {
      let eventDetail = null;
      const handler = (e) => { eventDetail = e.detail; };
      window.addEventListener('chagra:profile:demo-switched', handler);
      applyDemoProfile('tecnico');
      window.removeEventListener('chagra:profile:demo-switched', handler);
      expect(eventDetail).not.toBeNull();
      expect(/** @type {any} */ (eventDetail).id).toBe('tecnico');
      expect(/** @type {any} */ (eventDetail).profile.rol).toBe('tecnico');
    });

    it('returns true on success', () => {
      expect(applyDemoProfile('campesino')).toBe(true);
    });

    it('returns false for unknown id', () => {
      expect(applyDemoProfile('nonexistent')).toBe(false);
    });

    it('does not write to localStorage for unknown id', () => {
      applyDemoProfile('nonexistent');
      expect(localStorage.getItem('chagra:profile:v1')).toBeNull();
    });
  });

  describe('clearDemoProfile', () => {
    it('removes profile from localStorage', () => {
      applyDemoProfile('campesino');
      expect(localStorage.getItem('chagra:profile:v1')).not.toBeNull();
      clearDemoProfile();
      expect(localStorage.getItem('chagra:profile:v1')).toBeNull();
    });

    it('removes switch-active from localStorage', () => {
      applyDemoProfile('campesino');
      expect(localStorage.getItem('chagra:demo:switch-active')).toBe('1');
      clearDemoProfile();
      expect(localStorage.getItem('chagra:demo:switch-active')).toBeNull();
    });

    it('dispatches chagra:profile:demo-switched with null detail', () => {
      applyDemoProfile('campesino');
      let eventDetail = undefined;
      const handler = (e) => { eventDetail = e.detail; };
      window.addEventListener('chagra:profile:demo-switched', handler);
      clearDemoProfile();
      window.removeEventListener('chagra:profile:demo-switched', handler);
      expect(eventDetail).toBeNull();
    });
  });

  describe('isDemoActive', () => {
    it('returns false when no profile applied', () => {
      expect(isDemoActive()).toBe(false);
    });

    it('returns true when a profile is applied', () => {
      applyDemoProfile('campesino');
      expect(isDemoActive()).toBe(true);
    });

    it('returns false after clearing', () => {
      applyDemoProfile('campesino');
      clearDemoProfile();
      expect(isDemoActive()).toBe(false);
    });
  });
});
