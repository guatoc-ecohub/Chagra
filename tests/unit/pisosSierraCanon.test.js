/**
 * Invariantes de PASO 1 (transición climática 2026-09-02) + UNIFICACIÓN DE
 * PALETA (mismo día, decisión del operador «unifica»): la tabla canónica
 * `PISOS_TERMICOS_SIERRA` es la ÚNICA fuente de las cuatro listas de pisos que
 * antes vivían hardcodeadas por vista:
 *   · `CLAVE_PISOS_SIERRA`  → VistaGlobalSierra (leyenda DOM)
 *   · `BANDAS_SIERRA`       → VistaGlobalSierra (banding por altitud)
 *   · `PISOS_TRANSICION_SIERRA` → TransicionSierraMundo (transecto)
 *   · `BOVEDA_PISOS_DEF`    → EscenaBoveda (la montaña 3D)
 * Estos tests garantizan: cotas sin huecos ni solapamientos, las cuatro listas
 * con 7 entradas, colores/nombres consistentes con la tabla, y que la
 * montaña de la bóveda conserva su cima (suma de alturas estable).
 *
 * Y, desde la unificación, dos invariantes más que antes no tenían dueño:
 *   · el COLOR de cada banda se DERIVA de `PISOS_TERMICOS` (no hay una segunda
 *     paleta), salvo dos excepciones de render declaradas en la tabla;
 *   · el ORDEN de `BANDAS_SIERRA` es MAR→CIMA con `Infinity` de último, que es
 *     el sentido en que los DOS algoritmos de ladera la recorren. Con la tabla
 *     en su orden nativo (cima→mar) el índice se queda en 0 y toda altitud sale
 *     crema nival — el macizo entero de un solo color, que fue el bug real en
 *     `dev`. `sierraRelieve.equivalencia.test.js` ya vigilaba eso para el
 *     DESCENSO; acá se cubre la VISTA GLOBAL, que era el hueco.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  PISOS_TERMICOS,
  PISOS_TERMICOS_SIERRA,
  CLAVE_PISOS_SIERRA,
  BANDAS_SIERRA,
  PISOS_TRANSICION_SIERRA,
  BOVEDA_PISOS_DEF,
  COLOR_BANDA_EXCEPCION,
  CUMBRE_SIERRA_M,
  ORDEN_BANDAS_SIERRA,
  ORDEN_PISOS_SIERRA,
  validarCotasPisosSierra,
  validarOrdenBandas,
  altitudFincaValida,
  bandaDeMsnm,
} from '../../src/visual/mundo3d/pisosTermicos.js';

const N = 7;
const leer = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('Tabla canónica PISOS_TERMICOS_SIERRA', () => {
  it('tiene 7 bandas (0 m del mar → CUMBRE_SIERRA_M)', () => {
    expect(PISOS_TERMICOS_SIERRA).toHaveLength(N);
    expect(validarCotasPisosSierra().ok).toBe(true);
  });

  it('las cotas msnm encadenan sin huecos ni solapamiento, de 0 a la cumbre', () => {
    const ordenados = [...PISOS_TERMICOS_SIERRA].sort((a, b) => a.minMsnm - b.minMsnm);
    let esperado = 0;
    for (const p of ordenados) {
      expect(p.minMsnm, `minMsnm de ${p.id}`).toBe(esperado);
      expect(p.maxMsnm, `maxMsnm de ${p.id}`).toBeGreaterThan(p.minMsnm);
      esperado = p.maxMsnm;
    }
    expect(esperado).toBe(CUMBRE_SIERRA_M);
  });

  it('cada piso referencia un id válido de PISOS_TERMICOS (calido se parte en dos bandas)', () => {
    const idsValidos = ['calido', 'templado', 'frio', 'paramo', 'superparamo', 'nival'];
    for (const p of PISOS_TERMICOS_SIERRA) {
      expect(idsValidos).toContain(p.piso);
    }
  });
});

describe('Las cuatro listas se derivan de la misma fuente (7 entradas, sin diffs)', () => {
  const porId = Object.fromEntries(PISOS_TERMICOS_SIERRA.map((p) => [p.id, p]));

  it('CLAVE_PISOS_SIERRA: 7 entradas, c/t consistentes con color/nombre', () => {
    expect(CLAVE_PISOS_SIERRA).toHaveLength(N);
    PISOS_TERMICOS_SIERRA.forEach((p, i) => {
      expect(CLAVE_PISOS_SIERRA[i]).toEqual({ c: p.color, t: p.nombre });
    });
  });

  it('BANDAS_SIERRA: 7 topes, colores consistentes, nieve perpetua a tope Infinity', () => {
    expect(BANDAS_SIERRA).toHaveLength(N);
    // Ya NO es index-aligned con la tabla: va al revés a propósito (ver el
    // bloque de ORDEN más abajo). Se casa por id, que es lo que no miente.
    for (const b of BANDAS_SIERRA) {
      expect(b.tope, `tope de ${b.id}`).toBe(porId[b.id].topeWorldY);
      expect(b.hexColor, `color de ${b.id}`).toBe(porId[b.id].color);
    }
    expect(BANDAS_SIERRA.find((b) => b.id === 'nival').tope).toBe(Infinity);
  });

  it('PISOS_TRANSICION_SIERRA: 7 entradas, claves/nombre/tintes desde la tabla', () => {
    expect(PISOS_TRANSICION_SIERRA).toHaveLength(N);
    PISOS_TERMICOS_SIERRA.forEach((p, i) => {
      expect(PISOS_TRANSICION_SIERRA[i].claves).toEqual(p.claves);
      expect(PISOS_TRANSICION_SIERRA[i].nombre).toBe(p.nombreTransicion);
      expect(PISOS_TRANSICION_SIERRA[i].a).toBe(p.tintA);
      expect(PISOS_TRANSICION_SIERRA[i].b).toBe(p.tintB);
    });
  });

  it('BOVEDA_PISOS_DEF: 7 entradas, es la tabla invertida bottom-up (playa→nival)', () => {
    expect(BOVEDA_PISOS_DEF).toHaveLength(N);
    // La bóveda apila de abajo (playa) hacia la cima (nival): orden inverso a la tabla.
    expect(BOVEDA_PISOS_DEF[0].nombre).toBe(porId.playa.nombre);
    expect(BOVEDA_PISOS_DEF[N - 1].nombre).toBe(porId.nival.nombre);
    // Mismos nombres y colores que la tabla (sin valores inventados).
    const nombresBoveda = BOVEDA_PISOS_DEF.map((p) => p.nombre);
    const nombresCanonicos = PISOS_TERMICOS_SIERRA.map((p) => p.nombre);
    expect([...nombresBoveda].sort()).toEqual([...nombresCanonicos].sort());
    PISOS_TERMICOS_SIERRA.forEach((p) => {
      const b = BOVEDA_PISOS_DEF.find((x) => x.nombre === p.nombre);
      expect(b.color, `color ${p.nombre}`).toBe(p.color);
      expect(b.h).toBe(p.boveda.h);
      expect(b.r1).toBe(p.boveda.r1);
    });
  });

  it('la cima de la bóveda (suma de alturas) se mantiene estable ≈ 3.5 world units', () => {
    const cima = BOVEDA_PISOS_DEF.reduce((acc, p) => acc + p.h, 0);
    expect(cima).toBeCloseTo(3.5, 5);
  });
});

/* ════════════════════════════════════════════════════════════════════════════
 * UNIFICACIÓN DE PALETA — una sola fuente de color, no dos juegos
 * ══════════════════════════════════════════════════════════════════════════ */
