/*
 * cultivos.geom — LAS MATAS QUE COBRAN (o no) EL SERVICIO.
 *
 * Acá se juega la tesis del mundo, y se juega por CONTRASTE. Cuatro matas, cuatro
 * relaciones distintas con el bicho — y la diferencia tiene que verse en la
 * silueta, antes de leer nada:
 *
 *   MARACUYÁ (depende del todo) → emparrado con su flor-joya arriba. Sin abejorro
 *     la flor se cae sin cuajar. Es el que más sufre.
 *   AHUYAMA (depende) → rastrera con flor MACHO y flor HEMBRA separadas. Alguien
 *     tiene que cruzar el polen de una a la otra o no hay ahuyama. La bolita de
 *     la flor hembra o se hincha o se pudre: no hay término medio.
 *   CAFÉ (mejora) → arbusto que se poliniza SOLO. Da igual sin abejas... pero con
 *     abejas cuaja más. La honestidad de este caso importa: no todo es catástrofe.
 *   MAÍZ (viento) → EL CONTRAPESO. Su flor no es cartel: la espiga es parda, sin
 *     néctar, sin olor, sin nadie a quien llamar. Suelta polen al aire y el viento
 *     lo baja a los pelos de la mazorca. Sobre el maíz NUNCA se teje un hilo, y
 *     esa ausencia enseña más que mil abejas. Sin este contraste, "sin abejas se
 *     acaba la comida" sería una mentira bonita: el maíz, el arroz, el trigo y la
 *     papa seguirían dándose. Lo que se pierde es la VARIEDAD.
 *
 * Los FRUTOS van aparte (`geomFruto*`), instanciados y escalados por el cuaje que
 * calcula `cuajeDe()`: la cosecha no se dibuja, se GANA. Un maracuyá sin red se
 * queda en botones secos; con red, se llena.
 *
 * Puro three-core: headless, cero assets, cero azar por frame.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, rng } from './polinizadoresIdentidad.js';

const _c = new THREE.Color();

function pintar(geo, colorHex, brillo = 1) {
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  _c.set(colorHex);
  for (let i = 0; i < n; i++) {
    col[i * 3] = _c.r * brillo;
    col[i * 3 + 1] = _c.g * brillo;
    col[i * 3 + 2] = _c.b * brillo;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (!geo.attributes.uv) {
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  return geo;
}

function poner(geo, [x, y, z], rot = [0, 0, 0], esc = null) {
  if (esc) geo.scale(esc[0], esc[1], esc[2]);
  if (rot[2]) geo.rotateZ(rot[2]);
  if (rot[0]) geo.rotateX(rot[0]);
  if (rot[1]) geo.rotateY(rot[1]);
  geo.translate(x, y, z);
  return geo;
}

function fusionar(piezas) {
  const geo = mergeGeometries(piezas, false);
  piezas.forEach((p) => p.dispose());
  return geo;
}

const seg = (q, base) => Math.max(3, Math.round(base * q));

/** Una hoja genérica de mata (disco aplastado con su nervadura). */
function hoja(tam, q, color = PAL.hoja, brillo = 1) {
  const h = new THREE.SphereGeometry(tam, seg(q, 6), seg(q, 4));
  h.scale(1, 0.12, 0.78);
  return pintar(h, color, brillo);
}

/* -------------------------------------------------------------------------- */
/*  MARACUYÁ — el que más depende                                              */
/* -------------------------------------------------------------------------- */

/*
 * El emparrado: dos horcones, un alambre y la guía trepando con sus zarcillos.
 * La flor (pasiflora) NO va acá — la siembra la escena como flor instanciada,
 * porque las flores son actores del mundo, no decorado de la mata.
 */
