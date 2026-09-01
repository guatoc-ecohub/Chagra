/**
 * lib — helpers + GEOMETRÍA COMPARTIDA para hornear las capas del rig 2.5D
 * del oso del bastón (lienzo 615×630, `compai/laminas/oso.png`).
 *
 * Todo el color sale de la lámina salvo lo documentado (contornos de tinta de
 * las completaciones + interior de boca). Los cortes de CABEZA / OREJAS /
 * MANDÍBULA / CORONA son un puerto 1:1 de lo APROBADO en
 * `chagra/src/visual/creatures/osoLamina/{anatomia,capas}.js` — acá NO se
 * reinventa la cabeza: el cuello/cabeza no se corta distinto, solo se
 * reutiliza la polilínea aprobada. Lo NUEVO medido (2026-08-19, crops con
 * grilla en `_build/crops/`): piernas, brazo+bastón, roca.
 *
 * REGLA DE RESTAS (la lección de las costuras del lote): resta sobre capa de
 * ABAJO → dura (`hard`); ventana sobre capa de ENCIMA → suave.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

export const SRC = '/home/kortux/demos/3d/compai/laminas/oso.png';
export const OUT = '/home/kortux/demos/3d/compai/rigs2d/oso';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
/** resta DURA: conserva el píxel completo hasta que lo de encima es ~opaco */
export const hard = (m) => 1 - ss(0.996, 1, m);
export const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

export async function cargarLamina() {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { sd: data, W: info.width, H: info.height };
}
export const idx = (W, x, y) => (y * W + x) * 4;
export const capa = (W, H) => Buffer.alloc(W * H * 4, 0);
export async function guardarPNG(buf, W, H, ruta) {
  await sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(ruta);
  console.log('->', ruta);
}

/** blur de caja separable sobre un Float32Array (feather de máscaras) */
export function blurMask(m, W, H, r) {
  if (r <= 0) return m;
  const tmp = new Float32Array(m.length);
  const out = new Float32Array(m.length);
  const n = 2 * r + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += m[y * W + clamp(x, 0, W - 1)];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / n;
      acc += m[y * W + clamp(x + r + 1, 0, W - 1)] - m[y * W + clamp(x - r, 0, W - 1)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, H - 1) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / n;
      acc += tmp[clamp(y + r + 1, 0, H - 1) * W + x] - tmp[clamp(y - r, 0, H - 1) * W + x];
    }
  }
  return out;
}

/** disco de tinta (contorno dibujado) compuesto over sobre la capa */
export function tinta(buf, W, H, x, y, rad, [r, g, b], a) {
  const x0 = Math.max(0, Math.floor(x - rad - 1)), x1 = Math.min(W - 1, Math.ceil(x + rad + 1));
  const y0 = Math.max(0, Math.floor(y - rad - 1)), y1 = Math.min(H - 1, Math.ceil(y + rad + 1));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const d = Math.hypot(xx - x, yy - y);
    const cov = 1 - ss(rad - 0.8, rad + 0.8, d);
    if (cov <= 0) continue;
    const i = idx(W, xx, yy);
    const aa = a * cov;
    const oldA = buf[i + 3] / 255;
    const na = aa + oldA * (1 - aa);
    if (na <= 0) continue;
    for (let c = 0; c < 3; c++) buf[i + c] = ([r, g, b][c] * aa + buf[i + c] * oldA * (1 - aa)) / na;
    buf[i + 3] = na * 255;
  }
}

/** debug: pieza compuesta sobre gris medio, recortada y ampliada */
export async function debugCrop(buf, W, H, box, escala, ruta) {
  const fondo = Buffer.alloc(W * H * 4);
  for (let i = 0; i < fondo.length; i += 4) { fondo[i] = fondo[i + 1] = fondo[i + 2] = 118; fondo[i + 3] = 255; }
  const plano = await sharp(fondo, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: buf, raw: { width: W, height: H, channels: 4 } }])
    .png().toBuffer();
  await sharp(plano)
    .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
    .resize({ width: box[2] * escala, kernel: 'lanczos3' }).png().toFile(ruta);
}

