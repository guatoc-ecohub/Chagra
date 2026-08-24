/* sonda-siluetajag.mjs — perfil superior de silueta del jaguar en una captura.
   Uso: node sonda-siluetajag.mjs <capture.png> [x0 x1]
   Clasifica píxel-art = distinto del fondo (#efe7d4/#f7f1e2) con tolerancia,
   exige 3 píxeles no-fondo consecutivos hacia abajo (anti-aliasing).
   Reporta: por columna el y superior, y los ESCALONES (|dy|>=6 entre vecinas).
 */
import sharp from 'sharp';

const [, , pngPath, x0Arg, x1Arg] = process.argv;
if (!pngPath) { console.error('falta ruta'); process.exit(2); }

const img = sharp(pngPath);
const meta = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height, CH = info.channels;
const px = (x, y) => {
  const i = (y * W + x) * CH;
  return [data[i], data[i + 1], data[i + 2]];
};
const BGS = [[0xef, 0xe7, 0xd4], [0xf7, 0xf1, 0xe2]];
const TOL = 14;
const isBg = (x, y) => {
  const [r, g, b] = px(x, y);
  return BGS.some(([br, bg2, bb]) => Math.abs(r - br) <= TOL && Math.abs(g - bg2) <= TOL && Math.abs(b - bb) <= TOL);
};
const topArt = (x) => {
  for (let y = 0; y < H - 3; y++) {
    if (!isBg(x, y) && !isBg(x, y + 1) && !isBg(x, y + 2)) return y;
  }
  return -1;
};

const x0 = x0Arg ? parseInt(x0Arg) : Math.floor(W * 0.12);
const x1 = x1Arg ? parseInt(x1Arg) : Math.floor(W * 0.88);
const col = [];
for (let x = x0; x <= x1; x++) col.push([x, topArt(x)]);

const validos = col.filter(([, y]) => y >= 0);
if (!validos.length) { console.log('SIN-ARTE-DETECTADO'); process.exit(1); }

// bandas: columnas cuyo top está en la zona de texto (y<70) se listan aparte
const texto = validos.filter(([, y]) => y < 70).length;
console.log(`# ${pngPath} ${W}x${H} cols=${validos.length} (ventana x ${x0}-${x1})`);
console.log(`# columnas con top y<70 (posible rótulo/texto): ${texto}`);

// escalones: comparar vecinos válidos consecutivos
const pasos = [];
for (let i = 1; i < validos.length; i++) {
  const [xa, ya] = validos[i - 1];
  const [xb, yb] = validos[i];
  if (xb - xa !== 1) continue;
  const d = yb - ya;
  if (Math.abs(d) >= 6) pasos.push({ x: xb, dy: d, de: ya, a: yb });
}
if (!pasos.length) console.log('ESCALONES(>=6px): ninguno');
else {
  console.log('ESCALONES(>=6px):');
  for (const p of pasos) console.log(`  x=${p.x} dy=${p.dy} (${p.de}->${p.a})`);
}

// perfil muestreado cada 10px para inspección
let linea = '# perfil (x:y) ';
for (let i = 0; i < validos.length; i += 10) linea += `${validos[i][0]}:${validos[i][1]} `;
console.log(linea);
