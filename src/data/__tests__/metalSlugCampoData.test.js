/**
 * metalSlugCampoData.test.js — integridad de la DATA del Metal Slug del campo.
 *
 * Lo que se valida aquí (data-driven, sin motor):
 *   1. Estructura: cada ENEMIGO/ARMA/REHEN/JEFE/NIVEL tiene sus campos.
 *   2. Invariantes REFERENCIALES (la clave anti-cagada):
 *      - Todo enemigo declara al menos 1 controlador y todos existen en ARMAS.
 *      - Todo arma controla plagas reales (id presente en ENEMIGOS).
 *      - Todo NIVEL.enemigos existe en ENEMIGOS, su REHEN existe, su JEFE existe.
 *   3. Coherencia de tipos (tipo de arma es uno de los 4 válidos).
 *   4. Biogeografía: piso_termico válido, niveles en orden 1..N.
 *   5. Anti-voseo: nada de voseo argentino en copy pedagógico (es-CO tú/usted).
 *   6. Anti-leak: sin nombres propios de personas en ningún campo.
 *   7. Referencia inversa: cada arma se lista como controlador de sus plagas y
 *      viceversa (simetría doble — consistencia).
 *   8. Helpers: getArma/getEnemigo/getRehen/getJefe/getNivel/armaControlaEnemigo.
 *
 * Tests alineados con los de src/components/juego/__tests__/defensoresFincaData
 * .test.js y doomFinca.test.js (mismo pilar de control biológico real).
 */
import { describe, it, expect } from 'vitest';
import {
  ARMAS,
  ENEMIGOS,
  REHENES,
  JEFES,
  NIVELES,
  getArma,
  getEnemigo,
  getRehen,
  getJefe,
  getNivel,
  armaControlaEnemigo,
} from '../metalSlugCampoData';

const TIPOS_VALIDOS = ['depredador', 'parasitoide', 'microbiano', 'botanico'];
const TEMAS_VALIDOS = ['sequia', 'deforestacion', 'agroquimico'];
const PISOS_VALIDOS = ['paramo', 'frio', 'templado', 'calido'];
const FUENTES_VALIDAS = ['grafo', 'cenicafe', 'ica-ciat', 'ecologia', 'biopreparado'];
// Voseo argentino prohibido por regla del repo (es-CO tú/usted).
const VOSEO = /\b(usá|usás|tenés|querés|empezá|empezás|elegí|fijate|mirá|soltá|hacé|poné|dale|vos|acá|che)\b/i;
// Anti-leak: lista NEGRA de nombres propios de stakeholders (NO en código público).
const STAKEHOLDERS = /\b(diana|richi|toño|cepeda|minagricultura|miguel|guatoc)\b/i;

// ── ARMAS ────────────────────────────────────────────────────────────

describe('ARMAS — shape y tipo biológico', () => {
  it('cada arma tiene id, nombre, tipo válido y como_actua', () => {
    for (const a of ARMAS) {
      expect(typeof a.id).toBe('string');
      expect(a.id.length).toBeGreaterThan(0);
      expect(typeof a.nombre).toBe('string');
      expect(a.nombre.length).toBeGreaterThan(0);
      expect(TIPOS_VALIDOS).toContain(a.tipo);
      expect(typeof a.como_actua).toBe('string');
      // El "cómo" es una frase explicativa, no una etiqueta suelta.
      expect(a.como_actua.length).toBeGreaterThan(20);
    }
  });

  it('cada arma declara plagas_que_controla no vacío', () => {
    for (const a of ARMAS) {
      expect(Array.isArray(a.plagas_que_controla)).toBe(true);
      expect(a.plagas_que_controla.length).toBeGreaterThan(0);
    }
  });

  it('todos los ids de arma son únicos', () => {
    const ids = ARMAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada marca una fuente honesta del controlador', () => {
    for (const a of ARMAS) {
      expect(FUENTES_VALIDAS).toContain(a.fuente);
    }
  });

  it('hay al menos un arma de cada tipo (las 4 categorías)', () => {
    const tipos = new Set(ARMAS.map((a) => a.tipo));
    for (const t of TIPOS_VALIDOS) {
      expect(tipos.has(/** @type {any} */ (t))).toBe(true);
    }
  });
});

// ── ENEMIGOS ────────────────────────────────────────────────────────

