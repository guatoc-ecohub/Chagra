/**
 * test-articulacion — compone poses con las piezas ROTADAS sobre sus pivotes
 * (bilineal, en float) para probar los respaldos: al balancear piernas y
 * gesticular el brazo no debe abrirse fondo ni quedar fantasmas.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sharp = require('/home/kortux/Workspace/chagra/node_modules/sharp');
import { cargarLamina, capa, mascaraCorona, PIERNAS, BRAZO, OUT } from './lib.mjs';
const { sd, W, H } = await cargarLamina();
const png = async (r) => (await sharp(r).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;

const roca = await png(`${OUT}/roca.png`);
const cuerpo = await png(`${OUT}/cuerpo-inpaint.png`);
const po = await png(`${OUT}/pierna-ocluida.png`);
const pc = await png(`${OUT}/pierna-cercana.png`);
const brazo = await png(`${OUT}/brazo-baston.png`);
const corona = capa(W, H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x, i = p * 4, m = mascaraCorona(x, y);
  if (!sd[i + 3] || m <= 0.004) continue;
  corona[i] = sd[i]; corona[i + 1] = sd[i + 1]; corona[i + 2] = sd[i + 2];
  corona[i + 3] = sd[i + 3] * m;
}

/** rota una capa RGBA ang° alrededor de (px,py), bilineal */
function rotar(src, ang, [pxv, pyv]) {
  const out = capa(W, H);
  const c = Math.cos((-ang * Math.PI) / 180), s = Math.sin((-ang * Math.PI) / 180);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - pxv, dy = y - pyv;
    const sx = pxv + c * dx - s * dy, sy = pyv + s * dx + c * dy;
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) continue;
    const fx = sx - x0, fy = sy - y0;
    const i = (y * W + x) * 4;
    for (let ch = 0; ch < 4; ch++) {
      const v00 = src[(y0 * W + x0) * 4 + ch], v10 = src[(y0 * W + x0 + 1) * 4 + ch];
      const v01 = src[((y0 + 1) * W + x0) * 4 + ch], v11 = src[((y0 + 1) * W + x0 + 1) * 4 + ch];
      out[i + ch] = (v00 * (1 - fx) + v10 * fx) * (1 - fy) + (v01 * (1 - fx) + v11 * fx) * fy;
    }
  }
  return out;
}

function componer(capas) {
  const comp = new Float32Array(W * H * 4);
  for (const cb of capas) for (let p = 0; p < W * H; p++) {
    const i = p * 4, aS = cb[i + 3] / 255;
    if (aS <= 0) continue;
    const aD = comp[i + 3], na = aS + aD * (1 - aS);
    for (let c = 0; c < 3; c++) comp[i + c] = (cb[i + c] * aS + comp[i + c] * aD * (1 - aS)) / na;
    comp[i + 3] = na;
  }
  const out = capa(W, H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    out[i] = comp[i]; out[i + 1] = comp[i + 1]; out[i + 2] = comp[i + 2];
    out[i + 3] = comp[i + 3] * 255;
  }
  return out;
}

async function guardarPose(nombre, capas) {
  const out = componer(capas);
  const fondo = Buffer.alloc(W * H * 4);
  for (let i = 0; i < fondo.length; i += 4) { fondo[i] = 244; fondo[i + 1] = 240; fondo[i + 2] = 232; fondo[i + 3] = 255; }
  const plano = await sharp(fondo, { raw: { width: W, height: H, channels: 4 } })
    .composite([{ input: out, raw: { width: W, height: H, channels: 4 } }]).png().toBuffer();
  await sharp(plano).toFile(`${OUT}/_build/crops/pose-${nombre}.png`);
  console.log('pose', nombre);
}

// pose A: zancada (roca suelta — marcha): cercana adelante, ocluida atrás
{
  const pcR = rotar(pc, -16, PIERNAS.cercana.cadera);
  const poR = rotar(po, 13, PIERNAS.ocluida.cadera);
  await guardarPose('zancada', [cuerpo, poR, pcR, brazo, corona]);
}
// pose B: gesto con el bastón (brazo levantado 9°, corona viaja con él)
{
  const brR = rotar(brazo, 9, BRAZO.hombro);
  const coR = rotar(corona, 9, BRAZO.hombro);
  await guardarPose('gesto', [roca, cuerpo, po, pc, brR, coR]);
}
// pose C: paso corto CON roca (cambio de peso idle)
{
  const pcR = rotar(pc, -6, PIERNAS.cercana.cadera);
  const poR = rotar(po, 5, PIERNAS.ocluida.cadera);
  await guardarPose('idle', [roca, cuerpo, poR, pcR, brazo, corona]);
}
