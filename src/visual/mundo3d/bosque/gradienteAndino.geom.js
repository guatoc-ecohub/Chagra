/*
 * gradienteAndino.geom — LA LADERA donde viven los tres Ents, cortada como una
 * lámina de Humboldt.
 *
 * De qué se trata
 * ───────────────
 * Los tres árboles maestros no son tres demos sueltos: son la MISMA ladera a
 * tres alturas. Para que eso se vea y no haya que explicarlo, el mundo entero
 * es UN BLOQUE DE MONTAÑA CORTADO — el mismo recurso con el que Humboldt
 * dibujó el Chimborazo: el perfil de la ladera con sus fajas de vegetación, y
 * lo que pasa por dentro a la vista.
 *
 *   ARRIBA, sobre el lomo del bloque: tres terrazas —templado, frío, páramo—
 *   cada una con su Ent y su vegetación, y EL AGUA que nace en el páramo,
 *   se despeña dos veces y llega abajo hecha quebrada.
 *
 *   ABAJO, en la cara cortada: los horizontes del suelo (hojarasca, humus,
 *   zona de raíces, red micorrízica, roca madre) y LA RED DE MICORRIZAS que
 *   amarra las raíces de los tres árboles a lo largo de toda la ladera.
 *
 * Las dos corrientes son la lección entera y van en espejo: el agua BAJA por
 * encima, el alimento CIRCULA por debajo. Si le tumban el páramo, el roble del
 * templado se entera.
 *
 * ── Reglas de taller ───────────────────────────────────────────────────────
 * · `fusionarSeguro` es la ÚNICA fusión (mergeGeometries devuelve NULL EN
 *   SILENCIO al mezclar indexadas con no-indexadas y la pieza no se dibuja).
 * · Los colores de los horizontes son EXACTAMENTE los de la vitrina del corte
 *   (`corteSuelo.geom.js` CAPAS) y los de la red son los del mundo de las
 *   micorrizas (`micorrizas.geom.js` PALETA): la lección del suelo en Chagra
 *   es una sola y no puede verse distinta según por dónde se entre.
 * · Three core puro: corre headless, sin contexto GL.
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  fusionarSeguro,
  tuboOrganico,
  poner,
  pintarPorVertice,
  pintarPlano,
} from './sombreadoVegetal.js';
import { PALETA as MICO } from '../micorrizas/micorrizas.geom.js';
import { TIERRAS, VERDES, AGUAS, NEUTROS, mezclar } from '../paleta/paletaMadre.js';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const suave = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* ══════════════════════════════════════════════════════════════════════════
   EL BLOQUE — medidas de la ladera cortada
   ══════════════════════════════════════════════════════════════════════════ */
export const BLOQUE = {
  xMin: -14,
  xMax: 14,
  zFrente: 3.4, // el plano del corte: mira a la cámara
  zFondo: -7.4,
  /* Hasta dónde baja el bloque. Es una decisión de ENCUADRE, no de geología:
     cada metro que baja es un metro de tierra oscura que hay que meter en el
     cuadro y que le quita aire a las copas. Lo justo para que la banda de
     micorrizas del piso más bajo quede DENTRO del bloque y no colgando. */
  yFondo: -5.0,
};

/* Las tres terrazas del gradiente. El desnivel entre una y otra es de 3,6
   metros-escena: suficiente para que la ladera SUBA de verdad y no tanto como
   para que los tres dejen de caber juntos en un retrato — que es la prueba que
   este mundo tiene que pasar. */
export const PISOS = [
  {
    id: 'templado',
    nombre: 'Templado',
    ent: 'roble',
    y: 0,
    x: -8.6,
    z: -2.3,
    desde: BLOQUE.xMin,
    hasta: -4.8,
    tinte: 'templado',
  },
  {
    id: 'frio',
    nombre: 'Frío',
    ent: 'aliso',
    y: 3.6,
    x: 0.4,
    z: -2.4,
    desde: -2.4,
    hasta: 4.6,
    tinte: 'frio',
  },
  {
    id: 'paramo',
    nombre: 'Páramo',
    ent: 'quenua',
    y: 7.2,
    x: 8.8,
    z: -2.6,
    desde: 6.8,
    hasta: BLOQUE.xMax,
    tinte: 'paramo',
  },
];

/** Los dos escarpes (los taludes entre terraza y terraza), donde cae el agua. */
export const ESCARPES = [
  { desde: -4.8, hasta: -2.4, salto: 3.6, base: 0 },
  { desde: 4.6, hasta: 6.8, salto: 3.6, base: 3.6 },
];

/*
 * El cauce serpentea: a qué z va el agua a la altura x.
 *
 * OJO CON EL RANGO (0,4 a 1,9). No puede irse ni muy atrás ni muy adelante:
 *   · muy atrás, el cauce se le mete por debajo a los Ents;
 *   · muy adelante, se pega al filo del corte — y ahí el labio de la terraza
 *     queda MÁS BAJO que el pelo de agua, así que la quebrada se desborda sobre
 *     el filo y se asoma por la cara del tajo, que es imposible.
 * Esta banda deja metro y medio de terraza por delante (el labio siempre por
 * encima del agua) y espacio de sobra por detrás para los tres guardianes.
 */
export function zCauce(x) {
  return 1.15 + 0.75 * Math.sin(x * 0.3 + 1.1);
}

/** Cuánto pesa el escarpe en la abscisa x (1 en el centro del salto, 0 fuera). */
export function enEscarpe(x) {
  let m = 0;
  for (const e of ESCARPES) {
    m = Math.max(m, 1 - clamp01(Math.abs(x - (e.desde + e.hasta) / 2) / ((e.hasta - e.desde) * 0.62)));
  }
  return m;
}

/** Perfil del cauce en la abscisa x: qué tan hondo y qué tan ancho es el surco,
    y cuánta agua lleva (el "pelo de agua" sobre el fondo). */
