/**
 * build-patas — hornea las DOS patas traseras de la zarigüeya bípeda (lienzo
 * 481×444) y la pieza de COLA prensil:
 *   pata-ocluida.png   viewer-izq (pie x145-225 y378-408, punta izquierda;
 *                      muslo comido por el flanco — raíz por polilínea)
 *   pata-cercana.png   viewer-der (el pie grande hasta y≈441, completo)
 *   cola.png           la banda aprobada del corte cuerpo/cola (x≈352±16,
 *                      todo el rulo prensil + base peluda repartida como
 *                      respaldo) MENOS el blob de la pata cercana
 * La banda de raíz lleva piel real del muslo/panza: en reposo el cuerpo la
 * tapa exacto (respaldo de cadera) y al rotar desde la cadera no se abre
 * fondo. Cero redibujo: cada píxel sale de la lámina.
 */
import {
  cargarLamina, capa, guardarPNG, debugCrop, mascaraPata, mascaraColaPieza,
  PATAS, OUT,
} from './lib.mjs';

const { sd, W, H } = await cargarLamina();

const pintar = (m) => {
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
  return { buf, px };
};

const masc = {};
for (const clave of ['ocluida', 'cercana']) {
  masc[clave] = mascaraPata(sd, W, H, clave);
  const { buf, px } = pintar(masc[clave]);
  console.log(`pata-${clave}: ${px} px con alfa`);
  await guardarPNG(buf, W, H, `${OUT}/pata-${clave}.png`);
  const R = PATAS[clave].region;
  await debugCrop(buf, W, H, [Math.max(0, R.x0 - 6), Math.max(0, R.y0 - 6), Math.min(R.x1 - R.x0 + 12, W - R.x0 + 6), Math.min(R.y1 - R.y0 + 12, H - R.y0 + 6)], 2, `${OUT}/_build/crops/dbg-pata-${clave}.png`);
}

{
  const m = mascaraColaPieza(sd, W, H, masc.cercana);
  const { buf, px } = pintar(m);
  console.log(`cola: ${px} px con alfa`);
  await guardarPNG(buf, W, H, `${OUT}/cola.png`);
  await debugCrop(buf, W, H, [320, 190, 161, 254], 2, `${OUT}/_build/crops/dbg-cola.png`);
}
