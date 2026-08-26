/**
 * build-cuerpo — hornea la capa base del rig y CORRE EL CANDADO:
 *
 *   cuerpo-inpaint.png  la zarigüeya SIN patas traseras, SIN cola y SIN
 *                       brazos — pero CON cabeza y cuello INTACTOS (la
 *                       cabeza se sigue cortando en runtime con la recta
 *                       aprobada: acá no se corta cuello/cabeza). Rellenos
 *                       por clonado de la propia lámina:
 *                        · PECHO tras el guante de la brújula: puerto 1:1
 *                          del INPAINT_PECHO aprobado de capas.js (lanilla
 *                          del vientre clonada +70,+40)
 *                        · CADERAS/ingles tras las raíces de las patas:
 *                          espejo vertical sobre la línea de ingle (raíz
 *                          medida +12px) + arco de tinta — al balancear una
 *                          pata se ve cuerpo arriba y FONDO abajo, como
 *                          corresponde (precedente jaguar/oso)
 *
 * CANDADO DE RECOMPOSICIÓN: compone cola → cuerpo → pata-ocluida →
 * pata-cercana → brazo-brújula → brazo-lápiz → cabeza → mandíbula → orejas
 * (over en FLOAT, orden del runtime) y compara contra la lámina original:
 * déficit de alfa, EXCESO fuera de silueta (el dual — lección lámina-viva)
 * y color distinto. Deja `_build/crops/dbg-dif.png`.
 */
import {
  cargarLamina, capa, idx, ss, clamp, guardarPNG, debugCrop, tinta,
  mascaraPata, mascaraColaPieza, mascaraBrazoLapiz, mBrazoBrujulaPieza,
  mascaraBrazoBrujula, mCabezaFull, mascaraCabeza, mascaraOreja,
  mascaraOrejaSub, mascaraMandibula, hard, interpolarY,
  PATAS, INPAINT_PECHO, OREJA_IZQ, OREJA_DER, OUT, sharp,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const N = W * H;

console.time('claims');
const mPO = mascaraPata(sd, W, H, 'ocluida');
const mPC = mascaraPata(sd, W, H, 'cercana');
const mCol = mascaraColaPieza(sd, W, H, mPC);
console.timeEnd('claims');

/* ═══════════ CUERPO-INPAINT ═══════════ */
const bufC = capa(W, H);
{
  // 1) la zarigüeya sin piezas móviles — cabeza/cuello INTACTOS
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    const i = p * 4;
    if (!sd[i + 3]) continue;
    const a = hard(mPO[p]) * hard(mPC[p]) * hard(mCol[p])
      * hard(mascaraBrazoLapiz(x, y)) * hard(mBrazoBrujulaPieza(x, y));
    if (a <= 0.004) continue;
    bufC[i] = sd[i]; bufC[i + 1] = sd[i + 1]; bufC[i + 2] = sd[i + 2];
    bufC[i + 3] = sd[i + 3] * a;
  }

  // 2) PECHO tras el guante de la brújula — puerto 1:1 de capas.js
  {
    const { x0, x1, y0, y1, dx, dy, umbral } = INPAINT_PECHO;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      // gate de DESTINO a la silueta original (el runtime no lo tiene: la
      // mano sobresale del contorno y detrás hay FONDO — clonar lanilla ahí
      // creaba 68 px fuera de silueta, el dual del déficit)
      if (!sd[idx(W, x, y) + 3]) continue;
      const mb = mascaraBrazoBrujula(x, y);
      if (mb <= umbral) continue;
      const j = idx(W, clamp(x + dx, 0, W - 1), clamp(y + dy, 0, H - 1));
      const entra = ss(umbral, umbral + 0.25, mb);
      const cA = (sd[j + 3] / 255) * entra;
      if (!cA) continue;
      const i = idx(W, x, y);
      const eA = bufC[i + 3] / 255;
      const outA = eA + cA * (1 - eA);
      if (outA <= 0) continue;
      // el clon entra POR DEBAJO (lo que el corte dejó queda encima)
      bufC[i] = (bufC[i] * eA + sd[j] * cA * (1 - eA)) / outA;
      bufC[i + 1] = (bufC[i + 1] * eA + sd[j + 1] * cA * (1 - eA)) / outA;
      bufC[i + 2] = (bufC[i + 2] * eA + sd[j + 2] * cA * (1 - eA)) / outA;
      bufC[i + 3] = outA * 255;
    }
  }

  // 3) CADERAS/ingles tras las raíces de las patas: espejo vertical sobre la
  //    línea de ingle (raíz medida +12px), profundidad acotada con fundido +
  //    arco de tinta (único trazo sintético, precedente jaguar/oso). La
  //    fuente es SIEMPRE piel de panza/grupa de la propia lámina; si cae en
  //    una pieza o en fondo, corre lateral (respaldos).
  const TINTA_PELAJE = [42, 36, 30];
  for (const clave of ['ocluida', 'cercana']) {
    const m = clave === 'ocluida' ? mPO : mPC;
    const P = PATAS[clave];
    const esMala = (xx, yy) => {
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) return true;
      const q = yy * W + xx;
      if (sd[q * 4 + 3] < 200) return true;
      if (mPO[q] > 0.02 || mPC[q] > 0.02 || mCol[q] > 0.02) return true;
      if (mascaraBrazoLapiz(xx, yy) > 0.02 || mascaraBrazoBrujula(xx, yy) > 0.02) return true;
      return false;
    };
    for (let y = P.region.y0; y < P.region.y1; y++) for (let x = P.region.x0; x < P.region.x1; x++) {
      const p = y * W + x;
      if (m[p] <= 0.02) continue;
      if (!sd[p * 4 + 3]) continue;
      const yIng = interpolarY(P.raizPuntos, x) + 12;
      const prof = y - yIng;
      if (prof > 46) continue;
      let sx = x, sy = Math.round(2 * yIng - y - 8);
      if (esMala(sx, sy)) { sx = x - 22; }
      if (esMala(sx, sy)) { sx = x + 22; }
      if (esMala(sx, sy)) { sx = x; sy -= 18; }
      if (esMala(sx, sy)) continue;
      const j = idx(W, sx, sy);
      const cae = 1 - ss(32, 46, prof);
      const aN = m[p] * cae * (sd[p * 4 + 3] / 255);
      if (aN <= 0.004) continue;
      const i = p * 4;
      const aO = bufC[i + 3] / 255;
      const na = aO + aN * (1 - aO);
      if (na <= 0) continue;
      bufC[i] = (bufC[i] * aO + sd[j] * aN * (1 - aO)) / na;
      bufC[i + 1] = (bufC[i + 1] * aO + sd[j + 1] * aN * (1 - aO)) / na;
      bufC[i + 2] = (bufC[i + 2] * aO + sd[j + 2] * aN * (1 - aO)) / na;
      bufC[i + 3] = na * 255;
    }
    // arco de tinta: contorno redondeado de la cadera que se revela al
    // balancear la pata
    const cx = (P.pinza.x0 + P.pinza.x1) / 2;
    const semi = (P.pinza.x1 - P.pinza.x0) / 2 - 4;
    for (let x = P.pinza.x0 + 3; x <= P.pinza.x1 - 3; x += 0.5) {
      const yIng = interpolarY(P.raizPuntos, x) + 12;
      const comba = Math.sqrt(Math.max(0, 1 - ((x - cx) / semi) ** 2));
      const y = yIng + 10 + 16 * comba;
      const p = (Math.round(y) * W + Math.round(x));
      if (p < 0 || p >= N) continue;
      if (m[p] <= 0.985) continue;
      if (sd[p * 4 + 3] < 200) continue;
      tinta(bufC, W, H, x, y, 1.5, TINTA_PELAJE, 0.55 * ss(0.985, 0.997, m[p]), sd);
    }
  }
  await guardarPNG(bufC, W, H, `${OUT}/cuerpo-inpaint.png`);
  await debugCrop(bufC, W, H, [80, 200, 320, 244], 1, `${OUT}/_build/crops/dbg-cuerpo.png`);
}