describe('ENEMIGOS — plaga real con controladores reales', () => {
  it('cada enemigo tiene id, nombre_comun, nombre_cientifico, cultivo, daño y ficha', () => {
    for (const e of ENEMIGOS) {
      expect(typeof e.id).toBe('string');
      expect(e.id.length).toBeGreaterThan(0);
      expect(typeof e.nombre_comun).toBe('string');
      expect(e.nombre_comun.length).toBeGreaterThan(0);
      expect(typeof e.nombre_cientifico).toBe('string');
      expect(e.nombre_cientifico.length).toBeGreaterThan(0);
      expect(typeof e.cultivo_objetivo).toBe('string');
      expect(e.cultivo_objetivo.length).toBeGreaterThan(0);
      expect(typeof e.dano).toBe('string');
      expect(e.dano.length).toBeGreaterThan(15);
      expect(typeof e.ficha).toBe('string');
      expect(e.ficha.length).toBeGreaterThan(15);
    }
  });

  it('todos los ids de enemigo son únicos', () => {
    const ids = ENEMIGOS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada enemigo tiene al menos 1 controlador', () => {
    for (const e of ENEMIGOS) {
      expect(Array.isArray(e.controladores)).toBe(true);
      expect(e.controladores.length).toBeGreaterThan(0);
    }
  });

  it('cada enemigo marca una fuente honesta del par plaga↔cura', () => {
    for (const e of ENEMIGOS) {
      expect(FUENTES_VALIDAS).toContain(e.fuente);
    }
  });

  it('nivel_sugerido está entre 1 y 4', () => {
    for (const e of ENEMIGOS) {
      expect(e.nivel_sugerido).toBeGreaterThanOrEqual(1);
      expect(e.nivel_sugerido).toBeLessThanOrEqual(4);
    }
  });
});

// ── INVARIANTE REFERENCIAL: cada controlador de enemigo EXISTE en ARMAS ──

describe('INVARIANTE: enemigos→ARMAS (referencial)', () => {
  const armasIds = new Set(ARMAS.map((a) => a.id));

  it('todo controlador declarado por un enemigo existe en ARMAS', () => {
    for (const e of ENEMIGOS) {
      for (const cId of e.controladores) {
        expect(
          armasIds.has(cId),
          `enemigo "${e.id}" declara controlador desconocido "${cId}"`,
        ).toBe(true);
      }
    }
  });

  it('cada enemigo tiene al menos un controlador que SÍ lo lista en plagas_que_controla', () => {
    // Simetría doble: el arma controla al enemigo Y el enemigo lista esa arma.
    for (const e of ENEMIGOS) {
      const cubierto = e.controladores.some((cId) => {
        const arma = ARMAS.find((a) => a.id === cId);
        return arma && arma.plagas_que_controla.includes(e.id);
      });
      expect(
        cubierto,
        `enemigo "${e.id}" no tiene controladores que lo confirmen desde ARMAS`,
      ).toBe(true);
    }
  });
});

// ── INVARIANTE REFERENCIAL: cada plaga de arma EXISTE en ENEMIGOS ────

describe('INVARIANTE: ARMAS→enemigos (referencial inversa)', () => {
  const enemigosIds = new Set(ENEMIGOS.map((e) => e.id));

  it('toda plaga listada por un arma existe en ENEMIGOS', () => {
    for (const a of ARMAS) {
      for (const pId of a.plagas_que_controla) {
        expect(
          enemigosIds.has(pId),
          `arma "${a.id}" controla plaga desconocida "${pId}"`,
        ).toBe(true);
      }
    }
  });

  it('simetría: si arma A controla plaga P, entonces P lista a A en sus controladores', () => {
    for (const a of ARMAS) {
      for (const pId of a.plagas_que_controla) {
        const enemigo = ENEMIGOS.find((e) => e.id === pId);
        expect(
          enemigo.controladores.includes(a.id),
          `arma "${a.id}" controla a "${pId}" pero el enemigo no la lista`,
        ).toBe(true);
      }
    }
  });
});

// ── REHENES ─────────────────────────────────────────────────────────

