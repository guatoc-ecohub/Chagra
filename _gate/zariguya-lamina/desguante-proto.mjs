// Prototipo OFFLINE de desguante v2 — la MISMA matemática que irá a
// ZariguyaLaminaViva.jsx (paridad copy-paste, como verifica.mjs ↔ capas.js).
import sharp from 'sharp';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ═══ INICIO BLOQUE PARIDAD ═══ */
const MANOS_DESNUDAS = [
  { elipse: { cx: 60, cy: 180, rx: 52, ry: 50 }, guarda: null },
  { elipse: { cx: 152, cy: 262, rx: 44, ry: 40 },
    // la cara de la brújula (blancos hasta x≈128, solo por encima de y≈266)
    // se protege con un semiplano MEDIDO con fundido de 3.5px — el borde
    // cae dentro de la banda de tinta del contorno del dedo.
    guarda: (x, y) => (y < 266 ? ss(129.5, 133, x) : 1) },
];
const CARNE_F = [210 / 242, 180 / 226, 152 / 198];

function desguantar(d, W, H) {
  for (const { elipse, guarda } of MANOS_DESNUDAS) {
    const { cx, cy, rx, ry } = elipse;
    const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const rn = Math.hypot((x - cx) / rx, (y - cy) / ry);
        if (rn > 1) continue;
        const i = (y * W + x) * 4;
        if (!d[i + 3]) continue;
        const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let t = ss(170, 210, L) * (1 - ss(0.92, 1, rn));
        if (guarda) t *= guarda(x, y);
        if (!t) continue;
        d[i] *= 1 - t * (1 - CARNE_F[0]);
        d[i + 1] *= 1 - t * (1 - CARNE_F[1]);
        d[i + 2] *= 1 - t * (1 - CARNE_F[2]);
      }
    }
  }
}
/* ═══ FIN BLOQUE PARIDAD ═══ */

const src = 'public/compai/laminas/zariguya.png';
const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const cuentaBlancos = (d) => MANOS_DESNUDAS.map(({ elipse, guarda }) => {
  let n = 0;
  const { cx, cy, rx, ry } = elipse;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) {
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      if (Math.hypot((x - cx) / rx, (y - cy) / ry) > 0.92) continue;
      if (guarda && guarda(x, y) < 1) continue;
      const i = (y * W + x) * 4;
      if (d[i + 3] < 200) continue;
      const L = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (L > 205) n++;
    }
  }
  return n;
});

console.log('blancos ANTES  [lapiz, brujula]:', cuentaBlancos(data));
desguantar(data, W, H);
console.log('blancos DESPUES[lapiz, brujula]:', cuentaBlancos(data));

await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } }).png().toFile('/tmp/zariguya-singuantes.png');
await sharp('/tmp/zariguya-singuantes.png').extract({ left: 0, top: 120, width: 130, height: 130 }).resize(520, 520, { kernel: 'nearest' }).toFile('/tmp/zlv-des-lapiz.png');
await sharp('/tmp/zariguya-singuantes.png').extract({ left: 90, top: 215, width: 130, height: 110 }).resize(520, 440, { kernel: 'nearest' }).toFile('/tmp/zlv-des-brujula.png');
console.log('listo');
