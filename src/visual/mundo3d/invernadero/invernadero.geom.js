/*
 * invernadero.geom — la GEOMETRÍA del INVERNADERO CAMPESINO (el micro-mundo
 * donde la finca CRÍA su propia mata y fabrica su propio clima).
 *
 * Un túnel de guadua y plástico como el que se para en cualquier vereda: arcos
 * de guadua sobre postes, cubierta translúcida, puerta angosta al frente — y
 * ADENTRO el taller de la propagación y del cultivo protegido:
 *
 *   · la MESA DE ALMÁCIGO con sus bandejas germinadoras — celdas de sustrato
 *     donde la semilla despierta por etapas (unas apenas asoman, otras ya son
 *     plántula de dos hojas);
 *   · las BOLSAS DEL REPIQUE en el piso, junto a la mesa — la plántula que ya
 *     tiene fuerza pasa de la celda a la bolsa a echar raíz firme;
 *   · la CAMA DE TOMATE tutorado — bajo plástico el tomate escapa al golpe de
 *     la lluvia (hoja mojada = hongo), cada mata amarrada a su tutor, el fruto
 *     madurando del verde al rojo de abajo hacia arriba (como carga de verdad);
 *   · la CAMA DE HORTALIZA — pimentón en hileras cortas;
 *   · el RIEGO POR GOTEO — la caneca afuera y las líneas negras tendidas sobre
 *     las camas: bajo techo no llueve, el agua se entrega al pie de la mata;
 *   · la ERA DE ENDURECIMIENTO afuera, junto a la puerta — las matas que se
 *     aclimatan al sol y al viento antes de irse al lote.
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal.geom): cada familia se
 * FUSIONA en UNA geometría con color horneado en vertexColors; lo repetido
 * (bandeja, brote, mata de tomate, fruto, hortaliza, bolsa) es un InstancedMesh
 * → una draw-call por familia. El BROTE y el FRUTO se pintan BLANCOS en la
 * geometría para que el color POR INSTANCIA (setColorAt) cuente la etapa: el
 * brote del verde tierno al verde firme, el fruto del verde al rojo.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (mordida conocida): aquí TODO se desindexa antes
 * de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';
import { ruidoTerreno, smoothstep } from '../kit/ruido.js';
import { VERDES, TIERRAS, CASA, ACENTOS, AGUAS, PALETA, mezclar } from '../paleta/paletaMadre.js';

/* -------------------------------------------------------------------------- */
/*  El terreno del claro (la geografía del micro-mundo, determinista)          */
/* -------------------------------------------------------------------------- */

export const ANCHO = 30; // x: -15 … 15
export const FONDO = 34; // z: -17 … 17

/* El túnel: dimensiones compartidas entre estructura, plástico y distribución. */
export const INV = {
  largo: 13, // z: -6.5 … 6.5 (la puerta mira a +z)
  radio: 3.05, // semiancho del arco (x: -3.05 … 3.05)
  arranque: 1.45, // altura donde el arco arranca del poste
  aplaste: 0.54, // escala vertical del arco (cumbrera ≈ 3.1)
  puerta: 1.7, // ancho del vano de la puerta
};

/** Altura del claro: loma suave que sube al fondo, APLANADA bajo el túnel. */
export function alturaInvernadero(x, z) {
  const base =
    0.5 * smoothstep(2, -16, z) + // la loma del fondo
    0.28 * ruidoTerreno(x * 0.18, z * 0.16) +
    0.08 * ruidoTerreno(x * 0.7, z * 0.6);
  // el pad del invernadero y su patio de entrada, a nivel
  const dx = Math.max(0, Math.abs(x) - (INV.radio + 1.6));
  const dz = Math.max(0, Math.abs(z - 1.2) - (INV.largo / 2 + 3.2));
  const lejos = smoothstep(0, 2.6, Math.hypot(dx, dz));
  return Math.max(0, base) * lejos;
}

/* Los sitios que la lección señala (x, z de mundo; el host los sube al suelo). */
export const SITIO_PUERTA = [0, 6.6];
export const SITIO_MESA = [1.95, 4.0];
export const SITIO_BOLSAS = [0.78, 2.6];
export const SITIO_TOMATE = [-1.9, -1.8];
export const SITIO_CANECA = [-4.3, 6.0];
export const SITIO_ERA = [4.2, 5.4];

