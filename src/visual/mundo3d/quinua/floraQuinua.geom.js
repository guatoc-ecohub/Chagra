/*
 * floraQuinua.geom — la GEOMETRÍA del QUINUAL de tierra fría (2.500–3.200 m).
 *
 * Un quinual maduro es de las cosas más bonitas del campo andino, y la razón es
 * una sola: LA PANOJA. Cada planta remata en una panoja terminal que al madurar
 * se enciende —verde, amarilla, naranja, rosada, roja, púrpura, casi negra— y un
 * lote entero se vuelve un campo de color que no se parece a ningún otro
 * cultivo. Ese es el entregable de este mundo. Todo lo demás le hace marco.
 *
 * DECISIÓN DE COMPOSICIÓN: aquí la loma BAJA alejándose de la cámara, al revés
 * que en el yucal y el papal. No es capricho — es lo que hace posible la foto.
 * En una loma que sube, la primera fila tapa a la segunda y de un quinual solo
 * se ve el borde; en una que baja, TODAS las filas quedan a la vista y el color
 * se lee hasta el fondo. Además es como se siembra de verdad en la ladera
 * andina. La geografía está al servicio de lo que hay que mostrar.
 *
 * Cada pieza con su identidad:
 *
 *   · Mata de quinua      — TRES esqueletos distintos: tallo estriado y anguloso
 *                           (cilíndrico abajo, con aristas desde que ramifica) y
 *                           hojas ROMBOIDALES alternas, que es la forma real.
 *   · Panoja GLOMERULADA  — la compacta: glomérulos apretados contra el eje.
 *   · Panoja AMARANTIFORME— la laxa: ramitas largas y sueltas que se vencen.
 *                           Son los DOS tipos con nombre técnico de verdad, y
 *                           distinguirlos es media lección de campo.
 *   · Gavilla             — la quinua ya cortada con hoz y amontonada en la era.
 *   · Pajonal y piedra    — la tierra alta alrededor del lote.
 *
 * EL COLOR: la mata y la panoja se hornean casi BLANCAS y el color real viaja
 * POR INSTANCIA (setColorAt). Sin eso no hay campo de colores: habría un lote de
 * un solo tono. Y el color no se sortea planta por planta — se sortea POR
 * MANCHAS, porque el campesino siembra una variedad por tabla y el lote real se
 * ve a bloques, no a confeti.
 *
 * TÉCNICA tier-safe (mismo contrato que floraPapa/floraYuca.geom): una geometría
 * fusionada por especie y UN InstancedMesh → una draw-call por especie.
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas: aquí TODO se desindexa antes de fusionar y se
 * TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  La ladera que BAJA (la geografía del mundo, determinista)                  */
/* -------------------------------------------------------------------------- */

export const ANCHO = 40; // x: -20 … 20
export const FONDO = 38; // z: -19 (el fondo, abajo) … 19 (el filo, arriba)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* Ruido determinista (hash de senos): misma ladera siempre, sin Math.random. */
function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.7 + wz * 0.5) * 0.5 +
    Math.sin(wx * 1.6 - wz * 1.2 + 3.1) * 0.3 +
    Math.sin(wx * 2.8 + wz * 2.3 + 5.7) * 0.2
  );
}

/**
 * La altura BASE de la ladera. Ojo al signo: es ALTA AL FRENTE (donde está la
 * era y donde se para la cámara) y BAJA hacia el fondo. Así el quinual se
 * despliega hacia abajo y no hay fila que tape a otra.
 */
export function alturaBase(wx, wz) {
  const filo = smoothstep(-18, 11, wz); // 0 en el fondo hondo, 1 en el filo
  let h = 0.2;
  h += Math.pow(filo, 1.55) * 6.1;
  h += ruido(wx * 0.4, wz * 0.38) * 0.4 * (0.4 + filo * 0.6);
  return h;
}

/* --- Los SURCOS a curva de nivel: la quinua va en fila, no regada. --------- */

/* Las filas del lote (z del centro de cada surco). La quinua se siembra en
   surcos separados unos 70–80 cm, siguiendo la curva de nivel de la ladera. */
export const FILAS_QUINUA = [];
for (let z = 7.0; z >= -11.0; z -= 0.86) FILAS_QUINUA.push(Number(z.toFixed(3)));

/** La curva de nivel del surco: el surco serpentea con la ladera. */
export function curvaSurco(wx, fila) {
  return Math.sin(wx * 0.1 + fila * 0.48) * 0.95;
}

