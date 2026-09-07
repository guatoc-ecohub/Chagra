/*
 * sierraRelieve — LA LEY DE ALTURA del macizo, como DATO puro (cero three,
 * cero React). La vista global, el DESCENSO y la BÓVEDA la importan de aquí:
 * una sola montaña, una sola costa, un solo lecho marino.
 *
 * Por qué existe (§5.3 del diseño `DISENO-TRANSICION-CLIMAS-20260902.md`): el
 * bug clásico —diagnosticado en el steal `TheLongSilence`— es que el suelo del
 * recorrido sea una escena aparte con su propia ley de generación; a los dos
 * días el mapa orbital y el paseo muestran montañas distintas. Aquí la ley es
 * UNA y vive fuera de las vistas.
 *
 * ✅ INTEGRADO (2026-09-05, FABLE-SIERRA-COSTERO): `VistaGlobalSierra.jsx` ya
 * NO conserva copia local de `alturaSierra()`: la importa de aquí. El test
 * `sierraRelieve.equivalencia.test.js` pasó de comparar dos textos a exigir
 * que no haya dos textos.
 *
 * ── LO QUE TRAJO EL MUNDO COSTERO (`~/demos/mundo-costero/costero/TerrenoCostero.js`,
 *    `arboles/RNG.js`) ──────────────────────────────────────────────────────
 *  · `costaZ(x)`: la línea de costa deja de ser una regla. Bahías cóncavas entre
 *    puntas, un PROMONTORIO rocoso al occidente donde la estribación occidental
 *    sale al mar (los cerros de Tayrona), una punta baja al oriente y el leve
 *    abombamiento del delta de Palomino. Y la pieza que hace que el agua y la
 *    tierra coincidan EXACTAMENTE: la misma función analítica alimenta el
 *    campo del mar (`marSierra.js`) y la malla del terreno.
 *  · El LECHO MARINO: antes `-0,15` plano bajo toda la costa (una lámina
 *    verde-azul). Ahora una plataforma que cae desde la orilla (1:36 en la playa,
 *    más brava bajo el promontorio) hasta el talud: es lo que da la banda
 *    turquesa somera, la rompiente por pendiente y el azul hondo del Caribe.
 *  · `Ruido` (simplex 2D sembrado con mulberry32, calco de `RNG.js`): la
 *    ladera gana CRESTAS Y VAGUADAS con `ridged()` en tres octavas, en vez de
 *    tres senos. Un macizo son cordales sucesivos («materia de
 *    cordillera», la mirada de paisaje), no una cúpula.
 *  · `esculpirLaguna`: cuenco + morrena determinista (min/max) para las lagunas
 *    de páramo; el labio anular garantiza que la lámina nunca sobrevuele la
 *    ladera (lección del costero).
 *
 * ── LO QUE NO SE TOCA ──────────────────────────────────────────────────────
 *  CIMA = 5,0 (5 775 m), COSTA_Z = −3 (y `costaZ(0) === COSTA_Z`, así el descenso
 *  por x = 0 aterriza donde siempre), los picos gaussianos (Colón, Bolívar,
 *  Simmonds, las dos estribaciones) y los topes de `BANDAS_SIERRA`. Las crestas
 *  se apagan hacia la cumbre para no mover los 5,0 de Colón·Bolívar.
 *
 * ESCALA: `CIMA = 5.0` unidades de mundo ↔ 5 775 msnm (cota IGAC del Pico
 * Cristóbal Colón). De ahí `METROS_POR_UNIDAD ≈ 1155`, que es la constante con
 * la que la tabla canónica `PISOS_TERMICOS_SIERRA` derivó sus `topeWorldY`.
 */
import { BANDAS_SIERRA } from '../pisosTermicos.js';

/* ── Geografía del macizo. Coordenadas de MUNDO: X = occidente(−) → oriente(+),
      Y = altura, Z = norte(mar, −) → sur(cumbres, +). ── */
export const CIMA = 5.0; // altura de referencia (≈ 5.775 m escalados)
export const COSTA_Z = -3; // latitud de la línea de costa en Z (en x = 0)
export const ANCHO = 22; // extensión E-O del terreno
export const FONDO = 20; // extensión N-S del terreno

/** Cumbre en metros (IGAC). Espejo del canon; se importa de la tabla si hace falta. */
export const CUMBRE_M = 5775;