/* -------------------------------------------------------------------------- */
/*  Paleta local (todo de la paleta madre; la guadua es la única voz nueva)    */
/* -------------------------------------------------------------------------- */

const PAL = {
  guadua: '#b1a45f', // el amarillo-verdoso de la guadua curada
  guaduaNudo: '#877a45', // el anillo del nudo
  maderaCama: CASA.madera, // tabla curtida de la cama
  maderaClara: PALETA.maderaClara ?? '#a9885f',
  sustrato: TIERRAS.turba, // tierra viva, oscura y húmeda
  sustratoSeco: TIERRAS.siembra,
  bandeja: '#45413a', // la bandeja germinadora (plástico curtido)
  bolsa: '#33302c', // la bolsa negra de vivero
  tallo: VERDES.trabajo,
  hoja: VERDES.templadoVivo,
  hojaClara: VERDES.brote,
  hojaOscura: VERDES.monte,
  pimenton: '#c9503a',
  pimentonVerde: '#6f9a44',
  manguera: '#3b3833', // la línea de goteo, negra curtida
  caneca: mezclar(AGUAS.viva, '#1e2c38', 0.35), // la caneca azul de toda finca
  carpinteria: CASA.carpinteria,
};

/* -------------------------------------------------------------------------- */
/*  Utilidades (fusión desindexada + colocación + color horneado)              */
/* -------------------------------------------------------------------------- */

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

/**
 * Fusiona partes (ya coloreadas) en UNA geometría. Se DESINDEXA todo antes de
 * fusionar y se TRUENA si falla: mejor un error de build que una familia
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
    throw new Error('invernadero: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que nada se vea de fábrica). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  LA ESTRUCTURA — guadua, correas, puerta, mesa de almácigo, camas           */
/* -------------------------------------------------------------------------- */

/** Un tramo de guadua: caña + anillos de nudo horneados. */
function guadua(partes, pos, alto, radio = 0.045, rot = [0, 0, 0]) {
  const cana = new THREE.CylinderGeometry(radio * 0.92, radio, alto, 6, 1);
  poner(cana, [0, alto / 2, 0]);
  poner(cana, pos, rot);
  partes.push(pintar(cana, PAL.guadua));
  const nudos = Math.max(1, Math.round(alto / 0.55));
  for (let i = 1; i <= nudos; i++) {
    const anillo = new THREE.CylinderGeometry(radio * 1.1, radio * 1.1, 0.035, 6, 1);
    poner(anillo, [0, (alto * i) / (nudos + 1), 0]);
    poner(anillo, pos, rot);
    partes.push(pintar(anillo, PAL.guaduaNudo));
  }
}

/**
 * La estructura completa del invernadero + la carpintería del lugar:
 * postes y arcos de guadua, cumbrera y correas, el marco verde de la puerta,
 * la mesa de almácigo y las tablas de las dos camas (el sustrato va aparte,
 * en geomCamas, para poder darle su color de tierra viva).
 */
