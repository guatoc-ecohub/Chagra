/*
 * floraAguacatal.geom — la GEOMETRÍA del MUNDO DEL AGUACATE (piso templado
 * alto, 1.800–2.200 m: la franja del Hass en la montaña andina).
 *
 * El aguacate NO es un arbusto de era: es un ÁRBOL GRANDE, y esa escala es la
 * lección entera de este mundo. Un Hass adulto injertado llega a 8–10 m — le
 * pasa por encima a la casa — y el criollo viejo del patio, sembrado de
 * semilla, todavía más. Aquí cada especie se cuenta como es:
 *
 *   · Aguacate Hass adulto      — tronco corto y grueso que abre en ramas
 *                                 maestras, copa DENSA de hoja perenne verde
 *                                 muy oscuro (casi negra en sombra), más ancha
 *                                 que la casa y el doble de alta. Sembrado en
 *                                 CAMELLÓN (el montículo que salva su raíz
 *                                 superficial del encharcamiento).
 *   · Aguacate criollo de patio — el árbol de la casa, de semilla y de años:
 *                                 aún más alto, de copa elevada. Contra su
 *                                 tronco vive la ESCALERA de cosecha (la pone
 *                                 la escena): a ese árbol se le sube.
 *   · Fruto Hass                — piriforme y RUGOSO (facetado a propósito),
 *                                 colgando del PEDÚNCULO en racimos flojos.
 *                                 INSTANCIADO con color por instancia: verde →
 *                                 morado → morado-negro al madurar.
 *   · Fruto criollo             — más grande, cáscara LISA (malla suave) y
 *                                 verde brillante aun maduro: el contraste que
 *                                 enseña a distinguirlos.
 *   · Panícula de floración     — el aguacate florece en racimos de MILES de
 *                                 flores pequeñas amarillo-verdosas; aquí son
 *                                 motas pálidas al borde alto de la copa (las
 *                                 abejas las pone la capa viva).
 *   · Aguacate joven con TUTOR  — recién sembrado en su camellón, amarrado a
 *                                 la estaca: la raíz superficial no ancla y el
 *                                 viento lo tumba. El tutor ES la lección.
 *   · Maíz asociado             — la finca campesina no es monocultivo: junto
 *                                 a la casa, el manchón de maíz acompañando.
 *   · Hojarasca gruesa + piedra — bajo la copa densa casi no entra sol: queda
 *                                 el mantillo fresco, la cama del microclima.
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal.geom): cada especie se
 * FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja con
 * UN InstancedMesh → una draw-call por especie. Los FRUTOS van pintados
 * BLANCOS para que el color POR INSTANCIA (setColorAt) sea el color real de la
 * cáscara — un solo InstancedMesh lleva verdes, pintones y morado-negros.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (mordida conocida, 3 veces): aquí TODO se
 * desindexa antes de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  La finca aguacatera (la geografía del mundo, determinista)                 */
/* -------------------------------------------------------------------------- */

export const ANCHO = 40; // x: -20 … 20
export const FONDO = 38; // z: -19 (la loma, arriba) … 19 (el frente, abajo)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma finca siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.8 + wz * 0.6) * 0.5 +
    Math.sin(wx * 1.9 - wz * 1.4 + 2.3) * 0.3 +
    Math.sin(wx * 3.1 + wz * 2.7 + 5.1) * 0.2
  );
}

/* La ZANJILLA de drenaje: el corte a media ladera que saca el agua del lote
   nuevo — la raíz superficial del aguacate se AHOGA encharcada, y esta zanja
   es la defensa campesina. Corre curveada por el frente; se exporta el trazo
   para que el terreno la pinte húmeda y los pasos la señalen. */
export const zanjaEnX = (wz) => 4.6 + Math.sin(wz * 0.55 + 1.2) * 1.4;
const hondoZanja = (wx, wz) => {
  const enFrente = smoothstep(1.5, 4.5, wz) * smoothstep(16.5, 13.0, wz);
  const dx = Math.abs(wx - zanjaEnX(wz));
  return smoothstep(1.1, 0.2, dx) * 0.16 * enFrente;
};

/** La altura de la finca en un punto: media ladera suave (el aguacate quiere
    pendiente que drene, no risco) que gana altura hacia el fondo. */
