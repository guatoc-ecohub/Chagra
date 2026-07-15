/*
 * sucesion.geom — la GEOMETRÍA de la ladera que vuelve a ser monte.
 *
 * Esto es la tesis de Guatoc hecha materia: un potrero degradado y el bosque que
 * sale de él, en el MISMO terreno. No son cinco escenas: es UNA ladera y una sola
 * variable —el AÑO— que la atraviesa. Por eso aquí no hay "etapas": hay las cosas
 * que aparecen (y las que se van), cada una con su forma propia:
 *
 *   · Terreno de la ladera     — el suelo desnudo del potrero: ocre, lavado, con
 *                                las cicatrices rojizas por donde se fue la tierra.
 *   · Cárcava                  — la herida: piso oscuro y labios de tierra cruda.
 *                                Se cierra cuando las raíces agarran.
 *   · Barrera viva             — lo que SIEMBRA el campesino: mata de pasto de
 *                                corte + arbustos + estaca, en curva de nivel.
 *   · Raíces                   — el abanico que agarra el suelo sobre la cárcava.
 *   · Pasto pobre              — la macolla amarillenta del potrero. Se va con la
 *                                sombra (no muere: la tapa el monte).
 *   · Helecho                  — la pionera de sombra, con su báculo enroscado.
 *   · Plántula                 — la mata recién nacida. Dos cohortes: la del año 1
 *                                y la que el bosque maduro siembra solo.
 *   · Hojarasca                — el parche de hoja caída que va HACIENDO suelo.
 *   · Epífita                  — quiche y barbas de viejo: solo con dosel.
 *   · Queñua joven             — *Polylepis*: tronco retorcido rojizo, hoja menuda
 *                                plateada. La especie del guardián, de vuelta.
 *   · Quebrada                 — la cinta de agua que sigue el canal del terreno.
 *   · Ave                      — la fauna que regresa.
 *
 * Los ÁRBOLES no se re-inventan: se importan de `floraParamo.geom.js` (aliso,
 * yarumo, encenillo, gaque, roble, mortiño, romerillo, roca, musgo) para que este
 * bosque sea EL MISMO bosque que ya aprobamos.
 *
 * TÉCNICA tier-safe (igual que floraParamo): cada especie se FUSIONA en UNA
 * geometría con color horneado en vertexColors → UN InstancedMesh → una draw-call
 * por especie por más matas que haya. Cero assets: todo procedural, corre headless.
 *
 * Aquí viven SOLO datos y mallas (nada de WebGL). El componente r3f los consume.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  LA LADERA — la forma del terreno (fuente de verdad compartida)             */
/* -------------------------------------------------------------------------- */

/*
 * Una sola función define el relieve, y TODO se cuelga de ella: la malla del
 * suelo, dónde se para cada mata, por dónde corre el agua. Si el terreno cambia,
 * el bosque lo sigue solo.
 *
 * La ladera BAJA hacia la cámara (+z) — uno la mira desde el filo de abajo, como
 * quien se para en su lote a mirar para arriba. Y tiene un CANAL: la vaguada por
 * donde bajaba el agua cuando había agua.
 */
export const LADERA = { xMin: -19, xMax: 19, zMin: -17, zMax: 13 };

/** El eje del canal (la vaguada): x fijo, corre ladera abajo. */
export const CANAL_X = -3.2;
/** Dónde está el nacimiento (la cabecera del canal). */
export const NACIMIENTO_Z = -9.5;
/** Dónde quedó parado el árbol que sobrevivió: el que da la semilla. */
export const ARBOL_SEMILLA = { x: 4.6, z: -5.2, escala: 1.45 };

/** La altura del terreno en (x, z). Determinista y pura. */
export function alturaLadera(x, z) {
  const pendiente = -z * 0.3; // la ladera sube hacia el fondo
  const ondas =
    Math.sin(x * 0.31) * 0.3 +
    Math.cos(z * 0.24) * 0.22 +
    Math.sin(x * 0.14 + z * 0.1) * 0.35;
  // La vaguada: una V suave y ancha por donde busca el agua.
  const d = x - CANAL_X;
  const canal = -1.05 * Math.exp(-(d * d) / 4.5);
  // La poza del nacimiento: el hueco está SIEMPRE ahí, con agua o sin agua. En el
  // año 0 es un hoyo de lodo rajado; a los 50 es el ojo de agua. La tierra se
  // acuerda de dónde brotaba: por eso la depresión no depende del año.
  const dnx = x - CANAL_X;
  const dnz = z - NACIMIENTO_Z;
  const poza = -0.55 * Math.exp(-(dnx * dnx + dnz * dnz) / 1.6);
  return pendiente + ondas + canal + poza;
}

/** ¿Este punto cae dentro del canal? (ahí no se siembra: es cauce). */
export const enCanal = (x, margen = 1.15) => Math.abs(x - CANAL_X) < margen;

