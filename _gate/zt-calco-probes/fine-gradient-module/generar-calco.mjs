#!/usr/bin/env node
/*
 * generar-calco — hornea el AUTO-TRAZADO de la lámina en un módulo JS plano.
 *
 * Pipeline (documentado para reproducir el calco desde cero — RECETA BUENA
 * 2026-08-22, la que adelgaza el contorno; la receta vieja sin aplanado
 * trazaba el halo semi-transparente del borde como tinta negra GORDA):
 *   1. chagra/scripts/trazar-lamina.sh public/compai/laminas/zariguya.png \
 *        zariguya-trace.svg
 *      → APLANA el alfa sobre color papel (el fix del contorno), traza
 *        stacked (spline, color_precision 8, filter_speckle 2,
 *        gradient_step 8) y recupera la transparencia con un clipPath
 *        VECTORIAL evenodd (id="silueta") trazado del canal alfa.
 *   2. npx svgo --multipass -p 2 zariguya-trace.svg -o zariguya-trace.min.svg
 *      → los translate() horneados en las coordenadas: TODO queda en el
 *        espacio absoluto 481×444 de la lámina (el mismo de los pivotes de
 *        zariguyaLamina/anatomia.js). svgo minifica el id del clipPath;
 *        aquí se renombra a "ztSilueta" (estable, sin colisiones).
 *   3. node generar-calco.mjs zariguya-trace.min.svg
 *      → escribe ./calcoTrazado.js con el markup interior (sin <svg> raíz):
 *        <defs><clipPath id="ztSilueta">…</clipPath></defs>
 *        <g clip-path="url(#ztSilueta)">…paths…</g>  (autocontenido)
 *   4. node extraer-bigotes.mjs --hornear   (depura la tinta de bigotes y
 *        regenera AIRE_LIMPIO_D; ver ese archivo)
 *
 * El módulo generado exporta UN string, listo para meterse UNA vez en
 * <defs> como <g id="ztCalco"> y clonarse por hueso con
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
let interior = m[1].trim();
/* El clipPath de silueta de trazar-lamina.sh (svgo minifica su id): se
   renombra a "ztSilueta" para que no colisione con nada del documento. */
const mClip = interior.match(/<clipPath id="([^"]+)"/);
if (mClip) {
  const viejo = mClip[1];
  interior = interior
    .replaceAll(`id="${viejo}"`, 'id="ztSilueta"')
    .replaceAll(`url(#${viejo})`, 'url(#ztSilueta)');
}
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
