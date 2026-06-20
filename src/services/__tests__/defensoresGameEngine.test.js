import { describe, expect, it } from 'vitest';
import {
  rectsOverlap,
  beneficoControlaPlaga,
  aplicarBenefico,
  resolverColisionPlagas,
  recolectarCultivos,
  sumarPuntaje,
  avanzarFisica,
  intentarSalto,
  evaluarFinNivel,
  clamp,
  PUNTOS_CULTIVO,
  PUNTOS_PLAGA_CONTROLADA,
  GRAVITY,
  JUMP_VELOCITY,
} from '../defensoresGameEngine';
import { PARES_CONTROL } from '../../components/juego/defensoresFincaData';

describe('defensoresGameEngine — utilidades', () => {
  it('clamp limita al rango', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });

  it('rectsOverlap detecta solape y separación', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(rectsOverlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(rectsOverlap(a, { x: 20, y: 0, w: 10, h: 10 })).toBe(false);
    expect(rectsOverlap(a, null)).toBe(false);
  });
});

describe('control biológico — el benéfico SOLO elimina su plaga real', () => {
  it('cada par del dataset tiene la relación CONTROLS correcta', () => {
    for (const par of PARES_CONTROL) {
      expect(beneficoControlaPlaga(par.benefico.id, par.plaga.id)).toBe(true);
    }
  });

  it('un benéfico NO controla la plaga de otro par', () => {
    const catarina = PARES_CONTROL.find((p) => p.benefico.id === 'catarina');
    const cogollero = PARES_CONTROL.find((p) => p.plaga.id === 'cogollero');
    expect(catarina).toBeTruthy();
    expect(cogollero).toBeTruthy();
    // La mariquita controla el pulgón, NO el gusano cogollero.
    expect(beneficoControlaPlaga('catarina', 'cogollero')).toBe(false);
  });

  it('aplicarBenefico elimina solo la plaga objetivo y deja vivas las demás', () => {
    const plagas = [
      { id: 'a', plagaId: 'pulgon', alive: true },
      { id: 'b', plagaId: 'pulgon', alive: true },
      { id: 'c', plagaId: 'cogollero', alive: true },
    ];
    const res = aplicarBenefico(plagas, 'catarina'); // controla pulgón
    expect(res.eliminadas).toBe(2);
    expect(res.plagaId).toBe('pulgon');
    expect(res.plagas.find((p) => p.id === 'a').alive).toBe(false);
    expect(res.plagas.find((p) => p.id === 'b').alive).toBe(false);
    // El cogollero sigue vivo: la mariquita no lo controla.
    expect(res.plagas.find((p) => p.id === 'c').alive).toBe(true);
  });

  it('aplicarBenefico no elimina nada si la plaga objetivo no está presente', () => {
    const plagas = [{ id: 'c', plagaId: 'cogollero', alive: true }];
    const res = aplicarBenefico(plagas, 'catarina');
    expect(res.eliminadas).toBe(0);
    expect(res.plagas[0].alive).toBe(true);
  });
});

describe('colisión jugador ↔ plaga', () => {
  const jugador = { x: 100, y: 100, w: 20, h: 20 };

  it('golpea cuando toca una plaga viva y no es invulnerable', () => {
    const plagas = [{ id: 'p1', x: 110, y: 100, w: 20, h: 20, alive: true }];
    const res = resolverColisionPlagas(jugador, plagas, false);
    expect(res.golpe).toBe(true);
    expect(res.plagaId).toBe('p1');
  });

  it('no golpea si la plaga ya está controlada (muerta)', () => {
    const plagas = [{ id: 'p1', x: 110, y: 100, w: 20, h: 20, alive: false }];
    expect(resolverColisionPlagas(jugador, plagas, false).golpe).toBe(false);
  });

  it('no golpea durante la invulnerabilidad post-golpe', () => {
    const plagas = [{ id: 'p1', x: 110, y: 100, w: 20, h: 20, alive: true }];
    expect(resolverColisionPlagas(jugador, plagas, true).golpe).toBe(false);
  });

  it('no golpea si está lejos de la plaga', () => {
    const plagas = [{ id: 'p1', x: 400, y: 100, w: 20, h: 20, alive: true }];
    expect(resolverColisionPlagas(jugador, plagas, false).golpe).toBe(false);
  });
});