/* -------------------------------------------------------------------------- */
/*  Paleta de la sucesión (horneada en vertexColors)                           */
/* -------------------------------------------------------------------------- */

export const PAL_SUC = {
  // Suelo desnudo del potrero (lo que queda cuando se fue la capa vegetal)
  sueloOcre: '#9c7c52',
  sueloOcre2: '#8a6a45',
  sueloPalido: '#b09775', // el más lavado, donde ya no hay nada
  sueloCicatriz: '#8c5638', // el rojizo del subsuelo expuesto
  sueloSombra: '#6f5a3f',

  // Cárcava (la herida de la erosión)
  carcavaPiso: '#5d3b28', // el fondo, en sombra
  carcavaLabio: '#a5824f', // el borde de tierra cruda que se desmorona
  carcavaPiedra: '#8e8578', // la piedra que quedó al aire

  // Barrera viva (lo que siembra el campesino)
  barreraMacolla: '#7d8f4a', // pasto de corte
  barreraMacolla2: '#8e9a58',
  barreraMata: '#4f6b3c',
  barreraEstaca: '#6b5033',

  // Raíces que agarran
  raiz: '#6b5236',
  raizFina: '#8a7150',

  // Pasto pobre del potrero (amarillento, ralo)
  pastoPobre: '#9a9152',
  pastoPobre2: '#8a8447',
  pastoSeco: '#a89a63',

  // Helecho
  helechoFronda: '#3f6b3a',
  helechoFronda2: '#4f7c45',
  helechoBaculo: '#6f8a4a',

  // Plántula
  plantulaTallo: '#6f7f45',
  plantulaHoja: '#5d8a48',
  plantulaCotiledon: '#7ea05c',

  // Hojarasca (la hoja caída que hace suelo)
  hojarasca: '#4a3c28',
  hojaCaida: '#7d6a42',
  hojaCaida2: '#6b5a3a',
  hojaCaida3: '#8a6f45',

  // Epífitas (solo con dosel)
  quicheHoja: '#4a6b45',
  quicheCentro: '#8c4a35', // el cogollo rojo del quiche
  barbaVieja: '#94a08a', // Tillandsia: las barbas de viejo

  // Queñua (Polylepis) — la especie del guardián
  quenuaTronco: '#8b4a35', // corteza rojiza en láminas de papel
  quenuaTronco2: '#a05a3f',
  quenuaHoja: '#6f855e',
  quenuaHoja2: '#7f9670',

  // Agua
  aguaClara: '#6f96a0',
  lodoSeco: '#7a6448', // el nacimiento cuando está seco

  // Fauna
  ave: '#2f3730',
  aveVientre: '#6b7264',
};

/* -------------------------------------------------------------------------- */
/*  Utilidades de construcción (mismas del patrón floraParamo)                 */
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

/** Coloca una geometría con posición/rotación/escala (transforma vértices). */
function poner(geo, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(pos[0], pos[1], pos[2]),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])),
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geo.applyMatrix4(m);
  return geo;
}

/** Orienta el eje +Y de la geometría hacia `dir` y la ubica en `pos`. */
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

/*
 * Fusiona la lista de partes (ya coloreadas) en UNA geometría.
 *
 * MISMA trampa (y misma solución) que en `floraParamo.geom.js`: `mergeGeometries`
 * exige que TODAS las partes coincidan en el indexado —"index attribute exists
 * among all geometries, or in none of them"— y en three no coinciden solas:
 * Cone/Cylinder/Sphere/Plane/Circle/Torus vienen INDEXADAS, pero Icosahedron (todo
 * Polyhedron) viene SIN indexar. Un tronco de cilindro con una copa de icosaedros
 * —o sea, media docena de las matas de este archivo— hace que `mergeGeometries`
 * devuelva `null` y apenas escupa un console.error.
 *
 * Eso es peor que un crash: como el componente r3f hace `if (!geo) return null`,
 * la especie NO SE DIBUJA y nadie se entera. La cárcava, la barrera viva y la
 * queñua se me cayeron así, en silencio, hasta que las conté headless.
 *
 * Por eso: desindexar todo antes de fusionar (cuesta unos vértices que igual se
 * pierden con `flatShading`), y si aun así falla, TRONAR en vez de devolver null.
 * Una mata que falta tiene que doler, no esconderse.
 */
function fusionar(partes) {
  const buenas = partes.filter(Boolean).map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(buenas, false);
  if (!geo) throw new Error('sucesion.geom: la fusión falló (partes incompatibles)');
  return geo;
}

/** Pequeña variación determinista de color (para que nada se vea plano). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  EL TERRENO — la ladera pelada                                              */
/* -------------------------------------------------------------------------- */

