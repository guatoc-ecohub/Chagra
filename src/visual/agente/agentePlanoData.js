/*
 * agentePlanoData — reloj y geometría del CRUCE DEL AGENTE 3D → PLANO, en
 * datos puros (cero DOM, cero three). Es la mitad "de datos" de
 * AgentePlanoTransicion.jsx.
 *
 * QUÉ ES ESTE CRUCE
 * Hoy, cuando el valle 3D abre una pantalla plana (TunelLamina 'saliendo'),
 * el compañero NO viaja: la criatura 3D muere con el canvas y la burbuja 2D
 * nace aparte — dos almas, cero puente. Este módulo cronometra el puente:
 * la abeja se CLAVA al túnel junto con la hoja, cruza el destello convertida
 * en COMETA de luz, sale del otro lado, ATERRIZA sobre el vidrio de la
 * pantalla plana (squash & stretch) y SE APLANA hasta ser el avatar plano.
 * Una sola alma que cruza de capa — el mismo principio que AbejaTransicion
 * cerró para el cruce valle ↔ mundo, ahora para 3D → pantalla de la gente.
 *
 * HERENCIA DEL LENGUAJE (tunelLaminaData/velosData — no duplicar, importar):
 *   · el reloj del agente se DERIVA del reloj del túnel: si el túnel cambia,
 *     el agente lo sigue solo (una sola fuente de verdad temporal);
 *   · la abeja es tragada EXACTAMENTE en `momentoCubiertoTunel` — el mismo
 *     instante en que el host intercambia las pantallas debajo del destello;
 *   · misma asimetría: posarse (ir a lo plano) respira; alzarse (volver al
 *     mundo) monta sobre el túnel 'entrando' y no se demora de más;
 *   · tier bajo acorta con FACTOR_TIER_BAJO; reduced-motion colapsa a corte
 *     digno (nada se monta, los callbacks disparan de inmediato).
 *
 * GEOMETRÍA: dos tramos rectos que el CSS curva con doble eje (x e y con
 * easings distintos = arco). Tramo IDA: de la percha del compañero a la BOCA
 * del túnel (centro, FUGA_Y — el mismo punto de fuga de la hoja). Tramo
 * LLEGADA: de la boca al ancla del agente plano (la esquina donde vive el
 * compAI en toda pantalla). `varsDeCruce` lo calcula como función pura para
 * poder testearlo sin montar nada.
 */
import {
  FUGA_Y,
  duracionTunel,
  momentoCubiertoTunel,
} from '../mundo3d/transiciones/tunelLaminaData.js';
import { FACTOR_TIER_BAJO } from '../mundo3d/transiciones/velosData.js';

/** El sentido del cruce → la fase del túnel que corre debajo (una fuente). */
export const FASE_TUNEL_POR_SENTIDO = Object.freeze({
  posar: 'saliendo', // 3D → pantalla plana: el túnel escupe hacia el cuaderno
  alzar: 'entrando', // plano → 3D: la lámina vuelve a tragar hacia el mundo
});

/** Empalme final (ms): el overlay se funde ENCIMA del avatar plano real ya
    revelado — el pequeño solape es a propósito (cubre el relevo de capas sin
    hueco, mismo contrato que CRUCE_SUELTA_MS en AbejaTransicion). */
export const EMPALME_MS = 180;

/** El aplane (ms, tier alto): la abeja ya posada se PRESIONA contra el vidrio
    (rotateX que colapsa, la sombra se funde con ella, una onda en el cristal)
    y queda plana — el momento conceptual del cruce. Solo al posar. */
export const APLANE_MS = 360;

/** Tamaño de la abeja en vuelo (px) y tope del avatar posado. */
export const LADO_VUELO = 76;
export const LADO_POSADA_MIN = 40;
export const LADO_POSADA_MAX = 64;

/** El ancla del agente plano en las pantallas de la gente: la esquina del
    compAI (AgentFab). Margen y lado compartidos con quien pinte el avatar
    receptor, para que el aterrizaje sea píxel-exacto. */
export const FAB_MARGEN_DER = 18;
export const FAB_MARGEN_ABAJO = 92;
export const FAB_LADO = 56;

/**
 * Rect por defecto donde vive el agente plano (esquina inferior derecha),
 * cuando el host no presta el rect real de su avatar.
 * @param {{ancho:number, alto:number}} viewport
 * @returns {{x:number, y:number, width:number, height:number}}
 */
