/*
 * pielTrazado — ZARIGÜEYA AUTO-TRAZADA RIGGEADA (redo 2026-08-25 nivel
 * jaguar): la lámina Gemini `zariguya-parada-limpia.png` vectorizada
 * AUTOMÁTICAMENTE (trazar-lamina.sh: la MISMA receta clavada del jaguar —
 * aplanado sobre papel + vtracer stacked spline cp8/speckle2/gs8 + silueta
 * potrace, ver el docstring del script) y montada sobre un esqueleto de
 * huesos por CLIP-REGIONES — copia EXACTA del patrón de
 * `jaguarTrazado/pielTrazado.js` (la técnica que sí funcionó).
 *
 * POR QUÉ ESTE REDO. Los 4 intentos previos de la zarigüeya fallaron por NO
 * seguir esta receta (ver `Chagra-strategy/ops/AUDITORIA-ZARIGUYA-COMPAI-
 * 2026-08-25.md`): (1) borde grueso por trazar sin aplanar sobre papel +
 * filter_speckle 4; (2) "gorro" en la coronilla por pintar el casquete
 * anti-costura como ELIPSE de color plano en vez de calco; (3) el hack
 * 2×+scale(0.5) rompía el calce de las clip-regiones; (4) redibujo a mano
 * (antipatrón prohibido). Aquí:
 *
 *   1. El calco entra UNA vez en <defs>, PARTIDO POR REGIÓN (perf — ver
 *      generar-calco.mjs): <g id="ztCalco-REGION" clip-path=silueta>.
 *   2. Cada hueso es <g class="zh-hueso …" style="transform-origin:PIVOTE">
 *      con un <use href="#ztCalco-REGION" clip-path="url(#zt-r-…)"> — la
 *      región anatómica de ESE hueso, medida a ojo sobre grilla 40px
 *      (`_zar-work/verificar-regiones.mjs`, GENEROSA a propósito — donde el
 *      borde pasa por aire, recortar de más es gratis) en el espacio
 *      564×889 nativo de la lámina.
 *   3. ANTI-COSTURA: el casquete de cuello/cabeza/orejas/cola es SIEMPRE el
 *      CALCO mismo (borroso, textura de pelaje) — NUNCA una elipse de color
 *      plano (la causa exacta del bug "gorro" de los 4 intentos previos).
 *
 * La CADENCIA reusa `zariguyaHuesos.css` (blink/husmeo/marcha ya probados en
 * la casa) — este módulo solo reproduce la JERARQUÍA y las CLASES que esa
 * CSS espera.
 *
 * ALCANCE de este primer rig (documentado, no un pixel-probe pendiente):
 * cabeza/cuello/orejas/mandíbula/cola articulan de forma independiente;
 * tronco+brazos+piernas quedan en UNA región estática (sin split de patas,
 * a diferencia del jaguar de 4 patas) — el idle/lipsync/giro de cabeza/rizo
 * de cola ya dan vida; la marcha usa el bamboleo de raíz (columna), no
 * swing de pata individual.
 *
 * REGLA DE ORO: módulo PLANO — solo datos/strings (cero react, cero three).
 */

import { RH_LINE_BOIL } from '../rubberhoseSpec.js';
import { CALCO_SILUETA_DEFS, CALCO_POR_REGION } from './calcoTrazado.js';
import { ZT_PIVOTES, ZT_REGIONES } from './regiones.js';

export { ZT_PIVOTES, ZT_REGIONES };

/* Paleta de casquetes/dibujo nuevo mínimo: colores MEDIDOS a ojo sobre el
   calco donde cada casquete asoma. */
const P = Object.freeze({
  bocaInterior: '#5a3a30',
  lengua: '#c07868',
  parpado: '#4f3f2d',
  luna: '#ff9ecb',
  rocio: '#ffd9ec',
  sombraSuelo: 'rgba(40,28,16,0.35)',
});

/* ─────────────────────────── helpers de string ───────────────────────────── */

const H = ZT_PIVOTES;
const origin = (n) => ` style="transform-origin:${H[n][0]}px ${H[n][1]}px"`;
const dPoly = (pts) => `M${pts.map(([x, y]) => `${x},${y}`).join(' L')} Z`;

const CLIPS = Object.entries(ZT_REGIONES)
  .map(([n, pts]) => `<clipPath id="zt-r-${n}"><path d="${dPoly(pts)}"/></clipPath>`)
  .join('\n  ');

/* El calco partido por región (perf): cada región vive UNA vez en <defs>
   como <g id="ztCalco-REGION" clip-path=silueta> con SOLO sus paths — un
   <use> por hueso renderiza solo la fracción de geometría que le toca. */
