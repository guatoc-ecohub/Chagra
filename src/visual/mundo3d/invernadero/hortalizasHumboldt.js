/*
 * hortalizasHumboldt — el PIMENTÓN y la LECHUGA como láminas de historia
 * natural, hermanas de la tomatera de `tomateHumboldt.js`.
 *
 * Regla dura del arte: follaje = MASA; si se le cuentan las caras → SACAR.
 * Cada especie se pinta POR CÓDIGO a su atlas (8 matas hermanas + espejo =
 * 16 siluetas) con la misma caligrafía de plancha: lavado de luz
 * arriba-izquierda, pinceladas sueltas, nervadura caligráfica y contorno de
 * tinta verde-oliva — nunca negro puro.
 *
 * El PIMENTÓN es mata erecta de ramas en horqueta (dicotómica), hoja ENTERA
 * ovado-lanceolada y lustrosa —nada de borde aserrado: eso es del tomate—,
 * frutos cuadrados de tres lomos colgando bajo el follaje (verde arriba,
 * rojo abajo: el ciclo a la vista) y florecitas blancas colgantes.
 *
 * La LECHUGA es ROSETA: batavia crespa de hojas anchas con el borde RIZADO
 * (festón fino que muerde la silueta), exteriores hondas y abiertas,
 * corazón apretado verde-amarillo. Más ancha que alta — su lámina tiene su
 * propia proporción y el motor la respeta.
 *
 * Contrato: cada lámina exporta su config para el motor `laminaMasa`
 * ({layout, ancho, alto, planos, pintarTile, semillas}) y FloraInvernadero
 * las siembra sobre los items {pos, rotY, escala, tint} de
 * `posicionesCultivo` — nada de aquí toca la distribución.
 */
import { rng } from '../bosque/entQuenua.geom.js';
import { VERDES, TIERRAS } from '../paleta/paletaMadre.js';
import { hex2rgb, mixRGB, css, mixHex } from './laminaMasa.js';

/* ── los atlas: pimentón 4×2 de 512×640 (mata erecta), lechuga 4×2 de
 *    512×384 (roseta apaisada) ─────────────────────────────────────────── */
export const LAYOUT_PIMENTON = Object.freeze({ cols: 4, filas: 2, tileW: 512, tileH: 640 });
export const LAYOUT_LECHUGA = Object.freeze({ cols: 4, filas: 2, tileW: 512, tileH: 384 });

/* proporción mundo: misma relación de aspecto que el tile (sin estirones) */
export const PIMENTON_ANCHO = 0.74;
export const PIMENTON_ALTO = 0.92;
export const LECHUGA_ANCHO = 0.56;
export const LECHUGA_ALTO = 0.42;

/* ── paleta compartida de plancha + acentos de cada especie ─────────────── */
const TINTA = {
  hoja: VERDES.templadoVivo,
  hojaVieja: VERDES.monte,
  hojaNueva: VERDES.brote,
  tallo: VERDES.trabajo,
  contorno: '#2e421f', // la tinta: verde-oliva casi sepia, nunca negro puro
  sepia: '#4a3b22', // sombra cálida de plancha antigua
  sustrato: TIERRAS.turba,
  // el pimentón
  pimRojo: '#c9503a',
  pimRojoHondo: '#8a2c1c',
  pimNaranja: '#d98a35',
  pimVerde: '#6f9a44',
  pimHombro: '#cdd49c', // el reflejo pálido del fruto verde
  pimFlor: '#efe8d2',
  pimFlorCentro: '#c9b45a',
  // la lechuga
  lecHonda: '#3d7038', // la hoja exterior, honda y curtida
  lecFresca: '#5f9c46', // el cuerpo de la roseta
  lecTierna: '#8db554', // la hoja que sube al corazón
  lecCorazon: '#c6cf7e', // el cogollo apretado, casi amarillo
  lecNervio: '#dde4b5', // el nervio blanco-verdoso de la penca
};

/* ═══════════════════ EL PIMENTÓN ═══════════════════ */

/* Una HOJA ENTERA ovado-lanceolada: borde LISO (la firma del pimentón),
 * punta acuminada, lustre de hoja de solanácea brillante. */
