import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Guarda estructural del léxico campesino offline (public/lexico-campesino.json).
// Datos REALES de los DR etnolingüísticos (DR-FANOUT, gemini grounded 2026-06-19):
// unidades de medida, calendario folk/lunar y prácticas/suelo/herramientas.
// Este asset alimenta el NLU/prompt del agente (issue #42). NO es grafo de plagas.

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEXICO_PATH = resolve(__dirname, '../../../public/lexico-campesino.json');

const CATEGORIAS_VALIDAS = new Set([
  'unidad_medida',
  'calendario',
  'practica',
  'suelo_tierra',
  'herramienta',
]);

// Términos campesinos colombianos canónicos que el agente DEBE poder resolver.
const TERMINOS_CLAVE = ['arroba', 'carga', 'fanegada', 'cabañuelas', 'mitaca', 'barbecho', 'aporque'];

function loadLexico() {
  return JSON.parse(readFileSync(LEXICO_PATH, 'utf8'));
}

describe('lexico-campesino.json — guarda estructural', () => {
  const lexico = loadLexico();

  it('es JSON válido con _meta y entries', () => {
    expect(lexico).toBeTypeOf('object');
    expect(lexico._meta).toBeTypeOf('object');
    expect(Array.isArray(lexico.entries)).toBe(true);
    expect(lexico.entries.length).toBeGreaterThan(0);
  });

  it('_meta.entries_count coincide con el número real de entradas', () => {
    expect(lexico.entries.length).toBe(lexico._meta.entries_count);
  });

  it('cada entrada tiene los campos requeridos y categoría válida', () => {
    for (const e of lexico.entries) {
      expect(e.termino, `termino faltante en ${JSON.stringify(e)}`).toBeTruthy();
      expect(e.categoria).toBeTruthy();
      expect(CATEGORIAS_VALIDAS.has(e.categoria), `categoría inválida: ${e.categoria}`).toBe(true);
      expect(e.significado).toBeTruthy();
      // region y fuente siempre presentes (region puede ser string)
      expect(e.region).toBeTruthy();
      expect(e.fuente).toBeTruthy();
      // equivalente_tecnico es opcional pero la clave debe existir (null permitido)
      expect(e).toHaveProperty('equivalente_tecnico');
    }
  });

  it('cubre las 5 categorías esperadas', () => {
    const cats = new Set(lexico.entries.map((e) => e.categoria));
    for (const c of CATEGORIAS_VALIDAS) {
      expect(cats.has(c), `falta la categoría ${c}`).toBe(true);
    }
  });

  it('incluye términos campesinos clave', () => {
    const terminos = new Set(lexico.entries.map((e) => e.termino));
    for (const t of TERMINOS_CLAVE) {
      expect(terminos.has(t), `falta el término clave ${t}`).toBe(true);
    }
  });

  it('no contiene voseo argentino (es-CO)', () => {
    const text = JSON.stringify(lexico);
    expect(text).not.toMatch(/\b(tenés|querés|elegí|llevás|sabés)\b/i);
  });

  it('no tiene términos duplicados', () => {
    const terminos = lexico.entries.map((e) => e.termino);
    const unicos = new Set(terminos);
    expect(unicos.size).toBe(terminos.length);
  });
});
