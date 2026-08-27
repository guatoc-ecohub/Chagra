#!/usr/bin/env node
/*
 * generar-calco (zarigüeya) — hornea el AUTO-TRAZADO de la lámina en un
 * módulo JS plano, PARTIDO POR REGIÓN DE HUESO. Copia EXACTA del patrón de
 * `jaguarTrazado/generar-calco.mjs` (la receta que SÍ funcionó — ver ahí el
 * porqué del split-por-región: sin partir, cada `<use>` re-renderiza TODO
 * el calco y el framerate se cae).
 *
 * Pipeline (documentado para reproducir el calco desde cero):
 *   0. Lámina fuente: `zariguya-parada-limpia.png` (1075×992, SIN alfa —
 *      Gemini la entrega sobre papel blanco opaco). Se le quita el fondo
 *      (flood-fill de las 4 esquinas + trim) para tener alfa real:
 *        magick zariguya-parada-limpia.png -alpha set -bordercolor white \
 *          -border 1 -fuzz 4% -fill none -draw "alpha 0,0 floodfill" \
 *          -fuzz 4% -fill none -draw "alpha %[fx:w-1],0 floodfill" \
 *          -fuzz 4% -fill none -draw "alpha 0,%[fx:h-1] floodfill" \
 *          -fuzz 4% -fill none -draw "alpha %[fx:w-1],%[fx:h-1] floodfill" \
 *          -shave 1x1 -trim +repage zariguya-parada-alpha.png   (→ 564×889)
 *   1. bash scripts/trazar-lamina.sh zariguya-parada-alpha.png \
 *        zariguya-parada-trace.svg
 *      → receta clavada del jaguar: aplanar sobre papel + vtracer stacked
 *        spline cp8 speckle2 gs8 + clipPath vectorial del canal alfa. La
 *        silueta usa potrace (fix 2026-08-25: vtracer bw con fill-rule
 *        forzado rompía con pelaje denso autointersectante — ver el
 *        docstring de trazar-lamina.sh). 9727 paths: el grabado intacto.
 *   2. npx svgo --multipass -p 2 zariguya-parada-trace.svg \
 *        -o zariguya-parada-trace.min.svg
 *      → TODO queda en el espacio absoluto 564×889 de la lámina (el mismo
 *        de regiones.js).
 *   3. node generar-calco.mjs zariguya-parada-trace.min.svg
 *      → escribe ./calcoTrazado.js: CALCO_SILUETA_DEFS (el clip del alfa,
 *        renombrado de "a" a "ztSilueta" — anti-colisión entre compais) +
 *        CALCO_POR_REGION (paths por región de regiones.js, bbox del path
 *        contra bbox del polígono; el clip exacto lo pone pielTrazado).
 *
 * El REPARTO es conservador (bbox vs bbox): un path que roza dos regiones
 * vive en ambas (el clip exacto de cada hueso corta lo que sobra). El orden
 * de apilado original se conserva dentro de cada región.
 */
/* global process, console -- script Node de build (fuera del glob eslint de lefthook) */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZT_REGIONES } from './regiones.js';

const entrada = process.argv[2];
if (!entrada) {
  console.error('uso: node generar-calco.mjs <trace.min.svg>');
  process.exit(1);
}
const svg = readFileSync(entrada, 'utf8');
const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
if (!m) throw new Error('no encontré el <svg> raíz');
let interior = m[1].trim();
interior = interior
  .replaceAll('clipPath id="a"', 'clipPath id="ztSilueta"')
  .replaceAll('clip-path="url(#a)"', 'clip-path="url(#ztSilueta)"');
