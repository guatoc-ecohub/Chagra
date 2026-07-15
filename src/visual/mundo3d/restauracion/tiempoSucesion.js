/*
 * tiempoSucesion — EL TIEMPO, y nada más que el tiempo.
 *
 * Este archivo NO IMPORTA NADA. Ni three, ni React, ni la geometría de la ladera.
 * Y es a propósito: es el único módulo que entienden por igual el mundo 3D y la
 * versión de gama baja. Si el modelo del tiempo colgara de `alturaLadera` (que
 * cuelga de three), un teléfono humilde tendría que bajarse el motor 3D entero
 * para poder leer "Año 5". Aquí el tiempo es aritmética, y la aritmética es gratis.
 *
 * Todo lo que pasa en la ladera —los 50 años enteros— sale de estas cuatro curvas:
 *
 *   cobertura(año) → cuánto suelo se tapó        (el manto verde)
 *   dosel(año)     → cuánta sombra hay arriba    (la luz, la niebla, el mantillo)
 *   agua(año)      → cuánta agua volvió          (el nacimiento, la quebrada)
 *   fauna(año)     → cuánta vida volvió          (las aves)
 *
 * Y de una quinta que se aplica mata por mata: `crecer(año, nace, madura, exp)`.
 *
 * La tesis está en los NÚMEROS, no en el texto: el dosel tarda 32 años en cerrar,
 * el agua no se asoma hasta el 28 y no corre hasta el 50. Nadie los puede apurar
 * porque no hay dónde. Ese es el punto de toda la pieza.
 */

/* -------------------------------------------------------------------------- */
/*  Las etapas: los nombres del camino                                         */
/* -------------------------------------------------------------------------- */

export const ANIO_MIN = 0;
export const ANIO_MAX = 50;

/*
 * Los cinco puntos con nombre. `pos` es dónde cae cada uno en la línea de tiempo
 * (0..1): NO es lineal a propósito. Los primeros años ocupan más riel del que les
 * "toca" porque es cuando todo cambia; los últimos treinta se comen casi la mitad
 * del riel y aun así casi no se ven cambiar. Ese contraste ES el mensaje: al final
 * el año pasa y el monte apenas respira. Eso es restaurar.
 */
export const ETAPAS = [
  {
    clave: 'potrero',
    anio: 0,
    pos: 0,
    titulo: 'El potrero',
    texto:
      'Suelo desnudo y cárcavas abiertas: el agua se lleva la tierra. El sol pega crudo, no hay sombra. Un solo árbol quedó vivo — ese es el que da la semilla.',
  },
  {
    clave: 'pioneras',
    anio: 1.5,
    pos: 0.12,
    titulo: 'Las pioneras',
    texto:
      'Usted sembró las barreras vivas en curva de nivel y el agua perdió fuerza. Nacen los helechos y las primeras plántulas. El suelo empieza a taparse.',
  },
  {
    clave: 'sotobosque',
    anio: 5,
    pos: 0.28,
    titulo: 'El sotobosque',
    texto:
      'El aliso y el yarumo crecieron rápido y ya hacen sombra. Las raíces agarraron: las cárcavas se están cerrando. La hojarasca empieza a hacer suelo.',
  },
  {
    clave: 'joven',
    anio: 20,
    pos: 0.58,
    titulo: 'El bosque joven',
    texto:
      'El encenillo, el gaque y el roble cierran el dosel. Llegan las epífitas y el musgo, y la niebla ya se queda. El monte se siembra solo.',
  },
  {
    clave: 'maduro',
    anio: 50,
    pos: 1,
    titulo: 'El bosque maduro',
    texto:
      'El agua volvió: el nacimiento revive y la quebrada corre. La fauna regresa y la queñua asoma. Cincuenta años. Ni un atajo.',
  },
];

/** La etapa en la que va (la última alcanzada). */
export function etapaDeAnio(anio) {
  let cual = ETAPAS[0];
  for (const e of ETAPAS) if (anio >= e.anio - 0.001) cual = e;
  return cual;
}

/** Cómo se escribe el año en pantalla. El último va abierto: a los 50 no se acabó. */
export function rotuloAnio(anio) {
  if (anio >= ANIO_MAX) return 'Año 50+';
  if (anio < 1) return 'Año 0';
  if (anio < 2) return `Año ${anio.toFixed(1).replace('.', ',')}`;
  return `Año ${Math.round(anio)}`;
}