export function destinoFabPorDefecto(viewport) {
  const vw = Math.max(1, viewport?.ancho || 1);
  const vh = Math.max(1, viewport?.alto || 1);
  return {
    x: vw - FAB_MARGEN_DER - FAB_LADO,
    y: vh - FAB_MARGEN_ABAJO - FAB_LADO,
    width: FAB_LADO,
    height: FAB_LADO,
  };
}

/**
 * EL RELOJ del cruce, derivado del reloj del túnel (ms desde el arranque).
 * Todos los instantes que el CSS anima "a ciegas" y los timers JS disparan:
 *
 *   ida      0 → cubierto      la llamada + el clavado (muere SECA al cubierto)
 *   cometa   ~cubierto → …     la estela de luz que cruza el destello
 *   llegada  salida → posada   el arco de frenado + aterrizaje + asentado
 *   aplane   (solo posar)      presión contra el vidrio, sombra que se funde
 *   posada                     instante de `onPosada` (el host revela su avatar)
 *   total                      instante de `onFin` (el overlay ya se fundió)
 *
 * @param {'posar'|'alzar'} sentido
 * @param {'alto'|'medio'|'bajo'} tier
 * @param {boolean} reducedMotion
 */
export function relojAgentePlano(sentido, tier, reducedMotion) {
  if (reducedMotion) {
    // Corte digno: nada se anima; posada y fin son inmediatos.
    return { ida: 0, cometaIni: 0, cometaMs: 0, salida: 0, vuelo2Ms: 0, aplaneMs: 0, posada: 0, total: 0 };
  }
  const fase = FASE_TUNEL_POR_SENTIDO[sentido] || 'saliendo';
  const cub = momentoCubiertoTunel(fase, tier, false);
  const fin = duracionTunel(fase, tier, false);
  const k = tier === 'bajo' ? FACTOR_TIER_BAJO : 1;

  const ida = cub;
  const cometaIni = Math.max(0, cub - 60);
  const cometaMs = Math.round((fin - cub) * 0.78);
  const salida = Math.round(fin * 0.78);
  // Asimetría: posarse frena con calma (0.53·fin); alzarse no se demora (0.42).
  const vuelo2Ms = Math.round(fin * (sentido === 'posar' ? 0.53 : 0.42));
  const aplaneMs = sentido === 'posar' ? Math.round(APLANE_MS * k) : 0;
  const posada = salida + vuelo2Ms + aplaneMs;
  const total = posada + Math.round(EMPALME_MS * k);
  return { ida, cometaIni, cometaMs, salida, vuelo2Ms, aplaneMs, posada, total };
}

/**
 * LA GEOMETRÍA del cruce: puntos y deltas de los dos tramos, listos para ser
 * variables CSS. Centros de rect; sin `desde` la abeja parte de un costado
 * digno; sin `hasta` aterriza en la esquina del compAI.
 *
 * @param {{x:number,y:number,width:number,height:number}|null} desde
 *   rect del compañero en el 3D (o del avatar plano, al alzar).
 * @param {{x:number,y:number,width:number,height:number}|null} hasta
 *   rect del ancla de llegada.
 * @param {{ancho:number, alto:number}} viewport
 * @returns {{
 *   x0:number, y0:number, bx:number, by:number, x1:number, y1:number,
 *   dxIda:number, dyIda:number, dxLleg:number, dyLleg:number,
 *   ang:number, ladoPosada:number
 * }}
 */
export function varsDeCruce(desde, hasta, viewport) {
  const vw = Math.max(1, viewport?.ancho || 1);
  const vh = Math.max(1, viewport?.alto || 1);
  // La boca del túnel: el mismo punto de fuga de la hoja (centro, 46% de alto).
  const bx = vw / 2;
  const by = vh * FUGA_Y;

  const centro = (r) => ({ cx: r.x + r.width / 2, cy: r.y + r.height / 2 });
  const o = desde ? centro(desde) : { cx: vw * 0.3, cy: vh * 0.42 };
  const fab = destinoFabPorDefecto({ ancho: vw, alto: vh });
  const d = hasta ? centro(hasta) : centro(fab);

  const dxLleg = d.cx - bx;
  const dyLleg = d.cy - by;
  const ang = Math.atan2(dyLleg, dxLleg) * (180 / Math.PI);
  const ladoHasta = hasta ? Math.min(hasta.width, hasta.height) : FAB_LADO;
  const ladoPosada = Math.max(LADO_POSADA_MIN, Math.min(LADO_POSADA_MAX, ladoHasta));

  return {
    x0: o.cx,
    y0: o.cy,
    bx,
    by,
    x1: d.cx,
    y1: d.cy,
    dxIda: bx - o.cx,
    dyIda: by - o.cy,
    dxLleg,
    dyLleg,
    ang,
    ladoPosada,
  };
}
