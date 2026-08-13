/*
 * chorreraReal — LA CHORRERA DE VERDAD al fondo del mundo del agua.
 *
 * Antes aquí vivía un "macizo" inventado: un telón de triángulos con una cinta
 * plana bajando en gradas. Este módulo lo reemplaza por una recreación FIEL del
 * farallón real del cañón de Guatoc, portada del valle 3D (la fuente de verdad
 * de la forma — DEM real + fotos chorrera-01..12 + chorrera-real-detalle):
 *
 *   · LA PARED: malla paramétrica (x, t) → (x, y, z) con el lenguaje del
 *     farallón real — cumbre en DOMO redondeado corrida a la izquierda del
 *     hilo, hombros que caen al valle DENTRO del cuadro (cielo a los lados),
 *     contrafuertes verticales, la HENDIDURA cóncava que el agua talló
 *     (anfiteatro en V siguiendo la ruta), repisas boscosas en cada salto,
 *     afloramientos de roca clara ESTRATIFICADA (bedding horizontal + corona
 *     blanca bajo la cumbre), cárcavas verticales y franja mojada.
 *   · EL BOSQUE DE NIEBLA: dosel instanciado denso y caótico sobre la cara
 *     (la escala de la pared la dan las copas diminutas) + fleco de cresta.
 *   · EL AGUA (volumétrica, no calcomanía): UNA SOLA cascada — el hilo nace
 *     BIEN ABAJO de la cresta (T_NACE) y baja en CINCO SALTOS calcados del
 *     zoom de foto-real-chorrera-montana, corriéndose a la IZQUIERDA en cada
 *     repisa (deriva neta derecha→izquierda vista desde el domo). El salto 2
 *     es el velo ancho y blanco; los bajos, hilo delgado serpenteante. Cada
 *     caída es una columna con PANZA (sección en arco, normales reales),
 *     shader de estrías/hebras/espuma, el pie REVIENTA en bruma volumétrica
 *     instanciada y mechones de gotas caen delante del velo. CERO chorros
 *     extra: los "hilos paralelos" y "rezumaderos" de la v1 no existen en el
 *     mundo real y fueron eliminados (corrección del operador).
 *
 * Proporción REAL: ~590 m de caída total (la más alta de Colombia) contra una
 * finca de juguete — la pared mide ~19 veces la loma del nacimiento. El agua
 * es LO MÁS BLANCO Y BRILLANTE del cuadro (contraluz de la hora dorada: la
 * cresta arde, la cara se hunde en verde hondo, el hilo blanco corta todo).
 *
 * Es RENDER, no física — la regla del valle: La Chorrera se dibuja, no se
 * simula. Todo determinista (crearRng), cero assets, luz HORNEADA en vértices
 * (la pared no depende de las luces de la escena). Un useFrame único mueve
 * uTime de los shaders del agua; reduced-motion lo congela.
 */
import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { mezclar } from '../atmosferaMadre.js';
import { crearRng } from '../particulasData.js';
import { SOL_DIR } from './solAgua.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const suavizar = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/* Ruido determinista (hash de senos, mismo espíritu que fondoAgua). */
const ruido = (wx, wz) =>
  Math.sin(wx * 1.1 + wz * 0.8) * 0.5 +
  Math.sin(wx * 2.1 - wz * 1.5 + 1.7) * 0.3 +
  Math.sin(wx * 3.7 + wz * 2.9 + 4.2) * 0.2;

/* ── EL MACIZO: dimensiones y marco ─────────────────────────────────────────
      Vive en el rumbo del nacimiento (el vuelo de llegada lo encuentra de
      frente). Coordenadas LOCALES: x a lo largo de la cresta, y arriba,
      z hacia el espectador; el grupo entero rota mirando al diorama. */
const CH = {
  cx: -62, cz: -97, // centro (mundo): detrás de la loma del nacimiento
  medio: 62, // media anchura de la lámina
  // el pie: apenas bajo el horizonte de la falda — el impacto final y su
  // colchón de bruma deben asomar SOBRE la loma del diorama (con base -14 la
  // falda tapaba media caída; visto en el gate v1)
  base: -6,
};
/* rotación del grupo: el +z local mira al origen del diorama */
const RY = Math.atan2(-CH.cx, -CH.cz);
/* el sol en el marco LOCAL del macizo (SOL_DIR rotado −RY): detrás de la
   pared y un poco a la izquierda — CONTRALUZ pura, la cresta en llamas */
const SOL_LOCAL = new THREE.Vector3(
  SOL_DIR.x * Math.cos(RY) - SOL_DIR.z * Math.sin(RY),
  SOL_DIR.y,
  SOL_DIR.x * Math.sin(RY) + SOL_DIR.z * Math.cos(RY),
);

/* ── LA CRESTA (el perfil real de wallTopY, a escala): cumbre en DOMO
      super-gaussiano (corona ANCHA redondeada, no pico) corrida a la
      izquierda del hilo; hombro derecho que CAE al valle en cuadro; collado
      izquierdo — cielo a ambos lados del domo, como en la foto. ── */
function crestaY(x) {
  let h = 46 + ruido(x * 0.12 + 2.2, 7.7) * 5;
  h += 12 * Math.exp(-(((x + 6) / 16) ** 4)); // el domo (potencia 4: lomo, no cono)
  h -= 16 * suavizar(4, 34, x); // hombro derecho: la cresta baja al valle
  h -= 9 * Math.exp(-(((x + 31) / 14) ** 2)); // collado izquierdo
  // el flanco derecho muere PRONTO y DURO: entre este macizo y el morro del
  // Chiflón hay un portezuelo real (la foto wide muestra la V del cañón
  // vecino) — el hombro largo de la v1 tapaba esa separación
  h *= 1 - suavizar(22, 56, x) * 0.93;
  h *= 1 - suavizar(40, 100, -x) * 0.55; // costado izquierdo
  return CH.base + Math.max(3, h);
}

/* ── LA RUTA DEL AGUA (calcada del zoom de foto-real-chorrera-montana):
      UN solo hilo en CINCO saltos distinguibles — (1) el labio fino y corto,
      (2) el velo ANCHO blanco (el tramo más brillante), (3) y (4) tramos
      medios que se corren a la IZQUIERDA en cada repisa, (5) la caída baja
      larga y hebrosa que muere en la V del bosque. Deriva neta DERECHA →
      IZQUIERDA vista desde el domo (x local + = derecha del espectador; la
      foto manda). x=0 es el canal (flanco derecho del domo). */