/** Metros de altitud por unidad de mundo (5775 / 5.0). La escala de §2.2. */
export const METROS_POR_UNIDAD = CUMBRE_M / CIMA;

/** msnm → altura de mundo. */
export function yDeMsnm(m) {
  return m / METROS_POR_UNIDAD;
}

/** altura de mundo → msnm. */
export function msnmDeY(y) {
  return y * METROS_POR_UNIDAD;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export function gauss(wx, wz, cx, cz, sx, sz) {
  const dx = wx - cx, dz = wz - cz;
  return Math.exp(-((dx * dx) / (2 * sx * sx) + (dz * dz) / (2 * sz * sz)));
}

/* Ruido determinista (hash de senos): mismo macizo siempre, sin Math.random.
   Se conserva para el MOTEADO del manto (vista global) y como término fino. */
export function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.9 + wz * 0.7) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 2.1) * 0.28 +
    Math.sin(wx * 2.9 + wz * 2.3 + 4.7) * 0.16
  );
}

/* ═══════════════ Ruido simplex sembrado (traído de costero/arboles/RNG.js) ═══════════════ */

/** PRNG mulberry32: la semilla decide TODO; cero Math.random. */
export function mulberry32(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRAD3 = new Float32Array([
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
  1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
  0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
]);

/** Simplex 2D + fBm + ridged, sembrados. Calco de `Ruido` del mundo costero. */
export class Ruido {
  constructor(semilla = 1337) {
    const r = mulberry32(semilla);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    this.perm = new Uint8Array(512);
    this.permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.permMod12[i] = this.perm[i] % 12;
    }
  }

  simplex2(xin, yin) {
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s), j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t, Y0 = j - t;
    const x0 = xin - X0, y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) { const gi0 = this.permMod12[ii + this.perm[jj]] * 3; t0 *= t0; n0 = t0 * t0 * (GRAD3[gi0] * x0 + GRAD3[gi0 + 1] * y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) { const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]] * 3; t1 *= t1; n1 = t1 * t1 * (GRAD3[gi1] * x1 + GRAD3[gi1 + 1] * y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) { const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]] * 3; t2 *= t2; n2 = t2 * t2 * (GRAD3[gi2] * x2 + GRAD3[gi2 + 1] * y2); }
    return 70 * (n0 + n1 + n2);
  }

  /** Ruido fractal (fBm) en [-1,1] aprox. */
  fbm(x, y, octavas = 5, lac = 2.0, gan = 0.5) {
    let amp = 1, frec = 1, suma = 0, norm = 0;
    for (let o = 0; o < octavas; o++) {
      suma += amp * this.simplex2(x * frec, y * frec);
      norm += amp;
      amp *= gan; frec *= lac;
    }
    return suma / norm;
  }

  /** Ruido con crestas: sirve para cordilleras. [-1,1] aprox. */
  ridged(x, y, octavas = 5, lac = 2.0, gan = 0.5) {
    let amp = 1, frec = 1, suma = 0, norm = 0;
    for (let o = 0; o < octavas; o++) {
      const n = 1 - Math.abs(this.simplex2(x * frec, y * frec));
      suma += amp * n * n;
      norm += amp;
      amp *= gan; frec *= lac;
    }
    return (suma / norm) * 2 - 1;
  }
}

/* Semilla fija: la MISMA Sierra siempre (el gate compara capturas). */
const RUIDO = new Ruido(20260905);

/* ═══════════════════════════ LA COSTA ═══════════════════════════ */

/* El perfil de la costa (desplazamiento en z respecto a COSTA_Z), en función de x:
   · bahías cóncavas de ~2 u entre puntas (dos senos, como `costaZ` del costero);
   · el PROMONTORIO occidental (x ≈ −6,2): la estribación occidental —centrada
     en x −4,5— baja al mar como cerro rocoso (Tayrona) y empuja la costa 0,85 u
     hacia el norte;
   · una punta baja al oriente (x ≈ 8,8);
   · el delta de Palomino (x = 5): el río empuja la playa apenas 0,12 u. */
function perfilCosta(x) {
  const bahias = 0.32 * Math.sin(x * 0.52 + 0.9) + 0.14 * Math.sin(x * 1.35 + 2.4);
  const promontorio = -0.85 * Math.exp(-(((x + 6.2) / 1.4) ** 2));
  const punta = -0.35 * Math.exp(-(((x - 8.8) / 1.5) ** 2));
  const delta = -0.12 * Math.exp(-(((x - 5.0) / 0.5) ** 2));
  return bahias + promontorio + punta + delta;
}
const PERFIL_COSTA_EN_0 = perfilCosta(0);

