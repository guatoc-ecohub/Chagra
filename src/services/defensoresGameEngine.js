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
 * Evalúa el estado de fin de nivel.
 * @param {Object} params
 * @param {number} params.energia       energía restante (<=0 = pierde).
 * @param {number} params.cultivosRecogidos
 * @param {number} params.metaCultivos  cuántos hace falta recoger.
 * @param {number} params.plagasVivas   plagas que siguen sin controlar.
 * @returns {{ estado: 'jugando'|'gano'|'perdio', razon: string }}
 */
export function evaluarFinNivel({ energia, cultivosRecogidos, metaCultivos, plagasVivas }) {
  if (energia <= 0) {
    return { estado: 'perdio', razon: 'Te quedaste sin energía. ¡Inténtalo otra vez!' };
  }
  if (cultivosRecogidos >= metaCultivos && plagasVivas === 0) {
    return { estado: 'gano', razon: '¡Cosechaste la finca y la cuidaste con control biológico!' };
  }
  return { estado: 'jugando', razon: '' };
}
