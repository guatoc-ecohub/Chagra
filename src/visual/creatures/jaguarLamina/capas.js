/**
 * jaguarLamina/capas — hornea las capas del jaguar-rig 2.5D en canvases
 * listos para el ensamble de `JaguarLaminaViva.jsx`.
 *
 * DE DÓNDE SALE CADA PIEZA (dos fuentes, misma registración 705×394):
 *   · Capas PRE-CORTADAS del set de arte (`public/compai/laminas/jaguar-rig/`,
 *     horneadas offline en `~/demos/3d/compai/rigs2d/jaguar/` — ver su
 *     NOTAS.md): `cuerpo-inpaint.png` (cuerpo SIN patas/cabeza/cola, con los
 *     píxeles ocultos rellenados por clonado de la propia lámina) y las 3
 *     patas con alfa propio (`pata-del-lejana`, `pata-tras-cercana`,
 *     `pata-tras-lejana`). Gracias al inpaint la base tiene EXACTAMENTE cero
 *     patas: al montar las 4 piezas de pata hay 4 patas — nunca 6-7 fantasma.
 *   · Cortes por ALFA sobre `jaguar-natural.png` (la lámina), con las rectas
 *     MEDIDAS de `anatomia.js` — el mismo método smoothstep de
 *     piloto-lamina.js («la lámina ESTÁ VIVA»): la CABEZA (face-safe: banda
 *     del cuello + desvanecido de mandíbula — nunca un rectángulo que muerda
 *     bigotes), sus piezas de vida (orejas/mandíbula/párpados), la COLA (con
 *     la grupa, menos la ventana del muslo lejano) y la CUARTA pata
 *     (delantera cercana naranja: envolvente `PATAS_DEL` × lado u>0 de
 *     `CORTE_PATAS_DEL`).
 *
 * La geometría de recomposición (ventana del muslo, borde de cola, corte
 * naranja) es un PUERTO 1:1 de `_build/lib.mjs` + `_build/build-cuerpo.mjs`
 * del set de arte, cuya recomposición de control contra la lámina original
 * dio 0.035% de huecos — ésa es la garantía de registración de este ensamble.
 *
 * PARA EL GAIT, cada pata se PARTE en dos segmentos rígidos por la rodilla
 * medida (`factoresRodilla`): banda horizontal con SOLAPE de respaldo (el
 * inferior sube 14px por encima del corte, el superior baja 10px por debajo)
 * — al flexionar la rodilla el solape mantiene la articulación cubierta sin
 * abrir fondo, el truco estándar del papel articulado (mismo espíritu que el
 * anti-hueco de las orejas). Ambos segmentos son la MISMA piel: en reposo el
 * compuesto es idéntico a la pieza entera.
 *
 * SECCIÓN PURA vs SECCIÓN CANVAS: toda la matemática de alfa (máscaras,
 * partición de rodilla, alfa ideal de cada capa) vive en funciones PURAS
 * exportadas (`mascaras`, `factoresRodilla`, `capasIdeales`) que no tocan el
 * DOM: las consumen por igual `hornearJaguar` (que solo COLOREA esos alfas
 * con los píxeles del PNG que corresponda) y el candado de recomposición de
 * `__tests__` — sin fórmulas duplicadas que puedan divergir (la lección del
 * verificador de la zarigüeya).
 *
 * Defensivo por diseño: sin `canvas.getContext('2d')` (jsdom sin el paquete
 * `canvas`, navegador exótico) `hornearJaguar()` devuelve null y el llamador
 * se queda en el `<img>` plano de la lámina completa — nunca truena, nunca
 * pinta un rectángulo vacío. Lo mismo si falta cualquiera de las 5 imágenes.
 *
 * @module visual/creatures/jaguarLamina/capas
 */
import {
  CABEZA, OJO, OJO_2, PATAS_DEL,
  OREJA_IZQ, OREJA_DER, MANDIBULA,
  CORTE_PATAS_DEL, RIG_MARCHA,
} from './anatomia.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

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

/* ═══ SECCIÓN PURA — máscaras y alfas ideales (sin DOM) ═══════════════════ */

