#!/usr/bin/env node
/*
 * generar-calco — hornea la LÁMINA GEMINI ELEGIDA como calco RASTER.
 *
 * HISTORIA (por qué raster). La lámina aprobada por el operador es
 * `public/compai/laminas/zariguya-gemini-hero.png` (el set Gemini, muchas
 * iteraciones — ver el resto del set en esa carpeta). El intento de
 * VECTORIZARLA (vtracer, 3 versiones) fue RECHAZADO: la posterización
 * convertía la coronilla texturada en un "gorro" sólido y engordaba
 * bigotes/contornos. Un redibujo a mano (2026-08-25) también fue RECHAZADO:
 * abandonaba la identidad elegida (RULINGS 2026-08-25: NUNCA regenerar una
 * identidad aprobada).
 *
 * CIRUGÍA definitiva: el calco es la lámina MISMA — el PNG embebido como
 * <image> data-URI dentro de <g id="ztCalco">. Los clip-path del rig
 * recortan raster igual que vectores, así que las clip-regiones/pivotes de
 * pielTrazado.js siguen calzando (mismo espacio 481×444) y la piel es
 * PIXEL-IDÉNTICA a la que el operador eligió: cero gorro, cero engorde,
 * cero reinvención. 82 KB de PNG ≈ 110 KB de base64 (el calco vtracer
 * pesaba 660 KB) y UN solo elemento clonado por hueso.
 *
 * Uso: node generar-calco.mjs   → escribe ./calcoTrazado.js
 */
/* global console -- script Node de build (fuera del glob eslint de lefthook) */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const HERO = join(AQUI, '../../../../public/compai/laminas/zariguya-gemini-hero.png');

const png = readFileSync(HERO);
const b64 = png.toString('base64');
const interior = `<image href="data:image/png;base64,${b64}" x="0" y="0" width="481" height="444" preserveAspectRatio="none"/>`;

const salida = `/*
 * calcoTrazado — EL CALCO: la lámina Gemini ELEGIDA por el operador
 * (\`zariguya-gemini-hero.png\`, 481×444) embebida TAL CUAL como raster.
 * GENERADO por generar-calco.mjs — NO editar a mano: regenerar.
 *
 * Sin vtracer y sin redibujo (ambos rechazados): los píxeles aprobados,
 * articulados por las clip-regiones/pivotes de pielTrazado.js en el mismo
 * espacio 481×444. Ver generar-calco.mjs para la historia completa.
 */
export const CALCO_TRAZADO = \`${interior}\`;
export const CALCO_N_PATHS = 1;
export default CALCO_TRAZADO;
`;
writeFileSync(join(AQUI, 'calcoTrazado.js'), salida);
console.log(`calcoTrazado.js escrito: lámina Gemini raster, ${Math.round(salida.length / 1024)} KB`);
