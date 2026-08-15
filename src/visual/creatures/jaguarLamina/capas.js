/**
 * jaguarLamina/capas — hornea `jaguar-natural.png` en 5 capas por ALFA
 * (cuerpo + cabeza + patasDelanteras + pataTrasera + cola) más el parche de
 * párpado, puerto DOM/Canvas2D de `hornear()` en `~/demos/3d/juegos/
 * chagra-kart/js/piloto-lamina.js` («el piloto es la LÁMINA, y la lámina
 * ESTÁ VIVA») generalizado de 2 piezas (cuerpo/cabeza, más brazo opcional) a
 * 4, con PRIORIDAD entre ellas.
 *
 * EL MÉTODO (idéntico en espíritu al original — ver su docstring largo si
 * hace falta el porqué completo):
 *   - Todo el color sale del PNG. Aquí solo se decide, píxel a píxel, QUÉ
 *     ALFA le toca a cada capa — cero dibujo nuevo.
 *   - Cada pieza "de encima" (cabeza, patasDelanteras, pataTrasera, cola) se
 *     DESVANECE en el borde de su corte (`smoothstep`). El CUERPO de abajo
 *     NO se desvanece: se borra con corte duro SOLO donde una pieza de
 *     encima ya es ≥93% opaca — el mismo detalle que evita la banda
 *     translúcida en piloto-lamina.js.
 *   - Con 4 piezas (no 1) hace falta un ORDEN DE PRIORIDAD para que dos
 *     piezas nunca se disputen el mismo píxel al mismo tiempo (si no, ambas
 *     se pintan semi-opacas ahí y el compuesto sale más claro/oscuro de lo
 *     debido). Prioridad: cabeza > patasDelanteras > pataTrasera > cola >
 *     cuerpo. Cada máscara se multiplica por `(1 - máscara de mayor
 *     prioridad)` antes de decidir su propio borde — mismo patrón que usa
 *     piloto-lamina.js entre `mBrazo` y `mCabeza`.
 *   - El párpado es un parche de LA PROPIA lámina (el área ENCIMA del ojo,
 *     igual que `laminaCapas.js` del intento anterior — ver README ahí)
 *     recortado a elipse y alfa-recortado con la silueta real de la cabeza
 *     en el punto de destino. Desde el pulido `feat/jaguar-pulido`
 *     (2026-08-14) se hornean DOS parches (`parpado`/`parpado2`, uno por
 *     ojo) — antes solo se cortaba uno y el "parpadeo" era en realidad un
 *     guiño de un solo ojo. Los dos comparten el mismo `@keyframes`
 *     (parpadeo sincronizado, como un animal real) y el parche creció de
 *     2.1r×1.6r a 3.1r×2.6r (ver `parcheParpado`) — verificado con
 *     Playwright+Chromium que agrandarlo SÍ mueve la aguja (más píxeles con
 *     diferencia real entre abierto/cerrado a 48px), y que el resultado
 *     sigue leyendo como piel/pelo real (no un párpado dibujado) a 240px.
 *     BUG DE FONDO encontrado y corregido en este mismo pulido (no es un
 *     ajuste de tamaño, es la causa real de "no se ve"): el `<div>` que
 *     hostea cada `<canvas>` de párpado en `JaguarLaminaViva.jsx` tenía
 *     `position:absolute` SIN `inset:0` — sin tamaño definido en su
 *     contenedor, el ancho/alto en % del canvas resolvía a 0×0 (confirmado
 *     con `getBoundingClientRect` en Chromium real). El párpado de
 *     `feat/jaguar-lamina-sobre-esqueleto` no era "chico", NO RENDERIZABA.
 *   - Las dos patas delanteras (`patasDelCerca`/`patasDelLejana`) se cortan
 *     con `CORTE_PATAS_DEL`. Ya NO son complementarias 1:1: `patasDelLejana`
 *     (pinta ENCIMA) usa el corte ajustado; `patasDelCerca` (pinta ABAJO) es
 *     más ancha (`SOLAPE_PATA_DEL_CERCA`) para respaldar el hueco que abre
 *     la rotación cuando las dos patas divergen de fase — ver
 *     `fraccionCercaPatasDel` más abajo y el docstring de
 *     `SOLAPE_PATA_DEL_CERCA` en anatomia.js (encontrado con captura real:
 *     sin el solape, un fondo visible se colaba entre las dos patas en
 *     varios fotogramas del ciclo). Antes (`feat/jaguar-lamina-sobre-
 *     esqueleto`) era una sola pieza que rotaba como bloque; ver el
 *     docstring de `anatomia.js` para el método de medición del corte.
 *
 * Defensivo por diseño: si `canvas.getContext('2d')` no está disponible
 * (jsdom sin el paquete `canvas`, navegador exótico) `hornearJaguar()`
 * devuelve `null` y el llamador se queda en el `<img>` plano de la lámina
 * completa — nunca truena, nunca pinta un rectángulo vacío.
 *
 * @module visual/creatures/jaguarLamina/capas
 */
