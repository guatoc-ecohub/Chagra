// Normaliza capturas de sujetos (trazado 480x480 viewBox -20 -30 655 690;
// viva stage 468.57x480 con offset x 5.714) al espacio LÁMINA 615x630.
// Uso: node _gate/ot-normaliza.mjs <trazado|viva> in.png out.png
import sharp from 'sharp';

const [sujeto, inp, out] = process.argv.slice(2);
if (!sujeto || !inp || !out) { console.error('USO: ot-normaliza <trazado|viva> in.png out.png'); process.exit(2); }
const S_LAM_W = 615, S_LAM_H = 630;
let left, top, width, height;
if (sujeto === 'trazado') {
  const s = 480 / 690;
  left = 20 * s; top = 30 * s; width = S_LAM_W * s; height = S_LAM_H * s;
} else {
  const s = 480 / 630;
  left = (480 - S_LAM_W * s) / 2; top = 0; width = S_LAM_W * s; height = S_LAM_H * s;
}
await sharp(inp)
  .extract({ left: Math.round(left), top: Math.round(top), width: Math.round(width), height: Math.round(height) })
  .resize(S_LAM_W, S_LAM_H, { kernel: 'cubic' })
  .png().toFile(out);
console.log(`ok ${out} (caja ${Math.round(left)},${Math.round(top)},${Math.round(width)},${Math.round(height)} → 615x630)`);