const T_NACE = 0.75; // el hilo nace BIEN ABAJO de la cresta, no del skyline
const SALTOS = [0.69, 0.545, 0.435, 0.325]; // repisas donde golpea y se desvía
const CORTES = [T_NACE, ...SALTOS, 0.14]; // los 5 saltos de la caída
const RUTA = [
  // deriva lateral REAL de la foto: ~23% de la altura de la caída (una caída
  // de ~32 u recorre ~7 u hacia la izquierda; con ±3 u leía casi a plomada)
  [0.75, 3.4], [0.7, 3.2], // salto 1: el labio, casi a plomo
  [0.545, 2.7], [0.52, 1.85], // salto 2 ancho; en la repisa se corre a la izq.
  [0.435, 1.45], [0.41, 0.65], // salto 3 + corrimiento
  [0.325, 0.15], [0.3, -0.75], // salto 4 + corrimiento
  [0.22, -1.7], [0.14, -3.4], // salto 5: el tramo largo, serpenteando
];
function rutaX(t) {
  if (t >= RUTA[0][0]) return RUTA[0][1];
  for (let i = 1; i < RUTA.length; i++) {
    if (t >= RUTA[i][0]) {
      const [t0, x0] = RUTA[i - 1];
      const [t1, x1] = RUTA[i];
      return mix(x0, x1, (t0 - t) / (t0 - t1));
    }
  }
  return RUTA[RUTA.length - 1][1];
}

/* ── LA HENDIDURA: el agua no baja por el lomo convexo — corre por el fondo
      de un anfiteatro CÓNCAVO tallado en la cara (embudo en V: abierto
      arriba, cerrado abajo). Se desvanece bajo la cumbre (no raja el skyline)
      y afloja al pie. ── */
function garganta(x, t) {
  const dx = x - rutaX(t);
  const tc = clamp(t, 0, 1);
  const fade = (1 - suavizar(0.86, 0.985, tc)) * (0.35 + 0.65 * suavizar(0.06, 0.3, tc));
  const sA = mix(9, 19, tc); // el embudo se abre hacia arriba
  const amph = Math.exp(-(dx * dx) / (sA * sA)) * fade;
  const slot = Math.exp(-(dx * dx) / 9) * fade; // el tajo interior
  return { amph, slot, talla: amph * 5.7 + slot * 2.9 };
}

/* contrafuertes VERTICALES + costillas menores (relieve de pared, no colina) */
const corruga = (x) =>
  (ruido(x / 33 + 5.1, 1.9) * 0.5 + 0.5) * 10.5 + (ruido(x / 9 + 11.4, 4.2) * 0.5 + 0.5) * 2.4;

/* repisas de los saltos + hornacina del nacimiento (el hilo salta de un borde
   de piedra real, con un nicho en sombra encima: de ahí MANA el agua) */
function repisa(x, t) {
  let b = 0;
  for (const lt of SALTOS) b += Math.exp(-((t - lt) ** 2) / (2 * 0.025 * 0.025));
  let s = b * 1.8 * Math.exp(-(x * x) / (10.5 * 10.5));
  const cercaHilo = Math.exp(-((x - rutaX(t)) ** 2) / (7.5 * 7.5));
  s -= cercaHilo * 2.1 * Math.exp(-((t - (T_NACE + 0.034)) ** 2) / (2 * 0.021 * 0.021));
  s += cercaHilo * 1.3 * Math.exp(-((t - T_NACE) ** 2) / (2 * 0.012 * 0.012));
  return s;
}

/* estratos: bedding cuasi-horizontal con ondulación (0..1 dentro del banco) */
const ESTRATO_P = 1.45;
function estratoF(x, y) {
  const warp = ruido(x / 29 + 3.1, 0.5) * 1.55 + Math.sin(x * 0.035) * 0.55;
  const sy = (y + warp) / ESTRATO_P;
  return sy - Math.floor(sy);
}

/* cárcavas de drenaje verticales con meandro (la anisotropía vertical es LA
   señal de "pared", no "suelo visto desde un dron") */
function carcava(x, y) {
  const g = ruido(x / 3.3 + 4.9 + ruido(y / 18 + 3.3, 0.7) * 0.35, y / 33 + 1.1) * 0.5 + 0.5;
  return suavizar(0.62, 0.8, g) * (0.55 + 0.45 * (ruido(y / 12 + 8.8, x / 55 + 0.3) * 0.5 + 0.5));
}

/* ── AFLORAMIENTOS de roca desnuda (0=bosque, 1=piedra): manchones a dos
      escalas + corona blanca ESTRATIFICADA bajo la cumbre (flanco izquierdo,
      rota en tramos) + el anfiteatro que el hilo cortó (solo tramo bajo-medio)
      + la roca del NACIMIENTO (el agua brota de piedra, jamás del bosque)
      + cornisas irregulares bajo cada salto. ── */
function mascaraRoca(x, y, t) {
  // frecuencias ALTAS y umbral alto: manchones quebrados sueltos entre el
  // bosque, jamás planchones lisos (el gate v1 los marcó: losas grises)
  const o =
    (ruido(x / 6 + 1.7, y / 4.5 + 8.2) * 0.5 + 0.5) * 0.66 +
    (ruido(x / 2 + 5.3, y / 1.5 + 3.9) * 0.5 + 0.5) * 0.34;
  const corredor = 0.22 + 0.78 * Math.exp(-((x - rutaX(t)) ** 2) / (31 * 31));
  let m = suavizar(0.7, 0.78, o) * corredor * (0.35 + 0.65 * suavizar(0.12, 0.4, t));
  const coronaT = suavizar(0.845, 0.875, t) * (1 - suavizar(0.905, 0.935, t));
  m = Math.max(
    m,
    0.62 * coronaT * (1 - suavizar(4, 33, x)) * suavizar(-40, -20, x) *
      suavizar(0.44, 0.62, ruido(x / 3.5 + 9.1, y / 3 + 4.4) * 0.5 + 0.5),
  );
  const cercaHilo = Math.exp(-((x - rutaX(t)) ** 2) / (4.4 * 4.4));
  m = Math.max(
    m,
    cercaHilo * suavizar(0.55, 0.74, ruido(x / 4.5 + 2.4, y / 3 + 7.7) * 0.5 + 0.5) *
      suavizar(0.1, 0.28, t) * (1 - suavizar(0.5, 0.68, t)),
  );
  const nace = Math.exp(-((x - rutaX(t)) ** 2) / (6.4 * 6.4)) *
    Math.exp(-((t - T_NACE) ** 2) / (2 * 0.03 * 0.03));
  m = Math.max(m, nace * 0.92 * suavizar(0.33, 0.6, ruido(x / 3.4 + 3.3, y / 2.4 + 8.8) * 0.5 + 0.5));
  for (const lt of SALTOS) {
    const dt = t - lt;
    if (dt < 0 && dt > -0.07) {
      const rota = suavizar(0.35, 0.7, ruido(x / 3.7 + 6.1, y / 1.8 + 2.8) * 0.5 + 0.5);
      m = Math.max(m, cercaHilo * suavizar(-0.07, -0.025, dt) * 0.5 * rota);
    }
  }
  return m;
}

