/*
 * sierraRelieve — LA LEY DE ALTURA del macizo, como DATO puro (cero three,
 * cero React). Extraída literal de `VistaGlobalSierra.jsx` para que la vista
 * global y el DESCENSO no puedan divergir.
 *
 * Por qué existe (§5.3 del diseño `DISENO-TRANSICION-CLIMAS-20260902.md`): el
 * bug clásico —diagnosticado en el steal `TheLongSilence`— es que el suelo del
 * recorrido sea una escena aparte con su propia ley de generación; a los dos
 * días el mapa orbital y el paseo muestran montañas distintas. Aquí la ley es
 * UNA y vive fuera de las dos vistas.
 *
 * ESTADO DE INTEGRACIÓN (declarado, no maquillado): hoy `VistaGlobalSierra.jsx`
 * conserva su copia local de `alturaSierra()`. NO se tocó a propósito: el
 * PASO 2 (defectos de la Sierra) está editando ese archivo en otro carril y
 * pisarlo produciría un conflicto. El integrador debe, DESPUÉS de que el
 * Paso 2 cierre, reemplazar el bloque local por
 *   `import { alturaSierra, CIMA, COSTA_Z, ANCHO, FONDO } from './sierra/sierraRelieve.js';`
 * — un cambio de una línea. Mientras tanto `sierraRelieve.equivalencia.test.js`
 * compara AMBAS implementaciones sobre una rejilla y falla si divergen.
 *
 * ESCALA: `CIMA = 5.0` unidades de mundo ↔ 5 775 msnm (cota IGAC del Pico
 * Cristóbal Colón). De ahí `METROS_POR_UNIDAD ≈ 1155`, que es la constante con
 * la que la tabla canónica `PISOS_TERMICOS_SIERRA` derivó sus `topeWorldY`.
 */
import { PISOS_TERMICOS } from '../pisosTermicos.js';

/* ── Geografía del macizo. Coordenadas de MUNDO: X = oriente-occidente,
      Y = altura, Z = norte(mar, −) → sur(cumbres, +). ── */
export const CIMA = 5.0; // altura de referencia (≈ 5.775 m escalados)
export const COSTA_Z = -3; // latitud de la línea de costa en Z
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

/* Ruido determinista (hash de senos): mismo macizo siempre, sin Math.random. */
export function ruido(wx, wz) {
  return (
    Math.sin(wx * 0.9 + wz * 0.7) * 0.5 +
    Math.sin(wx * 1.7 - wz * 1.3 + 2.1) * 0.28 +
    Math.sin(wx * 2.9 + wz * 2.3 + 4.7) * 0.16
  );
}

/**
 * Altura del terreno en un punto de mundo. El mar (Z < costa) queda a ~0.
 * COPIA LITERAL de la de `VistaGlobalSierra.jsx` — si alguna cambia, el test
 * de equivalencia falla.
 */
export function alturaSierra(wx, wz) {
  if (wz < COSTA_Z - 0.2) return -0.15;
  const s = clamp((wz - COSTA_Z) / (10 - COSTA_Z), 0, 1); // rampa costa→interior
  let h = Math.pow(s, 0.9) * CIMA * 0.42;
  h += gauss(wx, wz, 0.6, 3.8, 1.9, 2.4) * CIMA * 0.4; // Pico Cristóbal Colón
  h += gauss(wx, wz, -1.4, 4.4, 1.8, 2.2) * CIMA * 0.38; // Pico Simón Bolívar
  h += gauss(wx, wz, 2.9, 2.9, 1.7, 2.1) * CIMA * 0.42; // Pico Simmonds
  h += gauss(wx, wz, -4.5, 0.6, 3.0, 3.0) * CIMA * 0.16; // estribación occidental
  h += gauss(wx, wz, 5.0, -0.4, 3.0, 3.0) * CIMA * 0.13; // estribación oriental
  h += ruido(wx, wz) * CIMA * 0.07 * s; // crestas/vaguadas, solo tierra adentro
  h *= smoothstep(COSTA_Z - 1.2, COSTA_Z + 1.0, wz); // aplana hacia la costa
  return h;
}

