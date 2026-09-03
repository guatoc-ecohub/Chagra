/**
 * defensoresGameEngine — lógica PURA del minijuego plataformero
 * "Defensores de la Finca". Sin React, sin canvas, sin DOM: solo funciones
 * deterministas y testeables (colisiones, control biológico, puntaje, física
 * de salto). El componente de UI dibuja; este módulo decide.
 *
 * Convención de coordenadas: x crece a la derecha, y crece HACIA ABAJO (como en
 * canvas). El "suelo" está en groundY; saltar resta a y (sube).
 *
 * Offline-safe: cero red. Todo cálculo es local.
 */

import { BENEFICO_CONTROLA } from '../components/juego/defensoresFincaData';

export const GRAVITY = 0.9;
export const JUMP_VELOCITY = -15;
export const MOVE_SPEED = 4.2;

/** Limita un valor al rango [min, max]. */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Detecta solape entre dos rectángulos AABB.
 * @param {{x:number,y:number,w:number,h:number}} a
 * @param {{x:number,y:number,w:number,h:number}} b
 * @returns {boolean}
 */
export function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/**
 * ¿El benéfico invocado controla a esta plaga? (relación CONTROLS real).
 * @param {string} beneficoId  id del organismo benéfico.
 * @param {string} plagaId     id de la plaga objetivo.
 * @returns {boolean} true solo si es el controlador correcto y agronómico.
 */
export function beneficoControlaPlaga(beneficoId, plagaId) {
  return BENEFICO_CONTROLA[beneficoId] === plagaId;
}

/**
 * Aplica un benéfico al campo: elimina SOLO las plagas que ese benéfico
 * controla de verdad. Las demás plagas siguen vivas (no es un insecticida
 * universal — es control biológico específico).
 *
 * @param {Array<{id:string, plagaId:string, alive:boolean}>} plagas
 * @param {string} beneficoId
 * @returns {{ plagas: Array, eliminadas: number, plagaId: string|null }}
 */
export function aplicarBenefico(plagas, beneficoId) {
  const objetivo = BENEFICO_CONTROLA[beneficoId] || null;
  let eliminadas = 0;
  const next = plagas.map((p) => {
    if (p.alive && p.plagaId === objetivo) {
      eliminadas += 1;
      return { ...p, alive: false };
    }
    return p;
  });
  return { plagas: next, eliminadas, plagaId: objetivo };
}

/**
 * Resuelve la colisión del jugador con las plagas vivas.
 * Tocar una plaga sin haberla controlado = perder 1 de energía y volverse
 * "invulnerable" un instante (lo maneja la UI con invulnUntil). Una plaga que
 * ya golpeó no vuelve a restar hasta que el jugador salga de ella.
 *
 * @param {{x:number,y:number,w:number,h:number}} jugador
 * @param {Array<{id:string,x:number,y:number,w:number,h:number,alive:boolean}>} plagas
 * @param {boolean} invulnerable  si true, no resta energía (parpadeo post-golpe).
 * @returns {{ golpe: boolean, plagaId: string|null }}
 */
export function resolverColisionPlagas(jugador, plagas, invulnerable) {
  if (invulnerable) return { golpe: false, plagaId: null };
  for (const p of plagas) {
    if (p.alive && rectsOverlap(jugador, p)) {
      return { golpe: true, plagaId: p.id };
    }
  }
  return { golpe: false, plagaId: null };
}

/**
 * Resuelve la recolección de cultivos: el jugador "recoge" cada cultivo que
 * toca y aún no haya recogido. Devuelve los ids recogidos en este paso.
 *
 * @param {{x:number,y:number,w:number,h:number}} jugador
 * @param {Array<{id:string,x:number,y:number,w:number,h:number,recogido:boolean}>} cultivos
 * @returns {{ cultivos: Array, recogidos: string[] }}
 */
export function recolectarCultivos(jugador, cultivos) {
  const recogidos = [];
  const next = cultivos.map((c) => {
    if (!c.recogido && rectsOverlap(jugador, c)) {
      recogidos.push(c.id);
      return { ...c, recogido: true };
    }
    return c;
  });
  return { cultivos: next, recogidos };
}

/** Puntos por cada cultivo recogido. */
export const PUNTOS_CULTIVO = 10;
/** Puntos por cada plaga controlada con el benéfico correcto. */
export const PUNTOS_PLAGA_CONTROLADA = 25;

/**
 * Calcula el nuevo puntaje tras recoger cultivos y/o controlar plagas.
 * @param {number} actual
 * @param {{ cultivos?: number, plagas?: number }} delta
 * @returns {number}
 */
export function sumarPuntaje(actual, { cultivos = 0, plagas = 0 } = {}) {
  return actual + cultivos * PUNTOS_CULTIVO + plagas * PUNTOS_PLAGA_CONTROLADA;
}

