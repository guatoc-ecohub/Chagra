/*
 * cicloAgua.geom — la GEOMETRÍA y los DATOS del CICLO DEL AGUA EN LA FINCA, en
 * funciones PURAS y testeables (three-core, corre headless — cero contexto GL,
 * cero azar por frame, cero assets externos, cero JSX).
 *
 * ── LO QUE ENSEÑA (grounded: corpus teacher-agua-suelo + teacher-micorrizas) ──
 *
 * La escena es UNA MICROCUENCA CORTADA: un bloque de ladera abierto hacia el
 * espectador, como el corte de un barranco. Por el eje baja LA QUEBRADA. A cada
 * lado, la MISMA loma bajo EL MISMO AGUACERO, tratada de dos maneras — y ahí
 * está toda la lección:
 *
 *   IZQUIERDA — LA LADERA VIVA. Arriba la turbera del páramo con frailejones
 *   que peinan la niebla (el agua que nadie ve caer). Abajo hojarasca, cobertura
 *   y un horizonte A hondo y negro: LA ESPONJA. El agua ENTRA (se ve entrar: el
 *   frente de humedecimiento baja por los poros), recarga el acuífero y sale
 *   despacio por EL NACIMIENTO, limpia, todo el verano. Los surcos van EN
 *   CONTORNO (atravesados a la pendiente): cada uno es una represita. Hay zanja
 *   de infiltración, techo de zinc con canaleta y tanque, riego por goteo, y el
 *   nacimiento cercado con su ronda de matorral.
 *
 *   DERECHA — LA LADERA DESNUDA. Potrero pelado, pisado, con COSTRA: "el suelo
 *   donde pasa siempre el ganado queda como una lámina dura" (corpus). El
 *   horizonte A casi no existe. El agua NO ENTRA: escurre de una, se junta en
 *   los surcos —que van A FAVOR DE LA PENDIENTE, "arando subiendo y bajando la
 *   loma porque es más fácil" (corpus)— y los vuelve cárcavas. "Baja el agua
 *   sucia con tierra" (corpus): se lleva el suelo y lo suelta en un abanico
 *   sobre la vega. El acuífero de este lado está hondo y no sube: la boca del
 *   nacimiento está SECA. La orilla, sin ronda, es un barrizal pisado.
 *
 *   ABAJO — LAS DOS AGUAS SE ENCUENTRAN. En la misma quebrada entra agua clara
 *   por la izquierda y una pluma turbia por la derecha, y se mezclan corriente
 *   abajo. Esa es la imagen: el mismo aguacero, dos aguas.
 *
 *   ARRIBA — EL CICLO CIERRA. Una sola nube llueve sobre las dos laderas por
 *   igual (el cielo no tiene favoritos: la diferencia la hace el suelo). Del
 *   cultivo y de la quebrada sube el vapor y vuelve a la nube. Es un anillo, no
 *   una animación suelta.
 *
 * LA LECCIÓN MÁS HONDA vive en `cicloAguacero()`, abajo, escrita como curvas:
 * la carga del lado vivo SUBE LENTO Y BAJA LENTO (la esponja entrega en verano
 * y su nacimiento nunca se apaga: piso 0.30); la del lado muerto es un chispazo
 * que muere con la lluvia. La escorrentía muerta, en cambio, sube de golpe. El
 * agua que corre rápido es agua perdida; el agua que se demora es agua guardada.
 *
 * ── EL MODELO ────────────────────────────────────────────────────────────────
 * Un perfil de ladera por flanco (`PERFIL_IZQ`/`PERFIL_DER`) interpolado suave,
 * más un canal gaussiano en el eje y una caída leve hacia la cámara: de ahí sale
 * TODO (`alturaValle`). Los horizontes del suelo son espesores por x
 * (`espesores`), y el freático es otra curva por flanco que se mueve con la
 * carga (`freatico`). La cara del corte, el terreno, los surcos, las cárcavas y
 * la quebrada se derivan de esas cuatro funciones — por eso nada se despega:
 * si el perfil cambia, el corte, el agua y las matas se mudan solos.
 *
 * El componente r3f (`EscenaCicloAgua.jsx`) le pone el agua viva; las piezas
 * (`piezasAgua.jsx`) le ponen la mano del campesino.
 */
import * as THREE from 'three';
import {
  AGUAS,
  TIERRAS,
  VERDES,
  NEUTROS,
  ACENTOS,
  PALETA,
  mezclar,
} from '../paleta/paletaMadre.js';

/* ------------------------------------------------------------------ */
/* Utilería pura                                                       */
/* ------------------------------------------------------------------ */

/** PRNG determinista (la misma cuenca en cada carga; nada de Math.random). */
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const suave = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;
const C = (hex) => new THREE.Color(hex);

/** Interpola una tabla [[u, v], …] ordenada por u, con smoothstep entre nodos. */
function tabla(nodos, u) {
  if (u <= nodos[0][0]) return nodos[0][1];
  const last = nodos[nodos.length - 1];
  if (u >= last[0]) return last[1];
  for (let i = 0; i < nodos.length - 1; i++) {
    const [ua, va] = nodos[i];
    const [ub, vb] = nodos[i + 1];
    if (u >= ua && u <= ub) return lerp(va, vb, suave((u - ua) / (ub - ua)));
  }
  return last[1];
}

/* ------------------------------------------------------------------ */
/* LA PALETA DEL AGUA — derivada, ni un hex inventado (GUIA §1)         */
/* ------------------------------------------------------------------ */

/*
 * Todo sale de la paleta madre. Los azules son SOLO agua (regla de la casa).
 * El agua turbia NO es un café nuevo: es el agua viva mezclada con la tierra
 * del camino — que es exactamente lo que es.
 */
export const PAL = {
  /* — el agua — */
  clara: C(AGUAS.viva), // la que sale del nacimiento: filtrada por la esponja
  honda: C(AGUAS.lagunaHonda), // el acuífero al fondo, sin luz
  espuma: C(AGUAS.espuma), // el brillo a contraluz, la lámina del salto
  turbia: C(mezclar(AGUAS.viva, TIERRAS.camino, 0.72)), // la que se lleva el suelo
  turbiaHonda: C(mezclar(AGUAS.viva, TIERRAS.cacao, 0.62)), // la pluma cargada
  lluvia: C(mezclar(AGUAS.viva, NEUTROS.hueso, 0.45)), // la gota a contraluz
  vapor: C(mezclar(NEUTROS.hueso, AGUAS.lagunaOrilla, 0.35)), // evapotranspiración

  /* — el suelo VIVO (izquierda) — */
  hojarasca: C(mezclar(TIERRAS.turba, VERDES.paramoMusgo, 0.3)),
  humus: C(mezclar(TIERRAS.cacao, TIERRAS.siembra, 0.3)), // el horizonte A: LA ESPONJA
  humusClaro: C(mezclar(TIERRAS.cacao, TIERRAS.siembra, 0.55)),
  turba: C(mezclar(TIERRAS.turba, TIERRAS.cacao, 0.4)), // la turbera del páramo
  poroSeco: C(mezclar(TIERRAS.cacao, NEUTROS.tinta, 0.45)), // el poro vacío
  raiz: C(mezclar(TIERRAS.vega, NEUTROS.hueso, 0.25)),

  /* — el suelo MUERTO (derecha) — */
  costra: C(mezclar(NEUTROS.concreto, TIERRAS.camino, 0.45)), // la lámina dura
  muerto: C(mezclar(TIERRAS.camino, TIERRAS.vega, 0.4)), // el A que ya no está
  subsuelo: C(TIERRAS.vega), // lo que asoma cuando se fue el suelo

  /* — lo común — */
  arcilla: C(mezclar(TIERRAS.cacao, TIERRAS.camino, 0.32)), // el horizonte B
  roca: C(TIERRAS.rocaSierra),
  rocaHonda: C(mezclar(TIERRAS.rocaSierra, NEUTROS.tinta, 0.45)),
  piedra: C(TIERRAS.piedra),
  sedimento: C(mezclar(TIERRAS.camino, TIERRAS.vega, 0.35)), // el abanico

  /* — lo vivo de encima — */
  cobertura: C(VERDES.trabajo),
  coberturaAlta: C(VERDES.monte),
  ronda: C(VERDES.paramoNiebla), // el matorral que guarda el agua
  pajonal: C(TIERRAS.pajonal),
  paramo: C(mezclar(VERDES.paramoHoja, TIERRAS.pajonal, 0.42)),
  plata: C(VERDES.paramoPlata), // la roseta del frailejón: LA firma
  pelado: C(mezclar(TIERRAS.camino, TIERRAS.pajonal, 0.42)), // el potrero sin nada
  barro: C(mezclar(TIERRAS.siembra, TIERRAS.camino, 0.45)), // la orilla pisada

  /* — la mano del campesino — */
  zinc: C(NEUTROS.lamina),
  cal: C(NEUTROS.cal),
  madera: C(PALETA.madera),
  maderaOscura: C(PALETA.maderaOscura),
  surco: C(TIERRAS.siembra),
  ambar: C(ACENTOS.ambar),
};

