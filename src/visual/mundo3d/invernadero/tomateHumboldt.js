/*
 * tomateHumboldt — la TOMATERA como LÁMINA de historia natural.
 *
 * Regla dura del arte: follaje = MASA; si se le cuentan las caras → SACAR.
 * La mata deja de ser icosaedros facetados y pasa a ser una ILUSTRACIÓN
 * NATURALISTA pintada POR CÓDIGO a un CanvasTexture (mismo camino que
 * `public/valle/lib/impostor-lod.js`): atlas de 8 variantes (más espejo, 16
 * siluetas), cada tile una tomatera entera dibujada foliolo a foliolo —
 * hoja compuesta imparipinnada con borde aserrado, tallo indeterminado
 * amarrado a su tutor de guadua, racimos que maduran de abajo (rojo) hacia
 * arriba (verde) y dos o tres flores amarillas de acento.
 *
 * En escena cada planta son 3 quads cruzados (6 triángulos) de UN solo
 * InstancedMesh: 10.000 matas = 60k tris + 1 draw call + 1 textura. El
 * arquetipo anterior costaba ~130 tris por mata y aun así se le contaban
 * las caras. La variante del atlas viaja por instancia en `aTile` (vec4
 * offset+escala UV; ancho negativo = espejo).
 *
 * Contrato con `invernadero.geom.js` intacto: este módulo solo consume los
 * items `{pos, rotY, escala, tint}` de `posicionesCultivo`. Nada de aquí
 * toca `normalizarCultivo` ni la distribución.
 */
import { rng } from '../bosque/entQuenua.geom.js';
import { VERDES, TIERRAS } from '../paleta/paletaMadre.js';
import {
  hex2rgb,
  mixRGB,
  css,
  mixHex,
  tileDeVarianteEn,
  crearAtlasLamina,
  geomLaminaCruzadaDe,
  materialLamina,
  variantesDeItemsEn,
} from './laminaMasa.js';

export { animarVaiven } from './laminaMasa.js';

/* ── el atlas: 4×2 tiles de 512×1024 (la mata es más alta que ancha) ────── */
export const ATLAS_COLS = 4;
export const ATLAS_FILAS = 2;
export const ATLAS_TILE_W = 512;
export const ATLAS_TILE_H = 1024;
export const VARIANTES = ATLAS_COLS * ATLAS_FILAS * 2; // ×2: espejo horizontal

/* proporción mundo de la lámina: la tomatera tutorada llega a ~1.9 u */
export const LAMINA_ANCHO = 1.0;
export const LAMINA_ALTO = 1.92;

/* ── paleta de la lámina: los verdes de la casa + tintas de plancha ─────── */
const TINTA = {
  hoja: VERDES.templadoVivo, // '#4e9143' cuerpo del foliolo
  hojaVieja: VERDES.monte, // '#3f6f3a' hoja baja, en sombra
  hojaNueva: VERDES.brote, // '#7a9a3f' cogollo al sol
  tallo: VERDES.trabajo, // '#5f8a3f'
  contorno: '#2e421f', // la tinta: verde-oliva casi sepia, nunca negro puro
  sepia: '#4a3b22', // sombra cálida de plancha antigua
  guadua: '#b1a45f',
  guaduaNudo: '#877a45',
  amarre: '#8d7b4e', // la fibra que amarra el tallo al tutor
  rojoMaduro: '#b6301f', // el racimo de abajo
  rojoHondo: '#7e1f14',
  pinton: '#cf6a2c', // el racimo del medio
  verdeFruto: '#8fa851', // el racimo de arriba
  hombroPalido: '#c9cf9a', // el hombro claro del tomate verde
  calix: '#5c7c39',
  flor: '#e3c44c',
  florCentro: '#a8842e',
  sustrato: TIERRAS.turba,
};

/* La retícula del atlas, en el contrato del motor `laminaMasa`. */
export const LAYOUT_TOMATE = Object.freeze({
  cols: ATLAS_COLS,
  filas: ATLAS_FILAS,
  tileW: ATLAS_TILE_W,
  tileH: ATLAS_TILE_H,
});