function hojaEntera(ctx, x, y, ang, len, tonoBase, rn, vieja = 0) {
  const wH = len * (0.4 + rn() * 0.08);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  // el cuerpo: dos curvas limpias de la base a la punta (sin dientes)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.38, -wH, len * 0.78, -wH * 0.34);
  ctx.quadraticCurveTo(len * 0.94, -wH * 0.1, len, 0); // la punta acuminada
  ctx.quadraticCurveTo(len * 0.94, wH * 0.1, len * 0.78, wH * 0.34);
  ctx.quadraticCurveTo(len * 0.38, wH, 0, 0);
  ctx.closePath();

  const tono = mixRGB(tonoBase, hex2rgb(TINTA.hojaVieja), vieja * 0.5);
  const g = ctx.createLinearGradient(0, -wH, len * 0.6, wH);
  g.addColorStop(0, css(mixRGB(tono, [255, 250, 220], 0.14)));
  g.addColorStop(0.55, css(tono));
  g.addColorStop(1, css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.36)));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // lavado claro arriba-izquierda + sombra sepia abajo-derecha
  ctx.fillStyle = css(mixRGB(tono, [250, 246, 205], 0.5), 0.26);
  ctx.beginPath();
  ctx.ellipse(len * 0.32, -wH * 0.3, len * 0.28, wH * 0.32, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(hex2rgb(TINTA.sepia), 0.12);
  ctx.beginPath();
  ctx.ellipse(len * 0.64, wH * 0.32, len * 0.32, wH * 0.34, 0.25, 0, Math.PI * 2);
  ctx.fill();
  // el LUSTRE: la banda de brillo que delata la hoja lisa del ají
  ctx.fillStyle = css([250, 252, 235], 0.16);
  ctx.beginPath();
  ctx.ellipse(len * 0.42, -wH * 0.16, len * 0.3, wH * 0.12, -0.18, 0, Math.PI * 2);
  ctx.fill();
  // nervadura: central + 4 laterales arqueadas hacia la punta
  ctx.strokeStyle = css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.6), 0.7);
  ctx.lineWidth = Math.max(1.1, len * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, wH * 0.02, len * 0.97, 0);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, len * 0.012);
  ctx.strokeStyle = css(mixRGB(tono, [235, 240, 200], 0.4), 0.5);
  for (let vn = 1; vn <= 4; vn++) {
    const tv = vn / 5;
    for (let s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.moveTo(len * tv, 0);
      ctx.quadraticCurveTo(
        len * (tv + 0.14), s * wH * 0.3 * (1 - tv * 0.5),
        len * (tv + 0.3), s * wH * 0.44 * (1 - tv),
      );
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.strokeStyle = css(hex2rgb(TINTA.contorno), 0.5 + vieja * 0.15);
  ctx.lineWidth = 1.3 + rn() * 0.7;
  ctx.stroke();
  ctx.restore();
}

/* Un PIMENTÓN: fruto cuadrado de tres lomos colgando de su cáliz, con el
 * brillo vertical de cera que lo hace inconfundible. */
function pimenton(ctx, x, y, alto, madurez, rn) {
  const base =
    madurez > 0.66
      ? mixHex(TINTA.pimRojo, TINTA.pimRojoHondo, (madurez - 0.66) * 1.2)
      : madurez > 0.33
        ? hex2rgb(TINTA.pimNaranja)
        : hex2rgb(TINTA.pimVerde);
  const w = alto * (0.88 + rn() * 0.12);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rn() - 0.5) * 0.2);

  // el pedúnculo corto y el cáliz que abraza los hombros
  ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.tallo), hex2rgb(TINTA.contorno), 0.4), 0.9);
  ctx.lineWidth = alto * 0.08;
  ctx.beginPath();
  ctx.moveTo(0, -alto * 0.62);
  ctx.quadraticCurveTo(alto * 0.06, -alto * 0.5, 0, -alto * 0.42);
  ctx.stroke();

  // el cuerpo: bloque CUADRADO de hombros anchos con TRES LOMOS que rematan
  // abajo en sus puntas romas — el fruto es casi tan ancho como alto
  const lomo = w / 3;
  ctx.beginPath();
  ctx.moveTo(-w / 2, -alto * 0.3);
  ctx.quadraticCurveTo(-w * 0.6, -alto * 0.44, -w * 0.22, -alto * 0.44); // hombro izq
  ctx.quadraticCurveTo(0, -alto * 0.5, w * 0.22, -alto * 0.44);
  ctx.quadraticCurveTo(w * 0.6, -alto * 0.44, w / 2, -alto * 0.3); // hombro der
  ctx.quadraticCurveTo(w * 0.58, 0, w * 0.46, alto * 0.22); // panza derecha
  // los tres lóbulos de abajo, cortos y romos (perfil de bloque, no de ají)
  for (let l = 0; l < 3; l++) {
    const x0 = w / 2 - l * lomo;
    ctx.quadraticCurveTo(x0 - lomo * 0.16, alto * 0.4, x0 - lomo * 0.5, alto * 0.37);
    if (l < 2) ctx.quadraticCurveTo(x0 - lomo * 0.84, alto * 0.4, x0 - lomo, alto * 0.28);
  }
  ctx.quadraticCurveTo(-w * 0.58, 0, -w / 2, -alto * 0.3); // panza izquierda
  ctx.closePath();

  const g = ctx.createLinearGradient(-w / 2, -alto * 0.4, w / 2, alto * 0.4);
  g.addColorStop(0, css(mixRGB(base, [255, 244, 214], 0.34)));
  g.addColorStop(0.5, css(base));
  g.addColorStop(1, css(mixRGB(base, hex2rgb(TINTA.sepia), 0.45)));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // las dos costillas que separan los lomos
  ctx.strokeStyle = css(mixRGB(base, hex2rgb(TINTA.sepia), 0.55), 0.5);
  ctx.lineWidth = Math.max(1.2, alto * 0.03);
  for (const dx of [-lomo / 2, lomo / 2]) {
    ctx.beginPath();
    ctx.moveTo(dx * 0.8, -alto * 0.4);
    ctx.quadraticCurveTo(dx * 1.25, 0, dx * 0.9, alto * 0.34);
    ctx.stroke();
  }
  // el hombro pálido del fruto verde
  if (madurez <= 0.33) {
    ctx.fillStyle = css(hex2rgb(TINTA.pimHombro), 0.4);
    ctx.beginPath();
    ctx.ellipse(0, -alto * 0.36, w * 0.34, alto * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // el BRILLO de cera: banda vertical clara sobre el lomo izquierdo
  ctx.fillStyle = css([255, 252, 240], 0.42);
  ctx.beginPath();
  ctx.ellipse(-w * 0.26, -alto * 0.08, w * 0.08, alto * 0.3, 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // contorno de tinta + los sépalos del cáliz encima del hombro
  ctx.strokeStyle = css(mixRGB(base, hex2rgb(TINTA.contorno), 0.7), 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = css(mixHex(TINTA.tallo, TINTA.contorno, 0.3), 0.95);
  for (const s of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * w * 0.16, -alto * 0.44, w * 0.13, alto * 0.06, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* La FLOR del pimentón: estrellita blanca colgante de cinco pétalos. */
function florPimenton(ctx, x, y, r, rn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rn() * Math.PI);
  ctx.fillStyle = css(hex2rgb(TINTA.pimFlor), 0.95);
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.46, r * 0.2, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = css(hex2rgb(TINTA.pimFlorCentro), 1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* UNA MATA de pimentón entera en su tile: tallo corto que abre en horqueta,
 * la copa de hoja entera y lustrosa, los frutos colgando bajo el follaje —
 * verde arriba, pintón al medio, rojo abajo — y sus florecitas blancas. */
export function pintarPimenton(ctx, ox, oy, seed) {
  const rn = rng(seed);
  const W = LAYOUT_PIMENTON.tileW;
  const H = LAYOUT_PIMENTON.tileH;
  const cx = ox + W * 0.5 + (rn() - 0.5) * W * 0.05;
  const pie = oy + H * 0.96;
  const copa = oy + H * (0.08 + rn() * 0.04);
  const lean = (rn() - 0.5) * W * 0.08;

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox + 2, oy + 2, W - 4, H - 4);
  ctx.clip();

  // ── EL TALLO principal, corto y ya leñoso al pie, y LA HORQUETA ──
  // (baja: el pimentón es mata TUPIDA casi desde el suelo, no paleta)
  const horqY = pie + (copa - pie) * 0.22; // donde el pimentón se bifurca
  const talloX = (t) => cx + lean * t + Math.sin(t * 4.1 + seed) * 3;
  for (let t = 0; t < 0.22; t += 0.05) {
    ctx.strokeStyle = css(
      mixRGB(hex2rgb(TINTA.tallo), hex2rgb(TINTA.sepia), 0.5 - t * 1.6), 0.96,
    );
    ctx.lineWidth = 7 - t * 10;
    ctx.beginPath();
    ctx.moveTo(talloX(t), pie + (copa - pie) * t);
    ctx.lineTo(talloX(t + 0.06), pie + (copa - pie) * (t + 0.06));
    ctx.stroke();
  }
  // dos hojas del tallo bajo, para que el pie no quede pelado
  hojaEntera(
    ctx, talloX(0.13), pie + (copa - pie) * 0.13, Math.PI - 0.55 + rn() * 0.2,
    W * 0.15, hex2rgb(TINTA.hoja), rn, 0.5,
  );
  hojaEntera(
    ctx, talloX(0.17), pie + (copa - pie) * 0.17, 0.55 - rn() * 0.2,
    W * 0.14, hex2rgb(TINTA.hoja), rn, 0.5,
  );
  // las ramas de la horqueta (2-3), cada una quebrada en dos tramos
  const ramas = 2 + (rn() > 0.55 ? 1 : 0);
  const puntasRama = [];
  for (let rIdx = 0; rIdx < ramas; rIdx++) {
    const dir = ramas === 2 ? (rIdx === 0 ? -1 : 1) : rIdx - 1;
    const abre = dir * (W * 0.09 + rn() * W * 0.05);
    const codoX = talloX(0.34) + abre;
    const codoY = horqY + (copa - horqY) * 0.44;
    const puntaX = codoX + abre * (0.5 + rn() * 0.4);
    const puntaY = copa + rn() * H * 0.05;
    ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.tallo), hex2rgb(TINTA.contorno), 0.3), 0.95);
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(talloX(0.34), horqY);
    ctx.quadraticCurveTo(codoX, (horqY + codoY) / 2, codoX, codoY);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(codoX, codoY);
    ctx.quadraticCurveTo(puntaX, (codoY + puntaY) / 2, puntaX, puntaY);
    ctx.stroke();
    puntasRama.push([codoX, codoY, puntaX, puntaY]);
  }

  // el punto de la copa a lo largo de las ramas (para colgar hojas y frutos)
  const enCopa = (t) => {
    const [codoX, codoY, puntaX, puntaY] = puntasRama[(rn() * ramas) | 0];
    if (t < 0.5) return [codoX + (rn() - 0.5) * 20, horqY + (codoY - horqY) * t * 2];
    return [codoX + (puntaX - codoX) * (t - 0.5) * 2, codoY + (puntaY - codoY) * (t - 0.5) * 2];
  };

  // ── LA MASA DE FONDO: el corazón oscuro de la copa ──
  for (let i = 0; i < 60; i++) {
    const t = rn();
    const [px, py] = enCopa(t);
    hojaEntera(
      ctx, px + (rn() - 0.5) * W * 0.22, py + (rn() - 0.5) * H * 0.06,
      rn() * Math.PI * 2, 26 + rn() * 30,
      mixRGB(hex2rgb(TINTA.hojaVieja), hex2rgb(TINTA.contorno), 0.2 + rn() * 0.2), rn, 0.85,
    );
  }
  for (let i = 0; i < 40; i++) {
    const t = rn();
    const [px, py] = enCopa(t);
    hojaEntera(
      ctx, px + (rn() - 0.5) * W * 0.18, py + (rn() - 0.5) * H * 0.05,
      rn() * Math.PI * 2, 24 + rn() * 26, hex2rgb(TINTA.hoja), rn, 0.5,
    );
  }

  // ── LOS FRUTOS: DENTRO de la copa, repartidos, madurez por altura ──
  // (nunca en racimo colgante bajo la mata: eso es de tomate, no de pimentón)
  const frutos = 3 + ((rn() * 3) | 0);
  const anclas = [];
  for (let f = 0; f < frutos; f++) {
    const t = 0.1 + (f / frutos) * 0.62 + rn() * 0.06;
    const [px, py] = enCopa(t);
    // el de abajo maduro, el de arriba verde (como carga la mata de verdad)
    const madurez = 1 - t * 1.15 + (rn() - 0.5) * 0.14;
    const lado = f % 2 === 0 ? -1 : 1;
    anclas.push([
      px + lado * W * (0.06 + rn() * 0.1),
      py + H * (0.03 + rn() * 0.04),
      madurez,
    ]);
  }
  for (const [fx, fy, madurez] of anclas) {
    pimenton(ctx, fx, fy, H * (0.11 + rn() * 0.03), Math.min(1, Math.max(0, madurez)), rn);
  }

  // ── LAS HOJAS GRANDES del frente: colgantes, lustrosas ──
  // (arriba más chicas: el cogollo no le tapa la copa a la mata)
  const hojas = 13 + ((rn() * 5) | 0);
  for (let h = 0; h < hojas; h++) {
    const t = rn();
    const [px, py] = enCopa(t);
    const lado = h % 2 === 0 ? -1 : 1;
    const cae = 0.5 + rn() * 0.6; // la hoja del pimentón cuelga
    hojaEntera(
      ctx, px, py,
      lado === -1 ? Math.PI - 0.3 + cae * 0.7 : 0.3 - cae * 0.7,
      (W * 0.2) * (0.75 + rn() * 0.45) * (1.05 - t * 0.3),
      t > 0.7 ? hex2rgb(TINTA.hojaNueva) : hex2rgb(TINTA.hoja), rn, (1 - t) * 0.6,
    );
  }

  // ── LAS FLORES blancas colgantes en las puntas ──
  for (let f = 0; f < 2 + ((rn() * 2) | 0); f++) {
    const [px, py] = enCopa(0.72 + rn() * 0.24);
    florPimenton(ctx, px + (rn() - 0.5) * 30, py + rn() * 14, 6.5 + rn() * 2.5, rn);
  }

  // ── EL PIE: cuello sombreado + un par de hojas basales curtidas ──
  ctx.fillStyle = css(mixHex(TINTA.sustrato, '#000000', 0.2), 0.9);
  ctx.beginPath();
  ctx.ellipse(cx, pie, W * 0.055, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  hojaEntera(ctx, talloX(0.06), pie + (copa - pie) * 0.06, Math.PI - 0.15, W * 0.14, hex2rgb(TINTA.hojaVieja), rn, 1);
  hojaEntera(ctx, talloX(0.08), pie + (copa - pie) * 0.08, 0.15, W * 0.13, hex2rgb(TINTA.hojaVieja), rn, 1);

  ctx.restore();
}

/* ═══════════════════ LA LECHUGA ═══════════════════ */

/* Una HOJA de lechuga batavia: penca que abre en abanico con el borde
 * RIZADO — festones chicos e irregulares que muerden la silueta. Antes del
 * cuerpo pinta su propia SOMBRA corrida: es lo que separa cada hoja de su
 * vecina cuando la roseta se apila (sin eso las capas se funden en anillos). */
function hojaLechuga(ctx, x, y, ang, len, apertura, tonoBase, rn, honda = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  const w0 = len * apertura;
  // silueta: sube por un flanco, recorre el borde rizado, baja por el otro
  const festones = 7 + ((rn() * 3) | 0);
  const silueta = () => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(len * 0.3, -w0 * 0.55, len * 0.82, -w0 * 0.5);
    for (let fj = 0; fj <= festones; fj++) {
      const tt = fj / festones;
      const a = -w0 * 0.5 + w0 * tt;
      const radio = len * (0.95 + Math.sin(tt * Math.PI) * 0.16 + (rn() - 0.5) * 0.1);
      const bulge = len * (0.06 + rn() * 0.07); // cada festón distinto: rizo vivo
      ctx.quadraticCurveTo(
        radio + bulge, a - (w0 / festones) * 0.5,
        Math.min(radio, len * 1.06), a,
      );
    }
    ctx.quadraticCurveTo(len * 0.3, w0 * 0.55, 0, 0);
    ctx.closePath();
  };

  // la sombra propia, corrida hacia la base (separa la hoja de la de atrás)
  ctx.save();
  ctx.translate(-len * 0.04, len * 0.035);
  silueta();
  ctx.fillStyle = css(hex2rgb(TINTA.contorno), 0.22);
  ctx.fill();
  ctx.restore();

  silueta();
  const tono = mixRGB(tonoBase, hex2rgb(TINTA.contorno), honda * 0.22);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, css(mixRGB(hex2rgb(TINTA.lecNervio), tono, 0.55))); // la penca
  g.addColorStop(0.4, css(tono));
  g.addColorStop(1, css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.22 + honda * 0.18)));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  // el lavado fresco de la hoja tierna + la sombra que la asienta en la mata
  ctx.fillStyle = css(mixRGB(tono, [250, 250, 210], 0.5), 0.3);
  ctx.beginPath();
  ctx.ellipse(len * 0.52, -w0 * 0.18, len * 0.32, w0 * 0.32, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(hex2rgb(TINTA.sepia), 0.1);
  ctx.beginPath();
  ctx.ellipse(len * 0.2, w0 * 0.28, len * 0.26, w0 * 0.28, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // las VENAS: cortas, arqueadas, de caligrafía — nunca radios de rueda
  ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.lecNervio), tono, 0.45), 0.4);
  ctx.lineWidth = Math.max(1.1, len * 0.018);
  ctx.beginPath();
  ctx.moveTo(len * 0.12, 0);
  ctx.quadraticCurveTo(len * 0.5, (rn() - 0.5) * w0 * 0.12, len * 0.8, (rn() - 0.5) * w0 * 0.24);
  ctx.stroke();
  ctx.lineWidth = Math.max(0.8, len * 0.011);
  ctx.strokeStyle = css(mixRGB(hex2rgb(TINTA.lecNervio), tono, 0.5), 0.32);
  for (let vn = 0; vn < 3; vn++) {
    const s = vn % 2 === 0 ? -1 : 1;
    const abre = 0.3 + rn() * 0.3;
    ctx.beginPath();
    ctx.moveTo(len * (0.14 + rn() * 0.08), 0);
    ctx.quadraticCurveTo(
      len * 0.46, s * w0 * abre * 0.5,
      len * (0.62 + rn() * 0.16), s * w0 * abre,
    );
    ctx.stroke();
  }
  // arrugas del rizo: trazos cortos cerca del borde
  ctx.strokeStyle = css(mixRGB(tono, hex2rgb(TINTA.contorno), 0.4), 0.28);
  ctx.lineWidth = 1.2;
  for (let d = 0; d < 6; d++) {
    const a = (rn() - 0.5) * w0 * 0.8;
    ctx.beginPath();
    ctx.moveTo(len * (0.78 + rn() * 0.1), a);
    ctx.quadraticCurveTo(len * 0.9, a + (rn() - 0.5) * 8, len * (0.95 + rn() * 0.06), a + (rn() - 0.5) * 12);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = css(hex2rgb(TINTA.contorno), 0.4 + honda * 0.18);
  ctx.lineWidth = 1.2 + rn() * 0.6;
  ctx.stroke();
  ctx.restore();
}

