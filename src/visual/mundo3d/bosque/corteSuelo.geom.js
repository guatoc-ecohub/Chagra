/*
 * corteSuelo.geom — la VITRINA DE TIERRA que el Ent abre y enseña, en funciones
 * PURAS (three-core, corren headless: cero contexto GL, cero azar por frame).
 *
 * ── POR QUÉ EXISTE ESTE MÓDULO (la tercera pasada) ──────────────────────────
 *
 * La pasada 2 dejó escrito que "la banda de micorrizas se lee oscura y la red se
 * ve más como brillo que como red". Las dos frases describían el MISMO bug, y no
 * era de acabado: era aritmético.
 *
 *   · La cara del corte está en z = CARA = PROF_CUT/2 = 0.85.
 *   · La red se sembraba en z ∈ [0.05, 0.80] (nZ = CARA - 0.15).
 *   · El bloque de tierra era un box de profundidad PROF_CUT → OPACO hasta 0.85.
 *
 * → La red entera vivía DENTRO del ladrillo de tierra. Cero píxeles, sin un solo
 *   error. Es la misma familia del bug de la barba de la pasada 1 (el fuste se la
 *   tragaba): la geometría estaba bien y algo sólido se la comía.
 *
 * → Y el "brillo" que sí se veía era el pointLight turquesa de relleno pegando
 *   sobre la cara plana del barro. Literalmente "más brillo que red": lo único
 *   que había EN PANTALLA era un brillo.
 *
 * La cura no es iluminar la red. Es DESENTERRARLA:
 *
 *   1. HUECO — la tierra se retira por capa (una alcoba excavada). La franja de
 *      micorrizas es la más abierta porque es la estrella; las de arriba se
 *      escalonan hacia ella y la roca madre hace de repisa. La biología vive en
 *      la alcoba, DELANTE de la tierra, no dentro.
 *   2. RAÍCES VISIBLES que bajan de la zona de raíces y entran a la alcoba: sin
 *      raíces a la vista, unos filamentos flotando no son una red — son un
 *      adorno. La lección es "reparte entre plantas", y eso exige ver las puntas.
 *   3. JERARQUÍA (DR §"Ausencia de jerarquía de ramas"): rizomorfo troncal →
 *      secundaria → punta, con conicidad real (DR §"Conicidad real y nudos").
 *      El DR es taxativo: "más ramas" no arregla nada; la estructura sí.
 *   4. HUECOS (DR §"Importancia de los huecos"): el DR pide ver el cielo ENTRE
 *      las hojas. Acá es al revés y es lo mismo: hay que ver la tierra oscura
 *      ENTRE las hifas. El vacío es lo que define la red.
 *
 * ── EL CONFLICTO 1↔2, RESUELTO ──────────────────────────────────────────────
 * "Aclarar la banda" y "que la red resalte" tiran en direcciones opuestas: subir
 * el brillo del fondo lava el filamento. Por eso NO se sube un `lift` plano. Se
 * hornea luz DESDE LA RED sobre la tierra (`hornearTierra` recibe las muestras de
 * las hifas): la tierra se enciende CERCA de los filamentos y se queda oscura en
 * los huecos. La banda deja de leerse negra, la red gana contraste local, y de
 * paso el resplandor queda justificado — la red ilumina lo que la rodea.
 * Es la receta de translucidez/contraluz del DR, con la red de fuente.
 */
import * as THREE from 'three';
import {
  rng,
  ruidoFbm,
  pintarPorVertice,
  fusionarSeguro,
  tuboOrganico,
} from './sombreadoVegetal.js';
import { PALETA } from '../micorrizas/micorrizas.geom.js';

/* Geometría del bloque de suelo (la vitrina de tierra). */
export const ANCHO_CUT = 3.2;
export const PROF_CUT = 1.7;
export const CARA = PROF_CUT / 2; // el plano frontal expuesto del corte

/*
 * CUÁNTA TIERRA se retira por capa (la alcoba excavada). 0 = bloque macizo, la
 * cara queda en CARA. La franja de micorrizas es la más abierta: es la lección.
 * Las de encima se escalonan hacia ella para que la excavación se lea como un
 * scoop y no como un error de modelado, y la roca madre vuelve a salir haciendo
 * de repisa que enmarca la alcoba por abajo.
 */
export const HUECO = {
  hojarasca: 0,
  humus: 0.1,
  raices: 0.34,
  micorrizas: 0.62,
  roca: 0.28,
};

/** z de la cara frontal expuesta de una capa (ya descontada su alcoba). */
export const zFrenteDe = (id) => CARA - (HUECO[id] ?? 0);

