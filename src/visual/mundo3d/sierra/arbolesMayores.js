/*
 * arbolesMayores — el CATÁLOGO del ÁRBOL MAYOR de cada piso térmico andino, como
 * DATO puro (cero three, cero React). Es el hito visual de la galería de la
 * Sierra: cada franja de altitud tiene un árbol emblema, el más prominente de su
 * piso, y aquí viven su identidad (nombre común + científico), su paleta y las
 * proporciones/reglas de silueta para modelarlo LOW-POLY (`ArbolMayor.jsx`).
 *
 * El árbol MAYOR del PÁRAMO es la QUEÑUA (Polylepis): forma el límite arbóreo más
 * alto del mundo, tronco retorcido y corteza cobriza que se descama en hojas de
 * papel. Hacia abajo, el elegido de cada piso:
 *   páramo   → queñua        (Polylepis quadrijuga)  — nudosa, cobriza, copa compacta
 *   frío     → roble andino  (Quercus humboldtii)    — el gran árbol: copa ancha y densa
 *   templado → guayacán      (Handroanthus chrysanthus) — floración dorada, sin hojas
 *   cálido   → ceiba         (Ceiba pentandra)       — raíces tablares, copa emergente
 *
 * HONESTIDAD (anti-adorno): son emblemas ECOLÓGICOS del piso, no cultígenos de
 * relleno. El superpáramo y el nival no tienen árbol mayor (líquenes / nieve);
 * el catálogo lo dice con `arbol: null` y no inventa uno.
 *
 * Fuentes de arte: DR sierra-geo-render + botánica andina (treeline Polylepis,
 * robledales de Quercus humboldtii, floración de Handroanthus, contrafuertes de
 * Ceiba pentandra). Cero texturas: todo color procedural para cachear offline.
 */

/* Ruido determinista 0..1 (hash de seno). Mismo árbol siempre, sin Math.random:
   la copa se ve idéntica en cada equipo y cachea limpio en el service worker. */
