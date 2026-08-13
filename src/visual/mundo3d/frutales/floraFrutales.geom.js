/*
 * floraFrutales.geom — la GEOMETRÍA del MUNDO DE LOS FRUTALES (mango + cítricos).
 *
 * Van JUNTOS a propósito: comparten el arquetipo del árbol frutal de copa
 * redondeada, y juntos enseñan lo que por separado no — EL PISO TÉRMICO. La
 * finca sube: en la VEGA CALIENTE del frente (0–1.000 m) reinan los palos de
 * mango, y ladera arriba, ya en clima medio, viven los cítricos (la naranja y
 * la mandarina suben hasta ~1.600 m). Esa diferencia ES la lección: en la
 * montaña, la altura decide qué se da. Cada especie con su identidad:
 *
 *   · Mango (Mangifera indica)  — árbol GRANDE y longevo, copa densa MÁS ANCHA
 *                                 QUE ALTA, hoja lanceolada larga que brota
 *                                 color VINO-COBRIZO y después vira a verde
 *                                 oscuro (el detalle que lo delata), panícula
 *                                 floral terminal crema sobre la copa, y el
 *                                 fruto colgando de un PEDÚNCULO LARGO — aquí
 *                                 el común de Colombia: mango de azúcar e
 *                                 hilacha, pequeño y amarillo.
 *   · Fruto de mango            — INSTANCIADO APARTE con color por instancia
 *                                 (verde → amarillo dorado). El pedúnculo va EN
 *                                 la geometría del fruto: cada mango cuelga con
 *                                 su cordón, bien debajo de la copa.
 *   · Cítrico (Citrus spp.)     — árbol MUCHO más chico, copa redonda compacta
 *                                 y densa, hoja lustrosa con PECÍOLO ALADO (la
 *                                 hojita en la base — el rasgo del género),
 *                                 ESPINAS en las ramas bajas.
 *   · Fruto cítrico             — instanciado con color Y escala por instancia:
 *                                 naranja (esfera), mandarina (achatada, más
 *                                 chica), limón pajarito (ovoide, verde — en
 *                                 Colombia el limón se coge verde). Pegado al
 *                                 ramaje, no colgado de cordón como el mango.
 *   · Azahar                    — la flor blanca olorosa del cítrico, motas
 *                                 claras sobre la copa.
 *   · Hojarasca + piedra        — el suelo de la vega: el mango bota hoja todo
 *                                 el año y a su sombra se junta el mantillo.
 *
 * LA ESCALA RELATIVA es sagrada: el mango ECLIPSA al cítrico (4–6 m contra
 * ~2 m aquí en unidades de escena). Si quedan parejos, este mundo fracasó.
 *
 * TÉCNICA tier-safe (mismo contrato que floraCafetal/floraCacao): cada especie
 * se FUSIONA en UNA geometría con color horneado en vertexColors y se dibuja
 * con UN InstancedMesh → una draw-call por especie. Los frutos se pintan
 * BLANCOS (el pedúnculo del mango, neutro) para que el color POR INSTANCIA
 * sea el color real. El fruto cítrico además lleva ESCALA VECTORIAL por
 * instancia (naranja/mandarina/limón se distinguen por proporción).
 *
 * ⚠️ mergeGeometries devuelve NULL EN SILENCIO si se mezclan geometrías
 * indexadas con no-indexadas (ya mordió varias veces): aquí TODO se desindexa
 * antes de fusionar y se TRUENA si aun así falla.
 *
 * Aquí viven SOLO los datos y las mallas (nada de WebGL): corre headless.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from '../bosque/entQuenua.geom.js';

/* -------------------------------------------------------------------------- */
/*  La finca frutalera (la geografía del mundo, determinista)                  */
/* -------------------------------------------------------------------------- */

export const ANCHO = 40; // x: -20 … 20
export const FONDO = 38; // z: -19 (arriba, clima medio) … 19 (la vega caliente)

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

/**
 * La altura de la finca en un punto. El frente (+z) es la VEGA CALIENTE, plana
 * de verdad — tierra de mango. Hacia el fondo la ladera SUBE fuerte al clima
 * medio de los cítricos: la subida es la lección hecha relieve.
 */
export function alturaFinca(wx, wz) {
  const sub = smoothstep(6, -16, wz); // 0 en la vega, 1 arriba en el huerto
  let h = 0.1;
  h += sub * 6.4; // la ladera gana MÁS altura que en otros mundos: se debe SENTIR
  h += ruido(wx * 0.5, wz * 0.5) * 0.35 * (0.25 + sub); // ondulación natural
  return h;
}

/**
 * El eje del CAMINO que sube de la casa (vega) al huerto de cítricos: la línea
 * que el campesino camina entre sus dos pisos térmicos. La escena lo pinta.
 */
export function caminoX(wz) {
  return -9.5 + smoothstep(11, -13, wz) * 11 + Math.sin(wz * 0.45) * 1.5;
}

/* -------------------------------------------------------------------------- */
/*  Presupuesto por tier                                                       */
/* -------------------------------------------------------------------------- */

