/**
 * metalSlugCampoEngine — lógica PURA del "Metal Slug del campo".
 *
 * Run-and-gun agroecológico SIN violencia: el jugador recorre la finca, "combate"
 * plagas reales con CONTROL BIOLÓGICO (el arma correcta para cada plaga) y libera
 * fauna cazada. Este módulo NO dibuja ni toca el DOM: solo decide, con funciones
 * deterministas y testeables.
 *
 * REÚSA, no reinventa:
 *   - Física de salto, colisiones AABB y puntaje → `defensoresGameEngine.js`
 *     (`avanzarFisica`, `rectsOverlap`, `sumarPuntaje`, `clamp`, constantes).
 *   - Data agronómica y el par arma↔plaga REAL → `../data/metalSlugCampoData.js`
 *     (`armaControlaEnemigo`, `getEnemigo`, `getRehen`, `getNivel`).
 *
 * El corazón pedagógico vive en `resolverImpactoArma`: un disparo solo "controla"
 * la plaga si el arma es el controlador biológico CORRECTO (Bt→cogollero,
 * mariquita→pulgón, Beauveria→mosca blanca...). Con el arma equivocada la plaga
 * sobrevive y el juego enseña el par correcto. Cero invento: el par sale del data.
 *
 * Convención de coordenadas (idéntica al engine base): x crece a la derecha,
 * y crece HACIA ABAJO. Offline-safe: cero red.
 */

import { rectsOverlap, clamp, sumarPuntaje } from './defensoresGameEngine';
import { armaControlaEnemigo, getEnemigo, getNivel } from '../data/metalSlugCampoData';

/** Velocidad horizontal base del proyectil de control biológico (px/seg). */
export const PROYECTIL_VEL = 640;
/** Ancho/alto del proyectil (una "cápsula" de benéficos). */
export const PROYECTIL_W = 26;
export const PROYECTIL_H = 16;
/** Puntos al liberar un rehén (animal cazado) — el mayor premio moral del nivel. */
export const PUNTOS_REHEN = 100;
/** Puntos por plaga controlada con el arma correcta (alineado al engine base). */
export const PUNTOS_PLAGA = 25;

/**
 * Deriva el arsenal de control biológico disponible en un nivel: la unión de los
 * controladores REALES de las plagas de ese nivel (data-driven, sin invento).
 *
 * @param {number} numero  número de nivel (1..N).
 * @returns {string[]} ids de ARMAS únicos, en orden estable de aparición.
 */
export function armasDeNivel(numero) {
  const nivel = getNivel(numero);
  if (!nivel) return [];
  const vistas = new Set();
  const orden = [];
  for (const enemigoId of nivel.enemigos) {
    const e = getEnemigo(enemigoId);
    if (!e) continue;
    for (const armaId of e.controladores) {
      if (!vistas.has(armaId)) {
        vistas.add(armaId);
        orden.push(armaId);
      }
    }
  }
  return orden;
}

/**
 * Crea un proyectil de control biológico saliendo del jugador hacia `dir`.
 *
 * @param {Object} p
 * @param {number} p.x     x del centro de tiro (ej. frente del jugador).
 * @param {number} p.y     y (parte superior) del proyectil.
 * @param {1|-1} p.dir     dirección de la mira (1 derecha, -1 izquierda).
 * @param {string} p.armaId  arma activa (define qué plaga controla).
 * @param {number} [p.id]  id de instancia (para React keys); por defecto un contador.
 * @returns {{ id:number, armaId:string, dir:1|-1, x:number, y:number, w:number, h:number, vx:number }}
 */
let _proyectilSeq = 0;
export function crearProyectil({ x, y, dir, armaId, id }) {
  const d = /** @type {1 | -1} */ (dir >= 0 ? 1 : -1);
  return {
    id: id ?? (_proyectilSeq += 1),
    armaId,
    dir: d,
    x,
    y,
    w: PROYECTIL_W,
    h: PROYECTIL_H,
    vx: d * PROYECTIL_VEL,
  };
}

/**
 * Avanza un proyectil un tick. Devuelve el proyectil movido, o `null` si salió
 * del mundo (para que la UI lo descarte).
 *
 * @param {{x:number,vx:number,w:number}} p
 * @param {number} dt        delta en segundos.
 * @param {number} mundoW    ancho del mundo (límite derecho).
 * @returns {Object|null}
 */
export function avanzarProyectil(p, dt, mundoW) {
  const x = p.x + p.vx * dt;
  if (x + p.w < 0 || x > mundoW) return null;
  return { ...p, x };
}