/* UNA LECHUGA entera en su tile apaisado: roseta batavia — las hondas
 * abiertas atrás, las frescas al medio, el corazón apretado y claro. */
export function pintarLechuga(ctx, ox, oy, seed) {
  const rn = rng(seed);
  const W = LAYOUT_LECHUGA.tileW;
  const H = LAYOUT_LECHUGA.tileH;
  const cx = ox + W * 0.5 + (rn() - 0.5) * W * 0.04;
  const base = oy + H * 0.9;
  const R = H * (0.62 + rn() * 0.08); // el radio de la roseta

  ctx.save();
  ctx.beginPath();
  ctx.rect(ox + 2, oy + 2, W - 4, H - 4);
  ctx.clip();

  // ── EL CUELLO: la sombra que asienta la roseta en el sustrato ──
  ctx.fillStyle = css(mixHex(TINTA.sustrato, '#000000', 0.15), 0.85);
  ctx.beginPath();
  ctx.ellipse(cx, base, W * 0.16, H * 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── CAPA 1: las hojas HONDAS de atrás, pocas — el fondo, no el cuerpo ──
  const hondas = 5 + ((rn() * 2) | 0);
  for (let h = 0; h < hondas; h++) {
    const a = -Math.PI * 0.86 + (h / (hondas - 1)) * Math.PI * 0.72 + (rn() - 0.5) * 0.14;
    hojaLechuga(
      ctx, cx + (rn() - 0.5) * W * 0.03, base - H * 0.03, a,
      R * (0.86 + rn() * 0.22), 0.5 + rn() * 0.14, hex2rgb(TINTA.lecHonda), rn, 0.6,
    );
  }
  // las dos exteriores que ya se ABREN hacia el suelo (la roseta respirando)
  hojaLechuga(ctx, cx - W * 0.03, base - H * 0.01, -Math.PI + 0.34 + rn() * 0.12, R * 0.7, 0.5, hex2rgb(TINTA.lecFresca), rn, 0.45);
  hojaLechuga(ctx, cx + W * 0.03, base - H * 0.01, -0.34 - rn() * 0.12, R * 0.7, 0.5, hex2rgb(TINTA.lecFresca), rn, 0.45);

  // ── CAPA 2: el cuerpo FRESCO de la roseta (el tono que manda) ──
  const frescas = 6 + ((rn() * 2) | 0);
  for (let h = 0; h < frescas; h++) {
    const a = -Math.PI * 0.8 + (h / (frescas - 1)) * Math.PI * 0.6 + (rn() - 0.5) * 0.16;
    hojaLechuga(
      ctx, cx + (rn() - 0.5) * W * 0.05, base - H * (0.04 + rn() * 0.02), a,
      R * (0.6 + rn() * 0.2), 0.56 + rn() * 0.14, hex2rgb(TINTA.lecFresca), rn, 0.15,
    );
  }

  // ── CAPA 3: las tiernas que suben al corazón ──
  const tiernas = 4 + ((rn() * 2) | 0);
  for (let h = 0; h < tiernas; h++) {
    const a = -Math.PI * 0.68 + (h / (tiernas - 1)) * Math.PI * 0.36 + (rn() - 0.5) * 0.12;
    hojaLechuga(
      ctx, cx + (rn() - 0.5) * W * 0.03, base - H * (0.06 + rn() * 0.02), a,
      R * (0.38 + rn() * 0.12), 0.62 + rn() * 0.14, hex2rgb(TINTA.lecTierna), rn, 0,
    );
  }

  // ── EL CORAZÓN: el cogollo apretado, casi amarillo, con su rizo chico ──
  const nucleo = R * (0.17 + rn() * 0.04);
  for (let c = 0; c < 5; c++) {
    const a = -Math.PI / 2 + (rn() - 0.5) * 1.1;
    hojaLechuga(
      ctx, cx + (rn() - 0.5) * W * 0.02, base - H * 0.09, a,
      nucleo * (0.85 + rn() * 0.3), 0.72, hex2rgb(TINTA.lecCorazon), rn, 0,
    );
  }
  // el brillo del cogollo: el punto donde la lámina junta toda su luz
  ctx.fillStyle = css(mixHex(TINTA.lecCorazon, '#ffffff', 0.4), 0.4);
  ctx.beginPath();
  ctx.ellipse(cx, base - H * 0.18, nucleo * 0.42, nucleo * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/* ── las LÁMINAS completas, en el contrato del motor ────────────────────── */
export const LAMINA_PIMENTON = Object.freeze({
  id: 'pimenton',
  layout: LAYOUT_PIMENTON,
  ancho: PIMENTON_ANCHO,
  alto: PIMENTON_ALTO,
  planos: 3,
  desfase: 0.1,
  pintarTile: pintarPimenton,
  semillaAtlas: 20260819,
  semillaVariantes: 5077,
});

export const LAMINA_LECHUGA = Object.freeze({
  id: 'lechuga',
  layout: LAYOUT_LECHUGA,
  ancho: LECHUGA_ANCHO,
  alto: LECHUGA_ALTO,
  planos: 3,
  desfase: 0.22,
  pintarTile: pintarLechuga,
  semillaAtlas: 20260820,
  semillaVariantes: 6133,
});