export function geomEstructura() {
  const { largo, radio, arranque, aplaste, puerta } = INV;
  const partes = [];

  // Postes de guadua a los lados, cada ~2.16 (7 pares).
  const nArcos = 7;
  for (let i = 0; i < nArcos; i++) {
    const z = -largo / 2 + (largo * i) / (nArcos - 1);
    guadua(partes, [-radio, 0, z], arranque, 0.05);
    guadua(partes, [radio, 0, z], arranque, 0.05);
    // El ARCO: media toro vertical (plano XY), aplastado a la altura del túnel.
    const arco = new THREE.TorusGeometry(radio, 0.042, 5, 14, Math.PI);
    arco.scale(1, aplaste, 1);
    poner(arco, [0, arranque, z]);
    partes.push(pintar(arco, PAL.guadua));
  }

  // Cumbrera y dos correas laterales, a lo largo.
  const cumbre = arranque + radio * aplaste;
  const correa = (x, y) => {
    const c = new THREE.CylinderGeometry(0.03, 0.03, largo + 0.2, 5, 1);
    poner(c, [x, y, 0], [Math.PI / 2, 0, 0]);
    partes.push(pintar(c, PAL.guadua));
  };
  correa(0, cumbre - 0.02);
  correa(-radio * 0.62, arranque + radio * aplaste * 0.76);
  correa(radio * 0.62, arranque + radio * aplaste * 0.76);

  // El MARCO DE LA PUERTA, pintado del verde campesino de la carpintería.
  const zP = largo / 2;
  for (const x of [-puerta / 2, puerta / 2]) {
    const jamba = new THREE.BoxGeometry(0.09, 2.12, 0.09);
    poner(jamba, [x, 1.06, zP]);
    partes.push(pintar(jamba, PAL.carpinteria));
  }
  const dintel = new THREE.BoxGeometry(puerta + 0.18, 0.09, 0.09);
  poner(dintel, [0, 2.14, zP]);
  partes.push(pintar(dintel, PAL.carpinteria));

  // LA MESA DE ALMÁCIGO (adentro, a la derecha de la puerta): patas + tablero.
  const [mx, mz] = SITIO_MESA;
  for (const [dx, dz] of [[-0.5, -1.0], [0.5, -1.0], [-0.5, 1.0], [0.5, 1.0]]) {
    const pata = new THREE.BoxGeometry(0.07, 0.8, 0.07);
    poner(pata, [mx + dx, 0.4, mz + dz]);
    partes.push(pintar(pata, PAL.maderaCama));
  }
  const tablero = new THREE.BoxGeometry(1.16, 0.06, 2.3);
  poner(tablero, [mx, 0.82, mz]);
  partes.push(pintar(tablero, PAL.maderaClara));

  // LOS TUTORES del tomate: varas de guadua delgadas en la cama izquierda
  // (misma retícula que distribucionInvernadero usa para sembrar las matas).
  for (const p of posicionesTomate(14)) {
    guadua(partes, [p[0], 0.52, p[1]], 1.55, 0.02);
  }

  return fusionar(partes);
}

/** La retícula del tomate (compartida entre tutores, matas y frutos). */
export function posicionesTomate(n) {
  const out = [];
  const filas = [-2.28, -1.55];
  const porFila = Math.ceil(n / filas.length);
  for (let f = 0; f < filas.length && out.length < n; f++) {
    for (let i = 0; i < porFila && out.length < n; i++) {
      const z = -5.4 + i * (9.6 / (porFila - 1 || 1));
      out.push([filas[f] + (f % 2 ? 0.06 : -0.06), z]);
    }
  }
  return out;
}

/**
 * Las CAMAS con su tierra: tablas de borde + sustrato oscuro y húmedo.
 * Dos camas adentro (tomate a la izquierda, hortaliza a la derecha) y la ERA
 * DE ENDURECIMIENTO afuera, junto a la puerta.
 */
