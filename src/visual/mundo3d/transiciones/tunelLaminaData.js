/*
 * tunelLaminaData — reloj y geometría del TÚNEL ODYSSEY 2D↔3D, en datos puros
 * (cero DOM, cero three). Es la mitad "de datos" de TunelLamina.jsx.
 *
 * QUÉ ES ESTE CRUCE
 * El referente es el tubo de Odyssey: uno está frente a una LÁMINA plana (una
 * hoja del cuaderno de campo, un mural, un portal 2D), la toca, y la hoja lo
 * TRAGA — la lámina despega de la página, se incrusta en la pantalla, un túnel
 * de anillos pasa de largo y la luz del mundo destino lo recibe en 3D. Al
 * volver, el túnel lo escupe de regreso y la hoja ATERRIZA de nuevo en su
 * lugar del cuaderno, como si nunca hubiera despegado.
 *
 * HERENCIA DEL LENGUAJE (velosData.js — no duplicar, importar):
 *   · misma anatomía: 0–14% anticipación · 14–46% lanzamiento · 46–62% meseta
 *     (onCubierto al 54%) · 62–100% resolución;
 *   · misma asimetría: entrar descubre (más largo, overshoot), volver regresa
 *     (más corto, exhala sin rebote);
 *   · mismos colores: la tríada del velo del DESTINO (familiaDeVelo) tiñe
 *     anillos y destello — entrar al microsuelo es marrón tierra, al bosque
 *     verde hoja, a la sierra niebla, a casa luz dorada;
 *   · mismo contrato temporal: timers JS deterministas, NUNCA `animationend`.
 *
 * GEOMETRÍA (lo nuevo de esta pieza): el vuelo de la hoja es un FLIP clásico —
 * el elemento se maqueta ESTÁTICO en el rect de la lámina de origen y el viaje
 * es solo `transform: translate(dx,dy) scale(s)` hacia el centro de la
 * pantalla (compositor puro: nada de animar layout). `varsDeTunel` calcula
 * ese transform; es función pura para poder testearla sin montar nada.
 */
import { veloDeDestino, REDUCIDA_MS, CUBIERTO_REDUCIDA_MS, FACTOR_TIER_BAJO, CUBIERTO_FRAC } from './velosData.js';

/** Duración total del cruce por fase (ms, tier alto/medio). Asimetría Odyssey:
 *  entrar respira más largo (descubrir pesa); volver exhala corto (ya es casa). */
export const TUNEL_MS = { entrando: 1550, saliendo: 1200 };

/** La hoja no crece hasta el infinito ni se queda tímida: escala final acotada. */
export const ESCALA_HOJA_MIN = 1.35;
export const ESCALA_HOJA_MAX = 18;

/** Fracción del viewport que la hoja ambiciona cubrir al final del vuelo. */
export const AMBICION_HOJA = 0.92;

/** Altura relativa del punto de fuga (46%: el mismo horizonte del lenguaje). */
export const FUGA_Y = 0.46;

/**
 * Duración total del cruce en ms (tier bajo acorta, reduced-motion colapsa).
 * @param {'entrando'|'saliendo'} fase
 * @param {'alto'|'medio'|'bajo'} tier
 * @param {boolean} reducedMotion
 */
export function duracionTunel(fase, tier, reducedMotion) {
  if (reducedMotion) return REDUCIDA_MS;
  const base = TUNEL_MS[fase === 'saliendo' ? 'saliendo' : 'entrando'];
  return tier === 'bajo' ? Math.round(base * FACTOR_TIER_BAJO) : base;
}

/**
 * Momento (ms desde el arranque) de `onCubierto` — centro de la meseta.
 * Es AQUÍ donde el host intercambia lámina 2D ↔ escena 3D debajo del túnel.
 */
export function momentoCubiertoTunel(fase, tier, reducedMotion) {
  if (reducedMotion) return CUBIERTO_REDUCIDA_MS;
  return Math.round(duracionTunel(fase, tier, reducedMotion) * CUBIERTO_FRAC);
}

/**
 * Normaliza un origen a rect plano {x, y, width, height} (o null).
 * Acepta: un DOMRect/objeto rect, un elemento DOM (getBoundingClientRect),
 * o un evento con `currentTarget`. Nunca lanza: origen raro → null (la hoja
 * arrancará centrada — el fallback digno).
 * @param {any} origen
 * @returns {{x:number, y:number, width:number, height:number} | null}
 */
export function rectDeOrigen(origen) {
  if (!origen) return null;
  const el =
    typeof origen.getBoundingClientRect === 'function'
      ? origen
      : origen.currentTarget && typeof origen.currentTarget.getBoundingClientRect === 'function'
        ? origen.currentTarget
        : null;
  const r = el ? el.getBoundingClientRect() : origen;
  const { width, height } = r;
  if (!(width > 0) || !(height > 0)) return null;
  const x = Number.isFinite(r.x) ? r.x : r.left;
  const y = Number.isFinite(r.y) ? r.y : r.top;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y, width, height };
}

/**
 * El transform del vuelo (FLIP): cuánto trasladar y escalar la hoja, maquetada
 * en su rect de origen, para que termine grande y centrada en el punto de fuga.
 * @param {{x:number, y:number, width:number, height:number} | null} rect
 * @param {{ancho:number, alto:number}} viewport
 * @returns {{dx:number, dy:number, s:number, rect:{x:number,y:number,width:number,height:number}}}
 *   `rect` es el de origen, o el fallback centrado si no hubo origen.
 */
export function varsDeTunel(rect, viewport) {
  const vw = Math.max(1, viewport?.ancho || 1);
  const vh = Math.max(1, viewport?.alto || 1);
  let r = rect;
  if (!r) {
    // Sin origen: la hoja nace centrada, chica (44% del lado corto), y vuela igual.
    const lado = 0.44 * Math.min(vw, vh);
    r = { x: vw / 2 - lado / 2, y: vh * FUGA_Y - lado / 2, width: lado, height: lado };
  }
  const s = Math.min(
    ESCALA_HOJA_MAX,
    Math.max(ESCALA_HOJA_MIN, AMBICION_HOJA * Math.min(vw / r.width, vh / r.height)),
  );
  const dx = vw / 2 - (r.x + r.width / 2);
  const dy = vh * FUGA_Y - (r.y + r.height / 2);
  return { dx, dy, s, rect: r };
}

/** La tríada de colores del cruce: la del velo del destino (una sola fuente). */
export const tintaDeTunel = (destino) => veloDeDestino(destino);