/* ------------------------------------------------------------------ */
/* EL VALLE — dimensiones del bloque cortado                           */
/* ------------------------------------------------------------------ */

/*
 * El bloque es ANCHO en X (las dos laderas), tiene fondo en Z y se abre por la
 * CARA DEL CORTE (z = zCorte), que mira a la cámara. El eje de la quebrada corre
 * en Z: el agua viene del fondo y sale por el corte — como en un modelo de
 * museo, el agua no se derrama: está SECCIONADA (los flecos se desvanecen antes
 * del corte, `FADE_CORTE`, y se lee "sigue más allá").
 */
export const VALLE = {
  x0: -6.4, // la cresta del páramo (izquierda, viva)
  x1: 6.4, // la cresta del potrero (derecha, desnuda)
  zCorte: 2.5, // la cara del corte: mira a la cámara
  zAtras: -2.7, // el fondo del bloque
  yBase: -3.5, // la roca madre
  ejeX: -0.15, // el eje de la quebrada
};

/** A partir de este Z los flecos se apagan: el corte no derrama agua. */
export const FADE_CORTE = 0.55;

/** ¿De qué lado cae esta x? La lección entera se apoya en esto. */
export const esViva = (x) => x < VALLE.ejeX;

/** u = 0 en el cauce, 1 en la cresta del flanco. */
export function uDeX(x) {
  return esViva(x)
    ? clamp01((VALLE.ejeX - x) / (VALLE.ejeX - VALLE.x0))
    : clamp01((x - VALLE.ejeX) / (VALLE.x1 - VALLE.ejeX));
}

/** x de un u dado, por flanco. */
export function xDeU(u, viva) {
  return viva
    ? VALLE.ejeX - u * (VALLE.ejeX - VALLE.x0)
    : VALLE.ejeX + u * (VALLE.x1 - VALLE.ejeX);
}

/*
 * Los dos perfiles. No son simétricos a propósito: la ladera viva es más alta
 * (llega al páramo) y tiene BANCOS (el de la finca, el hombro de la turbera) —
 * la loma trabajada con cabeza se aterraza sola con los años. La desnuda es una
 * rampa larga y lisa: nada la frena, y eso se ve antes de que llueva.
 */
const PERFIL_IZQ = [
  [0.0, -0.55], // el cauce
  [0.06, -0.34], // la vega
  [0.13, -0.12], // el barranco: AQUÍ AFLORA EL NACIMIENTO
  [0.22, 0.44],
  [0.34, 1.06], // la ladera de cultivo (surcos en contorno)
  [0.46, 1.3], // el banco de la finca: casa, canaleta, tanque
  [0.55, 1.46],
  [0.68, 2.16],
  [0.8, 2.62],
  [0.88, 2.86], // el hombro del páramo
  [1.0, 3.02], // la cresta: la turbera
];

const PERFIL_DER = [
  [0.0, -0.55], // el mismo cauce
  [0.06, -0.42], // la orilla pisada (sin ronda: el ganado entra al agua)
  [0.16, 0.14],
  [0.3, 0.82],
  [0.44, 1.26],
  [0.58, 1.62],
  [0.72, 1.9],
  [0.86, 2.06],
  [1.0, 2.14], // la cresta: potrero pelado
];

/** El canal de la quebrada: una acanaladura gaussiana en el eje. */
const canal = (x) => -0.44 * Math.exp(-(((x - VALLE.ejeX) / 0.44) ** 2));

/** Ondulación suave en Z: una loma no es un prisma extruido. */
const onduladoZ = (x, z) =>
  Math.sin(z * 0.72 + x * 0.33) * 0.085 + Math.sin(z * 1.55 - x * 0.47) * 0.04;

/**
 * LA función madre: la altura del terreno en (x, z). Todo lo demás la consulta.
 * El valle cae levemente hacia la cámara — por eso la quebrada corre hacia el
 * corte y no se queda quieta.
 */
export function alturaValle(x, z) {
  const u = uDeX(x);
  const base = tabla(esViva(x) ? PERFIL_IZQ : PERFIL_DER, u);
  return base + canal(x) + onduladoZ(x, z) - (z - VALLE.zAtras) * 0.05;
}

/** La normal aproximada del terreno (para posar cosas encima). */
export function pendienteEn(x, z, h = 0.06) {
  const dx = (alturaValle(x + h, z) - alturaValle(x - h, z)) / (2 * h);
  const dz = (alturaValle(x, z + h) - alturaValle(x, z - h)) / (2 * h);
  return { dx, dz, inclinacion: Math.hypot(dx, dz) };
}

/* ------------------------------------------------------------------ */
/* LOS HORIZONTES — el suelo como lo ve el barranco                    */
/* ------------------------------------------------------------------ */

/**
 * Espesores (hacia abajo desde la superficie) en x. AQUÍ está la mitad de la
 * lección: a la izquierda hay hojarasca y un horizonte A HONDO (la esponja);
 * a la derecha no hay hojarasca, el A es una uña, y encima tiene COSTRA — la
 * lámina dura del pisoteo, la que no deja entrar el agua.
 */
export function espesores(x) {
  const u = uDeX(x);
  if (esViva(x)) {
    const enParamo = suave((u - 0.78) / 0.14); // hacia la turbera
    const enRonda = 1 - suave((u - 0.03) / 0.13); // la vega junto al agua
    return {
      hojarasca: (0.055 + 0.05 * enRonda + 0.035 * enParamo) * (1 - 0.15 * u),
      costra: 0,
      turba: 0.95 * enParamo,
      A: (0.4 + 0.18 * enRonda) * (1 - enParamo),
      B: 0.78 + 0.12 * (1 - u),
    };
  }
  const pisado = suave((u - 0.02) / 0.1);
  return {
    hojarasca: 0,
    costra: 0.05 * pisado, // "queda como una lámina dura" (corpus)
    turba: 0,
    A: 0.055 + 0.035 * (1 - pisado), // lo que queda de suelo: casi nada
    B: 0.72 + 0.1 * (1 - u),
  };
}

