/**
 * test-articulacion — compone el rig completo en reposo (candado visual) y
 * poses con las piezas ROTADAS sobre sus pivotes (bilineal, float) para
 * probar los respaldos: al balancear patas, mecer/enroscar la cola y
 * gesticular los brazos no debe abrirse fondo ni quedar fantasmas.
 * Orden Z del runtime: cola → cuerpo → pata-ocluida → pata-cercana →
 * brazo-brújula → brazo-lápiz → cara → mandíbula/visema → orejas.
 */
import { capa, guardarPNG, PATAS, COLA, BRAZO_LAPIZ, BRAZO_BRUJULA, OUT, sharp } from './lib.mjs';

const png = async (r) => {
  const { data, info } = await sharp(r).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: data, W: info.width, H: info.height };
};
const { d: cola, W, H } = await png(`${OUT}/cola.png`);
const cuerpo = (await png(`${OUT}/cuerpo-inpaint.png`)).d;
const pataO = (await png(`${OUT}/pata-ocluida.png`)).d;
const pataC = (await png(`${OUT}/pata-cercana.png`)).d;
const brazoB = (await png(`${OUT}/brazo-brujula.png`)).d;
const brazoL = (await png(`${OUT}/brazo-lapiz.png`)).d;
const cara = (await png(`${OUT}/cara.png`)).d;
const mand = (await png(`${OUT}/mandibula-inferior.png`)).d;
const bocaAbierta = (await png(`${OUT}/boca-abierta.png`)).d;
const orejaI = (await png(`${OUT}/oreja-izq.png`)).d;
const orejaD = (await png(`${OUT}/oreja-der.png`)).d;

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

const caraSet = [cara, mand, orejaI, orejaD];

// reposo (candado visual: debe ser la lámina exacta) + a escala avatar
{
  await guardarPose('reposo', [cola, cuerpo, pataO, pataC, brazoB, brazoL, ...caraSet]);
  await sharp(`${OUT}/_build/crops/pose-reposo.png`).resize({ height: 300, kernel: 'lanczos3' })
    .toFile(`${OUT}/_build/crops/pose-reposo-avatar.png`);
}
// paso: ocluida adelante, cercana atrás (marcha del roaming)
{
  const pO = rotar(pataO, -12, PATAS.ocluida.cadera);
  const pC = rotar(pataC, 10, PATAS.cercana.cadera);
  await guardarPose('paso', [cola, cuerpo, pO, pC, brazoB, brazoL, ...caraSet]);
}
// cola prensil: enroscada hacia el cuerpo y desenroscada
{
  await guardarPose('cola-enrosca', [rotar(cola, -10, COLA.pivote), cuerpo, pataO, pataC, brazoB, brazoL, ...caraSet]);
  await guardarPose('cola-suelta', [rotar(cola, 8, COLA.pivote), cuerpo, pataO, pataC, brazoB, brazoL, ...caraSet]);
}
// gesto: escribe en el aire + consulta brújula + boca abierta (visema V3)
{
  const bL = rotar(brazoL, 6, BRAZO_LAPIZ.pivote);
  const bB = rotar(brazoB, -5, BRAZO_BRUJULA.pivote);
  await guardarPose('gesto', [cola, cuerpo, pataO, pataC, bB, bL, cara, bocaAbierta, orejaI, orejaD]);
}
// idle: cambio de peso corto
{
  const pO = rotar(pataO, -4, PATAS.ocluida.cadera);
  const pC = rotar(pataC, 4, PATAS.cercana.cadera);
  await guardarPose('idle', [rotar(cola, -4, COLA.pivote), cuerpo, pO, pC, brazoB, brazoL, ...caraSet]);
}
