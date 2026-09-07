// movimiento.mjs — ¿la escena se MUEVE? Extrae fotogramas del video de la captura (los últimos
// 22 s: 16 con el boletín encima + 6 de la escena sola), arma una tira de contacto y mide la
// diferencia media por píxel entre fotogramas separados 4 s. Un fondo quieto da ~0; una escena
// viva da varios niveles de gris. Uso: node movimiento.mjs <video.webm> <salida-tira.png> [seg]
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const sharp = createRequire(import.meta.url)('/home/kortux/Workspace/chagra/node_modules/sharp/dist/index.cjs');

const [, , video, salida, segStr = '22'] = process.argv;
const seg = Number(segStr);
const dur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video]).toString().trim());
const t0 = Math.max(0, dur - seg);
const tmp = fs.mkdtempSync('/tmp/movimiento-');
const tiempos = [0, 4, 8, 12, 16, 19.5].map((t) => t0 + t).filter((t) => t < dur - 0.2);
const cuadros = tiempos.map((t, i) => {
  const f = path.join(tmp, `f${i}.png`);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(t), '-i', video, '-frames:v', '1', f]);
  return f;
});
const grises = await Promise.all(cuadros.map((f) => sharp(f).greyscale().raw().toBuffer({ resolveWithObject: true })));
const diffs = [];
for (let i = 1; i < grises.length; i++) {
  const a = grises[i - 1].data, b = grises[i].data; let sum = 0, n = 0, cambiados = 0;
  for (let k = 0; k < a.length; k++) { const d = Math.abs(a[k] - b[k]); sum += d; n++; if (d > 6) cambiados++; }
  diffs.push({ de: tiempos[i - 1].toFixed(1), a: tiempos[i].toFixed(1), difMedia: +(sum / n).toFixed(2), pctPixelesCambiados: +(100 * cambiados / n).toFixed(1) });
}
const meta = await sharp(cuadros[0]).metadata();
const w = meta.width, h = meta.height;
await sharp({ create: { width: w * cuadros.length, height: h, channels: 3, background: '#000' } })
  .composite(cuadros.map((f, i) => ({ input: f, left: i * w, top: 0 })))
  .png().toFile(salida);
console.log(JSON.stringify({ video, duracion: +dur.toFixed(1), fotogramas: tiempos.map((t) => +t.toFixed(1)), diffs, tira: salida }, null, 2));