/** Las fronteras de la columna de suelo en x, sobre la cara del corte. */
export function columnaCorte(x, z = VALLE.zCorte) {
  const s = alturaValle(x, z);
  const e = espesores(x);
  const yOrg = s - e.hojarasca - e.costra; // bajo la hojarasca / bajo la costra
  const yTurba = yOrg - e.turba;
  const yA = yTurba - e.A;
  const yB = yA - e.B;
  return { s, e, yOrg, yTurba, yA, yB };
}

/* ------------------------------------------------------------------ */
/* EL FREÁTICO — el agua que no se ve, y por eso hay que dibujarla      */
/* ------------------------------------------------------------------ */

/*
 * Dos tablas por flanco (vacío / lleno) que se mezclan con `carga`.
 *
 * IZQUIERDA: el agua vive ALTA, pegada a la esponja, y AFLORA en el barranco
 * (u≈0.13) — eso es el nacimiento. Sube y baja con la carga, pero nunca se
 * hunde: por eso mana en verano.
 *
 * DERECHA: el agua vive HONDA y casi no se mueve. La boca del nacimiento está
 * muy por encima del freático: seca. Que es la escena real de media Colombia.
 */
const FREATICO_IZQ_VACIO = [
  [0.0, -0.62],
  [0.13, -0.2],
  [0.3, 0.12],
  [0.5, 0.55],
  [0.72, 1.12],
  [1.0, 1.55],
];
const FREATICO_IZQ_LLENO = [
  [0.0, -0.56],
  [0.13, 0.02],
  [0.3, 0.7],
  [0.5, 1.15],
  [0.72, 1.85],
  [1.0, 2.42],
];
const FREATICO_DER_VACIO = [
  [0.0, -0.7],
  [0.16, -0.76],
  [0.4, -0.6],
  [0.7, -0.34],
  [1.0, -0.14],
];
const FREATICO_DER_LLENO = [
  [0.0, -0.64],
  [0.16, -0.6],
  [0.4, -0.36],
  [0.7, -0.02],
  [1.0, 0.22],
];

/**
 * La y del nivel freático en x para una carga 0..1.
 * @param {number} x
 * @param {number} carga 0 = acuífero vacío, 1 = recién recargado
 */
export function freatico(x, carga) {
  const u = uDeX(x);
  const c = clamp01(carga);
  return esViva(x)
    ? lerp(tabla(FREATICO_IZQ_VACIO, u), tabla(FREATICO_IZQ_LLENO, u), c)
    : lerp(tabla(FREATICO_DER_VACIO, u), tabla(FREATICO_DER_LLENO, u), c);
}

/** Donde el freático vivo corta el barranco: la boca del nacimiento. */
export const NACIMIENTO = {
  u: 0.13,
  get x() {
    return xDeU(this.u, true);
  },
  z: 0.55,
};

/** La boca SECA del otro lado: misma cota, mismo derecho al agua, sin agua. */
export const BOCA_SECA = {
  u: 0.15,
  get x() {
    return xDeU(this.u, false);
  },
  z: 0.2,
};

/* ------------------------------------------------------------------ */
/* EL AGUACERO — la lección escrita como curvas                        */
/* ------------------------------------------------------------------ */

/** Ventana suave: 0 → 1 entre a,b, plateau, 1 → 0 entre c,d. */
function ventana(p, a, b, c, d) {
  if (p < a || p > d) return 0;
  if (p < b) return suave((p - a) / (b - a));
  if (p <= c) return 1;
  return 1 - suave((p - c) / (d - c));
}

/** Pico asimétrico: sube en `tSube`, cae con cola larga en `tCae`. */
function picoAsim(p, t0, tSube, tCae) {
  if (p < t0) return 0;
  if (p < t0 + tSube) return suave((p - t0) / tSube);
  const q = (p - t0 - tSube) / tCae;
  return Math.exp(-q * q * 2.2);
}

/**
 * EL CICLO DEL AGUACERO como dato puro — el corazón didáctico del módulo.
 *
 * Sobre las dos laderas cae EXACTAMENTE la misma lluvia (`lluvia`). Lo que
 * cambia es a dónde va:
 *
 *   - `cargaViva`  sube LENTO (el agua tiene que entrar, poro por poro) y baja
 *     LENTO, con cola larga y PISO 0.30: la esponja sigue entregando semanas
 *     después. Por eso el nacimiento vivo mana en pleno verano.
 *   - `cargaMuerta` es un chispazo: lo poquito que alcanzó a entrar se va en
 *     nada. No hay reserva. En verano, ese nacimiento no existe.
 *   - `escorrenViva` casi no aparece (solo si el aguacero satura la esponja):
 *     el agua se metió, no corrió.
 *   - `escorrenMuerta` copia la lluvia y le suma un rato: sube de golpe, y con
 *     ella se va el suelo (`erosion`). Agua que corre rápido es agua perdida.
 *
 * @param {number} t segundos de reloj
 * @param {number} [dur] segundos del ciclo completo
 * @returns {{p:number, lluvia:number, cargaViva:number, cargaMuerta:number,
 *   escorrenViva:number, escorrenMuerta:number, erosion:number,
 *   caudalVivo:number, caudalMuerto:number, vapor:number}}
 */
export function cicloAguacero(t, dur = 46) {
  const p = ((t / dur) % 1 + 1) % 1;

  const lluvia = ventana(p, 0.08, 0.17, 0.4, 0.5);
  const cargaViva = 0.3 + 0.66 * picoAsim(p, 0.12, 0.3, 0.85);
  const cargaMuerta = 0.02 + 0.16 * picoAsim(p, 0.12, 0.11, 0.11);
  const escorrenViva = 0.1 * ventana(p, 0.26, 0.34, 0.4, 0.48);
  const escorrenMuerta = lluvia * 0.94 + 0.14 * picoAsim(p, 0.4, 0.02, 0.06);
  return {
    p,
    lluvia,
    cargaViva,
    cargaMuerta,
    escorrenViva,
    escorrenMuerta,
    erosion: escorrenMuerta ** 1.4, // la carga de tierra no es lineal: se dispara
    caudalVivo: 0.3 + 0.7 * cargaViva, // NUNCA cero: esa es la lección
    caudalMuerto: 0.03 + 0.55 * cargaMuerta, // un hilo mientras llueve, y ya
    vapor: 0.25 + 0.75 * (1 - lluvia), // el sol vuelve a llevarse el agua
  };
}

/** El momento CONGELADO (reducedMotion / foto): llueve y ya divergieron. */
export const MOMENTO_QUIETO = 0.34;

