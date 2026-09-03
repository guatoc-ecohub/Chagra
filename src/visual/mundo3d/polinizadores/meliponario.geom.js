/*
 * meliponario.geom — LA CASA DE LA ANGELITA (y el saber que la sostiene).
 *
 * Meliponicultura: criar abejas nativas SIN AGUIJÓN. No es apicultura con otro
 * bicho — es otro oficio, y cada detalle del dibujo lo dice:
 *
 *   · LA CAJA RACIONAL (tipo INPA) — chica, de tablas, con tapa que se levanta.
 *     No es la Langstroth alta de la abeja de miel: es más pequeña y se maneja
 *     SIN traje ni humo, porque no hay de qué defenderse. Va bajo un alero, a
 *     media sombra: sol directo todo el día la sobrecalienta, y rincón húmedo y
 *     oscuro tampoco.
 *   · LA PIQUERA — LA FIRMA. Tetragonisca angustula construye en la entrada un
 *     TUBITO DE CERA que sobresale como una trompetica, y ahí se paran las
 *     guardianas, quietas, en el aire y en el borde. Quien haya visto una
 *     angelita de verdad reconoce ESE tubo antes que la abeja. Es el detalle que
 *     hace que este mundo no sea genérico.
 *   · LOS POTES DE CERUMEN — adentro no hay panales de cera: hay POTECITOS
 *     redondos de cerumen (cera mezclada con resina), y la miel se guarda APARTE
 *     de la cría. Por eso no se cosecha aplastando: se abren los potes y se
 *     escurre. La vista de corte lo enseña sin una palabra.
 *
 * Todo procedural, three-core puro, cero assets. Los potes solo se construyen si
 * la escena pide el corte (`abierta`), así en gama baja no se paga lo que no se ve.
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

function poner(geo, [x, y, z], rot = [0, 0, 0]) {
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

/* Medidas de la caja (metros). Chica de verdad: una colonia de angelita cabe en
   un cajón que se carga con una mano. Es parte del mensaje — no hace falta
   tierra ni plata para empezar: un rincón sombreado alcanza. */
export const CAJA = { ancho: 0.34, alto: 0.2, fondo: 0.24, patas: 0.42 };

/** La boca de la piquera en coordenadas locales de la caja (para el tráfico). */
export const PIQUERA_POS = [CAJA.ancho / 2 + 0.055, CAJA.patas + CAJA.alto * 0.5, 0];

/*
 * LA CAJA RACIONAL completa: patas, cuerpo, tapa, alero y piquera.
 * @param {{q?:number, abierta?:boolean}} opt  abierta = vista de corte (potes)
 */