import {
  CABEZA, OJO, OJO_2, PATAS_DEL_ENVOLVENTE, CORTE_PATAS_DEL, SOLAPE_PATA_DEL_CERCA, PATA_TRASERA, COLA,
  OREJA_IZQ, OREJA_DER, MANDIBULA,
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

/** Máscara de la cabeza: banda proyectada sobre la recta del cuello, MÁS un
 *  desvanecido por Y (la cabeza no sigue existiendo bajo la mandíbula real —
 *  ver el docstring de `anatomia.js`, es lo que evita que la pata delantera
 *  quede clasificada como cabeza). */
function mascaraCabeza(x, y) {
  const { cuello, fadeMandibula } = CABEZA;
  const u = cuello.nx * (x - cuello.px) + cuello.ny * (y - cuello.py);
  const base = 1 - ss(cuello.u0, cuello.u1, u);
  const mandibula = 1 - ss(fadeMandibula.y0, fadeMandibula.y1, y);
  return base * mandibula;
}

/** Máscara de un apéndice colgante (pata): caja en X con bordes suaves × banda de articulación en Y. */
function mascaraApendice(x, y, { box, joint }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(joint.y0, joint.y1, y);
  return fx * fy;
}

/** Distancia (con signo) de (x,y) a la recta (px,py)+(nx,ny) — mismo formato que usan `CABEZA.cuello`/`COLA.cut`/`CORTE_PATAS_DEL`. */
function proyeccion(x, y, corte) {
  return corte.nx * (x - corte.px) + corte.ny * (y - corte.py);
}

/** Máscara de la cola: banda casi-vertical en su base. */
function mascaraCola(x, y) {
  return ss(COLA.cut.u0, COLA.cut.u1, proyeccion(x, y, COLA.cut));
}

/** Máscara de una OREJA: caja en X (bordes suaves) × desvanecido hacia la
 *  BASE (opaca arriba —la punta—, se funde a 0 hacia abajo donde nace del
 *  cráneo, que no tiene borde de alfa propio). Igual patrón que las patas
 *  (`mascaraApendice`) pero con la Y invertida (la oreja "cuelga hacia
 *  arriba"). */
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
  // opaca ENTRE el labio (arriba) y el fin del mentón (abajo): la mandíbula
  // es solo el maxilar inferior, no baja al cuello.
  const fy = ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
  return fx * fy;
}

/**
 * Fracción "lejana" (0..1) dentro del envolvente de las patas delanteras:
 * 0 = lado cerca (blanco/rayado, la pata que queda atrás en esta pose),
 * 1 = lado lejana (anaranjado, la pata que va adelante). Esta es la máscara
 * AJUSTADA (corte estrecho) — la usa `patasDelLejana`, la pieza que va
 * ENCIMA en el z-order (ver JaguarLaminaViva.jsx).
 */
function fraccionLejanaPatasDel(x, y) {
  return ss(CORTE_PATAS_DEL.u0, CORTE_PATAS_DEL.u1, proyeccion(x, y, CORTE_PATAS_DEL));
}