/**
 * Avanza la física vertical del jugador un tick (salto + gravedad + suelo).
 * @param {{ y:number, vy:number, onGround:boolean }} estado
 * @param {number} groundY  coordenada y del suelo para los pies del jugador.
 * @param {number} altura   alto del jugador.
 * @returns {{ y:number, vy:number, onGround:boolean }}
 */
export function avanzarFisica(estado, groundY, altura) {
  let { y, vy } = estado;
  vy += GRAVITY;
  y += vy;
  const pisoY = groundY - altura;
  let onGround = false;
  if (y >= pisoY) {
    y = pisoY;
    vy = 0;
    onGround = true;
  }
  return { y, vy, onGround };
}

/**
 * ¿La posición x del jugador (centro) cae dentro de un hueco del suelo?
 * Si está sobre un hueco, el "piso" deja de existir ahí. Útil para que el motor
 * decida si el jugador puede caer (nivel 2: huecos = obstáculo).
 *
 * @param {number} centroX  x del centro del jugador en coords del MUNDO.
 * @param {Array<{x:number,w:number}>} huecos  tramos vacíos del suelo.
 * @returns {boolean}
 */
export function sobreHueco(centroX, huecos) {
  if (!huecos || huecos.length === 0) return false;
  return huecos.some((h) => centroX >= h.x && centroX <= h.x + h.w);
}

/**
 * Física vertical sobre terreno con plataformas y huecos (nivel 2).
 *
 * El jugador aterriza en el suelo (groundY) salvo que esté sobre un hueco; y
 * puede aterrizar ENCIMA de una plataforma SOLO si viene cayendo (vy > 0) y sus
 * pies cruzan la superficie superior de la plataforma. Una vez bajo el suelo
 * (cayó por un hueco), `caido` es true y la UI aplica el daño.
 *
 * @param {{x:number,y:number,w:number,h:number,vy:number}} estado
 * @param {number} groundY
 * @param {Array<{x:number,y:number,w:number}>} plataformas  y = top absoluto en coords mundo.
 * @param {Array<{x:number,w:number}>} huecos
 * @param {number} mundoAlto  alto total del mundo (umbral de caída fatal).
 * @returns {{ x:number,y:number,vy:number,onGround:boolean,caido:boolean }}
 */
export function avanzarFisicaTerreno(estado, groundY, plataformas, huecos, mundoAlto) {
  const { x, w, h } = estado;
  let { y, vy } = estado;
  const yAntes = y;
  vy += GRAVITY;
  y += vy;
  let onGround = false;
  let caido = false;

  // 1) Plataformas: solo se aterriza encima si venía cayendo y cruza el top.
  if (vy > 0 && plataformas && plataformas.length > 0) {
    const piesAntes = yAntes + h;
    const piesAhora = y + h;
    for (const p of plataformas) {
      const solapaX = x + w > p.x && x < p.x + p.w;
      const cruzaTop = piesAntes <= p.y && piesAhora >= p.y;
      if (solapaX && cruzaTop) {
        y = p.y - h;
        vy = 0;
        onGround = true;
        return { x, y, vy, onGround, caido: false };
      }
    }
  }

  // 2) Suelo, salvo que el centro del jugador esté sobre un hueco.
  const centroX = x + w / 2;
  const enHueco = sobreHueco(centroX, huecos);
  const pisoY = groundY - h;
  if (!enHueco && y >= pisoY) {
    y = pisoY;
    vy = 0;
    onGround = true;
  }

  // 3) Caída fatal por el hueco: pasó el fondo del mundo.
  if (y + h >= mundoAlto) {
    caido = true;
  }

  return { x, y, vy, onGround, caido };
}

/**
 * Aplica un golpe de benéfico al mini-jefe. Solo el controlador REAL del jefe
 * le quita vida (control biológico: la mantis derriba la langosta, nadie más).
 *
 * @param {?{plagaId:string, vida:number, vivo:boolean}} jefe
 * @param {string} beneficoId
 * @returns {{ jefe: Object|null, golpeo: boolean, derrotado: boolean }}
 */
export function golpearJefe(jefe, beneficoId) {
  if (!jefe || !jefe.vivo) return { jefe, golpeo: false, derrotado: false };
  if (!beneficoControlaPlaga(beneficoId, jefe.plagaId)) {
    return { jefe, golpeo: false, derrotado: false };
  }
  const vida = Math.max(0, jefe.vida - 1);
  const vivo = vida > 0;
  return {
    jefe: { ...jefe, vida, vivo },
    golpeo: true,
    derrotado: !vivo,
  };
}

/**
 * Aplica un salto si el jugador está en el suelo (no doble salto).
 * @param {{ vy:number, onGround:boolean }} estado
 * @returns {{ vy:number, onGround:boolean, salto:boolean }}
 */