/**
 * LOS DOS FRENTES del suelo — cómo se moja y cómo se seca una esponja.
 *
 * Devuelve, en profundidad NORMALIZADA del horizonte orgánico (0 = la piel del
 * suelo, 1 = el fondo del horizonte A), la banda que está húmeda: entre `seca`
 * (el frente que baja secando desde arriba) y `moja` (hasta dónde alcanzó a
 * entrar el agua). Un poro a profundidad d está húmedo si seca < d < moja.
 *
 * Y ahí está dicho todo:
 *
 *   VIVA — `moja` llega al fondo (1.0) con el aguacero: el agua entró TODA. Al
 *   secarse, `seca` baja desde arriba pero se topa con un techo (moja*0.72):
 *   por más verano que haga, ABAJO SIEMPRE QUEDA UNA BANDA HÚMEDA. Ese resto es
 *   el que mana por el nacimiento en agosto. La esponja no devuelve el agua
 *   cuando llueve: la devuelve cuando NO llueve. Ese es el negocio.
 *
 *   MUERTA — `moja` no pasa de ~0.31 de un horizonte A que además es una uña:
 *   en centímetros reales son dos dedos de tierra mojada contra medio metro del
 *   otro lado. Y `seca` le pisa los talones: apenas escampa, no queda nada.
 *   No es que llueva menos: es que no hay dónde guardarlo.
 *
 * @param {ReturnType<typeof cicloAguacero>} E
 * @param {boolean} viva
 */
export function frentes(E, viva) {
  /*
   * MIENTRAS LLUEVE NO SE SECA NADA. El frente de secado se apaga con la lluvia
   * (`escampado`), y no es un detalle: sin esta compuerta el modelo declaraba
   * seco el tercio de ARRIBA del suelo en pleno aguacero — exactamente al revés
   * de lo que pasa. La superficie es lo primero que se moja y lo último que deja
   * de estarlo mientras cae agua; el secado empieza cuando escampa. Se ve al
   * correr el geom: la banda húmeda tiene que arrancar en 0 durante el aguacero.
   */
  const escampado = 1 - clamp01(E.lluvia);
  if (viva) {
    const norm = clamp01((E.cargaViva - 0.3) / 0.66);
    const moja = 0.34 + 0.66 * norm;
    return { moja, seca: Math.min(moja * 0.72, (1 - norm) * 0.9) * escampado };
  }
  const moja = clamp01(E.escorrenMuerta * 0.2 + E.cargaMuerta * 0.6);
  return { moja, seca: Math.max(0, moja - 0.06 - E.cargaMuerta * 1.2) * escampado };
}

/* ------------------------------------------------------------------ */
/* TIER — el presupuesto por gama (DR §6)                              */
/* ------------------------------------------------------------------ */

export const PARAMS_TIER = {
  alto: {
    cols: 112, gridX: 78, gridZ: 26, gotas: 200, poros: 104, flecos: 130,
    vapor: 56, briznas: 300, frailejones: 7, motasNiebla: 44, condensa: 22,
    contornos: 7, carcavas: 6, hoyos: 40, matorral: 14, nubeBlobs: 11,
  },
  medio: {
    cols: 74, gridX: 54, gridZ: 18, gotas: 104, poros: 64, flecos: 70,
    vapor: 28, briznas: 150, frailejones: 5, motasNiebla: 22, condensa: 12,
    contornos: 5, carcavas: 5, hoyos: 22, matorral: 9, nubeBlobs: 7,
  },
  bajo: {
    cols: 48, gridX: 34, gridZ: 12, gotas: 46, poros: 36, flecos: 32,
    vapor: 0, briznas: 64, frailejones: 3, motasNiebla: 0, condensa: 0,
    contornos: 4, carcavas: 4, hoyos: 0, matorral: 5, nubeBlobs: 5,
  },
};

export const paramsDeTier = (tier) => PARAMS_TIER[tier] || PARAMS_TIER.medio;

/* ------------------------------------------------------------------ */
/* CONSTRUCTORES DE MALLA                                              */
/* ------------------------------------------------------------------ */

/** Acumulador de triángulos con color por vértice. */
function malla() {
  const pos = [];
  const col = [];
  return {
    pos,
    col,
    /** Triángulo con color plano. */
    tri(a, b, c, color) {
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      for (let i = 0; i < 3; i++) col.push(color.r, color.g, color.b);
    },
    /** Quad (tl, bl, br, tr) — CCW visto desde +Z. */
    quad(tl, bl, br, tr, cTl, cBl, cBr, cTr) {
      this.tri(tl, bl, br, cBl);
      this.tri(tl, br, tr, cTr);
      /* recolorear por vértice (el tri() puso plano) */
      const n = col.length;
      const set = (k, c) => {
        col[n - 18 + k * 3] = c.r;
        col[n - 18 + k * 3 + 1] = c.g;
        col[n - 18 + k * 3 + 2] = c.b;
      };
      set(0, cTl); set(1, cBl); set(2, cBr);
      set(3, cTl); set(4, cBr); set(5, cTr);
    },
    geometria() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    },
  };
}

/** Mancha determinista: el suelo real no es un plano de color. */
const motear = (base, r, k = 0.07) => {
  const c = base.clone();
  const f = 1 + (r() - 0.5) * 2 * k;
  c.setRGB(clamp01(c.r * f), clamp01(c.g * f), clamp01(c.b * f));
  return c;
};

/**
 * LA CARA DEL CORTE: el barranco abierto hacia la cámara, con sus horizontes.
 * Una sola malla fundida, color por vértice. Es el documento de la escena: se
 * lee de un vistazo que a la izquierda hay suelo y a la derecha ya no.
 */
export function geometriaCorte(P, seed = 17) {
  const r = rng(seed);
  const m = malla();
  const z = VALLE.zCorte;
  const n = P.cols;
  const paso = (VALLE.x1 - VALLE.x0) / n;

  /* una banda entre dos curvas y, de x a x+paso */
  const banda = (x, cA, cB, topA, botA, topB, botB) => {
    if (topA - botA < 0.004 && topB - botB < 0.004) return;
    m.quad(
      [x, topA, z], [x, botA, z], [x + paso, botB, z], [x + paso, topB, z],
      cA, cA, cB, cB,
    );
  };

  for (let i = 0; i < n; i++) {
    const xa = VALLE.x0 + i * paso;
    const xb = xa + paso;
    const a = columnaCorte(xa, z);
    const b = columnaCorte(xb, z);
    const vivaA = esViva(xa);

    /* roca madre: más honda = más oscura (la luz no baja hasta allá) */
    banda(xa, motear(PAL.rocaHonda, r, 0.09), motear(PAL.rocaHonda, r, 0.09),
      a.yB, VALLE.yBase, b.yB, VALLE.yBase);
    /* la franja alta de la roca, más clara: el contacto con la arcilla */
    banda(xa, motear(PAL.roca, r, 0.08), motear(PAL.roca, r, 0.08),
      a.yB, a.yB - 0.3, b.yB, b.yB - 0.3);
    /* horizonte B: la arcilla rojiza (igual en los dos lados: no es mérito) */
    banda(xa, motear(PAL.arcilla, r, 0.06), motear(PAL.arcilla, r, 0.06),
      a.yA, a.yB, b.yA, b.yB);
    /* horizonte A: LA ESPONJA a la izquierda, una uña pálida a la derecha */
    const cA = vivaA ? motear(PAL.humus, r, 0.1) : motear(PAL.muerto, r, 0.06);
    banda(xa, cA, cA, a.yTurba, a.yA, b.yTurba, b.yA);
    /* la turbera del páramo (solo arriba a la izquierda) */
    if (a.e.turba > 0.01) {
      const cT = motear(PAL.turba, r, 0.08);
      banda(xa, cT, cT, a.yOrg, a.yTurba, b.yOrg, b.yTurba);
    }
    /* hojarasca (izq) / costra (der): la piel del suelo, y toda la diferencia */
    if (a.e.hojarasca > 0.005) {
      const cH = motear(PAL.hojarasca, r, 0.12);
      banda(xa, cH, cH, a.s, a.yOrg, b.s, b.yOrg);
    } else if (a.e.costra > 0.005) {
      const cC = motear(PAL.costra, r, 0.05);
      banda(xa, cC, cC, a.s, a.yOrg, b.s, b.yOrg);
    }
  }
  return m.geometria();
}