/**
 * Fracción "cerca" (0..1) — la usa `patasDelCerca`, la pieza que va ABAJO en
 * el z-order. NO es el complemento exacto de `fraccionLejanaPatasDel`: se
 * mantiene opaca más allá del corte, invadiendo `SOLAPE_PATA_DEL_CERCA` px
 * el territorio "lejana" antes de desvanecerse (ver el docstring de
 * `SOLAPE_PATA_DEL_CERCA` en anatomia.js — es el respaldo para que un hueco
 * de rotación entre las dos patas revele piel real, no el fondo). Como esta
 * pieza queda TAPADA por `patasDelLejana` donde ambas coinciden, el reparto
 * en reposo se ve idéntico al corte ajustado — el solape solo se nota
 * cuando las dos patas rotan a fases distintas.
 */
function fraccionCercaPatasDel(x, y) {
  const u = proyeccion(x, y, CORTE_PATAS_DEL);
  return 1 - ss(CORTE_PATAS_DEL.u1, CORTE_PATAS_DEL.u1 + SOLAPE_PATA_DEL_CERCA, u);
}

/**
 * Hornea las 5 capas + el parche de párpado a partir de la imagen ya
 * cargada. Devuelve canvases del MISMO tamaño que el PNG (comparten
 * encuadre — cero cuentas de UV por capa).
 * @param {HTMLImageElement} img
 * @param {{ancho?: number, altoPx?: number}} [dims]  fallback si `img` aún
 *   no cargó (naturalWidth/Height en 0) — en producción no debería hacer
 *   falta, pero blinda contra un `onload` que dispara antes de tiempo.
 * @returns {{W:number,H:number,cuerpo:HTMLCanvasElement,cabeza:HTMLCanvasElement,
 *   orejaIzq:HTMLCanvasElement,orejaDer:HTMLCanvasElement,mandibula:HTMLCanvasElement,
 *   patasDelCerca:HTMLCanvasElement,patasDelLejana:HTMLCanvasElement,
 *   pataTrasera:HTMLCanvasElement,cola:HTMLCanvasElement,
 *   parpado:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number},
 *   parpado2:{cv:HTMLCanvasElement,x0:number,y0:number,w:number,h:number}}|null}
 */
