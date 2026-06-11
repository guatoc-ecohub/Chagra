/**
 * dataSchema.fuente.test.js — SCHEMA-CHECK MECÁNICO + ANTI-FABRICACIÓN.
 *
 * Política Chagra: "dato con fuente o no va". Una recomendación agronómica sin
 * procedencia es indistinguible de una alucinación; en boca de un campesino,
 * peligrosa. Este test recorre TODOS los `src/data/*.json` (+ el seed de
 * biopreparados) y afirma, de forma puramente mecánica (sin red, sin LLM):
 *
 *   (a) cada archivo es JSON VÁLIDO (atrapa un `""` de más, una coma colgante,
 *       un cierre roto que se haya colado en un merge);
 *   (b) los módulos de conocimiento curado declaran procedencia top-level;
 *   (c) ANTI-FABRICACIÓN: si un arreglo de objetos ya trae `fuente` por entrada
 *       (convención de lista citada), TODAS sus entradas deben traer `fuente`
 *       no vacía — así, una entrada sin fuente colada en una lista citada
 *       (el vector real de fabricación) enrojece el test;
 *   (d) las guardas de seguridad son strings NO vacíos (una guarda vacía = una
 *       guarda que se dispara pero no dice nada);
 *   (e) el seed de biopreparados: cada receta tiene procedencia (fuente o
 *       source_ids) y —la invariante clave anti-alucinación— si trae dosis,
 *       la dosis viene con `fuente` (la dosis sale del seed, NO la inventa el
 *       modelo). Las entradas-semilla sin dosis aún se permiten: en prod
 *       buildCuratedFactsContext simplemente no emite línea de dosis para ellas.
 *
 * Es un guard mecánico de la política: si alguien agrega un dato sin fuente,
 * este test lo bloquea en CI antes de que llegue al campesino.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..'); // src/data
const SEED_PATH = join(__dirname, '..', '..', '..', 'catalog', 'biopreparados-seed.json');

const DATA_FILES = readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

/**
 * Módulos de CONOCIMIENTO CURADO (DR-*): deben declarar procedencia top-level.
 * Los demás .json son geográficos/lingüísticos/crowdsourced (DANE, veredas,
 * regionalismos) con su propio modelo de procedencia y se validan solo por (a).
 */
const MODULE_KNOWLEDGE_FILES = [
  'animal-diagnostics.json',
  'water-diagnostics.json',
  'soil-diagnostics.json',
  'restauracion.json',
  'glosario.json',
];

const isNonEmptyStr = (v) => typeof v === 'string' && v.trim().length > 0;

function loadRaw(file) {
  return readFileSync(join(DATA_DIR, file), 'utf8');
}

describe('schema-check (a) — todos los src/data/*.json son JSON VÁLIDO', () => {
  it('encuentra archivos de datos', () => {
    expect(DATA_FILES.length).toBeGreaterThan(0);
  });

  it.each(DATA_FILES)('%s parsea sin error', (file) => {
    const raw = loadRaw(file);
    expect(() => JSON.parse(raw), `${file} NO es JSON válido`).not.toThrow();
  });
});

describe('schema-check (b) — módulos de conocimiento declaran fuente top-level', () => {
  it.each(MODULE_KNOWLEDGE_FILES)('%s tiene fuente no vacía', (file) => {
    expect(DATA_FILES, `${file} no existe en src/data/ (¿módulo sin mergear?)`).toContain(file);
    const d = JSON.parse(loadRaw(file));
    expect(isNonEmptyStr(d.fuente), `${file} sin campo "fuente" top-level`).toBe(true);
  });
});

