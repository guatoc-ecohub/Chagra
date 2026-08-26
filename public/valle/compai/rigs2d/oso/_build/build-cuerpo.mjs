/**
 * build-cuerpo — hornea las dos capas de base del rig y CORRE EL CANDADO:
 *
 *   roca.png           la roca sola, con los píxeles ocultos tras pies y palo
 *                      rellenados por clonado horizontal de la propia roca +
 *                      las líneas (borde trasero / pliegue) redibujadas en
 *                      tinta a través de los huecos. Va al FONDO del apilado
 *                      y en marcha/roam el rig la puede soltar.
 *   cuerpo-inpaint.png el oso SIN piernas, SIN brazo+bastón, SIN corona y
 *                      SIN roca — pero CON cabeza y cuello INTACTOS (la
 *                      cabeza se sigue cortando en runtime con la polilínea
 *                      aprobada: acá no se corta cuello/cabeza). Los píxeles
 *                      ocultos tras las piezas móviles se rellenan por
 *                      clonado dirigido de la propia lámina:
 *                        · caderas/pelvis tras los muslos (espejo vertical
 *                          sobre el borde de la panza + arco de tinta) — al
 *                          balancear una pierna se ve cuerpo arriba y FONDO
 *                          abajo, como corresponde (precedente jaguar)
 *                        · flanco tras el deltoide/bíceps (clon x−Δ + borde
 *                          de tinta suave paralelo a la crestera)
 *
 * CANDADO DE RECOMPOSICIÓN (se imprime al final): compone
 * roca → pierna-ocluida → pierna-cercana → cuerpo → brazo → corona (over,
 * orden pintor) y compara contra la lámina original: déficit de alfa,
 * píxeles de color distinto y EXCESO fuera de silueta (el dual del déficit —
 * la lección de la lámina-viva). Deja `_build/crops/dbg-dif.png`.
 */
import {
  cargarLamina, capa, idx, ss, clamp, guardarPNG, debugCrop, tinta, lum,
  mascaraPierna, mascaraBrazoBaston, mascaraCorona, mascaraCoronaSub, hard,
  interpolarY, ROCA_TOP, ROCA_PLIEGUE, PIERNAS, regionRoca, OUT, sharp,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const N = W * H;

console.time('claims');
const mPC = mascaraPierna(sd, W, H, 'cercana');
const mPO = mascaraPierna(sd, W, H, 'ocluida');
const mBrazoBase = mascaraBrazoBaston(sd, W, H);
const mBrazo = new Float32Array(N);
const mCor = new Float32Array(N);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  mBrazo[p] = mBrazoBase[p] * hard(mascaraCoronaSub(x, y));
  mCor[p] = mascaraCorona(x, y);
}
console.timeEnd('claims');

