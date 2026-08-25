#!/usr/bin/env node
/*
 * generar-calco — hornea el AUTO-TRAZADO de la lámina en un módulo JS plano.
 *
 * FUENTE (operador 2026-08-25): la lámina APROBADA es
 * `public/compai/laminas/zariguya-gemini-hero.png` — el hero Gemini SIN
 * GUANTES (la `zariguya.png` original traía los guantes blancos que el
 * operador ya había descartado; ver fix/zariguya-sin-guantes-*). Ambas viven
 * en el MISMO espacio 481×444 y comparten pose pixel-alineada, así que las
 * clip-regiones/pivotes hechos a mano de pielTrazado.js siguen calzando.
 *
 * LÍNEA FINA (operador 2026-08-25): el trazo directo a 481 salía PESADO
 * (bigotes/contornos toscos). Se traza a 2× (962×888) y luego pielTrazado.js
 * escala el <g id="ztCalco"> por 0.5 → el grosor de cada línea queda a la
 * mitad y el detalle sub-píxel del 2× sobrevive. filter_speckle sube a 10
 * para NO explotar el conteo de paths (el calco se clona por hueso, así que
 * O(paths×huesos): ~1581 paths se mantiene bajo el techo de rendimiento).
 *
 * Pipeline (documentado para reproducir el calco desde cero):
 *   1. magick public/compai/laminas/zariguya-gemini-hero.png \
 *        -filter Lanczos -resize 200% hero-2x.png            (→ 962×888)
 *   2. nix run nixpkgs#vtracer -- --input hero-2x.png \
 *        --output zariguya-trace.svg --mode spline \
 *        --color_precision 6 --filter_speckle 10
 *      → paths apilados (stacking): conserva el grabado del pelo, fino.
 *   3. npx svgo --multipass -p 2 zariguya-trace.svg -o zariguya-trace.min.svg
 *      → ~660 KB, ~1581 paths, los translate() horneados; TODO queda en el
 *        espacio 2× (962×888). pielTrazado.js lo escala 0.5 → 481×444, el
 *        mismo de las clip-regiones/pivotes hechos a mano.
 *   4. node generar-calco.mjs zariguya-trace.min.svg
 *      → escribe ./calcoTrazado.js con el markup interior (sin <svg> raíz).
 *
 * El módulo generado exporta UN string: los <path> del trazado, listos para
 * meterse UNA vez en <defs> como <g id="ztCalco"> y clonarse por hueso con
 * <use href="#ztCalco" clip-path="…"> (ver pielTrazado.js).
 */
/* global process, console -- script Node de build (fuera del glob eslint de lefthook) */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const entrada = process.argv[2];
if (!entrada) {
  console.error('uso: node generar-calco.mjs <trace.min.svg>');
  process.exit(1);
}
const svg = readFileSync(entrada, 'utf8');
const m = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
if (!m) throw new Error('no encontré el <svg> raíz');
const interior = m[1].trim();
if (/[`\\]|\$\{/.test(interior)) throw new Error('el trazado trae caracteres que romperían el template literal');
const nPaths = (interior.match(/<path/g) || []).length;

const salida = `/*
 * calcoTrazado — EL CALCO: la lámina \`zariguya-gemini-hero.png\` (el hero
 * Gemini SIN GUANTES, aprobado por el operador 2026-08-25) AUTO-TRAZADA a
 * vector A 2× para línea fina. GENERADO por generar-calco.mjs (ver ahí el
 * pipeline magick+vtracer+svgo exacto) — NO editar a mano: regenerar.
 * ${nPaths} paths en el espacio 2× (962×888); pielTrazado.js los escala 0.5
 * → 481×444 (el de las clip-regiones/pivotes de zariguyaLamina/anatomia.js),
 * lo que adelgaza el trazo a la mitad. Cero dibujo nuevo: cada path es la
 * lámina aprobada, vectorizada.
 */
export const CALCO_TRAZADO = \`${interior}\`;
export const CALCO_N_PATHS = ${nPaths};
export default CALCO_TRAZADO;
`;
const destino = join(dirname(fileURLToPath(import.meta.url)), 'calcoTrazado.js');
writeFileSync(destino, salida);
console.log(`calcoTrazado.js escrito: ${nPaths} paths, ${(salida.length / 1024).toFixed(0)} KiB`);
