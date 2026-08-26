/**
 * lib — helpers + GEOMETRÍA COMPARTIDA para hornear las capas del rig 2.5D
 * de la zarigüeya (lienzo 481×444, `compai/laminas/zariguya.png` — la lámina
 * DESGUANTADA de `fix/zariguya-sin-guantes-v2`, sha 7b490aeb…).
 *
 * Todo el color sale de la lámina salvo lo documentado (contornos de tinta de
 * los rellenos + interior de boca). Los cortes de CABEZA / OREJAS / MANDÍBULA
 * / BRAZOS / COLA son un puerto 1:1 de lo APROBADO en
 * `chagra/src/visual/creatures/zariguyaLamina/{anatomia,capas}.js` (con el
 * umbral 0,996 del fix de costuras) — acá NO se reinventa la cabeza: el
 * cuello/cabeza no se corta distinto ni se redibuja. Lo NUEVO medido
 * (2026-08-19, crops con grilla + runs de alfa/lum en `_build/`): las DOS
 * patas traseras y la interacción cola↔pata cercana.
 *
 * REGLA DE RESTAS (lección de las costuras del lote): resta sobre capa de
 * ABAJO → dura (`hard`); ventana sobre capa de ENCIMA → suave.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
export const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');

export const SRC = '/home/kortux/demos/3d/compai/laminas/zariguya.png';
export const OUT = '/home/kortux/demos/3d/compai/rigs2d/zariguya';

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
/** resta DURA: conserva el píxel completo hasta que lo de encima es ~opaco
 *  (umbral 0,996 aprobado en el fix de costuras de la zarigüeya) */
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

/** disco de tinta (contorno dibujado) compuesto over sobre la capa.
 *  `gate` (opcional): RGBA de la lámina — no sella fuera de la silueta
 *  original (el desborde creaba exceso fuera-de-silueta en el candado). */