export function geomCamas() {
  const partes = [];
  const r = rng(41);

  const cama = (cx, cz, w, l, hueco = false) => {
    const alto = 0.34;
    // las cuatro tablas del borde
    const tabla = (dx, dz, tw, tl) => {
      const t = new THREE.BoxGeometry(tw, alto, tl);
      poner(t, [cx + dx, alto / 2, cz + dz]);
      partes.push(pintar(t, variar(PAL.maderaCama, r, 0.05)));
    };
    tabla(-w / 2, 0, 0.06, l);
    tabla(w / 2, 0, 0.06, l);
    tabla(0, -l / 2, w, 0.06);
    tabla(0, l / 2, w, 0.06);
    // el sustrato, a ras del borde
    if (!hueco) {
      const s = new THREE.BoxGeometry(w - 0.1, 0.06, l - 0.1);
      poner(s, [cx, alto - 0.04, cz]);
      partes.push(pintar(s, variar(PAL.sustrato, r, 0.07)));
    }
  };

  cama(-1.9, -0.4, 1.5, 10.4); // la cama del tomate (izquierda, todo el largo)
  cama(1.95, -1.8, 1.5, 7.6); // la cama de hortaliza (derecha, hasta la mesa)
  cama(SITIO_ERA[0], SITIO_ERA[1], 1.3, 2.2); // la era de endurecimiento, afuera

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  EL PLÁSTICO — la cubierta translúcida (material aparte en la escena)       */
/* -------------------------------------------------------------------------- */

/**
 * La cubierta: bóveda de medio cilindro aplastado + faldones laterales +
 * culata trasera cerrada + frente con vano de puerta. SIN color horneado:
 * la escena le pone su material translúcido (lechoso, DoubleSide).
 */
export function geomPlastico() {
  const { largo, radio, arranque, aplaste, puerta } = INV;
  const partes = [];

  // La bóveda: medio cilindro abierto, eje a lo largo de Z, mitad superior.
  const boveda = new THREE.CylinderGeometry(radio, radio, largo, 14, 1, true, 0, Math.PI);
  boveda.rotateX(Math.PI / 2); // eje Y → Z
  boveda.rotateZ(Math.PI / 2); // la media caña queda arriba (y ≥ 0)
  boveda.scale(1, aplaste, 1);
  boveda.translate(0, arranque, 0);
  partes.push(boveda);

  // Faldones laterales: del arranque al suelo, a lo largo.
  for (const x of [-radio, radio]) {
    const faldon = new THREE.PlaneGeometry(largo, arranque - 0.06);
    poner(faldon, [x, (arranque - 0.06) / 2 + 0.06, 0], [0, Math.PI / 2, 0]);
    partes.push(faldon);
  }

  // Culata trasera: medio disco (el arco) + rectángulo abajo.
  const culataArco = new THREE.CircleGeometry(radio, 14, 0, Math.PI);
  culataArco.scale(1, aplaste, 1);
  poner(culataArco, [0, arranque, -largo / 2]);
  partes.push(culataArco);
  const culataBajo = new THREE.PlaneGeometry(radio * 2, arranque - 0.06);
  poner(culataBajo, [0, (arranque - 0.06) / 2 + 0.06, -largo / 2]);
  partes.push(culataBajo);

  // Frente: dos paños laterales dejando el vano de la puerta + el paño alto.
  const zP = largo / 2;
  const anchoPano = radio - puerta / 2;
  for (const lado of [-1, 1]) {
    const pano = new THREE.PlaneGeometry(anchoPano, 2.1);
    poner(pano, [lado * (puerta / 2 + anchoPano / 2), 1.11, zP]);
    partes.push(pano);
  }
  const panoAlto = new THREE.PlaneGeometry(radio * 2, 0.9);
  panoAlto.scale(1, 1, 1);
  poner(panoAlto, [0, 2.6, zP]);
  partes.push(panoAlto);

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  EL RIEGO — la caneca afuera y las líneas de goteo sobre las camas          */
/* -------------------------------------------------------------------------- */

export function geomRiego() {
  const partes = [];
  const [cx, cz] = SITIO_CANECA;

  // La caneca azul, con su tapa y su zuncho.
  const cuerpo = new THREE.CylinderGeometry(0.34, 0.31, 0.82, 10, 1);
  poner(cuerpo, [cx, 0.41, cz]);
  partes.push(pintar(cuerpo, PAL.caneca));
  const tapa = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 10, 1);
  poner(tapa, [cx, 0.85, cz]);
  partes.push(pintar(tapa, mezclar(PAL.caneca, '#ffffff', 0.18)));
  const zuncho = new THREE.CylinderGeometry(0.355, 0.355, 0.045, 10, 1);
  poner(zuncho, [cx, 0.55, cz]);
  partes.push(pintar(zuncho, mezclar(PAL.caneca, '#0a1218', 0.3)));

  // La manguera madre: de la caneca al piso y por el pasillo hasta las camas.
  const tramo = (a, b, r = 0.02) => {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dy, dz);
    const t = new THREE.CylinderGeometry(r, r, len, 5, 1);
    poner(t, [0, len / 2, 0]);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(dx, dy, dz).normalize(),
    );
    t.applyQuaternion(q);
    t.translate(a[0], a[1], a[2]);
    partes.push(pintar(t, PAL.manguera));
  };
  tramo([cx + 0.3, 0.2, cz], [-1.2, 0.05, 6.4]);
  tramo([-1.2, 0.05, 6.4], [-1.9, 0.36, 4.9]);
  tramo([1.4, 0.05, 6.0], [1.95, 0.36, 2.2]);
  tramo([-1.2, 0.05, 6.4], [1.4, 0.05, 6.0]);

  // Las LÍNEAS DE GOTEO tendidas sobre el sustrato, a lo largo de cada cama.
  const linea = (x, z0, z1, y) => {
    const len = Math.abs(z1 - z0);
    const l = new THREE.CylinderGeometry(0.016, 0.016, len, 4, 1);
    poner(l, [x, y, (z0 + z1) / 2], [Math.PI / 2, 0, 0]);
    partes.push(pintar(l, PAL.manguera));
    // los goteros: nuditos cada ~0.8
    const n = Math.floor(len / 0.8);
    for (let i = 0; i <= n; i++) {
      const g = new THREE.SphereGeometry(0.024, 5, 4);
      poner(g, [x, y + 0.01, z0 + (len * i) / n]);
      partes.push(pintar(g, mezclar(PAL.manguera, '#000000', 0.25)));
    }
  };
  linea(-2.28, -5.5, 4.7, 0.36);
  linea(-1.55, -5.5, 4.7, 0.36);
  linea(1.6, -5.5, 1.9, 0.36);
  linea(2.3, -5.5, 1.9, 0.36);

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  LAS FAMILIAS INSTANCIADAS (una geometría unitaria; N instancias)           */
/* -------------------------------------------------------------------------- */