/**
 * Resta DURA para la capa de ABAJO de un par: conserva el píxel COMPLETO
 * hasta que la pieza de encima es ~totalmente opaca. Con la resta blanda
 * `(1-m)`, en la banda del desvanecido ambas capas quedan semiopacas y el
 * compuesto over pierde alfa (0.5 over 0.5 = 0.75): ésa es la COSTURA — la
 * banda pálida que se ve cruzando torso y anca. Con la resta dura el
 * compuesto suma el alfa original completo en toda la banda (m + 1·(1-m) =
 * 1) y la costura desaparece; al animarse, la pieza desliza sobre piel
 * completa de respaldo en vez de sobre el residuo translúcido.
 *
 * El umbral 0.996 (antes 0.93 en los kits hermanos) deja el residuo máximo
 * de la rampa en ~0,36/255 — por debajo del umbral medible de déficit
 * (déficit = alfaOriginal − alfaCompuesto > 0,5/255, la métrica del informe
 * del lote). Las VENTANAS (restas sobre la capa de ENCIMA para revelar lo de
 * abajo, como la ventana del muslo) se quedan suaves: ahí la capa de abajo
 * está intacta y no hay pérdida.
 */
export const hard = (m) => 1 - ss(0.996, 1, m);

/** Máscara de la cabeza: banda proyectada sobre la recta del cuello, MÁS un
 *  desvanecido por Y (la cabeza no sigue existiendo bajo la mandíbula real —
 *  ver el docstring de `anatomia.js`; es lo que hace el corte FACE-SAFE:
 *  jamás un rectángulo que muerda bigotes u hocico). */
function mascaraCabeza(x, y) {
  const { cuello, fadeMandibula } = CABEZA;
  const u = cuello.nx * (x - cuello.px) + cuello.ny * (y - cuello.py);
  const base = 1 - ss(cuello.u0, cuello.u1, u);
  const mandibula = 1 - ss(fadeMandibula.y0, fadeMandibula.y1, y);
  return base * mandibula;
}

/** Máscara de un apéndice colgante: caja en X con bordes suaves × banda de
 *  articulación en Y (el envolvente de las delanteras). */
function mascaraApendice(x, y, { box, joint }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(joint.y0, joint.y1, y);
  return fx * fy;
}

/** Pata delantera cercana (naranja): envolvente × lado u>0 del corte medido.
 *  El respaldo detrás del filo ya no es la otra mitad del plano (eso
 *  fantasmeaba "3-4 patas") sino la pata blanca PRE-CORTADA + el pecho
 *  inpainted — ver el docstring de `CORTE_PATAS_DEL` en anatomia.js. */
function mascaraPataNaranja(x, y) {
  const c = CORTE_PATAS_DEL;
  const u = c.nx * (x - c.px) + c.ny * (y - c.py);
  return mascaraApendice(x, y, PATAS_DEL) * ss(c.u0, c.u1, u) * hard(mascaraCabeza(x, y));
}

/* ── Geometría de la ventana del muslo trasero lejano + borde de cola.
 *    PUERTO 1:1 de `_build/lib.mjs` del set de arte (misma fuente que horneó
 *    `cuerpo-inpaint.png`): pieza y ventana DEBEN casar exacto. ── */