/*
 * La malla del suelo, desplazada por `alturaLadera` y con el color del potrero
 * HORNEADO por vértice: ocre lavado, parches pálidos donde ya no queda nada y
 * cicatrices rojizas de subsuelo expuesto en las partes más paradas (donde el
 * agua corrió y se llevó la capa). Esta malla NO cambia con el año: encima se
 * monta el "manto" vivo que la va tapando (ver `Ladera.jsx`).
 *
 * El mismo objeto de geometría lo comparten suelo y manto → se sube UNA vez.
 */
export function geomTerreno({ segs = 56 } = {}) {
  const ancho = LADERA.xMax - LADERA.xMin;
  const largo = LADERA.zMax - LADERA.zMin;
  const geo = new THREE.PlaneGeometry(ancho, largo, segs, Math.round(segs * (largo / ancho)));
  geo.rotateX(-Math.PI / 2);
  geo.translate((LADERA.xMin + LADERA.xMax) / 2, 0, (LADERA.zMin + LADERA.zMax) / 2);

  const pos = geo.attributes.position;
  const n = pos.count;
  const col = new Float32Array(n * 3);
  const r = rng(4141);
  const c = new THREE.Color();
  const ocre = new THREE.Color(PAL_SUC.sueloOcre);
  const ocre2 = new THREE.Color(PAL_SUC.sueloOcre2);
  const palido = new THREE.Color(PAL_SUC.sueloPalido);
  const cicatriz = new THREE.Color(PAL_SUC.sueloCicatriz);

  for (let i = 0; i < n; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, alturaLadera(x, z));

    // Manchas de suelo (ruido barato y determinista, no por frame).
    const mancha = Math.sin(x * 0.9 + z * 0.4) * 0.5 + Math.cos(z * 1.1 - x * 0.3) * 0.5;
    c.copy(mancha > 0.25 ? palido : mancha < -0.3 ? ocre2 : ocre);

    // Cicatrices: donde la ladera está más parada, el agua dejó el subsuelo al aire.
    const parado = Math.abs(Math.sin(x * 0.5 + z * 0.7));
    if (parado > 0.82 && !enCanal(x, 2.2)) c.lerp(cicatriz, (parado - 0.82) * 4);
    // El canal viene lavado hasta la piedra.
    if (enCanal(x, 1.8)) c.lerp(cicatriz, 0.35);

    c.multiplyScalar(0.93 + r() * 0.14);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  CÁRCAVA — la herida de la erosión                                          */
/* -------------------------------------------------------------------------- */

/*
 * La zanja que abre el agua cuando el suelo está desnudo: un piso oscuro y hundido
 * y dos LABIOS de tierra cruda que se desmoronan a los lados, con piedra suelta al
 * aire. Va tendida ladera abajo (el agua no dobla). Encoge hasta cerrarse cuando
 * las barreras frenan el agua y las raíces agarran: eso es la erosión frenándose.
 */
export function geomCarcava({ q = 1 } = {}, seed = 21) {
  const r = rng(seed);
  const partes = [];
  const L = 2.9; // largo, ladera abajo (+z)

  // Piso de la zanja: la franja oscura del fondo.
  const piso = new THREE.PlaneGeometry(0.62, L, 1, 3);
  piso.rotateX(-Math.PI / 2);
  poner(piso, [0, 0.04, 0]);
  partes.push(pintar(piso, PAL_SUC.carcavaPiso));

  // Labios: los bordes de tierra cruda, más altos y desmoronados.
  const porLado = Math.max(3, Math.round(5 * q));
  for (const lado of [-1, 1]) {
    for (let i = 0; i < porLado; i++) {
      const z = -L / 2 + (i + 0.5) * (L / porLado);
      const labio = new THREE.IcosahedronGeometry(0.26 + r() * 0.1, 0);
      poner(
        labio,
        [lado * (0.34 + r() * 0.06), 0.08 + r() * 0.05, z + (r() - 0.5) * 0.2],
        [r(), r(), r()],
        [0.8, 0.5, 1.5 + r() * 0.5], // aplastado y estirado ladera abajo
      );
      partes.push(pintar(labio, variar(PAL_SUC.carcavaLabio, r, 0.12)));
    }
  }

  // Piedra suelta que quedó al aire en el fondo (lo que no se llevó el agua).
  if (q > 0.5) {
    const nP = Math.max(2, Math.round(3 * q));
    for (let i = 0; i < nP; i++) {
      const piedra = new THREE.IcosahedronGeometry(0.07 + r() * 0.05, 0);
      poner(
        piedra,
        [(r() - 0.5) * 0.4, 0.05, -L / 2 + r() * L],
        [r(), r(), r()],
        [1, 0.6, 1],
      );
      partes.push(pintar(piedra, variar(PAL_SUC.carcavaPiedra, r, 0.1)));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  BARRERA VIVA — la mano del campesino                                       */
/* -------------------------------------------------------------------------- */

/*
 * El ÚNICO gesto humano de la escena, y el que arranca todo: una hilera sembrada
 * en CURVA DE NIVEL (atravesada a la pendiente) que le quita fuerza al agua. Un
 * trozo de hilera: macolla de pasto de corte, un par de matas y la estaca que la
 * sostiene. Se instancia en filas para leerse como el cordón que es.
 */
export function geomBarreraViva({ q = 1 } = {}, seed = 22) {
  const r = rng(seed);
  const partes = [];

  // Macolla: abanico de hojas de pasto de corte, abiertas a lado y lado.
  const nHojas = Math.max(7, Math.round(14 * q));
  for (let i = 0; i < nHojas; i++) {
    const t = (i / nHojas - 0.5) * 2; // -1..1 a lo largo de la hilera
    const largo = 0.5 + r() * 0.3;
    const hoja = new THREE.ConeGeometry(0.045, largo, 3, 1);
    apuntar(
      hoja,
      [t * 0.42, largo * 0.42, (r() - 0.5) * 0.12],
      [t * 0.55 + (r() - 0.5) * 0.2, 1, (r() - 0.5) * 0.5],
      [1, 1, 0.35],
    );
    partes.push(pintar(hoja, variar(r() > 0.5 ? PAL_SUC.barreraMacolla : PAL_SUC.barreraMacolla2, r, 0.12)));
  }

  // Un par de matas leñosas metidas en la hilera (la barrera se hace monte).
  const nMatas = Math.max(1, Math.round(2 * q));
  for (let i = 0; i < nMatas; i++) {
    const mata = new THREE.IcosahedronGeometry(0.19 + r() * 0.09, 0);
    poner(mata, [(r() - 0.5) * 0.7, 0.22 + r() * 0.1, (r() - 0.5) * 0.15], [r(), r(), r()], [1, 0.85, 1]);
    partes.push(pintar(mata, variar(PAL_SUC.barreraMata, r, 0.1)));
  }

  // La estaca: el palo que el campesino clavó. El detalle que dice "esto se sembró".
  const estaca = new THREE.CylinderGeometry(0.022, 0.028, 0.46, 4, 1);
  poner(estaca, [0.18, 0.23, 0.04], [0.06, 0, 0.09]);
  partes.push(pintar(estaca, PAL_SUC.barreraEstaca));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  RAÍCES — lo que agarra el suelo                                            */
/* -------------------------------------------------------------------------- */

/*
 * El abanico de raíces tendido SOBRE la tierra, agarrando. Crece justo donde
 * estaba la cárcava, mientras la cárcava encoge: las dos cosas a la vez cuentan
 * por qué se frenó la erosión, sin una sola palabra.
 */
export function geomRaices({ q = 1 } = {}, seed = 23) {
  const r = rng(seed);
  const partes = [];

  const nRaices = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nRaices; i++) {
    const ang = (i / nRaices) * Math.PI * 2 + r() * 0.4;
    const largo = 0.5 + r() * 0.55;
    const raiz = new THREE.ConeGeometry(0.045, largo, 3, 1);
    // Tendidas casi planas sobre el suelo (agarrando, no creciendo hacia arriba).
    apuntar(
      raiz,
      [Math.cos(ang) * largo * 0.42, 0.045, Math.sin(ang) * largo * 0.42],
      [Math.cos(ang), 0.12, Math.sin(ang)],
      [1, 1, 0.6],
    );
    partes.push(pintar(raiz, variar(PAL_SUC.raiz, r, 0.12)));

    // Raicilla secundaria: la que de verdad amarra.
    if (q > 0.5 && r() > 0.4) {
      const ang2 = ang + (r() - 0.5) * 1.1;
      const l2 = largo * 0.5;
      const fina = new THREE.ConeGeometry(0.02, l2, 3, 1);
      apuntar(
        fina,
        [Math.cos(ang) * largo * 0.7 + Math.cos(ang2) * l2 * 0.4, 0.04, Math.sin(ang) * largo * 0.7 + Math.sin(ang2) * l2 * 0.4],
        [Math.cos(ang2), 0.1, Math.sin(ang2)],
        [1, 1, 0.6],
      );
      partes.push(pintar(fina, variar(PAL_SUC.raizFina, r, 0.1)));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PASTO POBRE — lo que deja el potrero                                       */
/* -------------------------------------------------------------------------- */

/*
 * La macolla rala y amarillenta del potrero cansado: poca hoja, mucha punta seca,
 * y tierra que se le ve entre medio. No se muere de golpe: la TAPA el monte
 * (por eso encoge cuando entra la sombra).
 */
export function geomPastoPobre({ q = 1 } = {}, seed = 24) {
  const r = rng(seed);
  const partes = [];

  const nHojas = Math.max(4, Math.round(8 * q));
  for (let i = 0; i < nHojas; i++) {
    const ang = r() * Math.PI * 2;
    const largo = 0.22 + r() * 0.26;
    const hoja = new THREE.ConeGeometry(0.032, largo, 3, 1);
    const seca = r() > 0.62; // la punta quemada del sol
    apuntar(
      hoja,
      [Math.cos(ang) * 0.05, largo * 0.42, Math.sin(ang) * 0.05],
      [Math.cos(ang) * 0.5 + (r() - 0.5) * 0.3, 1, Math.sin(ang) * 0.5 + (r() - 0.5) * 0.3],
      [1, 1, 0.4],
    );
    partes.push(pintar(hoja, variar(seca ? PAL_SUC.pastoSeco : r() > 0.5 ? PAL_SUC.pastoPobre : PAL_SUC.pastoPobre2, r, 0.12)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  HELECHO — la pionera de la sombra                                          */
/* -------------------------------------------------------------------------- */

/*
 * Roseta de frondas arqueadas que salen de un punto, y —la firma— el BÁCULO: la
 * fronda nueva todavía enroscada. Entra apenas hay algo de sombra y se queda para
 * siempre en el sotobosque.
 */
export function geomHelecho({ q = 1 } = {}, seed = 25) {
  const r = rng(seed);
  const partes = [];

  const nFrondas = Math.max(4, Math.round(7 * q));
  for (let i = 0; i < nFrondas; i++) {
    const ang = (i / nFrondas) * Math.PI * 2 + r() * 0.5;
    const largo = 0.5 + r() * 0.3;
    // Dos tramos por fronda: el arqueo que hace al helecho un helecho.
    const base = new THREE.ConeGeometry(0.085, largo * 0.6, 3, 1);
    apuntar(
      base,
      [Math.cos(ang) * 0.1, largo * 0.28, Math.sin(ang) * 0.1],
      [Math.cos(ang) * 0.45, 1, Math.sin(ang) * 0.45],
      [1, 1, 0.22],
    );
    partes.push(pintar(base, variar(PAL_SUC.helechoFronda, r, 0.1)));

    const punta = new THREE.ConeGeometry(0.06, largo * 0.55, 3, 1);
    apuntar(
      punta,
      [Math.cos(ang) * (0.1 + largo * 0.45), largo * 0.56, Math.sin(ang) * (0.1 + largo * 0.45)],
      [Math.cos(ang) * 1.0, 0.35, Math.sin(ang) * 1.0], // ya cayendo: el arco
      [1, 1, 0.22],
    );
    partes.push(pintar(punta, variar(PAL_SUC.helechoFronda2, r, 0.1)));
  }

  // El báculo: fronda nueva enroscada, todavía sin abrir.
  const tallo = new THREE.CylinderGeometry(0.018, 0.024, 0.3, 4, 1);
  poner(tallo, [0.03, 0.15, 0.02], [0, 0, 0.1]);
  partes.push(pintar(tallo, PAL_SUC.helechoBaculo));
  const rulo = new THREE.TorusGeometry(0.05, 0.02, 4, 7, Math.PI * 1.5);
  poner(rulo, [0.05, 0.34, 0.02], [Math.PI / 2, 0.4, 0]);
  partes.push(pintar(rulo, PAL_SUC.helechoBaculo));

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  PLÁNTULA — la mata recién nacida                                           */
/* -------------------------------------------------------------------------- */

/*
 * Chiquita y honesta: tallito, dos cotiledones y un par de hojas nuevas. Es el
 * año 1 entero en un objeto de veinte centímetros. La misma malla sirve para la
 * cohorte del año 1 y para la que el bosque maduro siembra SOLO (año 20+): la
 * diferencia no está en la forma, está en el año en que nace.
 */
export function geomPlantula({ q = 1 } = {}, seed = 26) {
  const r = rng(seed);
  const partes = [];

  const tallo = new THREE.CylinderGeometry(0.012, 0.016, 0.18, 4, 1);
  poner(tallo, [0, 0.09, 0], [0, 0, (r() - 0.5) * 0.14]);
  partes.push(pintar(tallo, PAL_SUC.plantulaTallo));

  // Cotiledones: las dos primeras hojitas, opuestas.
  for (const lado of [-1, 1]) {
    const cot = new THREE.ConeGeometry(0.035, 0.075, 3, 1);
    apuntar(cot, [lado * 0.04, 0.1, 0], [lado * 0.9, 0.35, 0], [1, 1, 0.35]);
    partes.push(pintar(cot, PAL_SUC.plantulaCotiledon));
  }

  // Hojas nuevas arriba.
  const nHojas = Math.max(2, Math.round(3 * q));
  for (let i = 0; i < nHojas; i++) {
    const ang = (i / nHojas) * Math.PI * 2 + 0.7;
    const hoja = new THREE.ConeGeometry(0.045, 0.11, 3, 1);
    apuntar(
      hoja,
      [Math.cos(ang) * 0.035, 0.19 + r() * 0.03, Math.sin(ang) * 0.035],
      [Math.cos(ang) * 0.65, 0.9, Math.sin(ang) * 0.65],
      [1, 1, 0.32],
    );
    partes.push(pintar(hoja, variar(PAL_SUC.plantulaHoja, r, 0.1)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  HOJARASCA — la hoja caída que HACE el suelo                                */
/* -------------------------------------------------------------------------- */

/*
 * El parche de hoja caída: la manta oscura y, encima, hojas sueltas de distintos
 * colores tiradas de cualquier modo. Es el detalle que convierte "tierra" en
 * "suelo" — y el que dice que el bosque ya se alimenta a sí mismo.
 */
export function geomHojarasca({ q = 1 } = {}, seed = 27) {
  const r = rng(seed);
  const partes = [];

  // La manta: un disco bajo e irregular de mantillo.
  const manta = new THREE.CircleGeometry(0.55, 7);
  manta.rotateX(-Math.PI / 2);
  poner(manta, [0, 0.02, 0], [0, r() * Math.PI, 0], [1 + r() * 0.4, 1, 1 + r() * 0.4]);
  partes.push(pintar(manta, variar(PAL_SUC.hojarasca, r, 0.1)));

  // Hojas sueltas encima (tiradas, no acomodadas).
  const nHojas = Math.max(4, Math.round(9 * q));
  const tonos = [PAL_SUC.hojaCaida, PAL_SUC.hojaCaida2, PAL_SUC.hojaCaida3];
  for (let i = 0; i < nHojas; i++) {
    const ang = r() * Math.PI * 2;
    const rad = r() * 0.5;
    const hoja = new THREE.ConeGeometry(0.06, 0.16, 3, 1);
    // Tendidas planas: la hoja ya cayó.
    apuntar(
      hoja,
      [Math.cos(ang) * rad, 0.035 + r() * 0.02, Math.sin(ang) * rad],
      [Math.cos(r() * 6.28), 0.12, Math.sin(r() * 6.28)],
      [1, 1, 0.3],
    );
    partes.push(pintar(hoja, variar(tonos[i % 3], r, 0.12)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  EPÍFITA — solo cuando hay dosel                                            */
/* -------------------------------------------------------------------------- */

/*
 * Quiche (bromelia) con su cogollo rojo + barbas de viejo colgando. No se siembra
 * ni se cuida: LLEGA sola, y solo llega cuando hay sombra y humedad quieta. Es el
 * certificado de que el bosque ya es bosque.
 */
export function geomEpifita({ q = 1 } = {}, seed = 28) {
  const r = rng(seed);
  const partes = [];
  const GOLDEN = Math.PI * (3 - Math.sqrt(5));

  // Roseta del quiche: hojas duras en espiral, hacia arriba y afuera.
  const nHojas = Math.max(5, Math.round(9 * q));
  for (let i = 0; i < nHojas; i++) {
    const ang = i * GOLDEN;
    const tilt = 0.6 + (i / nHojas) * 0.6;
    const s = Math.sin(tilt);
    const hoja = new THREE.ConeGeometry(0.045, 0.34, 3, 1);
    apuntar(hoja, [0, 0, 0], [Math.cos(ang) * s, Math.cos(tilt), Math.sin(ang) * s], [1, 1, 0.4]);
    partes.push(pintar(hoja, variar(PAL_SUC.quicheHoja, r, 0.1)));
  }
  // El cogollo rojo del centro (la firma del quiche).
  const centro = new THREE.ConeGeometry(0.05, 0.14, 5, 1);
  poner(centro, [0, 0.09, 0]);
  partes.push(pintar(centro, PAL_SUC.quicheCentro));

  // Barbas de viejo: los mechones gris-verdes que cuelgan.
  if (q > 0.5) {
    const nBarbas = Math.max(2, Math.round(4 * q));
    for (let i = 0; i < nBarbas; i++) {
      const ang = r() * Math.PI * 2;
      const largo = 0.3 + r() * 0.4;
      const barba = new THREE.ConeGeometry(0.035, largo, 3, 1);
      apuntar(
        barba,
        [Math.cos(ang) * 0.16, -largo * 0.45, Math.sin(ang) * 0.16],
        [Math.cos(ang) * 0.12, -1, Math.sin(ang) * 0.12], // colgando
        [1, 1, 0.5],
      );
      partes.push(pintar(barba, variar(PAL_SUC.barbaVieja, r, 0.1)));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  QUEÑUA JOVEN (Polylepis) — la especie del guardián, de vuelta              */
/* -------------------------------------------------------------------------- */

/*
 * No es el Ent: es una queñua JOVEN, la que vuelve sola cuando la ladera ya
 * aguanta. Su forma real ya la delata: tronco grueso RETORCIDO (tramos que se
 * van tumbando a lado y lado), corteza rojiza en láminas de papel y copa de
 * hojita menuda verde-plateada. Que aparezca al final es el guiño: donde hay
 * queñua, hubo paciencia.
 */
export function geomQuenuaJoven({ q = 1 } = {}, seed = 29) {
  const r = rng(seed);
  const partes = [];

  // Tronco retorcido: tramos apilados que se van ladeando (nunca recto).
  const nTramos = Math.max(4, Math.round(6 * q));
  let x = 0;
  let z = 0;
  let y = 0;
  const hTramo = 1.5 / nTramos;
  for (let i = 0; i < nTramos; i++) {
    const incl = (r() - 0.5) * 0.5;
    const inclZ = (r() - 0.5) * 0.45;
    const rad = 0.15 - (i / nTramos) * 0.07;
    const tramo = new THREE.CylinderGeometry(rad * 0.85, rad, hTramo * 1.15, 6, 1);
    poner(tramo, [x, y + hTramo / 2, z], [inclZ, r(), incl]);
    partes.push(pintar(tramo, variar(i % 2 ? PAL_SUC.quenuaTronco : PAL_SUC.quenuaTronco2, r, 0.1)));
    x += Math.sin(incl) * hTramo;
    z += Math.sin(inclZ) * hTramo;
    y += hTramo;
  }

  // Ramas torcidas que abren la copa.
  const nRamas = Math.max(2, Math.round(4 * q));
  const puntas = [[x, y, z]];
  for (let i = 0; i < nRamas; i++) {
    const ang = (i / nRamas) * Math.PI * 2 + 0.5;
    const largo = 0.5 + r() * 0.35;
    const dir = [Math.cos(ang) * 0.75, 0.65, Math.sin(ang) * 0.75];
    const rama = new THREE.CylinderGeometry(0.035, 0.06, largo, 4, 1);
    apuntar(
      rama,
      [x + dir[0] * largo * 0.4, y - 0.25 + dir[1] * largo * 0.4, z + dir[2] * largo * 0.4],
      dir,
    );
    partes.push(pintar(rama, PAL_SUC.quenuaTronco));
    puntas.push([x + dir[0] * largo, y - 0.25 + dir[1] * largo, z + dir[2] * largo]);
  }

  // Copa: cojines de hojita menuda plateada (chatos, no bolas).
  const porPunta = Math.max(2, Math.round(4 * q));
  for (const p of puntas) {
    for (let i = 0; i < porPunta; i++) {
      const s = 0.22 + r() * 0.2;
      const blob = new THREE.IcosahedronGeometry(s, 0);
      poner(
        blob,
        [p[0] + (r() - 0.5) * 0.5, p[1] + r() * 0.3, p[2] + (r() - 0.5) * 0.5],
        [r(), r(), r()],
        [1.2, 0.7, 1.2],
      );
      partes.push(pintar(blob, variar(r() > 0.5 ? PAL_SUC.quenuaHoja : PAL_SUC.quenuaHoja2, r, 0.08)));
    }
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  QUEBRADA — el agua que vuelve                                              */
/* -------------------------------------------------------------------------- */

/*
 * La cinta de agua, cosida al terreno: cada vértice se para exactamente sobre
 * `alturaLadera`, así que el agua CORRE POR DONDE VA EL CANAL — no flota encima
 * de un plano inventado. Nace angosta en la cabecera y se va abriendo ladera
 * abajo, como debe ser. Las UV corren a lo largo → basta con desplazar la textura
 * para que el agua fluya (ver `AguaQueVuelve.jsx`).
 */
export function geomQuebrada({ z0 = NACIMIENTO_Z + 0.95, z1 = LADERA.zMax - 1, pasos = 40 } = {}) {
  const pos = [];
  const uv = [];
  const idx = [];

  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const z = z0 + (z1 - z0) * t;
    // Se abre ladera abajo (y serpentea un poquito: el agua nunca va derecha).
    const ancho = 0.16 + t * 0.5;
    const serpenteo = Math.sin(t * 5.5) * 0.22;
    const cx = CANAL_X + serpenteo;
    const y = alturaLadera(cx, z) + 0.07;
    pos.push(cx - ancho, y, z, cx + ancho, y, z);
    uv.push(0, t * 6, 1, t * 6); // la V se repite: da la sensación de correntía
    if (i < pasos) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  OJO DE AGUA — la lámina de la poza (sirve de agua Y de lodo seco)          */
/* -------------------------------------------------------------------------- */

/*
 * La lámina que llena el hueco del nacimiento, COSIDA al terreno igual que la
 * quebrada. Un nacimiento de páramo no es una piscina: es una lámina delgada que
 * se le pega al suelo y rezuma. Por eso no se hace con un disco plano (que en una
 * ladera inclinada asomaría por el lado de abajo), sino con un abanico donde cada
 * vértice se para sobre `alturaLadera`.
 *
 * La MISMA geometría sirve para las dos caras de la historia: con la textura de
 * agua es el ojo que revive, y con la de lodo rajado es el hoyo seco del año 0.
 * Es la misma tierra: cambia lo que tiene adentro.
 */
export function geomOjoAgua({ radio = 1.0, pasos = 18, anillos = 3, alto = 0.06 } = {}) {
  const pos = [];
  const uv = [];
  const idx = [];

  // Centro del abanico.
  pos.push(CANAL_X, alturaLadera(CANAL_X, NACIMIENTO_Z) + alto, NACIMIENTO_Z);
  uv.push(0.5, 0.5);

  for (let a = 1; a <= anillos; a++) {
    const rad = radio * (a / anillos);
    for (let i = 0; i < pasos; i++) {
      const ang = (i / pasos) * Math.PI * 2;
      const x = CANAL_X + Math.cos(ang) * rad;
      const z = NACIMIENTO_Z + Math.sin(ang) * rad;
      pos.push(x, alturaLadera(x, z) + alto, z);
      uv.push(0.5 + (Math.cos(ang) * (a / anillos)) / 2, 0.5 + (Math.sin(ang) * (a / anillos)) / 2);
    }
  }

  // Primer anillo: triángulos contra el centro.
  for (let i = 0; i < pasos; i++) {
    idx.push(0, 1 + i, 1 + ((i + 1) % pasos));
  }
  // Anillos siguientes: cinturones de cuadros.
  for (let a = 1; a < anillos; a++) {
    const base = 1 + (a - 1) * pasos;
    const sig = 1 + a * pasos;
    for (let i = 0; i < pasos; i++) {
      const j = (i + 1) % pasos;
      idx.push(base + i, sig + i, base + j, base + j, sig + i, sig + j);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/* -------------------------------------------------------------------------- */
/*  NACIMIENTO — la piedra donde brota (o brotaba) el agua                     */
/* -------------------------------------------------------------------------- */

/*
 * El corro de piedras de la cabecera. Está SIEMPRE ahí: en el año 0 rodeando un
 * hueco de lodo seco y rajado, y en el año 50 rodeando el ojo de agua otra vez.
 * La piedra no cambia — cambia lo que tiene adentro. Ese es el punto.
 *
 * Va en coordenadas de MUNDO (no en el origen): cada piedra se para sobre su
 * propia cota de `alturaLadera`, porque el borde de la poza está más alto que el
 * centro. Un corro puesto todo a la altura del centro quedaría medio enterrado.
 */
export function geomNacimiento({ q = 1 } = {}, seed = 30) {
  const r = rng(seed);
  const partes = [];

  const nPiedras = Math.max(5, Math.round(10 * q));
  for (let i = 0; i < nPiedras; i++) {
    const ang = (i / nPiedras) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const rad = 0.95 + r() * 0.35;
    const x = CANAL_X + Math.cos(ang) * rad;
    const z = NACIMIENTO_Z + Math.sin(ang) * rad;
    const piedra = new THREE.IcosahedronGeometry(0.2 + r() * 0.16, 0);
    poner(
      piedra,
      [x, alturaLadera(x, z) + 0.05 + r() * 0.05, z],
      [r(), r(), r()],
      [1 + r() * 0.4, 0.7 + r() * 0.3, 1 + r() * 0.4],
    );
    partes.push(pintar(piedra, variar(PAL_SUC.carcavaPiedra, r, 0.12)));
  }

  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  AVE — la fauna que regresa                                                 */
/* -------------------------------------------------------------------------- */

/*
 * Una silueta mínima: cuerpito y dos alas en V. No se necesita más — a la
 * distancia a la que vuela, un ave ES una V que se mueve. Aparece cuando el
 * bosque ya la puede sostener.
 */
export function geomAve(seed = 31) {
  const r = rng(seed);
  const partes = [];

  const cuerpo = new THREE.IcosahedronGeometry(0.07, 0);
  poner(cuerpo, [0, 0, 0], [0, 0, 0], [0.8, 0.7, 1.8]);
  partes.push(pintar(cuerpo, PAL_SUC.ave));

  for (const lado of [-1, 1]) {
    const ala = new THREE.ConeGeometry(0.06, 0.34, 3, 1);
    apuntar(ala, [lado * 0.16, 0.05, 0], [lado * 0.94, 0.32, -0.1], [1, 1, 0.25]);
    partes.push(pintar(ala, variar(PAL_SUC.ave, r, 0.08)));
  }
  const vientre = new THREE.IcosahedronGeometry(0.04, 0);
  poner(vientre, [0, -0.04, 0.02], [0, 0, 0], [0.8, 0.5, 1.5]);
  partes.push(pintar(vientre, PAL_SUC.aveVientre));

  return fusionar(partes);
}