/* ── aTile: el rectángulo UV de una variante (puro, testeable) ──────────── */
export function tileDeVariante(v, margen = 6) {
  return tileDeVarianteEn(LAYOUT_TOMATE, v, margen);
}

/* ═══════════════════ EL PINTOR DE LA LÁMINA ═══════════════════ */

/* Un FOLIOLO: la unidad de la masa. Cuerpo ovado con borde ASERRADO
 * (festones que muerden la silueta), lavado de luz arriba-izquierda,
 * nervadura central + laterales, y contorno de tinta fina. */
function foliolo(ctx, x, y, ang, len, tonoBase, rn, viejo = 0) {
  const wF = len * (0.44 + rn() * 0.1); // ancho del foliolo
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  // el cuerpo: de la base a la punta con 4 festones por lado
  const dientes = 4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let s = -1; s <= 1; s += 2) {
    ctx.moveTo(0, 0);
    for (let d = 0; d < dientes; d++) {
      const t0 = d / dientes;
      const t1 = (d + 1) / dientes;
      const perfil = (t) => Math.sin(Math.min(t * 1.12, 1) * Math.PI) * 0.5;
      const bulge = 0.5 + rn() * 0.45; // cada diente distinto: borde vivo
      ctx.quadraticCurveTo(
        len * (t0 + (t1 - t0) * 0.5),
        s * wF * (perfil((t0 + t1) / 2) + bulge * 0.16),
        len * t1,
        s * wF * perfil(t1),
      );
    }
    ctx.lineTo(len, 0);
  }
  ctx.closePath();

  const tono = mixRGB(tonoBase, hex2rgb(TINTA.hojaVieja), viejo * 0.55);
  const g = ctx.createLinearGradient(0, -wF, len * 0.6, wF);
  g.addColorStop(0, css(mixRGB(tono, [255, 250, 220], 0.16)));
  g.addColorStop(0.55, css(tono));
  g.addColorStop(1, css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.34)));
  ctx.fillStyle = g;
  ctx.fill();

  // lavado de acuarela dentro del cuerpo (clip para no ensuciar el alfa)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = css(mixRGB(tono, [250, 246, 205], 0.5), 0.28);
  ctx.beginPath();
  ctx.ellipse(len * 0.34, -wF * 0.28, len * 0.3, wF * 0.34, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(hex2rgb(TINTA.sepia), 0.13);
  ctx.beginPath();
  ctx.ellipse(len * 0.62, wF * 0.34, len * 0.34, wF * 0.36, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // pinceladas sueltas: la mano del ilustrador rompe el degradado liso
  for (let d = 0; d < 5; d++) {
    const tD = 0.15 + rn() * 0.7;
    const sD = rn() > 0.5 ? 1 : -1;
    const claro = rn() > 0.45;
    ctx.strokeStyle = claro
      ? css(mixRGB(tono, [244, 246, 200], 0.42), 0.3)
      : css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.5), 0.26);
    ctx.lineWidth = 1.6 + rn() * 2.6;
    ctx.beginPath();
    ctx.moveTo(len * tD, sD * wF * (0.12 + rn() * 0.3));
    ctx.quadraticCurveTo(
      len * (tD + 0.12), sD * wF * (0.3 + rn() * 0.25),
      len * (tD + 0.2 + rn() * 0.1), sD * wF * rn() * 0.35,
    );
    ctx.stroke();
  }
  // nervadura central y laterales (la caligrafía de la plancha)
  ctx.strokeStyle = css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.6), 0.75);
  ctx.lineWidth = Math.max(1.1, len * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, wF * 0.03, len * 0.97, 0);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, len * 0.012);
  ctx.strokeStyle = css(mixRGB(tono, [235, 240, 200], 0.4), 0.5);
  for (let vn = 1; vn <= 3; vn++) {
    const tv = vn / 4;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(len * tv, 0);
      ctx.quadraticCurveTo(
        len * (tv + 0.1),
        s * wF * 0.26,
        len * (tv + 0.2),
        s * wF * Math.sin((1 - tv) * 1.3) * 0.42,
      );
      ctx.stroke();
    }
  }
  ctx.restore();

  // el contorno de tinta — fino, cálido, irregular
  ctx.strokeStyle = css(hex2rgb(TINTA.contorno), 0.5 + viejo * 0.15);
  ctx.lineWidth = 1.4 + rn() * 0.8;
  ctx.stroke();
  ctx.restore();
}

