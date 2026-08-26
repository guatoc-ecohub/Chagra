/**
 * build-brazo — hornea `brazo-baston.png`: deltoide + bíceps + zarpa que
 * empuña + palo + orquídeas y tallos, UNA pieza (la zarpa va encima del palo
 * y las orquídeas se funden con él: separarlos no tiene señal — la lección
 * documentada en osoLamina/anatomia.js). La CORONA queda pieza aparte
 * aprobada: aquí se le deja el arranque del palo de respaldo
 * (`hard(mascaraCoronaSub)`) y en el rig viaja como HIJA del brazo.
 * Cero redibujo: cada píxel sale de la lámina.
 */
import {
  cargarLamina, capa, guardarPNG, debugCrop, mascaraBrazoBaston,
  mascaraCoronaSub, hard, OUT,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();
const m = mascaraBrazoBaston(sd, W, H);

const buf = capa(W, H);
let px = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  const mv = m[p] * hard(mascaraCoronaSub(x, y));
  if (mv <= 0.004) continue;
  const i = p * 4;
  if (!sd[i + 3]) continue;
  buf[i] = sd[i]; buf[i + 1] = sd[i + 1]; buf[i + 2] = sd[i + 2];
  buf[i + 3] = sd[i + 3] * mv;
  px++;
}
console.log(`brazo-baston: ${px} px con alfa`);
await guardarPNG(buf, W, H, `${OUT}/brazo-baston.png`);
await debugCrop(buf, W, H, [380, 120, 235, 410], 2, `${OUT}/_build/crops/dbg-brazo.png`);