/** Línea de costa: z de la orilla para cada x. `costaZ(0) === COSTA_Z` exacto. */
export function costaZ(x) {
  return COSTA_Z + perfilCosta(x) - PERFIL_COSTA_EN_0;
}

/** Distancia firmada a la costa: > 0 tierra adentro, < 0 mar adentro. */
export function distCosta(wx, wz) {
  return wz - costaZ(wx);
}

/** Cuánto «promontorio» hay en x (0 playa tendida … 1 cerro rocoso al mar). */
export function pesoPromontorio(x) {
  return Math.exp(-(((x + 6.2) / 1.7) ** 2));
}

/**
 * Exposición al oleaje, 0..1 (1 = mar abierto). Al abrigo del promontorio y
 * dentro de las bahías más cerradas la rompiente se calma. Es el `fetchFn` que
 * consume `marSierra.js` (equivalente a `fetchMar` del costero).
 */
export function exposicionMar(wx, wz) {
  const abrigo = Math.exp(-(((wx + 5.0) / 1.3) ** 2)) * smoothstep(-1.4, 0.2, wz - costaZ(wx));
  return 1 - 0.55 * abrigo;
}

/* ═══════════════════════ LAS LAGUNAS DE PÁRAMO ═══════════════════════ */

/**
 * Lagunas glaciares del páramo (banda 3 000–4 000 m, y ∈ [2,6, 3,45]): cuencos
 * de sobreexcavación con su morrena. Dos en la cara norte, lejos de x = 0 (el
 * descenso baja por ahí) y a cotas distintas. `nivel` se fija al ESCULPIR: la
 * lámina va 0,02 u (≈ 23 m) por debajo del terreno original del centro, y el
 * cuenco cae 0,005 u más (≈ 6 m de agua: con turba y turbiedad ya es opaco).
 * `radio` es el del espejo.
 */
export const LAGUNAS_PARAMO = [
  /* hombro llano (11°) al occidente de Bolívar, 3 557 m — la laguna grande */
  { id: 'naboba', x: -2.4, z: 2.65, radio: 0.42 },
  /* circo en la cara norte de Simmonds, 3 818 m — la laguna alta */
  { id: 'sintana', x: 2.9, z: 1.2, radio: 0.3 },
];

/* Altura del macizo SIN lagunas (para fijar el nivel de cada una una sola vez). */
function alturaMacizo(wx, wz) {
  const d = distCosta(wx, wz);
  const s = clamp(d / 13, 0, 1); // rampa costa→interior
  let h = Math.pow(s, 0.9) * CIMA * 0.42;
  h += gauss(wx, wz, 0.6, 3.8, 1.9, 2.4) * CIMA * 0.4; // Pico Cristóbal Colón
  h += gauss(wx, wz, -1.4, 4.4, 1.8, 2.2) * CIMA * 0.38; // Pico Simón Bolívar
  h += gauss(wx, wz, 2.9, 2.9, 1.7, 2.1) * CIMA * 0.42; // Pico Simmonds
  h += gauss(wx, wz, -4.5, 0.6, 3.0, 3.0) * CIMA * 0.16; // estribación occidental
  h += gauss(wx, wz, 5.0, -0.4, 3.0, 3.0) * CIMA * 0.13; // estribación oriental
  h += ruido(wx, wz) * CIMA * 0.04 * s; // el término fino de siempre, a la mitad
  /* CRESTAS Y VAGUADAS (ruido `ridged` traído del costero). Entran ya a 0,4 u de
     la costa (la cara norte es lo que se ve) y se APAGAN hacia la cumbre (gauss
     centrado en Colón·Bolívar) para que los 5,0 u no se muevan. */
  /* ANISÓTROPO: la cara norte de la Sierra se drena por valles PARALELOS N-S
     (Palomino, Don Diego, Buritaca, Guachaca): espolones largos en z, angostos en
     x (paso ≈ 2,5 u), con un leve sesgo diagonal para que no salgan de regla; y
     una octava isótropa fina que rompe la regularidad. Ridged isótropo daba
     bultos (medido en la v3): un macizo son cordales, no lomas. */
  const espolones = RUIDO.ridged(wx * 0.40 + wz * 0.07 + 3.1, wz * 0.11 - 1.7, 2, 2.0, 0.45);
  const fino = RUIDO.ridged(wx * 1.1 + 7.3, wz * 1.1 + 2.9, 2, 2.0, 0.5);
  const cresta = espolones * 0.78 + fino * 0.22;
  const envolvente = smoothstep(0.4, 2.6, d) * (1 - 0.85 * gauss(wx, wz, -0.4, 4.1, 1.9, 1.6));
  h += cresta * CIMA * 0.11 * envolvente;
  /* El promontorio: roca que sube rápido desde la orilla (acantilado corto).
     El fbm solo se evalúa donde el promontorio pesa (el campo del mar muestrea
     262 k puntos al arrancar: cada exp cuenta en el Pixel). */
  const pp = pesoPromontorio(wx);
  if (pp > 1e-3) h += 0.32 * pp * smoothstep(0.05, 0.5, d) * (0.8 + 0.2 * RUIDO.fbm(wx * 1.7, wz * 1.7, 3));
  h *= smoothstep(-1.2, 1.0, d); // aplana hacia la costa (mismo grosor de antes, sobre la costa REAL)
  return Math.max(0.004, h);
}

