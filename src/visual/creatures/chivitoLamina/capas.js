/**
 * chivitoLamina/capas — hornea `chivito-punk.png` en capas por ALFA
 * (cuerpo + alaIzq + manoLapiz + cabeza + cresta + mandíbula) más los dos
 * parches de párpado. Puerto directo del motor del jaguar
 * (`jaguarLamina/capas.js`, aprobado por el operador) vía el puerto más
 * reciente (`luciernagaLamina/capas.js`, que trae las lecciones de la ronda
 * de costuras) a la anatomía del chivito punk — mismas fórmulas, mismas
 * garantías. Corte C5 (orden consolidada 2026-08-18): alas · cresta-punk
 * swappable · pico/visemas+ojos · cuerpo-inpaint.
 *
 * EL MÉTODO (idéntico en espíritu a piloto-lamina.js — ver el docstring
 * largo del jaguar si hace falta el porqué completo):
 *   - Todo el color sale del PNG. Aquí solo se decide, píxel a píxel, QUÉ
 *     ALFA le toca a cada capa — cero dibujo nuevo.
 *   - Cada pieza "de encima" se DESVANECE en el borde de su corte
 *     (`smoothstep`). Las capas de ABAJO NO se desvanecen: se borran con
 *     corte duro SOLO donde la pieza de encima ya es ~opaca (≥99,6%, el
 *     umbral que cerró las costuras del lote — con 0,93 la rampa de la
 *     resta dejaba un residuo de déficit en la banda del crossfade).
 *   - ORDEN DE PRIORIDAD para que dos piezas nunca se disputen el mismo
 *     píxel: cabeza > mandíbula > manoLapiz > alaIzq > cuerpo. La CRESTA
 *     (corte C5) vive DENTRO del dominio de la cabeza y se le resta por su
 *     parte ALTA (`baseSub`): la franja del cráneo queda en la cabeza de
 *     respaldo (patrón oreja-jaguar) y la pieza la tapa en reposo —
 *     compuesto idéntico, swap sin hueco. El headbang sigue moviendo
 *     testa+cresta juntas (la pieza es hija del pivote de cabeza).
 *   - CRESTA SWAPPABLE (contrato C6): `hornearChivito(img, dims,
 *     {imgCresta})` acepta una lámina alterna del MISMO encuadre (397×654)
 *     y hornea la pieza cresta desde ELLA — el chivito-normal monta su
 *     cresta verde sobre este mismo esqueleto sin re-cortar nada más.
 *   - CUERPO-INPAINT (`extenderRespaldo`, patrón probado en el élitro de la
 *     luciérnaga): la textura del cuerpo se dilata unos px hacia los
 *     píxeles de silueta sólida que las piezas de encima le borraron
 *     (cabeza/mano/ala), y la del ala hacia lo que la ocluye (la muñeca).
 *     Oculto en reposo (la pieza de encima pinta ahí), emerge CON el
 *     movimiento — el flanco no abre fondo en ninguna dirección. El alfa
 *     queda CLAVADO a la silueta de la lámina: jamás la excede.
 *   - El párpado es un parche de LA PROPIA lámina (la piel del antifaz/
 *     frente encima de cada ojo) recortado a elipse y alfa-recortado con
 *     la silueta real en el punto de destino — parpadeo real, nunca un
 *     párpado dibujado. Dos parches (uno por ojo) que comparten cadencia:
 *     parpadeo de verdad, no un guiño.
 *
 * Todas las funciones de máscara son PURAS y se exportan (`mascaras()`,
 * `extenderRespaldo`): el candado de recomposición
 * (`__tests__/recomposicion.test.js`) y el verificador offline
 * (`_gate/chivito-punk-lamina/hornear-verifica.mjs`, no versionado)
 * importan ESTE módulo — sin fórmulas duplicadas que puedan divergir.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearChivito()`
 * devuelve `null` y el llamador se queda en el `<img>` plano de la lámina
 * completa — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/chivitoLamina/capas
 */
import {
  CABEZA, CRESTA, OJO, OJO_2, MANDIBULA, MANO_LAPIZ, ALA_IZQ,
} from './anatomia.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export function haySoporteCanvas() {
  if (typeof document === 'undefined') return false;
  try {
    const cv = document.createElement('canvas');
    return !!(cv.getContext && cv.getContext('2d'));
  } catch {
    return false;
  }
}