/* ── la CARA del farallón: (x, t) → {y, z, roca, repisa} — PARED, no ladera
      (el plano casi no se echa atrás al subir; el relieve lo ponen los
      contrafuertes, la hendidura y los escalones de estrato). ── */
function caraLocal(x, t) {
  const B = CH.base;
  const H = crestaY(x);
  const y = B + (H - B) * t;
  const bump = ruido(x / 16 + 2.2, y / 13 + 5.5) * 2.6 + ruido(x / 5.7 + 8.8, y / 4.8 + 1.9) * 1.0;
  const g = garganta(x, t);
  let z = corruga(x) * (1 - g.amph * 0.72) + bump * (1 - g.slot * 0.5) - t * 2.0;
  z -= 3.1 * Math.exp(-((x + 1.6) ** 2) / (8.6 * 8.6)); // la muesca del canal
  z -= g.talla; // el anfiteatro cóncavo, hundido en la cara
  const shelf = repisa(x, t);
  z += shelf; // las repisas boscosas sobresalen
  const rk = mascaraRoca(x, y, t);
  if (rk > 0.02) z += rk * ((estratoF(x, y) - 0.5) * 0.55 + 0.22); // cornisas de banco
  z -= carcava(x, y) * 1.5;
  return { y, z, rk, tread: clamp(shelf / 1.2, 0, 1) };
}

/* luz de gran forma: gargantas en sombra, flancos hacia el sol local con luz
   rasante — multiplicada al color de la cara Y del bosque (misma respiración) */
function sombraGranForma(x, y) {
  const xw = x + ruido(y / 23 + 0.7, x / 99 + 3.9) * 5;
  const cav = clamp(corruga(xw) / 12.9, 0, 1);
  const dx = (corruga(xw + 0.7) - corruga(xw - 0.7)) / 1.4;
  return clamp(0.5 + cav * 0.45 + clamp(dx * SOL_LOCAL.x * -1, -1.2, 1.2) * 0.18, 0.3, 1.15);
}

/* ── LA PARED (color por vértice, luz horneada — meshBasic: no depende de las
      luces de la escena y el atardecer no se la come) ── */