/**
 * EL TERRENO: la piel de las dos laderas vista desde arriba. A la izquierda el
 * verde de la temporada; a la derecha el pelado — que se ve IGUAL en invierno y
 * en verano, porque ya no hay nada vivo que responda a la lluvia.
 *
 * @param {object} P params del tier
 * @param {string} pasto hex del pasto de la temporada (preset.pasto)
 */
export function geometriaTerreno(P, pasto, seed = 29) {
  const r = rng(seed);
  const m = malla();
  const nx = P.gridX;
  const nz = P.gridZ;
  const px = (VALLE.x1 - VALLE.x0) / nx;
  const pz = (VALLE.zCorte - VALLE.zAtras) / nz;
  const verde = C(pasto);

  const colorEn = (x) => {
    const u = uDeX(x);
    if (esViva(x)) {
      let c;
      if (u > 0.8) c = PAL.paramo.clone().lerp(PAL.plata, 0.14); // la turbera
      else if (u > 0.58) c = PAL.coberturaAlta.clone();
      else if (u > 0.16) c = PAL.cobertura.clone(); // el cultivo
      else c = PAL.ronda.clone(); // la ronda: monte junto al agua
      /* el verde sigue a la temporada (atmósfera), pero sin perder el piso */
      c.lerp(verde, u > 0.8 ? 0.14 : 0.34);
      return motear(c, r, 0.09);
    }
    if (u < 0.1) return motear(PAL.barro, r, 0.1); // la orilla pisada
    return motear(PAL.pelado, r, 0.07); // el potrero: pelado y quieto
  };

  for (let i = 0; i < nx; i++) {
    const xa = VALLE.x0 + i * px;
    const xb = xa + px;
    const ca = colorEn(xa);
    const cb = colorEn(xb);
    for (let j = 0; j < nz; j++) {
      const za = VALLE.zAtras + j * pz;
      const zb = za + pz;
      m.tri(
        [xa, alturaValle(xa, za), za],
        [xa, alturaValle(xa, zb), zb],
        [xb, alturaValle(xb, zb), zb],
        ca,
      );
      m.tri(
        [xa, alturaValle(xa, za), za],
        [xb, alturaValle(xb, zb), zb],
        [xb, alturaValle(xb, za), za],
        cb,
      );
    }
  }
  return m.geometria();
}

/** Las paredes laterales y el fondo: para que el bloque sea un BLOQUE. */
export function geometriaFlancos(P) {
  const m = malla();
  const n = Math.max(12, Math.round(P.cols / 3));
  const pz = (VALLE.zCorte - VALLE.zAtras) / n;
  /* costados (x0 y x1) */
  for (const x of [VALLE.x0, VALLE.x1]) {
    for (let j = 0; j < n; j++) {
      const za = VALLE.zAtras + j * pz;
      const zb = za + pz;
      const ya = alturaValle(x, za);
      const yb = alturaValle(x, zb);
      m.quad(
        [x, ya, za], [x, VALLE.yBase, za], [x, VALLE.yBase, zb], [x, yb, zb],
        PAL.rocaHonda, PAL.rocaHonda, PAL.rocaHonda, PAL.rocaHonda,
      );
    }
  }
  /* fondo (zAtras) */
  const px = (VALLE.x1 - VALLE.x0) / n;
  for (let i = 0; i < n; i++) {
    const xa = VALLE.x0 + i * px;
    const xb = xa + px;
    m.quad(
      [xa, alturaValle(xa, VALLE.zAtras), VALLE.zAtras],
      [xa, VALLE.yBase, VALLE.zAtras],
      [xb, VALLE.yBase, VALLE.zAtras],
      [xb, alturaValle(xb, VALLE.zAtras), VALLE.zAtras],
      PAL.rocaHonda, PAL.rocaHonda, PAL.rocaHonda, PAL.rocaHonda,
    );
  }
  return m.geometria();
}

/**
 * LA LÁMINA DEL FREÁTICO sobre la cara del corte: el agua que el campesino no
 * ve. Devuelve la geometría MÁS un escritor: `escribir(cargaViva, cargaMuerta)`
 * mueve el techo del agua sin realocar nada (2 vértices por columna).
 *
 * Se dibuja delante del corte y translúcida: el agua no TAPA el suelo, lo
 * SATURA — se ve el humus a través, que es lo que de verdad pasa.
 */
export function geometriaFreatico(P) {
  const n = P.cols;
  const paso = (VALLE.x1 - VALLE.x0) / n;
  const z = VALLE.zCorte + 0.014;
  const yFondo = VALLE.yBase + 0.04;
  const pos = [];
  const col = [];
  const xs = [];

  for (let i = 0; i < n; i++) {
    const xa = VALLE.x0 + i * paso;
    const xb = xa + paso;
    xs.push(xa, xb);
    const ya = freatico(xa, 1);
    const yb = freatico(xb, 1);
    /* tl, bl, br | tl, br, tr */
    pos.push(xa, ya, z, xa, yFondo, z, xb, yFondo, z);
    pos.push(xa, ya, z, xb, yFondo, z, xb, yb, z);
    const cTop = PAL.clara;
    const cBot = PAL.honda;
    col.push(cTop.r, cTop.g, cTop.b, cBot.r, cBot.g, cBot.b, cBot.r, cBot.g, cBot.b);
    col.push(cTop.r, cTop.g, cTop.b, cBot.r, cBot.g, cBot.b, cTop.r, cTop.g, cTop.b);
  }

  const geo = new THREE.BufferGeometry();
  const attr = new THREE.Float32BufferAttribute(pos, 3);
  attr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();

  /* índices (dentro de cada grupo de 6) de los vértices que son TECHO */
  const techoA = [0, 3]; // los que llevan y de xa
  const techoB = [5]; // el que lleva y de xb

  /**
   * @param {number} cargaViva 0..1
   * @param {number} cargaMuerta 0..1
   */
  const escribir = (cargaViva, cargaMuerta) => {
    const arr = attr.array;
    for (let i = 0; i < n; i++) {
      const xa = xs[i * 2];
      const xb = xs[i * 2 + 1];
      const ya = freatico(xa, esViva(xa) ? cargaViva : cargaMuerta);
      const yb = freatico(xb, esViva(xb) ? cargaViva : cargaMuerta);
      const base = i * 6 * 3;
      for (const k of techoA) arr[base + k * 3 + 1] = ya;
      for (const k of techoB) arr[base + k * 3 + 1] = yb;
    }
    attr.needsUpdate = true;
  };

  escribir(0.5, 0.1);
  return { geo, escribir };
}

/* ------------------------------------------------------------------ */
/* LOS POROS — la esponja hecha visible                                */
/* ------------------------------------------------------------------ */

/**
 * Los poros del horizonte A sobre la cara del corte. A la izquierda son muchos,
 * gordos y conectados (suelo con materia orgánica: el agua ENTRA y se queda);
 * a la derecha son cuatro, apretados contra la costra (el agua ni los toca).
 *
 * Cada poro guarda su `y`: el frente de humedecimiento los va mojando de arriba
 * hacia abajo, y ESE descenso es la infiltración. Lo que no se moja, escurre.
 */
