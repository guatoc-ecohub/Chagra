/*
 * tira.mjs — arma una TIRA de cuadros (contact sheet) a partir de uno o más
 * resumen.json de capturar-secuencia.mjs, ordenados por el reloj de la página.
 * Cada cuadro lleva su etiqueta: t en ms, modo/fase, y «~» si el cuadro quedó
 * a caballo entre dos fases (la fase cambió mientras se tomaba la captura).
 *
 * Uso: node tira.mjs --out /tmp/tira.png --titulo "jaguar · mistico-sombra" --dir /tmp/es3/jaguar [--dir ...] [--porFila 6]
 */
/* global process, console, Buffer */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const dirs = []; let out = '/tmp/tira.png'; let titulo = ''; let porFila = 6;
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--dir') dirs.push(args[++i]);
  else if (args[i] === '--out') out = args[++i];
  else if (args[i] === '--titulo') titulo = args[++i];
  else if (args[i] === '--porFila') porFila = Number(args[++i]);
}
const cuadros = dirs.flatMap((d) => {
  const r = JSON.parse(readFileSync(join(d, 'resumen.json'), 'utf8'));
  return r.cuadros.map((c) => ({ ...c, png: join(d, `${String(c.tObjetivoMs).padStart(5, '0')}.png`), origen: d }));
}).sort((a, b) => a.tPaginaMs - b.tPaginaMs);

const W = 300; const H = 300; const ET = 34; const GAP = 6; const TIT = 40;
const cols = Math.min(porFila, cuadros.length); const filas = Math.ceil(cuadros.length / cols);
const ancho = cols * (W + GAP) + GAP; const alto = TIT + filas * (H + ET + GAP) + GAP;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const capas = [];
capas.push({ input: Buffer.from(`<svg width="${ancho}" height="${TIT}"><text x="10" y="27" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#e2e8f0">${esc(titulo)}</text></svg>`), left: 0, top: 0 });
cuadros.forEach((c, k) => {
  const col = k % cols; const fila = Math.floor(k / cols);
  const x = GAP + col * (W + GAP); const y = TIT + GAP + fila * (H + ET + GAP);
  capas.push({ input: c.png, left: x, top: y });
  const caballo = c.fase !== c.faseDespues ? ' ~' : '';
  const fase = c.modo ? `${c.modo}/${c.fase}` : 'sin envoltorio';
  const et = `<svg width="${W}" height="${ET}"><rect width="${W}" height="${ET}" fill="#0b1220"/><text x="6" y="14" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#cbd5e1">t=${c.tPaginaMs} ms${caballo}</text><text x="6" y="29" font-family="DejaVu Sans, sans-serif" font-size="12" fill="#a5b4fc">${esc(fase)}${c.ceMs ? ` · ${c.ceMs}` : ''}</text></svg>`;
  capas.push({ input: Buffer.from(et), left: x, top: y + H });
});
await sharp({ create: { width: ancho, height: alto, channels: 3, background: '#020617' } }).composite(capas).png().toFile(out);
console.log(`${out} ${ancho}x${alto} cuadros=${cuadros.length}`);