export function perfilCauce(x) {
  const dn = clamp01((12.4 - x) / 26); // 0 en el nacimiento → 1 en la salida
  const esc = enEscarpe(x);
  return {
    /* El surco se abre aguas abajo… y se ABARRANCA en los dos escarpes. Eso
       último no es adorno: en una pared de 56 grados, un pelo de agua de un
       palmo se ve de perfil como una raya de dos píxeles y LAS CASCADAS
       DESAPARECÍAN — la quebrada se leía como tres charcos sueltos, uno por
       terraza, en vez de como una sola agua que baja. Con la canal excavada,
       el salto tiene dónde caer y se ve. */
    hondo: 0.3 + 0.28 * dn + 0.85 * esc,
    sigma: (0.85 + 0.95 * dn) * (1 + 0.35 * esc),
    lamina: 0.16 + 0.26 * dn + 0.5 * esc,
  };
}

/**
 * LA ALTURA DE LA LADERA en (x, z): la escalera de las tres terrazas + el
 * relieve suave del terreno + el surco por donde corre el agua.
 *
 * Es la función madre del mundo: la usan el lomo del bloque, la cara cortada,
 * la siembra de la vegetación, el agua y hasta dónde se paran los Ents. Que
 * TODO salga de aquí es lo que impide que algo quede flotando o enterrado.
 */
export function alturaLadera(x, z) {
  // la escalera
  let y = 3.6 * suave(-4.8, -2.4, x) + 3.6 * suave(4.6, 6.8, x);
  // relieve: lomos y hondonadas suaves (nada de terraza de billar)
  y += 0.3 * Math.sin(x * 0.42 + 1.1) * Math.cos(z * 0.36);
  y += 0.16 * Math.sin(x * 0.9 - z * 0.55);
  // cada terraza cae apenas hacia el frente: por ahí drena
  y -= 0.045 * (z - BLOQUE.zFondo);
  /* EL SURCO del cauce: el agua no va encima del pasto, va por su cama. Y la
     cama se ABRE aguas abajo (más honda y más ancha), que es lo que hace que la
     lámina de agua se vea angosta arriba y ancha abajo sin tener que estirar la
     cinta a mano: el cauce la ensancha solo. */
  const { hondo, sigma } = perfilCauce(x);
  const d = (z - zCauce(x)) / sigma;
  y -= hondo * Math.exp(-d * d);
  /* EL BORDO DEL LABIO: el filo de la terraza sube apenas antes del corte, para
     que el borde contenga el agua y de paso enmarque cada terraza.
     APENAS. Un bordo alto (se probó con 0,7) hace de PARAPETO: desde la cámara,
     que mira casi a ras, el borde levantado tapa el cauce entero y la quebrada
     desaparece del cuadro. Quien contiene el agua de verdad es el candado de
     `nivelAgua`; esto es solo el relieve del borde. */
  y += 0.2 * suave(BLOQUE.zFrente - 2.6, BLOQUE.zFrente, z);
  return y;
}

/** El PELO DE AGUA: a qué altura va la lámina en la abscisa x (el fondo del
    cauce más lo que lleve de agua). TODO el ancho de la quebrada vive a ESTA
    altura, y es el terreno el que la recorta: donde la orilla sube, la tapa. */
export const nivelAgua = (x) => Math.min(
  alturaLadera(x, zCauce(x)) + perfilCauce(x).lamina,
  /* CANDADO: pase lo que pase con el relieve, el pelo de agua queda por debajo
     del labio del corte. El bordo de arriba ya lo resuelve casi siempre; esto
     es lo que garantiza que NUNCA se vea un chorro saliendo de la pared. */
  alturaLadera(x, BLOQUE.zFrente) - 0.1,
);

/** La altura del lomo justo en el plano del corte (para la cara y el faldón). */
export const alturaEnCorte = (x) => alturaLadera(x, BLOQUE.zFrente);

/* ══════════════════════════════════════════════════════════════════════════
   LOS HORIZONTES DEL SUELO — los mismos de la vitrina del corte
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * `hasta` es la PROFUNDIDAD (positiva hacia abajo) donde termina el horizonte,
 * medida desde la superficie de ESA columna: los horizontes siguen el lomo de
 * la ladera, no un plano horizontal. Así se ve lo que es cierto — que el suelo
 * es una piel que viste la montaña.
 *
 * `hueco` es cuánto se retira la cara del corte en ese horizonte: la excavación
 * escalonada que abre la ALCOBA de la red micorrízica. Sin esa alcoba, la red
 * queda pegada a la pared y se lee como una calcomanía; metida en su nicho, se
 * lee como lo que es: algo que vive DENTRO de la tierra.
 */
export const HORIZONTES = [
  { id: 'hojarasca', nombre: 'Hojarasca', hasta: 0.4, color: '#8a6038', hueco: 0 },
  { id: 'humus', nombre: 'Humus', hasta: 1.4, color: '#4a3325', hueco: 0.08 },
  { id: 'raices', nombre: 'Zona de raíces', hasta: 3.0, color: '#63492f', hueco: 0.24 },
  { id: 'micorrizas', nombre: 'Red micorrízica', hasta: 4.4, color: '#33261c', hueco: 0.5 },
  { id: 'roca', nombre: 'Roca madre', hasta: 99, color: '#514f5a', hueco: 0.22 },
];

/*
 * LA TIERRA AL AIRE LIBRE ES MÁS CLARA QUE LA TIERRA EN VITRINA.
 *
 * Los hex de arriba son los de `corteSuelo.geom.js`, y allá están calibrados
 * para una vitrina cerrada CON SUS PROPIAS LUCES apuntándole a la banda. Aquí
 * la pared del corte es una ladera a la intemperie: le llega el sol de refilón
 * (la cara mira al frente, el sol viene de arriba) y el resto es cielo. Puestos
 * tal cual, el corte entero se leía como UN AGUJERO NEGRO y los horizontes —que
 * son la lección— no se distinguían.
 *
 * La corrección es de VALOR, no de tono: se levanta el brillo conservando el
 * color exacto de cada horizonte, para que la lección del suelo se siga
 * reconociendo como la misma que la de la vitrina. La oscuridad del corte tiene
 * que ser LOCAL (grano, interfaces, la sombra de la alcoba), nunca un lavado
 * global — eso ya se aprendió una vez en el corte y no se vuelve a repetir.
 */
