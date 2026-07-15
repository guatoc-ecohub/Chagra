/*
 * floresSindrome.geom — LAS FLORES, DIBUJADAS COMO LO QUE SON: CARTELES.
 *
 * Una flor no es un adorno: es un ANUNCIO dirigido a alguien. Su color, su
 * forma, su olor y hasta la hora en que abre evolucionaron juntos para llamar a
 * UN tipo de visitante — eso es el síndrome floral. Este módulo dibuja cada
 * síndrome de modo que se VEA a quién le está hablando:
 *
 *   tubo      → roja, larga, sin dónde pararse. El colibrí se cierne: no
 *               necesita pista. Que NO tenga plataforma es el dato que se ve.
 *   brocha    → el guamo: brocha de estambres pálidos que se abre de noche.
 *               Blanca porque es lo único que refleja la poca luz.
 *   campana   → cucurbitácea: cartel amarillo, grande, abierto de mañana. Va en
 *               dos versiones — MACHO (tallito delgado) y HEMBRA (con la bolita
 *               en la base: el fruto en formación). Si nadie cruza de una a la
 *               otra, no hay ahuyama. La flor cuenta sola por qué.
 *   plato     → morada con GUÍAS DE NÉCTAR: la pista de aterrizaje.
 *   margarita → plana y agrupada: la mariposa se para cómoda.
 *   copa      → gruesa, carnosa, crema: aguanta al escarabajo encima.
 *   corona    → LA PASIFLORA (maracuyá/curuba/gulupa): la joya del mundo, con su
 *               corona de filamentos morado-blancos, sus 5 anteras y sus 3
 *               estigmas. Grande y complicada: solo entra un bicho FUERTE.
 *
 * ── EL TRUCO DE LA VISIÓN DE ABEJA ──────────────────────────────────────────
 * Cada flor hornea DOS juegos de color de vértice: `color` (como lo vemos
 * nosotros) y `colorAbeja` (como lo ve ella: el rojo apagado, el azul y el
 * amarillo encendidos, y las guías ultravioleta hechas LUZ). Cambiar de visión
 * = cambiar el atributo activo. Cero shaders, cero rebuild, cero costo en gama
 * baja — y de un golpe se entiende por qué la flor del colibrí no es para la
 * abeja: se le APAGA.
 *
 * TÉCNICA tier-safe: cada síndrome se fusiona en UNA geometría con el color
 * horneado → UN InstancedMesh por síndrome, una draw-call por más flores que
 * haya. Puro three-core: corre headless, cero assets, cero azar por frame.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, SINDROMES, UV_GUIA, ojoDeAbeja, rng } from './polinizadoresIdentidad.js';

/* -------------------------------------------------------------------------- */
/*  Horneado de color: el doble juego (ojo humano / ojo de abeja)              */
/* -------------------------------------------------------------------------- */

const _c = new THREE.Color();

/**
 * Pinta una pieza con su color y le hornea, al lado, cómo la ve la abeja.
 *
 * @param {THREE.BufferGeometry} geo
 * @param {string|THREE.Color} colorHex color como lo vemos nosotros
 * @param {Object} [opt]
 * @param {boolean} [opt.guia=false]  ¿es una GUÍA DE NÉCTAR ultravioleta?
 *   Para nosotros es un tono apenas distinto; para ella es una pista encendida.
 * @param {number} [opt.brillo=1]  modulación (sombra propia barata, horneada)
 * @returns {THREE.BufferGeometry} la misma geo, con `color` y `colorAbeja`
 */
