import { describe, expect, it } from 'vitest';
import {
  rectsOverlap,
  beneficoControlaPlaga,
  aplicarBenefico,
  resolverColisionPlagas,
  recolectarCultivos,
  sumarPuntaje,
  avanzarFisica,
  avanzarFisicaTerreno,
  sobreHueco,
  golpearJefe,
  intentarSalto,
  evaluarFinNivel,
  clamp,
  PUNTOS_CULTIVO,
  PUNTOS_PLAGA_CONTROLADA,
  GRAVITY,
  JUMP_VELOCITY,
} from '../defensoresGameEngine';
import {
  PARES_CONTROL,
  NIVEL_1,
  NIVEL_2,
  NIVEL_3,
  NIVELES,
  getNivel,
  nivelDesbloqueado,
} from '../../components/juego/defensoresFincaData';

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

  it('pierde cuando la energía es negativa', () => {
    const res = evaluarFinNivel({ energia: -1, cultivosRecogidos: 10, metaCultivos: 10, plagasVivas: 0 });
    expect(res.estado).toBe('perdio');
  });

  it('la razón de perder incluye mensaje sobre energía', () => {
    const res = evaluarFinNivel({ energia: 0, cultivosRecogidos: 0, metaCultivos: 6, plagasVivas: 10 });
    expect(res.razon).toContain('energía');
  });

  it('la razón de ganar incluye mensaje sobre control biológico', () => {
    const res = evaluarFinNivel({ energia: 2, cultivosRecogidos: 6, metaCultivos: 6, plagasVivas: 0 });
    expect(res.razon).toContain('control biológico');
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

  it('con mini-jefe NO gana hasta derrotarlo, aunque cumpla lo demás', () => {
    const conJefeVivo = evaluarFinNivel({
      energia: 3,
      cultivosRecogidos: 10,
      metaCultivos: 10,
      plagasVivas: 0,
      hayJefe: true,
      jefeVivo: true,
    });
    expect(conJefeVivo.estado).toBe('jugando');

    const jefeDerrotado = evaluarFinNivel({
      energia: 3,
      cultivosRecogidos: 10,
      metaCultivos: 10,
      plagasVivas: 0,
      hayJefe: true,
      jefeVivo: false,
    });
    expect(jefeDerrotado.estado).toBe('gano');
  });
});

describe('aplicarBenefico — casos borde', () => {
  it('no elimina nada con lista de plagas vacía', () => {
    const res = aplicarBenefico([], 'catarina');
    expect(res.eliminadas).toBe(0);
    expect(res.plagas).toEqual([]);
  });

  it('no elimina nada si el benéfico no existe en BENEFICO_CONTROLA', () => {
    const plagas = [{ id: 'a', plagaId: 'pulgon', alive: true }];
    const res = aplicarBenefico(plagas, 'benefico_inexistente');
    expect(res.eliminadas).toBe(0);
    expect(res.plagas[0].alive).toBe(true);
  });

  it('todas las plagas que coinciden son eliminadas (múltiples instancias)', () => {
    const plagas = [
      { id: 'a', plagaId: 'pulgon', alive: true },
      { id: 'b', plagaId: 'pulgon', alive: true },
      { id: 'c', plagaId: 'pulgon', alive: true },
    ];
    const res = aplicarBenefico(plagas, 'catarina');
    expect(res.eliminadas).toBe(3);
    expect(res.plagas.every((p) => !p.alive)).toBe(true);
  });
});

describe('golpearJefe — casos borde', () => {
  it('no hace nada si el jefe es null', () => {
    const res = golpearJefe(null, 'mantis');
    expect(res.jefe).toBeNull();
    expect(res.golpeo).toBe(false);
    expect(res.derrotado).toBe(false);
  });

  it('no hace nada si el jefe ya está muerto', () => {
    const jefe = { plagaId: 'saltamontes', vida: 0, vivo: false };
    const res = golpearJefe(jefe, 'mantis');
    expect(res.golpeo).toBe(false);
  });
});

describe('sumarPuntaje — casos borde', () => {
  it('no rompe si no se pasan deltas', () => {
    expect(sumarPuntaje(50)).toBe(50);
    expect(sumarPuntaje(0, undefined)).toBe(0);
  });
});