export function porosSuelo(P, seed = 41) {
  const r = rng(seed);
  const out = [];
  const nIzq = Math.round(P.poros * 0.78);
  const nDer = P.poros - nIzq;

  const poner = (viva, cuantos) => {
    let intentos = 0;
    let puestos = 0;
    while (puestos < cuantos && intentos < cuantos * 30) {
      intentos++;
      const u = viva ? 0.03 + r() * 0.94 : 0.05 + r() * 0.9;
      const x = xDeU(u, viva);
      const c = columnaCorte(x);
      const alto = c.yOrg - c.yA; // turba + A
      /* OJO con este umbral: el horizonte A del lado MUERTO mide 0.055-0.09 —
         o sea que un mínimo de 0.09 le borraba los poros a la ladera pelada
         ENTERA, y en silencio (el while se rendía al agotar intentos). El lado
         muerto quedaba de roca maciza y la escena perdía media lección: lo que
         hay que ver es que ahí también hay poros, pero cuatro y apretados bajo
         la costra. El piso va por debajo de esa uña de suelo, no por encima. */
      if (alto < 0.03) continue;
      const y = c.yA + r() * alto;
      out.push({
        x,
        y,
        z: VALLE.zCorte + 0.022,
        r: (viva ? 0.028 + r() * 0.036 : 0.014 + r() * 0.012) * (1 + 0.3 * (1 - u)),
        /* profundidad NORMALIZADA en el horizonte orgánico (0 = la piel del
           suelo, 1 = el fondo del A): con esto `frentes()` decide si este poro
           está lleno o vacío, sin volver a consultar el terreno por frame. */
        d: (c.yOrg - y) / alto,
        viva,
        fase: r() * Math.PI * 2,
      });
      puestos++;
    }
  };
  poner(true, nIzq);
  poner(false, nDer);
  return out;
}

/* ------------------------------------------------------------------ */
/* SURCOS, CÁRCAVAS Y BARRERAS — la mano, para bien y para mal         */
/* ------------------------------------------------------------------ */

/**
 * SURCOS EN CONTORNO (ladera viva): curvas de altura casi constante, o sea
 * ATRAVESADAS a la pendiente. Cada surco es una represita: el agua se topa,
 * se queda y se mete. Se resuelven buscando la x de cada cota por bisección —
 * no se "dibujan": se DERIVAN del terreno, y por eso se pegan a él.
 */
export function surcosContorno(P) {
  const curvas = [];
  const nz = 14;
  for (let k = 0; k < P.contornos; k++) {
    const u = 0.2 + (k / Math.max(1, P.contornos - 1)) * 0.36; // la banda de cultivo
    const hObjetivo = alturaValle(xDeU(u, true), 0);
    const pts = [];
    for (let j = 0; j <= nz; j++) {
      const z = VALLE.zAtras + 0.5 + (j / nz) * (VALLE.zCorte - VALLE.zAtras - 0.9);
      /* bisección en x sobre el flanco vivo: altura(x, z) = hObjetivo */
      let lo = VALLE.x0 + 0.2;
      let hi = VALLE.ejeX - 0.3;
      for (let it = 0; it < 26; it++) {
        const mid = (lo + hi) / 2;
        if (alturaValle(mid, z) > hObjetivo) lo = mid;
        else hi = mid;
      }
      const x = (lo + hi) / 2;
      pts.push(new THREE.Vector3(x, alturaValle(x, z) + 0.035, z));
    }
    curvas.push(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4));
  }
  return curvas;
}

/**
 * SURCOS A FAVOR DE LA PENDIENTE (ladera desnuda): rectas de z constante, de la
 * cresta al cauce. "Yo siempre he arado subiendo y bajando la loma porque es más
 * fácil" (corpus). Es más fácil, sí: y cada surco se vuelve una CÁRCAVA — el
 * agua se junta, agarra velocidad y se lleva la loma por ahí.
 */
export function carcavas(P) {
  const curvas = [];
  const n = P.carcavas;
  for (let k = 0; k < n; k++) {
    const z = VALLE.zAtras + 0.6 + (k / Math.max(1, n - 1)) * (VALLE.zCorte - VALLE.zAtras - 1.3);
    const pts = [];
    const pasos = 18;
    for (let j = 0; j <= pasos; j++) {
      const u = 0.9 - (j / pasos) * 0.86; // de la cresta al cauce
      const x = xDeU(u, false);
      /* la cárcava serpentea poquito: el agua busca */
      const zz = z + Math.sin(u * 7.5 + k) * 0.09;
      pts.push(new THREE.Vector3(x, alturaValle(x, zz) - 0.02, zz));
    }
    curvas.push(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5));
  }
  return curvas;
}

/**
 * La malla de las cárcavas: una zanja que SE ABRE hacia abajo (arriba es una
 * rayita; abajo ya es un boquerón que muestra el subsuelo). El ancho creciente
 * es el dato: la erosión se acelera sola.
 */
export function geometriaCarcavas(curvas, seed = 53) {
  const r = rng(seed);
  const m = malla();
  const n = 26;
  for (const cur of curvas) {
    for (let i = 0; i < n; i++) {
      const t0 = i / n;
      const t1 = (i + 1) / n;
      const p0 = cur.getPoint(t0);
      const p1 = cur.getPoint(t1);
      const w0 = 0.03 + t0 * t0 * 0.26; // se abre cuadrático: se acelera
      const w1 = 0.03 + t1 * t1 * 0.26;
      const h0 = 0.02 + t0 * 0.1;
      const h1 = 0.02 + t1 * 0.1;
      const cCentro = motear(PAL.subsuelo, r, 0.08);
      const cBorde = motear(PAL.pelado, r, 0.06);
      /* dos faldas: del borde al fondo de la zanja, a lado y lado en Z */
      for (const s of [-1, 1]) {
        m.quad(
          [p0.x, p0.y, p0.z + s * w0],
          [p0.x, p0.y - h0, p0.z],
          [p1.x, p1.y - h1, p1.z],
          [p1.x, p1.y, p1.z + s * w1],
          cBorde, cCentro, cCentro, cBorde,
        );
      }
    }
  }
  return m.geometria();
}

/**
 * EL ABANICO DE SEDIMENTO: donde la cárcava desemboca en la vega, el agua
 * pierde fuerza y suelta la tierra que traía. Es el suelo de la loma, tirado.
 * Que se vea POSADO ENCIMA del pasto es la denuncia.
 */
export function geometriaAbanico(curvas, seed = 59) {
  const r = rng(seed);
  const m = malla();
  for (const cur of curvas) {
    const boca = cur.getPoint(1);
    const gajos = 9;
    for (let i = 0; i < gajos; i++) {
      const a0 = -0.9 + (i / gajos) * 1.8;
      const a1 = -0.9 + ((i + 1) / gajos) * 1.8;
      const largo = 0.5 + r() * 0.42;
      const p = (a) => {
        const x = boca.x - Math.cos(a) * largo * 0.5;
        const z = boca.z + Math.sin(a) * largo;
        return [x, alturaValle(x, z) + 0.022, z];
      };
      m.tri([boca.x, boca.y + 0.03, boca.z], p(a0), p(a1), motear(PAL.sedimento, r, 0.09));
    }
  }
  return m.geometria();
}

/**
 * LA ZANJA DE INFILTRACIÓN (ladera viva): un tajo atravesado a la pendiente que
 * agarra la que escurre y la obliga a quedarse hasta que se mete. Cuesta un día
 * de pala y vale un verano de agua (corpus).
 */
