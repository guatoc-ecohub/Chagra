/**
 * Invariantes de `src/data/sierra-pisos-datos.json` y su selector.
 *
 * El archivo derivado se COMMITEA; estos tests garantizan que siga siendo la
 * proyección EXACTA de sus fuentes (`catalog/...-v3.2.json` para
 * `catalogo_total`, `public/grafo-relations.json` para lo curatorial): si el
 * catálogo o el grafo cambian sin regenerar, la fresca falla y hay que correr
 * `node scripts/build-sierra-pisos-datos.mjs`.
 *
 * Números verificables (los que se muestran en la Sierra, sin inventos):
 *   · calido      → 277 especies en el catálogo · 56 en rango · 18 representativos
 *   · templado    → 357 · 87 · 17
 *   · frio        → 297 · 80 · 39
 *   · paramo      → 62  · 28 · 6 (nativas: frailejón, paja, chilco, …)
 *   · superparamo → 0   · 0  · 0  → "sin datos para este piso" (con_dato: false)
 *   · nival       → 0   · 0  · 0  → "sin datos para este piso"
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deriveSierraPisosDatos, sanearTextoUI } from '../../scripts/build-sierra-pisos-datos.mjs';
import { datoPisoPorId, PISOS_SIERRA_SIN_DATO, TOTAL_ESPECIES_CATALOGO } from '../../src/services/sierraPisosDatos.js';
import { PISOS_TERMICOS } from '../../src/visual/mundo3d/pisosTermicos.js';

const leer = (rel) => JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));

const CATALOGO = leer('../../catalog/chagra-catalog-oss-subset-v3.2.json');
const GRAFO = leer('../../public/grafo-relations.json');
const COMMITEADO = leer('../../src/data/sierra-pisos-datos.json');

const ORDEN = ['calido', 'templado', 'frio', 'paramo', 'superparamo', 'nival'];
const CON_DATO = { calido: true, templado: true, frio: true, paramo: true, superparamo: false, nival: false };
const CATALOGO_POR_PISO = { calido: 277, templado: 357, frio: 297, paramo: 62, superparamo: 0, nival: 0 };
const RANGO_POR_PISO = { calido: 56, templado: 87, frio: 80, paramo: 28, superparamo: 0, nival: 0 };

describe('sierra-pisos-datos: fresca contra sus fuentes', () => {
  it('el JSON commiteado es la proyección exacta del catálogo + grafo actuales', () => {
    const derivado = deriveSierraPisosDatos(CATALOGO, GRAFO);
    const { _generado: _g, ...commiteadoSinFecha } = COMMITEADO;
    expect(commiteadoSinFecha).toEqual(derivado);
  });

  it('el total de especies del catálogo sigue siendo 581', () => {
    expect(COMMITEADO._total_catalogo).toBe(581);
    expect(TOTAL_ESPECIES_CATALOGO).toBe(581);
  });
});

describe('sierra-pisos-datos: invariantes de los 6 pisos', () => {
  it('6 pisos, en orden mar→cima, todos con ficha en PISOS_TERMICOS', () => {
    expect(COMMITEADO.pisos.map((p) => p.id)).toEqual(ORDEN);
    const canon = new Set(PISOS_TERMICOS.map((p) => p.id));
    for (const p of COMMITEADO.pisos) expect(canon.has(p.id), `piso ${p.id} sin contraparte en PISOS_TERMICOS`).toBe(true);
  });

  it('con_dato: 4 pisos con dato real (calido/templado/frio/paramo), 2 sin dato (superparamo/nival)', () => {
    for (const p of COMMITEADO.pisos) {
      expect(p.con_dato, `con_dato de ${p.id}`).toBe(CON_DATO[p.id]);
    }
    expect(PISOS_SIERRA_SIN_DATO).toEqual(['superparamo', 'nival']);
  });

  it('catalogo_total por piso: los números exactos contra el catálogo', () => {
    for (const p of COMMITEADO.pisos) {
      expect(p.catalogo_total, `catalogo_total de ${p.id}`).toBe(CATALOGO_POR_PISO[p.id]);
    }
  });

  it('grafo_rango por piso: los números exactos contra las altitudes del grafo', () => {
    for (const p of COMMITEADO.pisos) {
      expect(p.grafo_rango, `grafo_rango de ${p.id}`).toBe(RANGO_POR_PISO[p.id]);
    }
  });

  it('los representativos resuelven a un nombre legible y no se duplican', () => {
    for (const p of COMMITEADO.pisos) {
      const ids = new Set();
      for (const r of p.representativos) {
        expect(r.nombre, `representativo ${r.id} de ${p.id} sin nombre`).toBeTruthy();
        expect(ids.has(r.id), `representativo duplicado ${r.id} en ${p.id}`).toBe(false);
        ids.add(r.id);
      }
    }
  });

  it('el páramo trae sus 6 nativas representativas (frailejón incluido)', () => {
    const paramo = COMMITEADO.pisos.find((p) => p.id === 'paramo');
    expect(paramo.representativos).toHaveLength(6);
    const nombres = paramo.representativos.map((r) => r.nombre);
    expect(nombres).toContain('Frailejón');
    expect(paramo.cultivable).toBe(undefined);
  });
});

describe('selector sierraPisosDatos (anti-fabricación)', () => {
  it('devuelve la ficha real de un piso y null para ids inexistentes', () => {
    expect(datoPisoPorId('frio').catalogo_total).toBe(297);
    expect(datoPisoPorId('calido').con_dato).toBe(true);
    expect(datoPisoPorId('superparamo').con_dato).toBe(false);
    expect(datoPisoPorId('paramo').representativos.some((r) => r.id === 'espeletia_grandiflora')).toBe(true);
    expect(datoPisoPorId('costa')).toBeNull();
    expect(datoPisoPorId('')).toBeNull();
    expect(datoPisoPorId(null)).toBeNull();
    expect(datoPisoPorId(undefined)).toBeNull();
  });
});

describe('sanearTextoUI', () => {
  it('quita glifos ajenos al español (artefactos CJK colados en la fuente)', () => {
    expect(sanearTextoUI('Sin vegetación. Indicador肉眼 del cambio climático (retroceso glaciar).'))
      .toBe('Sin vegetación. Indicador del cambio climático (retroceso glaciar).');
    expect(sanearTextoUI('café «cuatro hermanos» — 12°C')).toBe('café «cuatro hermanos» — 12°C');
    expect(sanearTextoUI('  ')).toBe('');
  });
});