const LUZ_INTEMPERIE = 2.1;

/*
 * Subir el brillo a puro multiplicador SATURA: el rojo se dispara antes que el
 * verde y el azul, y el corte entero se pone naranja de macetero. La tierra
 * andina es parda, no naranja. Por eso, después de levantar el valor, se le
 * quita un quinto de saturación llevándolo hacia su propia luminancia: el tono
 * se conserva, el grito se va.
 */
function alIntemperie(hex, extra = 1) {
  const c = new THREE.Color(hex).multiplyScalar(LUZ_INTEMPERIE * extra);
  const lum = c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
  return c.lerp(new THREE.Color(lum, lum, lum), 0.22);
}

/* La ROCA MADRE se levanta más: es el PISO de la lámina, la faja gris sobre la
   que se apoya todo el suelo. En la vitrina puede ser un fondo callado porque
   allá compite con la red; aquí, si se apaga, el tercio de abajo del cuadro se
   vuelve un manchón negro y la ladera pierde su base. */
const HZ_COLOR = HORIZONTES.map((h) => alIntemperie(h.color, h.id === 'roca' ? 1.25 : 1));

/** El horizonte al que pertenece una profundidad (0 = superficie, + hacia abajo). */
export function horizonteDe(prof) {
  for (let i = 0; i < HORIZONTES.length; i++) if (prof <= HORIZONTES[i].hasta) return i;
  return HORIZONTES.length - 1;
}

/** Color del suelo a esa profundidad, con la transición difuminada entre
    horizontes (en la tierra real ninguna raya es una línea). */
export function colorHorizonte(prof, destino = new THREE.Color()) {
  const i = horizonteDe(prof);
  destino.copy(HZ_COLOR[i]);
  const h = HORIZONTES[i];
  const anterior = i > 0 ? HORIZONTES[i - 1].hasta : 0;
  const grosor = Math.max(0.001, h.hasta - anterior);
  const cerca = clamp01((prof - anterior) / Math.min(0.35, grosor * 0.4));
  if (i > 0 && cerca < 1) destino.lerp(HZ_COLOR[i - 1], (1 - cerca) * 0.5);
  return destino;
}

/** z de la cara del corte a esa profundidad (la alcoba escalonada). */
export function zCorteDe(prof) {
  const i = horizonteDe(prof);
  const h = HORIZONTES[i];
  const anterior = i > 0 ? HORIZONTES[i - 1].hasta : 0;
  const huecoAnt = i > 0 ? HORIZONTES[i - 1].hueco : 0;
  // el escalón se suaviza en el primer tercio del horizonte: es un scoop, no un
  // error de modelado
  const f = suave(anterior, anterior + Math.min(0.5, (h.hasta - anterior) * 0.45), prof);
  return BLOQUE.zFrente - (huecoAnt + (h.hueco - huecoAnt) * f);
}

/* Las profundidades donde se ponen filas de vértices en la cara del corte: los
   bordes de horizonte (para que la raya se vea nítida) y pasos intermedios.
   La última fila NO es una profundidad sino EL PISO DEL BLOQUE: la cara del
   corte tiene que llegar hasta abajo o por el frente se ve el hueco (la ladera
   sube 7,8 m y una pared de profundidad fija dejaba el páramo destapado). */
function filasDeProfundidad() {
  const filas = [0];
  let anterior = 0;
  for (const h of HORIZONTES) {
    const fin = Math.min(h.hasta, 6.6);
    const pasos = Math.max(2, Math.round((fin - anterior) / 0.42));
    for (let i = 1; i <= pasos; i++) filas.push(anterior + ((fin - anterior) * i) / pasos);
    anterior = fin;
    if (h.hasta > 6.6) break;
  }
  filas.push('fondo');
  return filas;
}

/* ══════════════════════════════════════════════════════════════════════════
   EL LOMO — la superficie de la ladera con sus tres fajas de color
   ══════════════════════════════════════════════════════════════════════════ */

/* El verde de cada faja sale del EJE TÉRMICO de la paleta madre: a más altura,
   menos saturación y más plata adentro. Es la misma ley con la que la sierra
   pinta sus bandas — la ladera no puede contradecirla. */
const FAJA = {
  templado: new THREE.Color(mezclar(VERDES.monte, TIERRAS.mantillo, 0.3)),
  frio: new THREE.Color(mezclar(VERDES.frio, TIERRAS.mantilloSombra, 0.34)),
  paramo: new THREE.Color(mezclar(TIERRAS.pajonal, VERDES.paramoMusgo, 0.42)),
};
const SUELO_DESNUDO = new THREE.Color(TIERRAS.mantillo);
const ROCA = new THREE.Color(TIERRAS.rocaParamo);
const ORILLA = new THREE.Color(mezclar(VERDES.paramoMusgo, AGUAS.lagunaOrilla, 0.3));

/** El color de la superficie en (x,z): la faja térmica que le toca, más la
    tierra que asoma en lo empinado y el verde húmedo de la orilla del agua. */
