/*
 * frailejonParamo.geom — el FRAILEJÓN refinado del mundo El páramo.
 *
 * Refina la silueta del frailejón (Espeletia) hacia la LÁMINA NATURALISTA DE
 * HUMBOLDT —botánicamente veraz, pintada— SIN caer en fotorrealismo. Vive aquí
 * (escenas/, dueñez del mundo páramo) y NO toca la geometría compartida del
 * bosque (floraParamo.geom sigue igual para sus otros usos): solo reusa el
 * taller canónico de sombreado y la paleta del frailejón.
 *
 * Qué se corrige frente a la versión de bosque (que "se ve en bloques"):
 *   · NECROMASA continua: la enagua de hojas muertas ya no son conos gordos
 *     sueltos, sino MUCHAS tiras finas y aplanadas (láminas) colgando pegadas a
 *     lo largo de TODO el tallo, superpuestas como tejas → una falda seca
 *     continua, no bloques.
 *   · ROSETA afelpada: más hojas carnosas, redondeadas y densas, con el tomento
 *     horneado en gradiente (salvia → casi blanco) → cogollo velludo plateado,
 *     no facetas lisas.
 *   · PROPORCIÓN esbelta: tallo más delgado y alto (caulirrósula real); la
 *     roseta se contiene un poco para que la columna se lea larga.
 *   · FLOR en CORIMBO: escapo esbelto rematado por un racimo APLANADO de
 *     capítulos amarillos (Asteraceae de altura).
 *
 * `edad`∈(0..1] manda la silueta (Espeletia crece ~1 cm/año): joven casi al ras,
 * adulto de columna media, viejo de hábito largo. Un frailejonal es un PAISAJE
 * con gradiente de edad; se instancian varias edades mezcladas y dispersas.
 *
 * Tier-safe: `q` (calidad por tier) escala el detalle. Todo se FUSIONA en UNA
 * geometría con color por vértice → un InstancedMesh por banco. Cero WebGL aquí.
 */
import * as THREE from 'three';
import { rng, fusionarSeguro, poner, apuntar, pintarPlano } from '../bosque/sombreadoVegetal.js';
import { PAL } from '../bosque/floraParamo.geom.js';

/** Color plano horneado (todas las partes DEBEN traer color para el vertexColors). */
const pintar = pintarPlano;

/** Fusión canónica preservando normales (evita el merge null silencioso). */
const fusionar = (partes, etiqueta = 'frailejon-paramo') =>
  fusionarSeguro(partes, etiqueta, { preservarNormales: true });

/** Pequeña variación determinista de color (para que la colonia no sea plana). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/**
 * Hornea un GRADIENTE a lo largo del eje Y local (base→punta): el tomento de la
 * roseta (salvia en la base → casi blanco en la punta) → toda la hoja se lee
 * afelpada/frosteada, no como piedra facetada de un solo tono.
 */
function pintarGradiente(geo, colBase, colPunta, y0, y1) {
  const a = colBase instanceof THREE.Color ? colBase : new THREE.Color(colBase);
  const b = colPunta instanceof THREE.Color ? colPunta : new THREE.Color(colPunta);
  const pos = geo.attributes.position;
  const n = pos.count;
  const arr = new Float32Array(n * 3);
  const c = new THREE.Color();
  const span = (y1 - y0) || 1;
  for (let i = 0; i < n; i++) {
    let t = (pos.getY(i) - y0) / span;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    c.copy(a).lerp(b, Math.pow(t, 0.7)); // sesga hacia la punta pálida
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/**
 * Hoja CARNOSA de la roseta: elipsoide de PUNTA REDONDA que nace en su base
 * (origen) y se extiende por +Y. Roma y gruesa (no cerda). Se orienta con
 * `apuntar`. `ancho`/`grosor` son semi-ejes; `largo` es el total.
 */
function petalo(ancho, largo, grosor, wSeg = 6, hSeg = 3) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg);
  poner(g, [0, largo / 2, 0], [0, 0, 0], [ancho, largo / 2, grosor]);
  return g;
}