export function alturaFinca(wx, wz) {
  const sub = smoothstep(8, -17, wz); // 0 al frente (bajo), 1 al fondo (la loma)
  let h = 0.12;
  h += sub * 3.6; // la ladera templada, más tendida que la cafetera
  h += ruido(wx * 0.5, wz * 0.5) * 0.3 * (0.35 + sub); // ondulación natural
  h -= hondoZanja(wx, wz); // la zanjilla de drenaje tallada
  return h;
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla la finca plena; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "finca de árboles grandes". Los
 * frutos son conteos de InstancedMesh repartidos entre los árboles cargados.
 */
export const FLORA_AGUACATAL = {
  alto: { hass: 13, criollo: 2, joven: 4, frutoHass: 110, frutoCriollo: 26, panicula: 46, maiz: 12, hojarasca: 18, piedra: 6 },
  medio: { hass: 9, criollo: 1, joven: 3, frutoHass: 60, frutoCriollo: 14, panicula: 22, maiz: 7, hojarasca: 10, piedra: 4 },
  bajo: { hass: 5, criollo: 1, joven: 2, frutoHass: 26, frutoCriollo: 8, panicula: 0, maiz: 4, hojarasca: 5, piedra: 2 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const aguacatalDeTier = (tier) => FLORA_AGUACATAL[tier] || FLORA_AGUACATAL.medio;

/** Factor de detalle geométrico por tier (menos masas/hojas en gama baja). */
export const CALIDAD_AGUACATAL = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadAguacatal = (tier) => CALIDAD_AGUACATAL[tier] ?? CALIDAD_AGUACATAL.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del aguacatal (colores horneados en vertexColors)                   */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // El árbol
  corteza: '#6a5844', // tronco gris-pardo del aguacate
  rama: '#77644c', // las ramas maestras que abren la copa
  copaSombra: '#1d3f24', // la copa perenne, verde MUY oscuro (la firma)
  copaOscura: '#152e1a', // el faldón de abajo, casi negro: el techo de sombra
  copaSol: '#2f5c2f', // la cara que da al sol
  copaBrillo: '#3d7038', // los remates altos donde pega la luz
  enves: '#93a873', // el envés pálido de la hoja (asoma horneado a motas)

  // Fruto (referencia — el color real va POR INSTANCIA):
  frutoVerde: '#5b7c36',
  frutoMorado: '#503046',
  frutoNegro: '#251722', // el Hass maduro, morado-negro
  criolloVerde: '#79a13f', // el criollo, liso y verde aun maduro
  criolloClaro: '#8fb54a',
  pedunculo: '#8a7a4f', // el rabito del que cuelga

  // Floración en panícula (amarillo-verdosa, nunca blanca de azahar)
  panicula: '#d3d488',
  paniculaCentro: '#c2cc6e',

  // Siembra: camellón, tutor y amarre
  camellon: '#8a5636', // la tierra del montículo (arcilla andina)
  camellonSeco: '#9a6a42',
  tutor: '#8a6f4d', // la estaca del joven
  amarre: '#c9b593', // la cabuya del amarre

  // Maíz asociado
  maizTallo: '#9fae62',
  maizHoja: '#7fb04a',
  maizHojaSol: '#98c258',
  mazorca: '#e2c04c',

  // Suelo del microclima
  hojarasca: '#6f5530', // la hoja gruesa del aguacate, cama parda
  hojarasca2: '#5e4728', // la capa húmeda de abajo
  piedra: '#8b8578',
  liquen: '#a3a878',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión desindexada + colocación + color horneado)              */
/* -------------------------------------------------------------------------- */

const UP = new THREE.Vector3(0, 1, 0);

/** Hornea un color plano en TODOS los vértices (atributo `color`). */
function pintar(geo, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color);
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

/** Coloca una geometría (posición/rotación/escala) transformando vértices. */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos`. */
function apuntar(geo, pos, dir, esc = [1, 1, 1]) {
  const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, d);
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    q,
    new THREE.Vector3(esc[0], esc[1], esc[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/**
 * Fusiona partes (ya coloreadas) en UNA geometría. Se DESINDEXA todo antes de
 * fusionar y se TRUENA si falla: mejor un error de build que una especie
 * invisible en producción (mordida conocida de mergeGeometries).
 */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((p) => {
    const plana = p.index ? p.toNonIndexed() : p;
    if (plana !== p) p.dispose();
    return plana;
  });
  const g = mergeGeometries(buenas, false);
  if (!g) {
    throw new Error('floraAguacatal: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que la copa no sea plana). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  AGUACATE — el árbol grande (Persea americana)                              */
/* -------------------------------------------------------------------------- */

/*
 * La ARQUITECTURA de la copa, compartida entre la malla y la distribución:
 * masas de follaje alrededor del eje. Se EXPORTA para que frutos, panículas y
 * el plateo del envés se siembren SOBRE la misma copa que la geometría dibuja
 * (nunca fruto flotando fuera del follaje). Coordenadas LOCALES de un árbol de
 * escala 1: la copa densa arranca en y≈2.2 y remata en y≈4.9 — con la casa de
 * ~2.3 de alto, el árbol de escala 1 ya la dobla.
 *
 * `borde`: las masas del CONTORNO BAJO donde cuelga el fruto (el aguacate
 * carga hacia afuera de la copa, donde hubo flor y llega la luz).
 */
export const MASAS_COPA = [
  { p: [0, 3.15, 0], s: 1.55, borde: false }, // el corazón denso
  { p: [1.2, 2.75, 0.35], s: 1.02, borde: true },
  { p: [-1.1, 2.9, -0.5], s: 1.06, borde: true },
  { p: [0.45, 2.6, -1.2], s: 0.96, borde: true },
  { p: [-0.55, 2.7, 1.15], s: 1.0, borde: true },
  { p: [0.8, 3.9, 0.55], s: 0.94, borde: false },
  { p: [-0.85, 3.85, -0.35], s: 0.9, borde: false },
  { p: [0.1, 4.4, -0.15], s: 0.84, borde: false }, // el remate alto
];

/** Cuántas masas de copa dibuja (y carga) cada tier. */
export const masasDeQ = (q) => (q < 0.5 ? 5 : q < 0.85 ? 7 : MASAS_COPA.length);

/* El estiramiento vertical del criollo de patio: de semilla y de años, más
   alto y de copa más elevada que el Hass injertado. */
export const ALZA_CRIOLLO = 1.14;

/*
 * El árbol adulto. `criollo` cambia el porte: más alto, copa más recogida y
 * elevada, SIN camellón (el del patio se sembró hace treinta años); el Hass
 * lleva su montículo de tierra — la siembra en camellón que salva la raíz
 * superficial del encharcamiento.
 */
export function geomAguacate({ q = 1, criollo = false } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];
  const alza = criollo ? ALZA_CRIOLLO : 1;

  // El camellón del Hass: el montículo donde va sembrado (la lección de la
  // raíz superficial, visible en CADA árbol del lote).
  if (!criollo) {
    const monte = new THREE.CylinderGeometry(0.62, 1.05, 0.34, 9, 1);
    poner(monte, [0, 0.13, 0]);
    partes.push(pintar(monte, PAL.camellon));
    const monteSeco = new THREE.CylinderGeometry(0.5, 0.7, 0.1, 9, 1);
    poner(monteSeco, [0, 0.32, 0]);
    partes.push(pintar(monteSeco, PAL.camellonSeco));
  }

  // Tronco corto y grueso que abre pronto en ramas maestras (porte real del
  // aguacate: no es palo recto de eucalipto, es candelabro ancho).
  const hTronco = 1.5 * alza;
  const tronco = new THREE.CylinderGeometry(0.13, 0.22, hTronco, 7, 1);
  poner(tronco, [0, hTronco * 0.5 + (criollo ? 0 : 0.24), 0]);
  partes.push(pintar(tronco, PAL.corteza));

  const nRamas = Math.max(3, Math.round(5 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r() * 0.6;
    const abre = 0.55 + r() * 0.35; // cuánto abre la rama maestra
    const rama = new THREE.CylinderGeometry(0.05, 0.1, 1.6 * alza, 5, 1);
    apuntar(
      rama,
      [Math.cos(a) * 0.62, (1.95 + r() * 0.3) * alza, Math.sin(a) * 0.62],
      [Math.cos(a) * abre, 1, Math.sin(a) * abre],
    );
    partes.push(pintar(rama, PAL.rama));
  }

  // LA COPA: densa, perenne, verde muy oscuro — el techo que domina el
  // paisaje. Masas de la tabla compartida; abajo más oscuras (la sombra
  // interior), arriba los remates al sol.
  const nMasas = masasDeQ(q);
  for (let i = 0; i < nMasas; i++) {
    const m = MASAS_COPA[i];
    const alta = m.p[1] > 3.5;
    const base = i === 0 ? PAL.copaSombra : alta ? (i % 2 ? PAL.copaBrillo : PAL.copaSol) : i % 2 ? PAL.copaSol : PAL.copaSombra;
    const masa = new THREE.IcosahedronGeometry(m.s, 1);
    poner(
      masa,
      [m.p[0], m.p[1] * alza + (r() - 0.5) * 0.12, m.p[2]],
      [0, r() * Math.PI, 0],
      [1.35 * (criollo ? 0.92 : 1), 0.95, 1.35 * (criollo ? 0.92 : 1)],
    );
    partes.push(pintar(masa, variar(base, r, 0.05)));
  }

  // El FALDÓN de abajo: dos masas casi negras cerrando la copa por debajo —
  // desde el suelo, pararse bajo el árbol es ver este techo oscuro.
  for (let i = 0; i < 2; i++) {
    const a = i * 2.6 + 0.8;
    const faldon = new THREE.IcosahedronGeometry(0.95, 1);
    poner(
      faldon,
      [Math.cos(a) * 0.55, 2.25 * alza, Math.sin(a) * 0.55],
      [0, r() * Math.PI, 0],
      [1.5, 0.6, 1.5],
    );
    partes.push(pintar(faldon, variar(PAL.copaOscura, r, 0.04)));
  }

  // Motas de ENVÉS pálido asomando en el contorno: la hoja del aguacate es
  // verde oscuro por el haz y pálida por debajo — cuando el viento la voltea,
  // el árbol "platea" (el brillo vivo lo anima la capa viva; esto es el
  // asomo quieto que lo hace verdad también en pausa).
  const nEnves = Math.max(2, Math.round(4 * q));
  for (let i = 0; i < nEnves; i++) {
    const m = MASAS_COPA[1 + Math.floor(r() * Math.min(nMasas - 1, 6))];
    const a = r() * Math.PI * 2;
    const mota = new THREE.SphereGeometry(1, 4, 2);
    poner(
      mota,
      [m.p[0] + Math.cos(a) * m.s * 1.15, m.p[1] * alza + (r() - 0.3) * 0.5, m.p[2] + Math.sin(a) * m.s * 1.15],
      [r() * 0.5, r() * Math.PI, r() * 0.5],
      [0.3, 0.06, 0.2],
    );
    partes.push(pintar(mota, variar(PAL.enves, r, 0.05)));
  }

  return fusionar(partes);
}

/*
 * El AGUACATE JOVEN con su TUTOR: recién sembrado en el lote nuevo del frente.
 * Camellón + arbolito de copa rala + la estaca con su amarre. La raíz
 * superficial no ancla al viento: sin tutor se tumba — la estaca ES la lección.
 */
export function geomAguacateJoven({ q = 1 } = {}, seed = 8) {
  const r = rng(seed);
  const partes = [];

  const monte = new THREE.CylinderGeometry(0.42, 0.78, 0.3, 9, 1);
  poner(monte, [0, 0.12, 0]);
  partes.push(pintar(monte, PAL.camellon));

  const tronco = new THREE.CylinderGeometry(0.035, 0.06, 1.05, 5, 1);
  poner(tronco, [0, 0.72, 0], [0.05, 0, 0.04]);
  partes.push(pintar(tronco, PAL.corteza));

  const nMasas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nMasas; i++) {
    const a = i * 2.4 + 0.6;
    const rad = i === 0 ? 0 : 0.28 + r() * 0.14;
    const masa = new THREE.IcosahedronGeometry(0.34 + r() * 0.12, 1);
    poner(
      masa,
      [Math.cos(a) * rad, 1.35 + i * 0.22, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.2, 0.9, 1.2],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.copaSol : PAL.copaSombra, r, 0.06)));
  }

  // El TUTOR: la estaca clavada al lado, con el amarre de cabuya.
  const estaca = new THREE.CylinderGeometry(0.028, 0.036, 1.45, 4, 1);
  poner(estaca, [0.24, 0.82, 0.1], [0, 0, -0.06]);
  partes.push(pintar(estaca, PAL.tutor));
  const amarre = new THREE.CylinderGeometry(0.075, 0.075, 0.06, 6, 1, true);
  poner(amarre, [0.12, 1.02, 0.05], [0.2, 0, 1.45]);
  partes.push(pintar(amarre, PAL.amarre));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  FRUTOS — el Hass rugoso vs el criollo liso                                 */
/* -------------------------------------------------------------------------- */

/** El fruto Hass: piriforme y RUGOSO (dodecaedro facetado + cuello), colgando
    de su PEDÚNCULO. Pintado blanco — el color real (verde→morado→negro) va
    POR INSTANCIA. El pedúnculo sí lleva su pardo fijo. */
export function geomFrutoHass() {
  const partes = [];
  const cuerpo = new THREE.DodecahedronGeometry(0.1, 0); // facetas = cáscara rugosa
  poner(cuerpo, [0, -0.06, 0], [0.35, 0.4, 0.2], [0.92, 1.28, 0.92]);
  partes.push(pintar(cuerpo, '#ffffff'));
  const cuello = new THREE.DodecahedronGeometry(0.06, 0);
  poner(cuello, [0, 0.06, 0], [0.8, 0.2, 0.5], [0.95, 1.1, 0.95]);
  partes.push(pintar(cuello, '#ffffff'));
  const ped = new THREE.CylinderGeometry(0.011, 0.014, 0.16, 4, 1);
  poner(ped, [0, 0.18, 0]);
  partes.push(pintar(ped, PAL.pedunculo));
  return fusionar(partes);
}

/** El fruto criollo: más grande, de cuello marcado y cáscara LISA (malla
    suave), verde brillante aun maduro. Pintado blanco; tinte por instancia en
    la gama de verdes. */
export function geomFrutoCriollo() {
  const partes = [];
  const cuerpo = new THREE.IcosahedronGeometry(0.115, 1); // detalle 1 = liso
  poner(cuerpo, [0, -0.08, 0], [0, 0, 0], [0.95, 1.2, 0.95]);
  partes.push(pintar(cuerpo, '#ffffff'));
  const cuello = new THREE.IcosahedronGeometry(0.07, 1);
  poner(cuello, [0, 0.08, 0], [0, 0, 0], [0.85, 1.25, 0.85]);
  partes.push(pintar(cuello, '#ffffff'));
  const ped = new THREE.CylinderGeometry(0.012, 0.016, 0.18, 4, 1);
  poner(ped, [0, 0.24, 0]);
  partes.push(pintar(ped, PAL.pedunculo));
  return fusionar(partes);
}

/** La PANÍCULA de floración: el racimo terminal de flores diminutas
    amarillo-verdosas (miles en el árbol real; aquí motas legibles de lejos). */
export function geomPanicula(seed = 7) {
  const r = rng(seed);
  const partes = [];
  const tallo = new THREE.CylinderGeometry(0.012, 0.018, 0.22, 4, 1);
  poner(tallo, [0, 0.1, 0], [0.15, 0, 0.1]);
  partes.push(pintar(tallo, PAL.paniculaCentro));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    const rad = i === 0 ? 0 : 0.06 + r() * 0.05;
    const mota = new THREE.IcosahedronGeometry(0.045 + r() * 0.02, 0);
    poner(
      mota,
      [Math.cos(a) * rad, 0.2 + r() * 0.08, Math.sin(a) * rad],
      [r() * 0.6, r() * Math.PI, r() * 0.6],
      [1.2, 0.85, 1.2],
    );
    partes.push(pintar(mota, variar(i % 2 ? PAL.panicula : PAL.paniculaCentro, r, 0.06)));
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  MAÍZ asociado — la finca no es monocultivo                                 */
/* -------------------------------------------------------------------------- */

export function geomMaiz({ q = 1 } = {}, seed = 4) {
  const r = rng(seed);
  const partes = [];
  const tallo = new THREE.CylinderGeometry(0.024, 0.04, 1.7, 5, 1);
  poner(tallo, [0, 0.85, 0], [0.03, 0, 0.05]);
  partes.push(pintar(tallo, PAL.maizTallo));
  const nHojas = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = i * 2.4 + r() * 0.4;
    const y = 0.4 + (i / nHojas) * 1.05;
    const hoja = new THREE.SphereGeometry(1, 5, 3);
    apuntar(
      hoja,
      [Math.cos(a) * 0.16, y, Math.sin(a) * 0.16],
      [Math.cos(a), 0.55 - (i / nHojas) * 0.25, Math.sin(a)],
      [0.05, 0.5, 0.12],
    );
    partes.push(pintar(hoja, variar(i % 2 ? PAL.maizHojaSol : PAL.maizHoja, r, 0.06)));
  }
  // La mazorca asomando con su amarillo (acento a cucharadas).
  const maz = new THREE.IcosahedronGeometry(0.07, 0);
  poner(maz, [0.1, 0.95, 0.05], [0, 0, -0.5], [0.8, 1.7, 0.8]);
  partes.push(pintar(maz, PAL.mazorca));
  const espiga = new THREE.CylinderGeometry(0.008, 0.02, 0.3, 4, 1);
  poner(espiga, [0, 1.82, 0]);
  partes.push(pintar(espiga, variar(PAL.maizTallo, r, 0.1)));
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  Suelo del microclima: hojarasca gruesa y piedra                            */
/* -------------------------------------------------------------------------- */

export function geomHojarasca(seed = 5) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const mancha = new THREE.CylinderGeometry(0.36 + r() * 0.34, 0.46 + r() * 0.36, 0.04, 7, 1);
    poner(mancha, [(r() - 0.5) * 0.55, 0.02 + i * 0.013, (r() - 0.5) * 0.55], [0, r() * Math.PI, 0]);
    partes.push(pintar(mancha, i % 2 ? PAL.hojarasca2 : PAL.hojarasca));
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 6) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.3, 0);
  poner(roca, [0, 0.13, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.7, 1]);
  const capa = new THREE.DodecahedronGeometry(0.17, 0);
  poner(capa, [0.11, 0.22, 0.05], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  El PLATEO del envés (geometría para la capa viva)                          */
/* -------------------------------------------------------------------------- */

/** Quads de "hojas volteadas" repartidos por el contorno de la copa, en
    coordenadas LOCALES del árbol (escala 1). La capa viva pone UNO de estos
    por árbol y le anima la opacidad a ráfagas: el viento voltea la hoja y el
    árbol platea. SIN color de vértice: el material pálido lo pone la escena. */
export function geomPlateo(seed = 9, alza = 1) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 7; i++) {
    const m = MASAS_COPA[1 + Math.floor(r() * (MASAS_COPA.length - 1))];
    const a = r() * Math.PI * 2;
    const quad = new THREE.PlaneGeometry(0.5 + r() * 0.25, 0.3 + r() * 0.15);
    poner(
      quad,
      [m.p[0] + Math.cos(a) * m.s * 1.2, m.p[1] * alza + (r() - 0.35) * m.s, m.p[2] + Math.sin(a) * m.s * 1.2],
      [(r() - 0.5) * 1.2, r() * Math.PI * 2, (r() - 0.5) * 0.8],
    );
    partes.push(quad);
  }
  const g = mergeGeometries(partes.map((p) => (p.index ? p.toNonIndexed() : p)), false);
  if (!g) throw new Error('floraAguacatal: geomPlateo — mergeGeometries devolvió null');
  return g;
}

/* -------------------------------------------------------------------------- */
/*  Distribución: finca campesina, nunca cuadrícula                            */
/* -------------------------------------------------------------------------- */

/*
 * Los árboles viven FIJOS en la finca (posiciones compuestas a mano): matorros
 * IRREGULARES de dos y tres, distancias desiguales — un lote campesino que fue
 * creciendo con los años, no una plantación de plantilla. El ORDEN importa: se
 * recorta por tier con slice, así que las primeras posiciones reparten el
 * campo entero para que hasta 'bajo' lea "finca de árboles grandes".
 */
export const SITIOS_HASS = [
  [2.6, -3.8], // el Hass grande del centro (cerca del camino: uno SE PARA debajo)
  [-4.2, -6.8], [12.6, -4.6], [-8.6, -2.2], [-1.6, 1.4],
  [-12.4, -7.8], [-6.4, 4.2], [3.8, -8.4], [-14.8, 0.6],
  [-10.2, -12.0], [8.2, 1.2], [-2.8, -12.6], [15.2, -9.0],
];

/* El criollo de PATIO junto a la casa (el primero: el que sale en todo tier) y
   el segundo criollo viejo del lindero, para gama alta. */
export const SITIOS_CRIOLLO = [
  [5.6, -10.4],
  [-17.2, -5.4],
];

/* El lote NUEVO del frente: los jóvenes con tutor, cerca de la zanjilla que
   los defiende del encharcamiento (la lección completa en un vistazo). */
export const SITIOS_JOVEN = [
  [1.2, 6.4], [-5.2, 8.6], [6.8, 7.6], [-10.8, 6.2],
];

/* El manchón de maíz asociado, pegado a la casa. */
const CENTRO_MAIZ = [13.6, -12.2];

/* La casa campesina (la escena pone la malla; la siembra la respeta). */
export const SITIO_CASA = /** @type {[number, number]} */ ([9.2, -9.8]);

/* Radio de copa aproximado en el suelo (para pintar la sombra/mantillo y
   sembrar la hojarasca): árbol de escala 1 → copa de ~2.1 de radio. */
export const RADIO_COPA = 2.1;

/** ¿Qué tan cargado/maduro va el lote? Los árboles de abajo (más viejos en
    esta finca) cargan más maduro; jitter determinista por árbol. */
function madurezEn(wz, r) {
  const base = smoothstep(-14, 2.5, wz);
  return clamp(base + (r() - 0.5) * 0.4, 0, 1);
}

/**
 * Siembra determinista de la finca completa. Devuelve items por especie:
 * `{pos, rotY, escala, tint}` (contrato del componente `Especie`); en los
 * FRUTOS el `tint` ES el color de la cáscara (Hass verde→morado→negro;
 * criollo en verdes). `q` fija cuántas masas de copa dibuja el tier — y por
 * tanto de cuáles masas pueden colgar frutos y asomar panículas.
 */
export function distribucionAguacatal(conteos, seed = 411, q = 1) {
  const c = conteos;
  const rArb = rng(seed + 1);
  const rFru = rng(seed + 2);
  const rSue = rng(seed + 3);
  const rFlo = rng(seed + 5);
  const nMasas = masasDeQ(q);

  // --- Los adultos: Hass en sus sitios (con jitter corto) y los criollos. ---
  const hass = SITIOS_HASS.slice(0, c.hass).map((p, i) => ({
    px: p[0] + (rArb() - 0.5) * 0.5,
    pz: p[1] + (rArb() - 0.5) * 0.5,
    esc: i === 0 ? 1.16 : 0.82 + rArb() * 0.28, // el del centro, el mayor del lote
    rotY: rArb() * Math.PI * 2,
    florecido: i % 3 === 1, // un tercio en floración: panícula + abejas
    carga: i % 3 !== 1 ? 0.5 + rArb() * 0.5 : 0.15, // el florecido casi no carga
  }));
  const criollo = SITIOS_CRIOLLO.slice(0, c.criollo).map((p, i) => ({
    px: p[0],
    pz: p[1],
    esc: i === 0 ? 1.18 : 1.05, // el de la casa: el árbol MAYOR del mundo
    rotY: rArb() * Math.PI * 2,
  }));

  const items = (lista) =>
    lista.map((s) => ({
      pos: [s.px, alturaFinca(s.px, s.pz), s.pz],
      rotY: s.rotY,
      escala: s.esc,
      tint: [0.93 + rArb() * 0.14, 0.93 + rArb() * 0.14, 0.93 + rArb() * 0.14],
    }));

  // --- Los frutos Hass: RACIMOS FLOJOS de 2–4 colgando del borde bajo de la
  //     copa (las masas `borde` de la tabla), con el pedúnculo a la vista.
  //     Color por instancia: verde → morado → morado-negro al madurar. ---
  const verde = new THREE.Color(PAL.frutoVerde);
  const morado = new THREE.Color(PAL.frutoMorado);
  const negro = new THREE.Color(PAL.frutoNegro);
  const col = new THREE.Color();
  const frutoHass = [];
  const cargados = hass.filter((s) => s.carga > 0.3);
  const bordes = MASAS_COPA.slice(0, nMasas).filter((m) => m.borde);
  /* Un punto local de la copa (masa m, ángulo a, descuelgue dy) al mundo. */
  const enCopa = (s, m, a, radMul, dy, rr, alza = 1) => {
    const lx = m.p[0] + Math.cos(a) * m.s * radMul + (rr() - 0.5) * 0.1;
    const ly = m.p[1] * alza + dy + (rr() - 0.5) * 0.08;
    const lz = m.p[2] + Math.sin(a) * m.s * radMul + (rr() - 0.5) * 0.1;
    const cosR = Math.cos(s.rotY);
    const sinR = Math.sin(s.rotY);
    return [
      s.px + (lx * cosR + lz * sinR) * s.esc,
      alturaFinca(s.px, s.pz) + ly * s.esc,
      s.pz + (-lx * sinR + lz * cosR) * s.esc,
    ];
  };
  let gi = 0;
  while (frutoHass.length < c.frutoHass && cargados.length > 0 && bordes.length > 0) {
    const s = cargados[gi % cargados.length];
    gi += 1;
    if (gi > cargados.length * 14) break;
    const m = bordes[Math.floor(rFru() * bordes.length)];
    const a0 = rFru() * Math.PI * 2;
    const madre = madurezEn(s.pz, rFru); // la madurez de la mata
    const cuantas = 2 + Math.floor(rFru() * 3); // el racimo FLOJO del aguacate
    for (let k = 0; k < cuantas && frutoHass.length < c.frutoHass; k++) {
      const a = a0 + (rFru() - 0.5) * 0.55;
      const dy = -0.62 - rFru() * 0.3; // colgado BAJO el follaje, pedúnculo visible
      const mz = clamp(madre + (rFru() - 0.5) * 0.5, 0, 1);
      if (mz < 0.55) col.lerpColors(verde, morado, mz / 0.55);
      else col.lerpColors(morado, negro, (mz - 0.55) / 0.45);
      col.multiplyScalar(0.94 + rFru() * 0.12);
      frutoHass.push({
        pos: enCopa(s, m, a, 1.02, dy, rFru),
        rotY: rFru() * Math.PI * 2,
        escala: (0.85 + rFru() * 0.35) * s.esc,
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- Los frutos del criollo: menos, más grandes, verdes aun maduros. ---
  const cVerde = new THREE.Color(PAL.criolloVerde);
  const cClaro = new THREE.Color(PAL.criolloClaro);
  const frutoCriollo = [];
  let ci = 0;
  while (frutoCriollo.length < c.frutoCriollo && criollo.length > 0 && bordes.length > 0) {
    const s = criollo[ci % criollo.length];
    ci += 1;
    if (ci > 40) break;
    const m = bordes[Math.floor(rFru() * bordes.length)];
    const a0 = rFru() * Math.PI * 2;
    const cuantas = 2 + Math.floor(rFru() * 2);
    for (let k = 0; k < cuantas && frutoCriollo.length < c.frutoCriollo; k++) {
      const a = a0 + (rFru() - 0.5) * 0.5;
      col.lerpColors(cVerde, cClaro, rFru());
      col.multiplyScalar(0.95 + rFru() * 0.1);
      frutoCriollo.push({
        pos: enCopa(s, m, a, 1.02, -0.7 - rFru() * 0.3, rFru, ALZA_CRIOLLO),
        rotY: rFru() * Math.PI * 2,
        escala: 0.9 + rFru() * 0.3,
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- Las panículas: en los Hass florecidos y en el criollo de patio (los
  //     criollos florecen a mares), asomadas al borde ALTO de la copa. ---
  const panicula = [];
  const florecidos = [
    ...hass.filter((s) => s.florecido).map((s) => ({ s, alza: 1 })),
    ...criollo.slice(0, 1).map((s) => ({ s, alza: ALZA_CRIOLLO })),
  ];
  const masasAltas = MASAS_COPA.slice(0, nMasas).filter((m) => m.p[1] > 2.6);
  let fi = 0;
  while (panicula.length < (c.panicula || 0) && florecidos.length > 0 && masasAltas.length > 0) {
    const { s, alza } = florecidos[fi % florecidos.length];
    fi += 1;
    if (fi > florecidos.length * 20) break;
    const m = masasAltas[Math.floor(rFlo() * masasAltas.length)];
    const a = rFlo() * Math.PI * 2;
    panicula.push({
      pos: enCopa(s, m, a, 1.12, 0.15, rFlo, alza),
      rotY: rFlo() * Math.PI * 2,
      escala: (0.9 + rFlo() * 0.5) * s.esc,
      tint: [1, 1 - rFlo() * 0.04, 0.92 - rFlo() * 0.05],
    });
  }

  // --- Los jóvenes con tutor, en el lote nuevo del frente. ---
  const joven = SITIOS_JOVEN.slice(0, c.joven).map((p) => ({
    pos: [p[0], alturaFinca(p[0], p[1]), p[1]],
    rotY: rArb() * Math.PI * 2,
    escala: 0.85 + rArb() * 0.3,
    tint: [0.94 + rArb() * 0.12, 0.94 + rArb() * 0.12, 0.94 + rArb() * 0.12],
  }));

  // --- El maíz asociado, en su manchón pegado a la casa (nunca surco). ---
  const maiz = [];
  for (let i = 0; i < c.maiz; i++) {
    const a = rSue() * Math.PI * 2;
    const rad = Math.sqrt(rSue()) * 2.6;
    const x = CENTRO_MAIZ[0] + Math.cos(a) * rad;
    const z = CENTRO_MAIZ[1] + Math.sin(a) * rad * 0.7;
    maiz.push({
      pos: [x, alturaFinca(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.8 + rSue() * 0.4,
      tint: [0.93 + rSue() * 0.14, 0.93 + rSue() * 0.14, 0.93 + rSue() * 0.14],
    });
  }

  // --- La hojarasca GRUESA bajo las copas (el microclima) y las piedras. ---
  const bajoCopa = [
    ...hass.map((s) => [s.px, s.pz, s.esc]),
    ...criollo.map((s) => [s.px, s.pz, s.esc]),
  ];
  const hojarasca = [];
  for (let i = 0; i < c.hojarasca; i++) {
    const s = bajoCopa[i % Math.max(1, bajoCopa.length)] || [0, -6, 1];
    const a = rSue() * Math.PI * 2;
    const rad = rSue() * RADIO_COPA * s[2] * 0.8;
    const x = s[0] + Math.cos(a) * rad;
    const z = s[1] + Math.sin(a) * rad;
    hojarasca.push({
      pos: [x, alturaFinca(x, z) + 0.01, z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.8 + rSue() * 0.7,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }
  const piedra = [];
  for (let i = 0; i < c.piedra; i++) {
    const x = -17 + rSue() * 34;
    const z = -15 + rSue() * 30;
    piedra.push({
      pos: [x, alturaFinca(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return {
    hass,
    criollo,
    itemsHass: items(hass),
    itemsCriollo: items(criollo),
    frutoHass,
    frutoCriollo,
    panicula,
    joven,
    maiz,
    hojarasca,
    piedra,
  };
}

/** Los centros de copa del tier con su escala (para la luz colada, el plateo
    del envés y las abejas de la capa viva): `{pos:[x,ySuelo,z], esc, alza,
    florecido}` — misma siembra determinista que la distribución. */
export function centrosCopa(conteos, seed = 411) {
  const r = rng(seed + 1);
  const centros = [];
  for (let i = 0; i < Math.min(conteos.hass, SITIOS_HASS.length); i++) {
    const p = SITIOS_HASS[i];
    const px = p[0] + (r() - 0.5) * 0.5;
    const pz = p[1] + (r() - 0.5) * 0.5;
    const esc = i === 0 ? 1.16 : 0.82 + r() * 0.28;
    r(); // rotY (mantener el hilo del rng en fase con la distribución)
    if (i % 3 !== 1) r(); // carga (solo los no-florecidos la consumen allá)
    centros.push({ pos: [px, alturaFinca(px, pz), pz], esc, alza: 1, florecido: i % 3 === 1 });
  }
  for (let i = 0; i < Math.min(conteos.criollo, SITIOS_CRIOLLO.length); i++) {
    const p = SITIOS_CRIOLLO[i];
    r(); // rotY
    centros.push({
      pos: [p[0], alturaFinca(p[0], p[1]), p[1]],
      esc: i === 0 ? 1.18 : 1.05,
      alza: ALZA_CRIOLLO,
      florecido: i === 0, // el criollo de patio florece a mares
    });
  }
  return centros;
}