/* El nivel de cada laguna se deriva UNA vez del macizo: es la cota MÁS BAJA del
   borde (aguas abajo) menos 0,004 u. Así el cuenco es un CIRCO excavado en la
   ladera —cabecera al sur, labio natural al norte— y no hace falta dique: un
   anillo levantado 100 m sobre una ladera de 11° salía como una pared negra a
   contraluz en una celda de la malla (medido al 300 %). */
for (const L of LAGUNAS_PARAMO) {
  let minBorde = Infinity;
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2;
    minBorde = Math.min(minBorde, alturaMacizo(L.x + Math.cos(ang) * L.radio, L.z + Math.sin(ang) * L.radio));
  }
  L.nivel = minBorde - 0.004;
}

/**
 * Cuenco DETERMINISTA sobre el macizo (min): el lecho no depende del ruido.
 * Calco en unidades de mundo de `esculpirLaguna` del costero, sin su morrena
 * (el nivel se fija en el borde bajo: el labio es el terreno).
 */
export function esculpirLaguna(h, wx, wz, L) {
  const rl = Math.hypot(wx - L.x, wz - L.z);
  const R = L.radio;
  if (rl > R * 1.15) return h;
  /* cuenco somero (0,005 u ≈ 6 m: con la turba y la turbiedad el agua ya es opaca a
     0,5 m_eq). Solo EXCAVA (min): la cabecera del circo queda tallada en la ladera y
     el labio de aguas abajo es el terreno natural, que ya está sobre el nivel. */
  h = Math.min(h, L.nivel + 0.004 - 0.005 * smoothstep(R * 1.15, R * 0.45, rl));
  return h;
}

/* ═══════════════════════ LA LEY DE ALTURA ═══════════════════════ */

/**
 * Altura del terreno en un punto de mundo, en unidades (1 u = 1 155 m).
 * Mar adentro (`distCosta < 0`) devuelve el LECHO MARINO (negativo): plataforma
 * que cae desde la orilla hasta el talud. Tierra adentro, el macizo con sus
 * crestas y sus lagunas. Analítica y global: vale fuera de la malla.
 */
export function alturaSierra(wx, wz) {
  const d = distCosta(wx, wz);
  if (d < 0) {
    /* ── PLATAFORMA MARINA: 1:36 en la playa tendida, se empina bajo el
          promontorio (roca), y cae al talud (tope 0,16 u ≈ 185 m: más hondo la
          malla no lo ve y el color del agua ya es el del Caribe abierto). ── */
    const u = -d;
    let p = u * 0.028 * (1 + u / 1.6);
    p *= 1 + 1.6 * pesoPromontorio(wx) * smoothstep(0.6, 0.05, u);
    p = Math.min(0.16, p);
    /* barras de arena somera (solo en la plataforma): nunca por encima del nivel */
    if (u > 0.08 && u < 1.0) p += 0.004 * RUIDO.fbm(wx * 3.1 + 7, wz * 3.1, 3) * smoothstep(0.08, 0.4, u) * smoothstep(1.0, 0.7, u);
    return -Math.max(0.004, p);
  }
  let h = alturaMacizo(wx, wz);
  for (const L of LAGUNAS_PARAMO) h = esculpirLaguna(h, wx, wz, L);
  return h;
}