/* Los sitios del mundo. La ERA DE LA TRILLA va ARRIBA, en el filo plano, junto
   a la casa: así es de verdad (se trilla en piso duro y parejo, no en la
   pendiente) y así queda cerca de la cámara, de primer plano. */
export const SITIO_TRILLA = /** @type {[number, number]} */ ([5.8, 9.4]);
export const SITIO_CASA = /** @type {[number, number]} */ ([-9.8, 10.6]);

/** Máscara 0…1 del lote sembrado (dentro hay surcos; fuera, pajonal). */
export function dentroLote(wx, wz) {
  let m =
    smoothstep(-16, -13.5, wx) *
    smoothstep(16, 13.5, wx) *
    smoothstep(8.0, 6.4, wz) *
    smoothstep(-12.4, -10.4, wz);
  // la era de la trilla y el patio de la casa están fuera del sembrado
  const dTx = wx - SITIO_TRILLA[0];
  const dTz = wz - SITIO_TRILLA[1];
  m *= smoothstep(6, 14, dTx * dTx + dTz * dTz);
  const dHx = wx - SITIO_CASA[0];
  const dHz = wz - SITIO_CASA[1];
  m *= smoothstep(9, 20, dHx * dHx + dHz * dHz);
  return m;
}

/**
 * El RELIEVE del surco: una loma suave de tierra por fila. En la quinua el
 * surco es MUCHO más bajo que el caballón de la papa (aquí no se aporca para
 * engordar tubérculo: solo se abre la fila para sembrar y desyerbar).
 */
export function reliefSurco(wx, wz) {
  const lote = dentroLote(wx, wz);
  if (lote <= 0.001) return { alza: 0, lomo: 0, lote: 0 };
  let mejor = 1e9;
  for (let i = 0; i < FILAS_QUINUA.length; i++) {
    const zc = FILAS_QUINUA[i] + curvaSurco(wx, i);
    const d = wz - zc;
    const d2 = d * d;
    if (d2 < mejor) mejor = d2;
  }
  const perfil = Math.exp(-mejor / 0.1);
  return { alza: perfil * 0.16 * lote, lomo: perfil * lote, lote };
}

/** La altura FINAL de la ladera con los surcos horneados. */
export function alturaQuinual(wx, wz) {
  return alturaBase(wx, wz) + reliefSurco(wx, wz).alza;
}

/* -------------------------------------------------------------------------- */
/*  LA CÁMARA — lo que este mundo NO puede fallar                             */
/* -------------------------------------------------------------------------- */

/*
 * La cámara vive JUNTO A LA GEOGRAFÍA (misma convención que el yucal): así el
 * diagnóstico de encuadre la importa de verdad en vez de adivinarla.
 *
 * Aquí el sujeto NO es un rincón: es EL CAMPO ENTERO de panojas. La cámara se
 * para en el filo, un poco por encima de la era, y mira ladera abajo para que el
 * color se despliegue en profundidad hasta el fondo del valle. La era de la
 * trilla queda de primer plano a la derecha.
 *
 * Verificado por trazado de rayos contra esta MISMA función de altura
 * (`node scripts/diag/encuadre-mundo.mjs quinua`) y calibrado contra el papal,
 * que es un mundo ya aprobado:
 *
 *              cielo   tercio alto   cultivo en cuadro
 *   papal      32.8%      0.6%            59.4%
 *   yucal      34.8%      0.2%            52.5%
 *   quinual    34.8%      0.0%            38.1%
 *
 * LA ALTURA DE LA CÁMARA ES EL PARÁMETRO CRÍTICO y costó encontrarla. La
 * primera versión iba a 10,4 m y parecía razonable — hasta que el trazado
 * mostró que el cultivo llenaba apenas el 19% del cuadro. El motivo: con las
 * matas a 1,6 m y los surcos a 0,86 m, una cámara rasante deja que la primera
 * fila tape las cinco de atrás, y la ladera no baja lo suficiente para
 * compensar. Subiendo a 14 m el campo se abre y el color se lee hasta el fondo.
 *
 * Si alguien mueve esto, que vuelva a correr el trazado: medir el tamaño de las
 * panojas NO es ver la escena.
 */
