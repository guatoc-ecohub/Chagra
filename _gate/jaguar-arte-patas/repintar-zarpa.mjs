/* repintar-zarpa.mjs — cirugía de la zarpa de `pata-del-lejana.png` (refino
 * arte-patas 2026-08-18). NO versionado: el entregable es el PNG.
 *
 * Diagnóstico (grilla + sondas de alfa en este mismo _gate/):
 *   · La zarpa GENUINA de la pieza blanca ya es correcta: bloque de dedos
 *     x≈110-137 pisando en y≈385 y planta digitígrada subiendo x137→158
 *     (y 385→379).
 *   · TODO x≥~161 a nivel de zarpa es relleno sintético del espejo: arcos de
 *     dedos naranjas fantasma (x 161-185, cuelgan a y 385-387) y el GANCHO
 *     oscuro (x 186-197, baja a y≈389, DEBAJO de la línea de dedos). En
 *     reposo lo tapa la pata naranja; al caminar se destapa y se lee "zarpa
 *     rota / garra colgando".
 *
 * Cirugía:
 *   1. Recorte a la silueta real: borde trasero B(y) desde el pliegue
 *      (y≈332) hasta el talón (138,385), con feather y rampa superior para
 *      no dejar escalón contra el respaldo de columna (que se conserva — en
 *      reposo la banda del corte lo necesita debajo).
 *   2. Contorno de TINTA por el borde nuevo (el estilo Humboldt contornea
 *      todos los bordes; el borde del espejo no tenía).
 *   3. ALMOHADILLA metacarpiana: asomo discreto detrás del bloque de dedos.
 *   4. Falda de sombra AO: los píxeles OSCUROS genuinos pegados al borde se
 *      conservan con alfa decreciente (la zarpa mantiene su sombra de
 *      contacto; los arcos pálidos fantasma no pasan el filtro).
 */
import sharp from 'sharp';

const SRC = new URL('./pata-del-lejana.ORIG.png', import.meta.url).pathname;
const DST = new URL('../../public/compai/laminas/jaguar-rig/pata-del-lejana.png', import.meta.url).pathname;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/* Borde trasero B(y): polilínea medida (px de lámina). */
const B_PTS = [
  [332, 181], [336, 176], [340, 172], [344, 169.5], [348, 167.5], [352, 166],
  [356, 164], [360, 162], [364, 160], [368, 157.5], [372, 154.5], [376, 151],
  [380, 147], [383, 142.5], [385, 138.5], [388, 136],
];
const B = (y) => {
  if (y <= B_PTS[0][0]) return B_PTS[0][1];
  for (let i = 1; i < B_PTS.length; i++) {
    if (y <= B_PTS[i][0]) {
      const [y0, x0] = B_PTS[i - 1]; const [y1, x1] = B_PTS[i];
      return lerp(x0, x1, (y - y0) / (y1 - y0));
    }
  }
  return B_PTS[B_PTS.length - 1][1];
};

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
const px = (x, y) => (y * W + x) * 4;

/* Zona de cirugía. */
const X0 = 130, X1 = 210, Y0 = 326, Y1 = 394;

for (let y = Y0; y <= Y1 && y < H; y++) {
  const b = B(y);
  /* rampa superior: el recorte entra gradualmente (0 en y≤332, 1 en y≥344)
     SOLO en la banda del pliegue (x ≤ 184) para no dejar escalón contra el
     respaldo de columna conservado. Más allá de x=185 no hay nada legítimo
     debajo de y=338 (medido): ahí el borrado es pleno, sin rampa — la rampa
     ahí dejaba el arco de espejo picado a media alfa. */
  const rampa = ss(332, 344, y);
  for (let x = X0; x <= X1 && x < W; x++) {
    const i = px(x, y);
    const a = data[i + 3];
    if (!a) continue;
    if (x >= 185 && y >= 338) { data[i + 3] = 0; continue; }
    const fuera = ss(b - 1.5, b + 1.5, x); // 0 = adentro de la silueta
    if (fuera <= 0) continue;
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    /* Falda de sombra AO: píxel OSCURO genuino pegado al borde, cerca del
       piso → se queda desvaneciéndose (sombra de contacto). Lo pálido y lo
       lejano (arcos fantasma, pelusa de espejo) no pasa. */
    const esSombra = lum < 100 && y >= 372 && x <= 168;
    const faldaW = esSombra ? 1 - ss(b + 2, b + 8, x) : 0;
    const dentroPeso = 1 - fuera * rampa;       // recorte con feather
    const peso = Math.max(dentroPeso, faldaW * rampa * 0.8);
    data[i + 3] = Math.round(a * peso);
  }
}

