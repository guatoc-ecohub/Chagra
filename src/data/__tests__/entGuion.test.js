/**
 * entGuion.test.js — integridad de la DATA del guion pedagógico del Ent.
 *
 * Lo que se valida aquí (data-driven, sin motor):
 *   1. Estructura: cada pieza tiene sus campos obligatorios.
 *   2. Invariante REFERENCIAL contra el catálogo v3.2 (la clave anti-cagada):
 *      cada especie_id existe, y los campos copiados (nombre_comun,
 *      nombre_cientifico, familia_botanica, thermal_zones) coinciden
 *      textualmente con la ficha original.
 *   3. Coherencia de tipos: tema es uno de los 4 válidos; thermal_zones son
 *      pisos válidos del catálogo.
 *   4. Cobertura: hay al menos 1 pieza por tema (las 4 categorías).
 *   5. Anti-voseo: nada de voseo argentino en copy pedagógico (es-CO).
 *   6. Anti-leak: sin nombres propios de stakeholders en ningún campo.
 *   7. Anti-violencia: las piezas de 'caza' proponen coexistencia
 *      (NO contenido cinegético ni violento).
 *   8. Congelamiento: ENT_GUION está congelado (inmutabilidad).
 *   9. Helpers: getPieza, getPiezasPorTema, getEspeciesReferenciadas,
 *      getTemasValidos.
 *
 * Tests alineados con los de src/data/__tests__/metalSlugCampoData.test.js
 * (mismo pilar anti-alucinación contra el catálogo).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  ENT_GUION,
  getPieza,
  getPiezasPorTema,
  getEspeciesReferenciadas,
  getTemasValidos,
} from '../entGuion';

// Cargamos el catálogo v3.2 una sola vez para validación referencial.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');
const CATALOG_PATH = path.join(
  REPO_ROOT,
  'catalog',
  'chagra-catalog-oss-subset-v3.2.json',
);
const CATALOG = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
const CATALOG_INDEX = new Map(CATALOG.species.map((s) => [s.id, s]));

const TEMAS_VALIDOS = ['botanica', 'clima', 'conservacion', 'caza'];
const PISOS_VALIDOS = ['paramo', 'frio', 'templado', 'calido'];
// Voseo argentino prohibido por regla del repo (es-CO tú/usted).
const VOSEO = /\b(usá|usás|tenés|querés|empezá|empezás|elegí|fijate|mirá|soltá|hacé|poné|dale|vos|acá|che)\b/i;
// Anti-leak: lista NEGRA de nombres propios de stakeholders (NO en código público).
const STAKEHOLDERS = /\b(diana|richi|toño|cepeda|minagricultura|miguel|guatoc)\b/i;

// ── ESTRUCTURA ───────────────────────────────────────────────────────

describe('ENT_GUION — shape y campos obligatorios', () => {
  it('cada pieza tiene id, tema, especie_id y textos no vacíos', () => {
    for (const p of ENT_GUION) {
      expect(typeof p.id).toBe('string');
      expect(p.id.length).toBeGreaterThan(0);
      expect(typeof p.tema).toBe('string');
      expect(TEMAS_VALIDOS).toContain(p.tema);
      expect(typeof p.especie_id).toBe('string');
      expect(p.especie_id.length).toBeGreaterThan(0);
      expect(typeof p.nombre_comun).toBe('string');
      expect(p.nombre_comun.length).toBeGreaterThan(0);
      expect(typeof p.nombre_cientifico).toBe('string');
      expect(p.nombre_cientifico.length).toBeGreaterThan(0);
      expect(typeof p.familia_botanica).toBe('string');
      expect(p.familia_botanica.length).toBeGreaterThan(0);
      expect(Array.isArray(p.thermal_zones)).toBe(true);
      expect(p.thermal_zones.length).toBeGreaterThan(0);
      expect(typeof p.snippet_pedagogico).toBe('string');
      expect(p.snippet_pedagogico.length).toBeGreaterThan(20);
      expect(typeof p.dato_conservacion).toBe('string');
      expect(p.dato_conservacion.length).toBeGreaterThan(20);
    }
  });

  it('todos los ids de pieza son únicos', () => {
    const ids = ENT_GUION.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('thermal_zones de cada pieza son válidos según el catálogo', () => {
    for (const p of ENT_GUION) {
      for (const z of p.thermal_zones) {
        expect(PISOS_VALIDOS, `zona térmica inválida "${z}" en "${p.id}"`).toContain(z);
      }
    }
  });
});

// ── INVARIANTE REFERENCIAL: cada pieza existe en el catálogo v3.2 ─────

describe('INVARIANTE: piezas ancladas al catálogo v3.2', () => {
  it('cada especie_id se resuelve en el catálogo', () => {
    for (const p of ENT_GUION) {
      expect(
        CATALOG_INDEX.has(p.especie_id),
        `pieza "${p.id}" referencia especie desconocida "${p.especie_id}"`,
      ).toBe(true);
    }
  });

  it('nombre_comun coincide textualmente con el catálogo', () => {
    for (const p of ENT_GUION) {
      const sp = CATALOG_INDEX.get(p.especie_id);
      expect(
        p.nombre_comun,
        `nombre_comun de "${p.id}" no calza con catálogo`,
      ).toBe(sp.nombre_comun);
    }
  });

  it('nombre_cientifico coincide textualmente con el catálogo', () => {
    for (const p of ENT_GUION) {
      const sp = CATALOG_INDEX.get(p.especie_id);
      expect(
        p.nombre_cientifico,
        `nombre_cientifico de "${p.id}" no calza con catálogo`,
      ).toBe(sp.nombre_cientifico);
    }
  });

  it('familia_botanica coincide textualmente con el catálogo', () => {
    for (const p of ENT_GUION) {
      const sp = CATALOG_INDEX.get(p.especie_id);
      expect(
        p.familia_botanica,
        `familia_botanica de "${p.id}" no calza con catálogo`,
      ).toBe(sp.familia_botanica);
    }
  });

  it('thermal_zones de la pieza es subconjunto del catálogo (coincidencia exacta)', () => {
    for (const p of ENT_GUION) {
      const sp = CATALOG_INDEX.get(p.especie_id);
      expect(
        p.thermal_zones,
        `thermal_zones de "${p.id}" no calza con catálogo`,
      ).toEqual(sp.thermal_zones);
    }
  });

  it('dato_conservacion menciona el conservation_status textual del catálogo', () => {
    // El dato_conservacion debe contener el conservation_status formateado
    // legiblemente (p. ej. 'en_peligro' → 'en_peligro' o 'Peligro').
    // Esto valida que no se inventan categorías IUCN ajenas al catálogo.
    for (const p of ENT_GUION) {
      const sp = CATALOG_INDEX.get(p.especie_id);
      const cs = sp.conservation_status;
      // El dato_conservacion debe contener el valor crudo del catálogo
      // (e.g. 'en_peligro', 'nativo_protegido', 'endemica_critica') o una
      // forma legible (e.g. 'en_peligro (EN)' o 'Nativo protegido').
      const csSnake = new RegExp(cs.replace(/_/g, '[_ ]'), 'i');
      expect(
        csSnake.test(p.dato_conservacion) ||
          p.dato_conservacion.toLowerCase().includes(cs),
        `pieza "${p.id}" no menciona conservation_status "${cs}"`,
      ).toBe(true);
    }
  });
});

// ── COBERTURA TEMÁTICA: al menos 1 pieza por tema ────────────────────

describe('cobertura: las 4 categorías temáticas presentes', () => {
  it('hay al menos 1 pieza por cada tema válido', () => {
    for (const t of TEMAS_VALIDOS) {
      const n = ENT_GUION.filter((p) => p.tema === t).length;
      expect(
        n,
        `tema "${t}" sin piezas (mínimo 1 requerido)`,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it('no hay piezas con tema desconocido', () => {
    for (const p of ENT_GUION) {
      expect(TEMAS_VALIDOS).toContain(p.tema);
    }
  });

  it('hay al menos 10 piezas en total (guion sustantivo)', () => {
    expect(ENT_GUION.length).toBeGreaterThanOrEqual(10);
  });
});

// ── PRIORIZACIÓN: amenazadas/vulnerables bien representadas ──────────

describe('priorización: especies con valor pedagógico y conservacionista', () => {
  const PRIORITARIAS = [
    'en_peligro',
    'endemica_critica',
    'endemica_colombia',
    'nativo_protegido',
  ];

  it('al menos 8 piezas anclan especies prioritarias (amenazadas/protegidas)', () => {
    const n = ENT_GUION.filter((p) => {
      const sp = CATALOG_INDEX.get(p.especie_id);
      return PRIORITARIAS.includes(sp.conservation_status);
    }).length;
    expect(n).toBeGreaterThanOrEqual(8);
  });

  it('al menos 1 pieza de clima ancla un frailejón o polylepis (páramo = agua)', () => {
    const ids = new Set(['espeletia_killipii', 'espeletia_grandiflora', 'espeletia_uribei', 'polylepis_quadrijuga', 'polylepis_sericea']);
    const n = ENT_GUION.filter(
      (p) => p.tema === 'clima' && ids.has(p.especie_id),
    ).length;
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

// ── CAZA: coexistencia, NO violencia ─────────────────────────────────

describe('caza: coexistencia, no violencia ni cacería gráfica', () => {
  const piezasCaza = ENT_GUION.filter((p) => p.tema === 'caza');

  it('hay al menos 4 piezas de caza (oso andino + borugo representados)', () => {
    expect(piezasCaza.length).toBeGreaterThanOrEqual(4);
  });

  it('las piezas de caza mencionan coexistencia o fauna, no violencia', () => {
    // El mensaje de cada pieza de caza debe INVITAR A CUIDAR (coexistencia),
    // no a cazar. Buscamos que el snippet hable del animal en clave
    // ecológica (dispersor, alimento, huella, hospedero) o pida no atacar.
    const PATRON_COEXISTENCIA = /(oso|borugo|danta|agutí|fauna|dispers|cuid|cohabite|no le dispare|siembre|no lo elimine|alimento|huella)/i;
    const PATRON_VIOLENCIA = /\b(mate|cace|dispare a|marre|flech|atropelle|veneno para el)\b/i;
    for (const p of piezasCaza) {
      expect(PATRON_COEXISTENCIA.test(p.snippet_pedagogico)).toBe(true);
      expect(PATRON_VIOLENCIA.test(p.snippet_pedagogico)).toBe(false);
    }
  });

  it('al menos 1 pieza de caza ancla el oso andino (Tremarctos)', () => {
    const n = piezasCaza.filter((p) => {
      const sp = CATALOG_INDEX.get(p.especie_id);
      return /oso de anteojos|Tremarctos|oso andino/i.test(sp.valor_pedagogico || '');
    }).length;
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

// ── ANTI-VOSEO Y ANTI-LEAK ───────────────────────────────────────────

describe('copy: anti-voseo (es-CO tú/usted) y anti-leak (sin personas)', () => {
  const todosLosTextos = ENT_GUION.map(
    (p) =>
      `${p.nombre_comun} ${p.snippet_pedagogico} ${p.dato_conservacion}`,
  );

  it('nada de voseo argentino en copy pedagógico', () => {
    for (const texto of todosLosTextos) {
      expect(texto).not.toMatch(VOSEO);
    }
  });

  it('ningún nombre propio de stakeholder aparece en la data', () => {
    for (const texto of todosLosTextos) {
      expect(texto.toLowerCase()).not.toMatch(STAKEHOLDERS);
    }
  });
});

// ── HELPERS ──────────────────────────────────────────────────────────

describe('helpers de lookup (data-driven, puros)', () => {
  it('getTemasValidos devuelve los 4 temas esperados', () => {
    const temas = getTemasValidos();
    expect(temas).toEqual(TEMAS_VALIDOS);
    // Es una copia: mutarla no afecta la fuente.
    temas.push('test');
    expect(getTemasValidos()).toEqual(TEMAS_VALIDOS);
  });

  it('getPieza devuelve la pieza y undefined para ids desconocidos', () => {
    const primera = ENT_GUION[0];
    expect(getPieza(primera.id)).toBe(primera);
    expect(getPieza('no_existe')).toBeUndefined();
  });

  it('getPiezasPorTema devuelve la lista correcta y una copia', () => {
    const botanica = getPiezasPorTema('botanica');
    expect(botanica.length).toBeGreaterThan(0);
    for (const p of botanica) {
      expect(p.tema).toBe('botanica');
    }
    // Tema desconocido: arreglo vacío.
    expect(getPiezasPorTema(/** @type {any} */ ('xxx'))).toEqual([]);
    // Es una copia: mutarla no afecta el origen.
    botanica.push(null);
    expect(getPiezasPorTema('botanica').length).not.toBe(botanica.length);
  });

  it('getEspeciesReferenciadas devuelve ids únicos y válidos', () => {
    const ids = getEspeciesReferenciadas();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) {
      expect(CATALOG_INDEX.has(id)).toBe(true);
    }
  });
});

// ── CONGELAMIENTO (inmutabilidad) ────────────────────────────────────

describe('inmutabilidad: ENT_GUION está congelada', () => {
  it('la lista está congelada (Object.freeze, como metalSlugCampoData)', () => {
    expect(Object.isFrozen(ENT_GUION)).toBe(true);
  });
});
