/*
 * conectividad.mjs — instrumento OBJETIVO del gate de decapitación (el juez VL
 * no sabe juzgar conectividad espacial cabeza↔cuerpo en este estilo: falló su
 * control positivo dos veces; doctrina de la casa: la geometría se prueba con
 * sharp, no con el juez).
 *
 * Método: binariza figura-vs-fondo (distancia de color al fondo muestreado en
 * la esquina, umbral POR ENCIMA del halo del aura/glow (a 60 el halo puentea el hueco: medido)), toma una semilla en la
 * zona de la CABEZA (figura más cercana al punto 50%,22% de la imagen) y otra
 * en la zona del CUERPO (50%,72%), y hace flood-fill 4-conexo desde la cabeza:
 * si alcanza la semilla del cuerpo → CONECTADA (cuello continuo de verdad,
 * al nivel de píxeles). Sobre el control de decapitación DURA debe dar
 * SEPARADA — eso valida el instrumento en la misma corrida.
 *
 *   node conectividad.mjs <img1.png> [img2.png ...]
 */
import sharp from 'sharp';

const UMBRAL = Number(process.env.UMBRAL || 140);

async function analizar(ruta) {
  const { data, info } = await sharp(ruta).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const idx = (x, y) => (y * W + x) * 4;
  const bg = [data[idx(4, 4)], data[idx(4, 4) + 1], data[idx(4, 4) + 2]];
  const esFigura = (x, y) => {
    const o = idx(x, y);
    return (Math.abs(data[o] - bg[0]) + Math.abs(data[o + 1] - bg[1]) + Math.abs(data[o + 2] - bg[2])) > UMBRAL;
  };
  const semilla = (fx, fy) => {
    const cx = Math.round(W * fx);
    const cy = Math.round(H * fy);
    let mejor = null;
    let mejorD = Infinity;
    for (let y = 2; y < H - 2; y += 2) {
      for (let x = 2; x < W - 2; x += 2) {
        if (!esFigura(x, y)) continue;
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < mejorD) { mejorD = d; mejor = [x, y]; }
      }
    }
    return mejor;
  };
  const sCabeza = semilla(0.5, 0.22);
  const sCuerpo = semilla(0.5, 0.72);
  if (!sCabeza || !sCuerpo) return { ruta, error: 'sin semillas' };
  /* flood fill 4-conexo desde la cabeza */
  const visto = new Uint8Array(W * H);
  const cola = [sCabeza];
  visto[sCabeza[1] * W + sCabeza[0]] = 1;
  let alcanzaCuerpo = false;
  let tam = 0;
  while (cola.length) {
    const [x, y] = cola.pop();
    tam++;
    if (x === sCuerpo[0] && y === sCuerpo[1]) alcanzaCuerpo = true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const k = ny * W + nx;
      if (visto[k] || !esFigura(nx, ny)) continue;
      visto[k] = 1;
      cola.push([nx, ny]);
    }
  }
  /* si el flood no pisó exactamente la semilla del cuerpo, mirar si quedó
     dentro del componente visitado (la semilla puede caer en borde par) */
  if (!alcanzaCuerpo) alcanzaCuerpo = !!visto[sCuerpo[1] * W + sCuerpo[0]];
  return { ruta, semCabeza: sCabeza, semCuerpo: sCuerpo, pixeles: tam, veredicto: alcanzaCuerpo ? 'CONECTADA' : 'SEPARADA' };
}

for (const ruta of process.argv.slice(2)) {
  console.log(JSON.stringify(await analizar(ruta)));
}