/* Una HOJA compuesta del tomate: raquis arqueado + 2-3 pares de foliolos +
 * el terminal, con foliolillos menores intercalados (la firma del tomate). */
function hojaCompuesta(ctx, x, y, ang, len, rn, edad = 0.5) {
  const tono =
    edad > 0.72
      ? hex2rgb(TINTA.hojaVieja)
      : edad < 0.3
        ? hex2rgb(TINTA.hojaNueva)
        : hex2rgb(TINTA.hoja);
  const caida = 0.24 + edad * 0.5; // la hoja vieja cuelga más
  const pares = 2 + (rn() > 0.4 ? 1 : 0);
  // el raquis
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.tallo), hex2rgb(TINTA.contorno), 0.35), 0.9);
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.55, len * caida * 0.35, len, len * caida * 0.62);
  ctx.stroke();
  ctx.restore();

  const punto = (t) => {
    const lx = len * t;
    const ly = len * caida * 0.62 * t * t + len * caida * 0.35 * 2 * t * (1 - t) * 0.5;
    return [x + Math.cos(ang) * lx - Math.sin(ang) * ly, y + Math.sin(ang) * lx + Math.cos(ang) * ly];
  };
  for (let p = 0; p < pares; p++) {
    const t = 0.3 + (p / pares) * 0.58;
    const [px, py] = punto(t);
    const tam = len * (0.42 - p * 0.06) * (0.9 + rn() * 0.2);
    const aBase = ang + caida * t;
    foliolo(ctx, px, py, aBase - 0.95 + rn() * 0.3, tam, tono, rn, edad);
    foliolo(ctx, px, py, aBase + 0.95 - rn() * 0.3, tam * (0.92 + rn() * 0.12), tono, rn, edad);
    if (rn() > 0.45) {
      // el foliolillo menor intercalado — sin él no es hoja de tomate
      const [qx, qy] = punto(t + 0.09);
      foliolo(ctx, qx, qy, aBase + (rn() - 0.5) * 2.2, tam * 0.34, tono, rn, edad);
    }
  }
  const [tx, ty] = punto(1);
  foliolo(ctx, tx, ty, ang + caida * 0.8, len * 0.46 * (0.9 + rn() * 0.2), tono, rn, edad);
}

/* Un TOMATE: esfera achatada con gajos leves, brillo arriba-izquierda,
 * sombra de fondo, cáliz de cinco sépalos y su contorno de tinta. */
