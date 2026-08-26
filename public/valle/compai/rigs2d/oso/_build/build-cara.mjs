/**
 * build-cara — kit de cabeza pre-horneado para el rig 2.5D (Rive/valle),
 * puerto 1:1 de las máscaras APROBADAS de osoLamina/capas.js — acá no se
 * corta cuello/cabeza distinto, solo se materializa lo aprobado:
 *   cara.png        cabeza-render: cabeza completa MENOS orejas (solo su
 *                   parte alta `baseSub` — la base queda de respaldo) y
 *                   MENOS mandíbula (restas DURAS, cero costura)
 *   oreja-izq.png / oreja-der.png   piezas de oreja (pivote en su base)
 *   corona.png      la corona del bastón (en el rig nuevo viaja como HIJA
 *                   del brazo+bastón — el palo es de brazo-baston.png)
 */
import {
  cargarLamina, capa, idx, guardarPNG, debugCrop, hard,
  mascaraCabeza, mascaraOreja, mascaraOrejaSub, mascaraMandibula, mascaraCorona,
  OREJA_IZQ, OREJA_DER, OUT,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();

const hornear = async (nombre, mask, box) => {
  const buf = capa(W, H);
  let px = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const m = mask(x, y);
    if (m <= 0.004) continue;
    const i = idx(W, x, y);
    if (!sd[i + 3]) continue;
    buf[i] = sd[i]; buf[i + 1] = sd[i + 1]; buf[i + 2] = sd[i + 2];
    buf[i + 3] = sd[i + 3] * m;
    px++;
  }
  console.log(nombre, px, 'px');
  await guardarPNG(buf, W, H, `${OUT}/${nombre}.png`);
  if (box) await debugCrop(buf, W, H, box, 2, `${OUT}/_build/crops/dbg-${nombre}.png`);
};

const mMand = (x, y) => mascaraMandibula(x, y) * mascaraCabeza(x, y);
await hornear('cara', (x, y) => mascaraCabeza(x, y)
  * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
  * hard(mMand(x, y)), [195, 0, 260, 230]);
await hornear('oreja-izq', (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mascaraCabeza(x, y), null);
await hornear('oreja-der', (x, y) => mascaraOreja(x, y, OREJA_DER) * mascaraCabeza(x, y), null);
await hornear('corona', (x, y) => mascaraCorona(x, y), [455, 0, 160, 210]);