/* ═══════════ ROCA ═══════════ */
{
  const buf = capa(W, H);
  // 1) la roca visible (región bajo el borde trasero, menos lo que la tapa)
  const oculta = new Float32Array(N); // cuánto la tapan piezas de encima
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    const i = p * 4;
    if (!sd[i + 3]) continue;
    const reg = regionRoca(x, y);
    if (reg <= 0) continue;
    // la roca es la capa de ABAJO: resta DURA contra el cuerpo (1-reg suave
    // solo del lado del cuerpo) — con reg blando a ambos lados, la banda del
    // divisor componía 0.5 over 0.5 = 0.75 y el candado marcaba la línea
    // del borde entera como déficit
    const regDura = hard(1 - reg);
    if (regDura <= 0) continue;
    const tapa = Math.max(mPC[p], mPO[p], mBrazo[p]);
    // bajo una pieza MÓVIL, la capa de fondo se inpainta desde que hay
    // CUALQUIER cobertura (el anillo AA del contorno del pie está
    // contaminado de tinta del pie: conservarlo deja un pie fantasma
    // dibujado en la roca al levantar la pata)
    const cubre = ss(0.02, 0.15, tapa);
    oculta[p] = regDura * cubre;
    const a = regDura * (1 - cubre);
    if (a <= 0.004) continue;
    buf[i] = sd[i]; buf[i + 1] = sd[i + 1]; buf[i + 2] = sd[i + 2];
    buf[i + 3] = sd[i + 3] * a;
  }
  // 2) inpaint horizontal tras pies y palo: clon del píxel de roca limpia
  //    más cercano en la misma fila, mezcla izquierda/derecha por distancia
  const limpia = (x, y) => {
    const i = idx(W, x, y);
    return sd[i + 3] > 200 && regionRoca(x, y) > 0.6
      && mPC[y * W + x] < 0.02 && mPO[y * W + x] < 0.02 && mBrazo[y * W + x] < 0.02;
  };
  for (let y = 440; y < 600; y++) {
    for (let x = 8; x < 600; x++) {
      const p = y * W + x;
      if (oculta[p] <= 0.02) continue;
      let xi = -1, xd = -1;
      for (let k = x - 1; k >= 8; k--) if (limpia(k, y)) { xi = k; break; }
      for (let k = x + 1; k <= 600; k++) if (limpia(k, y)) { xd = k; break; }
      if (xi < 0 && xd < 0) continue;
      let r, g, b;
      if (xi >= 0 && xd >= 0) {
        const t = (x - xi) / (xd - xi);
        const ii = idx(W, xi, y), id = idx(W, xd, y);
        r = sd[ii] * (1 - t) + sd[id] * t;
        g = sd[ii + 1] * (1 - t) + sd[id + 1] * t;
        b = sd[ii + 2] * (1 - t) + sd[id + 2] * t;
      } else {
        const j = idx(W, xi >= 0 ? xi : xd, y);
        r = sd[j]; g = sd[j + 1]; b = sd[j + 2];
      }
      const i = p * 4;
      const aN = oculta[p];
      const aO = buf[i + 3] / 255;
      // el clon va DEBAJO de lo visible que ya está en la capa
      const na = aO + aN * (1 - aO);
      if (na <= 0) continue;
      buf[i] = (buf[i] * aO + r * aN * (1 - aO)) / na;
      buf[i + 1] = (buf[i + 1] * aO + g * aN * (1 - aO)) / na;
      buf[i + 2] = (buf[i + 2] * aO + b * aN * (1 - aO)) / na;
      buf[i + 3] = na * 255;
    }
  }
  // 3) las líneas de la roca redibujadas en tinta a través de los huecos
  //    (color muestreado del trazo real en un tramo limpio)
  const muestraLinea = (x0, y0) => {
    const i = idx(W, x0, y0);
    return [sd[i], sd[i + 1], sd[i + 2]];
  };
  const TINTA_BORDE = muestraLinea(270, 470);   // borde trasero, tramo limpio
  const TINTA_PLIEGUE = muestraLinea(80, 531);  // pliegue, tramo limpio
  for (let x = 30; x <= 574; x += 0.5) {
    const y = interpolarY(ROCA_TOP, x) + 2;
    const p = (Math.round(y) * W + Math.round(x));
    const tapada = Math.max(mPC[p], mPO[p], mBrazo[p]);
    if (tapada > 0.25) tinta(buf, W, H, x, y, 2.1, TINTA_BORDE, 0.85 * ss(0.25, 0.6, tapada));
  }
  for (let x = 24; x <= 266; x += 0.5) {
    const y = interpolarY(ROCA_PLIEGUE, x) + 1.5;
    const p = (Math.round(y) * W + Math.round(x));
    const tapada = Math.max(mPC[p], mPO[p]);
    if (tapada > 0.25) tinta(buf, W, H, x, y, 1.8, TINTA_PLIEGUE, 0.8 * ss(0.25, 0.6, tapada));
  }
  await guardarPNG(buf, W, H, `${OUT}/roca.png`);
  await debugCrop(buf, W, H, [0, 430, 615, 200], 1, `${OUT}/_build/crops/dbg-roca.png`);
}