function pintar(geo, colorHex, { guia = false, brillo = 1 } = {}) {
  const n = geo.attributes.position.count;
  const humano = new Float32Array(n * 3);
  const abeja = new Float32Array(n * 3);

  _c.set(colorHex);
  const h = { r: _c.r * brillo, g: _c.g * brillo, b: _c.b * brillo };
  // Cómo lo ve ella. Si es guía UV, para ella es casi luz pura: la flor le grita
  // "por aquí está el néctar" en un canal que nosotros no tenemos.
  let a;
  if (guia) {
    _c.set(UV_GUIA);
    a = { r: _c.r * brillo, g: _c.g * brillo, b: _c.b * brillo };
  } else {
    a = ojoDeAbeja(h);
  }

  for (let i = 0; i < n; i++) {
    humano[i * 3] = h.r; humano[i * 3 + 1] = h.g; humano[i * 3 + 2] = h.b;
    abeja[i * 3] = a.r; abeja[i * 3 + 1] = a.g; abeja[i * 3 + 2] = a.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(humano, 3));
  geo.setAttribute('colorAbeja', new THREE.BufferAttribute(abeja, 3));
  if (!geo.attributes.uv) {
    // mergeGeometries exige el MISMO juego de atributos en todas las piezas.
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  return geo;
}

/**
 * Fusiona las piezas de una flor en UNA geometría y deja los dos juegos de
 * color guardados en `userData` para que el componente pueda alternar visión.
 * @param {THREE.BufferGeometry[]} piezas
 * @returns {THREE.BufferGeometry}
 */
function fusionar(piezas) {
  const geo = mergeGeometries(piezas, false);
  piezas.forEach((p) => p.dispose());
  // Guardamos ambos juegos: el componente solo intercambia el atributo activo.
  geo.userData.colorHumano = geo.attributes.color.array.slice();
  geo.userData.colorAbeja = geo.attributes.colorAbeja.array.slice();
  return geo;
}

/** Aplica posición/rotación/escala a una pieza y la devuelve (azúcar). */
function poner(geo, [x, y, z], rot = [0, 0, 0], esc = null) {
  if (esc) geo.scale(esc[0], esc[1], esc[2]);
  if (rot[0]) geo.rotateX(rot[0]);
  if (rot[2]) geo.rotateZ(rot[2]);
  if (rot[1]) geo.rotateY(rot[1]);
  geo.translate(x, y, z);
  return geo;
}

/* Segmentos radiales según calidad (nunca menos de 3: una flor no es un palo). */
const seg = (q, base) => Math.max(3, Math.round(base * q));

/* -------------------------------------------------------------------------- */
/*  Piezas comunes                                                             */
/* -------------------------------------------------------------------------- */

/** El tallo que sostiene la flor. Toda flor nace de una mata. */
function tallo(alto, grosor, q, color = PAL.tallo) {
  return pintar(
    poner(new THREE.CylinderGeometry(grosor * 0.75, grosor, alto, seg(q, 5)), [0, alto / 2, 0]),
    color,
    { brillo: 0.9 },
  );
}

/** Un par de hojas en el tallo (le da mata a la flor, no flor flotante). */
function hojas(alto, q, color = PAL.hoja) {
  const out = [];
  for (let i = 0; i < 2; i++) {
    const g = new THREE.SphereGeometry(0.055, seg(q, 5), seg(q, 3));
    g.scale(1.9, 0.22, 1);
    const ang = i * Math.PI + 0.5;
    out.push(pintar(poner(g, [Math.cos(ang) * 0.06, alto * (0.3 + i * 0.16), Math.sin(ang) * 0.06], [0, ang, 0.35]), color, { brillo: i ? 0.86 : 1 }));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Los síndromes, uno por uno                                                 */
/* -------------------------------------------------------------------------- */

/*
 * TUBO — la flor del colibrí (roja, tubular, sin plataforma).
 * El tubo es LARGO a propósito: solo un pico largo llega al néctar del fondo.
 * Va inclinada hacia afuera y un poco abajo, como cuelgan de verdad, y NO lleva
 * pétalos-plataforma: él se cierne. Esa ausencia es el dato.
 */
export function geomTubular({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const S = SINDROMES.tubular_rojo;
  const piezas = [];
  const alto = 0.46;
  piezas.push(tallo(alto, 0.012, q));
  piezas.push(...hojas(alto, q));

  // 2-3 tubos colgando, cada uno inclinado hacia afuera.
  const nTubos = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nTubos; i++) {
    const ang = (i / nTubos) * Math.PI * 2 + r() * 0.6;
    const y = alto - 0.03 - i * 0.05;
    const dx = Math.cos(ang) * 0.045;
    const dz = Math.sin(ang) * 0.045;
    // El tubo: cilindro largo y fino, acostado hacia afuera-abajo.
    const tubo = new THREE.CylinderGeometry(0.019, 0.011, 0.17, seg(q, 7), 1, true);
    tubo.rotateZ(Math.PI / 2 - 0.5); // apunta afuera y cae un poco
    tubo.rotateY(-ang);
    piezas.push(pintar(poner(tubo, [dx + Math.cos(ang) * 0.07, y, dz + Math.sin(ang) * 0.07]), S.color));
    // La boca abocinada: los lóbulos que se abren en la punta.
    const boca = new THREE.CylinderGeometry(0.038, 0.019, 0.05, seg(q, 7), 1, true);
    boca.rotateZ(Math.PI / 2 - 0.5);
    boca.rotateY(-ang);
    piezas.push(pintar(poner(boca, [dx + Math.cos(ang) * 0.15, y - 0.035, dz + Math.sin(ang) * 0.15]), S.color, { brillo: 1.08 }));
    // La garganta encendida: el néctar está AL FONDO (por eso el pico largo).
    const garganta = new THREE.SphereGeometry(0.016, seg(q, 5), seg(q, 4));
    piezas.push(pintar(poner(garganta, [dx + Math.cos(ang) * 0.055, y + 0.01, dz + Math.sin(ang) * 0.055]), S.colorInterno));
  }
  return fusionar(piezas);
}

/*
 * BROCHA — la flor de noche del guamo (murciélago).
 * Una brocha de estambres pálidos: grande para que se note en la oscuridad,
 * blanca porque el blanco es lo único que refleja la poca luz de la noche, y
 * con olor fuerte (que se dibuja como VAHO en la escena, no aquí).
 */
export function geomNocturna({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const S = SINDROMES.nocturna_pale;
  const piezas = [];
  const alto = 0.3;
  piezas.push(tallo(alto, 0.014, q, '#6b7a48'));

  // La base carnosa de donde salen los estambres.
  const base = new THREE.SphereGeometry(0.045, seg(q, 7), seg(q, 5));
  base.scale(1, 0.7, 1);
  piezas.push(pintar(poner(base, [0, alto, 0]), S.colorInterno));

  // La brocha: filamentos radiales, cada uno con su cabecita de antera.
  const nFil = Math.max(9, Math.round(26 * q));
  for (let i = 0; i < nFil; i++) {
    // Distribución en semiesfera (la brocha se abre hacia arriba y a los lados).
    const ang = (i / nFil) * Math.PI * 2 * 2.4;
    const alt = 0.15 + r() * 0.85; // 0..1 hacia arriba
    const largo = 0.1 + r() * 0.05;
    const inc = Math.acos(alt * 0.9);
    const dir = new THREE.Vector3(Math.sin(inc) * Math.cos(ang), Math.cos(inc), Math.sin(inc) * Math.sin(ang));

    const fil = new THREE.CylinderGeometry(0.0035, 0.0035, largo, 3);
    fil.translate(0, largo / 2, 0);
    // Orientar el filamento hacia `dir`.
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    fil.applyQuaternion(quat);
    fil.translate(0, alto + 0.02, 0);
    piezas.push(pintar(fil, S.color, { brillo: 0.94 }));

    // La antera en la punta: el polen que se le pega al murciélago en la cara.
    const punta = new THREE.SphereGeometry(0.0075, 4, 3);
    const p = dir.clone().multiplyScalar(largo);
    piezas.push(pintar(poner(punta, [p.x, alto + 0.02 + p.y, p.z]), PAL.polen, { brillo: 0.85 }));
  }
  return fusionar(piezas);
}

/*
 * CAMPANA — la cucurbitácea (ahuyama, calabaza, pepino). El cartel amarillo.
 * Dos versiones, y la diferencia ES la lección:
 *   macho  → tallito delgado y limpio, con la antera cargada de polen.
 *   hembra → la BOLITA en la base: el fruto en formación, esperando.
 * Si nadie cruza el polen de la primera a la segunda, esa bolita se cae.
 *
 * @param {{q?:number, hembra?:boolean}} opt
 */
export function geomCampana({ q = 1, hembra = false } = {}, _seed = 3) {
  const S = SINDROMES.cartel_amarillo;
  const piezas = [];
  const alto = 0.2;
  piezas.push(tallo(alto, hembra ? 0.02 : 0.012, q, PAL.tallo));

  // LA BOLITA: el ovario de la flor hembra = el fruto en formación. Sin visita,
  // esto se pudre y se cae. Con visita, se hincha y es la ahuyama.
  if (hembra) {
    const ovario = new THREE.SphereGeometry(0.05, seg(q, 8), seg(q, 6));
    ovario.scale(1, 1.25, 1);
    piezas.push(pintar(poner(ovario, [0, alto - 0.03, 0]), '#8aa83c'));
  }

  // La corola: campana ancha abierta hacia arriba, con lóbulos.
  const y0 = alto + (hembra ? 0.04 : 0.01);
  const corola = new THREE.CylinderGeometry(0.13, 0.03, 0.13, seg(q, 10), 1, true);
  piezas.push(pintar(poner(corola, [0, y0 + 0.065, 0]), S.color));

  // Los cinco lóbulos que rematan el cartel (la silueta de estrella).
  const nLob = 5;
  for (let i = 0; i < nLob; i++) {
    const ang = (i / nLob) * Math.PI * 2;
    const lob = new THREE.SphereGeometry(0.05, seg(q, 6), seg(q, 4));
    lob.scale(1, 0.25, 0.8);
    piezas.push(pintar(poner(lob, [Math.cos(ang) * 0.12, y0 + 0.125, Math.sin(ang) * 0.12], [0, -ang, -0.5]), S.color, { brillo: 1.06 }));
  }

  // GUÍAS DE NÉCTAR: las nervaduras que bajan por dentro de la campana hacia el
  // fondo. Para nosotros, casi nada. Para ella, la pista iluminada.
  const nGuia = Math.max(4, Math.round(8 * q));
  for (let i = 0; i < nGuia; i++) {
    const ang = (i / nGuia) * Math.PI * 2;
    const g = new THREE.BoxGeometry(0.008, 0.12, 0.004);
    g.rotateX(0.0);
    piezas.push(pintar(poner(g, [Math.cos(ang) * 0.072, y0 + 0.062, Math.sin(ang) * 0.072], [0, -ang, -0.38]), S.colorInterno, { guia: true }));
  }

  // El corazón: antera con polen (macho) o estigma (hembra).
  const centro = new THREE.CylinderGeometry(0.018, 0.024, 0.06, seg(q, 6));
  piezas.push(pintar(poner(centro, [0, y0 + 0.05, 0]), hembra ? '#e8c86a' : PAL.polen));
  if (!hembra) {
    // El polen del macho: lo que hay que llevarse.
    const carga = new THREE.SphereGeometry(0.026, seg(q, 6), seg(q, 5));
    piezas.push(pintar(poner(carga, [0, y0 + 0.085, 0]), PAL.polenVivo));
  }
  return fusionar(piezas);
}

/*
 * PLATO — la flor morada con guías de néctar (la escuela de la visión de abeja).
 * Morada porque ella ve el morado; con guías UV que la llevan derecho al centro.
 * En visión humana las guías casi no se notan. En visión de abeja: pista de
 * aterrizaje encendida. Esa es toda la demostración.
 */
export function geomPlato({ q = 1 } = {}, _seed = 4) {
  const S = SINDROMES.guia_uv;
  const piezas = [];
  const alto = 0.24;
  piezas.push(tallo(alto, 0.011, q));
  piezas.push(...hojas(alto, q));

  const nPet = 5;
  for (let i = 0; i < nPet; i++) {
    const ang = (i / nPet) * Math.PI * 2;
    // Pétalo: disco aplastado, ligeramente levantado (plato, no plancha).
    const pet = new THREE.SphereGeometry(0.062, seg(q, 8), seg(q, 5));
    pet.scale(1, 0.14, 0.75);
    piezas.push(pintar(poner(pet, [Math.cos(ang) * 0.058, alto + 0.012, Math.sin(ang) * 0.058], [0, -ang, -0.22]), S.color));

    // LA GUÍA: la raya que baja por el pétalo hacia el néctar.
    const guia = new THREE.BoxGeometry(0.075, 0.004, 0.012);
    piezas.push(pintar(poner(guia, [Math.cos(ang) * 0.05, alto + 0.026, Math.sin(ang) * 0.05], [0, -ang, -0.2]), S.colorInterno, { guia: true }));
  }
  // El centro: donde la guía apunta. Ahí está el pago.
  const centro = new THREE.SphereGeometry(0.024, seg(q, 7), seg(q, 5));
  centro.scale(1, 0.6, 1);
  piezas.push(pintar(poner(centro, [0, alto + 0.022, 0]), PAL.nectar));
  return fusionar(piezas);
}

/*
 * MARGARITA — plana y en racimo (mariposa, sírfido) y la atractora del borde
 * (caléndula, girasol). Plana porque la mariposa necesita dónde pararse cómoda.
 * @param {{q?:number, borde?:boolean}} opt  borde = la melífera del cerco vivo
 */
export function geomMargarita({ q = 1, borde = false } = {}, seed = 5) {
  const r = rng(seed);
  const S = borde ? SINDROMES.melifera_borde : SINDROMES.plana_racimo;
  const piezas = [];
  const alto = borde ? 0.34 : 0.26;
  piezas.push(tallo(alto, 0.011, q));
  piezas.push(...hojas(alto, q));

  // Un racimo: 2-3 cabezuelas (agrupadas, como le gustan a la mariposa).
  const nCab = borde ? 1 : Math.max(1, Math.round(3 * q));
  for (let c = 0; c < nCab; c++) {
    const cx = c === 0 ? 0 : Math.cos(c * 2.2) * 0.05;
    const cz = c === 0 ? 0 : Math.sin(c * 2.2) * 0.05;
    const cy = alto - (c === 0 ? 0 : 0.04 + r() * 0.03);
    const escR = borde ? 1.25 : 0.85;

    const nPet = Math.max(6, Math.round((borde ? 14 : 10) * q));
    for (let i = 0; i < nPet; i++) {
      const ang = (i / nPet) * Math.PI * 2;
      const pet = new THREE.SphereGeometry(0.042 * escR, seg(q, 6), seg(q, 4));
      pet.scale(1.5, 0.1, 0.5);
      piezas.push(pintar(poner(pet, [cx + Math.cos(ang) * 0.05 * escR, cy + 0.006, cz + Math.sin(ang) * 0.05 * escR], [0, -ang, -0.08]), S.color, { brillo: 0.95 + (i % 2) * 0.1 }));
    }
    // El disco central: donde de verdad está la comida (muchas florecitas).
    const disco = new THREE.CylinderGeometry(0.032 * escR, 0.03 * escR, 0.016, seg(q, 9));
    piezas.push(pintar(poner(disco, [cx, cy + 0.012, cz]), S.colorInterno));
    // Guía UV: el ojo de buey del centro (invisible para nosotros, faro para ella).
    const ojo = new THREE.CylinderGeometry(0.017 * escR, 0.017 * escR, 0.019, seg(q, 7));
    piezas.push(pintar(poner(ojo, [cx, cy + 0.014, cz]), S.colorInterno, { guia: true, brillo: 0.9 }));
  }
  return fusionar(piezas);
}

/*
 * COPA — la flor gruesa y olorosa del escarabajo. Carnosa y robusta porque él se
 * le mete encima y la maltrata: una flor delicada no aguantaría ese trato.
 */
export function geomCopa({ q = 1 } = {}, _seed = 6) {
  const S = SINDROMES.robusta_olor;
  const piezas = [];
  const alto = 0.16;
  piezas.push(tallo(alto, 0.02, q, '#6b7a3f'));

  // La copa: gruesa, de pared ancha.
  const copa = new THREE.CylinderGeometry(0.085, 0.045, 0.1, seg(q, 9), 1, true);
  piezas.push(pintar(poner(copa, [0, alto + 0.05, 0]), S.color));
  // Los pétalos carnosos: gordos, casi tuberosos.
  const nPet = 6;
  for (let i = 0; i < nPet; i++) {
    const ang = (i / nPet) * Math.PI * 2;
    const pet = new THREE.SphereGeometry(0.045, seg(q, 6), seg(q, 5));
    pet.scale(1, 0.5, 0.7);
    piezas.push(pintar(poner(pet, [Math.cos(ang) * 0.078, alto + 0.09, Math.sin(ang) * 0.078], [0, -ang, -0.6]), S.color, { brillo: 1.05 }));
  }
  // El fondo: néctar y polen accesibles (no hay que ser fino para llegar).
  const fondo = new THREE.SphereGeometry(0.045, seg(q, 7), seg(q, 5));
  fondo.scale(1, 0.5, 1);
  piezas.push(pintar(poner(fondo, [0, alto + 0.04, 0]), S.colorInterno));
  return fusionar(piezas);
}

/*
 * CORONA — LA PASIFLORA (maracuyá, curuba, gulupa). La joya de este mundo.
 *
 * Es la flor más complicada que hay en la finca y por eso es la que más depende:
 * grande, con una CORONA de filamentos morado-blancos, cinco anteras colgadas y
 * tres estigmas arriba. Solo un bicho grande y fuerte —un abejorro— entra bien y
 * toca a la vez la antera y el estigma. La angelita, con todo su cariño, es
 * demasiado chiquita para esta flor: pasa por debajo sin tocar nada.
 */
export function geomPasiflora({ q = 1 } = {}, _seed = 7) {
  const S = SINDROMES.pasiflora;
  const piezas = [];
  const alto = 0.12;
  piezas.push(tallo(alto, 0.016, q, '#5a7a38'));

  // Los 10 tepalos (5 sépalos + 5 pétalos): el plato blanco de fondo.
  const nTep = 10;
  for (let i = 0; i < nTep; i++) {
    const ang = (i / nTep) * Math.PI * 2;
    const tep = new THREE.SphereGeometry(0.075, seg(q, 7), seg(q, 4));
    tep.scale(1.35, 0.09, 0.42);
    piezas.push(pintar(poner(tep, [Math.cos(ang) * 0.082, alto + 0.006, Math.sin(ang) * 0.082], [0, -ang, -0.06]), S.color, { brillo: i % 2 ? 0.92 : 1 }));
  }

  // LA CORONA: el anillo de filamentos finos, morados por fuera y blancos por
  // dentro (bandeados, como de verdad). Es la firma inconfundible de la flor.
  const nFil = Math.max(14, Math.round(44 * q));
  for (let i = 0; i < nFil; i++) {
    const ang = (i / nFil) * Math.PI * 2;
    // Tramo externo: morado.
    const ext = new THREE.BoxGeometry(0.05, 0.006, 0.0055);
    piezas.push(pintar(poner(ext, [Math.cos(ang) * 0.062, alto + 0.024, Math.sin(ang) * 0.062], [0, -ang, -0.18]), S.colorInterno));
    // Tramo interno: blanco (la banda clara del anillo).
    const int = new THREE.BoxGeometry(0.032, 0.006, 0.0055);
    piezas.push(pintar(poner(int, [Math.cos(ang) * 0.026, alto + 0.03, Math.sin(ang) * 0.026], [0, -ang, -0.3]), PAL.pasifloraCoronaClara));
  }

  // El androginóforo: la columna central que levanta anteras y estigmas.
  const columna = new THREE.CylinderGeometry(0.011, 0.014, 0.075, seg(q, 6));
  piezas.push(pintar(poner(columna, [0, alto + 0.055, 0]), '#c8d8a0'));

  // Las 5 ANTERAS colgadas (el polen que hay que llevarse). Miran hacia abajo:
  // le untan la espalda al abejorro cuando entra.
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2;
    const ant = new THREE.SphereGeometry(0.017, seg(q, 6), seg(q, 4));
    ant.scale(1.5, 0.5, 0.9);
    piezas.push(pintar(poner(ant, [Math.cos(ang) * 0.032, alto + 0.078, Math.sin(ang) * 0.032], [0, -ang, 0.5]), PAL.polen));
  }
  // Los 3 ESTIGMAS arriba (donde el polen TIENE que llegar para que cuaje).
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.5;
    const est = new THREE.SphereGeometry(0.013, seg(q, 5), seg(q, 4));
    piezas.push(pintar(poner(est, [Math.cos(ang) * 0.028, alto + 0.104, Math.sin(ang) * 0.028]), '#9ec46a'));
    const brazo = new THREE.CylinderGeometry(0.004, 0.004, 0.03, 3);
    piezas.push(pintar(poner(brazo, [Math.cos(ang) * 0.016, alto + 0.096, Math.sin(ang) * 0.016], [0, -ang, -0.6]), '#a8cf78'));
  }
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  El catálogo                                                                */
/* -------------------------------------------------------------------------- */

/*
 * Cada síndrome → su constructor. `cartel_amarillo` sale en dos: la flor hembra
 * es una entrada aparte (`cartel_hembra`) porque su dibujo lleva LA BOLITA, y
 * porque la escena necesita poder cruzar polen de macho a hembra: sin ese
 * cruce, la ahuyama no existe.
 */
export const FLOR_GEOM = {
  tubular_rojo: (q, seed) => geomTubular({ q }, seed),
  nocturna_pale: (q, seed) => geomNocturna({ q }, seed),
  cartel_amarillo: (q, seed) => geomCampana({ q, hembra: false }, seed),
  cartel_hembra: (q, seed) => geomCampana({ q, hembra: true }, seed),
  guia_uv: (q, seed) => geomPlato({ q }, seed),
  plana_racimo: (q, seed) => geomMargarita({ q, borde: false }, seed),
  robusta_olor: (q, seed) => geomCopa({ q }, seed),
  pasiflora: (q, seed) => geomPasiflora({ q }, seed),
  melifera_borde: (q, seed) => geomMargarita({ q, borde: true }, seed),
};

/** El síndrome real de una clave de geometría (la hembra sigue siendo cartel). */
export const SINDROME_DE_GEOM = (clave) => (clave === 'cartel_hembra' ? 'cartel_amarillo' : clave);

/**
 * Cambia la visión de una geometría de flor: humana ↔ ojo de abeja.
 * Solo intercambia el array del atributo `color` (que ya está horneado) — cero
 * rebuild, cero shader, gratis en gama baja.
 * @param {THREE.BufferGeometry} geo
 * @param {boolean} comoAbeja
 */
export function verComoAbeja(geo, comoAbeja) {
  const fuente = comoAbeja ? geo.userData.colorAbeja : geo.userData.colorHumano;
  if (!fuente || !geo.attributes.color) return;
  geo.attributes.color.array.set(fuente);
  geo.attributes.color.needsUpdate = true;
}