describe('nivel 2 — terreno con plataformas y huecos', () => {
  it('sobreHueco maneja null/undefined sin reventar', () => {
    expect(sobreHueco(120, null)).toBe(false);
    expect(sobreHueco(120, undefined)).toBe(false);
  });

  it('sobreHueco detecta cuando el centro del jugador cae en un vacío', () => {
    const huecos = [{ x: 100, w: 50 }];
    expect(sobreHueco(120, huecos)).toBe(true);
    expect(sobreHueco(99, huecos)).toBe(false);
    expect(sobreHueco(160, huecos)).toBe(false);
    expect(sobreHueco(120, [])).toBe(false);
  });

  it('avanzarFisicaTerreno aterriza en el suelo cuando NO hay hueco debajo', () => {
    const groundY = 340;
    const estado = { x: 20, y: 330, w: 38, h: 54, vy: 20 };
    const res = avanzarFisicaTerreno(estado, groundY, [], [], 485);
    expect(res.onGround).toBe(true);
    expect(res.y).toBe(groundY - 54);
    expect(res.vy).toBe(0);
    expect(res.caido).toBe(false);
  });

  it('avanzarFisicaTerreno deja caer al jugador por un hueco (sin suelo)', () => {
    const groundY = 340;
    // Jugador justo sobre un hueco: su centro x cae dentro del vacío.
    const estado = { x: 690, y: 330, w: 38, h: 54, vy: 20 };
    const huecos = [{ x: 680, w: 80 }];
    const res = avanzarFisicaTerreno(estado, groundY, [], huecos, 485);
    expect(res.onGround).toBe(false);
    expect(res.y).toBeGreaterThan(330); // siguió cayendo, no se ancló al suelo
  });

  it('avanzarFisicaTerreno marca caido al pasar el fondo del mundo', () => {
    const estado = { x: 690, y: 460, w: 38, h: 54, vy: 20 };
    const huecos = [{ x: 680, w: 80 }];
    const res = avanzarFisicaTerreno(estado, 340, [], huecos, 485);
    expect(res.caido).toBe(true);
  });

  it('avanzarFisicaTerreno aterriza encima de una plataforma al caer sobre ella', () => {
    const groundY = 340;
    // Plataforma con top en y=200. El jugador cae y sus pies la cruzan.
    const plataformas = [{ x: 100, y: 200, w: 120 }];
    const estado = { x: 120, y: 140, w: 38, h: 54, vy: 12 }; // pies antes=194, ahora≈206
    const res = avanzarFisicaTerreno(estado, groundY, plataformas, [], 485);
    expect(res.onGround).toBe(true);
    expect(res.y).toBe(200 - 54);
    expect(res.vy).toBe(0);
  });

  it('avanzarFisicaTerreno NO aterriza en plataforma si va subiendo', () => {
    const plataformas = [{ x: 100, y: 200, w: 120 }];
    const estado = { x: 120, y: 210, w: 38, h: 54, vy: -10 };
    const res = avanzarFisicaTerreno(estado, 340, plataformas, [], 485);
    expect(res.onGround).toBe(false);
  });

  it('avanzarFisicaTerreno funciona con plataformas nulas o vacías', () => {
    const groundY = 340;
    const estado = { x: 20, y: 330, w: 38, h: 54, vy: 20 };
    expect(avanzarFisicaTerreno(estado, groundY, null, [], 485).onGround).toBe(true);
    expect(avanzarFisicaTerreno(estado, groundY, undefined, [], 485).onGround).toBe(true);
    expect(avanzarFisicaTerreno(estado, groundY, [], [], 485).onGround).toBe(true);
  });

  it('el jugador NO cruza una plataforma si sus pies ya estaban debajo', () => {
    const groundY = 340;
    const plataformas = [{ x: 100, y: 200, w: 120 }];
    // El jugador está debajo de la plataforma (pies en 314 > top 200).
    // No debería aterrizar en ella porque no la cruza desde arriba.
    const estado = { x: 120, y: 260, w: 38, h: 54, vy: 5 };
    const res = avanzarFisicaTerreno(estado, groundY, plataformas, [], 485);
    // No aterriza en la plataforma (pies ya debajo). Sigue en el aire.
    expect(res.onGround).toBe(false);
  });
});

describe('mini-jefe — solo cae con su controlador real', () => {
  const jefeBase = { plagaId: 'saltamontes', vida: 3, vivo: true };

  it('el controlador correcto (mantis → saltamontes) le quita vida', () => {
    const res = golpearJefe(jefeBase, 'mantis');
    expect(res.golpeo).toBe(true);
    expect(res.jefe.vida).toBe(2);
    expect(res.jefe.vivo).toBe(true);
    expect(res.derrotado).toBe(false);
  });

  it('un benéfico equivocado NO le hace nada al jefe', () => {
    const res = golpearJefe(jefeBase, 'catarina'); // controla pulgón, no saltamontes
    expect(res.golpeo).toBe(false);
    expect(res.jefe.vida).toBe(3);
  });

  it('al agotar la vida el jefe queda derrotado', () => {
    let jefe = { plagaId: 'saltamontes', vida: 1, vivo: true };
    const res = golpearJefe(jefe, 'mantis');
    expect(res.derrotado).toBe(true);
    expect(res.jefe.vivo).toBe(false);
    expect(res.jefe.vida).toBe(0);
    // Un golpe a un jefe ya muerto no hace nada.
    jefe = res.jefe;
    expect(golpearJefe(jefe, 'mantis').golpeo).toBe(false);
  });
});