export const CAMARA = {
  reposo: /** @type {[number, number, number]} */ ([0.6, 14.0, 15.8]),
  mirada: /** @type {[number, number, number]} */ ([0.2, 3.5, -2.0]),
  objetivo: /** @type {[number, number, number]} */ ([0.3, 3.2, -1.5]),
  fov: 50,
};

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * La MATA es lo que más pesa aquí (es un campo, no un huerto), así que el
 * presupuesto se le va casi todo a ella: sin cantidad no hay campo de color, y
 * el campo de color es el entregable. Las panojas van una por mata.
 */
export const FLORA_QUINUA = {
  alto: { mata: 190, gavilla: 9, paja: 70, piedra: 8 },
  medio: { mata: 120, gavilla: 6, paja: 40, piedra: 5 },
  bajo: { mata: 48, gavilla: 3, paja: 18, piedra: 3 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const quinualDeTier = (tier) => FLORA_QUINUA[tier] || FLORA_QUINUA.medio;

/** Factor de detalle geométrico por tier (menos glomérulos/hojas en gama baja). */
export const CALIDAD_QUINUA = { alto: 1, medio: 0.6, bajo: 0.4 };
export const calidadQuinua = (tier) => CALIDAD_QUINUA[tier] ?? CALIDAD_QUINUA.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta del quinual                                                         */
/* -------------------------------------------------------------------------- */

/*
 * LAS VARIEDADES. Estas cuatro son variedades reales cultivadas en Colombia —
 * no nombres de adorno: cada una trae su porte, su tipo de panoja y su color de
 * madurez, que es exactamente lo que se ve en campo.
 *
 * Blanca de Jericó lleva una nota aparte: es DULCE, o sea naturalmente baja en
 * saponina, y por eso casi no necesita lavado. Esa es la excepción que le da
 * sentido a la lección del desaponificado.
 */
export const VARIEDADES = [
  {
    id: 'tunkahuan',
    nombre: 'Tunkahuán',
    alto: [1.6, 2.3],
    panoja: 'amarantiforme', // grande, ramificada, poco compacta
    largoPanoja: [0.32, 0.52],
    // púrpura que vira a púrpura-anaranjado al madurar
    colores: ['#7b4a86', '#8f4a72', '#a55a52', '#b8703c'],
    dulce: false,
  },
  {
    id: 'aurora',
    nombre: 'Aurora',
    alto: [0.9, 1.3],
    panoja: 'glomerulada', // semicompacta
    largoPanoja: [0.2, 0.32],
    // blanco-rosada
    colores: ['#e8d7c4', '#e3bdb0', '#d9a79e', '#c9908c'],
    dulce: false,
  },
  {
    id: 'blanca-jerico',
    nombre: 'Blanca de Jericó',
    alto: [1.2, 2.1],
    panoja: 'amarantiforme', // erecta y ramificada
    largoPanoja: [0.26, 0.44],
    // follaje y panoja verdes: madura sin encenderse
    colores: ['#7d9147', '#8ba055', '#9aad63', '#b0b96a'],
    dulce: true, // baja en saponina: casi no pide lavado
  },
  {
    id: 'punto-rojo',
    nombre: 'Punto Rojo',
    alto: [1.4, 2.1],
    panoja: 'amarantiforme', // semicompacta
    largoPanoja: [0.28, 0.46],
    // púrpura-rojizo, el más encendido del lote
    colores: ['#8e3550', '#a33546', '#b34338', '#6d2f4e'],
    dulce: false,
  },
];

export const PAL = {
  // La mata y la panoja se hornean CASI BLANCAS: el color va por instancia.
  // Estos son los valores de luminancia que le dan estructura interna a la
  // pieza (si todo fuera blanco plano, el tinte la dejaría como una calcomanía).
  mataClaro: '#f4f2ec',
  mataMedio: '#d8d5cc',
  mataOscuro: '#b9b6ac',
  panojaClaro: '#fbfaf6',
  panojaMedio: '#e2dfd6',
  panojaOscuro: '#c2beb3',

  // El pajonal del frío y la piedra (estos SÍ con su color propio)
  paja: '#b3a95e',
  pajaSeca: '#c2b476',
  pajaVerde: '#8f9a52',
  piedra: '#8d8a80',
  liquen: '#a5a986',

  // La gavilla cortada y esperando la trilla (paja de quinua, ya seca)
  gavilla: '#c9b478',
  tierra: '#5a4433',
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
    throw new Error('floraQuinua: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color. */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  EL ESQUELETO DE LA MATA                                                    */
/* -------------------------------------------------------------------------- */

/*
 * La quinua es un tallo principal derecho con ramas que salen alternas, hojas
 * romboidales, y LA PANOJA rematando arriba (y panojitas menores en las puntas
 * de las ramas altas). El tallo es cilíndrico en la base y se vuelve ANGULOSO
 * desde que ramifica — un detalle chiquito que la separa de cualquier pasto.
 *
 * Como en el yucal, se generan varios esqueletos con semillas distintas para
 * que el campo no se lea como un estampado de la misma planta repetida.
 */
export function esqueletoQuinua(seed = 11, q = 1) {
  const r = rng(seed);
  const alto = 1.0 + r() * 0.35; // altura NORMALIZADA (la variedad la escala)
  const radioBase = 0.03 + r() * 0.01;

  // las ramas alternas, subiendo por el tallo
  const nRamas = Math.max(3, Math.round(7 * q));
  const ramas = [];
  for (let i = 0; i < nRamas; i++) {
    const t = 0.28 + (i / nRamas) * 0.58; // desde media caña para arriba
    const a = i * 2.399 + r() * 0.3; // alternas, en espiral
    const largo = (0.16 + r() * 0.14) * (1 - t * 0.45);
    ramas.push({
      base: [0, t * alto, 0],
      ang: a,
      largo,
      // las de arriba son las que rematan en panojita
      remata: t > 0.55 && r() > 0.4,
    });
  }

  // las hojas romboidales, alternas y en espiral por todo el tallo
  const nHojas = Math.max(4, Math.round(11 * q));
  const hojas = [];
  for (let i = 0; i < nHojas; i++) {
    const t = 0.1 + (i / nHojas) * 0.72;
    const a = i * 2.399 + r() * 0.35;
    hojas.push({
      y: t * alto,
      ang: a,
      // las de abajo son más grandes; hacia la inflorescencia se achican y se
      // vuelven lanceoladas (así es de verdad)
      tam: (1.05 - t * 0.5) * (0.85 + r() * 0.3),
      caida: 0.1 + r() * 0.5,
    });
  }

  return { alto, radioBase, ramas, hojas };
}

/* -------------------------------------------------------------------------- */
/*  MATA DE QUINUA — tallo anguloso y hoja romboidal                          */
/* -------------------------------------------------------------------------- */

/*
 * Todo se hornea casi BLANCO (con luminancia variada para que la pieza tenga
 * estructura): el color de verdad lo pone el tinte de la instancia, y de ahí
 * sale el campo de colores.
 *
 * La HOJA es un rombo: cuatro lados, ancha en la mitad y en punta arriba y
 * abajo. Se construye con un octaedro achatado, que es exactamente esa forma y
 * cuesta ocho triángulos.
 */
export function geomMataQuinua(esq, { q = 1 } = {}) {
  const r = rng(23);
  const partes = [];

  // EL TALLO: cilíndrico en la base…
  const base = new THREE.CylinderGeometry(esq.radioBase * 0.8, esq.radioBase, esq.alto * 0.3, 6, 1);
  poner(base, [0, esq.alto * 0.15, 0]);
  partes.push(pintar(base, PAL.mataMedio));
  // …y ANGULOSO de ahí para arriba (pocos lados a propósito: son aristas)
  const arriba = new THREE.CylinderGeometry(
    esq.radioBase * 0.42,
    esq.radioBase * 0.8,
    esq.alto * 0.72,
    q < 0.5 ? 4 : 5,
    1,
  );
  poner(arriba, [0, esq.alto * 0.3 + esq.alto * 0.36, 0]);
  partes.push(pintar(arriba, PAL.mataClaro));

  // LAS RAMAS alternas
  for (const rama of esq.ramas) {
    const dir = [Math.cos(rama.ang) * 0.62, 1, Math.sin(rama.ang) * 0.62];
    const brazo = new THREE.CylinderGeometry(0.008, 0.014, rama.largo, 4, 1);
    apuntar(
      brazo,
      [
        rama.base[0] + Math.cos(rama.ang) * rama.largo * 0.26,
        rama.base[1] + rama.largo * 0.42,
        rama.base[2] + Math.sin(rama.ang) * rama.largo * 0.26,
      ],
      dir,
    );
    partes.push(pintar(brazo, PAL.mataMedio));
  }

  // LAS HOJAS ROMBOIDALES
  for (const h of esq.hojas) {
    const rombo = new THREE.OctahedronGeometry(1, 0);
    const largo = 0.1 * h.tam;
    const ancho = 0.062 * h.tam;
    // el rombo acostado, saliendo del tallo y vencido hacia abajo
    poner(rombo, [0, 0, 0], [0, 0, 0], [ancho, 0.008, largo]);
    apuntar(
      rombo,
      [Math.cos(h.ang) * (largo * 0.85), h.y, Math.sin(h.ang) * (largo * 0.85)],
      [Math.cos(h.ang) * 0.9, -h.caida, Math.sin(h.ang) * 0.9],
    );
    partes.push(
      pintar(rombo, variar(r() > 0.5 ? PAL.mataClaro : PAL.mataMedio, r, 0.05)),
    );
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  LA PANOJA — lo que hay que entregar                                       */
/* -------------------------------------------------------------------------- */

/*
 * Los DOS tipos con nombre técnico de verdad, y se ven bien distintos:
 *
 *   GLOMERULADA (compacta): los glomérulos —racimitos de grano— van apretados
 *   contra el eje. La panoja se lee como una mazorca densa, de contorno
 *   cerrado. Es la que parece "maciza".
 *
 *   AMARANTIFORME (laxa): las ramitas del eje son largas y se separan, y la
 *   panoja queda abierta, con los glomérulos colgando de sus ramitas. Se lee
 *   como una escoba suelta y se mueve con el viento.
 *
 * Ambas se construyen del origen hacia +Y con largo 1: la instancia las escala
 * al largo real de su variedad (de 15 a 70 cm en campo). Todo casi blanco: el
 * color de madurez lo pone el tinte por instancia.
 */
export function geomPanojaGlomerulada({ q = 1 } = {}, seed = 31) {
  const r = rng(seed);
  const partes = [];

  // el eje de la panoja
  const eje = new THREE.CylinderGeometry(0.02, 0.035, 1, 5, 1);
  poner(eje, [0, 0.5, 0]);
  partes.push(pintar(eje, PAL.panojaOscuro));

  /* los GLOMÉRULOS, apretados contra el eje en espiral.
     OJO al primitivo: son OCTAEDROS (8 triángulos), no icosaedros (20). A 5 cm
     de tamaño y vistos desde la cámara del mundo se leen exactamente igual, y
     como aquí hay una panoja por planta y cientos de plantas, ese cambio es la
     diferencia entre 400.000 y 160.000 triángulos en escena. La densidad del
     campo es el entregable: el ahorro tiene que salir del primitivo, no de
     quitar plantas. */
  const nPisos = Math.max(5, Math.round(10 * q));
  const porPiso = q < 0.5 ? 3 : 4;
  for (let p = 0; p < nPisos; p++) {
    const t = 0.06 + (p / nPisos) * 0.92;
    // la panoja es más gorda en el medio y se afina en la punta
    const gordo = Math.sin(t * Math.PI) * 0.62 + 0.38;
    for (let i = 0; i < porPiso; i++) {
      const a = p * 1.9 + (i / porPiso) * Math.PI * 2 + r() * 0.3;
      const rad = 0.085 * gordo;
      const bola = new THREE.OctahedronGeometry(0.058 * gordo, 0);
      poner(
        bola,
        [Math.cos(a) * rad, t, Math.sin(a) * rad],
        [0, r() * Math.PI, 0],
        [1, 0.85, 1],
      );
      const tono = r();
      partes.push(
        pintar(bola, variar(tono > 0.6 ? PAL.panojaClaro : tono > 0.25 ? PAL.panojaMedio : PAL.panojaOscuro, r, 0.06)),
      );
    }
  }
  return fusionar(partes);
}

export function geomPanojaAmarantiforme({ q = 1 } = {}, seed = 33) {
  const r = rng(seed);
  const partes = [];

  const eje = new THREE.CylinderGeometry(0.016, 0.032, 1, 5, 1);
  poner(eje, [0, 0.5, 0]);
  partes.push(pintar(eje, PAL.panojaOscuro));

  // LAS RAMITAS largas y sueltas — lo que la hace laxa
  const nPisos = Math.max(4, Math.round(8 * q));
  const porPiso = 2;
  for (let p = 0; p < nPisos; p++) {
    const t = 0.1 + (p / nPisos) * 0.86;
    // las de abajo son más largas: la panoja se abre en cono invertido
    const largo = (0.3 - t * 0.19) * (0.85 + r() * 0.3);
    for (let i = 0; i < porPiso; i++) {
      const a = p * 2.1 + (i / porPiso) * Math.PI * 2 + r() * 0.35;
      // la ramita sale hacia afuera y se vence: la panoja laxa cuelga
      const caida = -0.25 - r() * 0.4;
      const dir = [Math.cos(a), caida, Math.sin(a)];
      const n = Math.hypot(dir[0], dir[1], dir[2]);
      const ramita = new THREE.CylinderGeometry(0.006, 0.011, largo, 4, 1);
      apuntar(
        ramita,
        [Math.cos(a) * largo * 0.34, t + (caida * largo) / 2.4, Math.sin(a) * largo * 0.34],
        dir,
      );
      partes.push(pintar(ramita, PAL.panojaOscuro));

      // los glomérulos colgados de la ramita
      const nBolas = q < 0.5 ? 2 : 3;
      for (let k = 1; k <= nBolas; k++) {
        const u = k / (nBolas + 0.4);
        // octaedros, por lo mismo que en la glomerulada (ver allá)
        const bola = new THREE.OctahedronGeometry(0.04 * (1.1 - u * 0.3), 0);
        poner(
          bola,
          [
            (dir[0] / n) * largo * u,
            t + (dir[1] / n) * largo * u,
            (dir[2] / n) * largo * u,
          ],
          [0, r() * Math.PI, 0],
          [1, 0.9, 1],
        );
        const tono = r();
        partes.push(
          pintar(bola, variar(tono > 0.55 ? PAL.panojaClaro : PAL.panojaMedio, r, 0.07)),
        );
      }
    }
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  GAVILLA — la quinua ya cortada con hoz, esperando la trilla               */
/* -------------------------------------------------------------------------- */

export function geomGavilla({ q = 1 } = {}, seed = 37) {
  const r = rng(seed);
  const partes = [];
  const nTallos = Math.max(5, Math.round(11 * q));
  for (let i = 0; i < nTallos; i++) {
    const a = (i / nTallos) * Math.PI * 2 + r() * 0.5;
    const abre = 0.32 + r() * 0.3;
    const largo = 0.75 + r() * 0.3;
    const tallo = new THREE.CylinderGeometry(0.012, 0.02, largo, 4, 1);
    apuntar(
      tallo,
      [Math.cos(a) * 0.1, largo * 0.44, Math.sin(a) * 0.1],
      [Math.cos(a) * abre, 1, Math.sin(a) * abre],
    );
    partes.push(pintar(tallo, variar(PAL.gavilla, r, 0.08)));
    // la panojita seca en la punta de cada tallo del atado
    const bola = new THREE.IcosahedronGeometry(0.055, 0);
    poner(
      bola,
      [Math.cos(a) * (0.1 + abre * largo * 0.8), largo * 0.9, Math.sin(a) * (0.1 + abre * largo * 0.8)],
      [0, r() * Math.PI, 0],
      [1, 1.5, 1],
    );
    partes.push(pintar(bola, variar(PAL.pajaSeca, r, 0.1)));
  }
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PAJONAL Y PIEDRA — la tierra alta alrededor del lote                      */
/* -------------------------------------------------------------------------- */

export function geomPaja({ q = 1 } = {}, seed = 41) {
  const r = rng(seed);
  const partes = [];
  const nHojas = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.6;
    const inclina = 0.25 + r() * 0.4;
    const alto = 0.45 + r() * 0.3;
    const hoja = new THREE.ConeGeometry(0.032, alto, 4, 1);
    apuntar(
      hoja,
      [Math.cos(a) * 0.06, alto * 0.42, Math.sin(a) * 0.06],
      [Math.cos(a) * inclina, 1, Math.sin(a) * inclina],
    );
    const tono = r();
    partes.push(
      pintar(hoja, variar(tono > 0.6 ? PAL.pajaSeca : tono > 0.25 ? PAL.paja : PAL.pajaVerde, r, 0.06)),
    );
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 43) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.3, 0);
  poner(roca, [0, 0.12, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.65, 1]);
  const capa = new THREE.DodecahedronGeometry(0.15, 0);
  poner(capa, [0.1, 0.21, 0.04], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: el campo de colores                                         */
/* -------------------------------------------------------------------------- */

/* Cuántos esqueletos distintos hay (que el campo no se lea como estampado). */
export const N_ESQUELETOS = 3;
export const SEMILLAS_ESQUELETO = [11, 211, 307];

/** Construye los N esqueletos del quinual. */
export function construirEsqueletos(q = 1) {
  return SEMILLAS_ESQUELETO.map((s) => esqueletoQuinua(s, q));
}

/*
 * LA MANCHA DE VARIEDAD. El campesino siembra una variedad por tabla, así que
 * un quinual real se ve A BLOQUES: un pedazo morado, al lado uno verde, más
 * allá uno rosado. Si el color se sorteara planta por planta el lote quedaría
 * de confeti — bonito en el papel y falso en el campo, y además ilegible.
 *
 * Esta función es un ruido de baja frecuencia que devuelve qué variedad manda
 * en cada punto del lote. Las fronteras quedan algo dentadas a propósito: las
 * tablas de una finca no son rectángulos de catastro.
 */
/* Los dos ruidos de baja frecuencia que dibujan las tablas del lote. */
const tablaN1 = (wx, wz) =>
  Math.sin(wx * 0.16 + wz * 0.1) + Math.sin(wx * 0.06 - wz * 0.19 + 1.7) * 0.8;
const tablaN2 = (wx, wz) =>
  Math.sin(wx * 0.09 - wz * 0.14 + 4.2) + Math.sin(wx * 0.21 + wz * 0.07 + 2.4) * 0.8;

/*
 * Los umbrales de corte, calculados UNA VEZ como la MEDIANA de cada ruido sobre
 * el lote real. Cortar en cero parecía lo natural y no lo es: sobre un pedazo
 * acotado de terreno la mediana de una suma de senos no cae en cero, y el
 * reparto se desfonda. Con corte en cero, Blanca de Jericó se llevaba el 46% del
 * campo y Tunkahuán —la más alta y la más morada, la que hace la foto— se
 * quedaba en 7%. Cortando en la mediana medida, cada variedad se lleva su cuarto
 * y las fronteras siguen saliendo orgánicas.
 */
const UMBRALES = (() => {
  const a = [];
  const b = [];
  for (let x = -13.6; x <= 13.6; x += 0.7) {
    for (let z = -11; z <= 7; z += 0.7) {
      if (dentroLote(x, z) < 0.6) continue;
      a.push(tablaN1(x, z));
      b.push(tablaN2(x, z));
    }
  }
  const mediana = (arr) => {
    if (!arr.length) return 0;
    const s = arr.slice().sort((p, q2) => p - q2);
    return s[Math.floor(s.length / 2)];
  };
  return [mediana(a), mediana(b)];
})();

/**
 * Qué variedad manda en un punto del lote. Dos ruidos independientes parten el
 * campo en cuatro tablas de área pareja (ver UMBRALES arriba); el resultado es
 * un lote a BLOQUES, que es como se ve una finca de verdad — no a confeti.
 */
export function variedadEn(wx, wz) {
  const n1 = tablaN1(wx, wz);
  const n2 = tablaN2(wx, wz);
  return (n1 > UMBRALES[0] ? 0 : 1) + (n2 > UMBRALES[1] ? 0 : 2);
}

/**
 * Siembra determinista del quinual completo. Devuelve items por especie con el
 * contrato del componente `Especie`. La MATA va en un banco por esqueleto y la
 * PANOJA en dos bancos (glomerulada y amarantiforme) — el tipo de panoja lo
 * decide la variedad de cada mata, no el azar.
 */
export function distribucionQuinual(conteos, esqs, seed = 811) {
  const c = conteos;
  const rMat = rng(seed + 1);
  const rSue = rng(seed + 2);

  /* --- Los sitios de siembra, sobre los surcos a curva de nivel. ---------- */
  const sitios = [];
  FILAS_QUINUA.forEach((z0, fila) => {
    for (let wx = -13.6; wx <= 13.6; wx += 0.62) {
      const px = wx + (rMat() - 0.5) * 0.24;
      const pz = z0 + curvaSurco(px, fila) + (rMat() - 0.5) * 0.12;
      if (dentroLote(px, pz) < 0.6) continue;
      sitios.push({ px, pz });
    }
  });
  // recorte determinista al presupuesto del tier (salto parejo, no los primeros N)
  const paso = Math.max(1, Math.floor(sitios.length / Math.max(1, c.mata)));
  const elegidos = [];
  for (let k = 0; k < sitios.length && elegidos.length < c.mata; k += paso) {
    elegidos.push(sitios[k]);
  }

  const mata = Array.from({ length: esqs.length }, () => []);
  const panojaGlom = [];
  const panojaAmar = [];
  const col = new THREE.Color();
  const col2 = new THREE.Color();

  elegidos.forEach((s) => {
    const iVar = variedadEn(s.px, s.pz);
    const v = VARIEDADES[iVar];
    const variante = Math.floor(rMat() * esqs.length) % esqs.length;
    const esq = esqs[variante];

    // el porte real de ESTA planta, dentro del rango de su variedad
    const altoReal = v.alto[0] + rMat() * (v.alto[1] - v.alto[0]);
    const escala = altoReal / esq.alto;
    const rotY = rMat() * Math.PI * 2;
    const y = alturaQuinual(s.px, s.pz);

    /* EL COLOR DE MADUREZ. Dentro de una misma tabla las plantas no maduran
       todas el mismo día, así que el color se mueve a lo largo de la rampa de
       la variedad. Eso es lo que le da al lote su vibración: es un bloque de
       color, pero no es un bloque plano. */
    const madurez = rMat();
    const paleta = v.colores;
    const fPos = madurez * (paleta.length - 1);
    const i0 = Math.floor(fPos);
    const i1 = Math.min(paleta.length - 1, i0 + 1);
    col.set(paleta[i0]);
    col2.set(paleta[i1]);
    col.lerp(col2, fPos - i0);

    // el TALLO y la hoja van un paso más apagados que la panoja: la que grita
    // es la panoja, y si gritan las dos el campo se vuelve una mancha
    const tinteMata = col.clone().lerp(new THREE.Color('#8b9a6a'), 0.42);
    tinteMata.multiplyScalar(0.9 + rMat() * 0.18);

    mata[variante].push({
      pos: [s.px, y, s.pz],
      rotY,
      escala,
      tint: [tinteMata.r, tinteMata.g, tinteMata.b],
    });

    // LA PANOJA, encima de la mata, con el largo de su variedad
    const largoPanoja =
      v.largoPanoja[0] + rMat() * (v.largoPanoja[1] - v.largoPanoja[0]);
    const tintePanoja = col.clone().multiplyScalar(0.92 + rMat() * 0.16);
    const item = {
      pos: [s.px, y + altoReal * 0.93, s.pz],
      rotY: rMat() * Math.PI * 2,
      escala: largoPanoja,
      tint: [tintePanoja.r, tintePanoja.g, tintePanoja.b],
    };
    if (v.panoja === 'glomerulada') panojaGlom.push(item);
    else panojaAmar.push(item);
  });

  /* --- LA ERA: las gavillas cortadas, amontonadas para trillar. ----------- */
  const gavilla = [];
  for (let i = 0; i < c.gavilla; i++) {
    const a = (i / Math.max(1, c.gavilla)) * Math.PI * 2 + rSue() * 0.5;
    const rad = 1.0 + Math.sqrt(rSue()) * 1.9;
    const x = SITIO_TRILLA[0] + Math.cos(a) * rad;
    const z = SITIO_TRILLA[1] + Math.sin(a) * rad * 0.7;
    gavilla.push({
      pos: [x, alturaQuinual(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.85 + rSue() * 0.4,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  /* --- El pajonal y la piedra del borde (fuera del lote). ---------------- */
  const paja = [];
  let intentosPaja = 0;
  while (paja.length < c.paja && intentosPaja < c.paja * 16) {
    intentosPaja += 1;
    const x = -19 + rSue() * 38;
    const z = -18 + rSue() * 36;
    if (dentroLote(x, z) > 0.25) continue;
    const dTx = x - SITIO_TRILLA[0];
    const dTz = z - SITIO_TRILLA[1];
    if (dTx * dTx + dTz * dTz < 10) continue; // la era está barrida
    const dHx = x - SITIO_CASA[0];
    const dHz = z - SITIO_CASA[1];
    if (dHx * dHx + dHz * dHz < 9) continue;
    paja.push({
      pos: [x, alturaQuinual(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.8,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  const piedra = [];
  let intentosPiedra = 0;
  while (piedra.length < c.piedra && intentosPiedra < c.piedra * 16) {
    intentosPiedra += 1;
    const x = -18 + rSue() * 36;
    const z = -16 + rSue() * 32;
    if (dentroLote(x, z) > 0.25) continue;
    piedra.push({
      pos: [x, alturaQuinual(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.8,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { mata, panojaGlom, panojaAmar, gavilla, paja, piedra };
}
