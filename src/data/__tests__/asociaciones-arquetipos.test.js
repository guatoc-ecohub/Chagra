import { describe, expect, it } from 'vitest';
import arquetipos from '../asociaciones-arquetipos.json';
import comparativas from '../asociaciones-comparativa.json';

const RELACIONES_VALIDAS = new Set(['ASOCIA_CON', 'COMPATIBLE_WITH', 'ANTAGONIST_OF']);

describe('asociaciones-arquetipos.json', () => {
  it('expone cultivos, acciones y relaciones agronomicas validas', () => {
    arquetipos.forEach((item) => {
      expect(item.id).toEqual(expect.any(String));
      expect(item.nombre).toEqual(expect.any(String));
      expect(item.accion).toEqual(expect.any(String));
      expect(item.cultivos.length).toBeGreaterThan(1);
      expect(item.relaciones.length).toBeGreaterThan(0);

      const cultivos = new Set(item.cultivos.map((cultivo) => cultivo.id));
      item.relaciones.forEach((rel) => {
        expect(RELACIONES_VALIDAS.has(rel.tipo)).toBe(true);
        expect(cultivos.has(rel.origen)).toBe(true);
        expect(cultivos.has(rel.destino)).toBe(true);
        expect(rel.razon).toEqual(expect.any(String));
      });
      item.antagonistas.forEach((ant) => {
        expect(ant.tipo).toBe('ANTAGONIST_OF');
        expect(cultivos.has(ant.cultivo)).toBe(true);
        expect(ant.razon).toMatch(/catálogo/i);
      });
    });
  });

  it('referencia comparativas existentes cuando promete cifras', () => {
    const idsComparativa = new Set(comparativas.map((item) => item.id));
    arquetipos
      .filter((item) => item.comparativa_id)
      .forEach((item) => {
        expect(idsComparativa.has(item.comparativa_id)).toBe(true);
      });
  });
});
