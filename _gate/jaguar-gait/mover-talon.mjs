/* Cirugía de registro del set de arte: el talón de la zarpa delantera lejana
 * quedó horneado en cuerpo-inpaint.png (isla ~454px en (109,354)-(127,385)) —
 * el inpaint no lo borró. Como el cuerpo es ESTÁTICO y la pata se mueve, ese
 * talón flota a nivel de suelo durante la marcha.
 *
 * Arreglo: mover la isla al PNG de la pata (misma registración 705×394):
 *   pata_nueva = zarpa ENCIMA de la isla  (la isla queda DEBAJO, como cuando
 *                era cuerpo: el orden z vivo es cuerpo < pata-del-lejana)
 *   cuerpo_nuevo = cuerpo con la isla borrada (alfa 0)
 * En reposo el compuesto es idéntico píxel a píxel (se verifica acá mismo);
 * en marcha el talón viaja con la pata.
 *
 *   node mover-talon.mjs         # aplica + verifica (escribe los 2 PNG)
 */
import sharp from 'sharp';

const DIR = 'public/compai/laminas/jaguar-rig/';
const CUERPO = DIR + 'cuerpo-inpaint.png';
const PATA = DIR + 'pata-del-lejana.png';

const leer = async (p) => sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

const cuerpo = await leer(CUERPO);
const pata = await leer(PATA);
const { width: W, height: H } = cuerpo.info;
if (W !== 705 || H !== 394) throw new Error(`lienzo inesperado ${W}x${H}`);

/* Isla del talón: flood-fill con umbral alfa>=1 sembrado DENTRO de la caja
 * conocida; se exige que el resultado quede contenido en una caja de guarda
 * (si tocara el cuerpo principal, abortar en vez de mutilar). */
const GUARDA = { x0: 100, y0: 344, x1: 140, y1: 394 };
const d = cuerpo.data;
const vis = new Uint8Array(W * H);
const isla = [];
const stack = [];
for (let y = 350; y < 390; y++) {
  for (let x = 105; x < 132; x++) {
    if (d[(y * W + x) * 4 + 3] >= 1) stack.push(y * W + x);
  }
}
while (stack.length) {
  const i = stack.pop();
  if (vis[i]) continue;
  vis[i] = 1;
  const ix = i % W;
  const iy = (i / W) | 0;
  if (ix < GUARDA.x0 || ix > GUARDA.x1 || iy < GUARDA.y0 || iy > GUARDA.y1) {
    throw new Error(`la isla se sale de la caja de guarda en (${ix},${iy}) — NO es el talón suelto; abortando`);
  }
  isla.push(i);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = ix + dx; const ny = iy + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
    const j = ny * W + nx;
    if (!vis[j] && d[j * 4 + 3] >= 1) stack.push(j);
  }
}
console.log('isla del talón:', isla.length, 'px');
if (isla.length < 300 || isla.length > 1500) throw new Error('tamaño de isla fuera de lo esperado');

/* Capa suelta con solo la isla. */
const islaBuf = Buffer.alloc(W * H * 4);
for (const i of isla) for (let c = 0; c < 4; c++) islaBuf[i * 4 + c] = d[i * 4 + c];

/* pata_nueva = zarpa ENCIMA de la isla. */
const pataNueva = await sharp(islaBuf, { raw: { width: W, height: H, channels: 4 } })
  .composite([{ input: pata.data, raw: { width: W, height: H, channels: 4 }, blend: 'over' }])
  .raw().toBuffer();

/* cuerpo_nuevo = cuerpo sin la isla. */
const cuerpoNuevo = Buffer.from(d);
for (const i of isla) for (let c = 0; c < 4; c++) cuerpoNuevo[i * 4 + c] = 0;

/* Verificación de reposo: pata OVER cuerpo, antes vs después, idéntico (±2 de
 * redondeo de composición u8). */
const compo = async (abajo, arriba) => sharp(abajo, { raw: { width: W, height: H, channels: 4 } })
  .composite([{ input: arriba, raw: { width: W, height: H, channels: 4 }, blend: 'over' }])
  .raw().toBuffer();
const antes = await compo(Buffer.from(d), pata.data);
const despues = await compo(cuerpoNuevo, pataNueva);
let peor = 0;
for (let i = 0; i < antes.length; i++) peor = Math.max(peor, Math.abs(antes[i] - despues[i]));
console.log('compuesto de reposo, delta máximo por canal:', peor);
if (peor > 2) throw new Error('el compuesto de reposo cambió — abortando sin escribir');

await sharp(cuerpoNuevo, { raw: { width: W, height: H, channels: 4 } }).png().toFile(CUERPO);
await sharp(pataNueva, { raw: { width: W, height: H, channels: 4 } }).png().toFile(PATA);
console.log('escritos', CUERPO, 'y', PATA);
