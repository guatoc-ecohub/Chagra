import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, '..', 'asociaciones-comparativa.json');
const CONFIANZAS_VALIDAS = new Set(['alta', 'media']);
const IDS_ESPERADOS = [
  'milpa-maiz-frijol-ahuyama',
  'cafe-sombrio-guamo',
  'maiz-leguminosa',
  'cacao-saf'
];

const isNumericValue = (value) =>
  value === null || (typeof value === 'number' && Number.isFinite(value));

const expectNumericLeaves = (value, path) => {
  if (value === null || typeof value === 'number') {
    expect(isNumericValue(value), `${path} debe ser numero finito o null`).toBe(true);
    return;
  }

  expect(typeof value, `${path} debe ser numero, null u objeto de cifras`).toBe('object');
  expect(Array.isArray(value), `${path} no debe ser arreglo`).toBe(false);

  for (const [key, child] of Object.entries(value)) {
    expectNumericLeaves(child, `${path}.${key}`);
  }
};

describe('asociaciones-comparativa.json', () => {
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));

  it('contiene las asociaciones clave del modulo monocultivo vs policultivo', () => {
    expect(data).toHaveLength(IDS_ESPERADOS.length);
    expect(data.map((item) => item.id).sort()).toEqual([...IDS_ESPERADOS].sort());
  });

  it('mantiene la estructura requerida por asociacion', () => {
    data.forEach((item) => {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          asociacion: expect.any(String),
          cultivos: expect.any(Array),
          monocultivo: expect.any(Object),
          policultivo: expect.any(Object),
          diferencia_resumen: expect.any(String),
          fuente: expect.any(String),
          confianza: expect.any(String)
        })
      );

      expect(item.cultivos.length).toBeGreaterThan(0);
      item.cultivos.forEach((cultivo) => expect(typeof cultivo).toBe('string'));
      expect(item.diferencia_resumen.trim().split(/[.!?]/).filter(Boolean)).toHaveLength(1);
      expect(item.fuente).toMatch(/DR-|DOI|CIPAV|Inga/);
    });
  });

  it('limita confianza al enum publico', () => {
    data.forEach((item) => {
      expect(CONFIANZAS_VALIDAS.has(item.confianza)).toBe(true);
    });
  });

  it('expone campos comparables y cifras numericas cuando existen', () => {
    data.forEach((item) => {
      expect(item.monocultivo).toHaveProperty('rendimiento_rel');
      expect(item.monocultivo).toHaveProperty('insumos');
      expect(typeof item.monocultivo.insumos).toBe('string');

      expect(item.policultivo).toHaveProperty('LER');
      expect(item.policultivo).toHaveProperty('N_fijado_kg_ha');
      expect(item.policultivo).toHaveProperty('ahorro_insumos');
      expect(item.policultivo).toHaveProperty('control_plaga_pct');

      expectNumericLeaves(item.monocultivo.rendimiento_rel, `${item.id}.monocultivo.rendimiento_rel`);
      expectNumericLeaves(item.policultivo.LER, `${item.id}.policultivo.LER`);
      expectNumericLeaves(item.policultivo.N_fijado_kg_ha, `${item.id}.policultivo.N_fijado_kg_ha`);
      expectNumericLeaves(item.policultivo.ahorro_insumos, `${item.id}.policultivo.ahorro_insumos`);
      expectNumericLeaves(item.policultivo.control_plaga_pct, `${item.id}.policultivo.control_plaga_pct`);

      if (item.policultivo.otros_indicadores) {
        expectNumericLeaves(item.policultivo.otros_indicadores, `${item.id}.policultivo.otros_indicadores`);
      }
      if (item.policultivo.N_fijado_pct) {
        expectNumericLeaves(item.policultivo.N_fijado_pct, `${item.id}.policultivo.N_fijado_pct`);
      }
    });
  });
});
