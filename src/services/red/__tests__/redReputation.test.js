/**
 * redReputation.test.js — "mercado → grafo + reputación". Verifica la math
 * honesta (suavizado bayesiano, confianza por volumen, recencia) y que el grafo
 * social se derive solo de los tratos compartibles.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeTerm,
  computeReputacion,
  groupTratos,
  computeAllReputaciones,
  buildSocialGraph,
  __MODEL__,
} from '../redReputation.js';
import { NIVEL_REPUTACION, ENTREGA } from '../types.js';

let seq = 0;
const trato = (o = {}) => ({
  id: `t${seq += 1}`,
  productorHash: 'p1',
  compradorHash: null,
  producto: 'Tomate',
  cultivoId: null,
  categoria: 'hortaliza',
  vereda: 'El Curí',
  municipio: 'Choachí',
  cantidad: 10,
  unidad: 'kg',
  entrega: ENTREGA.ENTREGADO,
  calidad: null,
  confirmadoPor: 'ambos',
  shareLevel: 2,
  createdAt: 1000,
  ...o,
});

describe('normalizeTerm', () => {
  it('minúsculas sin tildes y colapsa espacios', () => {
    expect(normalizeTerm('  El  Curí ')).toBe('el curi');
    expect(normalizeTerm('Tomate Chonto')).toBe('tomate chonto');
  });
});

describe('computeReputacion — suavizado bayesiano', () => {
  it('n=1 entregado queda "nuevo" y fiabilidad tirada hacia 0.5 (Laplace 2/3)', () => {
    const rep = computeReputacion([trato()]);
    expect(rep.nivel).toBe(NIVEL_REPUTACION.NUEVO);
    expect(rep.fiabilidad).toBeCloseTo(2 / 3, 5);
    expect(rep.nConfirmadas).toBe(1);
  });

  it('3 entregas cumplidas → verde con fiabilidad 0.8 (4/5)', () => {
    const reps = computeReputacion([trato(), trato(), trato()]);
    expect(reps.fiabilidad).toBeCloseTo(0.8, 5);
    expect(reps.nivel).toBe(NIVEL_REPUTACION.VERDE);
    expect(reps.nEntregados).toBe(3);
  });

  it('2 cumplidas + 1 fallida → ámbar (3/5 = 0.6)', () => {
    const rep = computeReputacion([
      trato(), trato(), trato({ entrega: ENTREGA.NO_ENTREGADO }),
    ]);
    expect(rep.fiabilidad).toBeCloseTo(0.6, 5);
    expect(rep.nivel).toBe(NIVEL_REPUTACION.AMBAR);
  });

  it('fallas de entrega demostradas → rojo', () => {
    const rep = computeReputacion([
      trato({ entrega: ENTREGA.NO_ENTREGADO }),
      trato({ entrega: ENTREGA.NO_ENTREGADO }),
    ]);
    expect(rep.fiabilidad).toBeCloseTo(0.25, 5); // (0+1)/(2+2)
    expect(rep.nivel).toBe(NIVEL_REPUTACION.ROJO);
  });

  it('entrega parcial pesa 0.5', () => {
    const rep = computeReputacion([
      trato({ entrega: ENTREGA.PARCIAL }),
      trato({ entrega: ENTREGA.PARCIAL }),
    ]);
    // sumaPeso=1, nConfirmadas=2 → (1+1)/(2+2)=0.5
    expect(rep.fiabilidad).toBeCloseTo(0.5, 5);
  });

  it('los pendientes NO cuentan como confirmadas', () => {
    const rep = computeReputacion([
      trato(), trato(), trato({ entrega: ENTREGA.PENDIENTE }),
    ]);
    expect(rep.nTransacciones).toBe(3);
    expect(rep.nConfirmadas).toBe(2);
  });

  it('calidad: promedio 1..5 y normalizada 0..1', () => {
    const rep = computeReputacion([
      trato({ calidad: 5 }), trato({ calidad: 3 }),
    ]);
    expect(rep.calidadPromedio).toBeCloseTo(4, 5);
    expect(rep.calidadNorm).toBeCloseTo(0.75, 5); // (4-1)/4
  });

  it('sin calificaciones → calidad null (no inventa)', () => {
    const rep = computeReputacion([trato(), trato()]);
    expect(rep.calidadPromedio).toBeNull();
    expect(rep.calidadNorm).toBeNull();
  });

  it('vereda predominante entre los tratos', () => {
    const rep = computeReputacion([
      trato({ vereda: 'El Curí' }),
      trato({ vereda: 'El Curí' }),
      trato({ vereda: 'Potrero' }),
    ]);
    expect(normalizeTerm(rep.vereda)).toBe('el curi');
  });

  it('score queda en [0,1]', () => {
    const rep = computeReputacion([trato(), trato(), trato({ calidad: 5 })]);
    expect(rep.score).toBeGreaterThanOrEqual(0);
    expect(rep.score).toBeLessThanOrEqual(1);
  });

  it('recencia: un trato viejo baja el score (media vida)', () => {
    const base = [trato(), trato(), trato()];
    const now = 1000 + __MODEL__.HALF_LIFE_DIAS_DEFAULT * 24 * 60 * 60 * 1000;
    const sinNow = computeReputacion(base).score;
    const conRecencia = computeReputacion(base, { now }).score;
    expect(conRecencia).toBeLessThan(sinNow);
    expect(conRecencia).toBeCloseTo(sinNow * 0.5, 5);
  });

  it('input basura → reputación nueva sin lanzar', () => {
    const rep = computeReputacion(null);
    expect(rep.nivel).toBe(NIVEL_REPUTACION.NUEVO);
    expect(rep.nTransacciones).toBe(0);
  });
});

describe('groupTratos', () => {
  it('agrupa por productor + producto normalizado y filtra privados', () => {
    const grupos = groupTratos([
      trato({ productorHash: 'p1', producto: 'Tomate', shareLevel: 2 }),
      trato({ productorHash: 'p1', producto: 'tomate', shareLevel: 2 }), // mismo grupo
      trato({ productorHash: 'p1', producto: 'Mora', shareLevel: 2 }),
      trato({ productorHash: 'p2', producto: 'Tomate', shareLevel: 2 }),
      trato({ productorHash: 'p1', producto: 'Tomate', shareLevel: 1 }), // privado: fuera
    ]);
    expect(grupos.get('p1::tomate')).toHaveLength(2);
    expect(grupos.get('p1::mora')).toHaveLength(1);
    expect(grupos.get('p2::tomate')).toHaveLength(1);
  });
});

describe('computeAllReputaciones', () => {
  it('una reputación por productor×producto, ordenada por score', () => {
    const reps = computeAllReputaciones([
      trato({ productorHash: 'p1', producto: 'Tomate' }),
      trato({ productorHash: 'p1', producto: 'Tomate' }),
      trato({ productorHash: 'p1', producto: 'Tomate' }),
      trato({ productorHash: 'p2', producto: 'Tomate', entrega: ENTREGA.NO_ENTREGADO }),
      trato({ productorHash: 'p2', producto: 'Tomate', entrega: ENTREGA.NO_ENTREGADO }),
    ]);
    expect(reps).toHaveLength(2);
    expect(reps[0].productorHash).toBe('p1'); // mejor score primero
    expect(reps[0].nivel).toBe(NIVEL_REPUTACION.VERDE);
  });
});

describe('buildSocialGraph', () => {
  it('deriva nodos + aristas solo de tratos compartibles', () => {
    const g = buildSocialGraph([
      trato({ productorHash: 'p1', producto: 'Tomate', vereda: 'El Curí', compradorHash: 'c1' }),
      trato({ productorHash: 'p1', producto: 'Tomate', vereda: 'El Curí', compradorHash: 'c1', entrega: ENTREGA.NO_ENTREGADO }),
      trato({ productorHash: 'p2', producto: 'Mora', vereda: 'Potrero', shareLevel: 1 }), // privado
    ]);
    expect(g.nodos.productores).toEqual(['p1']);
    expect(g.nodos.cultivos).toContain('tomate');
    expect(g.nodos.veredas).toContain('el curi');

    const cultiva = g.cultiva.find((e) => e.productorHash === 'p1');
    expect(cultiva.count).toBe(2);
    expect(cultiva.entregados).toBe(1);

    const ubic = g.ubicadoEn.find((e) => e.productorHash === 'p1');
    expect(ubic.count).toBe(2);
    expect(ubic.municipio).toBe('Choachí');

    const entrego = g.entregoA.find((e) => e.compradorHash === 'c1');
    expect(entrego.count).toBe(2);

    expect(g.meta.tratos).toBe(3);
    expect(g.meta.compartidos).toBe(2);
  });

  it('sin compradorHash no crea arista ENTREGO_A', () => {
    const g = buildSocialGraph([trato({ compradorHash: null })]);
    expect(g.entregoA).toHaveLength(0);
  });
});