describe('schema-check (c) — ANTI-FABRICACIÓN: ninguna entrada sin fuente en una lista citada', () => {
  /**
   * Recolecta violaciones: por cada array-de-objetos donde AL MENOS UNA entrada
   * trae `fuente` no vacía (convención de lista citada), reporta las entradas
   * que NO la traen. Esas son fabricación: dato sin procedencia en una lista que
   * sí la exige.
   */
  function collectViolations(obj, path, out) {
    if (Array.isArray(obj)) {
      const objs = obj.filter((x) => x && typeof x === 'object' && !Array.isArray(x));
      const anySourced = objs.some((x) => isNonEmptyStr(x.fuente));
      if (anySourced) {
        obj.forEach((x, i) => {
          if (x && typeof x === 'object' && !Array.isArray(x) && !isNonEmptyStr(x.fuente)) {
            out.push(`${path}[${i}] (id=${x.id ?? x.nombre ?? '?'}) sin fuente en lista citada`);
          }
        });
      }
      obj.forEach((x, i) => collectViolations(x, `${path}[${i}]`, out));
    } else if (obj && typeof obj === 'object') {
      for (const [k, v] of Object.entries(obj)) collectViolations(v, path ? `${path}.${k}` : k, out);
    }
    return out;
  }

  it.each(DATA_FILES)('%s — toda entrada de lista citada trae fuente', (file) => {
    const d = JSON.parse(loadRaw(file));
    const violations = collectViolations(d, '', []);
    expect(violations, `${file}: entradas sin fuente en listas citadas:\n${violations.join('\n')}`).toEqual([]);
  });
});

describe('schema-check (d) — guardas de seguridad son strings NO vacíos', () => {
  const filesWithGuardas = MODULE_KNOWLEDGE_FILES.filter((f) => {
    if (!DATA_FILES.includes(f)) return false;
    const d = JSON.parse(loadRaw(f));
    return d.guardas && typeof d.guardas === 'object';
  });

  it('al menos un módulo expone bloque de guardas', () => {
    expect(filesWithGuardas.length).toBeGreaterThan(0);
  });

  it.each(filesWithGuardas)('%s — cada guarda tiene texto no vacío', (file) => {
    const d = JSON.parse(loadRaw(file));
    const vacias = Object.entries(d.guardas)
      .filter(([, v]) => !isNonEmptyStr(v))
      .map(([k]) => k);
    expect(vacias, `${file}: guardas vacías (se disparan pero no dicen nada): ${vacias.join(', ')}`).toEqual([]);
  });
});

describe('anti-fabricación (e) — el seed de biopreparados: dosis sale del seed con fuente', () => {
  const hasProvenance = (b) =>
    isNonEmptyStr(b.fuente) || (Array.isArray(b.source_ids) && b.source_ids.length > 0);
  const hasDose = (b) => isNonEmptyStr(b.dosis_aplicacion) || isNonEmptyStr(b.dosis);

  it('el seed parsea y tiene biopreparados', () => {
    const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
    expect(Array.isArray(seed.biopreparados)).toBe(true);
    expect(seed.biopreparados.length).toBeGreaterThan(0);
  });

  it('cada biopreparado tiene procedencia (fuente o source_ids) — ninguno sin respaldo', () => {
    const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
    const huerfanos = seed.biopreparados.filter((b) => !hasProvenance(b)).map((b) => b.id ?? b.nombre ?? '?');
    expect(huerfanos, `biopreparados sin procedencia alguna: ${huerfanos.join(', ')}`).toEqual([]);
  });

  it('INVARIANTE clave: todo biopreparado CON dosis trae `fuente` (la dosis NO se inventa)', () => {
    const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
    // Si una entrada expone una dosis accionable, esa dosis DEBE venir con fuente
    // citable. Una dosis sin fuente es exactamente el vector de alucinación que
    // este test bloquea: el campesino la aplicaría como si fuera verificada.
    const dosisSinFuente = seed.biopreparados
      .filter((b) => hasDose(b) && !isNonEmptyStr(b.fuente))
      .map((b) => b.id ?? b.nombre ?? '?');
    expect(dosisSinFuente, `dosis sin fuente (se aplicaría como verificada sin serlo): ${dosisSinFuente.join(', ')}`).toEqual([]);
  });

  it('al menos un biopreparado expone dosis curada con fuente (el camino feliz existe)', () => {
    const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'));
    const conDosisYFuente = seed.biopreparados.filter((b) => hasDose(b) && isNonEmptyStr(b.fuente));
    expect(conDosisYFuente.length).toBeGreaterThan(0);
  });
});