/* ═══════════ ANATOMÍA APROBADA (puerto 1:1 de osoLamina/anatomia.js) ═══════ */

export const ANCHO = 615;
export const ALTO = 630;

export const CABEZA = {
  box: { x0: 206, x1: 445, xFade: 13 },
  cuello: { puntos: [[232, 148], [300, 190], [345, 203], [445, 178]], fade: 16 },
  cuelloSub: 26,
  pivote: [330, 195],
};
export const OJO = { cx: 326, cy: 97, r: 16 };
export const OREJA_IZQ = { box: { x0: 238, x1: 302, xFade: 8 }, base: { y0: 48, y1: 66 }, baseSub: { y0: 28, y1: 44 }, pivote: [270, 58] };
export const OREJA_DER = { box: { x0: 378, x1: 442, xFade: 8 }, base: { y0: 52, y1: 70 }, baseSub: { y0: 30, y1: 48 }, pivote: [410, 62] };
export const MANDIBULA = {
  box: { x0: 290, x1: 378, xFade: 10 },
  labio: { puntos: [[290, 148], [330, 168], [378, 184]], fade: 8 },
  menton: { y0: 188, y1: 204 },
  pivote: [296, 152],
};
export const CORONA = { box: { x0: 482, x1: 600, xFade: 10 }, base: { y0: 168, y1: 192 }, baseSub: { y0: 148, y1: 166 }, pivote: [545, 178] };
export const BOCA = { cx: 336, cy: 158, ancho: 78, giro: 14 };