/**
 * EL FALDÓN: la misma ley fuera de la malla principal (|x| > 11, z > 10),
 * cayendo hacia el valle del Cesar al sur y hacia las llanuras al E y al O. Es
 * lo que impide que el borde de la malla corte la ladera en seco contra el
 * cielo. Dentro de la malla principal devuelve EXACTAMENTE `alturaSierra`.
 */
export function alturaFaldon(wx, wz) {
  const h = alturaSierra(wx, wz);
  if (h <= 0) return h;
  return h * (1 - smoothstep(10, 19, wz)) * (1 - smoothstep(11, 20, Math.abs(wx)));
}

/* ── Color por altura: EL DESCENSO HEREDA LA SIERRA, no inventa su paleta ────
 *
 * El 2026-09-02 se midió que el descenso y la vista global NO se leían como el
 * mismo macizo: el verde de la vista global daba rgb(91,120,51) y el del
 * descenso rgb(45,66,33), porque cada uno leía un juego de colores distinto del
 * MISMO archivo — `pisosTermicos.js` exponía dos (los ocres de
 * `PISOS_TERMICOS_SIERRA` y los verdes/fríos de `PISOS_TERMICOS`) y los dos
 * decían «leo la tabla canónica». `a5343eb84` tapó el síntoma copiando acá los
 * valores del Paso 2 y dejó la pregunta de arte escrita para el operador.
 *
 * ✅ CERRADO (2026-09-02, «unifica»): ya no hay dos juegos. `pisosTermicos.js`
 * tiene UNA tabla, cuyo color se deriva de `PISOS_TERMICOS` con dos excepciones
 * de render declaradas (playa = arena, nival = blanco frío para que la cima lea
 * NIEVE bajo la hora dorada). Este archivo dejó de copiar valores: los LEE. Los
 * números resultantes son idénticos a los que había —fueron medidos contra
 * ellos—, así que el descenso no cambia un pixel; lo que cambia es que ya no
 * pueden divergir.
 *
 * 🔴 El orden IMPORTA: `BANDAS_SIERRA` llega MAR→CIMA con `Infinity` de último,
 * que es como `colorPorAlturaRGB` la recorre. Al revés, el índice se queda en 0
 * y toda cota devuelve la primera banda — el bug que se midió acá ese mismo día.
 * La cota de la línea de nieve (4.15) tampoco se declara ya en este archivo:
 * viene como el tope del superpáramo. ── */
const BANDAS_RGB = BANDAS_SIERRA.map((b) => ({
  id: b.id,
  tope: b.tope,
  rgb: hexARgb(b.hexColor),
}));

/** Los IDs de las 7 bandas canónicas, de mar a cima. */
export const IDS_BANDA = BANDAS_RGB.map((b) => b.id);

/*
 * El ANCHO del cruce entre bandas: la perilla del contraste. Los dos valores
 * son los que el PASO 2 midió y dejó en producción — interior angosto para que
 * se lean SIETE pisos y no tres, y línea de nieve casi a filo para que la cima
 * lea NIEVE y no un difuminado ocre. Viven acá, en un solo lugar, para que
 * afinarlos no obligue a tocar dos archivos.
 */
export const ANCHO_CRUCE_BANDA = 0.09;
export const ANCHO_CRUCE_NIEVE = 0.02;

/** '#rrggbb' → [r,g,b] en 0..1 (sRGB tal cual, sin conversión de espacio). */
export function hexARgb(hex) {
  const s = String(hex).replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/(.)/g, '$1$1') : s, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Color de ladera para una altura de mundo, mezclando entre bandas.
 * Devuelve `[r,g,b]` 0..1. Es la MISMA ley que pinta la vista global.
 */
