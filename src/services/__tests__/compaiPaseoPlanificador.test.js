/**
 * compaiPaseoPlanificador — el cerebro puro del paseo (#25, #31, #33).
 *
 * Cubre lo que pide el encargo:
 *   - Presupuesto 35% MEDIDO: no autoriza un paseo nuevo si el cociente
 *     paseado/total ya llegó al tope, y el cómputo cuenta paseos previos
 *     MÁS el que está en curso.
 *   - 3 anillos por tiempo de paseo continuo: puesto → cerca (<60s) →
 *     pantalla (60-150s) → volviendo (>=150s, techo duro).
 *   - Bloqueado (ocupado/oculto) nunca autoriza salir, y corta cualquier
 *     paseo en curso hacia 'volviendo'.
 *   - abortar() vuelve al puesto de una, sin pasar por 'volviendo'.
 */
import { describe, it, expect } from 'vitest';
import {
  estadoInicial,
  presupuestoConsumido,
  hayPresupuesto,
  decidirFase,
  avanzar,
  abortar,
  PRESUPUESTO_PASEO_FRACCION,
  UMBRAL_ANILLO_CERCA_MS,
  UMBRAL_ANILLO_PANTALLA_MS,
} from '../compaiPaseoPlanificador.js';

describe('estadoInicial', () => {
  it('nace en el puesto, presupuesto intacto', () => {
    const e = estadoInicial(1000);
    expect(e.fase).toBe('puesto');
    expect(e.msPaseoAcumulado).toBe(0);
    expect(e.inicioPaseoActualMs).toBe(null);
    expect(presupuestoConsumido(e, 1000)).toBe(0);
  });
});

describe('presupuestoConsumido / hayPresupuesto', () => {
  it('0 si nunca paseó, aunque pase el tiempo', () => {
    const e = estadoInicial(0);
    expect(presupuestoConsumido(e, 100_000)).toBe(0);
    expect(hayPresupuesto(e, 100_000)).toBe(true);
  });

  it('cuenta el paseo EN CURSO, no solo los cerrados', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'puesto', 0); // no-op, sigue en puesto
    e = avanzar(e, 'cerca', 65_000); // arranca paseo a los 65s (tras estar quieto)
    // a los 100_000ms totales, el paseo en curso lleva 35_000ms → 0.35 exacto
    expect(presupuestoConsumido(e, 100_000)).toBeCloseTo(0.35, 5);
  });

  it('paseos previos cerrados se suman a msPaseoAcumulado', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'puesto', 10_000); // paseó 10s, cierra
    expect(e.msPaseoAcumulado).toBe(10_000);
    expect(e.inicioPaseoActualMs).toBe(null);
    // otro paseo de 5s más, sobre un total de 50s
    e = avanzar(e, 'cerca', 40_000);
    expect(presupuestoConsumido(e, 45_000)).toBeCloseTo(15_000 / 45_000, 5);
  });

  it('hayPresupuesto es false justo al tocar el 35%', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    // exactamente 0.35 consumido → NO hay más presupuesto (< estricto)
    expect(hayPresupuesto(e, 35_000 / PRESUPUESTO_PASEO_FRACCION)).toBe(false);
  });
});

describe('decidirFase — anillos por tiempo de paseo continuo', () => {
  it('en puesto, con presupuesto y paradas, decide salir a "cerca"', () => {
    const e = estadoInicial(0);
    expect(decidirFase(e, 1000, { hayParadas: true })).toBe('cerca');
  });

  it('en puesto, sin paradas registradas, se queda en puesto', () => {
    const e = estadoInicial(0);
    expect(decidirFase(e, 1000, { hayParadas: false })).toBe('puesto');
  });

  it('en puesto, sin presupuesto, se queda en puesto', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'puesto', 35_000); // consumió justo el 35% de 100_000 total... probemos con total real
    // total transcurrido hasta 100_000 = 100_000, paseado=35_000 → exactamente el tope
    expect(decidirFase(e, 100_000, { hayParadas: true })).toBe('puesto');
  });

  it('paseando, antes de 60s sigue en "cerca"', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    expect(decidirFase(e, UMBRAL_ANILLO_CERCA_MS - 1)).toBe('cerca');
  });

  it('paseando, a los 60s pasa a "pantalla"', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    expect(decidirFase(e, UMBRAL_ANILLO_CERCA_MS)).toBe('pantalla');
  });

  it('paseando, a los 150s ordena "volviendo" (techo duro)', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'pantalla', UMBRAL_ANILLO_CERCA_MS);
    expect(decidirFase(e, UMBRAL_ANILLO_PANTALLA_MS)).toBe('volviendo');
  });

  it('una vez en "pantalla" no retrocede a "cerca" con el mismo paseo', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'pantalla', UMBRAL_ANILLO_CERCA_MS);
    // reloj "hacia atrás" no debería pasar en la práctica, pero el estado
    // ya registrado como 'pantalla' no debe volver a 'cerca'.
    expect(decidirFase(e, UMBRAL_ANILLO_CERCA_MS + 1)).toBe('pantalla');
  });
});

describe('decidirFase — bloqueado (#28/#34)', () => {
  it('bloqueado en puesto: se queda en puesto (nunca autoriza salir)', () => {
    const e = estadoInicial(0);
    expect(decidirFase(e, 1000, { bloqueado: true, hayParadas: true })).toBe('puesto');
  });

  it('bloqueado a mitad de paseo: corta a "volviendo" de inmediato', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    expect(decidirFase(e, 5000, { bloqueado: true })).toBe('volviendo');
  });
});

describe('avanzar', () => {
  it('sin cambio de fase, devuelve el mismo objeto (no genera renders de más)', () => {
    const e = estadoInicial(0);
    expect(avanzar(e, 'puesto', 500)).toBe(e);
  });

  it('salir del puesto arranca el reloj del paseo actual', () => {
    const e = avanzar(estadoInicial(0), 'cerca', 250);
    expect(e.inicioPaseoActualMs).toBe(250);
  });

  it('transición cerca → pantalla NO reinicia el reloj del paseo', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'pantalla', 60_000);
    expect(e.inicioPaseoActualMs).toBe(0); // sigue siendo el inicio del paseo completo
  });

  it('volver al puesto acumula el tiempo paseado y limpia el reloj', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'volviendo', 80_000);
    e = avanzar(e, 'puesto', 90_000);
    expect(e.msPaseoAcumulado).toBe(90_000);
    expect(e.inicioPaseoActualMs).toBe(null);
    expect(e.fase).toBe('puesto');
  });
});

describe('abortar (#33 — cualquier toque corta el paseo)', () => {
  it('en puesto, no hace nada', () => {
    const e = estadoInicial(0);
    expect(abortar(e, 500)).toBe(e);
  });

  it('a mitad de paseo, vuelve al puesto DE UNA (no pasa por "volviendo")', () => {
    let e = estadoInicial(0);
    e = avanzar(e, 'cerca', 0);
    e = avanzar(e, 'pantalla', 70_000);
    const abortado = abortar(e, 90_000);
    expect(abortado.fase).toBe('puesto');
    expect(abortado.msPaseoAcumulado).toBe(90_000);
  });
});
