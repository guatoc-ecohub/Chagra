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
import { BANDAS_SIERRA } from '../pisosTermicos.js';

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

/* ── Color por altura, derivado de la tabla canónica ─────────────────────────
   El ANCHO del cruce entre bandas es la perilla que el PASO 2 está afinando
   para que se lean 7 pisos y no 3 (defecto §2.3.4). Vive acá, con un solo
   valor, para que afinarlo no obligue a tocar dos archivos. El valor actual
   (0.16 world Y ≈ ±185 m) es el heredado; cuando el Paso 2 cierre con su
   número medido, se cambia AQUÍ y lo heredan la vista global y el descenso. */
export const ANCHO_CRUCE_BANDA = 0.16;
/** Cruce de la línea de nieve: más angosto = filo nevado, no difuminado ocre. */
export const ANCHO_CRUCE_NIEVE = 0.16;

/*
 * 🔴 EL ORDEN IMPORTA — y la tabla canónica viene al revés de lo que este
 * algoritmo necesita.
 *
 * `BANDAS_SIERRA` (Paso 1) viene ordenada de la CIMA al MAR: su primer tope es
 * `Infinity` (la nieve perpetua). El recorrido `while (y > BANDAS[i].tope) i++`
 * espera lo contrario, de menor a mayor. Con el orden de la tabla, `y > Infinity`
 * es falso en la primera vuelta, el índice se queda en 0 y TODA altitud devuelve
 * el color de la primera banda: el macizo entero pintado de crema nival, sin
 * ninguno de los 7 pisos. Medido acá el 2026-09-02: `colorPorAlturaRGB` devolvía
 * `#f2ead6` para y = 0,1 … 4,9 sin excepción.
 *
 * Acá se ORDENA al consumir. No se toca la tabla canónica: es de otro carril, y
 * su orden cima→mar es correcto PARA ELLA (es el orden de la leyenda). El que
 * estaba mal era el consumidor. ⚠️ `VistaGlobalSierra.jsx` en la rama del Paso 1
 * tiene el mismo consumidor sin ordenar — ver el informe del Paso 3.
 */
const BANDAS_RGB = BANDAS_SIERRA.map((b) => ({
  tope: b.tope,
  rgb: hexARgb(b.hexColor),
})).sort((a, b) => a.tope - b.tope);

/** '#rrggbb' → [r,g,b] en 0..1 (sRGB tal cual, sin conversión de espacio). */
export function hexARgb(hex) {
  const s = String(hex).replace('#', '');
  const n = parseInt(s.length === 3 ? s.replace(/(.)/g, '$1$1') : s, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Color de ladera para una altura de mundo, mezclando entre bandas canónicas.
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