/*
 * LAS CAPAS del suelo, de arriba abajo — la lección.
 *
 * OJO CON LOS COLORES: la primera versión pintaba el humus '#241611' y las
 * micorrizas '#140f0c' — casi negro puro, y la vitrina entera se leía como un
 * agujero. La pasada 2 los subió a tierra parda de verdad. Esta pasada NO los
 * vuelve a subir: la banda de micorrizas sigue siendo la más oscura A PROPÓSITO
 * (es el fondo contra el que resalta el bioluminiscente). Lo que cambia es que
 * ahora la tierra tiene INFORMACIÓN — grano, oclusión en las interfaces,
 * profundidad de alcoba y la luz que la red le echa encima. El DR lo dice
 * exacto: la oscuridad tiene que ser LOCAL (grietas/depresiones), nunca global.
 */
export const CAPAS = [
  { id: 'hojarasca', nombre: 'Hojarasca', alto: 0.42, color: '#8a6038', hint: 'Las hojas caídas que abrigan y alimentan el suelo.' },
  { id: 'humus', nombre: 'Humus', alto: 0.95, color: '#4a3325', hint: 'Tierra negra viva: lombrices y bacterias hacen el alimento.' },
  { id: 'raices', nombre: 'Zona de raíces', alto: 1.15, color: '#63492f', hint: 'Aquí las matas beben agua y minerales.' },
  { id: 'micorrizas', nombre: 'Red micorrízica', alto: 1.35, color: '#33261c', hint: 'El internet de hongos: reparte comida entre las plantas.' },
  // La roca iba en '#6d6b78': era LO MÁS CLARO del corte y le robaba el ojo a la
  // red, que es la lección. Sigue siendo gris de piedra y sigue sin caer a negro
  // (tiene su relleno frío), pero deja de competir.
  { id: 'roca', nombre: 'Roca madre', alto: 0.92, color: '#514f5a', hint: 'La piedra de donde, poco a poco, nace la tierra.' },
];

/** Alturas acumuladas: y del centro de cada capa (la cima del corte en y=0). */
export function centrosCapas() {
  let top = 0;
  return CAPAS.map((c) => {
    const cy = top - c.alto / 2;
    top -= c.alto;
    return { ...c, cy, top: top + c.alto, bottom: top };
  });
}

/** Alto total del corte (para encuadrar la cámara sobre la unidad pedagógica). */
export const ALTO_CORTE = CAPAS.reduce((s, c) => s + c.alto, 0);

/* Los horizontes precalculados como THREE.Color (parsear '#hex' por vértice
   sería tirar el tiempo: son decenas de miles de vértices). */
const HORIZONTES = (() => {
  let top = 0;
  return CAPAS.map((c) => {
    const bottom = top - c.alto;
    const h = { top, bottom, color: new THREE.Color(c.color) };
    top = bottom;
    return h;
  });
})();

/**
 * El color del horizonte de suelo a una profundidad `y`. Por debajo del corte
 * sigue la roca madre: la tierra no se acaba donde acaba la vitrina.
 * @param {number} y  profundidad de mundo (0 = superficie, negativo = abajo).
 */
export function colorHorizonte(y) {
  for (let i = 0; i < HORIZONTES.length; i++) {
    const h = HORIZONTES[i];
    if (y <= h.top && y > h.bottom) return h.color;
  }
  return HORIZONTES[HORIZONTES.length - 1].color;
}

/* -------------------------------------------------------------------------- */
/*  Las RAÍCES que la red conecta — las ANCLAS de la lección                   */
/* -------------------------------------------------------------------------- */

/*
 * Las cuatro raíces que bajan a la banda. NO son decorado: son lo que la red
 * conecta, y sin ellas unos filamentos sueltos no enseñan nada.
 *
 * La primera es la RAÍZ DEL ENT (la queñua madre): gruesa, entra por la
 * izquierda —el lado donde el guardián está parado— y baja más hondo que
 * ninguna. Las otras tres son maticas. Esa asimetría ES la lección del árbol
 * madre que alimenta a las chiquitas por debajo: se lee en el grosor, sin texto.
 *
 * `z` las pone DELANTE de la cara de las dos capas que atraviesan (raíces 0.51 y
 * micorrizas 0.23), que es exactamente lo que la versión anterior no hacía.
 */