export function tinta(buf, W, H, x, y, rad, [r, g, b], a, gate) {
  const x0 = Math.max(0, Math.floor(x - rad - 1)), x1 = Math.min(W - 1, Math.ceil(x + rad + 1));
  const y0 = Math.max(0, Math.floor(y - rad - 1)), y1 = Math.min(H - 1, Math.ceil(y + rad + 1));
  for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
    const d = Math.hypot(xx - x, yy - y);
    const cov = 1 - ss(rad - 0.8, rad + 0.8, d);
    if (cov <= 0) continue;
    const i = idx(W, xx, yy);
    if (gate && gate[i + 3] < 250) continue;
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

/* ═══════ ANATOMÍA APROBADA (puerto 1:1 de zariguyaLamina/anatomia.js) ═════ */

export const ANCHO = 481;
export const ALTO = 444;

export const CABEZA = {
  cuello: { px: 220, py: 180, nx: 0.309, ny: 0.951, u0: -12, u1: 12 },
  fadePecho: { y0: 196, y1: 226 },
  pivote: [200, 168],
};
export const OJO = { cx: 184, cy: 76, r: 20 };
export const OJO_2 = { cx: 242, cy: 73, r: 20 };
export const OREJA_IZQ = {
  box: { x0: 84, x1: 148, xFade: 6 },
  base: { y0: 74, y1: 96 },
  baseSub: { y0: 48, y1: 68 },
  pivote: [118, 86],
};
export const OREJA_DER = {
  box: { x0: 226, x1: 296, xFade: 6 },
  base: { y0: 42, y1: 58 },
  baseSub: { y0: 22, y1: 38 },
  pivote: [258, 56],
};
export const MANDIBULA = {
  box: { x0: 128, x1: 244, xFade: 8 },
  labio: { y0: 138, y1: 148 },
  menton: { y0: 160, y1: 176 },
  colmillo: { x0: 214, x1: 248, xFade: 5, y0: 124, y1: 152, yFade: 6 },
  pivote: [134, 110],
};
export const BOCA = { cx: 189, cy: 141, ancho: 68 };
export const BRAZO_LAPIZ = {
  lapiz: { ax: 14, ay: 228, bx: 84, by: 132, r: 10, rFade: 3 },
  guante: { cx: 58, cy: 175, rx: 42, ry: 41, e0: 0.78, e1: 1.02 },
  antebrazo: { ax: 92, ay: 198, bx: 178, by: 258, r: 24, rFade: 8, t0: 0.62, t1: 0.95 },
  pivote: [162, 242],
};
export const BRAZO_BRUJULA = {
  brujula: { cx: 112, cy: 262, r: 31, rFade: 4 },
  guante: { cx: 151, cy: 263, rx: 36, ry: 36, e0: 0.8, e1: 1.0 },
  antebrazo: { ax: 168, ay: 246, bx: 206, by: 222, r: 20, rFade: 7, t0: 0.55, t1: 0.9 },
  pivote: [198, 232],
};
export const INPAINT_PECHO = {
  x0: 142, x1: 196, y0: 226, y1: 302, dx: 70, dy: 40, umbral: 0.45,
};
export const COLA = {
  cut: { px: 352, py: 330, nx: 1, ny: 0, u0: -16, u1: 16 },
  pivote: [358, 360],
};
export const CUERPO_PIVOTE = [235, 300];

const proyeccion = (x, y, corte) => corte.nx * (x - corte.px) + corte.ny * (y - corte.py);

export function mascaraCabeza(x, y) {
  const { cuello, fadePecho } = CABEZA;
  const base = 1 - ss(cuello.u0, cuello.u1, proyeccion(x, y, cuello));
  const pecho = 1 - ss(fadePecho.y0, fadePecho.y1, y);
  return base * pecho;
}
export function mascaraOreja(x, y, { box, base }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  return fx * (1 - ss(base.y0, base.y1, y));
}
export function mascaraOrejaSub(x, y, { box, baseSub }) {
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  return fx * (1 - ss(baseSub.y0, baseSub.y1, y));
}
function cajaSuave(x, y, { x0, x1, xFade, y0, y1, yFade }) {
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(y0, y0 + yFade, y) * (1 - ss(y1 - yFade, y1, y));
  return fx * fy;
}
export function mascaraMandibula(x, y) {
  const { box, labio, menton, colmillo } = MANDIBULA;
  const { x0, x1, xFade } = box;
  const fx = ss(x0, x0 + xFade, x) * (1 - ss(x1 - xFade, x1, x));
  const fy = ss(labio.y0, labio.y1, y) * (1 - ss(menton.y0, menton.y1, y));
  return fx * fy * (1 - cajaSuave(x, y, colmillo));
}
function mascaraCapsula(x, y, { ax, ay, bx, by, r, rFade, t0, t1 }) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const tRaw = ((x - ax) * dx + (y - ay) * dy) / len2;
  const t = clamp(tRaw, 0, 1);
  const d = Math.hypot(x - (ax + t * dx), y - (ay + t * dy));
  let a = 1 - ss(r, r + rFade, d);
  if (t0 !== undefined) a *= 1 - ss(t0, t1, tRaw);
  return a;
}
function mascaraElipse(x, y, { cx, cy, rx, ry, e0, e1 }) {
  const rn = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return 1 - ss(e0, e1, rn);
}
function mascaraDisco(x, y, { cx, cy, r, rFade }) {
  return 1 - ss(r, r + rFade, Math.hypot(x - cx, y - cy));
}
export function mascaraBrazoLapiz(x, y) {
  return Math.max(
    mascaraCapsula(x, y, BRAZO_LAPIZ.lapiz),
    mascaraElipse(x, y, BRAZO_LAPIZ.guante),
    mascaraCapsula(x, y, BRAZO_LAPIZ.antebrazo),
  );
}
export function mascaraBrazoBrujula(x, y) {
  return Math.max(
    mascaraDisco(x, y, BRAZO_BRUJULA.brujula),
    mascaraElipse(x, y, BRAZO_BRUJULA.guante),
    mascaraCapsula(x, y, BRAZO_BRUJULA.antebrazo),
  );
}
/** prioridad aprobada: lápiz > brújula; la cabeza excluye ambos DURO */
export function mBrazoBrujulaPieza(x, y) {
  return mascaraBrazoBrujula(x, y) * hard(mascaraBrazoLapiz(x, y));
}
export function mCabezaFull(x, y) {
  return mascaraCabeza(x, y) * hard(mascaraBrazoLapiz(x, y)) * hard(mBrazoBrujulaPieza(x, y));
}
/** banda vertical aprobada del corte cuerpo/cola (lado u>0 = cola) */
export function mascaraCola(x, y) {
  return ss(COLA.cut.u0, COLA.cut.u1, proyeccion(x, y, COLA.cut));
}