/** interpola una polilínea [[x,y],…] en x (clampeada a los extremos) */
export function interpolarY(puntos, x) {
  if (x <= puntos[0][0]) return puntos[0][1];
  const ultimo = puntos[puntos.length - 1];
  if (x >= ultimo[0]) return ultimo[1];
  for (let i = 1; i < puntos.length; i++) {
    const [x0, y0] = puntos[i - 1];
    const [x1, y1] = puntos[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return ultimo[1];
}
export function fxBox(x, { x0, x1, xFade }) {
  return ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
}
export function mascaraCabeza(x, y, subir = 0) {
  const yCorte = interpolarY(CABEZA.cuello.puntos, x) - subir;
  const f = CABEZA.cuello.fade;
  return fxBox(x, CABEZA.box) * (1 - ss(yCorte - f, yCorte + f, y));
}
export function mascaraOreja(x, y, { box, base }) {
  return fxBox(x, box) * (1 - ss(base.y0, base.y1, y));
}
export function mascaraOrejaSub(x, y, { box, baseSub }) {
  return fxBox(x, box) * (1 - ss(baseSub.y0, baseSub.y1, y));
}
export function mascaraMandibula(x, y) {
  const yLabio = interpolarY(MANDIBULA.labio.puntos, x);
  const f = MANDIBULA.labio.fade;
  return fxBox(x, MANDIBULA.box) * ss(yLabio - f, yLabio + f, y) * (1 - ss(MANDIBULA.menton.y0, MANDIBULA.menton.y1, y));
}
export function mascaraCorona(x, y) {
  return fxBox(x, CORONA.box) * (1 - ss(CORONA.base.y0, CORONA.base.y1, y));
}
export function mascaraCoronaSub(x, y) {
  return fxBox(x, CORONA.box) * (1 - ss(CORONA.baseSub.y0, CORONA.baseSub.y1, y));
}

/* ═══════════ GEOMETRÍA NUEVA (medida 2026-08-19, _build/crops/) ═══════════ */

/** Borde TRASERO (silueta) del tope de la roca — la línea que las piernas y
 *  el palo cruzan por delante. Separa cuerpo (arriba) de roca (abajo).
 *  MEDIDA por runs oscuros por columna (`medir-linea.mjs`), no a ojo: la
 *  lectura a ojo del primer intento estaba 4-8px corrida y dejaba bigotes. */
export const ROCA_TOP = [[22, 533], [46, 526], [70, 519], [76, 516], [88, 505], [100, 499], [112, 497], [130, 491], [146, 483], [170, 477], [200, 472], [240, 470], [268, 469], [292, 465], [340, 464], [400, 467], [450, 469], [490, 471], [520, 476], [544, 481], [568, 486], [576, 491]];
/** pliegue tope→cara frontal, tramo izquierdo (cruza tras las garras izq) */
export const ROCA_PLIEGUE = [[20, 534], [70, 531], [100, 532], [130, 534], [170, 538], [220, 543], [268, 547]];
/** grieta diagonal derecha de la cara frontal (ningún pie la cruza) */
export const ROCA_GRIETA = [[300, 548], [360, 547], [420, 550], [480, 554], [520, 556]];

/**
 * PIERNAS — el oso es BÍPEDO aprobado (erguido sobre la roca). Las DOS
 * piernas se cortan como piezas propias que van DETRÁS del cuerpo: la panza
 * las tapa arriba (la banda de fade = respaldo de cadera, misma piel — la
 * lección `baseSub`/solape del jaguar: en reposo el compuesto es idéntico y
 * al rotar desde la cadera la raíz sigue cubierta).
 *   cercana = viewer-izquierda (el lado cercano del animal: testa ¾ a la
 *             derecha del oso ⇒ su costado derecho mira a cámara) — LIMPIA.
 *   ocluida = viewer-derecha, con la raíz del muslo más comida por la panza.
 * `region` acota el blob; `raiz` = banda de fade de la raíz (0 arriba → 1
 * abajo); `cadera` = pivote del rig; `rocaSpan` = tramo en x donde la pierna
 * cruza legítimamente ROCA_TOP (fuera de él, la línea de la roca se excluye
 * del blob para que no viaje pegada al pie).
 */
export const PIERNAS = {
  cercana: {
    region: { x0: 112, x1: 262, y0: 352, y1: 582 },
    raiz: { y0: 355, y1: 398 },
    muslo: { x0: 146, x1: 258, xFade: 8 },
    cadera: [222, 398],
    rodillaCorte: 470,
    rocaSpan: [188, 246],
    pliegueSpan: [122, 238],
    grietaSpan: [122, 238],
    /** stub de línea de roca fundido con el talón (arriba del contorno real) */
    recortes: [[136, 163, 470, 481]],
  },
  ocluida: {
    region: { x0: 292, x1: 486, y0: 350, y1: 560 },
    raiz: { y0: 352, y1: 402 },
    muslo: { x0: 298, x1: 406, xFade: 8 },
    cadera: [348, 400],
    rodillaCorte: 450,
    rocaSpan: [349, 486],
    pliegueSpan: [0, 0],
    grietaSpan: [0, 0],
    /** tramo de línea de roca visible entre el pie y el palo: viaja con la
     *  roca, no con el pie */
    recortes: [[444, 486, 462, 476]],
  },
};

/**
 * BRAZO + BASTÓN — una sola pieza (deltoide + bíceps + zarpa que empuña +
 * palo + orquídeas y tallos): la zarpa va ENCIMA del palo y las orquídeas se
 * funden con él — separarlos no tiene señal (la lección documentada en
 * anatomia.js). La CORONA sigue siendo pieza aparte aprobada: esta pieza le
 * deja el arranque del palo de respaldo (`hard(mascaraCoronaSub)`) y en el
 * rig la corona viaja como HIJA del brazo.
 * `crease` = frontera brazo/torso (polilínea x por y, fade ±8) medida en
 * `crops/hombro-der.png`; el hombro pivota en el deltoide.
 */
export const BRAZO = {
  crease: [[148, 404], [195, 410], [240, 415], [278, 438], [300, 458], [322, 472], [345, 478], [360, 482]], // [y, x]
  creaseFade: 8,
  region: { x0: 396, x1: 615, y0: 130, y1: 368 },
  hombro: [432, 208],
  /** cajas auxiliares fuera del polígono principal del brazo */
  orquideaBaja: { x0: 386, x1: 468, y0: 320, y1: 404, semilla: [425, 363] }, // blanca-lila (tapa flanco: blob claro SEMBRADO + dilatación)
  orquideaAlta: { x0: 424, x1: 500, y0: 96, y1: 212 },    // durazno + botones (sobre fondo)
  tallos: { x0: 427, x1: 515, y0: 372, y1: 458 },          // enredadera sobre fondo (sin tocar línea de roca ni mechón de pierna)
  palo: { puntos: [[168, 551], [240, 545], [300, 530], [360, 518], [410, 510], [455, 503], [492, 497], [518, 494]], medio: 20 }, // [y, xCentro] · medio 20: la enredadera abraza el palo más ancho que la madera
  paloFin: 519,
};

/** interpola una polilínea [[y,x],…] en y */
export function interpolarX(puntos, y) {
  if (y <= puntos[0][0]) return puntos[0][1];
  const ultimo = puntos[puntos.length - 1];
  if (y >= ultimo[0]) return ultimo[1];
  for (let i = 1; i < puntos.length; i++) {
    const [y0, x0] = puntos[i - 1];
    const [y1, x1] = puntos[i];
    if (y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
  }
  return ultimo[1];
}

/* ═══════════ MAQUINARIA DE BLOBS (segmentación sin redibujar) ═══════════ */

/** binario: píxel "oscuro" (pelaje/tinta/madera) dentro de una región */
export function blobOscuro(sd, W, H, region, umbral = 118) {
  const bin = new Uint8Array(W * H);
  for (let y = region.y0; y < region.y1; y++) for (let x = region.x0; x < region.x1; x++) {
    const i = idx(W, x, y);
    if (sd[i + 3] > 128 && lum(sd[i], sd[i + 1], sd[i + 2]) < umbral) bin[y * W + x] = 1;
  }
  return bin;
}

/** excluye del binario un corredor alrededor de una polilínea [[x,y],…]
 *  (por x), EXCEPTO dentro de gapSpan [x0,x1] (donde el sujeto cruza la
 *  línea de verdad). Asimétrico: el trazo de tinta de la roca cae más hacia
 *  ABAJO de la línea medida que hacia arriba. */
export function excluirCorredor(bin, W, H, polilinea, hwArriba, hwAbajo, gapSpan) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!bin[y * W + x]) continue;
    if (x >= gapSpan[0] && x <= gapSpan[1]) continue;
    const yl = interpolarY(polilinea, x);
    if (y > yl - hwArriba && y < yl + hwAbajo) bin[y * W + x] = 0;
  }
  return bin;
}

