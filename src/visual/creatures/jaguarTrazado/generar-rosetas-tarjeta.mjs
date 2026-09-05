#!/usr/bin/env node
/*
 * generar-rosetas-tarjeta (jaguar) — hornea las ROSETAS DE TARJETA del
 * jaguar trazado: un subconjunto de las rosetas DEL PROPIO CALCO, ampliadas
 * alrededor de su centro, para que a tamaño de tarjeta (≤ 96 px) el jaguar
 * lea jaguar y no tigre.
 *
 * EL DEFECTO, MEDIDO (gate 2026-09-04/05, `_gate/jaguar-tinta-rosetas-20260905/`):
 *   a 560 px el calco lee jaguar de rosetas (juez qwen3-vl:8b + ojo); a
 *   64 px (la tarjeta del selector, el FAB de 48 px) lee TIGRE de barras
 *   verticales. CONTROL: la lámina raster misma reducida a 64 px también
 *   lee tigre para el mismo juez → no es un defecto del trazado sino del
 *   TAMAÑO: cada roseta mide ~2 px y el aire entre rosetas < 1 px, y como en
 *   la lámina las rosetas del flanco van en columnas, se funden en barras.
 *   Ninguna receta de trazado lo arregla (a 3× tampoco: es Nyquist, no
 *   fidelidad). Hay que bajar la FRECUENCIA del patrón solo a ese tamaño.
 *
 * LA CIRUGÍA (dentro de JaguarTrazado — ruling 2026-09-04: cambiar de
 * componente por `size` está PROHIBIDO; el arreglo va DENTRO de la pieza):
 *   por región, sobre el calco y solo con data-tarjeta en la raíz,
 *   1. FONDO: copia BORROSA del calco de ESA región (la técnica de la casa,
 *      casqueteCalco): promedia las rosetas fundidas al tono local del
 *      pelaje. Ningún parche inventado, ningún color plano.
 *   2. ROSETAS: N rosetas elegidas del calco de la región (ANCLAS abajo, px
 *      de lámina, elegidas a ojo sobre un diagnóstico con las cajas de los
 *      paths oscuros), cada una = el path oscuro del anillo + los paths más
 *      claros que van encima dentro de su caja (el punto de adentro),
 *      COPIADOS VERBATIM y escalados ESCALA× alrededor del centro de su
 *      caja. Cero dibujo nuevo: el test integral verifica que cada path
 *      exista tal cual en CALCO_POR_REGION.
 *
 * Uso:  node generar-rosetas-tarjeta.mjs   → escribe ./rosetasTarjeta.js
 * Regenerar SIEMPRE que se regenere calcoTrazado.js (los índices cambian).
 */
/* global process, console -- script Node de build (fuera del glob eslint de lefthook) */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CALCO_POR_REGION } from './calcoTrazado.js';

/* ── PARÁMETROS DE LA CIRUGÍA ──────────────────────────────────────────────
   ANCLAS: por región, puntos (px de lámina 705×394) que caen DENTRO de la
   roseta que se quiere conservar. Se conservan pocas y separadas (≥ ~70 px
   entre centros ≈ 6 px a 64 px) para que quede aire entre ellas. */
export const ANCLAS = Object.freeze({
  troncoCuerpo: [],
  pataTrasCercaAlto: [],
  pataDelCercaAlto: [],
  cuello: [],
});
/* ESCALA: factor de ampliación de cada roseta alrededor de su centro. */
export const ESCALA = 1.75;
/* Umbrales de selección: el anillo es OSCURO (luma < LUMA_ANILLO) y de
   tamaño roseta; el punto de adentro es más claro que el anillo. */
const LUMA_ANILLO = 70;
const LADO_MIN = 8;
const LADO_MAX = 50;
const DELTA_LUMA_PUNTO = 22;

/** bbox conservador de un `d` (misma rutina que generar-calco.mjs). */
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

const luma = (hex) => {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(f.slice(0, 2), 16); const g = parseInt(f.slice(2, 4), 16); const b = parseInt(f.slice(4, 6), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function pathsDe(region) {
  const ps = CALCO_POR_REGION[region].match(/<path[^>]*\/>/g) || [];
  return ps.map((p, idx) => {
    const fill = (p.match(/fill="([^"]+)"/) || [])[1] || '';
    const d = p.match(/ d="([^"]+)"/)[1];
    const [x0, y0, x1, y1] = bboxDeD(d);
    return { idx, p, fill, L: fill.startsWith('#') ? luma(fill) : 999, x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
  });
}

const dentro = (a, b, m = 1) => a.x0 >= b.x0 - m && a.y0 >= b.y0 - m && a.x1 <= b.x1 + m && a.y1 <= b.y1 + m;
const contiene = (b, [x, y]) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1;

const salida = {};
const resumen = [];
for (const [region, anclas] of Object.entries(ANCLAS)) {
  const ps = pathsDe(region);
  const grupos = [];
  for (const ancla of anclas) {
    const cand = ps
      .filter((q) => q.L < LUMA_ANILLO && q.w >= LADO_MIN && q.w <= LADO_MAX && q.h >= LADO_MIN && q.h <= LADO_MAX && contiene(q, ancla))
      .sort((a, b) => (b.w * b.h) - (a.w * a.h));
    if (!cand.length) throw new Error(`${region}: ningún anillo oscuro contiene el ancla ${ancla}`);
    const anillo = cand[0];
    const puntos = ps.filter((q) => q.idx > anillo.idx && q.L > anillo.L + DELTA_LUMA_PUNTO && q.L < 999 && dentro(q, anillo));
    const cx = ((anillo.x0 + anillo.x1) / 2).toFixed(1);
    const cy = ((anillo.y0 + anillo.y1) / 2).toFixed(1);
    grupos.push(`<g transform="translate(${cx} ${cy}) scale(${ESCALA}) translate(${-cx} ${-cy})">${anillo.p}${puntos.map((q) => q.p).join('')}</g>`);
    resumen.push(`${region} @${ancla.join(',')} → #${anillo.idx} ${anillo.fill} ${anillo.w.toFixed(0)}x${anillo.h.toFixed(0)} +${puntos.length} punto(s)`);
  }
  salida[region] = grupos.join('');
}

const cuerpo = Object.entries(salida)
  .map(([n, s]) => `  ${JSON.stringify(n)}: \`${s}\`,`)
  .join('\n');
const nRosetas = Object.values(ANCLAS).reduce((a, l) => a + l.length, 0);
const texto = `/*
 * rosetasTarjeta — las ROSETAS DE TARJETA del jaguar trazado: ${nRosetas} rosetas
 * del PROPIO CALCO (anillo oscuro + punto de adentro, copiados verbatim de
 * calcoTrazado.js), ampliadas ${ESCALA}× alrededor de su centro. Solo se
 * muestran con data-tarjeta en la raíz (size ≤ 96 px). GENERADO por
 * generar-rosetas-tarjeta.mjs (ver ahí el defecto medido y la cirugía) —
 * NO editar a mano: regenerar.
 */
export const ROSETAS_TARJETA = Object.freeze({
${cuerpo}
});
export const ROSETAS_TARJETA_N = ${nRosetas};
export const ROSETAS_TARJETA_ESCALA = ${ESCALA};
export default ROSETAS_TARJETA;
`;
const destino = join(dirname(fileURLToPath(import.meta.url)), 'rosetasTarjeta.js');
writeFileSync(destino, texto);
console.log(`rosetasTarjeta.js escrito: ${nRosetas} rosetas (${(texto.length / 1024).toFixed(1)} KiB)`);
console.log(resumen.join('\n'));