const interp = (pts, v) => {
  if (v <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (v <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (v - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
  }
  return pts[pts.length - 1][1];
};
const TAIL_IZQ = [[200, 545], [206, 547], [212, 550], [218, 553], [224, 555], [230, 558], [236, 562],
  [242, 565], [248, 569], [254, 574], [260, 578], [266, 584], [272, 592], [278, 600], [284, 612], [290, 631]];
const xTail = (y) => (y > 292 ? 700 : interp(TAIL_IZQ, y));

/** Ventana por la que se ve la pata trasera lejana (franja del muslo + tira
 *  junto a la grupa + tramo libre bajo la grupa — polígonos medidos por runs
 *  de alfa en el set de arte). Se resta de la COLA (el cuerpo-inpaint ya la
 *  trae transparente). */
function ventanaTrasLejana(x, y) {
  const noTail = 1 - ss(xTail(y) - 6, xTail(y) - 1, x);
  const xSliv = interp([[210, 545], [232, 540], [254, 522]], y);
  const sliver = ss(498, 504, x) * (1 - ss(xSliv - 3, xSliv + 2, x)) * ss(208, 215, y) * (1 - ss(246, 254, y)) * noTail;
  const xStr = interp([[250, 556], [270, 547], [290, 536]], y);
  const strip = ss(xStr - 3, xStr + 3, x) * (1 - ss(586, 592, x)) * ss(246, 254, y) * (1 - ss(288, 296, y)) * noTail;
  const libre = ss(514, 520, x) * (1 - ss(592, 598, x)) * ss(288, 296, y) * (1 - ss(372, 378, y));
  return Math.max(sliver, Math.max(strip, libre));
}

/** Máscara de la COLA (incluye la grupa desde x≈465, como el hueso
 *  `colaLadoOndea` del rig viejo): banda vertical en la base, menos la
 *  cabeza, menos la banda de inserción de la pata trasera cercana, menos la
 *  ventana del muslo lejano. Fórmula 1:1 de `build-cuerpo.mjs`. */
function mascaraCola(x, y) {
  return ss(-20, 20, x - 465) * hard(mascaraCabeza(x, y))
    * (1 - ss(228, 258, y) * ss(455, 470, x) * (1 - ss(575, 590, x)))
    * (1 - ventanaTrasLejana(x, y));
}

/** Máscara de una OREJA: caja en X (bordes suaves) × desvanecido hacia la
 *  BASE (opaca arriba —la punta—, se funde a 0 hacia abajo donde nace del
 *  cráneo, que no tiene borde de alfa propio). */
function mascaraOreja(x, y, { box, base }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fbase = 1 - ss(base.y0, base.y1, y);
  return fx * fbase;
}

/** Máscara de la oreja para RESTARLA de la cabeza: igual que `mascaraOreja`
 *  pero se corta más ARRIBA (`baseSub`) — deja la BASE de la oreja también en
 *  la cabeza, de respaldo para que la rotación no abra fondo (ver anatomia.js,
 *  ANTI-HUECO). La PIEZA de oreja sí usa la máscara completa (`mascaraOreja`),
 *  así en reposo la oreja tapa esa base compartida y el compuesto es idéntico. */
function mascaraOrejaSub(x, y, { box, baseSub }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fbase = 1 - ss(baseSub.y0, baseSub.y1, y);
  return fx * fbase;
}

/** Máscara de la MANDÍBULA: caja en X × desvanecido por la LÍNEA DE LA BOCA
 *  (opaca DEBAJO del labio, se funde a 0 hacia arriba). Es la mitad inferior
 *  de la cara: al bajarla se abre la boca. */
function mascaraMandibula(x, y) {
  const { box, labio, menton } = MANDIBULA;
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
  return fx * fy;
}

/**
 * El juego COMPLETO de máscaras con sus prioridades resueltas — una sola
 * fuente de verdad para `capasIdeales` (y por lo tanto para el runtime y
 * para el candado de recomposición de `__tests__`).
 */
export function mascaras() {
  const mCabeza = (x, y) => mascaraCabeza(x, y);
  const mOrejaIzq = (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabeza(x, y);
  const mOrejaDer = (x, y) => mascaraOreja(x, y, OREJA_DER) * mCabeza(x, y);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabeza(x, y);
  // Restas DURAS (ver `hard`): la cabeza conserva el píxel completo bajo el
  // desvanecido de orejas y mandíbula — cero costura en reposo, y al abrir
  // la boca o girar la oreja se revela piel real, no un anillo translúcido.
  const mCabezaRender = (x, y) => mCabeza(x, y)
    * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
    * hard(mMandibula(x, y));
  return {
    mCabezaRender,
    mOrejaIzq,
    mOrejaDer,
    mMandibula,
    mPataNaranja: mascaraPataNaranja,
    mCola: mascaraCola,
  };
}

/** Solape de respaldo del corte de rodilla (px de lámina): el segmento
 *  inferior sube por encima del corte y el superior baja por debajo — al
 *  flexionar, la articulación queda siempre cubierta por piel propia. */
export const RODILLA_SOLAPE = { supHasta: 10, supFeather: 8, infDesde: 14, infFeather: 6 };

/** Factores de partición sup/inf de una pata en la Y dada (rodilla en
 *  `corteY`): la banda de solape donde ambos son 1 es el anti-hueco. */
export function factoresRodilla(y, corteY) {
  const { supHasta, supFeather, infDesde, infFeather } = RODILLA_SOLAPE;
  return {
    fSup: 1 - ss(corteY + supHasta - supFeather, corteY + supHasta, y),
    fInf: ss(corteY - infDesde, corteY - infDesde + infFeather, y),
  };
}

/**
 * capasIdeales — el ALFA ideal (float, sin redondeo de canvas) de CADA capa
 * del ensamble, a partir de los alfas de los 5 PNG. Es la verdad única que
 * `hornearJaguar` pinta y que el candado de recomposición verifica.
 *
 * @param {{lamina:Float32Array, cuerpo:Float32Array, delLejana:Float32Array,
 *   trasCercana:Float32Array, trasLejana:Float32Array}} fuentes  alfas 0..1
 * @param {number} W
 * @param {number} H
 * @returns {Object<string, {alfa: Float32Array, fuente: string}>}  por capa:
 *   su alfa ideal y de QUÉ PNG salen sus colores.
 */
/**
 * Recorte a SILUETA: ninguna capa del rig puede aportar alfa donde la lámina
 * no tiene píxel. Los PNG horneados DESBORDAN el contorno aprobado
 * (`cuerpo-inpaint` 4.721 px de piel sintética bajo la línea del vientre,
 * medido 2026-08-18; las patas lejanas ~430 px más) y en reposo esa piel
 * sobrante quedaba A LA VISTA sobre el fondo: la franja horizontal con
 * muesca bajo el vientre. Es el dual del déficit: el candado medía "alfa que
 * falta" pero no "alfa que sobra". El recorte vive en el espacio del canvas,
 * así que viaja con la pieza al animarse: una pata rotada muestra solo
 * píxeles que existían dentro de la silueta, reubicados por el transform.
 */
export function recortarASilueta(src, silueta, N) {
  const out = new Float32Array(N);
  for (let p = 0; p < N; p++) out[p] = Math.min(src[p], silueta[p]);
  return out;
}

export function capasIdeales(fuentes, W, H) {
  const m = mascaras();
  const N = W * H;
  const rig = {};
  for (const clave of ['cuerpo', 'delLejana', 'trasCercana', 'trasLejana']) {
    rig[clave] = recortarASilueta(fuentes[clave], fuentes.lamina, N);
  }

  const capaMascara = (mask) => {
    const alfa = new Float32Array(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const a = fuentes.lamina[p];
        if (a > 0) alfa[p] = a * clamp(mask(x, y), 0, 1);
      }
    }
    return alfa;
  };

  const partir = (alfaBase, corteY) => {
    const sup = new Float32Array(N);
    const inf = new Float32Array(N);
    for (let y = 0; y < H; y++) {
      const { fSup, fInf } = factoresRodilla(y, corteY);
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        const a = alfaBase[p];
        if (!a) continue;
        if (fSup > 0) sup[p] = a * fSup;
        if (fInf > 0) inf[p] = a * fInf;
      }
    }
    return { sup, inf };
  };

  const capas = {};
  capas.cuerpo = { alfa: rig.cuerpo, fuente: 'cuerpo' };
  for (const clave of ['delLejana', 'trasCercana', 'trasLejana']) {
    const { sup, inf } = partir(rig[clave], RIG_MARCHA[clave].rodillaCorte);
    capas[`${clave}-sup`] = { alfa: sup, fuente: clave };
    capas[`${clave}-inf`] = { alfa: inf, fuente: clave };
  }
  {
    const naranja = capaMascara(m.mPataNaranja);
    const { sup, inf } = partir(naranja, RIG_MARCHA.delCercana.rodillaCorte);
    capas['delCercana-sup'] = { alfa: sup, fuente: 'lamina' };
    capas['delCercana-inf'] = { alfa: inf, fuente: 'lamina' };
  }
  capas.cola = { alfa: capaMascara(m.mCola), fuente: 'lamina' };
  capas.cabeza = { alfa: capaMascara(m.mCabezaRender), fuente: 'lamina' };
  capas.orejaIzq = { alfa: capaMascara(m.mOrejaIzq), fuente: 'lamina' };
  capas.orejaDer = { alfa: capaMascara(m.mOrejaDer), fuente: 'lamina' };
  capas.mandibula = { alfa: capaMascara(m.mMandibula), fuente: 'lamina' };

  /* ── RESPALDO DE COSTURAS — piel estática de la propia lámina, al FONDO
     del apilado. Dos términos, cero color inventado:

     1. BANDAS: alrededor de todo corte INTERNO (píxel de capa con alfa
        parcial donde la lámina es opaca — la silueta AA queda fuera porque
        ahí la lámina también es parcial), dilatadas ±10px. Es el `baseSub`
        de las orejas generalizado: cuando cola/cabeza/pata deslizan su
        desvanecido fuera del complemento horneado (respira, mira, gait),
        siempre caen sobre piel completa — la costura tampoco se abre EN
        MOVIMIENTO. Las bandas viven solo en articulaciones y cortes (nunca
        una extremidad entera): no hay patas fantasma.

     2. RELLENO EXACTO en reposo: donde el compuesto over de todas las capas
        aún queda por debajo del alfa de la lámina (las fronteras horneadas
        de los PNG del rig, que el runtime no puede reformar), el respaldo
        aporta exactamente el alfa que falta — la recomposición da la lámina
        EXACTA (0 huecos totalmente transparentes Y 0 píxeles con déficit
        alfa > 0,5/255, la métrica del informe del lote). ── */
  {
    const compuesto = new Float32Array(N);
    const banda = new Uint8Array(N);
    for (const { alfa } of Object.values(capas)) {
      for (let p = 0; p < N; p++) {
        const a = alfa[p];
        if (a > 0) compuesto[p] = a + compuesto[p] * (1 - a);
        if (a > 0.02 && a < 0.98 && fuentes.lamina[p] > 0.98) banda[p] = 1;
      }
    }
    const RADIO = 10;
    const dilatada = new Uint8Array(N);
    const paso = new Uint8Array(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        for (let k = Math.max(0, x - RADIO); k <= Math.min(W - 1, x + RADIO); k++) {
          if (banda[y * W + k]) { paso[p] = 1; break; }
        }
      }
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        for (let k = Math.max(0, y - RADIO); k <= Math.min(H - 1, y + RADIO); k++) {
          if (paso[k * W + x]) { dilatada[p] = 1; break; }
        }
      }
    }
    const respaldo = new Float32Array(N);
    for (let p = 0; p < N; p++) {
      const a = fuentes.lamina[p];
      if (a <= 0) continue;
      // La banda solo aporta piel COMPLETA donde la lámina es ~opaca: sobre
      // la textura semitransparente (pelo suelto, bigotes) duplicar alfa la
      // endurecería; ahí basta el relleno exacto del reposo.
      if (dilatada[p] && a > 0.98) {
        respaldo[p] = a;
      } else if (compuesto[p] < a && compuesto[p] < 0.9999) {
        respaldo[p] = (a - compuesto[p]) / (1 - compuesto[p]);
      }
    }
    capas.respaldo = { alfa: respaldo, fuente: 'lamina' };
  }
  return capas;
}