describe('🎨 el color de cada banda SALE de PISOS_TERMICOS, no de una segunda paleta', () => {
  it('cada banda usa el color de su piso ecológico, salvo excepción declarada', () => {
    for (const b of PISOS_TERMICOS_SIERRA) {
      if (COLOR_BANDA_EXCEPCION[b.id]) {
        expect(b.color, `excepción ${b.id}`).toBe(COLOR_BANDA_EXCEPCION[b.id]);
        continue;
      }
      const piso = PISOS_TERMICOS.find((p) => p.id === b.piso);
      expect(piso, `piso ${b.piso} de la banda ${b.id}`).toBeTruthy();
      expect(b.color, `color de ${b.id}`).toBe(piso.color);
    }
  });

  it('las excepciones son exactamente TRES, y las tres con razón escrita', () => {
    // playa: no es un piso térmico (es la mitad baja del cálido) → arena.
    // nival: override de render, la cima debe leer NIEVE bajo la hora dorada.
    // paramo: (2026-09-05) el `#9fb6bf` térmico distaba ΔE76 = 7,5 del superpáramo
    //         en la tabla misma — nacían indistinguibles; en la montaña el páramo
    //         se pinta de pajonal (paja y oliva), no de la escala térmica.
    expect(Object.keys(COLOR_BANDA_EXCEPCION).sort()).toEqual(['nival', 'paramo', 'playa']);
    expect(COLOR_BANDA_EXCEPCION.paramo).toBe('#a9ad74');
  });

  it('🔴 los ocres de la tabla vieja NO sobreviven en ninguna banda', () => {
    // Los seis colores que esta tabla traía escritos a mano antes de unificar.
    const OCRES = ['#f2ead6', '#a58f68', '#94975a', '#5c8a69', '#437233', '#b3a955'];
    const vivos = PISOS_TERMICOS_SIERRA.map((p) => p.color.toLowerCase());
    for (const ocre of OCRES) expect(vivos).not.toContain(ocre);
  });

  it('la tabla NO vuelve a escribir un color a mano (se derivan todos)', () => {
    // Un `color: '#...'` dentro de BANDAS_SIERRA_BASE es la regresión exacta.
    const src = leer('../../src/visual/mundo3d/pisosTermicos.js');
    const base = src.slice(src.indexOf('const BANDAS_SIERRA_BASE = ['),
                           src.indexOf('export const PISOS_TERMICOS_SIERRA ='));
    expect(base).not.toMatch(/^\s*color:/m);
  });
});