/* ═══════ GEOMETRÍA NUEVA (medida 2026-08-19, _build/crops + medir-runs) ═══ */

/**
 * PATAS TRASERAS — la zarigüeya es BÍPEDA aprobada (erguida, lápiz+brújula en
 * las manos). Las patas NO estaban cortadas en el runtime (anatomia.js:
 * "de pie y quieta"); este set las corta para el rig 2.5D completo:
 *   ocluida = viewer-IZQUIERDA (pie x145-225 y378-408, punta a la izquierda;
 *             el muslo comido por el flanco/vientre — raíz por POLILÍNEA
 *             medida crema→pelo, sube de izquierda a derecha).
 *   cercana = viewer-DERECHA (el pie GRANDE x274-343 y400-441, dibujado
 *             completo desde la grupa; su canilla linda con la banda
 *             aprobada de la cola: la pieza de cola la EXCLUYE con hard).
 * `region` acota el blob de ALFA (acá no hay roca: el fondo transparente
 * separa; el canal entre patas x≈226-299 aísla los dos blobs); `raizPuntos`
 * = polilínea y0(x) del arranque del pelo de pata (fade `raizFade` hacia
 * abajo = respaldo de cadera con piel real); `pinza` acota la banda de raíz
 * al muslo para no arrastrar borde de panza; `cadera` = pivote del rig.
 */
export const PATAS = {
  ocluida: {
    region: { x0: 130, x1: 236, y0: 280, y1: 416 },
    raizPuntos: [[150, 294], [176, 294], [186, 291], [196, 305], [206, 317], [216, 325], [226, 331], [236, 338]],
    raizFade: 32,
    pinza: { x0: 152, x1: 233, xFade: 8 },
    cadera: [198, 340],
    rodillaCorte: 366,
    semilla: [200, 380],
  },
  cercana: {
    region: { x0: 268, x1: 350, y0: 344, y1: 444 },
    raizPuntos: [[268, 352], [300, 354], [312, 357], [324, 360], [336, 366], [350, 372]],
    raizFade: 34,
    pinza: { x0: 298, x1: 349, xFade: 7 },
    cadera: [316, 386],
    rodillaCorte: 402,
    semilla: [318, 410],
  },
};

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

/** rellena huecos: todo lo NO alcanzable desde el borde del lienzo por
 *  píxeles vacíos pasa a ser blob (dedos crema cerrados por su contorno de
 *  tinta entran completos — cero redibujo) */
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

/* ═══════ MÁSCARAS DE LAS PIEZAS NUEVAS (fuente única pieza↔hueco) ═══════ */

/** máscara float de una PATA: blob de ALFA (garras/dedos incluidos por
 *  relleno de huecos) × banda de raíz por polilínea (0 arriba → 1 abajo)
 *  × pinza de muslo en la zona de raíz. */
