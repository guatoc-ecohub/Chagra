/*
 * Tests del minijuego "Doom de la Finca": integridad de datos (pares plaga ->
 * control biologico) y logica del motor (apuntar, soltar benefico correcto vs
 * equivocado, rondas, victoria/derrota). El loop debe ENSEÑAR control
 * biologico real, asi que los tests verifican que cada plaga tenga su
 * controlador definido y que aplicar el equivocado NO la elimine.
 *
 * i18n: minijuego solo es-CO; sin strings de UI aqui.
 */
import { describe, expect, it } from 'vitest';
import {
  PLAGAS_DOOM, BENEFICOS_DOOM, ESCENARIOS, CONFIG_DOOM, MAPA, JUGADOR_INICIAL,
} from '../doomFincaData';
import {
  createWorld, tickWorld, plagaObjetivo, lanzarBenefico, cambiarBenefico,
  avanzarRonda, isWall, movePlayer, danoJugador, comboSeRompe,
} from '../../../services/doomFincaEngine';

// ── INTEGRIDAD DE DATOS ────────────────────────────────────────────

describe('PLAGAS_DOOM — shape y par de control real', () => {
  it('cada plaga tiene nombre comun, cientifico, forma y un controlador valido', () => {
    const benefIds = new Set(BENEFICOS_DOOM.map((b) => b.id));
    for (const p of PLAGAS_DOOM) {
      expect(p.id).toBeTruthy();
      expect(p.nombre).toBeTruthy();
      expect(p.cientifico).toBeTruthy();
      expect(p.forma).toBeTruthy();
      expect(p.cultivo).toBeTruthy();
      expect(p.porQue.length).toBeGreaterThan(20);
      // el controlador declarado debe existir entre los beneficos
      expect(benefIds.has(p.controladoPor)).toBe(true);
    }
  });

  it('los ids de plaga son unicos', () => {
    const ids = PLAGAS_DOOM.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada plaga lista los cultivos que ataca y declara su fuente honesta', () => {
    const FUENTES = ['grafo', 'cenicafe', 'ica-ciat', 'ecologia'];
    for (const p of PLAGAS_DOOM) {
      expect(Array.isArray(p.cultivos)).toBe(true);
      expect(p.cultivos.length).toBeGreaterThan(0);
      expect(FUENTES).toContain(p.fuente);
      // el dano es una frase clara, no una etiqueta suelta
      expect(p.dano.length).toBeGreaterThan(15);
    }
  });

  it('no hay voseo argentino en el dano de las plagas (es-CO)', () => {
    const VOSEO = /\b(usá|usás|tenés|querés|empezá|elegí)\b/i;
    for (const p of PLAGAS_DOOM) {
      expect(`${p.dano} ${p.porQue}`).not.toMatch(VOSEO);
    }
  });
});