/*
 * Instancias por especie. 'alto' puebla la finca plena; 'medio' es frugal;
 * 'bajo' deja lo mínimo para que AÚN se lea "el mango gigante abajo y los
 * cítricos chicos arriba" — la escala relativa sobrevive a todo recorte.
 */
/* La CARGA es alta a propósito, y es lo cierto: un palo de mango en cosecha y
   un naranjo bueno cargan a cientos de frutos. Además es el color que levanta
   la escena — al mundo del café le pasó que quedó pardo y mustio al lado del
   valle, y aquí el amarillo del mango y el naranja del cítrico son la defensa.
   (Medido contra el cafetal: ~1.5x su área de fruta y bastante más claro.) */
export const FLORA_FRUTALES = {
  alto: { mango: 5, mangoFruto: 165, citrico: 24, citricoFruto: 430, azahar: 90, hojarasca: 10, piedra: 6 },
  medio: { mango: 4, mangoFruto: 92, citrico: 14, citricoFruto: 240, azahar: 40, hojarasca: 6, piedra: 4 },
  bajo: { mango: 2, mangoFruto: 34, citrico: 7, citricoFruto: 92, azahar: 0, hojarasca: 3, piedra: 2 },
};

/** Conteos para un tier (desconocido → frugal, nunca el más caro). */
export const frutalesDeTier = (tier) => FLORA_FRUTALES[tier] || FLORA_FRUTALES.medio;

/** Factor de detalle geométrico por tier (menos masas/hojas en gama baja). */
export const CALIDAD_FRUTALES = { alto: 1, medio: 0.62, bajo: 0.42 };
export const calidadFrutales = (tier) => CALIDAD_FRUTALES[tier] ?? CALIDAD_FRUTALES.medio;

/* -------------------------------------------------------------------------- */
/*  Paleta de los frutales (colores horneados en vertexColors)                 */
/* -------------------------------------------------------------------------- */

export const PAL = {
  // Mango — el gigante de tierra caliente
  mangoTronco: '#4f3d2c', // corteza oscura, agrietada, de árbol viejo
  mangoRama: '#5e4834', // las ramas maestras que abren la copa
  mangoHoja: '#274d28', // el verde MUY oscuro de la copa densa
  mangoHojaSol: '#3f7034', // la cara de la copa que da al sol
  mangoHojaSombra: '#1d3b20', // el corazón hondo del dosel
  mangoBroteVino: '#7e3a2c', // EL detalle: el cogollo nuevo color vino
  mangoBroteCobre: '#a3563a', // …que va virando cobrizo antes del verde
  paniculaCrema: '#ecd9a2', // la panícula floral terminal, crema
  paniculaRosada: '#d9a582', // …con su rubor rosado

  // Los estados del fruto de mango (van POR INSTANCIA; referencia: el mango de
  // azúcar e hilacha colombiano — pequeño, del verde al amarillo dorado):
  mangoVerde: '#86a83e',
  mangoPinton: '#cfae3a',
  mangoMaduro: '#f4b63c',
  pedunculo: '#9aa578', // el cordón largo (neutro: el tinte lo oscurece apenas)

  // Cítrico — el chico de copa redonda
  citricoTronco: '#7a6a52',
  citricoRama: '#8a795e',
  citricoHoja: '#2e6b2f', // hoja lustrosa verde profundo
  citricoHojaSol: '#49913c',
  citricoEspina: '#a8a06a', // la espina clara en la rama joven
  citricoAla: '#57a244', // el pecíolo alado, más tierno que la lámina

  // Los frutos cítricos (POR INSTANCIA; referencia):
  naranjaMadura: '#f08a1d',
  mandarinaMadura: '#e8791c',
  limonVerde: '#7fa03c', // el limón pajarito se coge VERDE en Colombia
  limonPinton: '#c9c93e',
  citricoVerde: '#6f9a3a', // fruto por madurar, cualquiera

  // Azahar — la flor blanca olorosa
  azahar: '#f7f3e6',
  azaharCentro: '#e9e2a0',

  // Suelo de la vega
  hojarasca: '#8a6c42',
  hojarasca2: '#6f5530',
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

/** Orienta el +Y de la geometría hacia `dir` y la ubica en `pos` (hojas). */
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
    throw new Error('floraFrutales: mergeGeometries devolvió null — atributos incompatibles entre partes');
  }
  return g;
}

/** Pequeña variación determinista de color (que la finca no sea plana). */
function variar(base, r, amt = 0.06) {
  const c = new THREE.Color(base);
  c.multiplyScalar(1 + (r() - 0.5) * amt * 2);
  return c;
}

/* -------------------------------------------------------------------------- */
/*  MANGO (Mangifera indica) — el gigante de la tierra caliente                */
/* -------------------------------------------------------------------------- */

/*
 * El porte del palo de mango, compartido con la distribución: la copa es un
 * DOMO más ancho que alto sobre un tronco corto y grueso. El fruto no va aquí
 * (es InstancedMesh aparte, colgado del ANILLO DE LA FALDA de esta misma copa:
 * FALDA_MANGO dice a qué radio y altura cuelga — nada de fruta flotando).
 */
export const FALDA_MANGO = { radMin: 1.45, radMax: 2.35, y: 2.02 };