export function mascaraPata(sd, W, H, clave) {
  const P = PATAS[clave];
  const bin0 = new Uint8Array(W * H);
  for (let y = P.region.y0; y < P.region.y1; y++) for (let x = P.region.x0; x < P.region.x1; x++) {
    if (sd[idx(W, x, y) + 3] > 128) bin0[y * W + x] = 1;
  }
  const lleno = rellenarHuecos(bin0, W, H);
  // el relleno global puede reintroducir píxeles fuera de la región (el
  // interior del cuerpo no es alcanzable desde el borde): recortar a región
  for (let p = 0; p < W * H; p++) {
    const x = p % W, y = (p / W) | 0;
    if (x < P.region.x0 || x >= P.region.x1 || y < P.region.y0 || y >= P.region.y1) lleno[p] = 0;
  }
  // dilatación 2px: el blob binario (alfa>128) deja fuera el anillo
  // antialiasado del contorno (alfa 10-128) — sin esto, ese anillo se queda
  // en el cuerpo y al balancear la pata queda un CONTORNO FANTASMA del pie
  // original (visto en pose-paso; la lección "fondo bajo pieza móvil")
  const bin = dilatar(componenteDe(lleno, W, H, P.semilla), W, H, 2);
  const m = new Float32Array(W * H);
  const rx0 = Math.max(0, P.region.x0 - 3), rx1 = Math.min(W, P.region.x1 + 3);
  const ry0 = Math.max(0, P.region.y0 - 3), ry1 = Math.min(H, P.region.y1 + 3);
  for (let y = ry0; y < ry1; y++) for (let x = rx0; x < rx1; x++) {
    if (!bin[y * W + x]) continue;
    const yR = interpolarY(P.raizPuntos, x);
    const f = ss(yR, yR + P.raizFade, y);
    if (f <= 0) continue;
    const pinza = y < yR + P.raizFade + 14 ? fxBox(x, P.pinza) : 1;
    m[y * W + x] = f * pinza;
  }
  return blurMask(m, W, H, 1);
}

/** pieza de COLA: banda aprobada MENOS el blob de la pata cercana, ACOTADA
 *  al extent real de la cola (medido por runs — la banda del runtime corre
 *  TODA la altura del lienzo; con las patas como piezas y la cola prensil
 *  con gestos amplios, lo que la banda arrastra de más se vuelve fantasma):
 *   · hard(pata): la banda x≈352±16 cruza la canilla/pie (~13-20% de alfa
 *     del borde viajaría con la cola al mecerse)
 *   · tope superior ss(304,316,y) solo del lado de la BASE (x<388): sin él,
 *     la banda reclama hasta 68% del borde del LOMO (y250-330) — el rulo
 *     (x>388, sube a y≈215) queda libre
 *   · piso (1-ss(367,377,y)): nada de cola existe bajo y≈366 (base peluda
 *     termina y≤356, rulo y≤365); mata el filo de canilla en la rampa
 *  La base peluda y316-366 × x336-368 sigue REPARTIDA por la banda (el
 *  respaldo aprobado). También excluye cabeza (por pureza: es 0 ahí). */
export function mascaraColaPieza(sd, W, H, mPataCercana) {
  const m = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    // liberación en x≥388: el cuerpo nunca pasa de x357 para y<316 (medido
    // por filas) y la PUNTA interior del rulo vive en x391-401·y248-262 —
    // con la liberación en 386-396 la punta quedaba repartida y al enroscar
    // dejaba una gotita fantasma (visto en pose-cola-enrosca). Sin piso en
    // y: la rayita de sombra de piso bajo el rulo (y≈368-373, semialfa)
    // VIAJA con la cola (la sombra pertenece a la pieza — regla del oso);
    // la canilla de la pata ya se excluye con hard(mPata) dilatada.
    const tope = Math.max(ss(304, 316, y), ss(378, 388, x));
    const v = mascaraCola(x, y) * hard(mPataCercana[p]) * hard(mCabezaFull(x, y)) * tope;
    if (v > 0) m[p] = v;
  }
  return m;
}