describe('BENEFICOS_DOOM — shape', () => {
  it('cada benefico tiene nombre, cientifico, emoji, color y mecanismo', () => {
    for (const b of BENEFICOS_DOOM) {
      expect(b.id).toBeTruthy();
      expect(b.nombre).toBeTruthy();
      expect(b.cientifico).toBeTruthy();
      expect(b.emoji).toBeTruthy();
      expect(b.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(b.mecanismo.length).toBeGreaterThan(20);
    }
  });
});

describe('ESCENARIOS — rondas coherentes', () => {
  it('hay al menos 3 rondas', () => {
    expect(ESCENARIOS.length).toBeGreaterThanOrEqual(3);
  });

  it('cada ronda referencia plagas reales y tiene spawns suficientes', () => {
    const plagaIds = new Set(PLAGAS_DOOM.map((p) => p.id));
    const benefIds = new Set(BENEFICOS_DOOM.map((b) => b.id));
    for (const esc of ESCENARIOS) {
      expect(esc.plagas.length).toBeGreaterThan(0);
      expect(esc.spawns.length).toBeGreaterThanOrEqual(1);
      for (const pid of esc.plagas) expect(plagaIds.has(pid)).toBe(true);
      for (const bid of esc.beneficosSugeridos) expect(benefIds.has(bid)).toBe(true);
      // los spawns no deben caer en pared
      for (const s of esc.spawns) expect(isWall(MAPA, s.x, s.y)).toBe(false);
    }
  });

  it('el benefico sugerido principal de la ronda controla al menos una de sus plagas', () => {
    for (const esc of ESCENARIOS) {
      const controladores = esc.plagas.map((pid) => PLAGAS_DOOM.find((p) => p.id === pid)?.controladoPor);
      const cubre = esc.beneficosSugeridos.some((b) => controladores.includes(b));
      expect(cubre).toBe(true);
    }
  });
});

// ── LOGICA DEL MOTOR ───────────────────────────────────────────────

describe('createWorld — estado inicial', () => {
  it('arranca en ronda 0 con las plagas del primer escenario vivas', () => {
    const w = createWorld();
    expect(w.rondaIdx).toBe(0);
    expect(w.vitalidad).toBe(CONFIG_DOOM.vitalidadInicial);
    expect(w.pests.length).toBe(ESCENARIOS[0].plagas.length);
    expect(w.pests.every((p) => p.vivo)).toBe(true);
    expect(w.terminado).toBe(false);
    expect(w.puntaje).toBe(0);
  });
});

describe('plagaObjetivo — apuntar', () => {
  it('detecta la plaga al frente y dice si el benefico es correcto', () => {
    const w = createWorld();
    const pest = w.pests[0];
    // colocar al jugador justo detras de la plaga, mirandola
    w.player = { x: pest.x - 1, y: pest.y, angulo: 0 };
    const correctBenef = pest.controladoPor;
    const ok = plagaObjetivo(w.player, correctBenef, w.pests, CONFIG_DOOM.alcanceLanzamiento);
    expect(ok.plaga).toBeTruthy();
    expect(ok.plaga.tipo).toBe(pest.tipo);
    expect(ok.correcto).toBe(true);
    // con un benefico distinto, sigue detectando la plaga pero correcto=false
    const otro = BENEFICOS_DOOM.find((b) => b.id !== correctBenef).id;
    const bad = plagaObjetivo(w.player, otro, w.pests, CONFIG_DOOM.alcanceLanzamiento);
    expect(bad.plaga).toBeTruthy();
    expect(bad.correcto).toBe(false);
  });

  it('no detecta plagas fuera del alcance', () => {
    const w = createWorld();
    const pest = w.pests[0];
    w.player = { x: pest.x - 1, y: pest.y, angulo: 0 };
    const lejos = plagaObjetivo(w.player, pest.controladoPor, w.pests, 0.2);
    expect(lejos.plaga).toBeNull();
  });
});

describe('lanzarBenefico — control biologico correcto vs equivocado', () => {
  it('el benefico equivocado NO controla la plaga (educa, no elimina)', () => {
    const w = createWorld();
    const pest = w.pests[0];
    w.player = { x: pest.x - 0.8, y: pest.y, angulo: 0 };
    const otro = BENEFICOS_DOOM.find((b) => b.id !== pest.controladoPor).id;
    const r = lanzarBenefico(w.player, otro, w.pests, CONFIG_DOOM.alcanceLanzamiento);
    expect(r.resultado).toBe('equivocado');
    expect(pest.vivo).toBe(true);
  });

  it('el benefico correcto reduce vitalidad y termina controlando la plaga', () => {
    const w = createWorld();
    const pest = w.pests[0];
    w.player = { x: pest.x - 0.8, y: pest.y, angulo: 0 };
    // disparar hasta controlarla
    let res;
    for (let i = 0; i < pest.vitalidadMax + 2; i += 1) {
      res = lanzarBenefico(w.player, pest.controladoPor, w.pests, CONFIG_DOOM.alcanceLanzamiento);
      if (res.resultado === 'control') break;
    }
    expect(res.resultado).toBe('control');
    expect(pest.vivo).toBe(false);
  });
});

describe('tickWorld — flujo de juego', () => {
  it('soltar el benefico correcto suma puntaje y registra lo aprendido', () => {
    let w = createWorld();
    const pest = w.pests[0];
    w.player = { x: pest.x - 0.7, y: pest.y, angulo: 0 };
    // suficientes ticks de fuego para controlar la primera plaga
    for (let i = 0; i < (pest.vitalidadMax + 1) * (CONFIG_DOOM.cooldownLanzamiento + 2); i += 1) {
      w.player = { x: pest.x - 0.7, y: pest.y, angulo: 0 }; // mantener mira
      w = tickWorld(w, { fire: true });
      if (!w.pests[0].vivo) break;
    }
    expect(w.pests[0].vivo).toBe(false);
    expect(w.puntaje).toBeGreaterThan(0);
    expect(w.aprendido.length).toBeGreaterThan(0);
    expect(w.aprendido[0].benefico).toBeTruthy();
  });

  it('la vitalidad baja si una plaga toca al jugador y termina en derrota a 0', () => {
    let w = createWorld();
    // pegar todas las plagas al jugador
    for (const p of w.pests) { p.x = w.player.x; p.y = w.player.y; }
    let safety = 0;
    while (!w.terminado && safety < 5000) {
      // mantener plagas encima
      for (const p of w.pests) { if (p.vivo) { p.x = w.player.x; p.y = w.player.y; } }
      w = tickWorld(w, {});
      safety += 1;
    }
    expect(w.terminado).toBe(true);
    expect(w.ganado).toBe(false);
    expect(w.vitalidad).toBe(0);
  });

  it('al controlar todas las plagas de una ronda intermedia, marca transicion (no fin)', () => {
    let w = createWorld();
    // matar todas a mano
    for (const p of w.pests) { p.vivo = false; }
    w = tickWorld(w, {});
    expect(w.rondaTransicion).toBe(true);
    expect(w.terminado).toBe(false);
  });
});

describe('avanzarRonda — progresion', () => {
  it('pasa de ronda y repuebla plagas; en la ultima ronda gana el juego', () => {
    let w = createWorld();
    // forzar transicion ronda 0 -> 1
    w = avanzarRonda(w);
    expect(w.rondaIdx).toBe(1);
    expect(w.pests.length).toBe(ESCENARIOS[1].plagas.length);
    expect(w.terminado).toBe(false);
    // saltar hasta la ultima y una mas -> gana
    for (let i = w.rondaIdx; i < ESCENARIOS.length; i += 1) {
      w = avanzarRonda(w);
    }
    expect(w.terminado).toBe(true);
    expect(w.ganado).toBe(true);
  });
});

describe('spawn del jugador — no nace en pared (regresion movil)', () => {
  it('JUGADOR_INICIAL cae en celda transitable', () => {
    // Bug reportado en telefono real: el spawn (2.5,2.5) caia DENTRO de una
    // cama de cultivo (celda solida) y la colision dejaba al jugador clavado.
    expect(isWall(MAPA, JUGADOR_INICIAL.x, JUGADOR_INICIAL.y)).toBe(false);
  });

  it('desde el spawn el jugador PUEDE avanzar (no queda clavado)', () => {
    const w = createWorld();
    expect(isWall(MAPA, w.player.x, w.player.y)).toBe(false);
    // un avance hacia adelante debe cambiar la posicion (no bloqueado)
    const next = movePlayer(MAPA, w.player, CONFIG_DOOM.velMovimiento, 0);
    const movido = Math.hypot(next.x - w.player.x, next.y - w.player.y);
    expect(movido).toBeGreaterThan(0);
  });

  it('hay holgura para moverse en las cuatro direcciones desde el spawn', () => {
    const w = createWorld();
    const v = CONFIG_DOOM.velMovimiento;
    const dirs = [[v, 0], [-v, 0], [0, v], [0, -v]];
    const algunaLibre = dirs.some(([dx, dy]) => {
      const n = movePlayer(MAPA, w.player, dx, dy);
      return Math.hypot(n.x - w.player.x, n.y - w.player.y) > 0;
    });
    expect(algunaLibre).toBe(true);
  });
});

describe('crearPlagasEscenario — todas las plagas nacen transitables', () => {
  it('ninguna plaga del mundo inicial cae en pared', () => {
    const w = createWorld();
    for (const p of w.pests) {
      expect(isWall(MAPA, p.x, p.y)).toBe(false);
    }
  });
});

describe('danoJugador — balance del daño (puro, afinable)', () => {
  it('sin plagas no hay daño', () => {
    expect(danoJugador(9, 0)).toBe(0);
    expect(danoJugador(9, -1)).toBe(0);
  });

  it('escala con el número de plagas y el factor (0.4 = histórico)', () => {
    expect(danoJugador(9, 1, 0.4)).toBeCloseTo(3.6, 5);
    expect(danoJugador(9, 2, 0.4)).toBeCloseTo(7.2, 5);
  });

  it('el factor de FEEL (0.28) es más suave que el histórico (0.4)', () => {
    expect(danoJugador(9, 1, 0.28)).toBeLessThan(danoJugador(9, 1, 0.4));
  });
});

describe('comboSeRompe — el combo perdona el fallo de puntería con FEEL ON', () => {
  it('el benéfico equivocado SIEMPRE rompe el combo (error conceptual)', () => {
    expect(comboSeRompe('equivocado', false)).toBe(true);
    expect(comboSeRompe('equivocado', true)).toBe(true);
  });

  it('disparar al vacío rompe el combo por defecto, pero NO con FEEL ON', () => {
    expect(comboSeRompe('vacio', false)).toBe(true);
    expect(comboSeRompe('vacio', true)).toBe(false);
  });

  it('acierto y control nunca rompen el combo', () => {
    for (const r of ['acierto', 'control']) {
      expect(comboSeRompe(/** @type {any} */ (r), false)).toBe(false);
      expect(comboSeRompe(/** @type {any} */ (r), true)).toBe(false);
    }
  });
});

describe('tickWorld — FEEL gated: daño más amable y combo perdonado', () => {
  it('con feelOn, una plaga encima hace MENOS daño que sin la flag', () => {
    const mk = () => {
      const w = createWorld();
      for (const p of w.pests) { p.x = w.player.x; p.y = w.player.y; }
      return w;
    };
    const wOff = tickWorld(mk(), {});
    const wOn = tickWorld(mk(), { feelOn: true });
    // Menos daño = vitalidad más alta tras el mismo tick con plagas encima.
    expect(wOn.vitalidad).toBeGreaterThan(wOff.vitalidad);
  });

  it('con feelOn, un disparo al vacío NO rompe un combo en curso', () => {
    let w = createWorld();
    w.combo = 3;
    // Mirar lejos de toda plaga: dispara al vacío.
    w.player = { ...w.player, x: 1.2, y: 1.2, angulo: Math.PI };
    w.cooldown = 0;
    w = tickWorld(w, { fire: true, feelOn: true });
    expect(w.combo).toBe(3);
  });

  it('sin la flag, un disparo al vacío SÍ rompe el combo (comportamiento histórico)', () => {
    let w = createWorld();
    w.combo = 3;
    w.player = { ...w.player, x: 1.2, y: 1.2, angulo: Math.PI };
    w.cooldown = 0;
    w = tickWorld(w, { fire: true });
    expect(w.combo).toBe(0);
  });
});

describe('movePlayer / cambiarBenefico — utilidades', () => {
  it('no atraviesa paredes', () => {
    const player = { x: 1.2, y: 1.2, angulo: 0 };
    // moverse hacia el seto del perimetro (pared)
    const np = movePlayer(MAPA, { ...player, angulo: Math.PI }, 5, 0);
    expect(isWall(MAPA, np.x, np.y)).toBe(false);
  });

  it('cambiarBenefico solo acepta ids validos', () => {
    const w = createWorld();
    const w2 = cambiarBenefico(w, 'beauveria');
    expect(w2.beneficoEquipado).toBe('beauveria');
    const w3 = cambiarBenefico(w, 'inexistente');
    expect(w3).toBe(w);
  });
});