function tomate(ctx, x, y, r, madurez, rn) {
  const base =
    madurez > 0.66
      ? mixHex(TINTA.rojoMaduro, TINTA.rojoHondo, (madurez - 0.66) * 0.9)
      : madurez > 0.33
        ? hex2rgb(TINTA.pinton)
        : hex2rgb(TINTA.verdeFruto);
  ctx.save();
  ctx.translate(x, y);
  // cuerpo achatado
  const g = ctx.createRadialGradient(-r * 0.34, -r * 0.4, r * 0.14, 0, 0, r * 1.12);
  g.addColorStop(0, css(mixRGB(base, [255, 244, 214], madurez < 0.33 ? 0.52 : 0.4)));
  g.addColorStop(0.55, css(base));
  g.addColorStop(1, css(mixRGB(base, hex2rgb(TINTA.sepia), 0.5)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  // el hombro pálido del tomate verde (chapa clara junto al cáliz)
  if (madurez <= 0.33) {
    ctx.fillStyle = css(hex2rgb(TINTA.hombroPalido), 0.5);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.5, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // gajos apenas insinuados
  ctx.strokeStyle = css(mixRGB(base, hex2rgb(TINTA.sepia), 0.6), 0.18);
  ctx.lineWidth = 1.2;
  for (const dx of [-0.42, 0, 0.42]) {
    ctx.beginPath();
    ctx.ellipse(dx * r, 0, r * 0.34, r * 0.82, 0, -1.1, 1.1);
    ctx.stroke();
  }
  // brillo
  ctx.fillStyle = css([255, 252, 240], 0.5);
  ctx.beginPath();
  ctx.ellipse(-r * 0.36, -r * 0.42, r * 0.2, r * 0.12, -0.6, 0, Math.PI * 2);
  ctx.fill();
  // contorno
  ctx.strokeStyle = css(mixRGB(base, hex2rgb(TINTA.contorno), 0.7), 0.55);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.88, 0, 0, Math.PI * 2);
  ctx.stroke();
  // cáliz: cinco sépalos en estrella + pedicelo
  ctx.strokeStyle = css(hex2rgb(TINTA.calix), 0.95);
  ctx.fillStyle = css(hex2rgb(TINTA.calix), 0.95);
  ctx.lineWidth = 1.6;
  for (let s = 0; s < 5; s++) {
    const a = -Math.PI / 2 + (s - 2) * 0.55 + (rn() - 0.5) * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.72);
    ctx.lineTo(Math.cos(a) * r * 0.62, -r * 0.72 + Math.sin(a) * r * 0.4 + r * 0.28);
    ctx.stroke();
  }
  ctx.restore();
}

/* Un RACIMO: pedúnculo en zigzag con 4-6 frutos colgados, los de atrás
 * más oscuros (profundidad de plancha). */
function racimo(ctx, x, y, madurez, escala, rn) {
  const n = 5 + ((rn() * 4) | 0);
  // el pedúnculo cuelga con el peso del racimo
  const cx = x + (rn() - 0.5) * 10 * escala;
  const cy = y + (34 + rn() * 12) * escala;
  ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.tallo), hex2rgb(TINTA.contorno), 0.4), 0.9);
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + 16 * escala, y + 14 * escala, cx, cy - 10 * escala);
  ctx.stroke();
  // la BOLA del racimo: frutos que se tocan y se tapan (atrás primero)
  const frutos = [];
  for (let f = 0; f < n; f++) {
    const a = rn() * Math.PI * 2;
    const rr = Math.sqrt(rn()) * 26 * escala;
    frutos.push({
      x: cx + Math.cos(a) * rr * 1.15,
      y: cy + Math.sin(a) * rr * 0.85 + f * 2,
      r: (15 + rn() * 7) * escala,
      atras: f < n * 0.4,
    });
  }
  for (const fr of frutos.filter((q) => q.atras)) {
    ctx.globalAlpha = 0.85;
    tomate(ctx, fr.x, fr.y - 4, fr.r * 0.82, Math.min(1, Math.max(0, madurez + (rn() - 0.5) * 0.2)), rn);
    ctx.globalAlpha = 1;
  }
  for (const fr of frutos.filter((q) => !q.atras)) {
    tomate(ctx, fr.x, fr.y, fr.r, Math.min(1, Math.max(0, madurez + (rn() - 0.5) * 0.16)), rn);
  }
}