/* ── Contorno de tinta por el borde nuevo (y 344..386) ── */
const INK = [42, 24, 12];
for (let y = 344; y <= 386; y++) {
  const b = B(y);
  const jit = Math.sin(y * 1.7) * 0.45; // pulso de mano, no línea CAD
  for (let x = Math.floor(b - 4); x <= Math.ceil(b + 2); x++) {
    const i = px(x, y);
    if (data[i + 3] < 8) {
      /* fuera de la silueta: el trazo puede aportar su propio alfa (cierra
         el borde donde el feather dejó fleco) */
      const d = Math.abs(x - (b - 1 + jit));
      const t = 1 - ss(0.7, 1.9, d);
      if (t > 0.04) {
        const cob = t * ss(344, 348, y) * (1 - ss(384, 387, y));
        if (cob > data[i + 3] / 255) {
          data[i] = INK[0]; data[i + 1] = INK[1]; data[i + 2] = INK[2];
          data[i + 3] = Math.round(255 * cob * 0.88);
        }
      }
      continue;
    }
    const d = Math.abs(x - (b - 1 + jit));
    const t = 1 - ss(0.7, 2.3, d);
    if (t <= 0.03) continue;
    const fza = t * 0.9 * ss(344, 350, y); // entra suave desde el pliegue
    data[i] = Math.round(lerp(data[i], INK[0], fza));
    data[i + 1] = Math.round(lerp(data[i + 1], INK[1], fza));
    data[i + 2] = Math.round(lerp(data[i + 2], INK[2], fza));
  }
}

/* ── Sombreado interior: media luna cálida junto al borde (da volumen al
      metacarpo, como el sombreado que ya trae el bloque de dedos) ── */
for (let y = 350; y <= 384; y++) {
  const b = B(y);
  for (let x = Math.floor(b - 12); x < b - 1; x++) {
    const i = px(x, y);
    if (data[i + 3] < 100) continue;
    const t = 1 - ss(1.5, 11, b - x);
    if (t <= 0) continue;
    const f = 1 - 0.16 * t;
    data[i] = Math.round(data[i] * (f + 0.03 * t));   // cálido: R cae menos
    data[i + 1] = Math.round(data[i + 1] * f);
    data[i + 2] = Math.round(data[i + 2] * (f - 0.02 * t));
  }
}

/* ── Almohadilla metacarpiana: asomo elíptico detrás del bloque de dedos ── */
const PAD = { cx: 143.6, cy: 383.4, rx: 4.1, ry: 2.0, rot: -12 * Math.PI / 180, col: [46, 26, 16] };
for (let y = 379; y <= 388; y++) {
  for (let x = 137; x <= 151; x++) {
    const i = px(x, y);
    if (data[i + 3] < 60) continue;
    const dx = x - PAD.cx, dy = y - PAD.cy;
    const u = dx * Math.cos(PAD.rot) + dy * Math.sin(PAD.rot);
    const v = -dx * Math.sin(PAD.rot) + dy * Math.cos(PAD.rot);
    const r = Math.hypot(u / PAD.rx, v / PAD.ry);
    const t = 1 - ss(0.55, 1.05, r);
    if (t <= 0.02) continue;
    const fza = t * 0.68;
    data[i] = Math.round(lerp(data[i], PAD.col[0], fza));
    data[i + 1] = Math.round(lerp(data[i + 1], PAD.col[1], fza));
    data[i + 2] = Math.round(lerp(data[i + 2], PAD.col[2], fza));
  }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile(DST);
console.log('pata-del-lejana.png repintada →', DST);