export function colorSuperficie(x, z, y, destino = new THREE.Color()) {
  // mezcla entre fajas: la frontera entre pisos no es una raya, es un traslape
  const aFrio = suave(-5.6, -1.6, x);
  const aParamo = suave(3.8, 7.6, x);
  destino.copy(FAJA.templado).lerp(FAJA.frio, aFrio).lerp(FAJA.paramo, aParamo);
  // pendiente: donde la ladera se empina, la tierra y la roca asoman
  const pend = Math.abs(alturaLadera(x + 0.35, z) - alturaLadera(x - 0.35, z)) / 0.7;
  const empinado = clamp01((pend - 0.55) / 1.2);
  destino.lerp(SUELO_DESNUDO, empinado * 0.6);
  destino.lerp(ROCA, clamp01((pend - 1.4) / 1.6) * 0.5);
  // la orilla del cauce: siempre más verde y más oscura (ahí nunca falta agua)
  const d = Math.abs(z - zCauce(x)) / 1.5;
  destino.lerp(ORILLA, clamp01(1 - d) * 0.5);
  // manchas de terreno: nada de césped de estadio
  const n = ruidoFbm(x * 0.55 + 3, y * 0.4, z * 0.55);
  destino.multiplyScalar(0.88 + n * 0.26);
  return destino;
}

/**
 * EL LOMO DE LA LADERA: la malla de la superficie, con el color de las fajas
 * horneado por vértice. Es la pieza más grande del mundo y va en UN draw-call.
 */
/* Las columnas del bloque. El lomo y la cara del corte DEBEN muestrear la
   misma malla en x: con dos resoluciones distintas los vértices del borde no
   coinciden y se abre una costura de un píxel por la que se ve el cielo. */
const columnas = (q) => Math.max(56, Math.round(140 * q));

