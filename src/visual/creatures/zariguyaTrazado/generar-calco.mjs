#!/usr/bin/env node
/*
 * generar-calco — hornea el AUTO-TRAZADO de la lámina en un módulo JS plano.
 *
 * Pipeline (documentado para reproducir el calco desde cero):
 *   1. nix run nixpkgs#vtracer -- --input public/compai/laminas/zariguya.png \
 *        --output zariguya-trace.svg --mode spline --color_precision 8 \
 *        --filter_speckle 4
 *      → 2504 paths apilados (stacking): conserva el grabado del pelo.
 *   2. npx svgo --multipass -p 2 zariguya-trace.svg -o zariguya-trace.min.svg
 *      → ~310 KB, 2032 paths, los translate() horneados en las coordenadas:
 *        TODO queda en el espacio absoluto 481×444 de la lámina (el mismo de
 *        los pivotes de zariguyaLamina/anatomia.js).
 *   3. node generar-calco.mjs zariguya-trace.min.svg
 *      → escribe ./calcoTrazado.js con el markup interior (sin <svg> raíz).
 *
 * El módulo generado exporta UN string: los <path> del trazado, listos para
 * meterse UNA vez en <defs> como <g id="ztCalco"> y clonarse por hueso con
 * <use href="#ztCalco" clip-path="…"> (ver pielTrazado.js).
 */
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
 * calcoTrazado — EL CALCO: la lámina \`zariguya.png\` AUTO-TRAZADA a vector.
 * GENERADO por generar-calco.mjs (ver ahí el pipeline vtracer+svgo exacto) —
 * NO editar a mano: regenerar. ${nPaths} paths en el espacio 481×444 de la
 * lámina (mismo espacio que los pivotes de zariguyaLamina/anatomia.js).
 * Cero dibujo nuevo: cada path es la lámina aprobada, vectorizada.
 */
export const CALCO_TRAZADO = \`${interior}\`;
export const CALCO_N_PATHS = ${nPaths};
export default CALCO_TRAZADO;
`;
const destino = join(dirname(fileURLToPath(import.meta.url)), 'calcoTrazado.js');
writeFileSync(destino, salida);
console.log(`calcoTrazado.js escrito: ${nPaths} paths, ${(salida.length / 1024).toFixed(0)} KiB`);