function lienzo(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/** Caja en X con bordes suaves — el ladrillo de todas las máscaras. */
function fxCaja(x, { x0, x1, xFade }) {
  return ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
}

/** Interpola x sobre una polilínea de puntos [y, x] (clavada en los
 *  extremos) — el contorno de tinta del ala, patrón del élitro de la
 *  luciérnaga. */
function interpY(pts, y) {
  if (y <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (y <= pts[i][0]) {
      const t = (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
    }
  }
  return pts[pts.length - 1][1];
}

/** Cabeza: caja en X de testa+cresta × desvanecido en la banda del cuello. */
export function mascaraCabeza(x, y) {
  return fxCaja(x, CABEZA.box) * (1 - ss(CABEZA.cuello.y0, CABEZA.cuello.y1, y));
}

/** Cresta: caja en X de las púas × desvanecido hacia la BASE (opaca arriba
 *  —las púas—, se funde a 0 donde las raíces se meten al cráneo). Patrón
 *  oreja-jaguar con la Y "colgando hacia arriba". */
function mascaraCresta(x, y) {
  return fxCaja(x, CRESTA.box) * (1 - ss(CRESTA.base.y0, CRESTA.base.y1, y));
}

/** Cresta para RESTARLA de la cabeza: igual que `mascaraCresta` pero se
 *  corta más ARRIBA (`baseSub`) — deja la franja del cráneo también en la
 *  cabeza, de respaldo anti-hueco (swap/headbang). La PIEZA usa la máscara
 *  completa: en reposo tapa ese respaldo y el compuesto es idéntico. */
function mascaraCrestaSub(x, y) {
  return fxCaja(x, CRESTA.box) * (1 - ss(CRESTA.baseSub.y0, CRESTA.baseSub.y1, y));
}

/** Mandíbula: caja en X × opaca ENTRE el labio (bajo la línea de la boca)
 *  y el fin del mentón barbado. La línea de la boca queda en la cabeza. */
function mascaraMandibula(x, y) {
  const { box, labio, menton } = MANDIBULA;
  return fxCaja(x, box) * ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
}

/** Mano del lápiz: caja en X × techo (por encima no hay nada suyo) ×
 *  desvanecido INCLINADO en la MUÑECA (el borde cae hacia la izquierda y
 *  pasa por debajo del tajado del lápiz — candado documentado en
 *  anatomia.js). */
function mascaraMano(x, y) {
  const { box, techo, muneca } = MANO_LAPIZ;
  const xN = clamp(x, 0, box.x1) / box.x1;
  const borde = muneca.y0 + muneca.caidaIzq * (1 - xN);
  return fxCaja(x, box)
    * ss(techo.y0, techo.y1, y)
    * (1 - ss(borde, borde + muneca.alto, y));
}

/** Ala izquierda plegada: caja en X × techo (bajo la muñeca) × a la
 *  IZQUIERDA del contorno interior de tinta (polilínea, feather ±4px) ×
 *  desvanecido de PUNTA. La silueta externa la pone el alfa del PNG. */
function mascaraAla(x, y) {
  const A = ALA_IZQ;
  const banda = ss(A.techo.y0, A.techo.y1, y) * (1 - ss(A.punta.y0, A.punta.y1, y));
  if (banda <= 0) return 0;
  const xInt = interpY(A.interior, y);
  return banda * fxCaja(x, A.box) * (1 - ss(xInt - 4, xInt + 4, x));
}

/**
 * El juego COMPLETO de máscaras con sus prioridades resueltas — una sola
 * fuente de verdad para `hornearChivito`, el candado de recomposición y el
 * verificador offline (importan ESTAS fórmulas, no una copia que no vería
 * un fix).
 *
 * Prioridad de encima hacia abajo: cabeza (con cresta y mandíbula dentro) >
 * manoLapiz > alaIzq > cuerpo. Reglas de la casa (ronda de costuras):
 * resta sobre capa de ABAJO → DURA (la capa conserva el píxel completo de
 * respaldo hasta que la pieza es ~opaca); partición DENTRO de la cabeza
 * (mandíbula) → exacta; resta de la CRESTA → suave pero con banda CORRIDA
 * (`baseSub`): donde la cabeza se desvanece la cresta es ~opaca — nunca dos
 * fades apilados sobre el mismo píxel.
 */
export function mascaras() {
  const hard = (m) => 1 - ss(0.996, 1, m);
  const mCabezaFull = (x, y) => mascaraCabeza(x, y);
  // Piezas DENTRO de la cabeza: cresta (arriba de todo) y mandíbula (bajo
  // la línea de la boca). Se acotan al dominio de la cabeza (× mCabezaFull)
  // para no invadir cuello/cuerpo.
  const mCresta = (x, y) => mascaraCresta(x, y) * mCabezaFull(x, y);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
  // La cabeza que se PINTA = testa menos la cresta por su parte ALTA
  // (`baseSub` — la franja del cráneo queda de respaldo) menos la mandíbula
  // (partición exacta: baja en bloque, el interior sintético respalda).
  const mCabezaRender = (x, y) => mCabezaFull(x, y)
    * (1 - mascaraCrestaSub(x, y))
    * (1 - mMandibula(x, y));
  const mManoLapiz = (x, y) => mascaraMano(x, y) * (1 - mCabezaFull(x, y));
  // El ala vive DEBAJO de la mano: resta DURA — bajo el desvanecido de la
  // muñeca el ala conserva el píxel completo (la mano pinta encima; al
  // gesticular, el respaldo queda detrás).
  const mAla = (x, y) => mascaraAla(x, y) * hard(mManoLapiz(x, y));
  const mCuerpo = (x, y) => hard(mCabezaFull(x, y)) * hard(mManoLapiz(x, y))
    * hard(mAla(x, y));
  return {
    mCuerpo, mAla, mCabezaFull, mCabezaRender, mCresta, mMandibula, mManoLapiz,
  };
}

/**
 * RESPALDO DE VIAJE / CUERPO-INPAINT: dilata la textura ya pintada de una
 * capa hacia los píxeles de silueta sólida adyacentes que NO son suyos (los
 * que otra pieza le borró o le ocluye). El respaldo queda OCULTO en reposo
 * (la pieza de encima pinta allí su píxel completo) y emerge con el
 * movimiento — el flanco nunca abre fondo. `pasos` acota la extensión en px
 * y debe superar el desplazamiento máximo del gesto (±3° a ~100px de la
 * raíz ≈ 5-7px; 14 deja margen). Puerto 1:1 del élitro de la luciérnaga.
 *
 * Pura sobre buffers (sin canvas): el candado de recomposición ejercita
 * ESTA función.
 * @param {Uint8ClampedArray} d    capa RGBA ya pintada (se muta)
 * @param {Uint8ClampedArray|Buffer} sd  lámina RGBA (fuente de silueta)
 * @param {number} W @param {number} H @param {number} [pasos]
 */
export function extenderRespaldo(d, sd, W, H, pasos = 14) {
  for (let k = 0; k < pasos; k++) {
    const nuevos = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = (y * W + x) * 4;
        if (d[i + 3] >= 200) continue;     // ya es sólido (textura o respaldo)
        if (sd[i + 3] < 200) continue;     // fuera de silueta sólida: jamás
        for (const j of [i - 4, i + 4, i - W * 4, i + W * 4]) {
          if (d[j + 3] >= 200) { nuevos.push([i, j]); break; }
        }
      }
    }
    if (!nuevos.length) return;
    for (const [i, j] of nuevos) {
      // la banda de desvanecido del borde (alfa parcial) también se
      // solidifica — sin esto el crecimiento nunca cruza el propio fade de
      // la pieza y el respaldo no llega al flanco. Su color ya es el bueno;
      // a los píxeles vacíos se les clona el del vecino.
      if (!d[i + 3]) { d[i] = d[j]; d[i + 1] = d[j + 1]; d[i + 2] = d[j + 2]; }
      // clavado a la silueta original: el respaldo nunca la excede
      d[i + 3] = sd[i + 3];
    }
  }
}

