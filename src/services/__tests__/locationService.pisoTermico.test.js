/**
 * locationService.pisoTermico.test.js — pruebas de getPisoTermicoInfo.
 *
 * Cubre la función PURA getPisoTermicoInfo (sin red/ollama).
 * No duplica lo que ya cubre locationService.test.js.
 *
 * Límites de pisos térmicos (desde deriveThermalZoneFromAltitud):
 *   - cálido:    0-999 msnm    (altitud < 1000)
 *   - templado:  1000-1999 msnm (altitud < 2000)
 *   - frío:      2000-2999 msnm (altitud < 3000)
 *   - páramo:    3000-3599 msnm (altitud < 3600)
 *   - glacial:   3600+ msnm     (altitud >= 3600)
 */

import { describe, it, expect } from 'vitest';
import { getPisoTermicoInfo } from '../locationService.js';

describe('locationService — getPisoTermicoInfo (puro)', () => {
  describe('límites exactos de pisos térmicos', () => {
    it('cálido: 999 es cálido, 1000 es templado', () => {
      expect(getPisoTermicoInfo(999).slug).toBe('cálido');
      expect(getPisoTermicoInfo(1000).slug).toBe('templado');
    });

    it('templado: 1999 es templado, 2000 es frío', () => {
      expect(getPisoTermicoInfo(1999).slug).toBe('templado');
      expect(getPisoTermicoInfo(2000).slug).toBe('frío');
    });

    it('frío: 2999 es frío, 3000 es páramo', () => {
      expect(getPisoTermicoInfo(2999).slug).toBe('frío');
      expect(getPisoTermicoInfo(3000).slug).toBe('páramo');
    });

    it('páramo: 3599 es páramo, 3600 es glacial', () => {
      expect(getPisoTermicoInfo(3599).slug).toBe('páramo');
      expect(getPisoTermicoInfo(3600).slug).toBe('glacial');
    });

    it('glacial: 3601 sigue siendo glacial', () => {
      expect(getPisoTermicoInfo(3601).slug).toBe('glacial');
      expect(getPisoTermicoInfo(5000).slug).toBe('glacial');
    });
  });

  describe('shape devuelto completo', () => {
    it('cálido tiene label, rango, color, emoji, cultivos', () => {
      const info = getPisoTermicoInfo(500);
      expect(info).toMatchObject({
        slug: 'cálido',
        label: 'Cálido',
        rango: '0–1000 msnm',
        emoji: '🌴',
        color: 'orange',
        cultivos: expect.arrayContaining(['Plátano', 'Cacao']),
      });
      expect(info.cultivos.length).toBeGreaterThan(0);
    });

    it('templado tiene label, rango, color, emoji, cultivos', () => {
      const info = getPisoTermicoInfo(1500);
      expect(info).toMatchObject({
        slug: 'templado',
        label: 'Templado',
        rango: '1000–2000 msnm',
        emoji: '🌤️',
        color: 'amber',
        cultivos: expect.arrayContaining(['Café', 'Aguacate']),
      });
    });

    it('frío tiene label, rango, color, emoji, cultivos', () => {
      const info = getPisoTermicoInfo(2500);
      expect(info).toMatchObject({
        slug: 'frío',
        label: 'Frío',
        rango: '2000–3000 msnm',
        emoji: '⛅',
        color: 'green',
        cultivos: expect.arrayContaining(['Papa', 'Arveja']),
      });
    });

    it('páramo tiene label, rango, color, emoji, cultivos', () => {
      const info = getPisoTermicoInfo(3200);
      expect(info).toMatchObject({
        slug: 'páramo',
        label: 'Páramo',
        rango: '3000–3600 msnm',
        emoji: '🏔️',
        color: 'indigo',
        cultivos: expect.arrayContaining(['Papa', 'Cubios']),
      });
    });

    it('glacial tiene label, rango, color, emoji, cultivos', () => {
      const info = getPisoTermicoInfo(4000);
      expect(info).toMatchObject({
        slug: 'glacial',
        label: 'Alta montaña',
        rango: '> 3600 msnm',
        emoji: '❄️',
        color: 'sky',
        cultivos: expect.arrayContaining(['Conservación de páramo']),
      });
    });
  });

  describe('casos borde de altitud', () => {
    it('altitud 0 es cálido', () => {
      const info = getPisoTermicoInfo(0);
      expect(info.slug).toBe('cálido');
      expect(info.label).toBe('Cálido');
    });

    it('altitud NaN devuelve null', () => {
      expect(getPisoTermicoInfo(NaN)).toBeNull();
    });

    it('altitud undefined devuelve null', () => {
      expect(getPisoTermicoInfo(undefined)).toBeNull();
    });

    it('altitud negativa devuelve null', () => {
      expect(getPisoTermicoInfo(-1)).toBeNull();
      expect(getPisoTermicoInfo(-100)).toBeNull();
    });

    it('altitud string inválida devuelve null', () => {
      expect(getPisoTermicoInfo(/** @type {any} */ ('abc'))).toBeNull();
      expect(getPisoTermicoInfo(/** @type {any} */ (''))).toBeNull();
      expect(getPisoTermicoInfo(/** @type {any} */ ('123abc'))).toBeNull();
    });

    it('altitud null devuelve null', () => {
      expect(getPisoTermicoInfo(null)).toBeNull();
    });
  });

  describe('cobertura completa de rangos', () => {
    it('rangos bajos de cálido (0, 100, 500)', () => {
      expect(getPisoTermicoInfo(0).slug).toBe('cálido');
      expect(getPisoTermicoInfo(100).slug).toBe('cálido');
      expect(getPisoTermicoInfo(500).slug).toBe('cálido');
    });

    it('rangos medios de cálido (800, 999)', () => {
      expect(getPisoTermicoInfo(800).slug).toBe('cálido');
      expect(getPisoTermicoInfo(999).slug).toBe('cálido');
    });

    it('rangos bajos de templado (1000, 1200, 1500)', () => {
      expect(getPisoTermicoInfo(1000).slug).toBe('templado');
      expect(getPisoTermicoInfo(1200).slug).toBe('templado');
      expect(getPisoTermicoInfo(1500).slug).toBe('templado');
    });

    it('rangos altos de templado (1800, 1999)', () => {
      expect(getPisoTermicoInfo(1800).slug).toBe('templado');
      expect(getPisoTermicoInfo(1999).slug).toBe('templado');
    });

    it('rangos bajos de frío (2000, 2200, 2500)', () => {
      expect(getPisoTermicoInfo(2000).slug).toBe('frío');
      expect(getPisoTermicoInfo(2200).slug).toBe('frío');
      expect(getPisoTermicoInfo(2500).slug).toBe('frío');
    });

    it('rangos altos de frío (2800, 2999)', () => {
      expect(getPisoTermicoInfo(2800).slug).toBe('frío');
      expect(getPisoTermicoInfo(2999).slug).toBe('frío');
    });

    it('rangos bajos de páramo (3000, 3200, 3400)', () => {
      expect(getPisoTermicoInfo(3000).slug).toBe('páramo');
      expect(getPisoTermicoInfo(3200).slug).toBe('páramo');
      expect(getPisoTermicoInfo(3400).slug).toBe('páramo');
    });

    it('rangos altos de páramo (3500, 3599)', () => {
      expect(getPisoTermicoInfo(3500).slug).toBe('páramo');
      expect(getPisoTermicoInfo(3599).slug).toBe('páramo');
    });

    it('rangos de glacial (3600, 4000, 5000)', () => {
      expect(getPisoTermicoInfo(3600).slug).toBe('glacial');
      expect(getPisoTermicoInfo(4000).slug).toBe('glacial');
      expect(getPisoTermicoInfo(5000).slug).toBe('glacial');
    });
  });

  describe('consistencia de cultivos', () => {
    it('cálido incluye cultivos tropicales', () => {
      const info = getPisoTermicoInfo(500);
      expect(info.cultivos).toContain('Plátano');
      expect(info.cultivos).toContain('Cacao');
      expect(info.cultivos).toContain('Yuca');
      expect(info.cultivos).toContain('Mango');
      expect(info.cultivos).toContain('Caña panelera');
      expect(info.cultivos).toContain('Cítricos');
      expect(info.cultivos.length).toBe(6);
    });

    it('templado incluye café y aguacate', () => {
      const info = getPisoTermicoInfo(1500);
      expect(info.cultivos).toContain('Café');
      expect(info.cultivos).toContain('Aguacate');
      expect(info.cultivos).toContain('Cítricos');
      expect(info.cultivos).toContain('Plátano');
      expect(info.cultivos).toContain('Caña panelera');
      expect(info.cultivos).toContain('Tomate de árbol');
      expect(info.cultivos.length).toBe(6);
    });

    it('frío incluye papa y hortalizas', () => {
      const info = getPisoTermicoInfo(2500);
      expect(info.cultivos).toContain('Papa');
      expect(info.cultivos).toContain('Arveja');
      expect(info.cultivos).toContain('Hortalizas');
      expect(info.cultivos).toContain('Maíz');
      expect(info.cultivos).toContain('Fresa');
      expect(info.cultivos).toContain('Mora');
      expect(info.cultivos).toContain('Curuba');
      expect(info.cultivos.length).toBe(7);
    });

    it('páramo incluye papa y especies de altura', () => {
      const info = getPisoTermicoInfo(3200);
      expect(info.cultivos).toContain('Papa');
      expect(info.cultivos).toContain('Cubios');
      expect(info.cultivos).toContain('Hibias');
      expect(info.cultivos).toContain('Frailejón (conservación)');
      expect(info.cultivos).toContain('Pastos nativos');
      expect(info.cultivos.length).toBe(5);
    });

    it('glacial enfatiza conservación', () => {
      const info = getPisoTermicoInfo(4000);
      expect(info.cultivos).toContain('Conservación de páramo');
      expect(info.cultivos).toContain('Pastos de alta montaña');
      expect(info.cultivos.length).toBe(2);
    });
  });
});