/* ════════════════════════════════════════════════════════════════════════════
 * 🔴 EL ORDEN — la trampa que ya mordió una vez
 *
 * `BANDAS_SIERRA` ordenada cima→mar (primer tope `Infinity`) + un algoritmo que
 * la recorre con `while (y > tope) i++` = índice clavado en 0 = CREMA NIVAL PARA
 * TODA ALTITUD. Pasó en `dev` y se descubrió por casualidad.
 * `sierraRelieve.equivalencia.test.js` lo vigila para el DESCENSO; acá para la
 * VISTA GLOBAL, que consume `BANDAS_SIERRA` directo desde la unificación.
 * ══════════════════════════════════════════════════════════════════════════ */
describe('🔴 ORDEN de las tablas: los dos sentidos, por escrito y fijados', () => {
  it('PISOS_TERMICOS_SIERRA va CIMA→MAR (índice 0 = la cumbre)', () => {
    expect(ORDEN_PISOS_SIERRA).toBe('cima→mar');
    expect(PISOS_TERMICOS_SIERRA[0].id).toBe('nival');
    expect(PISOS_TERMICOS_SIERRA[0].topeWorldY).toBe(Infinity);
    expect(PISOS_TERMICOS_SIERRA[N - 1].id).toBe('playa');
    // el descenso arranca el viaje en [0]: si esto se invierte, empieza en la playa
    for (let i = 1; i < N; i += 1) {
      expect(PISOS_TERMICOS_SIERRA[i].maxMsnm).toBeLessThan(PISOS_TERMICOS_SIERRA[i - 1].maxMsnm);
    }
  });

  it('BANDAS_SIERRA va MAR→CIMA, con `Infinity` de ÚLTIMO', () => {
    expect(ORDEN_BANDAS_SIERRA).toBe('mar→cima');
    expect(BANDAS_SIERRA[0].id).toBe('playa');
    expect(BANDAS_SIERRA[N - 1].id).toBe('nival');
    expect(BANDAS_SIERRA[N - 1].tope).toBe(Infinity);
    expect(validarOrdenBandas().ok).toBe(true);
    expect(validarOrdenBandas().fallas).toEqual([]);
  });

  it('`validarOrdenBandas` DETECTA la lista invertida (el control no es ciego)', () => {
    // Un control que nunca falla no es un control. Se le da el caso malo.
    const invertida = [...BANDAS_SIERRA].reverse();
    expect(validarOrdenBandas(invertida).ok).toBe(false);
    expect(validarOrdenBandas(invertida).fallas.length).toBeGreaterThan(0);
  });

  it('🔴 VISTA GLOBAL: recorrer BANDAS_SIERRA da SIETE colores, no uno', () => {
    // El MISMO `while` que corre `colorPorAltura` en VistaGlobalSierra.jsx.
    const bandaDe = (y) => {
      let i = 0;
      while (i < BANDAS_SIERRA.length - 1 && y > BANDAS_SIERRA[i].tope) i += 1;
      return BANDAS_SIERRA[i];
    };
    const COTAS = [0.1, 0.6, 1.3, 2.2, 3.0, 3.8, 4.9]; // una por piso
    const ids = COTAS.map((y) => bandaDe(y).id);
    expect(ids).toEqual(['playa', 'calido_seco', 'templado', 'frio', 'paramo', 'superparamo', 'nival']);
    expect(new Set(COTAS.map((y) => bandaDe(y).hexColor)).size).toBe(N);
  });

  it('🔴 con la tabla CRUDA (cima→mar) el mismo `while` colapsa a una banda', () => {
    // La demostración del bug: por qué BANDAS_SIERRA tiene que ir al revés.
    const crudas = PISOS_TERMICOS_SIERRA.map((p) => ({ id: p.id, tope: p.topeWorldY }));
    const bandaDe = (y) => {
      let i = 0;
      while (i < crudas.length - 1 && y > crudas[i].tope) i += 1;
      return crudas[i];
    };
    const ids = [0.1, 0.6, 1.3, 2.2, 3.0, 3.8, 4.9].map((y) => bandaDe(y).id);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe('nival'); // crema nival para toda altitud
  });
});