export function geomMaracuya({ q = 1, alto = 1.5, largo = 1.9 } = {}, seed = 41) {
  const r = rng(seed);
  const piezas = [];

  // Horcones y alambre del emparrado (así se siembra de verdad).
  for (const s of [1, -1]) {
    const h = new THREE.CylinderGeometry(0.035, 0.045, alto, seg(q, 6));
    piezas.push(pintar(poner(h, [s * (largo / 2), alto / 2, 0]), '#7a5a34'));
  }
  const alambre = new THREE.CylinderGeometry(0.008, 0.008, largo, 4);
  piezas.push(pintar(poner(alambre, [0, alto - 0.04, 0], [0, 0, Math.PI / 2]), '#9aa0a8'));

  // El tallo que sube y la guía que corre por el alambre.
  const tallo = new THREE.CylinderGeometry(0.022, 0.032, alto - 0.1, seg(q, 5));
  piezas.push(pintar(poner(tallo, [-largo * 0.3, (alto - 0.1) / 2, 0]), '#5a7a38'));
  const guia = new THREE.CylinderGeometry(0.016, 0.016, largo * 0.86, 4);
  piezas.push(pintar(poner(guia, [0, alto - 0.09, 0], [0, 0, Math.PI / 2]), '#5a7a38'));

  // Las hojas: trilobuladas y grandes, colgando de la guía.
  const nHoja = Math.max(4, Math.round(11 * q));
  for (let i = 0; i < nHoja; i++) {
    const x = -largo * 0.42 + (i / (nHoja - 1)) * largo * 0.84;
    const y = alto - 0.16 - r() * 0.3;
    const z = (r() - 0.5) * 0.24;
    piezas.push(poner(hoja(0.13, q, i % 2 ? PAL.hoja : PAL.hojaClara), [x, y, z], [0, r() * 3, 0.2 + r() * 0.3]));
  }
  // Los zarcillos: los resortitos con que se agarra. Detalle que da vida.
  const nZar = Math.max(2, Math.round(5 * q));
  for (let i = 0; i < nZar; i++) {
    const x = -largo * 0.4 + (i / Math.max(1, nZar - 1)) * largo * 0.8;
    const z = new THREE.TorusGeometry(0.035, 0.005, 3, seg(q, 9), Math.PI * 1.7);
    piezas.push(pintar(poner(z, [x, alto - 0.12, 0.06], [0.4, 0, r()]), '#6b8a42'));
  }
  return fusionar(piezas);
}

