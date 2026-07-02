/**
 * cicloVivoWheel.js — construye el SVG de la rueda "El Ciclo Vivo" como string.
 * =====================================================================
 * Port parametrizado del `buildWheel` del mockup v3. Devuelve el markup del
 * <svg> interno (sin tocar el DOM: el componente lo inyecta con
 * dangerouslySetInnerHTML y delega los clics de nodo por `data-idx`).
 *
 * `faseActiva` es solo la fase enfocada (dónde aterriza / enfoca el usuario),
 * NO una afirmación sobre la semana real del cultivo. El tallo "vivido" crece
 * hasta ahí y el resto queda punteado, igual que en la v3.
 */
import {
  SPECIES_DEFS, GLYPHS, CX, CY, STEP_DEG,
  phaseDeg, phaseR, rAtDeg, polar, spiralPath,
} from './cicloVivoArte';
import { PHASES, SPECIES } from './cicloVivoData';

function nodeR(i, faseActiva) {
  return 15 + i * 1.2 + (i === faseActiva ? 2 : 0);
}

/**
 * @param {{ spKey: string, faseActiva: number }} args
 * @returns {string} markup interno del <svg>
 */
export function buildWheelSvg({ spKey, faseActiva }) {
  const sp = SPECIES[spKey] || SPECIES.maiz;
  const cur = Math.max(0, Math.min(PHASES.length - 1, faseActiva));

  const degStart = phaseDeg(0) - 70; // arranca escondido tras el núcleo
  const degCur = phaseDeg(cur);
  const degEnd = phaseDeg(6);
  const rStart = rAtDeg(degStart);

  const grown = spiralPath(degStart, degCur, rStart, phaseR(cur));
  const future = spiralPath(degCur, degEnd, phaseR(cur), phaseR(6));
  const ret = spiralPath(degEnd + 6, degEnd + STEP_DEG - 4, phaseR(6) + 2, phaseR(0) + 8);

  let html = '';

  /* defs */
  html += '<defs>' +
    '<linearGradient id="cvStemGrad" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#2F4A34"/><stop offset="60%" stop-color="#4C7A3D"/><stop offset="100%" stop-color="#5B8A52"/>' +
    '</linearGradient>' +
    '<radialGradient id="cvCoreGrad" cx="38%" cy="30%" r="80%">' +
      '<stop offset="0%" stop-color="#FFFDF8"/><stop offset="70%" stop-color="#F3E9D2"/><stop offset="100%" stop-color="#EBDDBB"/>' +
    '</radialGradient>' +
    '<linearGradient id="cvSoilGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#8B5E34"/><stop offset="100%" stop-color="#5A3D22"/>' +
    '</linearGradient>' +
    SPECIES_DEFS +
    '<clipPath id="cvCoreClip"><circle cx="' + CX + '" cy="' + CY + '" r="44"/></clipPath>' +
  '</defs>';

  /* anillo exterior decorativo (horizonte del ciclo) */
  html += '<g class="cv-ring-decor"><circle cx="' + CX + '" cy="' + CY + '" r="152" fill="none" stroke="#C98A3D" stroke-width="1.6" stroke-dasharray="2 9" stroke-linecap="round" opacity=".4"/></g>';

  /* arco de retorno: poscosecha -> semilla */
  html += '<path d="' + ret.d + '" fill="none" stroke="#C9A227" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round" opacity=".5"/>';
  html += '<circle r="3" fill="#8B5E34" opacity=".85"><animateMotion dur="6s" begin="2.2s" repeatCount="indefinite" path="' + ret.d + '"/></circle>';

  /* tramo futuro (camino por venir) */
  html += '<path d="' + future.d + '" fill="none" stroke="#C98A3D" stroke-width="3" stroke-dasharray="1.5 8" stroke-linecap="round" opacity=".55"/>';

  /* tallo vivido */
  html += '<path d="' + grown.d + '" fill="none" stroke="rgba(91,138,82,.16)" stroke-width="11" stroke-linecap="round"/>';
  html += '<path class="cv-stem-grown" style="--len:' + grown.len + '" d="' + grown.d + '" fill="none" stroke="url(#cvStemGrad)" stroke-width="5" stroke-linecap="round"/>';

  /* hojas que brotan del tallo */
  const leaves = [
    { deg: -118, side: 1, s: 0.55, fill: '#6B9A5B' },
    { deg: -64, side: -1, s: 0.75, fill: '#5B8A52' },
    { deg: -14, side: 1, s: 0.95, fill: '#4C7A3D' },
    { deg: 38, side: -1, s: 1.1, fill: '#5B8A52' },
  ];
  leaves.forEach(function eachLeaf(lf, k) {
    const p = polar(lf.deg, rAtDeg(lf.deg));
    const rot = lf.deg + 90 + (lf.side > 0 ? 30 : 150);
    const delay = (0.45 + ((lf.deg - degStart) / (degCur - degStart)) * 1.35).toFixed(2);
    html += '<g transform="translate(' + p.x.toFixed(1) + ',' + p.y.toFixed(1) + ') rotate(' + rot + ') scale(' + lf.s + ')">' +
      '<g class="cv-leaf-in" style="--dl:' + delay + 's"><g class="cv-sway" style="--dl:' + (k * 0.6) + 's">' +
      '<path d="M0,0 C5,-7 14,-8 19,-3 C14,3 5,3 0,0 Z" fill="' + lf.fill + '"/>' +
      '<path d="M1.5,-0.3 C7,-2.8 12,-3.6 16.5,-3" stroke="rgba(251,243,228,.55)" stroke-width=".9" fill="none"/>' +
      '</g></g></g>';
  });

  /* núcleo: raíz + especie */
  html += '<g class="cv-core-pop">' +
    '<circle cx="' + CX + '" cy="' + CY + '" r="50" fill="none" stroke="#E8B84B" stroke-width="1.4" stroke-dasharray="1 6" stroke-linecap="round" opacity=".55"/>' +
    '<circle cx="' + CX + '" cy="' + CY + '" r="46" fill="url(#cvCoreGrad)" stroke="rgba(232,184,75,.65)" stroke-width="2.5"/>' +
    '<g clip-path="url(#cvCoreClip)">' +
      '<path d="M' + (CX - 46) + ',' + (CY + 16) + ' C' + (CX - 24) + ',' + (CY + 12) + ' ' + (CX - 6) + ',' + (CY + 19) + ' ' + CX + ',' + (CY + 16) + ' C' + (CX + 15) + ',' + (CY + 13) + ' ' + (CX + 30) + ',' + (CY + 19) + ' ' + (CX + 46) + ',' + (CY + 15) + ' L' + (CX + 46) + ',' + (CY + 46) + ' L' + (CX - 46) + ',' + (CY + 46) + ' Z" fill="url(#cvSoilGrad)"/>' +
      '<g stroke="#3E2A16" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".55">' +
        '<path d="M' + CX + ',' + (CY + 17) + ' C' + (CX - 3) + ',' + (CY + 23) + ' ' + (CX - 8) + ',' + (CY + 27) + ' ' + (CX - 12) + ',' + (CY + 32) + '"/>' +
        '<path d="M' + CX + ',' + (CY + 17) + ' C' + (CX + 2) + ',' + (CY + 24) + ' ' + (CX + 6) + ',' + (CY + 28) + ' ' + (CX + 9) + ',' + (CY + 33) + '"/>' +
        '<path d="M' + (CX - 1) + ',' + (CY + 17) + ' C' + (CX - 6) + ',' + (CY + 20) + ' ' + (CX - 13) + ',' + (CY + 22) + ' ' + (CX - 18) + ',' + (CY + 24) + '"/>' +
        '<path d="M' + (CX + 1) + ',' + (CY + 17) + ' C' + (CX + 7) + ',' + (CY + 20) + ' ' + (CX + 13) + ',' + (CY + 22) + ' ' + (CX + 18) + ',' + (CY + 25) + '"/>' +
        '<path d="M' + CX + ',' + (CY + 19) + ' C' + CX + ',' + (CY + 25) + ' ' + (CX - 1) + ',' + (CY + 30) + ' ' + CX + ',' + (CY + 35) + '"/>' +
      '</g>' +
      '<g transform="translate(' + CX + ',' + CY + ')">' + sp.center + '</g>' +
    '</g>' +
    '<text x="' + CX + '" y="' + (CY + 40) + '" class="cv-core-name">' + sp.label.toUpperCase() + '</text>' +
  '</g>';

  /* nodos de fase sobre el tallo */
  PHASES.forEach(function eachPhase(p, i) {
    const deg = phaseDeg(i);
    const r = phaseR(i);
    const nr = nodeR(i, cur);
    const pos = polar(deg, r);
    const lab = polar(deg, r + nr + 13);
    const isGrown = i < cur;
    const isCurrent = i === cur;
    const delay = (0.15 + (isCurrent ? 1.55 : Math.min(i, cur) * 0.34 + (i > cur ? 1.7 + (i - cur) * 0.12 : 0))).toFixed(2);
    let bgFill;
    let ring;
    let dash = '';
    let gOp = 1;
    if (isCurrent) { bgFill = '#FFFDF8'; ring = '#F2C744'; }
    else if (isGrown) { bgFill = 'color-mix(in srgb, ' + p.color + ' 16%, #FFFDF8)'; ring = p.color; }
    else { bgFill = '#FFFDF8'; ring = p.color; dash = ' stroke-dasharray="3 3.5"'; gOp = 0.62; }

    html += '<g class="cv-wnode" role="button" tabindex="0" data-idx="' + i + '" aria-label="' + p.name + (isCurrent ? ' — fase enfocada' : '') + '" transform="translate(' + pos.x.toFixed(1) + ',' + pos.y.toFixed(1) + ')">' +
      '<g class="cv-wnode-in" style="--dl:' + delay + 's" opacity="' + gOp + '">' +
        (isCurrent ? '<circle class="cv-halo" r="' + (nr + 7) + '" fill="none" stroke="#F2C744" stroke-width="3"/>' : '') +
        '<circle r="' + (nr + 9) + '" fill="transparent"/>' +
        '<circle class="cv-node-bg" r="' + nr + '" fill="' + bgFill + '" stroke="' + ring + '" stroke-width="' + (isCurrent ? 2.6 : 2) + '"' + dash + '/>' +
        '<g transform="scale(' + (nr / 13.5).toFixed(2) + ')">' + GLYPHS[p.key](p.color) + '</g>' +
      '</g>' +
      (isCurrent ? '' : '<text class="cv-node-label" x="' + (lab.x - pos.x).toFixed(1) + '" y="' + (lab.y - pos.y + 3).toFixed(1) + '">' + p.short + '</text>') +
    '</g>';
  });

  /* bandera de la fase enfocada (nombre de la fase, no una semana inventada) */
  const cpos = polar(degCur, phaseR(cur));
  const flagText = PHASES[cur].name;
  const flagW = 8.2 * (flagText + ' ▸').length + 26;
  html += '<g transform="translate(' + cpos.x.toFixed(1) + ',' + (cpos.y + nodeR(cur, cur) + 5).toFixed(1) + ')"><g class="cv-flag-in">' +
    '<path d="M0,0 L7,10 L-7,10 Z" fill="#F2C744"/>' +
    '<rect x="' + (-flagW / 2) + '" y="9" width="' + flagW + '" height="26" rx="13" fill="#F2C744" style="filter:drop-shadow(0 5px 10px rgba(232,184,75,.5))"/>' +
    '<text x="0" y="26.5" text-anchor="middle" font-size="12" font-weight="700" fill="#3a2a05">' + flagText + ' ▸</text>' +
  '</g></g>';

  return html;
}
