#!/usr/bin/env node
/*
 * generar-calco (OSO) — hornea el AUTO-TRAZADO de la lámina en un módulo JS
 * plano. Réplica del generador de la zarigüeya (zariguyaTrazado/) con la
 * receta YA nailed de `scripts/trazar-lamina.sh` (aplanar sobre papel +
 * stacked + clip de silueta por alfa).
 *
 * Pipeline (documentado para reproducir el calco desde cero):
 *   1. VT_ARGS="--mode spline --color_precision 8 --filter_speckle 2 \
 *        --gradient_step 8 --corner_threshold 30 --splice_threshold 30" \
 *      bash scripts/trazar-lamina.sh public/compai/laminas/oso.png oso-trace.svg
 *      → 3806 paths apilados (stacking) + clipPath de silueta (alfa, evenodd):
 *        conserva el grabado del pelaje y los BLANCOS (la V del pecho, el
 *        antifaz) nítidos, y los bolsillos entre piernas/bastón transparentes.
 *        corner/splice_threshold 30 (vs receta base): conserva mejor las
 *        puntas de pelo de la silueta pictórica del oso Y pesa ~18% menos
 *        (436K vs 531K tras svgo) — medido lado a lado, misma nitidez.
 *   2. npx svgo --multipass -p 2 oso-trace.svg -o oso-trace.min.svg
 *      → ~436 KB, 3801 paths, translate() horneados: TODO queda en el espacio
 *        absoluto 615×630 de la lámina (el MISMO de los pivotes/cortes de
 *        osoLamina/anatomia.js — verificado por sha256: una sola oso.png).
 *   3. node generar-calco.mjs oso-trace.min.svg
 *      → escribe ./calcoTrazado.js con el markup interior (sin <svg> raíz).
 *
 * El id del clip de silueta (svgo lo minifica a "a") se renombra aquí a
 * `otSilueta` — el calco vive INLINE en <defs> del componente y un id de una
 * letra es una colisión esperando página.
 *
 * El módulo generado exporta UN string: el trazado listo para meterse UNA vez
 * en <defs> como <g id="otCalco"> y clonarse por hueso con
 * <use href="#otCalco" clip-path="…"> (ver pielTrazado.js).
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
if (/[`\\]|\$\{/.test(interior)) throw new Error('el trazado trae caracteres que romperían el template literal');
// id único para el clip de silueta (anti-colisión de ids inline)
interior = interior.replaceAll('id="a"', 'id="otSilueta"').replaceAll('url(#a)', 'url(#otSilueta)');
const nPaths = (interior.match(/<path/g) || []).length;

const salida = `/*
 * calcoTrazado — EL CALCO: la lámina \`oso.png\` AUTO-TRAZADA a vector.
 * GENERADO por generar-calco.mjs (ver ahí el pipeline trazar-lamina.sh+svgo
 * exacto) — NO editar a mano: regenerar. ${nPaths} paths en el espacio
 * 615×630 de la lámina (mismo espacio que los pivotes de
 * osoLamina/anatomia.js). Cero dibujo nuevo: cada path es la lámina
 * aprobada, vectorizada, recortada a su silueta real por el alfa.
 */
export const CALCO_TRAZADO = \`${interior}\`;
export const CALCO_N_PATHS = ${nPaths};
export default CALCO_TRAZADO;
`;
const destino = join(dirname(fileURLToPath(import.meta.url)), 'calcoTrazado.js');
writeFileSync(destino, salida);
console.log(`calcoTrazado.js escrito: ${nPaths} paths, ${(salida.length / 1024).toFixed(0)} KiB`);