export const ANCLAS = [
  { id: 'ent', x: -1.16, z: 0.64, r0: 0.055, drift: -0.1, hondo: 0.78, madre: true },
  { id: 'mata1', x: -0.28, z: 0.7, r0: 0.026, drift: 0.12, hondo: 0.34 },
  { id: 'mata2', x: 0.64, z: 0.6, r0: 0.024, drift: -0.08, hondo: 0.52 },
  { id: 'mata3', x: 1.34, z: 0.68, r0: 0.021, drift: 0.1, hondo: 0.26 },
];

/** La punta (nodo de intercambio) de un ancla dentro de la banda de micorrizas. */
export function puntaDeAncla(ancla, alto) {
  const media = alto / 2;
  return new THREE.Vector3(
    ancla.x + ancla.drift,
    media - ancla.hondo * alto,
    ancla.z - 0.06,
  );
}

/** La curva de una raíz: entra por arriba de la banda y baja hasta su punta. */
function curvaDeAncla(ancla, alto, desdeArriba = 0.08) {
  const media = alto / 2;
  const p0 = new THREE.Vector3(ancla.x, media + desdeArriba, ancla.z);
  const fin = puntaDeAncla(ancla, alto);
  const p1 = new THREE.Vector3(
    ancla.x + ancla.drift * 0.25,
    media - ancla.hondo * alto * 0.45,
    ancla.z + 0.03,
  );
  return new THREE.CatmullRomCurve3([p0, p1, fin], false, 'catmullrom', 0.5);
}

/*
 * GEOMETRÍA de las raíces de la banda: tubos con conicidad real (gruesa arriba,
 * puntita que busca abajo) y color de raíz viva → punta clara. Van con material
 * LAMBERT (no aditivo): la raíz es MATERIA y tiene que recibir la luz de la
 * vitrina. Ese contraste contra el micelio autoiluminado es el que hace legible
 * la lección: la raíz es cosa, la red es luz.
 */
export function construirRaicesBanda(alto, tier = 'alto') {
  const radial = tier === 'alto' ? 7 : 5;
  const tubular = tier === 'alto' ? 14 : 8;
  const partes = ANCLAS.map((a) => {
    const geo = tuboOrganico(curvaDeAncla(a, alto), {
      tubular,
      radial,
      taper: (t) => a.r0 * (1 - 0.72 * t),
      arruga: 0.16,
      semilla: a.x * 7,
      minRadio: 0.006,
    });
    const media = alto / 2;
    return pintarPorVertice(geo, (x, y, z, i, c) => {
      const t = Math.min(1, Math.max(0, (media + 0.08 - y) / (alto * a.hondo + 0.08)));
      c.copy(PALETA.raiz).lerp(PALETA.raizPunta, t);
      // grano de raíz + oclusión: la cara que mira a la tierra queda en penumbra
      const n = ruidoFbm(x * 9 + 3, y * 9, z * 9);
      c.multiplyScalar(0.78 + n * 0.3);
      return c;
    });
  });
  return fusionarSeguro(partes, 'raices-banda-micorrizas');
}

/*
 * Las raíces vistas en la CAPA DE ARRIBA ("zona de raíces"), nacidas de las
 * MISMAS anclas: así una raíz baja, cruza la frontera entre capas y entra a la
 * alcoba donde el micelio la agarra. Antes cada capa sorteaba sus raíces por su
 * cuenta y no empataban — la lección se cortaba justo en la juntura.
 */
export function construirRaicesZona(altoZona, altoBanda, tier = 'alto') {
  const radial = tier === 'alto' ? 7 : 5;
  const media = altoZona / 2;
  const partes = ANCLAS.map((a) => {
    // baja desde lo alto de la capa hasta cruzar por completo su piso
    const p0 = new THREE.Vector3(a.x - a.drift * 0.4, media * 0.92, a.z + 0.02);
    const p1 = new THREE.Vector3(a.x - a.drift * 0.1, 0, a.z);
    const p2 = new THREE.Vector3(a.x, -media - 0.02, a.z);
    const curva = new THREE.CatmullRomCurve3([p0, p1, p2], false, 'catmullrom', 0.5);
    const geo = tuboOrganico(curva, {
      tubular: tier === 'alto' ? 12 : 7,
      radial,
      // llega al piso con el mismo grosor con el que arranca abajo → sin escalón
      taper: (t) => a.r0 * (1.35 - 0.35 * t),
      arruga: 0.18,
      semilla: a.x * 11,
      minRadio: 0.006,
    });
    return pintarPorVertice(geo, (x, y, z, i, c) => {
      const t = Math.min(1, Math.max(0, (media - y) / altoZona));
      c.copy(PALETA.raiz).lerp(PALETA.raizPunta, t * 0.45);
      const n = ruidoFbm(x * 9 + 17, y * 9, z * 9);
      c.multiplyScalar(0.74 + n * 0.32);
      return c;
    });
  });
  void altoBanda;
  return fusionarSeguro(partes, 'raices-zona');
}

