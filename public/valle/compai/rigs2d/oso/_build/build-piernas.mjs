/**
 * build-piernas — hornea las DOS piernas del oso bípedo (lienzo 615×630):
 *   pierna-cercana.png  viewer-izq, separada LIMPIA (silueta + garras por
 *                       relleno de huecos del contorno de tinta)
 *   pierna-ocluida.png  viewer-der, raíz del muslo más comida por la panza
 * La banda de raíz (fade) lleva piel real de la panza: en reposo el cuerpo
 * la tapa (respaldo de cadera) y al rotar desde la cadera no se abre fondo.
 * Cero redibujo: cada píxel sale de la lámina.
 */
import {
  cargarLamina, capa, idx, guardarPNG, debugCrop, mascaraPierna, PIERNAS, OUT,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();

for (const clave of ['cercana', 'ocluida']) {
  const m = mascaraPierna(sd, W, H, clave);
  const buf = capa(W, H);
  let px = 0;
  for (let p = 0; p < W * H; p++) {
    const mv = m[p];
    if (mv <= 0.004) continue;
    const i = p * 4;
    if (!sd[i + 3]) continue;
    buf[i] = sd[i]; buf[i + 1] = sd[i + 1]; buf[i + 2] = sd[i + 2];
    buf[i + 3] = sd[i + 3] * mv;
    px++;
  }
  console.log(`pierna-${clave}: ${px} px con alfa`);
  await guardarPNG(buf, W, H, `${OUT}/pierna-${clave}.png`);
  const R = PIERNAS[clave].region;
  await debugCrop(buf, W, H, [R.x0 - 6, R.y0 - 6, R.x1 - R.x0 + 12, Math.min(R.y1 - R.y0 + 12, H - R.y0)], 2, `${OUT}/_build/crops/dbg-${clave}.png`);
}