function construirPared(pal, res) {
  const { nx: NX, nt: NT } = res;
  const APRON = 8; // filas de falda enterrada: la roca SALE del suelo, sin canto
  const FILAS = NT + 1 + APRON;
  const pos = new Float32Array((NX + 1) * FILAS * 3);
  const col = new Float32Array((NX + 1) * FILAS * 3);
  const idx = [];
  const cVeg = new THREE.Color(0x1b470e);
  const cVegL = new THREE.Color(0x4d8226);
  const cVegHonda = new THREE.Color(0x0c1c07);
  const cClaro = new THREE.Color(0x6b7a42);
  const cRocaPal = new THREE.Color(0xece9dd);
  const cRocaMed = new THREE.Color(0x969c96);
  const cRocaJunta = new THREE.Color(0x39362e);
  const cRocaTibia = new THREE.Color(0xb5a184);
  const cMojada = new THREE.Color(0x232e28);
  const cAire = new THREE.Color(pal.aire);
  const cArde = new THREE.Color(mezclar(pal.resplandor, '#ffd9a0', 0.4));
  const tmp = new THREE.Color();
  const tmp2 = new THREE.Color();
  let vi = 0;
  for (let it = -APRON; it <= NT; it++) {
    const tRaw = it / NT;
    const t = Math.max(tRaw, 0);
    for (let ix = 0; ix <= NX; ix++) {
      const x = -CH.medio + (2 * CH.medio * ix) / NX;
      const fp = caraLocal(x, t);
      let { y, z } = fp;
      const rk = fp.rk;
      if (tRaw < 0) {
        // el pie se derrama hacia el espectador y se hunde: costura enterrada
        const k = tRaw / (-APRON / NT);
        z += k * k * 18;
        y = mix(y, CH.base - 9 - k * 8, Math.min(1, k * 1.7));
      }
      pos[vi * 3] = x;
      pos[vi * 3 + 1] = y;
      pos[vi * 3 + 2] = z;

      // bosque de niebla: masa caótica de tres verdes + mota + AO de dosel
      const vegN = ruido(x / 6.6 + 9.9, y / 5 + 9.9) * 0.5 + 0.5;
      tmp.copy(cVeg).lerp(cVegL, vegN);
      tmp.lerp(cVegHonda, (ruido(x / 10.5 + 6.3, y / 7.7 + 2.8) * 0.5 + 0.5) * 0.82);
      tmp.offsetHSL(0, 0, ruido(x / 1.6 + 1.1, y / 1.3 + 4.4) * 0.09);
      const clA = ruido(x / 6.4 + 3.7, y / 5.7 + 6.1) * 0.5 + 0.5;
      tmp.multiplyScalar(1 - suavizar(0.45, 0.8, clA) * 0.36);
      tmp.lerp(cClaro, suavizar(0.74, 0.86, vegN) * 0.55);
      // roca clara ESTRATIFICADA: bancos pálidos, junta-sombra, parche tibio
      if (rk > 0.06) {
        const f = estratoF(x, y);
        const veta = ruido(x / 2.9 + 7.2, y / 0.5 + 1.3) * 0.5 + 0.5;
        tmp2.copy(cRocaMed).lerp(cRocaPal, suavizar(0.15, 0.7, f) * 0.35 + veta * 0.3);
        tmp2.lerp(cRocaTibia, suavizar(0.52, 0.78, ruido(x / 26 + 4.8, y / 21 + 1.6) * 0.5 + 0.5) * 0.16);
        tmp2.lerp(cRocaJunta, suavizar(0.62, 0.88, f) * 0.6 + suavizar(0.62, 0.85, veta) * 0.2);
        tmp2.multiplyScalar(1 - suavizar(0.68, 0.8, ruido(x / 0.8 + 1.9, y / 29 + 6.6) * 0.5 + 0.5) * 0.45);
        const coronaB = suavizar(0.845, 0.875, t) * (1 - suavizar(0.905, 0.935, t)) *
          (1 - suavizar(4, 33, x)) * suavizar(-40, -20, x);
        if (coronaB > 0.01) tmp2.lerp(cRocaPal, coronaB * 0.35);
        tmp.lerp(tmp2, Math.min(1, rk * 1.15));
      }
      // franja húmeda y pulida siguiendo el camino del agua
      tmp.lerp(cMojada, clamp(Math.exp(-((x - rutaX(t)) ** 2) / (1.7 * 1.7)) * 0.5, 0, 0.55));
      tmp.multiplyScalar(1 - carcava(x, y) * 0.5 * (1 - Math.min(1, rk) * 0.78));
      // sombra proyectada bajo cada cornisa de salto (verticalidad dura)
      for (const lt of SALTOS) {
        const dt = t - lt;
        if (dt < 0 && dt > -0.08) {
          tmp.multiplyScalar(
            1 - Math.exp(-(((dt + 0.026) / 0.02) ** 2)) *
              Math.exp(-((x - rutaX(lt + 0.01)) ** 2) / (14 * 14)) * 0.42,
          );
        }
      }
      // gran forma + pie en penumbra + AO del anfiteatro (contraluz: todo el
      // cuenco del agua vive en sombra propia)
      const g = garganta(x, t);
      tmp.multiplyScalar(
        mix(sombraGranForma(x, y) * (0.5 + t * 0.34), 1.02, Math.min(1, rk) * 0.42) *
          (1 - (1 - suavizar(0, 0.38, t)) * 0.3) *
          (1 - g.amph * 0.3 - g.slot * 0.2),
      );
      // perspectiva aérea horneada + velo del atardecer (la pared vive lejos;
      // 0.2 de base la deslavaba a gris — la foto real es verde HONDO)
      tmp.lerp(cAire, 0.11 + suavizar(0.52, 0.99, t) * 0.14);
      // la CONTRALUZ: el filo del skyline arde dorado (el sol cuelga detrás)
      tmp.lerp(cArde, suavizar(0.9, 1.0, t) * 0.4);
      if (tRaw < 0) tmp.multiplyScalar(1 - (tRaw / (-APRON / NT)) * 0.55);
      col[vi * 3] = tmp.r;
      col[vi * 3 + 1] = tmp.g;
      col[vi * 3 + 2] = tmp.b;
      vi++;
    }
  }
  for (let it = 0; it < FILAS - 1; it++) {
    for (let ix = 0; ix < NX; ix++) {
      const a = it * (NX + 1) + ix;
      const b = a + 1;
      const c = a + (NX + 1);
      const d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(idx);
  return geo;
}

/* ── EL BOSQUE de pared: dosel instanciado (copas chicas: la escala del
      farallón la dan ellas) + fleco de cresta en silueta. UN draw call. ── */
function construirBosque(pal, cuantas) {
  const rng = crearRng(97);
  const geo = new THREE.IcosahedronGeometry(1, 0);
  geo.scale(1, 1.18, 1);
  // luz cenital horneada en la copa: arriba claro, abajo oscuro — LA señal
  // de "pared vertical iluminada por el cielo"
  const pp = geo.attributes.position;
  let yMin = 1e9;
  let yMax = -1e9;
  for (let i = 0; i < pp.count; i++) {
    const yy = pp.getY(i);
    if (yy < yMin) yMin = yy;
    if (yy > yMax) yMax = yy;
  }
  const cc = new Float32Array(pp.count * 3);
  for (let i = 0; i < pp.count; i++) {
    const k = 0.3 + 0.84 * ((pp.getY(i) - yMin) / (yMax - yMin));
    cc[i * 3] = cc[i * 3 + 1] = cc[i * 3 + 2] = k;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cc, 3));

  const nFleco = Math.round(cuantas * 0.08);
  const inst = new THREE.InstancedMesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false }),
    cuantas + nFleco,
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eje = new THREE.Vector3(0, 1, 0);
  const v = new THREE.Vector3();
  const esc = new THREE.Vector3();
  const col = new THREE.Color();
  const cAire = new THREE.Color(pal.aire);
  let puestos = 0;
  let guarda = cuantas * 40;
  while (puestos < cuantas && guarda-- > 0) {
    const x = (rng() * 2 - 1) * CH.medio * 0.94;
    const t = 0.04 + rng() * 0.9;
    const fp = caraLocal(x, t);
    if (fp.rk > 0.35 + rng() * 0.35 && fp.tread < 0.35) continue; // borde bosque-roca difuso
    if (Math.abs(x - rutaX(t)) < 1.6) continue; // el paso del agua queda libre
    const cl = ruido(x / 6.4 + 3.7, fp.y / 5.7 + 6.1) * 0.5 + 0.5;
    const parche = ruido(x / 26 + 7.7, fp.y / 19 + 2.2) * 0.5 + 0.5;
    if (!(cl > 0.4 || fp.tread > 0.3 || rng() < 0.1) || rng() > 0.35 + parche * 0.9) continue;
    const sc = (0.35 + cl * 0.45 + rng() * 0.35) * (1 - t * 0.3) *
      (rng() < 0.03 ? 2.3 : rng() < 0.08 ? 1.6 : 1);
    q.setFromAxisAngle(eje, rng() * Math.PI * 2);
    m4.compose(v.set(x, fp.y + sc * 0.5, fp.z + 0.5), q, esc.set(sc, sc * (0.9 + rng() * 0.35), sc));
    inst.setMatrixAt(puestos, m4);
    // rodales que viran de tono + la misma gran forma que la cara + velo
    col.set(0x2a4b1d).offsetHSL(
      (parche - 0.5) * 0.09 + (rng() - 0.5) * 0.04,
      (parche - 0.5) * 0.12 + (rng() - 0.5) * 0.08,
      (parche - 0.5) * 0.09 + (rng() - 0.5) * 0.1,
    );
    col.multiplyScalar(sombraGranForma(x, fp.y) * (0.62 + t * 0.36));
    col.lerp(cAire, 0.12);
    inst.setColorAt(puestos, col);
    puestos++;
  }
  // fleco de cresta: arbustos achaparrados en SILUETA contra el cielo dorado
  for (let i = 0; i < nFleco; i++) {
    let x = (rng() * 2 - 1) * CH.medio * 0.9;
    const t = 0.975 + rng() * 0.02;
    if (Math.abs(x - rutaX(t)) < 2) x += 4;
    const fp = caraLocal(x, t);
    const sc = 0.3 + rng() * 0.55;
    q.setFromAxisAngle(eje, rng() * Math.PI * 2);
    m4.compose(v.set(x, fp.y + sc * 0.6, fp.z - 0.4), q, esc.set(sc, sc * (0.8 + rng() * 0.5), sc));
    inst.setMatrixAt(puestos + i, m4);
    col.set(0x1c2a14).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.05);
    inst.setColorAt(puestos + i, col);
  }
  // los cupos no colocados quedan a escala cero (invisibles)
  for (let i = puestos; i < cuantas; i++) {
    m4.makeScale(0, 0, 0);
    inst.setMatrixAt(i, m4);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

/* ── EL FRAILEJONAL DE LA CRESTA: la cumbre en mesa del farallón ES páramo
      (foto-real-chorrera-montana: la meseta sobre La Chorrera). Pocos, en
      silueta contra el cielo dorado, y ATERRIZADOS: cada base va clavada en
      la superficie real de la pared (caraLocal.y − 0.06) — corrección del
      operador: en el render viejo los frailejones se veían FLOTANDO. Dos
      draw calls (tallos + rosetas instanciados). ── */
function construirFrailejonal(pal, cuantas) {
  const rng = crearRng(211);
  const geoTallo = new THREE.CylinderGeometry(0.055, 0.075, 1, 5);
  geoTallo.translate(0, 0.5, 0); // el pie del tallo EN su origen: aterriza solo
  const geoRoseta = new THREE.IcosahedronGeometry(0.17, 0);
  geoRoseta.scale(1, 0.82, 1);
  const matTallo = new THREE.MeshBasicMaterial({ fog: false });
  const matRoseta = new THREE.MeshBasicMaterial({ fog: false });
  const tallos = new THREE.InstancedMesh(geoTallo, matTallo, cuantas);
  const rosetas = new THREE.InstancedMesh(geoRoseta, matRoseta, cuantas);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const esc = new THREE.Vector3();
  const col = new THREE.Color();
  const cArde = new THREE.Color(mezclar(pal.resplandor, '#ffd9a0', 0.4));
  let puestos = 0;
  let guarda = cuantas * 30;
  while (puestos < cuantas && guarda-- > 0) {
    const x = -42 + rng() * 64;
    const t = 0.963 + rng() * 0.026;
    if (Math.abs(x - rutaX(t)) < 4) continue; // el canal del agua queda libre
    const fp = caraLocal(x, t);
    const alto = 0.5 + rng() * 0.42;
    const yBase = fp.y - 0.06; // clavado en la cara: JAMÁS flotando
    q.setFromAxisAngle(v.set(0, 1, 0), rng() * Math.PI * 2);
    m4.compose(v.set(x, yBase, fp.z - 0.2), q, esc.set(alto * 0.8, alto, alto * 0.8));
    tallos.setMatrixAt(puestos, m4);
    col.set(0x453a24).offsetHSL(0, 0, (rng() - 0.5) * 0.05);
    col.lerp(cArde, 0.12);
    tallos.setColorAt(puestos, col);
    m4.compose(
      v.set(x, yBase + alto * 0.96, fp.z - 0.2),
      q,
      esc.set(alto * 0.95, alto * 0.9, alto * 0.95),
    );
    rosetas.setMatrixAt(puestos, m4);
    // la roseta plateada agarra el último sol de la tarde
    col.set(0xaeb287).offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.07);
    col.lerp(cArde, 0.3);
    rosetas.setColorAt(puestos, col);
    puestos++;
  }
  for (let i = puestos; i < cuantas; i++) {
    m4.makeScale(0, 0, 0);
    tallos.setMatrixAt(i, m4);
    rosetas.setMatrixAt(i, m4);
  }
  tallos.instanceMatrix.needsUpdate = true;
  rosetas.instanceMatrix.needsUpdate = true;
  const grupo = new THREE.Group();
  grupo.add(tallos);
  grupo.add(rosetas);
  return grupo;
}