/* ════════════════════════════════════════════════════════════════════════════
 * LAS TRES SUPERFICIES leen la tabla, ya no la copian
 * ══════════════════════════════════════════════════════════════════════════ */
describe('🖼 bóveda, transecto y vista global consumen la MISMA tabla', () => {
  it('VistaGlobalSierra deriva sus BANDAS y su CLAVE_PISOS (no las escribe)', () => {
    const src = leer('../../src/visual/mundo3d/VistaGlobalSierra.jsx');
    expect(src).toMatch(/const BANDAS = BANDAS_SIERRA\.map\(/);
    expect(src).toMatch(/const CLAVE_PISOS = CLAVE_PISOS_SIERRA;/);
    // y ya no quedan literales de color de banda sueltos en la vista
    for (const hex of ['#ddc78d', '#f4f9ff', '#cba04a', '#6f9e4a', '#4f8f7d', '#9fb6bf', '#b9c6cc']) {
      expect(src.includes(`'${hex}'`), `literal ${hex} suelto en la vista`).toBe(false);
    }
  });

  it('el descenso deriva sus BANDAS_RGB (no copia valores del Paso 2)', () => {
    const src = leer('../../src/visual/mundo3d/sierra/sierraRelieve.js');
    expect(src).toMatch(/const BANDAS_RGB = BANDAS_SIERRA\.map\(/);
    expect(src).not.toMatch(/const LINEA_NIEVE = 4\.15;/); // la cota tampoco se duplica
  });

  it('el gemelo 2D ya no cae a una lista de CUATRO pisos inventados', () => {
    const src = leer('../../src/visual/mundo3d/laminas2d/LaminaMundo.jsx');
    expect(src).toMatch(/const pisos = params\?\.pisos \|\| BOVEDA_PISOS_DEF;/);
    // Los cuatro colores inventados solo pueden quedar como PROSA (el comentario
    // que cuenta qué se quitó), nunca como dato: cero `{ color: '#...' }`.
    for (const hex of ['#c7a24b', '#8fae55', '#6f9a72', '#9fb6bf']) {
      expect(src.includes(`{ color: '${hex}' }`), `banda inventada ${hex} viva en el gemelo 2D`).toBe(false);
    }
  });
});

describe('🖼 P1 — el marcador de la finca y su guard anti-fabricación', () => {
  it('`altitudFincaValida` devuelve null sin altitud confirmada (nunca un 0 inventado)', () => {
    expect(altitudFincaValida(null)).toBeNull();
    expect(altitudFincaValida(undefined)).toBeNull();
    expect(altitudFincaValida('')).toBeNull();
    expect(altitudFincaValida(0)).toBeNull();
    expect(altitudFincaValida(-5)).toBeNull();
    expect(altitudFincaValida('abc')).toBeNull();
    expect(altitudFincaValida(NaN)).toBeNull();
  });

  it('acepta una altitud positiva, también en string numérico', () => {
    expect(altitudFincaValida(2200)).toBe(2200);
    expect(altitudFincaValida('2200')).toBe(2200);
  });

  it('`bandaDeMsnm` ubica la cota en la banda correcta y la colorea con su piso', () => {
    const frio = bandaDeMsnm(2200);
    expect(frio.id).toBe('frio');
    expect(frio.color).toBe(PISOS_TERMICOS.find((p) => p.id === 'frio').color);
    expect(bandaDeMsnm(400).id).toBe('calido_seco');
    expect(bandaDeMsnm(0).id).toBe('playa');
    expect(bandaDeMsnm(5100).id).toBe('nival');
  });

  it('`bandaDeMsnm` devuelve null para altitudes no numéricas o negativas', () => {
    expect(bandaDeMsnm(-1)).toBeNull();
    expect(bandaDeMsnm(NaN)).toBeNull();
  });
});
