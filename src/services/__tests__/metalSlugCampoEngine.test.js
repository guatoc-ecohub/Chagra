/**
 * metalSlugCampoEngine.test.js — lógica PURA del Metal Slug del campo.
 *
 * El foco (lo que pidió el prototipo): el par plaga↔arma CORRECTO vs INCORRECTO.
 *   - Arma correcta (control biológico real) → plaga controlada.
 *   - Arma equivocada → la plaga SOBREVIVE y el juego puede enseñar el par.
 * Más: proyectiles (avance/expiración), rescate de rehén, patrulla determinista,
 * arsenal derivado del nivel (data-driven) y fin de nivel.
 */
import { describe, it, expect } from 'vitest';
import {
  armasDeNivel,
  crearProyectil,
  avanzarProyectil,
  resolverImpactoArma,
  alcanzaRehen,
  patrullarPlaga,
  evaluarFinCampo,
  PROYECTIL_VEL,
} from '../metalSlugCampoEngine';

/** Fábrica de una plaga-instancia mínima para los tests de colisión. */
function plaga(enemigoId, over = {}) {
  return { id: `${enemigoId}#1`, enemigoId, x: 300, y: 200, w: 40, h: 40, vivo: true, ...over };
}

describe('armasDeNivel — arsenal derivado del data (sin invento)', () => {
  it('nivel 1 reúne los controladores reales de sus plagas', () => {
    const armas = armasDeNivel(1);
    // Nivel 1 = cogollero, pulgon, afido, moscablanca. Sus controladores reales:
    expect(armas).toContain('bt'); // cogollero
    expect(armas).toContain('catarina'); // pulgon/afido (mariquita)
    expect(armas).toContain('beauveria'); // moscablanca
    // Sin duplicados aunque una plaga comparta controlador (crisopa aparece 1 vez).
    expect(new Set(armas).size).toBe(armas.length);
  });

  it('nivel inexistente → arsenal vacío', () => {
    expect(armasDeNivel(999)).toEqual([]);
  });
});

describe('crearProyectil — cápsula de benéficos', () => {
  it('sale hacia la derecha con velocidad positiva', () => {
    const p = crearProyectil({ x: 100, y: 50, dir: 1, armaId: 'bt', id: 'test-bala' });
    expect(p.vx).toBe(PROYECTIL_VEL);
    expect(p.armaId).toBe('bt');
    expect(p.w).toBeGreaterThan(0);
  });
  it('sale hacia la izquierda con velocidad negativa', () => {
    const p = crearProyectil({ x: 100, y: 50, dir: -1, armaId: 'catarina', id: 'test-bala' });
    expect(p.vx).toBe(-PROYECTIL_VEL);
    expect(p.dir).toBe(-1);
  });
});

describe('avanzarProyectil — vuelo y expiración', () => {
  it('avanza según dt y velocidad', () => {
    const p = crearProyectil({ x: 100, y: 50, dir: 1, armaId: 'bt', id: 1 });
    const p2 = avanzarProyectil(p, 0.1, 2000);
    expect(p2).not.toBeNull();
    expect(p2.x).toBeCloseTo(100 + PROYECTIL_VEL * 0.1, 5);
  });
  it('se descarta (null) al salir del mundo por la derecha', () => {
    const p = crearProyectil({ x: 1990, y: 50, dir: 1, armaId: 'bt', id: 2 });
    expect(avanzarProyectil(p, 1, 2000)).toBeNull();
  });
  it('se descarta (null) al salir por la izquierda', () => {
    const p = crearProyectil({ x: 10, y: 50, dir: -1, armaId: 'bt', id: 3 });
    expect(avanzarProyectil(p, 1, 2000)).toBeNull();
  });
});