/** Bandeja germinadora: marco + celdas de sustrato (unidad; se instancia). */
export function geomBandeja() {
  const partes = [];
  const marco = new THREE.BoxGeometry(0.62, 0.055, 0.42);
  poner(marco, [0, 0.028, 0]);
  partes.push(pintar(marco, PAL.bandeja));
  const tierra = new THREE.BoxGeometry(0.56, 0.02, 0.36);
  poner(tierra, [0, 0.052, 0]);
  partes.push(pintar(tierra, PAL.sustrato));
  return fusionar(partes);
}

/**
 * Un BROTE de celda, BLANCO (el color por instancia cuenta la etapa) y con la
 * base en y=0: al escalar la instancia, la plántula CRECE hacia arriba.
 */
export function geomBrote() {
  const partes = [];
  const tallo = new THREE.CylinderGeometry(0.006, 0.008, 0.07, 4, 1);
  poner(tallo, [0, 0.035, 0]);
  partes.push(pintar(tallo, '#ffffff'));
  // los dos cotiledones: conitos tumbados a lado y lado
  for (const lado of [-1, 1]) {
    const hoja = new THREE.ConeGeometry(0.02, 0.075, 4);
    poner(hoja, [lado * 0.035, 0.075, 0], [0, 0, lado * -1.35]);
    partes.push(pintar(hoja, '#ffffff'));
  }
  return fusionar(partes);
}

/** La mata de tomate (sin fruto): tallo que sube pegado al tutor + follaje. */
export function geomTomatePlanta(seed = 7) {
  const r = rng(seed);
  const partes = [];
  // el tallo, en tres tramos apenas quebrados
  let y = 0.36;
  let x = 0.03;
  for (let i = 0; i < 3; i++) {
    const len = 0.42;
    const t = new THREE.CylinderGeometry(0.014, 0.02, len, 5, 1);
    poner(t, [x, y + len / 2, 0], [0, 0, (r() - 0.5) * 0.22]);
    partes.push(pintar(t, PAL.tallo));
    y += len * 0.94;
    x += (r() - 0.5) * 0.05;
  }
  // el follaje: penachos facetados, más tupidos arriba
  const penachos = [
    [0.1, 0.62, 0.05, 0.15],
    [-0.11, 0.85, -0.04, 0.17],
    [0.09, 1.1, 0.08, 0.18],
    [-0.07, 1.32, -0.07, 0.17],
    [0.02, 1.5, 0.02, 0.14],
  ];
  for (const [px, py, pz, rad] of penachos) {
    const p = new THREE.IcosahedronGeometry(rad, 0);
    poner(p, [px, py, pz], [r() * 3, r() * 3, 0], [1, 0.72, 1]);
    partes.push(pintar(p, variar(r() > 0.4 ? PAL.hoja : PAL.hojaClara, r, 0.07)));
  }
  return fusionar(partes);
}

/** Un racimo de tomate (3 frutos), BLANCO: el color por instancia madura. */
export function geomTomateFruto() {
  const partes = [];
  for (const [dx, dy, dz] of [[0, 0, 0], [0.055, -0.03, 0.02], [-0.04, -0.045, -0.02]]) {
    const f = new THREE.SphereGeometry(0.042, 7, 5);
    poner(f, [dx, dy, dz], [0, 0, 0], [1, 0.92, 1]);
    partes.push(pintar(f, '#ffffff'));
  }
  return fusionar(partes);
}