/** La silueta a media distancia dice "mango": domo denso, bajo y ANCHO. */
export function geomMango({ q = 1 } = {}, seed = 1) {
  const r = rng(seed);
  const partes = [];

  // El tronco corto y GRUESO del árbol viejo (el mango es longevo: este palo
  // ya daba fruta cuando nació la abuela).
  const tronco = new THREE.CylinderGeometry(0.17, 0.3, 1.55, 8, 1);
  poner(tronco, [0, 0.77, 0]);
  partes.push(pintar(tronco, PAL.mangoTronco));

  // Las ramas maestras que abren el domo (se alcanzan a ver por debajo).
  const nRamas = Math.max(3, Math.round(4 * q));
  for (let i = 0; i < nRamas; i++) {
    const a = (i / nRamas) * Math.PI * 2 + r() * 0.6;
    const rama = new THREE.CylinderGeometry(0.06, 0.11, 1.5, 5, 1);
    apuntar(rama, [Math.cos(a) * 0.75, 1.9, Math.sin(a) * 0.75], [Math.cos(a) * 1.15, 1, Math.sin(a) * 1.15]);
    partes.push(pintar(rama, PAL.mangoRama));
  }

  // LA COPA: el domo denso MÁS ANCHO QUE ALTO (≈6 de ancho por ≈2.3 de alto).
  // Masa central + anillo + falda baja: de lejos UNA sola bóveda tupida.
  const centro = new THREE.IcosahedronGeometry(1.5, 1);
  poner(centro, [0, 2.75, 0], [0, r() * Math.PI, 0], [1.7, 0.85, 1.7]);
  partes.push(pintar(centro, variar(PAL.mangoHoja, r, 0.05)));

  const nAnillo = Math.max(4, Math.round(6 * q));
  for (let i = 0; i < nAnillo; i++) {
    const a = (i / nAnillo) * Math.PI * 2 + 0.4;
    const masa = new THREE.IcosahedronGeometry(1.0 + r() * 0.25, 1);
    poner(
      masa,
      [Math.cos(a) * 1.55, 2.45 + (r() - 0.5) * 0.45, Math.sin(a) * 1.55],
      [0, r() * Math.PI, 0],
      [1.6, 0.78, 1.6],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.mangoHojaSol : PAL.mangoHoja, r, 0.06)));
  }
  // la falda baja del domo (la copa del mango casi barre el suelo de sombra)
  const nFalda = Math.max(3, Math.round(4 * q));
  for (let i = 0; i < nFalda; i++) {
    const a = (i / nFalda) * Math.PI * 2 + 1.1;
    const masa = new THREE.IcosahedronGeometry(0.8 + r() * 0.2, 1);
    poner(
      masa,
      [Math.cos(a) * 1.95, 1.95 + (r() - 0.5) * 0.2, Math.sin(a) * 1.95],
      [0, r() * Math.PI, 0],
      [1.45, 0.7, 1.45],
    );
    partes.push(pintar(masa, variar(PAL.mangoHojaSombra, r, 0.05)));
  }

  // EL BROTE VINO-COBRIZO: el cogollo nuevo de la punta que brota color vino y
  // después vira a verde — el detalle que delata al mango y nadie dibuja. Motas
  // en el borde alto de la copa, del vino al cobre.
  const nBrotes = Math.max(3, Math.round(6 * q));
  for (let i = 0; i < nBrotes; i++) {
    const a = (i / nBrotes) * Math.PI * 2 + r() * 0.8;
    const rad = 2.1 + r() * 0.6;
    const mezcla = new THREE.Color(PAL.mangoBroteVino).lerp(new THREE.Color(PAL.mangoBroteCobre), r());
    const brote = new THREE.IcosahedronGeometry(0.34 + r() * 0.16, 0);
    poner(
      brote,
      [Math.cos(a) * rad, 2.85 + (r() - 0.5) * 0.6, Math.sin(a) * rad],
      [0, r() * Math.PI, 0],
      [1.25, 0.7, 1.25],
    );
    partes.push(pintar(brote, mezcla));
  }

  // La HOJA LANCEOLADA: larga y angosta, cuelga de la falda de la copa (a esta
  // escala se hornean mechones de hojas colgantes, no la hoja una a una).
  const nHojas = Math.max(8, Math.round(22 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = r() * Math.PI * 2;
    const rad = 2.1 + r() * 0.85;
    const hoja = new THREE.SphereGeometry(1, 4, 2);
    apuntar(
      hoja,
      [Math.cos(a) * rad, 2.0 + r() * 0.7, Math.sin(a) * rad],
      [Math.cos(a) * 0.55, -1, Math.sin(a) * 0.55], // colgando hacia afuera-abajo
      [0.05, 0.3, 0.017],
    );
    partes.push(pintar(hoja, variar(i % 3 ? PAL.mangoHoja : PAL.mangoHojaSol, r, 0.05)));
  }

  // LA PANÍCULA terminal: el ramillete floral crema-rosado que se PARA sobre
  // la copa en las puntas — la señal de que el palo está "enflorado".
  const nPan = Math.max(3, Math.round(8 * q));
  for (let i = 0; i < nPan; i++) {
    const a = (i / nPan) * Math.PI * 2 + r() * 0.7;
    const rad = 0.5 + r() * 1.7;
    const px = Math.cos(a) * rad;
    const pz = Math.sin(a) * rad;
    const py = 3.55 + (r() - 0.5) * 0.3 - rad * 0.22; // sigue la curva del domo
    const tallito = new THREE.CylinderGeometry(0.016, 0.022, 0.22, 3, 1);
    poner(tallito, [px, py + 0.1, pz], [(r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3]);
    partes.push(pintar(tallito, PAL.mangoBroteCobre));
    const pan = new THREE.ConeGeometry(0.15 + r() * 0.05, 0.4 + r() * 0.12, 5, 1);
    poner(pan, [px, py + 0.42, pz], [(r() - 0.5) * 0.25, r() * Math.PI, (r() - 0.5) * 0.25]);
    const cPan = new THREE.Color(PAL.paniculaCrema).lerp(new THREE.Color(PAL.paniculaRosada), r() * 0.6);
    partes.push(pintar(pan, cPan));
  }

  return fusionar(partes);
}

/** El fruto de mango CON su pedúnculo largo: el origen es el punto donde el
    cordón agarra de la rama — el fruto queda colgando 0.6 más abajo, bien
    despegado de la copa (así carga el mango de verdad). Se pinta con neutros:
    el color POR INSTANCIA (verde → amarillo) es el color real. */
export function geomMangoFruto() {
  const cordon = new THREE.CylinderGeometry(0.008, 0.011, 0.56, 3, 1);
  poner(cordon, [0, -0.28, 0]);
  const fruto = new THREE.IcosahedronGeometry(0.09, 1);
  poner(fruto, [0.012, -0.62, 0], [0, 0, 0.16], [0.92, 1.18, 0.86]); // ovoide, apenas ladeado
  return fusionar([pintar(cordon, PAL.pedunculo), pintar(fruto, '#ffffff')]);
}

/* -------------------------------------------------------------------------- */
/*  CÍTRICO (Citrus spp.) — el chico de copa redonda del clima medio           */
/* -------------------------------------------------------------------------- */

/* El radio de la bola de copa (compartido con la distribución: los frutos y el
   azahar se siembran SOBRE esta misma superficie, pegados al ramaje). */
export const COPA_CITRICO = { rad: 0.72, y: 1.14 };

/** La silueta a media distancia dice "cítrico": una paleta redonda compacta,
    chiquita, con puntos de color de fruta. */
export function geomCitrico({ q = 1 } = {}, seed = 2) {
  const r = rng(seed);
  const partes = [];

  // Tronco corto y delgado.
  const tronco = new THREE.CylinderGeometry(0.045, 0.075, 0.62, 6, 1);
  poner(tronco, [0, 0.31, 0]);
  partes.push(pintar(tronco, PAL.citricoTronco));

  // Dos ramas bajas visibles (donde se ven las espinas).
  for (let i = 0; i < 2; i++) {
    const a = i * 2.6 + r();
    const rama = new THREE.CylinderGeometry(0.018, 0.03, 0.42, 4, 1);
    apuntar(rama, [Math.cos(a) * 0.2, 0.62, Math.sin(a) * 0.2], [Math.cos(a), 1.1, Math.sin(a)]);
    partes.push(pintar(rama, PAL.citricoRama));
  }

  // LAS ESPINAS de la rama joven: conitos claros en la madera baja — el género
  // Citrus las trae de fábrica y aquí se ven.
  const nEsp = Math.max(3, Math.round(7 * q));
  for (let i = 0; i < nEsp; i++) {
    const a = r() * Math.PI * 2;
    const rad = 0.16 + r() * 0.3;
    const esp = new THREE.ConeGeometry(0.013, 0.075, 3, 1);
    apuntar(
      esp,
      [Math.cos(a) * rad, 0.5 + r() * 0.38, Math.sin(a) * rad],
      [Math.cos(a), 0.35 + r() * 0.5, Math.sin(a)],
    );
    partes.push(pintar(esp, PAL.citricoEspina));
  }

  // LA COPA: bola compacta y densa (masa central + tres refuerzos): la paleta
  // redonda del naranjo. Baja, casi desde el suelo — el cítrico se cosecha
  // parado, sin escalera.
  const centro = new THREE.IcosahedronGeometry(0.66, 1);
  poner(centro, [0, COPA_CITRICO.y, 0], [0, r() * Math.PI, 0], [1.06, 0.98, 1.06]);
  partes.push(pintar(centro, variar(PAL.citricoHoja, r, 0.05)));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.8;
    const masa = new THREE.IcosahedronGeometry(0.42 + r() * 0.1, 1);
    poner(
      masa,
      [Math.cos(a) * 0.36, COPA_CITRICO.y + (r() - 0.5) * 0.4, Math.sin(a) * 0.36],
      [0, r() * Math.PI, 0],
      [1.05, 0.95, 1.05],
    );
    partes.push(pintar(masa, variar(i % 2 ? PAL.citricoHojaSol : PAL.citricoHoja, r, 0.06)));
  }

  // La HOJA HÉROE con su PECÍOLO ALADO: en el borde de la copa, la lámina
  // lustrosa y — pegadita en su base — la hojita menor del pecíolo: EL rasgo
  // diagnóstico del género Citrus, dibujado donde se alcanza a ver.
  const nHojas = Math.max(4, Math.round(8 * q));
  for (let i = 0; i < nHojas; i++) {
    const a = (i / nHojas) * Math.PI * 2 + r() * 0.5;
    const inc = 0.15 + r() * 0.75; // inclinación sobre el ecuador de la copa
    const dx = Math.cos(a) * Math.cos(inc);
    const dy = Math.sin(inc);
    const dz = Math.sin(a) * Math.cos(inc);
    const px = dx * COPA_CITRICO.rad * 0.98;
    const py = COPA_CITRICO.y + dy * COPA_CITRICO.rad * 0.9;
    const pz = dz * COPA_CITRICO.rad * 0.98;
    // el ala (pecíolo alado): la hojita chica, primero, pegada a la copa
    const ala = new THREE.SphereGeometry(1, 4, 2);
    apuntar(ala, [px, py, pz], [dx, dy + 0.25, dz], [0.026, 0.04, 0.012]);
    partes.push(pintar(ala, PAL.citricoAla));
    // la lámina: la hoja grande lustrosa, saliendo del ala hacia afuera
    const lamina = new THREE.SphereGeometry(1, 4, 2);
    apuntar(
      lamina,
      [px + dx * 0.09, py + dy * 0.07 + 0.02, pz + dz * 0.09],
      [dx, dy + 0.15, dz],
      [0.055, 0.115, 0.018],
    );
    partes.push(pintar(lamina, variar(i % 2 ? PAL.citricoHojaSol : PAL.citricoHoja, r, 0.05)));
  }

  return fusionar(partes);
}

