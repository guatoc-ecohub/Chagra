/*
 * kit/geometria — el TALLER de geometría procedural compartido (three-core puro).
 *
 * La auditoría de congruencia (2026-07-16) halló la trampa del `mergeGeometries`
 * → null en silencio REIMPLEMENTADA en siete archivos (floraParamo, floraCafetal,
 * floraPapa, floraCacao, fincaRealista, miradorAndino y la canónica de
 * sombreadoVegetal). Esa mordida ya apagó especies enteras sin un solo error en
 * consola, tres veces. La versión CANÓNICA — la que desindexa TODO, valida que
 * las partes declaren los mismos atributos y TRUENA si el merge da null — vive en
 * `sombreadoVegetal.js`. Aquí se re-exporta para que TODA escena nueva la alcance
 * con un solo import y deje de copiar la trampa:
 *
 *   import { fusionarSeguro, poner, apuntar, hornearFollaje } from '.../kit';
 *
 * No se MUEVE el código (evitar churn/roturas en las escenas que ya importan de
 * `sombreadoVegetal`); esto es la SUPERFICIE PÚBLICA única del taller.
 *
 * Regla de oro (memoria mergeGeometries-null-silencioso): jamás llamar
 * `mergeGeometries` a mano en una escena. Siempre `fusionarSeguro(partes, etiqueta)`
 * — desindexa, valida atributos y truena con el nombre de la especie si falla.
 */

export {
  /* PRNG y ruido (también en kit/ruido.js; aquí por conveniencia del taller). */
  rng,
  ruido3D,
  ruidoFbm,
  /* Fusión SEGURA — la única forma permitida de unir partes. */
  fusionarSeguro,
  desindexar,
  /* Colocación de partes (transforman los vértices en coords del modelo). */
  poner,
  apuntar,
  /* Horneado de color por vértice (AO + gradiente + translucidez, gratis en
     runtime: viaja en el atributo `color`). */
  pintarPorVertice,
  pintarPlano,
  hornearFollaje,
  hornearCorteza,
  /* Geometría orgánica: troncos/ramas con conicidad y arruga reales. */
  tuboOrganico,
  taperLineal,
  taperTronco,
  curvaTronco,
  /* Cúmulos de follaje con huecos y borde mordido (anti árbol-de-navidad). */
  sembrarFollaje,
  matojoHoja,
  matojoNube,
} from '../bosque/sombreadoVegetal.js';

/**
 * Distribución determinista en ANILLO alrededor del origen (la cámara ORBITA,
 * así que la composición de un mundo es un anillo por estrato, no un frente).
 * Es la generalización del `sembrar` que vivía privado en `floraParamo.geom`:
 * árboles de fondo con reparto angular parejo, sotobosque agrupado al azar.
 *
 * @param {object} o
 * @param {number} o.n           cuántas instancias.
 * @param {number} o.rMin        radio interior del anillo.
 * @param {number} o.rMax        radio exterior.
 * @param {() => number} o.rand  fuente de azar (un `rng(seed)` — determinista).
 * @param {number} [o.escMin=0.9]   escala mínima por instancia.
 * @param {number} [o.escMax=1.15]  escala máxima.
 * @param {boolean} [o.uniforme=false]  reparto angular parejo (árboles) vs
 *                                       aleatorio (matorral).
 * @param {boolean} [o.haciaAfuera=false]  sesga el radio hacia el borde (sqrt).
 * @param {number} [o.varia=0.12]   amplitud del tinte por instancia.
 * @returns {{pos:[number,number,number], rotY:number, escala:number, tint:[number,number,number]}[]}
 */
export function sembrarEnAnillo({
  n, rMin, rMax, rand, escMin = 0.9, escMax = 1.15,
  uniforme = false, haciaAfuera = false, varia = 0.12,
}) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    const ang = uniforme
      ? (i / Math.max(1, n)) * Math.PI * 2 + (rand() - 0.5) * 0.7
      : rand() * Math.PI * 2;
    const rad = rMin + (rMax - rMin) * (haciaAfuera ? Math.sqrt(rand()) : rand());
    const f = 1 + (rand() - 0.5) * varia;
    const h = (rand() - 0.5) * varia * 0.4;
    const cl = (v) => Math.max(0.7, Math.min(1.16, v));
    arr.push({
      pos: /** @type {[number, number, number]} */ ([Math.cos(ang) * rad, 0, Math.sin(ang) * rad]),
      rotY: rand() * Math.PI * 2,
      escala: escMin + rand() * (escMax - escMin),
      tint: /** @type {[number, number, number]} */ ([cl(f + h), cl(f), cl(f - h * 0.6)]),
    });
  }
  return arr;
}