export function geomCajaRacional({ q = 1, abierta = false } = {}, seed = 21) {
  const r = rng(seed);
  const piezas = [];
  const { ancho: A, alto: H, fondo: F, patas: P } = CAJA;

  // Patas: la caja NO va en el suelo (hormigas, humedad).
  for (const sx of [1, -1]) {
    for (const sz of [1, -1]) {
      const pata = new THREE.BoxGeometry(0.028, P, 0.028);
      piezas.push(pintar(poner(pata, [sx * (A / 2 - 0.03), P / 2, sz * (F / 2 - 0.03)]), '#6b4f2e'));
    }
  }

  // El cuerpo: tablas. Se dibujan las JUNTAS porque una caja bien hecha no tiene
  // rendijas — por ahí se le meten los fóridos a una colonia descuidada.
  const cuerpo = new THREE.BoxGeometry(A, H, F);
  piezas.push(pintar(poner(cuerpo, [0, P + H / 2, 0]), PAL.cajaMadera));
  for (let i = 0; i < 2; i++) {
    const junta = new THREE.BoxGeometry(A + 0.004, 0.008, F + 0.004);
    piezas.push(pintar(poner(junta, [0, P + H * (0.33 + i * 0.34), 0]), '#8a6538', 0.85));
  }

  // La tapa: se levanta para revisar. Sin humo, sin traje, sin drama.
  const tapa = new THREE.BoxGeometry(A + 0.03, 0.024, F + 0.03);
  piezas.push(pintar(poner(tapa, [0, P + H + 0.012, 0]), PAL.cajaMaderaTapa));

  // EL ALERO: media sombra y protección de la lluvia directa. Un techito de
  // zinc/teja sobre la caja — así es como se ve un meliponario de finca.
  const techo = new THREE.BoxGeometry(A + 0.16, 0.018, F + 0.14);
  piezas.push(pintar(poner(techo, [0, P + H + 0.19, 0], [0, 0, -0.1]), '#8a9099'));
  for (const sz of [1, -1]) {
    const sop = new THREE.CylinderGeometry(0.012, 0.012, 0.19, 4);
    piezas.push(pintar(poner(sop, [-A / 2 + 0.02, P + H + 0.095, sz * (F / 2 - 0.02)]), '#6b4f2e'));
  }

  // ── LA PIQUERA: el tubito de cera. LA FIRMA DE LA ANGELITA ────────────────
  // Sale de la boca de la caja como una trompetica y se abre en la punta.
  const boca = new THREE.CylinderGeometry(0.026, 0.026, 0.03, seg(q, 8));
  piezas.push(pintar(poner(boca, [A / 2 + 0.008, P + H * 0.5, 0], [0, 0, Math.PI / 2]), '#2e2318'));
  const tubo = new THREE.CylinderGeometry(0.03, 0.021, 0.075, seg(q, 9), 1, true);
  piezas.push(pintar(poner(tubo, [A / 2 + 0.05, P + H * 0.5, 0], [0, 0, Math.PI / 2]), PAL.cerumen));
  // La boca abocinada del tubo, con su borde irregular (es cera amasada a mano
  // de abeja, no un tubo de fábrica).
  const nLab = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nLab; i++) {
    const a = (i / nLab) * Math.PI * 2;
    const lab = new THREE.SphereGeometry(0.011 + r() * 0.005, 4, 3);
    piezas.push(pintar(poner(lab, [A / 2 + 0.088, P + H * 0.5 + Math.sin(a) * 0.032, Math.cos(a) * 0.032]), PAL.cerumenClaro, 0.95 + r() * 0.15));
  }
  // El reguero de cera alrededor de la boca (la entrada se va engordando).
  const reguero = new THREE.SphereGeometry(0.042, seg(q, 7), seg(q, 5));
  reguero.scale(0.35, 1, 1);
  piezas.push(pintar(poner(reguero, [A / 2 + 0.012, P + H * 0.5, 0]), PAL.cerumen, 0.9));

  // ── VISTA DE CORTE: lo que hay adentro ────────────────────────────────────
  if (abierta) {
    piezas.push(...piezasPotes(q, seed + 1, [0, P + H * 0.5, 0], A, H, F));
  }
  return fusionar(piezas);
}

/*
 * LOS POTES DE CERUMEN — el interior, cuando la caja se abre.
 * Dos zonas separadas, y esa separación ES el saber:
 *   · los POTES de miel y polen: bolas de cerumen agrupadas como uvas, a un lado.
 *   · el NIDO DE CRÍA: los discos horizontales apilados, al otro.
 * Se cosecha abriendo los potes, sin tocar la cría. Nunca aplastando.
 */
