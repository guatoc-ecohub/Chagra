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
import { validateCultivos, buildFincaContext } from '../agentService.js';

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