/** El maracuyá: fruto redondo. Su escala la manda el CUAJE, no el capricho. */
export function geomFrutoMaracuya({ q = 1 } = {}) {
  const piezas = [];
  const f = new THREE.SphereGeometry(0.5, seg(q, 9), seg(q, 7));
  f.scale(1, 1.12, 1);
  piezas.push(pintar(f, PAL.frutoMaracuya));
  // El brillo horneado (rubber-hose: la luz se dibuja, no se calcula).
  const br = new THREE.SphereGeometry(0.16, seg(q, 5), 4);
  br.scale(1.3, 0.9, 0.7);
  piezas.push(pintar(poner(br, [0.16, 0.3, 0.3]), '#f5d47a', 1.2));
  // El pedúnculo que lo cuelga.
  const p = new THREE.CylinderGeometry(0.03, 0.04, 0.22, 4);
  piezas.push(pintar(poner(p, [0, 0.6, 0]), '#5a7a38'));
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  AHUYAMA — la de flor macho y flor hembra                                   */
/* -------------------------------------------------------------------------- */

/*
 * Rastrera: la guía se arrastra por el suelo con sus hojas anchas. Las flores
 * (macho y hembra) las siembra la escena como flores instanciadas — y el cruce
 * de una a otra es LA lección de esta mata.
 */
export function geomAhuyama({ q = 1, largo = 1.3 } = {}, seed = 42) {
  const r = rng(seed);
  const piezas = [];
  // La guía serpenteando por el suelo.
  const nSeg = Math.max(3, Math.round(7 * q));
  for (let i = 0; i < nSeg; i++) {
    const t = i / nSeg;
    const x = -largo / 2 + t * largo;
    const z = Math.sin(t * 5) * 0.16;
    const g = new THREE.CylinderGeometry(0.022, 0.024, largo / nSeg + 0.03, 4);
    piezas.push(pintar(poner(g, [x, 0.03, z], [0, Math.cos(t * 5) * 0.6, Math.PI / 2]), '#4f7a35'));
  }
  // Las hojas anchas y ásperas, levantadas sobre peciolos.
  const nHoja = Math.max(3, Math.round(8 * q));
  for (let i = 0; i < nHoja; i++) {
    const t = (i + 0.5) / nHoja;
    const x = -largo / 2 + t * largo;
    const z = Math.sin(t * 5) * 0.16;
    const dz = (r() - 0.5) * 0.4;
    const pec = new THREE.CylinderGeometry(0.012, 0.014, 0.2, 3);
    piezas.push(pintar(poner(pec, [x, 0.1, z + dz * 0.4], [0.5 * Math.sign(dz), 0, 0]), '#4f7a35'));
    const h = new THREE.SphereGeometry(0.17, seg(q, 7), seg(q, 4));
    h.scale(1, 0.1, 0.9);
    piezas.push(pintar(poner(h, [x, 0.19, z + dz], [0, r() * 3, 0.15]), i % 2 ? '#5a8a3c' : '#4a7530', 0.95 + r() * 0.1));
  }
  return fusionar(piezas);
}

/** La ahuyama: fruto gajado. Su escala la manda el CUAJE. */
export function geomFrutoAhuyama({ q = 1 } = {}) {
  const piezas = [];
  const f = new THREE.SphereGeometry(0.5, seg(q, 10), seg(q, 7));
  f.scale(1, 0.72, 1);
  piezas.push(pintar(f, '#d98a2c'));
  // Los gajos: los surcos que la hacen ahuyama y no naranja.
  const nGajo = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nGajo; i++) {
    const a = (i / nGajo) * Math.PI * 2;
    const g = new THREE.TorusGeometry(0.36, 0.035, 3, seg(q, 8), Math.PI);
    piezas.push(pintar(poner(g, [Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16], [0, -a, Math.PI / 2]), '#c47a24', 0.9));
  }
  const p = new THREE.CylinderGeometry(0.05, 0.06, 0.14, 5);
  piezas.push(pintar(poner(p, [0, 0.38, 0]), '#7a8a3c'));
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  CAFÉ — el que se poliniza solo... pero mejora                              */
/* -------------------------------------------------------------------------- */

/*
 * Arbusto de ramas horizontales y hoja lustrosa. Lleva SUS flores blancas
 * horneadas (a diferencia de las demás matas): la floración del café es un
 * estallido blanco de pocos días y se lee como masa, no como flores sueltas.
 * Los granos van aparte, escalados por cuaje: con abejas, más granos. Sin ellas,
 * igual hay café — pero menos. Esa media tinta es la verdad.
 */
export function geomCafe({ q = 1, alto = 0.95, conFlor = true } = {}, seed = 43) {
  const r = rng(seed);
  const piezas = [];
  const tronco = new THREE.CylinderGeometry(0.028, 0.045, alto, seg(q, 6));
  piezas.push(pintar(poner(tronco, [0, alto / 2, 0]), '#6b5236'));

  const nRama = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nRama; i++) {
    const y = alto * (0.3 + (i / nRama) * 0.62);
    const ang = i * 2.4;
    const len = 0.42 * (1 - (i / nRama) * 0.45);
    const rama = new THREE.CylinderGeometry(0.012, 0.017, len, 4);
    piezas.push(pintar(poner(rama, [Math.cos(ang) * len * 0.5, y, Math.sin(ang) * len * 0.5], [0, -ang, Math.PI / 2 - 0.15]), '#6b5236'));

    // Las hojas: pares opuestos a lo largo de la rama (así es el café).
    const nH = Math.max(2, Math.round(4 * q));
    for (let k = 1; k <= nH; k++) {
      const t = k / (nH + 0.4);
      const hx = Math.cos(ang) * len * t;
      const hz = Math.sin(ang) * len * t;
      for (const s of [1, -1]) {
        piezas.push(poner(hoja(0.075, q, s > 0 ? '#3f6b2e' : '#4a7a36', 0.95 + r() * 0.1), [hx, y + 0.02, hz + s * 0.05], [0, -ang, 0.12]));
      }
      // LA FLOR DEL CAFÉ: blanca, chiquita, en racimo pegado a la rama.
      if (conFlor && k % 2 === 0) {
        for (let f = 0; f < 3; f++) {
          const fl = new THREE.SphereGeometry(0.022, 4, 3);
          fl.scale(1, 0.5, 1);
          piezas.push(pintar(poner(fl, [hx + (r() - 0.5) * 0.05, y + 0.03, hz + (r() - 0.5) * 0.05]), PAL.cafeFlor, 1.1));
        }
      }
    }
  }
  return fusionar(piezas);
}

/** El grano de café (cereza). Escala por cuaje: con abeja, más lleno. */
export function geomGranoCafe({ q = 1 } = {}) {
  const g = new THREE.SphereGeometry(0.5, seg(q, 7), seg(q, 5));
  g.scale(0.85, 1, 0.85);
  return pintar(g, PAL.cafeGrano);
}

/* -------------------------------------------------------------------------- */
/*  MAÍZ — el que no le debe nada a nadie                                      */
/* -------------------------------------------------------------------------- */

/*
 * La caña con su espiga (la flor macho) arriba y la mazorca con sus pelos (los
 * estigmas) al medio. Fíjese en lo que NO tiene: ni pétalo, ni color, ni néctar,
 * ni olor. Nada de cartel — porque no está llamando a nadie. Su polen cae de la
 * espiga y el VIENTO lo lleva a los pelos de la mazorca de la mata vecina.
 * Por eso el maíz se siembra en bloque y no en fila suelta: el bloque es su
 * "polinizador". Es una tecnología campesina de hace milenios, sin una sola abeja.
 */
