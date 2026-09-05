#!/usr/bin/env node
/*
 * generar-calco (zarigüeya) — hornea el AUTO-TRAZADO de la lámina Gemini
 * hero en un módulo JS plano, PARTIDO POR REGIÓN DE HUESO (la optimización
 * que salvó el framerate del jaguar: con un solo <g id="…Calco"> global,
 * cada <use> re-renderizaba TODOS los paths; partido, cada hueso referencia
 * SOLO los paths que intersectan su región).
 *
 * ES LA RECETA DEL JAGUAR, sin cambios (jaguarTrazado/generar-calco.mjs).
 * Los intentos previos de la zarigüeya fallaron por improvisar parámetros
 * (speckle 4 sin aplanar → borde gordo) y por casquetes de color plano
 * (→ "gorro"). Aquí NO se decide nada: se reproduce.
 *
 * Pipeline (documentado para regenerar el calco desde cero):
 *   1. VTRACER=<bin> bash scripts/trazar-lamina.sh \
 *        public/compai/laminas/zariguya-gemini-hero.png zariguya-trace.svg
 *      → receta clavada 2026-08-22: aplanar el alfa sobre papel (#eee8d7)
 *        ANTES de trazar + vtracer stacked spline --color_precision 8
 *        --filter_speckle 2 --gradient_step 8 + clipPath vectorial del canal
 *        alfa (potrace). 3220 paths en el espacio 481×444 de la lámina.
 *        (vtracer no está en el PATH de alpha: `nix build nixpkgs#vtracer
 *        --print-out-paths` y pasar el binario por VTRACER=.)
 *   2. npx svgo --multipass -p 2 zariguya-trace.svg -o zariguya-trace.min.svg
 *      → ~400 KB, translates horneados: TODO queda en el espacio absoluto
 *        481×444 de la lámina (el mismo de regiones.js y de los pivotes).
 *   3. LA CORONILLA (cirugía autorizada por el operador 2026-09-05, «la
 *      kipá es bloqueante»): a 1× la receta se come el rayado fino de la
 *      coronilla y la deja como un casco de parches con borde (kipá). Se
 *      MIDIÓ sobre el recorte (RMSE contra la lámina aplanada, colores en
 *      la coronilla, densidad de rayado; fuente = 2806 colores / 0,162):
 *        · receta 1× (spline cp8 sp2 gs8)      RMSE 0,072 · 1440 colores
 *        · cp8/sp1/gs2..4 (más «profundidad»)   sin cambio (2381→2471)
 *        · modo pixel                           RMSE 0,058 · el juez sigue
 *          leyendo «casco de parches con borde»
 *        · pixel + rayado potrace (umbral local) RMSE 0,060 · ídem
 *        · LA RECETA MISMA A 3× DE RESOLUCIÓN   RMSE 0,032 · 2886 colores
 *      Lo que perdía la coronilla no era profundidad de color sino
 *      RESOLUCIÓN: a 481 px los trazos del rayado miden 1 px y el ajuste de
 *      curva los funde; a 3× (Lanczos) la misma receta los resuelve. Se
 *      traza SOLO la coronilla a 3× y se monta encima del calco de la
 *      cabeza escalada a 1/3, fundida a la altura de las cejas. Mismo
 *      trazo, misma paleta, cero dibujo nuevo, cero color plano:
 *        magick flat.png -crop 255x90+85+0 +repage \
 *          -filter Lanczos -resize 300% coronilla-3x.png
 *        vtracer --input coronilla-3x.png --output coronilla-3x.svg \
 *          --mode spline --hierarchical stacked --color_precision 8 \
 *          --filter_speckle 2 --gradient_step 8 --path_precision 2
 *        npx svgo --multipass -p 2 coronilla-3x.svg -o coronilla-3x.min.svg
 *      (flat.png = la lámina aplanada sobre papel, como en el paso 1.)
 *      Costo: ~480 KB de paths para 255×90 px de lámina.
 *   4. node generar-calco.mjs zariguya-trace.min.svg coronilla-3x.min.svg
 *      → escribe ./calcoTrazado.js: CALCO_SILUETA_DEFS (el clip del alfa,
 *        renombrado de "a" a "ztSilueta" — anti-colisión entre compais) +
 *        CALCO_POR_REGION (paths por región de regiones.js, bbox del path
 *        contra bbox del polígono; el clip exacto lo pone pielTrazado) +
 *        CALCO_CORONILLA (los paths del paso 3, en el espacio del recorte
 *        a 3×) + CALCO_CORONILLA_OFFSET/SCALE (pielTrazado los traslada
 *        +85,0 y los escala 1/3 al espacio de la lámina).
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
const entradaCoronilla = process.argv[3];
if (!entrada || !entradaCoronilla) {
  console.error('uso: node generar-calco.mjs <trace.min.svg> <coronilla-3x.min.svg>');
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

// ── la coronilla en modo pixel (paso 3) ────────────────────────────────────
const svgCor = readFileSync(entradaCoronilla, 'utf8');
const mc = svgCor.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
if (!mc) throw new Error('coronilla: no encontré el <svg> raíz');
const coronilla = mc[1].trim();
if (/[`\\]|\$\{/.test(coronilla)) throw new Error('la coronilla trae caracteres que romperían el template literal');
const nCoronilla = (coronilla.match(/<path[^>]*\/>/g) || []).length;
if (nCoronilla < 500) throw new Error(`coronilla: solo ${nCoronilla} paths — algo anda mal`);

// escala del recorte: el svg trae width="765" (255×3) → 1/3
const anchoCor = parseFloat((svgCor.match(/<svg[^>]*\swidth="([\d.]+)"/) || [])[1]);
if (!anchoCor) throw new Error('coronilla: el <svg> no trae width');
const escalaCor = 255 / anchoCor;

const cuerposRegion = Object.entries(porRegion)
  .map(([n, ps]) => `  ${JSON.stringify(n)}: \`${ps.join('')}\`,`)
  .join('\n');
const resumen = Object.entries(porRegion).map(([n, ps]) => `${n}:${ps.length}`).join(' · ');

const salida = `/*
 * calcoTrazado — EL CALCO: la lámina Gemini hero \`zariguya-gemini-hero.png\`
 * AUTO-TRAZADA a vector con la receta del jaguar, PARTIDA POR REGIÓN DE
 * HUESO. GENERADO por generar-calco.mjs (ver ahí el pipeline y el porqué
 * del reparto) — NO editar a mano: regenerar.
 * ${paths.length} paths de origen en el espacio 481×444 de la lámina; reparto
 * conservador por bbox (un path fronterizo vive en las regiones que roza; el
 * clip exacto de cada hueso corta el resto). Cero dibujo nuevo.
 */
export const CALCO_SILUETA_DEFS = \`${siluetaDefs}\`;
export const CALCO_POR_REGION = Object.freeze({
${cuerposRegion}
});
export const CALCO_N_PATHS = ${paths.length};
/* La CORONILLA trazada a 3× (${nCoronilla} paths), en el espacio del recorte
   255×90 tomado en (85,0) de la lámina y ampliado ×3 — pielTrazado la
   traslada y la escala ${escalaCor.toFixed(4)}. */
export const CALCO_CORONILLA = \`${coronilla}\`;
export const CALCO_CORONILLA_OFFSET = Object.freeze([85, 0]);
export const CALCO_CORONILLA_SCALE = ${escalaCor};
export default CALCO_POR_REGION;
`;
const destino = join(dirname(fileURLToPath(import.meta.url)), 'calcoTrazado.js');
writeFileSync(destino, salida);
console.log(`calcoTrazado.js escrito: ${paths.length} paths → ${repartidos} asignaciones + coronilla 3× ${nCoronilla} paths (${(salida.length / 1024).toFixed(0)} KiB)`);
console.log(resumen);