/* ═══ SECCIÓN CANVAS — colorear los alfas ideales con la piel real ════════ */

/** Dibuja una imagen ya cargada en un lienzo W×H y devuelve sus píxeles.
 *  null si el canvas queda "tainted" (CORS) o la imagen no midió. */
function pixelesDe(img, W, H) {
  const cv = lienzo(W, H);
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  try {
    return { cv, datos: g.getImageData(0, 0, W, H).data };
  } catch {
    return null;
  }
}

/** El canal alfa 0..1 de un RGBA ya extraído. */
function alfaDe(datos, N) {
  const alfa = new Float32Array(N);
  for (let p = 0; p < N; p++) alfa[p] = datos[p * 4 + 3] / 255;
  return alfa;
}

/**
 * Hornea el set completo del rig a partir de las 5 imágenes ya cargadas.
 * Devuelve canvases del MISMO tamaño que la lámina (comparten encuadre —
 * cero cuentas de UV por capa).
 *
 * @param {{lamina: HTMLImageElement, cuerpo: HTMLImageElement,
 *   delLejana: HTMLImageElement, trasCercana: HTMLImageElement,
 *   trasLejana: HTMLImageElement}} imagenes
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si la lámina
 *   aún no midió (naturalWidth/Height en 0).
 * @returns {{W:number, H:number, respaldo:HTMLCanvasElement,
 *   cuerpo:HTMLCanvasElement,
 *   cola:HTMLCanvasElement, cabeza:HTMLCanvasElement,
 *   orejaIzq:HTMLCanvasElement, orejaDer:HTMLCanvasElement,
 *   mandibula:HTMLCanvasElement,
 *   patas:Object<string,{superior:HTMLCanvasElement, inferior:HTMLCanvasElement}>,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number},
 *   parpado2:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearJaguar(imagenes, dims = {}) {
  if (!imagenes || !imagenes.lamina) return null;
  const { ancho, altoPx } = dims;
  if (!haySoporteCanvas()) return null;
  const W = imagenes.lamina.naturalWidth || ancho;
  const H = imagenes.lamina.naturalHeight || altoPx;
  if (!W || !H) return null;
  for (const clave of ['cuerpo', 'delLejana', 'trasCercana', 'trasLejana']) {
    if (!imagenes[clave]) return null;
  }

  const N = W * H;
  const rgbas = {};
  const alfas = {};
  for (const clave of ['lamina', 'cuerpo', 'delLejana', 'trasCercana', 'trasLejana']) {
    const px = pixelesDe(imagenes[clave], W, H);
    if (!px) return null;
    rgbas[clave] = px.datos;
    alfas[clave] = alfaDe(px.datos, N);
  }

  const ideales = capasIdeales(alfas, W, H);

  /* Colorea un alfa ideal con los píxeles del PNG fuente (el color SIEMPRE
     sale de un PNG del set; aquí solo se aplica el alfa ya decidido). */
  const pintarCapa = ({ alfa, fuente }) => {
    const sd = rgbas[fuente];
    const cv = lienzo(W, H);
    const g = cv.getContext('2d');
    const im = g.createImageData(W, H);
    const d = im.data;
    for (let p = 0; p < N; p++) {
      const a = alfa[p];
      if (a <= 0) continue;
      const i = p * 4;
      d[i] = sd[i]; d[i + 1] = sd[i + 1]; d[i + 2] = sd[i + 2];
      d[i + 3] = a * 255;
    }
    g.putImageData(im, 0, 0);
    return cv;
  };

  const patas = {};
  for (const clave of Object.keys(RIG_MARCHA)) {
    patas[clave] = {
      superior: pintarCapa(ideales[`${clave}-sup`]),
      inferior: pintarCapa(ideales[`${clave}-inf`]),
    };
  }

  const sd = rgbas.lamina;
  const parpado = parcheParpado(sd, W, H, OJO);
  const parpado2 = parcheParpado(sd, W, H, OJO_2);

  return {
    W,
    H,
    respaldo: pintarCapa(ideales.respaldo),
    cuerpo: pintarCapa(ideales.cuerpo),
    cola: pintarCapa(ideales.cola),
    cabeza: pintarCapa(ideales.cabeza),
    orejaIzq: pintarCapa(ideales.orejaIzq),
    orejaDer: pintarCapa(ideales.orejaDer),
    mandibula: pintarCapa(ideales.mandibula),
    patas,
    parpado,
    parpado2,
  };
}

/**
 * Parche de párpado: roba el rectángulo de píxeles que está ENCIMA del ojo
 * (misma idea que `laminaCapas.js` del intento anterior: piel/pelo propio
 * del animal, nunca un color inventado), lo recorta a elipse y lo
 * alfa-recorta con la silueta real de la cabeza en el punto de DESTINO.
 *
 * `pulido 2026-08-14`: el parche creció de 2.1r×1.6r a 3.1r×2.6r — a 22px de
 * radio en la lámina (705px de ancho), el ojo entero mide apenas 3-4px reales
 * en pantalla a tamaño de avatar. Verificado con Playwright+Chromium que
 * agrandarlo SÍ mueve la aguja (píxeles con cambio real 104→154 a 48px) y que
 * sigue leyendo como piel/pelo real a 240px. Sigue siendo piel propia del
 * animal — solo se agranda el RECORTE, no se cambia la técnica.
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

export default { hornearJaguar, haySoporteCanvas };