/** El fruto cítrico: esfera pintada blanca — color Y proporción van POR
    INSTANCIA (naranja esfera / mandarina achatada / limón ovoide). */
export function geomCitricoFruto() {
  const g = new THREE.IcosahedronGeometry(0.078, 1);
  return pintar(g.index ? g.toNonIndexed() : g, '#ffffff');
}

/** El AZAHAR: el ramillete blanco oloroso del cítrico (motas + centro pálido).
    Chiquito: perfuma más de lo que abulta. */
export function geomAzahar(seed = 7) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r();
    const mota = new THREE.IcosahedronGeometry(0.03 + r() * 0.014, 0);
    poner(
      mota,
      [Math.cos(a) * 0.038, (r() - 0.5) * 0.024, Math.sin(a) * 0.038],
      [r() * 0.6, r() * Math.PI, r() * 0.6],
      [1.15, 0.8, 1.15],
    );
    partes.push(pintar(mota, PAL.azahar));
  }
  const centro = new THREE.IcosahedronGeometry(0.02, 0);
  poner(centro, [0, 0.026, 0]);
  partes.push(pintar(centro, PAL.azaharCentro));
  return fusionar(partes);
}

/* -------------------------------------------------------------------------- */
/*  Suelo: hojarasca y piedra                                                  */
/* -------------------------------------------------------------------------- */

