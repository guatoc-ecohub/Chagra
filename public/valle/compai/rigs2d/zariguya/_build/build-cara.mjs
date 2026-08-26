/**
 * build-cara — kit de cabeza pre-horneado para el rig 2.5D, puerto 1:1 de
 * las máscaras APROBADAS de zariguyaLamina/capas.js (umbral 0,996) — acá no
 * se corta cuello/cabeza distinto, solo se materializa lo aprobado:
 *   cara.png        cabeza-render: cabeza (recta del cuello + fade de pecho,
 *                   CARA INTACTA cara-safe) MENOS orejas (solo su parte alta
 *                   `baseSub` — la base queda de respaldo) MENOS mandíbula,
 *                   restas DURAS; excluye brazos DURO (el lápiz roza el
 *                   canal de los bigotes)
 *   oreja-izq.png / oreja-der.png   piezas de oreja (pivotes [118,86]/[258,56])
 *   brazo-lapiz.png / brazo-brujula.png   los brazos por PRIMITIVAS aprobadas
 *                   (cápsula/elipse/disco) — piezas del runtime materializadas
 *                   para que el set sea autosuficiente en Rive/kart
 */
import {
  cargarLamina, capa, idx, guardarPNG, debugCrop, hard,
  mCabezaFull, mascaraOreja, mascaraOrejaSub, mascaraMandibula,
  mascaraBrazoLapiz, mBrazoBrujulaPieza,
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

const mMand = (x, y) => mascaraMandibula(x, y) * mCabezaFull(x, y);
await hornear('cara', (x, y) => mCabezaFull(x, y)
  * hard(mascaraOrejaSub(x, y, OREJA_IZQ)) * hard(mascaraOrejaSub(x, y, OREJA_DER))
  * hard(mMand(x, y)), [70, 0, 240, 240]);
await hornear('oreja-izq', (x, y) => mascaraOreja(x, y, OREJA_IZQ) * mCabezaFull(x, y), null);
await hornear('oreja-der', (x, y) => mascaraOreja(x, y, OREJA_DER) * mCabezaFull(x, y), null);
await hornear('brazo-lapiz', (x, y) => mascaraBrazoLapiz(x, y), [0, 110, 200, 170]);
await hornear('brazo-brujula', (x, y) => mBrazoBrujulaPieza(x, y), [70, 210, 150, 110]);