/* La FLOR del tomate: estrella amarilla de cinco pétalos recurvados. */
function flor(ctx, x, y, r, rn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rn() * Math.PI);
  ctx.fillStyle = css(hex2rgb(TINTA.flor), 0.95);
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, r * 0.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = css(hex2rgb(TINTA.florCentro), 1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* UNA TOMATERA entera en su tile: tutor, tallo amarrado, la masa de hojas
 * (vieja abajo, nueva arriba), racimos que maduran de abajo hacia arriba. */
function pintarTomatera(ctx, ox, oy, seed) {
  const rn = rng(seed);
  const W = ATLAS_TILE_W;
  const H = ATLAS_TILE_H;
  const cx = ox + W * 0.5 + (rn() - 0.5) * W * 0.06;
  const pie = oy + H * 0.965; // el cuello de la raíz, casi al borde
  const copa = oy + H * (0.045 + rn() * 0.03);
  const lean = (rn() - 0.5) * W * 0.1; // el tutor nunca es perfectamente recto

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox + 2, oy + 2, W - 4, H - 4);
  ctx.clip();

  // ── EL TUTOR de guadua, con sus nudos ──
  const tutorX = (t) => cx + lean * t + Math.sin(t * 3.1 + seed) * 3;
  ctx.lineWidth = 7;
  ctx.strokeStyle = css(mixHex(TINTA.guadua, '#ffffff', 0.06));
  ctx.beginPath();
  ctx.moveTo(tutorX(0), pie);
  ctx.lineTo(tutorX(1), copa + 14);
  ctx.stroke();
  ctx.strokeStyle = css(hex2rgb(TINTA.guaduaNudo), 0.9);
  ctx.lineWidth = 2;
  for (let t = 0.1; t < 1; t += 0.16) {
    const yx = pie + (copa - pie) * t;
    ctx.beginPath();
    ctx.moveTo(tutorX(t) - 5, yx);
    ctx.lineTo(tutorX(t) + 5, yx);
    ctx.stroke();
  }

  // ── EL TALLO: serpentea junto al tutor, más grueso abajo ──
  const talloX = (t) => tutorX(t) + Math.sin(t * 5.2 + seed * 1.7) * (14 - t * 7) + (t < 0.06 ? 0 : (seed % 2 ? 9 : -9));
  const talloY = (t) => pie + (copa - pie) * t;
  for (let t = 0; t < 1; t += 0.05) {
    ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.tallo), hex2rgb(TINTA.contorno), 0.25 + t * 0.1), 0.96);
    ctx.lineWidth = 7.5 - t * 4.5;
    ctx.beginPath();
    ctx.moveTo(talloX(t), talloY(t));
    ctx.lineTo(talloX(t + 0.055), talloY(t + 0.055));
    ctx.stroke();
  }
  // los amarres al tutor (fibra en cruz)
  for (const t of [0.22, 0.5, 0.78]) {
    ctx.strokeStyle = css(hex2rgb(TINTA.amarre), 0.95);
    ctx.lineWidth = 3;
    const ax = (tutorX(t) + talloX(t)) / 2;
    ctx.beginPath();
    ctx.moveTo(ax - 9, talloY(t) - 4);
    ctx.lineTo(ax + 9, talloY(t) + 4);
    ctx.moveTo(ax - 9, talloY(t) + 4);
    ctx.lineTo(ax + 9, talloY(t) - 4);
    ctx.stroke();
  }

  // ── LA MASA DE FONDO: el corazón oscuro de la mata — capa honda y densa ──
  // el ancho de la masa a cada altura (angosta al pie, panzona al medio)
  const anchoMasa = (t) => W * (0.16 + Math.sin(Math.min(1, t * 1.18) * Math.PI) * 0.24);
  for (let i = 0; i < 150; i++) {
    const t = 0.1 + rn() * 0.82;
    const px = talloX(t) + (rn() + rn() - 1) * anchoMasa(t);
    const py = talloY(t) + (rn() - 0.5) * H * 0.05;
    foliolo(
      ctx, px, py, rn() * Math.PI * 2, 30 + rn() * 42,
      mixRGB(hex2rgb(TINTA.hojaVieja), hex2rgb(TINTA.contorno), 0.22 + rn() * 0.2), rn, 0.9,
    );
  }
  // capa media: foliolos en tono de trabajo que cierran los huecos
  for (let i = 0; i < 90; i++) {
    const t = 0.12 + rn() * 0.8;
    const px = talloX(t) + (rn() + rn() - 1) * anchoMasa(t) * 0.9;
    const py = talloY(t) + (rn() - 0.5) * H * 0.045;
    foliolo(ctx, px, py, rn() * Math.PI * 2, 28 + rn() * 34, hex2rgb(TINTA.hoja), rn, 0.55);
  }

  // ── LAS HOJAS GRANDES: alternas, viejas y colgantes abajo, tiernas arriba ──
  const hojas = 19 + ((rn() * 4) | 0);
  for (let h = 0; h < hojas; h++) {
    const t = 0.09 + (h / hojas) * 0.85 + (rn() - 0.5) * 0.04;
    const lado = h % 2 === 0 ? -1 : 1;
    const edad = 1 - t; // abajo vieja, arriba nueva
    const len = (W * 0.34) * (0.72 + Math.sin(Math.min(1, t * 1.35) * Math.PI) * 0.52) * (0.82 + rn() * 0.36);
    const ang =
      lado === -1
        ? Math.PI - 0.28 + edad * 0.72 + (rn() - 0.5) * 0.5
        : 0.28 - edad * 0.72 + (rn() - 0.5) * 0.5;
    hojaCompuesta(ctx, talloX(t), talloY(t), ang, len, rn, edad);
    // cada tantas, una segunda hoja del mismo nudo hacia el frente (caos real)
    if (rn() > 0.6) {
      hojaCompuesta(
        ctx, talloX(t), talloY(t),
        ang + (rn() - 0.5) * 1.4, len * (0.55 + rn() * 0.3), rn, Math.max(0, edad - 0.2),
      );
    }
  }

  // ── LOS RACIMOS: del rojo hondo abajo al verde arriba ──
  const racimos = 5 + (rn() > 0.5 ? 1 : 0);
  for (let rr = 0; rr < racimos; rr++) {
    const t = 0.16 + (rr / racimos) * 0.62 + rn() * 0.04;
    const lado = rr % 2 === 0 ? 1 : -1;
    const madurez = 1 - (rr / (racimos - 1)) * 0.95; // abajo maduro
    racimo(ctx, talloX(t) + lado * (18 + rn() * 22), talloY(t) + 6, madurez, 0.86 + rn() * 0.3, rn);
  }

  // ── EL COGOLLO y las flores del ápice ──
  for (let c = 0; c < 5; c++) {
    foliolo(
      ctx, talloX(0.97) + (rn() - 0.5) * 26, talloY(0.97) + (rn() - 0.5) * 18,
      -Math.PI / 2 + (rn() - 0.5) * 1.7, 20 + rn() * 16, hex2rgb(TINTA.hojaNueva), rn, 0,
    );
  }
  for (let f = 0; f < 3; f++) {
    flor(ctx, talloX(0.9) + (rn() - 0.5) * 52, talloY(0.88 + rn() * 0.06), 8 + rn() * 3, rn);
  }

  // ── EL PIE: cuello de raíz y un par de hojas basales curtidas ──
  ctx.fillStyle = css(mixHex(TINTA.sustrato, '#000000', 0.2), 0.9);
  ctx.beginPath();
  ctx.ellipse(cx, pie, W * 0.06, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  hojaCompuesta(ctx, talloX(0.04), talloY(0.04), Math.PI - 0.12, W * 0.2, rn, 1);
  hojaCompuesta(ctx, talloX(0.05), talloY(0.05), 0.12, W * 0.19, rn, 1);

  ctx.restore();
}