/* -------------------------------------------------------------------------- */
/*  LA RED: rizomorfo → secundaria → punta (jerarquía, no maraña)              */
/* -------------------------------------------------------------------------- */

/*
 * Los HUBS del micelio: las uniones donde el rizomorfo se reparte.
 *
 * Van a ALTURAS MUY DISTINTAS a propósito. Con los tres a la misma hondura el
 * espinazo salía horizontal y la red entera se leía como un COLLAR colgado en el
 * tercio bajo de la banda: se veían las conexiones, sí, pero no OCUPABA el suelo.
 * Escalonados, el rizomorfo zigzaguea y la red llena la franja.
 */
function hubsDeBanda(alto) {
  const media = alto / 2;
  return [
    new THREE.Vector3(-0.72, media - alto * 0.58, 0.48),
    new THREE.Vector3(0.2, media - alto * 0.86, 0.62),
    new THREE.Vector3(1.05, media - alto * 0.5, 0.42),
  ];
}

/** Curva de una hifa: cuelga un poco (sag) y serpentea. Nunca un palo recto. */
function curvaHifa(a, b, r, sag = 0.1) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const largo = a.distanceTo(b);
  mid.y -= largo * sag;
  mid.x += (r() - 0.5) * largo * 0.2;
  mid.z += (r() - 0.5) * largo * 0.24;
  return new THREE.QuadraticBezierCurve3(a.clone(), mid, b.clone());
}

/*
 * EL ESQUELETO de la red. Devuelve los hilos con su NIVEL, que es lo que la hace
 * legible como grafo y no como niebla:
 *
 *   nivel 0 — RIZOMORFO: el cordón troncal. Va de punta de raíz a punta de raíz
 *             pasando por hubs. ES la lección (el reparto), y por eso es el más
 *             grueso y el más claro, y es el único que lleva pulsos de nutriente.
 *   nivel 1 — SECUNDARIA: se desprende del rizomorfo a explorar la tierra.
 *   nivel 2 — PUNTA: la hifa fina que busca. Casi no se ve, y por eso da escala.
 *
 * La cadena de rizomorfos se arma A MANO, no por k-vecinos. El grafo k-vecinos
 * de la versión anterior unía cada nodo con su más cercano: eso da una malla
 * pareja sin dirección, que es precisamente lo que se lee como resplandor. Una
 * cadena explícita raíz→hub→raíz se lee como CAMINO, y un camino sí cuenta algo.
 */
export function esqueletoRed(alto, tier = 'alto') {
  const r = rng(41);
  const puntas = ANCLAS.map((a) => puntaDeAncla(a, alto));
  const hubs = hubsDeBanda(alto);
  const hilos = [];

  /* nivel 0 — la columna vertebral: raíz → hub → raíz, de punta a punta */
  const cadena = [
    [puntas[0], hubs[0]],
    [hubs[0], puntas[1]],
    [hubs[0], hubs[1]],
    [hubs[1], puntas[2]],
    [hubs[1], hubs[2]],
    [hubs[2], puntas[3]],
    // la queñua madre alcanza lejos: su raíz llega hasta el hub del centro
    [puntas[0], hubs[1]],
  ];
  for (const [a, b] of cadena) {
    // sag corto: el rizomorfo es un cordón TENSO entre dos raíces, no una guirnalda
    hilos.push({ nivel: 0, curva: curvaHifa(a, b, r, 0.05), r0: 0.026, r1: 0.019 });
  }

  if (tier === 'bajo') return { hilos, puntas, hubs };

  /* nivel 1 — secundarias: nacen del rizomorfo y salen a explorar */
  const nSec = tier === 'alto' ? 3 : 2;
  const troncales = hilos.slice();
  for (const h of troncales) {
    for (let k = 0; k < nSec; k++) {
      const t = 0.24 + r() * 0.54;
      const a = h.curva.getPoint(t);
      // en los DOS sentidos: antes toda secundaria salía hacia abajo
      // (-0.1 - r()*0.34) y el micelio se apelotonaba contra el piso de la banda
      // dejando muerta la mitad de arriba. El hongo explora en todas direcciones.
      const b = a.clone().add(new THREE.Vector3(
        (r() - 0.5) * 0.78,
        (r() - 0.5) * 0.62,
        (r() - 0.5) * 0.4,
      ));
      // que no se salga de la alcoba ni del bloque
      b.z = Math.min(0.77, Math.max(0.31, b.z));
      b.x = Math.min(ANCHO_CUT / 2 - 0.14, Math.max(-ANCHO_CUT / 2 + 0.14, b.x));
      b.y = Math.min(alto / 2 - 0.06, Math.max(-alto / 2 + 0.06, b.y));
      hilos.push({ nivel: 1, curva: curvaHifa(a, b, r, 0.14), r0: 0.013, r1: 0.006 });
    }
  }

  if (tier !== 'alto') return { hilos, puntas, hubs };

  /* nivel 2 — puntas: la hifa fina que busca. Dan escala y textura de red. */
  const secundarias = hilos.filter((h) => h.nivel === 1);
  for (const h of secundarias) {
    if (r() > 0.62) continue;
    const a = h.curva.getPoint(0.62 + r() * 0.3);
    const b = a.clone().add(new THREE.Vector3(
      (r() - 0.5) * 0.34,
      (r() - 0.5) * 0.3,
      (r() - 0.5) * 0.22,
    ));
    b.z = Math.min(0.77, Math.max(0.31, b.z));
    b.y = Math.min(alto / 2 - 0.04, Math.max(-alto / 2 + 0.04, b.y));
    hilos.push({ nivel: 2, curva: curvaHifa(a, b, r, 0.2), r0: 0.006, r1: 0.002 });
  }

  return { hilos, puntas, hubs };
}

