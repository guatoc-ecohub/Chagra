#!/usr/bin/env node
// tabla-fps-md.mjs — convierte el JSON de medir-fps-mundos.mjs en una tabla
// Markdown pivotada (una fila por mundo, columnas por rate). Uso:
//   node scripts/tabla-fps-md.mjs ops/informes/fps-mundos-2026-07-22.json
import { readFileSync } from 'node:fs';

const path = process.argv[2];
if (!path) { console.error('Uso: node tabla-fps-md.mjs <json>'); process.exit(1); }
const data = JSON.parse(readFileSync(path, 'utf8'));
const { resultados, rates } = data;

const porSlug = new Map();
for (const r of resultados) {
  if (!porSlug.has(r.slug)) porSlug.set(r.slug, { nombre: r.nombre, familia: r.familia, porRate: {} });
  porSlug.get(r.slug).porRate[r.rate] = r;
}

function celda(r) {
  if (!r) return '—';
  if (r.status === 'ok') {
    return `${r.fpsAvg} (p5 ${r.fpsP5} / p95 ${r.fpsP95}), peor ${r.worstFrameMs}ms`;
  }
  if (r.status && r.status.startsWith('medido-parcial')) return `${r.fpsAvg ?? 0} fps (parcial: ${r.framesCapturados} frames)`;
  if (r.status && r.status.startsWith('ABORTADO')) return `ABORTADO (${r.renderer})`;
  if (r.status && r.status.startsWith('sin-canvas-3d')) return 'sin Canvas 3D (¿fallback 2D?)';
  if (r.status && r.status.startsWith('no-carga')) return 'NO CARGA';
  if (r.status && r.status.startsWith('ruta-no-existe')) return 'RUTA ARCHIVADA (ya no existe)';
  if (r.status === 'error') return `error: ${r.error}`;
  return r.status || '—';
}

const familias = {};
for (const [slug, info] of porSlug) {
  familias[info.familia] = familias[info.familia] || [];
  familias[info.familia].push([slug, info]);
}

const ORDEN_FAMILIA = ['valle', 'vivo', 'mundo', 'legacy', 'demo', 'vitrina', 'juego'];
const NOMBRE_FAMILIA = {
  valle: 'El valle y variantes', vivo: 'Mundos "Vivo3D"', mundo: 'Mundos nuevos (Mundo*3D)',
  legacy: 'Mundos legacy (framework <Mundo>)', demo: 'Demos / utilidades 3D', vitrina: 'Vitrinas', juego: 'Juegos',
};

let out = '';
for (const fam of ORDEN_FAMILIA) {
  const items = familias[fam];
  if (!items) continue;
  out += `\n### ${NOMBRE_FAMILIA[fam] || fam}\n\n`;
  out += `| Mundo | ${rates.map((r) => `${r}x`).join(' | ')} | draw calls (1x) | triángulos (1x) | geom/tex (1x) | 1er frame (1x) | heap MB (1x) |\n`;
  out += `|---|${rates.map(() => '---').join('|')}|---|---|---|---|---|\n`;
  for (const [slug, info] of items) {
    const r1 = info.porRate[1];
    const fila = rates.map((rt) => celda(info.porRate[rt])).join(' | ');
    const dc = r1 && r1.status === 'ok' ? r1.drawCallsAvg : '—';
    const tri = r1 && r1.status === 'ok' ? r1.trianglesAvg : '—';
    const gt = r1 && r1.status === 'ok' ? `${r1.geometrias}/${r1.texturas}` : '—';
    const ff = r1 && r1.tiempoPrimerFrameMs != null ? `${r1.tiempoPrimerFrameMs}ms` : '—';
    const heap = r1 && r1.jsHeapMB != null ? r1.jsHeapMB : '—';
    out += `| \`${slug}\` — ${info.nombre} | ${fila} | ${dc} | ${tri} | ${gt} | ${ff} | ${heap} |\n`;
  }
}

console.log(out);