/* ── el atlas completo: 8 tomateras hermanas, ninguna igual a otra ──────── */
export function atlasTomateHumboldt(seed = 20260818) {
  return crearAtlasLamina(LAYOUT_TOMATE, pintarTomatera, seed);
}

/* ── la geometría: 3 quads cruzados (0°/60°/120°), base en y=0 ──────────── */
export function geomLaminaCruzada(planos = 3) {
  return geomLaminaCruzadaDe(LAMINA_ANCHO, LAMINA_ALTO, planos);
}

/* ── el material de la lámina (motor genérico, alto del tomate) ─────────── */
export function materialLaminaTomate(atlas) {
  return materialLamina(atlas, LAMINA_ALTO);
}

/* ── variante determinista por índice de instancia (puro, testeable) ────── */
export function variantesDeItems(n, semilla = 4021) {
  return variantesDeItemsEn(LAYOUT_TOMATE, n, semilla);
}

/* ── la LÁMINA completa, en el contrato del motor (para FloraInvernadero) ── */
export const LAMINA_TOMATE = Object.freeze({
  id: 'tomate',
  layout: LAYOUT_TOMATE,
  ancho: LAMINA_ANCHO,
  alto: LAMINA_ALTO,
  planos: 3,
  desfase: 0,
  pintarTile: pintarTomatera,
  semillaAtlas: 20260818,
  semillaVariantes: 4021,
});