const SILUETA = CALCO_SILUETA_DEFS.replace(/^<defs>/, '').replace(/<\/defs>$/, '');
const CALCO_DEFS = Object.entries(CALCO_POR_REGION)
  .map(([n, ps]) => `<g id="ztCalco-${n}" clip-path="url(#ztSilueta)">${ps}</g>`)
  .join('\n  ');

/** Un hueso: <use> del calco DE SU REGIÓN recortado al polígono exacto. */
const usoCalco = (region) => `<use href="#ztCalco-${region}" clip-path="url(#zt-r-${region})"/>`;

/** Casquete/respaldo anti-costura: pintado en el PADRE justo antes del
    hijo, recortado a la región ESTÁTICA del hijo ∩ LA SILUETA del calco
    (doble clip: sin la silueta el casquete asomaría como manchón). */
const casquete = (region, forma) =>
  `<g clip-path="url(#zt-r-${region})"><g clip-path="url(#ztSilueta)">${forma}</g></g>`;

/** Casquete TEXTURADO (el fix del bug "gorro" de los 4 intentos previos):
    para las junturas grandes (cabeza/cuello/orejas/cola) el respaldo NUNCA
    es color plano — es una copia BORROSA del propio calco. La franja
    revelada al rotar el hijo es TEXTURA de pelaje fuera de foco, jamás un
    parche/óvalo inventado. Filtro acotado a la caja de la juntura. */
const FILTRO_CASQUETE = {
  cabeza: 'ztBorrosoCabeza', cuello: 'ztBorrosoCuello',
  orejaI: 'ztBorrosoOrejaI', orejaD: 'ztBorrosoOrejaD',
  colaBase: 'ztBorrosoColaBase', colaMedia: 'ztBorrosoColaMedia', colaPunta: 'ztBorrosoColaPunta',
};
const casqueteCalco = (region) =>
  `<g clip-path="url(#zt-r-${region})"><g clip-path="url(#ztSilueta)">` +
  `<use href="#ztCalco-${region}" filter="url(#${FILTRO_CASQUETE[region]})"/></g></g>`;

/* ─────────────────────────────── defs ────────────────────────────────────── */

const DEFS = `<defs>
  ${SILUETA}
  ${CALCO_DEFS}
  ${CLIPS}
  <radialGradient id="ztAura" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.luna}" stop-opacity=".34"/>
    <stop offset=".7" stop-color="${P.rocio}" stop-opacity=".12"/>
    <stop offset="1" stop-color="${P.luna}" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="ztOjoHalo" cx=".5" cy=".5" r=".5">
    <stop offset="0" stop-color="${P.rocio}" stop-opacity=".8"/>
    <stop offset="1" stop-color="${P.rocio}" stop-opacity="0"/>
  </radialGradient>
  <filter id="ztBlur"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="ztBorrosoCabeza" filterUnits="userSpaceOnUse" x="-40" y="-25" width="460" height="340"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="ztBorrosoCuello" filterUnits="userSpaceOnUse" x="50" y="210" width="290" height="130"><feGaussianBlur stdDeviation="1.4"/></filter>
  <filter id="ztBorrosoOrejaI" filterUnits="userSpaceOnUse" x="0" y="-25" width="150" height="130"><feGaussianBlur stdDeviation="1.1"/></filter>
  <filter id="ztBorrosoOrejaD" filterUnits="userSpaceOnUse" x="215" y="-25" width="155" height="130"><feGaussianBlur stdDeviation="1.1"/></filter>
  <filter id="ztBorrosoColaBase" filterUnits="userSpaceOnUse" x="95" y="640" width="210" height="230"><feGaussianBlur stdDeviation="1.8"/></filter>
  <filter id="ztBorrosoColaMedia" filterUnits="userSpaceOnUse" x="240" y="690" width="200" height="150"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="ztBorrosoColaPunta" filterUnits="userSpaceOnUse" x="380" y="690" width="184" height="180"><feGaussianBlur stdDeviation="1.6"/></filter>
  <filter id="zhBoilSuave" x="-6%" y="-6%" width="112%" height="112%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="0.9"/>
  </filter>
  <filter id="zhBoil" x="-8%" y="-8%" width="116%" height="116%">
    <feTurbulence type="turbulence" baseFrequency="${RH_LINE_BOIL.baseFrequency}" numOctaves="1" seed="${RH_LINE_BOIL.seeds[0]}" result="t">
      <animate attributeName="seed" values="${RH_LINE_BOIL.seeds.join(';')}" dur="${RH_LINE_BOIL.dur}" repeatCount="indefinite" calcMode="discrete"/>
    </feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="2.2"/>
  </filter>
</defs>`;