/* -------------------------------------------------------------------------- */
/*  El riel: posición (0..1) ↔ año                                             */
/* -------------------------------------------------------------------------- */

/** Interpola el riel: la posición del deslizador → el año. */
export function anioDesdePosicion(p) {
  const t = Math.max(0, Math.min(1, p));
  for (let i = 0; i < ETAPAS.length - 1; i++) {
    const a = ETAPAS[i];
    const b = ETAPAS[i + 1];
    if (t <= b.pos) {
      const f = (t - a.pos) / (b.pos - a.pos);
      return a.anio + (b.anio - a.anio) * f;
    }
  }
  return ANIO_MAX;
}

/** El camino de vuelta: el año → la posición del deslizador. */
export function posicionDesdeAnio(anio) {
  const a0 = Math.max(ANIO_MIN, Math.min(ANIO_MAX, anio));
  for (let i = 0; i < ETAPAS.length - 1; i++) {
    const a = ETAPAS[i];
    const b = ETAPAS[i + 1];
    if (a0 <= b.anio) {
      const f = (a0 - a.anio) / (b.anio - a.anio);
      return a.pos + (b.pos - a.pos) * f;
    }
  }
  return 1;
}

/* -------------------------------------------------------------------------- */
/*  Las curvas: cómo crece una cosa viva                                       */
/* -------------------------------------------------------------------------- */

/*
 * `crecer` es la curva de todo lo que está vivo aquí: arranca en 0 el año que
 * nace y llega a 1 el año que madura, con una S (lenta al principio —prenderse
 * cuesta—, lenta al final —ya no hay para dónde—).
 *
 * `exp` tuerce esa S según la maña de cada especie:
 *   exp = 1    → la S pura: el árbol lento (roble, encenillo, gaque, queñua).
 *   exp < 1    → arranque bravo: la pionera (aliso, yarumo) o el pasto, que a los
 *                pocos años ya está arriba aunque le falte para su tamaño final.
 * Sin esto un aliso de 5 años se vería del porte de una plántula, y sería mentira.
 */
export function crecer(anio, nace, madura, exp = 1) {
  if (madura <= nace) return anio >= nace ? 1 : 0;
  const t = Math.max(0, Math.min(1, (anio - nace) / (madura - nace)));
  const s = t * t * (3 - 2 * t);
  return exp === 1 ? s : Math.pow(s, exp);
}

/*
 * El vigor de UNA instancia en UN año: cuánto de su tamaño final tiene puesto.
 * Si trae `decae`, además se va yendo (el pasto bajo la sombra, la cárcava que se
 * cierra, la plántula que ya se hizo árbol). 0 = todavía no está / ya no está.
 */
export function vigor(anio, it) {
  let v = crecer(anio, it.nace, it.madura, it.exp);
  if (it.decae) v *= 1 - crecer(anio, it.decae[0], it.decae[1], 0.8);
  return v;
}

/* -------------------------------------------------------------------------- */
/*  Las curvas del AMBIENTE (de estas cuelgan luz, niebla, suelo, agua y vida) */
/* -------------------------------------------------------------------------- */

/** Cuánto suelo hay tapado (0 = tierra pelada, 1 = manto vivo completo). */
export const cobertura = (anio) => crecer(anio, 0.8, 13, 0.55);

/*
 * El DOSEL: la sombra que hay arriba. La mandan dos generaciones — primero las
 * pioneras (rápidas, a los 12 ya están), después los árboles de verdad (lentos,
 * hasta los 32). De este número cuelga TODO el clima de la escena: el sol crudo
 * que se apaga, la niebla que se instala, el pasto que desaparece, el verde del
 * suelo que se hace mantillo oscuro.
 */
export const dosel = (anio) =>
  0.6 * crecer(anio, 1.8, 12.5, 0.5) + 0.4 * crecer(anio, 7, 32, 1);

/** El agua que vuelve: se insinúa a los 30, se oye a los 40, corre a los 50. */
export const agua = (anio) => crecer(anio, 28, 52, 0.75);

/** La fauna: llega cuando el bosque ya la puede sostener. No antes. */
export const fauna = (anio) => crecer(anio, 38, 52, 0.6);
