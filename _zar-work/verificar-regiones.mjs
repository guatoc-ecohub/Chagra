// Render coloured region overlays on top of the parada lamina for visual
// alignment check (debug-only, not committed).
import { writeFileSync } from 'node:fs';

const PIVOTES = {
  columna: [190, 480],
  cuello: [190, 260],
  cabeza: [190, 155],
  mandibula: [195, 235],
  orejaI: [75, 45],
  orejaD: [290, 45],
  colaBase: [225, 745],
  colaMedia: [370, 760],
  colaPunta: [480, 780],
};

const REGIONES = {
  cabeza: [[5, -15], [365, -15], [365, 270], [5, 270]],
  orejaI: [[10, -15], [140, -15], [140, 95], [10, 95]],
  orejaD: [[225, -15], [360, -15], [360, 95], [225, 95]],
  mandibula: [[130, 195], [260, 195], [260, 270], [130, 270]],
  cuello: [[60, 220], [330, 220], [330, 330], [60, 330]],
  troncoCuerpo: [[0, 250], [400, 250], [400, 850], [0, 850]],
  colaBase: [[170, 700], [290, 700], [290, 790], [170, 790]],
  colaMedia: [[260, 720], [420, 720], [420, 820], [260, 820]],
  colaPunta: [[390, 740], [564, 740], [564, 889], [390, 889]],
};

const COLORS = {
  cabeza: '#ff000055', orejaI: '#00ff0088', orejaD: '#0000ff88',
  mandibula: '#ffff0099', cuello: '#ff00ff66', troncoCuerpo: '#00ffff33',
  colaBase: '#ff880088', colaMedia: '#88ff0088', colaPunta: '#8800ff88',
};

const dPoly = (pts) => `M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`;

const polys = Object.entries(REGIONES)
  .map(([n, pts]) => `<path d="${dPoly(pts)}" fill="${COLORS[n]}" stroke="#000" stroke-width="1.5"/>`)
  .join('\n');
const pivots = Object.entries(PIVOTES)
  .map(([n, [x, y]]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#000" stroke-width="1.5"/><text x="${x + 7}" y="${y - 7}" font-size="14" fill="#000" stroke="#fff" stroke-width="0.3">${n}</text>`)
  .join('\n');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="564" height="889" viewBox="-20 -20 604 929">
<image href="zariguya-parada-alpha.png" x="0" y="0" width="564" height="889"/>
${polys}
${pivots}
</svg>`;

writeFileSync(new URL('./regiones-overlay.svg', import.meta.url), svg);
console.log('wrote regiones-overlay.svg');