export function geomHojarasca(seed = 5) {
  const r = rng(seed);
  const partes = [];
  for (let i = 0; i < 3; i++) {
    const mancha = new THREE.CylinderGeometry(0.34 + r() * 0.3, 0.42 + r() * 0.32, 0.035, 7, 1);
    poner(mancha, [(r() - 0.5) * 0.5, 0.02 + i * 0.012, (r() - 0.5) * 0.5], [0, r() * Math.PI, 0]);
    partes.push(pintar(mancha, i % 2 ? PAL.hojarasca2 : PAL.hojarasca));
  }
  return fusionar(partes);
}

export function geomPiedra(seed = 6) {
  const r = rng(seed);
  const roca = new THREE.DodecahedronGeometry(0.32, 0);
  poner(roca, [0, 0.14, 0], [r() * 0.6, r() * Math.PI, r() * 0.6], [1.25, 0.7, 1]);
  const capa = new THREE.DodecahedronGeometry(0.18, 0);
  poner(capa, [0.12, 0.24, 0.05], [0, r() * Math.PI, 0], [1, 0.55, 1]);
  return fusionar([pintar(roca, PAL.piedra), pintar(capa, PAL.liquen)]);
}

/* -------------------------------------------------------------------------- */
/*  Distribución: la vega del mango abajo, el huerto de cítricos arriba        */
/* -------------------------------------------------------------------------- */

/*
 * Los MANGOS viven FIJOS en la vega caliente (z > 4, la parte plana): pocos y
 * MONUMENTALES — finca campesina, no plantación. El PRIMERO es el héroe: el
 * palo del patio, al lado de la casa (todo patio de tierra caliente tiene su
 * palo 'e mango). El ORDEN importa: se recorta por tier con slice y hasta
 * 'bajo' conserva el héroe + uno.
 */
export const SITIOS_MANGO = [
  { p: [-4.2, 8.6], esc: 1.7 }, // EL HÉROE: el palo del patio
  { p: [8.5, 12.0], esc: 1.45 },
  { p: [15.0, 6.5], esc: 1.2 },
  /* Este palo estaba en [-13.5, 15.0], que resultó ser justo donde se para la
     cámara: quedaba DETRÁS del cuadro (no aportaba nada) y a la vez le cerraba
     el paso a cualquier giro — con él ahí, el sobre de órbita limpio era cero.
     Bajado a media vega hace las dos cosas bien: entra en cuadro y arma la capa
     intermedia entre el palo del patio (cerca) y el huerto de arriba (lejos),
     que es la que da la profundidad donde se lee la escala. */
  { p: [4.5, 4.0], esc: 1.3 },
  { p: [3.0, 16.5], esc: 1.35 },
];