/* ── Color por altura: EL DESCENSO HEREDA LA SIERRA, no inventa su paleta ────
 *
 * Esta tabla es, banda por banda y valor por valor, la que el PASO 2 dejó en
 * `VistaGlobalSierra.jsx` (commit `0ad96442f`). Se copia a propósito: la puerta
 * del Paso 3 exige que el descenso y la vista global se lean como el MISMO
 * macizo, y el 2026-09-02 se midió que no lo hacían — el verde de la vista
 * global daba rgb(91,120,51) y el del descenso rgb(45,66,33), porque cada uno
 * leía un juego de colores distinto del mismo archivo.
 *
 * ⚠️ DECISIÓN DE CANON ABIERTA, para el operador — la dejo escrita, no la tomo:
 * `pisosTermicos.js` expone HOY dos juegos de color para lo mismo. El Paso 1
 * derivó `PISOS_TERMICOS_SIERRA` (7 bandas, verdes oscuros: `#437233`,
 * `#5c8a69`, `#94975a`…); el Paso 2 decidió leer `PISOS_TERMICOS` (6 pisos
 * ecológicos, verdes más claros: `#6f9e4a`, `#4f8f7d`, `#9fb6bf`…) y añadir la
 * playa a mano. Los dos «leen de la tabla canónica» y dan macizos distintos.
 * Mientras eso no se resuelva, el descenso sigue a la Sierra, que es la vista
 * que el usuario ve primero. Cuál de los dos juegos es EL canónico es decisión
 * de la tabla y del arte, no de este archivo.
 *
 * El nival va a `#f4f9ff` y no al canónico por la misma razón: es el override
 * de render que el Paso 2 documentó (§ su informe, punto 1) para que la nieve
 * sobreviva a la luz dorada y no se lea ocre. Si el operador prefiere el
 * canónico, se cambia acá y en `VistaGlobalSierra.jsx` — los dos, o vuelven a
 * divergir. ── */
const LINEA_NIEVE = 4.15; // superpáramo → nival (≈ 4 793 msnm)

const colorPiso = (id, fallback) => {
  const p = PISOS_TERMICOS.find((b) => b.id === id);
  return hexARgb(p ? p.color : fallback);
};

/* De menor a mayor altitud. El orden IMPORTA: `colorPorAlturaRGB` recorre la
   lista hacia arriba, y una lista al revés hace que toda cota devuelva la
   primera banda (fue exactamente el bug que se midió acá el 2026-09-02). */
const BANDAS_RGB = [
  { tope: 0.28, rgb: hexARgb('#ddc78d') }, // playa / arena (la tabla no la separa)
  { tope: 0.95, rgb: colorPiso('calido', '#cba04a') }, // bosque seco tropical
  { tope: 1.75, rgb: colorPiso('templado', '#6f9e4a') }, // selva húmeda
  { tope: 2.6, rgb: colorPiso('frio', '#4f8f7d') }, // bosque de niebla
  { tope: 3.45, rgb: colorPiso('paramo', '#9fb6bf') }, // páramo / frailejones
  { tope: LINEA_NIEVE, rgb: colorPiso('superparamo', '#b9c6cc') }, // superpáramo (roca)
  { tope: Infinity, rgb: hexARgb('#f4f9ff') }, // nieve perpetua (override de render)
].sort((a, b) => a.tope - b.tope);

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
  const CUMBRE_X = -0.1;
  const CUMBRE_Z = 4.1;
  const n = segmentos + 1;
  const kx = radio / ventana;

  let maxReal = 0;
  const alturaVentana = (ix, iz) => {
    const u = ix / segmentos - 0.5;
    const v = iz / segmentos - 0.5;
    const wx = CUMBRE_X + u * 2 * ventana;
    const wz = CUMBRE_Z + v * 2 * ventana;
    /* Caída radial hacia el borde: la ventana es un recorte, y sin esto la
       montaña quedaría cortada a cuchillo en los cuatro lados — una meseta
       flotante. Con ella el macizo se apoya en el piso de la tarjeta. */
    const r = Math.min(1, Math.hypot(u, v) / 0.5);
    const falda = 1 - smoothstep(0.62, 1.0, r);
    return { wx, wz, h: Math.max(0, alturaSierra(wx, wz)) * falda };
  };

  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const h = alturaVentana(ix, iz).h;
      if (h > maxReal) maxReal = h;
    }
  }
  const ky = alto / (maxReal > 0 ? maxReal : CIMA);

  const posiciones = new Float32Array(n * n * 3);
  const colores = new Float32Array(n * n * 3);
  let p = 0;
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const { h } = alturaVentana(ix, iz);
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