/** rellena huecos: todo lo NO alcanzable desde el borde del lienzo por
 *  píxeles vacíos pasa a ser blob (así las garras blancas, cerradas por su
 *  contorno de tinta, entran completas — cero redibujo) */
export function rellenarHuecos(bin, W, H) {
  const fuera = new Uint8Array(W * H);
  const pila = [];
  const push = (x, y) => {
    const p = y * W + x;
    if (x < 0 || y < 0 || x >= W || y >= H || fuera[p] || bin[p]) return;
    fuera[p] = 1; pila.push(p);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (pila.length) {
    const p = pila.pop();
    const x = p % W, y = (p / W) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  const out = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) out[p] = fuera[p] ? 0 : 1;
  return out;
}

/** conserva solo el componente conexo que contiene la semilla */
export function componenteDe(bin, W, H, [sx, sy]) {
  const out = new Uint8Array(W * H);
  const p0 = sy * W + sx;
  if (!bin[p0]) { console.warn('⚠ semilla fuera del blob', sx, sy); return bin; }
  const pila = [p0];
  out[p0] = 1;
  while (pila.length) {
    const p = pila.pop();
    const x = p % W, y = (p / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx;
      if (bin[q] && !out[q]) { out[q] = 1; pila.push(q); }
    }
  }
  return out;
}

/** conserva solo el componente conexo MÁS GRANDE dentro de una caja */
export function componenteMayor(bin, W, H, { x0, x1, y0, y1 }) {
  const visto = new Uint8Array(W * H);
  let mejor = null, mejorN = 0;
  for (let ys = y0; ys < y1; ys++) for (let xs = x0; xs < x1; xs++) {
    const p0 = ys * W + xs;
    if (!bin[p0] || visto[p0]) continue;
    const comp = [];
    const pila = [p0];
    visto[p0] = 1;
    while (pila.length) {
      const p = pila.pop();
      comp.push(p);
      const x = p % W, y = (p / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx;
        if (bin[q] && !visto[q]) { visto[q] = 1; pila.push(q); }
      }
    }
    if (comp.length > mejorN) { mejorN = comp.length; mejor = comp; }
  }
  const out = new Uint8Array(W * H);
  if (mejor) for (const p of mejor) out[p] = 1;
  return out;
}

/** dilata un binario r píxeles (chebyshev, separable) */
export function dilatar(bin, W, H, r) {
  const tmp = new Uint8Array(W * H);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let k = Math.max(0, x - r); k <= Math.min(W - 1, x + r); k++) if (bin[y * W + k]) { v = 1; break; }
    tmp[y * W + x] = v;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0;
    for (let k = Math.max(0, y - r); k <= Math.min(H - 1, y + r); k++) if (tmp[k * W + x]) { v = 1; break; }
    out[y * W + x] = v;
  }
  return out;
}

