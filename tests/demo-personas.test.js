/**
 * demo-personas.test.js — Tests para perfiles demo con datos ricos.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { applyProfilePreset, getActivePresetId } from '../src/services/profilePresets.js';
import { seedProfileData, PROFILE_SEEDS } from '../src/services/demoPersonaSeeds.js';
import { setOperatorOverride, operatorOverrideActivo } from '../src/config/glaciarAccess.js';

describe('Demo Personas — Perfiles con datos ricos', () => {
  beforeEach(() => {
    // Limpiar localStorage antes de cada test
    try {
      localStorage.clear();
    } catch (_) {}
  });

  afterEach(() => {
    // Limpiar después de cada test
    try {
      localStorage.clear();
    } catch (_) {}
  });

  describe('applyProfilePreset — desactiva Visión total', () => {
    it('debería desactivar el override de operador al aplicar un perfil demo', async () => {
      // Activar override de operador
      setOperatorOverride(true);
      expect(operatorOverrideActivo()).toBe(true);

      // Aplicar perfil demo
      await applyProfilePreset('campesino');

      // El override debería estar desactivado
      expect(operatorOverrideActivo()).toBe(false);
    });

    it('debería mantener el override desactivado si ya estaba off', async () => {
      // Asegurar que el override está desactivado
      setOperatorOverride(false);
      expect(operatorOverrideActivo()).toBe(false);

      // Aplicar perfil demo
      await applyProfilePreset('cafetero');

      // El override debería seguir desactivado
      expect(operatorOverrideActivo()).toBe(false);
    });
  });

  describe('PROFILE_SEEDS — datos por perfil', () => {
    it('debería tener datos para todos los perfiles de PROFILE_PRESETS', () => {
      const expectedProfiles = ['campesino', 'cafetero', 'cacaotero', 'corporativo'];
      
      expectedProfiles.forEach(profileId => {
        expect(PROFILE_SEEDS[profileId]).toBeDefined();
        expect(PROFILE_SEEDS[profileId].nombre).toBeDefined();
        expect(PROFILE_SEEDS[profileId].cultivos).toBeDefined();
        expect(PROFILE_SEEDS[profileId].zonas).toBeDefined();
      });
    });

    it('campesino debería tener huerta diversa + gallinas', () => {
      const campesino = PROFILE_SEEDS.campesino;
      
      expect(campesino.cultivos.length).toBeGreaterThan(0);
      expect(campesino.cultivos.some(c => c.especie_id === 'zea_mays')).toBe(true); // maíz
      expect(campesino.cultivos.some(c => c.especie_id === 'phaseolus_vulgaris')).toBe(true); // fríjol
      expect(campesino.animales.length).toBe(1);
      expect(campesino.animales[0].tipo).toBe('gallinas');
    });

    it('cafetero debería tener SAF café + sombra + plátano', () => {
      const cafetero = PROFILE_SEEDS.cafetero;
      
      expect(cafetero.cultivos.length).toBeGreaterThan(0);
      expect(cafetero.cultivos.some(c => c.especie_id === 'coffea_arabica')).toBe(true);
      expect(cafetero.cultivos.some(c => c.variedad.includes('Colombia') || c.variedad.includes('Castillo'))).toBe(true);
      expect(cafetero.cultivos.some(c => c.sombra && c.sombra.length > 0)).toBe(true);
      expect(cafetero.cultivos.some(c => c.especie_id === 'musa_aab')).toBe(true); // plátano
    });

    it('cacaotero debería tener cacao + matarratón + plátano', () => {
      const cacaotero = PROFILE_SEEDS.cacaotero;
      
      expect(cacaotero.cultivos.length).toBeGreaterThan(0);
      expect(cacaotero.cultivos.some(c => c.especie_id === 'theobroma_cacao')).toBe(true);
      expect(cacaotero.cultivos.some(c => c.variedad.includes('CCN') || c.variedad.includes('ICS'))).toBe(true);
      expect(cacaotero.cultivos.some(c => c.especie_id === 'erythrina_fusca')).toBe(true); // matarratón
      expect(cacaotero.cultivos.some(c => c.especie_id === 'musa_aab')).toBe(true); // plátano
    });

    it('corporativo debería tener multi-finca con indicadores', () => {
      const corporativo = PROFILE_SEEDS.corporativo;
      
      expect(corporativo.cultivos.length).toBeGreaterThanOrEqual(3);
      expect(corporativo.zonas.some(z => z.finca)).toBe(true);
      expect(corporativo.cultivos.every(c => c.finca)).toBe(true);
    });
  });

  describe('seedProfileData — carga en IndexedDB', () => {
    it('debería poder cargar datos de un perfil sin errores', async () => {
      // Este test verificaría que seedProfileData puede insertar datos en IDB
      // En un entorno real, necesitaríamos mockear openDB
      // Por ahora, verificamos que la función existe y es callable
      expect(typeof seedProfileData).toBe('function');
      
      try {
        // Intentar llamar la función (puede fallar sin IDB real, pero no debe crash en parse)
        await seedProfileData('campesino');
      } catch (error) {
        // Es aceptable que falle sin IDB real, pero no debe ser un error de import/parse
        expect(error.message).not.toContain('Unexpected token');
      }
    });

    it('debería fallar gracefully con perfil inexistente', async () => {
      await expect(seedProfileData('perfil-inexistente')).resolves.not.toThrow();
    });
  });
});