/* ── BOCA: interior sintético MÍNIMO detrás de la mandíbula (esta lámina
   sonríe con boca cerrada, sin colmillos/lengua visibles como el jaguar —
   no hace falta fauces elaboradas, solo evitar un hueco blanco si el
   lip-sync llega a abrir más que el trazo). Recortada a la región estática
   de la mandíbula: en reposo, tapada exacta por el mentón del calco. ── */
const BOCA = casquete('mandibula',
  `<ellipse cx="195" cy="258" rx="34" ry="14" fill="${P.bocaInterior}"/>` +
  `<ellipse cx="195" cy="264" rx="20" ry="7" fill="${P.lengua}"/>`);

/* ── PÁRPADOS: bisagra arriba, la CSS canónica los cierra con blink
   irregular. Ojos medidos a ojo sobre la grilla: (130,140) y (250,140). ── */
const PARPADOS = `
  <path class="zh-parpado" style="transform-origin:130px 128px"
    d="M110,131 C 117,123 143,123 150,131 C 152,140 151,151 145,157 C 136,162 122,161 116,154 C 111,146 110,138 110,131 Z" fill="${P.parpado}"/>
  <path class="zh-parpado" style="transform-origin:250px 128px"
    d="M230,131 C 237,123 263,123 270,131 C 272,140 271,151 265,157 C 256,162 242,161 236,154 C 231,146 230,138 230,131 Z" fill="${P.parpado}"/>`;

const HALOS = `
  <circle class="zh-ojoHalo" style="opacity:0" cx="130" cy="140" r="20" fill="url(#ztOjoHalo)"/>
  <circle class="zh-ojoHalo" style="opacity:0" cx="250" cy="140" r="20" fill="url(#ztOjoHalo)"/>`;

/* ─────────────────────── LA CABEZA (con sus satélites) ───────────────────── */

const CABEZA = `
  ${usoCalco('cabeza')}
  ${BOCA}
  <g class="zh-hueso zh-mandibula"${origin('mandibula')}>${usoCalco('mandibula')}</g>
  ${casqueteCalco('orejaI')}
  <g class="zh-hueso zh-orejaI"${origin('orejaI')}>${usoCalco('orejaI')}</g>
  ${casqueteCalco('orejaD')}
  <g class="zh-hueso zh-orejaD"${origin('orejaD')}>${usoCalco('orejaD')}</g>
  <g class="zh-ojoGrupo">${HALOS}${PARPADOS}</g>`;

/* ─────────────────────────────── EL SVG COMPLETO ─────────────────────────────── */

/**
 * El markup de la zarigüeya trazada (redo nivel jaguar). Mismo contrato que
 * los huesos previos: el host pone data-agt-estado/data-modo/data-vida/
 * --zh-jaw en la raíz y la CSS canónica (`zariguyaHuesos.css`) pone la
 * cadencia.
 */
export const ZARIGUYA_TRAZADO_SVG = `<svg class="zariguyaHuesos" viewBox="-30 -30 620 950" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Zarigüeya">
${DEFS}
<g class="zh-pj">
  <ellipse class="zh-aura" cx="200" cy="440" rx="320" ry="470" fill="url(#ztAura)"/>
  <g class="zh-masa">
    <g class="zh-antic"${origin('columna')}>
      <ellipse class="zh-sombraSuelo" cx="200" cy="875" rx="200" ry="14" fill="${P.sombraSuelo}" filter="url(#ztBlur)"/>
      <g class="zh-hueso zh-cuerpo"${origin('columna')}>
        ${usoCalco('troncoCuerpo')}
        ${casqueteCalco('colaBase')}
        <g class="zh-hueso zh-colaBase"${origin('colaBase')}>
          ${usoCalco('colaBase')}
          ${casqueteCalco('colaMedia')}
          <g class="zh-hueso zh-colaMedia"${origin('colaMedia')}>
            ${usoCalco('colaMedia')}
            ${casqueteCalco('colaPunta')}
            <g class="zh-hueso zh-colaPunta"${origin('colaPunta')}>${usoCalco('colaPunta')}</g>
          </g>
        </g>
        ${casqueteCalco('cuello')}
        <g class="zh-hueso zh-cuello"${origin('cuello')}>
          ${usoCalco('cuello')}
          ${casqueteCalco('cabeza')}
          <g class="zh-hueso zh-cabezaGiro"${origin('cabeza')}>
            <g class="zh-hueso zh-cabeza"${origin('cabeza')}>
              ${CABEZA}
            </g>
          </g>
        </g>
      </g>
    </g>
  </g>
</g>
</svg>`;

export default ZARIGUYA_TRAZADO_SVG;