export function zanjaInfiltracion() {
  const u = 0.3;
  const pts = [];
  for (let j = 0; j <= 10; j++) {
    const z = VALLE.zAtras + 0.9 + (j / 10) * (VALLE.zCorte - VALLE.zAtras - 1.9);
    const hObjetivo = alturaValle(xDeU(u, true), 0);
    let lo = VALLE.x0 + 0.2;
    let hi = VALLE.ejeX - 0.3;
    for (let it = 0; it < 24; it++) {
      const mid = (lo + hi) / 2;
      if (alturaValle(mid, z) > hObjetivo) lo = mid;
      else hi = mid;
    }
    const x = (lo + hi) / 2;
    /* hundida: es un TAJO, no un camellón. El tubo queda mayormente enterrado y
       lo que asoma es el labio de tierra sacada — que es como se ve de verdad. */
    pts.push(new THREE.Vector3(x, alturaValle(x, z) - 0.035, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4);
}

/* ------------------------------------------------------------------ */
/* EL AGUA CORRIENDO                                                   */
/* ------------------------------------------------------------------ */

/** El eje de la quebrada, del fondo hacia el corte. */
export function curvaQuebrada() {
  const pts = [];
  const n = 12;
  for (let j = 0; j <= n; j++) {
    const z = VALLE.zAtras + 0.2 + (j / n) * (VALLE.zCorte - VALLE.zAtras - 0.2);
    const x = VALLE.ejeX + Math.sin(z * 0.8) * 0.14; // el agua nunca va derecho
    pts.push(new THREE.Vector3(x, alturaValle(x, z) + 0.05, z));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/**
 * LA LÁMINA DE LA QUEBRADA. El color cruza el cauce: clarito contra la orilla
 * viva, turbio contra la desnuda — y la pluma se ABRE corriente abajo (hacia el
 * corte), porque el agua se mezcla. Dos aguas, una quebrada.
 *
 * Devuelve dos mallas: `clara` (la base, siempre) y `pluma` (la turbia, cuya
 * opacidad la maneja la escena con la erosión: sin aguacero no hay pluma).
 */
export function geometriaQuebrada(P) {
  const eje = curvaQuebrada();
  const n = 30;
  const ancho = 0.42;
  const clara = malla();
  const pluma = malla();

  /* el borde interior de la pluma: en la cabecera ocupa el tercio de la orilla
     desnuda; corriente abajo (hacia el corte) se abre hasta casi todo el cauce.
     Eso es la mezcla: el agua sucia de UNA ladera ensucia la quebrada ENTERA. */
  const bordePluma = (t) => (0.35 + (-0.8 - 0.35) * t) * ancho;

  for (let i = 0; i < n; i++) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const a = eje.getPoint(t0);
    const b = eje.getPoint(t1);
    const yA = a.y;
    const yB = b.y;

    /* la lámina clara: de orilla a orilla (normal hacia arriba) */
    clara.quad(
      [a.x - ancho, yA, a.z], [b.x - ancho, yB, b.z],
      [b.x + ancho, yB, b.z], [a.x + ancho, yA, a.z],
      PAL.clara, PAL.clara, PAL.honda, PAL.honda,
    );

    /* la pluma turbia: se va diluyendo hacia abajo, sin llegar nunca a limpia */
    const x0i = a.x + bordePluma(t0);
    const x1i = b.x + bordePluma(t1);
    pluma.quad(
      [x0i, yA + 0.006, a.z], [x1i, yB + 0.006, b.z],
      [b.x + ancho, yB + 0.006, b.z], [a.x + ancho, yA + 0.006, a.z],
      PAL.turbia.clone().lerp(PAL.clara, 0.35 + t0 * 0.4),
      PAL.turbia.clone().lerp(PAL.clara, 0.35 + t1 * 0.4),
      PAL.turbiaHonda.clone().lerp(PAL.turbia, t1 * 0.5),
      PAL.turbiaHonda.clone().lerp(PAL.turbia, t0 * 0.5),
    );
  }
  return { clara: clara.geometria(), pluma: pluma.geometria(), eje };
}

/** El chorro del nacimiento vivo: sale del barranco y cae a la quebrada. */
export function curvaNacimiento() {
  const x0 = NACIMIENTO.x;
  const z = NACIMIENTO.z;
  const y0 = alturaValle(x0, z) - 0.08;
  const pts = [
    new THREE.Vector3(x0, y0, z),
    new THREE.Vector3(x0 + 0.28, y0 - 0.16, z + 0.05),
    new THREE.Vector3(x0 + 0.62, y0 - 0.42, z + 0.02),
    new THREE.Vector3(VALLE.ejeX - 0.1, alturaValle(VALLE.ejeX, z) + 0.06, z),
  ];
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
}

/* ------------------------------------------------------------------ */
/* PARTÍCULAS (datos; el movimiento lo pone la escena)                 */
/* ------------------------------------------------------------------ */

/** La lluvia: la MISMA sobre las dos laderas. Ahí empieza la lección. */
export function gotasLluvia(P, seed = 67) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.gotas; i++) {
    const x = VALLE.x0 - 0.4 + r() * (VALLE.x1 - VALLE.x0 + 0.8);
    const z = VALLE.zAtras + r() * (VALLE.zCorte - VALLE.zAtras + 0.6);
    out.push({
      x,
      z,
      suelo: alturaValle(x, Math.min(z, VALLE.zCorte)),
      fase: r(),
      vel: 3.4 + r() * 2.2,
      largo: 0.13 + r() * 0.16,
    });
  }
  return out;
}

/** Los flecos de tierra que se van con la escorrentía: el suelo, yéndose. */
export function flecosEscorrentia(curvas, P, seed = 71) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.flecos; i++) {
    out.push({
      via: Math.floor(r() * curvas.length),
      t0: r(),
      vel: 0.1 + r() * 0.13,
      tam: 0.026 + r() * 0.05,
      lado: (r() - 0.5) * 0.13,
    });
  }
  return out;
}

/** El vapor: del cultivo y de la quebrada, de vuelta a la nube. Cierra el ciclo. */
export function motasVapor(P, seed = 73) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.vapor; i++) {
    const deQuebrada = r() < 0.42;
    const x = deQuebrada
      ? VALLE.ejeX + (r() - 0.5) * 0.9
      : xDeU(0.2 + r() * 0.38, true);
    const z = VALLE.zAtras + 0.4 + r() * (VALLE.zCorte - VALLE.zAtras - 0.8);
    out.push({
      x,
      z,
      y0: alturaValle(x, z) + 0.05,
      fase: r(),
      vel: 0.22 + r() * 0.3,
      tam: 0.05 + r() * 0.09,
      alto: 2.4 + r() * 1.8,
    });
  }
  return out;
}