/* ═══ EL AGUA (el enfoque volumétrico del valle, portado) ════════════════════
      Cada caída es una columna con sección en ARCO (panza hacia la cámara) y
      normales reales; el shader pinta estrías cayendo, hebras con vanos, pie
      desflecado, espuma como LO MÁS BLANCO del cuadro, fresnel de silueta y
      destellos que corren. */
const SOL_GLSL = `vec3(${SOL_DIR.x.toFixed(4)}, ${SOL_DIR.y.toFixed(4)}, ${SOL_DIR.z.toFixed(4)})`;

/* EL RELOJ DEL AGUA: un solo uniform compartido por TODOS los materiales de
   la caída (cuerpos, bruma, gotas) — useFrame escribe UNA VEZ y todo el
   sistema respira junto. Vive a nivel de módulo (no es valor de render:
   mutarlo desde el frame loop es legal para react-hooks/immutability). */
const RELOJ_AGUA = { value: 1.7 };

const aguaVert = /* glsl */ `
  attribute float aT;
  varying vec2 vUv;
  varying float vT;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vUv = uv; vT = aT;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vW = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const aguaFrag = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  uniform float uBright;
  uniform float uAlpha;
  varying vec2 vUv;
  varying float vT;
  varying vec3 vN;
  varying vec3 vW;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    // velos: estrías verticales cayendo, dos octavas
    float n1 = noise(vec2(vUv.x * 9.0, vUv.y * 16.0 - uTime * 1.2));
    float n2 = noise(vec2(vUv.x * 22.0 + 7.0, vUv.y * 34.0 - uTime * 2.1));
    float streak = n1 * 0.6 + n2 * 0.4;
    float lat = smoothstep(0.0, 0.20, vUv.x) * smoothstep(1.0, 0.80, vUv.x);
    lat = pow(lat, 0.5);
    // bordes DESHILACHADOS: el velo se deshace en hebras al caer
    float fray = noise(vec2(vUv.x * 30.0, vUv.y * 44.0 - uTime * 2.6));
    lat *= 0.60 + 0.40 * fray;
    float a = lat * (0.74 + smoothstep(0.30, 0.72, streak) * 0.34);
    a += smoothstep(0.62, 0.92, streak) * lat * 0.50;
    // HEBRAS: hilos verticales con vanos francos (el velo necesita valles de alfa)
    float strands = noise(vec2(vUv.x * 5.5 + 3.0, vUv.y * 2.2 - uTime * 0.25));
    a *= 0.55 + 0.45 * smoothstep(0.15, 0.58, strands + streak * 0.35);
    // nace fino, el pie REVIENTA blanco (impacto)
    a *= smoothstep(0.0, 0.09, vT);
    float impact = smoothstep(0.80, 1.0, vT);
    a = min(1.0, a + impact * lat * 0.35);
    // el pie muere ROTO en lenguas dentro de la bruma (sin borde cuadrado)
    float footN = noise(vec2(vUv.x * 12.0, uTime * 0.7));
    a *= 1.0 - smoothstep(0.955 - footN * 0.05, 0.995 - footN * 0.03, vT) * 0.9;
    a *= 0.80 + 0.20 * noise(vec2(3.0, vUv.y * 2.6 + 0.4));

    // LUZ: el agua es un CUERPO redondo — difusa + especular + fresnel.
    // Contraluz de la tarde: piso difuso alto (el velo transmite luz).
    vec3 N = normalize(vN);
    vec3 V = normalize(cameraPosition - vW);
    vec3 L = normalize(${SOL_GLSL});
    // la receta de luz del agua BUENA (waterfalls del valle, veredicto del
    // operador): panza que modela + silueta fría plateada, no dorada
    float dif = 0.55 + 0.58 * max(dot(N, L), 0.0);
    vec3 Hv = normalize(L + V);
    float spec = pow(max(dot(N, Hv), 0.0), 42.0);
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
    float glint = smoothstep(0.72, 0.94, n2) * spec;
    a = min(1.0, a + fres * 0.22 * lat);
    float foamK = clamp(smoothstep(0.45, 0.85, streak) * 0.62 + impact * 0.55 + fres * 0.30, 0.0, 1.0);
    vec3 body = uTint * (0.66 + streak * 0.30);
    vec3 foam = vec3(1.06, 1.05, 1.00) * uBright;   // espuma: LO MÁS BLANCO
    vec3 col = mix(body, foam, foamK) * dif
             + vec3(1.25, 1.18, 1.02) * (spec * 0.85 + glint * 1.5)
             + vec3(0.55, 0.62, 0.72) * fres * 0.35;
    col *= 1.0 + impact * 0.22;
    gl_FragColor = vec4(col, min(a, 1.0) * 0.97 * uAlpha);
  }
`;