/**
 * Hornea las capas + los parches de párpado a partir de la imagen ya
 * cargada. Devuelve canvases del MISMO tamaño que el PNG (comparten
 * encuadre — cero cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si `img` aún
 *   no cargó (naturalWidth/Height en 0) — blinda contra un `onload` que
 *   dispara antes de tiempo.
 * @param {{imgCresta?: HTMLImageElement}} [extras]  lámina alterna del
 *   MISMO encuadre para hornear la pieza CRESTA desde ella (contrato C6:
 *   la cresta verde del chivito-normal sobre este esqueleto). Si falla o
 *   no llega, la cresta sale de la lámina punk — nunca un hueco.
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,ala:HTMLCanvasElement,
 *   cabeza:HTMLCanvasElement,cresta:HTMLCanvasElement,
 *   mandibula:HTMLCanvasElement,manoLapiz:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number},
 *   parpado2:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearChivito(img, dims = {}, extras = {}) {
  const { ancho, altoPx } = dims;
  if (!haySoporteCanvas()) return null;
  const W = img.naturalWidth || ancho;
  const H = img.naturalHeight || altoPx;
  if (!W || !H) return null;

  const leerPixeles = (imagen) => {
    const base = lienzo(W, H);
    const bctx = base.getContext('2d', { willReadFrequently: true });
    bctx.drawImage(imagen, 0, 0, W, H);
    return bctx.getImageData(0, 0, W, H).data;
  };
  let sd;
  try {
    sd = leerPixeles(img);
  } catch {
    // canvas "tainted" (CORS) o getImageData no implementado.
    return null;
  }
  // Fuente de la CRESTA: la lámina alterna (C6) o la propia punk.
  let sdCresta = sd;
  if (extras.imgCresta) {
    try {
      sdCresta = leerPixeles(extras.imgCresta);
    } catch {
      sdCresta = sd;
    }
  }

  const m = mascaras();

  const pintarBuf = (mascara, fuente = sd) => {
    const d = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const a = fuente[i + 3];
        if (!a) continue;
        const ma = a * mascara(x, y);
        if (ma < 0.5) continue;
        d[i] = fuente[i]; d[i + 1] = fuente[i + 1]; d[i + 2] = fuente[i + 2];
        d[i + 3] = ma;
      }
    }
    return d;
  };
  const aCanvas = (d) => {
    const cv = lienzo(W, H);
    const g = cv.getContext('2d');
    const im = g.createImageData(W, H);
    im.data.set(d);
    g.putImageData(im, 0, 0);
    return cv;
  };
  const pintar = (mascara) => aCanvas(pintarBuf(mascara));

  // CUERPO-INPAINT: el cuerpo se dilata bajo cabeza/mano/ala (lo que las
  // restas duras le borraron); el ala, bajo la muñeca que la ocluye.
  const cuerpoBuf = pintarBuf(m.mCuerpo);
  const alaBuf = pintarBuf(m.mAla);
  extenderRespaldo(cuerpoBuf, sd, W, H);
  extenderRespaldo(alaBuf, sd, W, H);

  const parpado = parcheParpado(sd, W, H, OJO);
  const parpado2 = parcheParpado(sd, W, H, OJO_2);

  return {
    W,
    H,
    cuerpo: aCanvas(cuerpoBuf),
    ala: aCanvas(alaBuf),
    cabeza: pintar(m.mCabezaRender),
    cresta: aCanvas(pintarBuf(m.mCresta, sdCresta)),
    mandibula: pintar(m.mMandibula),
    manoLapiz: pintar(m.mManoLapiz),
    parpado,
    parpado2,
  };
}

/**
 * Parche de párpado: roba el rectángulo de píxeles que está ENCIMA del ojo
 * (el antifaz de plumas propio del bicho, nunca un color inventado), lo
 * recorta a elipse y lo alfa-recorta con la silueta real en el punto de
 * DESTINO. Puerto 1:1 del jaguar (incluido su tamaño 3.1r×2.6r, medido con
 * Playwright que sí mueve la aguja a tamaño de avatar — ver el docstring
 * original en jaguarLamina/capas.js).
 */
