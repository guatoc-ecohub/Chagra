/**
 * Invariantes de PASO 1 (transición climática 2026-09-02): la tabla canónica
 * `PISOS_TERMICOS_SIERRA` es la ÚNICA fuente de las cuatro listas de pisos que
 * antes vivían hardcodeadas por vista:
 *   · `CLAVE_PISOS_SIERRA`  → VistaGlobalSierra (leyenda DOM)
 *   · `BANDAS_SIERRA`       → VistaGlobalSierra (banding por altitud)
 *   · `PISOS_TRANSICION_SIERRA` → TransicionSierraMundo (transecto)
 *   · `BOVEDA_PISOS_DEF`    → EscenaBoveda (la montaña 3D)
 * Estos tests garantizan: cotas sin huecos ni solapamientos, las cuatro listas
 * con 7 entradas, colores/nombres consistentes con la tabla, y que la
 * montaña de la bóveda conserva su cima (suma de alturas estable).
 */

import { describe, it, expect } from 'vitest';
import {
  PISOS_TERMICOS_SIERRA,
  CLAVE_PISOS_SIERRA,
  BANDAS_SIERRA,
  PISOS_TRANSICION_SIERRA,
  BOVEDA_PISOS_DEF,
  CUMBRE_SIERRA_M,
  validarCotasPisosSierra,
} from '../../src/visual/mundo3d/pisosTermicos.js';

const N = 7;

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
    PISOS_TERMICOS_SIERRA.forEach((p, i) => {
      expect(BANDAS_SIERRA[i].tope).toBe(p.topeWorldY);
      expect(BANDAS_SIERRA[i].hexColor).toBe(p.color);
    });
    const nival = porId.nival;
    const topeNival = BANDAS_SIERRA.find((b) => b.hexColor === nival.color);
    expect(topeNival.tope).toBe(Infinity);
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