/* ═══════════ MÁSCARAS DE LAS PIEZAS NUEVAS (fuente única pieza↔hueco) ════ */

/** máscara float de una PIERNA: blob oscuro (garras incluidas por relleno de
 *  huecos) × banda de raíz. Las líneas de la roca se excluyen por corredor
 *  fuera del cruce legítimo. */
export function mascaraPierna(sd, W, H, clave) {
  const P = PIERNAS[clave];
  let bin = blobOscuro(sd, W, H, P.region);
  excluirCorredor(bin, W, H, ROCA_TOP, 1, 13, P.rocaSpan);
  excluirCorredor(bin, W, H, ROCA_PLIEGUE, 1, 13, P.pliegueSpan);
  excluirCorredor(bin, W, H, ROCA_GRIETA, 1, 13, P.grietaSpan);
  if (clave === 'ocluida') {
    // el palo del bastón abuta con la garra externa (hay roca entre medio,
    // zoom-garra-palo.png): todo x≥486 es territorio del brazo
    for (let y = 0; y < H; y++) for (let x = 486; x < P.region.x1 + 8 && x < W; x++) bin[y * W + x] = 0;
  }
  bin = rellenarHuecos(bin, W, H);
  bin = componenteDe(bin, W, H, [P.cadera[0], P.cadera[1] + 30]);
  for (const [x0, x1, y0, y1] of P.recortes) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) bin[y * W + x] = 0;
  }
  const m = new Float32Array(W * H);
  for (let y = P.region.y0; y < P.region.y1; y++) for (let x = P.region.x0; x < P.region.x1; x++) {
    if (!bin[y * W + x]) continue;
    // pinza de MUSLO en la zona de raíz: la banda de respaldo solo lleva la
    // franja del muslo — sin ella, arrastraba borde de panza junto al arco
    const pinza = y < P.raiz.y1 + 14 ? fxBox(x, P.muslo) : 1;
    m[y * W + x] = ss(P.raiz.y0, P.raiz.y1, y) * pinza;
  }
  return blurMask(m, W, H, 1);
}