export function azar(semilla) {
  const x = Math.sin(semilla * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * El catálogo. Cada árbol mayor:
 *   · piso        — id del piso térmico (pisosTermicos.js).
 *   · nombre      — común, para el rótulo.
 *   · cientifico  — binomial, en cursiva en el rótulo.
 *   · rasgo       — la frase-firma de su silueta (para el rótulo secundario).
 *   · alto        — altura del árbol en unidades de mundo (silueta relativa:
 *                   el roble y la ceiba dominan; la queñua es baja y nudosa).
 *   · corteza     — { base, clara } color del tronco (vertexColors del leño).
 *   · copa        — { base, clara } color del follaje (o de la FLOR en guayacán).
 *   · forma       — receta de silueta que lee `ArbolMayor.jsx`:
 *       tipo        'multitronco'|'columna'|'emergente'  (estructura del tronco)
 *       troncos     nº de tallos (queñua multitallo; los demás 1)
 *       copaAncho   radio horizontal de la copa (relativo a `alto`)
 *       copaAlto    grosor vertical de la copa
 *       blobs       nº de nubes de follaje que forman la copa
 *       inclina     inclinación del árbol en radianes (queñua ladeada por viento)
 *       tablares    nº de raíces tablares (solo ceiba; 0 en el resto)
 *       floracion   true → la copa es FLOR maciza (guayacán), no hojas
 */
export const ARBOLES_MAYORES = {
  quenua: {
    piso: 'paramo',
    nombre: 'Queñua',
    cientifico: 'Polylepis quadrijuga',
    rasgo: 'el árbol más alto del mundo, cobrizo y nudoso',
    alto: 1.5,
    corteza: { base: '#a5502e', clara: '#c9723f' }, // cobre que se descama
    copa: { base: '#3f5a3a', clara: '#6f855a' }, // verde-plata compacto
    forma: {
      tipo: 'multitronco',
      troncos: 3,
      copaAncho: 0.62,
      copaAlto: 0.5,
      blobs: 5,
      inclina: 0.16,
      tablares: 0,
      floracion: false,
    },
  },
  roble: {
    piso: 'frio',
    nombre: 'Roble andino',
    cientifico: 'Quercus humboldtii',
    rasgo: 'el gran árbol de la tierra fría, copa ancha y densa',
    alto: 2.6,
    corteza: { base: '#6a4a2e', clara: '#87613b' },
    copa: { base: '#2f5a30', clara: '#4d7d3a' }, // verde hondo, denso
    forma: {
      tipo: 'columna',
      troncos: 1,
      copaAncho: 1.0,
      copaAlto: 0.78,
      blobs: 7,
      inclina: 0.03,
      tablares: 0,
      floracion: false,
    },
  },
  guayacan: {
    piso: 'templado',
    nombre: 'Guayacán amarillo',
    cientifico: 'Handroanthus chrysanthus',
    rasgo: 'florece de amarillo, sin una sola hoja',
    alto: 2.2,
    corteza: { base: '#7a6a52', clara: '#998769' },
    copa: { base: '#f2c33a', clara: '#ffe07a' }, // FLOR dorada maciza
    forma: {
      tipo: 'columna',
      troncos: 1,
      copaAncho: 0.92,
      copaAlto: 0.6,
      blobs: 6,
      inclina: 0.04,
      tablares: 0,
      floracion: true,
    },
  },
  ceiba: {
    piso: 'calido',
    nombre: 'Ceiba',
    cientifico: 'Ceiba pentandra',
    rasgo: 'raíces tablares y copa que emerge sobre el bosque',
    alto: 3.0,
    corteza: { base: '#8a8a66', clara: '#a6a680' }, // tronco verdoso-gris
    copa: { base: '#5e8a4a', clara: '#7ba85f' },
    forma: {
      tipo: 'emergente',
      troncos: 1,
      copaAncho: 1.35,
      copaAlto: 0.5, // copa aparasolada, PLANA y muy ancha
      blobs: 7,
      inclina: 0.0,
      tablares: 4,
      floracion: false,
    },
  },
};

/** El árbol mayor de un piso (o `null` si el piso no tiene árbol: superpáramo, nival). */
export function arbolDePiso(pisoId) {
  return Object.values(ARBOLES_MAYORES).find((a) => a.piso === pisoId) || null;
}

/**
 * Las NUBES de follaje que arman una copa redondeada low-poly. Determinista por
 * `semilla`: reparte `n` blobs en un elipsoide (ancho × alto), más densos al
 * centro. Cada blob trae posición local (relativa al tope del tronco), escala no
 * uniforme y un `tono` 0..1 para mezclar copa.base↔copa.clara (volumen sin luz).
 *
 * @returns {Array<{ pos:[number,number,number], escala:[number,number,number], tono:number }>}
 */
export function copaBlobs(forma, alto, semilla = 1) {
  const n = Math.max(3, forma.blobs);
  const rx = alto * forma.copaAncho;
  const ry = alto * forma.copaAlto;
  /** @type {Array<{pos: [number, number, number], escala: [number, number, number], tono: number}>} */
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = semilla * 13.3 + i * 7.7;
    const ang = (i / n) * Math.PI * 2 + azar(s) * 0.9;
    const rad = 0.28 + azar(s + 1) * 0.72; // 0=centro, 1=borde
    const px = Math.cos(ang) * rx * rad * 0.7;
    const pz = Math.sin(ang) * rx * rad * 0.7;
    // copa aparasolada (ceiba): los blobs de borde bajan; copa alta: suben al centro
    const py = ry * (1 - rad * 0.5) + azar(s + 2) * ry * 0.2;
    const esc = lerp(0.55, 1.0, 1 - rad) * (0.8 + azar(s + 3) * 0.5);
    out.push({
      pos: [px, py, pz],
      escala: [esc * rx * 0.7, esc * ry * 0.9, esc * rx * 0.7],
      tono: azar(s + 4),
    });
  }
  return out;
}

/**
 * Los TALLOS de un árbol multitronco (queñua): cada uno nace pegado a la base y
 * se abre con una leve curva y giro propios. El tallo 0 es el central (recto).
 *
 * @returns {Array<{ base:[number,number], curva:number, giro:number, alto:number, grosor:number }>}
 */
export function tallosArbol(forma, alto, semilla = 1) {
  const n = Math.max(1, forma.troncos);
  if (n === 1) {
    return [{ base: [0, 0], curva: 0, giro: 0, alto, grosor: 1 }];
  }
  /** @type {Array<{base: [number, number], curva: number, giro: number, alto: number, grosor: number}>} */
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = semilla * 5.1 + i * 3.3;
    const ang = (i / n) * Math.PI * 2 + azar(s) * 0.6;
    const off = 0.08 * alto * (0.5 + azar(s + 1));
    out.push({
      base: [Math.cos(ang) * off, Math.sin(ang) * off],
      curva: (azar(s + 2) - 0.5) * 0.5, // desvío lateral de la punta
      giro: ang,
      alto: alto * (0.72 + azar(s + 3) * 0.28),
      grosor: 0.6 + azar(s + 4) * 0.4,
    });
  }
  return out;
}

/**
 * Las RAÍCES TABLARES (contrafuertes) de la ceiba: aletas verticales que salen
 * del pie del tronco y agarran la tierra. Cada una: ángulo, largo y alto.
 *
 * @returns {Array<{ ang:number, largo:number, alto:number }>}
 */
export function raicesTablares(forma, alto, semilla = 1) {
  const n = forma.tablares || 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = semilla * 9.9 + i * 4.4;
    out.push({
      ang: (i / n) * Math.PI * 2 + azar(s) * 0.3,
      largo: alto * (0.16 + azar(s + 1) * 0.06),
      alto: alto * (0.2 + azar(s + 2) * 0.08),
    });
  }
  return out;
}

/**
 * Un FRAILEJONAR: los frailejones (Espeletia) del páramo. No son árboles —
 * rosetas lanudas sobre un tronco columnar— pero son la firma del piso y
 * acompañan a la queñua. Reparte `n` en un disco de radio `radio` alrededor de un
 * centro, deterministas.
 *
 * @returns {Array<{ pos:[number,number,number], alto:number, giro:number }>}
 */
export function frailejonar(n, radio, semilla = 1) {
  /** @type {Array<{pos: [number, number, number], alto: number, giro: number}>} */
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = semilla * 17.7 + i * 2.9;
    const ang = azar(s) * Math.PI * 2;
    const rad = Math.sqrt(azar(s + 1)) * radio; // uniforme en el disco
    out.push({
      pos: [Math.cos(ang) * rad, 0, Math.sin(ang) * rad],
      alto: 0.28 + azar(s + 2) * 0.34,
      giro: azar(s + 3) * Math.PI * 2,
    });
  }
  return out;
}

/** Paleta de la roseta del frailejón (para el instanciado del páramo). */
export const FRAILEJON = {
  tronco: '#6b5236',
  roseta: '#b8c2a8', // verde-plata lanudo
  flor: '#e8c53a',
};
