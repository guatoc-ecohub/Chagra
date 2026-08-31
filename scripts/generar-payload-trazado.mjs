#!/usr/bin/env node
/*
 * Empaqueta SVGs producidos por scripts/trazar-lamina.sh. Este archivo no
 * dibuja: solo congela el resultado de vtracer + potrace para importarlo desde
 * React sin cargar PNGs ni rehacer la vectorización en el navegador.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [normal, punk, luciernaga, salida] = process.argv.slice(2);
if (![normal, punk, luciernaga, salida].every(Boolean)) {
  console.error('uso: node generar-payload-trazado.mjs normal.svg punk.svg luciernaga.svg salida.js');
  process.exit(1);
}

function leer(path) {
  const svg = readFileSync(path, 'utf8').trim();
  if (!svg.startsWith('<svg') || !svg.endsWith('</svg>')) throw new Error(`SVG inválido: ${path}`);
  const clip = (svg.match(/<clipPath id="a"/g) || []).length;
  if (clip !== 1 || !svg.includes('clip-path="url(#a)"')) throw new Error(`falta clip alfa en ${path}`);
  return svg.replaceAll('id="a"', 'id="__TRACE_CLIP__"').replaceAll('url(#a)', 'url(#__TRACE_CLIP__)');
}

const payload = {
  normal: leer(normal),
  punk: leer(punk),
  luciernaga: leer(luciernaga),
};
const fuente = `/* GENERADO. Fuente: scripts/trazar-lamina.sh + svgo. No editar a mano. */\n`;
writeFileSync(
  salida,
  `${fuente}export const TRAZADOS = Object.freeze(${JSON.stringify(payload)});\nexport default TRAZADOS;\n`,
  'utf8',
);
console.log(`payload escrito: ${Object.entries(payload).map(([key, svg]) => `${key}=${svg.length}`).join(' · ')}`);
