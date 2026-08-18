/**
 * jaguarLamina/marcha — el MOTOR del gait cuadrúpedo: ciclo de marcha con
 * pisada anclada (foot-plant) + IK analítico de 2 huesos por pata.
 *
 * Funciones PURAS sobre coordenadas de lámina (705×394) — sin DOM, sin
 * estado: `JaguarLaminaViva.jsx` las llama en su rAF y escribe el resultado
 * como vars CSS; los tests las verifican solas en jsdom.
 *
 * EL MÉTODO (por qué esto no deforma el dibujo):
 *   · Cada pata es una cadena articulación (hombro/cadera) → rodilla → pie
 *     con los puntos MEDIDOS de `anatomia.js` (`RIG_MARCHA`). El arte se
 *     parte en dos segmentos rígidos por la rodilla (capas.js) y aquí solo se
 *     calculan DOS ROTACIONES (cadera y rodilla): rotar piezas rígidas por
 *     hueso nunca estira ni deforma el trazo — es el mismo principio del
 *     papel articulado.
 *   · El pie sigue un ciclo de marcha real: APOYO (el pie queda CLAVADO en el
 *     suelo mientras el cuerpo avanza — hacia atrás en coordenadas del
 *     cuerpo, a la velocidad exacta del desplazamiento) y VUELO (adelanta con
 *     arco de levantamiento). El período se deriva de la velocidad real de
 *     pantalla (`periodoMarcha`) para que apoyo y desplazamiento casen 1:1 —
 *     sin eso el pie "patina" (moonwalk).
 *   · El IK resuelve las dos rotaciones para que el pie caiga en el objetivo,
 *     con el vértice de flexión del lado anatómico correcto (`lado`:
 *     delanteras doblan el carpo con vértice adelante, traseras el corvejón
 *     con vértice atrás). Sobre el pie de REPOSO devuelve ~0°/0° (verificado
 *     en marcha.test.js): entrar y salir de la marcha no da tirón.
 *
 * @module visual/creatures/jaguarLamina/marcha
 */
import { RIG_MARCHA, MARCHA } from './anatomia.js';

const GRADOS = 180 / Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ssuave = (t) => { const u = clamp(t, 0, 1); return u * u * (3 - 2 * u); };
const largo = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Rig derivado: largos de hueso, ángulos de reposo y piso de distancia del
 *  tope de flexión (`plieMax` → `dMin`, ley del coseno sobre el ángulo
 *  interior de reposo) por pata — una sola vez. */
export const PATAS = Object.fromEntries(
  Object.entries(RIG_MARCHA).map(([clave, rig]) => {
    const L1 = largo(rig.articulacion, rig.rodilla);
    const L2 = largo(rig.rodilla, rig.pie);
    const a1Reposo = Math.atan2(rig.rodilla[1] - rig.articulacion[1], rig.rodilla[0] - rig.articulacion[0]);
    const a2Reposo = Math.atan2(rig.pie[1] - rig.rodilla[1], rig.pie[0] - rig.rodilla[0]);
    const dReposo = largo(rig.articulacion, rig.pie);
    const thReposo = Math.acos(clamp(
      (L1 * L1 + L2 * L2 - dReposo * dReposo) / (2 * L1 * L2), -1, 1,
    ));
    const thMin = thReposo - (rig.plieMax || 60) / GRADOS;
    const dMin = Math.sqrt(Math.max(0, L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos(thMin)));
    return [clave, { ...rig, clave, L1, L2, a1Reposo, a2Reposo, dMin }];
  }),
);

/**
 * IK analítico de 2 huesos: dadas las longitudes y el objetivo del pie,
 * devuelve las rotaciones (en grados, relativas al REPOSO) de cadera y
 * rodilla. `rodilla` es relativa al segmento superior (los wrappers CSS van
 * anidados: rodilla dentro de cadera — cadena FK estándar).
 *
 * Si el objetivo queda fuera de alcance —o MÁS CERCA de lo que permite el
 * tope de flexión `plieMax` (el piso `dMin`)— se proyecta el objetivo sobre
 * la misma recta articulación→objetivo y se resuelve hacia el proyectado:
 * la pata se estira o deja de plegarse sin dislocarse. El piso solo puede
 * morder a MEDIO VUELO (pie en el aire — el paso se lee igual); en apoyo la
 * pisada queda fuera del piso por construcción (verificado en marcha.test.js),
 * así el foot-plant nunca se sacrifica. Sin la proyección, la rodilla seguía
 * plegándose hacia el objetivo real y el tope no acotaba nada (el carpo
 * delantero llegaba a −59° y la zarpa se leía rota — feedback del operador).
 *
 * @param {typeof PATAS[string]} pata
 * @param {number} fx  objetivo del pie (px de lámina)
 * @param {number} fy
 * @returns {{cadera:number, rodilla:number}}
 */