if (/[`\\]|\$\{/.test(interior)) throw new Error('el trazado trae caracteres que romperían el template literal');

// ── separar defs (silueta) del cuerpo ──────────────────────────────────────
const defsM = interior.match(/<defs>[\s\S]*?<\/defs>/);
if (!defsM) throw new Error('no encontré <defs> (el clip de silueta)');
const siluetaDefs = defsM[0];
const cuerpo = interior.replace(defsM[0], '');

// ── paths del cuerpo, en orden de apilado ──────────────────────────────────
const paths = cuerpo.match(/<path[^>]*\/>/g) || [];
if (paths.length < 100) throw new Error(`solo ${paths.length} paths — algo anda mal`);

/** bbox conservador de un `d` con comandos relativos/absolutos: interpreta
    el cursor y acumula todos los puntos (controles incluidos — conservador,
    exactamente lo que un reparto por bbox necesita). */
function bboxDeD(d) {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  let i = 0; let cmd = ''; let x = 0; let y = 0; let sx = 0; let sy = 0;
  let mnx = 1e9; let mny = 1e9; let mxx = -1e9; let mxy = -1e9;
  const punto = (px, py) => {
    if (px < mnx) mnx = px; if (px > mxx) mxx = px;
    if (py < mny) mny = py; if (py > mxy) mxy = py;
  };
  const num = () => parseFloat(tokens[i++]);
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) { cmd = t; i++; if (cmd === 'z' || cmd === 'Z') { x = sx; y = sy; continue; } }
    switch (cmd) {
      case 'M': x = num(); y = num(); sx = x; sy = y; punto(x, y); cmd = 'L'; break;
      case 'm': x += num(); y += num(); sx = x; sy = y; punto(x, y); cmd = 'l'; break;
      case 'L': x = num(); y = num(); punto(x, y); break;
      case 'l': x += num(); y += num(); punto(x, y); break;
      case 'H': x = num(); punto(x, y); break;
      case 'h': x += num(); punto(x, y); break;
      case 'V': y = num(); punto(x, y); break;
      case 'v': y += num(); punto(x, y); break;
      case 'C': punto(num(), num()); punto(num(), num()); x = num(); y = num(); punto(x, y); break;
      case 'c': punto(x + num(), y + num()); punto(x + num(), y + num()); x += num(); y += num(); punto(x, y); break;
      case 'S': case 'Q': punto(num(), num()); x = num(); y = num(); punto(x, y); break;
      case 's': case 'q': punto(x + num(), y + num()); x += num(); y += num(); punto(x, y); break;
      case 'T': x = num(); y = num(); punto(x, y); break;
      case 't': x += num(); y += num(); punto(x, y); break;
      case 'A': i += 5; x = num(); y = num(); punto(x, y); break;
      case 'a': i += 5; x += num(); y += num(); punto(x, y); break;
      default: i++; break;
    }
  }
  return [mnx, mny, mxx, mxy];
}

const MARGEN = 6;
const cajasRegion = Object.fromEntries(Object.entries(ZT_REGIONES).map(([n, pts]) => {
  const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
  return [n, [Math.min(...xs) - MARGEN, Math.min(...ys) - MARGEN, Math.max(...xs) + MARGEN, Math.max(...ys) + MARGEN]];
}));

const porRegion = Object.fromEntries(Object.keys(ZT_REGIONES).map((n) => [n, []]));
let repartidos = 0;
for (const p of paths) {
  const d = p.match(/ d="([^"]+)"/)[1];
  const [x0, y0, x1, y1] = bboxDeD(d);
  for (const [n, [rx0, ry0, rx1, ry1]] of Object.entries(cajasRegion)) {
    if (x1 >= rx0 && x0 <= rx1 && y1 >= ry0 && y0 <= ry1) { porRegion[n].push(p); repartidos++; }
  }
}

const cuerposRegion = Object.entries(porRegion)
  .map(([n, ps]) => `  ${JSON.stringify(n)}: \`${ps.join('')}\`,`)
  .join('\n');
const resumen = Object.entries(porRegion).map(([n, ps]) => `${n}:${ps.length}`).join(' · ');

const salida = `/*
 * calcoTrazado — EL CALCO: la lámina \`zariguya-parada-limpia.png\` (Gemini
 * aprobada, de pie sin lápiz/brújula) AUTO-TRAZADA a vector con la receta
 * EXACTA del jaguar (trazar-lamina.sh: aplanado sobre papel + vtracer
 * stacked spline cp8/speckle2/gs8 + silueta potrace), PARTIDA POR REGIÓN DE
 * HUESO. GENERADO por generar-calco.mjs (ver ahí el pipeline completo) — NO
 * editar a mano: regenerar. ${paths.length} paths de origen en el espacio
 * 564×889 de la lámina; reparto conservador por bbox (un path fronterizo
 * vive en las regiones que roza; el clip exacto de cada hueso corta el
 * resto). Cero dibujo nuevo, cero redibujo a mano.
 */
export const CALCO_SILUETA_DEFS = \`${siluetaDefs}\`;
export const CALCO_POR_REGION = Object.freeze({
${cuerposRegion}
});
export const CALCO_N_PATHS = ${paths.length};
export default CALCO_POR_REGION;
`;
const destino = join(dirname(fileURLToPath(import.meta.url)), 'calcoTrazado.js');
writeFileSync(destino, salida);
console.log(`calcoTrazado.js escrito: ${paths.length} paths → ${repartidos} asignaciones (${(salida.length / 1024).toFixed(0)} KiB)`);
console.log(resumen);