/* Brillo por nivel: el rizomorfo manda, la punta se apaga. */
const COLOR_NIVEL = [PALETA.puente, PALETA.micelio, PALETA.micelioTenue];

/*
 * GEOMETRÍA de la red, en UNA malla (un draw-call).
 *
 * El horneado hace tres cosas que convierten resplandor en RED:
 *   · CORDÓN: el vértice que mira a la cámara brilla y el del canto se apaga →
 *     el tubo se lee como filamento redondo y no como cinta plana.
 *   · PROFUNDIDAD (depth cueing): la hifa del fondo de la alcoba se apaga. Antes
 *     TODAS brillaban igual sin importar la hondura, y una maraña de líneas con
 *     brillo uniforme es, literalmente, una nube. Esto la separa en planos.
 *   · NIVEL: rizomorfo claro → punta tenue. La jerarquía se ve.
 */
export function geometriaRedBanda(hilos, tier = 'alto') {
  const radial = tier === 'alto' ? 6 : 4;
  const zFondo = zFrenteDe('micorrizas');
  const rango = Math.max(0.001, CARA - zFondo);
  const partes = hilos.map((h) => {
    const tub = h.nivel === 0 ? (tier === 'alto' ? 20 : 12) : tier === 'alto' ? 10 : 6;
    const geo = tuboOrganico(h.curva, {
      tubular: tub,
      radial,
      taper: (t) => h.r0 * (1 - t) + h.r1 * t,
      // arruga 0: a 1-3 px de ancho no se ve, y con radial=4..6 las frecuencias
      // del surco caerían por debajo de Nyquist y aliasarían (la misma trampa
      // que convertía la corteza del Ent en "chocolate de plástico").
      arruga: 0,
      minRadio: 0.0015,
    });
    const base = COLOR_NIVEL[h.nivel] ?? PALETA.micelio;
    const nrm = geo.attributes.normal;
    return pintarPorVertice(geo, (x, y, z, i, c) => {
      c.copy(base);
      // cordón: la normal que mira a la cámara (+z) es la que brilla
      const nz = nrm.getZ(i);
      c.multiplyScalar(0.5 + 0.5 * Math.max(0, nz));
      // depth cueing dentro de la alcoba
      const prof = Math.min(1, Math.max(0, (z - zFondo) / rango));
      c.multiplyScalar(0.42 + 0.58 * prof);
      return c;
    });
  });
  return fusionarSeguro(partes, 'red-micorrizas');
}

/*
 * MUESTRAS de la red para hornearle luz a la tierra: puntos a lo largo de los
 * rizomorfos y secundarias, con la fuerza con que iluminan. Es lo que resuelve el
 * conflicto "banda oscura" ↔ "red que resalta" sin subir un lift plano.
 */