describe('niveles — configuración y desbloqueo', () => {
  it('hay tres niveles y el 2 es más largo y exigente que el 1', () => {
    expect(NIVELES).toHaveLength(3);
    expect(NIVEL_2.numero).toBe(2);
    expect(NIVEL_2.mundoAncho).toBeGreaterThan(NIVEL_1.mundoAncho);
    expect(NIVEL_2.metaCultivos).toBeGreaterThan(NIVEL_1.metaCultivos);
    expect(NIVEL_2.paresIds.length).toBeGreaterThan(NIVEL_1.paresIds.length);
    expect(NIVEL_2.plataformas.length).toBeGreaterThan(0);
    expect(NIVEL_2.huecos.length).toBeGreaterThan(0);
    expect(NIVEL_2.jefe).toBeTruthy();
  });

  it('el nivel 3 es el más largo y exigente (más mundo, cultivos, pares, jefe duro)', () => {
    expect(NIVEL_3.numero).toBe(3);
    expect(NIVEL_3.mundoAncho).toBeGreaterThan(NIVEL_2.mundoAncho);
    expect(NIVEL_3.metaCultivos).toBeGreaterThan(NIVEL_2.metaCultivos);
    expect(NIVEL_3.paresIds.length).toBeGreaterThan(NIVEL_2.paresIds.length);
    expect(NIVEL_3.plataformas.length).toBeGreaterThan(NIVEL_2.plataformas.length);
    expect(NIVEL_3.huecos.length).toBeGreaterThan(NIVEL_2.huecos.length);
    expect(NIVEL_3.jefe).toBeTruthy();
    // El jefe del cafetal aguanta más golpes que la langosta del nivel 2.
    expect(NIVEL_3.jefe.vida).toBeGreaterThan(NIVEL_2.jefe.vida);
  });

  it('cada nivel usa una paleta de fondo distinta', () => {
    expect(NIVEL_2.escena.id).not.toBe(NIVEL_1.escena.id);
    expect(NIVEL_2.escena.cieloTop).not.toBe(NIVEL_1.escena.cieloTop);
    expect(NIVEL_3.escena.id).not.toBe(NIVEL_2.escena.id);
    expect(NIVEL_3.escena.id).not.toBe(NIVEL_1.escena.id);
    expect(NIVEL_3.escena.cieloTop).not.toBe(NIVEL_2.escena.cieloTop);
  });

  it('todos los pares de cada nivel existen en el dataset curado', () => {
    const ids = new Set(PARES_CONTROL.map((p) => p.id));
    for (const nivel of NIVELES) {
      for (const pid of nivel.paresIds) {
        expect(ids.has(pid)).toBe(true);
      }
    }
  });

  it('el mini-jefe del nivel 2 referencia una plaga real con controlador', () => {
    const par = PARES_CONTROL.find((p) => p.plaga.id === NIVEL_2.jefe.plagaId);
    expect(par).toBeTruthy();
    // El controlador real de esa plaga derriba al jefe.
    expect(beneficoControlaPlaga(par.benefico.id, NIVEL_2.jefe.plagaId)).toBe(true);
  });

  it('el mini-jefe del nivel 3 (broca) referencia una plaga real con controlador', () => {
    const par = PARES_CONTROL.find((p) => p.plaga.id === NIVEL_3.jefe.plagaId);
    expect(par).toBeTruthy();
    expect(par.benefico.id).toBe('cephalonomia');
    // La avispa Cephalonomia es el controlador real de la broca y derriba al jefe.
    expect(beneficoControlaPlaga(par.benefico.id, NIVEL_3.jefe.plagaId)).toBe(true);
  });

  it('getNivel devuelve el nivel pedido y cae al 1 si no existe', () => {
    expect(getNivel(2)).toBe(NIVEL_2);
    expect(getNivel(3)).toBe(NIVEL_3);
    expect(getNivel(99)).toBe(NIVEL_1);
  });

  it('nivelDesbloqueado: cada nivel solo tras superar el anterior', () => {
    expect(nivelDesbloqueado(1, [])).toBe(true);
    expect(nivelDesbloqueado(2, [])).toBe(false);
    expect(nivelDesbloqueado(2, [1])).toBe(true);
    // El nivel 3 exige haber superado el nivel 2.
    expect(nivelDesbloqueado(3, [1])).toBe(false);
    expect(nivelDesbloqueado(3, [1, 2])).toBe(true);
  });

  it('NIVELES está congelado (immutable)', () => {
    expect(Object.isFrozen(NIVELES)).toBe(true);
  });

  it('NIVEL_1, NIVEL_2, NIVEL_3 están congelados', () => {
    expect(Object.isFrozen(NIVEL_1)).toBe(true);
    expect(Object.isFrozen(NIVEL_2)).toBe(true);
    expect(Object.isFrozen(NIVEL_3)).toBe(true);
  });
});
