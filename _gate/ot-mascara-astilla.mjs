// Máscara de ASTILLA ESTRICTA (oscuro<UT sobre lo que era página>UP entre
// reposo y pose) emitida como PNG blanco sobre negro, en espacio lámina.
// Uso: node _gate/ot-mascara-astilla.mjs pose.png reposo.png out.png [UT UP]
import sharp from 'sharp';

const [pose, reposo, out, utArg, upArg] = process.argv.slice(2);
const UT = Number(utArg || 200), UP = Number(upArg || 220);
if (!pose || !reposo || !out) { console.error('USO: ot-mascara-astilla pose reposo out.png [UT UP]'); process.exit(2); }
const ap = await sharp(pose).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const rp = await sharp(reposo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = ap.info.width, H = ap.info.height;
const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
const salida = Buffer.alloc(W * H * 3);
let total = 0;
for (let i = 0, p = 0; i < W * H; i++, p += 3) {
  if (lum(ap.data, p) < UT && lum(rp.data, p) > UP) { salida[p] = salida[p + 1] = salida[p + 2] = 255; total++; }
}
await sharp(salida, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
console.log(`ok ${out}: ${total} px`);