describe('resolverImpactoArma — EL PAR plaga↔arma (correcto vs incorrecto)', () => {
  it('arma CORRECTA controla la plaga (Bt → cogollero)', () => {
    const proy = crearProyectil({ x: 300, y: 200, dir: 1, armaId: 'bt', id: 10 });
    const plagas = [plaga('cogollero')];
    const { plagas: next, impacto } = resolverImpactoArma(proy, plagas);
    expect(impacto).not.toBeNull();
    expect(impacto.enemigoId).toBe('cogollero');
    expect(impacto.correcto).toBe(true);
    expect(next[0].vivo).toBe(false); // controlada
  });

  it('arma EQUIVOCADA NO controla: la plaga sobrevive (Beauveria → cogollero)', () => {
    const proy = crearProyectil({ x: 300, y: 200, dir: 1, armaId: 'beauveria', id: 11 });
    const plagas = [plaga('cogollero')];
    const { plagas: next, impacto } = resolverImpactoArma(proy, plagas);
    expect(impacto).not.toBeNull();
    expect(impacto.correcto).toBe(false); // enseña el par equivocado
    expect(next[0].vivo).toBe(true); // SIGUE VIVA
  });

  it('mariquita (catarina) SÍ controla al pulgón', () => {
    const proy = crearProyectil({ x: 300, y: 200, dir: 1, armaId: 'catarina', id: 12 });
    const { impacto, plagas } = resolverImpactoArma(proy, [plaga('pulgon')]);
    expect(impacto.correcto).toBe(true);
    expect(plagas[0].vivo).toBe(false);
  });

  it('Beauveria SÍ controla a la mosca blanca', () => {
    const proy = crearProyectil({ x: 300, y: 200, dir: 1, armaId: 'beauveria', id: 13 });
    const { impacto } = resolverImpactoArma(proy, [plaga('moscablanca')]);
    expect(impacto.correcto).toBe(true);
  });

  it('sin solape → no hay impacto (el tiro pasa de largo)', () => {
    const proy = crearProyectil({ x: 900, y: 200, dir: 1, armaId: 'bt', id: 14 });
    const { impacto, plagas } = resolverImpactoArma(proy, [plaga('cogollero')]);
    expect(impacto).toBeNull();
    expect(plagas[0].vivo).toBe(true);
  });

  it('ignora plagas ya controladas y pega a la primera viva que solapa', () => {
    const proy = crearProyectil({ x: 300, y: 200, dir: 1, armaId: 'bt', id: 15 });
    const plagas = [
      plaga('cogollero', { id: 'a', vivo: false }),
      plaga('cogollero', { id: 'b', vivo: true }),
    ];
    const { plagas: next, impacto } = resolverImpactoArma(proy, plagas);
    expect(impacto.id).toBe('b');
    expect(next[1].vivo).toBe(false);
    expect(next[0].vivo).toBe(false); // seguía muerta
  });
});

describe('alcanzaRehen — rescate del animal cazado', () => {
  const jugador = { x: 500, y: 200, w: 44, h: 60 };
  it('true al tocar un rehén no liberado', () => {
    const rehen = { x: 520, y: 210, w: 50, h: 50, liberado: false };
    expect(alcanzaRehen(jugador, rehen)).toBe(true);
  });
  it('false si ya está liberado', () => {
    const rehen = { x: 520, y: 210, w: 50, h: 50, liberado: true };
    expect(alcanzaRehen(jugador, rehen)).toBe(false);
  });
  it('false sin rehén', () => {
    expect(alcanzaRehen(jugador, null)).toBe(false);
  });
});

describe('patrullarPlaga — patrulla determinista con rebote', () => {
  it('rebota en el borde derecho e invierte dirección', () => {
    const { x, dir } = patrullarPlaga({ x: 995, dir: 1, vel: 100 }, 1, 0, 1000);
    expect(x).toBe(1000);
    expect(dir).toBe(-1);
  });
  it('rebota en el borde izquierdo', () => {
    const { x, dir } = patrullarPlaga({ x: 5, dir: -1, vel: 100 }, 1, 0, 1000);
    expect(x).toBe(0);
    expect(dir).toBe(1);
  });
});

describe('evaluarFinCampo — condición de victoria/derrota', () => {
  it('gana al controlar todas las plagas y liberar al rehén', () => {
    expect(evaluarFinCampo({ energia: 2, plagasVivas: 0, rehenLiberado: true }).estado).toBe('gano');
  });
  it('sigue jugando si falta el rehén', () => {
    expect(evaluarFinCampo({ energia: 2, plagasVivas: 0, rehenLiberado: false }).estado).toBe('jugando');
  });
  it('sigue jugando si quedan plagas', () => {
    expect(evaluarFinCampo({ energia: 2, plagasVivas: 3, rehenLiberado: true }).estado).toBe('jugando');
  });
  it('pierde si la energía llega a 0', () => {
    expect(evaluarFinCampo({ energia: 0, plagasVivas: 1, rehenLiberado: false }).estado).toBe('perdio');
  });
});
