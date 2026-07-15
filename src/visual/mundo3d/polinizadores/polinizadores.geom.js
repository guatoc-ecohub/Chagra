/*
 * polinizadores.geom — LOS CUERPOS DE QUIENES HACEN EL TRABAJO.
 *
 * Ocho bichos, y cada uno tiene que reconocerse DE UN VISTAZO, sin etiqueta:
 *
 *   angelita   → diminuta y ámbar. Al lado de las demás se ve lo chiquita que
 *                es: por eso no puede con la flor del maracuyá. (Sin aguijón.)
 *   apis       → más grande y bandeada fuerte. La de miel, la que sí pica.
 *   abejorro   → GORDO, REDONDO y PELUDO, negro con franjas amarillas gruesas.
 *                Su silueta redonda es la firma. Es el que vibra la flor.
 *   colibri    → un AVE: pico recto y largo, dorso turquesa y GORGUERA violeta
 *                (Colibri coruscans — el mismo de `Colibri.jsx`).
 *   sirfido    → se disfraza de abeja (rayas amarillas y negras) pero lo delatan
 *                DOS cosas de mosca: los ojazos rojizos que le comen la cara y
 *                un solo par de alas, abiertas en T. Buscarle el ojo es el juego.
 *   mariposa   → alas grandes que baten de verdad, antenas con garrote, trompa.
 *   escarabajo → coraza dura partida al medio (élitros), lustrosa y torpe.
 *   murcielago → peludo, orejón, con HOJA NASAL (es filostómido) y membranas
 *                grandes que baten despacio. Solo sale de noche.
 *
 * ── DECISIONES TIER-SAFE (gama baja manda) ──────────────────────────────────
 * · CERO TRANSPARENCIA en la fauna: las alas de los insectos van en BORRÓN
 *   opaco pálido — el mismo idioma del dibujo 2D aprobado (`Colibri.jsx`: "alas
 *   en borrón"), y además es lo honesto: a la velocidad a la que bate una abeja,
 *   el ala ES un borrón. Se ahorra todo el fill-rate del alpha.
 * · Cada especie = UNA geometría fusionada → UN InstancedMesh → UNA draw-call
 *   por especie, así vuelen cien. El enjambre entero cuesta lo que cuesta el
 *   catálogo, no lo que cuesta la multitud.
 * · Solo mariposa y murciélago llevan alas APARTE: son los únicos cuyo aleteo se
 *   ve de verdad (los demás baten más rápido de lo que el ojo resuelve).
 *
 * Los cuerpos se dibujan MIRANDO A +X, de largo ~1 en unidades locales; la
 * escala real la pone la matriz de instancia (BICHO_BASE × escala de especie),
 * así la angelita y el murciélago conservan su proporción de verdad.
 *
 * Puro three-core: corre headless, cero assets, cero azar por frame.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL } from './polinizadoresIdentidad.js';

/* Tamaño base del enjambre (metros-escena). La escala de cada especie
   (`POLINIZADORES[id].escala`) multiplica esto: la angelita queda en ~5cm y el
   murciélago en ~38cm. La diferencia de tamaño ES información. */
export const BICHO_BASE = 0.092;

const _c = new THREE.Color();

/** Pinta una pieza con color plano horneado en vértices. */
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

/* -------------------------------------------------------------------------- */
/*  Piezas compartidas del cuerpo de insecto                                   */
/* -------------------------------------------------------------------------- */

/*
 * EL BORRÓN DEL ALA: un óvalo pálido aplastado, inclinado hacia atrás. No es un
 * ala dibujada — es el rastro que deja un ala que bate 200 veces por segundo.
 * Dibujar cada nervadura sería mentir sobre lo que el ojo ve.
 */
function alaBorron(largo, ancho, q, color = PAL.ala) {
  const g = new THREE.SphereGeometry(0.5, seg(q, 7), seg(q, 4));
  g.scale(largo, 0.055, ancho);
  return pintar(g, color, 1);
}