function parcheParpado(sd, W, H, ojo) {
  const { cx, cy, r } = ojo;
  const w = Math.ceil(r * 3.1);
  const h = Math.ceil(r * 2.6);
  const fx0 = Math.round(cx - w / 2);
  const fy0 = Math.round(cy - r * 1.5 - h / 2);
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);

  const cv = lienzo(w, h);
  const g = cv.getContext('2d');
  const im = g.createImageData(w, h);
  const d = im.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const sx = clamp(fx0 + x, 0, W - 1);
      const sy = clamp(fy0 + y, 0, H - 1);
      const j = (sy * W + sx) * 4;
      // alfa de FUENTE: un punto en fondo transparente no tiene color real
      // (RGB queda en 0,0,0) — sin este peso, un offset que cae fuera de la
      // silueta pintaría un parche negro sobre el ojo.
      const aFuente = sd[j + 3] / 255;
      const dx = clamp(x0 + x, 0, W - 1);
      const dy = clamp(y0 + y, 0, H - 1);
      const k = (dy * W + dx) * 4;
      const aDestino = sd[k + 3];
      const nx = (x - (w - 1) / 2) / (w / 2);
      const ny = (y - (h - 1) / 2) / (h / 2);
      const elipse = 1 - ss(0.78, 1.02, Math.hypot(nx, ny));
      d[i] = sd[j]; d[i + 1] = sd[j + 1]; d[i + 2] = sd[j + 2];
      d[i + 3] = aDestino * elipse * aFuente;
    }
  }
  g.putImageData(im, 0, 0);
  return { cv, x0, y0, w, h };
}

export default { hornearChivito, haySoporteCanvas, mascaras, extenderRespaldo };
