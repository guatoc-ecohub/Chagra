/* eslint-disable no-undef */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveProfile,
  getInvernaderoEstructura,
  getComposicionFinca,
  getFincaEstructura,
  INVERNADERO_FORMAS,
  COMPOSICION_GRUPOS,
} from '../userProfileService.js';
import { selectSceneVariant, SCENE_KINDS } from '../fincaSceneProfileSelector.js';

/**
 * fincaEstructura.test — estructura de finca para la escena rica (#34, fase 1).
 *
 * Cubre:
 *   - getInvernaderoEstructura / getComposicionFinca: tipado + saneo.
 *   - getFincaEstructura: gancho tipado combinado.
 *   - selectSceneVariant: ahora expone la ESTRUCTURA (invernaderoForma/Tamano +
 *     zonas) que la escena F2 dibuja, sin cambiar el `kind`.
 *   - Migración suave: perfiles VIEJOS sin estos campos → defaults sanos.
 */
describe('estructura de finca (#34) — getters tipados', () => {
  beforeEach(() => {
    const store = new Map();
    global.localStorage = /** @type {any} */ ({
      getItem: vi.fn((key) => store.get(key) || null),
      setItem: vi.fn((key, value) => store.set(key, value)),
      removeItem: vi.fn((key) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    });
  });

  describe('getInvernaderoEstructura', () => {
    it('perfil viejo SIN campos → default sano { tiene:false, forma:null, tamano:null }', () => {
      saveProfile({ nombre: 'Lili', vocacion: 'campesino' });
      expect(getInvernaderoEstructura()).toEqual({ tiene: false, forma: null, tamano: null });
    });

    it('declaró que NO tiene → tiene:false sin forma ni tamaño', () => {
      saveProfile({ invernadero_tiene: 'no', invernadero_forma: 'cuadrado' });
      expect(getInvernaderoEstructura()).toEqual({ tiene: false, forma: null, tamano: null });
    });

    it('David: cuadrado grande → tipado completo', () => {
      saveProfile({
        invernadero_tiene: 'si',
        invernadero_forma: 'cuadrado',
        invernadero_tamano: '20 x 30 metros',
      });
      expect(getInvernaderoEstructura()).toEqual({
        tiene: true,
        forma: 'cuadrado',
        tamano: '20 x 30 metros',
      });
    });

    it('Miguel: túnel pequeño', () => {
      saveProfile({
        invernadero_tiene: 'si',
        invernadero_forma: 'tunel',
        invernadero_tamano: 'uno pequeño',
      });
      expect(getInvernaderoEstructura()).toEqual({
        tiene: true,
        forma: 'tunel',
        tamano: 'uno pequeño',
      });
    });

    it('finca_tipo === invernadero implica tiene:true aunque no se declare explícito', () => {
      saveProfile({ finca_tipo: 'invernadero' });
      const inv = getInvernaderoEstructura();
      expect(inv.tiene).toBe(true);
      expect(inv.forma).toBeNull();
    });

    it('forma desconocida se descarta (null); tamaño vacío → null', () => {
      saveProfile({ invernadero_tiene: 'si', invernadero_forma: 'piramide', invernadero_tamano: '   ' });
      expect(getInvernaderoEstructura()).toEqual({ tiene: true, forma: null, tamano: null });
    });

    it('acepta un perfil pasado por argumento (función pura respecto al arg)', () => {
      const inv = getInvernaderoEstructura({ invernadero_tiene: 'si', invernadero_forma: 'otro' });
      expect(inv).toEqual({ tiene: true, forma: 'otro', tamano: null });
    });

    it('todas las formas declaradas son válidas en INVERNADERO_FORMAS', () => {
      for (const f of ['cuadrado', 'tunel', 'otro']) {
        expect(INVERNADERO_FORMAS).toContain(f);
      }
    });
  });

  describe('getComposicionFinca', () => {
    it('perfil viejo SIN composición → []', () => {
      saveProfile({ nombre: 'JD' });
      expect(getComposicionFinca()).toEqual([]);
    });

    it('respeta los grupos marcados y mantiene el orden del catálogo', () => {
      saveProfile({ composicion: ['animales', 'huerta', 'frutales'] });
      // Orden canónico: huerta, frutales, aromaticas, animales.
      expect(getComposicionFinca()).toEqual(['huerta', 'frutales', 'animales']);
    });

    it('descarta valores desconocidos y duplicados', () => {
      saveProfile({ composicion: ['huerta', 'huerta', 'platanos', 'aromaticas'] });
      expect(getComposicionFinca()).toEqual(['huerta', 'aromaticas']);
    });

    it('composición no-array → []', () => {
      saveProfile({ composicion: 'huerta' });
      expect(getComposicionFinca()).toEqual([]);
    });

    it('todos los grupos están en COMPOSICION_GRUPOS', () => {
      expect(COMPOSICION_GRUPOS).toEqual(['huerta', 'frutales', 'aromaticas', 'animales']);
    });
  });

  describe('getFincaEstructura — gancho tipado combinado', () => {
    it('combina invernadero + composición tipados', () => {
      saveProfile({
        invernadero_tiene: 'si',
        invernadero_forma: 'cuadrado',
        composicion: ['huerta', 'animales'],
      });
      expect(getFincaEstructura()).toEqual({
        invernadero: { tiene: true, forma: 'cuadrado', tamano: null },
        composicion: ['huerta', 'animales'],
      });
    });

    it('MIGRACIÓN: perfil vacío → estructura con defaults sanos (escena no rompe)', () => {
      expect(getFincaEstructura()).toEqual({
        invernadero: { tiene: false, forma: null, tamano: null },
        composicion: [],
      });
    });
  });
});

describe('estructura de finca (#34) — selectSceneVariant expone el esqueleto a la escena F2', () => {
  it('MIGRACIÓN: perfil vacío → variante con estructura por defecto (escena no rompe)', () => {
    const v = selectSceneVariant({});
    expect(v.kind).toBe(SCENE_KINDS.finca);
    expect(v.invernaderoForma).toBeNull();
    expect(v.invernaderoTamano).toBeNull();
    expect(v.zonas).toEqual([]);
  });

  it('perfil null/undefined no rompe — estructura por defecto', () => {
    const v = selectSceneVariant(null);
    expect(v.zonas).toEqual([]);
    expect(v.invernaderoForma).toBeNull();
  });

  it('David: invernadero cuadrado grande + huerta + frutales (kind invernadero por finca_tipo)', () => {
    const v = selectSceneVariant({
      finca_tipo: 'invernadero',
      invernadero_forma: 'cuadrado',
      invernadero_tamano: '20 x 30 metros',
      composicion: ['huerta', 'frutales'],
    });
    expect(v.kind).toBe(SCENE_KINDS.invernadero);
    expect(v.invernaderoForma).toBe('cuadrado');
    expect(v.invernaderoTamano).toBe('20 x 30 metros');
    expect(v.zonas).toEqual(['huerta', 'frutales']);
  });

  it('Miguel: finca rural con túnel declarado + zonas (kind finca, pero trae estructura)', () => {
    const v = selectSceneVariant({
      vocacion: 'campesino',
      finca_tipo: 'rural',
      invernadero_tiene: 'si',
      invernadero_forma: 'tunel',
      invernadero_tamano: 'uno pequeño',
      composicion: ['huerta', 'aromaticas', 'animales'],
    });
    expect(v.kind).toBe(SCENE_KINDS.finca);
    expect(v.invernaderoForma).toBe('tunel');
    expect(v.invernaderoTamano).toBe('uno pequeño');
    expect(v.zonas).toEqual(['huerta', 'aromaticas', 'animales']);
  });

  it('la estructura NO cambia el kind: urbano sigue siendo balcón aunque traiga composición', () => {
    const v = selectSceneVariant({ vocacion: 'urbano', composicion: ['huerta'] });
    expect(v.kind).toBe(SCENE_KINDS.balcon);
    // La estructura igual viaja (la escena decide qué dibujar según kind).
    expect(v.zonas).toEqual(['huerta']);
  });
});