export function muestrasDeLuz(hilos) {
  const out = [];
  for (const h of hilos) {
    if (h.nivel > 1) continue; // las puntas no alumbran
    const n = h.nivel === 0 ? 9 : 4;
    const fuerza = h.nivel === 0 ? 1 : 0.45;
    for (let i = 0; i <= n; i++) {
      const p = h.curva.getPoint(i / n);
      out.push({ x: p.x, y: p.y, z: p.z, fuerza });
    }
  }
  return out;
}

/*
 * NODOS del micelio: los puntos donde el rizomorfo se une a una raíz o a otro
 * rizomorfo. El DR hornea oclusión en las uniones de rama (se OSCURECEN); acá el
 * signo se invierte: en una red viva la unión es el sitio de intercambio y tiene
 * que ser lo más brillante. Son los nodos los que hacen que una maraña se lea
 * como GRAFO — sin ellos hay líneas, pero no hay red.
 */
export function nodosDeRed(alto) {
  const puntas = ANCLAS.map((a) => puntaDeAncla(a, alto));
  const hubs = hubsDeBanda(alto);
  return [
    ...puntas.map((pos, i) => ({
      pos,
      tipo: 'arbusculo',
      esc: ANCLAS[i].madre ? 1.9 : 1.35,
      color: PALETA.arbusculo,
    })),
    ...hubs.map((pos) => ({ pos, tipo: 'nodo', esc: 1.1, color: PALETA.nodo })),
  ];
}

/*
 * PULSOS de nutrientes, SOLO por los rizomorfos. En la versión anterior los
 * pulsos se repartían por hilos al azar de una malla k-vecinos: puntos de luz
 * yendo a cualquier lado = ruido, y el ruido de luz sobre fondo oscuro es
 * exactamente lo que se lee como "brillo". Corriendo por la columna vertebral,
 * de raíz a raíz, el pulso hace visible la DIRECCIÓN del reparto — que es la
 * frase entera del wood-wide web en una animación barata.
 */
