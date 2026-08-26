import {
  cargarLamina, idx, hard, mascaraPierna, mascaraBrazoBaston, mascaraCorona,
  mascaraCoronaSub, mascaraCabeza, regionRoca, interpolarX, BRAZO, sharp, OUT,
} from './lib.mjs';
const { sd, W, H } = await cargarLamina();
const mPC = mascaraPierna(sd, W, H, 'cercana');
const mPO = mascaraPierna(sd, W, H, 'ocluida');
const mB = mascaraBrazoBaston(sd, W, H);
const png = async (r) => (await sharp(r).ensureAlpha().raw().toBuffer({ resolveWithObject: true })).data;
const cuerpo = await png(`${OUT}/cuerpo-inpaint.png`);
const brazo = await png(`${OUT}/brazo-baston.png`);
const pc = await png(`${OUT}/pierna-cercana.png`);
const po = await png(`${OUT}/pierna-ocluida.png`);
const dif = await png(`${OUT}/_build/crops/dbg-dif.png`);
// junta puntos de cada color del dif
const puntos = { rojo: [], verde: [], azul: [] };
for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x += 3) {
  const i = (y * W + x) * 4;
  if (!dif[i + 3]) continue;
  if (dif[i] > 200 && puntos.rojo.length < 6) puntos.rojo.push([x, y]);
  if (dif[i + 1] > 200 && puntos.verde.length < 6) puntos.verde.push([x, y]);
  if (dif[i + 2] > 200 && puntos.azul.length < 6) puntos.azul.push([x, y]);
}
for (const [tipo, pts] of Object.entries(puntos)) {
  console.log('──', tipo);
  for (const [x, y] of pts) {
    const p = y * W + x, i = p * 4;
    const xc = interpolarX(BRAZO.crease, y);
    console.log(`(${x},${y}) lam=[${sd[i]},${sd[i+1]},${sd[i+2]},${sd[i+3]}]`,
      `mPC=${mPC[p].toFixed(2)} mPO=${mPO[p].toFixed(2)} mB=${mB[p].toFixed(2)}`,
      `roca=${regionRoca(x,y).toFixed(2)} cab=${mascaraCabeza(x,y).toFixed(2)} corS=${mascaraCoronaSub(x,y).toFixed(2)} creaseX=${xc.toFixed(0)}`,
      `cuerpo.a=${cuerpo[i+3]} brazo.a=${brazo[i+3]} pc.a=${pc[i+3]} po.a=${po[i+3]}`,
      `cuerpo.rgb=[${cuerpo[i]},${cuerpo[i+1]},${cuerpo[i+2]}]`);
  }
}