/* sombra de contacto: velo oscuro pegado a la roca DETRÁS del agua — separa
   el cuerpo de la pared (hay un objeto DELANTE, no pintado) */
const sombraVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const sombraFrag = /* glsl */ `
  varying vec2 vUv;
  void main() {
    float lat = smoothstep(0.0, 0.34, vUv.x) * smoothstep(1.0, 0.66, vUv.x);
    float v = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.94, vUv.y);
    gl_FragColor = vec4(0.02, 0.045, 0.045, lat * v * 0.58);
  }
`;

/* camino de una caída sobre la cara: cuelga A PLOMO del labio (running max en
   z), respira en anchura y serpentea apenas — compartido por agua y sombra */
function rutaCaida(xc, tTop, tBot, anchos, SEGS) {
  const xAt = typeof xc === 'function' ? xc : () => xc;
  const x0 = xAt(tTop);
  const muestras = [];
  for (let i = 0; i <= SEGS; i++) {
    const t = tTop - ((tTop - tBot) * i) / SEGS;
    const xi = xAt(t);
    muestras.push({ x: xi, ...caraLocal(xi, t) });
  }
  for (let i = 1; i <= SEGS; i++) muestras[i].z = Math.max(muestras[i].z, muestras[i - 1].z - 0.04);
  for (let k = 0; k < 7; k++) {
    for (let i = 1; i < SEGS; i++) {
      muestras[i].z = (muestras[i - 1].z + muestras[i].z * 2 + muestras[i + 1].z) / 4;
    }
  }
  const w = [];
  for (let i = 0; i <= SEGS; i++) {
    const k = i / SEGS;
    const crece = 1 + k * 0.55 + Math.pow(k, 6) * anchos.abanico;
    const respira = 0.72 + 0.56 * (Math.sin(muestras[i].y * 0.28 + x0 * 1.7) * 0.5 + 0.5) *
      (Math.sin(muestras[i].y * 0.12 + x0) * 0.5 + 0.5) * 1.4;
    w.push((anchos.base + muestras[i].tread * anchos.fan) * crece * respira);
  }
  for (let k = 0; k < 4; k++) for (let i = 1; i < SEGS; i++) w[i] = (w[i - 1] + w[i] * 2 + w[i + 1]) / 4;
  const xo = muestras.map((s) => (Math.sin(s.y * 0.19 + x0) + Math.sin(s.y * 0.39 + x0 * 2.0) * 0.5) * 0.35);
  return { muestras, w, xo };
}

/* caída VOLUMÉTRICA: grid con sección en arco (panza hacia la cámara).
   SEGS 110 = la resolución del agua BUENA del valle: la caída fluye sin
   codos poligonales (con 64 se veían quiebres duros en el serpenteo). */