export function geomMaiz({ q = 1, alto = 1.7 } = {}, seed = 44) {
  const r = rng(seed);
  const piezas = [];
  const cana = new THREE.CylinderGeometry(0.022, 0.038, alto, seg(q, 6));
  piezas.push(pintar(poner(cana, [0, alto / 2, 0]), PAL.maiz));
  // Los nudos de la caña.
  for (let i = 1; i < 5; i++) {
    const n = new THREE.CylinderGeometry(0.03, 0.03, 0.02, seg(q, 6));
    piezas.push(pintar(poner(n, [0, (alto / 5) * i, 0]), '#7a8a40', 0.9));
  }
  // Las hojas largas que se arquean (la silueta del maizal).
  const nHoja = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nHoja; i++) {
    const y = alto * (0.22 + (i / nHoja) * 0.6);
    const ang = i * 2.6;
    const h = new THREE.SphereGeometry(0.4, seg(q, 6), 3);
    h.scale(1, 0.035, 0.13);
    piezas.push(pintar(poner(h, [Math.cos(ang) * 0.34, y, Math.sin(ang) * 0.34], [0, -ang, -0.32 - r() * 0.2]), i % 2 ? '#8aa04a' : '#7a9440'));
  }
  // LA ESPIGA: la flor macho. Parda, seca, sin gracia. No le habla a nadie —
  // le habla al viento.
  const eje = new THREE.CylinderGeometry(0.012, 0.018, 0.3, 4);
  piezas.push(pintar(poner(eje, [0, alto + 0.13, 0]), PAL.maizEspiga));
  const nRam = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nRam; i++) {
    const a = (i / nRam) * Math.PI * 2;
    const ram = new THREE.CylinderGeometry(0.006, 0.009, 0.26, 3);
    piezas.push(pintar(poner(ram, [Math.cos(a) * 0.06, alto + 0.2, Math.sin(a) * 0.06], [0, -a, -0.3]), PAL.maizEspiga, 0.95 + r() * 0.1));
  }
  // LA MAZORCA con sus PELOS: cada pelo es un estigma, y cada grano de la
  // mazorca necesita que UN grano de polen le caiga a SU pelo. Ese es el detalle
  // que nadie cuenta: la mazorca chueca es un pelo que no recibió polen.
  const maz = new THREE.CylinderGeometry(0.055, 0.045, 0.26, seg(q, 7));
  piezas.push(pintar(poner(maz, [0.05, alto * 0.5, 0], [0, 0, -0.16]), '#8aa04a'));
  const nPelo = Math.max(4, Math.round(9 * q));
  for (let i = 0; i < nPelo; i++) {
    const a = (i / nPelo) * Math.PI * 2;
    const p = new THREE.CylinderGeometry(0.0035, 0.0035, 0.14, 3);
    piezas.push(pintar(poner(p, [0.08 + Math.cos(a) * 0.012, alto * 0.5 + 0.19, Math.sin(a) * 0.012], [0, -a, -0.45 - i * 0.03]), '#d9a86a', 1));
  }
  return fusionar(piezas);
}

/*
 * LA MOTA DE POLEN AL VIENTO (la del maíz).
 * Se dibuja aparte y se instancia: son las motas que caen de la espiga y derivan
 * con el viento hasta los pelos de la mazorca. Es el ÚNICO "servicio" que se ve
 * sobre el maizal — y no lo hace ningún bicho. Ahí está la lección, en silencio.
 */
export function geomMotaPolen({ q = 1 } = {}) {
  const g = new THREE.SphereGeometry(0.5, Math.max(3, Math.round(5 * q)), 3);
  return pintar(g, PAL.maizPolen);
}

/* -------------------------------------------------------------------------- */
/*  El catálogo                                                                */
/* -------------------------------------------------------------------------- */

export const CULTIVO_GEOM = {
  maracuya: geomMaracuya,
  ahuyama: geomAhuyama,
  cafe: geomCafe,
  maiz: geomMaiz,
};

/* El fruto de cada cultivo (el maíz no lleva: su mazorca ya va en la mata, y
   además no depende del servicio — no habría nada que escalar). */
export const FRUTO_GEOM = {
  maracuya: geomFrutoMaracuya,
  ahuyama: geomFrutoAhuyama,
  cafe: geomGranoCafe,
};

/* Tamaño real de cada fruto cuando está PLENO (metros). El cuaje escala esto. */
export const FRUTO_TAM = { maracuya: 0.11, ahuyama: 0.3, cafe: 0.02 };