/** La mata de pimentón: matica baja y tupida con sus frutos horneados. */
export function geomHortaliza(seed = 9) {
  const r = rng(seed);
  const partes = [];
  const tallo = new THREE.CylinderGeometry(0.012, 0.018, 0.2, 4, 1);
  poner(tallo, [0, 0.1, 0]);
  partes.push(pintar(tallo, PAL.tallo));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const p = new THREE.IcosahedronGeometry(0.11 + r() * 0.03, 0);
    poner(p, [Math.cos(a) * 0.08, 0.24 + r() * 0.08, Math.sin(a) * 0.08], [r() * 3, r() * 3, 0], [1, 0.8, 1]);
    partes.push(pintar(p, variar(i % 2 ? PAL.hoja : PAL.hojaOscura, r, 0.06)));
  }
  // dos pimentones colgando: uno pintón, uno verde (el ciclo a la vista)
  for (const [dx, dz, col] of [[0.09, 0.04, PAL.pimenton], [-0.08, -0.05, PAL.pimentonVerde]]) {
    const f = new THREE.CylinderGeometry(0.035, 0.045, 0.09, 6, 1);
    poner(f, [dx, 0.16, dz]);
    partes.push(pintar(f, col));
  }
  return fusionar(partes);
}

/** La bolsa del repique: bolsa negra + su plántula ya repicada. */
export function geomBolsa(seed = 11) {
  const r = rng(seed);
  const partes = [];
  const bolsa = new THREE.CylinderGeometry(0.085, 0.07, 0.17, 7, 1);
  poner(bolsa, [0, 0.085, 0]);
  partes.push(pintar(bolsa, PAL.bolsa));
  const tierra = new THREE.CylinderGeometry(0.075, 0.075, 0.02, 7, 1);
  poner(tierra, [0, 0.17, 0]);
  partes.push(pintar(tierra, PAL.sustrato));
  const tallo = new THREE.CylinderGeometry(0.007, 0.01, 0.14, 4, 1);
  poner(tallo, [0, 0.24, 0]);
  partes.push(pintar(tallo, PAL.tallo));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r();
    const h = new THREE.ConeGeometry(0.026, 0.1, 4);
    poner(h, [Math.cos(a) * 0.05, 0.32, Math.sin(a) * 0.05], [0, 0, Math.cos(a) * -1.2]);
    partes.push(pintar(h, variar(PAL.hojaClara, r, 0.08)));
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  CONTEOS POR TIER + DISTRIBUCIÓN DETERMINISTA                               */
/* -------------------------------------------------------------------------- */

/** Cuánta vida siembra cada gama (el fotograma digno no se negocia). */
export function invernaderoDeTier(tier) {
  if (tier === 'alto') {
    return { tomate: 14, frutosPorMata: 5, hortaliza: 27, bandeja: 6, brotesPorBandeja: 15, bolsa: 8, era: 4, vaho: 5, gotas: 10 };
  }
  if (tier === 'medio') {
    return { tomate: 10, frutosPorMata: 4, hortaliza: 18, bandeja: 4, brotesPorBandeja: 12, bolsa: 6, era: 3, vaho: 0, gotas: 6 };
  }
  return { tomate: 8, frutosPorMata: 3, hortaliza: 12, bandeja: 3, brotesPorBandeja: 8, bolsa: 4, era: 2, vaho: 0, gotas: 0 };
}

const tintDe = (c) => {
  const col = new THREE.Color(c);
  return [col.r, col.g, col.b];
};

/* La maduración del tomate, de abajo (rojo) hacia arriba (verde) — como carga
   la mata de verdad: el racimo bajo cuajó primero. */
const FRUTO_ETAPAS = [ACENTOS.cochinilla, '#d1382b', '#e0a13c', '#a7b04c', '#7fae4f'];

/* La etapa del brote: del verde tierno (recién asomado) al verde firme. */
const BROTE_ETAPAS = ['#a9c47a', '#8db95f', '#74a94e', '#5f9a43'];

/**
 * Siembra TODO el invernadero, determinista: mismas matas en 2D↔3D↔recargas.
 * Devuelve items {pos, rotY, escala, tint} por familia (contrato de Especie).
 */
export function distribucionInvernadero(conteos, semilla = 733) {
  const r = rng(semilla);
  const out = { bandeja: [], brote: [], tomate: [], fruto: [], hortaliza: [], bolsa: [] };

  // Las BANDEJAS sobre la mesa de almácigo (2 columnas × 3 filas).
  const [mx, mz] = SITIO_MESA;
  const puestos = [];
  for (let f = 0; f < 3; f++) {
    for (let c = 0; c < 2; c++) puestos.push([mx - 0.26 + c * 0.52, mz - 0.72 + f * 0.72]);
  }
  for (let i = 0; i < Math.min(conteos.bandeja, puestos.length); i++) {
    const [bx, bz] = puestos[i];
    const rotY = (r() - 0.5) * 0.12;
    out.bandeja.push({ pos: [bx, 0.85, bz], rotY, escala: 1, tint: tintDe('#ffffff') });
    // los brotes de ESTA bandeja: retícula 5×3, etapa creciente con ruido
    const cols = 5;
    const filas = 3;
    const n = Math.min(conteos.brotesPorBandeja, cols * filas);
    for (let k = 0; k < n; k++) {
      const cc = k % cols;
      const ff = Math.floor(k / cols);
      const px = bx + (cc - (cols - 1) / 2) * 0.11;
      const pz = bz + (ff - (filas - 1) / 2) * 0.115;
      // la etapa avanza por la bandeja (germinación como progresión) + ruido
      const etapa = Math.min(0.999, (i / Math.max(1, conteos.bandeja)) * 0.5 + (k / n) * 0.5 + (r() - 0.5) * 0.18);
      const e = Math.max(0, etapa);
      out.brote.push({
        pos: [px, 0.905, pz],
        rotY: r() * Math.PI * 2,
        escala: 0.45 + e * 0.9,
        tint: tintDe(BROTE_ETAPAS[Math.min(BROTE_ETAPAS.length - 1, Math.floor(e * BROTE_ETAPAS.length))]),
      });
    }
  }

  // El TOMATE tutorado (cama izquierda) + sus racimos madurando de abajo arriba.
  const matas = posicionesTomate(conteos.tomate);
  for (const [tx, tz] of matas) {
    out.tomate.push({
      pos: [tx, 0.32, tz],
      rotY: r() * Math.PI * 2,
      escala: 0.88 + r() * 0.24,
      tint: tintDe('#ffffff'),
    });
    for (let k = 0; k < conteos.frutosPorMata; k++) {
      const alturaFrac = (k + 0.5) / conteos.frutosPorMata; // 0 abajo … 1 arriba
      const a = r() * Math.PI * 2;
      const etapa = Math.min(FRUTO_ETAPAS.length - 1, Math.floor(alturaFrac * FRUTO_ETAPAS.length));
      out.fruto.push({
        pos: [tx + Math.cos(a) * 0.13, 0.5 + alturaFrac * 1.0, tz + Math.sin(a) * 0.13],
        rotY: r() * Math.PI * 2,
        escala: 0.8 + r() * 0.35,
        tint: tintDe(FRUTO_ETAPAS[etapa]),
      });
    }
  }

  // La HORTALIZA (cama derecha): tres hileras cortas de pimentón.
  const filasH = [1.55, 1.95, 2.35];
  const porFilaH = Math.ceil(conteos.hortaliza / filasH.length);
  let h = 0;
  for (let f = 0; f < filasH.length && h < conteos.hortaliza; f++) {
    for (let i = 0; i < porFilaH && h < conteos.hortaliza; i++, h++) {
      const z = -5.2 + i * (6.6 / (porFilaH - 1 || 1));
      out.hortaliza.push({
        pos: [filasH[f], 0.34, z],
        rotY: r() * Math.PI * 2,
        escala: 0.82 + r() * 0.3,
        tint: tintDe('#ffffff'),
      });
    }
  }

  // Las BOLSAS del repique, en el piso junto a la mesa (fila doble).
  for (let i = 0; i < conteos.bolsa; i++) {
    const col = i % 2;
    const fila = Math.floor(i / 2);
    out.bolsa.push({
      pos: [SITIO_BOLSAS[0] + col * 0.24 + (r() - 0.5) * 0.05, 0, SITIO_BOLSAS[1] + fila * 0.26 + (r() - 0.5) * 0.05],
      rotY: r() * Math.PI * 2,
      escala: 0.85 + r() * 0.3,
      tint: tintDe('#ffffff'),
    });
  }

  // La ERA de endurecimiento, afuera: maticas ya al sol (reusa la hortaliza).
  for (let i = 0; i < conteos.era; i++) {
    out.hortaliza.push({
      pos: [SITIO_ERA[0] - 0.4 + (i % 2) * 0.8, 0.34, SITIO_ERA[1] - 0.5 + Math.floor(i / 2) * 0.9],
      rotY: r() * Math.PI * 2,
      escala: 0.75 + r() * 0.25,
      tint: tintDe('#ffffff'),
    });
  }

  return out;
}