/* ═══════════ CUERPO-INPAINT ═══════════ */
const bufC = capa(W, H);
{
  // 1) el oso sin piezas móviles y sin roca — cabeza/cuello INTACTOS
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    const i = p * 4;
    if (!sd[i + 3]) continue;
    const a = (1 - regionRoca(x, y)) * hard(mPC[p]) * hard(mPO[p]) * hard(mBrazo[p]) * hard(mascaraCoronaSub(x, y));
    if (a <= 0.004) continue;
    bufC[i] = sd[i]; bufC[i + 1] = sd[i + 1]; bufC[i + 2] = sd[i + 2];
    bufC[i + 3] = sd[i + 3] * a;
  }
  // 2) PELVIS/caderas tras los muslos: espejo vertical sobre el borde real de
  //    la panza (fuente SIEMPRE piel interior — el trazo del contorno no se
  //    duplica), profundidad ~70px con fundido, y arco de tinta al fondo
  const Y_BELLY = {
    cercana: [[146, 378], [205, 370], [240, 382], [258, 388]],
    ocluida: [[298, 388], [340, 378], [380, 372], [406, 380]],
  };
  const TINTA_PELAJE = [38, 34, 30];
  for (const clave of ['cercana', 'ocluida']) {
    const m = clave === 'cercana' ? mPC : mPO;
    const P = PIERNAS[clave];
    for (let y = 356; y < 480; y++) for (let x = P.muslo.x0 - 4; x <= P.muslo.x1 + 4; x++) {
      const p = y * W + x;
      if (m[p] <= 0.02) continue;
      if (!sd[p * 4 + 3]) continue;            // solo donde la lámina tiene píxel
      if (regionRoca(x, y) > 0.4) continue;
      const yB = interpolarY(Y_BELLY[clave], x);
      const prof = y - yB;
      if (prof > 74) continue;
      let sy = Math.round(2 * yB - y - 10);
      sy = clamp(sy, 240, Math.round(yB) - 12);
      // fuente espejo; si cae en fondo (borde del arco), corre hacia el
      // interior del cuerpo — saltarse el píxel dejaba un mordisco blanco
      // en la ingle al balancear la pierna (visto en pose-zancada)
      let j = idx(W, x, sy);
      if (sd[j + 3] < 200) j = idx(W, x + 26, sy);
      if (sd[j + 3] < 200) j = idx(W, x - 26, sy);
      if (sd[j + 3] < 200) j = idx(W, x + 48, sy);
      if (sd[j + 3] < 200) j = idx(W, x - 48, sy);
      if (sd[j + 3] < 200) continue;
      const cae = 1 - ss(56, 74, prof);
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
    // arco de tinta: el contorno redondeado de la cadera que se revela al
    // balancear la pierna (único trazo sintético, precedente jaguar)
    for (let x = P.muslo.x0 + 4; x <= P.muslo.x1 - 4; x += 0.5) {
      const yB = interpolarY(Y_BELLY[clave], x);
      const cx = (P.muslo.x0 + P.muslo.x1) / 2;
      const semi = (P.muslo.x1 - P.muslo.x0) / 2 - 4;
      const comba = Math.sqrt(Math.max(0, 1 - ((x - cx) / semi) ** 2));
      const y = yB + 34 + 26 * comba;
      const p = (Math.round(y) * W + Math.round(x));
      if (m[p] <= 0.985) continue;
      tinta(bufC, W, H, x, y, 1.6, TINTA_PELAJE, 0.62 * ss(0.985, 0.997, m[p]));
    }
  }
  // 3) FLANCO tras el deltoide/bíceps: clon x−Δ + borde de tinta suave
  //    paralelo a la crestera (se revela al gesticular con el bastón).
  //    CAPADO a la silueta del torso-sin-brazo (BORDE_TORSO): más allá de
  //    ella lo que hay detrás del brazo/hojas es FONDO, y rellenarlo con
  //    pelaje dejaba una mancha flotante al gesticular.
  const BORDE_TORSO = [[150, 428], [175, 446], [205, 455], [245, 458], [280, 452], [305, 440], [322, 428]]; // [y,x]
  const xTorso = (y) => {
    if (y <= BORDE_TORSO[0][0]) return BORDE_TORSO[0][1];
    const u = BORDE_TORSO[BORDE_TORSO.length - 1];
    if (y >= u[0]) return u[1];
    for (let k = 1; k < BORDE_TORSO.length; k++) {
      const [y0, x0] = BORDE_TORSO[k - 1];
      const [y1, x1] = BORDE_TORSO[k];
      if (y <= y1) return x0 + ((y - y0) / (y1 - y0)) * (x1 - x0);
    }
    return u[1];
  };
  for (let y = 150; y < 335; y++) for (let x = 396; x < 480; x++) {
    if (x > xTorso(y) - 1) continue;
    const p = y * W + x;
    if (mBrazo[p] <= 0.02) continue;
    if (!sd[p * 4 + 3]) continue;              // solo donde la lámina tiene píxel
    // fuente sesgada a PELAJE de flanco (abajo-izquierda), con respaldos
    let j = idx(W, x - 34, y + 64);
    const mala = (jj, xx, yy) => sd[jj + 3] < 200 || mBrazoBase[yy * W + xx] > 0.02;
    if (mala(j, x - 34, y + 64)) j = idx(W, x - 90, y + 10);
    if (mala(j, x - 90, y + 10)) j = idx(W, x - 54, y);
    if (sd[j + 3] < 200) continue;
    const aN = mBrazo[p] * (sd[p * 4 + 3] / 255);
    const i = p * 4;
    const aO = bufC[i + 3] / 255;
    const na = aO + aN * (1 - aO);
    if (na <= 0) continue;
    bufC[i] = (bufC[i] * aO + sd[j] * aN * (1 - aO)) / na;
    bufC[i + 1] = (bufC[i + 1] * aO + sd[j + 1] * aN * (1 - aO)) / na;
    bufC[i + 2] = (bufC[i + 2] * aO + sd[j + 2] * aN * (1 - aO)) / na;
    bufC[i + 3] = na * 255;
  }
  {
    const TINTA_PELAJE = [38, 34, 30];
    const BORDE = BORDE_TORSO;
    for (let k = 0; k < BORDE.length - 1; k++) {
      const [y0, x0] = BORDE[k];
      const [y1, x1] = BORDE[k + 1];
      const pasos = Math.hypot(x1 - x0, y1 - y0) * 2;
      for (let t = 0; t <= pasos; t++) {
        const x = x0 + ((x1 - x0) * t) / pasos;
        const y = y0 + ((y1 - y0) * t) / pasos;
        const p = (Math.round(y) * W + Math.round(x));
        if (mBrazo[p] <= 0.985) continue;
        if (sd[p * 4 + 3] < 200) continue;
        tinta(bufC, W, H, x, y, 1.3, TINTA_PELAJE, 0.42 * ss(0.985, 0.997, mBrazo[p]));
      }
    }
  }
  await guardarPNG(bufC, W, H, `${OUT}/cuerpo-inpaint.png`);
  await debugCrop(bufC, W, H, [100, 130, 420, 380], 1, `${OUT}/_build/crops/dbg-cuerpo.png`);
}

/* ═══════════ CANDADO DE RECOMPOSICIÓN ═══════════ */
{
  const capas = [];
  const desdePNG = async (ruta) => {
    const { data } = await sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return data;
  };
  capas.push(await desdePNG(`${OUT}/roca.png`));
  capas.push(await desdePNG(`${OUT}/cuerpo-inpaint.png`));
  capas.push(await desdePNG(`${OUT}/pierna-ocluida.png`));
  capas.push(await desdePNG(`${OUT}/pierna-cercana.png`));
  capas.push(await desdePNG(`${OUT}/brazo-baston.png`));
  { // corona desde la lámina (en el rig es hija del brazo)
    const c = capa(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      const i = p * 4;
      if (!sd[i + 3] || mCor[p] <= 0.004) continue;
      c[i] = sd[i]; c[i + 1] = sd[i + 1]; c[i + 2] = sd[i + 2];
      c[i + 3] = sd[i + 3] * mCor[p];
    }
    capas.push(c);
  }
  // composite en FLOAT: un Buffer trunca a entero en cada over y fabrica
  // falsos deficits de 1/255 por apilar 3+ capas (medido en este candado)
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