function piezasPotes(q, seed, [cx, cy, cz], A, H, F) {
  const r = rng(seed);
  const piezas = [];

  // Potes de miel (ámbar) y de polen (más oscuro), en racimo a la izquierda.
  const nPotes = Math.max(6, Math.round(16 * q));
  for (let i = 0; i < nPotes; i++) {
    const px = cx - A * 0.26 + (r() - 0.5) * A * 0.3;
    const py = cy - H * 0.22 + Math.floor(i / 5) * 0.035 + r() * 0.012;
    const pz = cz + (r() - 0.5) * F * 0.5;
    const pote = new THREE.SphereGeometry(0.019 + r() * 0.005, seg(q, 6), seg(q, 5));
    pote.scale(1, 1.15, 1);
    // Los de miel brillan ámbar; los de polen son pardos (polen prensado).
    const miel = i % 3 !== 0;
    piezas.push(pintar(poner(pote, [px, py, pz]), miel ? PAL.cerumenClaro : '#8a6a2e', miel ? 1.1 : 0.9));
  }

  // El nido de cría: discos horizontales apilados (así crece, en espiral).
  const nDisco = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nDisco; i++) {
    const d = new THREE.CylinderGeometry(0.055 - i * 0.004, 0.055 - i * 0.004, 0.012, seg(q, 10));
    piezas.push(pintar(poner(d, [cx + A * 0.22, cy - H * 0.3 + i * 0.016, cz]), '#d9b06a', 1 - i * 0.04));
  }
  // El involucro: las láminas de cerumen que envuelven y aíslan la cría.
  const inv = new THREE.SphereGeometry(0.075, seg(q, 8), seg(q, 6), 0, Math.PI * 2, 0, Math.PI * 0.55);
  piezas.push(pintar(poner(inv, [cx + A * 0.22, cy - H * 0.34, cz]), PAL.cerumen, 0.8));

  return piezas;
}

/*
 * EL BANCO donde se paran las cajas del meliponario (un tablón sobre horcones).
 * Sirve para que las cajas no queden en el pasto y para que se lea "aquí hay un
 * oficio, no una caja tirada".
 */
export function geomBancoMeliponario({ q = 1, largo = 1.5 } = {}) {
  const piezas = [];
  const tablon = new THREE.BoxGeometry(largo, 0.035, 0.34);
  piezas.push(pintar(poner(tablon, [0, 0.4, 0]), '#8a6538'));
  for (const s of [1, -1]) {
    const h = new THREE.CylinderGeometry(0.03, 0.038, 0.4, seg(q, 6));
    piezas.push(pintar(poner(h, [s * (largo / 2 - 0.12), 0.2, 0]), '#6b4f2e'));
    const trav = new THREE.BoxGeometry(0.03, 0.03, 0.3);
    piezas.push(pintar(poner(trav, [s * (largo / 2 - 0.12), 0.12, 0]), '#5e452a'));
  }
  return fusionar(piezas);
}

/*
 * EL PLATÓN DE AGUA con piedritas — el detalle de cuidado que casi nadie sabe:
 * en verano el rocío no alcanza, y una abeja se ahoga en agua lisa. Con unas
 * piedras asomadas tienen dónde pararse a beber. Cuesta nada y salva colonias.
 */
export function geomPlatonAgua({ q = 1 } = {}, seed = 33) {
  const r = rng(seed);
  const piezas = [];
  const borde = new THREE.CylinderGeometry(0.14, 0.12, 0.05, seg(q, 12), 1, true);
  piezas.push(pintar(poner(borde, [0, 0.025, 0]), '#9a8a76'));
  const fondo = new THREE.CylinderGeometry(0.12, 0.12, 0.006, seg(q, 12));
  piezas.push(pintar(poner(fondo, [0, 0.004, 0]), '#7a6b58'));
  // El agua
  const agua = new THREE.CylinderGeometry(0.128, 0.128, 0.03, seg(q, 12));
  piezas.push(pintar(poner(agua, [0, 0.03, 0]), '#8fc4d8', 1.05));
  // Las piedritas que asoman: los muelles donde se paran.
  const nP = Math.max(3, Math.round(7 * q));
  for (let i = 0; i < nP; i++) {
    const a = (i / nP) * Math.PI * 2 + r();
    const rad = r() * 0.08;
    const p = new THREE.SphereGeometry(0.022 + r() * 0.012, 5, 4);
    p.scale(1, 0.7, 1);
    piezas.push(pintar(poner(p, [Math.cos(a) * rad, 0.035, Math.sin(a) * rad]), i % 2 ? '#8a8175' : '#6e675d'));
  }
  return fusionar(piezas);
}