describe('REHENES — fauna real con causa y lección', () => {
  it('cada rehén tiene id, nombre, cientifico, por qué y mensaje', () => {
    for (const r of REHENES) {
      expect(typeof r.id).toBe('string');
      expect(r.id.length).toBeGreaterThan(0);
      expect(typeof r.nombre).toBe('string');
      expect(r.nombre.length).toBeGreaterThan(0);
      expect(typeof r.cientifico).toBe('string');
      expect(r.cientifico.length).toBeGreaterThan(0);
      expect(typeof r.por_que_lo_cazan).toBe('string');
      expect(r.por_que_lo_cazan.length).toBeGreaterThan(20);
      expect(typeof r.mensaje_educativo).toBe('string');
      expect(r.mensaje_educativo.length).toBeGreaterThan(20);
      expect(typeof r.amenaza).toBe('string');
      expect(r.amenaza.length).toBeGreaterThan(5);
    }
  });

  it('todos los ids de rehén son únicos', () => {
    const ids = REHENES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('al menos 2 rehenes (mínimo: jaguar y morrocoy)', () => {
    const ids = REHENES.map((r) => r.id);
    expect(REHENES.length).toBeGreaterThanOrEqual(2);
    expect(ids).toContain('jaguar');
    expect(ids).toContain('morrocoy');
  });
});

// ── JEFES ───────────────────────────────────────────────────────────

describe('JEFES — 3 amenazas estructurales', () => {
  it('hay exactamente 3 jefes (uno por tema)', () => {
    expect(JEFES.length).toBe(3);
    const temas = new Set(JEFES.map((j) => j.tema));
    expect(temas.size).toBe(3);
    for (const t of TEMAS_VALIDOS) {
      expect(temas.has(/** @type {any} */ (t))).toBe(true);
    }
  });

  it('cada jefe tiene id, nombre, tema válido, mecánica y enseñanza', () => {
    for (const j of JEFES) {
      expect(typeof j.id).toBe('string');
      expect(j.id.length).toBeGreaterThan(0);
      expect(typeof j.nombre).toBe('string');
      expect(j.nombre.length).toBeGreaterThan(0);
      expect(TEMAS_VALIDOS).toContain(j.tema);
      expect(typeof j.mecanica_sugerida).toBe('string');
      expect(j.mecanica_sugerida.length).toBeGreaterThan(20);
      expect(typeof j.ensenanza).toBe('string');
      expect(j.ensenanza.length).toBeGreaterThan(20);
      expect(typeof j.fuente).toBe('string');
      expect(j.fuente.length).toBeGreaterThan(5);
    }
  });

  it('todos los ids de jefe son únicos', () => {
    const ids = JEFES.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── NIVELES ─────────────────────────────────────────────────────────

describe('NIVELES — biogeografía coherente', () => {
  const enemigosIds = new Set(ENEMIGOS.map((e) => e.id));
  const rehenesIds = new Set(REHENES.map((r) => r.id));
  const jefesIds = new Set(JEFES.map((j) => j.id));

  it('hay entre 3 y 4 niveles', () => {
    expect(NIVELES.length).toBeGreaterThanOrEqual(3);
    expect(NIVELES.length).toBeLessThanOrEqual(4);
  });

  it('cada nivel tiene id, numero, nombre, piso térmico válido, intro y listas', () => {
    for (const n of NIVELES) {
      expect(typeof n.id).toBe('string');
      expect(n.id.length).toBeGreaterThan(0);
      expect(typeof n.numero).toBe('number');
      expect(n.numero).toBeGreaterThan(0);
      expect(typeof n.nombre).toBe('string');
      expect(n.nombre.length).toBeGreaterThan(0);
      expect(PISOS_VALIDOS).toContain(n.piso_termico);
      expect(typeof n.intro).toBe('string');
      expect(n.intro.length).toBeGreaterThan(15);
      expect(Array.isArray(n.enemigos)).toBe(true);
      expect(n.enemigos.length).toBeGreaterThan(0);
      expect(typeof n.rehen).toBe('string');
      expect(typeof n.jefe).toBe('string');
    }
  });

  it('los ids de nivel son únicos y los números son secuenciales 1..N', () => {
    const ids = NIVELES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    const nums = NIVELES.map((n) => n.numero).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: NIVELES.length }, (_, i) => i + 1));
  });

  it('cada enemigo de cada nivel existe en ENEMIGOS', () => {
    for (const n of NIVELES) {
      for (const eId of n.enemigos) {
        expect(
          enemigosIds.has(eId),
          `nivel "${n.id}" referencia enemigo desconocido "${eId}"`,
        ).toBe(true);
      }
    }
  });

  it('cada nivel referencia un rehén y un jefe que existen', () => {
    for (const n of NIVELES) {
      expect(
        rehenesIds.has(n.rehen),
        `nivel "${n.id}" referencia rehén desconocido "${n.rehen}"`,
      ).toBe(true);
      expect(
        jefesIds.has(n.jefe),
        `nivel "${n.id}" referencia jefe desconocido "${n.jefe}"`,
      ).toBe(true);
    }
  });

  it('cada nivel tiene piso térmico distinto (biogeografía variada)', () => {
    const pisos = NIVELES.map((n) => n.piso_termico);
    expect(new Set(pisos).size).toBe(NIVELES.length);
  });
});

// ── HELPERS ─────────────────────────────────────────────────────────

describe('helpers de lookup (data-driven, puros)', () => {
  it('getArma devuelve el arma y undefined para ids desconocidos', () => {
    expect(getArma('bt')).toBeDefined();
    expect(getArma('bt').tipo).toBe('microbiano');
    expect(getArma('no_existe')).toBeUndefined();
  });

  it('getEnemigo devuelve el enemigo y undefined para ids desconocidos', () => {
    expect(getEnemigo('cogollero')).toBeDefined();
    expect(getEnemigo('cogollero').cultivo_objetivo).toBe('Maíz');
    expect(getEnemigo('no_existe')).toBeUndefined();
  });

  it('getRehen devuelve el rehén y undefined para ids desconocidos', () => {
    expect(getRehen('jaguar')).toBeDefined();
    expect(getRehen('jaguar').cientifico).toBe('Panthera onca');
    expect(getRehen('no_existe')).toBeUndefined();
  });

  it('getJefe devuelve el jefe y undefined para ids desconocidos', () => {
    expect(getJefe('jefe_sequia')).toBeDefined();
    expect(getJefe('jefe_sequia').tema).toBe('sequia');
    expect(getJefe('no_existe')).toBeUndefined();
  });

  it('getNivel devuelve el nivel por número y undefined para inexistentes', () => {
    expect(getNivel(1)).toBeDefined();
    expect(getNivel(1).piso_termico).toBe('templado');
    expect(getNivel(99)).toBeUndefined();
  });

  it('armaControlaEnemigo refleja la relación del arma (consistencia)', () => {
    expect(armaControlaEnemigo('bt', 'cogollero')).toBe(true);
    expect(armaControlaEnemigo('beauveria', 'broca')).toBe(true);
    expect(armaControlaEnemigo('catarina', 'pulgon')).toBe(true);
    // Negativos: armas que NO controlan esa plaga.
    expect(armaControlaEnemigo('bt', 'broca')).toBe(false);
    expect(armaControlaEnemigo('beauveria', 'cogollero')).toBe(false);
    // Ids desconocidos: false (no throw).
    expect(armaControlaEnemigo('no_existe', 'cogollero')).toBe(false);
    expect(armaControlaEnemigo('bt', 'no_existe')).toBe(false);
  });
});

// ── ANTI-VOSEO Y ANTI-LEAK ──────────────────────────────────────────

describe('copy: anti-voseo (es-CO tú/usted) y anti-leak (sin personas)', () => {
  const todosLosTextos = [
    ...ARMAS.map((a) => `${a.nombre} ${a.como_actua}`),
    ...ENEMIGOS.map((e) => `${e.nombre_comun} ${e.dano} ${e.ficha}`),
    ...REHENES.map((r) => `${r.nombre} ${r.por_que_lo_cazan} ${r.mensaje_educativo}`),
    ...JEFES.map((j) => `${j.nombre} ${j.mecanica_sugerida} ${j.ensenanza}`),
    ...NIVELES.map((n) => `${n.nombre} ${n.intro}`),
  ];

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

// ── CONGELAMIENTO (inmutabilidad) ───────────────────────────────────

describe('inmutabilidad: las constantes están congeladas', () => {
  it('ARMAS, ENEMIGOS, REHENES, JEFES, NIVELES están congeladas', () => {
    expect(Object.isFrozen(ARMAS)).toBe(true);
    expect(Object.isFrozen(ENEMIGOS)).toBe(true);
    expect(Object.isFrozen(REHENES)).toBe(true);
    expect(Object.isFrozen(JEFES)).toBe(true);
    expect(Object.isFrozen(NIVELES)).toBe(true);
  });
});