/** máscara float del BRAZO+BASTÓN (sin la corona: se resta con coronaSub en
 *  quien la consuma) */
export function mascaraBrazoBaston(sd, W, H) {
  const B = BRAZO;
  const m = new Float32Array(W * H);
  // 1) masa del brazo: derecha de la crestera del hombro, bajo la cabeza
  for (let y = B.region.y0; y < B.region.y1; y++) {
    const xc = interpolarX(B.crease, y);
    for (let x = B.region.x0 - 20; x < B.region.x1 && x < W; x++) {
      const f = ss(xc - B.creaseFade, xc + B.creaseFade, x);
      if (f <= 0) continue;
      const p = y * W + x;
      m[p] = Math.max(m[p], f * hard(mascaraCabeza(x, y)));
    }
  }
  // 2) palo: banda alrededor del eje medido; sobre la roca (y>470) solo lo
  //    no-tan (contorno+madera), con huecos rellenados por su tinta
  {
    const bin = new Uint8Array(W * H);
    for (let y = 160; y < B.paloFin + 4; y++) {
      const xc = interpolarX(B.palo.puntos, y);
      for (let x = Math.round(xc - B.palo.medio - 6); x <= Math.round(xc + B.palo.medio + 6); x++) {
        if (x < 0 || x >= W) continue;
        const i = idx(W, x, y);
        if (sd[i + 3] <= 128) continue;
        const dentro = Math.abs(x - xc) <= B.palo.medio;
        if (y <= 470) { if (dentro) bin[y * W + x] = 1; continue; }
        if (dentro && lum(sd[i], sd[i + 1], sd[i + 2]) < 150 && y <= B.paloFin) bin[y * W + x] = 1;
      }
    }
    const lleno = rellenarHuecos(bin, W, H);
    for (let p = 0; p < W * H; p++) if (lleno[p]) m[p] = 1;
  }
  // 3) orquídea baja (blanca-lila, tapa el flanco): blob CLARO, SEMBRADO en
  //    el centro de la flor (los brillos pálidos del pelaje del flanco caen
  //    en la misma caja pero no conectan con la flor) + dilatación que
  //    absorbe su contorno de tinta
  {
    const O = B.orquideaBaja;
    const bin = new Uint8Array(W * H);
    for (let y = O.y0; y < O.y1; y++) for (let x = O.x0; x < O.x1; x++) {
      const i = idx(W, x, y);
      if (sd[i + 3] > 128 && lum(sd[i], sd[i + 1], sd[i + 2]) > 118) bin[y * W + x] = 1;
    }
    const flor = componenteMayor(rellenarHuecos(bin, W, H), W, H, O);
    const din = dilatar(flor, W, H, 3);
    for (let y = O.y0 - 4; y < O.y1 + 4; y++) for (let x = O.x0 - 4; x < O.x1 + 4; x++) {
      const p = y * W + x;
      if (din[p]) m[p] = 1;
    }
  }
  // 4) orquídea alta + botones y 5) tallos: sobre fondo puro — el alfa corta
  for (const R of [B.orquideaAlta, B.tallos]) {
    for (let y = R.y0; y < R.y1; y++) for (let x = R.x0; x < R.x1; x++) {
      const p = y * W + x;
      const fb = ss(R.x0, R.x0 + 5, x) * (1 - ss(R.x1 - 5, R.x1, x)) * ss(R.y0, R.y0 + 5, y) * (1 - ss(R.y1 - 5, R.y1, y));
      m[p] = Math.max(m[p], fb);
    }
  }
  return blurMask(m, W, H, 1);
}

/** región de ROCA: por debajo del borde trasero del tope (fade 4px) */
export function regionRoca(x, y) {
  const yl = interpolarY(ROCA_TOP, x);
  return ss(yl - 4, yl + 4, y);
}