export function intentarSalto(estado) {
  if (estado.onGround) {
    return { vy: JUMP_VELOCITY, onGround: false, salto: true };
  }
  return { vy: estado.vy, onGround: estado.onGround, salto: false };
}

/**
 * Resume el PROGRESO del nivel para el HUD: cuántos cultivos van de la meta,
 * cuántas plagas quedan por controlar y, si hay mini-jefe, si sigue vivo.
 *
 * Es la pieza que faltaba para que el jugador (un niño, un campesino) ENTIENDA
 * qué le falta para ganar — antes el HUD solo mostraba energía y puntos, así que
 * el objetivo quedaba implícito. Lógica PURA y testeable; la UI solo lo pinta.
 *
 * @param {Object} p
 * @param {number} p.cultivosRecogidos
 * @param {number} p.metaCultivos
 * @param {number} p.plagasVivas
 * @param {boolean} [p.hayJefe=false]
 * @param {boolean} [p.jefeVivo=false]
 * @returns {{
 *   cultivos: { hechos:number, meta:number, listo:boolean },
 *   plagas:   { restantes:number, listo:boolean },
 *   jefe:     { hay:boolean, vivo:boolean, listo:boolean },
 *   todoListo: boolean,
 * }}
 */
export function resumenObjetivos(opts = /** @type {any} */ ({})) {
  const {
    cultivosRecogidos = 0,
    metaCultivos = 0,
    plagasVivas = 0,
    hayJefe = false,
    jefeVivo = false,
  } = opts;
  const hechos = clamp(cultivosRecogidos, 0, metaCultivos);
  const cultivosListo = cultivosRecogidos >= metaCultivos;
  const plagasListo = plagasVivas <= 0;
  const jefeListo = !hayJefe || !jefeVivo;
  return {
    cultivos: { hechos, meta: metaCultivos, listo: cultivosListo },
    plagas: { restantes: Math.max(0, plagasVivas), listo: plagasListo },
    jefe: { hay: !!hayJefe, vivo: !!jefeVivo, listo: jefeListo },
    todoListo: cultivosListo && plagasListo && jefeListo,
  };
}

/**
 * Factor de dificultad de patrulla de plagas (FEEL, gated dev-only).
 *
 * Las plagas patrullan a `vel` base. En los niveles altos, con muchas plagas y
 * terreno con altura, el ritmo puede sentirse caótico para un niño. Este factor
 * RALENTIZA un poco la patrulla en los niveles tardíos para una curva de
 * dificultad más amable, sin tocar la del nivel 1 (que ya es suave).
 *
 * Solo se aplica con la flag de FEEL encendida (lo decide la UI); con la flag
 * apagada la UI usa 1 → patrulla EXACTA como hoy.
 *
 * @param {number} numero  número de nivel (1..4).
 * @returns {number} multiplicador de velocidad de patrulla en [0,1].
 */
export function factorPatrulla(numero) {
  // 1 → 1.0, 2 → 0.95, 3 → 0.9, 4 → 0.85: cada nivel afina un pelín el ritmo.
  const f = 1 - Math.max(0, (numero || 1) - 1) * 0.05;
  return clamp(f, 0.8, 1);
}

/**
 * Evalúa el estado de fin de nivel.
 *
 * Gana al recoger la meta de cultivos Y controlar todas las plagas Y, si el
 * nivel tiene mini-jefe, derrotarlo. Pierde si la energía llega a 0.
 *
 * @param {Object} params
 * @param {number} params.energia       energía restante (<=0 = pierde).
 * @param {number} params.cultivosRecogidos
 * @param {number} params.metaCultivos  cuántos hace falta recoger.
 * @param {number} params.plagasVivas   plagas que siguen sin controlar.
 * @param {boolean} [params.hayJefe=false]    si el nivel tiene mini-jefe.
 * @param {boolean} [params.jefeVivo=false]   si el mini-jefe sigue vivo.
 * @returns {{ estado: 'jugando'|'gano'|'perdio', razon: string }}
 */
export function evaluarFinNivel({
  energia,
  cultivosRecogidos,
  metaCultivos,
  plagasVivas,
  hayJefe = false,
  jefeVivo = false,
}) {
  if (energia <= 0) {
    return { estado: 'perdio', razon: 'Te quedaste sin energía. ¡Inténtalo otra vez!' };
  }
  const cultivosListos = cultivosRecogidos >= metaCultivos;
  const plagasLimpias = plagasVivas === 0;
  const jefeListo = !hayJefe || !jefeVivo;
  if (cultivosListos && plagasLimpias && jefeListo) {
    return { estado: 'gano', razon: '¡Cosechaste la finca y la cuidaste con control biológico!' };
  }
  return { estado: 'jugando', razon: '' };
}