export function resolverIK(pata, fx, fy) {
  const [hx, hy] = pata.articulacion;
  const dx = fx - hx;
  const dy = fy - hy;
  // margen mínimo (0.01px): las delanteras están CASI en extensión total en
  // reposo — un margen generoso aquí recortaría su alcance de reposo y el IK
  // ya no devolvería 0°/0° sobre la lámina (tirón al entrar a la marcha).
  const piso = Math.max(Math.abs(pata.L1 - pata.L2) + 0.01, pata.dMin || 0);
  const d = clamp(Math.hypot(dx, dy), piso, pata.L1 + pata.L2 - 0.01);
  const base = Math.atan2(dy, dx);
  const tx = hx + d * Math.cos(base);
  const ty = hy + d * Math.sin(base);
  const cosAlfa = (pata.L1 * pata.L1 + d * d - pata.L2 * pata.L2) / (2 * pata.L1 * d);
  const alfa = Math.acos(clamp(cosAlfa, -1, 1));
  const a1 = base - pata.lado * alfa;
  const kx = hx + pata.L1 * Math.cos(a1);
  const ky = hy + pata.L1 * Math.sin(a1);
  const a2 = Math.atan2(ty - ky, tx - kx);
  const cadera = (a1 - pata.a1Reposo) * GRADOS;
  const rodilla = (a2 - pata.a2Reposo) * GRADOS - cadera;
  return { cadera, rodilla };
}

/** Posición del pie en el ciclo (fase 0 = contacto). Apoyo: recorre el suelo
 *  de adelante (−x, el jaguar mira a la izquierda) hacia atrás a velocidad
 *  constante — la que clava la pisada. Vuelo: vuelve adelante con arco. */
export function pieEnCiclo(pata, fase) {
  const { duty, amplitud } = MARCHA;
  const [ax, ay] = pata.anclaje;
  if (fase < duty) {
    const q = fase / duty;
    return { x: ax - amplitud + 2 * amplitud * q, y: ay, apoyo: true };
  }
  const q = (fase - duty) / (1 - duty);
  return {
    x: ax + amplitud - 2 * amplitud * ssuave(q),
    y: ay - pata.lift * Math.sin(Math.PI * q),
    apoyo: false,
  };
}

/**
 * Período del ciclo (s) que ancla la pisada a la velocidad real de pantalla:
 * durante el apoyo (duty·T) el pie recorre 2·amplitud px de lámina hacia
 * atrás; para que en pantalla quede clavado, eso debe igualar v·duty·T.
 * @param {number} escala  px de pantalla por px de lámina (anchoStage/ANCHO)
 * @param {number} [velocidadPxS]  px/s de pantalla del desplazamiento real
 */
export function periodoMarcha(escala, velocidadPxS = MARCHA.velocidadPxS) {
  return (2 * MARCHA.amplitud * escala) / (MARCHA.duty * velocidadPxS);
}

/**
 * La pose completa de un instante de marcha.
 * @param {number} tSeg  segundos desde que arrancó la marcha
 * @param {number} T  período del ciclo (de `periodoMarcha`)
 * @param {number} [peso]  0..1 — mezcla reposo→ciclo (rampa de entrada; con
 *   peso 0 todos los ángulos son 0 y el bob 0: la pose es la lámina).
 * @returns {{bob:number, patas:Object<string,{cadera:number,rodilla:number}>}}
 *   `bob` en px de lámina (+ = masa abajo); las patas lo compensan (la
 *   cadera viaja con la masa, el pie apoyado no).
 */
export function poseMarcha(tSeg, T, peso = 1) {
  const ciclo = ((tSeg / T) % 1 + 1) % 1;
  const bob = MARCHA.bob * Math.sin(4 * Math.PI * ciclo) * peso;
  const patas = {};
  for (const pata of Object.values(PATAS)) {
    const fase = (ciclo + 1 - pata.fase) % 1;
    const objetivo = pieEnCiclo(pata, fase);
    const fx = pata.pie[0] + (objetivo.x - pata.pie[0]) * peso;
    const fy = pata.pie[1] + (objetivo.y - pata.pie[1]) * peso - bob;
    patas[pata.clave] = resolverIK(pata, fx, fy);
  }
  return { bob, patas };
}

export default { PATAS, resolverIK, pieEnCiclo, periodoMarcha, poseMarcha };