/* ═══════════ CANDADO DE RECOMPOSICIÓN ═══════════ */
{
  const desdePNG = async (ruta) => {
    const { data } = await sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return data;
  };
  const desdeMascara = (mask) => {
    const c = capa(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = idx(W, x, y);
      if (!sd[i + 3]) continue;
      const m = mask(x, y);
      if (m <= 0.004) continue;
      c[i] = sd[i]; c[i + 1] = sd[i + 1]; c[i + 2] = sd[i + 2];
      c[i + 3] = sd[i + 3] * m;
    }
    return c;
  };
  // cara-set con las máscaras del runtime (mCabezaRender + piezas)
  const mMand = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
  const capas = [
    await desdePNG(`${OUT}/cola.png`),
    await desdePNG(`${OUT}/cuerpo-inpaint.png`),
    await desdePNG(`${OUT}/pata-ocluida.png`),
    await desdePNG(`${OUT}/pata-cercana.png`),
    desdeMascara(mBrazoBrujulaPieza),
    desdeMascara(mascaraBrazoLapiz),
    desdeMascara((x, y) => mCabezaFull(x, y)
      * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
      * hard(mMand(x, y))),
    desdeMascara(mMand),
    desdeMascara((x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabezaFull(x, y)),
    desdeMascara((x, y) => mascaraOreja(x, y, OREJA_DER) * mCabezaFull(x, y)),
  ];
  // composite en FLOAT (un Buffer trunca en cada over y fabrica deficits)
  const comp = new Float32Array(N * 4);
  for (const capaBuf of capas) {
    for (let p = 0; p < N; p++) {
      const i = p * 4;
      const aS = capaBuf[i + 3] / 255;
      if (aS <= 0) continue;
      const aD = comp[i + 3];
      const na = aS + aD * (1 - aS);
      for (let c = 0; c < 3; c++) comp[i + c] = (capaBuf[i + c] * aS + comp[i + c] * aD * (1 - aS)) / na;
      comp[i + 3] = na;
    }
  }
  let deficit = 0, exceso = 0, color = 0, defMax = 0;
  const dif = capa(W, H);
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    const aL = sd[i + 3], aC = comp[i + 3] * 255;
    if (aL > 0 && aC < aL - 0.5) {
      deficit++; defMax = Math.max(defMax, aL - aC);
      dif[i] = 255; dif[i + 3] = 255;
    }
    if (aL === 0 && aC > 0.5) { exceso++; dif[i + 1] = 255; dif[i + 3] = 255; }
    if (aL > 230 && aC > 230) {
      const d = Math.abs(comp[i] - sd[i]) + Math.abs(comp[i + 1] - sd[i + 1]) + Math.abs(comp[i + 2] - sd[i + 2]);
      if (d > 24) { color++; dif[i + 2] = 255; dif[i + 3] = 255; }
    }
  }
  console.log(`CANDADO: deficit=${deficit} px (max ${defMax.toFixed(1)}/255) · exceso fuera de silueta=${exceso} px · color distinto=${color} px`);
  await guardarPNG(dif, W, H, `${OUT}/_build/crops/dbg-dif.png`);
}