/** La niebla que sube la quebrada y se enreda en el frailejonal. */
export function motasNiebla(P, seed = 79) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.motasNiebla; i++) {
    const u = 0.74 + r() * 0.28;
    const x = xDeU(Math.min(u, 1), true);
    const z = VALLE.zAtras + r() * (VALLE.zCorte - VALLE.zAtras);
    out.push({
      x,
      z,
      y: alturaValle(x, z) + 0.18 + r() * 0.5,
      fase: r() * Math.PI * 2,
      vel: 0.1 + r() * 0.14,
      tam: 0.2 + r() * 0.3,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* LA GENTE DEL PAISAJE (posiciones; las mallas van en piezasAgua)      */
/* ------------------------------------------------------------------ */

/** Los frailejones de la cresta: la fábrica de agua. Pocos y grandes. */
export function frailejones(P, seed = 83) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.frailejones; i++) {
    const u = 0.82 + r() * 0.16;
    const x = xDeU(Math.min(u, 0.99), true);
    const z = VALLE.zAtras + 0.5 + r() * (VALLE.zCorte - VALLE.zAtras - 1.1);
    out.push({
      id: `fr${i}`,
      pos: [x, alturaValle(x, z) - 0.04, z],
      /* un frailejón es una mata de metro y medio, no un árbol: al lado de la
         casa (0.55 de alto ≈ 4 m) esto lo deja donde va. Se permite un pelo de
         exageración porque es la firma del páramo y está lejos, en la cresta. */
      alto: 0.24 + r() * 0.16,
      giro: r() * Math.PI * 2,
      esc: 0.86 + r() * 0.3,
    });
  }
  return out;
}

/**
 * Las briznas: cobertura del cultivo, pajonal del páramo, BARRERAS VIVAS
 * atravesadas en la ladera desnuda, y matas de la ronda. Un solo InstancedMesh.
 *
 * Las barreras son el único verde de la ladera muerta: una línea de vetiver
 * atravesada frena el agua, atrapa la tierra y con los años hace terraza sola.
 * Ahí donde la barrera está, la loma se salvó — y se ve.
 */
export function briznas(P, seed = 89) {
  const r = rng(seed);
  const out = [];
  const n = P.briznas;

  /* — barreras vivas: dos líneas de cota en la ladera DESNUDA — */
  const nBarrera = Math.round(n * 0.22);
  for (let i = 0; i < nBarrera; i++) {
    const linea = i % 2;
    const u = 0.32 + linea * 0.26;
    const x = xDeU(u, false) + (r() - 0.5) * 0.14;
    const z = VALLE.zAtras + 0.3 + r() * (VALLE.zCorte - VALLE.zAtras - 0.5);
    out.push({
      x, z, y: alturaValle(x, z),
      alto: 0.3 + r() * 0.2, giro: r() * Math.PI, tipo: 'barrera',
      esc: 0.9 + r() * 0.4,
    });
  }
  /* — cobertura del cultivo (ladera viva) — */
  const nCob = Math.round(n * 0.36);
  for (let i = 0; i < nCob; i++) {
    const u = 0.17 + r() * 0.4;
    const x = xDeU(u, true);
    const z = VALLE.zAtras + 0.3 + r() * (VALLE.zCorte - VALLE.zAtras - 0.5);
    out.push({
      x, z, y: alturaValle(x, z),
      alto: 0.14 + r() * 0.14, giro: r() * Math.PI, tipo: 'cobertura',
      esc: 0.8 + r() * 0.5,
    });
  }
  /* — pajonal del páramo — */
  const nPaja = Math.round(n * 0.22);
  for (let i = 0; i < nPaja; i++) {
    const u = 0.7 + r() * 0.3;
    const x = xDeU(Math.min(u, 1), true);
    const z = VALLE.zAtras + 0.2 + r() * (VALLE.zCorte - VALLE.zAtras - 0.4);
    out.push({
      x, z, y: alturaValle(x, z),
      alto: 0.2 + r() * 0.18, giro: r() * Math.PI, tipo: 'paja',
      esc: 0.85 + r() * 0.4,
    });
  }
  /* — la ronda del nacimiento — */
  for (let i = out.length; i < n; i++) {
    const u = 0.03 + r() * 0.12;
    const x = xDeU(u, true);
    const z = VALLE.zAtras + 0.2 + r() * (VALLE.zCorte - VALLE.zAtras - 0.3);
    out.push({
      x, z, y: alturaValle(x, z),
      alto: 0.22 + r() * 0.22, giro: r() * Math.PI, tipo: 'ronda',
      esc: 0.9 + r() * 0.5,
    });
  }
  return out;
}

/** El matorral de la ronda: masas bajas e irregulares. NUNCA conos con palito. */
export function matorral(P, seed = 97) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.matorral; i++) {
    const u = 0.02 + r() * 0.13;
    const x = xDeU(u, true);
    const z = VALLE.zAtras + 0.3 + r() * (VALLE.zCorte - VALLE.zAtras - 0.6);
    out.push({
      id: `mt${i}`,
      pos: [x, alturaValle(x, z) - 0.05, z],
      r: 0.16 + r() * 0.2,
      achate: 0.5 + r() * 0.25,
      giro: r() * Math.PI * 2,
      semilla: Math.floor(r() * 9999),
    });
  }
  return out;
}

/**
 * Los HOYOS DE PATA en la orilla desnuda: el ganado no se dibuja — se dibuja lo
 * que DEJA. La orilla pisada, el camino abierto hasta el agua, el barro. Se lee
 * mejor la ausencia que una vaca de caricatura, y enseña lo mismo: sin ronda,
 * el animal entra al agua y la daña.
 */
export function hoyosPata(P, seed = 101) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.hoyos; i++) {
    /* concentrados en el camino que baja al agua */
    const u = 0.02 + r() * r() * 0.22;
    const x = xDeU(u, false) + (r() - 0.5) * 0.1;
    const z = 0.4 + (r() - 0.5) * 2.6;
    out.push({
      x, z, y: alturaValle(x, z) + 0.005,
      r: 0.045 + r() * 0.035,
      giro: r() * Math.PI,
    });
  }
  return out;
}

/** Los postes de la cerca de la ronda: por qué se le cierra el paso al ganado. */
export function cercaRonda() {
  const postes = [];
  const u = 0.19;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const z = VALLE.zAtras + 0.6 + (i / (n - 1)) * (VALLE.zCorte - VALLE.zAtras - 1.2);
    const x = xDeU(u, true);
    postes.push({ x, z, y: alturaValle(x, z) });
  }
  return postes;
}

/** Donde va la casa (banco de la finca) y su tanque. */
export function sitioCasa() {
  const u = 0.46;
  const x = xDeU(u, true);
  const z = 0.35;
  return {
    casa: [x, alturaValle(x, z), z],
    tanque: [x + 0.72, alturaValle(x + 0.72, z - 0.55), z - 0.55],
    giro: -0.22,
  };
}

/** La nube: masas blandas. Una sola, y llueve sobre las dos laderas por igual. */
export function nube(P, seed = 103) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < P.nubeBlobs; i++) {
    out.push({
      /* CENTRADA y más ancha que el valle: tiene que tapar las DOS laderas. Una
         nube corrida a un lado haría trampa — parecería que a una le llueve
         más. La lección exige que el cielo sea el mismo. */
      pos: [
        VALLE.ejeX + (r() - 0.5) * 11.5,
        5.3 + (r() - 0.5) * 0.7,
        (r() - 0.5) * 3.2,
      ],
      r: 0.75 + r() * 0.95,
      achate: 0.5 + r() * 0.2,
      semilla: Math.floor(r() * 9999),
    });
  }
  return out;
}

/** Las matas del cultivo regadas por goteo (la línea del gotero pasa por ahí). */
export function matasRiego(seed = 107) {
  const r = rng(seed);
  const out = [];
  const u = 0.24;
  for (let i = 0; i < 6; i++) {
    const z = VALLE.zAtras + 1.1 + (i / 5) * (VALLE.zCorte - VALLE.zAtras - 2.4);
    const x = xDeU(u, true) + (r() - 0.5) * 0.08;
    out.push({ x, z, y: alturaValle(x, z), fase: r() });
  }
  return out;
}