/**
 * EL CORAZÓN: resuelve el impacto de un proyectil contra las plagas vivas.
 *
 * Recorre las plagas y busca la PRIMERA viva que solape con el proyectil.
 *   - Si el arma es el controlador CORRECTO de esa plaga → la plaga queda
 *     controlada (`vivo:false`) y `impacto.correcto = true`.
 *   - Si el arma es la EQUIVOCADA → la plaga SOBREVIVE (control biológico es
 *     específico, no un insecticida universal) y `impacto.correcto = false`:
 *     la UI aprovecha para enseñar el par correcto.
 *   - Sin solape con ninguna plaga viva → `impacto: null` (el tiro sigue/expira).
 *
 * En ambos casos de solape el proyectil se considera consumido (la UI lo quita).
 *
 * @param {{x:number,y:number,w:number,h:number,armaId:string}} proyectil
 * @param {Array<{id:(string|number),enemigoId:string,x:number,y:number,w:number,h:number,vivo:boolean}>} plagas
 * @returns {{ plagas: Array, impacto: null | { id:(string|number), enemigoId:string, correcto:boolean } }}
 */
export function resolverImpactoArma(proyectil, plagas) {
  for (let i = 0; i < plagas.length; i += 1) {
    const plaga = plagas[i];
    if (!plaga.vivo) continue;
    if (!rectsOverlap(proyectil, plaga)) continue;
    const correcto = armaControlaEnemigo(proyectil.armaId, plaga.enemigoId);
    const plagasNext = correcto
      ? plagas.map((p, j) => (j === i ? { ...p, vivo: false } : p))
      : plagas;
    return {
      plagas: plagasNext,
      impacto: { id: plaga.id, enemigoId: plaga.enemigoId, correcto },
    };
  }
  return { plagas, impacto: null };
}

/**
 * ¿El jugador alcanza al rehén (animal cazado) para liberarlo?
 * Puro solape AABB; la UI dispara el mensaje de conservación al liberarlo.
 *
 * @param {{x:number,y:number,w:number,h:number}} jugador
 * @param {?{x:number,y:number,w:number,h:number,liberado:boolean}} rehen
 * @returns {boolean} true solo si el rehén existe, no está liberado y hay contacto.
 */
export function alcanzaRehen(jugador, rehen) {
  if (!rehen || rehen.liberado) return false;
  return rectsOverlap(jugador, rehen);
}

/**
 * Patrulla horizontal simple y determinista de una plaga entre [xMin, xMax].
 * Rebota en los bordes (invierte `dir`). Sin aleatoriedad → testeable.
 *
 * @param {{x:number,dir:1|-1,vel:number}} plaga
 * @param {number} dt
 * @param {number} xMin
 * @param {number} xMax
 * @returns {{ x:number, dir:1|-1 }}
 */
export function patrullarPlaga(plaga, dt, xMin, xMax) {
  let dir = /** @type {1 | -1} */ (plaga.dir >= 0 ? 1 : -1);
  let x = plaga.x + dir * plaga.vel * dt;
  if (x <= xMin) {
    x = xMin;
    dir = 1;
  } else if (x >= xMax) {
    x = xMax;
    dir = -1;
  }
  return { x, dir };
}

/**
 * Evalúa el fin del nivel del Metal Slug del campo.
 *
 * Gana cuando controló TODAS las plagas y liberó al rehén. Pierde si la energía
 * llega a 0. (El jefe estructural queda para niveles siguientes; el nivel 1 del
 * prototipo cierra con plagas + rehén.)
 *
 * @param {Object} p
 * @param {number} p.energia
 * @param {number} p.plagasVivas
 * @param {boolean} p.rehenLiberado
 * @returns {{ estado:'jugando'|'gano'|'perdio', razon:string }}
 */
export function evaluarFinCampo({ energia, plagasVivas, rehenLiberado }) {
  if (energia <= 0) {
    return { estado: 'perdio', razon: 'Se quedó sin energía. Vuelva a intentarlo, la finca lo espera.' };
  }
  if (plagasVivas <= 0 && rehenLiberado) {
    return {
      estado: 'gano',
      razon: 'Cuidó la huerta con control biológico y liberó al animal. Así se cuida el campo.',
    };
  }
  return { estado: 'jugando', razon: '' };
}

// Re-export utilidades del engine base para que el componente importe de un solo lugar.
export { clamp, sumarPuntaje, rectsOverlap };