function construirCaida(xc, tTop, tBot, anchos, tinte) {
  const SEGS = 110;
  const NW = 8;
  const { muestras, w, xo } = rutaCaida(xc, tTop, tBot, anchos, SEGS);
  const prof = anchos.prof ?? 0.34;
  const posArr = [];
  const uvArr = [];
  const tArr = [];
  const idx = [];
  for (let i = 0; i <= SEGS; i++) {
    const s = muestras[i];
    const k = i / SEGS;
    const panza = Math.min(w[i] * prof, 1.65) * (0.72 + 0.28 * Math.sin(k * Math.PI));
    for (let j = 0; j < NW; j++) {
      const u = j / (NW - 1);
      const arco = Math.pow(Math.sin(u * Math.PI), 0.8);
      posArr.push(s.x + xo[i] + (u - 0.5) * w[i], s.y, s.z + 0.26 + panza * arco);
      uvArr.push(u, k * anchos.vTiles);
      tArr.push(k);
    }
    if (i > 0) {
      const b = i * NW;
      const a = b - NW;
      for (let j = 0; j < NW - 1; j++) idx.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setAttribute('aT', new THREE.Float32BufferAttribute(tArr, 1));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.ShaderMaterial({
    vertexShader: aguaVert,
    fragmentShader: aguaFrag,
    uniforms: {
      uTime: RELOJ_AGUA, // compartido: un write por frame anima todo
      uTint: { value: new THREE.Color(tinte) },
      uBright: { value: anchos.brillo ?? 1.14 },
      uAlpha: { value: anchos.alphaK ?? 1.0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 3;
  mesh.frustumCulled = false;
  return { mesh, mat };
}

function construirSombraCaida(xc, tTop, tBot, anchos) {
  const SEGS = 70;
  const { muestras, w, xo } = rutaCaida(xc, tTop, tBot, anchos, SEGS);
  const posArr = [];
  const uvArr = [];
  const idx = [];
  for (let i = 0; i <= SEGS; i++) {
    const s = muestras[i];
    const ancho = w[i] * 1.75;
    posArr.push(s.x + xo[i] - ancho / 2, s.y, s.z + 0.1, s.x + xo[i] + ancho / 2, s.y, s.z + 0.1);
    uvArr.push(0, i / SEGS, 1, i / SEGS);
    if (i > 0) {
      const b = i * 2;
      idx.push(b - 2, b - 1, b, b - 1, b + 1, b);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({
    vertexShader: sombraVert,
    fragmentShader: sombraFrag,
    transparent: true,
    depthWrite: false,
  }));
  mesh.renderOrder = 2;
  mesh.frustumCulled = false;
  return mesh;
}

/* ── BRUMA volumétrica: quads instanciados billboard con ciclo de vida (nace
      densa, sube, se abre, se disuelve) y luz-arriba/sombra-abajo. UN draw
      call para toda la niebla de la caída. ── */
const brumaVert = /* glsl */ `
  uniform float uTime;
  attribute vec3 aOff;
  attribute vec4 aSeed;   // fase, velocidad, subida, tamaño
  varying vec2 vPc;
  varying float vO;
  varying float vSeed;
  void main() {
    float k = fract(aSeed.x + uTime * aSeed.y);
    vec3 c = aOff;
    c.y += k * aSeed.z;
    c.x += sin(uTime * 0.35 + aSeed.x * 40.0) * 0.28;
    vO = sin(k * 3.14159);
    vSeed = aSeed.x;
    vPc = position.xy;
    float s = aSeed.w * (0.62 + k * 0.85);
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(s * 1.25, s);   // billboard, puff ancho
    gl_Position = projectionMatrix * mv;
  }
`;
const brumaFrag = /* glsl */ `
  uniform float uTime;
  varying vec2 vPc;
  varying float vO;
  varying float vSeed;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 pc = vPc;
    float ang = vSeed * 40.0 + uTime * 0.10;
    vec2 pr = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pc;
    float d = length(pc) * 2.0;
    // borde ROTO por ruido: nube desflecada, no disco
    float nb = noise(pr * 4.5 + vSeed * 17.0) * 0.6 + noise(pr * 9.0 + vSeed * 31.0) * 0.4;
    float edge = 1.0 - smoothstep(0.38 + nb * 0.55, 1.0, d);
    float body = exp(-d * d * 2.1);
    float alp = body * edge * vO * 0.60;
    // VOLUMEN: cima del puff al sol, panza en sombra fría
    float litK = clamp(0.55 - pc.y * 1.7 + nb * 0.25, 0.0, 1.0);
    vec3 col = mix(vec3(1.04, 1.02, 0.98), vec3(0.70, 0.74, 0.82), litK);
    gl_FragColor = vec4(col, alp);
  }
`;

/* GOTAS/MECHONES: streaks instanciados cayendo delante del velo — la caída
   libre se deshace en hebras con PESO. Un draw call. */
const gotaVert = /* glsl */ `
  uniform float uTime;
  attribute vec3 aOff;
  attribute vec4 aSeed;   // fase, velocidad, largo, tamaño
  varying vec2 vPc;
  varying float vO;
  void main() {
    float k = fract(aSeed.x + uTime * aSeed.y);
    vec3 c = aOff;
    c.y -= k * aSeed.z;
    vO = (1.0 - k * 0.7) * smoothstep(0.0, 0.12, k);
    vPc = position.xy;
    vec4 mv = modelViewMatrix * vec4(c, 1.0);
    mv.xy += position.xy * vec2(aSeed.w * 0.16, aSeed.w * (1.1 + k * 0.9));
    gl_Position = projectionMatrix * mv;
  }
`;
const gotaFrag = /* glsl */ `
  varying vec2 vPc;
  varying float vO;
  void main() {
    float lat = pow(max(1.0 - abs(vPc.x) * 2.0, 0.0), 1.6);
    float v = smoothstep(-0.5, -0.28, vPc.y) * smoothstep(0.5, 0.05, vPc.y);
    gl_FragColor = vec4(1.02, 1.02, 0.99, lat * v * vO * 0.85);
  }
`;

function nubeDeQuads(items, vert, frag) {
  const geo = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const off = new Float32Array(items.length * 3);
  const seed = new Float32Array(items.length * 4);
  items.forEach((p, i) => {
    off.set([p.x, p.y, p.z], i * 3);
    seed.set(p.seed, i * 4);
  });
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 4));
  geo.instanceCount = items.length;
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: { uTime: RELOJ_AGUA },
    transparent: true,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 4;
  return { mesh, mat };
}

/* ── EL CONJUNTO ────────────────────────────────────────────────────────────── */
function construirChorrera(pal, tier) {
  const grupo = new THREE.Group();
  grupo.position.set(CH.cx, 0, CH.cz);
  grupo.rotation.y = RY;
  const rng = crearRng(158); // la foto canónica

  const res = tier === 'alto' ? { nx: 168, nt: 112 } : tier === 'medio' ? { nx: 126, nt: 84 } : { nx: 96, nt: 64 };
  const pared = new THREE.Mesh(
    construirPared(pal, res),
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }),
  );
  pared.renderOrder = -87;
  pared.frustumCulled = false;
  grupo.add(pared);

  const nBosque = tier === 'alto' ? 2400 : tier === 'medio' ? 1500 : 800;
  const bosque = construirBosque(pal, nBosque);
  bosque.renderOrder = -86;
  bosque.frustumCulled = false;
  grupo.add(bosque);

  // el páramo de la cumbre: frailejones aterrizados en la mesa del farallón
  const frailejonal = construirFrailejonal(pal, tier === 'alto' ? 26 : tier === 'medio' ? 18 : 10);
  frailejonal.renderOrder = -85;
  frailejonal.traverse((o) => { o.frustumCulled = false; });
  grupo.add(frailejonal);

  /* la caída en 3 secciones (columna corta → tramo medio escalonado → caída
     larga que se abre al pie), cada una: sombra + cuerpo + corazón */
  const brumaPts = [];
  const gotaPts = [];
  const pluma = (x, y, z, r, n, dens = 1) => {
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const rr = Math.sqrt(rng()) * r;
      brumaPts.push({
        x: x + Math.cos(a) * rr,
        y: y + (rng() - 0.5) * r * 0.5,
        z: z + Math.sin(a) * rr * 0.75 + 0.45,
        seed: [rng(), 0.05 + rng() * 0.07, r * (0.45 + rng() * 0.5), r * (0.46 + rng() * 0.42) * dens],
      });
    }
  };
  const cortina = (x, y, z, ancho, largo, n) => {
    for (let i = 0; i < n; i++) {
      gotaPts.push({
        x: x + (rng() - 0.5) * ancho,
        y: y - rng() * largo * 0.25,
        z: z + 0.35 + rng() * 0.55,
        seed: [rng(), 0.22 + rng() * 0.25, largo * (0.7 + rng() * 0.6), 0.35 + rng() * 0.6],
      });
    }
  };

  /* Los anchos siguen la foto: salto 2 = el velo ANCHO y brillante; el labio
     y los tramos bajos, hilo delgado. UNA sola cascada — cero chorros extra. */
  const ANCHO_SALTO = [0.8, 1.5, 1.0, 0.9, 0.85];
  for (let s = 0; s < CORTES.length - 1; s++) {
    const ultimo = s === CORTES.length - 2;
    const tA = CORTES[s] + (s === 0 ? -0.002 : 0.012);
    const tB = CORTES[s + 1] - (ultimo ? 0 : 0.022);
    const segW = ANCHO_SALTO[s] ?? 0.9;
    grupo.add(construirSombraCaida(rutaX, tA, tB, { base: segW, fan: 0.45, abanico: ultimo ? 0.42 : 0.4 }));
    const cuerpo = construirCaida(rutaX, tA, tB, {
      base: segW,
      fan: 0.45,
      abanico: ultimo ? 0.42 : 0.4,
      vTiles: 2.6 + (CORTES[s] - CORTES[s + 1]) * 3,
      prof: 0.42,
      brillo: s === 1 ? 1.32 : 1.14, // el velo del salto 2, lo más blanco
    }, 0xe8efe9);
    grupo.add(cuerpo.mesh);
    // velo trasero tenue POR SECCIÓN (la profundidad en capas del agua BUENA
    // del valle): corrido apenas y pegado al hilo — cuerpo de la MISMA caída
    if (tier !== 'bajo') {
      const veloSeg = construirCaida((t) => rutaX(t) + (s % 2 ? -0.27 : 0.27), CORTES[s] - 0.004, CORTES[s + 1] - (ultimo ? 0 : 0.016), {
        base: segW * 1.55, fan: 0.6, abanico: ultimo ? 0.7 : 0.5,
        vTiles: 2.0 + (CORTES[s] - CORTES[s + 1]) * 2.4, prof: 0.2, brillo: 0.9,
      }, 0xd6dcd6);
      veloSeg.mesh.position.z -= 0.27;
      veloSeg.mesh.renderOrder = 2;
      grupo.add(veloSeg.mesh);
    }
    // corazón denso y brillante del chorro (proporcional a su salto)
    const corazon = construirCaida(rutaX, CORTES[s] - 0.006, CORTES[s + 1] - (ultimo ? 0 : 0.01), {
      base: segW * 0.44, fan: 0.28, abanico: 0.6, vTiles: 3.2, prof: 0.7, brillo: 1.3,
    }, 0xf4f6f0);
    corazon.mesh.position.z += 0.2;
    grupo.add(corazon.mesh);
    // bruma: coronación discreta, impactos intermedios chicos, colchón al final
    const xl = rutaX(tA);
    const labio = caraLocal(xl, tA);
    if (s === 0) pluma(xl, labio.y - 0.35, labio.z, 1.5, 4, 0.7);
    const xp = rutaX(CORTES[s + 1]);
    const pie = caraLocal(xp, CORTES[s + 1]);
    pluma(xp, pie.y + 0.7, pie.z, ultimo ? 4.2 : 0.95, ultimo ? 10 : 3, ultimo ? 1.0 : 0.7);
    if (ultimo) pluma(xp + 0.7, pie.y + 0.25, pie.z + 0.45, 2.4, 3, 0.75);
    // mechones que se sueltan a media caída y sobre el impacto
    const tM = (tA + tB) / 2;
    const xm = rutaX(tM);
    const medio = caraLocal(xm, tM);
    cortina(xm, medio.y + 2.6, medio.z, 1.5, 4.6, tier === 'bajo' ? 5 : 10);
    cortina(xp, pie.y + 4.4, pie.z, 1.7, 4.2, tier === 'bajo' ? 3 : 6);
  }

  const F = CORTES.length - 1; // índice del pie

  /* ⛔ AQUÍ VIVÍAN los "hilos paralelos deshilachados" y los "rezumaderos":
     chorros fantasma que NO existen en el mundo real (corrección dura del
     operador, que ve La Chorrera desde el domo). La Chorrera es UNA. */

  // bruma grande de la base: La Chorrera muere en un colchón blanco —
  // PROPORCIONADA al hilo como en el agua buena del valle (con r 5.5 el
  // colchón leía como un plato blanco tragándose el pie de la caída)
  const xb = rutaX(CORTES[F]);
  const base = caraLocal(xb, CORTES[F] - 0.02);
  pluma(xb, base.y + 1.0, base.z + 0.8, 3.2, tier === 'bajo' ? 4 : 8, 0.9);
  pluma(xb + 1.2, base.y + 0.3, base.z + 1.0, 2.1, tier === 'bajo' ? 2 : 4, 0.8);

  grupo.add(nubeDeQuads(brumaPts, brumaVert, brumaFrag).mesh);
  grupo.add(nubeDeQuads(gotaPts, gotaVert, gotaFrag).mesh);

  return grupo;
}

/**
 * La Chorrera real al fondo del mundo del agua: farallón paramétrico fiel al
 * cañón de Guatoc + caída volumétrica escalonada de ~590 m con bruma en cada
 * impacto. Montar dentro del <Canvas>, junto al resto de la lámina.
 *
 * @param {object} props
 * @param {{aire:string, resplandor:string, lechosa:string}} props.pal
 *   la paleta de la lejanía (paletaLejania de fondoAgua).
 * @param {'alto'|'medio'|'bajo'} props.tier
 * @param {boolean} props.reducedMotion  congela el agua (uTime quieto).
 */
export default function ChorreraReal({ pal, tier, reducedMotion }) {
  const grupo = useMemo(() => construirChorrera(pal, tier), [pal, tier]);
  useLayoutEffect(
    () => () => {
      grupo.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    },
    [grupo],
  );
  /* el reloj del agua: UN write por frame al uniform compartido de módulo —
     todo el sistema (velos, bruma, gotas) respira junto; en calma, quieto */
  useFrame((st) => {
    if (reducedMotion) return;
    RELOJ_AGUA.value = st.clock.elapsedTime;
  });
  return <primitive object={grupo} />;
}