describe('recolección de cultivos + puntaje', () => {
  const jugador = { x: 100, y: 100, w: 20, h: 20 };

  it('recoge cultivos que toca y los marca como recogidos', () => {
    const cultivos = [
      { id: 'c1', x: 110, y: 100, w: 20, h: 20, recogido: false },
      { id: 'c2', x: 400, y: 100, w: 20, h: 20, recogido: false },
    ];
    const res = recolectarCultivos(jugador, cultivos);
    expect(res.recogidos).toEqual(['c1']);
    expect(res.cultivos.find((c) => c.id === 'c1').recogido).toBe(true);
    expect(res.cultivos.find((c) => c.id === 'c2').recogido).toBe(false);
  });

  it('no vuelve a recoger un cultivo ya recogido', () => {
    const cultivos = [{ id: 'c1', x: 110, y: 100, w: 20, h: 20, recogido: true }];
    expect(recolectarCultivos(jugador, cultivos).recogidos).toEqual([]);
  });

  it('sumarPuntaje aplica los valores correctos', () => {
    expect(sumarPuntaje(0, { cultivos: 2 })).toBe(2 * PUNTOS_CULTIVO);
    expect(sumarPuntaje(0, { plagas: 1 })).toBe(PUNTOS_PLAGA_CONTROLADA);
    expect(sumarPuntaje(10, { cultivos: 1, plagas: 1 })).toBe(
      10 + PUNTOS_CULTIVO + PUNTOS_PLAGA_CONTROLADA,
    );
    expect(sumarPuntaje(5, {})).toBe(5);
  });
});

describe('física de salto y gravedad', () => {
  it('intentarSalto solo salta desde el suelo (no doble salto)', () => {
    const enSuelo = intentarSalto({ vy: 0, onGround: true });
    expect(enSuelo.salto).toBe(true);
    expect(enSuelo.vy).toBe(JUMP_VELOCITY);
    expect(enSuelo.onGround).toBe(false);

    const enAire = intentarSalto({ vy: -3, onGround: false });
    expect(enAire.salto).toBe(false);
    expect(enAire.vy).toBe(-3);
  });

  it('avanzarFisica aplica gravedad y aterriza en el suelo', () => {
    const groundY = 340;
    const altura = 54;
    // Cae desde arriba con velocidad: gana gravedad.
    const subiendo = avanzarFisica({ y: 100, vy: -10, onGround: false }, groundY, altura);
    expect(subiendo.vy).toBe(-10 + GRAVITY);
    expect(subiendo.onGround).toBe(false);

    // Llega al piso: se ancla y vy=0, onGround=true.
    const aterriza = avanzarFisica({ y: 330, vy: 20, onGround: false }, groundY, altura);
    expect(aterriza.y).toBe(groundY - altura);
    expect(aterriza.vy).toBe(0);
    expect(aterriza.onGround).toBe(true);
  });
});

describe('fin de nivel', () => {
  it('pierde cuando la energía llega a 0', () => {
    const res = evaluarFinNivel({ energia: 0, cultivosRecogidos: 3, metaCultivos: 6, plagasVivas: 2 });
    expect(res.estado).toBe('perdio');
  });

  it('gana al recoger la meta de cultivos Y controlar todas las plagas', () => {
    const res = evaluarFinNivel({ energia: 2, cultivosRecogidos: 6, metaCultivos: 6, plagasVivas: 0 });
    expect(res.estado).toBe('gano');
  });

  it('sigue jugando si faltan cultivos o quedan plagas', () => {
    expect(
      evaluarFinNivel({ energia: 2, cultivosRecogidos: 6, metaCultivos: 6, plagasVivas: 1 }).estado,
    ).toBe('jugando');
    expect(
      evaluarFinNivel({ energia: 2, cultivosRecogidos: 3, metaCultivos: 6, plagasVivas: 0 }).estado,
    ).toBe('jugando');
  });
});