export function pulsosDeBanda(hilos, total, seed = 53) {
  if (!total) return [];
  const r = rng(seed);
  const troncales = [];
  hilos.forEach((h, i) => { if (h.nivel === 0) troncales.push(i); });
  if (!troncales.length) return [];
  const out = [];
  let k = 0;
  while (out.length < total) {
    const i = troncales[k % troncales.length];
    k++;
    const moneda = r();
    // el mineral sube a la mata; el azúcar baja al hongo. Los dos sentidos.
    const sube = moneda > 0.5;
    out.push({
      hilo: i,
      t0: r(),
      vel: 0.1 + r() * 0.06,
      dir: sube ? -1 : 1,
      color: sube ? (r() > 0.5 ? PALETA.fosforo : PALETA.agua) : PALETA.carbono,
      tam: 0.9 + r() * 0.5,
    });
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  LA TIERRA — con información, no un color plano                             */
/* -------------------------------------------------------------------------- */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/*
 * El BLOQUE de tierra de una capa, con su alcoba ya descontada y el sombreado
 * horneado por vértice (DR: "AO por vértice horneado ... añade profundidad sin
 * costo de rendimiento en tiempo real").
 *
 * Va segmentado a propósito: un box de 24 vértices no puede llevar un gradiente
 * ni una oclusión: el horneado no tendría dónde ocurrir y la tierra volvería a
 * ser un color plano.
 */
export function construirTierra(capa, { luces = [], tier = 'alto' } = {}) {
  const hueco = HUECO[capa.id] ?? 0;
  const prof = PROF_CUT - hueco;
  const segX = tier === 'alto' ? 20 : 10;
  const segY = Math.max(3, Math.round(capa.alto * (tier === 'alto' ? 9 : 5)));
  const segZ = tier === 'alto' ? 4 : 2;
  const geo = new THREE.BoxGeometry(ANCHO_CUT, capa.alto, prof, segX, segY, segZ);
  // la alcoba se abre por delante: el fondo del bloque no se mueve
  geo.translate(0, 0, -hueco / 2);
  return hornearTierra(geo, capa, { luces });
}

/**
 * Hornea la tierra de una capa: grano, oclusión en las interfaces, caída hacia
 * el fondo de la alcoba y —la clave— la LUZ QUE LA RED le echa encima.
 *
 * @param {THREE.BufferGeometry} geo
 * @param {{id:string, alto:number, color:string}} capa
 * @param {{luces?: Array<{x:number,y:number,z:number,fuerza:number}>}} o
 */
export function hornearTierra(geo, capa, { luces = [] } = {}) {
  const base = new THREE.Color(capa.color);
  const grieta = base.clone().multiplyScalar(0.42);
  const cresta = base.clone().lerp(new THREE.Color('#c9ac82'), 0.22);
  const brillo = new THREE.Color(PALETA.micelio);
  const media = capa.alto / 2;
  const zFrente = zFrenteDe(capa.id);
  const RADIO_LUZ = 0.62;
  const tmp = new THREE.Color();

  return pintarPorVertice(geo, (x, y, z) => {
    /* grano de tierra: la oscuridad es LOCAL (grieta) y no global */
    const n = ruidoFbm(x * 3.1 + 13, y * 3.1, z * 3.1);
    tmp.copy(grieta).lerp(base, clamp01(n * 1.45));
    if (n > 0.66) tmp.lerp(cresta, clamp01((n - 0.66) / 0.34) * 0.7);

    /* oclusión en las interfaces entre capas: la tierra se comprime arriba y
       abajo. Es donde el ojo lee "profundidad de suelo". Nunca a 0. */
    const juntura = 1 - clamp01((media - Math.abs(y)) / 0.16);
    tmp.multiplyScalar(1 - 0.3 * juntura);

    /* profundidad de alcoba: la luz de vitrina no llega al fondo del hueco */
    const prof = clamp01((z + CARA) / PROF_CUT);
    tmp.multiplyScalar(0.46 + 0.54 * prof);

    /* la RED alumbra la tierra que la rodea. Cerca del filamento la tierra se
       enciende; en los huecos se queda oscura → la banda se ve Y la red resalta.
       Solo sobre la cara expuesta: dentro del bloque no hay nada que alumbrar. */
    if (luces.length && z > zFrente - 0.12) {
      let maxCae = 0;
      for (let i = 0; i < luces.length; i++) {
        const l = luces[i];
        const dx = x - l.x;
        const dy = y - l.y;
        const dz = z - l.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const cae = (1 - clamp01(d / RADIO_LUZ)) * l.fuerza;
        if (cae > maxCae) maxCae = cae;
      }
      if (maxCae > 0) tmp.lerp(brillo, maxCae * maxCae * 0.5);
    }
    return tmp;
  });
}

/* -------------------------------------------------------------------------- */
/*  EL TERRENO — matar el aire muerto                                          */
/* -------------------------------------------------------------------------- */

/*
 * EL AIRE MUERTO, y por qué no se arregla solo moviendo la cámara.
 *
 * En la captura de la pasada 2 el corte FLOTA en cielo gris: un bloque de tierra
 * colgado en el aire con vacío por los cuatro costados. No es que "sobre encuadre"
 * — es que bajo la línea del pasto NO HAY MUNDO. El suelo era un disco de musgo
 * de radio 4.2 visto casi de canto (la cámara está a y=0.2), o sea una rayita
 * verde, y de ahí para abajo, nada.
 *
 * Acercar la cámara sin más solo agranda el bloque flotando. Lo que mata el aire
 * muerto es POBLAR: un macizo de tierra que rodea la vitrina y explica de dónde
 * se sacó el bloque. Con eso, bajo el horizonte todo es tierra y el corte pasa a
 * ser lo que siempre debió ser: una VENTANA a la tierra, no un ladrillo en el
 * cielo. Es la receta del DR de sotobosque/borde y de "claros" — el vacío tiene
 * que ser compuesto, nunca residual.
 *
 * Se arma con CUATRO cajas alrededor de la huella del corte y nunca ENCIMA:
 * coplanares pero sin solaparse, así que no hay z-fighting con la cara del corte.
 *
 *   izquierda · derecha · debajo · DETRÁS
 *
 * La de DETRÁS no es un detalle. El corte solo ocupa z ∈ [1.05, 2.75]; sin ella,
 * la región x∈[0.9,4.1] · y∈[0,-4.79] · z<1.05 queda hueca y la cámara ve el
 * CIELO por encima del bloque, justo detrás del pasto. Se veía en la primera
 * captura de esta pasada: un boquete azul en plena tierra.
 *
 * El viñeteo se apaga al alejarse del corte → la vitrina queda iluminada y el
 * entorno cae en penumbra, que es lo que lleva el ojo a la lección. Va SUAVE
 * (0.3): a 0.55 el macizo se volvía un campo negro y el aire muerto gris
 * simplemente pasaba a ser aire muerto negro.
 *
 * @param {{x:number, z:number}} corte  dónde está plantada la vitrina (mundo).
 */
export function construirTerreno(corte, { tier = 'alto' } = {}) {
  const x0 = corte.x - ANCHO_CUT / 2;
  const x1 = corte.x + ANCHO_CUT / 2;
  const zF = corte.z + CARA; // la cara del corte: el terreno llega hasta acá
  const zAtrasCorte = corte.z - CARA; // el fondo del bloque de la vitrina
  const ATRAS = 15;
  const HONDO = 9.5;
  const LADO = 15;
  const alto = tier === 'alto';

  /*
   * RESOLUCIÓN VERTICAL. La franja de arriba (la que enseña los horizontes) va
   * densa: los horizontes se pintan POR VÉRTICE, así que un horizonte más
   * delgado que el segmento sencillamente no existe. La hojarasca mide 0.42 →
   * con 32 segmentos sobre 4.79 el paso es 0.15 y se resuelve. La franja de
   * abajo es roca madre pareja: no necesita resolución y no la gasta.
   */
  const SEG_SUP = alto ? 32 : 14;
  const SEG_INF = alto ? 8 : 3;
  const PASO_Z = alto ? 1.5 : 4;

  const piel = new THREE.Color('#5c6844'); // musgo del páramo
  const pielSol = new THREE.Color('#7d9153');
  const tmp = new THREE.Color();

  /** Una caja del macizo, ya horneada. Coords de MUNDO. `segY` explícito. */
  const caja = (bx0, bx1, by0, by1, bz0, bz1, segY) => {
    const w = bx1 - bx0;
    const h = by1 - by0;
    const d = bz1 - bz0;
    const geo = new THREE.BoxGeometry(
      w, h, d,
      Math.max(2, Math.min(16, Math.round(w * 0.8))),
      segY,
      Math.max(2, Math.round(d / PASO_Z)),
    );
    geo.translate((bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2);
    return pintarPorVertice(geo, (x, y, z) => {
      /*
       * RUIDO DE BAJA FRECUENCIA — no es gusto, es una COSTURA.
       *
       * Las cajas del macizo se hornean por vértice, y una función que salta
       * (los horizontes) interpolada sobre rejillas distintas delata la arista
       * que comparten: sale una línea vertical en plena tierra. Por eso las
       * cajas que comparten arista llevan el MISMO `segY` (se parten todas en
       * y=-ALTO_CORTE) y el ruido va a escala 0.16, lento frente al segmento.
       */
      const n = ruidoFbm(x * 0.16 + 5, y * 0.16, z * 0.16);
      if (y > -0.06) {
        // la piel del páramo: musgo, no tierra
        tmp.copy(piel).lerp(pielSol, n);
      } else {
        /*
         * LOS MISMOS HORIZONTES DEL CORTE, ondulados y en penumbra.
         *
         * Antes esto era un marrón liso, y un marrón liso gigante es aire muerto
         * igual que el gris: solo cambia de color. Con los horizontes, el macizo
         * deja de ser relleno y pasa a ser la lección: el suelo entero está en
         * capas y el bloque es apenas la VENTANA por donde se ven. La onda evita
         * que los horizontes salgan a nivel de albañil.
         */
        const onda = (ruidoFbm(x * 0.42 + 21, 0, z * 0.42) - 0.5) * 0.55;
        tmp.copy(colorHorizonte(y + onda));
        // penumbra: lo iluminado es la vitrina. Acá afuera la luz no entra.
        tmp.multiplyScalar(0.5 + n * 0.26);
      }
      /* VIÑETEO suave: lejos del corte, penumbra. El ojo va a la vitrina. */
      const d2 = Math.sqrt((x - corte.x) ** 2 + (z - corte.z) ** 2);
      tmp.multiplyScalar(1 - 0.3 * clamp01((d2 - 2.6) / 10));
      return tmp;
    });
  };

  const yc = -ALTO_CORTE;
  return fusionarSeguro(
    [
      // franja de los horizontes (la que se ve): todas parten en y=-ALTO_CORTE
      caja(corte.x - LADO, x0, yc, 0, -ATRAS, zF, SEG_SUP), // izquierda (bajo el Ent)
      caja(x1, corte.x + LADO, yc, 0, -ATRAS, zF, SEG_SUP), // derecha
      caja(x0, x1, yc, 0, -ATRAS, zAtrasCorte, SEG_SUP), // DETRÁS (tapa el boquete)
      // franja de roca madre, pareja: comparten segY → aristas casadas
      caja(corte.x - LADO, x0, -HONDO, yc, -ATRAS, zF, SEG_INF),
      caja(x1, corte.x + LADO, -HONDO, yc, -ATRAS, zF, SEG_INF),
      caja(x0, x1, -HONDO, yc, -ATRAS, zF, SEG_INF), // debajo del corte
    ],
    'terreno-microsuelo',
  );
}