/**
 * El FRAILEJÓN refinado (Espeletia). Base al origen, crece por +Y.
 * @param {{ flor?: boolean, q?: number, edad?: number }} [o]
 * @param {number} [seed]
 * @returns {THREE.BufferGeometry}
 */
export function geomFrailejonParamo({ flor = false, q = 1, edad = 0.6 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));
  const e = Math.max(0.12, Math.min(1, edad));

  // ESBELTO: columna más alta y delgada (caulirrósula real). La roseta es casi
  // constante; el joven es "casi pura roseta al ras", el viejo un hábito alto.
  const Ht = 0.18 + e * 1.78 + r() * 0.14;
  const cy = Ht + 0.04; // la roseta se posa como cabeza sobre la columna
  const rosF = 0.92 - e * 0.12; // roseta contenida → la columna se lee larga

  // 1) TALLO delgado — casi todo oculto por la enagua.
  const tronco = new THREE.CylinderGeometry(0.058, 0.088, Ht, 8, 1);
  poner(tronco, [0, Ht / 2, 0]);
  partes.push(pintar(tronco, PAL.frailejonTronco));

  // 2) NECROMASA (la enagua) — LÁMINAS finas y aplanadas colgando pegadas a lo
  //    largo de TODO el tallo, superpuestas como tejas (thatch continuo). Cada
  //    tira es un cono de 4 lados MUY aplanado en el frente (esc z ~0.26) →
  //    lámina de hoja seca, no bloque. Cuanto más abajo, más viejas y oscuras.
  const anillos = Math.max(5, Math.round((Ht / 0.1) * q));
  const porAnillo = Math.max(9, Math.round(16 * q));
  for (let a = 0; a < anillos; a++) {
    const f = a / anillos; // 0 base (vieja/oscura) → 1 bajo la roseta (reciente)
    const y = 0.05 + f * (Ht - 0.02);
    const rad = 0.072; // pegadas al tallo delgado
    for (let i = 0; i < porAnillo; i++) {
      const ang = (i / porAnillo) * Math.PI * 2 + (r() - 0.5) * 0.9;
      const largo = 0.24 + r() * 0.2;
      const cae = 0.05 + r() * 0.12; // casi a plomo, apenas se abre
      const hoja = new THREE.ConeGeometry(0.05 + r() * 0.02, largo, 4, 1);
      apuntar(
        hoja,
        [Math.cos(ang) * rad, y, Math.sin(ang) * rad],
        [Math.cos(ang) * cae, -1, Math.sin(ang) * cae],
        [1.5, 1, 0.26], // ancha lateral, MUY delgada en el frente → lámina
        (r() - 0.5) * 0.8,
      );
      const tono = f < 0.3
        ? PAL.frailejonSeco2 // base: marcescentes viejas curtidas
        : (r() > 0.5 ? PAL.frailejonSeco : PAL.frailejonSeco3);
      partes.push(pintar(hoja, variar(tono, r, 0.07)));
    }
  }

  // 3) ROSETA — la FIRMA afelpada plateada. Hojas carnosas redondeadas en
  //    espiral áurea sobre una cúpula, densas, con el tomento en gradiente
  //    (salvia → casi blanco). Más hojas y más redondas que la de bosque.
  const nRoseta = Math.max(22, Math.round(42 * q));
  const wSeg = Math.max(6, Math.round(8 * q));
  const hSeg = Math.max(4, Math.round(5 * q));
  const plataInt = new THREE.Color(PAL.frailejonPlata);
  const plataExt = new THREE.Color(PAL.frailejonPlata2);
  const hojaRoseta = (fr, ang, extraTilt = 0) => {
    const posR = (0.02 + fr * 0.16) * rosF; // cúpula ancha
    const posY = cy - fr * 0.14 * rosF; // borde caído → cuenco, no domo puntudo
    const tilt = 0.3 + fr * 0.9 + (r() - 0.5) * 0.08 + extraTilt; // ~17°→~70°
    const s = Math.sin(tilt);
    const largo = (0.26 + (1 - fr) * 0.1 + r() * 0.04) * rosF;
    const hoja = petalo((0.1 + fr * 0.028) * rosF, largo, 0.045, wSeg, hSeg);
    const base = variar(plataInt.clone().lerp(plataExt, fr), r, 0.045);
    pintarGradiente(hoja, base, PAL.frailejonCorazon, 0, largo);
    apuntar(
      hoja,
      [Math.cos(ang) * posR, posY, Math.sin(ang) * posR],
      [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s],
    );
    partes.push(hoja);
  };
  for (let i = 0; i < nRoseta; i++) {
    hojaRoseta(i / nRoseta, i * GOLDEN + (r() - 0.5) * 0.16);
  }
  // relleno: espiral desfasada, un pelo más erguida → tapa huecos (cogollo lleno).
  const nRelleno = Math.max(10, Math.round(22 * q));
  for (let i = 0; i < nRelleno; i++) {
    hojaRoseta(((i + 0.5) / nRelleno) * 0.85, i * GOLDEN + 1.7 + (r() - 0.5) * 0.18, -0.08);
  }
  // corona interior: hojas cortas erguidas, del blanco más pálido → centro velludo.
  const nCorona = Math.max(6, Math.round(12 * q));
  for (let i = 0; i < nCorona; i++) {
    const ang = i * GOLDEN + 1.3;
    const tilt = 0.08 + r() * 0.12;
    const s = Math.sin(tilt);
    const largoC = (0.14 + r() * 0.04) * rosF;
    const hoja = petalo(0.06 * rosF, largoC, 0.045, wSeg, hSeg);
    pintarGradiente(hoja, variar(PAL.frailejonPlata, r, 0.035), '#e2e8d0', 0, largoC);
    apuntar(
      hoja,
      [Math.cos(ang) * 0.02, cy + 0.03, Math.sin(ang) * 0.02],
      [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s],
    );
    partes.push(hoja);
  }
  // Yema vellosa central (el punto más pálido) — cierra el cogollo.
  const corazon = new THREE.IcosahedronGeometry(0.058 * rosF, 0);
  poner(corazon, [0, cy + 0.06, 0], [0, 0, 0], [1, 0.85, 1]);
  partes.push(pintar(corazon, PAL.frailejonCorazon));

  // 4) FLOR en CORIMBO (solo en flor): escapo esbelto rematado por un racimo
  //    APLANADO de capítulos amarillos (tope plano ~misma altura).
  if (flor) {
    const hEsc = 0.42 + r() * 0.12;
    const escapo = new THREE.CylinderGeometry(0.02, 0.038, hEsc, 6, 1);
    poner(escapo, [0.03, cy + hEsc * 0.5, 0], [0, 0, 0.08]);
    partes.push(pintar(escapo, PAL.frailejonTallo));
    const topY = cy + hEsc;
    const nCap = Math.max(7, Math.round(11 * q));
    for (let i = 0; i < nCap; i++) {
      const ang = (i / nCap) * Math.PI * 2 + r() * 0.5;
      const rad = 0.035 + (i % 3) * 0.028 + r() * 0.025; // corimbo (radios cortos)
      const cap = new THREE.IcosahedronGeometry(0.038 + r() * 0.018, 0);
      poner(
        cap,
        [0.03 + Math.cos(ang) * rad, topY + (r() - 0.5) * 0.03, Math.sin(ang) * rad],
        [0, 0, 0],
        [1, 0.72, 1],
      );
      partes.push(pintar(cap, variar(PAL.frailejonFlor, r, 0.08)));
    }
  }

  return fusionar(partes, 'frailejon-paramo');
}