/** Par de alas en borrón, abiertas hacia atrás en V. */
function alasBorron(largo, ancho, q, { sep = 0.16, barrido = 0.55, alto = 0.16 } = {}) {
  const out = [];
  for (const s of [1, -1]) {
    const ala = alaBorron(largo, ancho, q);
    out.push(poner(ala, [-largo * 0.22, alto, s * sep], [0, s * barrido, 0.1]));
  }
  return out;
}

/** Ojo compuesto: la perla oscura que le da mirada al bicho. */
function ojos(r, x, y, z, q, color = '#2a2018') {
  const out = [];
  for (const s of [1, -1]) {
    const o = new THREE.SphereGeometry(r, seg(q, 6), seg(q, 5));
    out.push(pintar(poner(o, [x, y, s * z]), color));
  }
  return out;
}

/** Antenas: dos hilitos hacia adelante-arriba. */
function antenas(q, { x = 0.42, y = 0.1, z = 0.06, largo = 0.2, color = '#2a2018' } = {}) {
  const out = [];
  for (const s of [1, -1]) {
    const a = new THREE.CylinderGeometry(0.012, 0.008, largo, 3);
    out.push(pintar(poner(a, [x + largo * 0.3, y + largo * 0.35, s * z], [0, 0, -1.1]), color));
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  LAS ABEJAS                                                                 */
/* -------------------------------------------------------------------------- */

/*
 * ANGELITA (Tetragonisca angustula) — la cara de Chagra, en 3D.
 * Chiquita, ámbar, con la banda de tierra del chumbe y la cabecita clara. Los
 * colores son los MISMOS de `abejaIdentidad.js`: la del home y la de este mundo
 * son la misma vecina, no dos abejas parecidas.
 * SIN AGUIJÓN: el abdomen remata redondito, no en punta. Ese detalle es el que
 * le quita el miedo a la gente, así que se dibuja.
 */
export function geomAngelita({ q = 1 } = {}) {
  const piezas = [];
  // Abdomen: ovoide ámbar que TERMINA REDONDO (no hay aguijón que dibujar).
  const abd = new THREE.SphereGeometry(0.29, seg(q, 8), seg(q, 6));
  abd.scale(1.5, 0.92, 0.92);
  piezas.push(pintar(poner(abd, [-0.3, 0, 0]), PAL.angelitaCuerpo));
  /* Las bandas del CHUMBE: el hilo de tierra sobre el ámbar. Es el mismo tono
     que teje su dibujo 2D — la angelita de los mundos y la del home llevan la
     misma faja, no una parecida. */
  for (let i = 0; i < 2; i++) {
    const b = new THREE.CylinderGeometry(0.27 - i * 0.05, 0.27 - i * 0.05, 0.06, seg(q, 8), 1, true);
    piezas.push(pintar(poner(b, [-0.2 - i * 0.19, 0, 0], [0, 0, Math.PI / 2]), PAL.angelitaChumbe, 0.95));
  }
  // Tórax
  const tor = new THREE.SphereGeometry(0.24, seg(q, 8), seg(q, 6));
  tor.scale(1.1, 1, 1);
  piezas.push(pintar(poner(tor, [0.06, 0.02, 0]), '#e0a341'));
  // Cabeza clara
  const cab = new THREE.SphereGeometry(0.2, seg(q, 8), seg(q, 6));
  piezas.push(pintar(poner(cab, [0.34, 0.03, 0]), PAL.angelitaCabeza));
  piezas.push(...ojos(0.07, 0.44, 0.06, 0.11, q));
  piezas.push(...antenas(q, { x: 0.44, y: 0.1, z: 0.06, largo: 0.16 }));
  // Alas en borrón (chiquitas y rápidas)
  piezas.push(...alasBorron(0.62, 0.3, q, { sep: 0.13, alto: 0.14 }));
  // Paticas colgando (dan vida al vuelo)
  for (const s of [1, -1]) {
    const p = new THREE.CylinderGeometry(0.018, 0.012, 0.2, 3);
    piezas.push(pintar(poner(p, [-0.05, -0.2, s * 0.11], [0, 0, 0.35]), '#7a5a30'));
  }
  return fusionar(piezas);
}

/*
 * APIS MELLIFERA — la abeja de miel. Más grande, más bandeada, más recta.
 * Y SÍ tiene aguijón: se le dibuja la punta al abdomen. Al lado de la angelita,
 * la diferencia de tamaño y de remate cuenta la historia entera.
 */
export function geomApis({ q = 1 } = {}) {
  const piezas = [];
  const abd = new THREE.SphereGeometry(0.3, seg(q, 8), seg(q, 6));
  abd.scale(1.6, 0.9, 0.9);
  piezas.push(pintar(poner(abd, [-0.32, 0, 0]), PAL.apisCuerpo));
  // Bandas gruesas, alternadas: el rayado clásico.
  for (let i = 0; i < 3; i++) {
    const b = new THREE.CylinderGeometry(0.29 - i * 0.045, 0.28 - i * 0.045, 0.09, seg(q, 8), 1, true);
    piezas.push(pintar(poner(b, [-0.16 - i * 0.17, 0, 0], [0, 0, Math.PI / 2]), PAL.apisBanda));
  }
  // El aguijón: la punta que la angelita NO tiene.
  const ag = new THREE.ConeGeometry(0.035, 0.14, seg(q, 5));
  piezas.push(pintar(poner(ag, [-0.66, -0.02, 0], [0, 0, Math.PI / 2]), '#3a2a1c'));
  const tor = new THREE.SphereGeometry(0.26, seg(q, 8), seg(q, 6));
  piezas.push(pintar(poner(tor, [0.05, 0.02, 0]), '#7a5a34'));
  const cab = new THREE.SphereGeometry(0.2, seg(q, 8), seg(q, 6));
  piezas.push(pintar(poner(cab, [0.33, 0.02, 0]), '#5a4228'));
  piezas.push(...ojos(0.08, 0.42, 0.05, 0.12, q, '#1c1610'));
  piezas.push(...antenas(q, { x: 0.44, y: 0.1, z: 0.06, largo: 0.18 }));
  piezas.push(...alasBorron(0.78, 0.34, q, { sep: 0.15, alto: 0.16 }));
  for (const s of [1, -1]) {
    const p = new THREE.CylinderGeometry(0.02, 0.014, 0.24, 3);
    piezas.push(pintar(poner(p, [-0.06, -0.22, s * 0.12], [0, 0, 0.3]), '#3a2a1c'));
  }
  return fusionar(piezas);
}

/*
 * ABEJORRO (Bombus) — el pesado. REDONDO y PELUDO: la silueta es casi una bola.
 * Negro con franjas amarillas GRUESAS. El pelo se sugiere con una capa de
 * mechones (esferitas) sobre el tórax — barato y basta para que se lea "peludo".
 * Es el único que hace POLINIZACIÓN POR VIBRACIÓN, y sin él el maracuyá no cuaja.
 */
export function geomAbejorro({ q = 1 } = {}) {
  const piezas = [];
  // Abdomen: bola, no óvalo. Ahí está el carácter.
  const abd = new THREE.SphereGeometry(0.36, seg(q, 9), seg(q, 7));
  abd.scale(1.15, 1, 1);
  piezas.push(pintar(poner(abd, [-0.28, 0, 0]), PAL.abejorroPelo));
  // Las franjas GRUESAS (anchas de verdad: es su firma).
  const banda = new THREE.CylinderGeometry(0.365, 0.365, 0.2, seg(q, 9), 1, true);
  piezas.push(pintar(poner(banda, [-0.26, 0, 0], [0, 0, Math.PI / 2]), PAL.abejorroBanda));
  const banda2 = new THREE.CylinderGeometry(0.28, 0.28, 0.13, seg(q, 8), 1, true);
  piezas.push(pintar(poner(banda2, [-0.56, 0, 0], [0, 0, Math.PI / 2]), PAL.abejorroBanda, 0.9));
  // Tórax peludo
  const tor = new THREE.SphereGeometry(0.32, seg(q, 9), seg(q, 7));
  piezas.push(pintar(poner(tor, [0.1, 0.02, 0]), PAL.abejorroPelo));
  const collar = new THREE.CylinderGeometry(0.325, 0.325, 0.16, seg(q, 9), 1, true);
  piezas.push(pintar(poner(collar, [0.1, 0.02, 0], [0, 0, Math.PI / 2]), PAL.abejorroBanda));
  // EL PELO: mechones sueltos que rompen la silueta lisa.
  const nPelo = Math.max(4, Math.round(12 * q));
  for (let i = 0; i < nPelo; i++) {
    const a = (i / nPelo) * Math.PI * 2;
    const m = new THREE.SphereGeometry(0.07, 4, 3);
    const rad = 0.3;
    piezas.push(pintar(poner(m, [0.1 + Math.cos(a * 1.7) * 0.12, Math.sin(a) * rad, Math.cos(a) * rad]), i % 3 ? PAL.abejorroPelo : PAL.abejorroBanda, 1.1));
  }
  const cab = new THREE.SphereGeometry(0.22, seg(q, 7), seg(q, 6));
  piezas.push(pintar(poner(cab, [0.38, 0, 0]), PAL.abejorroPelo));
  piezas.push(...ojos(0.075, 0.46, 0.04, 0.13, q, '#12100e'));
  piezas.push(...antenas(q, { x: 0.48, y: 0.08, z: 0.07, largo: 0.16 }));
  // Alas: cortas para ese cuerpo — por eso el vuelo se ve pesado y ruidoso.
  piezas.push(...alasBorron(0.7, 0.34, q, { sep: 0.17, alto: 0.24 }));
  for (const s of [1, -1]) {
    const p = new THREE.CylinderGeometry(0.028, 0.018, 0.28, 3);
    piezas.push(pintar(poner(p, [-0.04, -0.28, s * 0.15], [0, 0, 0.3]), '#1c1814'));
  }
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  EL AVE                                                                     */
/* -------------------------------------------------------------------------- */

/*
 * COLIBRÍ (Colibri coruscans) — el mismo de `Colibri.jsx`, en volumen.
 * Dorso turquesa esmeralda, GORGUERA violeta iridiscente (su firma) y el pico
 * recto y largo con el que llega al fondo del tubo rojo. Alas en borrón porque
 * se CIERNE: batiendo así, el ala no existe para el ojo.
 */
export function geomColibri({ q = 1 } = {}) {
  const piezas = [];
  // Cuerpo: gota compacta
  const cue = new THREE.SphereGeometry(0.3, seg(q, 9), seg(q, 7));
  cue.scale(1.35, 1, 1);
  piezas.push(pintar(poner(cue, [-0.1, 0, 0]), PAL.colibriDorso));
  // Vientre más claro
  const vie = new THREE.SphereGeometry(0.24, seg(q, 8), seg(q, 6));
  vie.scale(1.25, 0.7, 0.9);
  piezas.push(pintar(poner(vie, [-0.1, -0.12, 0]), '#8fd0bc'));
  // Cabeza
  const cab = new THREE.SphereGeometry(0.2, seg(q, 8), seg(q, 6));
  piezas.push(pintar(poner(cab, [0.25, 0.1, 0]), PAL.colibriDorso, 1.06));
  // LA GORGUERA violeta: el parche de la garganta. Su firma de especie.
  const gor = new THREE.SphereGeometry(0.16, seg(q, 8), seg(q, 6));
  gor.scale(1, 0.85, 0.9);
  piezas.push(pintar(poner(gor, [0.26, -0.02, 0]), PAL.colibriGorguera));
  // EL PICO: recto y largo. La herramienta que define su flor.
  const pico = new THREE.CylinderGeometry(0.018, 0.045, 0.52, seg(q, 6));
  piezas.push(pintar(poner(pico, [0.62, 0.09, 0], [0, 0, Math.PI / 2 - 0.06]), '#241c18'));
  piezas.push(...ojos(0.05, 0.31, 0.16, 0.14, q, '#14100e'));
  // Cola: abanico de timoneras
  for (let i = -1; i <= 1; i++) {
    const t = new THREE.SphereGeometry(0.12, seg(q, 5), 3);
    t.scale(1.6, 0.1, 0.35);
    piezas.push(pintar(poner(t, [-0.52, 0.02, i * 0.06], [0, i * 0.28, 0.1]), '#1f7a6a'));
  }
  // Alas en borrón, ABIERTAS A LOS LADOS (postura de cernido, no de planeo).
  for (const s of [1, -1]) {
    const ala = new THREE.SphereGeometry(0.5, seg(q, 8), seg(q, 4));
    ala.scale(0.75, 0.05, 0.42);
    piezas.push(pintar(poner(ala, [-0.02, 0.16, s * 0.34], [0, s * 0.25, 0.06]), '#cfeaf2', 1));
  }
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  LA MOSCA DISFRAZADA                                                        */
/* -------------------------------------------------------------------------- */

/*
 * SÍRFIDO — la mosca que se viste de abeja para que no la molesten.
 * El disfraz: rayas amarillas y negras. Lo que la delata (y hay que poder verlo):
 *   · OJOS ENORMES rojizos que le comen media cara — ninguna abeja los tiene así.
 *   · UN SOLO PAR de alas, abiertas en T a los lados (la abeja tiene dos pares).
 *   · Cuerpo más plano y sin pelo.
 * De adulta poliniza; su larva se come los pulgones. Doble favor.
 */
export function geomSirfido({ q = 1 } = {}) {
  const piezas = [];
  // Abdomen plano (de mosca, no de abeja)
  const abd = new THREE.SphereGeometry(0.28, seg(q, 8), seg(q, 6));
  abd.scale(1.55, 0.62, 0.95);
  piezas.push(pintar(poner(abd, [-0.3, 0, 0]), PAL.sirfidoCuerpo));
  // El disfraz: las rayas.
  for (let i = 0; i < 3; i++) {
    const b = new THREE.BoxGeometry(0.075, 0.36, 0.54);
    piezas.push(pintar(poner(b, [-0.12 - i * 0.19, 0, 0]), PAL.sirfidoBanda));
  }
  const tor = new THREE.SphereGeometry(0.23, seg(q, 8), seg(q, 6));
  tor.scale(1.1, 0.85, 1);
  piezas.push(pintar(poner(tor, [0.08, 0.01, 0]), PAL.sirfidoBanda, 1.3));
  // LOS OJAZOS: dos medias esferas rojizas que ocupan casi toda la cabeza.
  const cab = new THREE.SphereGeometry(0.13, seg(q, 6), seg(q, 5));
  piezas.push(pintar(poner(cab, [0.32, 0, 0]), '#3a3128'));
  for (const s of [1, -1]) {
    const o = new THREE.SphereGeometry(0.15, seg(q, 7), seg(q, 6));
    o.scale(1, 1.05, 0.85);
    piezas.push(pintar(poner(o, [0.34, 0.03, s * 0.09]), PAL.sirfidoOjo, 1));
  }
  // UN par de alas, en T (abiertas casi perpendiculares al cuerpo).
  for (const s of [1, -1]) {
    const ala = alaBorron(0.72, 0.26, q, '#e8f4fa');
    piezas.push(poner(ala, [-0.05, 0.1, s * 0.3], [0, s * 1.15, 0.04]));
  }
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  LOS DEL ALETEO VISIBLE (alas aparte)                                       */
/* -------------------------------------------------------------------------- */

/*
 * MARIPOSA — cuerpo. Las alas van APARTE (`geomAlaMariposa`) porque su aleteo sí
 * se ve: es lento y es su carácter entero.
 * Carga poco polen (cuerpo liso, sin pelo donde se pegue) — pero si anda
 * tranquila por la finca, es que hay flor y no hay veneno.
 */
export function geomMariposa({ q = 1 } = {}) {
  const piezas = [];
  const cue = new THREE.CylinderGeometry(0.07, 0.04, 0.75, seg(q, 6));
  piezas.push(pintar(poner(cue, [-0.1, 0, 0], [0, 0, Math.PI / 2]), '#3a2b22'));
  // Segmentación del abdomen
  for (let i = 0; i < 3; i++) {
    const s = new THREE.SphereGeometry(0.075, seg(q, 5), 4);
    piezas.push(pintar(poner(s, [-0.2 - i * 0.14, 0, 0]), '#4a382c', 1 - i * 0.06));
  }
  const cab = new THREE.SphereGeometry(0.095, seg(q, 6), seg(q, 5));
  piezas.push(pintar(poner(cab, [0.3, 0.02, 0]), '#3a2b22'));
  piezas.push(...ojos(0.05, 0.35, 0.03, 0.07, q, '#14100c'));
  // Antenas con GARROTE en la punta (así se distingue de una polilla).
  for (const s of [1, -1]) {
    const a = new THREE.CylinderGeometry(0.011, 0.011, 0.3, 3);
    piezas.push(pintar(poner(a, [0.44, 0.16, s * 0.05], [0, 0, -0.9]), '#2a2018'));
    const g = new THREE.SphereGeometry(0.032, 4, 3);
    piezas.push(pintar(poner(g, [0.57, 0.31, s * 0.06]), '#2a2018'));
  }
  // La trompa (probóscide) enroscada bajo la cara.
  const tr = new THREE.TorusGeometry(0.06, 0.012, 3, seg(q, 8), Math.PI * 1.6);
  piezas.push(pintar(poner(tr, [0.36, -0.09, 0], [Math.PI / 2, 0, 0]), '#5a4230'));
  return fusionar(piezas);
}

/*
 * ALA DE MARIPOSA (una sola, la derecha; la escena la espeja).
 * Anclada en el origen para que rote desde el hombro: el aleteo es una bisagra.
 */
export function geomAlaMariposa({ q = 1 } = {}) {
  const piezas = [];
  // Ala anterior: el triángulo grande.
  const sup = new THREE.SphereGeometry(0.5, seg(q, 8), seg(q, 5));
  sup.scale(0.85, 0.045, 1);
  piezas.push(pintar(poner(sup, [0.1, 0, 0.42]), PAL.mariposaAla));
  // Ala posterior: la redondeada de atrás.
  const inf = new THREE.SphereGeometry(0.36, seg(q, 7), seg(q, 4));
  inf.scale(0.8, 0.045, 0.9);
  piezas.push(pintar(poner(inf, [-0.28, -0.01, 0.32]), PAL.mariposaAla, 0.88));
  // El borde oscuro que enmarca el ala (el dibujo de la mariposa).
  const borde = new THREE.TorusGeometry(0.42, 0.028, 3, seg(q, 10));
  borde.scale(0.9, 1, 1);
  piezas.push(pintar(poner(borde, [0.08, 0, 0.44], [Math.PI / 2, 0, 0]), PAL.mariposaBorde));
  // Los ocelos: las manchas-ojo que asustan al pájaro.
  for (let i = 0; i < 2; i++) {
    const oc = new THREE.SphereGeometry(0.09, seg(q, 6), 4);
    oc.scale(1, 0.05, 1);
    piezas.push(pintar(poner(oc, [0.24 - i * 0.4, 0.012, 0.55 - i * 0.16]), '#f5e2b0', 1));
  }
  return fusionar(piezas);
}

/*
 * MURCIÉLAGO nectarívoro (filostómido) — el turno de noche.
 * La HOJA NASAL es la firma de la familia: esa lanceta sobre el hocico. Orejas
 * grandes, hocico largo (para meterlo en la flor pálida) y lengua larga.
 * La gente le tiene miedo por los vampiros, que son unas poquitas especies: este
 * trabaja gratis toda la noche en las flores que ninguna abeja atiende.
 */
export function geomMurcielago({ q = 1 } = {}) {
  const piezas = [];
  const cue = new THREE.SphereGeometry(0.28, seg(q, 8), seg(q, 6));
  cue.scale(1.5, 0.95, 0.85);
  piezas.push(pintar(poner(cue, [-0.12, 0, 0]), PAL.murcielagoPelo));
  // Hocico largo: la herramienta para llegar al néctar del fondo.
  const hoc = new THREE.CylinderGeometry(0.07, 0.12, 0.3, seg(q, 6));
  piezas.push(pintar(poner(hoc, [0.34, -0.03, 0], [0, 0, Math.PI / 2 - 0.12]), '#5e5058'));
  // LA HOJA NASAL: la lanceta que lo hace filostómido.
  const hoja = new THREE.SphereGeometry(0.075, seg(q, 5), 4);
  hoja.scale(0.35, 1.5, 0.9);
  piezas.push(pintar(poner(hoja, [0.47, 0.09, 0]), '#7a6572'));
  // La lengua asomada (larga: es de las que lame néctar).
  const len = new THREE.CylinderGeometry(0.018, 0.01, 0.22, 3);
  piezas.push(pintar(poner(len, [0.56, -0.08, 0], [0, 0, Math.PI / 2 - 0.25]), '#c96a72'));
  // Orejas grandes
  for (const s of [1, -1]) {
    const or = new THREE.SphereGeometry(0.14, seg(q, 5), 4);
    or.scale(0.28, 1.25, 0.75);
    piezas.push(pintar(poner(or, [0.16, 0.26, s * 0.12], [0, 0, -0.25 * s]), '#6b5a6e'));
  }
  piezas.push(...ojos(0.045, 0.28, 0.08, 0.11, q, '#100c10'));
  // Patas colgando (así cuelga cuando se posa)
  for (const s of [1, -1]) {
    const p = new THREE.CylinderGeometry(0.03, 0.02, 0.26, 3);
    piezas.push(pintar(poner(p, [-0.3, -0.2, s * 0.1], [0, 0, 0.25]), '#4a3f4e'));
  }
  return fusionar(piezas);
}

/*
 * ALA DE MURCIÉLAGO (la derecha; la escena la espeja). Membrana entre los dedos:
 * se dibujan los RADIOS (los dedos largos) porque son lo que la hace un ala de
 * mano y no de pluma. Ancla en el origen: bate desde el hombro.
 */
export function geomAlaMurcielago({ q = 1 } = {}) {
  const piezas = [];
  // La membrana: un abanico ancho.
  const mem = new THREE.SphereGeometry(0.6, seg(q, 8), seg(q, 4));
  mem.scale(0.72, 0.035, 1);
  piezas.push(pintar(poner(mem, [-0.05, 0, 0.52]), PAL.murcielagoMembrana));
  // El brazo
  const br = new THREE.CylinderGeometry(0.035, 0.028, 0.5, 4);
  piezas.push(pintar(poner(br, [0.05, 0.01, 0.25], [Math.PI / 2, 0, 0]), PAL.murcielagoPelo));
  // LOS DEDOS: los radios que tensan la membrana. Es una MANO volando.
  const nDedo = Math.max(3, Math.round(4 * q));
  for (let i = 0; i < nDedo; i++) {
    const a = -0.5 + (i / (nDedo - 1)) * 1.15;
    const d = new THREE.CylinderGeometry(0.017, 0.011, 0.72, 3);
    piezas.push(pintar(poner(d, [Math.sin(a) * 0.34 - 0.02, 0.012, 0.5 + Math.cos(a) * 0.18], [Math.PI / 2, 0, 0], null), '#3e3542'));
    // (el giro fino del dedo lo da la rotación de su eje; basta para leerlo)
  }
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  EL TORPE                                                                   */
/* -------------------------------------------------------------------------- */

/*
 * ESCARABAJO — coraza dura partida al medio (los élitros), lustrosa, y patas
 * cortas. Torpe y pesado: no es un polinizador fino, es el que se le sube encima
 * a la flor gruesa y la maltrata mientras come. Igual cumple.
 */
export function geomEscarabajo({ q = 1 } = {}) {
  const piezas = [];
  // El caparazón: domo duro.
  const capa = new THREE.SphereGeometry(0.36, seg(q, 9), seg(q, 6));
  capa.scale(1.35, 0.72, 1);
  piezas.push(pintar(poner(capa, [-0.14, 0.04, 0]), PAL.escarabajoCaparazon));
  // LA LÍNEA: la partidura de los élitros. Sin esto no es escarabajo.
  const lin = new THREE.BoxGeometry(0.95, 0.05, 0.028);
  piezas.push(pintar(poner(lin, [-0.14, 0.3, 0]), '#241c14'));
  // Lustre: la banda clara del reflejo (rubber-hose: la luz se DIBUJA).
  const lus = new THREE.SphereGeometry(0.2, seg(q, 6), 4);
  lus.scale(1.5, 0.15, 0.45);
  piezas.push(pintar(poner(lus, [-0.08, 0.28, 0.14]), PAL.escarabajoLustre, 1.15));
  // Tórax y cabeza
  const tor = new THREE.SphereGeometry(0.22, seg(q, 7), seg(q, 5));
  tor.scale(1, 0.7, 1.05);
  piezas.push(pintar(poner(tor, [0.26, 0.02, 0]), '#3a2c1e'));
  const cab = new THREE.SphereGeometry(0.14, seg(q, 6), seg(q, 5));
  piezas.push(pintar(poner(cab, [0.44, 0, 0]), '#2e2317'));
  piezas.push(...ojos(0.04, 0.5, 0.04, 0.09, q, '#12100a'));
  piezas.push(...antenas(q, { x: 0.5, y: 0.02, z: 0.06, largo: 0.14, color: '#241c14' }));
  // Seis patas cortas y dobladas.
  for (const s of [1, -1]) {
    for (let i = 0; i < 3; i++) {
      const p = new THREE.CylinderGeometry(0.022, 0.014, 0.24, 3);
      piezas.push(pintar(poner(p, [0.1 - i * 0.22, -0.16, s * 0.24], [0, 0, 0.5 - i * 0.1]), '#241c14'));
    }
  }
  return fusionar(piezas);
}

/* -------------------------------------------------------------------------- */
/*  EL TRUEQUE: la carga de polen                                              */
/* -------------------------------------------------------------------------- */

/*
 * LA PELOTITA DE POLEN (corbícula): la canasta que la abeja lleva en la pata de
 * atrás y que se le va HINCHANDO mientras trabaja. Es el lado visible del
 * trueque: la flor le paga con néctar, ella se lleva el polen — y de paso lo
 * reparte. Una sola geometría minúscula, instanciada para TODO el enjambre: una
 * draw-call para todas las cargas del mundo.
 */
export function geomCargaPolen({ q = 1 } = {}) {
  const g = new THREE.SphereGeometry(0.5, seg(q, 7), seg(q, 5));
  g.scale(1, 0.85, 0.85);
  return pintar(g, PAL.polenVivo);
}

/* -------------------------------------------------------------------------- */
/*  El catálogo                                                                */
/* -------------------------------------------------------------------------- */

export const BICHO_GEOM = {
  angelita: geomAngelita,
  apis: geomApis,
  abejorro: geomAbejorro,
  colibri: geomColibri,
  sirfido: geomSirfido,
  mariposa: geomMariposa,
  escarabajo: geomEscarabajo,
  murcielago: geomMurcielago,
};

/* Quiénes llevan las alas aparte (aleteo visible). El resto va en borrón. */
export const ALA_GEOM = {
  mariposa: geomAlaMariposa,
  murcielago: geomAlaMurcielago,
};
