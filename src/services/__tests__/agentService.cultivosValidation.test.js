/**
 * agentService.cultivosValidation.test.js
 *
 * Bug prod (2026-05-31): el agente habló con seguridad de "tomate fresa
 * arandano" — un cultivo INEXISTENTE (alucinación canónica) — como si fuera un
 * cultivo registrado del usuario. Causa: buildFincaContext inyectaba TODO el
 * inventario de useAssetStore (groupedCultivos) como cultivos AUTORITATIVOS,
 * sin validar contra el catálogo/grounding. Un dato basura del asset store
 * (3 especies distintas mashed: tomate + fresa + arándano) entraba como verdad.
 *
 * Fix: validateCultivos parte el inventario en {verificados, sinVerificar}.
 * buildFincaContext inyecta los verificados como cultivos del usuario y NO
 * afirma autoridad sobre los sin verificar (los omite del bloque autoritativo
 * y deja una nota/log para que el operador limpie el dato).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateCultivos, buildFincaContext, groupAndLimitCultivos } from '../agentService.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('validateCultivos — separa cultivos reales de basura del asset store', () => {
  it('marca "tomate fresa arandano" como SIN verificar (3 especies distintas mashed)', () => {
    const grouped = [
      { name: 'tomate fresa arandano', count: 1 },
      { name: 'café', count: 3 },
    ];
    const { verificados, sinVerificar } = validateCultivos(grouped);
    expect(sinVerificar.map((c) => c.name)).toContain('tomate fresa arandano');
    expect(verificados.map((c) => c.name)).not.toContain('tomate fresa arandano');
    // El cultivo legítimo sí pasa.
    expect(verificados.map((c) => c.name)).toContain('café');
  });

  it('cultivos legítimos de 1-2 palabras pasan como verificados', () => {
    const grouped = [
      { name: 'maíz', count: 2 },
      { name: 'tomate cherry', count: 5 },
      { name: 'caléndula', count: 4 },
    ];
    const { verificados, sinVerificar } = validateCultivos(grouped);
    expect(sinVerificar).toHaveLength(0);
    expect(verificados.map((c) => c.name).sort()).toEqual(
      ['caléndula', 'maíz', 'tomate cherry'].sort(),
    );
  });

  it('si se pasa catalogNames, valida contra el catálogo (no-match → sin verificar)', () => {
    const grouped = [
      { name: 'plántula misteriosa', count: 1 },
      { name: 'lulo', count: 2 },
    ];
    const catalogNames = ['lulo', 'café', 'maíz', 'tomate'];
    const { verificados, sinVerificar } = validateCultivos(grouped, { catalogNames });
    expect(verificados.map((c) => c.name)).toEqual(['lulo']);
    expect(sinVerificar.map((c) => c.name)).toEqual(['plántula misteriosa']);
  });

  it('catalogNames hace match laxo por substring (tomate ↔ tomate cherry)', () => {
    const grouped = [{ name: 'tomate cherry', count: 1 }];
    const { verificados } = validateCultivos(grouped, { catalogNames: ['tomate'] });
    expect(verificados.map((c) => c.name)).toEqual(['tomate cherry']);
  });

  it('entradas vacías/no-array → {verificados:[], sinVerificar:[]}', () => {
    expect(validateCultivos(null)).toEqual({ verificados: [], sinVerificar: [] });
    expect(validateCultivos([])).toEqual({ verificados: [], sinVerificar: [] });
  });
});

describe('buildFincaContext — NO inyecta el cultivo fantasma como autoritativo', () => {
  it('omite "tomate fresa arandano" de la línea de cultivos registrados', () => {
    const ctx = buildFincaContext({
      groupedCultivos: [
        { name: 'tomate fresa arandano', count: 1 },
        { name: 'café', count: 2 },
      ],
      month: 4,
    });
    const linea = ctx.split('\n').find((l) => l.startsWith('Cultivos registrados'));
    expect(linea).toBeTruthy();
    expect(linea).toContain('café');
    expect(linea).not.toContain('tomate fresa arandano');
  });

  it('deja una nota/log para que el operador limpie el dato basura', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    buildFincaContext({
      groupedCultivos: [{ name: 'tomate fresa arandano', count: 1 }],
      month: 4,
    });
    const logged = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toMatch(/tomate fresa arandano/i);
  });

  it('si TODOS los cultivos son legítimos, no hay omisiones ni warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = buildFincaContext({
      groupedCultivos: [{ name: 'maíz', count: 2 }, { name: 'frijol', count: 1 }],
      month: 4,
    });
    const linea = ctx.split('\n').find((l) => l.startsWith('Cultivos registrados'));
    expect(linea).toContain('maíz');
    expect(linea).toContain('frijol');
    const logged = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).not.toMatch(/sin verificar|fantasma/i);
  });
});

describe('groupAndLimitCultivos — agrupa y limita a top-N especies para contexto LLM', () => {
  it('agrupa plantas por nombre quitando #XX', () => {
    const plants = [
      { id: '1', type: 'asset--plant', attributes: { name: 'Tomate #01' } },
      { id: '2', type: 'asset--plant', attributes: { name: 'Tomate #02' } },
      { id: '3', type: 'asset--plant', attributes: { name: 'Café' } },
    ];
    const result = groupAndLimitCultivos(plants);
    expect(result).toHaveLength(2);
    expect(result.find((c) => c.name === 'Tomate')?.count).toBe(2);
    expect(result.find((c) => c.name === 'Café')?.count).toBe(1);
  });

  it('ordena por frecuencia descendente (más frecuentes primero)', () => {
    const plants = [
      { id: '1', type: 'asset--plant', attributes: { name: 'Café' } },
      { id: '2', type: 'asset--plant', attributes: { name: 'Maíz' } },
      { id: '3', type: 'asset--plant', attributes: { name: 'Maíz' } },
      { id: '4', type: 'asset--plant', attributes: { name: 'Maíz' } },
      { id: '5', type: 'asset--plant', attributes: { name: 'Frijol' } },
    ];
    const result = groupAndLimitCultivos(plants);
    expect(result[0].name).toBe('Maíz');
    expect(result[0].count).toBe(3);
    // Café y Frijol ambos tienen count 1, orden entre ellos no está garantizado
    const namesWithCount1 = result.slice(1).filter((c) => c.count === 1).map((c) => c.name);
    expect(namesWithCount1).toContain('Café');
    expect(namesWithCount1).toContain('Frijol');
  });

  it('limita a maxSpecies (default 50) cuando hay más especies distintas', () => {
    // Crear 100 especies distintas, cada una con 1 planta
    const plants = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      type: 'asset--plant',
      attributes: { name: `Especie${i}` },
    }));
    const result = groupAndLimitCultivos(plants);
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result).toHaveLength(50);
  });

  it('respeta maxSpecies custom cuando se pasa', () => {
    const plants = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      type: 'asset--plant',
      attributes: { name: `Especie${i}` },
    }));
    const result = groupAndLimitCultivos(plants, 10);
    expect(result).toHaveLength(10);
  });

  it('mantiene top-N por frecuencia cuando especies > maxSpecies', () => {
    // 100 especies con frecuencias decrecientes
    const plants = [];
    for (let i = 0; i < 100; i++) {
      // Especie 0 tiene 100 plantas, especie 1 tiene 99, ..., especie 99 tiene 1
      for (let j = 0; j < 100 - i; j++) {
        plants.push({
          id: `${i}-${j}`,
          type: 'asset--plant',
          attributes: { name: `Especie${i}` },
        });
      }
    }
    const result = groupAndLimitCultivos(plants, 10);
    expect(result).toHaveLength(10);
    // Top 10 deben ser Especie0 (100), Especie1 (99), ..., Especie9 (91)
    expect(result[0].name).toBe('Especie0');
    expect(result[0].count).toBe(100);
    expect(result[9].name).toBe('Especie9');
    expect(result[9].count).toBe(91);
  });

  it('maneja array vacío correctamente', () => {
    expect(groupAndLimitCultivos([])).toEqual([]);
    expect(groupAndLimitCultivos(null)).toEqual([]);
    expect(groupAndLimitCultivos(undefined)).toEqual([]);
  });

  it('maneja plantas sin name attribute', () => {
    const plants = [
      { id: '1', type: 'asset--plant', attributes: { name: 'Café' } },
      { id: '2', type: 'asset--plant', attributes: {} },
      { id: '3', type: 'asset--plant' },
    ];
    const result = groupAndLimitCultivos(plants);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Café');
  });

  it('cuando count igual, mantiene orden estable (no se garantiza entre especies con misma frecuencia)', () => {
    // Species con misma frecuencia: orden entre ellas no está garantizado
    const plants = [
      { id: '1', type: 'asset--plant', attributes: { name: 'A' } },
      { id: '2', type: 'asset--plant', attributes: { name: 'B' } },
      { id: '3', type: 'asset--plant', attributes: { name: 'C' } },
    ];
    const result = groupAndLimitCultivos(plants);
    expect(result).toHaveLength(3);
    // Todos tienen count 1
    expect(result.every((c) => c.count === 1)).toBe(true);
  });
});