export function colorPorAlturaRGB(y) {
  let i = 0;
  while (i < BANDAS_RGB.length - 1 && y > BANDAS_RGB[i].tope) i++;
  if (i === 0) return BANDAS_RGB[0].rgb.slice();
  const borde = BANDAS_RGB[i - 1].tope;
  const esNieve = i === BANDAS_RGB.length - 1;
  const ancho = esNieve ? ANCHO_CRUCE_NIEVE : ANCHO_CRUCE_BANDA;
  const t = smoothstep(borde - ancho, borde + ancho, y);
  const a = BANDAS_RGB[i - 1].rgb;
  const b = BANDAS_RGB[i].rgb;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/**
 * Perfil de la ladera a lo largo de una línea N-S en un `wx` dado: devuelve el
 * `wz` donde el terreno alcanza esa altura de mundo, buscando desde el mar
 * hacia la cumbre. Es lo que usa la cámara del descenso para "seguir la
 * ladera" sin inventar una montaña propia. `null` si esa cota no existe en esa
 * línea (por ejemplo pedir 5.0 en una estribación).
 */
export function wzDeAltura(yObjetivo, wx = 0, { desde = COSTA_Z, hasta = 6.5, pasos = 160 } = {}) {
  let prevZ = desde;
  let prevH = alturaSierra(wx, desde);
  for (let i = 1; i <= pasos; i++) {
    const z = desde + ((hasta - desde) * i) / pasos;
    const h = alturaSierra(wx, z);
    if ((prevH - yObjetivo) * (h - yObjetivo) <= 0 && h !== prevH) {
      const t = (yObjetivo - prevH) / (h - prevH);
      return prevZ + (z - prevZ) * t;
    }
    prevZ = z;
    prevH = h;
  }
  return null;
}

/* ─────────────────── el macizo, para pantallas pequeñas ────────────────────
 * La bóveda del clima (`escenas/EscenaBoveda.jsx`) enseñaba la montaña como
 * cuatro troncos de cono de SIETE LADOS con flat-shading: un zigurat
 * heptagonal, cuya faceta se cuenta a simple vista. Es el defecto §2.8 del
 * diseño y viola de frente la regla anti-low-poly.
 *
 * Esto devuelve la MISMA ladera que pintan la vista global y el descenso —
 * misma ley de altura, mismos colores canónicos, mismas cotas— reescalada al
 * espacio de la bóveda. No es "otra montaña más bonita": es la misma montaña.
 * Por eso la puerta del Paso 5 («la pantalla de clima y el descenso enseñan los
 * mismos 7 pisos») se cumple por construcción y no por parecido.
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Malla del macizo escalada a un alto y un radio dados.
 * Devuelve `{ posiciones, colores, indices, ky, maxReal }` (arrays planos, sin
 * three) para
 * que quien la monte arme su `BufferGeometry` sin que este módulo importe la
 * librería de render.
 *
 * @param {object} opts
 * @param {number} opts.alto     alto de destino en unidades de la escena.
 * @param {number} opts.radio    medio ancho de destino.
 * @param {number} [opts.segmentos] resolución de la malla (por lado).
 */
/* La ventana del macizo, en un solo sitio: la usan la malla y `cotasMacizo`.
   Si divergieran, la niebla del páramo dejaría de caer sobre el páramo. */
const CUMBRE_X = -0.1;
const CUMBRE_Z = 4.1;

/**
 * Altura REAL del terreno dentro de la ventana del macizo, en coordenadas de
 * ventana `u,v` ∈ [-0.5, 0.5] (con la caída radial del borde ya aplicada).
 */
export function alturaVentanaMacizo(u, v, ventana = 5.5) {
  const wx = CUMBRE_X + u * 2 * ventana;
  const wz = CUMBRE_Z + v * 2 * ventana;
  const r = Math.min(1, Math.hypot(u, v) / 0.5);
  const falda = 1 - smoothstep(0.62, 1.0, r);
  return Math.max(0, alturaSierra(wx, wz)) * falda;
}

/** El máximo de altura real dentro de la ventana (el que normaliza la malla). */
export function maxAlturaVentana({ ventana = 5.5, segmentos = 72 } = {}) {
  let maxReal = 0;
  for (let iz = 0; iz <= segmentos; iz++) {
    for (let ix = 0; ix <= segmentos; ix++) {
      const h = alturaVentanaMacizo(ix / segmentos - 0.5, iz / segmentos - 0.5, ventana);
      if (h > maxReal) maxReal = h;
    }
  }
  return maxReal;
}

/**
 * LAS COTAS CANÓNICAS DEL MACIZO, ya escaladas al `alto` de la escena que lo
 * monta. Existe para que nadie tenga que ADIVINAR a qué altura del modelo cae
 * una banda: el 2026-09-02 se midió que la «niebla del páramo» de la bóveda
 * estaba plantada con una fórmula suelta (`cima - 0.6 - azar*0.7`) que la
 * dejaba sobre el SUPERPÁRAMO y el NIVAL — tapando de blanco justo las bandas
 * altas que la pantalla debía enseñar. La cota se LEE de la tabla, no se tantea.
 *
 * @returns {{ ky:number, maxReal:number, bandas: Array<{id:string, tope:number, yTope:number, yBase:number, yMedio:number}> }}
 *   `y*` en unidades de la escena (0 = base del macizo, `alto` = cima).
 */
export function cotasMacizo({ alto = 3.5, ventana = 5.5, segmentos = 72 } = {}) {
  const maxReal = maxAlturaVentana({ ventana, segmentos });
  const ky = alto / (maxReal > 0 ? maxReal : CIMA);
  let base = 0;
  const bandas = BANDAS_RGB.map((b) => {
    const tope = Number.isFinite(b.tope) ? b.tope : maxReal;
    const fila = { id: b.id, tope, yBase: base * ky, yTope: tope * ky, yMedio: ((base + tope) / 2) * ky };
    base = tope;
    return fila;
  });
  return { ky, maxReal, bandas };
}

/** Cota media (y de escena) de una banda del macizo escalado a `alto`. */
export function yBandaMacizo(id, opts = {}) {
  const f = cotasMacizo(opts).bandas.find((b) => b.id === id);
  return f ? f.yMedio : null;
}

export function mallaMacizo({ alto = 3.5, radio = 2.4, segmentos = 72, ventana = 5.5 } = {}) {
  /*
   * LA VENTANA, y por qué no es el campo entero. La primera versión muestreaba
   * los 22 × 9 world units completos y el resultado, medido en captura, fue un
   * MONTÍCULO PLANO: la cumbre es un pico angosto dentro de un campo ancho, así
   * que en la tarjeta se veía sobre todo el faldón bajo — verde oscuro de punta
   * a punta, con los 7 pisos ilegibles, y el casquete y la línea ámbar
   * FLOTANDO por encima de una montaña que ya no llegaba hasta ellos. Eso
   * rompía justo la pedagogía que este paso tenía que conservar.
   *
   * Se muestrea una ventana CENTRADA EN LA CUMBRE (x −0,1 · z 4,1, medida sobre
   * la propia ley de altura). A ±5,5 el 41 % del área queda sobre la cota del
   * bosque de niebla, así que la tarjeta enseña montaña alta y no faldón.
   */
  const n = segmentos + 1;
  const kx = radio / ventana;

  /* Caída radial hacia el borde (dentro de `alturaVentanaMacizo`): la ventana
     es un recorte, y sin ella la montaña quedaría cortada a cuchillo en los
     cuatro lados — una meseta flotante. Con ella el macizo se apoya en el
     piso de la tarjeta. La ley vive arriba, en UN solo sitio, porque
     `cotasMacizo` tiene que dar exactamente las mismas cotas. */
  const alturaVentana = (ix, iz) => alturaVentanaMacizo(ix / segmentos - 0.5, iz / segmentos - 0.5, ventana);

  const maxReal = maxAlturaVentana({ ventana, segmentos });
  const ky = alto / (maxReal > 0 ? maxReal : CIMA);

  const posiciones = new Float32Array(n * n * 3);
  const colores = new Float32Array(n * n * 3);
  let p = 0;
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const h = alturaVentana(ix, iz);
      posiciones[p] = (ix / segmentos - 0.5) * 2 * ventana * kx;
      posiciones[p + 1] = h * ky;
      posiciones[p + 2] = (iz / segmentos - 0.5) * 2 * ventana * kx;
      const [r, g, b] = colorPorAlturaRGB(h); // color por la cota REAL, no la escalada
      colores[p] = r;
      colores[p + 1] = g;
      colores[p + 2] = b;
      p += 3;
    }
  }
  const indices = [];
  for (let iz = 0; iz < segmentos; iz++) {
    for (let ix = 0; ix < segmentos; ix++) {
      const a = iz * n + ix;
      const b = a + 1;
      const d = a + n;
      const e = d + 1;
      indices.push(a, d, b, b, d, e);
    }
  }
  return { posiciones, colores, indices, ky, maxReal };
}