/*
 * El huerto de CÍTRICOS vive ladera ARRIBA (z < -4, ya en clima medio), en
 * matas de 3–5 alrededor de un centro — como siembra el campesino, por golpes,
 * NUNCA en cuadrícula. Cada mata tiene su variedad dominante:
 * 0 = naranjo · 1 = mandarino · 2 = limonero. El orden reparte las tres
 * variedades primero, para que todo tier las conserve.
 */
export const MATAS_CITRICOS = [
  { c: [-6.0, -6.5], n: 5, variante: 0 },
  { c: [3.5, -8.5], n: 4, variante: 1 },
  { c: [-1.0, -12.5], n: 4, variante: 2 },
  { c: [8.5, -5.5], n: 4, variante: 0 },
  { c: [-11.5, -10.5], n: 4, variante: 1 },
  { c: [11.5, -11.5], n: 3, variante: 2 },
];

/* La casa campesina vive en la vega, a la sombra del mango del patio. */
export const SITIO_CASA = /** @type {[number, number]} */ ([-9.5, 11.0]);

/*
 * LA CÁMARA — vive junto a la geografía, no dentro de la escena, para que el
 * diagnóstico de encuadre (`scripts/diag/encuadre-mundo.mjs frutales`) lea la
 * MISMA que se monta y no pueda quedar desfasado.
 *
 * El plano está elegido, no heredado. Se para en la vega, a la izquierda y a
 * media altura de la copa del palo del patio, y mira cruzado hacia el huerto de
 * arriba. Así el mango entra por la derecha ENORME —tanto que se sale un poco
 * del cuadro, y por eso se siente monumental— mientras la ladera se abre hacia
 * el fondo con los cítricos chiquitos en la banda alta. Esa comparación DENTRO
 * DE UN MISMO CUADRO es la lección entera: el mango abajo, los cítricos arriba.
 *
 * Medido contra el papal, que es el mundo aprobado con que se calibra la casa:
 *
 *                      papal    frutales
 *   cielo               32.8%     31.7%
 *   TERRENO tercio alto  0.6%      0.0%   (0 = la cámara no está enterrada)
 *   cultivo en cuadro   59.4%     43.9%
 *
 * El cultivo queda por debajo del papal A PROPÓSITO y por la verdad del mundo:
 * un papal es un lote tupido que tapa todo el suelo, y esto es un HUERTO
 * CAMPESINO de cinco palos y unas matas — entre árbol y árbol hay vega, y esa
 * vega es el piso de la lección. Cae en la banda del yucal (52.5) y el quinual
 * (38.1), que es donde honestamente cae un mundo de copas sueltas.
 *
 * Lo que sí no se negocia: el mango ocupa 10.9× el cuadro del cítrico. La
 * escala no se explica, se ve.
 *
 * (Antes: pos [2.5, 5.2, 19] → 100% del cuadro era UNA copa a 0,2 m. La cámara
 * estaba metida dentro de las hojas del mango del sitio 5.)
 */
export const CAMARA = {
  reposo: /** @type {[number, number, number]} */ ([-12.4, 5.3, 11.0]),
  mirada: /** @type {[number, number, number]} */ ([6.1, 6.4, -5.6]),
  fov: 50,
};

/*
 * EL SOBRE DE ÓRBITA — medido, no supuesto.
 *
 * Este encuadre es angosto y carga la lección, así que los límites no se
 * eligieron «a ojo»: se barrió el volumen entero que el usuario puede alcanzar
 * y se recortó a lo que cumple las dos condiciones a la vez —que la cámara
 * nunca entre en una copa, y que el cítrico NO desaparezca del cuadro—.
 *
 * Lo segundo resultó ser lo apretado. Barriendo el azimut, la lección solo
 * sobrevive entre −0.96 y −0.78 rad: pasado −0.76 el palo de mango se come el
 * cuadro y el huerto de arriba cae a 0.0% — o sea, el mundo dejaría de enseñar
 * lo único que vino a enseñar. Justo por eso este mundo va SIN autoRotate: una
 * deriva de diez segundos bastaba para dejar la escena sin cítricos, y la foto
 * podía caer ahí. La vida la pone el `respiro` del CamaraDirector.
 */
export const ORBITA = {
  distMin: 23.8,
  distMax: 26.0,
  polarMin: 0.95,
  polarMax: 1.68,
  azimutMin: -0.96,
  azimutMax: -0.78,
};

/**
 * Siembra determinista de la finca frutalera completa. Devuelve items por
 * especie: `{pos, rotY, escala, tint}` (contrato del componente `Especie`).
 * En los FRUTOS el `tint` ES el color real y en el cítrico `escala` es un
 * VECTOR [x,y,z]: la proporción distingue naranja / mandarina / limón.
 * (A diferencia del cafetal, aquí la calidad del tier NO cambia la siembra:
 * los frutos cuelgan de FALDA_MANGO y COPA_CITRICO, anillos que todo tier
 * dibuja — el parámetro `_q` queda reservado por simetría de contrato.)
 */