export function hornearJaguar(img, dims = {}) {
  const { ancho, altoPx } = dims;
  if (!haySoporteCanvas()) return null;
  const W = img.naturalWidth || ancho;
  const H = img.naturalHeight || altoPx;
  if (!W || !H) return null;

  const base = lienzo(W, H);
  const bctx = base.getContext('2d', { willReadFrequently: true });
  bctx.drawImage(img, 0, 0, W, H);
  let src;
  try {
    src = bctx.getImageData(0, 0, W, H);
  } catch {
    // canvas "tainted" (CORS) o getImageData no implementado.
    return null;
  }
  const sd = src.data;

  // Prioridad: cabeza > patasDelCerca/patasDelLejana > pataTrasera > cola >
  // cuerpo. Cada una se calcula EXCLUYENDO lo que ya reclamaron las de mayor
  // prioridad — así dos piezas nunca compiten semi-opacas por el mismo
  // píxel. Las dos patas delanteras SÍ se solapan a propósito entre ELLAS
  // (ver `fraccionCercaPatasDel`/`SOLAPE_PATA_DEL_CERCA` en anatomia.js):
  // `patasDelLejana` pinta ENCIMA en el DOM con el corte ajustado; debajo,
  // `patasDelCerca` es más ancha que su mitad "justa" para respaldar el
  // hueco que abre la rotación cuando las dos patas divergen de fase.
  // `mCabeza` es la cabeza COMPLETA (incluye orejas y mandíbula): se usa para
  // (a) excluir la cabeza de las demás piezas y (b) el corte duro del cuerpo —
  // así el cuerpo sigue borrándose bajo TODA la testa, orejas y mandíbula
  // incluidas (sin esto el cuerpo reclamaría los píxeles de oreja/mandíbula que
  // ahora la cabeza-render no pinta → 0% de píxeles perdidos se mantiene).
  const mCabeza = (x, y) => mascaraCabeza(x, y);
  // Piezas NUEVAS de la vida: las orejas (arriba de todo) y la mandíbula
  // (mitad inferior de la cara). Se recortan DENTRO de la cabeza (× mCabeza)
  // para no invadir cuello/cuerpo, y se RESTAN de la cabeza-render (abajo).
  const mOrejaIzq = (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabeza(x, y);
  const mOrejaDer = (x, y) => mascaraOreja(x, y, OREJA_DER) * mCabeza(x, y);
  const mMandibula = (x, y) => mascaraMandibula(x, y) * mCabeza(x, y);
  // La cabeza que se PINTA = cabeza completa menos lo que ahora vive aparte. Las
  // orejas se restan por su parte ALTA (`mascaraOrejaSub`): la BASE queda en la
  // cabeza de respaldo (anti-hueco al rotar). La oreja-pieza (arriba, con la
  // máscara completa) tapa esa base en reposo → compuesto idéntico. La
  // mandíbula sí se resta entera (baja en bloque, no rota desde dentro).
  const mCabezaRender = (x, y) => mCabeza(x, y)
    * (1 - mascaraOrejaSub(x, y, OREJA_IZQ)) * (1 - mascaraOrejaSub(x, y, OREJA_DER))
    * (1 - mMandibula(x, y));
  const mApendiceDel = (x, y) => mascaraApendice(x, y, PATAS_DEL_ENVOLVENTE) * (1 - mCabeza(x, y));
  const mPataDelLejana = (x, y) => mApendiceDel(x, y) * fraccionLejanaPatasDel(x, y);
  const mPataDelCerca = (x, y) => mApendiceDel(x, y) * fraccionCercaPatasDel(x, y);
  const mPataTrasera = (x, y) => mascaraApendice(x, y, PATA_TRASERA) * (1 - mCabeza(x, y));
  const mCola = (x, y) => mascaraCola(x, y) * (1 - mCabeza(x, y)) * (1 - mPataTrasera(x, y));
  const hard = (m) => 1 - ss(0.93, 1.0, m);
  const mCuerpo = (x, y) => hard(mCabeza(x, y)) * hard(mPataDelCerca(x, y)) * hard(mPataDelLejana(x, y))
    * hard(mPataTrasera(x, y)) * hard(mCola(x, y));

  const pintar = (mascara) => {
    const cv = lienzo(W, H);
    const g = cv.getContext('2d');
    const im = g.createImageData(W, H);
    const d = im.data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const a = sd[i + 3];
        if (!a) { d[i + 3] = 0; continue; }
        d[i] = sd[i]; d[i + 1] = sd[i + 1]; d[i + 2] = sd[i + 2];
        d[i + 3] = a * mascara(x, y);
      }
    }
    g.putImageData(im, 0, 0);
    return cv;
  };

  const parpado = parcheParpado(sd, W, H, OJO);
  const parpado2 = parcheParpado(sd, W, H, OJO_2);

  return {
    W,
    H,
    cuerpo: pintar(mCuerpo),
    cabeza: pintar(mCabezaRender),
    orejaIzq: pintar(mOrejaIzq),
    orejaDer: pintar(mOrejaDer),
    mandibula: pintar(mMandibula),
    patasDelCerca: pintar(mPataDelCerca),
    patasDelLejana: pintar(mPataDelLejana),
    pataTrasera: pintar(mPataTrasera),
    cola: pintar(mCola),
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
 * en pantalla a tamaño de avatar (48px totales, ver `JaguarLaminaViva.jsx`
 * para el bug de fondo — `inset:0` faltante — que antes dejaba el párpado en
 * 0×0). Con el bug ya corregido, se midió con Playwright+Chromium (captura
 * real, congelando animaciones y comparando abierto/cerrado píxel a píxel)
 * que agrandar el parche de 2.5r×2.1r a 3.1r×2.6r sube el conteo de píxeles
 * con cambio real (diff>30 en 0-765) de 104 a 154 sobre ~48×27px de imagen —
 * mejora medible, no solo estética. Sigue siendo piel/pelo propio del animal
 * (nunca se inventa un párpado dibujado) — solo se agranda el RECORTE, no se
 * cambia la técnica. A 48px el cambio sigue siendo sutil (el piso está en
 * cuántos píxeles reales tiene el ojo en la foto fuente, no en el código);
 * a partir de ~100-150px de avatar el parpadeo se ve completo y convincente
 * (verificado visualmente, ver el reporte de la tarea).
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