export function construirLomo({ q = 1 } = {}) {
  const nx = columnas(q);
  const nz = Math.max(24, Math.round(64 * q));
  const ancho = BLOQUE.xMax - BLOQUE.xMin;
  const hondo = BLOQUE.zFrente - BLOQUE.zFondo;
  const geo = new THREE.PlaneGeometry(ancho, hondo, nx, nz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((BLOQUE.xMin + BLOQUE.xMax) / 2, 0, (BLOQUE.zFondo + BLOQUE.zFrente) / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, alturaLadera(pos.getX(i), pos.getZ(i)));
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  pintarPorVertice(geo, (x, y, z, i, c) => colorSuperficie(x, z, y, c));
  return geo;
}

/* ══════════════════════════════════════════════════════════════════════════
   LA CARA CORTADA — el perfil del suelo, la lámina de Humboldt
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * La pared del corte: una malla de columnas (a lo largo de la ladera) por filas
 * (profundidad). Cada fila sigue su horizonte, se hunde en la alcoba y lleva su
 * color horneado con grano y oclusión en las interfaces.
 *
 * OJO con la oscuridad: la banda de micorrizas es la MÁS oscura a propósito —
 * es el fondo contra el que resalta la red. Pero la oscuridad tiene que ser
 * LOCAL (grano, interfaces, alcoba), nunca un lavado global: un corte
 * uniformemente negro se lee como un agujero, no como tierra.
 */
export function construirCorte({ q = 1 } = {}) {
  const nx = columnas(q);
  const filas = filasDeProfundidad();
  const cols = nx + 1;
  const rows = filas.length;
  const pos = new Float32Array(cols * rows * 3);
  const col = new Float32Array(cols * rows * 3);
  const idx = [];
  const c = new THREE.Color();

  for (let iv = 0; iv < rows; iv++) {
    const fondo = filas[iv] === 'fondo';
    const prof = fondo ? 6.6 : filas[iv];
    const z = zCorteDe(prof);
    for (let iu = 0; iu < cols; iu++) {
      const x = BLOQUE.xMin + ((BLOQUE.xMax - BLOQUE.xMin) * iu) / nx;
      const ySup = alturaEnCorte(x);
      /* La ladera sube 7,8 m: en el extremo del templado, 6,6 m de perfil se
         salen POR DEBAJO del piso del bloque y la pared se doblaba sobre sí
         misma. El perfil se recorta contra el piso — que es exactamente lo que
         hace un bloque de verdad: la roca madre se va por el borde de abajo. */
      const y = fondo ? BLOQUE.yFondo : Math.max(ySup - prof, BLOQUE.yFondo);
      const k = (iv * cols + iu) * 3;
      pos[k] = x;
      pos[k + 1] = y;
      pos[k + 2] = z + Math.sin(x * 1.7 + prof * 2.3) * 0.03; // la pared no es un vidrio
      colorHorizonte(fondo ? 9 : prof, c);
      // grano de tierra
      const n = ruidoFbm(x * 1.6, prof * 2.2, 7);
      c.multiplyScalar(0.92 + n * 0.22);
      // oclusión en el borde de cada horizonte (las interfaces se ven)
      const i = horizonteDe(prof);
      const anterior = i > 0 ? HORIZONTES[i - 1].hasta : 0;
      const pegado = 1 - clamp01((prof - anterior) / 0.22);
      c.multiplyScalar(1 - pegado * 0.2);
      // la alcoba está en sombra: se hunde en la pared
      const hondo = clamp01((BLOQUE.zFrente - z) / 0.5);
      c.multiplyScalar(1 - hondo * 0.16);
      // el pie del bloque se apaga: el ojo tiene que quedarse en la lección
      if (fondo) c.multiplyScalar(0.72);
      col[k] = c.r;
      col[k + 1] = c.g;
      col[k + 2] = c.b;
    }
  }
  for (let iv = 0; iv < rows - 1; iv++) {
    for (let iu = 0; iu < nx; iu++) {
      const a = iv * cols + iu;
      const b = a + 1;
      const cc = a + cols;
      const dd = cc + 1;
      idx.push(a, cc, b, b, cc, dd); // normal hacia +Z (a la cámara)
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/**
 * EL FALDÓN: los costados, el fondo y la base del bloque. No es decorado — sin
 * él la ladera es una cáscara y por los flancos se ve el cielo por dentro.
 * Va en tierra honda: el ojo tiene que quedarse en la cara del corte.
 */
export function construirFaldon({ q = 1 } = {}) {
  const partes = [];
  const nx = Math.max(24, Math.round(60 * q));
  const nz = Math.max(10, Math.round(24 * q));
  const yF = BLOQUE.yFondo;

  const cortina = (puntos, etiqueta) => {
    // puntos: [{x,z}] a lo largo del borde; se baja una cortina hasta yFondo
    const n = puntos.length;
    const pos = new Float32Array(n * 2 * 3);
    const col = new Float32Array(n * 2 * 3);
    const idx = [];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const { x, z } = puntos[i];
      const ySup = alturaLadera(x, z);
      for (let j = 0; j < 2; j++) {
        const y = j === 0 ? ySup : yF;
        const k = (j * n + i) * 3;
        pos[k] = x;
        pos[k + 1] = y;
        pos[k + 2] = z;
        colorHorizonte(j === 0 ? 0.2 : ySup - yF, c);
        c.multiplyScalar(j === 0 ? 0.8 : 0.62);
        col[k] = c.r;
        col[k + 1] = c.g;
        col[k + 2] = c.b;
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = i;
      const b = i + 1;
      const cc = n + i;
      const dd = n + i + 1;
      idx.push(a, cc, b, b, cc, dd);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.name = etiqueta;
    return g;
  };

  // costado izquierdo (de frente hacia el fondo) y derecho (al revés, para que
  // la cara mire hacia afuera en los dos)
  const izq = [];
  const der = [];
  for (let i = 0; i <= nz; i++) {
    const z = BLOQUE.zFrente - ((BLOQUE.zFrente - BLOQUE.zFondo) * i) / nz;
    izq.push({ x: BLOQUE.xMin, z });
    der.push({ x: BLOQUE.xMax, z: BLOQUE.zFondo + ((BLOQUE.zFrente - BLOQUE.zFondo) * i) / nz });
  }
  partes.push(cortina(izq, 'faldon-izq'));
  partes.push(cortina(der, 'faldon-der'));

  // fondo
  const atras = [];
  for (let i = 0; i <= nx; i++) {
    atras.push({ x: BLOQUE.xMax - ((BLOQUE.xMax - BLOQUE.xMin) * i) / nx, z: BLOQUE.zFondo });
  }
  partes.push(cortina(atras, 'faldon-fondo'));

  // la base del bloque
  const base = new THREE.PlaneGeometry(
    BLOQUE.xMax - BLOQUE.xMin,
    BLOQUE.zFrente - BLOQUE.zFondo,
  );
  base.rotateX(Math.PI / 2);
  base.translate(
    (BLOQUE.xMin + BLOQUE.xMax) / 2,
    yF,
    (BLOQUE.zFondo + BLOQUE.zFrente) / 2,
  );
  /* Las cortinas se arman a mano (position+color+normal) y el plano de la base
     viene con `uv`: si los atributos no coinciden, `mergeGeometries` devuelve
     NULL EN SILENCIO y el faldón entero no se dibuja. `fusionarSeguro` lo
     trona, pero mejor no llegar ahí: se le quita el uv al plano. */
  base.deleteAttribute('uv');
  partes.push(pintarPlano(base, new THREE.Color(HORIZONTES[4].color).multiplyScalar(0.5)));

  return fusionarSeguro(partes, 'faldon-ladera');
}

/* ══════════════════════════════════════════════════════════════════════════
   EL AGUA — nace en el páramo, se despeña dos veces y llega hecha quebrada
   ══════════════════════════════════════════════════════════════════════════ */

/** El nacimiento: dónde brota el agua, arriba del todo. */
export const MANANTIAL = { x: 12.1, z: zCauce(12.1) };

/**
 * El camino del agua a lo largo de la ladera. Sigue el surco del terreno (por
 * eso pega tan bien: el surco y el agua salen de la misma función) y en los
 * escarpes cae casi a plomo.
 */
export function caminoAgua(pasos = 130) {
  const pts = [];
  const x0 = MANANTIAL.x;
  const x1 = BLOQUE.xMin + 0.4;
  for (let i = 0; i <= pasos; i++) {
    const x = x0 + ((x1 - x0) * i) / pasos;
    pts.push(new THREE.Vector3(x, nivelAgua(x), zCauce(x)));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.3);
}

/**
 * LA QUEBRADA: una CINTA que se acuesta sobre el terreno y ENSANCHA aguas
 * abajo. Lo del ancho no es capricho de dibujo — es la lección: el hilo del
 * páramo llega abajo hecho quebrada porque por el camino recoge todo lo que la
 * ladera le entrega.
 *
 * Antes era un tubo, y un tubo de sección redonda tendido en el suelo se lee
 * como una MANGUERA, no como agua: la silueta cilíndrica delata el sólido. Una
 * cinta que sigue la altura del terreno en TODO su ancho (no solo en el eje) se
 * mete en su cama sola, se dobla en los escarpes y se lee como lámina de agua.
 */
export function construirAgua({ q = 1 } = {}) {
  const curva = caminoAgua();
  const pasos = Math.max(80, Math.round(230 * q));
  const cols = 5;
  const pos = new Float32Array((pasos + 1) * cols * 3);
  const col = new Float32Array((pasos + 1) * cols * 3);
  const idx = [];
  const viva = new THREE.Color(AGUAS.viva);
  const honda = new THREE.Color(AGUAS.lagunaHonda);
  const orilla = new THREE.Color(AGUAS.lagunaOrilla);
  const espuma = new THREE.Color(AGUAS.espuma);
  const c = new THREE.Color();
  const p = new THREE.Vector3();
  const tg = new THREE.Vector3();
  const lat = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    curva.getPointAt(t, p);
    curva.getTangentAt(t, tg);
    lat.crossVectors(tg, arriba).normalize();
    if (!Number.isFinite(lat.x)) lat.set(1, 0, 0);
    /* La cinta se hace MÁS ANCHA de lo que se va a ver: sobra a los lados para
       que el terreno la recorte. Lo que el ojo lee como ancho de la quebrada lo
       decide el cauce, no este número. */
    /* …pero NUNCA se pasa del labio: si la cinta cruza el filo del corte, se
       asoma por la cara del tajo y se ve un chorro de agua saliendo de la
       pared de tierra. */
    const ancho = Math.min(2.6 + 2.2 * t, 2 * (BLOQUE.zFrente - 0.3 - zCauce(p.x)));
    const salto = enEscarpe(p.x); // ¿va cayendo? ahí el agua se rompe y blanquea
    /* LA LÁMINA ES PLANA A LO ANCHO, no calcada del terreno punto por punto.
       La primera versión pedía la altura para CADA vértice del ancho: los
       bordes caían sobre las orillas —que son más altas que el fondo del
       cauce— y quedaban ENTERRADOS, así que la quebrada se rompía en charcos
       sueltos. El agua se pone al NIVEL del cauce y la deja que el terreno la
       recorte: donde la orilla sube, tapa la lámina; donde el surco se abre, la
       quebrada se ensancha sola. Eso es lo que hace un río de verdad. */
    const yNivel = nivelAgua(p.x);
    for (let j = 0; j < cols; j++) {
      const u = (j / (cols - 1)) * 2 - 1; // -1 orilla ← 0 eje → 1 orilla
      const x = p.x + lat.x * u * ancho * 0.5;
      const z = p.z + lat.z * u * ancho * 0.5;
      const k = (i * cols + j) * 3;
      pos[k] = x;
      pos[k + 1] = yNivel + (1 - Math.abs(u)) * 0.03; // apenas abombada al centro
      pos[k + 2] = z;
      const n = ruidoFbm(x * 2.2, i * 0.35, z * 2.2);
      /* El agua andina a la luz del día es CLARA, no un pozo negro: manda el
         azul vivo y la orilla verde-lechosa; el azul hondo es solo el veteado. */
      c.copy(viva).lerp(honda, clamp01(0.45 - n * 0.6));
      c.lerp(orilla, Math.abs(u) ** 2 * 0.5);
      if (salto > 0) c.lerp(espuma, salto * (0.5 + n * 0.4));
      col[k] = c.r;
      col[k + 1] = c.g;
      col[k + 2] = c.b;
    }
  }
  /*
   * EL SENTIDO DE LOS TRIÁNGULOS: la cara de la lámina tiene que mirar ARRIBA.
   *
   * Con el orden (a, d, b) la normal salía HACIA ABAJO y la quebrada entera
   * quedaba descartada por back-face culling: en pantalla solo se veían las
   * pozas (que se arman aparte, con un `CircleGeometry` ya girado y por eso
   * bien orientado), así que el agua se leía como una cadena de charcos sueltos
   * y el tramo que los une simplemente no existía. No era el color, ni el
   * nivel, ni el cauce: eran tres índices en el orden equivocado, y no avisa
   * nadie — la geometría se construye igual de bien.
   */
  for (let i = 0; i < pasos; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const d = a + cols;
      const e = d + 1;
      idx.push(a, b, d, b, e, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** El charco del nacimiento y las dos pozas al pie de cada salto. */
export function construirPozas({ q = 1 } = {}) {
  const partes = [];
  const sitios = [
    { x: MANANTIAL.x, r: 0.95 },
    { x: ESCARPES[1].desde - 0.55, r: 0.7 },
    { x: ESCARPES[1].hasta + 0.6, r: 1.05 },
    { x: ESCARPES[0].desde - 0.55, r: 0.78 },
    { x: ESCARPES[0].hasta + 0.65, r: 1.3 },
    { x: BLOQUE.xMin + 2.4, r: 1.5 },
  ];
  const viva = new THREE.Color(AGUAS.viva);
  const honda = new THREE.Color(AGUAS.lagunaHonda);
  const orilla = new THREE.Color(AGUAS.lagunaOrilla);
  for (const s of sitios) {
    const z = zCauce(s.x);
    const g = new THREE.CircleGeometry(s.r, Math.max(10, Math.round(22 * q)));
    g.rotateX(-Math.PI / 2);
    poner(g, [s.x, nivelAgua(s.x) + 0.01, z]);
    pintarPorVertice(g, (px, py, pz, i, c) => {
      const d = clamp01(Math.hypot(px - s.x, pz - z) / s.r);
      // la poza es honda en el centro y se aclara en la orilla
      c.copy(honda).lerp(viva, d * 0.8).lerp(orilla, d ** 3 * 0.6);
      return c;
    });
    partes.push(g);
  }
  return fusionarSeguro(partes, 'pozas');
}

/** Las CHISPAS del agua que bajan: instancias que viajan por el camino. Es lo
    que hace que la quebrada CORRA en vez de quedarse pintada en el suelo. */
export function chispasDeAgua(n = 34, seed = 71) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      t: r(), // posición inicial en el camino (0 arriba → 1 abajo)
      vel: 0.028 + r() * 0.03,
      lado: (r() - 0.5) * 0.22,
      alto: 0.04 + r() * 0.1,
      esc: 0.05 + r() * 0.06,
    });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   LA RED DE MICORRIZAS — lo que amarra a los tres por debajo
   ══════════════════════════════════════════════════════════════════════════ */

/* La banda donde vive la red: sigue el lomo de la ladera a una profundidad
   fija, así que la red SUBE con la montaña. Ver la red escalonarse detrás de
   las tres terrazas es, literalmente, la lección. */
export const PROF_RED = 3.6;

/** El punto de la banda micorrízica bajo la abscisa x, sobre el plano del corte. */
export function puntoBanda(x, jitter = 0) {
  return new THREE.Vector3(
    x,
    alturaEnCorte(x) - PROF_RED + Math.sin(x * 0.8 + 1.3) * 0.28 + jitter,
    zCorteDe(PROF_RED) + 0.12 + Math.sin(x * 1.9) * 0.05,
  );
}

/**
 * LA RAÍZ DE SECCIÓN de cada Ent: la raíz gruesa que baja del árbol, se acerca
 * al plano del corte y llega a la banda. Es la que hace que la red no sea un
 * adorno bonito bajo tierra sino algo ENGANCHADO a un árbol que está ahí
 * arriba: se ve salir del pie del Ent y se ve llegar a la red.
 */
export function raizDeSeccion(piso) {
  const ySup = alturaLadera(piso.x, piso.z);
  const yCorte = alturaEnCorte(piso.x);
  const fin = puntoBanda(piso.x);
  /* Los tramos intermedios SIGUEN la cara escalonada del corte (`zCorteDe`),
     0,12 por delante. Si la raíz cortara recto del pie del árbol a la banda, se
     metería dentro del bloque y desaparecería a media bajada: se vería una raíz
     que sale del árbol, se corta, y una red que empieza de la nada. */
  /* El primer tramo SE HUNDE de una: sale del pie del árbol y a un metro ya va
     bajo tierra. Si en cambio viajara del árbol al plano del corte por encima
     del suelo —que fue la primera versión— se veía una vara pálida de casi seis
     metros tendida sobre el pasto. Una raíz se mete en la tierra; lo que se
     asoma de ella es lo que el tajo dejó al descubierto, y nada más. */
  const pts = [
    new THREE.Vector3(piso.x, ySup + 0.15, piso.z),
    new THREE.Vector3(piso.x + 0.1, ySup - 1.1, piso.z + 1.1),
  ];
  for (const prof of [1.7, 2.5, 3.2]) {
    pts.push(new THREE.Vector3(
      piso.x + Math.sin(prof * 1.7) * 0.16,
      yCorte - prof,
      zCorteDe(prof) + 0.12,
    ));
  }
  pts.push(fin.clone());
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/**
 * EL ESQUELETO DE LA RED: el rizomorfo que corre toda la ladera, las raíces de
 * sección que bajan de los tres Ents y los filamentos finos que se abren a los
 * lados. Devuelve polilíneas con su grosor y su tipo.
 */
export function esqueletoRed({ q = 1 } = {}) {
  const r = rng(4242);
  const hilos = [];

  /* 1. EL RIZOMORFO: el cordón grueso que va de punta a punta de la ladera.
        Es el que dice "esto es UNA red", no tres matas con hongos aparte. */
  const troncal = [];
  for (let x = BLOQUE.xMax - 1.6; x >= BLOQUE.xMin + 1.2; x -= 0.7) {
    troncal.push(puntoBanda(x, Math.sin(x * 1.7) * 0.16));
  }
  hilos.push({ pts: troncal, grosor: 0.055, tipo: 'rizomorfo' });

  /* 2. Un segundo cordón más hondo y más tenue: la red tiene espesor. */
  const troncal2 = [];
  for (let x = BLOQUE.xMax - 2.6; x >= BLOQUE.xMin + 2.2; x -= 0.9) {
    troncal2.push(puntoBanda(x, -0.75 + Math.sin(x * 1.1 + 2) * 0.22));
  }
  hilos.push({ pts: troncal2, grosor: 0.032, tipo: 'rizomorfo' });

  /* 3. Las bajantes de los tres Ents (las que enganchan la red al árbol). */
  for (const piso of PISOS) {
    const curva = raizDeSeccion(piso);
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(curva.getPointAt(i / 16));
    hilos.push({ pts, grosor: 0.075, tipo: 'raiz', piso: piso.id });
  }

  /* 4. Los PUENTES: filamentos que salen del rizomorfo y trepan a buscar la
        raíz del vecino. Son los que se ven "cosiendo" un árbol con otro. */
  for (let i = 0; i < PISOS.length - 1; i++) {
    const a = puntoBanda(PISOS[i].x);
    const b = puntoBanda(PISOS[i + 1].x);
    const medio = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, 0.95, 0.08));
    const curva = new THREE.CatmullRomCurve3([a, medio, b], false, 'catmullrom', 0.5);
    const pts = [];
    for (let k = 0; k <= 18; k++) pts.push(curva.getPointAt(k / 18));
    hilos.push({ pts, grosor: 0.028, tipo: 'puente' });
  }

  /* 5. Los filamentos finos: la maraña que hace que la banda no sea un cable
        sino un tejido. Se recortan por tier. */
  const cuantos = Math.max(10, Math.round(34 * q));
  for (let i = 0; i < cuantos; i++) {
    const x = BLOQUE.xMin + 2 + r() * (BLOQUE.xMax - BLOQUE.xMin - 4);
    const base = puntoBanda(x, (r() - 0.5) * 0.5);
    const sube = r() > 0.45;
    const pts = [base.clone()];
    let p = base.clone();
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      p = p.clone().add(new THREE.Vector3(
        (r() - 0.5) * 1.5,
        (sube ? 0.42 : -0.38) * (0.5 + r()),
        (r() - 0.5) * 0.16,
      ));
      // la hifa no puede salirse por debajo del bloque: colgaría en el aire
      p.y = Math.max(p.y, BLOQUE.yFondo + 0.45);
      pts.push(p);
    }
    hilos.push({ pts, grosor: 0.011 + r() * 0.008, tipo: 'hifa' });
  }

  return hilos;
}

/**
 * LA RED en UNA geometría. El color va horneado: el rizomorfo en turquesa
 * pleno, las hifas finas apagándose, las raíces en su pardo de raíz VIVA — que
 * es materia y no luz. Ese contraste (la raíz es cosa, la red es luz) es lo que
 * hace legible la lección.
 */
export function construirRed(hilos, { q = 1 } = {}) {
  const partes = [];
  const micelio = new THREE.Color(MICO.micelio);
  const tenue = new THREE.Color(MICO.micelioTenue);
  const puente = new THREE.Color(MICO.puente);
  const raiz = new THREE.Color(MICO.raiz);
  const raizPunta = new THREE.Color(MICO.raizPunta);

  for (const h of hilos) {
    if (h.pts.length < 2) continue;
    const curva = new THREE.CatmullRomCurve3(h.pts, false, 'catmullrom', 0.4);
    const radial = h.tipo === 'hifa' ? 4 : Math.max(4, Math.round(7 * q));
    const tubular = Math.max(6, Math.round((h.tipo === 'hifa' ? 10 : 26) * q));
    const geo = tuboOrganico(curva, {
      tubular,
      radial,
      taper: (t) => h.grosor * (h.tipo === 'raiz' ? 1 - 0.72 * t : 1 - 0.35 * t),
      arruga: h.tipo === 'raiz' ? 0.16 : 0.06,
      semilla: h.pts[0].x * 3,
      minRadio: 0.004,
    });
    const largo = curva.getLength();
    pintarPorVertice(geo, (x, y, z, i, c) => {
      if (h.tipo === 'raiz') {
        const t = clamp01((h.pts[0].y - y) / Math.max(0.001, h.pts[0].y - h.pts[h.pts.length - 1].y));
        c.copy(raiz).lerp(raizPunta, t * 0.8);
        return c;
      }
      const n = ruidoFbm(x * 1.4, y * 1.4, z * 1.4);
      if (h.tipo === 'puente') c.copy(puente).lerp(micelio, n * 0.5);
      else if (h.tipo === 'rizomorfo') c.copy(micelio).lerp(tenue, n * 0.45);
      else c.copy(tenue).lerp(micelio, n * 0.6);
      // el filamento se apaga hacia la punta: la red se pierde en la tierra
      if (h.tipo === 'hifa') c.multiplyScalar(0.65 + 0.35 * clamp01(largo));
      return c;
    });
    partes.push(geo);
  }
  return fusionarSeguro(partes, 'red-micorrizas-ladera');
}

/** Los NODOS: donde la red se junta consigo misma o con una raíz. Se dibujan
    como perlas para que el ojo tenga dónde parar (una maraña pareja no enseña). */
export function nodosDeRed(hilos, { q = 1 } = {}) {
  const r = rng(77);
  const nodos = [];
  for (const piso of PISOS) {
    // el nodo de intercambio de cada árbol: el más grande, el que importa
    nodos.push({ p: puntoBanda(piso.x), esc: 0.16, tipo: 'intercambio', piso: piso.id });
  }
  const troncal = hilos.find((h) => h.tipo === 'rizomorfo');
  if (troncal) {
    const cuantos = Math.max(5, Math.round(14 * q));
    for (let i = 0; i < cuantos; i++) {
      const p = troncal.pts[Math.floor(r() * troncal.pts.length)];
      nodos.push({ p: p.clone().add(new THREE.Vector3(0, (r() - 0.5) * 0.2, 0.02)), esc: 0.055 + r() * 0.04, tipo: 'nodo' });
    }
  }
  return nodos;
}

/**
 * LOS PULSOS que viajan por la red. En el mundo de las micorrizas ya está
 * dicho qué viaja: minerales y agua del hongo hacia la planta, azúcar de la
 * planta hacia el hongo. Aquí los pulsos recorren el rizomorfo de punta a
 * punta — que es lo que hace visible que los tres están conectados.
 */
export function pulsosDeRed(n = 26, seed = 53) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const carbono = r() > 0.55;
    out.push({
      t: r(),
      vel: 0.035 + r() * 0.045,
      dir: carbono ? -1 : 1, // el azúcar baja al hongo; el mineral sube a la mata
      color: carbono ? MICO.carbono : (r() > 0.5 ? MICO.fosforo : MICO.agua),
      esc: 0.05 + r() * 0.05,
      lado: (r() - 0.5) * 0.12,
    });
  }
  return out;
}

/* ══════════════════════════════════════════════════════════════════════════
   PIEDRAS Y DETALLE DE LOS ESCARPES
   ══════════════════════════════════════════════════════════════════════════ */

/** Las piedras del talud y de la orilla: rompen el borde de los escarpes para
    que el salto de terraza se lea como roca y no como un escalón de plastilina. */
export function construirPiedras({ q = 1 } = {}, seed = 313) {
  const r = rng(seed);
  const partes = [];
  const roca = new THREE.Color(TIERRAS.rocaParamo);
  const rocaClara = new THREE.Color(mezclar(TIERRAS.rocaParamo, NEUTROS.cal, 0.28));
  const cuantas = Math.max(14, Math.round(46 * q));
  for (let i = 0; i < cuantas; i++) {
    // la mitad en los escarpes, la mitad regadas por las terrazas
    let x;
    let z;
    if (i % 2 === 0) {
      const e = ESCARPES[i % 4 < 2 ? 0 : 1];
      x = e.desde + r() * (e.hasta - e.desde);
      z = BLOQUE.zFondo + 1.5 + r() * (BLOQUE.zFrente - BLOQUE.zFondo - 2.4);
    } else {
      x = BLOQUE.xMin + 1 + r() * (BLOQUE.xMax - BLOQUE.xMin - 2);
      z = BLOQUE.zFondo + 1.2 + r() * (BLOQUE.zFrente - BLOQUE.zFondo - 2);
    }
    const y = alturaLadera(x, z);
    const esc = 0.18 + r() * 0.42;
    const g = new THREE.IcosahedronGeometry(esc, 0);
    const pos = g.attributes.position;
    const v = new THREE.Vector3();
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      const n = ruidoFbm(v.x * 3 + i, v.y * 3, v.z * 3) - 0.5;
      v.multiplyScalar(1 + n * 0.5);
      pos.setXYZ(k, v.x, v.y * 0.72, v.z);
    }
    pos.needsUpdate = true;
    poner(g, [x, y + esc * 0.28, z], [r(), r() * 6, r()]);
    pintarPorVertice(g, (px, py, pz, k, c) => {
      const alto = clamp01((py - (y - esc)) / (esc * 2));
      c.copy(roca).lerp(rocaClara, alto * 0.7);
      const n = ruidoFbm(px * 2.5, py * 2.5, pz * 2.5);
      c.multiplyScalar(0.86 + n * 0.28);
      return c;
    });
    partes.push(g);
  }
  return fusionarSeguro(partes, 'piedras-ladera');
}