export function distribucionFrutales(conteos, seed = 421, _q = 1) {
  const c = conteos;
  const rMan = rng(seed + 1);
  const rCit = rng(seed + 2);
  const rFru = rng(seed + 3);
  const rSue = rng(seed + 4);
  const rAza = rng(seed + 5);

  // --- Los mangos de la vega (fijos, recortados por tier). ---
  const sitiosMango = SITIOS_MANGO.slice(0, c.mango).map((s) => ({
    ...s,
    rotY: rMan() * Math.PI * 2,
  }));
  const mango = sitiosMango.map((s) => ({
    pos: [s.p[0], alturaFinca(s.p[0], s.p[1]), s.p[1]],
    rotY: s.rotY,
    escala: s.esc,
    tint: [0.93 + rMan() * 0.14, 0.93 + rMan() * 0.14, 0.93 + rMan() * 0.14],
  }));

  // --- El fruto del mango: colgado del anillo de la FALDA de la copa (la
  //     misma que dibuja geomMango), con su pedúnculo largo en la geometría.
  //     En racimos de 2–3, como carga el mango de azúcar. ---
  const verde = new THREE.Color(PAL.mangoVerde);
  const pinton = new THREE.Color(PAL.mangoPinton);
  const maduro = new THREE.Color(PAL.mangoMaduro);
  const col = new THREE.Color();
  const mangoFruto = [];
  let mi = 0;
  while (mangoFruto.length < c.mangoFruto && sitiosMango.length > 0) {
    const s = sitiosMango[mi % sitiosMango.length];
    mi += 1;
    if (mi > c.mangoFruto * 3) break;
    const a = rFru() * Math.PI * 2;
    const rad = FALDA_MANGO.radMin + rFru() * (FALDA_MANGO.radMax - FALDA_MANGO.radMin);
    const cuantos = 2 + Math.floor(rFru() * 2);
    for (let k = 0; k < cuantos && mangoFruto.length < c.mangoFruto; k++) {
      const ak = a + (rFru() - 0.5) * 0.22;
      const radk = rad + (rFru() - 0.5) * 0.2;
      const m = rFru(); // madurez del fruto
      if (m < 0.45) col.lerpColors(verde, pinton, m / 0.45);
      else col.lerpColors(pinton, maduro, (m - 0.45) / 0.55);
      col.multiplyScalar(0.94 + rFru() * 0.12);
      mangoFruto.push({
        pos: [
          s.p[0] + Math.cos(ak) * radk * s.esc,
          alturaFinca(s.p[0], s.p[1]) + (FALDA_MANGO.y + (rFru() - 0.5) * 0.3) * s.esc,
          s.p[1] + Math.sin(ak) * radk * s.esc,
        ],
        rotY: rFru() * Math.PI * 2,
        escala: (0.8 + rFru() * 0.45) * Math.min(1.15, s.esc * 0.75),
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- El huerto de cítricos: matas por golpes, jitter alrededor del centro
  //     (nunca cuadrícula), recortadas PAREJO entre matas por tier. ---
  const arbolitos = [];
  MATAS_CITRICOS.forEach((mata, im) => {
    for (let i = 0; i < mata.n; i++) {
      const a = rCit() * Math.PI * 2;
      const rad = 1.3 + rCit() * 1.5;
      const px = mata.c[0] + Math.cos(a) * rad;
      const pz = mata.c[1] + Math.sin(a) * rad;
      arbolitos.push({
        px, pz,
        variante: mata.variante,
        esc: (mata.variante === 0 ? 0.95 : 0.85) + rCit() * 0.25,
        rotY: rCit() * Math.PI * 2,
        carga: rCit(), // qué tan cargado de fruta está
        orden: i * MATAS_CITRICOS.length + im, // intercalado: recorte parejo
      });
    }
  });
  arbolitos.sort((x, y) => x.orden - y.orden);
  const arboles = arbolitos.slice(0, c.citrico);

  const citrico = arboles.map((s) => ({
    pos: [s.px, alturaFinca(s.px, s.pz), s.pz],
    rotY: s.rotY,
    escala: s.esc,
    tint: [0.93 + rCit() * 0.14, 0.93 + rCit() * 0.14, 0.93 + rCit() * 0.14],
  }));

  // --- El fruto cítrico: PEGADO al ramaje (sobre la superficie de la misma
  //     copa que dibuja geomCitrico), en golpes de 2–4. Color y PROPORCIÓN por
  //     variedad: naranja esfera, mandarina achatada, limón pajarito ovoide y
  //     VERDE (en Colombia el limón se coge verde). ---
  const cNaranja = new THREE.Color(PAL.naranjaMadura);
  const cMandarina = new THREE.Color(PAL.mandarinaMadura);
  const cLimonV = new THREE.Color(PAL.limonVerde);
  const cLimonP = new THREE.Color(PAL.limonPinton);
  const cVerde = new THREE.Color(PAL.citricoVerde);
  const citricoFruto = [];
  const cargados = arboles.filter((s) => s.carga > 0.22);
  let ci = 0;
  while (citricoFruto.length < c.citricoFruto && cargados.length > 0) {
    const s = cargados[ci % cargados.length];
    ci += 1;
    if (ci > c.citricoFruto * 3) break;
    const a0 = rFru() * Math.PI * 2;
    const inc0 = -0.25 + rFru() * 1.1; // del ecuador hacia arriba (donde da el sol)
    const cuantos = 2 + Math.floor(rFru() * 3);
    for (let k = 0; k < cuantos && citricoFruto.length < c.citricoFruto; k++) {
      const a = a0 + (rFru() - 0.5) * 0.5;
      const inc = clamp(inc0 + (rFru() - 0.5) * 0.4, -0.5, 1.25);
      const dx = Math.cos(a) * Math.cos(inc);
      const dy = Math.sin(inc);
      const dz = Math.sin(a) * Math.cos(inc);
      const madurez = rFru();
      let esc;
      if (s.variante === 0) {
        // naranjo: la esfera clásica
        col.copy(madurez < 0.3 ? cVerde : cNaranja);
        const t = 0.9 + rFru() * 0.3;
        esc = [t, t * 0.97, t];
      } else if (s.variante === 1) {
        // mandarino: más chica y ACHATADA, carga pesado
        col.copy(madurez < 0.22 ? cVerde : cMandarina);
        const t = 0.72 + rFru() * 0.22;
        esc = [t * 1.08, t * 0.76, t * 1.08];
      } else {
        // limonero: el pajarito ovoide, verde o apenas pintón
        col.lerpColors(cLimonV, cLimonP, madurez * madurez);
        const t = 0.62 + rFru() * 0.2;
        esc = [t * 0.86, t * 1.14, t * 0.86];
      }
      col.multiplyScalar(0.94 + rFru() * 0.12);
      citricoFruto.push({
        pos: [
          s.px + dx * COPA_CITRICO.rad * 0.94 * s.esc,
          alturaFinca(s.px, s.pz) + (COPA_CITRICO.y + dy * COPA_CITRICO.rad * 0.88) * s.esc,
          s.pz + dz * COPA_CITRICO.rad * 0.94 * s.esc,
        ],
        rotY: rFru() * Math.PI * 2,
        escala: esc,
        tint: [col.r, col.g, col.b],
      });
    }
  }

  // --- El AZAHAR: sobre las copas MENOS cargadas (el cítrico que no está en
  //     cosecha está en flor — los dos tiempos conviven en el huerto). ---
  const azahar = [];
  const floridos = arboles.filter((s) => s.carga <= 0.55);
  let fi = 0;
  while (azahar.length < (c.azahar || 0) && floridos.length > 0) {
    const s = floridos[fi % floridos.length];
    fi += 1;
    if (fi > (c.azahar || 0) * 3) break;
    const a = rAza() * Math.PI * 2;
    const inc = 0.1 + rAza() * 1.1;
    const dx = Math.cos(a) * Math.cos(inc);
    const dy = Math.sin(inc);
    const dz = Math.sin(a) * Math.cos(inc);
    azahar.push({
      pos: [
        s.px + dx * COPA_CITRICO.rad * 0.99 * s.esc,
        alturaFinca(s.px, s.pz) + (COPA_CITRICO.y + dy * COPA_CITRICO.rad * 0.94) * s.esc,
        s.pz + dz * COPA_CITRICO.rad * 0.99 * s.esc,
      ],
      rotY: rAza() * Math.PI * 2,
      escala: 0.85 + rAza() * 0.4,
      tint: [1, 0.99 - rAza() * 0.02, 0.96 - rAza() * 0.03],
    });
  }

  // --- El suelo de la vega: hojarasca bajo los mangos (el mango bota hoja
  //     todo el año), piedras sueltas en el plano caliente. ---
  const hojarasca = [];
  for (let i = 0; i < c.hojarasca; i++) {
    const s = sitiosMango[i % Math.max(1, sitiosMango.length)] || { p: [0, 10], esc: 1 };
    const a = rSue() * Math.PI * 2;
    const rad = (0.8 + rSue() * 1.8) * s.esc;
    const x = s.p[0] + Math.cos(a) * rad;
    const z = s.p[1] + Math.sin(a) * rad;
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
    const z = 3 + rSue() * 14; // las piedras viven en la vega caliente
    piedra.push({
      pos: [x, alturaFinca(x, z), z],
      rotY: rSue() * Math.PI * 2,
      escala: 0.7 + rSue() * 0.9,
      tint: [0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16, 0.92 + rSue() * 0.16],
    });
  }

  return { mango, mangoFruto, citrico, citricoFruto, azahar, hojarasca, piedra };
}

/** Los centros de sombra de los mangos del tier (para la luz colada bajo el
    domo: la sombra del palo de mango ES el lugar social de la tierra caliente). */
export function centrosMango(conteos) {
  return SITIOS_MANGO.slice(0, conteos.mango).map((s) => ({
    centro: /** @type {[number, number, number]} */ ([s.p[0], alturaFinca(s.p[0], s.p[1]), s.p[1]]),
    radio: 2.4 * s.esc,
  }));
}
